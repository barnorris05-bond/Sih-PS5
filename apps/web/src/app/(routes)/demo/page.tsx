import { DemoBar } from '@/components/features/DemoBar';
import Link from 'next/link';

export default function DemoPage() {
  return (
    <div style={{ padding: 24, paddingBottom: 80 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginTop: 0 }}>Demo Presenter View</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 600, lineHeight: 1.6 }}>
        Use the beat chips at the bottom to walk through the 6-minute demo script. Arrow keys navigate between beats.
      </p>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20, marginTop: 20, maxWidth: 600 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Real vs Simulated</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Component', 'Real', 'Simulated'].map((h) => (
                <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Rules + Critic', 'YAML evaluation, schemas, evidence and wording checks', '—'],
              ['Cross-checks', 'Deterministic rules and graph overlap', '—'],
              ['Ledger', 'SHA-256 hash chain with demo HMAC digest', '—'],
              ['OCR, vision, language model', '—', 'Synthetic fixture output'],
              ['External connectors', '—', 'Mock records and retry behavior'],
              ['Neo4j + Qdrant', '—', 'In-memory graph and similarity fixtures'],
              ['Document pages + crops', '—', 'Synthetic SVG pages and crop references'],
              ['Metrics', 'Computed from deterministic fixture data', '—'],
            ].map(([comp, real, sim]) => (
              <tr key={comp as string} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '7px 12px', color: 'var(--color-text)' }}>{comp}</td>
                <td style={{ padding: '7px 12px', color: 'var(--color-verified)', fontSize: 11 }}>{real}</td>
                <td style={{ padding: '7px 12px', color: 'var(--color-validity)', fontSize: 11 }}>{sim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Links</h3>
        {[
          ['/queue', 'Application Queue'],
          ['/applications/EOA-2026-0142/evidence', 'Vikramsheela — Evidence split-view'],
          ['/applications/INTK-2026-0208/graph', 'Silverleaf — Entity graph (ghost faculty)'],
          ['/applications/NEW-2026-0058/forensics', 'Devanhalli — Prompt injection signal'],
          ['/rules', 'Rules Administration'],
          ['/ledger', 'Audit Ledger'],
          ['/metrics', 'Metrics Dashboard'],
        ].map(([href, label]) => (
          <Link key={href as string} href={href as string} style={{ fontSize: 13, color: 'var(--color-accent)', textDecoration: 'none' }}>→ {label as string}</Link>
        ))}
      </div>

      <DemoBar />
    </div>
  );
}
