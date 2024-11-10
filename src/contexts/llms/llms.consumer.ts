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
import { findSimilar, getExaContents } from "@/src/utils/exa";
import {
  llamaVisionChat,
  openaiChat,
  unifyAgentChat,
  unifyAgentChatWithResponseFormat,
} from "@/src/utils/models";

import { chargeUser } from "../../utils/openmetercost";
import { GENERATE_QUEUE } from "../shared/contants";
import { VectorService } from "../vector/vector.service";

@Processor(GENERATE_QUEUE)
export class LlmsConsumer {
  private readonly logger = new Logger(LlmsConsumer.name);

  constructor(private readonly vectorService: VectorService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @Process("aiFriendResponse")
  async handleAiFriendResponse(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    const {
      userPrompt,
      modeData,
      dataObject,
      sessionType,
      sessionDescription,
      lastConversation,
      messageId,
    } = job.data as {
      userPrompt: string;
      modeData: ModeData;
      dataObject: DataObject;
      sessionType: string;
      sessionDescription: string;
      lastConversation: string[];
      messageId: string;
    };

    try {
      // Search for relevant context in vector store
      const relevantContext = await this.vectorService.vectorSearch(
        userPrompt,
        dataObject.userId,
        dataObject.sessionId,
      );

      const retrieveFriendsMemory = await this.vectorService.memorySearch(
        userPrompt,
        dataObject.aiFriendId,
        dataObject.sessionId,
      );

      const userQuery = `

Continue the conversation accordingly to the Recent Chat History:
${lastConversation.join("\n")} 

${dataObject.aiFriend.name}: `;

      // Add relevant context to the system prompt
      let systemPrompt: string;
      switch (sessionType) {
        case "General": {
          systemPrompt = systemPromptGeneral(modeData)
            .replace("{aiFriendName}", dataObject.aiFriend.name)
            .replace("{aiFriendPersona}", dataObject.aiFriend.persona || "")
            .replace("{aiFriendAbout}", dataObject.aiFriend.about || "")
            .replace("{friendsMemory}", retrieveFriendsMemory)
            .replace(
              "{aiFriendKnowledgeBase}",
              dataObject.aiFriend.knowledge_base || "",
            )
            .replace("{userName}", dataObject.user.name)
            .replace("{userPersona}", dataObject.user.persona || "")
            .replace("{userAbout}", dataObject.user.about || "")
            .replace(
              "{userKnowledgeBase}",
              dataObject.user.knowledge_base || "",
            )
            .replace("{friendsSummary}", dataObject.friendsSummary)
            .replace("{descriptionString}", sessionDescription)
            .replace("{lastConversations}", lastConversation.join("\n"))
            .replace("{relevantContext}", relevantContext)
            .replace("{aiFriendName}", dataObject.aiFriend.name);
          break;
        }
        case "StoryMode": {
          systemPrompt = systemPromptStoryMode(modeData)
            .replace("{aiFriendName}", dataObject.aiFriend.name)
            .replace("{descriptionString}", sessionDescription)
            .replace("{friendsSummary}", dataObject.friendsSummary)
            .replace("{friendsMemory}", retrieveFriendsMemory)
            .replace("{lastConversations}", lastConversation.join("\n"))
            .replace("{relevantContext}", relevantContext)
            .replace("{aiFriendName}", dataObject.aiFriend.name);
          break;
        }
        case "ResearchCreateMode": {
          systemPrompt = systemPromptResearchCreateMode(modeData)
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
            .replace("{friendsMemory}", retrieveFriendsMemory)
            .replace("{lastConversations}", lastConversation.join("\n"))
            .replace("{relevantContext}", relevantContext)
            .replace("{aiFriendName}", dataObject.aiFriend.name);
          break;
        }
        default: {
          throw new Error("Invalid session type");
        }
      }
      this.logger.log("systemPrompt", systemPrompt);
      this.logger.log("userQuery", userQuery);

      this.logger.log("systemPrompt", systemPrompt);
      let response = await unifyAgentChat(userQuery, systemPrompt);

      if (!response || response === "I am busy now, I will respond later.") {
        response = await openaiChat(userQuery, systemPrompt);

        if (!response || response === "I am busy now, I will respond later.") {
          response = await llamaVisionChat(userQuery, systemPrompt);
        }
      }

      // Parse name prefix from response if present
      if (response) {
        // Example: "Aman: Hi everyone i love you all : i miss you all"
        // Should become: "Hi everyone i love you all : i miss you all"
        const colonIndex = response.indexOf(":");
        if (colonIndex > 0 && colonIndex < 13) {
          // Name prefix should be reasonably short (less than 13 chars)
          response = response.slice(colonIndex + 1).trim();
        }
      }

      // Store the response in vector DB if we have a valid response
      if (response && response !== "I am busy now, I will respond later.") {
        const message = `${dataObject.aiFriend.name}: ${response}`;
        try {
          await this.vectorService.addDocumentsToVectorStore(
            message,
            dataObject.sessionId,
            messageId,
            dataObject.userId,
          );
        } catch (vectorError) {
          this.logger.error(
            "Error storing response in vector store:",
            vectorError,
          );
          // Continue with the response even if vector store fails
        }
      }

      return response || "I am busy now, I will respond later.";
    } catch (error) {
      this.logger.error("Error in handleAiFriendResponse:", error);
      throw error;
    }
  }

  @Process("messageRoute")
  async handleMessageRoute(job: Job) {
    // this.logger.log("Handling messageRoute job:", job.id);
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    const { message, routerData } = job.data as {
      message: string;
      routerData: RouterData;
    };

    this.logger.log("routerData", routerData);

    return await this.routeMessage(
      message,
      routerData.user,
      routerData.activeFriends,
      routerData.friendsSummary,
    );
  }

  private async routeMessage(
    message: string,
    user: User,
    activeFriends: AiFriend[],
    friendsSummary: string,
  ): Promise<
    { friends: string[]; mode: string; webContent?: string } | undefined
  > {
    const systemPrompt = systemPromptMessageRoute;

    const userPrompt = `

<Friends details>
${friendsSummary}
</Friends details>

<List of friends names who are active and can use in respond>
${activeFriends.map((friend) => `${friend.name}`).join("\n")}
</List of friends names who are active and can use in respond>

Previous Conversation History and Latest Message by ${user.name} -> ${message}

`;

    this.logger.log("userPrompt", userPrompt);
    this.logger.log("systemPrompt", systemPrompt);

    const jsonSchema = {
      type: "object",
      properties: {
        friends: {
          type: "array",
          items: { type: "string" },
        },
        mode: {
          type: "string",
          enum: ["normal", "web"],
        },
      },
      required: ["friends", "mode"],
    };
    const responseFormat = JSON.stringify({
      schema: jsonSchema,
      name: "respondingFriendsAndMode",
    });

    try {
      this.logger.debug("Calling unifyAgentChatWithResponseFormat");
      const result = await unifyAgentChatWithResponseFormat(
        userPrompt,
        systemPrompt,
        responseFormat,
      );

      this.logger.log(
        `Result from unifyAgentChatWithResponseFormat: ${result}`,
      );

      const parsedResult = JSON.parse(result) as {
        friends: string[];
        mode: string;
      };

      if (
        parsedResult &&
        Array.isArray(parsedResult.friends) &&
        parsedResult.mode
      ) {
        let webContent = "no additional content";

        // Extract URLs from message using regex
        const urlRegex =
          // eslint-disable-next-line unicorn/better-regex, no-useless-escape
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
        const urls = message.match(urlRegex);
        this.logger.log("urls", urls);

        // Force mode to web if URLs are found
        const searchResult = {
          sources: [] as {
            url: string;
            title: string;
            publishedDate: string | undefined;
          }[],
          summary: "",
        };

        if (urls) {
          parsedResult.mode = "web";
          const exaResult = await getExaContents(urls);
          if (exaResult && exaResult.sources.length > 0) {
            Object.assign(searchResult, exaResult);
            this.logger.log("searchResult from getExaContents", searchResult);
          } else {
            // Fallback to findSimilar if getExaContents fails or returns empty sources
            const similarResult = await findSimilar(message, 2);
            if (similarResult) {
              Object.assign(searchResult, similarResult);
              this.logger.log(
                "searchResult from fallback findSimilar",
                searchResult,
              );
            }
          }
        } else if (
          parsedResult.mode === "web" ||
          message.toLowerCase().includes("search")
        ) {
          const similarResult = await findSimilar(message, 2);
          if (similarResult) {
            Object.assign(searchResult, similarResult);
            this.logger.log(
              "searchResult from original findSimilar",
              searchResult,
            );
          }
        }

        if (searchResult.sources.length > 0 || searchResult.summary) {
          webContent = `Sources: ${JSON.stringify(
            searchResult.sources,
            undefined,
            2,
          )}\n\nWeb Content Summary: ${searchResult.summary}`;
        }

        this.logger.log("parsedResult", parsedResult);
        return { ...parsedResult, webContent };
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
      this.logger.warn("Using fallback logic to select friends and mode");
      return {
        friends: activeFriends
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 3) + 1)
          .map((f) => f.name),
        mode: "normal",
        webContent: "no additional content",
      };
    }
  }

  @Process("generateFriendSummary")
  async handleGenerateFriendSummary(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    const { friendsData } = job.data as {
      friendsData: FriendsInfo;
    };

    if (!friendsData?.friends || !Array.isArray(friendsData.friends)) {
      throw new Error("Invalid friendsData: friends array is required");
    }

    const aiFriends = friendsData.friends;
    const user = friendsData.user;

    if (!user) {
      throw new Error("Invalid friendsData: user is required");
    }

    const userInfo = `${user.name}: ${user.persona}, about: ${user.about}`;

    const friendsInfo = aiFriends.map(
      (friend) => `${friend.name}: ${friend.persona}, about: ${friend.about}`,
    );
    const systemPrompt = systemPromptFriendSummary;
    const userPrompt = `Friends:\n${friendsInfo.join(
      "\n",
    )}\n\n and ${userInfo}.\n\n
    Friends Summary:
    `;

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
