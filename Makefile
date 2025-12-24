.PHONY: help up down restart logs status health dev test benchmark setup clean reset fresh shell qdrant-ui metrics docs chunks search-debug

# Default target
help:
	@echo "Vector Index Consistency Lab - Makefile Commands"
	@echo ""
	@echo "Infrastructure:"
	@echo "  make up        - Start Qdrant and Redis containers"
	@echo "  make down      - Stop and remove containers"
	@echo "  make restart   - Restart all containers"
	@echo "  make logs      - Show container logs"
	@echo "  make status    - Show container/service status"
	@echo "  make health    - Check Qdrant + Redis health"
	@echo "  make clean     - Remove containers and volumes"
	@echo "  make fresh     - Complete reset: clean + up + setup (start over)"
	@echo ""
	@echo "Development:"
	@echo "  make install   - Install Bun dependencies"
	@echo "  make dev       - Run dev server with hot reload"
	@echo "  make start     - Run production server"
	@echo "  make setup     - Setup Qdrant collection"
	@echo "  make reset     - Reset Qdrant collection (keep containers)"
	@echo ""
	@echo "Testing:"
	@echo "  make test      - Run all tests"
	@echo "  make test-race - Run race condition tests"
	@echo "  make test-queue - Run priority queue tests"
	@echo "  make benchmark - Run benchmark comparison"
	@echo "  make test-podman-host - Run tests in Podman (host network)"
	@echo "  make test-podman-vm   - Run tests in Podman (VM; host.containers.internal)"
	@echo "  make test-compose     - Run tests as compose service (network)"
	@echo "  make image-build      - Build app image (Containerfile)"
	@echo "  make image-push REG=  - Push image to registry (set REG)"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell     - Open shell in app container"
	@echo "  make qdrant-ui - Open Qdrant dashboard URL"
	@echo "  make redis-cli - Open Redis CLI"
	@echo "  make metrics   - Show collection metrics (points, docs)"
	@echo "  make docs      - List documents and chunk counts"
	@echo "  make chunks    - Show chunks for a specific UUID (use UUID=...)"
	@echo "  make search-debug - Debug a search (use SOLUTION=..., QUERY=..., LIMIT=...)"

# === Infrastructure ===

up:
	podman-compose up -d qdrant redis
	@echo "Waiting for services to be ready..."
	@sleep 3
	@echo "Qdrant: http://localhost:6333/dashboard"
	@echo "Redis: localhost:6379"

down:
	podman-compose down

restart: down up

logs:
	podman-compose logs -f

status:
	@echo "=== Compose services ==="
	@podman-compose ps
	@echo ""
	@echo "=== Containers (podman ps) ==="
	@podman ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "Qdrant UI: http://localhost:6333/dashboard"
	@echo "Redis: localhost:6379"

health:
	@echo "=== Health Checks ==="
	@echo "-- Qdrant container --"
	@podman ps --filter name=vector-lab-qdrant --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "-- Qdrant API readiness --"
	@QDRANT_URL=$${QDRANT_URL:-http://localhost:6333}; \
	if curl -fsS "$$QDRANT_URL/collections" >/dev/null; then \
	  echo "OK - $$QDRANT_URL/collections"; \
	else \
	  echo "NOT READY - $$QDRANT_URL/collections"; \
	fi
	@echo ""
	@echo "-- Redis container --"
	@podman ps --filter name=vector-lab-redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "-- Redis PING --"
	@if podman exec vector-lab-redis redis-cli ping >/dev/null 2>&1; then \
	  echo "OK - PONG"; \
	else \
	  echo "NOT READY - redis-cli ping failed"; \
	fi

clean:
	podman-compose down -v
	@echo "Volumes removed"

fresh: clean up setup
	@echo ""
	@echo "=== Fresh start complete! ==="
	@echo "Qdrant: http://localhost:6333/dashboard"
	@echo "Redis: localhost:6379"

# === Development ===

install:
	bun install

dev: up
	bun run --watch src/index.ts

start: up
	bun run src/index.ts

setup:
	bun run scripts/setup.ts

reset:
	bun run scripts/setup.ts --reset

# === Testing ===

test:
	bun test

test-race:
	bun test test/race-condition.test.ts

test-queue:
	bun test test/priority-queue.test.ts

benchmark:
	@echo "Running benchmark comparison..."
	@curl -s -X POST http://localhost:3000/benchmark/compare \
		-H "Content-Type: application/json" \
		-d '{"solutions":["baseline","blue-green","soft-delete","locking"],"iterations":3,"queryIntervalMs":30}' | jq .

# Podman: run Bun tests inside container (production-like)
test-podman-host: up
	@echo "Running tests in Podman (host network)..."
	podman run --rm --net=host -v "$$PWD:/app" -w /app \
		-e QDRANT_URL=http://localhost:6333 \
		-e REDIS_URL=redis://localhost:6379 \
		docker.io/oven/bun:1.1 bun test

test-podman-vm: up
	@echo "Running tests in Podman (VM; using host.containers.internal)..."
	podman run --rm -v "$$PWD:/app" -w /app \
		-e QDRANT_URL=http://host.containers.internal:6333 \
		-e REDIS_URL=redis://host.containers.internal:6379 \
		docker.io/oven/bun:1.1 bun test

test-compose: up
	@echo "Running tests via compose service (network attached)..."
	podman-compose run --rm app-test

IMAGE_NAME ?= vector-index-consistency-lab
IMAGE_TAG ?= latest
IMAGE_FULL ?= $${REG:-docker.io}/$${IMAGE_NAME}:$${IMAGE_TAG}

image-build:
	@echo "Building image: $$IMAGE_FULL"
	podman build -t $$IMAGE_FULL -f Containerfile .

image-push:
	@if [ -z "$${REG}" ]; then echo "Set REG to target registry (e.g., REG=docker.io/yourrepo)"; exit 1; fi
	@echo "Pushing image: $$IMAGE_FULL"
	podman push $$IMAGE_FULL

# === Utilities ===

shell:
	podman exec -it vector-lab-app /bin/sh

qdrant-ui:
	@echo "Opening Qdrant Dashboard..."
	@open http://localhost:6333/dashboard 2>/dev/null || echo "Visit: http://localhost:6333/dashboard"

redis-cli:
	podman exec -it vector-lab-redis redis-cli

# === Diagnostics ===

metrics:
	@echo "=== Collection Metrics ==="
	@curl -s http://localhost:3000/admin/metrics | jq .

docs:
	@echo "=== Documents and Chunk Counts ==="
	@curl -s http://localhost:3000/admin/documents | jq .

chunks:
	@UUID=$${UUID:-demo-001}; \
	 echo "=== Chunks for $$UUID ==="; \
	 curl -s http://localhost:3000/documents/$$UUID/chunks | jq .

search-debug:
	@SOLUTION=$${SOLUTION:-blue-green}; QUERY=$${QUERY:-"pump specifications"}; LIMIT=$${LIMIT:-10}; \
	 echo "=== Debug Search: solution=$$SOLUTION query=$$QUERY limit=$$LIMIT ==="; \
	 curl -s -X POST "http://localhost:3000/search?solution=$$SOLUTION&debug=true" \
	 	 -H "Content-Type: application/json" \
	 	 -d '{"query":'"$$QUERY"',"limit":'"$$LIMIT"'}' | jq .

# === Quick Demo ===

demo-race:
	@echo "=== Demo: Race Condition ==="
	@echo "1. Indexing document..."
	@curl -s -X POST http://localhost:3000/documents/demo-001/reindex?solution=baseline \
		-H "Content-Type: application/json" \
		-d '{"content":"Original pump specifications. Model A100."}' | jq .
	@echo ""
	@echo "2. Starting slow reindex (3s delay)..."
	@curl -s -X POST "http://localhost:3000/documents/demo-001/reindex?solution=baseline&simulateDelay=3000" \
		-H "Content-Type: application/json" \
		-d '{"content":"Updated pump specifications. Model B200."}' &
	@sleep 0.5
	@echo "3. Querying during reindex gap..."
	@for i in 1 2 3 4 5; do \
		echo "Query $$i:"; \
		curl -s -X POST http://localhost:3000/search?solution=baseline \
			-H "Content-Type: application/json" \
			-d '{"query":"pump specifications","limit":5}' | jq '.count'; \
		sleep 0.5; \
	done
	@echo ""
	@echo "Notice: Some queries return 0 results during reindex!"

demo-blue-green:
	@echo "=== Demo: Blue-Green (No Race Condition) ==="
	@echo "1. Indexing document..."
	@curl -s -X POST http://localhost:3000/documents/demo-002/reindex?solution=blue-green \
		-H "Content-Type: application/json" \
		-d '{"content":"Original pump specifications. Model A100."}' | jq .
	@echo ""
	@echo "2. Starting slow reindex (3s delay)..."
	@curl -s -X POST "http://localhost:3000/documents/demo-002/reindex?solution=blue-green&simulateDelay=3000" \
		-H "Content-Type: application/json" \
		-d '{"content":"Updated pump specifications. Model B200."}' &
	@sleep 0.5
	@echo "3. Querying during reindex..."
	@for i in 1 2 3 4 5; do \
		echo "Query $$i:"; \
		curl -s -X POST http://localhost:3000/search?solution=blue-green \
			-H "Content-Type: application/json" \
			-d '{"query":"pump specifications","limit":5}' | jq '.count'; \
		sleep 0.5; \
	done
	@echo ""
	@echo "Notice: All queries return results - no race condition!"
