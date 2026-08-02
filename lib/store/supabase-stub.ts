
import type { DraftStore, DraftRecord, OrderRecord, GrantResult } from './index';

type GrantInput = Parameters<DraftStore['grantEntitlement']>[0];

function notConfigured(): never {
  throw new Error(
    'Remote store adapter is not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ' +
      '(or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) and implement the methods in ' +
      'lib/store/supabase-stub.ts before pointing getStore() at createRemoteStore().',
  );
}

export function createRemoteStore(): DraftStore {
  return {
    async putDrafts(rec: DraftRecord): Promise<void> {
      return notConfigured();
    },
    async getDrafts(generationId: string): Promise<DraftRecord | undefined> {
      return notConfigured();
    },
    async putOrder(rec: OrderRecord): Promise<void> {
      return notConfigured();
    },
    async getOrder(orderId: string): Promise<OrderRecord | undefined> {
      return notConfigured();
    },
    async grantEntitlement(input: GrantInput): Promise<GrantResult> {
      return notConfigured();
    },
    async isEntitled(generationId: string): Promise<boolean> {
      return notConfigured();
    },
  };
}
