import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/features/AppShell';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'EvidenceGraph',
  description: 'AICTE document verification — prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
