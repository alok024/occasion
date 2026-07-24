// Shared checkout — mock-friendly so the full order -> verify -> unlock flow runs
// locally with zero Razorpay keys. Amounts are in the smallest currency unit (paise).

import { createOrder, verifyPaymentSignature, mockSignature, RAZORPAY_MOCK } from './razorpay';

export interface Plan {
  amount: number;
  currency: string;
  label: string;
  kind: string;
}

// Single INR price for the full speech plus delivery kit; rewrites are included,
// not sold separately. Razorpay is merchant of record on the charge, so a global
// card is simply converted to INR by the customer's bank at checkout — no
// per-currency plan variants needed.
export const PLANS: Record<string, Plan> = {
  unlock: {
    amount: 199900,
    currency: 'INR',
    label: '₹1,999 — full speech + delivery kit (teleprompter, timed read, pronunciation guide)',
    kind: 'one-time',
  },
};

export function listPlans(): (Plan & { id: string })[] {
  return Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan }));
}

export function isPaymentMock(): boolean {
  return RAZORPAY_MOCK;
}

export async function createCheckoutOrder(planId: string, notes?: Record<string, string>) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const order = await createOrder(plan.amount, plan.currency, { ...notes, planId });

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
