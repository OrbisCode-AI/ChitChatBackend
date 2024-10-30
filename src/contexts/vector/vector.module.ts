import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import atlasSearchPlugin from "mongoose-atlas-search";

import { DocsSchema, MemorySchema } from "./docs.schema";
import { VectorController } from "./vector.controller";
import { VectorService } from "./vector.service";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>("MONGODB_URL");
        if (!uri) {
          throw new Error(
            "MONGODB_URI is not defined in the environment variables",
          );
        }
        return {
          uri,
          dbName: "Memory",
          connectionFactory: (connection: Connection) => {
            // Define interfaces for the document types
            interface IChatHistory {
              text: string;
              embedding: number[];
              metadata: Record<string, unknown>;
            }

            interface IFriendsMemory {
              text: string;
              embedding: number[];
              metadata: Record<string, unknown>;
            }

            // Create models with proper typing
            const ChatHistory = connection.model<IChatHistory>(
              "ChatHistory",
              DocsSchema,
            );

            const FriendsMemory = connection.model<IFriendsMemory>(
              "FriendsMemory",
              MemorySchema,
            );

            // Add plugins with proper typing
            connection.plugin((schema) => {
              atlasSearchPlugin.initialize({
                model: ChatHistory,
              });
              Logger.log("ChatHistory plugin applied", schema);
            });

            connection.plugin((schema) => {
              atlasSearchPlugin.initialize({
                model: FriendsMemory,
              });
              Logger.log("FriendsMemory plugin applied", schema);
            });

            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: "ChatHistory", schema: DocsSchema, collection: "ChatHistory" },
      {
        name: "FriendsMemory",
        schema: MemorySchema,
        collection: "FriendsMemory",
      },
    ]),
  ],
  controllers: [VectorController],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
