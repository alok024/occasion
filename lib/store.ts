// Thin barrel over lib/store/*. getStore() and the record/result types now live
// in lib/store/index.ts (see it for the real interface + the durable-store plan).
//
// saveDrafts/getDrafts below are a transitional shim for routes not yet migrated
// to the owner/entitlement flow (no signature change for them to absorb): they
// mint a generationId internally and write through to the same singleton store,
// with no owner and no purchase entitlement attached.

import crypto from 'crypto';
import { getDraftsSync, putDraftsSync } from './store/memory';
import type { StoredDraft } from './store/index';

export { getStore } from './store/index';
export type { StoredDraft, DraftRecord, OrderRecord, GrantResult, DraftStore } from './store/index';

export function saveDrafts(drafts: StoredDraft[]): string {
  const generationId = crypto.randomUUID();
  putDraftsSync({ generationId, owner: '', drafts, createdAt: Date.now() });
  return generationId;
}

export function getDrafts(generationId: string): StoredDraft[] | undefined {
  return getDraftsSync(generationId)?.drafts;
}
