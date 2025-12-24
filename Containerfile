FROM docker.io/oven/bun:1.1

WORKDIR /app

# Install deps first for better layer caching
COPY package.json bun.lock ./
RUN bun install --ci

# Copy source
COPY . .

# Default envs expect external services
ENV QDRANT_URL=http://localhost:6333
ENV REDIS_URL=redis://localhost:6379

# Allow skipping tests at build time (for registries/airgapped CI)
ARG SKIP_TESTS=false

# Typecheck and tests at buildtime (optional; can be skipped)
RUN bun x tsc --noEmit
RUN sh -c '[ "$SKIP_TESTS" = "true" ] || bun test'

# Default command: run server (override in CI as needed)
CMD ["bun", "run", "src/index.ts"]
