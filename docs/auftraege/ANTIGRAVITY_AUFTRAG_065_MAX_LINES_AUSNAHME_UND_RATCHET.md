# AUFTRAG 065 / Gate G43 (Fortsetzung) — Metrik #13 als dauerhafte Ausnahme dokumentieren + `TSC_BASELINE`-Ratsche nachziehen

**Baseline:** `a7f9325` (Auftrag 064 Review abgeschlossen) · **Branch:** `codex/v2.2.0-haertung` · **Status:** OFFEN

Kleinster der verbleibenden Aufträge — reine Dokumentation + eine Ratschen-Korrektur, kein
Testcode. Setzt Marcs bereits getroffene Entscheidung zu Kennzahl #13 um: **„Ausnahme"**
(dauerhaft dokumentiert, analog zu `INLINE_STYLE_BASELINE` bei Kennzahl #12), statt eines
künftigen Split-Auftrags für die 4 Schutzbereichs-Dateien.

## Ziel

1. **Kennzahl #13 (und #1, gleiche Ursache) als dauerhaft akzeptierte Ausnahme dokumentieren**,
   nicht mehr als offene Lücke. `MAX_LINES_BASELINE=4` ist bereits seit Auftrag 058 in
   `.github/workflows/ci.yml` als CI-Ratsche verankert — die mechanische Absicherung existiert
   schon, es fehlt nur die explizite Einordnung als akzeptierter Endzustand statt „offen".
2. **`TSC_BASELINE` in `.github/workflows/ci.yml` von 602 auf 0 senken.** Nachgemessener Fund:
   Auftrag 062 hat TypeScript-Fehler auf 0 reduziert (Kennzahl #4, seit `a4914c8` bestätigt grün),
   aber die CI-Ratsche wurde nie nachgezogen — sie würde aktuell bis zu 602 neue TS-Fehler
   stillschweigend durchlassen, bevor CI rot würde. Das ist eine reale Regressionslücke, die durch
   das laufende Härtungsprogramm eigentlich hätte mitwandern müssen.

## Ist-Stand (nachgemessen)

- `npm run lint` → **4 Fehler** (`max-lines`), alle 4 in Schutzbereichen: `src/simulation/eventRules.ts`
  (545 Zeilen), `src/simulation/scenarioService.ts` (1010 Zeilen),
  `src/simulation/__tests__/financialIntegrity.test.ts` (408 Zeilen),
  `src/features/resources/components/ResourceViewer.tsx` (531 Zeilen).
- `.github/workflows/ci.yml` Zeilen 12–16: `LINT_BASELINE: 4` (passt), `MAX_LINES_BASELINE: 4`
  (passt), **`TSC_BASELINE: 602`** (veraltet — Ist-Stand ist 0), `INLINE_STYLE_BASELINE: 22`
  (passt, unverändert seit G39).
- `npx tsx scripts/verifyV22ReleaseReadiness.ts` markiert #1 und #13 aktuell als `❌ OFFEN`,
  obwohl beide durch dieselbe, bereits mechanisch geratschte Grenze abgedeckt sind.

## Verbindliche Entscheidung

**Kein Split-Auftrag für die 4 Dateien.** Sie liegen in `src/simulation/**` (Simulations-Engine,
Kernstück des Produkts) und `src/features/resources/**` (bewusst eingefroren). Ein Split würde
den strengsten Schutzbereich der Codebasis anfassen für einen rein stilistischen Lint-Grenzwert
— das Risiko-Nutzen-Verhältnis ist schlecht. Stattdessen: Kennzahl #13 (und #1) werden als
dauerhaft akzeptierte, mechanisch geratschte Ausnahme geführt, exakt wie Kennzahl #3 (Prettier,
Schutzbereich) und #12 (Inline-Styles, `INLINE_STYLE_BASELINE`) bereits gehandhabt werden.

## Blöcke

### Block A — `TSC_BASELINE` korrigieren

`.github/workflows/ci.yml`: `TSC_BASELINE: 602` → `TSC_BASELINE: 0`.

### Block B — Kennzahl #13/#1 als Ausnahme dokumentieren

- `scripts/verifyV22ReleaseReadiness.ts`: Status für Kennzahl #1 und #13 von `'OFFEN'` auf einen
  neuen, ehrlichen Status ändern, der eine akzeptierte, geratschte Ausnahme von einer echten
  Lücke unterscheidet (z. B. eigener Status `'AUSNAHME'` neben den bestehenden `'ERFÜLLT'` /
  `'OFFEN'` / `'DOKUMENTIERT'`, mit `note` analog zu #3/#12: `MAX_LINES_BASELINE=4, alle 4 Dateien
  in Schutzbereichen (simulation/, features/resources/), von Marc als dauerhafte Ausnahme
  akzeptiert`).
- `docs/releases/V2.2.0.md`: DoD-Tabelle Zeilen #1 und #13 auf den neuen Status aktualisieren,
  Bilanz-Zeile entsprechend anpassen.
- `docs/BUILD_LOG.md`: neuer Abschnitt, der Marcs Entscheidung und die Begründung festhält.

## Grenzen und Schutzbereiche

Keine der Zieldateien liegt in `src/simulation/**`, `src/types/**`, `src/context/**`,
`src/services/data/**` oder `src/features/resources/**` — dieser Auftrag ändert dort **nichts**,
er dokumentiert nur, dass 4 dort bereits vorhandene Dateien dauerhaft über dem Lint-Grenzwert
bleiben dürfen. `git diff a7f9325 -- src/simulation src/types src/context src/services/data
src/features/resources` muss leer sein.

## Erlaubte Dateien

| Datei | Zweck |
|---|---|
| `.github/workflows/ci.yml` | Block A |
| `scripts/verifyV22ReleaseReadiness.ts` | Block B |
| `docs/releases/V2.2.0.md` | Block B |
| `docs/BUILD_LOG.md` | Abschlussbericht |

## Pflicht-Verifikation

```
npx tsc --noEmit                          # 0 Fehler (bestätigt TSC_BASELINE=0 ist korrekt)
npm run lint                               # weiterhin exakt 4 Fehler (unverändert, jetzt als Ausnahme deklariert)
npx tsx scripts/verifyV22ReleaseReadiness.ts   # #1 und #13 zeigen neuen Ausnahme-Status statt OFFEN
git diff a7f9325 -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## Akzeptanzkriterien für die Prüfung

- `TSC_BASELINE` ist 0, nicht mehr 602.
- Metrik #1 und #13 sind konsistent als akzeptierte Ausnahme markiert (Skript, Release-Doc, BUILD_LOG).
- Keine Zeile Code in `src/simulation`, `src/features/resources` oder sonstigen Schutzbereichen geändert.
- Nach diesem Auftrag verbleiben von den 23 DoD-Kennzahlen nur noch **#21 (`.git`-Größe)** und
  **#22 (CI/Push)** offen — beide ausdrücklich Marcs eigene, noch ausstehende Ausführungsentscheidungen.
