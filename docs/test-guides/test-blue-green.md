# Test Blue-Green (INSERT trước, DELETE sau)

Mục tiêu: xác nhận luôn có kết quả trong lúc reindex (không có GAP).

## Bước 1: Chuẩn bị
- Server: `make dev`
- Postman biến: `solution = blue-green`, `delayMs = 10000`

## Bước 2: Index lần đầu
```http
POST {{baseUrl}}/documents/demo-bluegreen-001/reindex?solution=blue-green
Content-Type: application/json
{
  "content": "Original pump specifications. Model A100."
}
```

## Bước 3: Reindex chậm
```http
POST {{baseUrl}}/documents/demo-bluegreen-001/reindex?solution=blue-green&simulateDelay={{delayMs}}
Content-Type: application/json
{
  "content": "Updated pump specifications. Model B200."
}
```

## Bước 4: Query liên tục trong delay
```http
POST {{baseUrl}}/search?solution=blue-green
Content-Type: application/json
{
  "query": "pump demo-bluegreen-001",
  "limit": 5
}
```
Kỳ vọng: Luôn trả về `count > 0`. Document vẫn xuất hiện vì version cũ còn, version mới đang được thêm.

## Bước 5: Kiểm tra duplication (tuỳ chọn)
- Nếu query trả về nhiều chunks cho cùng `uuid`, thực hiện dedup client-side.
