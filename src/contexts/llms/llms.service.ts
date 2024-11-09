import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bull from "bull";
// eslint-disable-next-line node/no-extraneous-import
import { v4 as uuidv4 } from "uuid";

import { models, type } from "../../utils/openmetercost";
import { GENERATE_QUEUE } from "../shared/contants";
import { VectorService } from "../vector/vector.service";

@Injectable()
export class LlmsService {
  constructor(
    @InjectQueue(GENERATE_QUEUE) private readonly generateQueue: bull.Queue,
    private configService: ConfigService,
    private vectorService: VectorService,
  ) {}

  private activeRequests = new Map<string, Promise<string>>();
  private userRequestCounts = new Map<
    string,
    { count: number; timestamp: number }
  >();
  // eslint-disable-next-line unicorn/numeric-separators-style
  private readonly REQUEST_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS = 10; // Max requests per minute

  private async trackTokenUsage(
    tokens: number,
    model: string,
    userId: string,
    type: string,
  ) {
    const jobData = {
      id: uuidv4(),
      userId,
      tokens,
      model,
      type,
      created: new Date().toISOString(),
    };

    await this.generateQueue.add("trackTokens", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.userRequestCounts.get(userId);

    if (!userRequests || now - userRequests.timestamp > this.REQUEST_WINDOW) {
      this.userRequestCounts.set(userId, { count: 1, timestamp: now });
      return true;
    }

    if (userRequests.count >= this.MAX_REQUESTS) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  private async ensureQueueHealth(): Promise<void> {
    const queueSize = await this.getQueueSize();
    const maxQueueSize = this.configService.get<number>("MAX_QUEUE_SIZE", 1000);

    if (queueSize >= maxQueueSize * 0.8) {
      // Start cleaning at 80% capacity
      await this.clearCompletedJobs();
    }

    if (queueSize >= maxQueueSize) {
      throw new Error("Queue is currently full. Please try again later.");
    }
  }

  async aiFriendResponse(
    userPrompt: string,
    modeData: ModeData,
    dataObject: DataObject,
    sessionType: string,
    sessionDescription: string,
    lastConversation: string[],
  ): Promise<string> {
    await this.ensureQueueHealth();

    const requestKey = `${dataObject.userId}-${userPrompt}`;

    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey)!;
    }

    const userId = dataObject.userId;
    if (!this.checkRateLimit(userId)) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const responsePromise = this.processAiFriendResponse(
      userPrompt,
      modeData,
      dataObject,
      sessionType,
      sessionDescription,
      lastConversation,
    );

    this.activeRequests.set(requestKey, responsePromise);

    try {
      const result = await responsePromise;
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  private async processAiFriendResponse(
    userPrompt: string,
    modeData: ModeData,
    dataObject: DataObject,
    sessionType: string,
    sessionDescription: string,
    lastConversation: string[],
  ): Promise<string> {
    await this.handleCacheFull();

    const messageId = uuidv4();

    const jobData = {
      userPrompt,
      modeData,
      dataObject,
      sessionType,
      sessionDescription,
      lastConversation,
      messageId,
    };

    const job = await this.generateQueue.add("aiFriendResponse", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    const result = (await job.finished()) as string;

    // Track token usage
    const estimatedTokens = Math.ceil((userPrompt.length + result.length) / 4);
    await this.trackTokenUsage(
      estimatedTokens,
      models.gpt4,
      dataObject.userId,
      type.output,
    );

    return result;
  }

  async messageRouter(message: string, routerData: RouterData) {
    await this.handleCacheFull();

    const jobData = {
      message,
      routerData,
    };

    const job = await this.generateQueue.add("messageRoute", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    const result = (await job.finished()) as string;
    return result;
  }

  async generateFriendSummary(friendsData: FriendsInfo): Promise<string> {
    await this.handleCacheFull();

    if (!friendsData?.friends || !Array.isArray(friendsData.friends)) {
      throw new Error("Invalid friendsData: friends array is required");
    }

    const jobData = {
      friendsData,
      user: friendsData.user,
    };

    const job = await this.generateQueue.add("generateFriendSummary", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    const result = (await job.finished()) as string;
    return result;
  }

  async clearCache(): Promise<void> {
    // Remove completed jobs
    await this.generateQueue.clean(0, "completed");

    // Clear all jobs from the queue
    await this.generateQueue.empty();
  }

  async clearCompletedJobs(): Promise<void> {
    await this.generateQueue.clean(0, "completed");
    // this.logger.log("Completed jobs cleared successfully");
  }

  async clearAllJobs(): Promise<void> {
    await this.generateQueue.empty();
    // this.logger.log("All jobs cleared successfully");
  }

  async getQueueSize(): Promise<number> {
    const jobCounts = await this.generateQueue.getJobCounts();
    return jobCounts.waiting + jobCounts.active + jobCounts.completed;
  }

  async handleCacheFull(): Promise<void> {
    const queueSize = await this.getQueueSize();
    const maxQueueSize = this.configService.get<number>("MAX_QUEUE_SIZE", 1000);

    if (queueSize >= maxQueueSize) {
      await this.clearCompletedJobs();

      if (await this.isQueueStillFull(maxQueueSize)) {
        await this.clearAllJobs();
      }
    }
  }

  private async isQueueStillFull(maxSize: number): Promise<boolean> {
    return (await this.getQueueSize()) >= maxSize;
  }
}
