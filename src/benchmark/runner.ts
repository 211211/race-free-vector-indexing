// src/benchmark/runner.ts

import * as solutions from '../solutions';
import { ensureCollection } from '../services/qdrant';
import { redis } from '../services/redis';
import type { Solution, BenchmarkConfig, BenchmarkResult } from '../types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runBenchmark(solution: Solution, config: BenchmarkConfig): Promise<BenchmarkResult> {
  const { documentId, queryIntervalMs, reindexDelayMs } = config;

  const initialContent = `Initial content for ${documentId}. This is the original document.`;
  const updatedContent = `Updated content for ${documentId}. This is the new version with more details.`;

  await solution.reindex(documentId, initialContent);
  await sleep(100);

  const results = { totalQueries: 0, emptyResults: 0, latencies: [] as number[] };
  let running = true;

  const queryTask = (async () => {
    while (running) {
      const start = Date.now();
      const searchResults = await solution.search(`content ${documentId}`);
      const latency = Date.now() - start;

      results.totalQueries++;
      results.latencies.push(latency);

      const hasDocument = searchResults.some(
        (r) => r.payload.uuid === documentId || r.payload.documentNumber === documentId
      );
      if (!hasDocument) results.emptyResults++;

      await sleep(queryIntervalMs);
    }
  })();

  try {
    await sleep(100);
    await solution.reindex(documentId, updatedContent, { simulateDelayMs: reindexDelayMs });
  } finally {
    // Always stop query loop even if reindex fails
    await sleep(200);
    running = false;
    await queryTask;
  }

  const availability = ((results.totalQueries - results.emptyResults) / results.totalQueries) * 100;
  const avgLatency = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length;

  return {
    solution: solution.name,
    totalQueries: results.totalQueries,
    emptyResults: results.emptyResults,
    availability: Math.round(availability * 100) / 100,
    avgLatencyMs: Math.round(avgLatency * 100) / 100,
  };
}

export async function compareSolutions(
  solutionNames: string[],
  options: { iterations?: number; queryIntervalMs?: number } = {}
): Promise<{
  summary: Record<string, { avgAvailability: number; avgLatency: number }>;
  details: BenchmarkResult[];
}> {
  const { iterations = 3, queryIntervalMs = 30 } = options;
  const allResults: BenchmarkResult[] = [];

  for (const name of solutionNames) {
    const solution = solutions.create(name);

    for (let i = 0; i < iterations; i++) {
      const documentId = `bench-${name}-${i}-${Date.now()}`;
      const result = await runBenchmark(solution, { documentId, queryIntervalMs, reindexDelayMs: 500 });
      allResults.push(result);
      console.log(`[${name}] Iteration ${i + 1}/${iterations}: ${result.availability}% availability`);
      await sleep(100);
    }
  }

  const summary: Record<string, { avgAvailability: number; avgLatency: number }> = {};
  for (const name of solutionNames) {
    const solutionResults = allResults.filter((r) => r.solution === name);
    summary[name] = {
      avgAvailability: Math.round((solutionResults.reduce((sum, r) => sum + r.availability, 0) / solutionResults.length) * 100) / 100,
      avgLatency: Math.round((solutionResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / solutionResults.length) * 100) / 100,
    };
  }

  return { summary, details: allResults };
}

export async function demonstrateRaceCondition(
  documentId: string,
  reindexDelayMs = 2000
): Promise<{ timeline: Array<{ time: number; event: string; hasResults: boolean }>; emptyPeriods: number }> {
  const solution = solutions.create('baseline');
  const timeline: Array<{ time: number; event: string; hasResults: boolean }> = [];

  await solution.reindex(documentId, 'Initial content for race condition test');
  await sleep(100);

  const startTime = Date.now();
  let reindexComplete = false;

  const reindexPromise = (async () => {
    timeline.push({ time: Date.now() - startTime, event: 'reindex_start', hasResults: true });
    await solution.reindex(documentId, 'Updated content after reindex', { simulateDelayMs: reindexDelayMs });
    timeline.push({ time: Date.now() - startTime, event: 'reindex_complete', hasResults: true });
    reindexComplete = true;
  })();

  await sleep(50);

  while (!reindexComplete) {
    const results = await solution.search(`content ${documentId}`);
    const hasDocument = results.some((r) => r.payload.uuid === documentId);
    timeline.push({ time: Date.now() - startTime, event: 'query', hasResults: hasDocument });
    await sleep(100);
  }

  await reindexPromise;
  return { timeline, emptyPeriods: timeline.filter((t) => t.event === 'query' && !t.hasResults).length };
}

// === CLI Entry (safe default) ===
// Allows: bun run src/benchmark/runner.ts
if (import.meta.main) {
  (async () => {
    try {
      await ensureCollection();
      const names = solutions.getAvailableSolutions();
      const result = await compareSolutions(names, { iterations: 1, queryIntervalMs: 30 });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Benchmark failed:', (error as Error).message);
      process.exitCode = 1;
    } finally {
      try { redis.disconnect(); } catch {}
    }
  })();
}
