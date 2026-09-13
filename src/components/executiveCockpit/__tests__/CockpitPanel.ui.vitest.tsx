import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CockpitPanel } from '../CockpitPanel';

describe('CockpitPanel', () => {
  it('renders title, subtitle and children', () => {
    render(
      <CockpitPanel title="Finanzlage" subtitle="Monatliche Übersicht">
        <div data-testid="panel-content">Inhalt</div>
      </CockpitPanel>,
    );

    expect(screen.getByRole('heading', { name: 'Finanzlage' })).toBeInTheDocument();
    expect(screen.getByText('Monatliche Übersicht')).toBeInTheDocument();
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('renders sourceLabel, badge and actions when provided', () => {
    render(
      <CockpitPanel
        title="Pipeline"
        sourceLabel="Ebene A"
        badge={<span data-testid="test-badge">Neu</span>}
        actions={<button data-testid="test-action">Filter</button>}
      >
        <p>Pipeline Details</p>
      </CockpitPanel>,
    );

    expect(screen.getByText('Ebene A')).toBeInTheDocument();
    expect(screen.getByTestId('test-badge')).toBeInTheDocument();
    expect(screen.getByTestId('test-action')).toBeInTheDocument();
  });
});
