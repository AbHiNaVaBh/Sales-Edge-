/**
 * Offline sync queue, encryption simulation, and conflict resolution manager.
 */
import type { SyncQueueItem } from '../types/index.ts';

export interface SyncResult {
  successful: number;
  failed: number;
  conflicts: number;
  processedIds: string[];
}

export function createSyncQueueItem(
  entityType: 'order' | 'payment' | 'visit' | 'customer',
  entityId: string,
  action: 'create' | 'update',
  payload: any
): SyncQueueItem {
  return {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entityType,
    entityId,
    action,
    payload,
    timestamp: Date.now(),
    status: 'pending',
  };
}

/**
 * Validates and detects conflicts between local mutations and simulated server state
 */
export function detectSyncConflicts(
  item: SyncQueueItem,
  serverTimestamps: Record<string, number>
): boolean {
  // If server has a newer modification timestamp than when this mutation was queued
  const serverTime = serverTimestamps[item.entityId];
  if (serverTime && serverTime > item.timestamp) {
    return true; // Conflict detected
  }
  return false;
}

/**
 * Simulates payload packaging with cryptographic checksum for tamper-proofing
 */
export function packageSecurePayload(items: SyncQueueItem[]): {
  batchId: string;
  count: number;
  checksum: string;
  encryptedSimulation: string;
} {
  const json = JSON.stringify(items);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const checksum = `SHA256-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  const encoded = btoa(unescape(encodeURIComponent(json.slice(0, 120))));

  return {
    batchId: `batch_${Date.now()}`,
    count: items.length,
    checksum,
    encryptedSimulation: `AES-256-GCM::${encoded}...`,
  };
}
