# Screenshot-Matrix Auftrag Dashboard-Testkachel (Teilauftrag 0)

Erzeugt mit `scripts/captureDashboardPreviewScreenshots.mjs` gegen `/dashboard-vorschau.html` (eigene Vorschauseite, Dev-Server, feste Beispieldaten, `prefers-reduced-motion: reduce`). Das Harness wartet je Darstellung auf deren eigenen Inhalt, nicht auf eine feste Zeit. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-02T10:00:54.736Z (Stand nach manueller Nacharbeit Runde 4: Fokusübergabe, gemeinsame Mindesthöhe 360 px, reduzierte Bewegung)
- Darstellungen: 8 (Zahl, Tabelle, Säulen, Balken, Kreis, Ring, Linie, Fläche) × 3 Breiten = 24 Aufnahmen
- Alle SHA-256-Hashes verschieden: ja
- Größter horizontaler Seitenüberlauf: 0 px (auf 375 px scrollt nur das Diagramm innerhalb der Kachel)
- axe-Verstöße serious/critical in der Kachel: 0

**Vorher/Nachher:** Die Vorschauseite existiert im Basis-Commit nicht, ein Vorher-Bild gibt es daher nicht. Die Produktiv-App ist unverändert: `src/app/App.tsx`, `src/app/main.tsx`, `index.html`, `src/components/liveKpi/` und die Schutzbereiche haben gegenüber `main` einen leeren Diff.

| Breite | Darstellung | Überlauf | axe serious/critical | SHA-256 (gekürzt) |
|---:|---|---:|---:|---|
| 1440 | Zahl | 0 px | 0 | `6e51acbbda71e8f5` |
| 1440 | Tabelle | 0 px | 0 | `7490ad72021cbbad` |
| 1440 | Säulen | 0 px | 0 | `7f25a095b5fe6e46` |
| 1440 | Balken | 0 px | 0 | `ffa8084c862895a5` |
| 1440 | Kreis | 0 px | 0 | `2f25201b0ea7f80f` |
| 1440 | Ring | 0 px | 0 | `a2750d7b1dbe1df0` |
| 1440 | Linie | 0 px | 0 | `264f7d45c52baa4f` |
| 1440 | Fläche | 0 px | 0 | `cce697e7e4addfd8` |
| 768 | Zahl | 0 px | 0 | `cd15ff4264f4a474` |
| 768 | Tabelle | 0 px | 0 | `9e22397c58892b8e` |
| 768 | Säulen | 0 px | 0 | `d0d2a33448887617` |
| 768 | Balken | 0 px | 0 | `6ba7cdc94b955c72` |
| 768 | Kreis | 0 px | 0 | `8aa2c56851ed9f1b` |
| 768 | Ring | 0 px | 0 | `7c87ff079c16881e` |
| 768 | Linie | 0 px | 0 | `d620d1c226d8082b` |
| 768 | Fläche | 0 px | 0 | `9ccd48571d542bc4` |
| 375 | Zahl | 0 px | 0 | `e0d23e8b40ed6844` |
| 375 | Tabelle | 0 px | 0 | `8e6a2eb9079758c7` |
| 375 | Säulen | 0 px | 0 | `894cbcc245f84054` |
| 375 | Balken | 0 px | 0 | `18f85293325710ed` |
| 375 | Kreis | 0 px | 0 | `fdcfb15b49320834` |
| 375 | Ring | 0 px | 0 | `999b9006e170296c` |
| 375 | Linie | 0 px | 0 | `d4b9c23e6898d78d` |
| 375 | Fläche | 0 px | 0 | `7d7d9d6fb02dfad9` |
