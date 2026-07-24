// Zero-dependency default DraftStore: in-memory Maps with TTL/eviction, plus
// optional JSON-file persistence so a local `next dev` restart doesn't lose
// everything. No network calls, no external client -- this is what getStore()
// returns until a real backend (see supabase-stub.ts) is wired in.
//
// Note this still does not survive across separate Vercel lambda instances
// (each gets its own process); that cross-instance fix is the external backend,
// not this file. File persistence here is a local-dev convenience only.

import fs from 'fs';
import path from 'path';
import type { DraftStore, DraftRecord, OrderRecord, GrantResult } from './index';

const TTL_MS = 24 * 60 * 60 * 1000; // one sitting's worth of generate -> pay -> unlock, and then some
const MAX_ENTRIES = 5000; // hard cap per map so a traffic burst can't grow memory unbounded before TTL sweeps it

type GrantInput = Parameters<DraftStore['grantEntitlement']>[0];
interface ConsumedRecord {
  generationId: string;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

// Insertion-ordered map (native Map semantics) with lazy TTL expiry and a hard
// size cap, so none of the maps below can grow without bound.
class TTLMap<V> {
  private map = new Map<string, Entry<V>>();

  constructor(private ttlMs: number, private maxEntries: number) {}

  set(key: string, value: V): void {
    this.sweep();
    this.map.delete(key); // re-insert so it becomes the newest for FIFO eviction below
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  entries(): [string, V][] {
    return Array.from(this.map, ([key, entry]) => [key, entry.value]);
  }

  // Rehydration from disk: the persisted snapshot has no reliable expiry of its
  // own (the file may be old), so loaded rows get a fresh TTL window from now.
  hydrate(rows: [string, V][]): void {
    const expiresAt = Date.now() + this.ttlMs;
    for (const [key, value] of rows) this.map.set(key, { value, expiresAt });
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
  }
}

const drafts = new TTLMap<DraftRecord>(TTL_MS, MAX_ENTRIES);
const orders = new TTLMap<OrderRecord>(TTL_MS, MAX_ENTRIES);
const consumed = new TTLMap<ConsumedRecord>(TTL_MS, MAX_ENTRIES);
const entitlements = new TTLMap<true>(TTL_MS, MAX_ENTRIES);

// Off by default -- set to an absolute (or cwd-relative) path to persist across
// restarts during local dev. Never required for build/typecheck/smoke.
const STORE_FILE = process.env.OCCASION_STORE_FILE || '';

interface Snapshot {
  drafts: [string, DraftRecord][];
  orders: [string, OrderRecord][];
  consumed: [string, ConsumedRecord][];
  entitlements: [string, true][];
}

function loadSnapshot(): void {
  if (!STORE_FILE) return;
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const snap = JSON.parse(raw) as Partial<Snapshot>;
    drafts.hydrate(snap.drafts ?? []);
    orders.hydrate(snap.orders ?? []);
    consumed.hydrate(snap.consumed ?? []);
    entitlements.hydrate(snap.entitlements ?? []);
  } catch (err) {
    // Corrupt or unreadable snapshot: start empty rather than fail the process.
    console.error('[store] could not load', STORE_FILE, '- starting empty:', err);
  }
}

function persist(): void {
  if (!STORE_FILE) return;
  try {
    const snap: Snapshot = {
      drafts: drafts.entries(),
      orders: orders.entries(),
      consumed: consumed.entries(),
      entitlements: entitlements.entries(),
    };
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(snap));
  } catch (err) {
    // Best-effort only: the in-memory store stays authoritative for this process.
    console.error('[store] could not persist to', STORE_FILE, ':', err);
  }
}

loadSnapshot();

// Synchronous core, exported only for lib/store.ts's legacy shim (saveDrafts /
// getDrafts), which not-yet-migrated routes still call without `await`. Safe to
// expose as sync because every operation here already is -- the DraftStore
// methods below just wrap these in a resolved Promise for the async interface.
export function putDraftsSync(rec: DraftRecord): void {
  drafts.set(rec.generationId, rec);
  persist();
}

export function getDraftsSync(generationId: string): DraftRecord | undefined {
  return drafts.get(generationId);
}

function grantEntitlementSync(input: GrantInput): GrantResult {
  const order = orders.get(input.orderId);
  if (!order) return 'not_found';

  // The order's own generationId binding is authoritative; a mismatch here means
  // this orderId/paymentId is being pointed at a generation it was never paid for.
  if (order.generationId !== input.generationId) return 'replay';

  const consumeKey = `${input.orderId}::${input.paymentId}`;
  const prior = consumed.get(consumeKey);
  // Belt-and-suspenders: also check the consumption ledger directly, so a replay
  // is still caught even if an order record were ever overwritten in place.
  if (prior && prior.generationId !== input.generationId) return 'replay';

  if (order.owner !== input.owner) return 'owner_mismatch';
  if (order.amount !== input.expectedAmount || order.currency !== input.expectedCurrency) {
    return 'amount_mismatch';
  }

  if (!prior) {
    consumed.set(consumeKey, { generationId: input.generationId });
    entitlements.set(input.generationId, true);
    persist();
  }
  return 'granted'; // first grant, or an idempotent replay of the identical triple
}

export function createMemoryStore(): DraftStore {
  return {
    async putDrafts(rec) {
      putDraftsSync(rec);
    },
    async getDrafts(generationId) {
      return getDraftsSync(generationId);
    },
    async putOrder(rec) {
      orders.set(rec.orderId, rec);
      persist();
    },
    async getOrder(orderId) {
      return orders.get(orderId);
    },
    async grantEntitlement(input) {
      return grantEntitlementSync(input);
    },
    async isEntitled(generationId) {
      return entitlements.get(generationId) === true;
    },
  };
}
