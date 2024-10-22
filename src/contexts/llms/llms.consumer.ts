import { OnQueueActive, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";

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
}
