import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { logger } from '@/services/logger';
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

// Keine Stil-Varianten — cva nur als Basis (Muster-Einheitlichkeit).
const routeErrorBoundaryVariants = cva('flex items-center justify-center min-h-[400px] p-6');

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
    logger.error('[RouteErrorBoundary] Uncaught route error:', error, errorInfo);
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
        <div role="alert" aria-live="assertive" className={cn(routeErrorBoundaryVariants())}>
          <Card
            variant="glass"
            className="flex w-full max-w-[560px] flex-col items-center gap-4 text-center"
          >
            <div className="w-[48px] h-[48px] rounded-full bg-[rgba(239,68,68,0.15)] text-error text-[24px] flex items-center justify-center">
              ⚠️
            </div>

            <h2 className="text-[20px] font-semibold text-text m-0">Fehler beim Laden der Seite</h2>

            <p className="text-sm m-0 leading-[1.5]">
              {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>

            <div className="flex flex-wrap gap-3 justify-center mt-2">
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
