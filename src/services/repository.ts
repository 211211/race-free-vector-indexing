import type { ChunkPayload, SearchResult } from '../types';
import type { QdrantFilter } from './qdrant';
import * as qdrant from './qdrant';

export interface VectorRepository {
  search(vector: number[], options?: { limit?: number; filter?: QdrantFilter }): Promise<SearchResult[]>;
  upsertChunks(chunks: Array<{ id: string; vector: number[]; payload: ChunkPayload }>): Promise<void>;
  deleteByUuid(uuid: string): Promise<void>;
  deleteByUuidAndVersion(uuid: string, version: number): Promise<void>;
  deleteByUuidExceptVersion(uuid: string, keepVersion: number): Promise<void>;
  markInactive(uuid: string): Promise<void>;
  markInactiveOlderThan(uuid: string, beforeTimestamp: number): Promise<void>;
  getChunksByUuid(uuid: string): Promise<ChunkPayload[]>;
  getAllDocuments(): Promise<Array<{ uuid: string; chunkCount: number }>>;
  getMetrics(): Promise<{ totalPoints: number; collectionInfo: unknown }>;
}

class QdrantVectorRepository implements VectorRepository {
  async search(vector: number[], options: { limit?: number; filter?: QdrantFilter } = {}): Promise<SearchResult[]> {
    return qdrant.search(vector, options);
  }

  async upsertChunks(chunks: Array<{ id: string; vector: number[]; payload: ChunkPayload }>): Promise<void> {
    await qdrant.upsertChunks(chunks);
  }

  async deleteByUuid(uuid: string): Promise<void> {
    await qdrant.deleteByUuid(uuid);
  }

  async deleteByUuidAndVersion(uuid: string, version: number): Promise<void> {
    await qdrant.deleteByUuidAndVersion(uuid, version);
  }

  async deleteByUuidExceptVersion(uuid: string, keepVersion: number): Promise<void> {
    await qdrant.deleteByUuidExceptVersion(uuid, keepVersion);
  }

  async markInactive(uuid: string): Promise<void> {
    await qdrant.markInactive(uuid);
  }

  async markInactiveOlderThan(uuid: string, beforeTimestamp: number): Promise<void> {
    await qdrant.markInactiveOlderThan(uuid, beforeTimestamp);
  }

  async getChunksByUuid(uuid: string): Promise<ChunkPayload[]> {
    return qdrant.getChunksByUuid(uuid);
  }

  async getAllDocuments(): Promise<Array<{ uuid: string; chunkCount: number }>> {
    return qdrant.getAllDocuments();
  }

  async getMetrics(): Promise<{ totalPoints: number; collectionInfo: unknown }> {
    return qdrant.getMetrics();
  }
}

let repoInstance: VectorRepository | null = null;

export function getVectorRepo(): VectorRepository {
  if (!repoInstance) repoInstance = new QdrantVectorRepository();
  return repoInstance;
}

