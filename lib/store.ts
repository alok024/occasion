// In-memory gate store shared by /api/generate (writes) and /api/unlock (reads).
// Lives in one module so both route handlers see the same Map instance.
// NOTE: this resets on server restart — production should persist drafts + the
// purchase entitlement in a database (see README).

import type { Draft } from './speech';

const store = new Map<string, Draft[]>();
let counter = 0;

export function saveDrafts(drafts: Draft[]): string {
  counter += 1;
  // Counter keeps ids unique and ordered; a short content tag aids debugging.
  const tag = (drafts[0]?.text.length ?? 0).toString(36);
  const id = `gen_${counter}_${tag}`;
  store.set(id, drafts);
  return id;
}

export function getDrafts(generationId: string): Draft[] | undefined {
  return store.get(generationId);
}
