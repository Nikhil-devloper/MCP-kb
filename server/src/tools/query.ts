import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

// Define the tool schema
export const queryToolDefinition: Tool = {
  name: "query",
  description: "A tool that returns 'I am thinking'",
  inputSchema: {
    type: "object",
    properties: {},
  },
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
};

// Define the handler function
export async function handleQuery(args: Record<string, unknown>) {
  return {
    result: "I am thinking",
  };
} 