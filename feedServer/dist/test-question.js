"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// Configuration
const QUESTION_API_URL = 'https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev/question';
// Function to sleep for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function testQuestionProcessor() {
    try {
        console.log('Waiting for 2 minutes to allow document ingestion to complete...');
        console.log('Started waiting at:', new Date().toISOString());
        // Wait for 2 minutes (120000 ms)
        await sleep(120000);
        console.log('Finished waiting at:', new Date().toISOString());
        console.log('Testing question processor with query: "What is the knowledge base API?"');
        // Send a test question to the question processor
        const response = await axios_1.default.post(QUESTION_API_URL, {
            question: 'What is the knowledge base API?'
        });
        console.log('Question processor response:');
        console.log(JSON.stringify(response.data, null, 2));
        // Check if relevant documents were found
        const { relevantDocuments } = response.data;
        if (relevantDocuments && relevantDocuments.length > 0) {
            console.log(`\n✅ Success! Found ${relevantDocuments.length} relevant documents.`);
            // Display the titles of the found documents
            console.log('\nRelevant document titles:');
            relevantDocuments.forEach((doc, index) => {
                console.log(`${index + 1}. ${doc.title}`);
            });
            // Display a snippet of the first document's content
            if (relevantDocuments[0].content) {
                console.log('\nSnippet from first document:');
                console.log(relevantDocuments[0].content.substring(0, 200) + '...');
            }
        }
        else {
            console.log('\n❌ No relevant documents found. This might indicate:');
            console.log('1. The document ingestion Lambda is still processing');
            console.log('2. There was an issue with embedding generation');
            console.log('3. The OpenSearch vector search is not working correctly');
            console.log('\nCheck CloudWatch logs for the documentIngestion and questionProcessor Lambdas for more details.');
        }
    }
    catch (error) {
        console.error('Error testing question processor:');
        if (error.response) {
            console.error('API Response:', error.response.status, error.response.data);
        }
        else {
            console.error(error.message || 'Unknown error');
        }
    }
}
// Run the test
console.log('Starting question processor test at:', new Date().toISOString());
testQuestionProcessor();
//# sourceMappingURL=test-question.js.map