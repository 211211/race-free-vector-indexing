// test/race-condition.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { baseline } from '../src/solutions/baseline';
import { blueGreen } from '../src/solutions/blue-green';
import { softDelete } from '../src/solutions/soft-delete';
import { locking } from '../src/solutions/locking';
import { resetCollection } from '../src/solutions';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Race Condition Tests', () => {
  beforeAll(async () => {
    await resetCollection();
  });

  afterAll(async () => {
    await resetCollection();
  });

  describe('TC1: Baseline DELETE-THEN-INSERT Race Condition', () => {
    it('should demonstrate document unavailability during reindex', async () => {
      const uuid = `race-baseline-${Date.now()}`;

      await baseline.reindex(uuid, 'Initial pump specifications. Model A100.');
      await sleep(100);

      let reindexComplete = false;
      const reindexPromise = baseline
        .reindex(uuid, 'Updated pump specifications. Model B200.', { simulateDelayMs: 500 })
        .then(() => { reindexComplete = true; });

      await sleep(50);

      const emptyResults: boolean[] = [];
      while (!reindexComplete) {
        const results = await baseline.search(`pump ${uuid}`);
        emptyResults.push(!results.some((r) => r.payload.uuid === uuid));
        await sleep(50);
      }

      await reindexPromise;

      const hasEmptyPeriod = emptyResults.some((empty) => empty);
      expect(hasEmptyPeriod).toBe(true);
      console.log(`Baseline: ${emptyResults.filter((e) => e).length}/${emptyResults.length} queries returned empty`);
    });
  });

  describe('TC2: Blue-Green No Race Condition', () => {
    it('should maintain availability during reindex', async () => {
      const uuid = `race-bluegreen-${Date.now()}`;

      await blueGreen.reindex(uuid, 'Initial pump specifications. Model A100.');
      await sleep(100);

      let reindexComplete = false;
      const reindexPromise = blueGreen
        .reindex(uuid, 'Updated pump specifications. Model B200.', { simulateDelayMs: 500 })
        .then(() => { reindexComplete = true; });

      await sleep(50);

      const emptyResults: boolean[] = [];
      while (!reindexComplete) {
        const results = await blueGreen.search(`pump ${uuid}`);
        emptyResults.push(!results.some((r) => r.payload.uuid === uuid));
        await sleep(50);
      }

      await reindexPromise;

      const emptyCount = emptyResults.filter((e) => e).length;
      console.log(`Blue-Green: ${emptyCount}/${emptyResults.length} queries returned empty`);
      expect(emptyCount).toBe(0);
    });
  });

  describe('TC3: Soft-Delete No Race Condition', () => {
    it('should maintain availability with status filtering', async () => {
      const uuid = `race-softdelete-${Date.now()}`;

      await softDelete.reindex(uuid, 'Initial pump specifications. Model A100.');
      await sleep(100);

      let reindexComplete = false;
      const reindexPromise = softDelete
        .reindex(uuid, 'Updated pump specifications. Model B200.', { simulateDelayMs: 500 })
        .then(() => { reindexComplete = true; });

      await sleep(50);

      const emptyResults: boolean[] = [];
      while (!reindexComplete) {
        const results = await softDelete.search(`pump ${uuid}`);
        emptyResults.push(!results.some((r) => r.payload.uuid === uuid));
        await sleep(50);
      }

      await reindexPromise;

      const emptyCount = emptyResults.filter((e) => e).length;
      console.log(`Soft-Delete: ${emptyCount}/${emptyResults.length} queries returned empty`);
      expect(emptyCount).toBe(0);
    });
  });

  describe('TC4: Concurrent Reindex Requests', () => {
    it('should handle concurrent reindex without corruption', async () => {
      const uuid = `concurrent-${Date.now()}`;

      await Promise.all([
        blueGreen.reindex(uuid, 'Content version 1'),
        blueGreen.reindex(uuid, 'Content version 2'),
        blueGreen.reindex(uuid, 'Content version 3'),
      ]);

      await sleep(100);

      const results = await blueGreen.search(`Content ${uuid}`);
      const chunks = results.filter((r) => r.payload.uuid === uuid);

      expect(chunks.length).toBeGreaterThan(0);
      console.log(`After concurrent reindex: ${chunks.length} chunks found`);
    });
  });
});
