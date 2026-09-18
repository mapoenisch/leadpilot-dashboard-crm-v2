import { ROADMAP } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Roadmap-Seite statt WebP — genau eine h1,
// Releases als Abschnitte mit Quartal, Status und Beschreibung.
export function RoadmapPage() {
  const released = ROADMAP.releases.filter((release) => release.status === 'Released').length;
  return (
    <div>
      <h1>Releases &amp; Roadmap</h1>
      <p>
        {ROADMAP.title}: {String(ROADMAP.releases.length)} Releases, davon {String(released)}{' '}
        ausgeliefert.
      </p>
      <DataState
        status={ROADMAP.releases.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Roadmap-Einträge erfasst."
      >
        {ROADMAP.releases.map((release) => (
          <section
            key={`${release.quarter}-${release.title}`}
            aria-label={`${release.quarter}: ${release.title}`}
          >
            <h2>
              {release.quarter}: {release.title} ({release.status})
            </h2>
            <p>{release.desc}</p>
          </section>
        ))}
      </DataState>
    </div>
  );
}
