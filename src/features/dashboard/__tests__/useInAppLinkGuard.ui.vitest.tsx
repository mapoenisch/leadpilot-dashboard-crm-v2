// Auftrag 077: Navigationsschutz für interne Links bei ungespeicherten Änderungen.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { internalLinkTarget, useInAppLinkGuard } from '../hooks/useInAppLinkGuard';

const ORIGIN = window.location.origin;

function clickOn(element: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  Object.defineProperty(event, 'target', { value: element });
  return event;
}

function anchor(attrs: Record<string, string>): HTMLAnchorElement {
  const element = document.createElement('a');
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  element.textContent = 'Link';
  return element;
}

describe('internalLinkTarget', () => {
  it('liefert interne Ziele mit Suche und Anker', () => {
    expect(internalLinkTarget(clickOn(anchor({ href: '/crm/leads' })), ORIGIN, '/dashboard')).toBe(
      '/crm/leads',
    );
    expect(internalLinkTarget(clickOn(anchor({ href: '/x?a=1#b' })), ORIGIN, '/dashboard')).toBe(
      '/x?a=1#b',
    );
  });

  it('findet den Link auch über ein inneres Element', () => {
    const link = anchor({ href: '/crm/leads' });
    const inner = document.createElement('span');
    link.appendChild(inner);
    expect(internalLinkTarget(clickOn(inner), ORIGIN, '/dashboard')).toBe('/crm/leads');
  });

  it('lässt neue Fenster, Downloads, externe Ziele, Zusatztasten und dieselbe Seite durch', () => {
    const here = '/dashboard';
    expect(
      internalLinkTarget(clickOn(anchor({ href: '/a', target: '_blank' })), ORIGIN, here),
    ).toBeNull();
    expect(
      internalLinkTarget(clickOn(anchor({ href: '/a', download: '' })), ORIGIN, here),
    ).toBeNull();
    expect(
      internalLinkTarget(clickOn(anchor({ href: 'https://example.org/a' })), ORIGIN, here),
    ).toBeNull();
    expect(
      internalLinkTarget(clickOn(anchor({ href: '/a' }), { metaKey: true }), ORIGIN, here),
    ).toBeNull();
    expect(
      internalLinkTarget(clickOn(anchor({ href: '/a' }), { button: 1 }), ORIGIN, here),
    ).toBeNull();
    expect(internalLinkTarget(clickOn(anchor({ href: '/dashboard' })), ORIGIN, here)).toBeNull();
    expect(internalLinkTarget(clickOn(document.createElement('button')), ORIGIN, here)).toBeNull();
  });
});

function Harness(props: { active: boolean; onLeave: (to: string) => void; onClick: () => void }) {
  useInAppLinkGuard(props.active, props.onLeave);
  return (
    <a
      href="/crm/leads"
      onClick={(event) => {
        event.preventDefault();
        props.onClick();
      }}
    >
      Leads
    </a>
  );
}

describe('useInAppLinkGuard', () => {
  it('fängt bei offenen Änderungen den Klick ab, bevor der Router ihn ausführt', () => {
    const onLeave = vi.fn();
    const onClick = vi.fn();
    render(<Harness active onLeave={onLeave} onClick={onClick} />);
    const prevented = !fireEvent.click(screen.getByText('Leads'));
    expect(prevented).toBe(true);
    expect(onLeave).toHaveBeenCalledWith('/crm/leads');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ist ohne offene Änderungen wirkungslos', () => {
    const onLeave = vi.fn();
    const onClick = vi.fn();
    const { rerender } = render(<Harness active onLeave={onLeave} onClick={onClick} />);
    rerender(<Harness active={false} onLeave={onLeave} onClick={onClick} />);
    fireEvent.click(screen.getByText('Leads'));
    expect(onLeave).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
