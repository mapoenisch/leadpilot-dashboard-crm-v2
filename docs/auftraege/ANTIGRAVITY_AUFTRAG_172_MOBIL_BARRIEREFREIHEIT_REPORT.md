# Auftrag 172 – Dashboard-Editor: Mobile Bedienung, Barrierefreiheits-Abnahme, Reportexport mit Schwellenwerten und Alarmen (P15b)

**Ziel:** Der V2-Editor und die Leseansicht sind auf Telefon und Tablet sicher bedienbar (Touch, kein versehentliches Verschieben), erfüllen eine dokumentierte Barrierefreiheits-Abnahme über alle seit P05 entstandenen Ansichten, und Druck/PDF-Report zeigen Schwellenwert-Status, Alarme, Transformationen und Datenstand korrekt.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P15 (§6), §3.3 (Responsive, Touch, Barrierefreiheit), §7 (UI-Gates, Abnahme „Teamsicht, persönliches Layout und Reportexport“).
**Vorgelagert:** 171 (P15a) ist gemergt.
**Baseline:** aktueller `main` nach Merge von 171.
**Branch:** `auftrag-172-mobil-a11y-report`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge und Deploy:** Marc.
**Status:** ENTWURF (Ist-Stand in T0 prüfen).

---

## 1. Ist-Stand (in T0 zu erheben und als Tabelle in den BUILD_LOG)

- Getrennte Layouts je Breakpoint (`desktop`, `tablet`, `mobile`) seit P03/P06; Editor-Bedienung auf 375 px bisher je Auftrag nur stichprobenartig geprüft.
- `e2e/a11y.spec.ts` mit `a11y-baseline.json` (bekannte Verstöße als Baseline).
- Druck: `components/export/DashboardPrintView.tsx`, `PrintTileCard.tsx`, `PrintAppendixTable.tsx`, `DashboardReportModal.tsx`; laut 166 §2.3 Nr. 19 zeigen Druckkacheln noch **keinen** Schwellenwert-Status.
- Der Builder listet alle V2-Ansichten (Editor, Inspector-Tabs, Panel-Editor, Versionen, Import/Export, Team-Freigaben, Alarme, Kiosk, Vorschau) mit Datei und Zuständigkeit.

## 2. Soll

### 2.1 Mobile Bedienung

1. Auf `mobile` (< 640 px) ist der Editor im Modus „Bearbeiten per Liste“: Kacheln werden in einer Liste mit „Nach oben/Nach unten“, „Größe“ und „Bearbeiten“ verwaltet; kein Ziehen auf dem Canvas (Masterplan §3.3: Desktop-Layout bleibt erhalten, versehentliches Verschieben ausgeschlossen).
2. Auf `tablet` Ziehen nur nach langem Drücken (≥ 400 ms) mit sichtbarem Aufnahmezustand; Scrollen verschiebt nie eine Kachel.
3. Touch-Ziele ≥ 44 × 44 px für alle Bedienelemente in Editor, Inspector, Alarmliste und Versionen.
4. Inspector und Panel-Editor als Vollbild-Blatt mit Schließen oben und sicherem Zurück (Browser-Zurück schließt das Blatt, verwirft nichts ohne Rückfrage).

### 2.2 Barrierefreiheits-Abnahme

5. Prüfung jeder Ansicht aus §1 mit Tastatur (Reihenfolge, sichtbarer Fokus, keine Falle), Screenreader-Namen (axe + manuelle Stichprobe mit VoiceOver, Protokoll), Kontrast ≥ 4,5:1 hell/dunkel, Zoom 200 % ohne Überlauf, `prefers-reduced-motion`.
6. Ziel: `a11y-baseline.json` enthält für V2-Ansichten **keine** Einträge mehr; neue Verstöße = Fehler. Nicht behebbare Punkte mit Begründung in `docs/dashboard/BARRIEREFREIHEIT_P15.md`.

### 2.3 Reportexport

7. Druck/PDF zeigt je Einzelwertkachel den Schwellenwert-Status als **Text** („Warnung: ab 200 EUR“), keine Farbe allein; Kachel mit aktivem Alarm erhält Vermerk „Alarm aktiv“; Transformationskette und Vergleich (169/170) in der Fußnote bzw. im Anhang.
8. Kopf des Reports: Dashboard, Organisation, Analysezeitpunkt, Datenstand je Quelle, Ersteller des Reports; Fuß: Seitenzahl, „Vertraulich – nur für berechtigte Empfänger“.
9. Report enthält nur, was der Nutzer sehen darf (gleiche Daten wie die Ansicht, keine zusätzlichen Abfragen ohne Rechteprüfung).
10. Druck aus dem Kiosk ist deaktiviert.

### 2.4 Tests und Nachweise

11. Vitest für 2.1 Nr. 1–4 und 2.3 Nr. 7–9; E2E `e2e/dashboard-mobile.spec.ts` (Touch-Emulation 375/768: Liste umsortieren, Inspector öffnen/schließen per Zurück, kein Verschieben beim Scrollen) und `e2e/dashboard-report.spec.ts` (Druckansicht enthält Status-Texte); `a11y.spec.ts` ohne V2-Baseline-Einträge; `visual.spec.ts` (Baselines nur über `visual-baselines/**`).
12. Screenshots `docs/screenshots/auftrag-172/README.md`: alle Ansichten aus §1 auf 375/768 hell/dunkel, Druckansicht A4, 0 px Überlauf.
13. Bundle: Initial-JS +0 kB (Toleranz 0,2 kB).

### 2.5 Dokumentation

14. Neu `docs/dashboard/BARRIEREFREIHEIT_P15.md` (Prüfprotokoll je Ansicht); Masterplan §6 Nachtrag „P15 abgeschlossen“; `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; kein Server-Code; keine neuen Abhängigkeiten; `max-lines` 400; V1-Druck unverändert; Tests zuerst mit Rot-Läufen (Druck zeigt Status-Text; Scrollen auf Tablet verschiebt keine Kachel; Touch-Ziel < 44 px wird gemeldet; V2-Eintrag in a11y-Baseline schlägt fehl).

## 4. Ziel-Dateien

| Pfad                                                                                                  | Änderung       |
| ----------------------------------------------------------------------------------------------------- | -------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_172_MOBIL_BARRIEREFREIHEIT_REPORT.md`                             | Dieser Auftrag |
| V2-Editor-, Inspector-, Panel-Editor-Komponenten (Liste aus T0), `components/export/*` (nur V2-Teile) | Umsetzung      |
| `e2e/a11y-baseline.json`, neu `e2e/dashboard-mobile.spec.ts`, `e2e/dashboard-report.spec.ts`, Tests   | Nachweise      |
| Screenshot-Harness, `docs/screenshots/auftrag-172/README.md`, Doku aus 2.5                            | Doku           |

## 5. Tasks

- [ ] **T0** Ansichtenliste, Ist-Befunde (axe-Lauf je Ansicht), `size-limit`.
- [ ] **T1** Rot-Nachweise.
- [ ] **T2** Mobile Bedienung.
- [ ] **T3** Barrierefreiheits-Befunde beheben, Baseline leeren.
- [ ] **T4** Reportexport.
- [ ] **T5** E2E, Screenshots, Doku, Pflicht-Verifikation, BUILD_LOG (Smoke für Marc: Dashboard auf dem Telefon bearbeiten, Report drucken), PR, Review.

## 6. Abnahme

- Bearbeiten auf Telefon und Tablet ohne versehentliches Verschieben; Desktop-Layout bleibt erhalten.
- Keine bekannten Barrierefreiheits-Verstöße in V2-Ansichten; Protokoll liegt vor.
- Report zeigt Schwellenwert-Status, Alarme, Transformationen und Datenstand als Text, nur berechtigte Inhalte.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
npx playwright test
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> --stat -- supabase   # leer
```
