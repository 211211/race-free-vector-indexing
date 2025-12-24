# Recovery & Priority Queue

## Mục Lục

- [4.1 Service Recovery](#41-service-recovery)
- [4.2 Recovery Functions](#42-recovery-functions)
- [4.3 Priority Queue](#43-priority-queue)
- [4.4 Startup Recovery Flow](#44-startup-recovery-flow)

---

## 4.1 Service Recovery

### Vấn đề cần giải quyết

Khi service crash trong lúc reindex:
1. **Orphan documents**: Documents bị stuck trong trạng thái "đang reindex"
2. **Stuck locks**: Redis locks không được release
3. **Incomplete versions**: Blue-Green có nhiều versions tồn tại

### Recovery Strategies

| Issue | Detection | Action |
|-------|-----------|--------|
| Orphan documents | `reindex:in_progress` > 5 phút | Queue với CRITICAL priority |
| Stuck locks | Lock age > 10 phút | Force release |
| Incomplete versions | Multiple versions exist | Cleanup old versions |

---

## 4.2 Recovery Functions

### Get Stuck Documents

```typescript
// Tìm documents đang bị stuck/orphan
const stuckDocs = await recovery.getStuckDocuments(thresholdMinutes);

// Response
{
  count: 3,
  documents: [
    {
      uuid: "doc-001",
      documentNumber: "DOC-2024-001",
      startedAt: 1702900000000,
      stuckDurationMs: 360000,
      stuckDurationMinutes: 6
    }
  ]
}
```

### Get Stuck Locks

```typescript
// Tìm locks bị stuck (cho Locking solution)
const stuckLocks = await recovery.getStuckLocks(thresholdMinutes);

// Response
{
  count: 1,
  locks: [
    {
      documentId: "doc-002",
      lockedAt: 1702900000000,
      lockDurationMinutes: 15,
      ttlSeconds: 180
    }
  ]
}
```

### Get Incomplete Blue-Green

```typescript
// Tìm documents có nhiều versions (incomplete Blue-Green)
const incomplete = await recovery.getIncompleteBlueGreen();

// Response
{
  count: 2,
  documents: [
    {
      uuid: "doc-003",
      versions: [1702900000000, 1702900100000],
      versionCount: 2
    }
  ]
}
```

### Cleanup Actions

```typescript
// Clear stuck status
await recovery.cleanupStuckDocument(uuid, 'clear_status');

// Force delete document
await recovery.cleanupStuckDocument(uuid, 'force_delete');

// Force release lock
await recovery.forceReleaseLock(documentId);
```

---

## 4.3 Priority Queue

### Priority Levels

| Priority | Value | Use Case |
|----------|-------|----------|
| **CRITICAL** | 1 | Orphan documents sau crash |
| **HIGH** | 2 | Retry failed jobs, interrupted jobs |
| **NORMAL** | 3 | User requests, normal reindex |
| **LOW** | 4 | Background/scheduled reindex |

### Queue Operations

#### Enqueue

```typescript
await queue.enqueueReindex({
  uuid: 'doc-001',
  documentNumber: 'DOC-2024-001',
  priority: ReindexPriority.NORMAL,
  reason: 'User request',
  createdAt: Date.now()
});
```

#### Dequeue (by priority)

```typescript
const job = await queue.dequeueReindex();
// Returns highest priority job first
```

#### Get Queue Status

```typescript
const status = await queue.getQueueStatus();

// Response
{
  totalJobs: 10,
  byPriority: {
    critical: [...],
    high: [...],
    normal: [...],
    low: [...]
  },
  jobs: [...]
}
```

#### Bump Priority

```typescript
// Move job to higher priority (e.g., VIP customer request)
await queue.bumpPriority('doc-001', ReindexPriority.HIGH);
```

### Auto Retry

Failed jobs automatically retry up to 3 times:

```typescript
await queue.completeJob(uuid, false, 'API error');
// Job re-queued with HIGH priority, retryCount++
```

---

## 4.4 Startup Recovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE RESTART FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Service Start                                                │
│     │                                                            │
│     ▼                                                            │
│  2. recoverOnStartup()                                           │
│     ├── Tìm orphan documents (stuck > 5 min)                    │
│     │   └── Queue với CRITICAL priority                         │
│     ├── Tìm interrupted jobs                                     │
│     │   └── Queue với HIGH priority                             │
│     └── Release stuck locks                                      │
│     │                                                            │
│     ▼                                                            │
│  3. Process Queue                                                │
│     ├── [1] CRITICAL: Orphan recovery                           │
│     ├── [2] HIGH: Interrupted jobs, retries                     │
│     ├── [3] NORMAL: User requests                               │
│     └── [4] LOW: Scheduled/Background                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Startup Recovery Code

```typescript
const recovered = await queue.recoverOnStartup();

// Response
{
  orphanDocuments: 3,    // Documents queued as CRITICAL
  interruptedJobs: 1,    // Jobs queued as HIGH
  stuckLocks: 2          // Locks released
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/recovery/stuck-documents` | GET | List stuck documents |
| `/recovery/stuck-locks` | GET | List stuck locks |
| `/recovery/incomplete-versions` | GET | List incomplete Blue-Green |
| `/recovery/cleanup` | POST | Cleanup stuck document |
| `/recovery/release-lock` | POST | Force release lock |
| `/recovery/startup` | POST | Trigger startup recovery |
| `/queue/status` | GET | Queue status |
| `/queue/enqueue` | POST | Add job to queue |
| `/queue/bump-priority` | POST | Change job priority |
| `/queue/position/:uuid` | GET | Get job position |
| `/queue/process-next` | POST | Process next job |

---

## Source Code

- [src/services/recovery.ts](../src/services/recovery.ts)
- [src/services/priority-queue.ts](../src/services/priority-queue.ts)
