interface ConfidenceBarProps {
  value: number; // 0..1
  threshold?: number; // optional; below = alert color
  showLabel?: boolean;
  height?: number;
}

export function ConfidenceBar({ value, threshold = 0.7, showLabel, height = 4 }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const isLow = value < threshold;
  const color = isLow ? 'var(--color-alert)' : value > 0.9 ? 'var(--color-verified)' : 'var(--color-accent)';

  return (
    <span className="inline-flex items-center gap-1.5" style={{ minWidth: 80 }}>
      <span
        style={{
          display: 'inline-block',
          width: 60,
          height,
          backgroundColor: 'var(--color-border)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 200ms ease',
          }}
        />
      </span>
      {showLabel && (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {pct}%
        </span>
      )}
    </span>
  );
}
