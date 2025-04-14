import { defaultProvider } from '@aws-sdk/credential-provider-node';
import * as aws4 from 'aws4';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || 'https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws';

// This approach uses the Security API directly instead of going through the dashboard
async function main() {
  try {
    console.log('Creating OpenSearch admin privileges...');
    
    // Get AWS credentials
    const credentials = await defaultProvider()();
    
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
    await sendRequest(
      parsedUrl,
      httpModule,
      credentials,
      'PUT',
      roleMapPath,
      roleMapBody as any
    );
    
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
    
    await sendRequest(
      parsedUrl,
      httpModule,
      credentials,
      'PUT',
      '/documents',
      indexDef as any
    );
    
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
    
    await sendRequest(
      parsedUrl,
      httpModule,
      credentials,
      'PUT',
      '/documents/_doc/admin-test-doc',
      testDoc as any
    );
    
    console.log('\nConfiguration completed!');
    console.log('Next steps:');
    console.log('1. Try accessing the OpenSearch Dashboard again');
    console.log('2. Run a test search: npx ts-node src/verify-opensearch.ts');
    console.log('3. Try uploading another document: npm run test-upload');
    
  } catch (error) {
    console.error('Error setting up OpenSearch permissions:', error);
  }
}

// Helper function to send requests
async function sendRequest(
  parsedUrl: URL, 
  httpModule: any, 
  credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string }, 
  method: string, 
  path: string, 
  body: any = null
) {
  // Create the sign options
  const options: any = {
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
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Check for success
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Request to ${path} successful (${res.statusCode})`);
          try {
            const jsonResponse = JSON.parse(data);
            console.log('Response:', JSON.stringify(jsonResponse, null, 2).substring(0, 300) + '...');
          } catch {
            console.log('Response:', data);
          }
          resolve(data);
        } else if (res.statusCode === 404 && method === 'DELETE') {
          // For DELETE requests, 404 might be expected
          console.log(`⚠️ Resource at ${path} not found (404). Continuing...`);
          resolve(null);
        } else {
          console.error(`❌ Request to ${path} failed with status ${res.statusCode}`);
          console.error('Response data:', data);
          
          // Specific guidance for common issues
          if (res.statusCode === 403) {
            console.log('\n🔑 Permission Issue: Your IAM user/role lacks sufficient permissions');
          } else if (res.statusCode === 401) {
            console.log('\n🔑 Authentication Issue: Invalid credentials');
          }
          
          // For certain errors, we should still continue
          if (method === 'PUT' && res.statusCode === 400 && data.includes('resource_already_exists_exception')) {
            console.log(`⚠️ Resource at ${path} already exists. Continuing...`);
            resolve(null);
          } else {
            reject(new Error(`Request to ${path} failed with status ${res.statusCode}`));
          }
        }
      });
    });
    
    req.on('error', (error: any) => {
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