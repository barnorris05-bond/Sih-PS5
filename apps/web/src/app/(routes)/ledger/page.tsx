import { LedgerTable } from '@/components/features/LedgerTable';

export default function LedgerPage() {
  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Audit Ledger</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Hash-chained. Any tampered row breaks the chain from that row forward.</p>
      </div>
      <LedgerTable />
    </div>
  );
}
