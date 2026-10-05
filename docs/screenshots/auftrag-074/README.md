# Screenshot-Matrix Auftrag 074 (Dashboard Teilauftrag 5, Raster, Editor und Konfigurationsfenster)

Erzeugt mit `scripts/captureAuftrag074Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `6484368` (Testkachel und Galerie), Nachher = dieser Stand (`?bereich=editor`, nur Arbeitsbereich). Testdaten, Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-05T13:09:32.704Z
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
| 1440 | konfigurator | 0 px | keine | `352649a17973fb78` |
| 1440 | langtexte | 0 px | keine | `9e0cedb09a280b5c` |
| 1440 | speicherfehler | 0 px | keine | `ed558d2de86707b4` |
| 1440 | konflikt | 0 px | keine | `cfc479bf63ac4ec6` |
| 768 | ansicht | 0 px | keine | `e618a5e8615b277a` |
| 768 | bearbeiten | 0 px | keine | `7a2a589cb79e8407` |
| 768 | konfigurator | 0 px | keine | `aaa2d83def1a23d4` |
| 768 | langtexte | 0 px | keine | `f325ada8ba92b261` |
| 768 | speicherfehler | 0 px | keine | `102b5611d4bea47a` |
| 768 | konflikt | 0 px | keine | `3085cc67d1ff91f9` |
| 375 | ansicht | 0 px | keine | `72ba05bf3af01957` |
| 375 | bearbeiten | 0 px | keine | `6ed1a2c64deea62e` |
| 375 | konfigurator | 0 px | keine | `662bcc86a96cc2ef` |
| 375 | langtexte | 0 px | keine | `968cef16e09e9fd5` |
| 375 | speicherfehler | 0 px | keine | `75bd5a7998e0f51a` |
| 375 | konflikt | 0 px | keine | `370bd21174dc7267` |
| 1440 | dialog | 0 px | keine | `8b8454e8f65768ff` |
| 768 | dialog | 0 px | keine | `3a8a6321f10edd8b` |
| 375 | dialog | 0 px | keine | `3f26abd9430c88f8` |
