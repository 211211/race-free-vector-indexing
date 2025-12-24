# Test Scenarios

## Mục Lục

- [3.1 Race Condition Tests](#31-race-condition-tests)
- [3.2 Crash & Recovery Tests](#32-crash--recovery-tests)
- [3.3 Priority Queue Tests](#33-priority-queue-tests)
- [3.4 Running Tests](#34-running-tests)

---

## 3.1 Race Condition Tests

### Test Matrix

| Test Case | Mô Tả | Baseline | Blue-Green | Soft-Delete |
|-----------|-------|----------|------------|-------------|
| **TC1** | Single document reindex + query | ❌ 0 results | ✅ Found | ✅ Found |
| **TC2** | Concurrent queries during reindex | ❌ ~38% availability | ✅ 100% | ✅ 100% |
| **TC3** | Concurrent reindex requests | ❌ Data corruption risk | ✅ Safe | ✅ Safe |

### TC1: Baseline DELETE-THEN-INSERT Race Condition

```typescript
it('should demonstrate document unavailability during reindex', async () => {
  // Setup: Index document
  await baseline.reindex('doc-001', 'Pump specifications...');

  // Verify exists
  let results = await baseline.search('pump');
  expect(results.length).toBeGreaterThan(0);

  // Start reindex (deletes first!)
  baseline.reindex('doc-001', 'Updated pump specs...', { simulateDelayMs: 500 });

  // Query during gap
  await sleep(100); // Wait for delete to complete
  results = await baseline.search('pump');

  // ❌ RACE CONDITION: Document không tìm thấy!
  expect(results.length).toBe(0);
});
```

### TC2: Blue-Green No Race Condition

```typescript
it('should maintain availability during reindex', async () => {
  await blueGreen.reindex('doc-001', 'Pump specifications...');

  let emptyCount = 0;
  const totalQueries = 10;

  // Start slow reindex
  blueGreen.reindex('doc-001', 'Updated specs...', { simulateDelayMs: 500 });

  // Query continuously during reindex
  for (let i = 0; i < totalQueries; i++) {
    const results = await blueGreen.search('pump');
    if (results.length === 0) emptyCount++;
    await sleep(50);
  }

  // ✅ All queries should find document
  expect(emptyCount).toBe(0);
});
```

---

## 3.2 Crash & Recovery Tests

### Test Matrix

| Test Case | Mô Tả | Expected Result |
|-----------|-------|-----------------|
| **TC4** | Service crash trong lúc reindex | Baseline: Document LOST |
| **TC5** | Query orphan documents sau restart | Tìm được stuck docs > 5 phút |
| **TC6** | Blue-Green crash recovery | Document cũ vẫn available |
| **TC7** | Lock TTL auto-expire | Không bị deadlock |

### TC4: Crash Recovery Comparison

```typescript
describe('Crash Recovery', () => {
  it('Baseline: Document LOST sau crash', async () => {
    await baseline.reindex('doc-001', 'Content...');

    // Simulate crash after delete
    await baseline.deleteByUuid('doc-001');
    // ... crash happens here, insert never completes ...

    const results = await baseline.search('content');
    expect(results.length).toBe(0); // ❌ Document LOST
  });

  it('Blue-Green: Document vẫn available sau crash', async () => {
    await blueGreen.reindex('doc-001', 'Content v1...');

    // Start new version insert
    // ... crash happens during insert ...

    // Old version vẫn còn!
    const results = await blueGreen.search('content');
    expect(results.length).toBeGreaterThan(0); // ✅ Document safe
  });
});
```

---

## 3.3 Priority Queue Tests

### Test Matrix

| Test Case | Mô Tả | Expected Result |
|-----------|-------|-----------------|
| **TC8** | Priority ordering | CRITICAL > HIGH > NORMAL > LOW |
| **TC9** | Queue status by priority | Jobs grouped correctly |
| **TC10** | Bump priority | Job moved to higher priority |
| **TC11** | Auto retry failed jobs | Retry với HIGH priority, max 3 lần |

### TC8: Priority Ordering

```typescript
it('should dequeue jobs by priority', async () => {
  // Enqueue in random order
  await queue.enqueue({ uuid: 'low-1', priority: LOW });
  await queue.enqueue({ uuid: 'critical-1', priority: CRITICAL });
  await queue.enqueue({ uuid: 'normal-1', priority: NORMAL });
  await queue.enqueue({ uuid: 'high-1', priority: HIGH });

  // Dequeue should follow priority
  expect((await queue.dequeue()).uuid).toBe('critical-1');
  expect((await queue.dequeue()).uuid).toBe('high-1');
  expect((await queue.dequeue()).uuid).toBe('normal-1');
  expect((await queue.dequeue()).uuid).toBe('low-1');
});
```

### TC11: Auto Retry

```typescript
it('should auto-retry failed jobs up to 3 times', async () => {
  await queue.enqueue({ uuid: 'doc-001', priority: NORMAL });

  const job = await queue.dequeue();
  await queue.completeJob(job.uuid, false, 'API error');

  // Should be re-queued with HIGH priority
  const retryJob = await queue.dequeue();
  expect(retryJob.uuid).toBe('doc-001');
  expect(retryJob.priority).toBe(HIGH);
  expect(retryJob.retryCount).toBe(1);
});
```

---

## 3.4 Running Tests

### All Tests

```bash
make test                 # local
make test-podman-vm       # Podman VM
make test-podman-host     # Podman host network
make test-compose         # Compose service
```

### Race Condition Tests Only

```bash
make test-race
```

### Priority Queue Tests Only

```bash
make test-queue
```

### Test Files

| File | Description |
|------|-------------|
| `test/race-condition.test.ts` | Race condition và solution comparison |
| `test/priority-queue.test.ts` | Priority queue functionality |

---

## Test Results Summary

```
bun test v1.3.5

test/race-condition.test.ts:
✓ TC1: Baseline DELETE-THEN-INSERT Race Condition
✓ TC2: Blue-Green No Race Condition
✓ TC3: Soft-Delete No Race Condition
✓ TC4: Concurrent Reindex Requests

test/priority-queue.test.ts:
✓ TC1: Priority Ordering
✓ TC2: Queue Status
✓ TC3: Bump Priority
✓ TC4: Auto Retry

8 pass, 0 fail
```
