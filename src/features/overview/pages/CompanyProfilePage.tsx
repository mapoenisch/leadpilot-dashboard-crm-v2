import { PROFILE_ROWS, NOTE_PROFIL } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Steckbrief-Seite statt WebP — genau eine h1,
// Stammdaten als Definitionsliste, Strukturnotiz aus Domäne.
export function CompanyProfilePage() {
  return (
    <div>
      <h1>Unternehmenssteckbrief</h1>
      <p>
        LeadPilot GmbH im Überblick: Rechtsform, Sitz, Register und Gesellschafter aus dem
        verbindlichen Faktenblatt.
      </p>
      <DataState
        status={PROFILE_ROWS.length > 0 ? 'ready' : 'empty'}
        emptyText="Kein Unternehmenssteckbrief erfasst."
      >
        <dl>
          {PROFILE_ROWS.map((row) => (
            <div key={row[0]}>
              <dt>{row[0]}</dt>
              <dd>{row[1]}</dd>
            </div>
          ))}
        </dl>
        <section aria-label={NOTE_PROFIL.title}>
          <h2>{NOTE_PROFIL.title}</h2>
          {NOTE_PROFIL.paragraphs.map((absatz) => (
            <p key={absatz}>{absatz}</p>
          ))}
        </section>
      </DataState>
    </div>
  );
}
