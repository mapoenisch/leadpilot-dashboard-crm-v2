import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion, motion } from 'framer-motion';

export interface AnimatedKpiValueProps {
  value: number;
  unit?: string;
  fallbackUnit?: string;
  shouldAnimate: boolean;
}

/**
 * Isolierte, zugängliche Darstellung eines gelieferten numerischen KPI-Werts (Gate G22).
 *
 * - Erster Render / shouldAnimate === false / unconfigured: Sofortiger Endwert ohne Motion-Node.
 * - prefers-reduced-motion: reduce: Sofortiger Endwert ohne Motion-Node, ohne Timer.
 * - Echte Änderung bei Status 'live': Lineare Animation in max 220 ms.
 * - Barrierefreiheit: Screenreader erhalten synchron den finalen formatierten Endwert
 *   über aria-live="polite", während visuelle Zwischenwerte per aria-hidden verborgen sind.
 */
export function AnimatedKpiValue({
  value,
  unit,
  fallbackUnit,
  shouldAnimate,
}: AnimatedKpiValueProps) {
  const framerReducedMotion = useReducedMotion();
  const shouldReduceMotion =
    Boolean(framerReducedMotion) ||
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const isValid = typeof value === 'number' && !isNaN(value) && isFinite(value);
  const unitText = unit ? ` ${unit}` : fallbackUnit ? ` ${fallbackUnit}` : '';
  const finalFormatted = isValid ? `${value.toLocaleString('de-DE')}${unitText}` : '—';

  // Synchrones Prop-Tracking zur Vermeidung von Layout-Flash / Wert-Sprung
  const [trackedValue, setTrackedValue] = useState<number>(value);
  const [displayValue, setDisplayValue] = useState<number>(value);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const animFromRef = useRef<number>(value);
  const animToRef = useRef<number>(value);

  // Synchrones Anpassen des Zustands während der Render-Phase (verhindert Vorab-Flicker des Endwerts)
  if (isValid && value !== trackedValue) {
    const from = trackedValue;
    const to = value;
    setTrackedValue(to);
    animFromRef.current = from;
    animToRef.current = to;

    if (shouldAnimate && !shouldReduceMotion && from !== to) {
      setIsAnimating(true);
      setDisplayValue(from); // Startet visuell zwingend beim Vorwert (kein Flash von "to")
    } else {
      setIsAnimating(false);
      setDisplayValue(to);
    }
  }

  useEffect(() => {
    if (!isAnimating || shouldReduceMotion || !isValid) {
      return;
    }

    const from = animFromRef.current;
    const to = animToRef.current;
    if (from === to) {
      setIsAnimating(false);
      return;
    }

    const controls = animate(from, to, {
      duration: 0.20, // 200 ms (Budget: höchstens 220 ms)
      ease: 'linear',
      onUpdate(latest) {
        const decimals = (to.toString().split('.')[1] || '').length;
        if (decimals > 0) {
          setDisplayValue(Number(latest.toFixed(decimals)));
        } else {
          setDisplayValue(Math.round(latest));
        }
      },
      onComplete() {
        setDisplayValue(to);
        setIsAnimating(false);
      },
    });

    return () => {
      controls.stop();
    };
  }, [trackedValue, isAnimating, shouldReduceMotion, isValid]);

  // Wenn keine Animation aktiv ist oder Reduced Motion aktiv ist:
  // Sofortige Darstellung ohne Motion-Node
  if (!isAnimating || shouldReduceMotion || !shouldAnimate || !isValid) {
    return (
      <span
        className="live-kpi-animated-value"
        data-animating="false"
        aria-live="polite"
        aria-atomic="true"
      >
        {finalFormatted}
      </span>
    );
  }

  const visibleIntermediate = `${displayValue.toLocaleString('de-DE')}${unitText}`;

  return (
    <span className="live-kpi-animated-value" data-animating="true">
      <motion.span
        className="live-kpi-visible-value"
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        {visibleIntermediate}
      </motion.span>
      <span className="live-kpi-visually-hidden" aria-live="polite" aria-atomic="true">
        {finalFormatted}
      </span>
    </span>
  );
}
