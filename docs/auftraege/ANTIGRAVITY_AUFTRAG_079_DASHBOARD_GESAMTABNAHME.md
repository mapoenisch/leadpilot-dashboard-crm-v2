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

| Datei                                                                                                                                                                                                                              | Änderung                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `e2e/personal-dashboard-acceptance.spec.ts` (neu)                                                                                                                                                                                  | zwei Sitzungen, Benutzerwechsel, Realtime während Ansicht und Bearbeitung, Lazy Loading per Netzwerk                |
| `e2e/helpers/dashboardPreferences.ts`                                                                                                                                                                                              | Helfer für zweiten Benutzer und Live-Feed-Eintrag (lokal, mit Aufräumen)                                            |
| `.github/workflows/ci.yml`                                                                                                                                                                                                         | neue Spec in die feste e2e-Liste (Wächtertest erzwingt das)                                                         |
| `scripts/captureAuftrag079Screenshots.mjs` (neu)                                                                                                                                                                                   | Bildmatrix vollständiger Katalog: 8 Darstellungen × 4 Größen, Übersichten, Kombinationen, 3 Breiten, Vorher/Nachher |
| `scripts/lib/detailShotHelpers.mjs`                                                                                                                                                                                                | nur falls ein gemeinsamer Helfer fehlt (z. B. Kontrast, reduzierte Bewegung)                                        |
| `docs/screenshots/auftrag-079/README.md` (neu)                                                                                                                                                                                     | Ergebnismatrix: SHA-256, Überlauf, axe, CLS, Kontrast, Tastatur, Touch                                              |
| `docs/dashboard/ACCEPTANCE_079.md` (neu)                                                                                                                                                                                           | Abnahmeprotokoll Punkt für Punkt (Plan TA 8, Punkte 3–10) mit Beleg                                                 |
| `src/features/dashboard/model/dashboardRollout.ts`, `.env.example`, `__tests__/dashboardRollout.vitest.ts`, `e2e/dashboard-rollback.spec.ts` (neu), `scripts/__tests__/runV23Acceptance.vitest.ts`, Kommentare der Dashboard-Specs | T9 nach Freigabe Marc: Standard an, Rückschaltung `=false` mit eigenem Nachweis                                     |
| `scripts/lib/acceptanceShotConfigs.ts` (neu)                                                                                                                                                                                       | Konfigurationen der Bildmatrix aus dem Katalog, mit App-Validierung                                                 |
| `scripts/runV23Acceptance.mjs`                                                                                                                                                                                                     | neue Spec in die E2E-Liste des Orchestrators (Wächtertest `runV23Acceptance.vitest.ts`)                             |
| `src/features/dashboard/components/DashboardFilters.tsx`, `__tests__/DashboardFilters.ui.vitest.tsx`                                                                                                                               | Befund beim Bau (siehe unten)                                                                                       |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md`, Plan-Checkboxen TA 7/8, dieser Auftrag                                                                                                                                                       | Ledger und Stand                                                                                                    |

## Tasks

- [x] **T1 Zwei Sitzungen** (Plan Punkt 3): Zwei Browserkontexte desselben Benutzers. A speichert → B sieht nach Reload die neue Revision. B bearbeitet auf alter Revision und speichert → Konfliktablauf („Serveransicht laden“), kein stilles Überschreiben. Revisionen in der Datenbank steigen genau um die Zahl der Speicherungen.
- [x] **T2 Benutzerwechsel** (Punkt 3): Benutzer B mit eigener Konfiguration und gesetztem Sitzungsfilter meldet sich ab, Benutzer A meldet sich im selben Browser an. A sieht seine eigene Ansicht, keinen Filter und keine Kachel von B; die Detailseite mit Kachel-ID von B führt verständlich zur Übersicht. (Richtung beim Bau gedreht: Abmelden widerruft alle Tokens des Benutzers, siehe `e2e/auth.spec.ts` Fall 4; der gespeicherte Anmeldezustand von A für die übrigen Specs bleibt so gültig.)
- [x] **T3 Realtime** (Punkt 5): Während Ansicht und während Bearbeitung trifft ein neuer Eintrag in `live_kpi_public_feed` ein (lokal per Aufräumschlüssel). Die Live-Kachel zeigt den neuen Wert; Reihenfolge der Kacheln und offener Entwurf bleiben unverändert. Anzahl der Realtime-Channels (`phx_join` im WebSocket) ist mit neuer Ansicht nicht höher als mit Schalter aus.
- [x] **T4 Lazy Loading** (Punkt 6): Startbereich sofort, Kacheln unterhalb erst nahe Sichtbereich (Beleg: `data-state` und Netzwerk-/Chunk-Anfragen vor und nach dem Scrollen); keine doppelte CRM-Abfrage für gleiche Organisation/Pipeline; nach Scrollen und Filterwechsel zurück dieselben Werte.
- [x] **T5 Darstellungen und Größen** (Punkt 4): Harness über eine Konfiguration, die alle acht Darstellungen, alle vier Größen, alle Übersichten und Kombinationen enthält (bei mehr als 24 Kacheln in mehreren Durchgängen). Je Breite 1440/768/375: Bild, SHA-256, horizontaler Überlauf 0 px, axe serious/critical 0, CLS < 0,1.
- [x] **T6 Zugänglichkeit** (Punkt 7): Tastaturdurchlauf Ansicht → Bearbeiten → Kachel verschieben → Konfigurator öffnen und mit Escape schließen (Fokus zurück) → Speichern; Touch-Emulation (Legende, „Details“, zurück); Kontrast AA aus axe; reduzierte Bewegung (`prefers-reduced-motion`) ohne Übergänge; jede Diagrammkachel bietet die zugängliche Datentabelle. (Konfigurator über „Bearbeiten“ einer Kachel, weil der Durchgang 24 Kacheln hat und „Kachel hinzufügen“ dort zu Recht gesperrt ist.)
- [x] **T7 Vorher/Nachher** (Punkt 8): Schalter aus (= Vorher, bisherige Ansicht) gegen Schalter an je Breite; Hash je Paar verschieden; Schalter aus zeigt weiterhin die bisherigen Überschriften und keine Detailroute.
- [x] **T8 Pflichtgates und Protokoll** (Punkt 9): Gates unten, Schutzbereichs-Diff, `ACCEPTANCE_079.md`, BUILD_LOG-Eintrag. Danach **Sichtprüfung durch Marc** (Bilder lokal oder CI-Artefakt `dashboard-preview`) und Codex-Befund. Sichtprüfung Marc am 06.10.2026 erteilt („ist abgenommen“). Der Codex-Befund folgt im PR.
- [x] **T9 Rollout** (Punkt 10) – **erst nach ausdrücklicher Freigabe von Marc im Chat**: Schalter aktivieren. Umsetzung nach Entscheidung E2: Standard an, `VITE_EXECUTIVE_DASHBOARD_V2=false` schaltet zurück auf die alte Ansicht. Nachweis: Rückschaltung lässt gespeicherte Konfigurationen unberührt und zeigt die alte Ansicht; erneutes Einschalten zeigt die gespeicherte persönliche Ansicht. Umgesetzt nach Freigabe Marc (06.10.2026): `isPersonalDashboardEnabled` ist an, außer bei genau `false`; die Dashboard-Specs laufen gegen den regulären Build; neuer Nachweis `e2e/dashboard-rollback.spec.ts` mit Rückschalt-Build in CI und Orchestrator.

## Befund beim Bau

Die Bildmatrix maß bei 768 px CLS 0,28–0,30 (Grenze 0,1). Ursache: Solange die gespeicherte Ansicht lädt, baut die Seite den Filterbereich aus der Standardansicht auf, mit Pipeline-Feld. Hat die gespeicherte Ansicht keine CRM-Kachel, ersetzt ein Hinweis das Feld. Der Hinweis hatte keine feste Breite, die Filterzeile brach um, und das Raster rutschte rund 41 px nach unten. Fix in `DashboardFilters.tsx`: Feld und Hinweis teilen denselben Platz. Test vor dem Fix rot, danach grün; Nachmessung CLS höchstens 0,014.

### Zweiter Befund beim Bau (Rollout): spät abonnierte Live-Kennzahlen hingen auf „laden“

Beim Neuerzeugen der Referenzbilder für `visual /dashboard` blieben Live-Kacheln unterhalb des Startbereichs dauerhaft auf „wird geladen“. Ursache in `src/services/liveKpi/liveKpiStreamStore.ts` (kein Schutzbereich): Den Wechsel auf „live“ samt Nachladen des letzten Werts gab es nur beim Verbinden des Kanals, für die zu diesem Zeitpunkt abonnierten Kennzahlen. Durch das Lazy Loading abonnieren Kacheln weiter unten erst später. Ohne Werte der letzten 30 Minuten blieben sie auf „loading“, ein älterer letzter Wert wurde nie geladen. Die bisherige Ansicht abonniert alles auf einmal und war nicht betroffen. Fix: Ein spätes Abonnement bei verbundenem Kanal lädt den letzten Wert einmal nach; die Antwort zählt nur, solange der Kanal noch verbunden ist. Test `liveKpiStreamStoreLateAcquire.vitest.ts`: zwei Fälle vor dem Fix rot, Kontrollfall (vor dem Verbinden bleibt „loading“) grün; `useLiveKpi.ui.vitest.ts` („Feed offline …“) deckte beim Bau ein Rennen auf, das der Fix berücksichtigt.

Außerdem: `e2e/visual.spec.ts` scrollt `/dashboard` vor der Aufnahme einmal durch und wartet, bis jede Kachel geladen ist. Die erste neu erzeugte Referenz zeigte unterhalb der ersten Reihen nur Ladeplatzhalter.

## Entscheidungen Marc (06.10.2026)

| ID  | Frage                                                            | Entscheidung                                                                                              |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| E2  | Wie wird „aktivieren“ umgesetzt?                                 | Standard an im Code; `VITE_EXECUTIVE_DASHBOARD_V2=false` schaltet zurück auf die alte Ansicht (siehe T9). |
| E3  | Bleibt die alte Ansicht nach dem Rollout im Code, und wie lange? | Bis zum Release `v2.4.0` behalten; die Entfernung bekommt einen eigenen Auftrag.                          |

E2 und E3 legen nur fest, _wie_ ausgerollt wird. T9 selbst beginnt erst nach der Sichtprüfung und Freigabe durch Marc.

## Gates

- `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run verify:quality-budget`, `npx size-limit` grün.
- `npx playwright test e2e/personal-dashboard.spec.ts e2e/personal-dashboard-acceptance.spec.ts --workers=1` mit Build `VITE_EXECUTIVE_DASHBOARD_V2=true` zweimal grün (Flakiness).
- `git diff bb5aaff -- src/simulation src/types src/context src/services/data src/features/resources` leer.
- Ergebnismatrix `docs/screenshots/auftrag-079/README.md`: 0 px Überlauf, 0 axe serious/critical, CLS < 0,1 in jeder Zeile.
- Sichtprüfung Marc und Codex-Befund im BUILD_LOG, bevor T9 beginnt.
