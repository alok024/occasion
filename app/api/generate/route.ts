import { generateSpeeches, type SpeechInput } from '@/lib/speech';
import { saveDrafts } from '@/lib/store';

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SpeechInput>;

  const input: SpeechInput = {
    occasion: body.occasion || 'wedding',
    speaker: body.speaker || 'the speaker',
    honoree: body.honoree || 'the honoree',
    relationship: body.relationship || 'friend',
    tone: body.tone || 'Heartfelt',
    anecdotes: Array.isArray(body.anecdotes) ? body.anecdotes : [],
    length: body.length || 'medium',
  };

  const { drafts } = await generateSpeeches(input);
  const generationId = saveDrafts(drafts);

  // Server-side gate: only the first draft is returned; the rest stay withheld
  // until a verified purchase hits /api/unlock.
  return Response.json({ generationId, preview: drafts[0], lockedCount: drafts.length - 1 });
}
