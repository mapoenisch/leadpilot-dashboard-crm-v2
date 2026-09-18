import { HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS, NOTE_HIGHLIGHTS } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Highlights-Seite statt WebP — genau eine h1,
// Erfolge und Baustellen als Definitionslisten, Fazit aus Domäne.
export function YearHighlightsPage() {
  const ready = HIGHLIGHTS_GOOD_ROWS.length > 0 || HIGHLIGHTS_BAD_ROWS.length > 0;
  return (
    <div>
      <h1>Jahres-Highlights 2025</h1>
      <p>
        Das Geschäftsjahr 2025 in Erfolgen und Baustellen — Kennzahlen aus dem
        verbindlichen Faktenblatt.
      </p>
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Jahres-Highlights erfasst.">
        <section aria-label="Erfolge">
          <h2>Erfolge</h2>
          <dl>
            {HIGHLIGHTS_GOOD_ROWS.map((row) => (
              <div key={row[0]}>
                <dt>{row[0]}</dt>
                <dd>{row[1]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label="Baustellen">
          <h2>Baustellen</h2>
          <dl>
            {HIGHLIGHTS_BAD_ROWS.map((row) => (
              <div key={row[0]}>
                <dt>{row[0]}</dt>
                <dd>{row[1]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label={NOTE_HIGHLIGHTS.title}>
          <h2>{NOTE_HIGHLIGHTS.title}</h2>
          {NOTE_HIGHLIGHTS.paragraphs.map((absatz) => (
            <p key={absatz}>{absatz}</p>
          ))}
        </section>
      </DataState>
    </div>
  );
}
