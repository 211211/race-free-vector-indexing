# Repository Guidelines
 
## Project Structure & Module Organization
- `src/`: TypeScript sources. Key areas: `src/services/` (Redis, Qdrant, queue), `src/solutions/` (baseline, blue‑green, soft‑delete, locking), `src/benchmark/` (runner), and `src/index.ts` (HTTP routes).
- `test/`: Bun tests (`*.test.ts`) covering race conditions and priority queue.
- `scripts/`: Setup utilities (e.g., `scripts/setup.ts` to create/ reset Qdrant collection).
- `docs/`: Reference notes and designs. Infrastructure in `podman-compose.yml`.
 
## Build, Test, and Development Commands
- `make up`: Start Qdrant + Redis containers. `make down`: stop.
- `make setup`: Create Qdrant collection and payload indexes. `make reset`: reset.
- `make dev`: Run server with hot reload. `make start`: run server.
- `make test`: All tests. `make test-race`: race condition tests. `make test-queue`: priority queue tests.
- Podman tests: `make test-podman-vm`, `make test-podman-host`, `make test-compose`.
- `make benchmark`: Compare solutions via HTTP.
- Direct alternatives: `bun run src/index.ts`, `bun test`, `bun run scripts/setup.ts --reset`.
 
## Coding Style & Naming Conventions
- Language: TypeScript (strict mode per `tsconfig.json`). ES modules.
- Indentation: 2 spaces; avoid long lines (>100 chars).
- Files: kebab‑case (`blue-green.ts`, `priority-queue.ts`).
- Identifiers: camelCase for variables/functions; PascalCase for types/enums.
- Keep modules small under `src/services` and `src/solutions`; prefer explicit types and return values.
 
## Testing Guidelines
- Framework: `bun:test`.
- Location: `test/*.test.ts`. Use `describe/it/expect`.
- Run: `make test` or `bun test`. For a single file: `bun test test/race-condition.test.ts`.
- Optional coverage: `bun test --coverage`.
 
## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Keep messages imperative and scoped.
- PRs: include a clear description, linked issues, steps to reproduce, test output, and (when relevant) Qdrant UI screenshots or `make logs` excerpts. Note any infra changes (`podman-compose.yml`).
 
## Security & Configuration Tips
- Env vars: `QDRANT_URL` (default `http://localhost:6333`), `REDIS_URL` (default `redis://localhost:6379`).
- Use `make fresh` for a clean start; avoid running against non‑local services.
- Graceful shutdown handled for Redis; verify services are up (`make up`) before tests or benchmarks.

## Container Image
- Build: `make image-build` (uses `Containerfile`)
- Push: `REG=<registry/namespace> make image-push`
