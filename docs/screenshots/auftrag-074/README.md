# Screenshot-Matrix Auftrag 074 (Dashboard Teilauftrag 5, Raster, Editor und Konfigurationsfenster)

Erzeugt mit `scripts/captureAuftrag074Screenshots.mjs` gegen zwei Vorschau-Builds (`VITE_DASHBOARD_PREVIEW=true`, `vite preview`): Vorher = Basis `6484368` (Testkachel und Galerie), Nachher = dieser Stand (`?bereich=editor`, nur Arbeitsbereich). Testdaten, Speicher-Ersatz im Arbeitsspeicher, `prefers-reduced-motion: reduce`. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-05T15:06:02.437Z
- Vorher/Nachher-Paare verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px
- axe-Verstöße serious/critical: 0
- Konfigurator-Modul vor dem Öffnen angefragt: 1440: 0, 768: 0, 375: 0; nach dem Öffnen: 1440: 1, 768: 1, 375: 1
- Aktivierte Kacheln beim Start / nach dem Scrollen: 1440: 10/17 von 17, 768: 6/17 von 17, 375: 2/17 von 17
- Layoutverschiebung (CLS) beim Scrollen: 1440: 0, 768: 0, 375: 0
- Fokus nach „Nach unten“ bleibt auf der Schaltfläche: ja; Ansage: ARR steht jetzt an Position 2 von 17.
- Escape im Konfigurator gibt den Fokus zurück an: Kachel hinzufügen
- Ziehen über den Griff ordnet neu (DOM-Reihenfolge): 1440: ja, 768: nein, 375: kein Griff
- Hinzufügen: Kacheln 1440: 39→40, 768: 39→40, 375: 39→40
- Speicherfehler: Text „Die Ansicht konnte nicht gespeichert werden. Bitte versuche es später erneut.“, Entwurf bleibt: ja
- Konflikt: drei Wege sichtbar, danach „Gespeichert.“ und Rückkehr in die Ansicht: ja

- Höhe ganzer Kacheln und des Rasters, Laden → bereit und Skelett → bereit (Abweichungen je Breite): 1440: 17 Kacheln, laden 0, Skelett 0, Raster 2954/2954/2954 px; 768: 17 Kacheln, laden 0, Skelett 0, Raster 5271/5271/5271 px; 375: 17 Kacheln, laden 0, Skelett 0, Raster 7404/7404/7404 px

## Vorher/Nachher (ganze Seite)

| Breite | Vorher | Nachher | Überlauf nachher |
|---:|---|---|---:|
| 1440 | `5fd72b80cfe13975` | `405f34fb1b697485` | 0 px |
| 768 | `0331527c235a5714` | `98f98acdeb099c65` | 0 px |
| 375 | `8f3f547bb6b5a3fc` | `c3339fb4ba4f6baa` | 0 px |

## Zustände

| Breite | Zustand | Überlauf | axe serious/critical | SHA-256 (gekürzt) |
|---:|---|---:|---|---|
| 1440 | ansicht | 0 px | keine | `c162deb69b451366` |
| 1440 | bearbeiten | 0 px | keine | `e22961f26abf95bd` |
| 1440 | konfigurator | 0 px | keine | `6406c2e7db2d1163` |
| 1440 | langtexte | 0 px | keine | `299f306eb7b93e4b` |
| 1440 | speicherfehler | 0 px | keine | `cb8b840915c33c36` |
| 1440 | konflikt | 0 px | keine | `9e24321214ac3aa7` |
| 768 | ansicht | 0 px | keine | `27ce864065da9398` |
| 768 | bearbeiten | 0 px | keine | `e17775b9364585fe` |
| 768 | konfigurator | 0 px | keine | `b103ba8bd8d75e1b` |
| 768 | langtexte | 0 px | keine | `df7a40dadddfde22` |
| 768 | speicherfehler | 0 px | keine | `77d5259c228d22dc` |
| 768 | konflikt | 0 px | keine | `34e8da1565a3c905` |
| 375 | ansicht | 0 px | keine | `d134c3106732ddf7` |
| 375 | bearbeiten | 0 px | keine | `5ec170511ef5f115` |
| 375 | konfigurator | 0 px | keine | `632935a26068eaad` |
| 375 | langtexte | 0 px | keine | `133beaf0ce81ab9e` |
| 375 | speicherfehler | 0 px | keine | `a81ff5aa8655cc3e` |
| 375 | konflikt | 0 px | keine | `89c5e6f468f07780` |
| 1440 | dialog | 0 px | keine | `51ddcbab0f0a837c` |
| 768 | dialog | 0 px | keine | `17766f6c44513143` |
| 375 | dialog | 0 px | keine | `98549130cd1028d2` |
