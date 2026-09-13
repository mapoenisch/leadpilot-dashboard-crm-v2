import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders categories and navigation items in desktop mode', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Enterprise/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Übersicht/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^CRM/ })).toBeInTheDocument();
  });

  it('toggles category expansion on click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile={false} />
      </MemoryRouter>,
    );

    const uebersichtBtn = screen.getByRole('button', { name: /Übersicht/i });
    expect(uebersichtBtn).toHaveAttribute('aria-expanded', 'true');

    await user.click(uebersichtBtn);
    expect(uebersichtBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns null when isMobile is true and isMobileDrawerOpen is false', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile={true} isMobileDrawerOpen={false} />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders mobile drawer and calls onCloseMobileDrawer on close button or escape', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isMobile={true} isMobileDrawerOpen={true} onCloseMobileDrawer={handleClose} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: 'Hauptnavigation' })).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: 'Menü schließen' });
    const closeBtn = buttons[1] || buttons[0]!;
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
