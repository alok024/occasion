// Shared checkout — mock-friendly so the full order -> verify -> unlock flow runs
// locally with zero Razorpay keys. Amounts are in the smallest currency unit (cents).

import { createOrder, verifyPaymentSignature, mockSignature, RAZORPAY_MOCK } from './razorpay';

export interface Plan {
  amount: number;
  currency: string;
  label: string;
  kind: string;
}

export const PLANS: Record<string, Plan> = {
  unlock: { amount: 2400, currency: 'USD', label: '$24 — unlock all 4 drafts', kind: 'one-time' },
  rewrite_pack: { amount: 900, currency: 'USD', label: '$9 — extra rewrite pack', kind: 'one-time' },
};

export function listPlans(): (Plan & { id: string })[] {
  return Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan }));
}

export async function createCheckoutOrder(planId: string) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const order = await createOrder(plan.amount, plan.currency, { planId });

  if (order.mock) {
    // Precompute a valid mock payment so the browser can finish without a real modal.
    const paymentId = 'pay_mock_' + order.order_id.slice(-8);
    const signature = mockSignature(order.order_id, paymentId);
    return {
      ...order,
      planId,
      label: plan.label,
      mock_payment: { payment_id: paymentId, signature },
    };
  }

  return { ...order, planId, label: plan.label };
}

export function confirmPurchase(order_id: string, payment_id: string, signature: string): boolean {
  return verifyPaymentSignature(order_id, payment_id, signature);
}

export { RAZORPAY_MOCK };
