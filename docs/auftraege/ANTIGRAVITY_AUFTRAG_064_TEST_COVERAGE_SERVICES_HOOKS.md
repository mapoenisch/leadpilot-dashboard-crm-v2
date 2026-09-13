# AUFTRAG 064 / Gate G43 (Fortsetzung) — Test-Coverage `services/` + `hooks/`

**Baseline:** `3d71021` (Auftrag 063 Review abgeschlossen) · **Branch:** `codex/v2.2.0-haertung` · **Status:** OFFEN

Letzter der drei in Auftrag 061 angekündigten Folgeaufträge. Schließt **Kennzahl #14**
(Test-Coverage `src/services/**` + `src/hooks/**`, aktuell 71,05 % → ≥ 90 %) und behebt als
Quick-Win den in Auftrag 063 dokumentierten Prettier-Zähler-Anstieg (Metrik #3). Nach diesem
Auftrag sind von den 23 DoD-Kennzahlen nur noch #13 (Komponenten > 400 Zeilen), #21
(`.git`-Größe) und #22 (CI/Push) offen — alle drei ausdrücklich Marcs Grundsatzentscheidungen,
nicht Testarbeit.

## Ziel

1. **Statement-Coverage `src/services/**` + `src/hooks/**` von 71,05 % auf ≥ 90 % im Aggregat**
   (gleiches Prinzip wie Auftrag 063: Ordner-Aggregat zählt, nicht jede Einzeldatei — siehe
   Entscheidung 2).
2. **`fake-indexeddb` als neue Dev-Dependency** für `indexedDbSnapshotRepository.ts` (199
   Statements, größte Einzellücke) — von Marc ausdrücklich freigegeben, siehe Entscheidung 1.
3. **Quick-Win aus dem Auftrag-063-Review:** die 38 seit Auftrag 063 unformatierten
   `*.ui.vitest.tsx`-Testdateien per `prettier --write` nachformatieren, damit Metrik #3 nicht
   weiter unbemerkt wächst.

## Ist-Stand (nachgemessen)

`src/services/**` + `src/hooks/**` gesamt: **675/950 Statements = 71,05 %** (per
`coverage/coverage-summary.json`, dynamisch aus Auftrag 063 Block A).

| Unterordner | Statements | Coverage | Einordnung |
|---|---|---|---|
| `services/liveKpi` | 309/322 | 95,96 % | ✅ bereits über Ziel |
| `services/db` | 71/251 | 28,29 % | ❌ größte Lücke |
| `services/data` (Schutzbereich) | 87/116 | 75,00 % | ⚠️ moderate Lücke, geschützt |
| `services/import` | 70/105 | 66,67 % | ❌ spürbare Lücke |
| `hooks/` (einzelne Dateien) | 122/138 | 88,41 % | ⚠️ knapp unter Ziel |

### Datei-genaue Aufschlüsselung der Lücken

| Datei | Statements gedeckt/gesamt | % | Schutzbereich |
|---|---|---|---|
| `src/services/db/indexedDbSnapshotRepository.ts` | 48/199 | 24,1 % | nein |
| `src/services/db/crmRepository.ts` | 12/41 | 29,3 % | nein |
| `src/services/import/crmSeeder.ts` | 0/21 | 0,0 % | nein |
| `src/services/import/crmImporter.ts` | 67/81 | 82,7 % | nein |
| `src/services/data/runSourceAudit.ts` | 20/34 | 58,8 % | **ja** |
| `src/services/data/baselineSnapshotService.ts` | 21/29 | 72,4 % | **ja** |
| `src/services/data/dataSourceRegistry.ts` | 16/19 | 84,2 % | **ja** |
| `src/services/data/sources/hubSpotBaselineSource.ts` | 11/13 | 84,6 % | **ja** |
| `src/services/data/sources/baselineFileSource.ts` | 10/11 | 90,9 % | **ja** |
| `src/services/data/sources/simulatedCrmSource.ts` | 4/5 | 80,0 % | **ja** |
| `src/hooks/queries/useCrmQueries.ts` | 2/8 | 25,0 % | nein |
| `src/hooks/queries/usePipelineOverview.ts` | 0/2 | 0,0 % | nein |

`indexedDbSnapshotRepository.ts` nutzt die rohe Browser-`IndexedDB`-API direkt (`indexedDB.open`,
`IDBTransaction`, `IDBRequest`-Callbacks) — jsdom implementiert diese API nicht. `snapshotMapper.ts`
(100 %) und `supabaseClient.ts` (100 %) sind bereits vollständig gedeckt und dienen als Vorbild
für den Umgang mit den übrigen `db/`-Dateien.

## Verbindliche Entscheidungen

1. **`fake-indexeddb` (^6.2.5) als neue Dev-Dependency — von Marc ausdrücklich freigegeben.**
   Nur `devDependencies`, kein Einfluss auf den Produktions-Build (`npm run build` und
   `size-limit` müssen unverändert bleiben — Pflichtnachweis in der Verifikation). Einbindung
   über `vitest.setup.ts` (node-Projekt, dort wo `indexedDbSnapshotRepository.ts` getestet wird)
   per `import 'fake-indexeddb/auto'` oder gezielt im jeweiligen Testfile — Builder entscheidet,
   dokumentiert die Wahl kurz im Bericht.
2. **Ziel ist der Ordner-Aggregatwert**, analog zu Auftrag 063 / Kennzahl #15. Kein `perFile:
   true`-Zwang für neue Glob-Keys in `vitest.config.ts`. Dateien mit sehr kleiner Statement-Zahl
   (`useCrmQueries.ts`, `usePipelineOverview.ts`) dürfen nicht auf Kosten von Testqualität auf
   100 % gepusht werden, wenn das Aggregat auch ohne sie ≥ 90 % erreicht — aber beide sind klein
   genug, dass sie günstige, schnelle Gewinne sind und mitgenommen werden sollten.
3. **Schutzbereichs-Ausnahme für `src/services/data/**` — nur neue Testdateien, keine
   Quelländerung.** Analog zur Regelung in `docs/BUILD_PLAN_V2.2.0.md` („Schutzbereiche während
   V2.2.0") und dem Präzedenzfall aus Auftrag 062 (Block B) und 063 (component-seitig 0
   Quelländerungen): Es dürfen ausschließlich neue `*.vitest.ts`-Dateien unter
   `src/services/data/**/__tests__/` hinzugefügt werden, um `runSourceAudit.ts`,
   `baselineSnapshotService.ts`, `dataSourceRegistry.ts` und die drei `sources/*.ts`-Dateien
   abzudecken. **Keine einzige Zeile** an den bestehenden Quelldateien in `src/services/data/**`
   darf sich ändern. Pflichtnachweis: `git diff 3d71021 -- src/services/data` zeigt ausschließlich
   neue Dateien mit `__tests__` im Pfad.
4. **Kein `perFile`-Zwang, aber auch keine Kosmetik-Tests.** Tests müssen echtes Verhalten prüfen
   (Rückgabewerte, Fehlerfälle, Seiteneffekte), keine reinen „Funktion existiert"-Tests nur um die
   Coverage-Zahl zu heben.
5. **Prettier-Nachformatierung (Quick-Win aus Auftrag 063):** `npx prettier --write` auf die 38
   in Auftrag 063 neu angelegten, unformatierten `*.ui.vitest.tsx`-Dateien (Liste im
   Auftrag-063-Review-Abschnitt in `docs/BUILD_LOG.md`). Pflichtnachweis: `npm run format:check`
   sinkt von 123 auf 85 (die 83 Schutzbereichsdateien + 2 bekannte Randdateien bleiben
   unverändert liegen, wie in den Aufträgen 061–063 dokumentiert).
6. **Scope-Grenze:** Keine Änderung an fachlicher Logik. Fällt beim Testen ein echter Bug auf
   (z. B. in `indexedDbSnapshotRepository.ts` oder `crmRepository.ts`): dokumentieren, nicht
   reparieren — außer trivial und ohne Verhaltensänderung (analog Auftrag 062/063).

## Grenzen und Schutzbereiche

- `git diff 3d71021 -- src/simulation src/types src/context src/features/resources` **muss leer
  sein**.
- `git diff 3d71021 -- src/services/data` darf **ausschließlich neue Testdateien** enthalten
  (siehe Entscheidung 3) — keine Änderung an einer bestehenden `.ts`-Datei dort.
- `src/services/db/**`, `src/services/import/**`, `src/hooks/**` sind **nicht** geschützt — dort
  sind auch triviale, verhaltensneutrale Quell-Anpassungen erlaubt (z. B. eine Funktion
  exportieren, die vorher nur intern genutzt wurde, um sie isoliert testbar zu machen), sofern im
  Bericht genannt.

## Blöcke

### Block A — Quick-Win: Prettier-Nachformatierung

`npx prettier --write` auf die 38 unformatierten Testdateien aus Auftrag 063. Verifikation:
`npm run format:check` zeigt 85 Abweichungen (nicht mehr 123).

### Block B — `services/db/` (größte Lücke, 180 fehlende Statements)

- `fake-indexeddb` installieren und in Test-Setup einbinden.
- `indexedDbSnapshotRepository.ts`: CRUD-Pfade, Fehlerfälle (z. B. `onerror`-Callback,
  Transaktionsabbruch), Versions-Upgrade-Pfad testen.
- `crmRepository.ts`: Schreibpfade und Fehlerfälle testen (Hinweis: **keine** Änderung an
  RNG/Seed- oder Persistenzverhalten selbst, nur Testabdeckung).

### Block C — `services/import/` (56 fehlende Statements)

- `crmSeeder.ts` (0 % → substanziell erhöhen).
- `crmImporter.ts` Restlücken (14 fehlende Statements, vermutlich Fehlerpfade/Edge-Cases in der
  CSV-Verarbeitung).

### Block D — Schutzbereich `services/data/` (autorisiert, nur Tests) + `hooks/queries/`

- Neue Testdateien für `runSourceAudit.ts`, `baselineSnapshotService.ts`,
  `dataSourceRegistry.ts`, `sources/hubSpotBaselineSource.ts`, `sources/baselineFileSource.ts`,
  `sources/simulatedCrmSource.ts` gemäß Entscheidung 3.
- `hooks/queries/useCrmQueries.ts`, `hooks/queries/usePipelineOverview.ts`: kleine, gezielte
  Ergänzungen.

Nach jedem Block `npx vitest run --coverage` erneut laufen lassen und den steigenden
Aggregatwert für `src/services/**` + `src/hooks/**` im Bericht dokumentieren.

## Erlaubte Dateien

| Datei/Muster | Zweck |
|---|---|
| `package.json`, `package-lock.json` | `fake-indexeddb` als devDependency (Entscheidung 1) |
| `vitest.setup.ts` | `fake-indexeddb`-Einbindung |
| `src/services/db/**/*.vitest.ts` (neu) | Block B |
| `src/services/db/crmRepository.ts`, `indexedDbSnapshotRepository.ts` | nur triviale, verhaltensneutrale Testbarkeits-Anpassungen laut Grenzen-Abschnitt |
| `src/services/import/**/*.vitest.ts` (neu) | Block C |
| `src/services/data/**/__tests__/*.vitest.ts` (neu, autorisiert) | Block D, Entscheidung 3 — keine anderen Änderungen in `services/data` |
| `src/hooks/queries/**/*.vitest.ts` (neu) | Block D |
| `src/components/ui/__tests__/*.ui.vitest.tsx` (bestehend, nur `prettier --write`) | Block A |
| `docs/releases/V2.2.0.md`, `docs/BUILD_LOG.md` | Abschlussbericht |

## Pflicht-Verifikation

```
npx vitest run --coverage                 # services/+hooks Aggregat ≥ 90 % (Statements)
npx tsc --noEmit                          # weiterhin 0 Fehler
npm run lint                               # weiterhin 4 Fehler (Metrik #13, unverändert), 0 Warnungen
npm run format:check                       # 85 Abweichungen (gesunken von 123, Block A)
npm run verify                             # 24/24 Suiten grün
npm test                                   # bestehende Tests weiterhin grün + neue Tests
npm run build                              # Produktions-Build grün, size-limit unverändert im Budget
npx playwright test                        # 165/165, 15/15 Visual Regression bei 0px Diff
npx tsx scripts/verifyV22ReleaseReadiness.ts   # #14 zeigt echten Aggregatwert ≥ 90 %
git diff 3d71021 -- src/simulation src/types src/context src/features/resources   # leer
git diff 3d71021 -- src/services/data                                             # nur neue __tests__-Dateien
```

## Builder-Bericht

Neuer Abschnitt am Ende von `docs/BUILD_LOG.md`: Ziel & Kontext, Anzahl neuer Testdateien je
Block, Coverage-Aggregatwert für `src/services/**`+`src/hooks/**` nach jedem Block (71,05 % → …
→ ≥ 90 %), Nachweis `fake-indexeddb` nur in `devDependencies` und ohne Bundle-Impact,
Schutzbereichs-Diff-Nachweis für Block D, Prettier-Zähler-Nachweis für Block A, vollständige
Verifikationsmatrix, Ergebnis & Übergabe an den Prüfer.

## Akzeptanzkriterien für die Prüfung

- Unabhängig gemessener `npx vitest run --coverage`-Aggregatwert für `src/services/**` +
  `src/hooks/**` liegt bei ≥ 90 % Statements.
- `fake-indexeddb` erscheint **ausschließlich** unter `devDependencies` in `package.json`; `npm
  run build`-Ausgabegröße (`size-limit`) unverändert gegenüber Auftrag 063.
- `git diff` auf `src/services/data` zeigt ausschließlich neue `__tests__`-Dateien, keine
  Änderung an bestehenden Quelldateien.
- `npm run format:check` zeigt 85 Abweichungen, nicht mehr 123.
- Bestehende Tests + 165 Playwright-Tests weiterhin grün, keine visuelle Abweichung.
- Nach diesem Auftrag sind von 23 DoD-Kennzahlen nur noch #13, #21, #22 offen (alle drei als
  Marcs Grundsatzentscheidungen dokumentiert, nicht als Testlücken).
