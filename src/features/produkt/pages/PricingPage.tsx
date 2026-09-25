import { Crown } from 'lucide-react';
import { PRICING } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { Chip, Grid, PageHero, ToneList } from '@/components/pageKit';

// 067I / G54: Echte Preisseite statt WebP — genau eine h1,
// Tarife als Abschnitte mit Merkmalslisten, Preise aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (08-preismodell).
export function PricingPage() {
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Produkt"
        title={PRICING.title}
        subtitle={`Transparente SaaS-Pakete für den B2B-Mittelstand: ${String(PRICING.tiers.length)} Tarife mit Leistungsumfang.`}
        pills={['B2B SaaS', `${PRICING.tiers.length} Tarifstufen`]}
      />
      <DataState
        status={PRICING.tiers.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Tarife erfasst."
      >
        <Grid cols="3">
          {PRICING.tiers.map((tarif) => {
            const featured = 'featured' in tarif && tarif.featured === true;
            // Ein Preis ohne Ziffer ist ein Angebot (Pro), keine Listenpreis-Angabe.
            const angebot = !/\d/.test(tarif.price);
            return (
              <section
                key={tarif.name}
                aria-label={`Tarif ${tarif.name}`}
                className="pk-panel pk-tier"
                data-tone="cyan"
                data-featured={featured ? 'true' : undefined}
              >
                <div className="pk-panel__head">
                  <h2 className="pk-panel__title">{tarif.name}</h2>
                  {featured ? (
                    <Chip tone="orange" strong>
                      <Crown size={14} aria-hidden="true" /> Bestseller
                    </Chip>
                  ) : null}
                </div>
                <p className="pk-tier__price" data-offer={angebot ? 'true' : undefined}>
                  <strong>{tarif.price}</strong> <span>{tarif.period}</span>
                </p>
                <p className="pk-tier__desc">{tarif.desc}</p>
                <ToneList items={tarif.features} marker="check" />
              </section>
            );
          })}
        </Grid>
      </DataState>
    </div>
  );
}
