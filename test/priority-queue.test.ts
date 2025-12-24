// test/priority-queue.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  enqueueReindex,
  dequeueReindex,
  getQueueStatus,
  getQueuePosition,
  bumpPriority,
  completeJob,
  ReindexPriority,
} from '../src/services/priority-queue';
import { redis } from '../src/services/redis';

describe('Priority Queue Tests', () => {
  beforeEach(async () => {
    await redis.del('reindex:queue');
    await redis.del('reindex:jobs');
  });

  describe('TC1: Priority Ordering', () => {
    it('should dequeue jobs by priority', async () => {
      const now = Date.now();

      await enqueueReindex({
        uuid: 'low-priority',
        documentNumber: 'DOC-001',
        priority: ReindexPriority.LOW,
        reason: 'Background',
        createdAt: now,
      });

      await enqueueReindex({
        uuid: 'critical-priority',
        documentNumber: 'DOC-002',
        priority: ReindexPriority.CRITICAL,
        reason: 'Recovery',
        createdAt: now + 100,
      });

      await enqueueReindex({
        uuid: 'normal-priority',
        documentNumber: 'DOC-003',
        priority: ReindexPriority.NORMAL,
        reason: 'User request',
        createdAt: now + 200,
      });

      const first = await dequeueReindex();
      expect(first?.uuid).toBe('critical-priority');

      const second = await dequeueReindex();
      expect(second?.uuid).toBe('normal-priority');

      const third = await dequeueReindex();
      expect(third?.uuid).toBe('low-priority');
    });
  });

  describe('TC2: Queue Status', () => {
    it('should return grouped status by priority', async () => {
      const now = Date.now();

      await enqueueReindex({ uuid: 'c1', documentNumber: 'D1', priority: ReindexPriority.CRITICAL, reason: 'R', createdAt: now });
      await enqueueReindex({ uuid: 'h1', documentNumber: 'D2', priority: ReindexPriority.HIGH, reason: 'R', createdAt: now });
      await enqueueReindex({ uuid: 'n1', documentNumber: 'D3', priority: ReindexPriority.NORMAL, reason: 'R', createdAt: now });
      await enqueueReindex({ uuid: 'n2', documentNumber: 'D4', priority: ReindexPriority.NORMAL, reason: 'R', createdAt: now + 100 });

      const status = await getQueueStatus();

      expect(status.totalJobs).toBe(4);
      expect(status.byPriority.critical.length).toBe(1);
      expect(status.byPriority.high.length).toBe(1);
      expect(status.byPriority.normal.length).toBe(2);
      expect(status.byPriority.low.length).toBe(0);
    });
  });

  describe('TC3: Bump Priority', () => {
    it('should move job to higher priority', async () => {
      const now = Date.now();

      await enqueueReindex({ uuid: 'critical-job', documentNumber: 'D1', priority: ReindexPriority.CRITICAL, reason: 'R', createdAt: now });
      await enqueueReindex({ uuid: 'low-job', documentNumber: 'D2', priority: ReindexPriority.LOW, reason: 'R', createdAt: now });

      await bumpPriority('low-job', ReindexPriority.CRITICAL);

      const first = await dequeueReindex();
      expect(first?.uuid).toBe('critical-job');

      const second = await dequeueReindex();
      expect(second?.uuid).toBe('low-job');
    });
  });

  describe('TC4: Auto Retry', () => {
    it('should auto-retry failed jobs up to 3 times', async () => {
      await enqueueReindex({
        uuid: 'retry-job',
        documentNumber: 'DOC-001',
        priority: ReindexPriority.NORMAL,
        reason: 'Initial',
        createdAt: Date.now(),
        retryCount: 0,
      });

      for (let i = 0; i < 3; i++) {
        const job = await dequeueReindex();
        expect(job?.uuid).toBe('retry-job');
        await completeJob(job!.uuid, false, 'Simulated failure');
      }

      const job = await dequeueReindex();
      await completeJob(job!.uuid, false, 'Final failure');

      const finalStatus = await getQueueStatus();
      expect(finalStatus.totalJobs).toBe(0);
    });
  });
});
