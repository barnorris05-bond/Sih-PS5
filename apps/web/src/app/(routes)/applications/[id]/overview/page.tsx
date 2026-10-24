import { getSummary, getFindings, getSignalStrengths } from '@/.data/store';
import { notFound } from 'next/navigation';
import { FindingChip } from '@/components/atoms/FindingChip';
import { SlaChip } from '@/components/atoms/SlaChip';
import { ConfidenceBar } from '@/components/atoms/ConfidenceBar';
import type { FindingClass } from '@evidencegraph/domain';

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = getSummary(id);
  if (!summary) notFound();

  const findings = getFindings(id);
  const signalStrengths = getSignalStrengths();
  const openFindings = findings.filter((f) => f.status === 'open');

  const byClass = openFindings.reduce<Record<string, number>>((acc, f) => {
    acc[f.findingClass] = (acc[f.findingClass] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Institution info */}
      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Institution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <InfoRow label="AICTE ID" value={summary.institution.aicteId} mono />
          <InfoRow label="Trust Reg" value={summary.institution.trustRegNo} mono />
          <InfoRow label="Region" value={summary.institution.region} />
          <InfoRow label="Category" value={summary.institution.category} />
          <InfoRow label="Status" value={summary.status.replace(/_/g, ' ')} />
          <InfoRow label="SLA" value={<SlaChip hoursLeft={summary.slaHoursLeft} />} />
        </div>
      </section>

      {/* Triage score */}
      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Triage Assessment</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-mono)', color: summary.triageScore > 70 ? 'var(--color-alert)' : summary.triageScore > 40 ? 'var(--color-validity)' : 'var(--color-verified)' }}>
              {summary.triageScore}
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 4 }}>/100</span>
          </div>
          <ConfidenceBar value={summary.triageScore / 100} threshold={0.4} height={8} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {summary.triageReasons.map((r, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--color-border-strong)' }}>▸</span>
              {r}
            </div>
          ))}
        </div>
      </section>

      {/* Open findings by class */}
      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Findings ({openFindings.length})</h3>
        {openFindings.length === 0 ? (
          <div style={{ color: 'var(--color-verified)', fontSize: 13 }}>No open findings — application appears compliant.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(byClass) as [FindingClass, number][]).map(([cls, n]) => (
              <FindingChip key={cls} findingClass={cls} label={`${n} ${cls.replace(/_/g, ' ')}`} strength={signalStrengths[cls] as 'weak' | 'medium' | 'strong' | undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
    </div>
  );
}
