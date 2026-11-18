# Auftrag 165 – Dashboard-Editor: Versionshistorie, Vergleich, Wiederherstellen, Import/Export (P12)

**Ziel:** Die seit P07 bei jedem Speichern abgelegten Revisionen werden in der App nutzbar. Nutzer sehen die Versionen eines Dashboards mit Zeitpunkt, Autor und Änderungshinweis, vergleichen zwei Stände als verständlichen JSON-Diff, stellen einen früheren Stand als neue Revision wieder her und tauschen Dashboards als geprüfte JSON-Datei aus. Dafür braucht der Server eine kleine Ergänzung: Heute liefert keine RPC die Konfiguration einer alten Revision.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P12 (§6), §4.A „Versionshistorie“, §5.1, §5.3 („Restore und Import verwenden denselben Prüfpfad“), §8; Gegenprüfung B2 (§9.3).
**Fachgrundlage:** [SPEICHERSTRUKTUR_REVISIONEN_P07.md](../dashboard/SPEICHERSTRUKTUR_REVISIONEN_P07.md) §2.2 (unveränderliche Revisionen), [TEAM_FREIGABEN_P11.md](../dashboard/TEAM_FREIGABEN_P11.md) §2 Rechtematrix und Oberfläche P11b, [VORLAGEN_AUSWAHL_P09B.md](../dashboard/VORLAGEN_AUSWAHL_P09B.md) (Obergrenzen, Titelregel), [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §6–§7.
**Vorgelagert:** 162/163 (P11, PR #197 und #202) und 164 (161R, PR #203, `main` `5ca516f7`). Fachlich unabhängig von 164.
**Baseline:** aktueller `main` beim Start (der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-165-versionen-import-export`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge, Hosted-Migration und Deploy:** Marc.
**Status:** IN PR (Bereit zur Abnahme).

---

## 1. Ist-Stand (geprüft auf `main` `5ca516f7`)

| Baustein         | Ist                                                                                                                                                                                                                                                                                                  | Fundstelle                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tabelle          | `dashboard_revisions` mit `revision`, `title`, **`config` (JSONB)**, `created_by_user_id`, `created_at`, `change_summary` (≤ 250 Zeichen). Leserechte über RLS für eigene persönliche und lesbare Team-Dashboards. Kein Löschen alter Stände.                                                        | `supabase/migrations/20261113_…_revisions.sql:49–71`, `20261122_dashboard_team_sharing.sql:117–129` |
| RPC Liste        | `get_dashboard_v2_revisions(p_dashboard_id)` liefert alle Revisionen absteigend, **ohne `config`**, ohne Begrenzung, Autor nur als UUID.                                                                                                                                                             | `20261122_dashboard_team_sharing.sql:588–645`                                                       |
| RPC Restore      | `restore_dashboard_revision_v2(id, target, expected)`: prüft Lese- und Schreibrecht (Team: `LP_TEAM_ACCESS_REVOKED`), erwartete Revision, setzt `id`/`title`/`scope`/`teamId`/`organizationId` neu, validiert, schreibt neue Revision „Wiederherstellung von Revision N“, Audit bei Team-Dashboards. | `20261122_dashboard_team_sharing.sql:451–586`                                                       |
| RPC Detail       | **fehlt.** Keine RPC liefert `config` einer alten Revision; ein Vergleich ist damit heute nicht möglich.                                                                                                                                                                                             | –                                                                                                   |
| Dienst           | `dashboardRevisionServiceV2.ts` (116 Zeilen): `getDashboardV2Revisions`, `restoreDashboardV2Revision`. **Nirgends in Komponenten oder Hooks verwendet**, nur in `dashboardStorageV2.vitest.ts`.                                                                                                      | `src/features/dashboard/services/`                                                                  |
| In-Memory-Pfad   | Revisionen ohne `config` (`DashboardV2RevisionRow`). **Fehler:** `restoreDashboardV2Revision` stellt im Demo-Pfad den **aktuellen** Stand (`entry.row.config`) statt des Revisionsstands wieder her; nur der Titel stammt aus der Revision.                                                          | `dashboardRevisionServiceV2.ts:68–80`, `dashboardInMemoryStoreV2.ts`                                |
| Validierung      | `validateDashboardConfigV2` (Größe ≤ 64 KiB, Version 2, erlaubte Schlüssel, ≤ 24 Kacheln, Sektionen, Abfragevertrag); Server zusätzlich `dashboard_config_v2_invalid_reason`. `metadata` erlaubt beliebige Zusatzschlüssel.                                                                          | `model/dashboardConfigV2.ts:86–175`                                                                 |
| Konfiguration    | Enthält Bezugsfelder `id`, `ownerUserId`, `organizationId`, `scope`, `teamId`, `metadata` (Migrationsflags), `createdAt`/`updatedAt`. Keine KPI-Werte, keine Secrets.                                                                                                                                | `model/dashboardConfigV2.ts:102–118`                                                                |
| Datei-Download   | Muster für Blob-Download vorhanden.                                                                                                                                                                                                                                                                  | `src/services/crm/crmExportService.ts`                                                              |
| Grenzdateien     | `EditorTopBarV2.tsx` **395** Zeilen, `useDashboardSelection.ts` **396**, `DashboardSwitcherV2.tsx` 363, `DashboardSwitcherMenuV2.tsx` 356, `NewDashboardDialogV2.tsx` 349, `DashboardEditorShellV2.tsx` 328, `dashboardStorageV2.ts` 387.                                                            | `components/editor/`, `selection/`, `services/`                                                     |
| Rechte im Client | `canWrite` aus `load_dashboard_v2` / `list_accessible_dashboards_v2`, Leseansicht seit 163.                                                                                                                                                                                                          | `hooks/dashboardV2Access.ts`, `ReadOnlyNoticeV2`                                                    |
| Bundle           | Initial-JS **179,12 kB** gzip (BUILD_LOG 164), Grenze 180 kB – nur **0,88 kB** Spielraum.                                                                                                                                                                                                            | `.size-limit.json`                                                                                  |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich)

1. **Revisionen bleiben unveränderlich.** Kein Löschen, Kürzen oder Überschreiben alter Stände. Wiederherstellen erzeugt immer eine **neue** Revision an der Spitze (vorhandener Server-Pfad).
2. **Der Server entscheidet die Rechte.** Versionen ansehen, vergleichen und exportieren darf, wer das Dashboard lesen darf. Wiederherstellen nur bei `canWrite`. Der Client blendet nur aus, was der Server ohnehin verweigert.
3. **Wiederherstellen schützt den Entwurf.** Ist der Entwurf ungespeichert, fragt ein Dialog vorher: „Du hast ungespeicherte Änderungen. Beim Wiederherstellen gehen sie verloren.“ Optionen „Entwurf als persönliche Kopie sichern und wiederherstellen“, „Verwerfen und wiederherstellen“, „Abbrechen“. Nach Erfolg lädt der Editor den neuen Serverstand; `isDirty` ist `false`, Undo-Verlauf leer.
4. **Fehlerreihenfolge wie Server:** Rechteentzug (`team_zugriff_entzogen` → bestehender `TeamAccessRevokedDialogV2`) vor Konflikt (`konflikt` → bestehender `DashboardConflictDialogV2`) vor `nicht_gefunden` (Revision oder Dashboard) vor `ungueltig`.
5. **Export enthält keine Bezüge und keine Rechte.** Die Exportdatei enthält nur die Darstellung: Titel, Kacheln, Sektionen, Zeitraum, Pipeline, Variablen. **Entfernt** werden `id`, `ownerUserId`, `organizationId`, `scope`, `teamId`, `metadata`, `createdAt`, `updatedAt`. Keine KPI-Werte, keine Nutzer-IDs, keine E-Mail-Adressen, keine Teamnamen.
6. **Import legt immer ein neues Dashboard an.** Nie Überschreiben eines vorhandenen Dashboards. Ziel „Persönlich“ oder ein Team mit `canWrite` (wie Neu-Dialog seit 163). Bezugsfelder werden aus der Sitzung gesetzt, nie aus der Datei übernommen. Obergrenzen (20 persönliche, 50 je Team) und die Titelregel (`buildDerivedDashboardTitle`, ≤ 80 Zeichen) gelten unverändert; Fehler erscheinen mit den vorhandenen Texten.
7. **Import prüft doppelt.** Erst im Client (Umschlag, Größe, `validateDashboardConfigV2`), dann der Server beim Anlegen (`dashboard_config_v2_invalid_reason`). Kacheln mit unbekannter oder inaktiver Katalog-ID werden in der Vorschau namentlich aufgelistet; der Import ist dann gesperrt mit Hinweis „Diese Datei enthält Kacheln, die es in dieser App nicht gibt.“ Keine stille Reparatur.
8. **Vergleich ist strukturell, nicht textuell.** Kacheln und Sektionen werden über ihre `id` zugeordnet, nicht über die Position im Array. Zeitstempel und Bezugsfelder aus Nr. 5 werden im Vergleich ignoriert.
9. **Autor mit Namen für alle Leser (Entscheidung Marc, 18.11.2026).** Jeder, der das Dashboard lesen darf, sieht, wer eine Version gespeichert hat. Eigene Revisionen heißen „Du (<Name>)“. Die App speichert heute **keine Anzeigenamen**, nur die Login-E-Mail; als Name gilt deshalb vorerst die E-Mail-Adresse. Der Server liefert dafür ein Feld `created_by_name`, damit ein späterer Namensauftrag (§8) nur die Serverseite ändern muss. Ist der Autor nicht mehr aktives Mitglied der Organisation, steht hinter dem Namen „(ehemalig)“. Gibt es den Nutzer gar nicht mehr, heißt es „Gelöschtes Konto“.
10. **Ohne Server (Demo/In-Memory):** Historie, Vergleich, Wiederherstellen, Export und Import funktionieren für persönliche Dashboards über den In-Memory-Pfad. Der Restore-Fehler aus §1 wird dabei behoben.

### 2.2 Server (kleine Ergänzung, keine Änderung bestehender RPCs)

11. Neue Migration `supabase/migrations/20261123_dashboard_revision_detail.sql` mit genau zwei neuen RPCs, beide `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`, Leseprüfung **wortgleich** zu `get_dashboard_v2_revisions` (persönlich: Eigentümer; Team: `dashboard_team_can_read`; sonst `LP_DASHBOARD_NOT_FOUND`):
    - `list_dashboard_v2_revisions_page(p_dashboard_id UUID, p_before_revision INTEGER DEFAULT NULL, p_limit INTEGER DEFAULT 50)` → `revision, title, created_by_user_id, created_by_is_self BOOLEAN, created_by_name TEXT, created_by_active BOOLEAN, created_at, change_summary`, absteigend, `p_limit` auf 1–100 begrenzt (sonst `LP_DASHBOARD_INVALID`). `created_by_name` = E-Mail aus `auth.users` für jeden Leser des Dashboards (2.1 Nr. 9), `NULL`, wenn das Konto nicht mehr existiert (`LEFT JOIN`). `created_by_active` = Autor ist aktives Mitglied dieser Organisation. Die Funktion gibt **nur** Namen von Autoren dieses einen Dashboards heraus, keine weiteren Nutzerdaten.
    - `get_dashboard_v2_revision_detail(p_dashboard_id UUID, p_revision INTEGER)` → `revision, title, config, created_by_user_id, created_at, change_summary`; fehlt die Revision: `LP_REVISION_NOT_FOUND` (wie Restore).
12. `get_dashboard_v2_revisions` und `restore_dashboard_revision_v2` bleiben **unverändert**. Keine Tabellen-, Policy- oder Grant-Änderung an bestehenden Objekten.
13. pgTAP: neue Datei `supabase/tests/dashboard_revision_detail.sql` (Vorbild `dashboard_team_sharing.sql`): eigenes persönliches Dashboard lesbar; fremdes persönliches nicht (`LP_DASHBOARD_NOT_FOUND`); Team-Dashboard für Mitglied lesbar, für Nicht-Mitglied und fremde Organisation nicht; Viewer-Mitglied darf lesen; Paging (`p_before_revision`, `p_limit` 0/101 abgewiesen); `created_by_name` für Viewer-, Manager- und Admin-Leser gleich gefüllt, für gelöschtes Konto `NULL`; `created_by_is_self`; `created_by_active` nach Sperren des Autors `false`; Detail liefert die Konfiguration genau dieser Revision; unbekannte Revision `LP_REVISION_NOT_FOUND`; `anon` ohne Ausführungsrecht.

### 2.3 Dienste und Modell

14. `dashboardRevisionServiceV2.ts` erhält `listDashboardV2RevisionsPage` und `getDashboardV2RevisionDetail` (Muster der vorhandenen Funktionen, Fehler über `classifyDashboardV2Error`, `server_funktion_fehlt` wird durchgereicht wie in 163 §2.8). `LP_REVISION_NOT_FOUND` → `nicht_gefunden`. Die Datei bleibt ≤ 400 Zeilen, sonst Aufteilung in `dashboardRevisionQueriesV2.ts`.
15. In-Memory: Revisionen speichern intern zusätzlich die Konfiguration (eigener interner Typ, `DashboardV2RevisionRow` bleibt unverändert für bestehende Aufrufer). Restore im Demo-Pfad nutzt die Konfiguration der Zielrevision und schreibt den Änderungshinweis wortgleich zum Server („Wiederherstellung von Revision N“). Bestehende Tests in `dashboardStorageV2.vitest.ts` werden ergänzt, nicht umgeschrieben.
16. Neu `model/dashboardConfigDiff.ts`: reine Funktion `diffDashboardConfigsV2(alt, neu)` → Liste von Änderungen `{ bereich: 'dashboard' | 'kachel' | 'sektion', id?, label, art: 'hinzugefuegt' | 'entfernt' | 'geaendert', pfade: { pfad, alt, neu }[] }`. Zuordnung über `id` (2.1 Nr. 8), Positionswechsel als „verschoben“ innerhalb von `geaendert`. Dazu `summarizeDiffV2` für eine deutsche Kurzfassung („2 Kacheln hinzugefügt, 1 geändert, Titel geändert“). Keine neue Bibliothek.
17. Neu `model/dashboardExchangeV2.ts`:
    - `buildDashboardExportV2(config, { sourceRevision })` → Umschlag `{ format: 'leadpilot-dashboard', formatVersion: 1, exportedAt, sourceRevision, dashboard }`, `dashboard` ohne die Felder aus 2.1 Nr. 5. Dateiname `leadpilot-dashboard-<titel-slug>-r<revision>.json` (Slug nur `a–z0–9-`, ≤ 60 Zeichen).
    - `parseDashboardImportV2(text, session)` → `{ ok: true, config, warnungen } | { ok: false, grund }`. Prüft: Text ≤ 128 KiB vor dem Parsen; gültiges JSON; `format`/`formatVersion` exakt; **Schlüssel `__proto__`, `constructor`, `prototype` an jeder Stelle führen zur Ablehnung**; setzt `id` (neu), `ownerUserId`, `organizationId`, `scope`, `teamId` aus Sitzung/Ziel, `metadata: {}`; danach `validateDashboardConfigV2`; danach Katalogprüfung jeder Kachel über `getCatalogEntry` (2.1 Nr. 7). Gründe als deutsche Texte an einer Stelle.
    - Export und Import sind zueinander verlustfrei: `parse(build(x))` ergibt bis auf Bezugsfelder dieselbe Darstellung (Test).

### 2.4 Oberfläche

18. **Einstieg:** In der Kopfleiste ein Menüpunkt „Versionen“ (Tastatur erreichbar, `data-testid="editor-open-versions"`), auch in der Leseansicht. **`EditorTopBarV2.tsx` darf nicht wachsen** (395 Zeilen): Der Builder lagert vorher passenden Code aus (z. B. das Aktionsmenü in `topbar/EditorTopBarActionsV2.tsx`) und weist die Zeilenzahlen im BUILD_LOG nach. `DashboardEditorShellV2.tsx` wächst höchstens um 15 Zeilen.
19. **Versionsbereich** `components/editor/versions/RevisionHistoryPanelV2.tsx` (nachgeladen, Seitenleiste ab 768 px, Vollbild-Dialog unter 768 px): Liste mit Revision, Zeitpunkt (Europe/Berlin, relativ + absolut), Autor (2.1 Nr. 9), Änderungshinweis, Badge „aktuell“ an der neuesten. „Weitere laden“ über Paging (50 je Seite). Aktionen je Eintrag: „Mit aktuellem Stand vergleichen“, „Exportieren“, „Wiederherstellen“ (nur `canWrite`, nicht an der aktuellen Revision). Zusätzlich oben: „Zwei Versionen vergleichen“ (Auswahl von zwei Einträgen) und „Aktuellen Stand exportieren“.
20. **Vergleich** `versions/RevisionDiffViewV2.tsx` (nachgeladen): Kopf „Revision A ↔ Revision B“ mit Kurzfassung (2.3 Nr. 16), darunter Gruppen Dashboard / Sektionen / Kacheln mit Kachel-Titel aus dem Katalog, je Änderung aufklappbar die Pfade mit Alt/Neu-Werten als formatiertes JSON. Farbe **nie allein**: zusätzlich Text „hinzugefügt/entfernt/geändert“ und Symbol. Ist der Entwurf ungespeichert, gibt es zusätzlich „Mit meinem Entwurf vergleichen“. Keine Änderungen → „Keine inhaltlichen Unterschiede.“
21. **Wiederherstellen** `versions/RestoreRevisionDialogV2.tsx` (nachgeladen): Bestätigung „Revision N wird als neue Version M gespeichert. Ältere Versionen bleiben erhalten.“ plus Entwurfsschutz (2.1 Nr. 3). Bei Team-Dashboards zusätzlich „Alle Mitglieder von ‚<Teamname>‘ sehen danach diesen Stand.“
22. **Import** `selection/ImportDashboardDialogV2.tsx` (nachgeladen), Einstieg „Aus Datei importieren …“ im Dashboard-Auswahlmenü neben „Neu“. Ablauf: Datei wählen (nur `.json`, auch per Ziehen) → Vorschau (Titel editierbar, Anzahl Kacheln/Sektionen, Warnungen, gesperrte Kacheln) → Ziel wählen (2.1 Nr. 6) → „Importieren“ → neues Dashboard wird geöffnet. **`useDashboardSelection.ts` (396) und `DashboardSwitcherV2.tsx` wachsen nicht**; Import-Zustand in eigenem Hook `selection/useDashboardImport.ts`.
23. Fehlertexte für Versionen, Vergleich, Wiederherstellen und Import an **einer** Stelle (`model/dashboardVersionMessages.ts`), Deutsch, ohne Fachjargon; vorhandene Texte aus `dashboardTeamMessages.ts` wiederverwenden, nicht duplizieren.
24. **Rückfall ohne Hosted-Migration:** Liefern die neuen RPCs `server_funktion_fehlt`, zeigt der Versionsbereich die Liste über das vorhandene `get_dashboard_v2_revisions` (ohne Paging, Autor nur „Du“ bzw. „Anderes Mitglied“, weil die alte RPC keine Namen liefert), Vergleich und Export alter Revisionen sind ausgeblendet mit Hinweis „Versionsvergleich ist nach dem nächsten Server-Update verfügbar.“ Wiederherstellen, Export des aktuellen Stands und Import funktionieren weiter (bestehende RPCs).

### 2.5 Vorschau, Tests, Leistung

25. **Vorschau-Szenario** `dashboard-vorschau.html?bereich=editor_v2&versionen=1`: `DashboardEditorPreviewV2` legt über den In-Memory-Pfad ein Dashboard mit vier Revisionen an (Kachel hinzugefügt, Kachel verschoben, Titel geändert, Sektion hinzugefügt). Optional `&teams=1` kombinierbar (Leseansicht ohne Wiederherstellen).
26. **Vitest** (Tests zuerst): Diff (Zuordnung über `id`, Verschieben, Hinzufügen/Entfernen, Ignorieren der Bezugsfelder, Kurzfassung); Export (Felder entfernt, Dateiname, Slug); Import (alle Ablehnungsgründe aus 2.3 Nr. 17 einzeln, Bezugsfelder aus Sitzung, unbekannte Katalog-ID sperrt, Rundlauf Export→Import); Dienste (Abbildung, Fehlerarten, `server_funktion_fehlt`, In-Memory-Restore nutzt Revisionsstand); Versionsbereich (Autorenanzeige „Du (…)“, fremder Name, „(ehemalig)“, „Gelöschtes Konto“, kein „Wiederherstellen“ bei `canWrite === false` und an der aktuellen Revision, Paging, Rückfall 2.4 Nr. 24); Wiederherstellen-Dialog (Entwurfsschutz, Teamtext, Fehlerreihenfolge 2.1 Nr. 4); Import-Dialog (Vorschau, Ziele, Obergrenze).
27. **E2E Vorschau** `e2e/dashboard-versions-preview.spec.ts`: Versionen öffnen, zwei Revisionen vergleichen (sichtbare Kurzfassung), Revision 2 wiederherstellen → neue Revision 5 oben, alte Revisionen weiter sichtbar; Export herunterladen und dieselbe Datei importieren → neues Dashboard in der Auswahl; manipulierte Datei (unbekannte Katalog-ID) wird mit Hinweis abgelehnt.
28. **E2E mit lokalem Supabase** `e2e/dashboard-versions.spec.ts` nach Vorbild `team-dashboards.spec.ts`: Manager speichert ein Team-Dashboard dreimal; Viewer sieht die Versionen, vergleicht, exportiert, sieht kein „Wiederherstellen“, aber den Namen des Managers als Autor; Manager stellt Revision 1 wieder her, Viewer sieht nach Neuladen den Stand. Aufräumen und Rollen-Rücksetzung im `afterAll` nach dem in 163 korrigierten Muster (Variablen im `describe`-Scope).
29. **Bestehende E2E** (`personal-dashboard*.spec.ts`, `editor-*.spec.ts`, `team-dashboards*.spec.ts`, `a11y.spec.ts`, `visual.spec.ts`) bleiben grün. Visuelle Baselines nur über `visual-baselines/**`, falls die Kopfleiste sichtbar wechselt; Begründung im BUILD_LOG.
30. **Bundle:** Initial-JS höchstens **+0,5 kB** gzip und unter 180 kB (Ausgangswert 179,12 kB). Im Initial-Chunk darf nur der Einstieg „Versionen“/„Aus Datei importieren …“ landen. Versionsbereich, Vergleich, Dialoge, Diff- und Austauschmodell liegen in nachgeladenen Chunks. `size-limit` vorher/nachher im BUILD_LOG.
31. **Leistung:** Der Vergleich zweier Konfigurationen mit 24 Kacheln und 6 Sektionen dauert in Vitest unter 20 ms (Messung mit `performance.now()`, Mittel aus 20 Läufen, Ergebnis im BUILD_LOG).
32. **Screenshots** (lokal, nur README-Matrix committen, `docs/screenshots/auftrag-165/README.md`): Versionsbereich, Vergleich, Wiederherstellen-Dialog mit Entwurfsschutz, Import-Vorschau mit gesperrter Kachel, Leseansicht mit Versionsbereich – jeweils 1440/768/375 px, Vorher/Nachher-Hashes verschieden, 0 px horizontaler Überlauf.

### 2.6 Dokumentation

33. Neu `docs/dashboard/VERSIONEN_AUSTAUSCH_P12.md`: Rechtematrix Versionen/Vergleich/Restore/Export/Import, Exportformat `formatVersion 1` mit Beispiel, Ablehnungsgründe, Autorenanzeige, Rückfall ohne Migration, Aufbewahrungsregel nach Entscheidung Marc vom 18.11.2026 (§8, noch nicht umgesetzt).
34. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Umsetzungsstand P12“; §9.2 Zeile „Aufbewahrung von Konfigurationsversionen …“: datierter Vermerk „Für Konfigurationsversionen entschieden am 18.11.2026 (Marc), Regel siehe Auftrag 165 §8; Umsetzung offen“. Nichts umschreiben.
35. `SPEICHERSTRUKTUR_REVISIONEN_P07.md`: datierter Nachtrag zu den zwei neuen RPCs und zum behobenen In-Memory-Restore.
36. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Import legt immer neu an, Export ohne Bezugsfelder, struktureller Diff über `id`, Autorenname für alle Leser, vorerst E-Mail als Name).
37. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 165; `docs/BUILD_LOG.md` Builder-Eintrag mit Deployment-Hinweis (2.7).

### 2.7 Deployment-Reihenfolge

38. Erst Migration `20261123_dashboard_revision_detail.sql` auf Hosted, dann App. Fehlt die Migration, greift der Rückfall aus 2.4 Nr. 24; die App bleibt nutzbar.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Server nur additiv:** genau eine neue Migration und eine neue pgTAP-Datei (2.2). Bestehende Migrationen, RPCs, Policies, Grants und Tests in `supabase/**` bleiben unverändert (`supabase test db` vorher/nachher, Anzahl der Tests im BUILD_LOG).
3. **Keine Rechtelogik im Client** über 2.1 Nr. 2 hinaus; `src/auth/permissions.ts` unverändert.
4. **Persönliche Dashboards und Team-Freigaben verhaltensgleich** außerhalb der neuen Einstiege; bestehende Tests bleiben unverändert grün.
5. **V1-Pfad unverändert** (V1-Editor, `dashboardPresets.ts`, `dashboardRollout.ts`, V1-Teile von `PersonalExecutiveDashboard.tsx`).
6. `src/features/dashboard/data`, `src/services/liveKpi`, `src/domain`, `crmRepository.ts`, `supabase/functions` unverändert.
7. **Keine neuen Abhängigkeiten** (kein Diff-, JSON- oder Datei-Paket). Bestehende Bausteine (`Button`, `Badge`, Dialog-Muster aus `selection/`, Blob-Download nach `crmExportService.ts`) wiederverwenden.
8. **`max-lines` 400** für alle neuen und geänderten TS/TSX/SQL-Dateien außer der Migration; `EditorTopBarV2.tsx`, `useDashboardSelection.ts`, `DashboardSwitcherV2.tsx` wachsen nicht.
9. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) Vitest `diffDashboardConfigsV2` ordnet verschobene Kachel über `id` zu → heute rot (Modul fehlt); (b) Vitest Export entfernt `ownerUserId`/`organizationId` → heute rot; (c) Vitest Import lehnt `__proto__` ab → heute rot; (d) Vitest In-Memory-Restore liefert Revisionsstand statt aktuellem Stand → heute rot (Fehler aus §1); (e) pgTAP Detail-RPC für fremdes persönliches Dashboard abgewiesen → heute rot (RPC fehlt).
10. **Barrierefreiheit:** Versionsliste als Liste mit beschrifteten Aktionen, Dialoge mit Fokusfalle/Escape/Fokusrückgabe wie bestehende, Diff mit Text statt nur Farbe, Datei-Auswahl auch ohne Ziehen bedienbar; `a11y.spec.ts` ohne neue Verstöße gegenüber `a11y-baseline.json`.
11. **Keine Secrets**, keine Hosted-Änderung durch den Builder. Importierte Dateien werden nie als Code ausgeführt, nie per `innerHTML` angezeigt.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                                                                                                                                               | Änderung                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_165_VERSIONEN_VERGLEICH_IMPORT_EXPORT.md`                                                                                                                                                                                                                      | Dieser Auftrag (Checkboxen, Status)               |
| neu `supabase/migrations/20261123_dashboard_revision_detail.sql`, neu `supabase/tests/dashboard_revision_detail.sql`                                                                                                                                                                               | Server-Ergänzung (2.2)                            |
| `src/features/dashboard/services/dashboardRevisionServiceV2.ts` (ggf. neu `dashboardRevisionQueriesV2.ts`), `services/dashboardStorageV2Types.ts` (nur neue Ergebnis-Typen), `services/dashboardInMemoryStoreV2.ts`, `services/dashboardStorageV2.ts` (nur In-Memory-Revisionen mit Konfiguration) | Dienste, Demo-Restore (2.3 Nr. 14–15)             |
| neu `src/features/dashboard/model/dashboardConfigDiff.ts`, `model/dashboardExchangeV2.ts`, `model/dashboardVersionMessages.ts`                                                                                                                                                                     | Diff, Austausch, Texte (2.3, 2.4 Nr. 23)          |
| neu `components/editor/versions/*` (`RevisionHistoryPanelV2.tsx`, `RevisionDiffViewV2.tsx`, `RestoreRevisionDialogV2.tsx`, ggf. `useRevisionHistory.ts`)                                                                                                                                           | Versionsbereich (2.4 Nr. 19–21)                   |
| `components/editor/EditorTopBarV2.tsx`, neu `components/editor/topbar/*` (Auslagerung), `DashboardEditorShellV2.tsx`                                                                                                                                                                               | Einstieg „Versionen“ (2.4 Nr. 18)                 |
| `components/editor/selection/DashboardSwitcherMenuV2.tsx`, neu `selection/ImportDashboardDialogV2.tsx`, neu `selection/useDashboardImport.ts`                                                                                                                                                      | Import (2.4 Nr. 22)                               |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx` (nur V2-Verdrahtung)                                                                                                                                                                                                                 | Dialoge einhängen                                 |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`, ggf. neu `preview/previewRevisions.ts`                                                                                                                                                                                              | Vorschau-Szenario (2.5 Nr. 25)                    |
| `src/features/dashboard/__tests__/*` (neu bzw. ergänzt)                                                                                                                                                                                                                                            | Vitest (2.5 Nr. 26, 31)                           |
| neu `e2e/dashboard-versions-preview.spec.ts`, neu `e2e/dashboard-versions.spec.ts`                                                                                                                                                                                                                 | E2E (2.5 Nr. 27–28)                               |
| neu `scripts/captureAuftrag165GateScreenshots.mjs`, neu `docs/screenshots/auftrag-165/README.md`                                                                                                                                                                                                   | Screenshot-Harness und Matrix (2.5 Nr. 32)        |
| neu `docs/dashboard/VERSIONEN_AUSTAUSCH_P12.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `SPEICHERSTRUKTUR_REVISIONEN_P07.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                         | Doku, Status, Builder-Eintrag, Prüfnachweis (2.6) |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [x] **T0 Einstieg:** Baseline festlegen, Ist-Tabelle §1 prüfen, Zeilenzahlen der Grenzdateien, `size-limit` und Anzahl pgTAP-Tests als Ausgangswert notieren, lokale Supabase starten (`supabase start`, `supabase db reset`).
- [x] **T1 Rot-Nachweise:** §3 Nr. 9 (a)–(e), Ergebnisse im BUILD_LOG.
- [x] **T2 Server:** Migration und pgTAP (2.2), `supabase test db` grün, bestehende Tests unverändert.
- [x] **T3 Dienste und In-Memory-Restore:** 2.3 Nr. 14–15.
- [x] **T4 Diff-Modell:** 2.3 Nr. 16, Leistungsmessung 2.5 Nr. 31.
- [x] **T5 Austausch-Modell:** 2.3 Nr. 17, Rundlauf-Test.
- [x] **T6 Auslagerung ohne Verhaltensänderung:** Kopfleiste, ggf. Auswahl-Hook; bestehende Tests unverändert grün, Zeilenzahlen nachweisen.
- [x] **T7 Versionsbereich und Vergleich:** 2.4 Nr. 18–20, Autorenanzeige, Paging, Rückfall 2.4 Nr. 24.
- [x] **T8 Wiederherstellen:** 2.4 Nr. 21, Entwurfsschutz, Fehlerreihenfolge.
- [x] **T9 Export und Import:** 2.4 Nr. 19 (Export), Nr. 22 (Import).
- [x] **T10 Vorschau-Szenario und E2E:** 2.5 Nr. 25, 27–29.
- [x] **T11 Bundle- und A11y-Gegenprobe:** `size-limit` vorher/nachher, `a11y.spec.ts`.
- [x] **T12 Screenshots:** 2.5 Nr. 32.
- [x] **T13 Doku:** 2.6.
- [x] **T14 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag inklusive Deployment-Anleitung für Marc (erst Migration 20261123 auf Hosted, dann App; Smoke im Browser: Dashboard zweimal speichern, „Versionen“ öffnen, Revision 1 mit aktuellem Stand vergleichen, Revision 1 wiederherstellen und neue Revision oben sehen, aktuellen Stand exportieren und die Datei als neues persönliches Dashboard importieren), PR öffnen, Review anfordern.

## 6. Abnahme

- Die Versionsliste zeigt alle Revisionen eines lesbaren Dashboards mit Zeitpunkt, Autor nach 2.1 Nr. 9 und Änderungshinweis; „Weitere laden“ funktioniert.
- Zwei Revisionen oder Revision und Entwurf lassen sich vergleichen; verschobene Kacheln erscheinen als „verschoben“, nicht als „entfernt + hinzugefügt“.
- Wiederherstellen legt eine neue Revision an, alte bleiben sichtbar; ein ungespeicherter Entwurf geht nicht unbemerkt verloren; Viewer sehen kein „Wiederherstellen“.
- Die Exportdatei enthält keine IDs von Nutzer, Organisation, Team oder Dashboard; Import derselben Datei legt ein neues Dashboard an und überschreibt nichts.
- Manipulierte Dateien (fremdes Format, `__proto__`, unbekannte Kachel, zu groß, ungültiges JSON) werden mit verständlichem Grund abgelehnt.
- Ohne Server funktioniert alles für persönliche Dashboards; der Demo-Restore stellt den richtigen Stand her.
- Ohne Hosted-Migration bleibt die App nutzbar (Rückfall 2.4 Nr. 24).
- Schutzbereichs-Diff leer, bestehende `supabase/**` unverändert, V1 unverändert, keine neuen Abhängigkeiten, Initial-Bundle ≤ +0,5 kB und unter 180 kB.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npx size-limit
supabase test db              # bestehende Tests + neue Datei grün
npx tsx scripts/verifyLiveKpiCatalog.ts
npx playwright test e2e/dashboard-versions-preview.spec.ts e2e/dashboard-versions.spec.ts e2e/team-dashboards*.spec.ts e2e/personal-dashboard*.spec.ts e2e/editor-*.spec.ts e2e/a11y.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> --stat -- supabase   # nur die zwei neuen Dateien
git diff <baseline> -- src/auth src/services/liveKpi src/services/db/crmRepository.ts src/domain src/features/dashboard/data   # leer
```

CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Hosted-Migration:** Ohne Migration 20261123 greift der Rückfall aus 2.4 Nr. 24. Marc wendet die Migration vor dem Deploy an.
- **Aufbewahrung der Revisionen – Entscheidung Marc vom 18.11.2026 (Vorschlag angenommen):** Masterplan §9.2 verlangt eine Regel; sie gilt ab jetzt wie folgt. **165 löscht trotzdem nichts**; die Umsetzung kommt in einem eigenen, späteren Server-Auftrag:
  1. Jedes Dashboard behält **immer seine letzten 100 Versionen**, egal wie alt.
  2. Ältere Versionen werden erst gelöscht, wenn sie **zusätzlich älter als 12 Monate** sind (beide Bedingungen nötig).
  3. Revision 1 (Anlage bzw. V1-Kopie) und jede Version, die als Ausgangspunkt einer Wiederherstellung gedient hat, bleiben dauerhaft.
  4. Das Aufräumen läuft auf dem Server (geplanter Job), nie im Browser, und schreibt einen Eintrag ins Audit-Log mit Anzahl und Zeitraum.
  5. Die Versionsliste zeigt am Ende „Ältere Versionen wurden nach der Aufbewahrungsregel entfernt.“, wenn gelöscht wurde.
     Begründung: Eine Konfiguration hat höchstens 64 KiB, typisch 5–15 KiB. 100 Versionen sind also höchstens rund 6,4 MB je Dashboard, meist unter 1,5 MB. Zwölf Monate decken einen vollen Geschäftsjahres-Vergleich ab; die Mindestzahl 100 schützt selten bearbeitete Dashboards davor, ihre Geschichte zu verlieren. Ausführungsweg (pg_cron oder Edge Function) wird mit dem Alarm-Worker aus P13 gemeinsam entschieden.
- **Echte Anzeigenamen (Folgeauftrag):** Die App speichert keine Namen, nur E-Mails. 165 zeigt deshalb die E-Mail als Namen (2.1 Nr. 9). Ein kleiner Folgeauftrag kann ein Feld „Anzeigename“ je Organisationsmitglied ergänzen (Pflege unter `/admin/members` bzw. im eigenen Profil); danach füllt nur die Serverfunktion `created_by_name` mit dem Namen statt der E-Mail, die Oberfläche bleibt unverändert.
- **Bundle-Spielraum:** Seit 164 liegt das Initial-JS bei 179,12 kB. Alles außer den beiden Einstiegspunkten muss nachgeladen werden; reicht der Spielraum nicht, stoppen und im PR begründen statt die Grenze anzuheben.
- **Zeilengrenzen:** Kopfleiste (395) und Auswahl-Hook (396) lassen keinen Platz; deshalb T6 vor jeder Funktionsänderung.
- **Exportformat** ist ab jetzt ein Vertrag. Spätere Änderungen erhöhen `formatVersion`; der Import lehnt unbekannte Versionen mit Hinweis ab.
- **Nicht Teil dieses Auftrags:** YAML-Diff und Git-Validierung (P17), Import von V1-Konfigurationen, Import mehrerer Dashboards auf einmal, Teilen per Link, Alarmregeln in Export/Import (P13).
