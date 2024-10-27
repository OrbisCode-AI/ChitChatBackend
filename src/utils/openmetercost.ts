import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import axios, { AxiosRequestConfig } from "axios";
import { Job } from "bull";

import { GENERATE_QUEUE } from "../contexts/shared/contants";
export const models = {
  gpt4: "gpt-4",
  gpt3: "gpt-3.5-turbo",
  gemini: "gemini-pro",
  dalle: "dalle-e3",
  lora: "lcm-lora",
  playHT: "playHT",
  Deepgram: "Deepgram",
  wizard: "wizard",
};
export const type = {
  input: "input",
  output: "output",
};

export const chargeUser = async (input: {
  id: string;
  userId: string;
  tokens: number;
  model: string;
  type: string;
  created: string;
}) => {
  const { id, userId, tokens, model, type, created } = input;
  if (
    !process.env.OPEN_METER_SECRET ||
    !process.env.OPEN_METER_BASE_URL ||
    !process.env.OPEN_METER_APP_ID
  ) {
    throw new Error("Missing required environment variables for Open Meter");
  }

  const config: AxiosRequestConfig = {
    headers: {
      "Content-Type": "application/cloudevents+json",
      Authorization: `Bearer ${process.env.OPEN_METER_SECRET}`,
    },
  };

  const payload = {
    specversion: "1.0",
    type: "prompt",
    id,
    time: created,
    source: process.env.OPEN_METER_APP_ID,
    subject: userId,
    data: {
      tokens,
      model,
      type,
    },
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await axios.post(
      `${process.env.OPEN_METER_BASE_URL}/api/v1/events`,
      payload,
      config,
    );
  } catch (error) {
    Logger.error("Error charging user:", error);
    throw new Error("Failed to charge user");
  }
};

type OpenMeterInput = {
  id: string;
  userId: string;
  tokens: number;
  model: string;
  type: string;
  created: string;
};

@Processor(GENERATE_QUEUE)
export class GenerateConsumer {
  @Process()
  async generate(job: Job<OpenMeterInput>) {
    const { data } = job;
    await chargeUser({
      id: data.id,
      userId: data.userId,
      tokens: data.tokens,
      model: data.model,
      type: data.type,
      created: new Date().toISOString(),
    });
    Logger.log(`charged user with userId: ${data.userId} for tokens consumed`);
  }
}
