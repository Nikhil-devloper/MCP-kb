import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// Configuration
const API_URL = 'https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/documents';
const SAMPLE_DIR = path.join(__dirname, '..', 'samples');

// Create a unique identifier for this upload
const uniqueId = `test-${Date.now()}`;
const uniqueSearchTerm = `UniqueMarker${uniqueId.substring(0, 8)}`;

// Create samples directory if it doesn't exist
if (!fs.existsSync(SAMPLE_DIR)) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
}

// Create a sample markdown file with the unique marker
const sampleFilePath = path.join(SAMPLE_DIR, `sample-${uniqueId}.md`);
const sampleContent = `# Knowledge Base API Documentation

## What is the Knowledge Base API?

The Knowledge Base API is a serverless application that provides document storage and semantic search capabilities. It is built using AWS services including Lambda, DynamoDB, API Gateway, and OpenSearch. The API enables users to upload, retrieve, and search documents with vector-based semantic search.

This document contains the unique search term: ${uniqueSearchTerm}

## Key Features

- Document storage in DynamoDB with JSON metadata
- Automatic embedding generation using Amazon Bedrock's Titan model
- Vector search capabilities using OpenSearch
- REST API for document CRUD operations
- Semantic search to find relevant information based on meaning, not just keywords

## System Architecture

The Knowledge Base API consists of several components:

1. **API Gateway**: Handles HTTP requests for document operations
2. **DynamoDB**: Stores document metadata and content
3. **Lambda Functions**:
   - Document ingestion: Processes new documents and generates embeddings
   - Question processor: Handles semantic search by embedding questions and finding similar documents
4. **Amazon Bedrock**: Generates embeddings for text using the Titan model
5. **OpenSearch**: Stores document embeddings and provides vector search capabilities

## How it works

When a document is uploaded to the API:
1. The document is stored in DynamoDB
2. DynamoDB streams trigger the documentIngestion Lambda
3. The Lambda generates embeddings with Bedrock
4. The document with embeddings is stored in OpenSearch

When a question is asked:
1. The question processor Lambda generates an embedding for the question
2. It searches OpenSearch for documents with similar embeddings
3. The most relevant documents are returned as context
4. An LLM can then generate an answer based on this context

## OpenSearch Testing Instructions

After uploading this document, you can test the vector search capabilities by asking questions about the Knowledge Base API.

Unique identifier: ${uniqueId}
`;

fs.writeFileSync(sampleFilePath, sampleContent);
console.log(`Created sample document at: ${sampleFilePath}`);
console.log(`Unique search term: ${uniqueSearchTerm}`);

async function uploadDocument() {
  try {
    // Create form data with the file and metadata
    const form = new FormData();
    form.append('file', fs.createReadStream(sampleFilePath));
    form.append('title', `Knowledge Base API Documentation`);
    form.append('tags', `documentation,api,knowledge-base,vector-search,${uniqueId}`);
    
    console.log('Uploading document to API...');
    
    // Post to the API
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      }
    });
    
    console.log('Document uploaded successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\nWhat happens next:');
    console.log('1. The document is stored in DynamoDB');
    console.log('2. DynamoDB streams trigger the documentIngestion Lambda');
    console.log('3. The Lambda generates embeddings with Bedrock');
    console.log('4. The document with embeddings is stored in OpenSearch');
    
    // Now test the question processor
    console.log('\nTesting question processor with a sample question...');
    const questionResponse = await axios.post('https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/question', {
      question: "What is the knowledge base API?"
    });
    
    console.log('\nQuestion processor response:');
    console.log(JSON.stringify(questionResponse.data, null, 2));
    
    console.log('\nTo verify in OpenSearch Dashboard:');
    console.log(`
GET documents/_search
{
  "query": {
    "match_phrase": {
      "content": "${uniqueSearchTerm}"
    }
  }
}
`);
    console.log('\nCheck the Lambda logs for details in CloudWatch');
  } catch (error: any) {
    console.error('Error:');
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    } else {
      console.error(error.message || 'Unknown error');
    }
  }
}

// Run the upload
uploadDocument(); 