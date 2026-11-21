// Auftrag 172 (P15b §2.1 Nr. 3): misst sichtbare Bedienelemente unter 44 × 44 px.
import type { Page } from '@playwright/test';

export const MIN_TOUCH_PX = 44;

/** Liefert Beschreibungen aller sichtbaren Bedienelemente < 44 px in `rootSelector`. */
export async function findSmallTouchTargets(page: Page, rootSelector: string): Promise<string[]> {
  return page.evaluate(
    ({ rootSelector, min }) => {
      const roots = Array.from(document.querySelectorAll(rootSelector));
      const selector = [
        'button',
        '[role="button"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[role="option"]',
        'select',
        'a[href]',
        'input:not([type="hidden"])',
      ].join(',');
      const small: string[] = [];
      for (const root of roots) {
        for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          if (el.closest('.sr-only') || Number(style.opacity) === 0) continue;
          if (el.getAttribute('aria-hidden') === 'true') continue;
          let target: Element = el;
          if (el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)) {
            target = el.closest('label') ?? el;
          }
          const r = target.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          // Ausgeblendete Elterncontainer (z. B. Hover-Leisten mit opacity 0)
          let hidden = false;
          for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
            if (Number(getComputedStyle(p).opacity) === 0) {
              hidden = true;
              break;
            }
          }
          if (hidden) continue;
          if (r.width < min - 0.5 || r.height < min - 0.5) {
            const name =
              el.getAttribute('aria-label') ||
              el.getAttribute('data-testid') ||
              el.textContent?.trim().slice(0, 30) ||
              el.tagName;
            small.push(`${name} (${Math.round(r.width)}×${Math.round(r.height)})`);
          }
        }
      }
      return small;
    },
    { rootSelector, min: MIN_TOUCH_PX },
  );
}
