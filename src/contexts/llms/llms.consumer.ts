import { OnQueueActive, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";

import { systemPromptFriendSummary } from "@/src/prompts/friendsummary";
import { systemPromptMessageRoute } from "@/src/prompts/messageroute";
import {
  systemPromptGeneral,
  systemPromptResearchCreateMode,
  systemPromptStoryMode,
} from "@/src/prompts/response";
import {
  llamaVisionChat,
  openaiChat,
  unifyAgentChat,
  unifyAgentChatWithResponseFormat,
} from "@/src/utils/models";

import { chargeUser } from "../../utils/openmetercost";
import { GENERATE_QUEUE } from "../shared/contants";

@Processor(GENERATE_QUEUE)
export class LlmsConsumer {
  private readonly logger = new Logger(LlmsConsumer.name);

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
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

  @Process("messageRoute")
  async handleMessageRoute(job: Job) {
    // console.log("Handling messageRoute job:", job.id);
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    const { message, routerData } = job.data as {
      message: string;
      routerData: RouterData;
    };

    return await this.routeMessage(
      message,
      routerData.user,
      routerData.activeFriends,
    );
  }

  private async routeMessage(
    message: string,
    user: User,
    activeFriends: AiFriend[],
  ): Promise<string[] | null> {
    const systemPrompt = systemPromptMessageRoute;

    const userPrompt = `
User: ${user.name}
User persona: ${user.persona}

Active Friends:
${activeFriends.map((f) => `- ${f.name} (${f.persona})`).join("\n")}

Friend Profiles:
${JSON.stringify(
  activeFriends.map((f) => ({
    name: f.name,
    persona: f.persona,
    about: f.about,
  })),
  undefined,
  2,
)}

Latest Message: "${message}"

Based on the provided information, determine which 1-3 friends should respond to this message. Consider the message content, the user's profile, and the friends' personalities and about. Provide your response as an array of friend names.`;

    const jsonSchema = {
      type: "object",
      properties: {
        friends: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["friends"],
    };
    const responseFormat = JSON.stringify({
      schema: jsonSchema,
      name: "respondingFriends",
    });

    try {
      this.logger.debug("Calling unifyAgentChatWithResponseFormat");
      const result = await unifyAgentChatWithResponseFormat(
        userPrompt,
        systemPrompt,
        responseFormat,
      );

      this.logger.debug(
        `Result from unifyAgentChatWithResponseFormat: ${result}`,
      );

      const parsedResult = JSON.parse(result) as { friends?: string[] };
      if (parsedResult && Array.isArray(parsedResult.friends)) {
        return parsedResult.friends;
      }

      throw new Error(
        "Invalid response format from unifyAgentChatWithResponseFormat",
      );
    } catch (error) {
      this.logger.error("Error in routeMessage:", error);
      if (error instanceof Error) {
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
      }
      // Fallback logic
      this.logger.warn("Using fallback logic to select friends");
      return activeFriends
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1)
        .map((f) => f.name);
    }
  }

  @Process("generateFriendSummary")
  async handleGenerateFriendSummary(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    const { friendsData } = job.data as { friendsData: FriendsData };
    const aiFriends = friendsData.friends;

    const friendsInfo = aiFriends.map(
      (friend) => `${friend.name}: ${friend.persona}, about: ${friend.about}`,
    );
    const systemPrompt = systemPromptFriendSummary;
    const userPrompt = `AI Friends:\n${friendsInfo.join(
      "\n",
    )}\n\nPlease provide a brief summary of these AI friends, highlighting their key characteristics and how they might interact in a group chat.`;

    let summary = await unifyAgentChat(userPrompt, systemPrompt);
    if (summary === "I am busy now, I will respond later.") {
      summary = await openaiChat(userPrompt, systemPrompt);
    }

    return summary;
  }

  @Process("trackTokens")
  async handleTokenTracking(job: Job) {
    try {
      await chargeUser(
        job.data as {
          id: string;
          userId: string;
          tokens: number;
          model: string;
          type: string;
          created: string;
        },
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Tracked tokens for user: ${job.data.userId || "unknown"} ${
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          job.data.tokens || "unknown"
        }`,
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to track tokens: ${error.message}`);
      } else {
        this.logger.error("Failed to track tokens: Unknown error occurred");
      }
      throw error;
    }
  }
}
