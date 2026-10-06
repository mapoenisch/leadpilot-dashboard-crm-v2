# Auftrag 079 – Dashboard Teilauftrag 8b: Gesamtabnahme und Rollout

**Stand:** 06.10.2026

**Basis:** `main` `bb5aaff` (Merge von PR #63, Auftrag 078, am 06.10.2026). Baseline für den Schutzbereichs-Diff ist `bb5aaff`. Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 8, Punkte 3–10, und §9 „Pflichtprüfungen je Teilauftrag“. Vorgänger: Auftrag 078 (Katalogausbau, Punkte 1–2).

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Sichtprüfung und Merge:** nur Marc.

**Branch:** `claude/auftrag-079-gesamtabnahme`, PR gegen `main`.

## Ziel

Die neue Ansicht unter `/dashboard` wird als Ganzes abgenommen: mit vollständigem Katalog, über alle acht Darstellungen, alle Kachelgrößen, Übersichten und Kombinationen, in zwei Sitzungen und nach einem Benutzerwechsel, während Realtime-Updates, mit nachgewiesenem Lazy Loading und Barrierefreiheit. Erst nach der Sichtprüfung durch Marc wird der Rollout-Schalter aktiviert.

079 baut **keine neue Funktion**. Ändert sich beim Nachweis ein Befund im Produktcode, wird er im Abschnitt „Befunde beim Bau“ mit Ursache, Fix und rot/grün-Test festgehalten und bleibt so klein wie möglich.

## Was schon nachgewiesen ist (nicht wiederholen)

Plan §9: Bereits bestandene Prüfungen werden nur bei neuen Änderungen oder offenen Befunden wiederholt.

| Nachweis                                                                  | Auftrag | Wo                                       |
| ------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| Speichern mit Revision, Konflikt ohne Eingriff in den Entwurf (Unit/RLS)  | 072     | pgTAP 1–10, `useDashboardPreferences`    |
| Veraltete Antwort nach Benutzerwechsel schreibt nicht in den Cache (Unit) | 072     | BUILD_LOG 072, Befund 4176320857         |
| Platzhalter ohne Layoutsprung, 6 Darstellungen × 4 Größen × 3 Breiten     | 073     | Browser-Nachweis ≤ 1 px                  |
| Reduzierte Bewegung in Diagrammen und Legenden                            | 073     | `global.css`, `motion-reduce`            |
| Details, Rückkehr, Fokus, Reload, unbekannte Kachel, Filter hin/zurück    | 077     | `e2e/personal-dashboard.spec.ts`         |
| Detailseiten: Bild, Überlauf, axe, CLS bei 1440/768/375                   | 077     | `docs/screenshots/auftrag-077/README.md` |

Neu ist in 079 der Nachweis **im echten App-Ablauf über den vollständigen Katalog** und das, was bisher nur als Unit-Test vorliegt (zwei Sitzungen, Benutzerwechsel, Realtime, Lazy Loading per Netzwerk).

## Globale Grenzen

- **Schutzbereiche** (`CLAUDE.md` §6) bleiben unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Migration, keine Änderung an `supabase/`.
- **Nur lesen:** `src/domain/**`, `src/services/**`, `src/app/**` (Ausnahme: T9 nach Freigabe).
- **Kein neuer Abhängigkeits-Eintrag.** Prüfwerkzeuge nur aus dem Bestand (`@playwright/test`, `@axe-core/playwright`, vorhandene Helfer in `scripts/lib/`).
- **Testdaten nur lokal.** Schreibende Nachweise (Präferenzen, Live-Feed) nur gegen ein lokales Supabase; der Aufräumschlüssel bleibt wie in `e2e/helpers/dashboardPreferences.ts` auf lokale Hosts beschränkt. Jeder Nachweis stellt den Ausgangszustand wieder her.
- **Bilder bleiben lokal** (`.gitignore`); committet wird nur `docs/screenshots/auftrag-079/README.md`.
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`).

## Ziel-Dateien

| Datei                                                                        | Änderung                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `e2e/personal-dashboard-acceptance.spec.ts` (neu)                            | zwei Sitzungen, Benutzerwechsel, Realtime während Ansicht und Bearbeitung, Lazy Loading per Netzwerk                |
| `e2e/helpers/dashboardPreferences.ts`                                        | Helfer für zweiten Benutzer und Live-Feed-Eintrag (lokal, mit Aufräumen)                                            |
| `.github/workflows/ci.yml`                                                   | neue Spec in die feste e2e-Liste (Wächtertest erzwingt das)                                                         |
| `scripts/captureAuftrag079Screenshots.mjs` (neu)                             | Bildmatrix vollständiger Katalog: 8 Darstellungen × 4 Größen, Übersichten, Kombinationen, 3 Breiten, Vorher/Nachher |
| `scripts/lib/detailShotHelpers.mjs`                                          | nur falls ein gemeinsamer Helfer fehlt (z. B. Kontrast, reduzierte Bewegung)                                        |
| `docs/screenshots/auftrag-079/README.md` (neu)                               | Ergebnismatrix: SHA-256, Überlauf, axe, CLS, Kontrast, Tastatur, Touch                                              |
| `docs/dashboard/ACCEPTANCE_079.md` (neu)                                     | Abnahmeprotokoll Punkt für Punkt (Plan TA 8, Punkte 3–10) mit Beleg                                                 |
| `src/features/dashboard/model/dashboardRollout.ts`, `.env.example`, Tests    | **nur T9, nur nach Freigabe Marc**                                                                                  |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md`, Plan-Checkboxen TA 7/8, dieser Auftrag | Ledger und Stand                                                                                                    |

## Tasks

- [ ] **T1 Zwei Sitzungen** (Plan Punkt 3): Zwei Browserkontexte desselben Benutzers. A speichert → B sieht nach Reload die neue Revision. B bearbeitet auf alter Revision und speichert → Konfliktablauf („Serveransicht laden“), kein stilles Überschreiben. Revisionen in der Datenbank steigen genau um die Zahl der Speicherungen.
- [ ] **T2 Benutzerwechsel** (Punkt 3): Benutzer A mit eigener Konfiguration und gesetztem Sitzungsfilter meldet sich ab, Benutzer B meldet sich im selben Kontext an. B sieht seine eigene bzw. die Standardansicht, keinen Filter und keine Kachel von A; Detailseite mit Kachel-ID von A führt verständlich zur Übersicht.
- [ ] **T3 Realtime** (Punkt 5): Während Ansicht und während Bearbeitung trifft ein neuer Eintrag in `live_kpi_public_feed` ein (lokal per Aufräumschlüssel). Die Live-Kachel zeigt den neuen Wert; Reihenfolge der Kacheln und offener Entwurf bleiben unverändert. Anzahl der Realtime-Channels (`phx_join` im WebSocket) ist mit neuer Ansicht nicht höher als mit Schalter aus.
- [ ] **T4 Lazy Loading** (Punkt 6): Startbereich sofort, Kacheln unterhalb erst nahe Sichtbereich (Beleg: `data-state` und Netzwerk-/Chunk-Anfragen vor und nach dem Scrollen); keine doppelte CRM-Abfrage für gleiche Organisation/Pipeline; nach Scrollen und Filterwechsel zurück dieselben Werte.
- [ ] **T5 Darstellungen und Größen** (Punkt 4): Harness über eine Konfiguration, die alle acht Darstellungen, alle vier Größen, alle Übersichten und Kombinationen enthält (bei mehr als 24 Kacheln in mehreren Durchgängen). Je Breite 1440/768/375: Bild, SHA-256, horizontaler Überlauf 0 px, axe serious/critical 0, CLS < 0,1.
- [ ] **T6 Zugänglichkeit** (Punkt 7): Tastaturdurchlauf Ansicht → Bearbeiten → Kachel hinzufügen/verschieben → Speichern; Touch-Emulation (Antippen „Details“, Legende); Kontrast AA aus axe; reduzierte Bewegung (`prefers-reduced-motion`) ohne Übergänge; jede Diagrammkachel bietet die zugängliche Datentabelle.
- [ ] **T7 Vorher/Nachher** (Punkt 8): Schalter aus (= Vorher, bisherige Ansicht) gegen Schalter an je Breite; Hash je Paar verschieden; Schalter aus zeigt weiterhin die bisherigen Überschriften und keine Detailroute.
- [ ] **T8 Pflichtgates und Protokoll** (Punkt 9): Gates unten, Schutzbereichs-Diff, `ACCEPTANCE_079.md`, BUILD_LOG-Eintrag. Danach **Sichtprüfung durch Marc** (Bilder lokal oder CI-Artefakt `dashboard-preview`) und Codex-Befund.
- [ ] **T9 Rollout** (Punkt 10) – **erst nach ausdrücklicher Freigabe von Marc im Chat**: Schalter aktivieren. Vorschlag zur Entscheidung (E2): Standard an, `VITE_EXECUTIVE_DASHBOARD_V2=false` schaltet zurück auf die alte Ansicht. Nachweis: Rückschaltung lässt gespeicherte Konfigurationen unberührt und zeigt die alte Ansicht; erneutes Einschalten zeigt die gespeicherte persönliche Ansicht.

## Offene Entscheidungen für Marc

| ID  | Frage                                                            | Vorschlag                                                      |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| E2  | Wie wird „aktivieren“ umgesetzt?                                 | Standard an im Code, Rückschaltung per `=false` (siehe T9).    |
| E3  | Bleibt die alte Ansicht nach dem Rollout im Code, und wie lange? | Bis zum Release `v2.4.0` behalten, Entfernung eigener Auftrag. |

## Gates

- `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run verify:quality-budget`, `npx size-limit` grün.
- `npx playwright test e2e/personal-dashboard.spec.ts e2e/personal-dashboard-acceptance.spec.ts --workers=1` mit Build `VITE_EXECUTIVE_DASHBOARD_V2=true` zweimal grün (Flakiness).
- `git diff bb5aaff -- src/simulation src/types src/context src/services/data src/features/resources` leer.
- Ergebnismatrix `docs/screenshots/auftrag-079/README.md`: 0 px Überlauf, 0 axe serious/critical, CLS < 0,1 in jeder Zeile.
- Sichtprüfung Marc und Codex-Befund im BUILD_LOG, bevor T9 beginnt.
