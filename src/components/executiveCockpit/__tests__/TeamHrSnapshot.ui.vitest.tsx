import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamHrSnapshot } from '../TeamHrSnapshot';

describe('TeamHrSnapshot', () => {
  it('renders team hierarchy, organizational units and bottleneck indicators', () => {
    render(<TeamHrSnapshot />);

    expect(screen.getByTestId('team-hr-snapshot')).toBeInTheDocument();
    expect(screen.getByText('Marc Pönisch (Gründer & CEO)')).toBeInTheDocument();
    expect(screen.getByText('Engineering / Product')).toBeInTheDocument();
    expect(screen.getByText('Customer Success')).toBeInTheDocument();
  });
});
