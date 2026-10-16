import {
  BarChart3,
  Clock,
  FileText,
  Filter,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS, NOTE_HIGHLIGHTS } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';
import { Callout, FeatureList, Grid, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../overviewSeiten.css';

// 067I / G54: Echte Highlights-Seite statt WebP — genau eine h1,
// Erfolge und Baustellen als Listen, Fazit aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-jahres-highlights-2025).
// Auftrag 095 (Paket G2, Welle 2): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Untertitel, „FY 2025“ leuchtet, Panel-Titel „Top Erfolge 2025“ / „Operative
// Herausforderungen“ mit Chips „Erreicht“ / „Fokus 2026“, Titel der Einträge in Tonfarbe.
const ERFOLG_ICONS: LucideIcon[] = [BarChart3, Users, TrendingUp, ShieldCheck];
const BAUSTELLE_ICONS: LucideIcon[] = [TrendingDown, User, Filter, Clock];

function YearHighlightsPageHtml() {
  const ready = HIGHLIGHTS_GOOD_ROWS.length > 0 || HIGHLIGHTS_BAD_ROWS.length > 0;
  const eintraege = (rows: string[][], icons: LucideIcon[]) =>
    rows.map((row, index) => ({
      title: row[0] ?? '',
      text: row[1] ?? '',
      icon: icons[index % icons.length] ?? BarChart3,
    }));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="overview-highlights">
      <PageHero
        eyebrow="Performance"
        title="Jahres-Highlights 2025"
        subtitle="Gewinne und operative Herausforderungen im Jahresrückblick."
        asidePills={['FY 2025', 'Ebene A Review']}
        asideActive="first"
      />
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Jahres-Highlights erfasst.">
        <Grid cols="2">
          <Panel title="Top Erfolge 2025" icon={Target} chip="Erreicht">
            <FeatureList items={eintraege(HIGHLIGHTS_GOOD_ROWS, ERFOLG_ICONS)} />
          </Panel>
          <Panel title="Operative Herausforderungen" icon={Zap} tone="orange" chip="Fokus 2026">
            <FeatureList items={eintraege(HIGHLIGHTS_BAD_ROWS, BAUSTELLE_ICONS)} tone="orange" />
          </Panel>
        </Grid>
        <Callout
          title={NOTE_HIGHLIGHTS.title}
          icon={FileText}
          headingLevel={2}
          paragraphs={NOTE_HIGHLIGHTS.paragraphs}
        />
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function YearHighlightsPage() {
  return (
    <ImagePage page="overview-highlights">
      <YearHighlightsPageHtml />
    </ImagePage>
  );
}
