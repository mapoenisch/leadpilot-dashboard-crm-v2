# Auftrag 067P – Nacharbeit 5: Volatilen CRM-Zeitstempel aus Visual-Gate isolieren

## Rolle und Ziel

Du bist der **Builder**. Setze ausschließlich diese Nacharbeit um, führe die verlangten Gates
aus und dokumentiere das Ergebnis in `docs/BUILD_LOG.md`. Kein Push, Merge, Deploy,
Workflow-Dispatch oder Issue-Close.

Der Login-/Logout-Fehler aus N3/N4 ist geschlossen: PR-CI `35751368896` zählt **598/600
Playwright-Tests grün** und zeigt nirgends `AUTH_REQUIRED`. Übrig bleiben nur die Visual-Tests
`visual /crm/leads` für Desktop und Tablet. Mobile ist bereits grün.

## Belegter Root Cause

`DataSourceStatus` rendert für die echte CRM-Datenquelle einen Laufzeitwert wie
`Stand: 22.09.2026, 16:08:48`. Die versionierten Linux-Baselines enthalten dagegen den
Zeitstempel des früheren Aufnahmelaufs (beispielsweise `10:12:34`). Das Produkt und seine
Daten sind identisch; die Differenz betrifft ausschließlich die Uhrzeit. Jede künftige CI
wäre daher wieder rot.

## Erlaubter Scope

- `e2e/visual.spec.ts`
- genau die drei Baselines zu `visual /crm/leads` unter `e2e/visual.spec.ts-snapshots/`
- `docs/BUILD_LOG.md`

Produktcode, Daten, Authentifizierung, globale Playwright-Konfiguration, Workflows, sonstige
Baselines und der Schutzbereich bleiben unverändert.

## Umsetzung

1. Isoliere **nur** für die Route `/crm/leads` den Textknoten, der mit `Stand:` beginnt und
   innerhalb von `[aria-label="Status der Datenquelle"]` liegt.
2. Übergebe genau diesen Locator als Playwright-`mask` an `toHaveScreenshot`. Verwende eine
   explizite zum dunklen Surface passende `maskColor`; die Maskierung darf keine anderen
   Statuswerte, die Frischeklassifizierung oder die Datenanzahl verdecken.
3. Der Test muss den Zeitstempel weiterhin separat auf Sichtbarkeit prüfen. Seine fachliche
   Darstellung wird bereits durch die vorhandenen `DataSourceStatus`-/Provenance-Tests
   abgedeckt; nur der volatile Sekundenwert darf aus dem Pixelvergleich heraus.
4. Regeneriere **nur** die drei Linux-Baselines für `/crm/leads` (1440, 768, 375) in der
   festgelegten Ubuntu-/Chromium-Umgebung. Prüfe die drei Bilder einzeln: echte CRM-Daten,
   keine `AUTH_REQUIRED`-Fehlerseite, 0 px Overflow.

## Nachweise und Gates

- Red-Nachweis: Der CI-Befund `35751368896` mit 4.108 px (Desktop) und 2.459 px (Tablet)
  Differenz, obwohl `AUTH_REQUIRED` 0 ist.
- `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run verify`,
  `npm run test:coverage`, `npm run build`.
- `/crm/leads`-Visualtest mit allen drei Projekten, mindestens dreimal nacheinander gegen die
  aktualisierten Baselines.
- Vollständiger CI-E2E-Befehl als PR-Nachweis nach unabhängiger Prüferfreigabe.
- `git diff --check` und Schutzbereichs-Diff leer; keine Secrets in Diff oder Log.

## Abschlussbedingung

Committe lokal mit einer präzisen Nachricht und übergib an den Prüfer. **Issue #13 bleibt offen,
bis die PR-CI vollständig grün ist.**
