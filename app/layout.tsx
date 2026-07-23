import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Occasion — Wedding, Toast & Eulogy Speech Writer',
  description: 'The perfect speech, when it matters most. Answer a few questions and get four polished, ready-to-read speech drafts in seconds.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
