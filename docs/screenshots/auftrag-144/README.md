# Auftrag 144 – Screenshot-Matrix: Bestandsprüfung Dashboard-Editor

Aufgenommen am 2026-11-10 auf Ausgangscommit `b9e04f5c5d49fabad5b5484ec44216536f61827c` (`main`).
Testumgebung: Lokale Testumgebung ohne gehostete Abhängigkeiten (`/dashboard-vorschau.html?bereich=editor`, isolierte Beispieldaten).
Browser: Chromium / Google Chrome via Playwright, Zoom 100 %, `prefers-reduced-motion: reduce`.
Bilddateien verbleiben lokal (`.gitignore`, gemäß `CLAUDE.md` §7); nur diese Matrix ist versioniert.

## 1. Matrix der 18 Bestandsaufnahmen (3 Zustände × 3 Breiten × 2 Themes)

| Zustand | Breite | Theme | Überlauf (Dokument / Main) | Inhaltshöhe | SHA-256 (12 Zeichen) | Lokaler Dateipfad |
|---|---|---|---|---|---|---|
| `Dashboard-Arbeitsbereich: Lesemodus` | 1440 | dark | 0 / 0 | 2952 px | `1668bc40781d` | `docs/screenshots/auftrag-144/bestand-editor-lesen-1440-dark.png` |
| `Dashboard-Arbeitsbereich: Lesemodus` | 768 | dark | 0 / 0 | 4792 px | `e682bc32f0a1` | `docs/screenshots/auftrag-144/bestand-editor-lesen-768-dark.png` |
| `Dashboard-Arbeitsbereich: Lesemodus` | 375 | dark | 0 / 0 | 6099 px | `ef37fce41c9e` | `docs/screenshots/auftrag-144/bestand-editor-lesen-375-dark.png` |
| `Dashboard-Arbeitsbereich: Lesemodus` | 1440 | light | 0 / 0 | 2952 px | `8b67cbf1e71b` | `docs/screenshots/auftrag-144/bestand-editor-lesen-1440-light.png` |
| `Dashboard-Arbeitsbereich: Lesemodus` | 768 | light | 0 / 0 | 4792 px | `80ffe1eebb71` | `docs/screenshots/auftrag-144/bestand-editor-lesen-768-light.png` |
| `Dashboard-Arbeitsbereich: Lesemodus` | 375 | light | 0 / 0 | 6099 px | `67f9e290657f` | `docs/screenshots/auftrag-144/bestand-editor-lesen-375-light.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 1440 | dark | 0 / 0 | 4290 px | `796839f5e06d` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-1440-dark.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 768 | dark | 0 / 0 | 6861 px | `1726a489875f` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-768-dark.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 375 | dark | 0 / 0 | 10739 px | `e5d90bcb49e9` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-375-dark.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 1440 | light | 0 / 0 | 4290 px | `601bc2958028` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-1440-light.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 768 | light | 0 / 0 | 6861 px | `31a74e73eaa2` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-768-light.png` |
| `Dashboard-Arbeitsbereich: Bearbeitungsmodus (Raster & Toolbar)` | 375 | light | 0 / 0 | 10739 px | `5ee609059575` | `docs/screenshots/auftrag-144/bestand-editor-bearbeiten-375-light.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 1440 | dark | 0 / 0 | 4427 px | `5b2a7a169f55` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-1440-dark.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 768 | dark | 0 / 0 | 7034 px | `da8e224970c9` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-768-dark.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 375 | dark | 0 / 0 | 10915 px | `652ebbd67b03` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-375-dark.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 1440 | light | 0 / 0 | 4427 px | `fd4ccd7b5cf2` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-1440-light.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 768 | light | 0 / 0 | 7034 px | `bba6fcb63ff5` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-768-light.png` |
| `Dashboard-Arbeitsbereich: Konfigurator-Drawer (420px geöffnet)` | 375 | light | 0 / 0 | 10915 px | `67482ba31f24` | `docs/screenshots/auftrag-144/bestand-editor-konfigurator-375-light.png` |

## 2. Auswertung und Befunde

- **Vollständigkeit:** 18 von 18 Aufnahmen erfolgreich erfasst (100 %).
- **Horizontaler Überlauf:** 0 px Dokument- und Main-Überlauf in allen 18 Aufnahmen bestätigt.
- **Zustände:**
  - *Lesemodus:* Standardkonfiguration mit Kacheln im Ansichtsmodus; Kachel-Aktionen ausgeblendet; "Dashboard bearbeiten" verfügbar.
  - *Bearbeitungsmodus:* Obere Editor-Toolbar (haftend) mit "Entwurf speichern", "Abbrechen", "Kachel hinzufügen", Undo/Redo; Kacheln zeigen Drag-Handle, Spaltenwahl-Buttons (`3 Sp.`, `6 Sp.`, `9 Sp.`, `12 Sp.`), Aktionsmenü und Resize-Handle.
  - *Konfigurator-Drawer:* 420 px breiter rechter Drawer mit Suchfeld, Kategorie-Filter, Kennzahlenauswahl, Darstellungsoptionen, Vorschau und erweiterten Einstellungen.
- **Responsives Verhalten:**
  - *1440 px:* Volle 12-Spalten-Desktop-Ansicht; Kacheln spannen je nach Konfiguration über 3, 6, 9 oder 12 Spalten.
  - *768 px (Tablet):* 6-Spalten-Raster; Toolbar passt Statuszeile an; Drawer verbleibt bei 420 px.
  - *375 px (Mobile):* 1-Spalten-Raster (alle Kacheln nehmen volle Breite ein); Werkzeugleiste schaltet auf Kurzform um; Konfigurator-Drawer nimmt maximale mobile Breite ein.
