// src/solutions/index.ts

import { baseline } from './baseline';
import { blueGreen } from './blue-green';
import { softDelete } from './soft-delete';
import { locking } from './locking';
import * as qdrant from '../services/qdrant';
import type { Solution } from '../types';

export { baseline, blueGreen, softDelete, locking };

const solutions: Record<string, Solution> = {
  baseline,
  'blue-green': blueGreen,
  'soft-delete': softDelete,
  locking,
};

export function create(name: string): Solution {
  const solution = solutions[name];
  if (!solution) {
    throw new Error(`Unknown solution: ${name}. Available: ${Object.keys(solutions).join(', ')}`);
  }
  return solution;
}

export function getAvailableSolutions(): string[] {
  return Object.keys(solutions);
}

export async function resetCollection(): Promise<void> {
  await qdrant.resetCollection();
}

export async function getChunks(uuid: string) {
  return qdrant.getChunksByUuid(uuid);
}

export async function getMetrics() {
  const metrics = await qdrant.getMetrics();
  const statusCounts = await qdrant.getStatusCounts();
  return { ...metrics, statusCounts };
}

export async function getAllDocuments() {
  return qdrant.getAllDocuments();
}

export async function getDocumentSummary(uuid: string) {
  return qdrant.getDocumentSummary(uuid);
}
