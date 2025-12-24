// src/services/priority-queue.ts

import type { InProgressInfo, ReindexJob } from '../types';

import { redis } from './redis';

export enum ReindexPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

export async function enqueueReindex(job: ReindexJob): Promise<{ queued: boolean; score: number; position: number }> {
  const score = job.priority * 1e12 + job.createdAt;

  // complexity: O(log(N)) for each item added, where N is the number of elements in the sorted set.
  await redis.zadd('reindex:queue', score, JSON.stringify(job));

  // complexity: O(1) for each field/value pair added, so O(N) to add N field/value pairs when the command is called with multiple field/value pairs.
  await redis.hset(
    'reindex:jobs',
    job.uuid,
    JSON.stringify({ ...job, status: 'queued', queuedAt: Date.now() })
  );

  return { queued: true, score, position: await getQueuePosition(job.uuid) };
}

export async function dequeueReindex(): Promise<ReindexJob | null> {
  const result = await redis.zpopmin('reindex:queue');
  if (!result || result.length === 0) return null;

  const job = JSON.parse(result[0]) as ReindexJob;

  await redis.hset(
    'reindex:jobs',
    job.uuid,
    JSON.stringify({ ...job, status: 'processing', startedAt: Date.now() })
  );

  return job;
}

export async function getQueuePosition(uuid: string): Promise<number> {
  const jobData = await redis.hget('reindex:jobs', uuid);
  if (!jobData) return -1;

  const job = JSON.parse(jobData) as ReindexJob;
  if (job.status !== 'queued') return -1;

  const score = job.priority * 1e12 + job.createdAt;
  return await redis.zcount('reindex:queue', '-inf', score);
}

export async function getQueueStatus(): Promise<{
  totalJobs: number;
  byPriority: { critical: ReindexJob[]; high: ReindexJob[]; normal: ReindexJob[]; low: ReindexJob[] };
  jobs: Array<ReindexJob & { score: number; position: number }>;
}> {
  const queue = await redis.zrange('reindex:queue', 0, -1, 'WITHSCORES');
  const jobs: Array<ReindexJob & { score: number; position: number }> = [];

  for (let i = 0; i < queue.length; i += 2) {
    const job = JSON.parse(queue[i]) as ReindexJob;
    const score = parseFloat(queue[i + 1]);
    jobs.push({ ...job, score, position: i / 2 + 1 });
  }

  return {
    totalJobs: jobs.length,
    byPriority: {
      critical: jobs.filter((j) => j.priority === ReindexPriority.CRITICAL),
      high: jobs.filter((j) => j.priority === ReindexPriority.HIGH),
      normal: jobs.filter((j) => j.priority === ReindexPriority.NORMAL),
      low: jobs.filter((j) => j.priority === ReindexPriority.LOW),
    },
    jobs,
  };
}

export async function recoverOnStartup(): Promise<{ orphanDocuments: number; interruptedJobs: number; stuckLocks: number }> {
  const recovered = { orphanDocuments: 0, interruptedJobs: 0, stuckLocks: 0 };

  // 1. Find orphan documents (stuck > 5 min)
  const allInProgress = await redis.hgetall('reindex:in_progress');
  for (const [uuid, data] of Object.entries(allInProgress)) {
    const info = JSON.parse(data) as InProgressInfo;
    const stuckDuration = Date.now() - info.startedAt;

    if (stuckDuration > 5 * 60 * 1000) {
      await enqueueReindex({
        uuid,
        documentNumber: info.documentNumber || 'unknown',
        priority: ReindexPriority.CRITICAL,
        reason: `Recovery sau crash - stuck ${Math.round(stuckDuration / 60000)} phút`,
        createdAt: Date.now(),
        retryCount: (info.retryCount || 0) + 1,
        originalError: 'Service crash during reindex',
      });
      await redis.hdel('reindex:in_progress', uuid);
      recovered.orphanDocuments++;
    }
  }

  // 2. Find interrupted jobs
  const allJobs = await redis.hgetall('reindex:jobs');
  for (const [uuid, data] of Object.entries(allJobs)) {
    const job = JSON.parse(data) as ReindexJob;
    if (job.status === 'processing') {
      await enqueueReindex({
        uuid,
        documentNumber: job.documentNumber,
        priority: ReindexPriority.HIGH,
        reason: 'Interrupted job recovery',
        createdAt: Date.now(),
        retryCount: (job.retryCount || 0) + 1,
      });
      recovered.interruptedJobs++;
    }
  }

  // 3. Force release stuck locks
  const locks = await redis.keys('lock:*');
  for (const key of locks) {
    const data = await redis.get(key);
    if (!data) continue;

    const info = JSON.parse(data) as { lockedAt: number };
    if (Date.now() - info.lockedAt > 10 * 60 * 1000) {
      await redis.del(key);
      recovered.stuckLocks++;
    }
  }

  return recovered;
}

export async function completeJob(uuid: string, success: boolean, error?: string): Promise<void> {
  const jobData = await redis.hget('reindex:jobs', uuid);
  if (!jobData) return;

  const job = JSON.parse(jobData) as ReindexJob;

  await redis.hset(
    'reindex:jobs',
    uuid,
    JSON.stringify({ ...job, status: success ? 'completed' : 'failed', completedAt: Date.now(), error })
  );

  if (!success && (job.retryCount || 0) < 3) {
    await enqueueReindex({
      ...job,
      priority: ReindexPriority.HIGH,
      reason: `Retry #${(job.retryCount || 0) + 1}: ${error}`,
      createdAt: Date.now(),
      retryCount: (job.retryCount || 0) + 1,
      originalError: error,
    });
  }
}

export async function bumpPriority(
  uuid: string,
  newPriority: ReindexPriority
): Promise<{ success: boolean; error?: string; newPriority?: number; newPosition?: number }> {
  const jobData = await redis.hget('reindex:jobs', uuid);
  if (!jobData) return { success: false, error: 'Job not found' };

  const job = JSON.parse(jobData) as ReindexJob;
  await redis.zrem('reindex:queue', JSON.stringify(job));

  job.priority = newPriority;
  const score = newPriority * 1e12 + job.createdAt;
  await redis.zadd('reindex:queue', score, JSON.stringify(job));
  await redis.hset('reindex:jobs', uuid, JSON.stringify({ ...job, priorityBumpedAt: Date.now() }));

  return { success: true, newPriority, newPosition: await getQueuePosition(uuid) };
}

export async function cleanupOldJobs(olderThanMinutes = 60): Promise<number> {
  const allJobs = await redis.hgetall('reindex:jobs');
  const threshold = Date.now() - olderThanMinutes * 60 * 1000;
  let cleaned = 0;

  for (const [uuid, data] of Object.entries(allJobs)) {
    const job = JSON.parse(data) as ReindexJob;
    if ((job.status === 'completed' || job.status === 'failed') && job.completedAt && job.completedAt < threshold) {
      await redis.hdel('reindex:jobs', uuid);
      cleaned++;
    }
  }

  return cleaned;
}
