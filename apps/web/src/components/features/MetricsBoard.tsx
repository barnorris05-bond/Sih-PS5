'use client';
import { useQuery } from '@tanstack/react-query';
import type { MetricBoard } from '@evidencegraph/domain';
import { useRoleStore } from '@/store/role-store';
import { Spinner } from '@/components/atoms/Spinner';
import { fmtPercent } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function MetricsBoard() {
  const { role } = useRoleStore();

  const { data: metrics, isLoading } = useQuery<MetricBoard>({
    queryKey: ['metrics'],
    queryFn: async () => {
      const res = await fetch('/api/metrics', { headers: { 'x-eg-role': role } });
      return res.json() as Promise<MetricBoard>;
    },
  });

  if (isLoading) return <div style={{ padding: 24, display: 'flex', gap: 8, color: 'var(--color-text-muted)' }}><Spinner />Loading metrics…</div>;
  if (!metrics) return null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
        Computed from the deterministic fixture set; no live services or applicant records are queried.
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Discrepancy Precision" value={fmtPercent(metrics.discrepancyPrecision)} color="var(--color-accent)" />
        <StatCard label="Discrepancy Recall" value={fmtPercent(metrics.discrepancyRecall)} color="var(--color-accent)" />
        <StatCard label="False Positive Rate" value={fmtPercent(metrics.falsePositiveRate)} color={metrics.falsePositiveRate === 0 ? 'var(--color-verified)' : 'var(--color-alert)'} note="High-severity on clean controls" />
        <StatCard label="Verification Coverage" value={fmtPercent(metrics.verificationCoverage)} color="var(--color-accent)" />
        <StatCard label="Explainability Coverage" value={fmtPercent(metrics.explainabilityCoverage)} color="var(--color-ok)" />
        <StatCard label="Avg Time / Application" value={`${metrics.avgTimePerApplicationMinutes.toFixed(1)}m`} color="var(--color-text-muted)" />
        <StatCard label="Alert Latency (median)" value={`${metrics.alertLatencySeconds.median.toFixed(1)}s`} color="var(--color-text-muted)" />
        <StatCard label="Alert Latency (p90)" value={`${metrics.alertLatencySeconds.p90.toFixed(1)}s`} color="var(--color-text-muted)" />
      </div>

      {/* Field accuracy chart */}
      {metrics.fieldAccuracyPerDocType.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field Extraction Accuracy by Document Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.fieldAccuracyPerDocType} margin={{ left: -10 }}>
              <XAxis dataKey="docType" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
              <Tooltip
                formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                contentStyle={{ background: 'var(--color-overlay)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}
              />
              <Bar dataKey="accuracy" radius={[3, 3, 0, 0]}>
                {metrics.fieldAccuracyPerDocType.map((entry, i) => (
                  <Cell key={i} fill={entry.accuracy > 0.9 ? '#3ddc97' : entry.accuracy > 0.7 ? '#5bc0eb' : '#f2555a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, note }: { label: string; value: string; color: string; note?: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
      {note && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>{note}</div>}
    </div>
  );
}
