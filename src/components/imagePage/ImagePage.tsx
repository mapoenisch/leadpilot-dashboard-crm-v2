import { useEffect, useRef, type ReactNode } from 'react';
import { Smartphone } from 'lucide-react';
import { PAGE_PRESENTATION } from '@/config/pagePresentation';
import { IMAGE_PAGES, type ImagePageKey } from './imagePages';

interface ImagePageProps {
  page: ImagePageKey;
  // Seiteninhalt aus v2.3.1: im Modus 'bild' die unsichtbare Textschicht,
  // im Modus 'html' die sichtbare Seite.
  children: ReactNode;
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, immer als ganzes Bild in voller
// Breite. Auf dem Handy im Hochformat steht darüber ein Hinweis: Handy quer
// drehen oder mit zwei Fingern zoomen (Zoom des Browsers, nicht gesperrt).
//
// Die Textschicht bleibt für Screenreader lesbar, aber nichts darin darf per
// Tab erreichbar sein (sonst landet der Fokus auf unsichtbaren Elementen,
// z. B. den scrollbaren Tabellenbereichen mit tabIndex=0 aus KitTable).
const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function ImagePage({ page, children }: ImagePageProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;
    const removeFromTabOrder = () => {
      layer.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((node) => {
        node.setAttribute('tabindex', '-1');
      });
    };
    removeFromTabOrder();
    // Inhalte können nachladen (DataState, Lazy-Teile) — neu gerenderte Knoten ebenfalls erfassen.
    const observer = new MutationObserver(removeFromTabOrder);
    observer.observe(layer, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (PAGE_PRESENTATION === 'html') return <>{children}</>;

  const { src, alt, testId } = IMAGE_PAGES[page];
  return (
    <div className="image-page" data-testid="image-page">
      <p className="image-page__hint" aria-hidden="true" data-testid="image-page-hint">
        <Smartphone className="image-page__hint-icon" size={16} />
        Für bessere Lesbarkeit das Handy quer drehen oder mit zwei Fingern zoomen.
      </p>
      <img
        src={src}
        alt={`${alt} (Bildansicht, Inhalt folgt als Text)`}
        data-testid={testId}
        className="image-page__img"
        loading="eager"
      />
      <div className="sr-only" data-testid="image-page-text" ref={layerRef}>
        {children}
      </div>
    </div>
  );
}
