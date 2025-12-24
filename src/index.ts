// src/index.ts - Bun native HTTP server

import * as solutions from './solutions';
import { runBenchmark, compareSolutions, demonstrateRaceCondition } from './benchmark/runner';
import * as recovery from './services/recovery';
import * as queue from './services/priority-queue';
import { ensureCollection } from './services/qdrant';
import { generateEmbedding } from './services/embedding';

const PORT = parseInt(process.env.PORT || '3000');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Simple router
type Handler = (req: Request, params: Record<string, string>) => Promise<Response>;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [];

function route(method: string, path: string, handler: Handler) {
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
  routes.push({ method, pattern, handler });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  } catch {}
  return {};
}

function getQuery(req: Request): URLSearchParams {
  return new URL(req.url).searchParams;
}

function getSolution(name?: string | null) {
  return solutions.create(name || 'blue-green');
}

// === Health ===
route('GET', '/health', async () => json({ status: 'ok', timestamp: new Date().toISOString() }));

// === Basic Operations ===
route('POST', '/documents/:id/reindex', async (req, params) => {
  const body = await parseBody(req);
  const query = getQuery(req);
  const delay = parseInt(query.get('simulateDelay') || '0');
  const solution = getSolution(query.get('solution'));

  if (delay > 0) {
    solution.reindex(params.id, body.content as string, { simulateDelayMs: delay });
    return json({ status: 'reindex_started', documentId: params.id, solution: solution.name });
  }

  await solution.reindex(params.id, body.content as string);
  return json({ status: 'reindex_complete', documentId: params.id, solution: solution.name });
});

route('POST', '/search', async (req) => {
  const body = await parseBody(req);
  const queryParams = getQuery(req);
  const solution = getSolution(queryParams.get('solution'));
  const limit = (body.limit as number) || 10;
  const debug = (queryParams.get('debug') || 'false') === 'true';

  const results = await solution.search(body.query as string, { limit });

  const response: any = { results, count: results.length, solution: solution.name };

  if (debug) {
    const vector = generateEmbedding(body.query as string);
    const uuidSummary: Record<string, number> = {};
    for (const r of results) {
      const u = r.payload.uuid;
      uuidSummary[u] = (uuidSummary[u] || 0) + 1;
    }

    const filterUsed =
      solution.name === 'blue-green' || solution.name === 'soft-delete'
        ? { must: [{ key: 'status', match: { value: 'active' } }] }
        : undefined;

    response.debug = {
      query: body.query,
      limit,
      vectorSize: vector.length,
      embeddingSample: vector.slice(0, 5),
      filterUsed,
      uuidSummary,
    };
  }

  return json(response);
});

route('GET', '/documents/:id/chunks', async (_, params) => {
  const chunks = await solutions.getChunks(params.id);
  return json({ documentId: params.id, chunks, count: chunks.length });
});

route('GET', '/documents/:id/summary', async (_, params) => {
  const summary = await solutions.getDocumentSummary(params.id);
  return json(summary);
});

// === Benchmark ===
route('POST', '/benchmark/single', async (req) => {
  const body = await parseBody(req);
  const query = getQuery(req);
  const solution = getSolution(query.get('solution'));
  const result = await runBenchmark(solution, body as any);
  return json(result);
});

route('POST', '/benchmark/compare', async (req) => {
  const body = await parseBody(req);
  const results = await compareSolutions(body.solutions as string[], {
    iterations: body.iterations as number,
    queryIntervalMs: body.queryIntervalMs as number,
  });
  return json(results);
});

route('POST', '/benchmark/race-demo', async (req) => {
  const body = await parseBody(req);
  const result = await demonstrateRaceCondition(
    (body.documentId as string) || 'race-demo-001',
    body.reindexDelayMs as number
  );
  return json(result);
});

// === Pipeline Simulation ===
route('POST', '/simulate/worker-reindex', async (req) => {
  const body = await parseBody(req);
  const { uuid, documentNumber, content, simulateProcessingTime } = body as any;
  const solution = getSolution('baseline');

  const timeline: Array<{ time: number; event: string }> = [];
  const startTime = Date.now();

  timeline.push({ time: 0, event: 'start' });
  await solution.deleteByUuid(uuid);
  timeline.push({ time: Date.now() - startTime, event: 'deleted_chunks' });

  if (simulateProcessingTime) {
    await sleep(200);
    timeline.push({ time: Date.now() - startTime, event: 'split_complete' });
    await sleep(300);
    timeline.push({ time: Date.now() - startTime, event: 'embeddings_complete' });
  }

  await solution.ingest(uuid, documentNumber || uuid, content);
  timeline.push({ time: Date.now() - startTime, event: 'ingest_complete' });

  return json({ uuid, timeline, gapPeriodMs: timeline[timeline.length - 1].time - timeline[1].time });
});

route('POST', '/simulate/user-query', async (req) => {
  const body = await parseBody(req);
  const { query: q, documentNumbers } = body as any;
  const solution = getSolution('baseline');

  if (documentNumbers && solution.searchByDocumentNumbers) {
    const results = await solution.searchByDocumentNumbers(q, documentNumbers);
    return json({ results, count: results.length });
  }

  const results = await solution.search(q);
  return json({ results, count: results.length });
});

route('POST', '/simulate/batch-reindex', async (req) => {
  const body = await parseBody(req);
  const { documents, concurrent } = body as any;
  const solution = getSolution('baseline');

  const results: Array<{ uuid: string; status: string }> = [];
  const startTime = Date.now();

  if (concurrent) {
    await Promise.all(
      documents.map(async (doc: any) => {
        await solution.deleteByUuid(doc.uuid);
        await sleep(100 + Math.random() * 200);
        await solution.ingest(doc.uuid, doc.documentNumber || doc.uuid, doc.content);
        results.push({ uuid: doc.uuid, status: 'completed' });
      })
    );
  } else {
    for (const doc of documents) {
      await solution.deleteByUuid(doc.uuid);
      await sleep(100);
      await solution.ingest(doc.uuid, doc.documentNumber || doc.uuid, doc.content);
      results.push({ uuid: doc.uuid, status: 'completed' });
    }
  }

  return json({ totalDocuments: documents.length, concurrent, totalTimeMs: Date.now() - startTime, results });
});

// === Recovery & Diagnostics ===
route('GET', '/recovery/stuck-documents', async (req) => {
  const query = getQuery(req);
  const threshold = parseInt(query.get('thresholdMinutes') || '5');
  const stuckDocs = await recovery.getStuckDocuments(threshold);
  return json({ count: stuckDocs.length, documents: stuckDocs });
});

route('GET', '/recovery/stuck-locks', async (req) => {
  const query = getQuery(req);
  const threshold = parseInt(query.get('thresholdMinutes') || '10');
  const stuckLocks = await recovery.getStuckLocks(threshold);
  return json({ count: stuckLocks.length, locks: stuckLocks });
});

route('GET', '/recovery/incomplete-versions', async () => {
  const incomplete = await recovery.getIncompleteBlueGreen();
  return json({ count: incomplete.length, documents: incomplete });
});

route('POST', '/recovery/cleanup', async (req) => {
  const body = await parseBody(req);
  const result = await recovery.cleanupStuckDocument(body.uuid as string, body.action as any);
  return json(result);
});

route('POST', '/recovery/release-lock', async (req) => {
  const body = await parseBody(req);
  const result = await recovery.forceReleaseLock(body.documentId as string);
  return json(result);
});

route('POST', '/recovery/startup', async () => {
  const result = await queue.recoverOnStartup();
  return json(result);
});

// === Priority Queue ===
route('GET', '/queue/status', async () => {
  const status = await queue.getQueueStatus();
  return json(status);
});

route('POST', '/queue/enqueue', async (req) => {
  const body = await parseBody(req);
  const result = await queue.enqueueReindex({
    uuid: body.uuid as string,
    documentNumber: (body.documentNumber as string) || (body.uuid as string),
    priority: (body.priority as number) || queue.ReindexPriority.NORMAL,
    reason: (body.reason as string) || 'API request',
    createdAt: Date.now(),
  });
  return json(result);
});

route('POST', '/queue/bump-priority', async (req) => {
  const body = await parseBody(req);
  const result = await queue.bumpPriority(body.uuid as string, body.newPriority as number);
  return json(result);
});

route('GET', '/queue/position/:uuid', async (_, params) => {
  const position = await queue.getQueuePosition(params.uuid);
  return json({ uuid: params.uuid, position });
});

route('POST', '/queue/process-next', async () => {
  const job = await queue.dequeueReindex();
  if (!job) return json({ message: 'Queue empty' });

  try {
    const solution = getSolution('blue-green');
    await solution.reindex(job.uuid, `Reindexed content for ${job.uuid}`);
    await queue.completeJob(job.uuid, true);
    return json({ processed: job, success: true });
  } catch (error) {
    await queue.completeJob(job.uuid, false, (error as Error).message);
    return json({ processed: job, success: false, error: (error as Error).message });
  }
});

// === Admin ===
route('POST', '/admin/reset', async () => {
  await solutions.resetCollection();
  return json({ status: 'collection_reset' });
});

route('GET', '/admin/metrics', async () => {
  const metrics = await solutions.getMetrics();
  const documents = await solutions.getAllDocuments();
  return json({
    totalPoints: metrics.totalPoints,
    collectionInfo: metrics.collectionInfo,
    statusCounts: metrics.statusCounts,
    documentsCount: documents.length,
    documents,
  });
});

route('GET', '/admin/documents', async () => {
  const documents = await solutions.getAllDocuments();
  return json({ count: documents.length, documents });
});

route('POST', '/admin/cleanup', async (req) => {
  const query = getQuery(req);
  const olderThanMinutes = parseInt(query.get('olderThanMinutes') || '30');
  const cleaned = await queue.cleanupOldJobs(olderThanMinutes);
  return json({ cleaned, olderThanMinutes });
});

// === Server ===
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  for (const r of routes) {
    if (r.method !== method) continue;
    const match = path.match(r.pattern);
    if (match) {
      try {
        return await r.handler(req, match.groups || {});
      } catch (error) {
        console.error(`Error handling ${method} ${path}:`, error);
        return json({ error: (error as Error).message }, 500);
      }
    }
  }

  return json({ error: 'Not found' }, 404);
}

async function main() {
  console.log('Starting Vector Index Consistency Lab...');

  try {
    await ensureCollection();
    console.log('Qdrant collection ready');

    const recoveryResult = await queue.recoverOnStartup();
    console.log('Startup recovery:', recoveryResult);
  } catch (error) {
    console.error('Failed to initialize:', error);
  }

  Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Solutions: ${solutions.getAvailableSolutions().join(', ')}`);
}

main();
