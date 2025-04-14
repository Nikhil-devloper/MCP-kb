# Knowledge Base with Vector Search

This project implements a knowledge base system with vector search capabilities using AWS services:

## Architecture

The system consists of two main Lambda functions:

1. **Document Ingestion Lambda**: Processes new documents from DynamoDB streams, generates embeddings using Bedrock's Titan model, and stores the documents with their embeddings in OpenSearch.

2. **Question Processing Lambda**: Takes a user question, generates an embedding for it using Bedrock's Titan model, and searches OpenSearch for the most relevant documents using vector similarity.

## Components

- **DynamoDB**: Stores the documents with their metadata.
- **OpenSearch**: Stores the document embeddings and supports vector similarity search.
- **Bedrock**: Generates embeddings for documents and questions using the Titan model.
- **Lambda Functions**: Process documents and questions, generate embeddings, and perform searches.
- **API Gateway**: Provides HTTP endpoints for interacting with the system.

## API Endpoints

- `POST /question`: Takes a question in the request body and returns the most relevant documents.
  ```json
  {
    "question": "What is the knowledge base API?"
  }
  ```

## Deployment

The system can be deployed using AWS SAM:

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Deploy the SAM template
sam deploy --guided
```

## Local Development

For local development, you can run the SAM template locally:

```bash
# Start the local API
sam local start-api

# Invoke a lambda function locally
sam local invoke QuestionProcessorFunction --event events/question-event.json
```

## Environment Variables

- `OPENSEARCH_ENABLED`: Set to 'true' to enable OpenSearch integration.
- `OPENSEARCH_DOMAIN_ENDPOINT`: URL of your OpenSearch domain.
- `AWS_REGION`: AWS region for services (default: 'ap-south-1').

## Implementation Details

### Document Ingestion

When a new document is added to DynamoDB:
1. The document ingestion Lambda is triggered by the DynamoDB stream.
2. It extracts the document content and generates an embedding using Bedrock.
3. It stores the document with its embedding in OpenSearch.

### Question Processing

When a user asks a question:
1. The question is sent to the question processor Lambda.
2. The Lambda generates an embedding for the question using Bedrock.
3. It performs a vector similarity search in OpenSearch to find the most relevant documents.
4. It returns the relevant documents to the user.

### Enhanced Query Tool

The enhanced query tool in the MCP system:
1. Takes a user question.
2. Calls the question processor Lambda to get relevant documents.
3. Prepares a context from the relevant documents.
4. Calls an LLM to generate an answer based on the question and context.
5. Returns the answer to the user.

# Knowledge Base API

A serverless API for managing a knowledge base of documents. Built with Node.js, TypeScript, Express, and AWS DynamoDB.

## API Endpoints

Base URL: `https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev`

### Upload Document
```http
POST /documents
Content-Type: multipart/form-data

Form Fields:
- file: The document file (required)
- title: Document title (required)
- tags: Comma-separated tags (optional)

Example using curl:
curl -X POST https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/documents \
  -F "file=@example.md" \
  -F "title=Example Document" \
  -F "tags=guide,documentation"

Response:
{
  "id": "774dbbde-91c7-490b-ae6e-bf27ad6b3dc5",
  "title": "Example Document",
  "content": "# Example\nThis is example content",
  "type": "markdown",
  "tags": ["guide", "documentation"],
  "createdAt": "2024-04-05T15:32:25.764Z",
  "updatedAt": "2024-04-05T15:32:25.764Z"
}
```

### Get Document by ID
```http
GET /documents/{documentId}

Example:
curl https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/documents/774dbbde-91c7-490b-ae6e-bf27ad6b3dc5

Response:
{
  "id": "774dbbde-91c7-490b-ae6e-bf27ad6b3dc5",
  "title": "Example Document",
  "content": "# Example\nThis is example content",
  "type": "markdown",
  "tags": ["guide", "documentation"],
  "createdAt": "2024-04-05T15:32:25.764Z",
  "updatedAt": "2024-04-05T15:32:25.764Z"
}
```

### List All Documents
```http
GET /documents

Example:
curl x

Response:
[
  {
    "id": "774dbbde-91c7-490b-ae6e-bf27ad6b3dc5",
    "title": "Example Document",
    "content": "# Example\nThis is example content",
    "type": "markdown",
    "tags": ["guide", "documentation"],
    "createdAt": "2024-04-05T15:32:25.764Z",
    "updatedAt": "2024-04-05T15:32:25.764Z"
  },
  // ... more documents
]
```

## Document Schema

Each document in the knowledge base has the following structure:

```typescript
{
  id: string;          // Unique identifier
  title: string;       // Document title
  content: string;     // Document content
  type: 'markdown' | 'text';  // Document type
  tags?: string[];     // Optional array of tags
  createdAt: string;   // Creation timestamp
  updatedAt: string;   // Last update timestamp
}
```

## Storage

Documents are stored in AWS DynamoDB with the following configuration:
- Table Name: `knowledge-base-api-dev-documents`
- Primary Key: `id` (String)
- Region: `ap-south-1`

### Storage Limitations and Considerations

Currently, the document content is stored directly in DynamoDB:
- Maximum document size: 400KB (DynamoDB item size limit)
- Content is stored as plain text in the DynamoDB item
- No S3 integration currently

For production use with larger documents, consider:
1. Storing document content in S3
2. Keeping only metadata and S3 references in DynamoDB
3. Using S3 for documents > 100KB

Recommended Production Schema:
```typescript
{
  id: string;          // Unique identifier
  title: string;       // Document title
  s3Key: string;       // S3 object key for content
  type: 'markdown' | 'text';  // Document type
  tags?: string[];     // Optional array of tags
  createdAt: string;   // Creation timestamp
  updatedAt: string;   // Last update timestamp
  size: number;        // Document size in bytes
}
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start local development server:
```bash
npm run dev
```

3. Deploy to AWS:
```bash
npm run deploy
```

## Notes

- The API accepts both Markdown (.md) and text files
- File type is automatically detected based on file extension
- All endpoints support CORS
- Documents are stored with full text content for future search capabilities
- Consider implementing S3 storage for documents larger than 100KB 