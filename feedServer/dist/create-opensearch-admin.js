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
// This approach uses the Security API directly instead of going through the dashboard
async function main() {
    try {
        console.log('Creating OpenSearch admin privileges...');
        // Get AWS credentials
        const credentials = await (0, credential_provider_node_1.defaultProvider)()();
        // Parse the OpenSearch endpoint
        const parsedUrl = new URL(OPENSEARCH_ENDPOINT);
        const { protocol } = parsedUrl;
        const httpModule = protocol === 'https:' ? require('https') : require('http');
        // First try to create all_access role mapping for the current user
        console.log('Checking if all_access role exists...');
        // Get your current IAM identity for role mapping
        const userIdentity = credentials.accessKeyId;
        console.log(`Current user identity: ${userIdentity}`);
        // Create role mapping for all_access role to allow your current user
        const roleMapPath = '/_plugins/_security/api/rolesmapping/all_access';
        const roleMapBody = {
            users: ["*"],
            backend_roles: ["*"],
            hosts: ["*"]
        };
        // Sign and send the request
        console.log('Creating role mapping for all_access...');
        await sendRequest(parsedUrl, httpModule, credentials, 'PUT', roleMapPath, roleMapBody);
        // If we're successful to this point, try creating an index pattern
        // Create index for documents
        console.log('\nCreating documents index...');
        const indexDef = {
            mappings: {
                properties: {
                    embedding: { type: "float" },
                    content: { type: "text" },
                    title: { type: "text" },
                    id: { type: "keyword" },
                    type: { type: "keyword" },
                    tags: { type: "keyword" },
                    createdAt: { type: "date" },
                    updatedAt: { type: "date" }
                }
            }
        };
        await sendRequest(parsedUrl, httpModule, credentials, 'PUT', '/documents', indexDef);
        console.log('\nAdding a test document...');
        const testDoc = {
            title: "Test Document from Admin Script",
            content: "This is a test with the marker: UniqueMarkertest-174",
            type: "markdown",
            id: "admin-test-doc",
            tags: ["test", "admin"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            embedding: Array(512).fill(0).map(() => Math.random() * 0.01)
        };
        await sendRequest(parsedUrl, httpModule, credentials, 'PUT', '/documents/_doc/admin-test-doc', testDoc);
        console.log('\nConfiguration completed!');
        console.log('Next steps:');
        console.log('1. Try accessing the OpenSearch Dashboard again');
        console.log('2. Run a test search: npx ts-node src/verify-opensearch.ts');
        console.log('3. Try uploading another document: npm run test-upload');
    }
    catch (error) {
        console.error('Error setting up OpenSearch permissions:', error);
    }
}
// Helper function to send requests
async function sendRequest(parsedUrl, httpModule, credentials, method, path, body = null) {
    // Create the sign options
    const options = {
        host: parsedUrl.hostname,
        method: method,
        path: path,
        headers: {
            'Content-Type': 'application/json'
        },
        service: 'es',
        region: AWS_REGION
    };
    // Add body if it exists
    if (body) {
        options.body = JSON.stringify(body);
    }
    // Sign the request
    const signedRequest = aws4.sign(options, {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
    });
    // Send the request
    return new Promise((resolve, reject) => {
        const req = httpModule.request({
            ...signedRequest,
            protocol: parsedUrl.protocol,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                // Check for success
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ Request to ${path} successful (${res.statusCode})`);
                    try {
                        const jsonResponse = JSON.parse(data);
                        console.log('Response:', JSON.stringify(jsonResponse, null, 2).substring(0, 300) + '...');
                    }
                    catch (_a) {
                        console.log('Response:', data);
                    }
                    resolve(data);
                }
                else if (res.statusCode === 404 && method === 'DELETE') {
                    // For DELETE requests, 404 might be expected
                    console.log(`⚠️ Resource at ${path} not found (404). Continuing...`);
                    resolve(null);
                }
                else {
                    console.error(`❌ Request to ${path} failed with status ${res.statusCode}`);
                    console.error('Response data:', data);
                    // Specific guidance for common issues
                    if (res.statusCode === 403) {
                        console.log('\n🔑 Permission Issue: Your IAM user/role lacks sufficient permissions');
                    }
                    else if (res.statusCode === 401) {
                        console.log('\n🔑 Authentication Issue: Invalid credentials');
                    }
                    // For certain errors, we should still continue
                    if (method === 'PUT' && res.statusCode === 400 && data.includes('resource_already_exists_exception')) {
                        console.log(`⚠️ Resource at ${path} already exists. Continuing...`);
                        resolve(null);
                    }
                    else {
                        reject(new Error(`Request to ${path} failed with status ${res.statusCode}`));
                    }
                }
            });
        });
        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });
        // Send body if it exists
        if (signedRequest.body) {
            req.write(signedRequest.body);
        }
        req.end();
    });
}
main();
//# sourceMappingURL=create-opensearch-admin.js.map