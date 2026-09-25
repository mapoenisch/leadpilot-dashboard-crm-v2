import { BarChart3, GraduationCap, Settings, Users, type LucideIcon } from 'lucide-react';
import { BSC } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { PageHero } from '@/components/pageKit';

// 067I / G52: Echte Balanced-Scorecard-Seite statt WebP — genau eine h1,
// vier Perspektiven mit Kennzahlen als Definitionsliste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (05-balanced-scorecard).
const ICONS: LucideIcon[] = [BarChart3, Users, Settings, GraduationCap];

export function BalancedScorecardPage() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Strategie"
        title={BSC.title}
        subtitle="Vier Perspektiven mit den Steuerungskennzahlen des Geschäftsjahres."
        pills={['Balanced Scorecard', `${BSC.perspectives.length} Perspektiven`]}
      />
      <DataState
        status={BSC.perspectives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Scorecard-Perspektiven erfasst."
      >
        <section aria-label="Perspektiven">
          <dl className="pk-grid" data-cols="2">
            {BSC.perspectives.map((perspective, index) => {
              const Icon = ICONS[index % ICONS.length] ?? BarChart3;
              return (
                <div key={perspective.name} className="pk-unit" data-tone="cyan">
                  <span className="pk-icon" data-shape="round" aria-hidden="true">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <div className="pk-unit__body">
                    <dt className="pk-unit__title pk-strong-tone">
                      {perspective.name} Perspektive
                    </dt>
                    <dd className="pk-unit__text pk-unit__text--strong">{perspective.kpis}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      </DataState>
    </div>
  );
}
