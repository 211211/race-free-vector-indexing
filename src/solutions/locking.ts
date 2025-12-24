// src/solutions/locking.ts
// Use distributed lock to prevent concurrent reindex

import { getVectorRepo } from '../services/repository';
import { redis } from '../services/redis';
import { processDocument, generateEmbedding } from '../services/embedding';
import type { Solution, SearchResult, ReindexOptions, SearchOptions } from '../types';

const LOCK_TTL_SECONDS = 300;
const LOCK_RETRY_DELAY = 100;
const MAX_LOCK_RETRIES = 50;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLock(uuid: string): Promise<boolean> {
  const lockKey = `lock:${uuid}`;
  const lockValue = JSON.stringify({ lockedAt: Date.now(), pid: process.pid });
  const result = await redis.set(lockKey, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX');
  return result === 'OK';
}

async function releaseLock(uuid: string): Promise<void> {
  await redis.del(`lock:${uuid}`);
}

async function waitForLock(uuid: string): Promise<boolean> {
  for (let i = 0; i < MAX_LOCK_RETRIES; i++) {
    if (await acquireLock(uuid)) return true;
    await sleep(LOCK_RETRY_DELAY);
  }
  return false;
}

export const locking: Solution = {
  name: 'locking',

  async reindex(uuid: string, content: string, options?: ReindexOptions): Promise<void> {
    const locked = await waitForLock(uuid);
    if (!locked) {
      throw new Error(`Failed to acquire lock for document ${uuid} after ${MAX_LOCK_RETRIES} retries`);
    }

    try {
      const repo = getVectorRepo();
      await redis.hset(
        'reindex:in_progress',
        uuid,
        JSON.stringify({ documentNumber: uuid, startedAt: Date.now() })
      );

      if (options?.simulateDelayMs) {
        await sleep(options.simulateDelayMs);
      }

      // DELETE then INSERT (protected by lock)
      await repo.deleteByUuid(uuid);

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
      await redis.hdel('reindex:in_progress', uuid);
    } finally {
      await releaseLock(uuid);
    }
  },

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const vector = generateEmbedding(query);
    const repo = getVectorRepo();
    return repo.search(vector, { limit: options?.limit || 10 });
  },

  async deleteByUuid(uuid: string): Promise<void> {
    const locked = await waitForLock(uuid);
    if (!locked) throw new Error(`Failed to acquire lock for delete on ${uuid}`);

    try {
      const repo = getVectorRepo();
      await repo.deleteByUuid(uuid);
    } finally {
      await releaseLock(uuid);
    }
  },

  async ingest(uuid: string, documentNumber: string, content: string): Promise<void> {
    const locked = await waitForLock(uuid);
    if (!locked) throw new Error(`Failed to acquire lock for ingest on ${uuid}`);

    try {
      const repo = getVectorRepo();
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

      await repo.upsertChunks(chunks);
    } finally {
      await releaseLock(uuid);
    }
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
