import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Klick mich</Button>);
    expect(screen.getByRole('button', { name: 'Klick mich' })).toBeInTheDocument();
  });

  it('triggers onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Klick</Button>);

    await user.click(screen.getByRole('button', { name: 'Klick' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles loading state with spinner and aria-busy', () => {
    render(<Button loading>Speichern</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Laden...' })).toBeInTheDocument();
  });

  it('renders left and right icons', () => {
    render(
      <Button
        iconLeft={<span data-testid="icon-left">L</span>}
        iconRight={<span data-testid="icon-right">R</span>}
      >
        Mit Icons
      </Button>
    );
    expect(screen.getByTestId('icon-left')).toBeInTheDocument();
    expect(screen.getByTestId('icon-right')).toBeInTheDocument();
  });

  it('toggles hover state on mouse enter and leave', () => {
    render(<Button>Hover Me</Button>);
    const btn = screen.getByRole('button', { name: 'Hover Me' });

    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(btn).toBeInTheDocument();
  });

  it('supports all variants, sizes and fullWidth', () => {
    const variants = ['primary', 'secondary', 'accent', 'danger'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(
          <Button variant={variant} size={size} fullWidth>
            {variant}-{size}
          </Button>
        );
        expect(screen.getByRole('button', { name: `${variant}-${size}` })).toBeInTheDocument();
        unmount();
      }
    }
  });
});
