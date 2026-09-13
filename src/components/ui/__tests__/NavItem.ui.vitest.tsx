import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavItem } from '../NavItem';

describe('NavItem', () => {
  it('renders button role when to is not provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <NavItem
        label="Dashboard"
        icon={<span data-testid="nav-icon">📊</span>}
        badge={<span data-testid="nav-badge">3</span>}
        onClick={handleClick}
        dataTestId="nav-item-btn"
      />,
    );

    const item = screen.getByTestId('nav-item-btn');
    expect(item).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument();
    expect(screen.getByTestId('nav-badge')).toBeInTheDocument();

    await user.click(item);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(item, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(item, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders NavLink when to prop is provided', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavItem to="/crm/leads" label="Leads" dataTestId="nav-link-leads" active={true} />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('nav-link-leads');
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(link).toHaveAttribute('href', '/crm/leads');
  });

  it('handles mouse hover events', () => {
    render(<NavItem label="Hover" dataTestId="hover-item" active={false} />);
    const item = screen.getByTestId('hover-item');
    fireEvent.mouseEnter(item);
    fireEvent.mouseLeave(item);
    expect(item).toBeInTheDocument();
  });
});
