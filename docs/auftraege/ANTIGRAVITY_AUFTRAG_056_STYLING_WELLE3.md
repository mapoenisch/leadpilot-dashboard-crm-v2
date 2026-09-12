# AUFTRAG 056 / Gate G39 (Welle 3) — Styling-Migration: Organisation/Overview/Produkt/Projektkontext/Recht/Simulation

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `583e932` (Gate G39 Welle 2 komplett, abgenommen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G39 / 054–057.
Wellen 1–2 haben Infrastruktur gebaut und 45 Dateien migriert. Diese
Welle **baut nichts Neues** — reine Migration. **Vorletzte Welle**:
Welle 4 (057) schließt G39 mit den restlichen 19 Dateien ab.

## Ziel

**Welle 3: 27 Dateien** von Inline-Styles auf die G38/G39-Primitives
umstellen — Verzeichnisse `organisation/`, `overview/`, `produkt/`,
`projektkontext/`, `recht/`, `simulation/`.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

- **64 Dateien** aktuell mit `style={{...}}` außerhalb
  `src/components/ui/**` (`INLINE_STYLE_BASELINE` aus Welle 2). Davon:
  9 aus Welle 1 + 6 aus Welle 2 bereits geprüft und akzeptiert
  (dokumentierte Laufzeit-/Passthrough-Reste, unangetastet), 3 in
  `src/features/resources/**` dauerhaft eingefroren. **46 real
  migrierbar**, diese Welle nimmt **27** davon, Welle 4 (057) die
  restlichen 19 (`standalone/`, `strategie/`, `unternehmen/`,
  `vertrieb/`).
- **Wichtiger Unterschied zu Welle 2 — Konsumenten-Status geprüft, nicht
  angenommen:**
  - `organisation/*` (6 Dateien) und die Komponenten-Dateien in
    `overview/` (3) und `produkt/` (3): **0 Konsumenten** außerhalb der
    eigenen Verzeichnisse (verifiziert) — wie die meisten Welle-2-
    Komponenten unverdrahtete/tote Facelift-Ansichten. Kein
    sichtbarer Effekt durch die Migration möglich.
  - Die 4 `*Page.tsx`-Dateien in `overview/`, `produkt/`,
    `projektkontext/`, `recht/` (`ExecutiveDashboardPage`,
    `IntegrationPage`, `ProjectTasksPage`, `SourcesPage`,
    `LeaseContractPage`, `ManagingDirectorContractPage` — 6 Stück,
    nicht 4) sind **live verdrahtet** über ihre `*View.tsx`-Aggregatoren
    (`OverviewView.tsx`, `ProduktView.tsx`, `ProjektkontextView.tsx`,
    `RechtView.tsx`) bzw. direkt in `routePages.tsx`. Jede ist aber nur
    1 triviale `style={{...}}`-Zeile (Flex-Container-Shorthand,
    16–34 Zeilen Gesamtlänge) — geringes Risiko trotz Live-Schaltung.
  - **`simulation/` (9 Dateien) ist die einzige Welle-3-Gruppe mit
    echtem, substanziellem Live-Risiko:** `LiveDashboardView.tsx` wird
    von `LiveSimulationPage.tsx` gerendert (Route `/crm/live-simulation`,
    „⚡ Live-Simulation (Ebene B)" im Nav) und rendert seinerseits ALLE
    8 übrigen Dateien dieser Gruppe (`AuditTierView`, `DetailTierView`,
    `ManagementTierView`, `MeasureManagerModal`,
    `MultiScenarioComparisonModal`, `RunActionModal`,
    `ScenarioManagerModal`; `DetailTierView` rendert zusätzlich
    `KpiTimeSeriesDetailView`). Das ist eine tief verschachtelte, aktiv
    genutzte View mit hoher Style-Dichte (57–86 `style={{`-Vorkommen
    pro Datei, bis zu 877 Zeilen) — deutlich höheres Risiko als alles
    in Welle 1–2 außer den bereits migrierten Diagramm-Dateien.
    **`/crm/live-simulation` ist keine der 5 `visual.spec.ts`-Routen**
    — die automatisierte Playwright-Suite deckt diese Route nicht ab.
- **Erwartung:** wie in Welle 2 werden die Diagramm-/Tier-View-Dateien
  in `simulation/` deutlich mehr legitime Laufzeit-Ausnahmen brauchen
  als die trivialen Page-Stubs. Das ist normal, kein Zeichen für zu
  vorsichtige Migration (siehe Entscheidung 2).

## Verbindliche Entscheidungen

1. **`simulation/`-Block: zusätzliche Screenshot-Pflicht.** Weil
   `/crm/live-simulation` nicht in `visual.spec.ts` enthalten ist, muss
   dieser Block einen eigenen Vorher/Nachher-Screenshot-Nachweis für
   genau diese Route liefern (Methodik wie gehabt: Harness-Skript,
   `shasum -a 256`, Pixel-Diff bei Abweichung — kein Bild in den
   eigenen Kontext laden). Mindestens 1440/768/375px. Simulation muss
   während der Capture in einem reproduzierbaren Zustand sein (z. B.
   pausiert, Tick 0 — wie in den bestehenden Screenshot-Harnesses
   üblich).
2. **Laufzeit-Ausnahme-Regel (unverändert seit Auftrag 053 Nachtrag 2):**
   ein `style`-Objekt darf nur bleiben, wenn **jeder** Wert darin ein
   echter Laufzeitausdruck ist. Ein String-Literal in einem
   verbleibenden `style`-Objekt ist ein Fund (siehe Welle-2-Review,
   `SwotCompass.tsx` — das exakte Muster, das vermieden werden soll).
   Zeilengenaues `eslint-disable-next-line react/forbid-dom-props` mit
   Begründungskommentar bei jeder verbleibenden Stelle.
3. **`INLINE_STYLE_BASELINE` senken, ohne Zielzahl-Zwang** (wie Welle 2
   entschieden — ein hartes Ziel führte in Welle 1 zu Diskussion statt
   Klarheit). Muss nach dieser Welle niedriger als 64 sein, exakter
   Wert im Bericht mit Herleitung.
4. **Kein neues Business-Feature, keine neue Abhängigkeit.** Reine
   1:1-Migration der bestehenden Optik.
5. **Screenshot-Methodik (unverändert):** niemals PNGs in den eigenen
   Kontext laden. Baseline/After-Paare per `shasum -a 256` vergleichen,
   Abweichungen per Skript-Pixel-Diff (BBox + max. Kanal-Delta,
   Strong-Pixel-Anteil bei Verdacht) bewerten, nur bei echtem Befund
   ein einzelnes Bild ansehen.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- **`src/features/resources/**` bleibt eingefroren.**
- **`src/simulation/**` (die Engine, nicht `src/features/simulation/`)
  bleibt Schutzbereich** — diese Welle migriert nur UI-Komponenten
  unter `src/features/simulation/`, die die Engine konsumieren, fasst
  die Engine selbst nicht an.
- `git diff 583e932 -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — `organisation/` (6 Dateien, unverdrahtet)

- [ ] `CapacityNetwork.tsx`, `OrganisationScaffold.tsx`, `OrganisationStructure.tsx`, `OrganisationUnitCard.tsx`, `PeopleHealthRail.tsx`, `RoleLegend.tsx` migriert.

### Block B — `overview/` (4 Dateien: 3 unverdrahtet + 1 live)

- [ ] `CompanyRegisterCard.tsx`, `PerformancePulse.tsx`, `SourceDecisionFlow.tsx` (unverdrahtet), `ExecutiveDashboardPage.tsx` (live, trivial) migriert.

### Block C — `produkt/` (4 Dateien: 3 unverdrahtet + 1 live)

- [ ] `OperationsHub.tsx`, `ProductHealth.tsx`, `RoadmapHorizons.tsx` (unverdrahtet), `IntegrationPage.tsx` (live, trivial) migriert.

### Block D — `projektkontext/` + `recht/` (4 Dateien, live, trivial)

- [ ] `ProjectTasksPage.tsx`, `SourcesPage.tsx`, `LeaseContractPage.tsx`, `ManagingDirectorContractPage.tsx` migriert.

### Block E — `simulation/` (9 Dateien, live, hohe Style-Dichte — Entscheidung 1)

- [ ] `LiveDashboardView.tsx`, `AuditTierView.tsx`, `DetailTierView.tsx`, `KpiTimeSeriesDetailView.tsx`, `ManagementTierView.tsx`, `MeasureManagerModal.tsx`, `MultiScenarioComparisonModal.tsx`, `RunActionModal.tsx`, `ScenarioManagerModal.tsx` migriert.
- [ ] Eigener Screenshot-Nachweis für `/crm/live-simulation` (Entscheidung 1).
- [ ] ESLint-Regel-Scope um alle 27 Welle-3-Dateien erweitert, `INLINE_STYLE_BASELINE` gesenkt (Entscheidung 3).
- [ ] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/features/organisation/components/{CapacityNetwork,OrganisationScaffold,OrganisationStructure,OrganisationUnitCard,PeopleHealthRail,RoleLegend}.tsx` | A |
| `src/features/overview/components/{CompanyRegisterCard,PerformancePulse,SourceDecisionFlow}.tsx`, `src/features/overview/pages/ExecutiveDashboardPage.tsx` | B |
| `src/features/produkt/components/{OperationsHub,ProductHealth,RoadmapHorizons}.tsx`, `src/features/produkt/pages/IntegrationPage.tsx` | C |
| `src/features/projektkontext/pages/{ProjectTasksPage,SourcesPage}.tsx`, `src/features/recht/pages/{LeaseContractPage,ManagingDirectorContractPage}.tsx` | D |
| `src/features/simulation/LiveDashboardView.tsx`, `src/features/simulation/components/{AuditTierView,DetailTierView,KpiTimeSeriesDetailView,ManagementTierView,MeasureManagerModal,MultiScenarioComparisonModal,RunActionModal,ScenarioManagerModal}.tsx` | E |
| `eslint.config.js`, `.github/workflows/ci.yml` (nur Scope-Erweiterung + Ratsche) | E |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere keine der 19 Dateien
aus `standalone/`, `strategie/`, `unternehmen/`, `vertrieb/` (Welle 4),
keine Datei in `src/features/resources/**` (eingefroren), und nichts
in `src/simulation/**` (Engine, Schutzbereich).

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
grep -rl "style={{" src --include="*.tsx" | grep -v "^src/components/ui/" | wc -l   # < 64 nach Block E, exakter Wert im Bericht
git diff 583e932 -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Harness analog Welle 1–2, Methodik aus Entscheidung 5,
**zusätzlich** der eigene Nachweis für `/crm/live-simulation`
(Entscheidung 1). Matrix unter `docs/screenshots/auftrag-056/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G39 Welle 3 – Auftrag 056"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, welche
Laufzeit-Ausnahmen wo und warum (besonders bei `simulation/` — kurze
Begründung pro Datei), Screenshot-Nachweis für `/crm/live-simulation`
explizit, neue `INLINE_STYLE_BASELINE`-Zahl mit Herleitung,
Command-Matrix.

## Akzeptanzkriterien für die Prüfung

- Alle 27 Dateien migriert, 0 `style={{` außer dokumentierter
  Laufzeit-Ausnahmen. Jede Ausnahme einzeln begründet, keine
  String-Literale in einem verbleibenden `style`-Objekt (siehe
  Welle-2-Lehre, `SwotCompass.tsx`).
- `/crm/live-simulation` per Screenshot nachgewiesen (Entscheidung 1) —
  ohne diesen Nachweis ist Block E nicht abnahmefähig, da die
  automatisierte Suite diese Route nicht abdeckt.
- `src/features/resources/**` und `src/simulation/**` unangetastet
  (Diff leer).
- `INLINE_STYLE_BASELINE` korrekt gesenkt (niedriger als 64, exakter
  Wert nachvollziehbar), ESLint-Scope erweitert.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-/TSC-
  Ratsche nicht erhöht.
- Kein neues Business-Feature, keine neue Abhängigkeit.

**Abnahme:** Erst nach unabhängigem Review ist Welle 3 von Gate G39
abgeschlossen. Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.
