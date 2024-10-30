import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

import {
  AddDocumentsToVectorStoreDto,
  AddMemoryToVectorStoreDto,
  CreateMemorySummaryDto,
  VectorSearchDto,
} from "@/src/dto/vector";

import { VectorService } from "./vector.service";

@ApiBearerAuth()
@SkipThrottle()
@ApiTags("Vector")
@Controller("vector")
export class VectorController {
  constructor(private readonly vectorService: VectorService) {}

  @Post("add-documents")
  async addDocumentsToVectorStore(@Body() body: AddDocumentsToVectorStoreDto) {
    return this.vectorService.addDocumentsToVectorStore(
      body.message,
      body.conversationId,
      body.messageId,
      body.userId,
    );
  }

  @Post("add-memory")
  async addMemoryToVectorStore(@Body() body: AddMemoryToVectorStoreDto) {
    return this.vectorService.addMemoryToVectorStore(
      body.MomoryContext,
      body.conversationId,
      body.friendId,
      body.messageId,
      body.userId,
    );
  }

  @Post("create-memory-summary")
  async createMemorySummary(@Body() body: CreateMemorySummaryDto) {
    return this.vectorService.createMemorySummary(
      body.dataInfo,
      body.userId,
      body.conversationId,
      body.lastConversations,
    );
  }

  @Post("vector-search")
  async vectorSearch(@Body() body: VectorSearchDto) {
    return this.vectorService.vectorSearch(
      body.query,
      body.userId,
      body.conversationId,
    );
  }
}
