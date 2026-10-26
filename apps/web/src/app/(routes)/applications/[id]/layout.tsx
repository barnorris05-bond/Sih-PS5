import { getSummary, getCaseHeader } from '@/.data/store';
import { ApplicationTabs } from '@/components/features/ApplicationTabs';
import { notFound } from 'next/navigation';

export default async function ApplicationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const summary = getSummary(id);
  if (!summary) notFound();
  const header = getCaseHeader(id) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{id}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
            {summary.institution.category} · {summary.institution.region}
          </span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 12px' }}>
          {summary.institution.name}
        </h2>
        <ApplicationTabs id={id} header={header} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
