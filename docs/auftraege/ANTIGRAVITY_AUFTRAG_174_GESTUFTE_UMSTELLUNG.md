# Auftrag 174 – Dashboard-Editor: Gestufte Umstellung auf den neuen Editor mit Schalter je Organisation und Rückweg (P16b)

**Ziel:** Der neue Editor wird schrittweise zum Standard: erst für eine Test-Organisation, dann für ausgewählte Organisationen, dann für alle. Jede Stufe schaltet Marc nach unabhängiger Prüfung frei. Ein Rückweg je Stufe ist vorbereitet und belegt. Der alte Editor bleibt lesbar als Sicherung; sein Code wird **nicht** entfernt (eigener Abschlussauftrag nach Masterplan §8).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P16 (§6), §8 (Rollout und Rückweg), §9.2 (Ende des V1-Rückwegs).
**Vorgelagert:** 173 (P16a) gemergt; Abnahmematrix ohne offene Befunde; Entscheidungen aus 173 §8 liegen vor.
**Baseline:** aktueller `main` nach Merge von 173.
**Branch:** `auftrag-174-gestufte-umstellung`.
**Builder:** Claude Code (von Marc am 24.11.2026 benannt). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge, Release und jede Stufenfreigabe:** Marc.
**Status:** FERTIGGESTELLT / PR ERSTELLT (T6 nach Merge).

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
4. **Ohne gültige Entscheidung keine Umstellung:** Für noch nicht auf V2 umgestellte Nutzer mit Klasse `v1_geaendert`/`beide_geaendert` gilt: Die Umstellung auf V2 wird beim Laden nur vollzogen, wenn eine Entscheidung aus 173 vorliegt und deren `(v1_revision, v2_revision)` exakt mit dem aktuellen Stand zum Umstellungszeitpunkt übereinstimmt (andernfalls bleibt der Nutzer auf V1 und Admins sehen die ungültig gewordene Entscheidung). Sobald der Nutzer erfolgreich auf V2 umgestellt ist (Dokumentation `umgestellt_at`), ist der Übergang fixiert: Nachfolgende reguläre Bearbeitungen in V2 erhöhen die V2-Revision und führen zu keinem automatischen Rückfall auf V1 mehr. Ein Rückweg auf V1 erfolgt ausschließlich organisatorisch über das Zurücksetzen der Stufe (Nr. 5).
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

- [x] **T0** Baseline, Fundstelle Organisationskontext, Prüfung ob `src/context/**` berührt werden müsste (dann Stopp).
- [x] **T1** Rot-Nachweise.
- [x] **T2** Server-Schalter.
- [x] **T3** Client-Reihenfolge, offene Entwürfe, Nutzer ohne Entscheidung.
- [x] **T4** Rückweg-Hinweis, Admin-Übersicht.
- [x] **T5** Tests, E2E, Screenshots, Doku, Pflicht-Verifikation, BUILD_LOG, PR, Review.
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

## 10. Builder-Festlegungen (Claude Code, 24.11.2026)

Festlegungen, die der Auftrag offen ließ; alle im Rahmen von §2 und §4.

1. **Kein Plattform-Admin:** Im Schema gibt es keine solche Rolle (`auth.users.is_super_admin` ist ein GoTrue-Feld, keine App-Rolle). Die Stufe ist deshalb **nur per SQL** änderbar: angemeldete Nutzer haben nur `SELECT` (eigene Organisation), keine Schreibrechte. Anleitung: `docs/dashboard/UMSTELLUNG_P16.md`.
2. **Stufensemantik:** Stufe 0 (oder keine Zeile) = alter Editor, Stufe 1–3 = neuer Editor; die Nummer dokumentiert die Welle. Stufe 3 setzt Marc per SQL für alle aktiven Organisationen (Beispiel in der Doku). Jeder Stufenwechsel setzt `aktiviert_at` und schreibt `audit_log` (`dashboard.editor_rollout_stufe`).
3. **Umstellungsregel (§2 Nr. 4) mit Marcs Entscheidung 23.11.2026:** `gleich`, `nur_v2`, `keine_kopie` und Nutzer ohne Stand werden umgestellt; `v1_geaendert` nur mit gültiger Entscheidung („Pilot behalten“ oder „Übernehmen“); `beide_geaendert` ohne Entscheidung wird umgestellt (Pilot behalten), mit „Später“ oder verfallener Entscheidung nicht. Vollzogene Umstellungen stehen in `dashboard_editor_switches` (`umgestellt_at`, Revisionen zum Zeitpunkt) und sind fixiert.
4. **Offene Ansicht (§2 Nr. 3):** Der Client lädt den Serverstand beim Öffnen (`dashboard_editor_rollout_status(true)`, vollzieht ggf. die Umstellung) und hält ihn für die Ansicht fest. Die Beobachtung (Fokus, Sichtbarkeit, alle 60 s) ruft `dashboard_editor_rollout_status(false)` auf, stellt also niemanden um, und zeigt bei Abweichung nur den Hinweis „… ab dem nächsten Öffnen …“. Bis der Stand geladen ist, zeigt die Seite einen Ladezustand statt kurz einen Editor aufblitzen zu lassen; ohne Server/Fehler gilt die Build-Variable (Standard alter Editor). Die Detailseite übernimmt den festgehaltenen Stand.
5. **Rückweg-Hinweis (§2 Nr. 5):** erscheint nur bei Nutzern, die schon umgestellt waren (`grund = rueckweg`); Datum = letzte Speicherung im alten Editor. Eingriff außerhalb des alten Editors: eine Zeile über `DashboardWorkspace` in `PersonalExecutiveDashboard.tsx`.
6. **Admin-Übersicht (§2 Nr. 7):** Abschnitt „Stand der Umstellung“ oben in „Umstellung vorbereiten“ (`dashboard_editor_rollout_overview()`, nur Admin der eigenen Organisation): Stufe, seit wann, Nutzer im neuen/alten Editor, offene Entscheidungen (dieselbe Regel wie die Umstellung). Ohne Bedienelement für die Stufe.
7. **Zusätzlich berührt (nicht in §5, für die Nachweise nötig):** `.github/workflows/ci.yml` und `scripts/runV23Acceptance.mjs` – neue E2E-Datei in der seriellen Gruppe (die Stufe von Organisation A betrifft alle ihre Nutzer, deshalb nicht parallel zu anderen Specs); `src/features/dashboard/preview/RolloutPrepPreview.tsx` – Vorschaudaten für die Übersicht.
8. **Kein Zwischenauftrag 173b:** Der Fadenkreuz-Flake ist mit #219 behoben (`c4d4a68d`).

