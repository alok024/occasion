import { confirmPurchase } from '@/lib/checkout';

export async function POST(req: Request) {
  const { order_id, payment_id, signature } = await req.json();
  const ok = confirmPurchase(order_id, payment_id, signature);
  return Response.json({ ok });
}
