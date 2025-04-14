"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_opensearch_1 = require("@aws-sdk/client-opensearch");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const client_sts_1 = require("@aws-sdk/client-sts");
// Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const OPENSEARCH_DOMAIN_NAME = 'knowledgebase-search-new'; // Extract from your OPENSEARCH_DOMAIN_ENDPOINT
async function main() {
    try {
        console.log('Getting AWS account information...');
        // Get account ID
        const stsClient = new client_sts_1.STSClient({ region: AWS_REGION });
        const caller = await stsClient.send(new client_sts_1.GetCallerIdentityCommand({}));
        const accountId = caller.Account;
        if (!accountId) {
            throw new Error('Could not determine AWS account ID');
        }
        console.log(`AWS Account ID: ${accountId}`);
        // Get Lambda role ARN from serverless.yml
        console.log('Getting Lambda function role...');
        const serviceName = 'knowledge-base-api';
        const stage = 'dev';
        const lambdaRoleArn = `arn:aws:iam::${accountId}:role/${serviceName}-${stage}-${AWS_REGION}-lambdaRole`;
        console.log(`Lambda Role ARN: ${lambdaRoleArn}`);
        // Create OpenSearch client
        const opensearchClient = new client_opensearch_1.OpenSearchClient({
            region: AWS_REGION,
            credentials: (0, credential_provider_node_1.defaultProvider)()
        });
        // Get domain config to check current policy
        console.log(`Getting current OpenSearch domain config for ${OPENSEARCH_DOMAIN_NAME}...`);
        // Create access policy
        const accessPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: {
                        AWS: [
                            `arn:aws:iam::${accountId}:root`,
                            lambdaRoleArn,
                            '*' // Allow all authenticated users (for dashboard access)
                        ]
                    },
                    Action: [
                        'es:ESHttp*',
                        'es:*' // Allow all OpenSearch actions
                    ],
                    Resource: `arn:aws:es:${AWS_REGION}:${accountId}:domain/${OPENSEARCH_DOMAIN_NAME}/*`
                }
            ]
        };
        console.log('New access policy:');
        console.log(JSON.stringify(accessPolicy, null, 2));
        // Update domain config with new policy
        console.log('Updating OpenSearch domain access policy...');
        const updateCommand = new client_opensearch_1.UpdateDomainConfigCommand({
            DomainName: OPENSEARCH_DOMAIN_NAME,
            AccessPolicies: JSON.stringify(accessPolicy)
        });
        const response = await opensearchClient.send(updateCommand);
        console.log('OpenSearch domain access policy updated successfully!');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('\nImportant notes:');
        console.log('1. The policy change may take a few minutes to propagate');
        console.log('2. You may need to run npm run test-upload again after the policy is updated');
        console.log('3. Check the AWS console to verify the policy was updated correctly');
    }
    catch (error) {
        console.error('Error updating OpenSearch policy:', error);
        console.log('\nManual steps to fix OpenSearch permissions:');
        console.log('1. Go to AWS Console > OpenSearch Service');
        console.log('2. Select your domain: knowledgebase-search');
        console.log('3. Go to Security > Modify access policy');
        console.log('4. Add the following policy (replace YOUR_ACCOUNT_ID and LAMBDA_ROLE_ARN):');
        console.log(`
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": [
              "arn:aws:iam::YOUR_ACCOUNT_ID:root",
              "LAMBDA_ROLE_ARN"
            ]
          },
          "Action": "es:*",
          "Resource": "arn:aws:es:ap-south-1:YOUR_ACCOUNT_ID:domain/knowledgebase-search/*"
        }
      ]
    }
    `);
    }
}
main();
//# sourceMappingURL=fix-opensearch-policy.js.map