# Configuring OpenSearch Fine-Grained Access Control

The 403 errors show that OpenSearch has fine-grained access control enabled, which requires additional configuration.

## Step 1: Access the OpenSearch Dashboard

1. Go to your AWS Console, navigate to OpenSearch Service
2. Select your domain `knowledgebase-search-new` 
3. Click on the "OpenSearch Dashboards URL" link (https://search-knowledgebase-search-new-ehotyrromqfzkijvbsnf3kzini.aos.ap-south-1.on.aws/_dashboards)

### If you see "User is not authorized to perform: es:ESHttpPost" error:
This means your domain policy has been updated but it hasn't fully propagated yet. Either:
1. Wait 5-10 minutes for the policy change to take effect
2. Or try logging in with your master user credentials:
   - Username: The master username you created when setting up the domain
   - Password: The master password you set

If you're still having trouble, try accessing the dashboard with your AWS admin credentials instead of anonymous access.

## Step 2: Create a Role Mapping for your Lambda Role

1. In the OpenSearch Dashboard, navigate to: Security → Roles
2. Click "Create role"
3. Create an all-access role with the following details:
   - Name: `lambda_role`
   - Cluster permissions: `cluster_all`
   - Index permissions:
     - Index patterns: `*` (to allow access to all indices)
     - Index permissions: `indices_all`
   - Click "Create"

4. Now navigate to: Security → Roles → lambda_role → Mapped users
5. Click "Map users"
6. Add the Lambda role ARN in the "Backend roles" section:
   ```
   arn:aws:iam::010461912927:role/knowledge-base-api-dev-ap-south-1-lambdaRole
   ```
7. Click "Map"

## Step 3: Create the Documents Index Manually

If you're still having trouble with automatic index creation, you can create it manually:

1. In OpenSearch Dashboard, go to Dev Tools
2. Run the following command to create the index:

```
PUT /documents
{
  "mappings": {
    "properties": {
      "embedding": { "type": "float" },
      "content": { "type": "text" },
      "title": { "type": "text" },
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

## Step 4: Test the Configuration

1. Wait a few minutes for the role mappings to take effect
2. Run another test upload:
   ```
   npm run test-upload
   ```

3. Check the CloudWatch logs to verify that the document was indexed successfully

4. Run your search query in OpenSearch Dashboard Dev Tools:
   ```
   GET documents/_search
   {
     "query": {
       "match_phrase": {
         "content": "UniqueMarkertest-174"
       }
     }
   }
   ```

## Troubleshooting

If you're still seeing permission issues:

1. Check that the policy update was successful in the AWS console
2. Ensure the Lambda role is correctly mapped to the OpenSearch role
3. Check the CloudWatch logs for the Lambda function to see specific error messages
4. Try manually indexing a document in the Dev Tools console to test permissions:

```
PUT /documents/_doc/test-doc
{
  "title": "Test Document",
  "content": "This is a test with UniqueMarkertest-174",
  "id": "test-doc",
  "type": "markdown",
  "tags": ["test"],
  "createdAt": "2025-04-14T12:00:00.000Z",
  "updatedAt": "2025-04-14T12:00:00.000Z"
}
```

If the manual indexing works but Lambda indexing doesn't, there may be an issue with the Lambda role mapping. 