'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getTtsProvider, type TtsResult } from '@/lib/tts';

interface Draft {
  style: string;
  title: string;
  text: string;
}

interface DeliveryKitProps {
  drafts: Draft[];
  honoree: string;
}

const WORDS_PER_MINUTE = 130;
const SWEET_SPOT_MIN_SEC = 3 * 60;
const SWEET_SPOT_MAX_SEC = 5 * 60;
const TELEPROMPTER_PX_PER_SEC = 22;

const CAPITALIZED_STOPWORDS = new Set([
  'The', 'This', 'That', 'They', 'Their', 'There', 'When', 'What', 'With',
  'From', 'Today', 'Here', 'Every', 'Some', 'Once', 'Then', 'And', 'But',
  'For', 'She', 'Her', 'His', 'Him', 'You', 'Your', 'Our', 'We', 'Now',
]);

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatMinSec(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function extractPronunciationList(text: string, honoree: string): string[] {
  const found = new Set<string>();
  honoree
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z'-]/g, ''))
    .filter((part) => part.length > 1)
    .forEach((part) => found.add(part));

  const matches = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  matches.forEach((m) => {
    if (!CAPITALIZED_STOPWORDS.has(m)) found.add(m);
  });

  return Array.from(found).slice(0, 12);
}

export default function DeliveryKit({ drafts, honoree }: DeliveryKitProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const draft = drafts[activeIdx] ?? drafts[0] ?? null;

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setRunning(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeIdx]);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();

    function tick(now: number) {
      const el = scrollRef.current;
      const dt = (now - last) / 1000;
      last = now;
      if (el) {
        el.scrollTop += TELEPROMPTER_PX_PER_SEC * speed * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setRunning(false);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [running, speed]);

  const words = useMemo(() => (draft ? wordCount(draft.text) : 0), [draft]);
  const seconds = (words / WORDS_PER_MINUTE) * 60;
  const inSweetSpot = seconds >= SWEET_SPOT_MIN_SEC && seconds <= SWEET_SPOT_MAX_SEC;

  const pronunciationList = useMemo(
    () => (draft ? extractPronunciationList(draft.text, honoree) : []),
    [draft, honoree]
  );

  const [rehearsing, setRehearsing] = useState(false);
  const [rehearsal, setRehearsal] = useState<TtsResult | null>(null);

  async function rehearse() {
    if (!draft) return;
    setRehearsing(true);
    setRehearsal(null);
    try {
      const provider = getTtsProvider();
      const result = await provider.synthesize(draft.text, { rate: speed });
      setRehearsal(result);
    } finally {
      setRehearsing(false);
    }
  }

  if (!draft) return null;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="center" style={{ marginBottom: 20 }}>
        <span className="eyebrow">Delivery kit</span>
        <h2>Rehearse it before the day</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Reading it well matters as much as writing it well. Practice with the teleprompter,
          check your timing, and get every name right.
        </p>
      </div>

      {drafts.length > 1 && (
        <div className="row" style={{ marginBottom: 16 }}>
          {drafts.map((d, i) => (
            <button
              key={d.style}
              className={i === activeIdx ? 'btn secondary' : 'btn ghost'}
              onClick={() => setActiveIdx(i)}
              style={{ flex: '0 0 auto' }}
            >
              {d.title}
            </button>
          ))}
        </div>
      )}

      <div className="grid cols-2">
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Timed read</h3>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, margin: '4px 0' }}>{formatMinSec(seconds)}</p>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: 0 }}>
            This is {formatMinSec(seconds)} at a slow, steady pace ({words} words) — the funeral
            sweet spot is {SWEET_SPOT_MIN_SEC / 60}-{SWEET_SPOT_MAX_SEC / 60} min.
          </p>
          <span className={`badge ${inSweetSpot ? 'ok' : 'warn'}`}>
            {inSweetSpot
              ? 'In the sweet spot'
              : seconds < SWEET_SPOT_MIN_SEC
                ? 'Room to add a memory or two'
                : 'Consider trimming a paragraph'}
          </span>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Voice rehearsal</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: 0 }}>
            Hear a rough read-through so the pacing is not a surprise on the day.
          </p>
          <button className="btn secondary" onClick={rehearse} disabled={rehearsing}>
            {rehearsing ? (
              <>
                <span className="spinner" /> Rendering…
              </>
            ) : (
              'Rehearse with voice'
            )}
          </button>
          {rehearsal && (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {rehearsal.mock
                ? `Preview only (${rehearsal.provider}) — about ${formatMinSec(rehearsal.durationSec)} at this pace.`
                : `Ready — ${formatMinSec(rehearsal.durationSec)}.`}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Teleprompter</h3>
          <div className="row" style={{ flex: '0 0 auto', gap: 8 }}>
            <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: 'auto' }}>
                <option value={0.6}>Slow</option>
                <option value={1}>Normal</option>
                <option value={1.4}>Fast</option>
              </select>
            </label>
            <button className="btn secondary" onClick={() => setRunning((r) => !r)}>
              {running ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          style={{
            height: 320,
            overflowY: 'auto',
            background: 'var(--bg-soft)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '24px 28px',
            fontSize: '1.6rem',
            lineHeight: 1.6,
            fontWeight: 600,
          }}
        >
          {draft.text.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {pronunciationList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Pronunciation guide</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginTop: 0 }}>
            Names and words from this draft — say each one out loud a couple of times before you
            read.
          </p>
          <div className="grid cols-3">
            {pronunciationList.map((word) => (
              <div key={word} className="badge" style={{ textAlign: 'center', padding: '8px 10px' }}>
                {word}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
