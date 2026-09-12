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
    <div className="facelift-roadmap-horizons box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]">

      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] mb-[2px] text-[var(--cyan-light)]">
            Release-Horizonte • Roadmap
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            {ROADMAP.title}
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[2px] mb-0 mr-0 ml-0">
            Gegliedert in Now (geliefert), Next (aktuell) und Later (geplant) ohne Statusumdeutung.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="roadmap-horizons-table"
          aria-expanded={showTable}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
        >
          {showTable ? 'Tabellenansicht verbergen' : 'Tabellenansicht anzeigen'}
        </button>
      </div>

      {/* DREI RELEASE-HORIZONTE (NOW / NEXT / LATER) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[var(--space-4)] items-stretch">
        {horizons.map((h) => (
          <div
            key={h.id}
            className={`rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-4)] border-t-[3px] ${h.id === 'now' ? 'border-t-primary' : h.id === 'next' ? 'border-t-accent' : 'border-t-[var(--cyan-light)]'}`}
          >
            <div>
              {/* Horizont-Kopf */}
              <div className="border-0 border-b border-solid border-border-soft flex items-center justify-between mb-[var(--space-2)] pb-[var(--space-2)]">
                <div>
                  <div className={`font-mono text-[0.75rem] font-extrabold tracking-[0.08em] ${h.id === 'now' ? 'text-primary' : h.id === 'next' ? 'text-accent' : 'text-[var(--cyan-light)]'}`}>
                    {h.label}
                  </div>
                  <div className="text-[0.6875rem] text-[var(--color-text-muted)]">
                    {h.subtitle}
                  </div>
                </div>

                <span className="font-mono text-[0.625rem] rounded border border-solid border-border bg-surface px-[6px] py-[2px] text-text">
                  {h.releases.length} {h.releases.length === 1 ? 'Feature' : 'Features'}
                </span>
              </div>

              {/* Release-Karten im Horizont */}
              <div className="flex flex-col gap-[var(--space-3)]">
                {h.releases.map((rel) => (
                  <div
                    key={rel.title}
                    className="rounded border border-solid border-border-soft bg-surface p-[var(--space-3)]"
                  >
                    <div className="flex items-center justify-between gap-[var(--space-2)] mb-[4px]">
                      <span className="font-mono text-[0.6875rem] font-bold text-[var(--color-text-muted)]">
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

                    <h4 className="m-0 mb-[4px] font-display text-[0.875rem] font-bold text-text">
                      {rel.title}
                    </h4>

                    <p className="m-0 text-[0.75rem] leading-[1.35] text-[var(--color-text-muted)]">
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
          className="border-0 border-t border-solid border-border mt-[var(--space-5)] pt-[var(--space-4)]"
        >
          <div className="mb-[var(--space-2)] text-[0.8125rem] text-[var(--color-text-muted)]">
            Vollständige Roadmap-Tabelle (Originalansicht):
          </div>
          <Table
            columns={[
              { key: 'quarter', label: 'Quartal' },
              { key: 'title', label: 'Feature Release' },
              {
                key: 'status',
                label: 'Status',
                render: (r: typeof ROADMAP.releases[number]) => (
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
