# Screenshot-Matrix Auftrag 074 (Dashboard Teilauftrag 5, Raster, Editor und Konfigurationsfenster)

Erzeugt mit `scripts/captureAuftrag074Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `6484368` (Testkachel und Galerie), Nachher = dieser Stand (`?bereich=editor`, nur Arbeitsbereich). Testdaten, Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-05T14:27:44.126Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px
- axe-Verstöße serious/critical: 0
- Konfigurator-Modul vor dem Öffnen angefragt: 1440: 0, 768: 0, 375: 0; nach dem Öffnen: 1440: 1, 768: 1, 375: 1
- Aktivierte Kacheln beim Start / nach dem Scrollen: 1440: 10/17 von 17, 768: 6/17 von 17, 375: 2/17 von 17
- Layoutverschiebung (CLS) beim Scrollen: 1440: 0, 768: 0, 375: 0
- Fokus nach „Nach unten“ bleibt auf der Schaltfläche: ja; Ansage: ARR steht jetzt an Position 2 von 17.
- Escape im Konfigurator gibt den Fokus zurück an: Kachel hinzufügen
- Hinzufügen: Kacheln 1440: 39→40, 768: 39→40, 375: 39→40
- Speicherfehler: Text „Die Ansicht konnte nicht gespeichert werden. Bitte versuche es später erneut.“, Entwurf bleibt: ja
- Konflikt: drei Wege sichtbar, danach „Gespeichert.“ und Rückkehr in die Ansicht: ja

- Höhe ganzer Kacheln und des Rasters, Laden → bereit und Skelett → bereit (Abweichungen je Breite): 1440: 17 Kacheln, laden 0, Skelett 0, Raster 2954/2954/2954 px; 768: 17 Kacheln, laden 0, Skelett 0, Raster 5271/5271/5271 px; 375: 17 Kacheln, laden 0, Skelett 0, Raster 7404/7404/7404 px

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `5fd72b80cfe13975` | `455854c169f10892` | 0 px |
| 768 | `0331527c235a5714` | `44a57e87dbdbc706` | 0 px |
| 375 | `8f3f547bb6b5a3fc` | `55cc1b216e15c5f8` | 0 px |

## Zustände

| Breite | Zustand | Überlauf | axe serious/critical | SHA-256 (gekürzt) |
|---:|---|---:|---|---|
| 1440 | ansicht | 0 px | keine | `1721f3bbb48e7908` |
| 1440 | bearbeiten | 0 px | keine | `5d1f5c3c22bb6b9a` |
| 1440 | konfigurator | 0 px | keine | `dcb3ebea63963b1b` |
| 1440 | langtexte | 0 px | keine | `ffe7815df98f7572` |
| 1440 | speicherfehler | 0 px | keine | `80fdfdaf8c7dbfc7` |
| 1440 | konflikt | 0 px | keine | `9cf3ebdbecec774b` |
| 768 | ansicht | 0 px | keine | `e618a5e8615b277a` |
| 768 | bearbeiten | 0 px | keine | `7a2a589cb79e8407` |
| 768 | konfigurator | 0 px | keine | `8b1cd91770ead2a7` |
| 768 | langtexte | 0 px | keine | `e8112cc1892df994` |
| 768 | speicherfehler | 0 px | keine | `d7e9d3d877051a41` |
| 768 | konflikt | 0 px | keine | `bcbe637070288bfe` |
| 375 | ansicht | 0 px | keine | `72ba05bf3af01957` |
| 375 | bearbeiten | 0 px | keine | `6ed1a2c64deea62e` |
| 375 | konfigurator | 0 px | keine | `3c8289c6e06b4f93` |
| 375 | langtexte | 0 px | keine | `cb93c435887a88d9` |
| 375 | speicherfehler | 0 px | keine | `b0ea1c69a27db442` |
| 375 | konflikt | 0 px | keine | `6cfedba4f197434a` |
| 1440 | dialog | 0 px | keine | `8b8454e8f65768ff` |
| 768 | dialog | 0 px | keine | `3a8a6321f10edd8b` |
| 375 | dialog | 0 px | keine | `3f26abd9430c88f8` |
