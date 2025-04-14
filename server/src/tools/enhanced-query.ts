import { z } from "zod";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Document type interface
interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  embedding?: number[];
  [key: string]: any;
}

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
// Question processor lambda URL - this will be the endpoint from serverless deployment
const QUESTION_PROCESSOR_URL = process.env.QUESTION_PROCESSOR_URL || `${API_BASE_URL}/question`;

// Function to process a question and get answer using the question processor lambda
async function processQuestion(question: string): Promise<{ answer: string; relevantDocuments: Document[] }> {
  try {
    console.log(`Processing question via lambda: ${question}`);
    
    // Call the question processor lambda
    const response = await axios.post(QUESTION_PROCESSOR_URL, {
      question: question
    });
    
    // Extract the answer and relevant documents from the response
    const { answer, relevantDocuments } = response.data;
    
    console.log(`Received ${relevantDocuments?.length || 0} relevant documents and answer`);
    
    // Filter out the embedding array to avoid showing random numbers in the output
    const cleanedDocuments = relevantDocuments?.map((doc: Document) => {
      // Create a new object without the embedding field
      const { embedding, ...cleanDoc } = doc;
      return cleanDoc;
    }) || [];
    
    return { answer, relevantDocuments: cleanedDocuments };
  } catch (error) {
    console.error("Error processing question with lambda:", error);
    
    // Fallback to fetching all documents if the question processor fails
    console.log("Falling back to fetching all documents");
    const documents = await fetchAllDocuments();
    return { 
      answer: "Sorry, I couldn't process your question at this time. Here is a list of documents that might help.",
      relevantDocuments: documents 
    };
  }
}

// Fallback function to fetch all documents from the knowledge base
async function fetchAllDocuments(): Promise<Document[]> {
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
    context += `Document ${index + 1} (ID: ${doc.id}): ${doc.title}\n`;
    context += `Created: ${new Date(doc.createdAt).toLocaleDateString()}\n`;
    context += `Content: ${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? '...' : ''}\n\n`;
  });
  
  return context;
}

// Function to call the Cursor API for LLM integration
async function callCursorAPI(question: string, context: string): Promise<string> {
  try {
    console.log(`callCursorAPI received question: "${question}"`);
    console.log(`Context provided: ${context.substring(0, 100)}...`);
    
    // Directly call processQuestion to get documents for this question
    const directDocuments = await processQuestion(question);
    console.log(`Direct call to processQuestion returned ${directDocuments.relevantDocuments.length} documents`);
    
    // Log document IDs for debugging
    if (directDocuments.relevantDocuments.length > 0) {
      console.log("Document IDs retrieved:");
      directDocuments.relevantDocuments.forEach((doc: Document, idx: number) => {
        console.log(`[${idx}] ID: ${doc.id}, Title: ${doc.title}`);
      });
    } else {
      console.log("No documents retrieved directly");
    }
    
    // For now, we'll return a simulated response based on the context and direct results
    let responseText = `Hey there, buddy! Based on the documents in the knowledge base, here's what I found:\n\n`;
    
    if (directDocuments.relevantDocuments.length > 0) {
      responseText += `I found ${directDocuments.relevantDocuments.length} relevant documents about the Knowledge Base API:\n\n`;
      
      directDocuments.relevantDocuments.forEach((doc: Document, idx: number) => {
        responseText += `[${idx+1}] "${doc.title}" (ID: ${doc.id})\n`;
        
        // Extract the most relevant part about the Knowledge Base API (first 200 chars)
        const contentPreview = doc.content.substring(0, 200);
        responseText += `Preview: ${contentPreview}...\n\n`;
      });
      
      responseText += `The Knowledge Base API is a serverless application that provides document storage and semantic search capabilities. It's built using AWS services including Lambda, DynamoDB, API Gateway, and OpenSearch.\n\n`;
    } else {
      responseText += `I couldn't find specific documents about the Knowledge Base API. Please try a different query or check if documents have been uploaded to the knowledge base.\n\n`;
    }
    
    responseText += `Is there anything else you'd like to know about the Knowledge Base API, buddy?`;
    
    return responseText;
  } catch (error) {
    console.error("Error in callCursorAPI:", error);
    return "I'm sorry, buddy, I couldn't process your question at this time. There was an error retrieving documents.";
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
    // Process the question using the question processor lambda to get relevant documents and answer
    const { answer, relevantDocuments } = await processQuestion(question);
    
    // If the answer is available, return it
    if (answer) {
      return {
        result: answer,
      };
    }
    
    // Fallback to old behavior if no answer is available
    let responseText = `Hey there, buddy! Based on the documents in the knowledge base, here's what I found:\n\n`;
    
    if (relevantDocuments.length > 0) {
      responseText += `I found ${relevantDocuments.length} relevant documents about your question:\n\n`;
      
      relevantDocuments.forEach((doc: Document, idx: number) => {
        responseText += `[${idx+1}] "${doc.title}" (ID: ${doc.id})\n`;
        
        // Extract the most relevant part (first 200 chars)
        const contentPreview = doc.content.substring(0, 200);
        responseText += `Preview: ${contentPreview}...\n\n`;
      });
    } else {
      responseText += `I couldn't find specific documents about your question. Please try a different query or check if documents have been uploaded to the knowledge base.\n\n`;
    }
    
    responseText += `Is there anything else you'd like to know about, buddy?`;
    
    return {
      result: responseText,
    };
  } catch (error) {
    console.error("Error in enhanced query handler:", error);
    return {
      result: "An error occurred while processing your question, buddy.",
    };
  }
} 