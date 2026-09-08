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
