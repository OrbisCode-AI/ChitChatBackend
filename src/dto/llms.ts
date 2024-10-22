import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsObject, IsString } from "class-validator";

export class AiFriendResponseDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "User prompt",
    example: "let's discuss story",
  })
  userPrompt!: string;

  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "Data object",
    example: {
      aiFriend: {
        name: "John",
        persona: "A helpful assistant",
        about: "I am a helpful assistant",
        knowledge_base: "I know a lot of things",
      },
      user: {
        name: "Jane",
        persona: "A curious user",
        about: "I am a curious user",
        knowledge_base: "I know a lot of things",
      },
      friendsSummary: "A friendly AI and a human user",
    },
  })
  dataObject!: DataObject;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Session type",
    example: "StoryMode",
  })
  sessionType!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Session description",
    example: "A story about a cat",
  })
  sessionDescription!: string;

  @IsArray()
  @IsNotEmpty()
  @ApiProperty({
    description: "Last conversation",
    example: ["Hello, how are you?", "I am fine, thank you."],
  })
  lastConversation!: string[];
}
