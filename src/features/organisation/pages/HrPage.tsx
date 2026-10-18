import { BarChart3, Coins, FileText, Home, User, Users, type LucideIcon } from 'lucide-react';
import { HR } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';
import { Chip, PageHero, StatTile } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../organisationSeiten.css';

// 067I / G55: Echte HR-Seite statt WebP — genau eine h1,
// Personalkennzahlen als Liste, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-hr-kennzahlen).
// Auftrag 100 (Paket G2, Welle 7): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Wie im Original-WebP
// fünf Kacheln je Reihe, Wert vollständig in einer Zeile, Markierungen „Benchmark-Fokus“ und
// „Kostenblock“.
const ICONS: LucideIcon[] = [Users, User, BarChart3, Coins, FileText, Home];

function markierung(label: string, wert: string): { text: string; tone: 'orange' | 'cyan' } | null {
  if (wert.includes('Benchmark')) return { text: 'Benchmark-Fokus', tone: 'orange' };
  if (label.startsWith('Personalaufwand')) return { text: 'Kostenblock', tone: 'cyan' };
  return null;
}

function HrPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="organisation-hr">
      <PageHero
        eyebrow="Organisation"
        title="HR-Kennzahlen"
        subtitle="Personalökonomie, Kostenstruktur und operative Kennzahlen (Stand: 31.12.2025)."
        pills={['Stand: 31.12.2025', 'Finanzjahr 2025']}
      />
      <DataState
        status={HR.metrics.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine HR-Kennzahlen erfasst."
      >
        <section aria-label="Personalkennzahlen">
          <ul className="pk-grid org-hr-grid">
            {HR.metrics.map((metric, index) => {
              const marke = markierung(metric.label, metric.val);
              // Liegt die Kennzahl über ihrem genannten Benchmark, leuchtet sie orange.
              return (
                <li key={metric.label}>
                  <StatTile
                    label={
                      <>
                        <span className="org-hr__label">{metric.label}</span>
                        {marke ? (
                          <span className="org-hr__marke">
                            <Chip tone={marke.tone}>{marke.text}</Chip>
                          </span>
                        ) : null}
                      </>
                    }
                    value={metric.val}
                    tone={marke?.tone === 'orange' ? 'orange' : 'cyan'}
                    icon={ICONS[index % ICONS.length]}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function HrPage() {
  return (
    <ImagePage page="organisation-hr">
      <HrPageHtml />
    </ImagePage>
  );
}
