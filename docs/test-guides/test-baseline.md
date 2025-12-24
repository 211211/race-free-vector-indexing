# Test Baseline (DELETE-THEN-INSERT)

Mục tiêu: chứng minh race condition – document biến mất tạm thời trong lúc reindex.

## Bước 1: Chuẩn bị
- Server đang chạy: `make dev`
- Postman biến: `solution = baseline`, `delayMs = 10000`

## Bước 2: Index document lần đầu
```http
POST {{baseUrl}}/documents/demo-baseline-001/reindex?solution=baseline
Content-Type: application/json
{
  "content": "Original pump specifications. Model A100."
}
```

## Bước 3: Bắt đầu reindex chậm (tạo GAP)
```http
POST {{baseUrl}}/documents/demo-baseline-001/reindex?solution=baseline&simulateDelay={{delayMs}}
Content-Type: application/json
{
  "content": "Updated pump specifications. Model B200."
}
```
Ngay sau khi gửi request này, chuyển sang Bước 4.

## Bước 4: Query trong lúc reindex
```http
POST {{baseUrl}}/search?solution=baseline
Content-Type: application/json
{
  "query": "pump demo-baseline-001",
  "limit": 5
}
```
Kỳ vọng: Có thời điểm trả về `count = 0` (document KHÔNG TÌM THẤY) trong khoảng delay.

## Bước 5: Xác nhận sau khi reindex xong
Lặp lại query sau khi hết delay, kết quả sẽ có lại (document xuất hiện).
