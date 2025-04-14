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
const SEARCH_TERM = 'UniqueMarkertest-174';
async function main() {
    var _a;
    try {
        console.log('Verifying document indexing in OpenSearch...');
        // Get AWS credentials
        const credentials = await (0, credential_provider_node_1.defaultProvider)()();
        // Parse the OpenSearch endpoint
        const parsedUrl = new URL(OPENSEARCH_ENDPOINT);
        // Create the search query
        const searchBody = {
            query: {
                match_phrase: {
                    content: SEARCH_TERM
                }
            }
        };
        // Create the URL for the search
        const searchPath = '/documents/_search';
        // Sign the request with AWS credentials
        const signedRequest = aws4.sign({
            host: parsedUrl.hostname,
            method: 'POST',
            path: searchPath,
            body: JSON.stringify(searchBody),
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
        console.log(`Sending search request to: ${OPENSEARCH_ENDPOINT}${searchPath}`);
        // Make the request
        const { protocol } = parsedUrl;
        const httpModule = protocol === 'https:' ? require('https') : require('http');
        // Convert to a Promise
        const responseData = await new Promise((resolve, reject) => {
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
                    try {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            console.log(`Search successful. Status: ${res.statusCode}`);
                            resolve(JSON.parse(data));
                        }
                        else {
                            console.error(`Error response: ${res.statusCode}`);
                            console.error(`Response data: ${data}`);
                            reject(new Error(`Search failed with status ${res.statusCode}`));
                        }
                    }
                    catch (error) {
                        reject(error);
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
        // Process and display the search results
        console.log('\n📊 Search Results:');
        console.log('------------------');
        const hits = ((_a = responseData.hits) === null || _a === void 0 ? void 0 : _a.hits) || [];
        if (hits.length === 0) {
            console.log('❌ No documents found matching the search term:', SEARCH_TERM);
            console.log('\nTroubleshooting steps:');
            console.log('1. Check that the document was uploaded successfully to DynamoDB');
            console.log('2. Check the Lambda logs for indexing errors');
            console.log('3. Verify the OpenSearch permissions and role mappings');
            console.log('4. Try manually creating the index using the instructions in opensearch-roles.md');
        }
        else {
            console.log(`✅ Found ${hits.length} document(s) matching the search term: ${SEARCH_TERM}`);
            // Display document details
            hits.forEach((hit, index) => {
                var _a;
                const doc = hit._source;
                console.log(`\nDocument ${index + 1}:`);
                console.log(`- ID: ${doc.id}`);
                console.log(`- Title: ${doc.title}`);
                console.log(`- Type: ${doc.type}`);
                console.log(`- Created: ${doc.createdAt}`);
                console.log(`- Tags: ${((_a = doc.tags) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'none'}`);
                // Show a snippet of content
                const contentPreview = doc.content.substring(0, 100) + (doc.content.length > 100 ? '...' : '');
                console.log(`- Content preview: ${contentPreview}`);
                // Show if it has an embedding
                console.log(`- Has embedding: ${doc.embedding ? 'Yes' : 'No'}`);
                if (doc.embedding) {
                    console.log(`- Embedding dimensions: ${Array.isArray(doc.embedding) ? doc.embedding.length : 'Unknown'}`);
                }
            });
            console.log('\n🎉 Success! Your OpenSearch integration is working correctly!');
        }
        // Also check if index exists
        console.log('\nChecking if the documents index exists...');
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
        // Check index existence
        const indexExists = await new Promise((resolve) => {
            const req = httpModule.request({
                ...indexCheckRequest,
                protocol,
                port: parsedUrl.port || (protocol === 'https:' ? 443 : 80)
            }, (res) => {
                if (res.statusCode === 200) {
                    console.log('✅ The "documents" index exists in OpenSearch');
                    resolve(true);
                }
                else {
                    console.log(`❌ The "documents" index doesn't exist or can't be accessed (status: ${res.statusCode})`);
                    resolve(false);
                }
            });
            req.on('error', (error) => {
                console.error('Error checking index:', error);
                resolve(false);
            });
            req.end();
        });
        if (!indexExists) {
            console.log('\nTo create the index manually, follow instructions in the opensearch-roles.md file');
        }
    }
    catch (error) {
        console.error('Error verifying document indexing:', error);
        console.log('\nTroubleshooting steps:');
        console.log('1. Make sure the OpenSearch domain is in the "Active" state');
        console.log('2. Check that the domain policy allows access from this machine');
        console.log('3. If you\'re getting 403 errors, follow the instructions in opensearch-roles.md to set up permissions');
        console.log('4. Check if you can access the OpenSearch dashboard at:');
        console.log(`   ${OPENSEARCH_ENDPOINT}/_dashboards/`);
    }
}
main();
//# sourceMappingURL=verify-opensearch.js.map