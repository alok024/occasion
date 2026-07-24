# Occasion — eulogy speech writer, with a delivery kit

[![CI](https://github.com/alok024/occasion/actions/workflows/ci.yml/badge.svg)](https://github.com/alok024/occasion/actions/workflows/ci.yml) [![Deploy](https://github.com/alok024/occasion/actions/workflows/deploy.yml/badge.svg)](https://github.com/alok024/occasion/actions/workflows/deploy.yml)

The eulogy you do not know how to start, finished in minutes. Answer a short questionnaire about
the person and the moment, and Occasion writes four complete, ready-to-read eulogies — heartfelt,
story-driven, light, and brief — each built from the real names and memories you provide. Unlock
all four drafts and you also get the full delivery kit: a teleprompter, a timed read-through, and
a pronunciation guide, so you can stand up and say it steady. Works just as well for the wedding
toast or vow you have been putting off.

Built with Next.js 15 (App Router) + React 18. Text generation via Groq (model set by
`GROQ_MODEL`, now that the old default, `llama-3.3-70b-versatile`, is being decommissioned; falls
back to OpenAI on a timeout or an empty completion); payments via Razorpay. Both providers have a
keyless mock mode, so the entire product builds and its core flow works locally with no API keys.

## What it does

- **Landing page** (`/`): eulogy-first hero, occasion chips (eulogy and memorial first, then
  wedding, toast, vows, and anniversary), testimonial row, the delivery kit, pricing, and a Start
  button.
- **Writer** (`/write`): a questionnaire (occasion, speaker, honoree, relationship, tone, up to
  four memories, length) that works for a eulogy, a wedding toast, or a vow. Generate produces
  four drafts; the free preview shows the full structure plus one complete opening, the rest are
  withheld behind a server-side gate.
- **Server-side content gate**: `/api/generate` composes all four drafts and stores them via the
  store interface (`lib/store.ts`) keyed by a `generationId`, returning only the preview plus a
  locked count. The remaining drafts and the delivery kit are never sent to the browser until
  `/api/unlock` confirms a verified purchase. Blurring three placeholder cards is only cosmetic —
  the real text never leaves the server unpaid.

## Run locally (zero API keys)

```bash
npm install
npm run build     # production build — must exit 0
npm run smoke     # generates 4 drafts + runs a mock checkout — prints SMOKE-OK
```

To run the dev server: `npm run dev`, then open http://localhost:3000. In mock mode the
speeches are composed locally and the unlock flow completes with a visible "Test mode — no real
charge" note (no Razorpay modal, no charge), driven by the server's `isPaymentMock()` so the
frontend never hardcodes the disclaimer.

## Pricing & the Razorpay flow

Plan (`lib/checkout.ts`):

| Plan     | Currency | Kind     | Unlocks                                                                       |
| -------- | -------- | -------- | ------------------------------------------------------------------------------ |
| `unlock` | INR      | one-time | All four full drafts, plus the delivery kit (teleprompter, timed read, pronunciation guide, voice rehearsal) |

There is exactly one paid plan now. The old `$24` unlock plus the separate `$9` rewrite-pack
add-on have been folded into this single INR price — see `PLANS.unlock.amount` in
`lib/checkout.ts` for the live figure. There is no rewrite pack purchase any more.

Checkout flow (identical across products, mock-friendly):

1. Client `purchase('unlock')` → `POST /api/checkout/order` → `createCheckoutOrder('unlock', {
   generationId })`. The `generationId` rides along in the order notes.
2. **Mock mode** (no keys): the order route also returns a precomputed `mock_payment`
   (`payment_id` + `signature`), so the browser finishes with no modal and no charge.
   **Real mode**: the client loads `checkout.razorpay.com/v1/checkout.js`, opens the Razorpay
   modal, and takes `razorpay_payment_id` + `razorpay_signature` from the handler.
3. Client `POST /api/unlock` with `{ generationId, order_id, payment_id, signature }`. The route
   reconstructs the purchase intent from the order's own record and notes (never from the
   client's claim), verifies the signature via `confirmPurchase` (HMAC-SHA256), checks the
   captured amount and currency against the plan, and consumes each `(order_id, payment_id)` pair
   once. On success it returns the four drafts and the delivery kit from the store; on failure it
   returns a structured error and no drafts.

Because `RAZORPAY_MOCK` is true with no keys, `verifyPaymentSignature` accepts exactly the mock
signature the order route produced — so the order → verify → unlock loop closes locally and
proves the checkout end-to-end. In production, Razorpay is fail-closed: with no live keys and
`RAZORPAY_MOCK` unset, checkout and webhook routes refuse to run rather than silently falling
back to mock behavior.

## Real cost-per-use math

- One order generates **4 drafts** at roughly **3–4k output tokens total**, plus the delivery kit
  (teleprompter, timed read, pronunciation guide) built from that same text.
- Token cost per order is a fraction of a cent on Groq, whichever current model `GROQ_MODEL`
  points at.
- Sell price: **one INR price** per unlock (see `PLANS.unlock` in `lib/checkout.ts`), covering all
  four drafts and the entire delivery kit. Razorpay fees aside, model spend is a rounding error
  against that price.
- **Gross margin stays north of 99%.**

The mock composer generates the same four drafts locally for free, so development and demos cost
nothing.

## Going live — real API keys needed

Set these in `.env.local` (see `.env.example` for the full list):

- `GROQ_API_KEY` — real speech generation. `GROQ_MODEL` selects the model — the old default,
  `llama-3.3-70b-versatile`, is being decommissioned, so point this at a current one.
  `OPENAI_API_KEY` + `OPENAI_MODEL` are used as an automatic failover on a Groq timeout or a
  blank completion.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — live checkout (test keys
  `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` are also honored). Add
  `RAZORPAY_WEBHOOK_SECRET` only if you wire up the webhook. In production, missing keys fail the
  request closed instead of silently continuing in mock mode.

The moment a real Groq key is present the app calls Groq; the moment real Razorpay keys are
present the browser opens the real checkout modal. No code changes — both branches already exist.

## Store & durability

The gate store (`lib/store.ts`) sits behind a durable store interface, keyed by `generationId`,
that holds both the generated drafts and the purchase entitlement:

- **Local dev (default, no store env vars set)**: an in-memory map, same as before — resets on
  restart, which is fine for `npm run build` / `npm run smoke` and local demos.
- **Production**: point the same interface at a real backend — Supabase or Upstash Redis (see
  `.env.example` for the adapter stub vars) — so drafts and entitlements survive restarts and are
  shared across serverless instances. `/api/unlock` gates on a stored, verified entitlement
  rather than on process memory.

`generationId` is a `crypto.randomUUID()` bound to an owner token issued alongside it, so only
the client that created a generation can unlock it.
