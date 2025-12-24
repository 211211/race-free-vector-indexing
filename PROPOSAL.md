# Vector Index Consistency Lab

## Proposal: Giải Quyết Race Condition Trong Vector Search Systems

---

## Mục Tiêu

Repository này là một **laboratory environment** để:

1. **Demonstrate** race condition xảy ra khi reindex documents trong RAG/Vector Search systems
2. **Implement & Compare** 4 giải pháp khác nhau
3. **Benchmark** performance và trade-offs
4. **Cung cấp Postman Collection** để test thủ công
5. **Recovery System** để xử lý service crash và orphan documents

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

## Documentation

| Document | Nội dung |
|----------|----------|
| [01-problem.md](docs/01-problem.md) | Vấn đề race condition, DELETE-THEN-INSERT pattern |
| [02-solutions.md](docs/02-solutions.md) | 4 solutions: Blue-Green, Soft-Delete, Locking |
| [03-test-scenarios.md](docs/03-test-scenarios.md) | Test cases, test code examples |
| [04-recovery.md](docs/04-recovery.md) | Service recovery, priority queue |
| [05-api.md](docs/05-api.md) | HTTP API endpoints |
| [06-setup.md](docs/06-setup.md) | Project structure, Podman Compose |

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
make test

# 6. Demo race condition
make demo-race

# 7. Demo blue-green (no race)
make demo-blue-green
```

---

## Makefile Commands

```bash
make help          # Xem tất cả commands

# Infrastructure
make up            # Start Qdrant + Redis
make down          # Stop containers
make clean         # Remove containers + volumes

# Development
make dev           # Run với hot reload
make setup         # Setup Qdrant collection
make reset         # Reset collection

# Testing
make test          # Run all tests
make test-race     # Run race condition tests
make benchmark     # Compare all solutions

# Demo
make demo-race        # Demo baseline race condition
make demo-blue-green  # Demo blue-green (no race)
```

---

## Solutions Comparison

| Solution | Availability | Crash Recovery | Recommendation |
|----------|-------------|----------------|----------------|
| Baseline (DELETE-THEN-INSERT) | ~45% | ❌ Document LOST | ❌ Tránh sử dụng |
| Blue-Green | ~99% | ✅ Document vẫn còn | ✅ **Recommended** |
| Soft-Delete | ~99% | ✅ Document vẫn còn | ✅ Nếu cần audit |
| Locking | ~90% | ⚠️ Lock có thể stuck | ⚠️ Tăng complexity |

---

## Test Scenarios

### Race Condition Tests
- Single/Multi document reindex
- Concurrent queries during reindex
- Large documents

### Recovery Tests
- Service crash handling
- Orphan document detection
- Lock TTL expiration

### Priority Queue Tests
- Priority ordering (CRITICAL > HIGH > NORMAL > LOW)
- Startup recovery
- Auto-retry failed jobs

---

## Project Structure

```
vector-index-consistency-lab/
├── Makefile                    # Simplified commands
├── podman-compose.yml          # Qdrant + Redis
├── package.json                # Bun dependencies
├── tsconfig.json
│
├── docs/                       # Documentation
│   ├── 01-problem.md
│   ├── 02-solutions.md
│   ├── 03-test-scenarios.md
│   ├── 04-recovery.md
│   ├── 05-api.md
│   └── 06-setup.md
│
├── src/
│   ├── index.ts                # Bun.serve HTTP server
│   ├── types.ts
│   ├── solutions/
│   │   ├── index.ts
│   │   ├── baseline.ts         # DELETE-THEN-INSERT (có race condition)
│   │   ├── blue-green.ts       # Version-based (recommended)
│   │   ├── soft-delete.ts      # Status filtering
│   │   └── locking.ts          # Distributed lock
│   ├── services/
│   │   ├── qdrant.ts           # Qdrant HTTP client
│   │   ├── redis.ts
│   │   ├── embedding.ts        # Mock embeddings
│   │   ├── recovery.ts
│   │   └── priority-queue.ts
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

## Requirements

- **Bun** >= 1.0
- **Podman**
- **podman-compose**
