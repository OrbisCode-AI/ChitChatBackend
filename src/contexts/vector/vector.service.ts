import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Collection } from "mongodb";
import { Model } from "mongoose";

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    @InjectModel("ChatHistory") private readonly docsModel: Model<unknown>,
    private readonly configService: ConfigService,
  ) {}

  async addDocumentsToVectorStore(
    message: string,
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<string> {
    try {
      const existingDoc = await this.docsModel.findOne({
        "metadata.messageId": messageId,
      });
      if (existingDoc) {
        this.logger.log(
          `Document with messageId ${messageId} already exists in the database.`,
        );
        return messageId;
      }

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get<string>("OPENAI_API_KEY"),
        modelName: "text-embedding-3-small",
      });

      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: this.docsModel.collection as unknown as Collection,
        indexName: "vector_index",
        textKey: "pageContent",
        embeddingKey: "embedding",
      });

      const expirationTime = this.calculateExpirationTime();
      const documents = [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
        console.log("TTL index created for Docs collection");
      } catch (error) {
        console.error("Error creating TTL index for Docs collection:", error);
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
    const ttlSeconds = 60 * 60; // 1 hour
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
      textKey: "pageContent",
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
    console.log("retrieverOutput", retrieverOutput);
    const docsContent = retrieverOutput
      .map((doc) => doc.pageContent)
      .join("\n");
    console.log("docsContent", docsContent);
    return docsContent;
  }
}
