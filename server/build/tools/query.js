// Define the tool schema
export const queryToolDefinition = {
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
export async function handleQuery(args) {
    return {
        result: "I am thinking",
    };
}
