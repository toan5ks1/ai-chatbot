import { z } from "zod";
import { tool } from "@langchain/core/tools";

export const getWeatherTool = tool(
  async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();
    return weatherData;
  },
  {
    name: "getWeather",
    description: "Get the current weather at a location",
    schema: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }
);

const calTool = {
  type: "function",
  function: {
    name: "calculator",
    description: "Can perform mathematical operations.",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "The type of operation to execute.",
          enum: ["add", "subtract", "multiply", "divide"],
        },
        number1: { type: "number", description: "First integer" },
        number2: { type: "number", description: "Second integer" },
      },
      required: ["number1", "number2"],
    },
  },
};

export const allTools = [calTool];
