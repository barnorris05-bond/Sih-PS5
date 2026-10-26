'use client';
import { Sun, Moon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Physical theme toggle (3.3): 56×28 pill, sun left / moon right, thumb slides
 * by transform. Light is the default first visit; choice persists to
 * localStorage ("eg-theme"). data-theme is applied pre-paint by the inline
 * head script in layout.tsx, so this component only mirrors and toggles it.
 * Theme swap uses the View Transitions API circular reveal from the toggle
 * when supported, falls back to an instant swap (CSS colour transition keeps
 * it smooth); reduced-motion users get an instant swap.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false); // agree with the SSR default (light) to avoid hydration mismatch

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);

  const apply = useCallback((next: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('eg-theme', next);
    } catch {
      /* private mode — theme stays session-only */
    }
    setDark(next === 'dark');
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = dark ? 'light' : 'dark';
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reduced) {
      // Circular reveal expanding from the toggle.
      const x = event.clientX;
      const y = event.clientY;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      doc.startViewTransition(() => apply(next)).ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      });
    } else {
      apply(next);
    }
  }

  return (
    <button
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className="eg-theme-toggle"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 56,
        height: 28,
        padding: '0 6px',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 999,
        background: 'var(--color-raised)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.12)',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
      }}
    >
      <Sun size={13} style={{ zIndex: 1 }} />
      {/* thumb: slides by transform only */}
      <span
        aria-hidden
        className="eg-theme-thumb"
        style={{
          position: 'absolute',
          top: 2,
          left: dark ? 30 : 2,
          width: 22,
          height: 22,
          borderRadius: 999,
          background: dark ? 'var(--color-surface)' : 'var(--color-surface)',
          border: '1px solid var(--color-border-strong)',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
          transform: dark ? 'translateX(2px)' : 'translateX(0)',
          transition: 'left 220ms cubic-bezier(0.2, 0, 0, 1), transform 220ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      />
      <Moon size={13} style={{ zIndex: 1 }} />
      <span className="sr-only">{dark ? 'Dark theme is on' : 'Light theme is on'}</span>
    </button>
  );
}
