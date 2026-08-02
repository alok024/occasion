
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
