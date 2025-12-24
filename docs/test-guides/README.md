# Hướng Dẫn Test Solutions

Mục tiêu: cung cấp các bước test thủ công cho từng solution (Baseline, Blue-Green, Soft-Delete, Locking) bằng Postman hoặc cURL.

## Chuẩn Bị
- Khởi động services: `make up`
- Tạo collection và indexes: `make setup`
- Chạy server: `make dev` (mặc định chạy ở `http://localhost:3000`)
- Chạy tests (tuỳ môi trường):
  - Local: `make test`
  - Podman VM: `make test-podman-vm`
  - Podman host network (Linux): `make test-podman-host`
  - Compose service: `make test-compose`
- Postman: sử dụng collection `postman/vector-lab.postman_collection.json`
- Biến Postman gợi ý:
  - `baseUrl = http://localhost:3000`
  - `solution = baseline | blue-green | soft-delete | locking`
  - `delayMs = 10000` (tăng delay để quan sát race condition)

## Files
- `test-baseline.md`: Test DELETE-THEN-INSERT (có GAP)
- `test-blue-green.md`: Test không có GAP, version mới trước, xoá version cũ sau
- `test-soft-delete.md`: Test status filtering, luôn có kết quả, cleanup sau
- `test-locking.md`: Test khoá phân tán, tránh concurrent reindex

Khuyến nghị: chạy `make test-race` để xem kết quả tự động, sau đó làm theo các bước thủ công để quan sát trên Postman.
