# Occasion — wedding, toast & eulogy speech writer

[![CI](https://github.com/alok024/occasion/actions/workflows/ci.yml/badge.svg)](https://github.com/alok024/occasion/actions/workflows/ci.yml) [![Deploy](https://github.com/alok024/occasion/actions/workflows/deploy.yml/badge.svg)](https://github.com/alok024/occasion/actions/workflows/deploy.yml)

The perfect speech, when it matters most. Answer a short questionnaire about the person
and the moment, and Occasion writes four polished, ready-to-read speeches — heartfelt,
story-driven, funny, and short-and-sweet — each built from the real names and memories you
provide. The first draft is free; unlocking all four is a one-time $24 purchase.

Built with Next.js 15 (App Router) + React 18. Text generation via Groq
(`llama-3.3-70b-versatile`); payments via Razorpay. Both providers have a keyless mock mode,
so the entire product builds and its core flow works locally with no API keys.

## What it does

- **Landing page** (`/`): hero, occasion chips, testimonial row, pricing, and a Start button.
- **Writer** (`/write`): a questionnaire (occasion, speaker, honoree, relationship, tone,
  up to four memories, length). Generate produces four drafts; the first is shown in full as a
  free preview, the other three are withheld behind a server-side gate.
- **Server-side content gate**: `/api/generate` composes all four drafts, stores them in an
  in-memory map keyed by a `generationId`, and returns only the preview plus a locked count.
  The remaining drafts are never sent to the browser until `/api/unlock` confirms a verified
  purchase. Blurring three placeholder cards is only cosmetic — the real text never leaves the
  server unpaid.

## Run locally (zero API keys)

```bash
npm install
npm run build     # production build — must exit 0
npm run smoke     # generates 4 drafts + runs a mock checkout — prints SMOKE-OK
```

To run the dev server: `npm run dev`, then open http://localhost:3000. In mock mode the
speeches are composed locally and the unlock flow completes with a visible "Test mode — no real
charge" note (no Razorpay modal, no charge).

## Pricing & the Razorpay flow

Plans (`lib/checkout.ts`, amounts in the smallest currency unit):

| Plan           | Amount    | Kind      | Unlocks                       |
| -------------- | --------- | --------- | ----------------------------- |
| `unlock`       | 2400 (¢)  | one-time  | All four full drafts ($24)    |
| `rewrite_pack` | 900 (¢)   | one-time  | An extra rewrite pack ($9)    |

Checkout flow (identical across products, mock-friendly):

1. Client `purchase('unlock')` → `POST /api/checkout/order` → `createCheckoutOrder`.
2. **Mock mode** (no keys): the order route also returns a precomputed `mock_payment`
   (`payment_id` + `signature`), so the browser finishes with no modal and no charge.
   **Real mode**: the client loads `checkout.razorpay.com/v1/checkout.js`, opens the Razorpay
   modal, and takes `razorpay_payment_id` + `razorpay_signature` from the handler.
3. Client `POST /api/unlock` with `{ generationId, order_id, payment_id, signature }`.
   The route calls `confirmPurchase` (HMAC-SHA256 signature verification); on success it returns
   the four drafts from the in-memory store. On failure it returns `{ ok: false }` and no drafts.

Because `RAZORPAY_MOCK` is true with no keys, `verifyPaymentSignature` accepts exactly the mock
signature the order route produced — so the order → verify → unlock loop closes locally and
proves the checkout end-to-end.

## Real cost-per-use math

- One order generates **4 drafts** at roughly **3–4k output tokens total** on Groq
  `llama-3.3-70b-versatile`.
- At Groq's llama-3.3-70b pricing (~$0.59 / 1M input, ~$0.79 / 1M output tokens), a full order
  costs **~$0.003** in model spend (a fraction of a cent).
- Sell price: **$24 one-time**. Razorpay fees aside, model cost is ~0.01% of revenue.
- **Gross margin ≈ 99.9%.**

The mock composer generates the same four drafts locally for free, so development and demos cost
nothing.

## Going live — real API keys needed

Set these in `.env.local` (see `.env.example` for the full list):

- `GROQ_API_KEY` — real speech generation (optionally `GROQ_MODEL`; or `OPENAI_API_KEY` +
  `OPENAI_MODEL` to use OpenAI instead).
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — live checkout (test keys
  `RAZORPAY_TEST_KEY_ID` / `RAZORPAY_TEST_KEY_SECRET` are also honored). Add
  `RAZORPAY_WEBHOOK_SECRET` only if you wire up the webhook.

The moment a real Groq key is present the app calls Groq; the moment real Razorpay keys are
present the browser opens the real checkout modal. No code changes — both branches already exist.

## Production note

The gate store (`lib/store.ts`) is an **in-memory Map that resets on server restart** and is not
shared across instances. For production, persist the generated drafts and the purchase
entitlement in a database (e.g. Supabase) keyed by `generationId`, and gate `/api/unlock` on a
stored, verified entitlement rather than on process memory.
