import { createCheckoutOrder } from '@/lib/checkout';
import { getStore } from '@/lib/store';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'malformed request body' }, { status: 400 });
  }

  const { planId, generationId, owner } = (body ?? {}) as Record<string, unknown>;

  if (typeof generationId !== 'string' || !generationId || typeof owner !== 'string' || !owner) {
    return Response.json({ error: 'generationId and owner are required' }, { status: 400 });
  }
  if (typeof planId !== 'string' || !planId) {
    return Response.json({ error: 'planId is required' }, { status: 400 });
  }

  const draft = await getStore().getDrafts(generationId);
  if (!draft || draft.owner !== owner) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let order: Awaited<ReturnType<typeof createCheckoutOrder>>;
  try {
    order = await createCheckoutOrder(planId, { generationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid plan';
    return Response.json({ error: message }, { status: 400 });
  }

  await getStore().putOrder({
    orderId: order.order_id,
    planId,
    amount: order.amount,
    currency: order.currency,
    generationId,
    owner,
    createdAt: Date.now(),
  });

  return Response.json(order);
}
