"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
// Initialize DynamoDB client
const client = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    // If running locally, you can set AWS credentials via environment variables:
    // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
});
const dynamoDb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DOCUMENTS_TABLE || 'knowledge-base-api-dev-documents';
// Configure multer for memory storage
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Upload a document
app.post('/documents', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file || !req.body.title) {
            return res.status(400).json({ error: 'File and title are required' });
        }
        const document = {
            id: (0, uuid_1.v4)(),
            title: req.body.title,
            content: req.file.buffer.toString(),
            type: req.file.originalname.endsWith('.md') ? 'markdown' : 'text',
            tags: req.body.tags ? req.body.tags.split(',') : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        yield dynamoDb.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: document,
        }));
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Could not upload document' });
    }
}));
// Get all documents
app.get('/documents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield dynamoDb.send(new lib_dynamodb_1.ScanCommand({
            TableName: TABLE_NAME,
        }));
        res.json(result.Items);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Could not fetch documents' });
    }
}));
// Get a single document
app.get('/documents/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield dynamoDb.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: {
                id: req.params.id,
            },
        }));
        if (!result.Item) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result.Item);
    }
    catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Could not fetch document' });
    }
}));
exports.default = app;
