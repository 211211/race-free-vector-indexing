// src/services/redis.ts
// Simple Redis client using Bun's native fetch for Redis HTTP API
// Or using ioredis if available

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Reuse a single Redis client across module reloads (dev/watch) to avoid socket listener churn
const existing: Redis | undefined = (globalThis as any).__redisClient;
export const redis: Redis = existing ?? new Redis(REDIS_URL);
(globalThis as any).__redisClient = redis;

// Optional: basic error logging
redis.on('error', (err) => {
  console.error('Redis error:', (err as Error).message);
});

// Graceful shutdown; ensure listeners are only added once
if (!(globalThis as any).__redisSignalsHooked) {
  (globalThis as any).__redisSignalsHooked = true;
  process.once('SIGINT', () => { try { redis.disconnect(); } catch {} });
  process.once('SIGTERM', () => { try { redis.disconnect(); } catch {} });
}
