import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import atlasSearchPlugin from "mongoose-atlas-search";

import { DocsSchema } from "./docs.schema";
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
          connectionFactory: (connection) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            connection.plugin(atlasSearchPlugin.initialize, {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              model: connection.model("ChatHistory", DocsSchema),
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: "ChatHistory", schema: DocsSchema, collection: "ChatHistory" },
    ]),
  ],
  controllers: [VectorController],
  providers: [VectorService],
  exports: [VectorService],
})
export class VectorModule {}
