# MCP CLI

A command-line interface for interacting with MCP (Model Context Protocol) servers using stdio transport.

## Installation

```bash
# Clone the repository
git clone [repo-url]
cd mcp-made-simple/pro/cli

# Install dependencies 
npm install

# Build the CLI
npm run build

# Make it executable
chmod +x dist/index.js

# Install globally (optional)
npm install -g .
```

## Usage

### Starting the CLI

```bash
# If installed globally
mcp-cli

# Or run locally
npm start
```

### Available Commands

Once the CLI is running, you can use the following commands:

- `greet <name>` - Send a greeting to the specified name
- `listTools` - List all available tools
- `help` - Show the help message
- `exit` or `quit` - Exit the CLI

### Examples

```
MCP> greet Alice
Hello, Alice! Welcome to the Model Context Protocol.

MCP> listTools
Available tools:
  greeting - Returns a greeting message
    Required parameters: name

MCP> help
Available commands:
  greet <name> - Send a greeting to the specified name
  listTools    - List available tools
  help         - Show this help message
  exit, quit   - Exit the CLI
```

## Notes

- This CLI automatically spawns the MCP server process when started
- Communication with the server is done via stdio (standard input/output)
- The server is automatically terminated when you exit the CLI 