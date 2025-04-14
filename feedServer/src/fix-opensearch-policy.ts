import { OpenSearchClient, UpdateDomainConfigCommand } from '@aws-sdk/client-opensearch';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const OPENSEARCH_DOMAIN_NAME = 'knowledgebase-search-new'; // Extract from your OPENSEARCH_DOMAIN_ENDPOINT

async function main() {
  try {
    console.log('Getting AWS account information...');
    
    // Get account ID
    const stsClient = new STSClient({ region: AWS_REGION });
    const caller = await stsClient.send(new GetCallerIdentityCommand({}));
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
    const opensearchClient = new OpenSearchClient({ 
      region: AWS_REGION,
      credentials: defaultProvider()
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
              `arn:aws:iam::${accountId}:root`, // Allow account root
              lambdaRoleArn, // Allow Lambda execution role
              '*' // Allow all authenticated users (for dashboard access)
            ]
          },
          Action: [
            'es:ESHttp*', // Allow all HTTP methods (GET, POST, PUT, DELETE)
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
    const updateCommand = new UpdateDomainConfigCommand({
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
    
  } catch (error) {
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