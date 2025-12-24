# Phân Tích Race Condition: Reindexing vs User Query

## Tổng Quan

Báo cáo này phân tích race condition khi một tiến trình nền reindex vector cho tài liệu trong lúc người dùng đang truy vấn. Môi trường mô phỏng trong repository này sử dụng Bun/TypeScript, Qdrant (vector database), và Redis.

---

## 1. Kiến Trúc Hệ Thống

### 1.1 Background Reindexer (Indexing Side)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BACKGROUND REINDEXER                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Trigger reindex (HTTP / job / schedule)                                       │
│        │                                                                        │
│        ▼                                                                        │
│  1) Xóa/ẩn phiên bản cũ (tùy giải pháp)                                        │
│  2) Tạo chunks + embeddings cho phiên bản mới                                   │
│  3) Upsert vào Qdrant                                                           │
│  4) Cập nhật version/trạng thái/metadata (Redis + payload)                      │
│  5) Thu dọn phiên bản cũ (nếu cần)                                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Query Service (Query Side)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  QUERY SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1) Nhận user query                                                             │
│  2) Sinh embedding cho query                                                    │
│  3) Search trong Qdrant (có/không có filter theo solution)                      │
│  4) Tổng hợp kết quả → trả lời                                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi Tiết Quy Trình Reindexing (Trong Repo Hiện Tại)

### 2.1 Baseline DELETE‑THEN‑INSERT (có GAP)

```ts
// src/solutions/baseline.ts
// ⚠️ Xóa trước, chèn sau → có khoảng trống (GAP) tài liệu biến mất
async function reindex(uuid: string, content: string) {
  // Step 1: DELETE tất cả chunks hiện tại
  await repo.deleteByUuid(uuid);

  // (tài liệu tạm thời không tồn tại trong index)

  // Step 2: Tạo chunks + embeddings mới và INSERT
  const chunks = buildChunks(content);
  await repo.upsertChunks(chunks);
}
```

### 2.2 Delete/Upsert trong Qdrant

```ts
// src/services/qdrant.ts
export async function deleteByUuid(uuid: string): Promise<void> {
  await deleteByFilter({ must: [{ key: 'uuid', match: { value: uuid } }] });
}

export async function upsertChunks(chunks: Array<{ id: string; vector: number[]; payload: ChunkPayload }>) {
  await qdrantFetch(`/collections/chunks/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({ points: chunks.map(c => ({ id: c.id, vector: c.vector, payload: c.payload })) }),
  });
}
```

---

## 3. Race Condition Timeline

### 3.1 Scenario: User Query During Reindex

```
Timeline (milliseconds)
────────────────────────────────────────────────────────────────────────────────

T0    │ [REINDEXER] Bắt đầu reindex tài liệu UUID: "doc-123"
      │
T100  │ [USER] Gửi query: "Tìm thông tin về pump specifications"
      │
T200  │ [REINDEXER] ⚠️ DELETE tất cả chunks của "doc-123" khỏi Qdrant
      │           → Chunks biến mất khỏi index!
      │
T250  │ [QUERY] Search trong Qdrant
      │           → ❌ KHÔNG TÌM THẤY chunks của "doc-123"!
      │
T300  │ [REINDEXER] Đang tạo chunks/embeddings mới...
      │
T450  │ [USER] Nhận câu trả lời (INCOMPLETE!)
      │
T500  │ [REINDEXER] INSERT chunks mới vào Qdrant
      │
T600  │ [REINDEXER] ✅ Reindex hoàn thành
      │           → Chunks mới đã available

────────────────────────────────────────────────────────────────────────────────
       ◀─────────── GAP PERIOD: ~300ms ───────────▶
         (Document không tồn tại trong index)
```

### 3.2 Các Scenario Race Condition

| Scenario | User Query Time | Kết Quả |
|----------|-----------------|---------|
| A | Trước T200 (trước DELETE) | Lấy được OLD chunks |
| B | T200–T500 (trong GAP) | KHÔNG tìm thấy document |
| C | Sau T500 (sau INSERT) | Lấy được NEW chunks |

---

## 4. Phân Tích Tác Động

### 4.1 Tác Động Đến User Experience

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        TÁC ĐỘNG KHI USER QUERY TRONG GAP PERIOD               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. MISSING DATA                                                              │
│     ├── Document đang reindex không xuất hiện trong search results            │
│     ├── Câu trả lời có thể thiếu context quan trọng                           │
│     └── Có thể nhận "No relevant documents found"                              │
│                                                                               │
│  2. INCONSISTENT RESULTS                                                      │
│     ├── Query lúc T190: Trả về OLD content                                    │
│     ├── Query lúc T250: Trả về NOTHING                                        │
│     └── Query lúc T550: Trả về NEW content                                    │
│                                                                               │
│  3. CITATION / TRACEABILITY                                                   │
│     ├── Citation có thể trỏ đến chunks vừa bị xóa                             │
│     └── Page/chunk index thay đổi giữa old/new                                │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Thời Gian GAP Ước Tính

| Document Size | Estimated GAP Duration |
|---------------|------------------------|
| Small (< 10 pages) | 500ms – 2s |
| Medium (10–50 pages) | 2 – 10s |
| Large (50–200 pages) | 10 – 60s |
| Very Large (> 200 pages) | 1 – 5 phút |

Các yếu tố ảnh hưởng:
- Số lượng chunks cần delete/insert
- Độ trễ indexing của vector DB (Qdrant)
- Thời gian sinh embeddings
- Network latency

---

## 5. Code Analysis: Điểm Yếu (Baseline)

### 5.1 DELETE‑THEN‑INSERT tạo GAP

```ts
// src/solutions/baseline.ts
// ⚠️ PROBLEM: Delete trước, insert sau = GAP PERIOD
await repo.deleteByUuid(uuid);
// (tài liệu biến mất)
// ... time passes while processing ...
await repo.upsertChunks(chunks);
```

### 5.2 Query không có nhận thức về reindex

```ts
// src/solutions/baseline.ts (search)
// Truy vấn trực tiếp, không filter theo version/status ⇒ có thể gặp GAP
return repo.search(vector, { limit: 10 });
```

---

## 6. So Sánh Các Giải Pháp (Đã Code Trong Repo)

### 6.1 Solution 1: Blue‑Green Indexing

| Aspect | Baseline | Blue‑Green |
|--------|----------|------------|
| GAP Period | 0.5s – vài phút | 0ms |
| Old chunks accessible | Bị xóa ngay | Giữ đến khi new ready |
| Rollback | Không | Có |

Áp dụng trong repo:
```ts
// src/solutions/blue-green.ts
// 1) INSERT version mới (status=active, payload.version=newVersion)
// 2) Update pointer version hiện tại (Redis key `version:<uuid>`)
// 3) DELETE phiên bản cũ sau khi chuyển hướng thành công
await repo.upsertChunks(newVersionChunks);
await setCurrentVersion(uuid, newVersion);
await repo.deleteByUuidAndVersion(uuid, oldVersion);
```

### 6.2 Solution 2: Soft Delete + Filtering

| Aspect | Baseline | Soft Delete |
|--------|----------|-------------|
| GAP Period | 0.5s – phút | 0ms |
| Audit trail | Không | Có |
| Storage | thấp | +20–50% |

Áp dụng trong repo:
```ts
// src/solutions/soft-delete.ts
// 1) INSERT chunks mới với status='active'
// 2) MARK inactive các chunks cũ (trước thời điểm reindexStart)
// 3) Search filter theo status='active'
await repo.markInactiveOlderThan(uuid, reindexStart);
return repo.search(vector, { filter: { must: [{ key: 'status', match: { value: 'active' } }] } });
```

### 6.3 Solution 3: Distributed Locking

| Aspect | Baseline | Locking |
|--------|----------|---------|
| GAP Period | 0.5s – phút | 0ms (thường) |
| Complexity | Thấp | Trung bình |
| Performance | Tốt | Overhead lock |

Áp dụng trong repo:
```ts
// src/solutions/locking.ts
// Dùng Redis lock để ngăn concurrent reindex
const locked = await waitForLock(uuid);
await repo.deleteByUuid(uuid);
await repo.upsertChunks(chunks);
```

### 6.4 Solution 4: Eventual Consistency (Tài liệu hóa)

| Aspect | Baseline | Eventual |
|--------|----------|----------|
| GAP Period | 0.5s – phút | 0.5s – phút (được thông báo) |
| Implementation | – | Tối thiểu |
| User awareness | – | Có |

Cách áp dụng:
- Ghi rõ timing, trạng thái reindex trong API/UI
- Thêm indicator cảnh báo dữ liệu có thể tạm thời thiếu

---

## 7. Khuyến Nghị

### 7.1 Ngắn Hạn (Quick Wins)

- Giảm GAP: batch upsert, chuẩn bị embeddings trước
- Thêm monitoring: log reindex, theo dõi truy vấn lỗi do thiếu tài liệu

### 7.2 Trung Hạn (Nên Làm)

- Ưu tiên Blue‑Green hoặc Soft Delete trong môi trường có SLA
- Chuẩn hóa payload: `status`, `version`, `createdAt` để lọc/thu dọn

### 7.3 Dài Hạn (Best Practice)

- Alias/Version routing rõ ràng (pointer version qua Redis)
- Chính sách thu dọn phiên bản cũ theo thời gian hoặc số phiên bản
- Retry/hedging khi không tìm thấy tài liệu trong cửa sổ ngắn

---

## 8. Kết Luận

Hiện trạng baseline (DELETE‑THEN‑INSERT) tạo khoảng trống khiến tài liệu biến mất tạm thời,
dẫn đến kết quả truy vấn thiếu. Các giải pháp trong repo (Blue‑Green, Soft Delete, Locking)
loại bỏ hoặc giảm thiểu rủi ro này với các trade‑off về latency và chi phí lưu trữ.

---

## 9. Appendix: File References

| File | Purpose |
|------|---------|
| `src/solutions/baseline.ts` | Mô phỏng DELETE‑THEN‑INSERT (có GAP) |
| `src/solutions/blue-green.ts` | Versioned upsert + switch + delete old |
| `src/solutions/soft-delete.ts` | Mark inactive + search filter active |
| `src/solutions/locking.ts` | Redis‑based distributed lock |
| `src/services/qdrant.ts` | Qdrant search/upsert/delete/markInactive |
| `test/race-condition.test.ts` | Kiểm thử GAP và tính sẵn sàng |

