import { confirmPurchase, PLANS } from '@/lib/checkout';
import { getStore } from '@/lib/store';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'malformed request body' }, { status: 400 });
  }

  const { generationId, owner, order_id, payment_id, signature } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof generationId !== 'string' || !generationId ||
    typeof owner !== 'string' || !owner ||
    typeof order_id !== 'string' || !order_id ||
    typeof payment_id !== 'string' || !payment_id ||
    typeof signature !== 'string' || !signature
  ) {
    return Response.json({ ok: false, error: 'malformed request body' }, { status: 400 });
  }

  if (!confirmPurchase(order_id, payment_id, signature)) {
    return Response.json({ ok: false, error: 'invalid_signature' });
  }

  const store = getStore();
  const order = await store.getOrder(order_id);
  const plan = order ? PLANS[order.planId] : undefined;
  if (!order || !plan) {
    return Response.json({ ok: false, error: 'not_found' });
  }

  const result = await store.grantEntitlement({
    generationId,
    owner,
    orderId: order_id,
    paymentId: payment_id,
    plan: order.planId,
    expectedAmount: plan.amount,
    expectedCurrency: plan.currency,
  });

  if (result !== 'granted') {
    return Response.json({ ok: false, error: result });
  }

  const draftRecord = await store.getDrafts(generationId);
  if (draftRecord && draftRecord.owner !== owner) {
    return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  return Response.json({ ok: true, drafts: draftRecord?.drafts ?? [], deliveryKit: true });
}
