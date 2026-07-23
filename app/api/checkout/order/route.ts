import { createCheckoutOrder } from '@/lib/checkout';

export async function POST(req: Request) {
  const { planId } = await req.json();
  const result = await createCheckoutOrder(planId);
  return Response.json(result);
}
