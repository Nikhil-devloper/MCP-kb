// 0. Import dependencies
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { greetingToolDefinition, handleGreeting } from "./tools/greeting.js";
import { enhancedQueryToolDefinition, handleEnhancedQuery } from "./tools/enhanced-query.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// 1. Create MCP server instance
const server = new Server({
    name: "mcp-hello-world",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 2. Define the list of tools
server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
        tools: [greetingToolDefinition, enhancedQueryToolDefinition],
    };
});
// 3. Add tool call logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = args || {};
    switch (name) {
        case "greeting":
            return handleGreeting(safeArgs);
        case "Zodi":
            return handleEnhancedQuery(safeArgs);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});
// 4. Start the MCP server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error(error);
});
