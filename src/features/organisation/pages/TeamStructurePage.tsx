import {
  AlertTriangle,
  BarChart3,
  Code2,
  Headphones,
  Megaphone,
  Settings,
  User,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { TEAM, getOrganisationStructure, type OrganisationUnit } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';
import { Chip, PageHero, Panel } from '@/components/pageKit';
import { hatEngpass } from './HeadcountPage';
import { ImagePage } from '@/components/imagePage';
import '../organisationSeiten.css';

// 067I / G55: Echte Teamstruktur-Seite statt WebP — genau eine h1,
// Organigramm aus HEADCOUNT abgeleitet plus Engpässe als Liste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (03-teamstruktur-engpaesse).
// Auftrag 100 (Paket G2, Welle 7): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Titel, Panelköpfe und
// Feldmarkierungen wie im Original-WebP.
const EINHEIT_ICONS: LucideIcon[] = [Code2, BarChart3, Headphones, Megaphone];
const FELD_ICONS: LucideIcon[] = [AlertTriangle, BarChart3, Zap, Settings];
/** Markierung je Analysefeld wie im Original-WebP; ein Feld „Maßnahme…“ ist immer geplant. */
const FELD_MARKEN = ['Kritischer Engpass', 'Kapazitätsgrenze', 'Schlüsselrisiko'];

function Einheit({ einheit, icon: Icon }: { einheit: OrganisationUnit; icon: LucideIcon }) {
  const engpass = hatEngpass(einheit.role);
  return (
    <div className="pk-unit" data-tone={engpass ? 'orange' : 'cyan'}>
      <span className="pk-icon" data-shape="round" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <div className="pk-unit__body">
        <div className="pk-unit__head">
          <h3 className="pk-unit__title">{einheit.role}</h3>
          <Chip tone="cyan">{einheit.fte}</Chip>
        </div>
        <p className="pk-unit__text">{einheit.staffing}</p>
        {engpass ? (
          <span>
            <Chip tone="orange">Kapazitätsfokus</Chip>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** „Engpass 1: Engineering — …“ → fetter Vorspann bis zum Doppelpunkt, Rest normal. */
function FeldText({ text }: { text: string }) {
  const index = text.indexOf(':');
  if (index < 0) return <p className="pk-unit__text">{text}</p>;
  return (
    <p className="pk-unit__text">
      <strong>{text.slice(0, index + 1)}</strong>
      {text.slice(index + 1)}
    </p>
  );
}

function TeamStructurePageHtml() {
  const struktur = getOrganisationStructure();
  const einheiten = [struktur.root, ...struktur.units, struktur.total];
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="organisation-team">
      <PageHero
        eyebrow="Organisation"
        title={TEAM.title}
        subtitle="Funktionale Struktur, Führungsspanne und operative Engpassanalyse (Stand: 31.12.2025)."
        pills={['Stand: 31.12.2025', 'Ebene A Baseline']}
      />
      <DataState
        status={einheiten.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Teamstruktur erfasst."
      >
        <Panel
          className="org-organigramm"
          title="Funktionale Organisation & Führungsspanne"
          subtitle="Organigramm · Ebene A"
          chip="Stand: 31.12.2025"
        >
          <div className="pk-org">
            <div className="pk-org__root">
              <Einheit einheit={struktur.root} icon={User} />
            </div>
            <ul className="pk-org__units" aria-label="Funktionale Einheiten">
              {struktur.units.map((einheit, index) => (
                <li key={einheit.role}>
                  <Einheit einheit={einheit} icon={EINHEIT_ICONS[index] ?? Users} />
                </li>
              ))}
            </ul>
            <div className="pk-row" data-tone="cyan">
              <span className="pk-row__head">
                <span className="pk-icon" data-shape="round" aria-hidden="true">
                  <Users size={20} />
                </span>
                <strong className="pk-row__title">{struktur.total.role}</strong>
                <Chip>{struktur.total.fte}</Chip>
              </span>
              <span className="pk-row__text" />
              <span className="pk-row__aside pk-muted">{struktur.total.staffing}</span>
            </div>
          </div>
        </Panel>
        <Panel
          title="Operative Engpässe & Risikofelder"
          subtitle="Identifizierte Kapazitätsgrenzen und geplante Gegenmaßnahmen"
          chip={`${TEAM.bottlenecks.length} Analysefelder`}
          chipTone="orange"
        >
          <ul className="pk-grid" data-cols="4">
            {TEAM.bottlenecks.map((engpass, index) => {
              const massnahme = engpass.startsWith('Maßnahme');
              const Icon = FELD_ICONS[index] ?? AlertTriangle;
              const marke = massnahme ? 'Geplante Maßnahme' : (FELD_MARKEN[index] ?? 'Engpass');
              return (
                <li key={engpass} className="pk-unit" data-tone={massnahme ? 'cyan' : 'orange'}>
                  <div className="pk-unit__body">
                    <div className="pk-unit__head">
                      <span className="pk-strong-tone pk-inline">
                        <Icon size={18} aria-hidden="true" /> Feld {index + 1}
                      </span>
                      <Chip tone={massnahme ? 'cyan' : 'orange'}>{marke}</Chip>
                    </div>
                    <FeldText text={engpass} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function TeamStructurePage() {
  return (
    <ImagePage page="organisation-team">
      <TeamStructurePageHtml />
    </ImagePage>
  );
}
