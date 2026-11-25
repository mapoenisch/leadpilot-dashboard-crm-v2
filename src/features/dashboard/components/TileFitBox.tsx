// Auftrag 174b (K2, K5): Kachelinhalt vollständig in der verfügbaren Fläche, ohne Scrollen.
// Der Inhalt wird in einer Layoutbreite gesetzt und per transform verkleinert, bis er passt.
// Die Messung läuft vor dem Zeichnen (useLayoutEffect); die Werte setzt der Effekt direkt am
// Element, nicht als style-Attribut (Qualitätsbudget Issue #7).

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  computeTileFit,
  computeTileFitMinimum,
  TileFitContext,
  TILE_FIT_MIN_SCALE,
  type TileFitMinimum,
} from './tileFit';

export interface TileFitBoxProps {
  children: ReactNode;
  /** Meldet den Platzbedarf bei Mindestfaktor nach jeder Messung (Größe der Fläche oder des Inhalts geändert). */
  onMinimum?: (minimum: TileFitMinimum, box: HTMLElement) => void;
}

export function TileFitBox({ children, onMinimum }: TileFitBoxProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const onMinimumRef = useRef(onMinimum);
  onMinimumRef.current = onMinimum;
  const applyRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let frame = 0;
    let mutationObserver: MutationObserver | null = null;

    const apply = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      const width = outer.clientWidth;
      const height = outer.clientHeight;
      if (width <= 0 || height <= 0) return;

      const measure = (layoutWidth: number) => {
        inner.style.width = `${layoutWidth}px`;
        return inner.offsetHeight;
      };
      inner.style.transform = 'none';
      inner.style.width = 'min-content';
      const minContent = inner.offsetWidth;

      const minimum = computeTileFitMinimum(minContent, measure);
      const fit = computeTileFit(width, height, minContent, measure);

      inner.style.width = `${fit.layoutWidth}px`;
      inner.style.left = `${fit.left}px`;
      inner.style.top = `${fit.top}px`;
      inner.style.transform = fit.scale < 1 ? `scale(${fit.scale})` : 'none';
      outer.dataset.fitScale = fit.scale.toFixed(3);
      outer.dataset.fitBelowMinimum = String(fit.scale < TILE_FIT_MIN_SCALE - 0.001);

      // Codex-Befund PR #223: bei jeder Messung melden, nicht nur bei geändertem Inhaltsbedarf.
      // Ein höherer Kopf (längerer Titel, schmalere Fläche) ändert die Fläche, nicht den Inhalt;
      // die Kachel rechnet Kopf und Fuß beim Empfang hinzu und filtert gleiche Werte selbst.
      onMinimumRef.current?.(minimum, outer);
      // Bereits verarbeitete DOM-Änderungen desselben Commits nicht noch einmal einplanen.
      mutationObserver?.takeRecords();
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    applyRef.current = apply;

    // Auch wenn die Fläche beim ersten Messen noch 0 px hatte (Kachel lädt noch), rechnet jede
    // spätere Größenänderung neu. Eine eigene Breitenänderung mit gleichem Ergebnis ändert keine
    // Größe mehr und löst daher keine weitere Runde aus.
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(outer);
    resizeObserver?.observe(inner);

    // Codex-Befund PR #223 Runde 2: Vergrößert sich der Inhalt nur waagerecht (gleiche Höhe),
    // feuert ResizeObserver bei fester Layoutbreite nicht. Inhaltsänderungen deshalb mitbeobachten.
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(schedule);
      mutationObserver.observe(inner, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      applyRef.current = null;
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Reagiert vor dem Zeichnen auf geänderte Kinder/Daten.
  useLayoutEffect(() => {
    applyRef.current?.();
  }, [children]);

  return (
    <div
      ref={outerRef}
      data-testid="tile-fit-box"
      className="relative h-full w-full min-h-0 overflow-hidden"
    >
      <div
        ref={innerRef}
        data-testid="tile-fit-content"
        className="absolute left-0 top-0 w-full origin-top-left"
      >
        <TileFitContext.Provider value={true}>{children}</TileFitContext.Provider>
      </div>
    </div>
  );
}
