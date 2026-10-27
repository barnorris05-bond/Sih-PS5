'use client';
import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { ApplicationSummary } from '@evidencegraph/domain';
import { useRoleStore } from '@/store/role-store';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { role } = useRoleStore();

  const { data: summaries } = useQuery<ApplicationSummary[]>({
    queryKey: ['applications', role],
    queryFn: async () => {
      const res = await fetch('/api/applications', { headers: { 'x-eg-role': role } });
      return res.json() as Promise<ApplicationSummary[]>;
    },
    enabled: open,
  });

  const handleOpen = useCallback(() => setOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); handleOpen(); }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleOpen]);

  const filtered = (summaries ?? []).filter((s) => {
    const q = query.toLowerCase();
    return s.institution.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
  });

  if (!open) {
    return (
      <button onClick={handleOpen} style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'var(--color-raised)',border:'1px solid var(--color-border)',borderRadius:6,color:'var(--color-text-muted)',fontSize:13,cursor:'pointer' }} aria-label="Search ⌘K (Ctrl+K)">
        <Search size={13} /><span>Search</span>
        <kbd style={{ marginLeft:4,padding:'1px 4px',background:'var(--color-overlay)',border:'1px solid var(--color-border)',borderRadius:3,fontSize:11,fontFamily:'var(--font-mono)',color:'var(--color-text)' }}>⌘K</kbd>
      </button>
    );
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80 }} onClick={() => setOpen(false)}>
      <div style={{ background:'var(--color-overlay)',border:'1px solid var(--color-border)',borderRadius:10,width:560,maxHeight:440,display:'flex',flexDirection:'column',overflow:'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderBottom:'1px solid var(--color-border)' }}>
          <Search size={15} style={{ color:'var(--color-text-muted)' }} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search institutions..." style={{ flex:1,background:'none',border:'none',outline:'none',color:'var(--color-text)',fontSize:14 }} />
          <button onClick={() => setOpen(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--color-text-muted)' }}><X size={14} /></button>
        </div>
        <div style={{ overflow:'auto',flex:1 }}>
          {filtered.slice(0, 15).map((s) => (
            <button key={s.id} onClick={() => { router.push(`/applications/${s.id}/overview`); setOpen(false); setQuery(''); }} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',background:'none',border:'none',borderBottom:'1px solid var(--color-border)',cursor:'pointer',textAlign:'left',color:'var(--color-text)' }}>
              <span style={{ fontSize:13,fontWeight:500 }}>{s.institution.name}</span>
              <span style={{ marginLeft:'auto',fontSize:11,fontFamily:'var(--font-mono)',color:'var(--color-text-muted)' }}>{s.id}</span>
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding:'20px 14px',color:'var(--color-text-muted)',fontSize:13 }}>No results for &ldquo;{query}&rdquo;</div>}
        </div>
      </div>
    </div>
  );
}
