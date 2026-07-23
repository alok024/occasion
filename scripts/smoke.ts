import { generateSpeeches } from '../lib/speech';
import { createCheckoutOrder, confirmPurchase } from '../lib/checkout';

async function main() {
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
  // Content must actually weave in the inputs, not echo the prompt.
  if (!s.drafts.some((d) => d.text.includes('Sam') && d.text.includes('Alex'))) {
    throw new Error('drafts do not reference the names');
  }

  const order = await createCheckoutOrder('unlock');
  if (!order.mock_payment) throw new Error('expected a mock payment in keyless mode');
  const ok = confirmPurchase(order.order_id, order.mock_payment.payment_id, order.mock_payment.signature);
  if (!ok) throw new Error('mock checkout did not verify');

  console.log('SMOKE-OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
