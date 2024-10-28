import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
} from "class-validator";

enum SessionType {
  STORY_MODE = "StoryMode",
  GENERAL = "General",
  RESEARCH_MODE = "ResearchMode",
}

class AiFriend {
  @ApiProperty({
    description: "Name of the AI friend",
    example: "John",
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: "Persona of the AI friend",
    example: "A helpful assistant",
  })
  @IsString()
  @IsNotEmpty()
  persona!: string;

  @ApiProperty({
    description: "About the AI friend",
    example: "I am a helpful assistant",
  })
  @IsString()
  @IsNotEmpty()
  about!: string;

  @ApiProperty({
    description: "Knowledge base of the AI friend",
    example: "I know a lot of things",
  })
  @IsString()
  @IsNotEmpty()
  knowledge_base!: string;
}

class User {
  @ApiProperty({
    description: "Name of the user",
    example: "Jane",
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: "Persona of the user",
    example: "A curious user",
  })
  @IsString()
  @IsNotEmpty()
  persona!: string;

  @ApiProperty({
    description: "About the user",
    example: "I am a curious user",
  })
  @IsString()
  @IsNotEmpty()
  about!: string;

  @ApiProperty({
    description: "Knowledge base of the user",
    example: "I know a lot of things",
  })
  @IsString()
  @IsNotEmpty()
  knowledge_base!: string;
}

class DataObject {
  @ApiProperty({
    description: "AI friend details",
    type: AiFriend,
  })
  @IsObject()
  @IsNotEmpty()
  aiFriend!: AiFriend;

  @ApiProperty({
    description: "User details",
    type: User,
  })
  @IsObject()
  @IsNotEmpty()
  user!: User;

  @ApiProperty({
    description: "Summary of the friendship",
    example: "A friendly AI and a human user",
  })
  @IsString()
  @IsNotEmpty()
  friendsSummary!: string;
}

class RouterData {
  @ApiProperty({
    description: "User details",
    type: User,
  })
  @IsObject()
  @IsNotEmpty()
  user!: User;

  @ApiProperty({
    description: "List of active friends",
    type: [AiFriend],
  })
  @IsArray()
  @IsNotEmpty()
  activeFriends!: AiFriend[];
}

class FriendsData {
  @ApiProperty({
    description: "List of friends",
    type: [AiFriend],
  })
  @IsArray()
  @IsNotEmpty()
  friends!: AiFriend[];
}

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
    type: DataObject,
  })
  dataObject!: DataObject;

  @IsEnum(SessionType)
  @IsNotEmpty()
  @ApiProperty({
    description: "Session type",
    enum: SessionType,
    example: SessionType.STORY_MODE,
  })
  sessionType!: SessionType;

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

export class MessageRouterDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Message content",
    example: "Hello, how are you?",
  })
  message!: string;

  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "Router data containing user and active friends information",
    type: RouterData,
  })
  routerData!: RouterData;
}

export class GenerateFriendSummaryDto {
  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "Friends data",
    type: FriendsData,
  })
  friendsData!: FriendsData;
}
