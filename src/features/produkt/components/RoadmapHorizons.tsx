import React, { useState } from 'react';
import { ROADMAP } from '../../../domain/produktData';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';

export const RoadmapHorizons: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // Gliederung der Releases in Now, Next und Later
  // Statuswerte bleiben 1:1 original ('Released', 'In Entwicklung', 'Geplant')
  const nowReleases = ROADMAP.releases.filter((r) => r.status === 'Released');
  const nextReleases = ROADMAP.releases.filter((r) => r.status === 'In Entwicklung');
  const laterReleases = ROADMAP.releases.filter((r) => r.status === 'Geplant');

  const horizons = [
    {
      id: 'now',
      label: 'NOW',
      badge: 'Bereits geliefert',
      subtitle: 'Bereits geliefert',
      tone: 'var(--color-primary)',
      releases: nowReleases,
    },
    {
      id: 'next',
      label: 'NEXT',
      badge: 'Laufende Arbeit',
      subtitle: 'Aktuell in Entwicklung (Q1 2026)',
      tone: 'var(--color-accent)',
      releases: nextReleases,
    },
    {
      id: 'later',
      label: 'LATER',
      badge: 'Geplant',
      subtitle: 'Nächste Release-Horizonte (Q2 2026)',
      tone: 'var(--cyan-light)',
      releases: laterReleases,
    },
  ];

  return (
    <div
      className="facelift-roadmap-horizons"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--cyan-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            Release-Horizonte • Roadmap
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            {ROADMAP.title}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Gegliedert in Now (geliefert), Next (aktuell) und Later (geplant) ohne Statusumdeutung.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="roadmap-horizons-table"
          aria-expanded={showTable}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 12px',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {showTable ? 'Tabellenansicht verbergen' : 'Tabellenansicht anzeigen'}
        </button>
      </div>

      {/* DREI RELEASE-HORIZONTE (NOW / NEXT / LATER) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'stretch',
        }}
      >
        {horizons.map((h) => (
          <div
            key={h.id}
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              borderTop: `3px solid ${h.tone}`,
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              {/* Horizont-Kopf */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)',
                  paddingBottom: 'var(--space-2)',
                  borderBottom: '1px solid var(--color-border-soft)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: h.tone,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {h.label}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    {h.subtitle}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.625rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                  }}
                >
                  {h.releases.length} {h.releases.length === 1 ? 'Feature' : 'Features'}
                </span>
              </div>

              {/* Release-Karten im Horizont */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {h.releases.map((rel) => (
                  <div
                    key={rel.title}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-soft)',
                      padding: 'var(--space-3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {rel.quarter}
                      </span>
                      <Badge
                        variant={
                          rel.status === 'Released'
                            ? 'cyan'
                            : rel.status === 'In Entwicklung'
                            ? 'orange'
                            : 'neutral'
                        }
                      >
                        {rel.status}
                      </Badge>
                    </div>

                    <h4
                      style={{
                        margin: '0 0 4px',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                      }}
                    >
                      {rel.title}
                    </h4>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {rel.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ausklappbare Detail-Referenztabelle */}
      {showTable && (
        <div
          id="roadmap-horizons-table"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Vollständige Roadmap-Tabelle (Originalansicht):
          </div>
          <Table
            columns={[
              { key: 'quarter', label: 'Quartal' },
              { key: 'title', label: 'Feature Release' },
              {
                key: 'status',
                label: 'Status',
                render: (r: any) => (
                  <Badge
                    variant={
                      r.status === 'Released'
                        ? 'cyan'
                        : r.status === 'In Entwicklung'
                        ? 'orange'
                        : 'neutral'
                    }
                  >
                    {r.status}
                  </Badge>
                ),
              },
              { key: 'desc', label: 'Beschreibung' },
            ]}
            rows={ROADMAP.releases}
          />
        </div>
      )}
    </div>
  );
};
