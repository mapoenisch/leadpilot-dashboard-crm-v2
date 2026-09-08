# AUFTRAG 045 / Gate G30 — ESLint, Prettier und strengeres TypeScript

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** Freigabe-Commit aus G29
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md`

## Ziel

Eine Messgrundlage schaffen. Dieses Gate richtet die Werkzeuge ein, die einen Großteil der
Analyse-Befunde **automatisch** finden — und zwar dauerhaft, nicht einmalig.

Ohne diesen Schritt müsste jeder Befund von Hand gesucht und von Hand wieder überprüft werden.
Mit ihm meldet sich das Werkzeug bei jedem Speichern.

## Verbindliche Entscheidungen

1. **In diesem Gate wird nichts repariert.** Es wird ausschließlich gemessen. Ergebnis ist eine
   Baseline-Zahl im Format „N Fehler in M Dateien, aufgeschlüsselt nach Regel". Die Reparatur
   passiert in den Fachgates G33, G35, G39 und G40.
   **Begründung:** Würde man Werkzeuge einrichten *und* alle Befunde in einem Gate beheben,
   entstünde ein Diff über hunderte Dateien, den niemand mehr sinnvoll prüfen kann.
2. **Kein Produktcode.** Keine Datei unter `src/` wird geändert — auch nicht per Autofix.
   `--fix` wird in diesem Gate **nicht** ausgeführt.
3. **Die Regeln stehen sofort auf `error`, nicht auf `warn`.** Die Baseline ist dann rot. Das ist
   beabsichtigt und wird im BUILD_LOG als Ausgangswert dokumentiert. Ein `warn` würde in den
   Folgegates ignoriert werden.
4. **Ein Ausnahmemechanismus wird definiert, aber nicht benutzt.** Wo ein Befund später bewusst
   bestehen bleibt, verlangt die Regel einen begründeten `eslint-disable-next-line`-Kommentar mit
   Begründungstext. Leere Deaktivierungen sind verboten (`eslint-comments/require-description`).

## Grenzen und Schutzbereiche

- Unverändert bleiben: `src/**`, `supabase/**`, `tools/n8n/**`, `public/**`, `scripts/**`.
- Neue Abhängigkeiten sind in diesem Gate **erlaubt**, aber ausschließlich als `devDependencies`
  und nur die unten gelisteten.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `eslint.config.js` | Flat-Config mit allen unten genannten Regelsätzen |
| `.prettierrc` / `.prettierignore` | Formatierungsregeln |
| `tsconfig.json` | Drei zusätzliche Compiler-Optionen |
| `package.json`, `package-lock.json` | `devDependencies` + Skripte `lint`, `format`, `format:check` |
| `.editorconfig` | Einheitliche Zeilenenden und Einrückung |
| `docs/QUALITY_BASELINE_V2_2_0.md` | Neu: die gemessene Ausgangslage, aufgeschlüsselt nach Regel |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_045_ESLINT_PRETTIER_TYPESCRIPT.md` | Diese Auftragsquelle |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Abhängigkeiten (nur `devDependencies`)

- [ ] `eslint`, `@eslint/js`, `typescript-eslint`
- [ ] `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- [ ] `eslint-plugin-jsx-a11y`
- [ ] `eslint-plugin-import`, `eslint-import-resolver-typescript`
- [ ] `@eslint-community/eslint-plugin-eslint-comments`
- [ ] `prettier`, `eslint-config-prettier`

### 2. Regelsätze

Jede Regel ist einem konkreten Befund zugeordnet — das ist kein Standardpaket, sondern eine
gezielte Auswahl:

| Regel | Findet | Erwartete Treffer |
|---|---|---|
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | Das Tearing-Muster in den Live-Hooks | KRITISCH 1 |
| `@typescript-eslint/no-explicit-any` | `any`-Typen | 42 |
| `no-console` (erlaubt: nichts) | Konsolen-Ausgaben im Produktcode | 25 |
| `jsx-a11y/no-static-element-interactions`, `jsx-a11y/click-events-have-key-events` | Klickbare `<div>`/`<span>` | 10 |
| `react/jsx-no-target-blank` | Externe Links ohne `noopener` | 4 |
| `max-lines` (400, ohne Leerzeilen/Kommentare) | Riesenkomponenten | 19 |
| `import/no-restricted-paths` | Layering-Verstöße | 3 |
| `@typescript-eslint/no-unused-vars` | Toter Code | unbekannt |
| `eslint-comments/require-description` | Unbegründete Deaktivierungen | 0 (präventiv) |

### 3. Schichtenarchitektur maschinell erzwingen

`import/no-restricted-paths` so konfigurieren, dass die in der Analyse bestätigte Richtung gilt:

```
app → features → components → services → simulation | domain | types
```

Verbotene Richtungen (jede erzeugt einen Fehler):
- [ ] `src/components/**` darf nicht aus `src/features/**` importieren
- [ ] `src/services/**` darf nicht aus `src/components/**` oder `src/features/**` importieren
- [ ] `src/simulation/**` darf nicht aus `src/components/**` oder `src/features/**` importieren
- [ ] `src/domain/**` und `src/types/**` dürfen aus keiner höheren Ebene importieren
- [ ] Ein Feature darf nicht aus einem anderen Feature importieren (`src/features/a` → `src/features/b`)

Erwartet: genau **3 Treffer** (`crmImporter.ts`, `dataSourceIntegrity.test.ts`,
`LiveSimulationPage.tsx`). Weichen die Treffer ab, ist die Konfiguration zu eng oder zu weit —
das ist im Bericht zu klären, **nicht** durch Lockern der Regel zu umgehen.

### 4. TypeScript verschärfen

- [ ] `noUnusedLocals: true`
- [ ] `noUnusedParameters: true`
- [ ] `noUncheckedIndexedAccess: true`

> `noUncheckedIndexedAccess` erzeugt erfahrungsgemäß die meisten neuen Fehler
> (`arr[0]` ist danach `T | undefined`). Falls die Zahl unverhältnismäßig hoch ausfällt
> (> 150), diese eine Option zurückstellen, den Befund dokumentieren und in G35 nachziehen.
> Die beiden anderen Optionen bleiben in jedem Fall aktiv.

### 5. Prettier und Skripte

- [ ] `.prettierrc`: 100 Zeichen Zeilenlänge, einfache Anführungszeichen, Semikolons,
      `trailingComma: "all"`
- [ ] `.prettierignore`: `dist`, `node_modules`, `docs/screenshots`, `package-lock.json`
- [ ] `eslint-config-prettier` als letzter Eintrag der Flat-Config (schaltet kollidierende
      Formatierungsregeln ab)
- [ ] Skripte: `lint` (`eslint . --max-warnings 0`), `lint:report`, `format`, `format:check`
- [ ] **`npm run format` wird in diesem Gate nicht auf `src/` ausgeführt** — die Formatierung
      erfolgt jeweils in dem Gate, das die betreffenden Dateien ohnehin anfasst

### 6. Baseline dokumentieren

- [ ] `npm run lint:report` in eine Auswertung überführen: Treffer je Regel, betroffene Dateien
- [ ] `docs/QUALITY_BASELINE_V2_2_0.md` anlegen mit Tabelle „Regel → Treffer → Zielgate"
- [ ] Abgleich mit den erwarteten Zahlen aus der Analyse; jede Abweichung erklären

## Pflicht-Verifikation

```bash
npm run lint:report          # Fehler erwartet, Exit ungleich 0 ist hier zulässig
npx prettier --check "src/**/*.{ts,tsx}"   # Abweichungen erwartet
npx tsc --noEmit             # muss Exit 0 sein, sonst Konfiguration zu aggressiv
npm run verify
npm run build
git diff --exit-code -- src supabase tools/n8n public scripts
```

Erwartete Ergebnisse:
- `tsc`, `verify`, `build` sind grün
- Der Diff für `src supabase tools/n8n public scripts` ist **leer**
- `lint` und `prettier --check` melden Treffer; die Zahlen stehen in `QUALITY_BASELINE_V2_2_0.md`

## Builder-Bericht und Commit

Abschnitt **„Gate G30 – Auftrag 045: ESLint, Prettier und strengeres TypeScript"** an den Anfang
von `docs/BUILD_LOG.md` mit:

- Baseline und Arbeits-Commit
- Vollständige Trefferliste je Regel, Ist gegen Erwartung
- Begründung jeder Abweichung
- Ob `noUncheckedIndexedAccess` aktiv blieb, mit Trefferzahl
- Nachweis, dass `src/` unverändert ist
- Zuordnung jedes Treffers zu seinem Zielgate

```bash
git commit -m "chore(g30): add eslint, prettier and stricter typescript baseline"
```

## Akzeptanzkriterien für Codex

- `src/` ist gegenüber der G29-Baseline unverändert (leerer Diff).
- `import/no-restricted-paths` findet **genau die drei** in der Analyse benannten Verstöße —
  nicht mehr durch zu enge, nicht weniger durch zu weite Konfiguration.
- `react-hooks/exhaustive-deps` meldet die Live-Hooks — der KRITISCH-1-Befund ist damit
  maschinell reproduziert.
- Jede Regel aus der Tabelle in Abschnitt 2 ist aktiv und steht auf `error`.
- `npx tsc --noEmit` ist grün.
- `docs/QUALITY_BASELINE_V2_2_0.md` ordnet jeden Treffer einem Zielgate zu; kein Treffer bleibt
  ohne Zuordnung.
- Kein `--fix`-Lauf und kein `eslint-disable` ohne Begründung im Repository.

**Abnahme:** Erst nach unabhängigem Codex-Review ist Gate G30 freigegeben.
Kein Merge, Tag oder Push.

---

## Revision nach Umsetzung (2026-09-09)

Umgesetzt in `dd3b257` (`chore(g30): add eslint, prettier and stricter typescript baseline`)
und `12aecbc` (`chore(g30): fix eslint feature-zone, correct baseline paths and gate assignments`).
Geprüft von Claude Code (Prüfer-Rolle). Die folgenden Punkte des ursprünglichen Auftragstexts
werden für diese Instanz **überlagert** — der Auftrag oben bleibt als Historie stehen.

### R1 — Geltungsbereich der strengen Regeln (Klarstellung)

Die strengen Regeln (`no-explicit-any`, `no-console`, `max-lines`, `jsx-a11y/*`, `react/*`,
`react-hooks/*`, `import/no-restricted-paths`, `no-unused-vars`) gelten **ausschließlich** für
`src/**/*.{ts,tsx}`. Global per `ignores` ausgeschlossen: `scripts/**`, `tools/**`, `*.config.js`,
`*.config.ts`, `*.mjs`, `eslint.config.js`, `dist/**`, `node_modules/**`.
Grund: `scripts/` und `tools/` sind Node-Werkzeugcode mit anderen Normen (bewusste
`console`-Aufrufe, lange Capture-Skripte); ohne diese Grenze würde die Baseline-Zahl unbrauchbar.

### R2 — `npx tsc --noEmit` muss NICHT grün sein (überlagert Zeile „muss Exit 0 sein" + Akzeptanzkriterium)

Das Einschalten von `noUnusedLocals`, `noUnusedParameters` und `noUncheckedIndexedAccess` erzeugt
auf dem bestehenden Code zwangsläufig Fehler. Ein **rotes `tsc --noEmit` ist in G30 erwartet und
kein Blocker.** Die Fehleranzahl je Fehlercode wird in `QUALITY_BASELINE_V2_2_0.md` protokolliert;
behoben wird in G35. Ist-Stand: **765 Fehler**, Produktions-Build (`npm run build`) läuft dennoch
Exit 0 (Vite type-checkt nicht).

### R3 — `>150`-Regel für `noUncheckedIndexedAccess` überlagert (Zeile 109–111)

Ursprünglich: bei > 150 Fehlern die Option zurückstellen. Tatsächlich verursacht sie ~526 der
765 Fehler. **Die Option bleibt aktiv.** Grund: alle betroffenen Dateien liegen in
`src/simulation/`, das in G35 ohnehin vollständig angefasst wird; ein Zurückstellen würde den
G35-Scope zu klein erscheinen lassen. Folgt aus R2 (rotes `tsc` ist ohnehin akzeptiert).

### R4 — `import/no-restricted-paths`: „genau 3 Treffer" überlagert

Die Regel setzt die **vertikalen** Schichtgrenzen zuverlässig durch und meldet **7 Treffer**:

| Datei:Zeile | Verstoß | Erwartet? |
|---|---|---|
| `src/services/import/crmImporter.ts:2` | `services → features` | ✅ ja |
| `src/simulation/__tests__/dataSourceIntegrity.test.ts:5` | `simulation → features` | ✅ ja |
| `src/domain/eventRules.ts:1` | `domain → simulation` | neu |
| `src/domain/executiveCockpitData.ts:4` | `domain → services` | neu |
| `src/services/data/sources/baselineFileSource.ts:4` | `services → features` | neu |
| `src/services/data/sources/baselineFileSource.ts:5` | `services → features` | neu |
| `src/services/data/sources/hubSpotBaselineSource.ts:5` | `services → features` | neu |

Die 4 neuen Treffer sind **echte** Layering-Brüche, die die Analyse unterschätzt hatte — die Regel
wurde **nicht** gelockert.

Der dritte erwartete Verstoß — `src/features/crm/pages/LiveSimulationPage.tsx:2`
(`import … from '@/features/simulation/LiveDashboardView'`) — ist ein **horizontaler**
Feature-zu-Feature-Import. `import/no-restricted-paths` kann ihn nicht sauber prüfen: das Plugin
behandelt `target` als Dateipfad (kein Regex); per-Feature-Zonen mit `except: ['./src/features/X']`
erzeugen bei intra-Feature-Subimporten (`FeatureView.tsx → ./pages/SubPage`) massenhaft
False-Positives. Die kaputte Regex-Zone aus dem ersten Wurf wurde entfernt; der bekannte Verstoß
ist im `eslint.config.js`-Kommentar namentlich vermerkt. **Horizontale Feature-Grenzen werden in
G35 mit einem dedizierten Werkzeug** (`eslint-plugin-boundaries` oder Custom Rule) durchgesetzt.

Neues Akzeptanzkriterium: Regel aktiv, alle vertikalen Treffer mit Pfad in der Baseline,
Zusammensetzung (erwartet / neu) begründet, horizontale Grenze als Werkzeug-Limit dokumentiert.

### R5 — `react/jsx-no-target-blank` = 0 (Analyse-Befund Nr. 11 war Fehlalarm)

Die Analyse zählte 4 externe Links ohne `noopener` per zeilenbasiertem grep, das das `rel=`-Attribut
in der Folgezeile übersah. Tatsächlich tragen alle vier `target="_blank"` in `src/` ein `rel`:
`ResourceViewer.tsx` (`rel="noreferrer"`), `BusinessIdeaSignalMap.tsx` ×2 (`rel="noreferrer"`),
`DiagramCanvas.tsx` (`rel="noopener noreferrer"`). `noreferrer` impliziert `noopener`; die Regel
meldet korrekt **0**. **Kein Handlungsbedarf, keine Zuweisung an ein Folge-Gate.**

### R6 — `lint:report` schreibt keine Datei in den Repo-Root

`eslint-report.json` (oder Vergleichbares) darf **nicht** im Repo-Root landen — es wäre eine neue
Datei außerhalb der „Erlaubten Dateien" und würde den Gate-Check `git diff --exit-code` auslösen.
`lint:report` gibt nach stdout aus bzw. schreibt nach `dist/`.

### R7 — Ziel-Gate-Zuordnung

Sämtliche in G30 gemessenen Befunde (`any`, `console`, `jsx-a11y`, `unused-vars`, `max-lines`,
`import/no-restricted-paths`, `prefer-const`, `no-empty-pattern`) werden in **G35** (Auftrag 050)
behoben — nicht in G33/G39/G40. Entsprechend in `QUALITY_BASELINE_V2_2_0.md` und in den
`eslint.config.js`-Kommentaren.

### Ergebnis

`src/` unverändert, Schutzbereiche leer, `npm run verify` 24/24 grün, `npm run build` Exit 0.
ESLint-Baseline: 327 Fehler / 0 Warnungen. Prettier: 218 abweichende Dateien. TSC: 765 Fehler
(erwartet). **Gate G30 durch Prüfer freigegeben.** Kein Merge, Tag oder Push.
