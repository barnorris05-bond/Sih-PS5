import { RulesAdmin } from '@/components/features/RulesAdmin';

export default function RulesPage() {
  return (
    <div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Rules Administration</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>YAML rule pack — APH 2024-27</p>
      </div>
      <RulesAdmin />
    </div>
  );
}
