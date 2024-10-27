import { Schema } from "mongoose";

export const DocsSchema = new Schema(
  {
    pageContent: String,
    embedding: [Number],
    metadata: {
      source: String,
      userId: String,
      conversationId: String,
      messageId: { type: String, unique: true },
      expireAt: { type: Date, expires: 0 },
    },
  },
  { collection: "ChatHistory" },
);

DocsSchema.index({ "metadata.messageId": 1 }, { unique: true });
DocsSchema.index({ "metadata.expireAt": 1 }, { expireAfterSeconds: 0 });
