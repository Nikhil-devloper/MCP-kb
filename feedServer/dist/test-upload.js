"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
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
const sampleContent = `# Test Document with ID: ${uniqueId}

This is a special test document containing the unique search term: ${uniqueSearchTerm}

## Features

- Automatic embedding generation
- OpenSearch integration
- Vector search capabilities
- Unique identifier: ${uniqueId}
  
## How it works

When this document is uploaded to the API, a Lambda function will:
1. Extract the text content
2. Generate embeddings using Amazon Bedrock's Titan model
3. Store the document and its embedding in OpenSearch

This enables semantic search capabilities!

## OpenSearch Testing Instructions

After uploading this document, go to the OpenSearch Dashboard and run:

\`\`\`
GET documents/_search
{
  "query": {
    "match_phrase": {
      "content": "${uniqueSearchTerm}"
    }
  }
}
\`\`\`

You should see this document in the results!
`;
fs.writeFileSync(sampleFilePath, sampleContent);
console.log(`Created sample document at: ${sampleFilePath}`);
console.log(`Unique search term: ${uniqueSearchTerm}`);
async function uploadDocument() {
    try {
        // Create form data with the file and metadata
        const form = new form_data_1.default();
        form.append('file', fs.createReadStream(sampleFilePath));
        form.append('title', `Test Document ${uniqueId}`);
        form.append('tags', `test,embedding,bedrock,${uniqueId}`);
        console.log('Uploading document to API...');
        // Post to the API
        const response = await axios_1.default.post(API_URL, form, {
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
    }
    catch (error) {
        console.error('Error uploading document:');
        if (error.response) {
            console.error('API Response:', error.response.status, error.response.data);
        }
        else {
            console.error(error.message || 'Unknown error');
        }
    }
}
// Run the upload
uploadDocument();
//# sourceMappingURL=test-upload.js.map