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
    const roleTokens = roleName
      .toLowerCase()
      .split(/[\s/&]+/)
      .filter((w) => w.length > 3);
    const detailTokens = detail
      .toLowerCase()
      .split(/[^a-zA-Z0-9äöüÄÖÜß]+/)
      .filter((w) => w.length >= 3);

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
      className="facelift-capacity-network box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Kapazitätsnetz und Rollenübersicht"
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
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase px-[8px] py-[2px]">
            KAPAZITÄTSNETZWERK
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Rollenübersicht – keine dokumentierten Prozessübergaben
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          Kapazitätsnetz der Organisation & Engpass-Topografie
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Rein visuelle Anordnung der Funktionsbereiche. Keine dokumentierten Beziehungen oder
          Prozessübergaben.
        </p>
      </div>

      {/* Visuelles 2D-Netzwerk (SVG) */}
      <div className="w-full rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] box-border px-[8px] py-[12px]">
        <div className="flex justify-between items-center flex-wrap gap-[4px] mb-[8px] px-[8px]">
          <span className="text-[11px] font-bold uppercase text-primary">
            ORGANISATIONSNETZWERK & ENGPASSSTELLEN
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Rollenübersicht – keine dokumentierten Prozessübergaben
          </span>
        </div>

        <svg
          viewBox="0 0 500 330"
          className="block w-full h-auto max-h-[310px]"
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
                stroke={
                  isEngpassConnection ? 'rgba(255, 122, 61, 0.35)' : 'rgba(255, 255, 255, 0.12)'
                }
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
      <div
        className="network-nodes-grid"
        role="region"
        aria-label="Funktionskarten mit Engpass-Details"
      >
        {nodes.map((node) => {
          const isOrange = node.hasBottleneck;

          return (
            <article
              key={node.roleName}
              className={`rounded-[8px] border border-solid flex flex-col gap-[8px] min-w-0 box-border p-[14px] ${isOrange ? 'border-[#FF7A3D] border-t-4 border-t-[#FF7A3D] bg-[rgba(255,122,61,0.04)]' : 'border-border border-t-4 border-t-primary bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))]'}`}
            >
              <div className="flex justify-between items-center flex-wrap gap-[4px]">
                <strong className="text-[13px] text-text">{node.roleName}</strong>
                <span
                  className={`font-mono text-[12px] font-bold ${isOrange ? 'text-[#FF7A3D]' : 'text-[#00D9C6]'}`}
                >
                  {node.fteStr}
                </span>
              </div>

              <div className="text-[11px] leading-[1.4] text-[var(--color-text-muted)]">
                {node.detail}
              </div>

              {/* Explizite orange Engpass-Markierungen aus TEAM.bottlenecks */}
              {node.bottlenecks.map((bText, idx) => (
                <div
                  key={idx}
                  className="rounded border border-solid border-[rgba(255,122,61,0.3)] bg-[rgba(255,122,61,0.12)] text-[11px] leading-[1.35] text-[#FF7A3D] mt-[4px] px-[8px] py-[6px]"
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
