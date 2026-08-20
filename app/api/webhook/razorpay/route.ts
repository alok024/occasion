import { PLANS } from '@/lib/checkout';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { getStore } from '@/lib/store';

interface RazorpayPaymentEntity {
  id?: unknown;
  order_id?: unknown;
}

const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid']);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, error: 'malformed body' }, { status: 400 });
  }

  const { event, payload } = (body ?? {}) as Record<string, unknown>;
  if (typeof event !== 'string' || !HANDLED_EVENTS.has(event)) {
    return Response.json({ ok: true, ignored: true });
  }

  const entity = (payload as { payment?: { entity?: RazorpayPaymentEntity } } | undefined)?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;
  if (typeof orderId !== 'string' || !orderId || typeof paymentId !== 'string' || !paymentId) {
    return Response.json({ ok: false, error: 'malformed payload' }, { status: 400 });
  }

  const store = getStore();
  const order = await store.getOrder(orderId);
  const plan = order ? PLANS[order.planId] : undefined;
  if (!order || !plan) {
    return Response.json({ ok: true, ignored: true });
  }

  const result = await store.grantEntitlement({
    generationId: order.generationId,
    owner: order.owner,
    orderId,
    paymentId,
    plan: order.planId,
    expectedAmount: plan.amount,
    expectedCurrency: plan.currency,
  });

  return Response.json({ ok: result === 'granted' });
}
