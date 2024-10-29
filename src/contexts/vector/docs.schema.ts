import { Schema } from "mongoose";

export const DocsSchema = new Schema(
  {
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
      source: { type: String, required: true },
      userId: { type: String, required: true },
      conversationId: { type: String, required: true },
      messageId: { type: String, required: true },
      expireAt: { type: Date, required: true, expires: 0 },
    },
  },
  { collection: "ChatHistory" },
);
DocsSchema.index({ "metadata.expireAt": 1 }, { expireAfterSeconds: 0 });
