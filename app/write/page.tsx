'use client';

import { useState } from 'react';
import Link from 'next/link';
import DeliveryKit from './DeliveryKit';

interface Draft {
  style: string;
  title: string;
  text: string;
}

const OCCASIONS = [
  { value: 'eulogy', label: 'Eulogy / memorial' },
  { value: 'wedding-best-man', label: 'Wedding — best man' },
  { value: 'wedding-maid-of-honor', label: 'Wedding — maid of honor' },
  { value: 'wedding-parent', label: 'Wedding — parent of the bride/groom' },
  { value: 'vows', label: 'Wedding vows' },
  { value: 'toast', label: 'Toast (any celebration)' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'retirement', label: 'Retirement' },
];

const TONES = ['Heartfelt', 'Funny', 'Formal'];
const LENGTHS = ['short', 'medium', 'long'];

// Shared checkout client. Returns the verification tuple for the given plan.
// In mock mode (no Razorpay keys) the order route ships a precomputed mock payment,
// so the browser completes with no modal and no charge. With real keys the second
// branch loads the Razorpay modal. Both branches stay in the code.
async function purchase(
  planId: string,
  generationId: string,
  owner: string
): Promise<{ order_id: string; payment_id: string; signature: string }> {
  const res = await fetch('/api/checkout/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, generationId, owner }),
  });
  const order = await res.json();

  if (order.mock_payment) {
    return {
      order_id: order.order_id,
      payment_id: order.mock_payment.payment_id,
      signature: order.mock_payment.signature,
    };
  }

  // Real keys: load Razorpay checkout and open the modal.
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Occasion',
      description: order.label,
      handler: (r: any) => {
        resolve({
          order_id: order.order_id,
          payment_id: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        });
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}

export default function Write() {
  const [occasion, setOccasion] = useState(OCCASIONS[0].value);
  const [speaker, setSpeaker] = useState('');
  const [honoree, setHonoree] = useState('');
  const [relationship, setRelationship] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState('medium');
  const [anecdotes, setAnecdotes] = useState(['', '', '', '']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationId, setGenerationId] = useState('');
  const [owner, setOwner] = useState('');
  const [preview, setPreview] = useState<Draft | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [paymentMock, setPaymentMock] = useState(false);

  const [unlocking, setUnlocking] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  function setAnecdote(i: number, v: string) {
    setAnecdotes((prev) => prev.map((a, idx) => (idx === i ? v : a)));
  }

  async function generate() {
    setError('');
    if (!speaker.trim() || !honoree.trim()) {
      setError('Please fill in who is speaking and who the speech is for.');
      return;
    }
    setLoading(true);
    setPreview(null);
    setOutline([]);
    setDrafts(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion,
          speaker,
          honoree,
          relationship: relationship || 'friend',
          tone,
          length,
          anecdotes: anecdotes.map((a) => a.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Generation failed. Please try again.');
      setGenerationId(data.generationId);
      setOwner(data.owner);
      setPreview(data.preview);
      setOutline(Array.isArray(data.outline) ? data.outline : []);
      setLockedCount(data.lockedCount ?? 0);
      setPaymentMock(Boolean(data.paymentMock));
    } catch (e: any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function unlock() {
    setError('');
    setUnlocking(true);
    try {
      const pay = await purchase('unlock', generationId, owner);
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId,
          owner,
          order_id: pay.order_id,
          payment_id: pay.payment_id,
          signature: pay.signature,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) throw new Error(data.error || 'Could not verify the purchase. Please try again.');
      setDrafts(data.drafts);
    } catch (e: any) {
      setError(e.message || 'Unlock failed.');
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <main>
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="dot" />
          Occasion
        </Link>
        <Link href="/" className="btn ghost">Home</Link>
      </nav>

      <section className="container" style={{ paddingBottom: 64 }}>
        <div className="hero" style={{ padding: '40px 0 24px' }}>
          <span className="eyebrow">Write the eulogy</span>
          <h1>Say the words they deserve to hear</h1>
          <p className="lead">
            Answer a few questions about them and get a strong opening free. Unlocking adds the
            full eulogy plus a delivery kit built for the day — teleprompter, timed read, and a
            pronunciation guide.
          </p>
        </div>

        <div className="card">
          <div className="row">
            <div className="field">
              <label htmlFor="occasion">Occasion</label>
              <select id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="length">Length</label>
              <select id="length" value={length} onChange={(e) => setLength(e.target.value)}>
                {LENGTHS.map((l) => (
                  <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="speaker">Your name (the speaker)</label>
              <input id="speaker" type="text" value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="field">
              <label htmlFor="honoree">Who it is for</label>
              <input id="honoree" type="text" value={honoree} onChange={(e) => setHonoree(e.target.value)} placeholder="e.g. Sam" />
            </div>
            <div className="field">
              <label htmlFor="relationship">Your relationship to them</label>
              <input id="relationship" type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. best friend, sister, best man" />
            </div>
          </div>

          <div className="field">
            <label>Memories and anecdotes</label>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.9rem' }}>
              Two to four short, specific memories — a story only you would know, a habit you will
              miss, a moment that captures who they were.
            </p>
            {anecdotes.map((a, i) => (
              <textarea
                key={i}
                value={a}
                onChange={(e) => setAnecdote(i, e.target.value)}
                placeholder={`Memory ${i + 1}${i > 1 ? ' (optional)' : ''}`}
                style={{ minHeight: 70, marginBottom: 10 }}
              />
            ))}
          </div>

          {error && <p style={{ color: 'var(--err)', fontWeight: 600 }}>{error}</p>}

          <button className="btn lg" onClick={generate} disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" /> Writing your speech…</> : 'Generate my speech'}
          </button>
        </div>

        {preview && (
          <div style={{ marginTop: 40 }}>
            <div className="center" style={{ marginBottom: 24 }}>
              <span className="eyebrow">Your speech</span>
              <h2>{drafts ? 'Ready to deliver' : 'Your free preview'}</h2>
            </div>

            {!drafts && (
              <>
                <DraftCard draft={preview} badge="Free preview" />

                <div className="card" style={{ marginTop: 24, textAlign: 'center', borderColor: 'var(--accent)' }}>
                  <h3 style={{ marginBottom: 6 }}>Unlock the full eulogy</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {lockedCount > 0
                      ? `${lockedCount} more draft${lockedCount === 1 ? '' : 's'}, plus a delivery kit built for the day.`
                      : 'A delivery kit built for the day.'}
                  </p>

                  {outline.length > 0 && (
                    <ul className="pill-list" style={{ textAlign: 'left', maxWidth: 420, margin: '0 auto' }}>
                      {outline.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <button className="btn lg" onClick={unlock} disabled={unlocking} style={{ marginTop: 20, width: '100%', maxWidth: 360 }}>
                    {unlocking ? <><span className="spinner" /> Unlocking…</> : 'Unlock the full eulogy + delivery kit'}
                  </button>
                  <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                    {paymentMock
                      ? 'Test mode — no real charge. One-time payment, yours to keep.'
                      : 'One-time payment, yours to keep. Secure checkout via Razorpay.'}
                  </p>
                </div>
              </>
            )}

            {drafts && (
              <>
                {paymentMock && (
                  <p className="center">
                    <span className="badge ok">Test mode — no real charge</span>
                  </p>
                )}
                <div className="grid" style={{ marginTop: 12 }}>
                  {drafts.map((d, i) => (
                    <DraftCard key={d.style} draft={d} badge={`Draft ${i + 1}`} downloadable honoree={honoree} />
                  ))}
                </div>
                <DeliveryKit drafts={drafts} honoree={honoree} />
              </>
            )}
          </div>
        )}
      </section>

      <footer className="footer">
        <div className="container">Occasion — the words they deserve, delivered the way they deserve.</div>
      </footer>
    </main>
  );
}

function DraftCard({
  draft,
  badge,
  downloadable,
  honoree,
}: {
  draft: Draft;
  badge: string;
  downloadable?: boolean;
  honoree?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([draft.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = (honoree || 'speech').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.href = url;
    a.download = `${base}-${draft.style}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <span className="badge">{badge}</span>
          <h3 style={{ margin: '8px 0 0' }}>{draft.title}</h3>
        </div>
        <div className="row" style={{ flex: '0 0 auto' }}>
          <button className="btn secondary" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          {downloadable && <button className="btn secondary" onClick={download}>Download</button>}
        </div>
      </div>
      {draft.text.split('\n\n').map((para, i) => (
        <p key={i} style={{ marginTop: i === 0 ? 0 : undefined }}>{para}</p>
      ))}
    </div>
  );
}
