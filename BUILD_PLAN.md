# LeadPilot Dashboard-CRM — Bauplan

**Stand:** 24.09.2026

**Roadmap-Basis:** `v2.2.0` (`9380ace`)
**Bestätigter CI-Recovery-Merge auf `main`:** `dec0aa5` (PR #22, sieben Pflichtjobs grün)

**Aktueller Masterauftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md`

**Ziel:** `v2.3.0` – Produktionsnähe und Mehrbenutzerfähigkeit

## Aktive Roadmap v2.3.0

**Rollenwechsel (24.09.2026, Entscheidung Marc):** Bis zum Release `v2.3.0`
ist Claude Code Builder und schreibt fehlende Detailaufträge selbst; Codex
prüft unabhängig. Details in `CLAUDE.md` §4. Vor 067Q wird Issue #7
(Qualitätsschulden) im Code abgebaut, nicht nur budgetiert.

Die fachlich freigegebene Spezifikation liegt unter
`docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`. Auftrag 067
setzt sie über 19 strikt serielle Teilaufträge 067A–067S und Gates G44–G65 um.
**Stand 25.09.2026: G44–G65 sind in `main` integriert, v2.3.0 ist von Marc freigegeben.**
G44–G62 sind in `main` integriert. Die
[CI-Recovery](docs/superpowers/specs/2026-09-23-ci-recovery-design.md) zu
Issue #5 wurde mit PR #22 abgeschlossen: finaler PR-Lauf `35833733689` und
`main`-Lauf `35834951857` bestanden alle sieben Pflichtjobs. Issue #5 ist
geschlossen. Der Recovery-Freeze für 067Q/G63 ist damit aufgehoben; vor der
Umsetzung braucht 067Q einen konkreten, freigegebenen Detailauftrag. Kein Deploy
vor G65/067S und Marcs ausdrücklicher Release-Freigabe.

Vor dem Start von 067Q wird zusätzlich das separate
[Deno-Edge-CI-Gate](docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_DENO_EDGE_GATE.md)
für die vorhandenen Edge Functions eingezogen. Es ist kein neuer Fachauftrag
und ändert die sieben Pflichtjobnamen nicht. Die Freigabe erfordert grüne
PR- und anschließende `main`-CI auf dem jeweiligen finalen Stand.

Die [Bestandsprüfung vom 23.09.2026](docs/reviews/2026-09-23-open-stock-triage.md)
dokumentiert die einzeln bewerteten Alt-PRs, Issues und Remote-Branches; offene
Sicherheits- und Release-Issues bleiben für 067R/G64 beziehungsweise 067S/G65
sichtbar.

| Abschnitt | Gates | Inhalt | Status |
|---|---|---|---|
| Charakterisierung | G44 | rote Regressionen und Befundregister | ✅ auf `main` |
| Sicherheits- und Datenkern | G45–G51 | Auth/RLS, Ingress, CRM-Quelle, Baseline, Persistenz, Worker, HubSpot | ✅ auf `main` |
| Frontend/Qualität | G52–G58 | 33 semantische Seiten, UX/A11y, Toolchain, fail-closed CI | ✅ auf `main` |
| Ergänzungen | G59–G62 | Mitglieder, CRM Query/Export, Frische, Audit/Diagnose | ✅ auf `main` |
| Qualitätsschulden | Issue #7 | Inline-Styles und Suppressions im Code abbauen | ✅ auf `main` (PR #25) |
| Fachauftrag | G63 / 067Q | Run-Steuerung | ✅ auf `main` (PR #27) |
| Gesamtabnahme | G64 / 067R | vollständige Abnahme ([Auftrag](docs/auftraege/ANTIGRAVITY_AUFTRAG_067R_GESAMTABNAHME.md), [Matrix](docs/reviews/v2.3.0-acceptance-matrix.md)) | ✅ auf `main` (PR #28) |
| Nachtrag G49/G63 | Viewer strikt lesend | Viewer starten keine Läufe; Server, Store und UI ([Auftrag](docs/auftraege/ANTIGRAVITY_AUFTRAG_VIEWER_READ_ONLY_RUNS.md)) | ✅ auf `main` (PR #29) |
| Release | G65 / 067S | Migration, `All Rights Reserved`, `v2.3.0` ([Auftrag](docs/auftraege/ANTIGRAVITY_AUFTRAG_067S_MIGRATION_LIZENZ_RELEASE.md), [Release Notes](docs/releases/V2.3.0.md)) | ✅ auf `main` (PR #30), von Marc am 25.09.2026 freigegeben; Tag `v2.3.0` |

### Nachweise G44–G62

Die Prüfer- und E2E-Einträge stehen in `docs/BUILD_LOG.md`. Bei G52–G54
dokumentiert das Ledger die erfolgreichen Wellenläufe; es enthält dort keinen
jeweils eigenen formalen Prüfer-Freigabe-Commit. Ihre Integration auf `main`
ist durch PR #16 belegt. Die Commit-Spalte nennt den spezifischsten
Abschlussnachweis, die letzte Spalte den `main`-Integrationspunkt.
PR #20 integrierte G60 und G61 bereits vor dem späteren Merge von PR #19;
der Branch-Merge `60ad64c` ist selbst kein `main`-Integrationspunkt.

| Gate | Auftrag / Ergebnis | Abschlussnachweis | Auf `main` seit |
|---|---|---|---|
| G44 | 067A Charakterisierung | `8f06f43` Freigabe | `5f01ed5` · PR #16 |
| G45 | 067B Identität und RLS | `6543571` Freigabe | `5f01ed5` · PR #16 |
| G46 | 067C Ingress und Schreibsicherheit | `78b2a63` Freigabe | `5f01ed5` · PR #16 |
| G47 | 067D CRM-Quellenwahrheit | `751e53c` Freigabe | `5f01ed5` · PR #16 |
| G48 | 067E Baseline zur Engine | `359ab1b` Freigabe | `5f01ed5` · PR #16 |
| G49 | 067F Persistenz | `41cdd0c` Freigabe | `5f01ed5` · PR #16 |
| G50 | 067G Web Worker | `99bd708` Freigabe | `5f01ed5` · PR #16 |
| G51 | 067H HubSpot-Import | `80389da` Freigabe | `5f01ed5` · PR #16 |
| G52 | 067I Finanzen, Recht, Strategie | `90e414e` Nacharbeit und E2E-Guard | `5f01ed5` · PR #16 |
| G53 | 067I Markt, Kunden, Vertrieb | `f22c605` · 240/240 E2E | `5f01ed5` · PR #16 |
| G54 | 067I Unternehmen, Übersicht, Produkt | `99b7125` · 348/348 E2E | `5f01ed5` · PR #16 |
| G55 | 067I Organisation und Gesamtnachprüfung | `8aa9320` · 384/384 E2E | `5f01ed5` · PR #16 |
| G56 | 067J UX, A11y und Clipping | `62e7651` · Clipping-Nachweis | `5f01ed5` · PR #16 |
| G57 | 067K Toolchain und Qualität | `c6d88f3` Prüferfreigabe | `5f01ed5` · PR #16 |
| G58 | 067L CI und Ruleset | `5f01ed5` · sieben Pflichtjobs und aktives Ruleset | `5f01ed5` · PR #16 |
| G59 | 067M Mitgliederverwaltung | `146de7f` | `146de7f` |
| G60 | 067N CRM Query und Export | `3d44ef8` Prüferfreigabe | `94e8f65` · PR #20 |
| G61 | 067O Quelle und Frische | `967862e` Prüferfreigabe | `94e8f65` · PR #20 |
| G62 | 067P Audit und Diagnose | `c23ef7a` Prüferfreigabe; N6-Nachweis im BUILD_LOG | `94e8f65` · PR #20 |

PR #21 (`11dae9b`) entfernte anschließend die `admin-a`-Logout-Race aus den
Visualtests. Sein `main`-Lauf `35795310797` war mit allen sieben Jobs grün.
PR #22 (`dec0aa5`) beseitigte danach die doppelten Feature-Push- und
Coverage-Läufe; der `main`-Lauf `35834951857` bestätigte alle sieben Jobs
einschließlich E2E und Readiness.

Die folgenden Abschnitte bleiben als historische Post-V1.1-Roadmap erhalten.

**Historische Ausgangslage:** `v1.1.0` getaggt (Phase 0–3), AUFTRAG 020
(HubSpot-Quelle) umgesetzt. 25/25 Integrity-Suiten grün.

**Historisches Ziel:** die 7 Restbefunde C4-1…7 aus `ARCHITECTURE_DECISIONS.md`
abarbeiten; diese Gates G1–G4 wurden abgeschlossen.

Referenz für alle Befund-Nummern: `ARCHITECTURE_DECISIONS.md` → Teil C.4.

---

## 0. Kurzfassung

| Phase | Auftrag | Inhalt | Aufwand | Status |
|---|---|---|---|---|
| **0** | — | Doku-Sign-off + B20/B21/B22 in Teil B + `ScenarioParameters` v1 einfrieren | ~1 Tag | ✅ erledigt |
| **1** | `AUFTRAG_015_REPRODUCIBILITY` | `systemContext` (Clock/IDs) injiziert, `simulationStartDate` explizit, `correlationId`, deterministische errorIds, Golden-Run-Test, Queue-Historie-Test (C4-2/3/4/5/6) | ~2–3 Tage | ✅ Gate G1 (unabh. verifiziert 01.09.) |
| **2** | `AUFTRAG_016_DATA_SOURCES` | Datenquellen-Abstraktion (`DataSource`/`DataSourceRegistry`/`BaselineSnapshotService`) + n8n-Offline-Fabrik + Schreib-Stubs entfernt (C4-1) | ~3–5 Tage | ✅ Gate G2 (unabh. verifiziert 01.09.) |
| **3a** | `AUFTRAG_017_MASSNAHMEN` | Maßnahmen als Objekte + `EffectiveParameterResolver` + Wirkungsvorschau + Katalog-Parameter in die Engine verdrahten (419–468, 1474–1573) | groß | ✅ Gate G3 erfüllt |
| **3b** | `AUFTRAG_018_KPI_ZEITREIHEN_UI` | KPI-Detailseite: Zeitreihe + P10/P90-Band + Zielpfad + Monte-Carlo-Histogramm + Treiber-Drill-down (1274–1323) | mittel–groß | ✅ Gate G3b erfüllt |
| **3c** | `AUFTRAG_019_SZENARIOVERGLEICH_TIEFE` | über A/B hinaus: 3–4 Szenarien, Treiber-Diff, Trade-off-Hervorhebung (849–873, 1637–1648) | mittel | ✅ Gate G3c erfüllt |
| **4** | `AUFTRAG_020_HUBSPOT_SOURCE` | erste **reale** Datenquelle: HubSpot offline über n8n eingefroren, `HubSpotBaselineSource` (`kind: 'external'`), belegt C4-1 endgültig (B22) | mittel–groß | ✅ Gate G4 erfüllt (`12cc41b` + n8n-Wiring + realer Pull `57334bd`) |
| **5** | `AUFTRAG_021_FRONTEND_POLISH` | voller Frontend-Durchlauf: Token-SSOT, Lint gegen Roh-`#hex`/`px`, Layout-Primitives, Inline-Style-Migration aller ~19 Views, `chartTheme`, WCAG-AA. Kein Engine-Eingriff. | groß (~1 Woche) | 📄 Spec fertig, Gate G5 offen |

**Reihenfolge war bindend:** 0 → 1 → 2 → 3a → 3b → 3c → 4 — alle abgeschlossen.
Begründung 3a zuerst (historisch): ohne Maßnahmen bleibt der Decision-Support-
Kreislauf offen (`Beobachten → verstehen → Maßnahme definieren → simulieren →
vergleichen → entscheiden`). Phase 4+ ist eine offene Roadmap (siehe §6).

---

## 1. Entscheidungspunkte — ENTSCHIEDEN am 31.08.2026

Alternativen bleiben stehen (Nachvollziehbarkeit). Gewählt = ✅.

### D1 — Was ist die App? ✅ ENTSCHIEDEN

**Firmeninternes Echtzeit-Dashboard eines fiktiven Unternehmens**, gespeist aus
**austauschbaren Datenquellen** — heute simuliertes CRM + n8n-Baselines, später
theoretisch **eine oder mehrere echte Quellen** (HubSpot, Salesforce, Postgres, API).

Kein operatives CRM. Umsetzung über eine `DataSource`-Abstraktion mit
Frozen-Baseline-Reproduzierbarkeit (`ARCHITECTURE_DECISIONS.md` **B22**) →
`AUFTRAG_016_DATA_SOURCES`. Schreib-Stubs (`getLeads/getDeals/getActivities/
updateLeadStatus/addLead`) werden entfernt bzw. `throw`.

**Was jetzt gebaut wird:** nur die Naht — `DataSource`-Interface,
`DataSourceRegistry`, `BaselineSnapshotService`, zwei Quellen
(`SimulatedCrmSource`, `BaselineFileSource`). **Nicht jetzt:** reale Konnektoren,
`CompositeDataSource` (Merge mehrerer Quellen), echte `LiveFeed` — je ein eigener
Auftrag, aber durch die Interfaces vorbereitet (ein `HubSpotSource` ist ein
Drop-in, kein anderer Code ändert sich).

*Verworfen:* „Simulations-Tool ohne Quellen-Abstraktion" (zu eng für das Ziel),
„vollwertiges operatives CRM jetzt" (großes Fass, widerspricht V1.0-Abnahme).

### D2 — Rolle von n8n (steuert AUFTRAG_016)

| Option | Konsequenz |
|---|---|
| **A — n8n als Offline-Generator, Output = versionierte JSON-Artefakte** ✅ *Empfehlung* | n8n läuft on demand im Docker, erzeugt `baseline-<version>.json`, App lädt gepinnte Version. Keine Laufzeitkopplung. Einfachste Infrastruktur. |
| B — n8n schreibt direkt in Supabase, getaggt mit `baseline_version` | „Realistischer", aber: Supabase-Schema-Migration nötig, n8n→Supabase-Credentials, und die App braucht trotzdem einen Pinning-Mechanismus. Mehr Infra, kein fachlicher Mehrwert für ein Solo-Projekt. |
| C — n8n als Live-Webhook-Backend, App ruft n8n zur Laufzeit | **Abgelehnt.** Zerstört Reproduzierbarkeit (jeder Run bekäme andere Baseline) und Baseline-Versionierung (1601–1625). |

### D3 — Wo liegt die Baseline? (steuert AUFTRAG_016)

| Option | Konsequenz |
|---|---|
| **A — versionierte JSON-Dateien im Repo** unter `src/features/crm/data/baselines/baseline-<version>.json` ✅ *Empfehlung* | Diffbar, versioniert via Git, keine Infra, deterministisch ladbar. `crmImporter` bekommt eine `baselineVersion`-Auswahl. |
| B — Supabase-Tabelle + `baseline_version`-Spalte | Setzt D2-B voraus. Braucht Migration + Seeder-Anpassung. Sinnvoll nur, wenn du ohnehin Multi-Client/Multi-User willst. |
| C — JSON ist Source of Truth, wird zusätzlich in Supabase geseedet | Beides pflegen. Nur wenn du die Supabase-Ansicht im UI brauchst UND Git-Diffbarkeit willst. |

### D4 — Injektionsmechanismus für Clock/IDs in `ScenarioService` (steuert AUFTRAG_015)

Kontext: `ScenarioService` ist Singleton (`private constructor`, `getInstance()`). Aktuell `Math.random()` an Z. 87/192/205/357, `new Date().toISOString()` an Z. 90/146/206/313.

| Option | Konsequenz |
|---|---|
| **A — `RunOptions`-Objekt-Parameter auf `runScenarioVersion`/`reRun` + Modul `systemContext.ts` mit `clock()`/`idFactory` (test-überschreibbar)** ✅ *Empfehlung* | Minimal-invasiv, Singleton bleibt, alle bestehenden Call-Sites laufen unverändert (Defaults). Tests übergeben `{ now, simulationStartDate, seed, runIdSuffix }` bzw. setzen `systemContext.override({...})`. |
| B — Konstruktor bekommt `deps`-Objekt + `ScenarioService.createForTest(deps)` | Sauberere DI, aber Singleton-Verdrahtung (`getInstance`, exported `scenarioService`) muss angefasst werden; `SimulationContext.tsx` Prop `scenService?` bleibt kompatibel. |
| C — DI-Container | Overkill für die Projektgröße. |

### D5 — Testframework (steuert AUFTRAG_015)

Kontext: kein `test`-Script in `package.json`. Konvention: `export async function run<Name>Test(): Promise<{success:boolean; log:string[]}>`, registriert in `scripts/verifyIntegrity.ts`, Lauf via `npx tsx scripts/verifyIntegrity.ts`.

| Option | Konsequenz |
|---|---|
| **A — Konvention beibehalten, `npm run verify` + `npm test` als Alias ergänzen** ✅ *Empfehlung* | Null neue Dependencies, ein Teststil, CI-fähig. Neue Suiten `runReproducibilityTest`, `runQueueHistoryTest`. |
| B — Vitest für neue Tests einführen | Bessere Assertions/Watch/Coverage, aber zwei Teststile koexistieren; Migrationsschuld. Nur wenn Phase 3 groß wird. |

### D6 — `correlationId`-Umfang (C4-2, steuert AUFTRAG_015)

| Option | Konsequenz |
|---|---|
| **A — `correlationId: string` auf `RunManifest` + in jedes `SimulationEvent` durchgereicht** ✅ *Empfehlung* | ~20 Zeilen, deckt die Nachvollziehbarkeit aus 1574–1584 ab. Kein Bus. |
| B — separates Command-Log getrennt von der Event-Historie | Eigene Persistenzstruktur + UI. „Ausbaustufe 2", nicht jetzt. |

### D7 — Größe des synthetischen CRM (AUFTRAG_016)

| Option | Konsequenz |
|---|---|
| **A — gleich wie heute: 20 Companies / 100 Contacts / 40 Funnel-Deals + ~200 historische Activities** ✅ *Empfehlung* | Deckungsgleich mit V1.0-Baseline, Tests/Snapshots bleiben vergleichbar. n8n macht dieselbe Größe reproduzierbar + parametrierbar. |
| B — konfigurierbare Größe (z. B. 20 / 100 / 200 / 500) | n8n-Workflow bekommt Input-Parameter. Mehr Testaufwand (Snapshot-Größen ändern sich). Sinnvoll für „Portfolio klein vs. Enterprise groß"-Vergleich. |

---

## 2. Phase 0 — Doku & Sign-off (kein Code-Auftrag)

Checkliste:

- [ ] `ARCHITECTURE_DECISIONS.md` durchsehen, Stichproben in Teil A, dann **committen** (eigener Commit, getrennt vom WIP `src/`-Kram).
- [ ] Teil B ergänzen um **B20 — Ausführungspfade**:
  > Es gibt zwei Pfade *by design*:
  > **Live/Playground** (`SimulationService`, `window.setTimeout`, nicht reproduzierbar, nie entscheidungsrelevant, schreibt **nie** in Snapshot-/Run-Store) und
  > **Reproduzierbare Runs** (`ScenarioService` + Worker, deterministisch, seed-/manifest-basiert, einzige Quelle entscheidungsrelevanter Zahlen).
- [ ] Teil B ergänzen um **B21 — Anwendungs-Schichtung (V1, beschlossen)**:
  > `UI → SimulationContext → ScenarioService / SimulationService → Domain/Engine → Repository/Storage`.
  > Kein `CommandBus` in V1; Nachvollziehbarkeit über `correlationId`. Voller Command Layer (1574–1584) = Ausbaustufe.
- [ ] `src/types/scenario.ts` — Doc-Block über `ScenarioParameters`:
  > `// V1 PARAMETER SURFACE — bewusster Ausschnitt (10 Felder). NICHT in V1: Kanalbudgets einzeln, Ramp-ups, Lead-Expiration, Setup-Fees, Paketpreise (Entscheidungen 149–478). Erweiterung = eigener Auftrag mit ParameterRegistry-Eintrag + Validierung + UI + Test.`
- [ ] `ARCHITECTURE_DECISIONS.md` Teil C — Entscheidungsbereiche **149–478** und **1274–1323** ausdrücklich als **NUR BESCHLOSSEN** listen.
- [ ] `docs/releases/V1.0.md` und Git-Log-Auftragsnummern auf **eine** Zählung bringen (Vorschlag: `ANTIGRAVITY_AUFTRAG_0XX` ist führend; „023A"/„007"/„009" darauf mappen).

Abnahme Phase 0: ein Commit „docs: consolidate architecture + freeze v1 parameter surface", `git status` sauber bis auf den bekannten `src/`-WIP.

---

## 3. Auftrags-Dateien

Alle Detail-Auftragsdateien liegen unter **`docs/auftraege/`** (Datei-für-Datei,
mit Signaturen und Testassertions — direkt an einen Coding-Agent übergebbar).
Ältere abgeschlossene Aufträge (001–006) ebenfalls dort, als Historie.

| Auftrag | Datei | Inhalt | Status |
|---|---|---|---|
| 015 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_015_REPRODUCIBILITY.md` | C4-2/3/4/5/6 · `systemContext`, `correlationId`, Golden-Run | ✅ G1 · `99181ba` |
| 016 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_016_DATA_SOURCES.md` | C4-1 · Datenquellen-Abstraktion + n8n-Fabrik | ✅ G2 · `74d068f`…`e516d0c` |
| 017 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_017_MASSNAHMEN.md` | Maßnahmen + `EffectiveParameterResolver` + Wirkungsvorschau + Kataloghebel verdrahtet | ✅ G3 · `7a14f8b` |
| 018 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_018_KPI_ZEITREIHEN_UI.md` | KPI-Detailseite: Zeitreihe + P10/P90 + Zielpfad + MC-Histogramm + Run-Overlay | ✅ G3b · `6d01a60` |
| 019 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_019_SZENARIOVERGLEICH_TIEFE.md` | 2–4 Szenarien, Treiber-Diff, 5-Dim-Trade-Offs, `adoptConfiguration` | ✅ G3c · `6175a85` (v1.1.0) |
| 020 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_020_HUBSPOT_SOURCE.md` | erste reale Quelle: `HubSpotBaselineSource`, n8n-Offline-Pull, Suite 025 | ✅ G4 · `12cc41b` + n8n-Wiring + realer Pull `57334bd` (44 Firmen / 55 Deals) |
| 021 | `docs/auftraege/ANTIGRAVITY_AUFTRAG_021_FRONTEND_POLISH.md` | Token-SSOT, Layout-Primitives, Inline-Style-Migration aller Views, `chartTheme`, WCAG-AA | 📄 Spec fertig, Bau offen (G5) |

---

## 4. Abnahmetore (Gates)

| Gate | Kriterium | Status |
|---|---|---|
| **G0** | Phase 0 committet; Teil B enthält B20–B22; Parameter-Surface eingefroren. | ✅ |
| **G3** (AUFTRAG 017) | `tsc`/`verify` (inkl. Suite 022)/`build` grün · Golden-Run **ohne** Maßnahmen byte-gleich · Reproduzierbarkeit **mit** Maßnahmen · `previewMeasures` persistiert nichts · Resolver-Tests (Ramp-up, Ende, Clamp, Mehrfach) · Konfliktwarnung · **jeder verdrahtete Katalog-Parameter verändert nachweislich eine Kern-KPI** · Teil C: 419–468 → IMPLEMENTIERT. | ✅ (01.09. freigegeben) |
| **G3b** (AUFTRAG 018) | `tsc`/`verify` (inkl. Suite 023)/`build` grün · KPI-Zeitreihen-Detailseite (`KpiTimeSeriesDetailView.tsx`) · P10/P90-Unsicherheitskorridor · Zielpfad & deterministische Zielbewertung · Histogramm-Verteilung · Max. 5 Einzel-Runs Overlay · 1274–1323 → IMPLEMENTIERT. | ✅ (01.09. umgesetzt) |
| **G3c** (AUFTRAG 019) | Szenariovergleich-Tiefe (2–4 Szenarien, Treiber-Diff, Trade-off-Hervorhebung, `adoptConfiguration`) · Suite 024 · 849–873, 1637–1648 → IMPLEMENTIERT. | ✅ (v1.1.0) |
| **G4** (AUFTRAG 020) | `HubSpotBaselineSource` (`kind: 'external'`, `supportsLiveFeed: false`) in Registry + Audit-UI · n8n-Workflow `generate-baseline-hubspot.workflow.json` erzeugt valide `baseline-hubspot-<datum>.json` · Run mit `dataSourceId: 'hubspot-baseline:*'` reproduziert byte-gleich · Suite 025 · kein Netz-Call/Secret in `src/**` · C4-1 endgültig belegt. | ✅ (01.09. umgesetzt, realer Pull `57334bd`) |
| **G5** (AUFTRAG 021) | `tsc`/`verify` (25/25)/`build` grün, kein Chunk-Warning · `lint:style` 0 Roh-`#hex`/`px` in Views · ein Token-SSOT · alle Views @ 1440/768/375 ohne Overflow/Clipping · Marken-Checkliste je View · axe 0 kritisch, Kontrast AA, Focus + Keyboard durchgängig · `chartTheme` zentral · Doku-Drift 0 · Simulation/Engine unverändert. | offen — Spec in `docs/auftraege/ANTIGRAVITY_AUFTRAG_021_FRONTEND_POLISH.md` |

---

## 5. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Golden-Run-Test schlägt fehl, weil irgendwo noch `Math.random()`/`Date.now()` in der Tick-Kette steckt | AUFTRAG_015 Schritt 1: repo-weiter Grep als Akzeptanzbedingung; erlaubte Rest-Fundstellen explizit whitelisten (nur `SimulationService`-Live-Loop + Error-Path vor Fix). |
| n8n-Workflow erzeugt inkonsistente Referenzen (Contact ohne Company etc.) | AUFTRAG_016: Validierungs-Node am Workflow-Ende + `BaselineSnapshotService.assertIntegrity` + `runDataSourceTest` in der App (referenzielle Integrität, Zählwerte, Periode). |
| Snapshot-/Test-Baselines ändern sich durch neue Baseline-Daten → viele Suiten rot | D7-A (gleiche Größen/Verteilungen wie V1.0); `baseline-2026-08-31-v1.json` als „identisch zu V1.0" markieren; neue n8n-Baseline erst als `-v2`. |
| `runScenarioVersion` wird durch `BaselineSnapshotService.capture` async → Aufrufer brechen | AUFTRAG_016 Schritt 5: `SimulationContext`-Callbacks (`runVersion`/`reRun`/`reproduce`) auf `await` umstellen; sind bereits `useCallback`. |
| Singleton-Umbau (D4-B) bricht `SimulationContext`-Verdrahtung | D4-A gewählt (Options-Param + `systemContext`, kein Singleton-Umbau). |

---

## 6. Status & nächste Schritte (Stand 01.09.2026)

### Erledigt

- **Phase 0–3 komplett.** Aufträge 015–019 gebaut, verifiziert, `main` gepusht.
- **`v1.1.0` getaggt** und auf GitHub veröffentlicht. Release-Doku:
  `docs/releases/V1.1.md`. Fresh-Clone-Test 24/24 grün.
- **Phase-3-Browser-QA:** Durchgeführt, Layout-Hardening committet (`fix: phase-3 ui review findings`), FREIGABE.
- **AUFTRAG 020 (HubSpot Baseline Source / Gate G4):** Vollständig umgesetzt, Suite 025 grün (25/25), n8n Workflow + Stage Map + Baseline `2026-09-15` integriert.

### Als Nächstes

- Phase 4 Folge-Aufträge (Composite Data Sources / Multi-Source Merge oder erweiterte Feld-Extraktionen).

### Offen — klein (nicht blockierend)

- `vite.config.ts`: `build.rollupOptions.output.manualChunks` gegen die 736-kB-Warnung.
- `src/simulation/__tests__/dataSourceIntegrity.test.ts:56`: redundantes `throw` vor dem Stub-Aufruf.
- Feature-Branches `feat/auftrag-015-…` / `feat/auftrag-016-…` löschen, falls lokal noch vorhanden.

### Konventionen

- Detail-Auftragsdateien → `docs/auftraege/`. QA-/Bau-Protokolle → `docs/BUILD_LOG.md`
  (neueste oben). Release-Meldungen → `docs/releases/`. Überholte Analysen → `docs/archiv/`.
- Integrity-Suiten fortlaufend nummeriert (Suite ≠ Auftrag): nächste freie ist `026`.
- Suite-Nummer ≠ Auftrags-Nummer (historisch verschoben, ab `f956f4b` fortlaufend 001–025).
