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

// 067I / G55: Echte Teamstruktur-Seite statt WebP — genau eine h1,
// Organigramm aus HEADCOUNT abgeleitet plus Engpässe als Liste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (03-teamstruktur-engpaesse).
const EINHEIT_ICONS: LucideIcon[] = [Code2, BarChart3, Headphones, Megaphone];
const FELD_ICONS: LucideIcon[] = [AlertTriangle, BarChart3, Zap, Settings];

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
          <Chip tone="cyan" strong>
            {einheit.fte}
          </Chip>
        </div>
        <p className="pk-unit__text">{einheit.staffing}</p>
        {engpass ? (
          <span>
            <Chip tone="orange" strong>
              Engpass
            </Chip>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TeamStructurePage() {
  const struktur = getOrganisationStructure();
  const einheiten = [struktur.root, ...struktur.units, struktur.total];
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Organisation"
        title="Teamstruktur"
        subtitle={`${TEAM.title}: funktionale Einheiten mit Führungsspanne und Engpässen.`}
        pills={['Stand: 31.12.2025', 'Ebene A Baseline']}
      />
      <DataState
        status={einheiten.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Teamstruktur erfasst."
      >
        <Panel title="Organigramm" subtitle="Funktionale Organisation & Führungsspanne">
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
                <Users size={20} aria-hidden="true" />
                <strong className="pk-row__title">{struktur.total.role}</strong>
                <Chip strong>{struktur.total.fte}</Chip>
              </span>
              <span className="pk-row__text" />
              <span className="pk-row__aside pk-muted">{struktur.total.staffing}</span>
            </div>
          </div>
        </Panel>
        <Panel
          title="Engpässe"
          subtitle="Identifizierte Kapazitätsgrenzen und geplante Gegenmaßnahmen"
          tone="orange"
          chip={`${TEAM.bottlenecks.length} Analysefelder`}
        >
          <ul className="pk-grid" data-cols="4">
            {TEAM.bottlenecks.map((engpass, index) => {
              const massnahme = engpass.startsWith('Maßnahme');
              const Icon = FELD_ICONS[index] ?? AlertTriangle;
              return (
                <li key={engpass} className="pk-unit" data-tone={massnahme ? 'cyan' : 'orange'}>
                  <div className="pk-unit__body">
                    <div className="pk-unit__head">
                      <span className="pk-strong-tone pk-inline">
                        <Icon size={18} aria-hidden="true" /> Feld {index + 1}
                      </span>
                      <Chip tone={massnahme ? 'cyan' : 'orange'} strong>
                        {massnahme ? 'Maßnahme' : 'Engpass'}
                      </Chip>
                    </div>
                    <p className="pk-unit__text">{engpass}</p>
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
