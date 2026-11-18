# Auftrag 166 – Dashboard-Editor: Schwellenwerte auf Kacheln, Alarmfähigkeit je KPI, Betriebsweg für Alarme (P13a)

**Ziel:** Schwellenwerte, die heute schon im Inspector gesetzt werden können, werden eindeutig, geprüft und auf der Kachel sichtbar. Jede aktive Katalog-Kennzahl erhält im Code die Angabe, ob sie später serverseitig alarmfähig sein darf und warum (nicht). Dazu wird Marcs Entscheidung vom 18.11.2026 dokumentiert, wie der Alarm-Worker auf dem Server läuft (§8). **Dieser Auftrag baut noch keine Server-Alarme**; er schafft die Regeln und Verträge, auf denen 167 (Server) und 168 (Oberfläche der Alarme) aufsetzen.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P13 (§6), §4.D „Darstellung, Schwellenwerte und Alarme“, §9.2 (Alarm-Worker, Parität, Alarmverwaltung), Gegenprüfung L2/L3 (§9.3).
**Fachgrundlage:** [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §8 (Indikatoren, Phase A/B), [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md), [EDITOR_BESTAND_144.md](../dashboard/EDITOR_BESTAND_144.md) (Alarmbetrieb-Machbarkeit), [ZEITREIHEN_P10B.md](../dashboard/ZEITREIHEN_P10B.md), [VERSIONEN_AUSTAUSCH_P12.md](../dashboard/VERSIONEN_AUSTAUSCH_P12.md).
**Vorgelagert:** 165 (P12, PR #204) muss gemergt sein. Fachlich unabhängig von 165; der Versionsvergleich zeigt geänderte Schwellenwerte bereits (`dashboardConfigDiff.ts:227`).
**Baseline:** aktueller `main` nach Merge von 165 (der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-166-schwellenwerte-alarmfaehigkeit`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge und Deploy:** Marc.
**Status:** ENTWURF (wartet auf Merge von 165).

---

## 0. Aufteilung von P13

P13 ist für einen PR zu groß. Aufteilung analog P11a/P11b:

| Teil | Auftrag | Inhalt                                                                                                                                                                                    | Server   |
| ---- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P13a | **166** | Eindeutiges Schwellenwertmodell, Anzeige auf der Kachel, Alarmfähigkeitsmatrix im Code, Betriebsweg dokumentieren                                                                         | nein     |
| P13b | 167     | Alarmregeln, Auswertungszustand und Ereignisprotokoll als Tabellen; Worker nach Marcs Entscheidung; Lebenszeichen; Paritätstests je freigeschalteter KPI; Aufbewahrungsjob für Revisionen | ja       |
| P13c | 168     | Alarmliste in der App, Lesebestätigung/Quittierung, Pausieren nach Rechteverlust des Erstellers, Admin-Übernahme                                                                          | nur RPCs |

Die Entscheidung aus §8 liegt seit 18.11.2026 vor; 167 und 168 können darauf aufbauen.

## 1. Ist-Stand (geprüft auf Branch-Stand 165, `1b5e9a9f`)

| Baustein        | Ist                                                                                                                                                                                                                                                                              | Fundstelle                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Regel-Typ       | `TileThresholdRule { enabled, operator: 'gt'\|'lt'\|'gte'\|'lte'\|'eq'\|'between', warningValue?, criticalValue?, secondaryWarningValue?, secondaryCriticalValue? }`. Keine Richtung („höher ist besser“), keine Einheit, Bedeutung von `between` nirgends festgelegt.           | `model/dashboardConfigV2.ts:59–68`                                                          |
| Inspector       | Tab „Schwellenwerte“: Ein/Aus, Operator (`gt`, `lt`, `gte`, `lte`, `between`; `eq` fehlt in der Auswahl), Warn- und Kritisch-Grenze. Vorbelegung 100/200 unabhängig von der Kennzahl. Keine Prüfung, ob Warnung vor Kritisch liegt. Für `between` keine zweite Grenze eingebbar. | `components/editor/inspector/InspectorThresholdTab.tsx` (97 Zeilen)                         |
| Anzeige         | **fehlt.** Kein Renderer liest `threshold`. Gesetzte Schwellenwerte haben heute keine sichtbare Wirkung.                                                                                                                                                                         | `grep threshold src/features/dashboard/components` → nur Inspector und Inspector-Aktionen   |
| Validierung     | Client: `validateDashboardConfigV2` prüft `threshold` nicht inhaltlich. Server: `dashboard_config_v2_invalid_reason` erlaubt die Schlüssel `threshold` und `thresholdRules`, prüft den Inhalt nicht.                                                                             | `model/dashboardConfigV2.ts`, `supabase/migrations/20261120_dashboard_query_window.sql:108` |
| Katalog         | Aktive Einträge haben `unit`, `shape`, `history` (P10a), `mayBeNegative`; keine Angabe zur Alarmfähigkeit, keine Richtung.                                                                                                                                                       | `model/dashboardCatalog.ts:115–147`, `model/historyCapability.ts`                           |
| Kachelzustände  | `TileStatus` kennt u. a. `fehler`, `veraltet`, `offline`; Hinweise über sichtbarem Inhalt.                                                                                                                                                                                       | `components/TileStatus.tsx`                                                                 |
| Prozentwerte    | Werte mit Einheit `%` liegen bereits in der Anzeigeskala 0–100 vor (`tileFormat.ts:26`).                                                                                                                                                                                         | `components/tileFormat.ts`                                                                  |
| Server-Rechnung | CRM-Kennzahlen: `dashboard_crm_pipeline_overview` (P08a) aggregiert auf dem Server; Zeitreihen: `dashboard_time_series` (P10b). Für Basis-/Planwerte (`baseline`) gibt es keine Serverquelle, sie sind statisch im Bundle.                                                       | `20261116_dashboard_query_contract.sql`, `20261119_dashboard_time_series.sql`               |
| Scheduler       | Kein `pg_cron`, keine zeitgesteuerte Edge Function im Repo. Edge Functions: `crm-query-export`, `live-kpi-ingest`, `manage-members`.                                                                                                                                             | `supabase/functions/`, `grep cron supabase` leer                                            |
| Bundle          | Initial-JS **179,37 kB** gzip (BUILD_LOG 165), Grenze 180 kB – **0,63 kB** Spielraum.                                                                                                                                                                                            | `.size-limit.json`                                                                          |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich)

1. **Drei Arten von Regeln, keine freien Operatoren.**
   - `hoch_ist_schlecht`: Warnung ab `warnung`, kritisch ab `kritisch`; Pflicht `warnung < kritisch`.
   - `niedrig_ist_schlecht`: Warnung ab `warnung` abwärts, kritisch ab `kritisch` abwärts; Pflicht `warnung > kritisch`.
   - `zielbereich`: normal innerhalb `[untenWarnung, obenWarnung]`; Warnung außerhalb; kritisch ab `untenKritisch` abwärts bzw. ab `obenKritisch` aufwärts (beide optional). Pflicht `untenKritisch < untenWarnung < obenWarnung < obenKritisch`, soweit gesetzt.
   - Die Kritisch-Grenze ist bei den ersten beiden Arten optional; fehlt sie, gibt es nur „Warnung“.
2. **Grenzen sind eindeutig.** Der Grenzwert selbst gehört immer zur schlechteren Stufe. Beispiel `hoch_ist_schlecht`, Warnung 200, kritisch 500: normal `< 200`, Warnung `>= 200 und < 500`, kritisch `>= 500` (Masterplan §4.D). Im Zielbereich gehört `untenWarnung`/`obenWarnung` noch zu „normal“, `untenKritisch`/`obenKritisch` zu „kritisch“.
3. **Einheit und Skala wie angezeigt.** Grenzwerte werden in derselben Einheit und Skala eingegeben, in der die Kachel den Wert zeigt (`%` als 0–100, EUR als Euro, nicht in Tausend). Die Regel speichert die Katalogeinheit zum Zeitpunkt des Setzens (`einheit`). Weicht sie später von der Katalogeinheit ab, gilt die Regel als ungültig (Nr. 7). Prozent und Prozentpunkte werden nicht umgerechnet.
4. **Nur bei Einzelwerten.** Schwellenwerte gelten für Kacheln, deren Kennzahl einen einzelnen Wert liefert (Datenform `einzelwert`, `verhaeltnis`, `anteil`). Für alle anderen Datenformen ist der Tab sichtbar, aber gesperrt mit „Schwellenwerte gibt es nur für Kacheln mit einem einzelnen Wert.“ Übersichten, Kategorien, Anteile mehrerer Teile und Zeitreihen werden nicht bewertet.
5. **Kein Messwert ist kein grüner Wert.** Bewertungsergebnis ist einer von: `normal`, `warnung`, `kritisch`, `keine_daten` (kein Wert), `nicht_bewertet` (Kachel im Zustand `fehler`, `veraltet`, `offline` oder Wert nicht endlich), `regel_ungueltig`. Nur `warnung` und `kritisch` färben die Kachel; `keine_daten` und `nicht_bewertet` erscheinen als neutraler Text, nie in Grün.
6. **Farbe nie allein.** Auf der Kachel: 2 px Rand links in der Stufenfarbe **und** ein Badge mit Symbol und Text („Warnung“, „Kritisch“), dazu im zugänglichen Namen der Kachel der Satz „Schwellenwert: Warnung (ab 200 EUR)“. Kein Blinken, keine Animation. `normal` zeigt kein Badge, aber einen Hinweis im Tooltip/Detail „Im Normalbereich“. Farben über vorhandene Tokens, keine neuen Farbwerte.
7. **Alte Regeln werden übernommen, nicht verworfen.** Gespeicherte Regeln im alten Format werden beim Laden in das neue Format übersetzt (§2.2 Nr. 9). Lässt sich eine alte Regel nicht eindeutig übersetzen (`eq`, `between`, fehlende Grenzwerte, Warnung und Kritisch in falscher Reihenfolge), wird sie **nicht gelöscht**, sondern als `regel_ungueltig` angezeigt: Badge „Schwellenwert prüfen“ für Schreibberechtigte, im Inspector der konkrete Grund. Das Dashboard lädt immer; eine ungültige Regel macht nie die ganze Konfiguration ungültig.
8. **Speichern ist streng.** Neue oder geänderte Regeln müssen Nr. 1–3 erfüllen, sonst ist „Übernehmen“ im Inspector gesperrt und der Grund steht am Feld. Unveränderte Altregeln blockieren das Speichern nicht.
9. **Rechte unverändert.** Schwellenwerte sind Teil der Dashboard-Konfiguration. Setzen darf, wer das Dashboard schreiben darf (`canWrite`); sehen darf jeder Leser. Viewer in der Leseansicht sehen Badge und Grenzwerte, aber keinen bearbeitbaren Tab.
10. **Die Bewertung ist eine reine Funktion.** `evaluateThresholdV2(regel, wert, kachelzustand, katalogeinheit)` hängt von nichts anderem ab. Sie ist der fachliche Vertrag, den P13b auf dem Server nachbaut; deshalb liegt eine Tabelle mit Referenzfällen als JSON neben der Funktion (§2.2 Nr. 11), die 167 für den Paritätstest wiederverwendet.

### 2.2 Modell

11. Neu `model/thresholdRuleV2.ts` (≤ 400 Zeilen):
    - Typ `ThresholdRuleV2 = { formatVersion: 2; enabled: boolean; art: 'hoch_ist_schlecht' | 'niedrig_ist_schlecht' | 'zielbereich'; einheit: string; warnung?: number; kritisch?: number; untenWarnung?: number; obenWarnung?: number; untenKritisch?: number; obenKritisch?: number }`.
    - `validateThresholdRuleV2(regel, katalogeintrag)` → `{ ok: true } | { ok: false, grund, feld }` mit deutschen Gründen an einer Stelle.
    - `normalizeLegacyThresholdRule(alt, katalogeintrag)` → `{ regel: ThresholdRuleV2 } | { ungueltig: grund }`. Übersetzung: `gt`/`gte` → `hoch_ist_schlecht`; `lt`/`lte` → `niedrig_ist_schlecht`; `eq`, `between` → ungültig mit Grund. `gt` und `gte` unterscheiden sich nur beim exakten Grenzwert; da alte Regeln nie angezeigt oder ausgewertet wurden, ändert sich für Nutzer nichts (im BUILD_LOG vermerken).
    - `evaluateThresholdV2(...)` nach 2.1 Nr. 1–5 → `{ stufe, grenze?, text }`.
    - `describeThresholdV2(regel)` → deutsche Kurzbeschreibung für Badge, Tooltip und zugänglichen Namen, Zahlen mit `tileFormat`-Formatierung.
12. Neu `model/thresholdReferenceCases.json`: mindestens 40 Fälle (`regel`, `wert`, `zustand`, `einheit`, `erwartet`), darunter jede Grenze exakt, knapp darunter/darüber, negative Werte bei `mayBeNegative`, `0`, `NaN`, `Infinity`, `null`, jede Altregel-Variante, Einheitenwechsel, Zielbereich mit nur Warngrenzen. Vitest liest diese Datei und prüft `evaluateThresholdV2` dagegen.
13. `TileThresholdRule` in `dashboardConfigV2.ts` wird zu `TileThresholdRule = LegacyTileThresholdRule | ThresholdRuleV2` (Unterscheidung über `formatVersion`). Neue Regeln werden nur im neuen Format geschrieben. **Keine Konfigurationsversion erhöhen**, keine Migration gespeicherter Dashboards; die Übersetzung passiert beim Lesen.
14. `validateDashboardConfigV2`: prüft Regeln im neuen Format nur auf Form (Typen, Felder, endliche Zahlen); fachliche Widersprüche führen **nicht** zur Ablehnung der Konfiguration (2.1 Nr. 7), sondern zu `regel_ungueltig` bei der Anzeige. Alte Regeln passieren unverändert. Der Import (165) verhält sich damit wie Laden.
15. Neu `model/alarmCapability.ts` + `model/catalog/alarmEntries.ts` (Muster `historyCapability.ts`/`historyEntries.ts`): für **jede aktive Katalog-ID** genau ein Eintrag `{ status: 'ausgeschlossen' | 'pruefbar' | 'nicht_einzelwert', grund, serverquelle? }`.
    - `ausgeschlossen`: alle `baseline.*` (statische Plan-/Basiswerte, Masterplan §4.D) mit Grund „Feste Referenzwerte ändern sich nicht; ein Alarm wäre sinnlos.“
    - `pruefbar`: Einzelwerte mit belegter Serverquelle (`dashboard_crm_pipeline_overview`, mandantengebundener Live-KPI-Feed seit 153); `serverquelle` nennt RPC bzw. Tabelle. **`pruefbar` heißt noch nicht alarmfähig**: Freigeschaltet wird erst in 167 nach bestandenem Paritätstest.
    - `nicht_einzelwert`: alle Datenformen außer Nr. 4.
    - Kombinationen: `pruefbar` nur, wenn alle Bestandteile `pruefbar` sind, sonst `ausgeschlossen` mit Nennung des Bestandteils.
    - Ein Vitest stellt sicher: jede aktive ID hat genau einen Eintrag, keine inaktive ID hat einen, Zählung je Status steht im BUILD_LOG.
16. Neu `scripts/verifyAlarmCapability.ts` (Muster `verifyLiveKpiCatalog.ts`): gibt die Matrix als Tabelle aus und schlägt fehl bei fehlenden oder überzähligen IDs. Aufnahme in `npm run verify` nur, wenn das ohne Änderung von `scripts/verifyIntegrity.ts`-Suiten geht; sonst eigener Aufruf in §7.

### 2.3 Oberfläche

17. **Inspector-Tab neu** `InspectorThresholdTab.tsx` (bleibt ≤ 200 Zeilen; Formularteile ggf. in `inspector/threshold/*`):
    - Auswahl der Art als drei beschriftete Optionen mit je einem Satz Erklärung („Höher ist schlecht – z. B. Kosten, Durchlaufzeit“).
    - Felder je Art (Nr. 1), Einheit neben dem Feld aus dem Katalog, Eingabe mit deutschem Dezimalkomma.
    - **Keine kennzahlfremde Vorbelegung**: Beim Einschalten werden die Felder mit dem aktuellen Kachelwert als Hinweis („Aktueller Wert: 312 EUR“) angezeigt, aber leer gelassen.
    - Live-Vorschau unter dem Formular: „Mit dem aktuellen Wert wäre die Kachel: Warnung“.
    - Fehler am Feld (2.1 Nr. 8), `aria-invalid`, `aria-describedby`.
    - Altregel: gelber Hinweis „Diese Regel stammt aus einer älteren Version und wurde übernommen.“ bzw. bei `regel_ungueltig` der Grund und Knopf „Neu festlegen“.
    - Gesperrt mit Text bei 2.1 Nr. 4 und in der Leseansicht (nur Anzeige der Regel).
    - Hinweiszeile unten: „Benachrichtigungen bei geschlossenem Browser folgen in einer späteren Version.“ (kein Versprechen eines Datums).
18. **Kachel**: Neu `components/TileThresholdBadge.tsx` (klein, im Initial-Chunk zulässig) und Einbindung in `LazyDashboardTile`/`CanvasTileCard` an genau einer Stelle, sodass Editor, Leseansicht und Vorschau dieselbe Anzeige haben. Bewertung über `evaluateThresholdV2` mit dem bereits geladenen Kachelwert; **keine zusätzlichen Datenabfragen**.
19. **Druck/Report** (`components/export/*`) und V1-Kacheln bleiben unverändert (Druck-Status folgt in P15).

### 2.4 Vorschau, Tests, Leistung

20. **Vorschau-Szenario** `dashboard-vorschau.html?bereich=editor_v2&schwellenwerte=1`: Dashboard mit je einer Kachel in `normal`, `warnung`, `kritisch`, `keine_daten`, `nicht_bewertet` (veraltet), einer Altregel `gte` (übernommen) und einer Altregel `between` (`regel_ungueltig`). Kombinierbar mit `&teams=1` (Leseansicht).
21. **Vitest** (Tests zuerst): Referenzfälle 2.2 Nr. 12; Validierung je Art und Feld; Altregel-Übersetzung jede Variante; `validateDashboardConfigV2` lehnt Konfigurationen mit fachlich widersprüchlicher Regel **nicht** ab; Alarmfähigkeitsmatrix vollständig (2.2 Nr. 15); Inspector (Art wählen, Fehler am Feld, Sperre bei Nicht-Einzelwert, Leseansicht, keine Vorbelegung 100/200 mehr, Live-Vorschau); Badge (Text und Symbol je Stufe, zugänglicher Name, kein Badge bei `normal`, neutral bei `keine_daten`); Diff zeigt Wechsel Alt→Neu-Format als eine Änderung `threshold`; Export→Import-Rundlauf erhält Regeln im neuen Format.
22. **E2E Vorschau** `e2e/dashboard-thresholds-preview.spec.ts`: Szenario 20 öffnen, Badges und Texte prüfen; im Editor eine Regel `hoch_ist_schlecht` mit Warnung über dem aktuellen Wert anlegen → kein Badge, Grenze unter den Wert setzen → „Warnung“; Kritisch kleiner als Warnung eingeben → „Übernehmen“ gesperrt mit Grund; Speichern, neu laden, Badge bleibt.
23. **Bestehende E2E** (`personal-dashboard*.spec.ts`, `editor-*.spec.ts`, `team-dashboards*.spec.ts`, `dashboard-versions*.spec.ts`, `a11y.spec.ts`, `visual.spec.ts`) bleiben grün. Visuelle Baselines nur über `visual-baselines/**`, falls Vorschau-Kacheln mit Regel sichtbar wechseln; Begründung im BUILD_LOG.
24. **Bundle:** Initial-JS höchstens **+0,3 kB** gzip und unter 180 kB (Ausgangswert 179,37 kB). `thresholdRuleV2.ts` darf im Initial-Chunk liegen, sofern die Grenze hält; Inspector-Teile, Referenzfälle-JSON und Alarmfähigkeitsmatrix **nicht** (Matrix wird nur im Inspector und im Verifier gebraucht). Reicht der Spielraum nicht: stoppen und im PR begründen, Grenze nicht anheben.
25. **Leistung:** Bewertung von 24 Kacheln unter 1 ms (Vitest, Mittel aus 50 Läufen); kein zusätzliches Rendern der Kacheln bei unverändertem Wert (Test mit Render-Zähler).
26. **Screenshots** (lokal, nur README-Matrix committen, `docs/screenshots/auftrag-166/README.md`): Szenario 20 im Editor und in der Leseansicht, Inspector je Art, Inspector mit Feldfehler, gesperrter Tab bei Zeitreihe – jeweils 1440/768/375 px, Vorher/Nachher-Hashes verschieden, 0 px horizontaler Überlauf.

### 2.5 Dokumentation

27. Neu `docs/dashboard/SCHWELLENWERTE_P13A.md`: Regelarten mit Grenzbeispielen, Bewertungsstufen, Altregel-Übersetzung, Alarmfähigkeitsmatrix (Zählung je Status, Verweis auf Code), Entscheidung Marc vom 18.11.2026 aus §8.
28. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Aufteilung P13 in P13a/b/c, Umsetzungsstand P13a“. §9.2 Zeilen „Ausführung des Alarm-Workers …“ und „Gemeinsame Fachformeln …“: datierter Verweis auf Auftrag 166 §8 bzw. `thresholdReferenceCases.json`. Nichts umschreiben.
29. `EDITOR_UX_FACHVERTRAEGE_145.md` §8: datierter Nachtrag, dass die freien Operatoren durch die drei Regelarten ersetzt sind.
30. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (drei Regelarten, Grenzwert zählt zur schlechteren Stufe, Übersetzung beim Lesen statt Migration, ungültige Regel blockiert das Laden nie, Alarmfähigkeit als Code-Matrix, `pruefbar` ≠ freigeschaltet).
31. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 166; `docs/BUILD_LOG.md` Builder-Eintrag.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Kein Server-Code:** `supabase/**` unverändert (keine Migration, keine Edge Function, keine pgTAP-Änderung). Server-Validierung der Regeln folgt in 167.
3. **Keine Datenabfragen** neu oder geändert: `src/features/dashboard/data`, `src/services/liveKpi`, `src/domain`, `crmRepository.ts`, `src/hooks/queries/**` unverändert.
4. **Keine Rechtelogik im Client** über 2.1 Nr. 9 hinaus; `src/auth/permissions.ts` unverändert.
5. **V1-Pfad unverändert** (V1-Editor, `dashboardPresets.ts`, `dashboardRollout.ts`, V1-Teile von `PersonalExecutiveDashboard.tsx`, `DashboardTile.tsx` für V1).
6. **Konfigurationsformat abwärtskompatibel:** `formatVersion` des Dashboards bleibt 2; jede heute gespeicherte Konfiguration lädt unverändert (Test mit drei realistischen Altkonfigurationen inkl. `between`).
7. **Keine neuen Abhängigkeiten.** Vorhandene Bausteine (`Badge`, Tokens, `tileFormat`) wiederverwenden.
8. **`max-lines` 400** für alle neuen und geänderten TS/TSX-Dateien; `CanvasTileCard.tsx` (327) wächst höchstens um 10 Zeilen.
9. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) Referenzfall „Wert genau 200 bei Warnung 200 → `warnung`“ → heute rot (Modul fehlt); (b) Kachel mit Regel `kritisch` zeigt Badge „Kritisch“ → heute rot (keine Anzeige); (c) Inspector sperrt Kritisch < Warnung bei `hoch_ist_schlecht` → heute rot; (d) Matrix-Test „jede aktive Katalog-ID hat einen Alarmfähigkeitseintrag“ → heute rot; (e) Altkonfiguration mit `between` lädt und zeigt „Schwellenwert prüfen“ → heute rot.
10. **Barrierefreiheit:** Stufe immer als Text, Radiogruppe für die Art mit Beschriftung, Fehler per `aria-describedby`; `a11y.spec.ts` ohne neue Verstöße gegenüber `a11y-baseline.json`; Kontrast der Badges ≥ 4,5:1 in hellem und dunklem Theme.
11. **Keine Secrets**, keine Hosted-Änderung.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                               | Änderung                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_166_SCHWELLENWERTE_ALARMFAEHIGKEIT.md`                                                                                                         | Dieser Auftrag (Checkboxen, Status)           |
| neu `src/features/dashboard/model/thresholdRuleV2.ts`, neu `model/thresholdReferenceCases.json`, neu `model/thresholdMessages.ts` (falls ausgelagert)                              | Regelmodell, Bewertung, Texte (2.2 Nr. 11–12) |
| `src/features/dashboard/model/dashboardConfigV2.ts`                                                                                                                                | Typ-Union, Formprüfung (2.2 Nr. 13–14)        |
| neu `model/alarmCapability.ts`, neu `model/catalog/alarmEntries.ts`, neu `scripts/verifyAlarmCapability.ts`                                                                        | Alarmfähigkeitsmatrix (2.2 Nr. 15–16)         |
| `components/editor/inspector/InspectorThresholdTab.tsx`, ggf. neu `inspector/threshold/*`, `components/editor/useTileInspectorActions.ts`                                          | Inspector (2.3 Nr. 17)                        |
| neu `components/TileThresholdBadge.tsx`, `components/LazyDashboardTile.tsx` und/oder `components/editor/canvas/CanvasTileCard.tsx` (eine Einbindungsstelle)                        | Kachelanzeige (2.3 Nr. 18)                    |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`, ggf. neu `preview/previewThresholds.ts`                                                                             | Vorschau-Szenario (2.4 Nr. 20)                |
| `src/features/dashboard/__tests__/*` (neu bzw. ergänzt)                                                                                                                            | Vitest (2.4 Nr. 21, 25)                       |
| neu `e2e/dashboard-thresholds-preview.spec.ts`                                                                                                                                     | E2E (2.4 Nr. 22)                              |
| neu `scripts/captureAuftrag166GateScreenshots.mjs`, neu `docs/screenshots/auftrag-166/README.md`                                                                                   | Screenshot-Harness und Matrix (2.4 Nr. 26)    |
| neu `docs/dashboard/SCHWELLENWERTE_P13A.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `EDITOR_UX_FACHVERTRAEGE_145.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | Doku, Status, Builder-Eintrag (2.5)           |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Baseline festlegen, Ist-Tabelle §1 prüfen, Zeilenzahlen der Grenzdateien und `size-limit` als Ausgangswert notieren; Anzahl gespeicherter Regeln je Altoperator in den Vorschau-/Testdaten zählen.
- [ ] **T1 Rot-Nachweise:** §3 Nr. 9 (a)–(e), Ergebnisse im BUILD_LOG.
- [ ] **T2 Regelmodell und Referenzfälle:** 2.2 Nr. 11–12, Leistungsmessung 2.4 Nr. 25 (Bewertung).
- [ ] **T3 Konfiguration und Abwärtskompatibilität:** 2.2 Nr. 13–14, §3 Nr. 6 (drei Altkonfigurationen).
- [ ] **T4 Alarmfähigkeitsmatrix:** 2.2 Nr. 15–16, Zählung je Status im BUILD_LOG.
- [ ] **T5 Kachelanzeige:** 2.3 Nr. 18, Render-Zähler-Test.
- [ ] **T6 Inspector:** 2.3 Nr. 17.
- [ ] **T7 Vorschau-Szenario und E2E:** 2.4 Nr. 20, 22–23.
- [ ] **T8 Bundle- und A11y-Gegenprobe:** `size-limit` vorher/nachher, `a11y.spec.ts`, Kontrastnachweis.
- [ ] **T9 Screenshots:** 2.4 Nr. 26.
- [ ] **T10 Doku:** 2.5.
- [ ] **T11 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag (Smoke im Browser für Marc: Kachel „Pipeline-Wert“ öffnen, Regel „Niedrig ist schlecht“ mit Warnung über dem aktuellen Wert setzen, Badge „Warnung“ sehen, speichern, neu laden, als Viewer ansehen), PR öffnen, Review anfordern.

## 6. Abnahme

- Eine Regel lässt sich nur eindeutig anlegen: Art wählen, Grenzen in der angezeigten Einheit, widersprüchliche Grenzen werden am Feld erklärt.
- Kacheln mit Einzelwert zeigen „Warnung“/„Kritisch“ mit Rand, Symbol und Text; fehlende oder veraltete Werte werden nie als normal dargestellt.
- Alle bisher gespeicherten Dashboards laden unverändert; alte Regeln werden übernommen oder als „Schwellenwert prüfen“ markiert, nie stillschweigend gelöscht.
- Jede aktive Kennzahl hat im Code eine begründete Alarmfähigkeitsangabe; Basis-/Planwerte sind ausgeschlossen.
- Die Referenzfälle liegen als JSON vor und sind von 167 für den Server-Paritätstest nutzbar.
- Die Entscheidung Marc vom 18.11.2026 (§8) ist in `SCHWELLENWERTE_P13A.md` und Masterplan §9.2 dokumentiert.
- Schutzbereichs-Diff leer, `supabase/**` unverändert, V1 unverändert, keine neuen Abhängigkeiten, Initial-Bundle ≤ +0,3 kB und unter 180 kB.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npx size-limit
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyAlarmCapability.ts
npx playwright test e2e/dashboard-thresholds-preview.spec.ts e2e/dashboard-versions*.spec.ts e2e/team-dashboards*.spec.ts e2e/personal-dashboard*.spec.ts e2e/editor-*.spec.ts e2e/a11y.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> --stat -- supabase   # leer
git diff <baseline> -- src/auth src/services/liveKpi src/services/db/crmRepository.ts src/domain src/features/dashboard/data src/hooks/queries   # leer
```

CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Betriebsweg des Alarm-Workers (entschieden am 18.11.2026)

Masterplan §4.D und §9.2 verlangen vor dem Bau von P13b eine Festlegung zu Hosting, Zeitplan, Dienstkonto, Kosten und Ausfallerkennung. 166 baut davon nichts; die Entscheidung wird nur vorbereitet.

**Vorschlag (Empfehlung):** Auswertung **in der Datenbank** per `pg_cron` (Supabase-Erweiterung, im Projekt einmalig zu aktivieren).

| Punkt            | Vorschlag                                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ausführung       | `pg_cron`-Job ruft eine PL/pgSQL-Funktion `evaluate_dashboard_alarms()` auf. Sie liest die Regeln, rechnet über die vorhandenen Serverquellen (`dashboard_crm_pipeline_overview`, Live-KPI-Tabelle) und schreibt Zustand und Ereignisse. Kein Browser, kein externer Dienst. |
| Intervall        | alle **5 Minuten**; kürzer nicht (CRM-Daten ändern sich durch Import, nicht sekündlich).                                                                                                                                                                                     |
| Dienstkonto      | Funktion `SECURITY DEFINER` mit eigenem Eigentümer, rechnet je Organisation getrennt (`organization_id` als Parameter, nie organisationsübergreifend). Kein Service-Key im Code.                                                                                             |
| Lebenszeichen    | Tabelle `alarm_worker_heartbeat` (letzter Lauf, Dauer, Anzahl Regeln, Fehler). Die App zeigt Admins „Alarmprüfung seit X Minuten nicht gelaufen“, wenn der letzte Lauf älter als 15 Minuten ist. Damit fällt ein Ausfall auf, ohne dass ein Browser rechnet.                 |
| Kosten           | Keine zusätzlichen Kosten im aktuellen Supabase-Tarif (`pg_cron` ist enthalten); Last bei 5 Minuten und wenigen Organisationen vernachlässigbar.                                                                                                                             |
| Mitbenutzung     | Derselbe Zeitplan führt einmal täglich die Revisions-Aufbewahrung aus Auftrag 165 §8 aus.                                                                                                                                                                                    |
| Abschalten       | Ein Schalter in einer Einstellungstabelle pausiert alle Auswertungen (Masterplan §8); Frontend-Rollback allein stoppt nichts.                                                                                                                                                |
| Paritätsnachweis | Die PL/pgSQL-Bewertung muss alle Fälle aus `thresholdReferenceCases.json` bestehen (pgTAP liest dieselben Fälle).                                                                                                                                                            |

**Alternativen:**

- **Zeitgesteuerte Edge Function** (`pg_cron` + `pg_net` ruft eine Deno-Funktion auf): könnte `thresholdRuleV2.ts` direkt wiederverwenden (gleicher TypeScript-Code, bessere Parität), braucht aber einen Service-Key als Secret in Supabase und hat mehr bewegliche Teile.
- **Externer Scheduler** (z. B. n8n aus `tools/n8n/`): flexibel, aber ein weiterer Dienst muss laufen und überwacht werden; fällt n8n aus, fallen Alarme aus.

**Entscheidung Marc vom 18.11.2026 (Empfehlung in allen drei Punkten angenommen):**

1. **Betriebsweg:** `pg_cron` in der Datenbank mit PL/pgSQL-Funktion `evaluate_dashboard_alarms()`, wie in der Tabelle oben beschrieben. Edge Function und externer Scheduler werden nicht gebaut.
2. **Intervall:** alle 5 Minuten; Ausfallhinweis für Admins, wenn der letzte Lauf älter als 15 Minuten ist.
3. **Alarmregeln anlegen:** vorerst nur Manager und Admin. Viewer sehen die Alarme der Dashboards, die sie lesen dürfen.

Diese Entscheidung ist Grundlage für Auftrag 167 (P13b). Der Builder von 166 übernimmt sie wortgleich in `SCHWELLENWERTE_P13A.md` (2.5 Nr. 27) und als datierten Vermerk in Masterplan §9.2 (2.5 Nr. 28).

## 9. Offene Punkte und Risiken

- **Bundle-Spielraum** 0,63 kB: nur Bewertungsfunktion und Badge dürfen in den Initial-Chunk.
- **Altregeln mit `between`:** Bedeutung war nie festgelegt; deshalb keine Übersetzung, sondern sichtbares „Schwellenwert prüfen“. Der Builder zählt in T0, wie viele Altregeln in Test- und Vorschaudaten vorkommen; echte Hosted-Daten liest er nicht.
- **Mindestdauer, Hysterese, Abklingzeit** gehören zur Alarmauswertung und kommen mit 167; die Kachelanzeige bewertet nur den aktuellen Wert.
- **Nicht Teil dieses Auftrags:** Server-Alarme, Alarmliste, Quittierung, externe Kanäle (P18), Schwellenwerte für Zeitreihen und Transformationen (P14), Druck-/Reportanzeige (P15), Alarmregeln in Export/Import.
