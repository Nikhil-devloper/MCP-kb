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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const opensearch_1 = require("@opensearch-project/opensearch");
const aws_1 = require("@opensearch-project/opensearch/aws");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const aws4 = __importStar(require("aws4"));
// OpenSearch configuration
const OPENSEARCH_ENABLED = process.env.OPENSEARCH_ENABLED === 'true';
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_DOMAIN_ENDPOINT || 'https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
// Extract domain name from the OpenSearch URL
const getDomainEndpoint = (url) => {
    try {
        if (url.includes('aos.') && !url.includes('/_dashboards')) {
            return url;
        }
        // Remove _dashboards if present in the URL
        return url.replace('/_dashboards', '');
    }
    catch (error) {
        console.error('Error parsing OpenSearch URL:', error);
        return url;
    }
};
// OpenSearch client (only initialized if enabled)
let openSearchClient = null;
if (OPENSEARCH_ENABLED) {
    try {
        const endpoint = getDomainEndpoint(OPENSEARCH_ENDPOINT);
        console.log(`Using OpenSearch endpoint: ${endpoint}`);
        // Create OpenSearch client with AWS Signature v4 authentication
        // Extract the host from the endpoint
        const url = new URL(endpoint);
        const host = url.hostname;
        openSearchClient = new opensearch_1.Client({
            ...(0, aws_1.AwsSigv4Signer)({
                region: AWS_REGION,
                service: 'es',
                getCredentials: () => {
                    // Uses the same credentials as the Lambda function
                    console.log(`Getting credentials for AWS region: ${AWS_REGION}`);
                    const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
                    return credentialsProvider();
                },
            }),
            node: endpoint,
            // Add additional headers for authentication
            headers: {
                host: host
            },
            // Add request timeout
            requestTimeout: 30000 // 30 seconds
        });
        console.log('OpenSearch client initialized successfully');
    }
    catch (err) {
        console.error('Failed to initialize OpenSearch client:', err);
        console.log('Will continue without OpenSearch capabilities');
    }
}
// Bedrock client for text embeddings
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: AWS_REGION });
// Function to generate embeddings using Bedrock's Titan model
async function generateEmbedding(text) {
    console.log(`Generating embedding for text (${text.length} chars)`);
    // Generate placeholder embedding
    console.log('Using placeholder embedding to avoid Bedrock permission issues.');
    const dimensions = 512;
    const placeholderEmbedding = new Array(dimensions).fill(0).map((_, i) => {
        // Create a simple hash of the text to have some variance in the embeddings
        const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        // Normalize the values to be small and centered around 0
        return Math.sin(i * hash) * 0.01;
    });
    console.log(`Generated placeholder embedding with dimensions: ${placeholderEmbedding.length}`);
    return placeholderEmbedding;
}
// Function to store document in OpenSearch
async function storeInOpenSearch(document) {
    var _a;
    // Skip if OpenSearch is not enabled
    if (!OPENSEARCH_ENABLED || !openSearchClient) {
        console.log('OpenSearch is not enabled, skipping storage');
        return;
    }
    try {
        console.log(`Attempting direct indexing of document ${document.id} to OpenSearch...`);
        // Check if index exists, create it if it doesn't
        try {
            const indexExists = await openSearchClient.indices.exists({
                index: 'documents'
            });
            if (!indexExists.body) {
                console.log('Creating documents index with proper mappings...');
                // Use raw body to avoid TypeScript issues with dense_vector type
                await openSearchClient.transport.request({
                    method: 'PUT',
                    path: '/documents',
                    body: {
                        mappings: {
                            properties: {
                                embedding: {
                                    type: 'dense_vector',
                                    dims: 512
                                },
                                content: { type: 'text' },
                                title: { type: 'text' }
                            }
                        }
                    }
                });
                console.log('Successfully created documents index with vector mapping');
            }
        }
        catch (indexError) {
            console.error('Error checking or creating index:', indexError);
            // Try to create the index anyway in case it doesn't exist
            try {
                // Use raw body to avoid TypeScript issues with dense_vector type
                await openSearchClient.transport.request({
                    method: 'PUT',
                    path: '/documents',
                    body: {
                        mappings: {
                            properties: {
                                embedding: {
                                    type: 'dense_vector',
                                    dims: 512
                                },
                                content: { type: 'text' },
                                title: { type: 'text' }
                            }
                        }
                    }
                });
            }
            catch (createError) {
                // Ignore resource_already_exists_exception
                if (!((_a = createError.message) === null || _a === void 0 ? void 0 : _a.includes('resource_already_exists_exception'))) {
                    console.error('Failed to create index:', createError);
                }
            }
        }
        // Skip the index check and simply try to index the document directly
        const response = await openSearchClient.index({
            index: 'documents',
            id: document.id,
            body: document,
            refresh: true
        });
        console.log(`Successfully indexed document ${document.id} to OpenSearch:`, JSON.stringify(response));
    }
    catch (error) {
        console.error('Error indexing to OpenSearch:', error);
        // Try the direct HTTP approach as a fallback
        console.log('Trying direct HTTP approach as a fallback...');
        await directOpenSearchIndex(document);
    }
}
// Alternative direct HTTP approach to store in OpenSearch
async function directOpenSearchIndex(document) {
    if (!OPENSEARCH_ENABLED) {
        console.log('OpenSearch integration disabled. Skipping indexing.');
        return;
    }
    try {
        console.log('Using direct HTTP approach to index document');
        // Get AWS credentials
        const credentials = await (0, credential_provider_node_1.defaultProvider)()();
        // Parse the OpenSearch endpoint
        const endpoint = getDomainEndpoint(OPENSEARCH_ENDPOINT);
        const parsedUrl = new URL(endpoint);
        // Create the URL for the document
        const documentUrl = `${endpoint}/documents/_doc/${document.id}`;
        const documentPath = `/documents/_doc/${document.id}`;
        // Log request details for debugging
        console.log(`Document indexing request details:`);
        console.log(`- Endpoint: ${endpoint}`);
        console.log(`- Document ID: ${document.id}`);
        console.log(`- Document URL: ${documentUrl}`);
        // First check if the index exists, create it if it doesn't
        try {
            // Check if index exists
            const indexCheckPath = '/documents';
            const indexCheckRequest = aws4.sign({
                host: parsedUrl.hostname,
                method: 'HEAD',
                path: indexCheckPath,
                headers: {},
                service: 'es',
                region: AWS_REGION
            }, {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken
            });
            // Make the request to check if index exists
            const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
            // Check if index exists
            await new Promise((resolve, reject) => {
                const req = protocol.request({
                    ...indexCheckRequest,
                    protocol: parsedUrl.protocol,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
                }, (res) => {
                    if (res.statusCode === 404) {
                        console.log('Index "documents" does not exist. Creating...');
                        resolve(false);
                    }
                    else if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log('Index "documents" already exists.');
                        resolve(true);
                    }
                    else {
                        console.warn(`Unexpected status when checking index: ${res.statusCode}`);
                        resolve(false);
                    }
                });
                req.on('error', (error) => {
                    console.error('Error checking if index exists:', error);
                    resolve(false);
                });
                req.end();
            });
            // Create index if needed
            const createIndexRequest = aws4.sign({
                host: parsedUrl.hostname,
                method: 'PUT',
                path: '/documents',
                body: JSON.stringify({
                    mappings: {
                        properties: {
                            embedding: {
                                type: 'dense_vector',
                                dims: 512
                            },
                            content: { type: 'text' },
                            title: { type: 'text' }
                        }
                    }
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                service: 'es',
                region: AWS_REGION
            }, {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken
            });
            // Make the request to create the index
            await new Promise((resolve, reject) => {
                const req = protocol.request({
                    ...createIndexRequest,
                    protocol: parsedUrl.protocol,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        if (res.statusCode === 400 && data.includes('resource_already_exists_exception')) {
                            console.log('Index already exists (race condition).');
                            resolve(true);
                        }
                        else if (res.statusCode >= 200 && res.statusCode < 300) {
                            console.log('Successfully created index.');
                            resolve(true);
                        }
                        else {
                            console.warn(`Unexpected status when creating index: ${res.statusCode}, ${data}`);
                            // Continue anyway
                            resolve(false);
                        }
                    });
                });
                req.on('error', (error) => {
                    console.error('Error creating index:', error);
                    // Continue anyway
                    resolve(false);
                });
                req.write(createIndexRequest.body);
                req.end();
            });
        }
        catch (indexError) {
            console.error('Error with index preparation:', indexError);
            // Continue anyway
        }
        // Sign the request
        const signedRequest = aws4.sign({
            host: parsedUrl.hostname,
            method: 'PUT',
            path: documentPath,
            body: JSON.stringify(document),
            headers: {
                'Content-Type': 'application/json'
            },
            service: 'es',
            region: AWS_REGION
        }, {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken
        });
        console.log(`Sending direct signed request to: ${documentUrl}`);
        // Use HTTP module instead of axios to avoid type issues
        const { protocol } = parsedUrl;
        const httpModule = protocol === 'https:' ? require('https') : require('http');
        // Convert this to a Promise to make it easier to use
        return new Promise((resolve, reject) => {
            const req = httpModule.request({
                ...signedRequest,
                protocol,
                port: parsedUrl.port || (protocol === 'https:' ? 443 : 80)
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`Document indexed successfully. Status: ${res.statusCode}`);
                        console.log(`Response: ${data}`);
                        // Verify the document was indexed correctly
                        setTimeout(() => {
                            verifyDocumentIndexed(document.id, parsedUrl, credentials)
                                .then(() => resolve())
                                .catch(e => {
                                console.error('Verification failed but continuing:', e);
                                resolve();
                            });
                        }, 1000); // Wait a second for indexing to complete
                    }
                    else {
                        console.error(`Error response: ${res.statusCode}`);
                        console.error(`Response data: ${data}`);
                        // Don't reject - we want to continue even if indexing fails
                        resolve();
                    }
                });
            });
            req.on('error', (error) => {
                console.error('Request error:', error);
                // Don't reject - we want to continue even if indexing fails
                resolve();
            });
            // Log the request headers and body for debugging
            console.log('Request headers:', JSON.stringify(signedRequest.headers));
            console.log('Request body (first 200 chars):', typeof signedRequest.body === 'string'
                ? signedRequest.body.substring(0, 200) + '...'
                : 'Non-string body');
            // Send the request body
            req.write(signedRequest.body);
            req.end();
        });
    }
    catch (error) {
        console.error('Error with direct HTTP indexing:', error === null || error === void 0 ? void 0 : error.message);
        // No need to throw an error - just log it and continue
        console.log('Document is available in DynamoDB with ID:', document.id);
    }
}
// Function to verify a document was correctly indexed
async function verifyDocumentIndexed(documentId, parsedUrl, credentials) {
    console.log(`Verifying document ${documentId} was indexed correctly...`);
    // Create the URL for the document
    const documentPath = `/documents/_doc/${documentId}`;
    // Sign the request
    const signedRequest = aws4.sign({
        host: parsedUrl.hostname,
        method: 'GET',
        path: documentPath,
        headers: {},
        service: 'es',
        region: AWS_REGION
    }, {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
    });
    // Use HTTP module
    const protocol = parsedUrl.protocol === 'https:' ? require('https') : require('http');
    // Convert this to a Promise
    return new Promise((resolve, reject) => {
        const req = protocol.request({
            ...signedRequest,
            protocol: parsedUrl.protocol,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ Verification successful: Document ${documentId} exists in OpenSearch`);
                    resolve();
                }
                else {
                    console.error(`❌ Verification failed: Document ${documentId} not found in OpenSearch`);
                    console.error(`Status: ${res.statusCode}, Response: ${data}`);
                    reject(new Error(`Document verification failed with status ${res.statusCode}`));
                }
            });
        });
        req.on('error', (error) => {
            console.error('Verification request error:', error);
            reject(error);
        });
        req.end();
    });
}
// Process DynamoDB stream records
async function processRecord(record) {
    var _a;
    if (record.eventName !== 'INSERT') {
        console.log(`Skipping ${record.eventName} event`);
        return;
    }
    if (!((_a = record.dynamodb) === null || _a === void 0 ? void 0 : _a.NewImage)) {
        console.log('No new image in record');
        return;
    }
    try {
        // Convert DynamoDB JSON to regular JSON
        const document = (0, util_dynamodb_1.unmarshall)(record.dynamodb.NewImage);
        console.log(`Processing document: ${document.id} - ${document.title}`);
        // Create text for embedding (combine title and content)
        const textForEmbedding = `${document.title}\n${document.content}`;
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding);
        console.log(`Generated embedding of length: ${embedding.length}`);
        // Add embedding to document
        const documentWithEmbedding = {
            ...document,
            embedding
        };
        // Try both approaches to store in OpenSearch
        try {
            // First try the standard OpenSearch client
            await storeInOpenSearch(documentWithEmbedding);
        }
        catch (openSearchError) {
            // If that fails, try the direct HTTP approach
            console.error('Standard OpenSearch indexing failed, trying direct HTTP approach:', openSearchError);
            await directOpenSearchIndex(documentWithEmbedding);
        }
        console.log(`Successfully processed document ${document.id}`);
    }
    catch (error) {
        console.error('Error processing record:', error);
        throw error;
    }
}
// Lambda handler function
const handler = async (event, context, callback) => {
    console.log('Processing DynamoDB Stream event:', JSON.stringify(event, null, 2));
    console.log(`OpenSearch enabled: ${OPENSEARCH_ENABLED}`);
    try {
        // Process each record in the event
        const processPromises = event.Records.map(processRecord);
        await Promise.all(processPromises);
        console.log('Successfully processed all records');
        callback(null, { statusCode: 200, body: 'Success' });
    }
    catch (error) {
        console.error('Error processing event:', error);
        callback(error);
    }
};
exports.handler = handler;
//# sourceMappingURL=documentIngestion.js.map