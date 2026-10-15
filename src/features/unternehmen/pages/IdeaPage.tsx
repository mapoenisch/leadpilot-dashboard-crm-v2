import { Check, Cpu, Lightbulb, Server, ShieldCheck, Target, Zap } from 'lucide-react';
import { IDEE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';
import { PageHero } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../unternehmenSeiten.css';

// 067I / G54: Echte Ideen-Seite statt WebP — genau eine h1,
// These als Absätze, Alleinstellungsmerkmale als Liste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (04-geschaeftsidee).
// Auftrag 094 (Paket G2, Welle 1): sichtbar ausgeliefert (HTML_PAGES). Vorlage ist das
// Original-WebP: Text neben der Icon-Kachel, 3D-Illustration „B2B Leads“, USP-Karte mit
// gefüllten orangen Häkchen und 3D-Kachelstapel. „Ruhig“ dämpft Leuchten, entfernt nichts.
const KACHEL_ICONS = [ShieldCheck, Cpu, Zap, Server];

function IdeaPageHtml() {
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="company-idea">
      <PageHero eyebrow="Unternehmen" title={IDEE.title} subtitle={IDEE.subtitle} />
      <DataState
        status={IDEE.paragraphs.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Geschäftsidee erfasst."
      >
        <section
          className="us-karte"
          data-tone="cyan"
          data-mit-bild="true"
          aria-label="Problem & Lösung"
          data-testid="idee-these"
        >
          <span className="us-icon" aria-hidden="true">
            <Lightbulb size={30} />
          </span>
          <div className="us-text">
            {IDEE.paragraphs.map((absatz) => (
              <p key={absatz}>{absatz}</p>
            ))}
          </div>
          <div className="us-bild" aria-hidden="true" data-testid="idee-bild">
            <span className="us-bild__ebene us-bild__sockel" />
            <span className="us-bild__ebene us-bild__hinten" />
            <span className="us-bild__ebene us-bild__front">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="us-bild__ebene us-bild__tag">B2B Leads ↗</span>
          </div>
        </section>
        <section
          className="us-karte"
          data-tone="orange"
          data-rahmen="leise"
          data-mit-bild="true"
          aria-labelledby="idee-usps"
          data-testid="idee-usps"
        >
          <span className="us-icon" aria-hidden="true">
            <Target size={30} />
          </span>
          <div className="us-text">
            <h2 className="us-titel" id="idee-usps">
              Alleinstellungsmerkmale (USPs)
            </h2>
            <ul className="us-usps">
              {IDEE.usps.map((usp) => (
                <li key={usp}>
                  <span className="us-haken" aria-hidden="true">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  {usp}
                </li>
              ))}
            </ul>
          </div>
          <div className="us-stapel" aria-hidden="true" data-testid="idee-stapel">
            {IDEE.uspKacheln.map((kachel, index) => {
              const Icon = KACHEL_ICONS[index % KACHEL_ICONS.length] ?? ShieldCheck;
              return (
                <span key={kachel} className="us-stapel__kachel">
                  <Icon size={22} />
                  {kachel}
                </span>
              );
            })}
          </div>
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function IdeaPage() {
  return (
    <ImagePage page="company-idea">
      <IdeaPageHtml />
    </ImagePage>
  );
}
