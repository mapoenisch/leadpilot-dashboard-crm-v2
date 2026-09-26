import { Database, FileText, Target } from 'lucide-react';
import { PROFILE_ROWS, NOTE_PROFIL } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';
import type { ReactNode } from 'react';
import { Callout, Grid, KeyValueList, PageHero, Panel, splitValueHint } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';

// 067I / G54: Echte Steckbrief-Seite statt WebP — genau eine h1,
// Stammdaten als Definitionsliste, Strukturnotiz aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-unternehmenssteckbrief).
const STAMMDATEN = new Set([
  'Firmenname',
  'Rechtsform',
  'Sitz & Adresse',
  'Handelsregister',
  'Gründungsdatum',
]);

function CompanyProfilePageHtml() {
  const register = PROFILE_ROWS.find((row) => row[0] === 'Handelsregister')?.[1];
  const stammdaten = PROFILE_ROWS.filter((row) => STAMMDATEN.has(row[0] ?? ''));
  const kapital = PROFILE_ROWS.filter((row) => !STAMMDATEN.has(row[0] ?? ''));
  const zeile = (row: string[]): [string, ReactNode] => {
    if (row[0] !== 'Stammkapital') return [row[0] ?? '', row[1] ?? ''];
    const [wert, hinweis] = splitValueHint(row[1] ?? '');
    return [
      row[0],
      <>
        <strong className="pk-strong-tone">{wert}</strong>
        {hinweis ? <span className="pk-muted"> ({hinweis})</span> : null}
      </>,
    ];
  };
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Unternehmen"
        title="Unternehmenssteckbrief"
        subtitle="LeadPilot GmbH im Überblick: Rechtsform, Sitz, Register und Gesellschafter aus dem verbindlichen Faktenblatt."
        asidePills={register ? [register, 'GmbH Leipzig'] : []}
      />
      <DataState
        status={PROFILE_ROWS.length > 0 ? 'ready' : 'empty'}
        emptyText="Kein Unternehmenssteckbrief erfasst."
      >
        <Grid cols="2">
          <Panel title="Rechtliche Stammdaten" icon={FileText}>
            <KeyValueList rows={stammdaten.map(zeile)} />
          </Panel>
          <Panel title="Kapital & Organe" icon={Database} tone="orange">
            <KeyValueList rows={kapital.map(zeile)} />
          </Panel>
        </Grid>
        <Callout
          title={NOTE_PROFIL.title}
          icon={Target}
          headingLevel={2}
          paragraphs={NOTE_PROFIL.paragraphs}
        />
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function CompanyProfilePage() {
  return (
    <ImagePage page="overview-profile">
      <CompanyProfilePageHtml />
    </ImagePage>
  );
}
