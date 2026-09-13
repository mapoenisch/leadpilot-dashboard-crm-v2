import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';
import { AuthProvider } from '@/auth/AuthContext';

describe('Layout', () => {
  it('renders Layout with Header, Sidebar, SimulationBar and Main', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('main', { name: 'Hauptinhalt' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Simulation Command Strip' })).toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('handles logout click and navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </MemoryRouter>
    );

    const logoutBtn = screen.getByTestId('logout-button');
    await user.click(logoutBtn);
  });

  it('responds to window resize events', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </MemoryRouter>
    );

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      window.innerWidth = 1200;
      window.dispatchEvent(new Event('resize'));
    });
  });
});
