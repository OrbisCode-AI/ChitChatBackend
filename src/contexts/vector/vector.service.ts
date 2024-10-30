import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Collection } from "mongodb";
import { Model } from "mongoose";

import { friendsMemory } from "@/src/prompts/friendsmemory";
import { unifyAgentChat } from "@/src/utils/models";

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    @InjectModel("ChatHistory") private readonly docsModel: Model<unknown>,
    @InjectModel("FriendsMemory") private readonly MessageModel: Model<unknown>,
    private readonly configService: ConfigService,
  ) {}

  async addDocumentsToVectorStore(
    message: string,
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<string> {
    try {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>("OPENAI_API_KEY"),
        modelName: "text-embedding-3-small",
      });

      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: this.docsModel.collection as unknown as Collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
      });

      const expirationTime = this.calculateExpirationTime();
      const documents = [
        new Document({
          pageContent: message,
          metadata: {
            source: "ChatHistory",
            userId: userId,
            conversationId: conversationId,
            messageId: messageId,
            expireAt: expirationTime,
          },
        }),
      ];

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(documents);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await vectorStore.addDocuments(splitDocs);
      try {
        await this.docsModel.collection.createIndex(
          { expireAt: 1 },
          { expireAfterSeconds: 0 },
        );
        this.logger.log("TTL index created for Docs collection");
      } catch (error) {
        this.logger.error(
          "Error creating TTL index for Docs collection:",
          error,
        );
        throw new Error("Failed to create TTL index for Docs collection");
      }

      this.logger.log("Documents added to vector store");
      return "Successfully added to vector store";
    } catch (error) {
      this.logger.error("Error adding documents to vector store:", error);
      throw new Error("Failed to add documents to vector store");
    }
  }

  async addMemoryToVectorStore(
    MomoryContext: string,
    conversationId: string,
    friendId: string,
    messageId: string,
    userId: string,
  ): Promise<string> {
    try {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>("OPENAI_API_KEY"),
        modelName: "text-embedding-3-small",
      });

      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: this.MessageModel.collection as unknown as Collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
      });

      const expirationTime = this.calculateExpirationTime();
      const documents = [
        new Document({
          pageContent: MomoryContext,
          metadata: {
            source: "FriendsMemory",
            userId: userId,
            conversationId: conversationId,
            friendId: friendId,
            messageId: messageId,
            expireAt: expirationTime,
          },
        }),
      ];

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(documents);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await vectorStore.addDocuments(splitDocs);
      try {
        await this.MessageModel.collection.createIndex(
          { expireAt: 1 },
          { expireAfterSeconds: 0 },
        );
        this.logger.log("TTL index created for Docs collection");
      } catch (error) {
        this.logger.error(
          "Error creating TTL index for Docs collection:",
          error,
        );
        throw new Error("Failed to create TTL index for Docs collection");
      }

      this.logger.log("Documents added to vector store");
      return "Successfully added to vector store";
    } catch (error) {
      this.logger.error("Error adding documents to vector store:", error);
      throw new Error("Failed to add documents to vector store");
    }
  }

  private calculateExpirationTime(): Date {
    const currentTime = new Date();
    const ttlSeconds = 60 * 60 * 24 * 7; // 7 days
    return new Date(currentTime.getTime() + ttlSeconds * 1000);
  }
  // Vector search
  async vectorSearch(
    query: string,
    userId: string,
    conversationId: string,
  ): Promise<string> {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.configService.get<string>("OPENAI_API_KEY"),
      modelName: "text-embedding-3-small",
    });

    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: this.docsModel.collection as unknown as Collection,
      indexName: "vector_index",
      textKey: "text",
      embeddingKey: "embedding",
    });

    const retriever = vectorStore.asRetriever({
      searchType: "mmr",
      searchKwargs: {
        fetchK: 4,
        lambda: 0.1,
      },
      filter: {
        preFilter: {
          source: {
            $eq: "ChatHistory",
          },
          userId: {
            $eq: userId,
          },
          conversationId: {
            $eq: conversationId,
          },
        },
      },
    });

    const retrieverOutput = await retriever.invoke(query);
    this.logger.log("retrieverOutput", retrieverOutput);
    const docsContent = retrieverOutput
      .map((doc) => doc.pageContent)
      .join("\n");
    this.logger.log("docsContent", docsContent);
    return docsContent;
  }

  // Create memory summary and store in vector DB
  async createMemorySummary(
    dataInfo: DataInfo,
    userId: string,
    conversationId: string,
    lastConversations: string,
  ): Promise<string> {
    try {
      // Replace placeholders in memory prompt template
      const memoryPrompt = friendsMemory
        .replace("{aiFriendName}", dataInfo.aiFriendName)
        .replace("{aiFriendPersona}", dataInfo.aiFriendPersona)
        .replace("{aiFriendAbout}", dataInfo.aiFriendAbout)
        .replace("{aiFriendKnowledgeBase}", dataInfo.aiFriendKnowledgeBase)
        .replace("{FriendsSummary}", dataInfo.friendsSummary);

      const inputPrompt = `
      The Group Coversation : ${lastConversations}
      `;

      const memorySummary = await unifyAgentChat(inputPrompt, memoryPrompt);

      if (!memorySummary) {
        throw new Error("Failed to generate memory summary");
      }

      // Store in MongoDB in VectorDB
      await this.addMemoryToVectorStore(
        memorySummary,
        conversationId, // Using conversationId
        dataInfo.aiFriendId, // Using aiFriendId as friendId
        `${dataInfo.aiFriendName}-${dataInfo.aiFriendId}-${Date.now()}`, // Generate unique message ID
        userId, // Using userId
      );
      return "Successfully created memory summary";
    } catch (error) {
      this.logger.error("Error creating memory summary:", error);
      throw error;
    }
  }
}
