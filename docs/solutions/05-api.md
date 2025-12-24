# API Reference

> Server: Bun native HTTP server at `http://localhost:3000`

## Mục Lục

- [5.1 Basic Operations](#51-basic-operations)
- [5.2 Benchmark](#52-benchmark)
- [5.3 Pipeline Simulation](#53-pipeline-simulation)
- [5.4 Recovery & Diagnostics](#54-recovery--diagnostics)
- [5.5 Priority Queue](#55-priority-queue)
- [5.6 Admin](#56-admin)

---

## 5.1 Basic Operations

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-18T17:00:00.000Z"
}
```

### Reindex Document

```http
POST /documents/:id/reindex?solution=blue-green
Content-Type: application/json

{
  "content": "Document content to index..."
}
```

Query params:
| Param | Default | Description |
|-------|---------|-------------|
| `solution` | `blue-green` | `baseline`, `blue-green`, `soft-delete`, `locking` |
| `simulateDelay` | `0` | Delay in ms (for testing race conditions) |

Response:
```json
{
  "status": "reindex_complete",
  "documentId": "doc-001",
  "solution": "blue-green"
}
```

### Search

```http
POST /search?solution=blue-green
Content-Type: application/json

{
  "query": "pump specifications",
  "limit": 10
}
```

Response:
```json
{
  "results": [
    {
      "id": "abc-123",
      "score": 0.95,
      "payload": {
        "uuid": "doc-001",
        "content": "Pump specifications...",
        "status": "active"
      }
    }
  ],
  "count": 1,
  "solution": "blue-green"
}
```

### Get Document Chunks

```http
GET /documents/:id/chunks
```

Response:
```json
{
  "documentId": "doc-001",
  "chunks": [...],
  "count": 5
}
```

---

## 5.2 Benchmark

### Single Solution Benchmark

```http
POST /benchmark/single?solution=baseline
Content-Type: application/json

{
  "documentId": "bench-001",
  "queryIntervalMs": 50,
  "reindexDelayMs": 1000
}
```

Response:
```json
{
  "solution": "baseline",
  "totalQueries": 20,
  "emptyResults": 12,
  "availability": 40,
  "avgLatencyMs": 5.2
}
```

### Compare All Solutions

```http
POST /benchmark/compare
Content-Type: application/json

{
  "solutions": ["baseline", "blue-green", "soft-delete", "locking"],
  "iterations": 3,
  "queryIntervalMs": 30
}
```

Response:
```json
{
  "summary": {
    "baseline": { "avgAvailability": 37.5, "avgLatency": 5.29 },
    "blue-green": { "avgAvailability": 100, "avgLatency": 15.94 },
    "soft-delete": { "avgAvailability": 100, "avgLatency": 38.31 },
    "locking": { "avgAvailability": 75, "avgLatency": 41.03 }
  },
  "details": [...]
}
```

### Race Condition Demo

```http
POST /benchmark/race-demo
Content-Type: application/json

{
  "documentId": "race-demo-001",
  "reindexDelayMs": 500
}
```

---

## 5.3 Pipeline Simulation

### Simulate Worker Reindex

```http
POST /simulate/worker-reindex
Content-Type: application/json

{
  "uuid": "pump-manual-001",
  "documentNumber": "PUMP-2024-001",
  "content": "Pump specifications...",
  "simulateProcessingTime": true
}
```

Response:
```json
{
  "uuid": "pump-manual-001",
  "timeline": [
    { "time": 0, "event": "start" },
    { "time": 50, "event": "deleted_chunks" },
    { "time": 250, "event": "split_complete" },
    { "time": 550, "event": "embeddings_complete" },
    { "time": 600, "event": "ingest_complete" }
  ],
  "gapPeriodMs": 550
}
```

### Simulate User Query

```http
POST /simulate/user-query
Content-Type: application/json

{
  "query": "pump specifications",
  "documentNumbers": ["PUMP-2024-001"]
}
```

### Simulate Batch Reindex

```http
POST /simulate/batch-reindex
Content-Type: application/json

{
  "documents": [
    { "uuid": "doc-001", "content": "..." },
    { "uuid": "doc-002", "content": "..." }
  ],
  "concurrent": true
}
```

---

## 5.4 Recovery & Diagnostics

### Get Stuck Documents

```http
GET /recovery/stuck-documents?thresholdMinutes=5
```

### Get Stuck Locks

```http
GET /recovery/stuck-locks?thresholdMinutes=10
```

### Get Incomplete Blue-Green

```http
GET /recovery/incomplete-versions
```

### Cleanup Stuck Document

```http
POST /recovery/cleanup
Content-Type: application/json

{
  "uuid": "orphan-doc-001",
  "action": "clear_status"
}
```

Actions: `clear_status`, `force_delete`

### Force Release Lock

```http
POST /recovery/release-lock
Content-Type: application/json

{
  "documentId": "locked-doc-001"
}
```

### Trigger Startup Recovery

```http
POST /recovery/startup
```

---

## 5.5 Priority Queue

### Get Queue Status

```http
GET /queue/status
```

Response:
```json
{
  "totalJobs": 10,
  "byPriority": {
    "critical": [...],
    "high": [...],
    "normal": [...],
    "low": [...]
  },
  "jobs": [...]
}
```

### Enqueue Reindex Job

```http
POST /queue/enqueue
Content-Type: application/json

{
  "uuid": "new-doc-001",
  "documentNumber": "DOC-2024-001",
  "priority": 3,
  "reason": "User request"
}
```

Priority values: `1=CRITICAL`, `2=HIGH`, `3=NORMAL`, `4=LOW`

### Bump Priority

```http
POST /queue/bump-priority
Content-Type: application/json

{
  "uuid": "doc-001",
  "newPriority": 1
}
```

### Get Job Position

```http
GET /queue/position/:uuid
```

### Process Next Job (Manual)

```http
POST /queue/process-next
```

---

## 5.6 Admin

### Reset Collection

```http
POST /admin/reset
```

### Get Metrics

```http
GET /admin/metrics
```

### List All Documents

```http
GET /admin/documents
```

### Cleanup Old Jobs

```http
POST /admin/cleanup?olderThanMinutes=30
```

Xóa các job `completed`/`failed` cũ khỏi Redis dựa theo `olderThanMinutes`.

---

## Error Handling

All endpoints return JSON errors:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200` - Success
- `404` - Not found
- `500` - Internal server error
