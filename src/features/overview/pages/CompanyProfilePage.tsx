import { Database, FileText, Table, Target } from 'lucide-react';
import { PROFILE_ROWS, NOTE_PROFIL } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';
import type { ReactNode } from 'react';
import {
  Callout,
  Chip,
  Grid,
  KeyValueList,
  PageHero,
  Panel,
  splitValueHint,
} from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../overviewSeiten.css';

// 067I / G54: Echte Steckbrief-Seite statt WebP — genau eine h1,
// Stammdaten als Definitionsliste, Strukturnotiz aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-unternehmenssteckbrief).
// Auftrag 095 (Paket G2, Welle 2): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: zwei Panels mit Status-Chip („Erreicht“ / „Fokus 2026“), Kapitalerhöhung als
// Chip am Stammkapital, darunter die vollständige Register- und Stammdatentabelle und die
// Fokus-Karte. Alle Werte kommen aus PROFILE_ROWS (Faktenblatt v1.2).
function CompanyProfilePageHtml() {
  const wert = (name: string) => PROFILE_ROWS.find((row) => row[0] === name)?.[1] ?? '';
  const register = wert('Handelsregister');
  const [kapitalWert, kapitalHinweis] = splitValueHint(wert('Stammkapital'));
  const kapitalChip = kapitalHinweis?.split(', ').pop();
  const stammdaten: Array<[ReactNode, ReactNode]> = [
    ['Firma & Rechtsform', `${wert('Firmenname')} · ${wert('Rechtsform')}`],
    ['Sitz & Betriebsstätte', wert('Sitz & Adresse')],
    ['Gründungsdatum', wert('Gründungsdatum')],
  ];
  const kapital: Array<[ReactNode, ReactNode]> = [
    [
      'Stammkapital',
      <span className="ov-kapital" key="kapital">
        <strong className="pk-strong-tone">{kapitalWert}</strong>
        {kapitalChip ? <Chip tone="orange">{kapitalChip}</Chip> : null}
      </span>,
    ],
    ['Geschäftsführung', wert('Geschäftsführung')],
    ['Gesellschafterkreis', wert('Gesellschafter')],
  ];
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="overview-profile">
      <PageHero
        eyebrow="Unternehmen"
        title="Unternehmenssteckbrief"
        subtitle="Stammdaten & Rechtliche Eckdaten der LeadPilot GmbH."
        asidePills={register ? [register, 'GmbH Leipzig'] : []}
      />
      <DataState
        status={PROFILE_ROWS.length > 0 ? 'ready' : 'empty'}
        emptyText="Kein Unternehmenssteckbrief erfasst."
      >
        <Grid cols="2">
          <Panel title="Rechtliche Stammdaten" icon={FileText} chip="Erreicht">
            <KeyValueList rows={stammdaten} />
          </Panel>
          <Panel title="Kapital & Organe" icon={Database} tone="orange" chip="Fokus 2026">
            <KeyValueList rows={kapital} />
          </Panel>
        </Grid>
        <Panel title="Vollständige Register- und Stammdaten" icon={Table}>
          <div data-testid="profil-register">
            <KeyValueList
              rows={PROFILE_ROWS.map((row): [ReactNode, ReactNode] => [row[0], row[1]])}
            />
          </div>
        </Panel>
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
