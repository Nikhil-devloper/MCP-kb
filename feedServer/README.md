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