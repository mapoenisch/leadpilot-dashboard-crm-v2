import React from 'react';
import { Card } from './Card';
import { Button } from './Button';

export interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[RouteErrorBoundary] Uncaught route error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: 'var(--space-6)',
          }}
        >
          <Card
            variant="glass"
            style={{
              maxWidth: '560px',
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-error, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                fontSize: 'var(--font-size-xl, 20px)',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              Fehler beim Laden der Seite
            </h2>

            <p
              style={{
                fontSize: 'var(--font-size-sm, 14px)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
                justifyContent: 'center',
                marginTop: 'var(--space-2)',
              }}
            >
              <Button variant="primary" size="md" onClick={this.handleRetry}>
                Erneut versuchen
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
              >
                Zurück zum Dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
