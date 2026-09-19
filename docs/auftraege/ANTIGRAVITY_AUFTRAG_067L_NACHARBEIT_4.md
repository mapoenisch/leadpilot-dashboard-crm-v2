# AUFTRAG 067L / Gate G58 — Nacharbeit 4 (Prüfer-Befund zu Nacharbeit 3)

**Baseline:** `b6a9c8c` + Prüfer-Commit dieses Auftrags · **Branch:** `feat/auftrag-067l-ci-ruleset`
(weiterarbeiten) · **Status:** OFFEN

Grundlage: Abschnitt „Gate G58: Unabhängiger Prüfer-Befund zu Nacharbeit 3“ am Ende von
`docs/BUILD_LOG.md`. Alles aus den früheren 067L-Aufträgen gilt weiter (Repo-Ziel, Stopp-Punkte,
Schutzbereiche, Pflicht-Verifikation).

## [P1-5] Das CI-Backend startet auf einer leeren Datenbank nicht

Ist-Stand: `ci.yml` ruft `supabase start` auf und spielt **danach** `supabase/schema.sql` ein.
`supabase start` wendet aber beim ersten Start alle Migrationen an, bevor der Workflow
`schema.sql` erreicht. Der Prüfer hat das auf einem frischen Stack (`supabase stop --no-backup`)
reproduziert: `supabase start` bricht bei `20260916_identity_and_tenant_rls.sql` ab mit
`ERROR: relation "public.companies" does not exist (SQLSTATE 42P01)`. Antigravitys lokaler Lauf
gelang nur, weil ein Stack mit Backup-Volume aus früheren Läufen wiederhergestellt wurde
(„Starting database from backup“).

**Vom Prüfer verifizierte Korrektur** (temporär lokal getestet, nichts committet): Vor
`supabase start` `supabase/schema.sql` als **früheste** Migration bereitstellen, nur im
CI-Workspace, nicht im Repo:

```
cp supabase/schema.sql supabase/migrations/20260101000000_base_schema.sql
```

Ergebnis auf frischem Stack: alle 14 Migrationen laufen durch, `seed.sql` lädt ohne Fehler
(3 Nutzer, 3 Organisationen, 2 Mitgliedschaften, 4 Companies), alle drei Seed-Logins liefern
HTTP 200 mit Access-Token.

Erwartet:
- `ci.yml`: den `cp`-Schritt vor `supabase start` einfügen, den separaten
  `psql < supabase/schema.sql`-Schritt entfernen. Seed danach (oder über `[db.seed]`, dann aber
  belegen, dass er wirklich lädt).
- `supabase/schema.sql` und `supabase/migrations/**` bleiben im Repo **unverändert**; die
  kopierte Datei darf nie committet werden (Diff-Prüfung unten).
- Der lokale Nachweis muss **immer** mit `supabase stop --no-backup` beginnen und in Eintrag und
  `docs/operations/ci-e2e-backend.md` so beschrieben sein. Die lokale Anleitung dort an dieselbe
  Reihenfolge anpassen.

## [P2-6] BUILD_LOG überzieht und diagnostiziert falsch

- Status „LOKAL NACHGEWIESEN & BEREIT FÜR REVIEW“ ist unzutreffend: 33 Playwright-Tests rot,
  LHCI-Lauf abgebrochen. Status auf „LOKAL NICHT GRÜN, Ursachen offen“ ändern.
- **LHCI-Diagnose falsch.** `puppeteer` fehlt nicht im Repo. Der Prüfer hat `npx lhci autorun` auf
  einem frischen lokalen Supabase mit Node 24 und `CHROME_PATH` erfolgreich gefahren
  (authentifiziert, `/dashboard`, **Performance 96, Accessibility 100**, kein Runtime-Fehler).
  Der Abbruch stammt vom lokalen Node 22.11.0 (kein `require(esm)` ohne Flag); das Repo pinnt
  22.18.0 (`.nvmrc`). Eintrag korrigieren und festhalten: lokale Nachweise mit der in `.nvmrc`
  gepinnten Node-Version fahren (oder mindestens Node >= 22.12).
- Danach den Eintrag nur mit belegten Aussagen neu fassen.

## [P2-7] `.lighthouseci/` fehlt in `.gitignore`

Der Ordner mit den Lighthouse-Berichten wird lokal erzeugt und ist nicht ignoriert; er wurde
beim Prüfen als untracked sichtbar. In `.gitignore` aufnehmen (`.lighthouseci/`).

## Untersuchen, nicht umgehen: die restlichen Playwright-Fehler

Der Prüfer hat auf einem frischen lokalen Supabase (Desktop-Projekt) reproduziert:

| Test | Ergebnis | Vom Prüfer belegte Ursache |
|---|---|---|
| `tenant-isolation` 1 und 2 (`Firma A1`/`Firma B1`) | rot | `loadCrmReadModel` gibt für Organisationen ungleich der Demo-Organisation `SYNTHETIC_NOT_ALLOWED` zurück, solange die aktive Quelle synthetisch ist; eine echte CRM-Quelle für Mandanten ist erst 067N/G60 geplant. Die Spec verlangt Daten, die die App aktuell nicht liefern darf. Nicht durch den Seed lösbar. |
| `a11y` `/dashboard`, `/finance/p-and-l` | rot | Axe: `[serious] scrollable-region-focusable` (1 Knoten je Route). Auch mit einem Nutzer der **Demo-Organisation** reproduziert, also ein echter Front-End-Befund und kein Seed-Effekt. |
| `routes` `/company/data-basis` | rot | Auch mit Demo-Nutzer rot; Ursache vom Prüfer nicht ermittelt. |

Nicht vom Prüfer belegt (lokal unter macOS nicht aussagekräftig): `visual.spec.ts` (Baselines
sind `-linux.png`; die neueren Linux-Baselines aus `origin/main` `837967a` fehlen im Branch) und
ein `worker-responsiveness`-Timeout (mobile-375).

Aufgabe: die Fehler je Gruppe **untersuchen und dokumentieren** (Knoten/Selektor der
Axe-Verletzung, Fehlermeldung der `routes`-Spec, Verhalten von `worker-responsiveness` in
mehreren Läufen). **Keine** Testabschwächung (`test.fixme`, `skip`, Erwartungswerte ändern,
Allowlist erweitern) und **keine** Änderung an `src/**` ohne schriftliche Freigabe von Marc.

Marc entscheidet (Ergebnis wird hier nachgetragen):
1. `tenant-isolation` 1 und 2: bis 067N/G60 zurückstellen oder ersetzen.
2. `scrollable-region-focusable`: im Front-End beheben (kleine Änderung an der betroffenen
   Komponente) oder als bekannter Befund einer späteren Aufgabe zuordnen.
3. Integration der Linux-Baselines aus `837967a` vor dem ersten Actions-Lauf.

## Entscheidungen von Marc (2026-09-19) und daraus folgende Aufgaben

Die Regel „keine Testabschwächung, keine Änderung an `src/**`“ oben gilt ab jetzt **nur noch
außerhalb** der drei folgenden ausdrücklich freigegebenen Punkte.

### E1 — `tenant-isolation` 1 und 2 zurückstellen (bis 067N/G60)
- In `e2e/tenant-isolation.spec.ts` genau die Tests „1. Org-A-Admin sieht nur eigene Companies“
  und „2. Org-B-Admin sieht nur eigene Companies“ auf `test.fixme(...)` umstellen. Testkörper
  **unverändert** lassen, nichts löschen. Test 3 bleibt aktiv.
- Kommentar an jedem: Grund (Gate G47 lässt für Nicht-Demo-Organisationen bei synthetischer
  Quelle nur `SYNTHETIC_NOT_ALLOWED` zu; echte Mandantenquelle erst 067N/G60), „in G60 wieder
  aktivieren“, und Hinweis, dass die DB-Ebene durch `supabase/tests/tenant_isolation.sql`
  (pgTAP) abgedeckt bleibt.
- Der Prüfer hat die Auflage für G60 bereits im Master-Auftrag (Abschnitt 067N) verankert.
- Erweiterte Zieldatei: `e2e/tenant-isolation.spec.ts` (nur diese zwei Tests).

### E2 — Front-End-Fix `scrollable-region-focusable` (Barrierefreiheit)
- Betroffen: `e2e/a11y.spec.ts` für `/dashboard` und `/finance/p-and-l` (Axe `serious`,
  je 1 Knoten), auch mit Demo-Nutzer reproduziert. Zusätzlich `routes.spec.ts`
  `/company/data-basis`: Ursache klären; ist es ein Front-End-Defekt derselben Art
  (Landmark/Barrierefreiheit), im selben Zug beheben, sonst berichten und stoppen.
- Vorgehen: Selektor/Komponente des Axe-Knotens im Test-Output ermitteln; minimal beheben (z. B.
  Tastaturzugriff für den scrollbaren Bereich: `tabIndex={0}` mit passender Rolle und
  zugänglichem Namen, oder Scrollcontainer vermeiden). Rot vor grün: `e2e/a11y.spec.ts` und die
  betroffene `routes`-Spec vorher rot, nachher grün, jeweils auf frischem Backend
  (`supabase stop --no-backup`), Node >= 22.12 (besser die `.nvmrc`-Version).
- **Verboten:** die bekannte-Verstöße-Liste (Allowlist) der a11y-Spec erweitern, Regeln in Axe
  abschalten, Selektoren ausschließen.
- Erlaubt: die betroffene Komponente unter `src/**` **außer** den Schutzbereichen
  (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).
  Liegt der Knoten in einem Schutzbereich: stoppen und Marc fragen.
- UI-Änderung nach `CLAUDE.md` §7: Screenshot-Harness für die betroffenen Routen (Vorher/Nachher
  auf 1440/768/375, SHA-256, 0 px horizontaler Overflow); nur die textuelle Matrix
  `docs/screenshots/auftrag-067l-g58/README.md` committen, keine Bilddateien. Erwartet ist ein
  weitgehend unsichtbarer Fix (höchstens ein Fokusring); identische Hashes sind dann zulässig
  und im Eintrag zu begründen.
- Unit-/jsdom-Gates müssen weiter grün sein (`npm test`, `npm run verify`).

### E3 — Linux-Baselines und Workflow aus `837967a` übernehmen
- `git fetch origin`, dann **cherry-pick** von `837967a` (kein Merge, kein Rebase der ganzen
  Historie). Betrifft `.github/workflows/update-visual-baselines.yml`, `playwright.config.ts`
  (`maxDiffPixelRatio: 0.001`, Begründung im Commit, Issue #12) und 7 Linux-Baseline-PNGs.
  Autor bleibt erhalten.
- Konflikt in `playwright.config.ts` mit der CI-Trace-Absicherung aus Nacharbeit 2 auflösen,
  beides behalten.
- Vom Prüfer geprüft: die drei gepinnten SHAs im übernommenen Workflow sind echt und entsprechen
  `v4.4.0`, `v4.4.0` und `v4.6.2`; der Workflow läuft nur auf Branches `visual-baselines/**` und
  nutzt keine Secrets. **Anpassungen nötig**, weil `e2e/global-setup.ts` seit der Auth-
  Umstellung einen Login verlangt:
  - denselben temporären Supabase-Backend-Ablauf wie im Job `e2e` von `ci.yml` einbauen
    (inklusive der korrigierten Reihenfolge aus P1-5 und aller `E2E_*`/`VITE_*`-Variablen),
  - `node-version: 22.18.0` statt `22.x`,
  - `permissions: contents: read`.
- Die 7 übernommenen PNGs stammen vom UI-Stand v2.2.0 und passen nicht zur umgebauten Oberfläche.
  Die Baselines müssen nach dem Push mit dem Workflow neu erzeugt werden (Branch
  `visual-baselines/<name>`, Artefakt sichtprüfen, in den Feature-Branch committen). Das ist
  **kein** Schritt für Antigravity, sondern ein Stopp-Punkt: Marc gibt den Push frei.
  Antigravity bereitet vor und beschreibt den Ablauf in `docs/operations/ci-e2e-backend.md`.
- `PR-CI-18` und die SHA-Prüfung müssen auch für den übernommenen Workflow grün bleiben.

## Stopp-Punkte (unverändert)
Kein Push, kein Ruleset, kein Actions-Lauf ohne ausdrückliche Freigabe von Marc. Der Job `e2e`
läuft nur bei `pull_request`, `workflow_dispatch` und Push auf `main`. Kein Merge, kein Tag,
kein Force-Push.

## Verifikation
Pflicht-Verifikation aus 067L, zusätzlich:
- `git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources`
  und `git diff c6d88f3 -- supabase/migrations supabase/schema.sql` müssen leer sein.
- `git status` zeigt keine `supabase/migrations/20260101000000_base_schema.sql` (nur im CI-Workspace).
- Lokaler Backend-Nachweis beginnt mit `supabase stop --no-backup`; Ergebnis: Start ohne Fehler,
  Seed geladen, drei Logins HTTP 200.

## Akzeptanzkriterien
- `ci.yml` startet das Backend auf leerer Datenbank fehlerfrei (Reihenfolge wie oben).
- BUILD_LOG: Status und LHCI-Diagnose korrigiert, nur belegte Aussagen.
- `.lighthouseci/` ignoriert.
- Untersuchungsbericht zu `worker-responsiveness` und `visual` liegt vor, ohne Testabschwächung
  außerhalb von E1 bis E3.
- E1: zwei Tests als `test.fixme` mit G60-Verweis. E2: a11y-Spec und `routes`-Spec grün, Allowlist
  unverändert. E3: `837967a` übernommen, Workflow an das lokale Backend angepasst.
- Erst nach den Entscheidungen von Marc und einer Push-Freigabe folgt der Actions-Lauf.
