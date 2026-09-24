# AUFTRAG 067P-N2 — Issue #13: Playwright-Testentdeckung schließen

**Baseline:** `01c09a6` · **Branch:** `feat/auftrag-067p-audit-diagnostics` (weiterarbeiten) · **Status:** BEREIT ZUR UMSETZUNG

## Befund

Der Builder-Stopp-Punkt ist vom unabhängigen Prüfer bestätigt:

```text
npx playwright test e2e/element-clipping.acceptance.ts --project=mobile-375 --list
Error: No tests found.
Total: 0 tests in 0 files
```

`playwright.config.ts` setzt kein `testMatch`. Der Playwright-Standard sammelt die vorhandenen
`*.spec.ts`-Dateien, aber nicht `e2e/element-clipping.acceptance.ts`. Die in `ci.yml` ergänzte
Dateiangabe ist deshalb wirkungslos: Das Issue-#13-Gate wird in der CI nicht ausgeführt.

## Ziel und Scope

Ergänze in `playwright.config.ts` genau einen `testMatch`-Eintrag:

```ts
testMatch: ['**/*.spec.ts', '**/*.acceptance.ts'],
```

Alle derzeit regulären E2E-Dateien enden auf `.spec.ts`; diese Konfiguration erhält ihre
Entdeckung unverändert und nimmt zusätzlich ausschließlich die vorhandene Acceptance-Spec auf.

| Art | Datei |
|---|---|
| Modify | `playwright.config.ts` |
| Modify | `docs/BUILD_LOG.md` |

Jede weitere Datei ist ein Stopp-Punkt. Insbesondere bleiben die sechs Linux-Baselines, die
Issue-#13-UI, die CI-Workflow-Datei und der Vitest-Fix aus `01c09a6` unverändert.

## Verifikation

```bash
npx playwright test e2e/element-clipping.acceptance.ts --project=mobile-375 --list
npx playwright test e2e/element-clipping.acceptance.ts --project=mobile-375
npx playwright test --list
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm run test:coverage
npm run build
git diff --check 01c09a6
git diff 01c09a6 -- src/simulation src/types src/context src/services/data src/features/resources src/services/db/crmRepository.ts src/auth src/features/auth
```

Der erste Befehl muss genau den Test `[PR-CLIP-13]` im Projekt `mobile-375` aufführen. Der
vollständige `--list`-Lauf muss ihn zusätzlich zu allen bisherigen `.spec.ts`-Tests enthalten.
Danach den neuen Builder-Eintrag mit beiden List-Nachweisen und allen Gate-Ergebnissen in
`docs/BUILD_LOG.md` ergänzen, lokal committen und an den Prüfer übergeben.

## Stopp-Punkte

- Kein Push, Merge, Deploy, Workflow-Dispatch oder Issue-Close durch den Builder.
- Kein Wechsel auf einen breiteren Dateiglob und keine Änderung von Projekt-, Retry- oder
  Worker-Einstellungen.
- Schlägt der Acceptance-Test nach erfolgreicher Entdeckung fehl, nicht die Assertion lockern;
  mit Messwert, Route und Screenshot an den Prüfer zurückgeben.
