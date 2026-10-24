'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { segment: 'overview', label: 'Overview' },
  { segment: 'evidence', label: 'Evidence' },
  { segment: 'conflicts', label: 'Conflicts' },
  { segment: 'forensics', label: 'Forensics' },
  { segment: 'verification', label: 'Verification' },
  { segment: 'graph', label: 'Graph' },
  { segment: 'pipeline', label: 'Pipeline' },
  { segment: 'letter', label: 'Letter' },
  { segment: 'decision', label: 'Decision' },
] as const;

export function ApplicationTabs({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: 0, overflowX: 'auto' }} role="tablist">
      {TABS.map((tab) => {
        const href = `/applications/${id}/${tab.segment}`;
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={tab.segment}
            href={href}
            role="tab"
            aria-selected={active}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'color 120ms ease, border-color 120ms ease',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
