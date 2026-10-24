'use client';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'));
  }, []);

  function toggle() {
    const html = document.documentElement;
    const goLight = isDark;
    html.classList.toggle('light', goLight);
    setIsDark(!goLight);
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--color-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        padding: '6px',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        transition: 'color 150ms ease',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
