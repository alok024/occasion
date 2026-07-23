import { confirmPurchase } from '@/lib/checkout';
import { getDrafts } from '@/lib/store';

export async function POST(req: Request) {
  const { generationId, order_id, payment_id, signature } = await req.json();

  const ok = confirmPurchase(order_id, payment_id, signature);
  if (!ok) return Response.json({ ok: false });

  const drafts = getDrafts(generationId);
  if (!drafts) return Response.json({ ok: false, error: 'unknown generationId' });

  return Response.json({ ok: true, drafts });
}
