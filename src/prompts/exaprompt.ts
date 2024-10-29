export const queryPrompt = `Based on the following conversation, generate a detailed, statement-based search query for finding relevant web content. Use the following guidelines to improve the query:
          
- Phrase as Statements: "Here's a great article about X:" works better than "What is X?"
- Add Context: Include modifiers like "funny", "academic", or specific websites to narrow results.
- End with a Colon: Many effective prompts end with ":", mimicking natural link sharing.

Examples:
Bad: "best restaurants in SF"
Good: "Here is the best restaurant in SF:"

Bad: "What's the best way to learn cooking?"
Good: "This is the best tutorial on how to get started with cooking:"

Last message: {last_message}
Current input: {input}

Search query:`;

export const summariseWebSearchAccordingToExaQuery = `
Summarise the web search according to Exa's query: {query}

Web search results: {web_search_results}

Summary:
`;
