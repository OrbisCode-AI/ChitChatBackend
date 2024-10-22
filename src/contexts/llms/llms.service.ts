import { InjectQueue } from "@nestjs/bull";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

import {
  systemPromptGeneral,
  systemPromptResearchCreateMode,
  systemPromptStoryMode,
} from "@/src/prompts/response";
import {
  llamaVisionChat,
  openaiChat,
  unifyAgentChat,
} from "@/src/utils/models";

import { GENERATE_QUEUE } from "../shared/contants";

@Injectable()
export class LlmsService {
  constructor(
    @InjectQueue(GENERATE_QUEUE) private generateQueue: Queue,
    private configService: ConfigService,
  ) {}

  getHello(): string {
    return "Hello World";
  }

  async aiFriendResponse(
    userPrompt: string,
    dataObject: DataObject,
    sessionType: string,
    sessionDescription: string,
    lastConversation: string[],
  ): Promise<string> {
    let systemPrompt: string;
    switch (sessionType) {
      case "General": {
        systemPrompt = systemPromptGeneral
          .replace("{aiFriendName}", dataObject.aiFriend.name)
          .replace("{aiFriendPersona}", dataObject.aiFriend.persona || "")
          .replace("{aiFriendAbout}", dataObject.aiFriend.about || "")
          .replace(
            "{aiFriendKnowledgeBase}",
            dataObject.aiFriend.knowledge_base || "",
          )
          .replace("{userName}", dataObject.user.name)
          .replace("{userPersona}", dataObject.user.persona || "")
          .replace("{userAbout}", dataObject.user.about || "")
          .replace("{userKnowledgeBase}", dataObject.user.knowledge_base || "")
          .replace("{friendsSummary}", dataObject.friendsSummary)
          .replace("{descriptionString}", sessionDescription)
          .replace("{lastConversations}", lastConversation.join("\n"));

        break;
      }
      case "StoryMode": {
        systemPrompt = systemPromptStoryMode
          .replace("{aiFriendName}", dataObject.aiFriend.name)
          .replace("{descriptionString}", sessionDescription)
          .replace("{friendsSummary}", dataObject.friendsSummary)
          .replace("{lastConversations}", lastConversation.join("\n"));

        break;
      }
      case "ResearchCreateMode": {
        systemPrompt = systemPromptResearchCreateMode
          .replace("{aiFriendName}", dataObject.aiFriend.name)
          .replace("{descriptionString}", sessionDescription)
          .replace("{aiFriendPersona}", dataObject.aiFriend.persona || "")
          .replace("{aiFriendAbout}", dataObject.aiFriend.about || "")
          .replace(
            "{aiFriendKnowledgeBase}",
            dataObject.aiFriend.knowledge_base || "",
          )
          .replace("{userName}", dataObject.user.name)
          .replace("{friendsSummary}", dataObject.friendsSummary)
          .replace("{lastConversations}", lastConversation.join("\n"));

        break;
      }
      default: {
        throw new HttpException("Invalid session type", HttpStatus.BAD_REQUEST);
      }
    }

    let response: string | null = await openaiChat(userPrompt, systemPrompt);

    if (!response || response === "I am busy now, I will respond later.") {
      // Fallback to unifyAgentChat
      response = await unifyAgentChat(userPrompt, systemPrompt);

      if (!response || response === "I am busy now, I will respond later.") {
        // Fallback to llamaVisionChat
        response = await llamaVisionChat(userPrompt, systemPrompt);
      }
    }

    return response || "I am busy now, I will respond later.";
  }
}
