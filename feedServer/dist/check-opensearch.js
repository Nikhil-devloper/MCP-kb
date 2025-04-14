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
const opensearch_1 = require("@opensearch-project/opensearch");
const aws_1 = require("@opensearch-project/opensearch/aws");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const https = __importStar(require("https"));
// OpenSearch configuration
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || 'https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws';
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_PROFILE = process.env.AWS_PROFILE || 'default';
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
async function checkOpenSearch() {
    try {
        const endpoint = getDomainEndpoint(OPENSEARCH_ENDPOINT);
        console.log(`Using OpenSearch endpoint: ${endpoint}`);
        console.log(`Using AWS profile: ${AWS_PROFILE}`);
        console.log(`Using AWS region: ${AWS_REGION}`);
        // Create OpenSearch client with AWS Signature v4 authentication
        // Extract the host from the endpoint
        const url = new URL(endpoint);
        const host = url.hostname;
        // Create a client with more debugging and connection options
        const client = new opensearch_1.Client({
            ...(0, aws_1.AwsSigv4Signer)({
                region: AWS_REGION,
                service: 'es',
                getCredentials: async () => {
                    try {
                        // First try to get credentials from specified profile or default
                        console.log(`Attempting to load AWS credentials from profile: ${AWS_PROFILE}`);
                        const credentials = await (0, credential_providers_1.fromIni)({ profile: AWS_PROFILE })();
                        console.log('Successfully loaded credentials from profile');
                        // Log some info about the credentials (safely)
                        console.log(`Credential type: ${credentials.accessKeyId ? 'IAM User/Role' : 'Unknown'}`);
                        console.log(`Access key ID prefix: ${credentials.accessKeyId ? credentials.accessKeyId.substring(0, 4) + '...' : 'None'}`);
                        return credentials;
                    }
                    catch (error) {
                        console.log('Failed to load from profile, falling back to default provider');
                        // Fall back to default provider if profile fails
                        const defaultCredentials = await (0, credential_provider_node_1.defaultProvider)()();
                        return defaultCredentials;
                    }
                },
            }),
            node: endpoint,
            // Add additional headers for authentication
            headers: {
                host: host
            },
            // Add connection options for debugging
            ssl: {
                rejectUnauthorized: true
            },
            // Add more connection options for debugging
            requestTimeout: 10000,
            maxRetries: 3,
            sniffOnStart: false,
            // Use custom http agent
            agent: new https.Agent({
                keepAlive: true,
                rejectUnauthorized: true
            })
        });
        console.log('Client created, testing connection...');
        // First try to ping to check connection
        try {
            console.log('Pinging OpenSearch service...');
            const pingResponse = await client.ping();
            console.log('Ping successful!', pingResponse.statusCode);
        }
        catch (pingError) {
            console.log('Ping failed with error:', pingError.message);
            // Continue anyway as the OpenSearch API might still work
        }
        // Check if documents index exists
        console.log('Checking if documents index exists...');
        const indexName = 'documents';
        try {
            const indexExists = await client.indices.exists({ index: indexName });
            if (indexExists.body) {
                console.log(`Index "${indexName}" exists, searching for documents...`);
                // Search for all documents
                const searchResponse = await client.search({
                    index: indexName,
                    body: {
                        query: {
                            match_all: {}
                        },
                        size: 10
                    }
                });
                const hits = searchResponse.body.hits.hits;
                console.log(`Found ${hits.length} documents:`);
                // Display document information
                hits.forEach((hit, index) => {
                    const doc = hit._source;
                    console.log(`\nDocument ${index + 1}:`);
                    console.log(`  ID: ${doc.id}`);
                    console.log(`  Title: ${doc.title}`);
                    console.log(`  Type: ${doc.type}`);
                    console.log(`  Tags: ${doc.tags ? doc.tags.join(', ') : 'none'}`);
                    console.log(`  Created: ${doc.createdAt}`);
                    console.log(`  Has Embedding: ${doc.embedding ? 'Yes' : 'No'}`);
                    if (doc.embedding) {
                        console.log(`  Embedding Dimensions: ${doc.embedding.length}`);
                        // Print sample of embedding values
                        console.log(`  Sample values: [${doc.embedding.slice(0, 3).join(', ')}...]`);
                    }
                });
                if (hits.length === 0) {
                    console.log('No documents found in the index.');
                }
            }
            else {
                console.log(`Index "${indexName}" does not exist yet. No documents have been indexed.`);
            }
        }
        catch (error) {
            console.error(`Error accessing index "${indexName}":`, error);
            // Check if it's a permission error (403)
            const isPermissionError = error.meta && error.meta.statusCode === 403;
            if (isPermissionError) {
                console.log('\n⚠️ 403 Forbidden Error: OpenSearch access permission denied');
                console.log('🔧 To fix OpenSearch permissions:');
                console.log('1. Check OpenSearch domain access policy in AWS Console');
                console.log(`2. Make sure the IAM user "udemy-admin" has the following policy attached:`);
                console.log(`
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "es:ESHttp*",
                "es:Describe*",
                "es:List*"
              ],
              "Resource": [
                "arn:aws:es:${AWS_REGION}:010461912927:domain/knowledgebase-search-new",
                "arn:aws:es:${AWS_REGION}:010461912927:domain/knowledgebase-search-new/*"
              ]
            }
          ]
        }`);
                console.log('\n3. Additionally, make sure your OpenSearch domain access policy includes:');
                console.log(`
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:aws:iam::010461912927:user/udemy-admin"
              },
              "Action": "es:*",
              "Resource": "arn:aws:es:${AWS_REGION}:010461912927:domain/knowledgebase-search-new/*"
            }
          ]
        }`);
                console.log('\n4. You may need to go to AWS Console > OpenSearch Service > knowledgebase-search-new > Security configuration');
                console.log('   and update the access policy there.');
                console.log('\n5. If you have Fine-grained access control enabled, check if:');
                console.log('   - You need to log in with a master user');
                console.log('   - You need to create a role mapping for your IAM user');
            }
            else {
                console.log('\nThis likely means no documents have been indexed yet or there are permission issues.');
                console.log('Try uploading a document through your API to trigger the document ingestion process.');
            }
        }
    }
    catch (error) {
        console.error('Error checking OpenSearch:', error);
    }
}
// Run the check
checkOpenSearch().then(() => {
    console.log('\nOpenSearch check completed');
    console.log('\nTo test document indexing and embedding:');
    console.log('1. Upload a document using your API: https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/documents');
    console.log('2. Check CloudWatch logs for the documentIngestion Lambda function');
    console.log('3. Run this check script again to see if documents appear in OpenSearch');
}).catch((err) => {
    console.error('Failed to check OpenSearch:', err);
});
//# sourceMappingURL=check-opensearch.js.map