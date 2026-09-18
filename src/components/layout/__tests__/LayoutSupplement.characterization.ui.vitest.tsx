import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { SimulationBar } from '../SimulationBar';

describe('Layout-Supplement (characterization)', () => {
  it('Header ohne optionale Props zeigt nur Titel und Profil', () => {
    render(<Header currentViewTitle="Nur Titel" />);
    expect(screen.getByRole('heading', { name: 'Nur Titel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hauptmenü umschalten' })).toBeNull();
    expect(screen.queryByRole('button', { name: /hellen Design|dunklen Design/ })).toBeNull();
    expect(screen.getByText('Marc Pönisch')).toBeInTheDocument();
  });

  it('Header zeigt mobilen Menü-Button im geöffneten Zustand', () => {
    render(
      <Header
        currentViewTitle="Dashboard"
        isMobile
        isMobileMenuOpen
        onToggleMobileMenu={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Hauptmenü umschalten' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('Sidebar rendert Footer und schließt mobilen Drawer per Button', async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar
          isMobile
          isMobileDrawerOpen
          onCloseMobileDrawer={() => {
            closed += 1;
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();
    expect(screen.getByText('LeadPilot GmbH © 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Menü schließen' }));
    expect(closed).toBe(1);
  });

  it('SimulationBar zeigt Tempo-Optionen und Live-Kennzahlen', () => {
    render(<SimulationBar />);
    for (const label of ['1x', '2x', '5x', '10x']) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('Leads:')).toBeInTheDocument();
    expect(screen.getByText('Won:')).toBeInTheDocument();
  });
});
