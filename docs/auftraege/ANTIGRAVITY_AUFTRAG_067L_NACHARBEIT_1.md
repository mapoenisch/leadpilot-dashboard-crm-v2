# AUFTRAG 067L / Gate G58 — Nacharbeit 1 (Prüfer-Befund vom 2026-09-19)

**Baseline:** `03ec17f` (Builder-Stand G58) + Prüfer-Commits auf demselben Branch ·
**Branch:** `feat/auftrag-067l-ci-ruleset` (weiterarbeiten, keinen neuen Branch anlegen) ·
**Status:** OFFEN

Grundlage ist der Abschnitt „Gate G58: Unabhängiger Prüfer-Befund“ am Ende von
`docs/BUILD_LOG.md`. Alles aus `ANTIGRAVITY_AUFTRAG_067L_FAILCLOSED_CI_RULESET.md` gilt
weiter (Repo-Ziel `mapoenisch/leadpilot-dashboard-crm-v2`, Stopp-Punkte, Schutzbereiche,
Pflicht-Verifikation), sofern unten nichts anderes steht.

## Bereits vom Prüfer behoben (auf ausdrückliche Anweisung von Marc)

Diese Punkte **nicht rückgängig machen**; im Builder-Eintrag als „vom Prüfer behoben, vom
Builder geprüft“ ausweisen und die Prüfung nachvollziehen:

- **[P1-1]** `.lighthouserc.json`: `chromePath` (macOS-Pfad) entfernt. Lokal auf macOS setzt
  man `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`; auf
  `ubuntu-latest` findet LHCI Chrome selbst.
- **[P1-2]** `ci.yml`, Job `e2e`: Schritt „Coverage für Readiness erzeugen“
  (`npm run test:coverage`) vor dem Readiness-Schritt, weil das Skript
  `coverage/coverage-summary.json` fail-closed verlangt.
- **[P3]** `ci.yml`: Versionskommentare hinter den SHAs (`# v4.2.2`, `# v4.1.0`, `# v4.6.1`).
  Tag→SHA-Zuordnung per `gh api` geprüft.

## Offen für Antigravity

### [P1-3] E2E und Lighthouse authentifiziert in der CI

Ist-Stand: `e2e/global-setup.ts` wirft ohne `E2E_AUTH_EMAIL`/`E2E_AUTH_PASSWORD`; `ci.yml`
setzt keine Secrets; `scripts/lighthouse-auth.cjs` setzt noch eine LocalAuth-Fake-Session
(`leadpilot_auth_session`) und scheitert seit Supabase Auth mit „Weiterleitung auf /login“
(vom Prüfer lokal reproduziert). Marc hat ein Supabase-Testprojekt.

**Teil A — von Marc, nicht von Antigravity:** Secrets im Repo `mapoenisch/leadpilot-dashboard-crm-v2`
anlegen. Antigravity legt **keine** Secrets an, liest keine Werte und schreibt keine Werte in
Dateien, Logs oder BUILD_LOG. Namen (nur Namen dokumentieren):
`E2E_AUTH_EMAIL`, `E2E_AUTH_PASSWORD`, `E2E_AUTH_EMAIL_B`, `E2E_AUTH_PASSWORD_B`,
`E2E_AUTH_EMAIL_NOMEMBER`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Antigravity prüft zuerst im Code, welche davon
tatsächlich gebraucht werden (E2E-Specs, `playwright.config.ts`, Build), und meldet Marc die
exakte Liste, bevor Marc sie anlegt. Die Nutzer im Testprojekt dürfen keine Produktivdaten
enthalten.

**Teil B — Code (Antigravity):**
- `scripts/lighthouse-auth.cjs`: echter Login wie in `e2e/global-setup.ts` (`/login`,
  `#login-email`, `#login-password`, Submit, Warten auf `/dashboard` und
  `[data-testid="logout-button"]`). Zugangsdaten nur aus `E2E_AUTH_EMAIL`/`E2E_AUTH_PASSWORD`.
  Fehlen sie: mit klarer Fehlermeldung abbrechen (fail-closed, kein stilles Überspringen).
  Keine Fake-Session mehr.
- `ci.yml`, Job `e2e`: die nötigen Secrets per `env:` aus `${{ secrets.NAME }}` an genau die
  Schritte, die sie brauchen (Build, Playwright, Lighthouse), nicht global. Keine Ausgabe der
  Werte, kein `set -x`, kein `echo` der Variablen.
- Neue Datei `docs/operations/ci-secrets.md`: Secret-Namen, Zweck, welcher Schritt sie nutzt,
  `gh secret set NAME -R mapoenisch/leadpilot-dashboard-crm-v2` als Anleitung für Marc.
  **Keine Werte.**
- Lokaler Nachweis: `E2E_AUTH_*` aus Marcs lokaler Umgebung, LHCI mit `CHROME_PATH` starten;
  Ergebnis im Eintrag benennen (Scores, nicht Zugangsdaten). Ist lokal kein Login möglich:
  stoppen und an Marc melden.

### [P2-1] Dokumentation richtigstellen

- BUILD_LOG (Builder-Eintrag G58): Zeile „`.lighthouserc.json`: Bereinigt und vorbereitet“
  war unzutreffend, Datei war nicht im Commit. Korrigieren.
- `docs/reviews/v2.3.0-audit-risk-acceptance.md`, Abschnitt „Auflösung in Gate G58“: Aussage
  „Befristung erfolgreich beendet“ ändern auf: Audit 0 erreicht; **LHCI-Lauf im echten
  Actions-Lauf noch nachzuweisen**. Erst nach grünem Lauf als abgelöst markieren.
- Das „Bekannte Problem“ (`E2E_AUTH_EMAIL` fehlt, `PR-FREEZE-07`, `PR-PERSIST-08`) im Eintrag
  aufgreifen: Ursache und Lösung benennen.

### [P2-2] Scope-Erweiterungen ausweisen

`vitest.config.ts` (Include `scripts/__tests__/**`) und die `PR-RELEASE-17`-Umstellung in
`src/review/acceptance/qualityRelease.acceptance.ts` lagen außerhalb der schriftlichen
Erweiterung. Im Eintrag als Erweiterung mit Begründung ausweisen. Weitere Dateien, die dieser
Auftrag braucht, sind hiermit erlaubt: `scripts/lighthouse-auth.cjs`,
`docs/operations/ci-secrets.md`, `scripts/verifyV23ReleaseReadiness.ts` und sein Test,
`src/review/acceptance/qualityRelease.acceptance.ts` (nur `PR-CI-18` und `PR-RELEASE-17`).

### [P2-3] Sollvertrag `PR-CI-18` prüft `- uses:` nicht

`qualityRelease.acceptance.ts` filtert mit `line.trim().startsWith('uses:')`. Zeilen wie
`- uses: actions/checkout@v4` beginnen mit `- ` und werden **nicht** geprüft; ein ungepinnter
Checkout ginge grün durch. Filter auf `/^\s*(-\s+)?uses:/` ändern. Nachweis: einmal
`- uses: actions/checkout@v4` temporär einfügen, Test muss rot werden, danach zurücknehmen
(temporäre Änderung nicht committen). Ergebnis im Eintrag.

### [P2-4] Readiness misst „im aktuellen Lauf“

`scripts/verifyV23ReleaseReadiness.ts` prüft nur Existenz, nicht Frische der Artefakte
(`coverage/coverage-summary.json`, `.lighthouseci/*.json`, `playwright-report/index.html`).
Lokal würde ein altes Artefakt bestehen. Plan und Master verlangen „frische, vorhandene
Artefakte“. Artefakte, die älter als ein konfigurierbares Fenster sind (Vorschlag: 60 Minuten,
per Option/Umgebungsvariable überschreibbar), führen zu Exit ungleich 0. Tests dafür (rot vor
grün) in `scripts/__tests__/verifyV23ReleaseReadiness.vitest.ts`.

## Reihenfolge und Stopp-Punkte

1. P2-3, P2-4, P1-3 Teil B lokal umsetzen und prüfen; P2-1/P2-2 im BUILD_LOG.
2. Marc legt die Secrets an (Teil A) und bestätigt im Chat.
3. **Nur mit ausdrücklicher Freigabe von Marc:** Push des Feature-Branches, Beobachtung des
   Actions-Laufs bis `completed success`. `origin` ist öffentlich; Commit `837967a` ist vorher
   bewertet (siehe Builder-Eintrag).
4. **Erst nach grünem Lauf und weiterer Freigabe von Marc:** Ruleset anlegen, danach
   `v2.3.0-github-ruleset-baseline.json` aktualisieren (`PR-BRANCH-20`).

Kein Merge, kein Tag, kein Force-Push.

## Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm run test:coverage
npm run verify
npm test
npm run build
npm audit --omit=dev
npm audit --audit-level=high
git diff --check
git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources
```

Der Schutzbereichs-Diff muss leer sein. Nacharbeit-Abschnitt am Ende von `docs/BUILD_LOG.md`,
danach stoppen und zurück an den Reviewer.

## Akzeptanzkriterien

- Kein `chromePath` mit lokalem Pfad in `.lighthouserc.json`; der `e2e`-Job erzeugt Coverage
  vor dem Readiness-Schritt.
- `lighthouse-auth.cjs` loggt sich echt ein und bricht ohne Zugangsdaten ab; keine Werte in
  Repo, Logs oder BUILD_LOG.
- `PR-CI-18` erkennt ungepinnte `- uses:`-Zeilen (negativ nachgewiesen).
- Readiness weist alte Artefakte zurück (Test).
- BUILD_LOG und Risikonachweis geben nur belegte Aussagen wieder.
- Erst danach: grüner echter Actions-Lauf, dann Ruleset.
