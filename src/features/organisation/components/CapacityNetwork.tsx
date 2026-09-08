import React from 'react';
import { HEADCOUNT, TEAM } from '../../../domain/organisationData';

export const CapacityNetwork: React.FC = () => {
  // Funktionszeilen dynamisch aus HEADCOUNT.rows (alle außer letzter Zeile)
  const functionalRows = HEADCOUNT.rows.slice(0, -1);
  const bottlenecks = TEAM.bottlenecks || [];

  // Netz-Knoten rein indexbasiert und dynamisch aufbauen (keine fest codierten Rollennamen)
  const totalNodes = functionalRows.length;
  const centerX = 250;
  const centerY = 150;
  const radiusX = 170;
  const radiusY = 95;

  const nodes = functionalRows.map((r, i) => {
    const roleName = r[0];
    const fteStr = r[1];
    const detail = r[2];

    // Generische Zuordnung von Engpässen über Token-Übereinstimmung von roleName und detail gegen TEAM.bottlenecks
    const roleTokens = roleName.toLowerCase().split(/[\s/&]+/).filter((w) => w.length > 3);
    const detailTokens = detail.toLowerCase().split(/[^a-zA-Z0-9äöüÄÖÜß]+/).filter((w) => w.length >= 3);

    const nodeBottlenecks = bottlenecks.filter((b) => {
      const bLower = b.toLowerCase();
      if (!bLower.includes('engpass')) return false;

      // 1. Rollen-Übereinstimmung aus roleName
      const roleMatch = roleTokens.some((token) => bLower.includes(token));

      // 2. Detail-/Personen-Übereinstimmung aus detail (z. B. "Tobias Heine (CTO)" mit mehreren Token-Treffern)
      const bTokens = bLower.split(/[^a-zA-Z0-9äöüÄÖÜß]+/);
      const detailMatch = detailTokens.filter((token) => bTokens.includes(token)).length >= 2;

      return roleMatch || detailMatch;
    });

    const hasBottleneck = nodeBottlenecks.length > 0;

    // Rein indexbasierte Positionierung auf einer Ellipse
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, totalNodes);
    const cx = Math.round(centerX + radiusX * Math.cos(angle));
    const cy = Math.round(centerY + radiusY * Math.sin(angle));

    return {
      index: i,
      roleName,
      fteStr,
      detail,
      hasBottleneck,
      bottlenecks: nodeBottlenecks,
      cx,
      cy,
    };
  });

  // Rein indexbasierte visuelle Verbindungskanten (keine Rollennamen im Code, keine Richtungspfeile)
  const edges: { fromIndex: number; toIndex: number }[] = [];
  for (let i = 0; i < totalNodes; i++) {
    edges.push({ fromIndex: i, toIndex: (i + 1) % totalNodes });
  }
  if (totalNodes >= 4) {
    edges.push({ fromIndex: 0, toIndex: Math.floor(totalNodes / 2) });
  }

  return (
    <section
      className="facelift-capacity-network"
      aria-label="Kapazitätsnetz und Rollenübersicht"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5, 20px)',
        overflowWrap: 'anywhere',
      }}
    >
      <style>{`
        .network-nodes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        @media (max-width: 600px) {
          .facelift-capacity-network {
            padding: 12px 8px !important;
          }
          .network-nodes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(0, 217, 198, 0.12)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              whiteSpace: 'normal',
            }}
          >
            KAPAZITÄTSNETZ
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Rollenübersicht – keine dokumentierten Prozessübergaben
          </span>
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.25rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          Kapazitätsnetz der Organisation & Engpass-Topografie
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Rein visuelle Anordnung der Funktionsbereiche. Keine dokumentierten Beziehungen oder Prozessübergaben.
        </p>
      </div>

      {/* Visuelles 2D-Netzwerk (SVG) */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border)',
          padding: '12px 8px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
            ORGANISATIONSNETZWERK & ENGPASSSTELLEN
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Rollenübersicht – keine dokumentierten Prozessübergaben
          </span>
        </div>

        <svg
          viewBox="0 0 500 330"
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '310px' }}
          role="img"
          aria-label="Diagramm: Kapazitätsnetzwerk der Rollen mit Engpässen"
        >
          {/* Verbindungskanten (rein visuelle Anordnung, keine Rollennamen, keine Richtungspfeile) */}
          {edges.map((edge, i) => {
            const fromNode = nodes[edge.fromIndex];
            const toNode = nodes[edge.toIndex];
            if (!fromNode || !toNode) return null;

            const isEngpassConnection = fromNode.hasBottleneck && toNode.hasBottleneck;

            return (
              <line
                key={i}
                x1={fromNode.cx}
                y1={fromNode.cy}
                x2={toNode.cx}
                y2={toNode.cy}
                stroke={isEngpassConnection ? 'rgba(255, 122, 61, 0.35)' : 'rgba(255, 255, 255, 0.12)'}
                strokeWidth={isEngpassConnection ? 2 : 1.5}
                strokeDasharray={isEngpassConnection ? '4 3' : 'none'}
              />
            );
          })}

          {/* Knoten-Elemente */}
          {nodes.map((node) => {
            const isOrange = node.hasBottleneck;
            const nodeRadius = 30;

            return (
              <g key={node.roleName} className="facelift-network-node">
                {/* Äußerer Ring bei Engpass */}
                {isOrange && (
                  <circle
                    cx={node.cx}
                    cy={node.cy}
                    r={nodeRadius + 6}
                    fill="none"
                    stroke="#FF7A3D"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                )}

                {/* Hauptknoten */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={nodeRadius}
                  fill={isOrange ? 'rgba(255, 122, 61, 0.16)' : 'rgba(0, 217, 198, 0.12)'}
                  stroke={isOrange ? '#FF7A3D' : '#00D9C6'}
                  strokeWidth="2"
                />

                {/* FTE Zahl im Knoten */}
                <text
                  x={node.cx}
                  y={node.cy + 4}
                  fill={isOrange ? '#FF7A3D' : '#00D9C6'}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {node.fteStr}
                </text>

                {/* Rollenname oberhalb/unterhalb */}
                <text
                  x={node.cx}
                  y={node.cy > 100 ? node.cy + nodeRadius + 15 : node.cy - nodeRadius - 8}
                  fill="var(--color-text)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {node.roleName}
                </text>

                {/* Warn-Indikator bei Engpass */}
                {isOrange && (
                  <text
                    x={node.cx}
                    y={node.cy > 100 ? node.cy + nodeRadius + 28 : node.cy - nodeRadius - 20}
                    fill="#FF7A3D"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    ⚠️ ENGPASS
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Rollenkarten mit exakten Texten und doppelter CTO-Engpassmarkierung */}
      <div className="network-nodes-grid" role="region" aria-label="Funktionskarten mit Engpass-Details">
        {nodes.map((node) => {
          const isOrange = node.hasBottleneck;

          return (
            <article
              key={node.roleName}
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                border: isOrange ? '1px solid #FF7A3D' : '1px solid var(--color-border)',
                borderTop: isOrange ? '4px solid #FF7A3D' : '4px solid #00D9C6',
                backgroundColor: isOrange
                  ? 'rgba(255, 122, 61, 0.04)'
                  : 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{node.roleName}</strong>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: isOrange ? '#FF7A3D' : '#00D9C6',
                  }}
                >
                  {node.fteStr}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {node.detail}
              </div>

              {/* Explizite orange Engpass-Markierungen aus TEAM.bottlenecks */}
              {node.bottlenecks.map((bText, idx) => (
                <div
                  key={idx}
                  style={{
                    marginTop: '4px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 122, 61, 0.12)',
                    border: '1px solid rgba(255, 122, 61, 0.3)',
                    fontSize: '11px',
                    color: '#FF7A3D',
                    lineHeight: 1.35,
                  }}
                >
                  {bText}
                </div>
              ))}
            </article>
          );
        })}
      </div>
    </section>
  );
};
