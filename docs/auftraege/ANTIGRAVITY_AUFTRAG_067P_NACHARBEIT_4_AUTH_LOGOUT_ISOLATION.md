# AUFTRAG 067P-N4 — E2E-Logout vom Visual-Nutzer isolieren

**Baseline:** `3467b26` · **Branch:** `feat/auftrag-067p-audit-diagnostics` (weiterarbeiten) · **Status:** BEREIT ZUR UMSETZUNG

## Belegter Root Cause

Der zweite PR-CI-Lauf `35745787694` bestätigt: Der Visual-Test ist angemeldet (Logout-Button
sichtbar), aber die CRM-Edge-Function lehnt seinen Token mit `AUTH_REQUIRED` ab. Der gespeicherte
`admin-a`-State wird nicht durch das Laden verloren, sondern vorher serverseitig widerrufen:

1. `e2e/global-setup.ts` meldet `E2E_AUTH_EMAIL` = `admin-a@e2e.local` für die Default-
   `storageState` an.
2. `e2e/auth.spec.ts`, Test „4. Logout …", meldet sich ebenfalls als `admin-a` an und ruft den
   produktiven Adapter-Logout auf.
3. `src/auth/supabaseAuthAdapter.ts` ruft `supabase.auth.signOut()` ohne Scope auf.
4. Der installierte Supabase-Client dokumentiert den Default als Scope `global`: Alle Sitzungen
   dieses Nutzers werden widerrufen. Der spätere Visual-Lauf besitzt noch UI-Sessiondaten, aber
   keinen von der Edge-Function akzeptierten Token.

Die vorangegangene N3-Änderung war korrekt fail-closed und hat die Ursache sichtbar gemacht,
ist aber nicht der Ort des Widerrufs. Sie bleibt unverändert.

## Ziel

Der Logout-E2E-Test prüft weiterhin den produktiven globalen Logout, nutzt dafür aber den
separat geseedeten Nutzer `E2E_AUTH_EMAIL_B` (`admin-b@e2e.local`). Dadurch kann sein
serverseitiger Widerruf den global gespeicherten Visual-Nutzer `admin-a` nicht mehr beeinflussen.

## Erlaubte Dateien

| Art | Dateien |
|---|---|
| Modify | `e2e/auth.spec.ts`, `docs/BUILD_LOG.md` |

Jede weitere Datei ist ein Stopp-Punkt. Insbesondere unverändert bleiben `global-setup.ts`,
`visual.spec.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, alle Baselines,
Produktcode und Supabase-Konfiguration.

## Verbindliche Schritte — rot vor grün

- [ ] **A — Red-Nachweis sichern.** Verweise im Builder-Eintrag auf PR-CI `35745787694`:
  `auth.spec.ts` Test 4 lief vor den Visual-Tests, danach schlugen ausschließlich alle drei
  `/crm/leads`-Visuals mit `AUTH_REQUIRED` fehl. Kein erneutes Screenshot-Update.

- [ ] **B — Minimaler Fix.** Ergänze in `e2e/auth.spec.ts` eine vorhandene Env-Pflicht für
  `E2E_AUTH_EMAIL_B` und verwende sie ausschließlich im Logout-Test 4 statt
  `E2E_AUTH_EMAIL`. Passwort bleibt die vorhandene `E2E_AUTH_PASSWORD`-Pflicht. Alle
  Assertions des Logout-Tests (Dashboard, Logout, Weiterleitung nach `/login`, erneuter
  geschützter Aufruf) bleiben unverändert.

- [ ] **C — Direkter Nachweis.** Führe unter dem frischen CI-nahen Backend mindestens diese
  Reihenfolge aus: Auth-Spec inklusive Test 4, dann dreimal gezielt
  `e2e/visual.spec.ts -g 'visual /crm/leads'`. Alle neun Visual-Ausführungen müssen gegen die
  bestehenden Linux-Baselines grün sein und dürfen weder `AUTH_REQUIRED` noch 0 CRM-Einträge
  zeigen.

- [ ] **D — Vollständige Übergabe.** Führe den ersten E2E-CI-Befehl vollständig aus sowie die
  normalen Gates. Dokumentiere nur Nutzerrollen/-bezeichner, keine Token oder Storage-Werte.
  Ergänze den Builder-Eintrag in `docs/BUILD_LOG.md`, committe lokal und übergib an den Prüfer.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm run test:coverage
npm run build
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/visual.spec.ts -g 'visual /crm/leads' --repeat-each=3
npx playwright test e2e/a11y.spec.ts e2e/auth.spec.ts e2e/crm-query-export.spec.ts e2e/element-clipping.acceptance.ts e2e/resources-viewer.spec.ts e2e/routes.spec.ts e2e/semantic-routes.spec.ts e2e/tenant-isolation.spec.ts e2e/visual.spec.ts
git diff --check 3467b26
git diff 3467b26 -- src/simulation src/types src/context src/services/data src/features/resources src/services/db/crmRepository.ts src/auth src/features/auth e2e/global-setup.ts e2e/visual.spec.ts playwright.config.ts .github/workflows/ci.yml
```

## Akzeptanz und Stopp-Punkte

- Der Logout-Test prüft unverändert den produktiven globalen Logout, aber ausschließlich für
  `admin-b`; der gespeicherte Visual-Nutzer `admin-a` bleibt davon unberührt.
- Alle drei CRM-Visual-Viewports bestehen dreimal hintereinander mit dem bereits versionierten
  Linux-Bildzustand.
- Der vollständige E2E-CI-Lauf ist grün, einschließlich der drei Issue-#13-Checks.
- Kein Push, Merge, Deploy, Workflow-Dispatch oder Issue-Close durch den Builder. Erst nach
  Prüferfreigabe und grüner PR-CI darf Issue #13 geschlossen werden.
