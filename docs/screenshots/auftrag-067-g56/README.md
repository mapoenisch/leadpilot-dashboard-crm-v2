# Auftrag 067J Welle G56 — UX-/A11y-Nachweis (kein Pixel-Vergleich)

G56 behebt die Frontend-Befunde PR-A11Y-12 (Skip-Link, Fokus, Backdrop,
Single-DOM, URL-State), PR-CLIP-13 (Materials-Clipping bei 375 px) und
PR-ASSET-14 (lokale Assets, Fonts, Header). Visuelle Änderungen sind
beabsichtigt bzw. neutral (kein Redesign); Nachweis über Sollverträge
(`npm run test:v23:findings`) plus jsdom-Spiegel der neuen Hooks.

## Vertragsstatus (Builder-lokal geprüft)

| Vertrag | Runner | Status |
|---|---|---|
| PR-SEMANTIC-11 (Nachlauf: 6 section-Wrapper, DataBasis-h1) | `test:v23:findings` | grün |
| PR-A11Y-12 (Skip-Link, Fokus, Single-DOM) | `test:v23:findings` | grün |
| PR-ASSET-14 (Assets lokal, Header) | `test:v23:findings` | grün |
| PR-CLIP-13 (Bounding-Box, 375 px) | `test:v23:clipping` (Playwright) | offen bis Lauf mit frischem Login |
| Neue Hooks (`useIsMobileViewport`, `useUrlSyncedState`) | `npm test` (Vollsuite 113/487) | grün |

## Was geändert wurde (funktional neutral)

- Skip-Link `#main-content` im Layout; Drawer-Initialfokus per `autoFocus`;
  Modal- und Drawer-Backdrops als native Buttons (Geschwister statt
  `div[role="button"]`); CRM-Listen rendern genau ein DOM (Tabelle oder Karten,
  Breakpoint 640 px wie CSS); Filter/Tab-State URL-synchron (`suche`, `stufe`,
  `branche`, `typ`, `tab`).
- Materials-Seite: Banner- und Tab-Zeilen brechen bei 375 px um statt zu
  clippen (reine Flex-Änderung, keine Inhalte geändert).
- Favicon/Logo als lokale SVG (`public/assets/logo/leadpilot-mark.svg`);
  Inter/Space-Grotesk/JetBrains-Mono als lokale woff2 (`public/fonts/`,
  `@font-face` mit `font-display: swap`); Google-Fonts-Links entfernt;
  CSP/Schutzheader standen bereits (`public/_headers`, G46).
- Große PNG-Thumbnails als WebP-Schwestern (1,5 MB → 70 KB, 792 KB → 29 KB),
  per `<picture>` mit PNG-Fallback und expliziten Bildmaßen eingebunden.
