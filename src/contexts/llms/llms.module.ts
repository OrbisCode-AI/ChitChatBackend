import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { GENERATE_QUEUE } from "../shared/contants";
import { LlmsConsumer } from "./llms.consumer";
import { LlmsController } from "./llms.controller";
import { LlmsService } from "./llms.service";

@Module({
  controllers: [LlmsController],
  providers: [LlmsService, LlmsConsumer],
  imports: [
    BullModule.forRoot({
      redis: {
        host: "localhost",
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: GENERATE_QUEUE,
    }),
  ],
})
export class LlmsModule {}
