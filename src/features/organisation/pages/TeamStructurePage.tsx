import { TEAM, getOrganisationStructure } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';

// 067I / G55: Echte Teamstruktur-Seite statt WebP — genau eine h1,
// Organigramm aus HEADCOUNT abgeleitet plus Engpässe als Liste.
export function TeamStructurePage() {
  const struktur = getOrganisationStructure();
  const einheiten = [struktur.root, ...struktur.units, struktur.total];
  return (
    <div>
      <h1>Teamstruktur</h1>
      <p>{TEAM.title}: funktionale Einheiten mit Führungsspanne und Engpässen.</p>
      <DataState
        status={einheiten.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Teamstruktur erfasst."
      >
        <section aria-label="Organigramm">
          <h2>Organigramm</h2>
          <ul>
            {einheiten.map((einheit) => (
              <li key={einheit.role}>
                {einheit.role}: {einheit.fte} — {einheit.staffing}
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Engpässe">
          <h2>Engpässe</h2>
          <ul>
            {TEAM.bottlenecks.map((engpass) => (
              <li key={engpass}>{engpass}</li>
            ))}
          </ul>
        </section>
      </DataState>
    </div>
  );
}
