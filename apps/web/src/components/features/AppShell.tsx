'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, Scale, BookOpen, BarChart2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRoleStore } from '@/store/role-store';
import { useUiStore } from '@/store/ui-store';
import { RoleSwitcher } from '@/components/molecules/RoleSwitcher';
import { ThemeToggle } from '@/components/molecules/ThemeToggle';
import { GlobalSearch } from '@/components/molecules/GlobalSearch';
import { KeyboardShortcutsOverlay } from '@/components/molecules/KeyboardShortcutsOverlay';

const NAV_ITEMS = [
  { href: '/queue', icon: List, label: 'Queue', roles: ['scrutiny_officer', 'senior_reviewer', 'rule_admin', 'auditor'] },
  { href: '/rules', icon: BookOpen, label: 'Rules', roles: ['rule_admin', 'auditor', 'scrutiny_officer'] },
  { href: '/ledger', icon: Scale, label: 'Ledger', roles: ['auditor', 'senior_reviewer', 'scrutiny_officer'] },
  { href: '/metrics', icon: BarChart2, label: 'Metrics', roles: ['auditor', 'senior_reviewer', 'scrutiny_officer'] },
  { href: '/demo', icon: Play, label: 'Demo', roles: ['scrutiny_officer', 'senior_reviewer', 'rule_admin', 'auditor', 'applicant'] },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRoleStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const sidebarWidth = sidebarCollapsed ? 52 : 180;

  return (
    <div style={{ display:'flex',height:'100vh',overflow:'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          background:'var(--color-surface)',
          borderRight:'1px solid var(--color-border)',
          display:'flex',
          flexDirection:'column',
          transition:'width 150ms ease, min-width 150ms ease',
          overflow:'hidden',
        }}
        aria-label="Main navigation"
      >
        <div style={{ display:'flex',alignItems:'center',justifyContent: sidebarCollapsed ? 'center' : 'space-between',padding:'12px 12px',height:48,borderBottom:'1px solid var(--color-border)' }}>
          {!sidebarCollapsed && (
            <Link href="/queue" style={{ textDecoration:'none' }}>
              <span style={{ fontSize:13,fontWeight:700,color:'var(--color-ok)',letterSpacing:'0.02em' }}>EvidenceGraph</span>
            </Link>
          )}
          <button onClick={toggleSidebar} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--color-text-muted)',padding:2 }} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <nav style={{ flex:1,padding:'8px 6px',display:'flex',flexDirection:'column',gap:2 }}>
          {role === 'applicant' ? (
            <NavLink href="/self-check/INTK-2026-0229" icon={List} label="Self-Check" active={pathname.startsWith('/self-check')} collapsed={sidebarCollapsed} />
          ) : (
            NAV_ITEMS.filter((n) => (n.roles as readonly string[]).includes(role)).map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} active={pathname.startsWith(item.href)} collapsed={sidebarCollapsed} />
            ))
          )}
        </nav>
        <div style={{ padding:'8px 6px',borderTop:'1px solid var(--color-border)' }}>
          {!sidebarCollapsed && (
            <div style={{ fontSize:10,color:'var(--color-text-faint)',padding:'4px 6px' }}>
              EvidenceGraph · Prototype · Not for production
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
        {/* Top bar */}
        <header style={{ height:48,display:'flex',alignItems:'center',gap:8,padding:'0 16px',background:'var(--color-surface)',borderBottom:'1px solid var(--color-border)',flexShrink:0 }}>
          <div style={{ flex:1 }} />
          <GlobalSearch />
          <ThemeToggle />
          <RoleSwitcher />
        </header>

        {/* Content */}
        <main style={{ flex:1,overflow:'auto' }}>
          {children}
        </main>
      </div>
      <KeyboardShortcutsOverlay />
    </div>
  );
}

function NavLink({ href, icon: Icon, label, active, collapsed }: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display:'flex',
        alignItems:'center',
        gap:8,
        padding: collapsed ? '8px 10px' : '8px 10px',
        borderRadius:6,
        textDecoration:'none',
        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
        background: active ? 'var(--color-raised)' : 'transparent',
        transition:'background 150ms ease, color 150ms ease',
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow:'hidden',
        whiteSpace:'nowrap',
      }}
      title={collapsed ? label : undefined}
    >
      <Icon size={16} />
      {!collapsed && <span style={{ fontSize:13 }}>{label}</span>}
    </Link>
  );
}
