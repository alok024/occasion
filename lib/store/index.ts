
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

export function getStore(): DraftStore {
  if (!singleton) singleton = createMemoryStore();
  return singleton;
}
