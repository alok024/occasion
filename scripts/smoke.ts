import crypto from 'crypto';
import { generateSpeeches } from '../lib/speech';
import { createCheckoutOrder, confirmPurchase, PLANS } from '../lib/checkout';
import { getStore } from '../lib/store';
import { getTtsProvider } from '../lib/tts';
import { POST as webhookHandler } from '../app/api/webhook/razorpay/route';

async function testSpeechAndCheckout() {
  const s = await generateSpeeches({
    occasion: 'wedding',
    speaker: 'Alex',
    honoree: 'Sam',
    relationship: 'best friend',
    tone: 'Heartfelt',
    anecdotes: ['met in college', 'road trip to the coast', 'stood by me when dad passed'],
    length: 'medium',
  });

  if (s.drafts.length !== 4) throw new Error(`expected 4 drafts, got ${s.drafts.length}`);
  if (!s.drafts.every((d) => d.text.length > 200)) {
    throw new Error('a draft was shorter than 200 chars');
  }
  if (!s.drafts.some((d) => d.text.includes('Sam') && d.text.includes('Alex'))) {
    throw new Error('drafts do not reference the names');
  }

  const order = await createCheckoutOrder('unlock');
  if (!order.mock_payment) throw new Error('expected a mock payment in keyless mode');
  const ok = confirmPurchase(order.order_id, order.mock_payment.payment_id, order.mock_payment.signature);
  if (!ok) throw new Error('mock checkout did not verify');
}

async function testStoreRoundTrip() {
  const store = getStore();
  const generationId = crypto.randomUUID();
  const owner = 'owner_' + crypto.randomUUID();

  await store.putDrafts({
    generationId,
    owner,
    drafts: [{ style: 'heartfelt', title: 'From the heart', text: 'round-trip check draft text' }],
    createdAt: Date.now(),
  });
  const draftRecord = await store.getDrafts(generationId);
  if (!draftRecord) throw new Error('getDrafts returned nothing after putDrafts');
  if (draftRecord.owner !== owner || draftRecord.drafts.length !== 1) {
    throw new Error('getDrafts returned a mismatched record');
  }

  const orderId = 'order_' + crypto.randomUUID();
  await store.putOrder({
    orderId,
    planId: 'unlock',
    amount: PLANS.unlock.amount,
    currency: PLANS.unlock.currency,
    generationId,
    owner,
    createdAt: Date.now(),
  });
  const orderRecord = await store.getOrder(orderId);
  if (!orderRecord || orderRecord.generationId !== generationId) {
    throw new Error('getOrder returned a mismatched record after putOrder');
  }
}

async function seedOrder(owner: string) {
  const store = getStore();
  const plan = PLANS.unlock;
  const generationId = crypto.randomUUID();
  const orderId = 'order_' + crypto.randomUUID();
  const paymentId = 'pay_' + crypto.randomUUID();
  await store.putOrder({
    orderId,
    planId: 'unlock',
    amount: plan.amount,
    currency: plan.currency,
    generationId,
    owner,
    createdAt: Date.now(),
  });
  return { generationId, orderId, paymentId };
}

async function testSingleUseEntitlement() {
  const store = getStore();
  const plan = PLANS.unlock;
  const owner = 'owner_' + crypto.randomUUID();

  const { generationId, orderId, paymentId } = await seedOrder(owner);
  const grantInput = {
    generationId,
    owner,
    orderId,
    paymentId,
    plan: 'unlock',
    expectedAmount: plan.amount,
    expectedCurrency: plan.currency,
  };

  const granted = await store.grantEntitlement(grantInput);
  if (granted !== 'granted') throw new Error(`expected granted, got ${granted}`);

  const repeat = await store.grantEntitlement(grantInput);
  if (repeat !== 'granted') throw new Error(`repeat call with the same triple should be idempotent, got ${repeat}`);

  const entitled = await store.isEntitled(generationId);
  if (!entitled) throw new Error('generationId should be entitled after grantEntitlement');

  const replay = await store.grantEntitlement({ ...grantInput, generationId: crypto.randomUUID() });
  if (replay !== 'replay') throw new Error(`expected replay for a reused payment, got ${replay}`);

  const wrongAmount = await seedOrder(owner);
  const amountMismatch = await store.grantEntitlement({
    generationId: wrongAmount.generationId,
    owner,
    orderId: wrongAmount.orderId,
    paymentId: wrongAmount.paymentId,
    plan: 'unlock',
    expectedAmount: plan.amount + 1,
    expectedCurrency: plan.currency,
  });
  if (amountMismatch !== 'amount_mismatch') {
    throw new Error(`expected amount_mismatch for a wrong expected amount, got ${amountMismatch}`);
  }

  const wrongOwner = await seedOrder(owner);
  const ownerMismatch = await store.grantEntitlement({
    generationId: wrongOwner.generationId,
    owner: 'someone-else',
    orderId: wrongOwner.orderId,
    paymentId: wrongOwner.paymentId,
    plan: 'unlock',
    expectedAmount: plan.amount,
    expectedCurrency: plan.currency,
  });
  if (ownerMismatch !== 'owner_mismatch') {
    throw new Error(`expected owner_mismatch for a wrong owner, got ${ownerMismatch}`);
  }
}

async function testWebhook() {
  const store = getStore();
  const owner = 'owner_' + crypto.randomUUID();
  const { generationId, orderId, paymentId } = await seedOrder(owner);

  const captured = await webhookHandler(
    new Request('http://localhost/api/webhook/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'mock-signature-in-dev' },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
      }),
    }),
  );
  const capturedJson = await captured.json();
  if (!capturedJson.ok) {
    throw new Error(`expected the webhook to grant entitlement, got ${JSON.stringify(capturedJson)}`);
  }

  const entitled = await store.isEntitled(generationId);
  if (!entitled) throw new Error('generationId should be entitled after the webhook fires');

  const ignored = await webhookHandler(
    new Request('http://localhost/api/webhook/razorpay', {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'mock-signature-in-dev' },
      body: JSON.stringify({ event: 'payment.failed', payload: {} }),
    }),
  );
  const ignoredJson = await ignored.json();
  if (!ignoredJson.ignored) throw new Error('an unhandled webhook event should be acknowledged and ignored');
}

async function testMockTts() {
  const provider = getTtsProvider();
  const result = await provider.synthesize('A short rehearsal line to time.');
  if (!result.mock) throw new Error('expected the active TTS provider to be the mock');
  if (result.audioUrl !== null) throw new Error('mock TTS must not produce a real audio URL');
  if (!(result.durationSec > 0)) throw new Error('mock TTS must estimate a positive duration');
}

async function main() {
  await testSpeechAndCheckout();
  await testStoreRoundTrip();
  await testSingleUseEntitlement();
  await testWebhook();
  await testMockTts();

  console.log('SMOKE-OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
