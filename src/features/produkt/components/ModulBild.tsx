import {
  BarChart3,
  Building2,
  Clock,
  Globe,
  Linkedin,
  Mail,
  Send,
  Target,
  User,
  type LucideIcon,
} from 'lucide-react';

// Auftrag 095 (Paket G2, Welle 2): dekorative 3D-Illustrationen der vier Produktmodule
// (Original-WebP 07-produkt-funktionsweise). Reine Zierde: aria-hidden, nicht fokussierbar.
// Ohne Zahlen: die Bildzahlen des Originals sind nicht belegt und werden nicht übernommen
// (Befundregister 2026-10-06, G2 „Keine Daten, keine Übernahme“).
export type ModulBildArt = 'capture' | 'scoring' | 'nurturing' | 'pipeline';

function Kachel({ icon: Icon, children }: { icon?: LucideIcon; children?: string }) {
  return (
    <span className="pd-kachel">
      {Icon ? <Icon size={18} /> : null}
      {children}
    </span>
  );
}

const SPALTEN: Array<[string, string]> = [
  ['New', 'cyan'],
  ['MQL', 'blau'],
  ['SQL', 'orange'],
  ['Hot', 'orange'],
  ['Won', 'gruen'],
  ['Lost', 'grau'],
];

export function ModulBild({ art }: { art: ModulBildArt }) {
  return (
    <div className="pd-bild" data-art={art} aria-hidden="true" data-testid={`modul-bild-${art}`}>
      {art === 'capture' ? (
        <>
          <span className="pd-bild__quellen">
            <Kachel icon={Globe} />
            <Kachel icon={Mail} />
            <Kachel icon={Linkedin} />
          </span>
          <span className="pd-bild__sockel" />
          <span className="pd-bild__block">
            <span className="pd-bild__kreis">
              <User size={30} />
            </span>
            Leads
          </span>
        </>
      ) : null}
      {art === 'scoring' ? (
        <>
          <span className="pd-bild__sockel" />
          <span className="pd-bild__block pd-bild__block--hinten" />
          <span className="pd-bild__block pd-bild__score">
            Lead Score
            <span className="pd-bild__balken" />
          </span>
          <span className="pd-bild__liste">
            <Kachel icon={Building2}>Firmografie</Kachel>
            <Kachel icon={Target}>ICP-Fit</Kachel>
            <Kachel icon={BarChart3}>Verhalten</Kachel>
          </span>
        </>
      ) : null}
      {art === 'nurturing' ? (
        <>
          <span className="pd-bild__sockel" />
          <span className="pd-bild__block pd-bild__mail">
            <Mail size={40} />
          </span>
          <span className="pd-bild__liste">
            <Kachel icon={Mail}>1. E-Mail</Kachel>
            <Kachel icon={Clock}>2. Follow-up</Kachel>
            <Kachel icon={Send}>3. Nurturing</Kachel>
          </span>
        </>
      ) : null}
      {art === 'pipeline' ? (
        <>
          <span className="pd-bild__sockel" />
          <span className="pd-bild__spalten">
            {SPALTEN.map(([name, farbe]) => (
              <span key={name} className="pd-spalte" data-farbe={farbe}>
                <span className="pd-spalte__kopf">{name}</span>
                <span className="pd-spalte__balken" />
                <span className="pd-spalte__balken" />
                <span className="pd-spalte__balken" />
              </span>
            ))}
          </span>
        </>
      ) : null}
    </div>
  );
}
