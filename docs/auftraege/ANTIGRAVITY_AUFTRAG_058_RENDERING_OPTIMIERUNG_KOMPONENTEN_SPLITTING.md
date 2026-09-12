# AUFTRAG 058 / Gate G40 — Rendering-Optimierung & Komponenten-Splitting

**Builder:** Antigravity
**Prüfung:** Codex / Claude Code
**Baseline:** `6a808c8` (Gate G39 vollständig abgeschlossen, Auftrag 057 freigegeben)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G40 / 058 (Befund „HOCH 4 Teil 2" +
Virtualisierung; Teil 1 war G37, `SimulationContext` → Zustand).

## Ziel

Zwei getrennte Maßnahmen, **beide nur wo messbar wirksam** — kein Cargo-Cult-`memo`:

1. Die real übergroßen Komponenten (siehe Ist-Stand, nachgemessen) auf ≤ 400
   Zeilen zerlegen, ohne Verhaltensänderung.
2. Rendering profiler-gestützt optimieren: erst messen, dann gezielt
   `memo`/`useCallback`/`useMemo` bzw. `@tanstack/react-virtual` einsetzen —
   nur an Stellen, wo eine Vorher-Messung tatsächlich einen Engpass zeigt.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

Der Befund-Katalog nennt „19 Riesenkomponenten, max. 883 Zeilen" — das war der
Stand **vor** G35/G37/G39. Frisch mit dem echten CI-Gate-Befehl gemessen
(`npx eslint . --format json`, Regel `max-lines` mit `skipBlankLines`/
`skipComments`, wie in `eslint.config.js:77` konfiguriert, `max: 400`):

- **9 `max-lines`-Verstöße insgesamt** (das sind exakt die 9 Fehler aus der
  G39-Abschluss-Baseline „lint 9/3").
- Davon **4 in Bereichen, die dieser Auftrag nicht anfassen darf**:
  - `src/simulation/eventRules.ts` (545 Zeilen) — Engine, Schutzbereich.
  - `src/simulation/scenarioService.ts` (1010 Zeilen) — Engine, Schutzbereich.
  - `src/simulation/__tests__/financialIntegrity.test.ts` (408 Zeilen) —
    Testdatei im Schutzbereich `src/simulation/**`.
  - `src/features/resources/components/ResourceViewer.tsx` (531 Zeilen) —
    `src/features/resources/**` ist dauerhaft eingefroren.
- **5 real bearbeitbare Dateien** — das ist die tatsächliche Zielmenge dieses
  Auftrags:

  | Datei | Zeilen (ESLint-Zählweise) | Zeilen (`wc -l`) |
  |---|---|---|
  | `src/features/simulation/components/KpiTimeSeriesDetailView.tsx` | 785 | 857 |
  | `src/features/simulation/components/ScenarioManagerModal.tsx` | 654 | 711 |
  | `src/features/simulation/components/MeasureManagerModal.tsx` | 505 | 551 |
  | `src/features/simulation/components/MultiScenarioComparisonModal.tsx` | 476 | 515 |
  | `src/features/markt/components/DecisionTopology.tsx` | 441 | 477 |

  **Wichtig:** `src/features/simulation/**` ist ein UI-Feature-Ordner, **nicht**
  der Schutzbereich `src/simulation/**` (Engine). Nur das Pfadsegment ist
  identisch — die vier Dateien in `src/features/simulation/components/`
  dürfen bearbeitet werden.
- **`memo`/`useCallback`/`useMemo` aktuell:** 6 / 5 / 15 Vorkommen
  (`grep -rl` über `src`, ohne `__tests__`). Der Befund-Katalog nannte
  „memo 6 · useCallback 4" — `useCallback` ist seither auf 5 gestiegen,
  `useMemo` wurde dort nicht separat erfasst.
- **Kein `@tanstack/react-virtual` installiert.** Listen-Kandidaten geprüft:
  CRM-Ansichten (`ActivitiesView.tsx` 367 Zeilen, `DealsView.tsx` 260,
  `CompaniesView.tsx` 198) rendern bei der synthetischen Datengröße aus
  Entscheidung D7 (`ARCHITECTURE_DECISIONS.md`/`BUILD_PLAN.md`: 20 Companies /
  100 Contacts / 40 Deals / ~200 Activities) typischerweise deutlich unter
  250 Listenelemente gleichzeitig. Ob das einen echten Rendering-Engpass
  darstellt, ist **nicht angenommen, sondern in Block A zu messen.**
- **Erwartung:** Die 19 aus dem alten Befund sind vermutlich bereits durch
  G35 (Layering/Kleinbefunde), G37 (Zustand-Migration) und G39
  (Styling-Migration, die nebenbei Zeilen verschoben hat) auf 9 gesunken.
  Diese Diskrepanz (19 → 9 → 5 real bearbeitbar) im Bericht kurz einordnen,
  analog zur „Ist-Stand nachgemessen"-Praxis aus Auftrag 057.

## Verbindliche Entscheidungen

1. **Profiler vor Maßnahme — Pflicht für jede Memoization-Änderung.** Für
   jede neu eingeführte `memo`/`useCallback`/`useMemo`-Stelle: dokumentierter
   Vorher-Messwert (Re-Render-Anzahl oder -Dauer, z. B. via React
   `<Profiler onRender>` oder React DevTools Profiler-Export) **und**
   nachgewiesene Verbesserung danach. „Ist Best Practice" ist **keine**
   Begründung — analog zur Screenshot-Beweispflicht aus G39: Behauptung ohne
   Messung wird im Review zurückgewiesen.
2. **Virtualisierung nur bei nachgewiesenem Bedarf.** `@tanstack/react-virtual`
   nur einführen, wenn Block A für eine konkrete Liste belegt, dass sie
   gleichzeitig genug Elemente rendert, um das Frame-Budget spürbar zu
   belasten (Messwert, keine Schätzung). **Falls keine Liste diese Schwelle
   reißt: das ist ein valides Ergebnis.** Im Bericht mit Messwerten
   feststellen, dass Virtualisierung aktuell nicht nötig ist — keine
   künstliche Baustelle erzwingen, nur um den Plan-Punkt „abzuhaken".
3. **Komponenten-Splitting nur der 5 real bearbeitbaren Dateien** (siehe
   Ist-Stand). Neue Ratsche `MAX_LINES_BASELINE` einführen, analog
   `INLINE_STYLE_BASELINE` aus G38/G39: zählt nach dieser Welle nur noch die
   4 dauerhaft/derzeit ausgenommenen Dateien (3 Engine-Schutzbereich + 1
   eingefroren). Ziel: `MAX_LINES_BASELINE = 4`, in `.github/workflows/ci.yml`
   und/oder ESLint-Ratschen-Dokumentation eingetragen, exakter Wert im
   Bericht mit Herleitung (analog Entscheidung 3 aus Auftrag 057).
4. **Splitting-Methode: reine Extraktion**, keine Verhaltensänderung, kein
   State-Management-Umbau (das war G37). Unterkomponenten/Custom Hooks
   bekommen sprechende Namen — keine `Part1.tsx`/`Part2.tsx`-Nummerierung.
5. **Definition-of-Done-Metrik #13** („Komponenten > 400 Zeilen: 0") gilt mit
   derselben Ausnahme-Logik wie Metrik #12 (Inline-Styles) in G39: **0
   außerhalb der dokumentierten Schutz-/Frozen-Ausnahmen.** Diese Abweichung
   von der wörtlichen Zahl im Bericht ausdrücklich begründen.
6. **Kein neues Business-Feature.** Einzige erlaubte neue Abhängigkeit:
   `@tanstack/react-virtual`, und nur falls Entscheidung 2 einen Bedarf belegt
   — im Build-Plan (G40-Zeile) bereits vorab autorisiert, keine gesonderte
   Rückfrage nötig, aber Einführung nur mit Messbeleg.
7. **Screenshot-Pflicht wie G39**, obwohl reines Refactoring: Extraktion kann
   unbeabsichtigt Layout verändern. Vorher/Nachher-Screenshots für alle 5
   gesplitteten Komponenten (bzw. der Views/Modals, die sie rendern) plus
   jede Liste, die in Block D angefasst wird. Methodik unverändert: niemals
   PNGs in den eigenen Kontext laden, `shasum -a 256`-Vergleich, Pixel-Diff
   nur bei Abweichung.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- `src/simulation/**` (Engine) und `src/features/resources/**` bleiben
  unangetastet — auch ihre `max-lines`-Verstöße bleiben stehen (zählen in
  `MAX_LINES_BASELINE`, Entscheidung 3).
- `git diff 6a808c8 -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Profiling-Baseline (Vorher-Messung, vor jeder Code-Änderung)

- [ ] Profiling-Harness aufsetzen (Vorbild: `scripts/measureAuftrag038Performance.mjs`,
      Methodik: kein Screenshot, sondern Render-Zählung/-Dauer via
      `<Profiler onRender>` oder gleichwertig).
- [ ] Vorher-Messwerte für die 5 Zieldateien aus Block B **und** für die
      CRM-Listenansichten (`ActivitiesView.tsx`, `DealsView.tsx`,
      `CompaniesView.tsx`) erfassen.
- [ ] Tabelle im Bericht: Komponente/Liste → Messwert → Einschätzung, ob
      Memoization (Entscheidung 1) bzw. Virtualisierung (Entscheidung 2)
      gerechtfertigt ist. Diese Tabelle ist die Grundlage für Block C/D —
      ohne sie keine Memoization/Virtualisierung in diesem Auftrag.

### Block B — Komponenten-Splitting (5 Dateien)

- [ ] `KpiTimeSeriesDetailView.tsx` auf ≤ 400 Zeilen (ESLint-Zählweise) zerlegen.
- [ ] `ScenarioManagerModal.tsx` auf ≤ 400 Zeilen zerlegen.
- [ ] `MeasureManagerModal.tsx` auf ≤ 400 Zeilen zerlegen.
- [ ] `MultiScenarioComparisonModal.tsx` auf ≤ 400 Zeilen zerlegen.
- [ ] `DecisionTopology.tsx` auf ≤ 400 Zeilen zerlegen.
- [ ] Screenshot-Nachweis je betroffener View/Modal (Entscheidung 7).

### Block C — Gezielte Memoization (nur wo Block A das belegt)

- [ ] `memo`/`useCallback`/`useMemo` ausschließlich an den durch Block A
      belegten Stellen ergänzen, je Stelle Vorher/Nachher-Messwert im Bericht.
- [ ] Falls Block A für keine Stelle einen Engpass zeigt: das explizit
      feststellen, Block C entfällt inhaltlich — kein Zwang zu Änderungen.

### Block D — Virtualisierung (nur wenn Block A Bedarf zeigt) + Abschluss

- [ ] Falls Bedarf belegt: `@tanstack/react-virtual` installieren, betroffene
      Liste(n) umstellen, Vorher/Nachher-Messung im Bericht.
- [ ] Falls kein Bedarf belegt: explizit mit Messwerten feststellen, keine
      Abhängigkeit installieren.
- [ ] `MAX_LINES_BASELINE` in `.github/workflows/ci.yml` (bzw. wo
      `INLINE_STYLE_BASELINE` bereits geführt wird) eintragen und auf den
      hergeleiteten Wert setzen (Entscheidung 3).
- [ ] Gate-G40-Bilanz im Bericht: reale Ausgangszahl (9→5 bearbeitbar) vs.
      Plan-Zahl (19), finale `MAX_LINES_BASELINE`, ob Virtualisierung/
      Memoization eingeführt wurde oder mangels Bedarf unterblieben ist.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `npm test`,
      `npm run build`, `npx playwright test` grün, Ratschen nicht erhöht.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/features/simulation/components/KpiTimeSeriesDetailView.tsx` | A, B, C |
| `src/features/simulation/components/ScenarioManagerModal.tsx` | A, B, C |
| `src/features/simulation/components/MeasureManagerModal.tsx` | A, B, C |
| `src/features/simulation/components/MultiScenarioComparisonModal.tsx` | A, B, C |
| `src/features/markt/components/DecisionTopology.tsx` | A, B, C |
| Neue extrahierte Dateien im jeweils gleichen Feature-Ordner (z. B. `src/features/simulation/components/<neuerName>.tsx`, `src/features/simulation/hooks/<neuerName>.ts`) | B |
| `src/features/crm/components/{ActivitiesView,DealsView,CompaniesView}.tsx` | A, D (nur falls Entscheidung 2 Bedarf belegt) |
| `package.json`, `package-lock.json` (nur `@tanstack/react-virtual`, nur falls Block D es nutzt) | D |
| `.github/workflows/ci.yml` (nur `MAX_LINES_BASELINE`-Ratsche) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere nichts in
`src/simulation/**` (Engine, Schutzbereich) und nichts in
`src/features/resources/**` (eingefroren).

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
npx eslint . --format json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(d.reduce((n,f)=>n+f.messages.filter(m=>m.ruleId==='max-lines').length,0))"   # MAX_LINES_BASELINE, Soll: 4
git diff 6a808c8 -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Harness analog G39 (Entscheidung 7), Methodik: nie PNGs in den
eigenen Kontext laden, `shasum -a 256`-Vergleich, Pixel-Diff nur bei
Abweichung, mindestens 1440/768/375 px. Matrix unter
`docs/screenshots/auftrag-058/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G40 – Auftrag 058 (Abschluss)"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, die
Profiling-Messtabelle aus Block A, welche Memoization-Stellen mit welchem
Vorher/Nachher-Messwert eingeführt wurden (oder warum keine), ob
Virtualisierung eingeführt wurde oder mangels Bedarf unterblieben ist (mit
Messwerten), neue `MAX_LINES_BASELINE`-Zahl mit Herleitung, Command-Matrix,
Screenshot-Nachweis, und die Gate-G40-Gesamtbilanz.

## Akzeptanzkriterien für die Prüfung

- Alle 5 Zieldateien ≤ 400 Zeilen (ESLint-Zählweise), keine Verhaltensänderung.
- **Jede** Memoization-Änderung mit Vorher/Nachher-Messwert belegt — eine
  Stelle ohne Messbeleg wird im Review zurückgewiesen, unabhängig davon, wie
  plausibel sie aussieht.
- Virtualisierungs-Entscheidung (eingeführt oder bewusst unterlassen) mit
  Messwerten begründet, keine unbelegte Behauptung in beide Richtungen.
- `src/simulation/**` und `src/features/resources/**` unangetastet (Diff leer).
- `MAX_LINES_BASELINE` korrekt hergeleitet (Soll 4), CI-Ratsche eingetragen.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-/TSC-Ratsche
  nicht erhöht.
- Screenshot-Nachweis für alle 5 gesplitteten Komponenten vorhanden, 0px
  horizontaler Overflow.
- Kein neues Business-Feature; `@tanstack/react-virtual` nur falls belegt
  eingeführt.
- Diskrepanz 19 (Plan) vs. 5 (real bearbeitbar) im Bericht nachvollziehbar
  eingeordnet.

**Abnahme:** Erst nach unabhängigem Review ist Gate G40 abgeschlossen. Kein
Merge, Tag oder Push ohne ausdrückliche Freigabe.
