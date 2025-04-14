"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opensearch_1 = require("@opensearch-project/opensearch");
const aws_1 = require("@opensearch-project/opensearch/aws");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
// Configuration
const OPENSEARCH_DOMAIN_ENDPOINT = process.env.OPENSEARCH_DOMAIN_ENDPOINT || 'https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws';
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
async function deleteAndRecreateIndex() {
    try {
        // Initialize OpenSearch client
        const endpoint = getDomainEndpoint(OPENSEARCH_DOMAIN_ENDPOINT);
        console.log(`Using OpenSearch endpoint: ${endpoint}`);
        // Extract the host from the endpoint
        const url = new URL(endpoint);
        const host = url.hostname;
        const openSearchClient = new opensearch_1.Client({
            ...(0, aws_1.AwsSigv4Signer)({
                region: AWS_REGION,
                service: 'es',
                getCredentials: () => {
                    console.log(`Getting credentials for AWS region: ${AWS_REGION}`);
                    const credentialsProvider = (0, credential_provider_node_1.defaultProvider)();
                    return credentialsProvider();
                },
            }),
            node: endpoint,
            headers: {
                host: host
            },
            requestTimeout: 30000
        });
        console.log('OpenSearch client initialized, checking if index exists...');
        // Check if the index exists
        const indexExists = await openSearchClient.indices.exists({
            index: 'documents'
        });
        if (indexExists.body) {
            console.log('Documents index exists, deleting it...');
            // Delete the index
            await openSearchClient.indices.delete({
                index: 'documents'
            });
            console.log('Documents index deleted successfully');
        }
        else {
            console.log('Documents index does not exist, no need to delete');
        }
        // Create the index with proper mappings for vector search
        console.log('Creating new documents index with vector mapping...');
        // Use raw transport request to avoid TypeScript issues with dense_vector type
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
        console.log('Documents index created successfully with vector mapping');
        // Verify the index is created
        const mappings = await openSearchClient.indices.getMapping({
            index: 'documents'
        });
        console.log('Index mappings:', JSON.stringify(mappings.body, null, 2));
        console.log('\nIndex is ready for document ingestion with vector fields!');
        console.log('\nNext steps:');
        console.log('1. Run the test-upload.js script to upload a sample document');
        console.log('2. Wait a couple of minutes for document ingestion to complete');
        console.log('3. Test the question processor with a sample question');
    }
    catch (error) {
        console.error('Error:', error);
    }
}
// Run the function
deleteAndRecreateIndex();
//# sourceMappingURL=delete-index.js.map