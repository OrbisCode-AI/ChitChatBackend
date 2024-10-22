import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import { AiFriendResponseDto } from "../../dto/llms";
import { LlmsService } from "./llms.service";

@ApiBearerAuth()
@SkipThrottle()
@ApiTags("LLMs")
@Controller("llms")
export class LlmsController {
  constructor(private readonly llmsService: LlmsService) {}

  @Get()
  getHello() {
    return this.llmsService.getHello();
  }

  @Post("ai-friend-response")
  aiFriendResponse(@Body() body: AiFriendResponseDto) {
    return this.llmsService.aiFriendResponse(
      body.userPrompt,
      body.dataObject,
      body.sessionType,
      body.sessionDescription,
      body.lastConversation,
    );
  }
}
