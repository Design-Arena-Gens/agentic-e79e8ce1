export const metadata = {
  title: 'Agentic Assistant',
  description: 'WebLLM-powered assistant deployed on Vercel',
};

import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
