# Test Locking (Distributed Lock)

Mục tiêu: xác nhận không có concurrent reindex cho cùng một document nhờ khoá Redis.

## Bước 1: Chuẩn bị
- Server: `make dev`
- Postman biến: `solution = locking`, `delayMs = 10000`

## Bước 2: Index lần đầu
```http
POST {{baseUrl}}/documents/demo-locking-001/reindex?solution=locking
Content-Type: application/json
{
  "content": "Original pump specifications. Model A100."
}
```

## Bước 3: Bắt đầu reindex chậm (khoá đang giữ)
```http
POST {{baseUrl}}/documents/demo-locking-001/reindex?solution=locking&simulateDelay={{delayMs}}
Content-Type: application/json
{
  "content": "Updated pump specifications. Model B200."
}
```

## Bước 4: Thử reindex concurrent
Gửi lại một request reindex khác cho cùng `uuid` trong lúc delay, kỳ vọng server trả về lỗi `Failed to acquire lock...`.

## Bước 5: Query
```http
POST {{baseUrl}}/search?solution=locking
Content-Type: application/json
{
  "query": "pump demo-locking-001",
  "limit": 5
}
```
Kỳ vọng: Vẫn có kết quả (tuỳ thuộc vào thời điểm delete/insert), nhưng không có concurrent reindex.
