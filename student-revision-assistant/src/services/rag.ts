import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

interface VectorDoc {
  text: string;
  metadata: any;
  embedding: number[];
}

let vectorDatabase: VectorDoc[] = [];

export async function processAndStore(contents: { title: string; text: string; url: string }[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allChunks = [];
  for (const item of contents) {
    const chunks = await splitter.createDocuments([item.text], [{ title: item.title, url: item.url }]);
    allChunks.push(...chunks);
  }

  // Generate embeddings for all chunks
  const vectorDocs: VectorDoc[] = [];
  
  // To avoid hitting rate limits for massive repos, we process in small batches
  const batchSize = 10;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    
    // Using simple loop for embeddings since batch embedding might vary by SDK version
    const batchPromises = batch.map(async (doc) => {
      try {
        const result = await ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: [doc.pageContent],
        });
        return {
          text: doc.pageContent,
          metadata: doc.metadata,
          embedding: result.embeddings[0].values,
        };
      } catch (e) {
        console.error("Embedding error:", e);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);
    vectorDocs.push(...(results.filter(r => r !== null) as VectorDoc[]));
  }

  vectorDatabase = vectorDocs;
  return vectorDocs.length;
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function retrieveRelevantContext(query: string, k: number = 3) {
  if (vectorDatabase.length === 0) return "";

  try {
    const queryEmbeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [query],
    });
    const queryEmbedding = queryEmbeddingResponse.embeddings[0].values;

    const scoredDocs = vectorDatabase.map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs
      .slice(0, k)
      .map((d) => `[SOURCE: ${d.metadata.title}]\n${d.text}`)
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Retrieval error:", error);
    return "";
  }
}
