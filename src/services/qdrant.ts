// src/services/qdrant.ts

import type { ChunkPayload, SearchResult } from '../types';

// === Qdrant API Types ===
interface QdrantCollectionsResponse {
  result?: { collections?: Array<{ name: string }> };
}

interface QdrantCollectionInfoResponse {
  result?: { points_count?: number } & Record<string, unknown>;
}

interface QdrantSearchResponse {
  result?: Array<{ id: string | number; score: number; payload: ChunkPayload }>;
}

interface QdrantScrollPoints {
  id: string | number;
  payload: ChunkPayload;
  vector?: number[];
}

interface QdrantScrollResponse {
  result?: { points?: QdrantScrollPoints[] };
}

type QdrantMatch = {
  value?: string | number | boolean;
  any?: Array<string | number | boolean>;
};

type QdrantRange = {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
};

export type QdrantFilter = {
  must?: Array<{ key: string; match?: QdrantMatch; range?: QdrantRange }>;
  must_not?: Array<{ key: string; match?: QdrantMatch; range?: QdrantRange }>;
  should?: Array<{ key: string; match?: QdrantMatch; range?: QdrantRange }>;
};

const COLLECTION_NAME = 'chunks';
const VECTOR_SIZE = 384;
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

async function qdrantFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${QDRANT_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Qdrant error: ${res.status} ${text}`);
  }
  return res;
}

async function qdrantJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await qdrantFetch(path, options);
  return (await res.json()) as T;
}

export async function ensureCollection(): Promise<void> {
  const data = await qdrantJson<QdrantCollectionsResponse>('/collections');
  const exists = data.result?.collections?.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    await qdrantFetch(`/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      body: JSON.stringify({
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      }),
    });
    console.log(`Collection '${COLLECTION_NAME}' created`);
  }
}

export async function resetCollection(): Promise<void> {
  await qdrantFetch(`/collections/${COLLECTION_NAME}`, { method: 'DELETE' });
  await qdrantFetch(`/collections/${COLLECTION_NAME}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    }),
  });
  console.log(`Collection '${COLLECTION_NAME}' reset`);
}

export async function upsertChunks(
  chunks: Array<{ id: string; vector: number[]; payload: ChunkPayload }>
): Promise<void> {
  if (chunks.length === 0) return;

  await qdrantFetch(`/collections/${COLLECTION_NAME}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({
      points: chunks.map((c) => ({
        id: c.id,
        vector: c.vector,
        payload: c.payload,
      })),
    }),
  });
}

export async function deleteByFilter(filter: QdrantFilter): Promise<void> {
  await qdrantFetch(`/collections/${COLLECTION_NAME}/points/delete?wait=true`, {
    method: 'POST',
    body: JSON.stringify({ filter }),
  });
}

export async function deleteByUuid(uuid: string): Promise<void> {
  await deleteByFilter({ must: [{ key: 'uuid', match: { value: uuid } }] });
}

export async function deleteByUuidAndVersion(uuid: string, version: number): Promise<void> {
  await deleteByFilter({
    must: [
      { key: 'uuid', match: { value: uuid } },
      { key: 'version', match: { value: version } },
    ],
  });
}

export async function deleteByUuidExceptVersion(uuid: string, keepVersion: number): Promise<void> {
  await deleteByFilter({
    must: [{ key: 'uuid', match: { value: uuid } }],
    must_not: [{ key: 'version', match: { value: keepVersion } }],
  });
}

export async function search(
  vector: number[],
  options: { limit?: number; filter?: QdrantFilter } = {}
): Promise<SearchResult[]> {
  const data = await qdrantJson<QdrantSearchResponse>(`/collections/${COLLECTION_NAME}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector,
      limit: options.limit || 10,
      filter: options.filter,
      with_payload: true,
    }),
  });

  return (data.result || []).map((r) => ({
    id: r.id,
    score: r.score,
    payload: r.payload,
  }));
}

export async function searchWithActiveFilter(
  vector: number[],
  options: { limit?: number } = {}
): Promise<SearchResult[]> {
  return search(vector, {
    ...options,
    filter: { must: [{ key: 'status', match: { value: 'active' } }] },
  });
}

export async function scroll(filter?: QdrantFilter): Promise<Array<{ id: string | number; payload: ChunkPayload }>> {
  const data = await qdrantJson<QdrantScrollResponse>(`/collections/${COLLECTION_NAME}/points/scroll`, {
    method: 'POST',
    body: JSON.stringify({
      filter,
      limit: 10000,
      with_payload: true,
      with_vector: false,
    }),
  });

  return (data.result?.points || []).map((p) => ({
    id: p.id,
    payload: p.payload,
  }));
}

export async function scrollAll(): Promise<Array<{ id: string | number; payload: ChunkPayload }>> {
  return scroll();
}

export async function getChunksByUuid(uuid: string): Promise<ChunkPayload[]> {
  const points = await scroll({ must: [{ key: 'uuid', match: { value: uuid } }] });
  return points.map((p) => p.payload);
}

export async function getAllDocuments(): Promise<Array<{ uuid: string; chunkCount: number }>> {
  const points = await scrollAll();
  const docMap = new Map<string, number>();

  for (const point of points) {
    const uuid = point.payload.uuid;
    docMap.set(uuid, (docMap.get(uuid) || 0) + 1);
  }

  return Array.from(docMap.entries()).map(([uuid, chunkCount]) => ({ uuid, chunkCount }));
}

export async function getMetrics(): Promise<{ totalPoints: number; collectionInfo: QdrantCollectionInfoResponse['result'] }> {
  const data = await qdrantJson<QdrantCollectionInfoResponse>(`/collections/${COLLECTION_NAME}`);
  return {
    totalPoints: data.result?.points_count || 0,
    collectionInfo: data.result,
  };
}

export async function markInactive(uuid: string): Promise<void> {
  const points = await scroll({
    must: [
      { key: 'uuid', match: { value: uuid } },
      { key: 'status', match: { value: 'active' } },
    ],
  });

  if (points.length === 0) return;

  // Update each point's status
  const data = await qdrantJson<QdrantScrollResponse>(`/collections/${COLLECTION_NAME}/points/scroll`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        must: [
          { key: 'uuid', match: { value: uuid } },
          { key: 'status', match: { value: 'active' } },
        ],
      },
      limit: 1000,
      with_payload: true,
      with_vector: true,
    }),
  });

  const pointsWithVectors = data.result?.points || [];

  if (pointsWithVectors.length > 0) {
    await qdrantFetch(`/collections/${COLLECTION_NAME}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({
        points: pointsWithVectors.map((p) => ({
          id: p.id,
          vector: p.vector as number[],
          payload: { ...p.payload, status: 'inactive', updatedAt: Date.now() },
        })),
      }),
    });
  }
}

export async function countPoints(filter?: QdrantFilter): Promise<number> {
  const points = await scroll(filter);
  return points.length;
}

export async function getStatusCounts(): Promise<{ total: number; active: number; inactive: number }> {
  const metrics = await getMetrics();
  const active = await countPoints({ must: [{ key: 'status', match: { value: 'active' } }] });
  const inactive = await countPoints({ must: [{ key: 'status', match: { value: 'inactive' } }] });
  return { total: metrics.totalPoints, active, inactive };
}

export async function getDocumentSummary(uuid: string): Promise<{
  uuid: string;
  chunkCount: number;
  statusCounts: { active: number; inactive: number; unknown: number };
  versions: number[];
  createdAtRange?: { min: number; max: number };
}> {
  const points = await scroll({ must: [{ key: 'uuid', match: { value: uuid } }] });
  const statusCounts = { active: 0, inactive: 0, unknown: 0 };
  const versionsSet = new Set<number>();
  let minCreated: number | undefined;
  let maxCreated: number | undefined;

  for (const p of points) {
    const status = p.payload.status as 'active' | 'inactive' | undefined;
    if (status === 'active') statusCounts.active++;
    else if (status === 'inactive') statusCounts.inactive++;
    else statusCounts.unknown++;

    if (typeof p.payload.version === 'number') {
      versionsSet.add(p.payload.version);
    }

    const created = p.payload.createdAt;
    if (typeof created === 'number') {
      if (minCreated === undefined || created < minCreated) minCreated = created;
      if (maxCreated === undefined || created > maxCreated) maxCreated = created;
    }
  }

  const createdAtRange =
    minCreated !== undefined && maxCreated !== undefined ? { min: minCreated, max: maxCreated } : undefined;

  return {
    uuid,
    chunkCount: points.length,
    statusCounts,
    versions: Array.from(versionsSet.values()).sort((a, b) => a - b),
    createdAtRange,
  };
}

export async function markInactiveOlderThan(uuid: string, beforeTimestamp: number): Promise<void> {
  // Get active chunks for this uuid that were created BEFORE the timestamp
  const data = await qdrantJson<QdrantScrollResponse>(`/collections/${COLLECTION_NAME}/points/scroll`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        must: [
          { key: 'uuid', match: { value: uuid } },
          { key: 'status', match: { value: 'active' } },
          { key: 'createdAt', range: { lt: beforeTimestamp } },
        ],
      },
      limit: 1000,
      with_payload: true,
      with_vector: true,
    }),
  });

  const pointsWithVectors = data.result?.points || [];

  if (pointsWithVectors.length > 0) {
    await qdrantFetch(`/collections/${COLLECTION_NAME}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({
        points: pointsWithVectors.map((p) => ({
          id: p.id,
          vector: p.vector as number[],
          payload: { ...p.payload, status: 'inactive', updatedAt: Date.now() },
        })),
      }),
    });
  }
}
