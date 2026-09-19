# AUFTRAG 067L / Gate G58 — Nacharbeit 5 (Prüfer-Befund zu Nacharbeit 4, E1 bis E3)

**Baseline:** `74d7f41` + Prüfer-Commit dieses Auftrags · **Branch:** `feat/auftrag-067l-ci-ruleset`
(weiterarbeiten) · **Status:** OFFEN

Grundlage: Abschnitt „Gate G58: Unabhängiger Prüfer-Befund zu Nacharbeit 4“ am Ende von
`docs/BUILD_LOG.md`. Alles aus den früheren 067L-Aufträgen gilt weiter (Repo-Ziel, Stopp-Punkte,
Schutzbereiche, Pflicht-Verifikation, lokale Nachweise auf frischem Backend mit
`supabase stop --no-backup`, Node >= 22.12).

## [P1-6] Der Standard-E2E-Nutzer sieht auf den CRM-Seiten nur Fehlerzustände

Ist-Stand: `supabase/seed.sql` legt `admin-a@e2e.local` (`E2E_AUTH_EMAIL`, der Login aller
Specs außer `tenant-isolation`) als Mitglied der Nicht-Demo-Organisation „Organisation A (E2E)“
an. Für Organisationen ungleich `00000000-0000-0000-0000-000000000001` liefert die App bei
synthetischer Quelle fail-closed `SYNTHETIC_NOT_ALLOWED`.

Vom Prüfer belegt (Sonde auf frischem lokalen Supabase, nichts committet):

| Route | `admin-a` in Org A (wie geseedet) | `admin-a` in Demo-Org |
|---|---|---|
| `/crm/companies` | „Integritätsfehler“ / `SYNTHETIC_NOT_ALLOWED` | kein Fehler |
| `/crm/leads` | „Integritätsfehler“ / `SYNTHETIC_NOT_ALLOWED` | kein Fehler |
| `/company/data-basis` | „Integritätsfehler“ und „nicht verfügbar“ | kein Fehler |

Folge: `routes`, `a11y`, `semantic-routes` und vor allem die **Visual-Baselines** würden für
diese Seiten den Fehlerzustand prüfen bzw. festschreiben. Die Baselines aus `visual.spec.ts`
werden mit dem Workflow `update-visual-baselines.yml` mit genau diesem Nutzer erzeugt
(`visual-crm-leads-*`). Erzeugt man sie so, landen „Integritätsfehler“-Screens als Referenz im
öffentlichen Repo. Das muss **vor** der Baseline-Erzeugung behoben sein.

Erwartet:
- `supabase/seed.sql`: `admin-a@e2e.local` wird Mitglied der **Demo-Organisation**
  `00000000-0000-0000-0000-000000000001` (entsteht durch die Migration `20260920_demo_bootstrap`,
  nicht neu anlegen) mit der bisherigen Rolle. Org A und Org B bleiben für G60 erhalten;
  Kommentar im Seed, warum (Nicht-Demo-Mandanten haben bis 067N/G60 keine echte Quelle).
  `admin-b` und `nomember` bleiben wie sie sind.
- Absicherung, rot vor grün: ein automatischer Test (z. B. unter `scripts/__tests__/`), der
  `supabase/seed.sql` einliest und prüft, dass `admin-a@e2e.local` der Demo-Organisation
  zugeordnet ist. Zusätzlich lokal belegen, dass `/crm/companies`, `/crm/leads` und
  `/company/data-basis` für diesen Nutzer keinen Integritätsfehler zeigen.
- Danach die komplette nicht-visuelle E2E-Suite auf frischem Backend über alle drei Viewports
  fahren und Zahlen im Eintrag nennen (Referenz des Prüfers vor der Änderung: 544 passed,
  6 skipped, 2 failed, siehe P2-9).
- Erweiterte Zieldateien: `supabase/seed.sql`, neuer Test unter `scripts/__tests__/`,
  `docs/operations/ci-e2e-backend.md` (Beschreibung der Testnutzer).

## [P2-8] `Table.tsx`: Fokus ist unsichtbar

`src/components/ui/Table.tsx` setzt auf dem Wrapper `tabIndex={0}` **und** `focus:outline-none`.
Tailwind 3 setzt damit den Outline auf transparent und überschreibt die globale Regel
`:focus-visible { outline: 2px solid var(--color-primary) }` aus `src/styles/global.css`.
Tastaturnutzer erreichen den Bereich ohne sichtbaren Fokus (WCAG 2.4.7). Axe prüft das nicht,
daher bleibt die Spec grün.

Erwartet:
- `focus:outline-none` entfernen, damit die globale Fokusregel gilt. Sichtbarkeit lokal belegen
  (Tab auf einer Tabellenseite, Fokusrahmen sichtbar; im Eintrag beschreiben).
- Hinweis, kein Blocker: alle 37 `<Table>`-Nutzungen haben kein `ariaLabel`, alle Wrapper heißen
  „Tabelle“. Bei Seiten mit mehreren Tabellen sind die Regionsnamen doppelt. Im Eintrag als
  Folgeaufgabe vermerken (aussagekräftige Labels), nicht in diesem Gate umbauen.
- `e2e/a11y-baseline.json` bleibt leer.

## [P2-9] Zwei Specs sind unter Last nicht stabil

`persistence-multisession` (Test „Run, Re-Run und Reproduktion …“) und `worker-responsiveness`
(„UI bleibt während eines Worker-Runs bedienbar“) scheiterten im vollständigen Lauf auf
`mobile-375`. Einzeln und sequentiell (`--workers=1`) bestehen beide, zweimal hintereinander.
Mit den CI-Einstellungen (`CI=1`: 2 Worker, 1 Retry) schlug ein Lauf **trotz Retry** fehl
(`expect(locator).toBeHidden()`, „Modal schließt nach Abschluss“, 50 Ticks). Die Einschätzung
„flüchtige Lastspitze“ genügt daher nicht: Unter CI-Bedingungen ist der Job `e2e` damit
potenziell rot.

Erwartet:
- Ursache eingrenzen (`--repeat-each` mit CI-Einstellungen, Laufzeit der 50 Ticks messen).
- Ohne Abschwächung der Assertion beheben, bevorzugt in `ci.yml`: diese zwei Specs in einem
  eigenen Playwright-Schritt mit `--workers=1` fahren (die übrigen wie bisher). Timeouts nur
  erhöhen, wenn die Messung zeigt, dass die Ausführung legitim länger dauert; dann begründen.
- Belegen: mindestens 5 aufeinanderfolgende CI-nahe Läufe der beiden Specs auf `mobile-375`
  ohne Fehler.

## [P3] Kleinigkeiten
- BUILD_LOG nennt `DEMO_ORGANIZATION_ID` als `00000000-0000-4000-a000-000000000001`. Im Code
  (`src/services/data/crmReadModelService.ts`) steht `00000000-0000-0000-0000-000000000001`.
  Im Eintrag korrigieren.

## Reihenfolge und Stopp-Punkte
1. P1-6, P2-8, P2-9, P3 lokal umsetzen und belegen; Eintrag am Ende von `docs/BUILD_LOG.md`.
2. Prüfer-Review.
3. **Nur mit ausdrücklicher Freigabe von Marc:** Push. Zuerst der Feature-Branch bzw. ein Branch
   `visual-baselines/<name>` zur Erzeugung der Linux-Baselines (Artefakt sichtprüfen, dass **keine**
   Fehlerzustände abgebildet sind, dann in den Feature-Branch committen), danach Actions-Lauf
   (PR oder `workflow_dispatch`, entscheidet Marc), erst nach grünem Lauf das Ruleset.
Kein Merge, kein Tag, kein Force-Push.

## Verifikation
Pflicht-Verifikation aus 067L, zusätzlich:
- `git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources`
  und `git diff c6d88f3 -- supabase/migrations supabase/schema.sql` leer; keine
  `supabase/migrations/20260101000000_base_schema.sql` im Repo.
- Lokaler Backend-Nachweis mit `supabase stop --no-backup`, Seed automatisch (ohne separaten
  `psql`-Schritt), drei Logins HTTP 200.

## Akzeptanzkriterien
- `admin-a` ist Demo-Org-Mitglied; Seed-Test rot vor grün; keine Integritätsfehler auf den drei
  Routen; vollständige nicht-visuelle Suite über 3 Viewports mit Zahlen belegt.
- `Table.tsx` ohne `focus:outline-none`, sichtbarer Fokus belegt; `a11y-baseline.json` unverändert.
- Zwei Specs stabil unter CI-nahen Bedingungen (5 Läufe), ohne Abschwächung.
- BUILD_LOG korrigiert, nur belegte Aussagen.
