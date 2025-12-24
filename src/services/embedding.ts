// src/services/embedding.ts
// Mock embedding service - in production, use OpenAI/Cohere/local model

const VECTOR_SIZE = 384;

/**
 * Generate mock embedding from text
 * Uses simple hash-based approach for consistent results
 */
export function generateEmbedding(text: string): number[] {
  const vector: number[] = [];

  for (let i = 0; i < VECTOR_SIZE; i++) {
    let hash = 0;
    const seed = text + i.toString();
    for (let j = 0; j < seed.length; j++) {
      const char = seed.charCodeAt(j);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    vector.push(Math.sin(hash) * 0.5 + Math.cos(hash * 2) * 0.5);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

/**
 * Split text into chunks
 */
export function splitIntoChunks(content: string, chunkSize = 500): string[] {
  const words = content.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentLength = 0;
    }
    currentChunk.push(word);
    currentLength += word.length + 1;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Process document: split and generate embeddings
 */
export function processDocument(content: string): Array<{ content: string; vector: number[] }> {
  const chunks = splitIntoChunks(content);
  return chunks.map((chunk) => ({
    content: chunk,
    vector: generateEmbedding(chunk),
  }));
}
