import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import {
  AiFriendResponseDto,
  GenerateFriendSummaryDto,
  MessageRouterDto,
} from "../../dto/llms";
import { LlmsService } from "./llms.service";

@ApiBearerAuth()
@SkipThrottle()
@Controller("llms")
export class LlmsController {
  constructor(private readonly llmsService: LlmsService) {}

  @ApiTags("LLM")
  @Post("ai-friend-response")
  aiFriendResponse(@Body() body: AiFriendResponseDto) {
    return this.llmsService.aiFriendResponse(
      body.userPrompt,
      body.modeData,
      body.dataObject,
      body.sessionType,
      body.sessionDescription,
      body.lastConversation,
    );
  }

  @ApiTags("LLM")
  @Post("message-router")
  messageRouter(@Body() body: MessageRouterDto) {
    return this.llmsService.messageRouter(body.message, body.routerData);
  }

  @ApiTags("LLM")
  @Post("generate-friend-summary")
  generateFriendSummary(@Body() body: GenerateFriendSummaryDto) {
    return this.llmsService.generateFriendSummary(body.friendsData);
  }

  @ApiTags("Redis")
  @Post("clear-cache")
  async clearCache() {
    await this.llmsService.clearCache();
    return { message: "Cache cleared successfully" };
  }

  @ApiTags("Redis")
  @Post("clear-completed-jobs")
  async clearCompletedJobs() {
    await this.llmsService.clearCompletedJobs();
    return { message: "Completed jobs cleared successfully" };
  }

  @ApiTags("Redis")
  @Post("clear-all-jobs")
  async clearAllJobs() {
    await this.llmsService.clearAllJobs();
    return { message: "All jobs cleared successfully" };
  }

  @ApiTags("Redis")
  @Get("queue-size")
  async getQueueSize() {
    const size = await this.llmsService.getQueueSize();
    return { size };
  }

  @ApiTags("Redis")
  @Post("handle-cache-full")
  async handleCacheFull() {
    await this.llmsService.handleCacheFull();
    return { message: "Cache full situation handled" };
  }
}
