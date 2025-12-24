// src/solutions/soft-delete.ts
// Mark old chunks as inactive, filter in search

import { getVectorRepo } from '../services/repository';
import { redis } from '../services/redis';
import { processDocument, generateEmbedding } from '../services/embedding';
import type { Solution, SearchResult, ReindexOptions, SearchOptions } from '../types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const softDelete: Solution = {
  name: 'soft-delete',

  async reindex(uuid: string, content: string, options?: ReindexOptions): Promise<void> {
    const repo = getVectorRepo();
    await redis.hset(
      'reindex:in_progress',
      uuid,
      JSON.stringify({ documentNumber: uuid, startedAt: Date.now() })
    );

    // Capture timestamp BEFORE inserting new chunks
    const reindexStartTime = Date.now();

    if (options?.simulateDelayMs) {
      await sleep(options.simulateDelayMs);
    }

    // Step 1: INSERT new chunks with status='active'
    const processed = processDocument(content);
    const chunks = processed.map((p, idx) => ({
      id: crypto.randomUUID(),
      vector: p.vector,
      payload: {
        uuid,
        documentNumber: uuid,
        chunkIndex: idx,
        content: p.content,
        status: 'active' as const,
        createdAt: Date.now(),
      },
    }));

    await repo.upsertChunks(chunks);

    // Step 2: MARK old chunks as inactive (only chunks created BEFORE reindex started)
    await repo.markInactiveOlderThan(uuid, reindexStartTime);

    await redis.hdel('reindex:in_progress', uuid);
  },

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const vector = generateEmbedding(query);
    const repo = getVectorRepo();
    return repo.search(vector, { limit: options?.limit || 10, filter: { must: [{ key: 'status', match: { value: 'active' } }] } });
  },

  async deleteByUuid(uuid: string): Promise<void> {
    const repo = getVectorRepo();
    await repo.markInactive(uuid);
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
        status: 'active' as const,
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
      filter: {
        must: [
          { key: 'documentNumber', match: { any: documentNumbers } },
          { key: 'status', match: { value: 'active' } },
        ],
      },
    });
  },
};
