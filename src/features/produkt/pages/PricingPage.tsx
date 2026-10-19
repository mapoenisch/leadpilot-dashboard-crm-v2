import { ArrowRight, BarChart3, Crown, TrendingUp, User, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRICING } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import { Chip, Grid, PageHero, ToneList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../produktSeiten.css';

// 067I / G54: Echte Preisseite statt WebP — genau eine h1,
// Tarife als Abschnitte mit Merkmalslisten, Preise aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (08-preismodell).
// Auftrag 103 (Paket G2, Welle 10): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Vorlage ist das
// Original-WebP: drei Tarifkarten mit 3D-Illustration (dekorativ, aria-hidden), Growth hervorgehoben,
// „Paket wählen“ je Karte. Statt toter Bild-Buttons führt der Link zur Deal Pipeline (dort wird
// das Paket eines Deals festgelegt). Preise nach Faktenblatt v1.2 §2.
const TARIF_BILD: Record<string, 'starter' | 'growth' | 'pro'> = {
  Starter: 'starter',
  Growth: 'growth',
  Pro: 'pro',
};

function TarifBild({ art }: { art: 'starter' | 'growth' | 'pro' }) {
  return (
    <div className="pd-bild pd-tarifbild" data-art={art} aria-hidden="true">
      <span className="pd-bild__sockel" />
      <span className="pd-bild__block">
        {art === 'starter' ? (
          <span className="pd-bild__kreis">
            <User size={28} />
          </span>
        ) : null}
        {art === 'growth' ? (
          <>
            <TrendingUp size={26} className="pd-tarifbild__pfeil" />
            <BarChart3 size={36} />
          </>
        ) : null}
        {art === 'pro' ? <Users size={36} /> : null}
      </span>
    </div>
  );
}

function PricingPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="product-pricing">
      <PageHero
        eyebrow="Produkt"
        title={PRICING.title}
        subtitle="Transparente SaaS-Pakete für den B2B-Mittelstand."
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
            const bild = TARIF_BILD[tarif.name];
            return (
              <section
                key={tarif.name}
                aria-label={`Tarif ${tarif.name}`}
                className="pk-panel pk-tier pd-tarif"
                data-tone="cyan"
                data-featured={featured ? 'true' : undefined}
                data-testid="produkt-tarif"
              >
                <div className="pd-tarif__kopf">
                  <div className="pd-tarif__text">
                    <div className="pk-panel__head">
                      <h2 className="pk-panel__title">{tarif.name}</h2>
                      {featured ? (
                        <span className="pd-tarif__chip">
                          <Chip tone="orange" strong>
                            <Crown size={14} aria-hidden="true" /> Bestseller
                          </Chip>
                        </span>
                      ) : null}
                    </div>
                    <p className="pk-tier__price" data-offer={angebot ? 'true' : undefined}>
                      <strong>{tarif.price}</strong> <span>{tarif.period}</span>
                    </p>
                    <p className="pk-tier__desc">{tarif.desc}</p>
                  </div>
                  {bild ? <TarifBild art={bild} /> : null}
                </div>
                <ToneList items={tarif.features} marker="check" />
                <Link
                  className="pd-tarif__wahl"
                  data-featured={featured ? 'true' : undefined}
                  to="/crm/deals"
                  aria-label={`Paket wählen: ${tarif.name} – zur Deal Pipeline`}
                >
                  Paket wählen <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </section>
            );
          })}
        </Grid>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function PricingPage() {
  return (
    <ImagePage page="product-pricing">
      <PricingPageHtml />
    </ImagePage>
  );
}
