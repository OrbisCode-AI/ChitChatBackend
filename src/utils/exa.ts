import { Logger } from "@nestjs/common";
import axios from "axios";
import Exa from "exa-js";

import {
  queryPrompt,
  summariseWebSearchAccordingToExaQuery,
} from "../prompts/exaprompt";
import { unifyAgentChat } from "./models";

export const getExaContents = async (urls: string[]): Promise<string> => {
  const EXA_API_KEY = process.env.EXA_API_KEY;

  if (!EXA_API_KEY) {
    throw new Error("EXA_API_KEY is not defined in environment variables");
  }

  const exa = new Exa(EXA_API_KEY);

  try {
    const result = await exa.getContents(urls, {
      text: true,
    });

    const content = result.results.map((item) => ({
      text: item.text,
    }));

    const combinedText = content.map((item) => item.text).join("\n");

    const summary = await unifyAgentChat(
      combinedText,
      summariseWebSearchAccordingToExaQuery,
    );

    return summary;
  } catch (error) {
    Logger.error("Error fetching Exa contents:", error);
    return "No relevant content found.";
  }
};

export const findSimilar = async (
  query: string,
  numResults: number,
): Promise<Record<string, unknown>> => {
  const EXA_API_KEY = process.env.EXA_API_KEY;

  if (!EXA_API_KEY) {
    throw new Error("EXA_API_KEY is not defined in environment variables");
  }

  const exaUrl = `${process.env.EXA_BASE_URL}/search`;
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": EXA_API_KEY,
  };

  const finalQueryPrompt = await unifyAgentChat(query, queryPrompt);

  const data = {
    query: finalQueryPrompt,
    type: "keyword",
    numResults,
    contents: {
      text: true,
    },
  };

  try {
    const response = await axios.post(exaUrl, data, {
      headers,
    });

    if (response.status !== 200) {
      throw new Error(`Error fetching similar content: ${response.statusText}`);
    }

    interface ResultItem {
      url: string;
      title: string;
      text?: string;
      publishedDate?: string;
    }

    interface ApiResponse {
      results: ResultItem[];
    }

    const result = response.data as ApiResponse;
    const sources = result.results.map((item) => ({
      url: item.url,
      title: item.title || "Untitled",
      publishedDate: item.publishedDate || undefined,
    }));

    const context = result.results
      .map((item) => {
        const content = item.text || "";
        const title = item.title ? `Title: ${item.title}\n` : "";
        return `${title}${content}`;
      })
      .filter((text) => text.length > 0)
      .join("\n\n");

    const summary = await unifyAgentChat(
      context,
      summariseWebSearchAccordingToExaQuery,
    );

    return { sources, summary };
  } catch (error) {
    Logger.error("Error fetching similar content:", error);
    return {};
  }
};
