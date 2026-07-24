// Durable draft + entitlement store keyed by generationId. This module owns the
// interface only; lib/store/memory.ts is the default zero-dependency implementation
// and lib/store/supabase-stub.ts is an adapter stub for a real backend, wired in
// later (never imported from here on the default path).

import { createMemoryStore } from './memory';

export interface StoredDraft {
  style: string;
  title: string;
  text: string;
}

export interface DraftRecord {
  generationId: string;
  owner: string;
  drafts: StoredDraft[];
  createdAt: number;
}

export interface OrderRecord {
  orderId: string;
  planId: string;
  amount: number;
  currency: string;
  generationId: string;
  owner: string;
  createdAt: number;
}

export type GrantResult = 'granted' | 'replay' | 'not_found' | 'amount_mismatch' | 'owner_mismatch';

export interface DraftStore {
  putDrafts(rec: DraftRecord): Promise<void>;
  getDrafts(generationId: string): Promise<DraftRecord | undefined>;
  putOrder(rec: OrderRecord): Promise<void>;
  getOrder(orderId: string): Promise<OrderRecord | undefined>;
  // Single-use consume + bind. Idempotent for the SAME (orderId,paymentId,generationId).
  // (orderId,paymentId) already consumed for a DIFFERENT generationId => 'replay'.
  // Enforces order.generationId===generationId, order.owner===owner, order.amount===expectedAmount,
  // order.currency===expectedCurrency.
  grantEntitlement(input: {
    generationId: string;
    owner: string;
    orderId: string;
    paymentId: string;
    plan: string;
    expectedAmount: number;
    expectedCurrency: string;
  }): Promise<GrantResult>;
  isEntitled(generationId: string): Promise<boolean>;
}

let singleton: DraftStore | undefined;

// Process-wide singleton: one store per running process (or per serverless
// instance). Swapping the default local store for a real backend means changing
// this one line to construct a different DraftStore implementation.
export function getStore(): DraftStore {
  if (!singleton) singleton = createMemoryStore();
  return singleton;
}
