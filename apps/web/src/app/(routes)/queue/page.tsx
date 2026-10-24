import { QueueTable } from '@/components/features/QueueTable';

export default function QueuePage() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          Application Queue
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Applications sorted by triage score. Click a row to open the workspace.
        </p>
      </div>
      <QueueTable />
    </div>
  );
}
