'use client';
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { GraphSubgraph, GraphNode } from '@evidencegraph/domain';

interface GraphViewerProps {
  subgraph: GraphSubgraph;
  focusId?: string;
}

const NODE_COLORS: Record<GraphNode['label'], string> = {
  Institution: '#a6e22e',
  Trust: '#66d9ef',
  Person: '#f92672',
  LandParcel: '#75715e',
  FDR: '#e6db74',
  Signatory: '#8B95A7',
  StampImage: '#ae81ff',
  Photo: '#ae81ff',
};

export function GraphViewer({ subgraph, focusId }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (subgraph.nodes.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cy: any = null;

    void (async () => {
      const cytoscapeModule = await import('cytoscape');
      const cytoscape = cytoscapeModule.default;

      const elements = [
        ...subgraph.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.display,
            nodeType: n.label,
            ...n.props,
          },
        })),
        ...subgraph.edges.map((e) => ({
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.type,
            severity: e.severity,
            ...e.props,
          },
        })),
      ];

      if (!containerRef.current) return;

      cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': (ele: cytoscape.NodeSingular) => NODE_COLORS[(ele.data('nodeType') as GraphNode['label']) ?? 'Institution'] ?? '#75715e',
              'label': 'data(label)',
              'color': '#f8f8f2',
              'font-size': 10,
              'text-wrap': 'wrap',
              'text-max-width': '100px',
              'text-valign': 'bottom',
              'text-margin-y': 4,
              'width': (ele: cytoscape.NodeSingular) => ele.data('nodeType') === 'Institution' ? 40 : 24,
              'height': (ele: cytoscape.NodeSingular) => ele.data('nodeType') === 'Institution' ? 40 : 24,
              'border-width': (ele: cytoscape.NodeSingular) => ele.data('id') === focusId ? 2 : 0,
              'border-color': '#a6e22e',
            } as Record<string, unknown>,
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': (ele: cytoscape.EdgeSingular) => ele.data('severity') === 'high' ? '#f92672' : '#3e3d32',
              'line-style': (ele: cytoscape.EdgeSingular) => ['NEAR_DUPLICATE', 'CONFLICTS_WITH'].includes(ele.data('label') as string) ? 'dashed' : 'solid',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': (ele: cytoscape.EdgeSingular) => ele.data('severity') === 'high' ? '#f92672' : '#3e3d32',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': 9,
              'color': '#75715e',
              'text-rotation': 'autorotate',
            } as Record<string, unknown>,
          },
        ],
        layout: { name: 'cose', animate: false, nodeRepulsion: 8000 } as cytoscape.LayoutOptions,
      });
    })();

    return () => {
      cy?.destroy();
    };
  }, [subgraph, focusId]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'var(--color-canvas)' }}
      aria-label="Entity graph"
    />
  );
}
