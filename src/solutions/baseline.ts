// src/solutions/baseline.ts
// DELETE-THEN-INSERT pattern - có race condition!

import { getVectorRepo } from '../services/repository';
import { processDocument, generateEmbedding } from '../services/embedding';
import type { Solution, SearchResult, ReindexOptions, SearchOptions } from '../types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const baseline: Solution = {
  name: 'baseline',

  async reindex(uuid: string, content: string, options?: ReindexOptions): Promise<void> {
    // Step 1: DELETE all existing chunks
    const repo = getVectorRepo();
    await repo.deleteByUuid(uuid);

    // Gap period - document không tồn tại!
    if (options?.simulateDelayMs) {
      await sleep(options.simulateDelayMs);
    }

    // Step 2: Process and INSERT new chunks
    const processed = processDocument(content);
    const chunks = processed.map((p, idx) => ({
      id: crypto.randomUUID(),
      vector: p.vector,
      payload: {
        uuid,
        documentNumber: uuid,
        chunkIndex: idx,
        content: p.content,
        createdAt: Date.now(),
      },
    }));

    await repo.upsertChunks(chunks);
  },

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const vector = generateEmbedding(query);
    const repo = getVectorRepo();
    return repo.search(vector, { limit: options?.limit || 10 });
  },

  async deleteByUuid(uuid: string): Promise<void> {
    const repo = getVectorRepo();
    await repo.deleteByUuid(uuid);
  },

  async ingest(uuid: string, documentNumber: string, content: string): Promise<void> {
    const processed = processDocument(content);
    const chunks = processed.map((p, idx) => ({
      id: crypto.randomUUID(),
      vector: p.vector,
      payload: {
        uuid,
        documentNumber,
        chunkIndex: idx,
        content: p.content,
        createdAt: Date.now(),
      },
    }));

    const repo = getVectorRepo();
    await repo.upsertChunks(chunks);
  },

  async searchByDocumentNumbers(query: string, documentNumbers: string[]): Promise<SearchResult[]> {
    const vector = generateEmbedding(query);
    const repo = getVectorRepo();
    return repo.search(vector, {
      limit: 10,
      filter: { must: [{ key: 'documentNumber', match: { any: documentNumbers } }] },
    });
  },
};
