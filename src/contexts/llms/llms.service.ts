import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bull from "bull";

import { GENERATE_QUEUE } from "../shared/contants";

@Injectable()
export class LlmsService {
  constructor(
    @InjectQueue(GENERATE_QUEUE) private readonly generateQueue: bull.Queue,
    private configService: ConfigService,
  ) {}

  async aiFriendResponse(
    userPrompt: string,
    dataObject: DataObject,
    sessionType: string,
    sessionDescription: string,
    lastConversation: string[],
  ): Promise<string> {
    await this.handleCacheFull();

    const jobData = {
      userPrompt,
      dataObject,
      sessionType,
      sessionDescription,
      lastConversation,
    };

    const job = await this.generateQueue.add("aiFriendResponse", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });

    // Wait for the job to complete and return the result
    const result = (await job.finished()) as string;
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

  async generateFriendSummary(friendsData: FriendsData): Promise<string> {
    await this.handleCacheFull();

    const jobData = {
      friendsData,
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
    // console.log("Completed jobs cleared successfully");
  }

  async clearAllJobs(): Promise<void> {
    await this.generateQueue.empty();
    // console.log("All jobs cleared successfully");
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
