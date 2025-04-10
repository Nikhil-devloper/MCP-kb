# MCP Server with Enhanced Query Tool

This server implements the Model Context Protocol (MCP) with an enhanced query tool that can answer questions about documents stored in a DynamoDB knowledge base.

## Features

- **Greeting Tool**: A simple tool that returns a greeting with the provided name.
- **Enhanced Query Tool**: A tool that connects to a DynamoDB knowledge base and uses Cursor's LLM API to answer questions about the documents.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the server:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Cursor API Integration

The enhanced query tool uses Cursor's API to answer questions about documents. To set up the integration:

1. Get your Cursor API key from your Cursor account.
2. Set the API key as an environment variable:
   ```bash
   export CURSOR_API_KEY=your_api_key_here
   ```
3. Uncomment and modify the API call in `src/tools/enhanced-query.ts` to use your API key.

## Knowledge Base API

The enhanced query tool connects to a knowledge base API that stores documents in DynamoDB. The API has the following endpoints:

- `GET /documents`: List all documents
- `GET /documents/{documentId}`: Get a document by ID
- `POST /documents`: Upload a new document

The API base URL is configured in `src/tools/enhanced-query.ts`.

## Using the CLI

The CLI provides a simple interface to interact with the MCP server:

- `greet <name>`: Send a greeting to the specified name
- `query <question>`: Ask a question about documents in the knowledge base
- `listTools`: List available tools
- `help`: Show help message
- `exit`, `quit`: Exit the CLI

## Example Usage

```
MCP> query What is the knowledge base API?
Based on the documents in the knowledge base, here's what I found:

The answer to your question "What is the knowledge base API?" is that the documents contain information about the knowledge base API, which is a serverless API for managing documents. It uses Node.js, TypeScript, Express, and AWS DynamoDB.

The API has endpoints for uploading documents, retrieving documents by ID, and listing all documents. Documents are stored in DynamoDB with a schema that includes id, title, content, type, tags, and timestamps.

For production use with larger documents, it's recommended to store document content in S3 and keep only metadata in DynamoDB.
```

## Implementation Details

The enhanced query tool works as follows:

1. Fetches documents from the knowledge base API
2. Prepares a context from the documents
3. Sends the question and context to the Cursor API
4. Returns the answer from the Cursor API

The tool limits the number of documents and the length of document content to avoid token limits in the LLM API. 