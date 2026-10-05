# Auftrag 076 – Dashboard Teilauftrag 6: Geführte KPI-Kombinationen

**Stand:** 05.10.2026

**Basis:** `main` `4088ee3` (nach PR #59, Auftrag 074 gemergt). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 6 und Abschnitt „Kombinationen“ (§4). Datenverträge: Aufträge 070 (Katalog, Konfiguration, Prüfung), 071 (Datenauflösung), 073 (Kachelrahmen), 074 (Raster, Editor, Konfigurator). Inventar: `docs/dashboard/KPI_CATALOG.md`.

**Voraussetzung:** Teilaufträge 1–5 sind gemergt. Der Konfigurator (`TileConfigurator.tsx`) und die Arbeitsbereich-Vorschau (`?bereich=editor`) bestehen.

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc. Die Beziehungsmatrix ist eine fachliche Festlegung. **Freigabe:** Marc hat sie am 05.10.2026 im Chat freigegeben (Antwort „2.“: Liste freigeben, Auftrag sofort bauen, Auftragstext und Code in einem PR).

**Branch:** `claude/inspiring-pascal-hvjcog` (Session-Branch, neu von `main` `4088ee3`), PR gegen `main`.

## Ziel

Der Konfigurator bietet nach der Wahl einer ersten Kennzahl nur fachlich geprüfte zweite Kennzahlen an. Aus einer freigegebenen Regel entsteht eine **Kombinationskachel** mit berechnetem, erklärtem Ergebnis (Formel, beide Operanden, Zeitbasis). Es gibt keinen freien Formeleditor; gleiche Einheit allein macht Kennzahlen nicht kombinierbar. Die Kachel ist weiterhin ein Katalogeintrag (`catalogId`), die gespeicherte Konfiguration ändert ihre Form nicht (`DASHBOARD_CONFIG_VERSION` bleibt 1).

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Migration, keine Änderung an `supabase/`.
- Produktive Seiten unverändert: kein Import der Kombinationslogik aus `src/app/**` oder `src/features/overview/**`; das Startbundle bleibt bis auf Chunk-Hashes inhaltsgleich (`npx size-limit`).
- Nur lesen: `src/domain/**`, `src/components/ui/**`, `src/hooks/**`, `src/app/**`, `src/features/dashboard/hooks/useDashboardPreferences.ts`, `useDashboardEditor.ts`, `useLeaveGuard.ts`, `dashboardEditorReducer.ts`.
- Keine neue Abhängigkeit. Keine Änderung an `Modal.tsx`; eigene Dialoge nutzen `useEscapeToClose` und ruhen, solange eine Rückfrage darüber liegt.
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`, auch Tests und Skripte); die Prüfung gehört ins BUILD_LOG. Dateien früh aufteilen.

## Belegte Grundlagen

- Katalogeinträge (`activeEntries.ts`) tragen `unit`, `timeBasis` (`Stand 31.12.2025` oder `Geschäftsjahr 2025`), `aggregation` (`bestand`, `fluss`, `verhaeltnis`), `shape`, `mayBeNegative`, `funnelStages`. Beispiele: `baseline.umsatz` und `baseline.ebitda` (EUR, Geschäftsjahr 2025, `fluss`), `baseline.marketing_cac` und `baseline.fully_loaded_cac` (EUR je Neukunde, Geschäftsjahr 2025, `verhaeltnis`, beide ÷ 47 Neukunden), `baseline.mrr_paketmix` (`CHART_MRR`, Starter 10.045, Growth 19.580, Pro 4.695 EUR, Summe = Gesamt-MRR, Stand 31.12.2025, Shape `anteile`).
- Kachelzustände (`dashboardData.ts`): `bereit`, `laden`, `keine_daten`, `fehler`, `offline`, `veraltet`, `nicht_konfiguriert`, `nicht_verfuegbar`; Anzeige und Texte in `TileStatus.tsx`, Format in `tileFormat.ts`.
- Live-Werte (`live.*`) haben je KPI eigene Zeitpunkte (`asOf`); ein gemeinsamer bestätigter Snapshot ist nicht belegt (Plan §4).
- Plan §4: Zwei Berechnungen im ersten Umfang (Verhältnis `A ÷ B`, Anteil `A ÷ Gesamt × 100`); Historisch und Live werden nicht verrechnet; Nenner 0, fehlende Werte, widersprüchliche Gesamtheit oder inkompatible Zeitbasis ergeben einen erklärten Zustand, nie `Infinity` oder einen künstlichen Prozentwert.

## Beziehungsmatrix (erster Umfang, freigegeben 05.10.2026)

| Regel-ID | Erste Kennzahl | Zweite Kennzahl | Berechnung | Anzeige | Begründung der Eignung |
|---|---|---|---|---|---|
| `kombination.ebitda_marge` | EBITDA | Umsatzerlöse | Verhältnis `A ÷ B`, Anzeige × 100 in % | Zahl, Tabelle | Beide EUR, beide Geschäftsjahr 2025, gleiche GuV-Quelle; EBITDA darf negativ sein (Ergebnis dann negativ, nicht ausgeblendet). Eine Marge ist ein Verhältnis, kein Teil-Gesamt-Anteil. |
| `kombination.cac_aufschlag` | Fully-Loaded CAC | Marketing-CAC | Verhältnis `A ÷ B`, Faktor „x“ | Zahl, Tabelle | Gleiche Einheit, gleiche Basis (47 Neukunden), gleiches Geschäftsjahr; Aufschlagfaktor der Gesamtkosten gegenüber dem Media-Spend. |
| `kombination.mrr_anteil_starter`, `_growth`, `_pro` | MRR-Paketanteil (Starter, Growth, Pro) | Gesamt-MRR (Summe `CHART_MRR`) | Anteil `A ÷ Gesamt × 100` | Zahl, Tabelle, Ring | Nachweisbare Teilmenge: Die Summe der Pakete ergibt den Gesamt-MRR (Katalogdefinition), gleicher Stand 31.12.2025. Ring zeigt Teil und Rest. |

**Ausdrücklich gesperrt (mit erklärtem Grund, getestet):** Umsatz (Geschäftsjahr) mit Headcount (Stand) wegen unterschiedlicher Zeitbasis; jede Kombination aus `baseline.*` und `live.*` (Historie und Live werden nicht verrechnet); Live-Funnel-Bestände als „Conversion“ (keine gleiche Kohorte und kein gleicher Zeitraum belegt); zwei Live-KPIs ohne belegten gemeinsamen Snapshot; Kombinationen mit einer Kennzahl derselben Art (eine KPI mit sich selbst); jede Paarung außerhalb der Matrix („nicht freigegeben“, nicht „unmöglich“: neue Regeln werden gezielt ergänzt).

**Mit der Freigabe getroffene Entscheidungen:** (1) die vier Regelgruppen oben; (2) Prozentanzeige für die EBITDA-Marge als Verhältnis ohne eigene dritte Berechnungsart; (3) ARPA und weitere bereits berechnete Katalogwerte werden nicht doppelt als Kombination angeboten.

## Entwurf

- **Kombinationsregel** (Regeln in `catalog/combinationRules.ts`, Logik in `dashboardCombinations.ts`; getrennt, damit der Katalog die Regeln ohne Importzyklus lesen kann): `{ id, name, operation: 'verhaeltnis' | 'anteil', display: 'faktor' | 'prozent', operands: { a, b }, explanation }`; Operanden verweisen auf Katalog-IDs, bei Anteilen auf ein Reihenelement (`{ catalogId, label }`) und die Gesamtsumme. Funktionen: `getCombinationRules()`, `partnersFor(catalogId)` (zulässige zweite Kennzahlen), `explainIncompatible(a, b)` (Grund als verständlicher Satz), `computeCombination(rule, a, b)` mit Ergebnis `{ state: 'bereit', value, formula, operands }` oder `{ state: 'nicht_berechenbar', reason }` (Nenner 0, fehlender Operand, negative Gesamtheit beim Anteil, inkompatible Zeitbasis). Alle Prüfungen laufen aus den Katalogfeldern; die Matrix ist die Positivliste, die Strukturprüfung ist die zweite Sicherung (ein Test erzwingt, dass jede Regel sie besteht).
- **Katalog**: `catalog/combinationEntries.ts` erzeugt je Regel einen `ActiveCatalogEntry` (`id` = Regel-ID, `source.layer = 'kombination'`, `shape: 'einzelwert'` bzw. `anteile` bei Ring, `timeMode: 'fest'`, Zeitbasis = die der Operanden). `SourceLayer` bekommt `'kombination'`; `dashboardValidation.ts` prüft Katalog und Konfiguration unverändert über diese Einträge.
- **Daten**: `data/resolveCombination.ts` löst die Operanden mit den vorhandenen Resolvern und rechnet; `useDashboardData` hat einen Zweig für `kombination` (keine neuen Abfragen, nur historische Quellen). `TileData` bekommt für Kombinationen `combination?: { formula, operands[] }` (für Teilauftrag 7). Neuer Zustand `nicht_berechenbar` mit `message`: Badge „Nicht berechenbar“, Text mit Grund, kein Wert, keine Null.
- **Konfigurator**: Nach der Wahl der ersten Kennzahl erscheint „Mit zweiter Kennzahl kombinieren (optional)“ mit den Partnern aus `partnersFor`; je Partner Formel und Einordnung in einem Satz. Gesperrte, naheliegende Partner (gleiche Einheit, andere Zeitbasis) erscheinen deaktiviert mit Grund. Die Wahl ersetzt die Kennzahl durch die Regel-ID; Darstellung, Größe und Zeitbezug richten sich nach dem Regel-Eintrag. Nachträgliches Ändern der ersten Kennzahl verwirft die Kombination ausdrücklich und sagt es an.

## Ziel-Dateien

| Datei (unter `src/features/dashboard/`) | Änderung |
|---|---|
| `model/dashboardCombinations.ts` | Neu: `partnersFor`, `blockedPartnersFor`, `explainIncompatible`, `checkRuleStructure`, `computeCombination` |
| `model/catalog/combinationRules.ts` | Neu: Positivliste der Regeln |
| `model/catalog/combinationEntries.ts` | Neu: Katalogeinträge aus den Regeln |
| `model/dashboardCatalog.ts` | `SourceLayer` um `'kombination'`; Einträge in `DASHBOARD_CATALOG` |
| `model/dashboardValidation.ts` | Nur falls die Katalogprüfung die neue Ebene kennen muss |
| `data/resolveCombination.ts` | Neu: Operanden auflösen und rechnen |
| `data/dashboardData.ts`, `hooks/useDashboardData.ts` | Zustand `nicht_berechenbar`, Feld `combination`, Zweig für die Ebene |
| `components/TileStatus.tsx`, `components/tileFormat.ts`, `components/DashboardTile.tsx` | Zustand, Format (Faktor „x“, Prozent), Formelzeile; Kachelhöhe darf sich beim Wechsel Laden → bereit → nicht berechenbar nicht ändern |
| `components/CombinationPicker.tsx` | Neu: Auswahl der zweiten Kennzahl im Konfigurator (lazy, mit dem Konfigurator geladen) |
| `components/TileConfigurator.tsx`, `components/ConfiguratorFields.tsx` | Einbindung, Verwerfen bei Wechsel der ersten Kennzahl |
| `preview/editorPreviewData.ts`, `preview/DashboardEditorPreview.tsx` | Testdaten für Kombinationen über denselben Rechenweg; drei Kombinationskacheln in der Höchstbelegung (`&kacheln=24`) |
| `model/dashboardFilters.ts`, `data/dashboardData.ts` (`getScopeForLayer`) | Neue Ebene `kombination` wie Stammdaten behandeln (Begründung, Geltungsbereich) |
| Tests (`__tests__/`) | `dashboardCombinations.vitest.ts`, `resolveCombination.vitest.ts`, `CombinationPicker.ui.vitest.tsx`; Ergänzungen in `dashboardCatalog.vitest.ts`, `DashboardTileStates.ui.vitest.tsx`, `TileConfigurator.ui.vitest.tsx` |
| `scripts/captureAuftrag076Screenshots.mjs` (+ `scripts/lib/`), `docs/screenshots/auftrag-076/README.md` | Screenshot- und Ablaufnachweis |
| `docs/dashboard/KPI_CATALOG.md`, `docs/BUILD_LOG.md`, dieser Auftrag | Beziehungsmatrix im Inventar, Berichte, Checkboxen |

## Lehren aus PR #57 und PR #59 (gelten als Abnahmekriterien)

1. **Gates messen, was sie behaupten:** Höhen ganzer Kacheln über Laden → bereit → nicht berechenbar; echte Interaktion (Auswahl per Maus und Tastatur) statt nur Zustandsprüfung; Höchstbelegung mit 24 Kacheln.
2. **Asynchrone Vorgänge sperren synchron** (Referenz, nicht nur deaktivierte Schaltflächen) und alle Wege: Schließen, Escape, Hintergrund, Details.
3. **Fokus** nach jedem Zustandswechsel, der das fokussierte Element entfernt (Wechsel der Kennzahl, Verwerfen der Kombination, Wechsel der Darstellung).
4. **Abgeleitete und ausgeblendete Zustände wirken nicht weiter:** Wird die zweite Kennzahl unzulässig, verschwindet ihre Wahl samt Fehlern; ein verworfener Operand darf nicht in Vorschau oder Speichern landen.
5. **Eingaben, die Abfragen oder Berechnungen auslösen,** gelten sofort bei Auswahl- und Kachelwechsel und verzögert nur beim Tippen.
6. **Nur der oberste Dialog** reagiert auf Escape; Wiederholen nach Nachladefehlern läuft über `requestLeave`.
7. **Ansagen:** Jeder Zustandswechsel (Partner angeboten, Kombination gewählt, verworfen, nicht berechenbar) in einer dauerhaften Live-Region; Texte ohne Export-, Feld- oder Resolvernamen; lange Namen brechen um (0 px Überlauf auf 375 px).
8. **Keine Layoutsprünge** und **0 px Seitenüberlauf** auf 1440/768/375 px; axe `serious`/`critical` = 0 in allen Zuständen (Ansicht, Bearbeiten, Konfigurator mit Kombination, gesperrter Partner, nicht berechenbar).

## Aufgaben (Tests zuerst)

- [x] Tests zuerst für `dashboardCombinations`: 25 von 100 ergibt 25 %; Nenner 0, fehlender Operand, negative Gesamtheit beim Anteil, `NaN`/`Infinity` ergeben `nicht_berechenbar` mit Grund; EBITDA ÷ Umsatzerlöse mit den Katalogwerten (Ergebnis und Formelzeile reproduzierbar); negatives EBITDA ergibt negative Marge; Fully-Loaded CAC ÷ Marketing-CAC (4.447 ÷ 862); Paketanteile summieren sich auf 100 %.
- [x] Tests zuerst für die Matrix: jede Regel besteht die Strukturprüfung (gleiche Ebene, gleiche Zeitbasis, belegte Einheit); jede gesperrte Beispielpaarung liefert einen erklärten Grund; keine Regel kombiniert `baseline` mit `live`, Funnel-Bestände oder zwei Live-KPIs; `partnersFor` kennt keine Paarung außerhalb der Matrix.
- [x] Tests zuerst für Katalog und Validierung: Kombinationseinträge sind aktiv, ihre Operanden existieren und sind aktiv; `validateDashboardConfig` akzeptiert eine Kombinationskachel mit zulässiger Darstellung und lehnt Ring bei Verhältnis ab; eine gespeicherte Kombination mit entfernter Regel bleibt als unbekannte Kachel erhalten.
- [x] Tests zuerst für Datenauflösung und Kachel: `bereit` mit Formel und Operanden, `nicht_berechenbar` mit Grund (Badge, Text, kein Wert), gleiche Kachelhöhe in allen Zuständen, Anzeige von Faktor und Prozent in deutscher Schreibweise.
- [x] Tests zuerst für `CombinationPicker` und Konfigurator: Partner nur nach Matrix, gesperrte Partner mit Grund, Wahl ersetzt die Kennzahl und setzt Darstellung, Größe und Zeitbezug aus der Regel, Wechsel der ersten Kennzahl verwirft die Kombination mit Ansage, Fokus nach Wahl und Verwerfen, Tastaturbedienung, Escape schließt nur den obersten Dialog.
- [x] Umsetzung gemäß Entwurf (Reihenfolge: Regeln und Katalog, Datenauflösung, Kachel und Zustand, Konfigurator, Vorschau).
- [x] `docs/dashboard/KPI_CATALOG.md`: Beziehungsmatrix mit Begründung und den gesperrten Beispielen.
- [x] Screenshot-Skript `scripts/captureAuftrag076Screenshots.mjs` nach Vorbild `captureAuftrag074Screenshots.mjs`: Vorher (Basis `4088ee3`) und Nachher je Breite 1440/768/375 mit unterschiedlichen Hashes; 0 px Seitenüberlauf und axe `serious`/`critical` = 0 in Ansicht, Bearbeiten, Konfigurator mit Kombination, gesperrtem Partner und nicht berechenbar; Tastaturablauf (Kennzahl wählen, Partner wählen, hinzufügen, speichern); gleiche Höhe ganzer Kacheln über alle Zustände; Ablauf mit 24 Kacheln inklusive Kombinationen; nur die textuelle Matrix `docs/screenshots/auftrag-076/README.md` wird committet.
- [x] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build`, `npm run verify:quality-budget`, `npx size-limit`; Schutzbereichs-Diff leer; `wc -l` über alle geänderten Dateien.
- [x] BUILD_LOG-Eintrag (Ziel, Dateien, Prüfungen, Schutzbereiche, Screenshot-Matrix, Freigabestatus), Push; PR gegen `main` nach Marcs Wahl „2.“ (Text und Code in einem PR).

## Abnahme

Kombinationen sind frei innerhalb der geprüften fachlichen Beziehungen wählbar; bloße Einheiten- oder Typgleichheit reicht nie. Ergebnis und Formel sind reproduzierbar, nicht berechenbare Fälle sind erklärt und lassen die Kachelhöhe unverändert. Nicht freigegebene und gesperrte Paarungen sind im Konfigurator mit Grund sichtbar oder nicht angeboten, nie still verrechnet. Die gespeicherte Konfiguration behält ihre Form, unbekannte Kombinationen bleiben erhalten. Produktive Seiten und Startbundle unverändert. Codex prüft; Marc sieht die Vorschau im CI-Artefakt `dashboard-preview`; Merge nur durch Marc.
