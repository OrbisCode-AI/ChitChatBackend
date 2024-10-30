import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { GENERATE_QUEUE } from "../shared/contants";
import { VectorModule } from "../vector/vector.module";
import { LlmsConsumer } from "./llms.consumer";
import { LlmsController } from "./llms.controller";
import { LlmsService } from "./llms.service";

@Module({
  controllers: [LlmsController],
  providers: [LlmsService, LlmsConsumer],
  imports: [
    VectorModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>("REDIS_HOST"),
          port: configService.get<number>("REDIS_PORT"),
          password: configService.get<string>("REDIS_PASSWORD"),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: GENERATE_QUEUE,
    }),
  ],
})
export class LlmsModule {}
