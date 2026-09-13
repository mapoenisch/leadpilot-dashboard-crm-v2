import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders children correctly', () => {
    render(<Alert>Hinweistext</Alert>);
    expect(screen.getByText('Hinweistext')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title="Achtung">Hinweistext mit Titel</Alert>);
    expect(screen.getByText('Achtung')).toBeInTheDocument();
    expect(screen.getByText('Hinweistext mit Titel')).toBeInTheDocument();
  });

  it('renders all variants without crashing', () => {
    const variants = ['info', 'success', 'warning', 'error'] as const;
    for (const variant of variants) {
      render(
        <Alert variant={variant} title={`${variant} title`}>
          Message for {variant}
        </Alert>,
      );
      expect(screen.getByText(`${variant} title`)).toBeInTheDocument();
    }
  });
});
