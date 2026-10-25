import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';

describe('Header', () => {
  it('renders current view title and category label', () => {
    render(<Header currentViewTitle="Executive Dashboard" categoryLabel="Übersicht" />);
    expect(screen.getByRole('heading', { name: 'Executive Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Übersicht /')).toBeInTheDocument();
    expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
  });

  it('zeigt Profil und sichtbaren Abmelden-Button und ruft onLogout', async () => {
    const user = userEvent.setup();
    const handleLogout = vi.fn();
    render(
      <Header
        currentViewTitle="Dashboard"
        userEmail="anna@example.com"
        userRoleLabel="Manager"
        onLogout={handleLogout}
      />,
    );
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Abmelden' });
    expect(btn).toHaveAttribute('data-leave-guard');
    expect(btn.className).not.toContain('opacity-0');
    await user.click(btn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('renders mobile menu trigger when isMobile is true and calls onToggleMobileMenu', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(
      <Header
        currentViewTitle="Dashboard"
        isMobile={true}
        isMobileMenuOpen={false}
        onToggleMobileMenu={handleToggle}
      />,
    );

    const menuBtn = screen.getByRole('button', { name: 'Hauptmenü umschalten' });
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders theme toggle and calls onToggleTheme', async () => {
    const user = userEvent.setup();
    const handleToggleTheme = vi.fn();
    const { rerender } = render(
      <Header currentViewTitle="Dashboard" theme="dark" onToggleTheme={handleToggleTheme} />,
    );

    const themeBtn = screen.getByRole('button', { name: 'Zum hellen Design wechseln' });
    expect(themeBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(themeBtn);
    expect(handleToggleTheme).toHaveBeenCalledTimes(1);

    rerender(
      <Header currentViewTitle="Dashboard" theme="light" onToggleTheme={handleToggleTheme} />,
    );
    expect(screen.getByRole('button', { name: 'Zum dunklen Design wechseln' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
