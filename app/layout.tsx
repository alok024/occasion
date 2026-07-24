import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Occasion — Eulogy & Memorial Speech Writer',
  description: 'Answer a few gentle questions about the person and the moment, and Occasion writes four ready-to-read eulogies plus a full delivery kit — teleprompter, timed read, and pronunciation guide — so you can stand up and say it steady. Also built for wedding toasts and vows.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
