import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from "class-validator";

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
