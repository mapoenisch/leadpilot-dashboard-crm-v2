import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Layout, getInitialTheme, THEME_STORAGE_KEY } from '../Layout';
import { AuthProvider } from '@/auth/AuthContext';

describe('Layout', () => {
  it('renders Layout with Header, Sidebar, SimulationBar and Main', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </MemoryRouter>,
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
      </MemoryRouter>,
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
      </MemoryRouter>,
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

  describe('Theme resilience and fallback', () => {
    const originalLocalStorage = window.localStorage;

    afterEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('falls back to dark when localStorage is undefined or throws', () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Storage is not available for opaque origins', 'SecurityError');
        },
        configurable: true,
      });

      expect(getInitialTheme()).toBe('dark');
    });

    it('reads light theme when localStorage has light configured', () => {
      const mockStorage = {
        getItem: vi.fn((key: string) => (key === THEME_STORAGE_KEY ? 'light' : null)),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      expect(getInitialTheme()).toBe('light');
    });

    it('falls back to dark when localStorage contains unknown value or dark', () => {
      const mockStorage = {
        getItem: vi.fn(() => 'other-value'),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      expect(getInitialTheme()).toBe('dark');
    });

    it('allows toggling theme via Header button even if localStorage throws on write', async () => {
      const user = userEvent.setup();
      const mockStorage = {
        getItem: vi.fn(() => 'dark'),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError');
        }),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </MemoryRouter>,
      );

      const themeToggle = screen.getByRole('button', { name: /Zum hellen Design wechseln/i });
      expect(themeToggle).toBeInTheDocument();

      await user.click(themeToggle);

      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });
});
