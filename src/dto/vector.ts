import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsString,
} from "class-validator";

export class AddDocumentsToVectorStoreDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Message content to be added to the vector store",
    example: "This is a sample message that will be added to the vector store.",
    minLength: 1,
    maxLength: 1000,
  })
  message!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the message",
    example: "msg123456",
  })
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the conversation",
    example: "conv123456",
  })
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the user",
    example: "user789012",
  })
  userId!: string;
}

export class CreateMemorySummaryDto {
  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "Information about the AI friend and conversation context",
    example: {
      aiFriends: [
        {
          aiFriendId: "ai123456",
          aiFriendName: "Sophie",
          aiFriendPersona:
            "Friendly and empathetic AI assistant with a keen interest in psychology",
          aiFriendAbout:
            "Enjoys helping people, discussing emotions, and understanding human behavior",
          aiFriendKnowledgeBase:
            "Extensive knowledge of psychology, counseling techniques, and interpersonal dynamics",
        },
      ],
    },
  })
  dataInfo!: DataInfo;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Summary of the friends",
    example:
      "John is a software engineer who likes technical discussions. Maria is an artist who shares creative ideas.",
  })
  friendsSummary!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the user",
    example: "user789012",
  })
  userId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the conversation",
    example: "conv123456",
  })
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Recent conversation history to generate memory from",
    example:
      "User: How was your day?\nSophie: It was wonderful! I learned about quantum physics...",
  })
  lastConversations!: string;
}

export class AddMemoryToVectorStoreDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Message content to be added to the vector store",
    example: "This is a sample message that will be added to the vector store.",
    minLength: 1,
    maxLength: 1000,
  })
  MomoryContext!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the message",
    example: "msg123456",
  })
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique Friend Id for the message",
    example: "friend123456",
  })
  friendId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the conversation",
    example: "conv123456",
  })
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the user",
    example: "user789012",
  })
  userId!: string;
}

export class VectorSearchDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "The search query to find relevant documents",
    example: "What is the capital of France?",
    minLength: 3,
    maxLength: 1000,
  })
  query!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Unique identifier for the user performing the search",
    example: "user789012",
  })
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    description: "Unique identifier for the conversation",
    example: "conv123456",
  })
  conversationId!: string;
}
