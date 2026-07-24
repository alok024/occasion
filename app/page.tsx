import Link from 'next/link';

const occasions = ['Eulogy', 'Memorial', 'Wedding', 'Toast', 'Vows', 'Anniversary'];

const testimonials = [
  {
    quote: 'The eulogy for my father felt impossible to write. This gave me the words I could not find, in my own voice.',
    who: 'Priya, daughter',
  },
  {
    quote: 'I had two days and no idea where to start. Ten minutes here and I had a best-man speech that made the whole room laugh, then go quiet.',
    who: 'Marcus, best man',
  },
  {
    quote: 'Four different takes meant I could pick the one that actually sounded like me. Worth every rupee.',
    who: 'Dana, maid of honor',
  },
];

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="brand">
          <span className="dot" />
          Occasion
        </div>
        <Link href="/write" className="btn secondary">Start writing</Link>
      </nav>

      <section className="container">
        <div className="hero">
          <span className="eyebrow">Eulogies, memorials, and toasts</span>
          <h1>
            The eulogy you do not know how to start, <span className="gradient-text">finished in minutes</span>
          </h1>
          <p className="lead">
            Answer a few gentle questions about the person and the moment. Occasion writes you
            four complete, ready-to-read eulogies — heartfelt, story-driven, light, and brief —
            then hands you a full delivery kit so you can stand up and say it steady. Works just
            as well for the wedding toast or vow you have been putting off.
          </p>
          <div className="row" style={{ justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
            <Link href="/write" className="btn lg">Write my eulogy</Link>
          </div>
          <div style={{ marginTop: 18 }}>
            {occasions.map((o) => (
              <span key={o} className="badge" style={{ margin: '4px' }}>{o}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="grid cols-3">
          {testimonials.map((t) => (
            <div key={t.who} className="card">
              <p style={{ margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>
              <p className="muted" style={{ marginBottom: 0, marginTop: 14, fontWeight: 600 }}>{t.who}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="center">
          <span className="eyebrow">How it works</span>
          <h2>From blank page to ready to speak</h2>
        </div>
        <div className="grid cols-3" style={{ marginTop: 28 }}>
          <div className="card">
            <h3>1. Tell us about them</h3>
            <p className="muted">Who they were, who is speaking, the tone you want, and a few real memories.</p>
          </div>
          <div className="card">
            <h3>2. Get four drafts</h3>
            <p className="muted">Four distinct angles built from your details — not templates, not filler.</p>
          </div>
          <div className="card">
            <h3>3. Make it yours, and practice it</h3>
            <p className="muted">Copy, tweak a line or two, then rehearse with the delivery kit until you can say it steady.</p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="center">
          <span className="eyebrow">Say it steady</span>
          <h2>The delivery kit comes with every unlock</h2>
        </div>
        <div className="grid cols-2" style={{ marginTop: 28, maxWidth: 760, margin: '28px auto 0' }}>
          <div className="card">
            <h3>Teleprompter</h3>
            <p className="muted">A clean, large-type scroll so you can read hands-free and keep your eyes on the room.</p>
          </div>
          <div className="card">
            <h3>Timed read</h3>
            <p className="muted">Know exactly how long it runs out loud, so two minutes never turns into ten.</p>
          </div>
          <div className="card">
            <h3>Pronunciation guide</h3>
            <p className="muted">Names and unfamiliar words spelled out phonetically, so nothing trips you up at the podium.</p>
          </div>
          <div className="card">
            <h3>Voice rehearsal</h3>
            <p className="muted">Practice it out loud and hear it back before the day, so the first time is not in front of the room.</p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="center">
          <span className="eyebrow">Pricing</span>
          <h2>One speech, one price</h2>
        </div>
        <div className="grid cols-2" style={{ marginTop: 28, maxWidth: 760, margin: '28px auto 0' }}>
          <div className="card">
            <span className="badge">Free preview</span>
            <div className="price" style={{ marginTop: 14 }}>
              <span className="amt">Free</span>
            </div>
            <ul className="pill-list">
              <li>Answer the full questionnaire</li>
              <li>See the complete structure for all four drafts</li>
              <li>Read one full, polished opening before you pay</li>
            </ul>
            <Link href="/write" className="btn secondary" style={{ width: '100%' }}>Try it free</Link>
          </div>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <span className="badge warn">Full speech + delivery kit</span>
            <div className="price" style={{ marginTop: 14 }}>
              <span className="amt">One price</span>
              <span className="muted">one-time, INR</span>
            </div>
            <ul className="pill-list">
              <li>Unlock all four full drafts</li>
              <li>Teleprompter, timed read, and pronunciation guide</li>
              <li>Voice rehearsal, download, and print — yours to keep</li>
            </ul>
            <Link href="/write" className="btn" style={{ width: '100%' }}>Write my speech</Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          Occasion — help finding the words for the eulogy, toast, or vow you have to give, and
          the delivery kit to help you say them steady.
        </div>
      </footer>
    </main>
  );
}
