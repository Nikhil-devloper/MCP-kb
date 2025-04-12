import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Define the tool schema
export const enhancedQueryToolDefinition: Tool = {
  name: "Zodi",
  description: "Your friendly buddy that answers questions about documents stored in the knowledge base",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to ask about the documents"
      }
    },
    required: ["question"]
  },
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to ask about the documents"
      }
    },
    required: ["question"],
  },
};

// API base URL for the knowledge base
const API_BASE_URL = "https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev";

// Function to fetch all documents from the knowledge base
async function fetchAllDocuments(): Promise<any[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/documents`);
    return response.data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

// Function to prepare context from documents for the LLM
function prepareContext(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return "No documents available in the knowledge base.";
  }

  // Limit the number of documents to avoid token limits
  const limitedDocuments = documents.slice(0, 5);
  
  let context = "Here are some documents from the knowledge base:\n\n";
  
  limitedDocuments.forEach((doc, index) => {
    context += `Document ${index + 1}: ${doc.title}\n`;
    context += `Content: ${doc.content.substring(0, 1000)}...\n\n`; // Limit content length
  });
  
  return context;
}

// Function to call the Cursor API for LLM integration
async function callCursorAPI(question: string, context: string): Promise<string> {
  try {
    // This is where you would make the actual API call to Cursor
    // Since you mentioned you're using Cursor's paid subscription, you would:
    // 1. Get your API key from Cursor
    // 2. Make a request to their API with your question and context
    
    // For demonstration purposes, we'll simulate a response
    // In a real implementation, you would replace this with an actual API call
    
    // Example of how the API call might look:
    /*
    const response = await axios.post('https://api.cursor.sh/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that answers questions based on the provided context.' },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${question}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.CURSOR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
    */
    
    // For now, we'll return a simulated response based on the context
    return `Hey there, buddy! Based on the documents in the knowledge base, here's what I found: 
    
The answer to your question "${question}" is that the documents contain information about the knowledge base API, which is a serverless API for managing documents. It uses Node.js, TypeScript, Express, and AWS DynamoDB.

The API has endpoints for uploading documents, retrieving documents by ID, and listing all documents. Documents are stored in DynamoDB with a schema that includes id, title, content, type, tags, and timestamps.

For production use with larger documents, it's recommended to store document content in S3 and keep only metadata in DynamoDB.

Is there anything else you'd like to know, buddy?`;
  } catch (error) {
    console.error("Error calling Cursor API:", error);
    return "I'm sorry, buddy, I couldn't process your question at this time.";
  }
}

// Define the handler function
export async function handleEnhancedQuery(args: Record<string, unknown>) {
  const { question } = args;
  
  if (!question || typeof question !== "string") {
    return {
      result: "Please provide a valid question, buddy.",
    };
  }
  
  try {
    // Fetch documents from the knowledge base
    const documents = await fetchAllDocuments();
    
    // Prepare context from documents
    const context = prepareContext(documents);
    
    // Call the Cursor API with the question and context
    const answer = await callCursorAPI(question, context);
    
    return {
      result: answer,
    };
  } catch (error) {
    console.error("Error in enhanced query handler:", error);
    return {
      result: "An error occurred while processing your question, buddy.",
    };
  }
} 