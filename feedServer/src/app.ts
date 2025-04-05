import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Document } from './types/document';
import multer from 'multer';
import cors from 'cors';

const app = express();

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  // If running locally, you can set AWS credentials via environment variables:
  // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
});

const dynamoDb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DOCUMENTS_TABLE || 'knowledge-base-api-dev-documents';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(cors());

// Upload a document
app.post('/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.title) {
      return res.status(400).json({ error: 'File and title are required' });
    }

    const document: Document = {
      id: uuidv4(),
      title: req.body.title,
      content: req.file.buffer.toString(),
      type: req.file.originalname.endsWith('.md') ? 'markdown' : 'text',
      tags: req.body.tags ? req.body.tags.split(',') : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: document,
    }));

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Could not upload document' });
  }
});

// Get all documents
app.get('/documents', async (req, res) => {
  try {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: TABLE_NAME,
    }));

    res.json(result.Items);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Could not fetch documents' });
  }
});

// Get a single document
app.get('/documents/:id', async (req, res) => {
  try {
    const result = await dynamoDb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        id: req.params.id,
      },
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.Item);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Could not fetch document' });
  }
});

export default app; 