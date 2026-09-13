import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Explosion im Test');
  }
  return <div>Alles in Ordnung</div>;
}

describe('RouteErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <RouteErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Alles in Ordnung')).toBeInTheDocument();
  });

  it('catches render error and displays error UI', () => {
    // Suppress console.error from error boundary test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RouteErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Fehler beim Laden der Seite')).toBeInTheDocument();
    expect(screen.getByText('Explosion im Test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurück zum Dashboard' })).toBeInTheDocument();

    spy.mockRestore();
  });

  it('handles retry button and resetKey prop updates', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <RouteErrorBoundary resetKey="key1">
        <ProblemChild shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Fehler beim Laden der Seite')).toBeInTheDocument();

    // Now render without throwing and click retry
    rerender(
      <RouteErrorBoundary resetKey="key1">
        <ProblemChild shouldThrow={false} />
      </RouteErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(screen.getByText('Alles in Ordnung')).toBeInTheDocument();

    spy.mockRestore();
  });
});
