import { fmtSla } from '@/lib/format';

interface SlaChipProps {
  hoursLeft: number;
}

export function SlaChip({ hoursLeft }: SlaChipProps) {
  const color =
    hoursLeft < 0
      ? 'var(--color-alert)'
      : hoursLeft < 4
        ? 'var(--color-alert)'
        : hoursLeft < 24
          ? 'var(--color-validity)'
          : 'var(--color-text-muted)';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        fontSize: '12px',
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderRadius: 4,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {fmtSla(hoursLeft)}
    </span>
  );
}
