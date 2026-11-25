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
    let disposed = false;
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
        return Math.max(inner.offsetHeight, inner.scrollHeight);
      };
      inner.style.transform = 'none';
      inner.style.left = '0px';
      inner.style.top = '0px';
      inner.style.width = 'min-content';
      const minContent = Math.max(inner.offsetWidth, inner.scrollWidth);

      const minimum = computeTileFitMinimum(minContent, measure);
      const fit = computeTileFit(width, height, minContent, measure);

      let scale = fit.scale;
      let left = fit.left;
      let top = fit.top;
      const write = () => {
        inner.style.width = `${fit.layoutWidth}px`;
        inner.style.left = `${left}px`;
        inner.style.top = `${top}px`;
        inner.style.transform = scale < 1 ? `scale(${scale})` : 'none';
      };
      write();

      // Prüft nach dem Setzen am echten Box-Modell (Subpixel-Rundung, überstehende SVG-/Kindboxen)
      // und engt bei Bedarf nach, bis kein Scrollüberlauf mehr messbar ist.
      for (let i = 0; i < 3 && (outer.scrollWidth > width || outer.scrollHeight > height); i++) {
        const rx = outer.scrollWidth > width ? width / outer.scrollWidth : 1;
        const ry = outer.scrollHeight > height ? height / outer.scrollHeight : 1;
        scale = Math.max(0.05, scale * Math.min(rx, ry) * 0.995);
        left = Math.max(0, Math.floor((width - fit.layoutWidth * scale) / 2));
        top = Math.max(0, Math.floor((height - fit.layoutHeight * scale) / 2));
        write();
      }

      outer.dataset.fitScale = scale.toFixed(3);
      outer.dataset.fitBelowMinimum = String(scale < TILE_FIT_MIN_SCALE - 0.001);

      // Codex-Befund PR #223: bei jeder Messung melden, nicht nur bei geändertem Inhaltsbedarf.
      // Ein höherer Kopf (längerer Titel, schmalere Fläche) ändert die Fläche, nicht den Inhalt;
      // die Kachel rechnet Kopf und Fuß beim Empfang hinzu und filtert gleiche Werte selbst.
      onMinimumRef.current?.(minimum, outer);
      // Bereits verarbeitete DOM-Änderungen desselben Commits nicht noch einmal einplanen.
      mutationObserver?.takeRecords();
    };

    const schedule = () => {
      if (disposed || frame) return;
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
      mutationObserver.observe(inner, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!disposed) schedule();
      });
    }

    return () => {
      disposed = true;
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
