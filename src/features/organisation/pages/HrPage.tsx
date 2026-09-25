import { BarChart3, Coins, FileText, Home, User, Users, type LucideIcon } from 'lucide-react';
import { HR } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';
import { PageHero, StatTile, splitValueHint } from '@/components/pageKit';

// 067I / G55: Echte HR-Seite statt WebP — genau eine h1,
// Personalkennzahlen als Liste, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-hr-kennzahlen).
const ICONS: LucideIcon[] = [Users, User, BarChart3, Coins, FileText, Home];

export function HrPage() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Organisation"
        title="HR-Kennzahlen"
        subtitle="Personalökonomie der LeadPilot GmbH: Bestand, Fluktuation und Kosten je FTE."
        pills={['Stand: 31.12.2025', 'Finanzjahr 2025']}
      />
      <DataState
        status={HR.metrics.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine HR-Kennzahlen erfasst."
      >
        <section aria-label="Personalkennzahlen">
          <ul className="pk-grid" data-cols="3">
            {HR.metrics.map((metric, index) => {
              const [wert, hinweis] = splitValueHint(metric.val);
              // Liegt die Kennzahl über ihrem genannten Benchmark, leuchtet sie orange.
              const benchmark = hinweis?.includes('Benchmark') ?? false;
              return (
                <li key={metric.label}>
                  <StatTile
                    label={metric.label}
                    value={wert}
                    hint={hinweis}
                    tone={benchmark ? 'orange' : 'cyan'}
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
