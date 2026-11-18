# Auftrag 174 – Dashboard-Editor: Gestufte Umstellung auf den neuen Editor mit Schalter je Organisation und Rückweg (P16b)

**Ziel:** Der neue Editor wird schrittweise zum Standard: erst für eine Test-Organisation, dann für ausgewählte Organisationen, dann für alle. Jede Stufe schaltet Marc nach unabhängiger Prüfung frei. Ein Rückweg je Stufe ist vorbereitet und belegt. Der alte Editor bleibt lesbar als Sicherung; sein Code wird **nicht** entfernt (eigener Abschlussauftrag nach Masterplan §8).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P16 (§6), §8 (Rollout und Rückweg), §9.2 (Ende des V1-Rückwegs).
**Vorgelagert:** 173 (P16a) gemergt; Abnahmematrix ohne offene Befunde; Entscheidungen aus 173 §8 liegen vor.
**Baseline:** aktueller `main` nach Merge von 173.
**Branch:** `auftrag-174-gestufte-umstellung`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge, Release und jede Stufenfreigabe:** Marc.
**Status:** ENTWURF.

---

## 0. Stufen (Vorschlag, Marc bestätigt in 173 §8)

| Stufe | Wer                               | Voraussetzung                                                                                    |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0     | niemand (Standard V1, wie heute)  | –                                                                                                |
| 1     | Demo-/Test-Organisation           | Merge 174, Hosted-Migrationen angewendet, Smoke durch Marc                                       |
| 2     | ausgewählte Organisationen        | Stufe 1 mindestens 7 Tage ohne offenen Fehler; Abgleich 173 für diese Organisationen entschieden |
| 3     | alle Organisationen (V2 Standard) | Stufe 2 mindestens 14 Tage ohne offenen Fehler; Marcs Release-Entscheidung                       |

## 1. Ist-Stand

- Rollout-Schalter nur global über Build-Variable bzw. Session-Storage (`model/dashboardRollout.ts`); kein Schalter je Organisation.
- Entscheidungen je Nutzer aus 173 in `dashboard_rollout_decisions`.

## 2. Soll

1. **Server-Schalter je Organisation:** Tabelle `dashboard_editor_rollout (organization_id PK, stufe INT, aktiviert_von, aktiviert_at, notiz)`; lesbar für aktive Mitglieder der eigenen Organisation, änderbar nur über SQL durch Marc bzw. RPC für einen **globalen Plattform-Admin** – existiert keine solche Rolle, ausschließlich SQL (Anleitung in der Doku). Org-Admins schalten **nicht** selbst.
2. **Client:** `isDashboardEditorV2Enabled()` berücksichtigt zusätzlich den Server-Schalter der aktiven Organisation (geladen mit dem Organisationskontext; bis zum Laden gilt V1). Session-Override für Tests bleibt. Reihenfolge: Override > Server-Schalter > Build-Variable.
3. **Offene Entwürfe:** Ein Schalterwechsel während einer offenen Bearbeitung verwirft nichts: Der Wechsel wirkt erst beim nächsten Laden des Dashboards; ein Hinweis „Der neue Editor ist ab dem nächsten Öffnen aktiv“ erscheint.
4. **Ohne gültige Entscheidung keine Umstellung:** Nutzer einer Organisation mit Klasse `v1_geaendert`/`beide_geaendert` ohne gültige Entscheidung aus 173 (oder deren V1-/V2-Revision seit der Entscheidung weitergelaufen ist, sodass `v1_revision` oder `v2_revision` abweicht) bleiben zwingend auf V1, bis eine erneute, aktuelle Entscheidung für das konkrete Revisionspaar vorliegt; Admins sehen die Liste offener bzw. ungültig gewordener Entscheidungen.
5. **Rückweg je Organisation:** Stufe zurücksetzen → V1 wieder Standard; V1 zeigt den gesicherten Stand mit Hinweis „Stand vom TT.MM.JJJJ; Änderungen im neuen Editor sind hier nicht enthalten“; V2-Daten und Revisionen bleiben; erneutes Aktivieren verliert nichts. Kein Zurückschreiben in V1 (Masterplan §8).
6. **Alarme unabhängig:** Server-Alarme laufen unabhängig von der Stufe (Masterplan §8); ein Rückweg stoppt keine Alarme – dafür Not-Aus aus 167.
7. **Beobachtung:** Admin-Ansicht zeigt je Organisation Stufe, Zeitpunkt, Anzahl Nutzer auf V1/V2, offene Entscheidungen.

## 3. Tests und Nachweise

8. pgTAP (Schalter nur per SQL bzw. Plattform-Admin; Mitglieder lesen nur eigene Organisation); Vitest (Reihenfolge der Schalter, Wechsel bei offenem Entwurf, Nutzer ohne Entscheidung bleibt V1, Rückweg-Hinweis); E2E `e2e/dashboard-rollout.spec.ts` (Organisation A Stufe 1 → V2, Organisation B V1; Rückweg A → V1 mit Hinweis; V2-Revisionen nach Rückweg vorhanden); vollständige Playwright-Suite; Screenshots (`docs/screenshots/auftrag-174/README.md`).
9. **Stufenprotokoll** `docs/dashboard/UMSTELLUNG_P16.md`: je Stufe Datum, Organisationen, Prüfer, Marcs Freigabe, Befunde. Der Builder füllt Stufe 1 nach Marcs Smoke; spätere Stufen trägt Marc bzw. der jeweilige Builder als reinen Doku-Commit nach.

## 4. Verbindliche Grenzen

Schutzbereiche unverändert; eine neue Migration; V1-Code und V1-Speicherpfad **nicht entfernen**; kein automatisches Hochstufen; keine neuen Abhängigkeiten; Tests zuerst (Schalter-Reihenfolge, Entwurf bleibt erhalten, Rückweg ohne Datenverlust).

## 5. Ziel-Dateien

| Pfad                                                                                                                                                             | Änderung        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_174_GESTUFTE_UMSTELLUNG.md`                                                                                                  | Dieser Auftrag  |
| neu Migration `2026112X_dashboard_editor_rollout.sql`, neu `supabase/tests/dashboard_editor_rollout.sql`                                                         | Server          |
| `model/dashboardRollout.ts`, Laden im Organisationskontext (Fundstelle T0; `src/context/**` nur wenn unvermeidbar – dann stoppen und Marc fragen, Schutzbereich) | Client          |
| Admin-Ansicht (Erweiterung aus 173), V1-Hinweis im alten Editor (kleinster Eingriff)                                                                             | Oberfläche      |
| Tests, E2E, Screenshots, neu `docs/dashboard/UMSTELLUNG_P16.md`, Masterplan, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                | Nachweise, Doku |

## 6. Tasks

- [ ] **T0** Baseline, Fundstelle Organisationskontext, Prüfung ob `src/context/**` berührt werden müsste (dann Stopp).
- [ ] **T1** Rot-Nachweise.
- [ ] **T2** Server-Schalter.
- [ ] **T3** Client-Reihenfolge, offene Entwürfe, Nutzer ohne Entscheidung.
- [ ] **T4** Rückweg-Hinweis, Admin-Übersicht.
- [ ] **T5** Tests, E2E, Screenshots, Doku, Pflicht-Verifikation, BUILD_LOG, PR, Review.
- [ ] **T6** Nach Merge: Stufe 1 durch Marc (SQL aus der Doku), Smoke, Eintrag im Stufenprotokoll.

## 7. Abnahme

- Umstellung je Organisation, nur durch Marc; Standard bleibt V1 bis zur Freigabe.
- Keine Änderung geht durch einen Schalterwechsel verloren; Rückweg je Stufe belegt.
- Alarme unabhängig vom Editor-Schalter.

## 8. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
supabase db reset --yes && supabase test db && npm run verify:migrations
npx playwright test
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer (sonst Stopp, siehe T0)
```

## 9. Danach (nicht Teil dieses Auftrags)

- **Entfernen des alten Editors** als eigener Abschlussauftrag mit Verwendungsnachweis, frühestens nach Stufe 3 und Marcs Entscheidung zum Ende des V1-Rückwegs (Masterplan §8, §9.2).
- **Aufbewahrung der V1-Sicherungen** ist vorher von Marc festzulegen (Masterplan §9.2).
