# Screenshot-Matrix Auftrag Dashboard-Testkachel (Teilauftrag 0)

Erzeugt mit `scripts/captureDashboardPreviewScreenshots.mjs` gegen `/dashboard-vorschau.html` (eigene Vorschauseite, Dev-Server, feste Beispieldaten, `prefers-reduced-motion: reduce`). Das Harness wartet je Darstellung auf deren eigenen Inhalt, nicht auf eine feste Zeit. Bilder bleiben lokal (`.gitignore`, `CLAUDE.md` §7).

- Aufnahme: 2026-10-02T15:32:42.894Z (Stand nach Runde 7: Lade- und Fehlerzustand mit Diagrammgerüst; geladene Darstellungen ohne feste Mindesthöhe)
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
| 1440 | Kreis | 0 px | 0 | `37c67aae60f49148` |
| 1440 | Ring | 0 px | 0 | `4dba94aa518681ae` |
| 1440 | Linie | 0 px | 0 | `b51f8a49ecb83b5d` |
| 1440 | Fläche | 0 px | 0 | `f80a2a899efe550d` |
| 768 | Zahl | 0 px | 0 | `cd15ff4264f4a474` |
| 768 | Tabelle | 0 px | 0 | `9e22397c58892b8e` |
| 768 | Säulen | 0 px | 0 | `d0d2a33448887617` |
| 768 | Balken | 0 px | 0 | `6ba7cdc94b955c72` |
| 768 | Kreis | 0 px | 0 | `fc3c8928826639bf` |
| 768 | Ring | 0 px | 0 | `3ed8650556eb5d75` |
| 768 | Linie | 0 px | 0 | `d620d1c226d8082b` |
| 768 | Fläche | 0 px | 0 | `9ccd48571d542bc4` |
| 375 | Zahl | 0 px | 0 | `e0d23e8b40ed6844` |
| 375 | Tabelle | 0 px | 0 | `8e6a2eb9079758c7` |
| 375 | Säulen | 0 px | 0 | `894cbcc245f84054` |
| 375 | Balken | 0 px | 0 | `18f85293325710ed` |
| 375 | Kreis | 0 px | 0 | `b3666b5853c38f68` |
| 375 | Ring | 0 px | 0 | `026b9b4f9cd6b153` |
| 375 | Linie | 0 px | 0 | `1631b0537f835aac` |
| 375 | Fläche | 0 px | 0 | `b98863da1ebe915b` |
