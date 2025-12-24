# Release Guide

## Mục tiêu
Phát hành phiên bản demo ổn định của Vector Index Consistency Lab với tài liệu đầy đủ, endpoints khớp code, và quy trình setup rõ ràng.

## Chuẩn bị
- Kiểm tra services: `make up` → Qdrant (`http://localhost:6333/dashboard`), Redis (`localhost:6379`).
- Khởi tạo collection: `make setup`.
- Chạy tests:
  - Local: `make test`
  - Podman VM: `make test-podman-vm`
  - Podman host network (Linux): `make test-podman-host`
  - Compose network service: `make test-compose`
- Kiểm tra API cơ bản: `/health`, `/search`, `/documents/:id/reindex`.

## Checklist
- Docs khớp với code (API paths, solutions, queue, recovery).
- README cập nhật Tech Stack (Bun.serve, Redis queue) và endpoints.
- `docs/05-api.md` liệt kê đầy đủ endpoints hiện có trong `src/index.ts`.
- `docs/solutions/*` giữ nguyên tiếng Việt và nhất quán thuật ngữ.
- Makefile chạy thành công: `make up`, `make dev`, `make test`, `make demo-*`.

## Tạo bản phát hành (Markdown)
- Tạo tag: `git tag v0.1.0 && git push --tags`.
- Ghi chú phát hành: tạo `RELEASE_NOTES.md` với:
  - Tổng quan: mục tiêu, điểm nổi bật.
  - Hướng dẫn cài đặt nhanh (`make up`, `make setup`, `make dev`).
  - Endpoints chính (search, reindex, benchmark, recovery, queue, admin).
  - Kết quả test/benchmark mẫu.

## Phát hành trên GitHub
- Tạo GitHub Release `v0.1.0` và đính kèm `RELEASE_NOTES.md`.
- Ảnh chụp Qdrant UI (tuỳ chọn) để minh hoạ.

## Container Image (Podman)
This project ships a Containerfile and Make targets to build and push an OCI image with Podman. Use these steps for a safe, production‑like release.

### Image Coordinates
- Set registry and naming via envs:
  - `REG` (e.g., `docker.io/yourrepo`, `ghcr.io/yourorg`)
  - `IMAGE_NAME` (default `vector-index-consistency-lab`)
  - `IMAGE_TAG` (e.g., `v0.1.0`, `main`, commit SHA)

### Build
- With tests and typecheck (default):
  - `make image-build REG=ghcr.io/yourorg IMAGE_NAME=vector-index-consistency-lab IMAGE_TAG=v0.1.0`
- Skip build‑time tests (airgapped or when services unavailable):
  - `podman build --build-arg SKIP_TESTS=true -t ghcr.io/yourorg/vector-index-consistency-lab:v0.1.0 -f Containerfile .`
- Optional platform targeting (depends on host/Podman setup):
  - amd64: `podman build --platform linux/amd64 -t ghcr.io/yourorg/vector-index-consistency-lab:v0.1.0 -f Containerfile .`
  - arm64: `podman build --platform linux/arm64 -t ghcr.io/yourorg/vector-index-consistency-lab:v0.1.0 -f Containerfile .`

### Push
- Log in to registry: `podman login ghcr.io` (or your `REG`)
- Push image: `make image-push REG=ghcr.io/yourorg IMAGE_NAME=vector-index-consistency-lab IMAGE_TAG=v0.1.0`

### Run (Smoke)
- Start infra: `make up && make setup`
- Run the built image locally:
  - `podman run --rm --net=host -e QDRANT_URL=http://localhost:6333 -e REDIS_URL=redis://localhost:6379 -p 3000:3000 ghcr.io/yourorg/vector-index-consistency-lab:v0.1.0`
- Health: `curl http://localhost:3000/health`

### Compose Network Test
- `make test-compose` runs `bun test` as a service attached to the same network (uses `QDRANT_URL=http://qdrant:6333`, `REDIS_URL=redis://redis:6379`).

### Multi‑Arch (Optional)
- Build separate images per arch, then create/push a manifest list:
  - `podman build --platform linux/amd64 -t $REG/$IMAGE_NAME:${IMAGE_TAG}-amd64 -f Containerfile .`
  - `podman build --platform linux/arm64 -t $REG/$IMAGE_NAME:${IMAGE_TAG}-arm64 -f Containerfile .`
  - `podman manifest create $REG/$IMAGE_NAME:${IMAGE_TAG}`
  - `podman manifest add $REG/$IMAGE_NAME:${IMAGE_TAG} $REG/$IMAGE_NAME:${IMAGE_TAG}-amd64`
  - `podman manifest add $REG/$IMAGE_NAME:${IMAGE_TAG} $REG/$IMAGE_NAME:${IMAGE_TAG}-arm64`
  - `podman manifest push --all $REG/$IMAGE_NAME:${IMAGE_TAG}`

### Tagging Strategy
- Use semver tags (`v0.1.0`), branch tags (`main`), and immutable commit tags (`git rev-parse --short HEAD`).
  - Example: push `v0.1.0`, `main`, and `sha-abc1234` tags for the same build.

## Hỗ trợ người dùng
- Vấn đề thường gặp: services chưa khởi động → chạy `make up` và đợi 3-5s.
- Qdrant collection chưa tồn tại → chạy `make setup` hoặc `/admin/reset`.
- Redis queue lớn → dùng `/admin/cleanup?olderThanMinutes=30`.

## Phiên bản tiếp theo
- Thêm hướng dẫn triển khai container hoá cho server.
- Tuỳ chọn chạy trên Docker thay Podman.
