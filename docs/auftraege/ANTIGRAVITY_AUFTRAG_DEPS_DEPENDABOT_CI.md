# Separater Auftrag: Dependabot-PRs #189–#193 reparieren und CI dauerhaft robust machen

**Stand:** 16.11.2026

**Basis:** `main` `5f9a4b75` (Merge von PR #194, Auftrag 160).

**Branch:** `deps-dependabot-ci-reparatur`.

**Freigabe Marc (16.11.2026, mit Erteilung dieses Auftrags):** Aktualisierung der bereits vorhandenen Pakete aus den Dependabot-PRs #189, #190, #191 und #192 sowie Anhebung der Node-Version in CI und `engines` auf Node 22.23.5. **Keine neuen Pakete.** ESLint 10 (#193) wird ausdrücklich **nicht** übernommen.

**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge:** nur Marc.

**Abgrenzung:** Nur Abhängigkeiten, CI-Konfiguration und Dependabot-Konfiguration. Kein Anwendungscode, Schutzbereichs-Diff leer.

**Reihenfolge:** Vor Auftrag 161 bauen und mergen. Auftrag 161 setzt auf diesem Stand auf.

---

## 1. Befund (geprüft am 16.11.2026)

Alle fünf offenen Dependabot-PRs sind rot. Vier davon scheitern schon bei `npm ci`, deshalb sind dort alle Checks rot. Es gibt vier verschiedene Ursachen.

| PR   | Inhalt                                                                                                                                                                                                                | Fehler                                                             | Ursache                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| #189 | dev-minor-patch: `@lhci/cli` 0.15.1→0.16.1, `@playwright/test` 1.64.1→1.65.0, `@testing-library/user-event` 14.6.8→14.6.10, `fake-indexeddb` 6.2.7→6.2.8, `prettier` 3.9.10→3.10.1, `typescript-eslint` 8.72.1→8.72.2 | nur `test`: `The lockfile is out of date` (Deno)                   | **U1**                    |
| #190 | `size-limit` 13.0.3→14.3.0                                                                                                                                                                                            | `ERESOLVE`: `@size-limit/file@13.0.3` verlangt `size-limit@13.0.3` | **U2**, zusätzlich **U3** |
| #191 | prod-minor-patch: `@supabase/supabase-js` 2.118.0→2.119.0, `@tanstack/react-query` 5.105.0→5.107.1, `zustand` 5.0.16→5.1.0                                                                                            | `EUSAGE`: `Missing: proxy-agent@8.0.2 from lock file` u. a.        | **U4**                    |
| #192 | `@size-limit/file` 13.0.3→14.3.0                                                                                                                                                                                      | `ERESOLVE`: verlangt `size-limit@14.3.0`                           | **U2**, zusätzlich **U3** |
| #193 | `eslint` 9.39.5→10.14.0                                                                                                                                                                                               | `ERESOLVE`: `eslint-plugin-import@2.32.0`                          | **U5**                    |

### U1 – Deno spiegelt die Root-`package.json` in sein Lockfile

`supabase/functions/deno.lock` enthält unter `workspace.packageJson.dependencies` **alle** npm-Abhängigkeiten der Root-`package.json`, weil Deno die `package.json` im Projekt automatisch erkennt. Die Edge Functions nutzen davon nichts (einziger Import: `jsr:@std/assert`). Folge: **Jede** Änderung an `package.json` macht `deno check/test --frozen-lockfile` in CI rot, auch wenn keine Edge Function betroffen ist. Bisher wurde das bei jedem Update von Hand nachgezogen (z. B. Auftrag DEPS_VITEST_MOCKER, Zeile „deno.lock gespiegelt“).

**Lokal geprüft (Deno 2.9.8):** Mit `DENO_NO_PACKAGE_JSON=1` erzeugt Deno ein Lockfile, das nur noch `workspace.members["supabase/functions"].dependencies = ["jsr:@std/assert@1"]` enthält; `deno check … --frozen-lockfile` läuft damit grün.

### U2 – `size-limit` und `@size-limit/file` müssen gemeinsam steigen

Beide Pakete verlangen gegenseitig exakt dieselbe Version. Dependabot öffnet sie als zwei Einzel-PRs, jeder für sich ist unlösbar.

### U3 – Node 22.18.0 in CI ist zu alt

`size-limit@14.3.0` verlangt `node ^22.19.0 || ^24.5.0 || >=26.0.0`, `@lhci/cli@0.16.1` verlangt `node >=22.19.0`. CI fixiert in `ci.yml` (7×) und `update-visual-baselines.yml` (1×) `node-version: 22.18.0`, `package.json` hat `engines.node ">=22.18.0 <23"`. Aktuelle Node-22-Version: 22.23.5.

### U4 – Lockfile von Dependabot passt nicht zum npm in CI

Im Lockfile von `main` hängen unter `node_modules/puppeteer-core/node_modules/` eigene Kopien von `proxy-agent@8.0.2`, `http-proxy-agent`, `https-proxy-agent`, `pac-proxy-agent`, `socks-proxy-agent`. Grund: `@puppeteer/browsers@3.2.2` verlangt `proxy-agent >=8.0.1` als Peer, `@lhci/cli@0.15.1` bringt auf oberster Ebene aber `proxy-agent@6.5.0` mit. Dependabot hat das Lockfile mit einer anderen npm-Version erzeugt und diese verschachtelten Einträge weggelassen; das npm 10.9 in CI besteht darauf.

**Dauerhafte Lösung:** `@lhci/cli@0.16.1` (aus #189) hängt selbst an `proxy-agent ^8.0.2`. Damit verschwindet die doppelte Versionslinie und die Ursache für das abweichende Auflösen. Zusätzlich soll das Lockfile immer mit der npm-Version aus CI erzeugt werden (siehe T4).

### U5 – ESLint 10 wird von zwei Plugins noch nicht unterstützt

Geprüft am 16.11.2026 (`npm view … peerDependencies.eslint`):

| Plugin                                            | neueste Version | ESLint 10?        |
| ------------------------------------------------- | --------------- | ----------------- |
| `eslint-plugin-react`                             | 7.37.5          | **nein** (`^9.7`) |
| `eslint-plugin-import`                            | 2.32.0          | **nein** (`^9`)   |
| `eslint-plugin-react-hooks`                       | –               | ja                |
| `eslint-plugin-react-refresh`                     | –               | ja                |
| `typescript-eslint`                               | –               | ja                |
| `@eslint-community/eslint-plugin-eslint-comments` | 4.8.1           | ja                |

Ein Umstieg auf Ersatz-Plugins (`eslint-plugin-import-x`, `@eslint-react/eslint-plugin`) wären **neue Abhängigkeiten** und braucht eine eigene Freigabe. Deshalb: ESLint-Hauptversion vorerst sperren, später eigener Auftrag.

---

## 2. Soll

1. **Deno entkoppeln:** In `ci.yml` bekommen die Schritte `deno check` und `deno test` die Umgebungsvariable `DENO_NO_PACKAGE_JSON: '1'`. `supabase/functions/deno.lock` wird damit neu erzeugt und enthält danach keinen `packageJson`-Block mehr. Künftige `package.json`-Änderungen berühren das Deno-Lockfile nicht mehr.
2. **Node anheben:** `node-version: 22.23.5` in `ci.yml` (alle 7 Stellen) und `update-visual-baselines.yml`; `engines.node` auf `">=22.19.0 <23"`. `agent-review.yml` (Node 20, nur Prüfskripte ohne `npm ci` des Projekts) bleibt unverändert; falls dort doch `npm ci` läuft: angleichen und im BUILD_LOG begründen.
3. **Updates übernehmen** (ein Lockfile, erzeugt mit dem npm aus Node 22.23.5):
   - alle Pakete aus #189 und #191 in den dort genannten Versionen,
   - `size-limit` und `@size-limit/file` gemeinsam auf `^14.3.0`.
4. **Dependabot-Konfiguration** (`.github/dependabot.yml`):
   - neue Gruppe `size-limit` mit `patterns: ["size-limit", "@size-limit/*"]` **vor** den Gruppen `dev-minor-patch`/`prod-minor-patch` (ohne `update-types`, damit auch Hauptversionen gemeinsam kommen),
   - `ignore` für `eslint` und `@eslint/js` mit `update-types: ["version-update:semver-major"]`, Kommentar mit Verweis auf U5 und diesen Auftrag.
   - Builder prüft die Syntax vorab gegen die aktuelle GitHub-Doku (Context7 bzw. docs.github.com, „dependabot.yml groups/ignore“) und nennt die Quelle im BUILD_LOG.
5. **Dependabot-PRs aufräumen** (erst **nach** dem Merge durch Marc, Kommentar je PR mit Verweis auf diesen PR):
   - #189, #190, #191, #192: schließen mit „übernommen in #<dieser PR>“.
   - #193: schließen mit Begründung U5; Dependabot meldet sich dank `ignore` nicht erneut.

## 3. Verbindliche Grenzen

1. Schutzbereiche unverändert: `git diff 5f9a4b75 -- src/simulation src/types src/context src/services/data src/features/resources` leer.
2. Kein Anwendungscode unter `src/`, keine Änderung an `supabase/migrations/**` oder Edge-Function-Code.
3. Keine neuen Pakete, kein `--legacy-peer-deps`, kein `--force`, keine `overrides`.
4. `.size-limit.json`-Grenzen bleiben unverändert (Initial 180 kB, größter Chunk 250 kB). Ändert `size-limit` 14 die Messung so, dass ein Wert rot wird: stoppen, Zahlen vorher/nachher im PR nennen, Marc entscheidet.
5. Playwright 1.65 kann Pixel verändern. Abweichende visuelle Baselines **nicht** lokal überschreiben, sondern über den vorhandenen Weg `update-visual-baselines.yml` (Branch `visual-baselines/**`) und im PR begründen.

## 4. Ziel-Dateien

| Datei                                                      | Änderung                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `.github/workflows/ci.yml`                                 | `DENO_NO_PACKAGE_JSON` an den Deno-Schritten, Node 22.23.5 |
| `.github/workflows/update-visual-baselines.yml`            | Node 22.23.5                                               |
| `.github/dependabot.yml`                                   | Gruppe `size-limit`, `ignore` ESLint-Major                 |
| `package.json`                                             | Versionen aus #189/#191, `size-limit`-Paar, `engines.node` |
| `package-lock.json`                                        | neu aufgelöst                                              |
| `supabase/functions/deno.lock`                             | neu erzeugt ohne `packageJson`-Spiegel                     |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_DEPS_DEPENDABOT_CI.md` | Diese Datei (Checkboxen, Status)                           |
| `docs/BUILD_LOG.md`                                        | Builder-Eintrag, Prüfnachweis                              |

Das Root-`deno.lock` (seit `4392154e`, von keinem Workflow genutzt) bleibt unangetastet. Im BUILD_LOG als offene Frage an Marc vermerken: löschen oder behalten.

## 5. Tasks

- [ ] **T0 Einstieg:** Branch von `main` `5f9a4b75`. Node 22.23.5 lokal aktivieren (`node -v`, `npm -v` im BUILD_LOG notieren).
- [ ] **T1 Rot-Nachweis U1:** Auf `main` eine beliebige Versionsnummer in `package.json` testweise ändern, `deno check --config supabase/functions/deno.json --lock supabase/functions/deno.lock --frozen-lockfile --node-modules-dir=none supabase/functions/*/index.ts` → rot. Änderung verwerfen. Ergebnis im BUILD_LOG.
- [ ] **T2 Deno entkoppeln:** `DENO_NO_PACKAGE_JSON: '1'` in `ci.yml`, Lockfile neu erzeugen: `rm supabase/functions/deno.lock && DENO_NO_PACKAGE_JSON=1 deno check --config supabase/functions/deno.json --lock supabase/functions/deno.lock --node-modules-dir=none supabase/functions/*/index.ts`, danach `deno test` mit `--frozen-lockfile` grün (67/67 laut letztem Stand; tatsächliche Zahl eintragen). Grün-Nachweis: T1 erneut → bleibt grün.
- [ ] **T3 Node anheben:** Workflows und `engines` (2.2).
- [ ] **T4 Updates:** Versionen in `package.json` setzen, `npm install` mit npm aus Node 22.23.5. Danach `npm ci --dry-run` grün; `npm ls proxy-agent` zeigt nur noch Version 8.x; `npm ls size-limit @size-limit/file` zeigt 14.3.0.
- [ ] **T5 Dependabot-Konfiguration:** 2.4, Quelle der Syntax im BUILD_LOG.
- [ ] **T6 Verifikation:** §6 vollständig.
- [ ] **T7 Abschluss:** BUILD_LOG-Builder-Eintrag (Befund U1–U5, Bundle-Werte vorher/nachher, Schutzbereichs-Diff, offene Frage Root-`deno.lock`), PR öffnen. Nach Review: Prüfnachweis nachtragen. Nach Merge durch Marc: 2.5.

## 6. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check      # Prettier 3.10.1 kann Formatierung ändern: nur reine Formatierungs-Diffs zulassen, im BUILD_LOG nennen
npm test
npm run verify
npm run build
npm run size-limit        # Werte vorher/nachher
npx tsx scripts/verifyLiveKpiCatalog.ts
DENO_NO_PACKAGE_JSON=1 deno check --config supabase/functions/deno.json --lock supabase/functions/deno.lock --frozen-lockfile --node-modules-dir=none supabase/functions/*/index.ts
DENO_NO_PACKAGE_JSON=1 deno test --config supabase/functions/deno.json --lock supabase/functions/deno.lock --frozen-lockfile --node-modules-dir=none --allow-env --allow-net --allow-read supabase/functions/
npx playwright test       # lokal, mit 1.65
git diff 5f9a4b75 -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff --stat 5f9a4b75 -- src supabase/migrations supabase/functions/*/index.ts                       # leer
```

Zusätzlich alle sieben Pflicht-Checks in CI grün (`lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e`).

## 7. Abnahme

- Eine Änderung nur an `package.json` lässt die Deno-Schritte in CI grün (Nachweis T1/T2).
- Alle Updates aus #189–#192 sind in einem PR mit grüner CI übernommen; ESLint bleibt auf 9.
- `npm ci` in CI und lokal mit Node 22.23.5 läuft ohne Warnung zu `engines`.
- Dependabot öffnet künftig `size-limit`-Paare gemeinsam und keine ESLint-10-PRs mehr.

## 8. Offene Punkte

- **ESLint 10:** Eigener späterer Auftrag, sobald `eslint-plugin-react` und `eslint-plugin-import` ESLint 10 unterstützen, oder nach Freigabe von Ersatz-Plugins durch Marc.
- **Root-`deno.lock`:** Marc entscheidet über Löschen.
- **Dependabot-npm-Version:** Falls ein künftiger Dependabot-PR erneut `Missing: … from lock file` zeigt, das Lockfile auf dem Dependabot-Branch mit dem CI-npm neu erzeugen (`npm install --package-lock-only`) und pushen. Danach rebased Dependabot diesen PR nicht mehr automatisch; das ist hinnehmbar.
