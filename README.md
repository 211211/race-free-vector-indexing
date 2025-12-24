# Race‑Free Vector Indexing

Blueprints to prevent stale reads and downtime during vector reindexing under concurrent load. Demonstrates, tests, and benchmarks practical strategies to make vector search consistent.

## Why It Matters

The common DELETE‑THEN‑INSERT pattern creates a window where documents disappear:

```
T0   [INDEXER] start reindex "DOC-001"
T100 [INDEXER] DELETE all chunks     <-- document is GONE
T200 [USER]    query "pump specs"    <-- NOT FOUND
T500 [INDEXER] INSERT new chunks     <-- document RETURNS

     |<-------- GAP: 400ms to minutes -------->|
```

This lab shows the race condition, provides four solutions with real code, and measures trade‑offs with automated tests and benchmarks.

## Implemented Solutions

| Solution | Availability | Avg Latency | Storage Overhead |
|----------|--------------|-------------|------------------|
| Baseline (DELETE‑THEN‑INSERT) | ~38% | ~5‑7ms | none |
| Blue‑Green | 100% | ~16ms | 2x (temporary) |
| Soft Delete | 100% | ~38ms | +20‑50% |
| Distributed Locking | ~75% | ~41ms | none |

## Quick Start

```bash
# Clone repository
git clone https://github.com/211211/race-free-vector-indexing.git
cd race-free-vector-indexing

# Bootstrap project
make install   # install Bun dependencies
make up        # start Qdrant + Redis containers
make setup     # create Qdrant collection

# Run tests
make test

# Demonstrate the race condition (baseline)
make demo-race

# Compare solutions
make benchmark
```

## Tech Stack

- Bun (TypeScript runtime & package manager)
- Bun.serve (native HTTP server)
- Qdrant (vector database)
- Redis (distributed locking & priority queue)
- Podman (rootless container runtime; Docker compatible)

## Project Structure

```
race-free-vector-indexing/
├── src/
│   ├── index.ts                # Bun HTTP server & routes
│   ├── types.ts                # Shared types
│   ├── solutions/
│   │   ├── index.ts            # Solution factory
│   │   ├── baseline.ts         # DELETE-THEN-INSERT (race present)
│   │   ├── blue-green.ts       # Solution 1 (recommended)
│   │   ├── soft-delete.ts      # Solution 2
│   │   └── locking.ts          # Solution 3
│   ├── services/
│   │   ├── qdrant.ts           # Qdrant HTTP client
│   │   ├── redis.ts            # Redis client
│   │   ├── embedding.ts        # Mock embeddings
│   │   └── recovery.ts         # Stuck doc recovery
│   └── benchmark/
│       └── runner.ts           # Benchmark scenarios
├── test/
│   ├── race-condition.test.ts  # Race condition tests
│   └── priority-queue.test.ts  # Priority queue tests
├── scripts/
│   └── setup.ts                # Qdrant collection setup
└── docs/                       # Reference & guides
```

## Test Scenarios

| Scenario | Description |
|----------|-------------|
| S1 | Single document reindex, no concurrent queries |
| S2 | Single document reindex + concurrent queries |
| S3 | Multiple documents reindex concurrently |
| S4 | High query load during reindex |
| S5 | Reindex failure mid‑way |
| S6 | Worker crash during reindex |

## Manual Testing (Postman)

- Collection: `postman/vector-lab.postman_collection.json`
- Helpful variables:
  - `baseUrl = http://localhost:3000`
  - `solution = baseline | blue-green | soft-delete | locking`
  - `uuid = demo-...`
  - `delayMs = 10000` (increase to observe the race condition)
- Guides: see `docs/test-guides/`
  - `docs/test-guides/test-baseline.md`
  - `docs/test-guides/test-blue-green.md`
  - `docs/test-guides/test-soft-delete.md`
  - `docs/test-guides/test-locking.md`

## API

See `docs/solutions/05-api.md` for full reference. Key endpoints:

```http
POST /documents/:id/reindex?solution=blue-green
POST /search?solution=blue-green
POST /benchmark/compare
GET  /recovery/stuck-documents?thresholdMinutes=5
GET  /queue/status
POST /queue/enqueue
```

## Makefile Commands

Run `make help` for the full list. Common commands:

```bash
# Infrastructure
make up        # start Qdrant + Redis
make down      # stop containers
make fresh     # clean + up + setup

# Development
make install   # install dependencies
make dev       # dev server (hot reload)
make start     # production server
make setup     # setup Qdrant collection
make reset     # reset collection

# Testing & Benchmarks
make test      # all tests
make test-race # race condition tests
make test-queue # priority queue tests
make benchmark # compare solutions

# Demos
make demo-race       # baseline race demo
make demo-blue-green # race-free demo
```

## Documentation

- English reference: `docs/solutions/05-api.md`
- Vietnamese (chi tiết):
  - `docs/solutions/01-problem.md`
  - `docs/solutions/02-solutions.md`
  - `docs/solutions/2.1-baseline.md`
  - `docs/solutions/2.2-blue-green.md`
  - `docs/solutions/2.3-soft-delete.md`
  - `docs/solutions/2.4-locking.md`
  - `docs/solutions/03-test-scenarios.md`
  - `docs/solutions/04-recovery.md`
  - `docs/solutions/06-setup.md`
  - `docs/test-guides/*`

## Why Podman?

- Rootless by default (more secure)
- Daemonless
- Docker compatible
- OCI compliant

## License

MIT
