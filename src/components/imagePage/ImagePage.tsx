import type { ReactNode } from 'react';
import { PAGE_PRESENTATION } from '@/config/pagePresentation';
import { IMAGE_PAGES, type ImagePageKey } from './imagePages';

interface ImagePageProps {
  page: ImagePageKey;
  // Seiteninhalt aus v2.3.1: im Modus 'bild' die unsichtbare Textschicht,
  // im Modus 'html' die sichtbare Seite.
  children: ReactNode;
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0. Ab 600 px das ganze Bild,
// darunter zwei überlappende Ausschnitte derselben Datei (links 0–55 %,
// rechts 45–100 %), die untereinander stehen und dadurch größer lesbar sind.
export function ImagePage({ page, children }: ImagePageProps) {
  if (PAGE_PRESENTATION === 'html') return <>{children}</>;

  const { src, alt, testId } = IMAGE_PAGES[page];
  return (
    <div className="image-page" data-testid="image-page">
      <div className="image-page__full">
        <img
          src={src}
          alt={`${alt} (Bildansicht, Inhalt folgt als Text)`}
          data-testid={testId}
          className="image-page__img"
          loading="eager"
        />
      </div>
      <div className="image-page__tiles" aria-hidden="true" data-testid="image-page-tiles">
        <div className="image-page__tile image-page__tile--left">
          <img src={src} alt="" className="image-page__tile-img" loading="lazy" />
        </div>
        <div className="image-page__tile image-page__tile--right">
          <img src={src} alt="" className="image-page__tile-img" loading="lazy" />
        </div>
      </div>
      <div className="sr-only" data-testid="image-page-text">
        {children}
      </div>
    </div>
  );
}
