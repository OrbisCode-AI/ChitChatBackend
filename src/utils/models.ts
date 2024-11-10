import { ConfigService } from "@nestjs/config";
import { OpenAI } from "openai";
import Together from "together-ai";

let together: Together | undefined;
let openai: OpenAI | undefined;

export function initializeClients(configService: ConfigService) {
  together = new Together({
    apiKey: configService.get<string>("TOGETHER_API_KEY"),
  });

  openai = new OpenAI({
    apiKey: configService.get<string>("OPENAI_API_KEY"),
    dangerouslyAllowBrowser: true,
  });
}

export async function unifyAgentChat(
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  const unifyUrl = process.env.UNIFY_BASE_URL;
  const unifyApiKey = process.env.UNIFY_API_KEY;
  if (!unifyUrl || !unifyApiKey) {
    throw new Error("Unify URL or API key is not set");
  }
  const response = await fetch(unifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${unifyApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini@openai",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 1,
      stream: false,
      frequency_penalty: 1.5,
      n: 1,
      drop_params: true,
    }),
  });

  if (!response.ok) {
    // throw new Error(`HTTP error! status: ${response.status}`);
    return "I am busy now, I will respond later.";
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return (
    data.choices[0].message.content || "I am busy now, I will respond later."
  );
}

export async function unifyAgentChatWithResponseFormat(
  userPrompt: string,
  systemPrompt: string,
  responseFormat: string,
): Promise<string> {
  try {
    const unifyUrl = process.env.UNIFY_BASE_URL;
    const unifyApiKey = process.env.UNIFY_API_KEY;
    if (!unifyUrl || !unifyApiKey) {
      throw new Error("Unify URL or API key is not set");
    }
    const response = await fetch(unifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${unifyApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini@openai",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 1,
        stream: false,
        frequency_penalty: 1.5,
        n: 1,
        drop_params: true,
        response_format: {
          type: "json_schema",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          json_schema: JSON.parse(responseFormat),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[LlmsConsumer] Error in unifyAgentChatWithResponseFormat:",
      error,
    );
    throw error;
  }
}

export async function openaiChat(
  userPrompt: string,
  systemPrompt: string,
): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI client is not initialized");
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 150,
    temperature: 1,
  });

  return (
    completion.choices[0].message.content ||
    "I am busy now, I will respond later."
  );
}

async function imagePromptEnhancer(prompt: string): Promise<string> {
  const response = await unifyAgentChat(
    `Create a unique and visually stunning image based on this concept: ${prompt}. Enhance it with vivid details, dramatic lighting, and unexpected elements to make it truly extraordinary.`,
    "You are an expert visual artist and creative director. Your task is to transform basic concepts into breathtaking, one-of-a-kind image descriptions that push the boundaries of imagination.",
  );
  return response;
}
export async function imageGen(prompt: string): Promise<string> {
  if (!together) {
    throw new Error("Together client is not initialized");
  }
  const enhancedPrompt = await imagePromptEnhancer(prompt);
  const response = await together.images.create({
    model: "black-forest-labs/FLUX.1-schnell-Free",
    prompt: enhancedPrompt,
    width: 960,
    height: 768,
    steps: 4,
    n: 1,
    seed: 1000,
    // @ts-expect-error Need to fix the TypeScript library type
    response_format: "b64_json",
  });
  return response.data[0].b64_json;
}

// const b64Image = await imageGen(
//   'Create a realistic red dragon with blue-white flames from mouth'
// );
// this.logger.log(b64Image);
export async function llamaVisionChat(
  userPrompt: string,
  systemPrompt: string,
  imageUrl?: string,
): Promise<string> {
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: imageUrl
        ? [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
            { type: "text", text: userPrompt },
          ]
        : userPrompt,
    },
  ];

  if (!together) {
    throw new Error("Together client is not initialized");
  }
  const response = await together.chat.completions.create({
    model: "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",
    max_tokens: 150,
    temperature: 1,
    // @ts-expect-error Need to fix the TypeScript library type
    messages: messages,
  });

  // this.logger.log(response);

  return (
    response.choices[0]?.message?.content ||
    "I am busy now, I will respond later."
  );
}
