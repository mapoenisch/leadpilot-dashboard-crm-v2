import {
  BarChart3,
  Clock,
  FileText,
  Filter,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS, NOTE_HIGHLIGHTS } from '@/domain/execData';
import { DataState } from '@/components/ui/DataState';
import { Callout, FeatureList, Grid, PageHero, Panel } from '@/components/pageKit';

// 067I / G54: Echte Highlights-Seite statt WebP — genau eine h1,
// Erfolge und Baustellen als Listen, Fazit aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-jahres-highlights-2025).
const ERFOLG_ICONS: LucideIcon[] = [BarChart3, Users, TrendingUp, ShieldCheck];
const BAUSTELLE_ICONS: LucideIcon[] = [TrendingDown, User, Filter, Clock];

export function YearHighlightsPage() {
  const ready = HIGHLIGHTS_GOOD_ROWS.length > 0 || HIGHLIGHTS_BAD_ROWS.length > 0;
  const eintraege = (rows: string[][], icons: LucideIcon[]) =>
    rows.map((row, index) => ({
      title: row[0] ?? '',
      text: row[1] ?? '',
      icon: icons[index % icons.length] ?? BarChart3,
    }));
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Performance"
        title="Jahres-Highlights 2025"
        subtitle="Das Geschäftsjahr 2025 in Erfolgen und Baustellen — Kennzahlen aus dem verbindlichen Faktenblatt."
        asidePills={['Ebene A Review', 'FY 2025']}
      />
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Jahres-Highlights erfasst.">
        <Grid cols="2">
          <Panel title="Erfolge" subtitle="Top-Erfolge 2025">
            <FeatureList items={eintraege(HIGHLIGHTS_GOOD_ROWS, ERFOLG_ICONS)} />
          </Panel>
          <Panel title="Baustellen" subtitle="Operative Herausforderungen" tone="orange">
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
