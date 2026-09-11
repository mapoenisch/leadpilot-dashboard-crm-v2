# AUFTRAG 050-B / Gate G35 — `src/simulation/`-Typhärtung

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `e948075` (Auftrag 050 + 050-C freigegeben)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** Auftrag 050, Abschnitt „Ausdrücklich NICHT in diesem Auftrag" — dieser
Auftrag holt den dort ausgeklammerten Teil nach. Danach ist Gate G35 komplett.

## Ziel

Der letzte Teil von G35: **ausschließlich `src/simulation/**`** von den
verbliebenen mechanischen Kleinbefunden befreien — die größte Schutzzone im
Repo (`CLAUDE.md` §6), deshalb eigener Auftrag, eigener Review, **reine
Typebene, keine Verhaltensänderung**.

Aktueller Ist-Stand **innerhalb `src/simulation/`** (nachgemessen, nicht die
alte Schätzung aus G30):

| Befund | Anzahl | Block |
| --- | --- | --- |
| `@typescript-eslint/no-unused-vars` | 31 | I |
| `prefer-const` | 5 | J |
| `@typescript-eslint/no-explicit-any` | 66 | K |
| `no-console` | 61 | L |
| `tsc`-Fehler gesamt | **153** | M |
| — davon TS2532 (`Object is possibly 'undefined'`) | 72 | M |
| — davon TS6133 (`declared but never read`) | 32 | M |
| — davon TS18048 (`'x' is possibly 'undefined'`) | 28 | M |
| — davon TS2322 (Typmismatch) | 16 | M |
| — davon TS2345 (Argument-Typmismatch) | 4 | M |
| — davon TS2538 (`undefined` als Index) | 1 | M |
| `max-lines` | 3 | **nicht hier** → G40 (Auftrag 058), wie im Rest von G35 |

Hauptverursacher tsc: `eventRules.ts` (30), `monteCarloAggregator.ts` (23),
`scenarioService.ts` (15), die `__tests__/*IntegrityTest`-Harnesse zusammen
(56), `parameterRegistry.ts` (9), `effectiveParameterResolver.ts` (5), Rest
verstreut ≤ 1–4 je Datei.

### Wichtiger Befund für die Planung (nicht Teil dieses Auftrags)

Die Annahme aus `docs/QUALITY_BASELINE_V2_2_0.md` („~526 der 765 tsc-Fehler,
alle in `src/simulation/`") ist **überholt**: nach Auftrag 050 (Block F + H)
liegen von den verbliebenen 758 tsc-Fehlern nur noch **153 in
`src/simulation/`** — die übrigen **605** verteilen sich über praktisch alle
`src/features/**`-Module (markt 103, finanzen 90, vertrieb 85,
simulation-Feature 68, kunden 55, u. a.), `src/domain/` (56),
`src/components/ui` (29) und weitere. Das ist **keine** Schutzzone und **keine**
G35-Aufgabe — es braucht einen eigenen Plan-Eintrag (voraussichtlich Richtung
G38–G41 „Frontend-Qualität" oder ein neues Gate vor G43). Dieser Auftrag rührt
daran **nicht**; der Befund geht als Hinweis an Marc, nicht als Auftragsumfang.

## Verbindliche Entscheidungen

1. **Ausschließlich `src/simulation/**`.** Keine Datei außerhalb dieses Baums.
2. **Reine Typebene — kein Verhaltenswechsel.** Jede Änderung ist eine von:
   Import/Variable entfernen, `let`→`const`, `any`→echter Typ/`unknown`+
   Narrowing, `console.*`→`logger.*`, `undefined`-Guard/Narrowing für
   `noUncheckedIndexedAccess`. **Keine** Änderung an Kontrollfluss-Semantik,
   RNG/Seed-Verhalten, Run-/Versionsmodell, Persistenzlogik — das bleibt laut
   `CLAUDE.md` §6 auch hier tabu, obwohl der Auftrag die Datei anfassen darf.
   Ein Guard, der bei `undefined` früher/anders reagiert als der bisherige
   (implizite) Zugriff, ist ein Blocker, kein Kleinbefund.
3. **Determinismus ist der Nullpunkt.** Vor Block M1 (Engine-Dateien) einen
   festen Seed einmal durchlaufen lassen und den Snapshot/das Manifest
   sichern (z. B. `docs/BUILD_LOG.md`-Anhang oder Datei im Bericht). Nach
   Block M1 denselben Seed erneut — **byte-identisch**. Suiten **018
   (Reproducibility)**, **002 (Scenario Run)**, **005 (Monte Carlo)**, **012
   (State Machine & Invariant Engine)** aus `npm run verify` müssen nach
   **jedem** Commit grün bleiben, nicht erst am Ende geprüft werden.
4. **`console.*` → `logger.*`:** derselbe Logger aus Auftrag 050
   (`src/services/logger.ts`). `simulation → services` ist laut
   `eslint.config.js`-Zonen erlaubt (nur `components`/`features` sind für
   `simulation` verboten). Keine neue Logger-Variante.
5. **`max-lines` (3 Treffer) bleibt außen vor** — gehört zu G40 (19
   Riesenkomponenten zerlegen), wie im Rest von G35 bereits entschieden.
6. **Keine neue npm-Abhängigkeit.**
7. **Ein Commit pro Block, Reihenfolge I → J → K → L → M1 → M2.** Block M in
   zwei Commits: **M1** die Produktionsdateien (`eventRules.ts`,
   `monteCarloAggregator.ts`, `scenarioService.ts`, `parameterRegistry.ts`,
   `effectiveParameterResolver.ts`, `systemContext.ts`, `simulationService.ts`,
   `scenarioRepository.ts`, `prng.ts`, `tickInvariantValidator.ts`), **M2**
   die `__tests__/*.test.ts`-Integritäts-Harnesse. Trennung, weil
   Produktionscode die höchste Sorgfalt braucht und nicht im selben Diff wie
   Testdateien verschwinden soll.
8. **CI-Ratsche am Ende nachziehen** (`LINT_BASELINE`/`TSC_BASELINE` in
   `.github/workflows/ci.yml`) auf die neuen Ist-Werte, ein
   CI-Bestätigungs-Push.

## Grenzen und Schutzbereiche

- Nichts außerhalb `src/simulation/**` — `git diff e948075 -- src/features src/domain src/components src/services src/hooks src/context src/types src/app` muss **leer** sein (außer der einen erlaubten `ci.yml`-Ratsche am Ende).
- `src/simulation/__tests__/dataSourceIntegrity.test.ts`: die eine Auftrag-050-Zeile (Import auf `services/data/runSourceAudit`) bleibt unangetastet — nicht zurückdrehen.
- `package.json` / `package-lock.json` / `vitest.config.ts`: unberührt.
- RNG/Seed/Run-Modell/Persistenz: **nur Typ-Guards**, keine Logikänderung (siehe Entscheidung 2+3).
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe — außer dem einen CI-Bestätigungs-Push am Ende (Entscheidung 8).

## Blöcke

### Block I — `no-unused-vars` (31)

- [ ] Ungenutzte Importe/Variablen entfernen; bewusst ungenutzte Parameter mit `_` prefixen. Keine Logik anfassen. `npx eslint "src/simulation/**/*.{ts,tsx}"` → 0 Treffer für diese Regel.

### Block J — `prefer-const` (5)

- [ ] `let` → `const` wo nie neu zugewiesen. 0 Treffer danach.

### Block K — `no-explicit-any` (66)

- [ ] Echte Typen; wo unverhältnismäßig: `unknown` + Narrowing statt `any`. Kein `eslint-disable`. 0 Treffer danach. `npm run verify` (mind. Suiten 001–024) nach diesem Block komplett grün — Typänderungen dürfen keine Laufzeit-Assertion brechen.

### Block L — Logger (61 `console.*`)

- [ ] Alle `console.*` in `src/simulation/**` durch `logger.*`
  (`src/services/logger.ts`, aus Auftrag 050) ersetzen. 0 `no-console`-Treffer
  danach. `grep -rn "console\." src/simulation` = 0.

### Block M1 — `tsc`-Fehler, Produktionsdateien

- [ ] Guards/Narrowing für die ~97 tsc-Fehler in den Produktionsdateien
  (`eventRules.ts` 30, `monteCarloAggregator.ts` 23, `scenarioService.ts` 15,
  `parameterRegistry.ts` 9, `effectiveParameterResolver.ts` 5, Rest verstreut).
  Muster: `arr[i]` → `const item = arr[i]; if (!item) { /* unverändertes
  Verhalten: z. B. throw/continue/return wie der bisherige implizite Zugriff
  es de facto erzwungen hätte */ }`. Bei echter Unmöglichkeit (Invariante:
  „kann hier nicht Undefined sein") eine begründete Assertion (`if (!x) throw
  new Error(...)`) statt eines stillen Fallbacks — stiller Fallback verändert
  Verhalten und ist hier verboten.
- [ ] **Vor** diesem Block: fester Seed, ein Simulationslauf, Snapshot/Manifest
  sichern. **Nach** diesem Block: derselbe Seed, gleicher Lauf, Diff = leer.
  Beides im Bericht mit Kommandos + Hash/Diff belegen.
- [ ] Suiten 002, 005, 012, 018 aus `npm run verify` einzeln vor und nach
  diesem Commit grün.

### Block M2 — `tsc`-Fehler, Integritäts-Testharnesse

- [ ] Guards/Narrowing für die ~56 tsc-Fehler in
  `src/simulation/__tests__/*IntegrityTest.test.ts` und Geschwistern. Gleiche
  Regel: kein stiller Fallback, keine Assertion-Semantik ändern. Diese
  Dateien sind die Testkörper hinter `npm run verify` — ein falscher Guard
  hier kann eine Suite fälschlich grün machen. Jede geänderte Assertion im
  Bericht kurz begründen.
- [ ] Nach diesem Block: `npx tsc --noEmit 2>&1 | grep "src/simulation"` = 0.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/simulation/**/*.ts` (Produktionscode, siehe Liste in M1) | I–L, M1 |
| `src/simulation/__tests__/**/*.test.ts` | I–L, M2 |
| `.github/workflows/ci.yml` (nur `LINT_BASELINE`/`TSC_BASELINE`) | am Ende |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere kein Eingriff in
`src/services/logger.ts` selbst (nur importieren).

## Pflicht-Verifikation

```bash
npm run test                 # alle Vitest grün (unverändert relevant, kein neuer Test hier)
npm run verify               # 24/24 — nach JEDEM Block-Commit, nicht nur am Ende
npm run build                # Exit 0
npx tsc --noEmit 2>&1 | grep -c "error TS"        # sinkt Block für Block, am Ende 758-153=605
npx tsc --noEmit 2>&1 | grep -c "src/simulation"  # 0 nach Block M2
npm run lint 2>&1 | grep problems                  # sinkt Block für Block, am Ende 182-163=19 (nur noch max-lines)
grep -rn "console\." src/simulation                # 0
git diff e948075 -- src/features src/domain src/components src/services src/hooks src/context src/types src/app   # leer
```

Determinismus-Nachweis (Block M1, siehe oben): fester Seed vor/nach,
Snapshot-Diff leer, Kommandos im Bericht.

## Builder-Bericht und Commit

Abschnitt **„Gate G35 – Auftrag 050-B: `src/simulation/`-Typhärtung"** an den
Anfang von `docs/BUILD_LOG.md`:

- Je Block: Commit-Hash, Treffer vorher/nachher je Regel/Fehlercode
- Block M1: Determinismus-Nachweis (Seed, Kommandos, Diff/Hash-Vergleich),
  Status der 4 genannten Suiten vor/nach
- Block M2: Liste geänderter Assertions mit kurzer Begründung je Datei
- Command-Matrix, finale Ratsche-Werte, CI-Run-URL

## Akzeptanzkriterien für die Prüfung

- 0 Treffer für `no-unused-vars`, `prefer-const`, `no-explicit-any`,
  `no-console` in `src/simulation/**`. `max-lines` unverändert (→ G40).
- `tsc`-Fehler in `src/simulation/**` = 0.
- **Determinismus bewiesen:** fixierter Seed vor/nach Block M1 liefert
  identisches Ergebnis; Suiten 002/005/012/018 durchgehend grün.
- Kein stiller Verhaltenswechsel — Prüfer liest jeden M1/M2-Guard gegen den
  ursprünglichen impliziten Zugriff (Diff + kurze Herleitung je Datei, nicht
  nur „Tests grün").
- `git diff` außerhalb `src/simulation/**` (+ der einen Ratschen-Zeile) leer.
- `npm run verify` 24/24, `test` grün, `build` 0.
- Ratsche gesenkt, nie erhöht, CI-Run bestätigt.
- Prüfer-Spot-Check: einen Guard testweise entfernen → tsc wird an der Stelle
  wieder rot; einen `logger`-Ersatz zurückdrehen → `no-console` wieder rot.

**Abnahme:** Erst nach unabhängigem Review ist Gate G35 vollständig
abgeschlossen. Kein Merge, Tag oder Push (außer der einen CI-Bestätigung).
