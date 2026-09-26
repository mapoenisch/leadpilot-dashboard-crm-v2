// Auftrag 069 / G67: Darstellung der 32 statischen Inhaltsseiten.
//
// 'bild' — Original-WebPs aus v2.2.0 (Standard ab v2.3.2), Seiteninhalt als
//          unsichtbare Textschicht für Screenreader und Suche.
// 'html' — Aussehen von v2.3.1 (Page-Kit-Nachbau aus Auftrag 068).
//
// Rückweg zu v2.3.1: diesen Wert auf 'html' setzen. Alternativ Tag `v2.3.1`
// ausliefern (Commit 1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2).
export type PagePresentation = 'bild' | 'html';

export const PAGE_PRESENTATION: PagePresentation = 'bild';
