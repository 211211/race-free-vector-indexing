# Test Soft-Delete (status filtering)

Mục tiêu: xác nhận không có GAP nhờ `status='active'`, và cleanup sau khi reindex.

## Bước 1: Chuẩn bị
- Server: `make dev`
- Postman biến: `solution = soft-delete`, `delayMs = 10000`

## Bước 2: Index lần đầu
```http
POST {{baseUrl}}/documents/demo-softdelete-001/reindex?solution=soft-delete
Content-Type: application/json
{
  "content": "Original pump specifications. Model A100."
}
```

## Bước 3: Reindex chậm
```http
POST {{baseUrl}}/documents/demo-softdelete-001/reindex?solution=soft-delete&simulateDelay={{delayMs}}
Content-Type: application/json
{
  "content": "Updated pump specifications. Model B200."
}
```

## Bước 4: Query liên tục trong delay
```http
POST {{baseUrl}}/search?solution=soft-delete
Content-Type: application/json
{
  "query": "pump demo-softdelete-001",
  "limit": 5
}
```
Kỳ vọng: Luôn trả về `count > 0` nhờ filter `status='active'`.

## Bước 5: Cleanup (tuỳ chọn)
- Gọi API recovery để tìm inactive chunks và cleanup nếu cần.
