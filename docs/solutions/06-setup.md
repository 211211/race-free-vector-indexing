# Setup & Configuration

## Cấu Trúc Project

```
vector-index-consistency-lab/
├── Makefile                    # Simplified commands
├── PROPOSAL.md
├── podman-compose.yml
├── Containerfile
├── package.json
├── tsconfig.json
│
├── docs/
│   ├── 01-problem.md
│   ├── 02-solutions.md
│   ├── 03-test-scenarios.md
│   ├── 04-recovery.md
│   ├── 05-api.md
│   └── 06-setup.md
│
├── src/
│   ├── index.ts              # Bun.serve HTTP server
│   ├── types.ts              # Shared types
│   │
│   ├── solutions/
│   │   ├── index.ts          # Solution factory
│   │   ├── baseline.ts       # DELETE-THEN-INSERT (vấn đề)
│   │   ├── blue-green.ts     # Version-based (recommended)
│   │   ├── soft-delete.ts    # Status filtering
│   │   └── locking.ts        # Distributed lock
│   │
│   ├── services/
│   │   ├── qdrant.ts         # Qdrant HTTP client
│   │   ├── redis.ts          # Redis client
│   │   ├── embedding.ts      # Mock embeddings
│   │   ├── recovery.ts       # Stuck doc recovery
│   │   └── priority-queue.ts # Job queue
│   │
│   └── benchmark/
│       └── runner.ts
│
├── test/
│   ├── race-condition.test.ts
│   └── priority-queue.test.ts
│
├── scripts/
│   └── setup.ts
│
└── postman/
    └── vector-lab.postman_collection.json
```

---

## Podman Compose

```yaml
# podman-compose.yml (tóm tắt)
version: '3.8'

services:
  qdrant:
    image: docker.io/qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage:Z

  redis:
    image: docker.io/redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data:Z
    command: redis-server --appendonly yes

  # Test runner chạy trên cùng network
  app-test:
    image: docker.io/oven/bun:1.1
    depends_on: [qdrant, redis]
    working_dir: /app
    environment:
      - QDRANT_URL=http://qdrant:6333
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./:/app:Z
    command: ["bun", "test"]

volumes:
  qdrant_data:
  redis_data:
```

---

## Package.json

```json
{
  "name": "vector-index-consistency-lab",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test",
    "test:race": "bun test test/race-condition.test.ts",
    "test:queue": "bun test test/priority-queue.test.ts",
    "setup": "bun run scripts/setup.ts",
    "benchmark": "bun run src/benchmark/runner.ts"
  },
  "dependencies": {
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

---

## Makefile

```makefile
# Infrastructure
make up        # Start Qdrant + Redis
make down      # Stop containers
make clean     # Remove containers + volumes
make fresh     # Complete reset: clean + up + setup (start over)

# Development
make install   # Install Bun dependencies
make dev       # Run với hot reload
make setup     # Setup Qdrant collection
make reset     # Reset collection (keep containers)

# Testing
make test      # Run all tests
make test-race # Run race condition tests
make benchmark # Compare all solutions
make test-podman-host # Podman test (host network)
make test-podman-vm   # Podman test (VM)
make test-compose     # Podman compose service test

# Image (Podman)
make image-build                  # Build image từ Containerfile
REG=ghcr.io/yourorg make image-push  # Push image lên registry

# Demo
make demo-race        # Demo baseline race condition
make demo-blue-green  # Demo blue-green (no race)
```

---

## Quick Start

```bash
# 1. Khởi động infrastructure
make up

# 2. Install dependencies
make install

# 3. Setup Qdrant collection
make setup

# 4. Dev mode
make dev

# 5. Chạy tests
make test                 # local
make test-podman-vm       # Podman VM
make test-podman-host     # Podman host network
make test-compose         # Compose service

# 6. Demo race condition
make demo-race
```

---

## Tech Stack

| Component | Technology | Lý do |
|-----------|------------|-------|
| **Runtime** | Bun | Nhanh, TypeScript native, ít dependencies |
| **Vector Database** | Qdrant | Open-source, dễ setup |
| **Cache/Lock** | Redis | Distributed locking, priority queue |
| **Testing** | Bun Test | Built-in, nhanh |
| **API Testing** | Postman Collection | Manual testing |
| **Containerization** | Podman Compose | Rootless containers |
| **Build Tool** | Makefile | Đơn giản hóa commands |

---

## Requirements

- **Bun** >= 1.0 ([Install Bun](https://bun.sh))
- **Podman**
- **podman-compose**

### Install Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via scoop)
scoop install bun
```

---

## Files Summary

```
src/
├── index.ts                    # Bun HTTP server (~200 lines)
├── types.ts                    # Types (~80 lines)
├── solutions/
│   ├── index.ts                # Factory (~40 lines)
│   ├── baseline.ts             # ~60 lines
│   ├── blue-green.ts           # ~80 lines
│   ├── soft-delete.ts          # ~60 lines
│   └── locking.ts              # ~90 lines
├── services/
│   ├── qdrant.ts               # ~150 lines
│   ├── redis.ts                # ~10 lines
│   ├── embedding.ts            # ~50 lines
│   ├── recovery.ts             # ~80 lines
│   └── priority-queue.ts       # ~150 lines
└── benchmark/
    └── runner.ts               # ~100 lines

test/
├── race-condition.test.ts      # ~100 lines
└── priority-queue.test.ts      # ~100 lines

Tổng: ~1200 dòng code
```
