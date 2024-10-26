import { OnQueueActive, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";

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

@Processor(GENERATE_QUEUE)
export class LlmsConsumer {
  private readonly logger = new Logger(LlmsConsumer.name);

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @Process("transcode")
  transcode(job: Job) {
    this.logger.debug(job.data);
  }

  @Process("aiFriendResponse")
  async handleAiFriendResponse(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    const {
      userPrompt,
      dataObject,
      sessionType,
      sessionDescription,
      lastConversation,
    } = job.data as {
      userPrompt: string;
      dataObject: DataObject;
      sessionType: string;
      sessionDescription: string;
      lastConversation: string[];
    };

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
        throw new Error("Invalid session type");
      }
    }

    let response = await unifyAgentChat(userPrompt, systemPrompt);

    if (!response || response === "I am busy now, I will respond later.") {
      // Fallback to unifyAgentChat
      response = await openaiChat(userPrompt, systemPrompt);

      if (!response || response === "I am busy now, I will respond later.") {
        // Fallback to llamaVisionChat
        response = await llamaVisionChat(userPrompt, systemPrompt);
      }
    }

    return response || "I am busy now, I will respond later.";
  }
}
