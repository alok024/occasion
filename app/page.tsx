import Link from 'next/link';

const occasions = ['Wedding', 'Toast', 'Vows', 'Eulogy', 'Anniversary'];

const testimonials = [
  {
    quote: 'I had two days and no idea where to start. Ten minutes here and I had a best-man speech that made the whole room laugh, then go quiet.',
    who: 'Marcus, best man',
  },
  {
    quote: 'The eulogy for my father felt impossible to write. This gave me the words I could not find, in my own voice.',
    who: 'Priya, daughter',
  },
  {
    quote: 'Four different takes meant I could pick the one that actually sounded like me. Worth every cent.',
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
          <span className="eyebrow">Speeches that land</span>
          <h1>
            The perfect speech, <span className="gradient-text">when it matters most</span>
          </h1>
          <p className="lead">
            Answer a few questions about the person and the moment. Occasion writes you four
            polished, ready-to-read speeches in seconds — heartfelt, story-driven, funny, and short.
            Pick the one that sounds like you.
          </p>
          <div className="row" style={{ justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
            <Link href="/write" className="btn lg">Write my speech</Link>
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
          <h2>From blank page to standing ovation</h2>
        </div>
        <div className="grid cols-3" style={{ marginTop: 28 }}>
          <div className="card">
            <h3>1. Tell us the moment</h3>
            <p className="muted">Who is speaking, who it is for, the tone you want, and a few real memories.</p>
          </div>
          <div className="card">
            <h3>2. Get four drafts</h3>
            <p className="muted">Four distinct angles built from your details — not templates, not filler.</p>
          </div>
          <div className="card">
            <h3>3. Make it yours</h3>
            <p className="muted">Copy, tweak a line or two, and print. You will sound like the best version of you.</p>
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
              <span className="amt">$0</span>
            </div>
            <ul className="pill-list">
              <li>Answer the full questionnaire</li>
              <li>Read your first complete draft</li>
              <li>See how good it really is before you pay</li>
            </ul>
            <Link href="/write" className="btn secondary" style={{ width: '100%' }}>Try it free</Link>
          </div>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <span className="badge warn">Best value</span>
            <div className="price" style={{ marginTop: 14 }}>
              <span className="amt">$24</span>
              <span className="muted">one-time</span>
            </div>
            <ul className="pill-list">
              <li>Unlock all four full drafts</li>
              <li>Heartfelt, story-driven, funny, and short</li>
              <li>Copy, download, and print — yours to keep</li>
            </ul>
            <Link href="/write" className="btn" style={{ width: '100%' }}>Write my speech</Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          Occasion — the perfect speech, when it matters most. Built for weddings, toasts, vows,
          eulogies, and every moment in between.
        </div>
      </footer>
    </main>
  );
}
