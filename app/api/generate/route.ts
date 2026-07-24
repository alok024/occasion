import crypto from 'crypto';
import { generateSpeeches, type SpeechInput } from '@/lib/speech';
import { getStore, type StoredDraft } from '@/lib/store';
import { isPaymentMock } from '@/lib/checkout';
import { rateLimit } from '@/lib/ratelimit';

const MAX_FIELD_LEN = 100;
const MAX_ANECDOTES = 4;
const MAX_ANECDOTE_LEN = 300;

function clampField(v: unknown, fallback: string, max = MAX_FIELD_LEN): string {
  if (typeof v !== 'string') return fallback;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

function clampAnecdotes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is string => typeof a === 'string')
    .slice(0, MAX_ANECDOTES)
    .map((a) => a.trim().slice(0, MAX_ANECDOTE_LEN))
    .filter((a) => a.length > 0);
}

function requestIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Strong opening + shape of the first draft only; the rest of this draft and
// the other full drafts stay server-side until /api/unlock grants entitlement.
function buildPreview(draft: StoredDraft): { style: string; title: string; text: string } {
  const paragraphs = draft.text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const opening = paragraphs[0] ?? draft.text;
  const remaining = paragraphs.length - 1;
  const text =
    remaining > 0
      ? `${opening}\n\n[Unlocks into ${remaining} more paragraph${remaining === 1 ? '' : 's'} of this speech.]`
      : opening;
  return { style: draft.style, title: draft.title, text };
}

function buildOutline(drafts: StoredDraft[]): string[] {
  const [first, ...rest] = drafts;
  return [
    `The rest of "${first.title}" - the full speech, not just the opening`,
    ...rest.map((d) => `A complete alternate draft: "${d.title}"`),
    'A delivery kit: teleprompter view, timed read, and a pronunciation guide',
  ];
}

export async function POST(req: Request) {
  if (!rateLimit(requestIp(req))) {
    return Response.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return Response.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const input: SpeechInput = {
    occasion: clampField(raw.occasion, 'wedding'),
    speaker: clampField(raw.speaker, 'the speaker'),
    honoree: clampField(raw.honoree, 'the honoree'),
    relationship: clampField(raw.relationship, 'friend'),
    tone: clampField(raw.tone, 'Heartfelt'),
    length: clampField(raw.length, 'medium'),
    anecdotes: clampAnecdotes(raw.anecdotes),
  };

  try {
    const { drafts } = await generateSpeeches(input);
    if (!drafts.length || !drafts[0].text.trim()) {
      return Response.json(
        { error: 'Could not generate a speech right now. Please try again.' },
        { status: 500 },
      );
    }

    const generationId = crypto.randomUUID();
    const owner = crypto.randomBytes(32).toString('hex');
    await getStore().putDrafts({ generationId, owner, drafts, createdAt: Date.now() });

    return Response.json({
      generationId,
      owner,
      preview: buildPreview(drafts[0]),
      outline: buildOutline(drafts),
      lockedCount: drafts.length - 1,
      paymentMock: isPaymentMock(),
    });
  } catch {
    return Response.json(
      { error: 'Could not generate a speech right now. Please try again.' },
      { status: 500 },
    );
  }
}
