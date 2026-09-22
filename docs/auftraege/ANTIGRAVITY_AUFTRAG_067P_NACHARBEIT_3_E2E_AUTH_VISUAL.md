# AUFTRAG 067P-N3 — Stabiler E2E-Auth-State für CRM-Visual-Gate

**Baseline:** `81a7150` · **Branch:** `feat/auftrag-067p-audit-diagnostics` (weiterarbeiten) · **Status:** BEREIT ZUR UMSETZUNG

## Befund

PR-CI `35737662086` hat die sechs aktualisierten Linux-Baselines nicht pauschal widerlegt:
`/dashboard` ist grün und der neue Issue-#13-Clipping-Test läuft in allen drei Projekten grün.
Nur `/crm/leads` scheitert bei 1440, 768 und 375 px; die CI-Artefakte zeigen in allen drei
Fällen den Auth-Fehlerzustand statt des angemeldeten Seed-Zustands:

- `Status: Nicht verfügbar`
- `Frische: Keine Daten (AUTH_REQUIRED)`
- `0 Einträge`

Die erwarteten Linux-Baselines zeigen dagegen korrekt den angemeldeten CRM-Seed-Zustand.
Die Screenshots dürfen deshalb **nicht** erneut aktualisiert werden. Der Fehler liegt im nicht
verlässlich verfügbaren E2E-Auth-State vor dem Visual-Test.

## Ziel

`e2e/global-setup.ts` speichert den angemeldeten Supabase-State erst, wenn der erforderliche
Auth-Eintrag wirklich im Local Storage des richtigen Origins vorhanden ist. `visual.spec.ts`
bricht mit einer eindeutigen Auth-Assertion ab, bevor es einen Screenshot eines abgemeldeten
oder `AUTH_REQUIRED`-Zustands als Bilddifferenz meldet.

## Erlaubte Dateien

| Art | Dateien |
|---|---|
| Modify | `e2e/global-setup.ts`, `e2e/visual.spec.ts`, `docs/BUILD_LOG.md` |

Jede weitere Datei ist ein Stopp-Punkt. Unverändert bleiben insbesondere
`playwright.config.ts`, `.github/workflows/ci.yml`, alle Produktdateien, der neue
Issue-#13-Check sowie alle PNG-Baselines.

## Verbindliche Schritte

- [ ] **A — Zustand sichtbar nachweisen.** Reproduziere den Visual-Lauf mit dem CI-nahen,
  frisch initialisierten Supabase-Backend. Prüfe ausschließlich auf das Vorhandensein eines
  `sb-*-auth-token`-Eintrags für `http://127.0.0.1:4321`; weder Tokenwert noch Storage-State
  dürfen geloggt, ausgegeben oder committed werden.

- [ ] **B — Auth-State robust speichern.** Ergänze nach dem Login in `global-setup.ts` eine
  explizite, begrenzte Wartebedingung auf diesen Local-Storage-Schlüssel, bevor
  `storageState({ path: authFile })` geschrieben wird. Die bestehende Env-Pflicht bleibt
  unverändert; keine Test-Credentials, Fallbacks oder Sleeps als Ersatz.

- [ ] **C — Visual-Gate fail-closed machen.** `visual.spec.ts` belegt vor jedem Screenshot,
  dass der Logout-Button sichtbar ist und der CRM-Auth-Fehlerzustand nicht gerendert wird.
  Bei fehlender Sitzung soll der Test mit dieser Ursache scheitern, nie eine Fehlerseite als
  neue Baseline akzeptieren. Die fünf Routen, Warte-/Font-Konvention und Screenshot-Assertion
  bleiben sonst unverändert.

- [ ] **D — Beleg und Übergabe.** Führe den vollständigen ersten CI-E2E-Befehl aus, darunter
  alle drei `/crm/leads`-Visual-Viewports und die neue Issue-#13-Spec. Wiederhole gezielt
  `e2e/visual.spec.ts -g 'visual /crm/leads'` mindestens dreimal unter frischem Auth-State.
  Dokumentiere nur Status, Testzahlen und fehlende Auth-Fehler — niemals Sitzungsdaten. Ergänze
  den Builder-Eintrag in `docs/BUILD_LOG.md`, committe lokal und übergib an den Prüfer.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm run test:coverage
npm run build
npx playwright test e2e/visual.spec.ts -g 'visual /crm/leads'
npx playwright test e2e/a11y.spec.ts e2e/auth.spec.ts e2e/crm-query-export.spec.ts e2e/element-clipping.acceptance.ts e2e/resources-viewer.spec.ts e2e/routes.spec.ts e2e/semantic-routes.spec.ts e2e/tenant-isolation.spec.ts e2e/visual.spec.ts
git diff --check 81a7150
git diff 81a7150 -- src/simulation src/types src/context src/services/data src/features/resources src/services/db/crmRepository.ts src/auth src/features/auth playwright.config.ts .github/workflows/ci.yml
```

## Akzeptanz und Stopp-Punkte

- Alle drei `/crm/leads`-Visual-Tests verwenden den angemeldeten CRM-Seed-Zustand und bestehen
  gegen die bereits versionierten Linux-Baselines.
- Der gesamte CI-E2E-Lauf besteht einschließlich der drei Issue-#13-Tests.
- Kein Token, keine Credentials und kein Storage-State erscheinen in Diff, BUILD_LOG,
  Screenshot-Matrix oder Testausgabe.
- Kein Push, Merge, Deploy, Workflow-Dispatch oder Issue-Close durch den Builder. Erst nach
  Prüferfreigabe und grüner PR-CI darf Issue #13 geschlossen werden.
