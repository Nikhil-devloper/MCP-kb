# MCP Document Query Server

This server implements the Model Context Protocol (MCP) and provides tools for querying a knowledge base of documents.

## Overview

The server connects to a document API that stores Markdown and text files, and provides tools to query and retrieve information from these documents. It uses document chunking and relevance scoring to find the most relevant information for a given query.

## Tools

### 1. Greeting Tool

A simple greeting tool that returns a welcome message.

```json
{
  "name": "greeting",
  "description": "Returns a greeting message",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "The name to greet"
      }
    },
    "required": ["name"]
  }
}
```

### 2. Document Query Tool

A tool that queries the knowledge base to find relevant information for a given question.

```json
{
  "name": "documentQuery",
  "description": "Queries the knowledge base to answer questions based on uploaded documents",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The question to answer based on document content"
      }
    },
    "required": ["query"]
  }
}
```

## Integration with Document API

The server connects to a document API at `https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev` to retrieve documents. The API provides the following endpoints:

- `GET /documents` - List all documents
- `GET /documents/{documentId}` - Get a specific document
- `POST /documents` - Upload a new document

## How It Works

1. When a query is received, the server fetches all documents from the API
2. It splits each document into smaller chunks (default: 500 characters with 100 character overlap)
3. It calculates a relevance score for each chunk based on:
   - Word-level matches between the query and chunk content
   - Exact phrase matches (weighted more heavily)
4. It sorts chunks by relevance score and returns the top 5 most relevant chunks
5. The chunks are grouped by document and displayed in the response

## Document Chunking

The document chunking process:
- Splits documents into smaller, manageable pieces
- Tries to end chunks at sentence or paragraph boundaries
- Includes overlap between chunks to maintain context
- Handles documents of varying sizes appropriately

## Relevance Scoring

The relevance scoring algorithm:
- Performs case-insensitive matching
- Weights exact phrase matches more heavily than individual word matches
- Considers word frequency in the chunk
- Normalizes scores based on query length

## Future Improvements

For production use, consider implementing:

1. **Vector Embeddings**: Use a vector database or embedding model for semantic search
2. **LLM Integration**: Integrate with a language model to generate comprehensive answers
3. **Caching**: Cache document results to improve performance
4. **Authentication**: Add authentication to the API calls
5. **Pagination**: Implement pagination for large document sets

## Setup and Running

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will connect to the document API and be ready to process queries. 