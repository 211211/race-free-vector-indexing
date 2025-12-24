// src/services/recovery.ts

import { redis } from './redis';
import * as qdrant from './qdrant';
import type { StuckDocument, StuckLock, IncompleteVersion, InProgressInfo } from '../types';

export async function getStuckDocuments(thresholdMinutes = 5): Promise<StuckDocument[]> {
  const allInProgress = await redis.hgetall('reindex:in_progress');
  const stuckDocs: StuckDocument[] = [];

  for (const [uuid, data] of Object.entries(allInProgress)) {
    const info = JSON.parse(data) as InProgressInfo;
    const stuckDuration = Date.now() - info.startedAt;
    const thresholdMs = thresholdMinutes * 60 * 1000;

    if (stuckDuration > thresholdMs) {
      stuckDocs.push({
        uuid,
        documentNumber: info.documentNumber,
        startedAt: info.startedAt,
        stuckDurationMs: stuckDuration,
        stuckDurationMinutes: Math.round(stuckDuration / 60000),
      });
    }
  }

  return stuckDocs;
}

export async function getStuckLocks(thresholdMinutes = 10): Promise<StuckLock[]> {
  const locks = await redis.keys('lock:*');
  const stuckLocks: StuckLock[] = [];

  for (const key of locks) {
    const data = await redis.get(key);
    if (!data) continue;

    const info = JSON.parse(data) as { lockedAt: number };
    const lockDuration = Date.now() - info.lockedAt;
    const thresholdMs = thresholdMinutes * 60 * 1000;

    if (lockDuration > thresholdMs) {
      const ttl = await redis.ttl(key);
      stuckLocks.push({
        documentId: key.replace('lock:', ''),
        lockedAt: info.lockedAt,
        lockDurationMs: lockDuration,
        lockDurationMinutes: Math.round(lockDuration / 60000),
        ttlSeconds: ttl,
      });
    }
  }

  return stuckLocks;
}

export async function getIncompleteBlueGreen(): Promise<IncompleteVersion[]> {
  const results = await qdrant.scrollAll();
  const docVersions: Record<string, Set<number>> = {};

  for (const point of results) {
    const uuid = point.payload?.uuid;
    const version = point.payload?.version;

    if (!uuid || version === undefined) continue;

    if (!docVersions[uuid]) {
      docVersions[uuid] = new Set();
    }
    docVersions[uuid].add(version);
  }

  const incomplete: IncompleteVersion[] = [];
  for (const [uuid, versions] of Object.entries(docVersions)) {
    if (versions.size > 1) {
      incomplete.push({
        uuid,
        versions: Array.from(versions).sort((a, b) => a - b),
        versionCount: versions.size,
      });
    }
  }

  return incomplete;
}

export async function cleanupStuckDocument(
  uuid: string,
  action: 'clear_status' | 'force_delete'
): Promise<{ uuid: string; action: string; success: boolean }> {
  if (action === 'clear_status') {
    await redis.hdel('reindex:in_progress', uuid);
    return { uuid, action, success: true };
  }

  if (action === 'force_delete') {
    await redis.hdel('reindex:in_progress', uuid);
    await qdrant.deleteByUuid(uuid);
    return { uuid, action, success: true };
  }

  return { uuid, action, success: false };
}

export async function cleanupIncompleteVersions(
  uuid: string,
  keepVersion: number
): Promise<{ uuid: string; keptVersion: number; success: boolean }> {
  await qdrant.deleteByUuidExceptVersion(uuid, keepVersion);
  await redis.hdel('reindex:in_progress', uuid);
  return { uuid, keptVersion: keepVersion, success: true };
}

export async function forceReleaseLock(documentId: string): Promise<{ documentId: string; released: boolean }> {
  const key = `lock:${documentId}`;
  const existed = await redis.del(key);
  return { documentId, released: existed > 0 };
}
