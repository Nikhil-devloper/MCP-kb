import { z } from "zod";
import axios from "axios";

// API base URL from the README
const API_BASE_URL = "https://fedavetw0i.execute-api.ap-south-1.amazonaws.com/dev";

// Define document interface
interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'text';
  tags?: string[];
  relevanceScore?: number;
}

// Define document chunk interface
interface DocumentChunk {
  documentId: string;
  documentTitle: string;
  content: string;
  startIndex: number;
  endIndex: number;
  relevanceScore?: number;
}

// 1. Tool Schema
export const DocumentQueryToolSchema = z.object({
  query: z.string(),
});

// 2. Tool listing information
export const documentQueryToolDefinition = {
  name: "documentQuery",
  description: "Queries the knowledge base to answer questions based on uploaded documents",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The question to answer based on document content",
      },
    },
    required: ["query"],
  },
};

// Function to split document content into chunks
const chunkDocument = (doc: Document, chunkSize: number = 500, overlap: number = 100): DocumentChunk[] => {
  const chunks: DocumentChunk[] = [];
  const content = doc.content;
  
  // If content is shorter than chunk size, return it as a single chunk
  if (content.length <= chunkSize) {
    return [{
      documentId: doc.id,
      documentTitle: doc.title,
      content: content,
      startIndex: 0,
      endIndex: content.length,
    }];
  }
  
  // Split content into chunks with overlap
  let startIndex = 0;
  while (startIndex < content.length) {
    let endIndex = Math.min(startIndex + chunkSize, content.length);
    
    // If this is not the last chunk, try to end at a sentence or paragraph
    if (endIndex < content.length) {
      // Try to find a sentence end
      const sentenceEnd = content.lastIndexOf('. ', endIndex);
      if (sentenceEnd > startIndex + chunkSize / 2) {
        endIndex = sentenceEnd + 1;
      } else {
        // Try to find a paragraph end
        const paragraphEnd = content.lastIndexOf('\n\n', endIndex);
        if (paragraphEnd > startIndex + chunkSize / 2) {
          endIndex = paragraphEnd + 2;
        }
      }
    }
    
    chunks.push({
      documentId: doc.id,
      documentTitle: doc.title,
      content: content.substring(startIndex, endIndex),
      startIndex,
      endIndex,
    });
    
    // Move start index for next chunk, accounting for overlap
    startIndex = endIndex - overlap;
  }
  
  return chunks;
};

// Enhanced function to calculate relevance score between query and document content
const calculateRelevanceScore = (query: string, content: string): number => {
  // Convert to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  // Split query into words
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
  
  // Count occurrences of each query word in the content
  let matchCount = 0;
  let exactPhraseMatches = 0;
  
  // Check for exact phrase matches
  if (lowerContent.includes(lowerQuery)) {
    exactPhraseMatches++;
  }
  
  // Check for individual word matches
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerContent.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  }
  
  // Calculate a weighted relevance score
  // Exact phrase matches are weighted more heavily
  const wordScore = matchCount / queryWords.length;
  const phraseScore = exactPhraseMatches * 2;
  
  return wordScore + phraseScore;
};

// 3. Tool implementation
export const handleDocumentQuery = async (args: unknown) => {
  const validated = DocumentQueryToolSchema.parse(args);
  const { query } = validated;

  try {
    // Fetch all documents from the API
    const response = await axios.get(`${API_BASE_URL}/documents`);
    const documents = response.data;

    if (!documents || documents.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No documents found in the knowledge base. Please upload some documents first.",
          },
        ],
      };
    }

    // Process documents to extract relevant information
    const documentContents: Document[] = documents.map((doc: any) => {
      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        type: doc.type,
        tags: doc.tags || [],
      };
    });

    // Split documents into chunks
    const allChunks: DocumentChunk[] = [];
    documentContents.forEach((doc: Document) => {
      const chunks = chunkDocument(doc);
      allChunks.push(...chunks);
    });

    // Calculate relevance scores for each chunk
    const scoredChunks: DocumentChunk[] = allChunks.map((chunk: DocumentChunk) => {
      const relevanceScore = calculateRelevanceScore(query, chunk.content);
      return {
        ...chunk,
        relevanceScore,
      };
    });

    // Sort chunks by relevance score (highest first)
    const sortedChunks = scoredChunks.sort((a: DocumentChunk, b: DocumentChunk) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    // Get the top 5 most relevant chunks
    const topChunks = sortedChunks.slice(0, 5);

    // Generate a response based on the most relevant chunks
    let responseText = `Based on the documents in the knowledge base, here's what I found related to your query: "${query}"\n\n`;
    
    if (topChunks.length > 0) {
      responseText += "Most relevant information:\n\n";
      
      // Group chunks by document
      const chunksByDocument: Record<string, DocumentChunk[]> = {};
      topChunks.forEach((chunk: DocumentChunk) => {
        if (!chunksByDocument[chunk.documentId]) {
          chunksByDocument[chunk.documentId] = [];
        }
        chunksByDocument[chunk.documentId].push(chunk);
      });
      
      // Display chunks grouped by document
      Object.keys(chunksByDocument).forEach((docId, docIndex) => {
        const docChunks = chunksByDocument[docId];
        const docTitle = docChunks[0].documentTitle;
        
        responseText += `From "${docTitle}":\n`;
        docChunks.forEach((chunk, chunkIndex) => {
          responseText += `${chunkIndex + 1}. ${chunk.content.trim()}\n\n`;
        });
      });
      
      responseText += "Note: This implementation uses document chunking and improved relevance scoring.\n";
      responseText += "For even better results, consider implementing vector embeddings and LLM integration.";
    } else {
      responseText += "No relevant information found for your query.";
    }
    
    return {
      content: [
        {
          type: "text",
          text: responseText,
        },
      ],
    };
  } catch (error) {
    console.error("Error querying documents:", error);
    return {
      content: [
        {
          type: "text",
          text: "Error querying the knowledge base. Please try again later.",
        },
      ],
    };
  }
}; 