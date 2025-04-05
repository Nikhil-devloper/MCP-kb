# Lesson 1: Creating Your First MCP Server

This lesson demonstrates how to create a basic Model Context Protocol (MCP) server that provides a simple greeting functionality. You'll learn how to structure, build, and use your MCP server in various IDEs like Cursor, Windsurf, and VS Code.

## Video

[Creating Your First MCP Server](https://www.youtube.com/watch?v=rcjdfhhb6ZU) (from [GitHub Tutorial Series](https://github.com/modelcontextprotocol/tutorial))

## Project Structure

```
server/
├── package.json        # Node.js project configuration
├── tsconfig.json      # TypeScript configuration
└── src/
    ├── index.ts       # Main server implementation
    └── tools/         # Tool implementations
        └── greeting.ts # Greeting tool definition
```

## Key Components

1. **Server Setup** (`index.ts`)
   - Creates an MCP server instance
   - Defines tool list
   - Implements tool call handlers
   - Sets up stdio transport

2. **Tool Implementation** (`tools/greeting.ts`)
   - Defines tool interface
   - Implements tool logic

## Building the Server

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Build the server:
   ```bash
   npm run build
   ```

This will:
- Compile TypeScript to JavaScript
- Make the output executable
- Generate files in the `build/` directory

## Using in Different IDEs

### Cursor
1. Install the MCP extension
2. Point to your built server in the MCP settings
3. The greeting tool will be available in your AI commands

### Windsurf
1. Configure the MCP server path in settings
2. The greeting functionality will be accessible through Cascade

### VS Code
1. Install the MCP extension for VS Code
2. Configure the extension to use your built server
3. Access the greeting tool through the command palette

## Key Concepts

- **MCP Server**: A standardized way to extend AI capabilities in IDEs
- **Tools**: Modular functions that can be called by the IDE
- **Transport**: Communication layer (stdio in this case)
- **Request Handlers**: Logic for processing tool requests

## Next Steps

- Try modifying the greeting tool
- Add new tools to the server
- Explore more complex MCP features
