// src/solutions/blue-green.ts
// INSERT new version first, DELETE old version after - no gap!

import { getVectorRepo } from '../services/repository';
import { redis } from '../services/redis';
import { processDocument, generateEmbedding } from '../services/embedding';
import type { Solution, SearchResult, ReindexOptions, SearchOptions } from '../types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCurrentVersion(uuid: string): Promise<number> {
  const version = await redis.get(`version:${uuid}`);
  return version ? parseInt(version, 10) : 0;
}

async function setCurrentVersion(uuid: string, version: number): Promise<void> {
  await redis.set(`version:${uuid}`, version.toString());
}

export const blueGreen: Solution = {
  name: 'blue-green',

  async reindex(uuid: string, content: string, options?: ReindexOptions): Promise<void> {
    const repo = getVectorRepo();
    const currentVersion = await getCurrentVersion(uuid);
    const newVersion = currentVersion + 1;

    // Track in-progress
    await redis.hset(
      'reindex:in_progress',
      uuid,
      JSON.stringify({
        documentNumber: uuid,
        startedAt: Date.now(),
        fromVersion: currentVersion,
        toVersion: newVersion,
      })
    );

    if (options?.simulateDelayMs) {
      await sleep(options.simulateDelayMs);
    }

    // Step 1: INSERT new version (document vẫn searchable với version cũ!)
    const processed = processDocument(content);
    const chunks = processed.map((p, idx) => ({
      id: crypto.randomUUID(),
      vector: p.vector,
      payload: {
        uuid,
        documentNumber: uuid,
        chunkIndex: idx,
        content: p.content,
        version: newVersion,
        status: 'active' as const,
        createdAt: Date.now(),
      },
    }));

    await repo.upsertChunks(chunks);

    // Step 2: Update current version pointer
    await setCurrentVersion(uuid, newVersion);

    // Step 3: DELETE old version (now safe!)
    if (currentVersion > 0) {
      await repo.deleteByUuidAndVersion(uuid, currentVersion);
    }

    await redis.hdel('reindex:in_progress', uuid);
  },

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const vector = generateEmbedding(query);
    const repo = getVectorRepo();
    // Use filter active via repository search
    return repo.search(vector, { limit: options?.limit || 10, filter: { must: [{ key: 'status', match: { value: 'active' } }] } });
  },

  async deleteByUuid(uuid: string): Promise<void> {
    const repo = getVectorRepo();
    await repo.deleteByUuid(uuid);
    await redis.del(`version:${uuid}`);
  },

  async ingest(uuid: string, documentNumber: string, content: string): Promise<void> {
    const version = await getCurrentVersion(uuid);
    const newVersion = version + 1;

    const processed = processDocument(content);
    const chunks = processed.map((p, idx) => ({
      id: crypto.randomUUID(),
      vector: p.vector,
      payload: {
        uuid,
        documentNumber,
        chunkIndex: idx,
        content: p.content,
        version: newVersion,
        status: 'active' as const,
        createdAt: Date.now(),
      },
    }));

    const repo = getVectorRepo();
    await repo.upsertChunks(chunks);
    await setCurrentVersion(uuid, newVersion);
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
