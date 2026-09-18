import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrganisationScaffold } from '../OrganisationScaffold';
import { CapacityNetwork } from '../CapacityNetwork';
import { OrganisationStructure } from '../OrganisationStructure';
import { OrganisationUnitCard } from '../OrganisationUnitCard';

describe('OrganisationScaffold (characterization)', () => {
  it('rendert Gerüst-Überschrift, Badge und Zeitreihen-Diagramm', () => {
    const { container } = render(<OrganisationScaffold />);
    expect(screen.getByText('Headcount-Entwicklung & Organisationsgerüst')).toBeInTheDocument();
    expect(screen.getByText('ORGANISATIONSGERÜST')).toBeInTheDocument();
    expect(
      container.querySelector('svg[aria-label="Diagramm: Quartalsweise FTE-Entwicklung"]'),
    ).not.toBeNull();
  });

  it('zeigt funktionale FTE-Bausteine und Gesamtbestand', () => {
    const { container } = render(<OrganisationScaffold />);
    const region = container.querySelector('[aria-label="Funktionale FTE-Bausteine"]');
    expect(region).not.toBeNull();
    expect(region?.querySelectorAll('article').length).toBeGreaterThan(0);
    expect(
      screen.getByText('FUNKTIONALE KAPAZITÄTSBAUSTEINE (FTE ZUM STICHTAG)'),
    ).toBeInTheDocument();
  });

  it('benennt Zeitreihen-Spannweite im Untertitel', () => {
    render(<OrganisationScaffold />);
    expect(screen.getByText(/Zeitreihe .* bis .* & funktionale Bausteine/)).toBeInTheDocument();
    expect(screen.getByText('ZEITREIHE: QUARTALSVERLAUF (FTE)')).toBeInTheDocument();
  });
});

describe('CapacityNetwork (characterization)', () => {
  it('rendert Netzwerk-Überschrift, Badge und SVG-Netz', () => {
    const { container } = render(<CapacityNetwork />);
    expect(
      screen.getByText('Kapazitätsnetz der Organisation & Engpass-Topografie'),
    ).toBeInTheDocument();
    expect(screen.getByText('KAPAZITÄTSNETZWERK')).toBeInTheDocument();
    expect(
      container.querySelector(
        'svg[aria-label="Diagramm: Kapazitätsnetzwerk der Rollen mit Engpässen"]',
      ),
    ).not.toBeNull();
  });

  it('zeigt Funktionskarten mit FTE-Details', () => {
    const { container } = render(<CapacityNetwork />);
    const region = container.querySelector('[aria-label="Funktionskarten mit Engpass-Details"]');
    expect(region).not.toBeNull();
    expect(region?.querySelectorAll('article').length).toBeGreaterThan(0);
  });
});

describe('OrganisationStructure (characterization)', () => {
  it('rendert Organigramm-Sektion mit Titel und Stichtag', () => {
    render(<OrganisationStructure />);
    expect(screen.getByLabelText('Organisationsstruktur LeadPilot')).toBeInTheDocument();
    expect(screen.getByText('Funktionale Organisation & Führungsspanne')).toBeInTheDocument();
    expect(screen.getByText('Stand: 31.12.2025')).toBeInTheDocument();
    expect(screen.getByText('Organigramm · Ebene A')).toBeInTheDocument();
  });

  it('zeigt Funktionsbereiche und Gesamtbestand', () => {
    const { container } = render(<OrganisationStructure />);
    const section = screen.getByLabelText('Organisationsstruktur LeadPilot');
    expect(section.querySelectorAll('.organigram-grid > *').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('FTE');
  });
});

describe('OrganisationUnitCard (characterization)', () => {
  it('rendert Rolle, FTE und Besetzung ohne Fokus-Badge', () => {
    render(
      <OrganisationUnitCard
        unit={{ role: 'Vertrieb', fte: '3,0 FTE', staffing: 'Stabil besetzt' }}
      />,
    );
    expect(screen.getByText('Vertrieb')).toBeInTheDocument();
    expect(screen.getByText('3,0 FTE')).toBeInTheDocument();
    expect(screen.getByText('Stabil besetzt')).toBeInTheDocument();
    expect(screen.queryByText('Kapazitätsfokus')).toBeNull();
  });

  it('markiert kritische Besetzung mit Kapazitätsfokus', () => {
    render(
      <OrganisationUnitCard
        unit={{ role: 'Engineering', fte: '1,5 FTE', staffing: 'kritisch unterbesetzt' }}
      />,
    );
    expect(screen.getByText('Kapazitätsfokus')).toBeInTheDocument();
  });

  it('markiert Lücken-Besetzung ebenfalls als Fokus', () => {
    render(
      <OrganisationUnitCard
        unit={{ role: 'Support', fte: '0,5 FTE', staffing: 'Lücke im Spätdienst' }}
      />,
    );
    expect(screen.getByText('Kapazitätsfokus')).toBeInTheDocument();
  });

  it('hebt Root-Einheit ohne Fokus-Badge hervor', () => {
    render(
      <OrganisationUnitCard
        unit={{ role: 'CEO / Ops', fte: '2,0 FTE', staffing: 'Stabil besetzt', isRoot: true }}
        highlight
      />,
    );
    expect(screen.getByText('CEO / Ops')).toBeInTheDocument();
    expect(screen.queryByText('Kapazitätsfokus')).toBeNull();
  });
});
