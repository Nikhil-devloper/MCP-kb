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
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const aws4 = __importStar(require("aws4"));
// Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || 'https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws';
async function main() {
    try {
        console.log('Setting up OpenSearch index...');
        // Get AWS credentials
        const credentials = await (0, credential_provider_node_1.defaultProvider)()();
        // Parse the OpenSearch endpoint
        const parsedUrl = new URL(OPENSEARCH_ENDPOINT);
        // Create the index definition
        const indexDefinition = {
            mappings: {
                properties: {
                    embedding: { type: 'float' },
                    content: { type: 'text' },
                    title: { type: 'text' },
                    id: { type: 'keyword' },
                    type: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' }
                }
            }
        };
        // Create the URL for the index creation
        const indexPath = '/documents';
        // Sign the request with AWS credentials
        const signedRequest = aws4.sign({
            host: parsedUrl.hostname,
            method: 'PUT',
            path: indexPath,
            body: JSON.stringify(indexDefinition),
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
        console.log(`Sending index creation request to: ${OPENSEARCH_ENDPOINT}${indexPath}`);
        // Make the request
        const { protocol } = parsedUrl;
        const httpModule = protocol === 'https:' ? require('https') : require('http');
        // Send the request
        await new Promise((resolve, reject) => {
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
                    if (res.statusCode === 200) {
                        console.log(`✅ Index created successfully.`);
                        console.log(`Response: ${data}`);
                        resolve(true);
                    }
                    else if (res.statusCode === 400 && data.includes('resource_already_exists_exception')) {
                        console.log(`⚠️ Index already exists.`);
                        resolve(true);
                    }
                    else {
                        console.error(`❌ Error response: ${res.statusCode}`);
                        console.error(`Response data: ${data}`);
                        if (res.statusCode === 403) {
                            console.log('\n🔑 Permission Issue:');
                            console.log('This is a common issue with OpenSearch fine-grained access control.');
                            console.log('You need to:');
                            console.log('1. Log into the OpenSearch Dashboard');
                            console.log('2. Navigate to Security -> Roles');
                            console.log('3. Create a role for your user with the necessary permissions');
                            console.log('4. Map your IAM user or role to this OpenSearch role');
                            console.log('\nSee the opensearch-roles.md file for detailed instructions.');
                        }
                        reject(new Error(`Index creation failed with status ${res.statusCode}`));
                    }
                });
            });
            req.on('error', (error) => {
                console.error('Request error:', error);
                reject(error);
            });
            // Send the request body
            req.write(signedRequest.body);
            req.end();
        });
        // Try to add a test document
        console.log('\nTrying to add a test document...');
        const testDocument = {
            id: 'test-manual-doc',
            title: 'Test Document (Manually Created)',
            content: 'This is a test document with the unique marker: UniqueMarkertest-174',
            type: 'markdown',
            tags: ['test', 'manual'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Simple mock embedding (512 dimensions)
            embedding: Array.from({ length: 512 }, () => Math.random() * 0.01)
        };
        const docPath = '/documents/_doc/test-manual-doc';
        const docRequest = aws4.sign({
            host: parsedUrl.hostname,
            method: 'PUT',
            path: docPath,
            body: JSON.stringify(testDocument),
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
        await new Promise((resolve) => {
            const req = httpModule.request({
                ...docRequest,
                protocol,
                port: parsedUrl.port || (protocol === 'https:' ? 443 : 80)
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`✅ Test document indexed successfully.`);
                        console.log(`Response: ${data}`);
                    }
                    else {
                        console.error(`❌ Failed to index test document. Status: ${res.statusCode}`);
                        console.error(`Response: ${data}`);
                    }
                    resolve(true);
                });
            });
            req.on('error', (error) => {
                console.error('Error indexing test document:', error);
                resolve(false);
            });
            req.write(docRequest.body);
            req.end();
        });
        console.log('\n🚀 Setup completed');
        console.log('To verify everything is working:');
        console.log('1. Run the verify script: npx ts-node src/verify-opensearch.ts');
        console.log('2. Check the OpenSearch dashboard');
        console.log('3. Run another test document upload: npm run test-upload');
    }
    catch (error) {
        console.error('Error setting up OpenSearch:', error);
    }
}
main();
//# sourceMappingURL=create-opensearch-index.js.map