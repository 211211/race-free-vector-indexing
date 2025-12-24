// src/types.ts

export interface ChunkPayload {
  uuid: string;
  documentNumber: string;
  chunkIndex: number;
  content: string;
  version?: number;
  status?: 'active' | 'inactive' | 'pending';
  createdAt: number;
  updatedAt?: number;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload: ChunkPayload;
}

export interface ReindexOptions {
  simulateDelayMs?: number;
}

export interface SearchOptions {
  limit?: number;
  filter?: Record<string, unknown>;
}

export interface Solution {
  name: string;
  reindex(uuid: string, content: string, options?: ReindexOptions): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  deleteByUuid(uuid: string): Promise<void>;
  ingest(uuid: string, documentNumber: string, content: string): Promise<void>;
  searchByDocumentNumbers?(query: string, documentNumbers: string[]): Promise<SearchResult[]>;
}

export interface BenchmarkConfig {
  documentId: string;
  queryIntervalMs: number;
  reindexDelayMs: number;
}

export interface BenchmarkResult {
  solution: string;
  totalQueries: number;
  emptyResults: number;
  availability: number;
  avgLatencyMs: number;
}

export interface ReindexJob {
  uuid: string;
  documentNumber: string;
  priority: number;
  reason: string;
  createdAt: number;
  retryCount?: number;
  originalError?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  queuedAt?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  priorityBumpedAt?: number;
}

export interface InProgressInfo {
  documentNumber: string;
  startedAt: number;
  retryCount?: number;
}

export interface StuckDocument {
  uuid: string;
  documentNumber: string;
  startedAt: number;
  stuckDurationMs: number;
  stuckDurationMinutes: number;
}

export interface StuckLock {
  documentId: string;
  lockedAt: number;
  lockDurationMs: number;
  lockDurationMinutes: number;
  ttlSeconds: number;
}

export interface IncompleteVersion {
  uuid: string;
  versions: number[];
  versionCount: number;
}
