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
- Untersuchungsbericht zu den restlichen Playwright-Fehlern liegt vor, ohne Testabschwächung.
- Erst nach den Entscheidungen von Marc und einer Push-Freigabe folgt der Actions-Lauf.
