# AUFTRAG 057 / Gate G39 (Welle 4, letzte Welle) — Styling-Migration: Strategie/Unternehmen/Vertrieb/Standalone

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `1c5acae` (Gate G39 Welle 3 komplett, abgenommen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G39 / 054–057.
Wellen 1–3 haben Infrastruktur gebaut und 72 Dateien migriert. Diese
Welle **baut nichts Neues** — reine Migration. **Letzte Welle von
Gate G39**: nach Abnahme sind alle real migrierbaren Dateien (siehe
unten) umgestellt, `INLINE_STYLE_BASELINE` enthält danach nur noch
dokumentierte Laufzeit-Ausnahmen + die 3 eingefrorenen
`resources/**`-Dateien. Danach folgt laut Build-Plan Gate G40
(Rendering-Optimierung, Komponenten-Splitting, `@tanstack/react-virtual`).

## Ziel

**Welle 4: 19 Dateien** von Inline-Styles auf die G38/G39-Primitives
umstellen — Verzeichnisse `strategie/`, `unternehmen/`, `vertrieb/`,
`standalone/`.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

- **40 Dateien** aktuell mit `style={{...}}` außerhalb
  `src/components/ui/**` (`INLINE_STYLE_BASELINE` aus Welle 3). Davon:
  18 aus Wellen 1–3 bereits geprüft und akzeptiert (dokumentierte
  Laufzeit-/Passthrough-Reste, unangetastet), 3 in
  `src/features/resources/**` dauerhaft eingefroren. **19 real
  migrierbar** — genau diese Welle, danach ist Gate G39 vollständig.
- **Konsumenten-Status geprüft, nicht angenommen** (wie in Welle 3):
  - `strategie/components/{BalancedScorecardPath,GoalRunway}.tsx`,
    `unternehmen/components/{BusinessIdeaSignalMap,FundingTimeline,
    LocationAtlas,ValueBenefitStage}.tsx`,
    `vertrieb/components/{BudgetTargetLadder,ChannelInvestmentRoute,
    FunnelLeakageWaterfall,SlaSwimlane}.tsx`,
    `standalone/StandaloneKitView.tsx` (11 Dateien): **0 Konsumenten**
    außerhalb der eigenen Datei (verifiziert) — unverdrahtete
    Facelift-Ansichten wie in Welle 2–3. Kein sichtbarer Effekt
    möglich.
  - `strategie/pages/{MeasuresPage,RiskRegisterPage}.tsx`,
    `vertrieb/pages/{BrandPage,CampaignPlanningPage,
    ContentStrategyPage,MarketingBudgetPage,SalesToolsPage}.tsx`
    (7 Dateien): live verdrahtet über `StrategieView.tsx` bzw.
    `VertriebView.tsx`, aber jede nur 16–28 Zeilen mit 1–4 trivialen
    `style={{...}}`-Vorkommen — geringes Risiko trotz Live-Schaltung.
  - **`unternehmen/pages/LocationPage.tsx` ist die einzige Ausnahme
    mit echtem Live-Risiko:** 562 Zeilen, 46 `style={{`-Vorkommen,
    live über `routePages.tsx` **und** `UnternehmenView.tsx`
    verdrahtet, Route `/company/location` („Sitz & Räumlichkeiten").
    Diese Route ist **keine** der 5 `visual.spec.ts`-Routen — die
    automatisierte Playwright-Suite deckt sie nicht ab. Vergleichbar
    mit dem `simulation/`-Sonderfall aus Welle 3.
- **Erwartung:** `LocationPage.tsx` wird vermutlich mehr legitime
  Laufzeit-Ausnahmen brauchen als die restlichen 18 Dateien dieser
  Welle zusammen (ähnlich der Diagramm-Dichte aus Welle 2/3). Die
  Lehre aus Welle 3 (13 von 15 "Disables" waren keine echten
  Laufzeit-Ausnahmen, sondern Ternaries zwischen bekannten Tokens)
  gilt hier genauso streng — siehe Entscheidung 2.

## Verbindliche Entscheidungen

1. **`LocationPage.tsx`: zusätzliche Screenshot-Pflicht**, analog zu
   `simulation/` in Welle 3. Weil `/company/location` nicht in
   `visual.spec.ts` enthalten ist, eigener Vorher/Nachher-Nachweis für
   genau diese Route (Methodik: Harness-Skript, `shasum -a 256`,
   Pixel-Diff bei Abweichung, kein Bild in den eigenen Kontext laden).
   Mindestens 1440/768/375px.
2. **Laufzeit-Ausnahme-Regel (unverändert, jetzt mit Welle-3-Lehre
   verschärft geprüft):** ein `style`-Objekt darf nur bleiben, wenn
   **jeder** Wert darin ein echter Laufzeitausdruck ist — aus Daten
   abgeleitet (z. B. `sec.color`, `assignedColor` aus einer offenen
   Palette) oder eine echte kontinuierliche Berechnung (Position,
   Prozentsatz, Pfad-Koordinate). **Ein Ternary zwischen zwei/drei zur
   Build-Zeit bekannten Werten (Design-Tokens) ist KEINE
   Laufzeit-Ausnahme**, selbst wenn die Bedingung ein Laufzeitwert ist
   (Beispiel aus der Welle-3-Prüfung: `color: r.hasChanged ?
   'var(--color-primary)' : 'var(--color-text)'` — muss eine
   Klassen-Ternary werden: `className={r.hasChanged ? 'text-primary' :
   'text-text'}`). Vor dem Commit **selbst** jede verbleibende
   `style`-Stelle gegen diese Definition prüfen, nicht erst im Review
   finden lassen. Zeilengenaues `eslint-disable-next-line
   react/forbid-dom-props` mit Begründungskommentar nur für die
   Stellen, die die Prüfung tatsächlich bestehen.
3. **`INLINE_STYLE_BASELINE` senken, ohne Zielzahl-Zwang** (wie Welle
   2/3). Muss nach dieser Welle niedriger als 40 sein, exakter Wert
   im Bericht mit Herleitung. Am Ende dieser Welle sollte die
   Ratsche im Wesentlichen nur noch die 18 bereits akzeptierten
   Wellen-1–3-Reste plus etwaige neue, echte
   `LocationPage`-Ausnahmen enthalten (die 3 `resources/**`-Dateien
   zählen immer mit).
4. **Kein neues Business-Feature, keine neue Abhängigkeit.** Reine
   1:1-Migration der bestehenden Optik.
5. **Screenshot-Methodik (unverändert):** niemals PNGs in den eigenen
   Kontext laden. Baseline/After-Paare per `shasum -a 256` vergleichen,
   Abweichungen per Skript-Pixel-Diff (BBox + max. Kanal-Delta,
   Strong-Pixel-Anteil bei Verdacht) bewerten, nur bei echtem Befund
   ein einzelnes Bild ansehen.
6. **Gate-G39-Abschluss im Bericht:** da dies die letzte Welle ist,
   im Builder-Bericht eine kurze Gesamtbilanz ergänzen: finale
   `INLINE_STYLE_BASELINE`-Zahl, wie viele Dateien insgesamt über
   G38+G39 migriert wurden, wie viele dauerhafte Ausnahmen (Passthrough
   + Laufzeit + eingefroren) verbleiben.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- **`src/features/resources/**` bleibt eingefroren.**
- `git diff 1c5acae -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — `strategie/` (4 Dateien)

- [x] `BalancedScorecardPath.tsx`, `GoalRunway.tsx` (unverdrahtet), `MeasuresPage.tsx`, `RiskRegisterPage.tsx` (live, trivial) migriert.

### Block B — `unternehmen/` (5 Dateien, inkl. `LocationPage.tsx` — Entscheidung 1)

- [x] `BusinessIdeaSignalMap.tsx`, `FundingTimeline.tsx`, `LocationAtlas.tsx`, `ValueBenefitStage.tsx` (unverdrahtet) migriert.
- [x] `LocationPage.tsx` migriert, eigener Screenshot-Nachweis für `/company/location` (Entscheidung 1).

### Block C — `vertrieb/` (9 Dateien)

- [x] `BudgetTargetLadder.tsx`, `ChannelInvestmentRoute.tsx`, `FunnelLeakageWaterfall.tsx`, `SlaSwimlane.tsx` (unverdrahtet) migriert.
- [x] `BrandPage.tsx`, `CampaignPlanningPage.tsx`, `ContentStrategyPage.tsx`, `MarketingBudgetPage.tsx`, `SalesToolsPage.tsx` (live, trivial) migriert.

### Block D — `standalone/` (1 Datei) + Abschluss

- [x] `StandaloneKitView.tsx` (unverdrahtet) migriert.
- [x] ESLint-Regel-Scope um alle 19 Welle-4-Dateien erweitert, `INLINE_STYLE_BASELINE` gesenkt (Entscheidung 3).
- [x] Gate-G39-Gesamtbilanz im Bericht (Entscheidung 6).
- [x] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/features/strategie/components/{BalancedScorecardPath,GoalRunway}.tsx`, `src/features/strategie/pages/{MeasuresPage,RiskRegisterPage}.tsx` | A |
| `src/features/unternehmen/components/{BusinessIdeaSignalMap,FundingTimeline,LocationAtlas,ValueBenefitStage}.tsx`, `src/features/unternehmen/pages/LocationPage.tsx` | B |
| `src/features/vertrieb/components/{BudgetTargetLadder,ChannelInvestmentRoute,FunnelLeakageWaterfall,SlaSwimlane}.tsx`, `src/features/vertrieb/pages/{BrandPage,CampaignPlanningPage,ContentStrategyPage,MarketingBudgetPage,SalesToolsPage}.tsx` | C |
| `src/features/standalone/StandaloneKitView.tsx` | D |
| `eslint.config.js`, `.github/workflows/ci.yml` (nur Scope-Erweiterung + Ratsche) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere keine Datei in
`src/features/resources/**` (eingefroren) und nichts in
`src/simulation/**` (Engine, Schutzbereich).

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
grep -rl "style={{" src --include="*.tsx" | grep -v "^src/components/ui/" | wc -l   # < 40 nach Block D, exakter Wert im Bericht
git diff 1c5acae -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Harness analog Welle 1–3, Methodik aus Entscheidung 5,
**zusätzlich** der eigene Nachweis für `/company/location`
(Entscheidung 1). Matrix unter `docs/screenshots/auftrag-057/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G39 Welle 4 – Auftrag 057 (Abschluss)"** an den
Anfang von `docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis,
welche Laufzeit-Ausnahmen wo und warum (besonders `LocationPage.tsx`),
Screenshot-Nachweis für `/company/location` explizit, neue
`INLINE_STYLE_BASELINE`-Zahl mit Herleitung, Command-Matrix, und die
Gate-G39-Gesamtbilanz (Entscheidung 6).

## Akzeptanzkriterien für die Prüfung

- Alle 19 Dateien migriert, 0 `style={{` außer dokumentierter
  Laufzeit-Ausnahmen. Jede Ausnahme einzeln begründet — **jede
  Ternary-Stelle wird gegen Entscheidung 2 geprüft, kein
  Ternary-zwischen-bekannten-Werten bleibt stehen** (Welle-3-Lehre).
- `/company/location` per Screenshot nachgewiesen (Entscheidung 1) —
  ohne diesen Nachweis ist Block B nicht abnahmefähig.
- `src/features/resources/**` unangetastet (Diff leer).
- `INLINE_STYLE_BASELINE` korrekt gesenkt (niedriger als 40, exakter
  Wert nachvollziehbar), ESLint-Scope erweitert.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-/TSC-
  Ratsche nicht erhöht.
- Kein neues Business-Feature, keine neue Abhängigkeit.
- Gate-G39-Gesamtbilanz im Bericht vorhanden.

**Abnahme:** Erst nach unabhängigem Review ist Welle 4 — und damit
Gate G39 vollständig — abgeschlossen. Kein Merge, Tag oder Push ohne
ausdrückliche Freigabe.
