// 0. Import dependencies
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { greetingToolDefinition, handleGreeting } from "./tools/greeting.js";
import { documentQueryToolDefinition, handleDocumentQuery } from "./tools/documentQuery.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// 1. Create MCP server instance
const server = new Server({
    name: "mcp-document-query",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {
            greeting: greetingToolDefinition,
            documentQuery: documentQueryToolDefinition,
        },
    },
});
// 2. Define the list of tools
server.setRequestHandler(ListToolsRequestSchema, () => {
    console.log("Handling listTools request");
    return {
        tools: [greetingToolDefinition, documentQueryToolDefinition],
    };
});
// 3. Add tool call logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log("Received callTool request:", JSON.stringify(request));
    const params = request.params;
    const { name, arguments: args } = params;
    console.log(`Handling callTool request for tool: ${name}`);
    console.log(`Arguments: ${JSON.stringify(args)}`);
    switch (name) {
        case "greeting":
            return handleGreeting(args);
        case "documentQuery":
            return handleDocumentQuery(args);
        default:
            console.error(`Unknown tool requested: ${name}`);
            throw new Error(`Unknown tool: ${name}`);
    }
});
// 4. Start the MCP server
async function main() {
    const transport = new StdioServerTransport();
    // Add error handling for the transport
    transport.onerror = (error) => {
        console.error("Transport error:", error);
    };
    // Add message handler to log all incoming messages
    transport.onmessage = (message) => {
        console.log("Received message:", JSON.stringify(message));
        // Try to parse the message as a generic JSON-RPC request
        try {
            const messageStr = JSON.stringify(message);
            const parsedMessage = JSON.parse(messageStr);
            // Check if it's a request with a method
            if (parsedMessage.method) {
                console.log(`Received method: ${parsedMessage.method}`);
                // Handle listTools method
                if (parsedMessage.method === 'listTools') {
                    console.log("Handling listTools request directly");
                    const response = {
                        jsonrpc: "2.0",
                        id: parsedMessage.id,
                        result: {
                            tools: [greetingToolDefinition, documentQueryToolDefinition]
                        }
                    };
                    console.log("Sending response:", JSON.stringify(response));
                    transport.send(response);
                    return;
                }
                // Handle callTool method
                if (parsedMessage.method === 'callTool') {
                    console.log("Handling callTool request directly");
                    const params = parsedMessage.params;
                    const { name, arguments: args } = params;
                    console.log(`Handling callTool request for tool: ${name}`);
                    console.log(`Arguments: ${JSON.stringify(args)}`);
                    try {
                        let result;
                        switch (name) {
                            case "greeting":
                                result = handleGreeting(args);
                                break;
                            case "documentQuery":
                                result = handleDocumentQuery(args);
                                break;
                            default:
                                console.error(`Unknown tool requested: ${name}`);
                                throw new Error(`Unknown tool: ${name}`);
                        }
                        const response = {
                            jsonrpc: "2.0",
                            id: parsedMessage.id,
                            result: result
                        };
                        console.log("Sending response:", JSON.stringify(response));
                        transport.send(response);
                    }
                    catch (error) {
                        console.error("Error handling tool call:", error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        const errorResponse = {
                            jsonrpc: "2.0",
                            id: parsedMessage.id,
                            error: {
                                code: -32603,
                                message: `Internal error: ${errorMessage}`
                            }
                        };
                        console.log("Sending error response:", JSON.stringify(errorResponse));
                        transport.send(errorResponse);
                    }
                    return;
                }
                // If method is not recognized, send an error response
                console.log(`Method not found: ${parsedMessage.method}`);
                const errorResponse = {
                    jsonrpc: "2.0",
                    id: parsedMessage.id,
                    error: {
                        code: -32601,
                        message: `Method not found: ${parsedMessage.method}`
                    }
                };
                console.log("Sending error response:", JSON.stringify(errorResponse));
                transport.send(errorResponse);
            }
        }
        catch (error) {
            console.error("Error parsing message:", error);
        }
    };
    await server.connect(transport);
    console.log("MCP Document Query Server running on stdio");
    console.log("Available tools: greeting, documentQuery");
}
main().catch((error) => {
    console.error("Server error:", error);
});
