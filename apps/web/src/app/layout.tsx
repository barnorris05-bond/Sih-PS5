import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/AppShell';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'EvidenceGraph',
  description: 'AICTE document verification — prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `try{var t=localStorage.getItem('eg-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}`;
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <head>
        {/* Applied pre-paint: light is the default every first visit (3.3). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
