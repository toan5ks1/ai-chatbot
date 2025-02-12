import { type CoreUserMessage } from "ai";
import { HumanMessage } from "@langchain/core/messages";
import { ChatWebLLM } from "@langchain/community/chat_models/webllm";

export async function generateTitleFromUserMessage({
  message,
  model,
}: {
  message: CoreUserMessage;
  model: ChatWebLLM;
}) {
  const systemMessage = `
  - Do not need to use thinking process
  - You will generate a short title based on the first message a user begins a conversation with
  - Ensure it is not more than 80 characters long
  - The title should be a summary of the user's message
  - Do not use quotes or colons
`;

  // Call the model with a message and await the response.
  const response = await model.invoke([
    new HumanMessage({
      content: `${systemMessage}\n\n${message}`,
    }),
  ]);

  return response.content;
}
