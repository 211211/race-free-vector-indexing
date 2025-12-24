# Vấn Đề: Race Condition Khi Reindex

## DELETE-THEN-INSERT Pattern (Vấn đề phổ biến)

Hầu hết các RAG pipelines sử dụng pattern này khi cần reindex document:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    REINDEX FLOW (DELETE-THEN-INSERT)                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Background Worker / Pipeline]                                                  │
│                                                                                  │
│  Step 1: Nhận request reindex document                                          │
│          ↓                                                                       │
│  Step 2: ⚠️ DELETE tất cả chunks của document                                   │
│          │                                                                       │
│          │    ┌─────────────────────────────────────┐                           │
│          │    │  VECTOR DB: document chunks = 0     │                           │
│          │    │  ⚠️ DOCUMENT INVISIBLE TO SEARCH!   │                           │
│          │    └─────────────────────────────────────┘                           │
│          │                                                                       │
│  Step 3: │ Split document thành chunks mới                                      │
│          │ (Mất thời gian xử lý)                                                │
│          │                                                                       │
│  Step 4: │ Generate embeddings                                                  │
│          │ (Gọi Embedding API - mất thời gian)                                  │
│          │                                                                       │
│  Step 5: ↓ UPLOAD chunks mới                                                    │
│                                                                                  │
│          ◀──────── GAP: 500ms → vài phút ────────▶                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Race Condition Timeline

```
Timeline
────────────────────────────────────────────────────────────────────────────

T0      [WORKER] Bắt đầu reindex document "pump-manual-001"
        │
T100    │ [WORKER] DELETE all chunks of document
        │          → Chunks biến mất khỏi vector DB!
        │
T150    │ [USER] Query: "pump specifications"
        │        → Search trong vector DB
        │        → ❌ KHÔNG TÌM THẤY document!
        │
T200    │ [WORKER] Splitting document into chunks...
        │
T500    │ [WORKER] Generating embeddings...
        │
T800    │ [USER] Nhận câu trả lời THIẾU thông tin!
        │
T1000   │ [WORKER] INSERT new chunks
        │          → Document xuất hiện lại
        │
T1100   ▼ [WORKER] Reindex complete

────────────────────────────────────────────────────────────────────────────
```

## Code Pattern Gây Vấn Đề

```typescript
// ⚠️ DELETE-THEN-INSERT pattern - PHỔ BIẾN nhưng có vấn đề

async function reindexDocument(documentId: string, content: string) {
  // Step 1: DELETE trước (document biến mất!)
  await vectorDB.deleteByDocumentId(documentId);

  // Step 2: Xử lý (mất thời gian)
  const chunks = await splitIntoChunks(content);
  const embeddings = await generateEmbeddings(chunks);

  // Step 3: INSERT sau (document xuất hiện lại)
  await vectorDB.upsert(chunks, embeddings);
}
```

**Vấn đề**: Trong khoảng thời gian giữa DELETE và INSERT, document hoàn toàn invisible với search queries.
