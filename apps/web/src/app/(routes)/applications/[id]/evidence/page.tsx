'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoleStore } from '@/store/role-store';
import { BboxViewer } from '@/components/features/BboxViewer';
import { FactsPanel } from '@/components/features/FactsPanel';
import { ConfidenceGateModal } from '@/components/features/ConfidenceGateModal';
import type { Document, Bbox, Fact } from '@evidencegraph/domain';
import { useParams } from 'next/navigation';

export default function EvidencePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { role } = useRoleStore();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [highlightBbox, setHighlightBbox] = useState<Bbox | null>(null);
  const [gateFactId, setGateFactId] = useState<string | null>(null);

  const { data } = useQuery<{ documents: Document[]; facts: Fact[] }>({
    queryKey: ['application-full', id, role],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}`, { headers: { 'x-eg-role': role } });
      return res.json() as Promise<{ documents: Document[]; facts: Fact[] }>;
    },
  });

  const { data: factsData } = useQuery<Fact[]>({
    queryKey: ['facts', id],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}/facts`, { headers: { 'x-eg-role': role } });
      return res.json() as Promise<Fact[]>;
    },
  });

  const documents = data?.documents ?? [];
  const currentDoc = (selectedDocId ? documents.find((d) => d.id === selectedDocId) : documents[0]) ?? null;
  const gateFact = gateFactId ? (factsData ?? []).find((f) => f.id === gateFactId) ?? null : null;

  function handleFactSelect(factId: string, bbox: Bbox | null) {
    setSelectedFactId(factId);
    setHighlightBbox(bbox);

    // If the fact is quarantined and user is an officer, open the gate modal
    const fact = (factsData ?? []).find((f) => f.id === factId);
    if (fact?.quarantine && role !== 'applicant') {
      setGateFactId(factId);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: document viewer */}
      <div style={{ flex: '0 0 50%', borderRight: '1px solid var(--color-border)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Document selector */}
        {documents.length > 1 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--color-surface)', flexShrink: 0 }}>
            {documents.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  background: (selectedDocId ?? documents[0]?.id) === d.id ? 'var(--color-raised)' : 'transparent',
                  color: 'var(--color-text-muted)',
                  transition: 'background 120ms ease',
                }}
              >
                {d.docType}
              </button>
            ))}
          </div>
        )}
        {currentDoc && (
          <BboxViewer
            document={currentDoc}
            highlightBbox={highlightBbox}
          />
        )}
        {!currentDoc && (
          <div style={{ padding: 24, color: 'var(--color-text-faint)', fontSize: 13 }}>
            No documents available for this application.
          </div>
        )}
      </div>

      {/* Right: facts + findings panel */}
      <div style={{ flex: '0 0 50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
          Extracted Facts
          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: 'var(--color-text-faint)' }}>
            Click a row to highlight · Click a HELD AT GATE fact to review
          </span>
        </div>
        <FactsPanel appId={id} selectedFactId={selectedFactId} onFactSelect={handleFactSelect} />
      </div>

      {/* Confidence Gate Modal */}
      {gateFact && (
        <ConfidenceGateModal
          appId={id}
          fact={gateFact}
          open={!!gateFactId}
          onClose={() => setGateFactId(null)}
        />
      )}
    </div>
  );
}
