# Auftrag 163 – Dashboard-Editor: Team-Freigaben in der Oberfläche – Auswahl, Leseansicht, Kopieren, Rechteentzug, Teamverwaltung (P11b)

**Ziel:** Die in Auftrag 162 gebauten Team-Freigaben werden in der App nutzbar. Nutzer sehen in der Dashboard-Auswahl ihre persönlichen und ihre Team-Dashboards getrennt, öffnen Team-Dashboards, bearbeiten sie mit Schreibrecht und sehen sie ohne Schreibrecht in einer klaren Leseansicht. Dashboards lassen sich als Kopie mit einem Team teilen und als persönliche Kopie sichern. Wird einem Nutzer das Recht entzogen, geht sein Entwurf nicht verloren. Admins verwalten Teams und Mitglieder auf einer eigenen Admin-Seite.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P11 (§6, Plananpassung P11a/P11b), §4.E, §8; Gegenprüfung B1, L4 (§9.3).
**Fachgrundlage:** [TEAM_FREIGABEN_P11.md](../dashboard/TEAM_FREIGABEN_P11.md) (verbindlich, insbesondere §2 Rechtematrix, §3 RPC-Tabelle, §6 Vorgaben für 163), [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §6–§7, [VORLAGEN_AUSWAHL_P09B.md](../dashboard/VORLAGEN_AUSWAHL_P09B.md) (Auswahl, Obergrenzen, Duplizieren).
**Vorgelagert:** 162 (P11a, PR #197, gemergt als `00ab4db5`). Migration `20261122_dashboard_team_sharing.sql` liegt in `main`.
**Baseline:** `main` `00ab4db5` (oder neuer; der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-163-team-freigaben-oberflaeche`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge, Hosted-Migration und Deploy:** Marc.
**Status:** OFFEN.

---

## 1. Ist-Stand (geprüft auf `main` `00ab4db5`)

| Baustein       | Ist                                                                                                                                                                                                                                                                                   | Fundstelle                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Server         | Team-Scope aktiv. RPCs für Teams, Mitglieder, `list_accessible_dashboards_v2`, `load_dashboard_v2` (liefert `can_write`), `delete_team_dashboard_v2`, `copy_dashboard_v2`. Fehlercodes siehe `TEAM_FREIGABEN_P11.md` §3.                                                              | `supabase/migrations/20261122_dashboard_team_sharing.sql`                         |
| Dienste        | `dashboardTeamsV2.ts` (7 Funktionen), `dashboardSharingV2.ts` (`listAccessibleDashboardsV2`, `loadDashboardV2`, `deleteTeamDashboardV2`, `copyDashboardV2`). Ohne Supabase liefern alle `nicht_verfuegbar`. Noch **kein** Import in Komponenten oder Hooks.                           | `src/features/dashboard/services/`                                                |
| Fehlerarten    | `DashboardV2StorageError` kennt bereits `team_zugriff_entzogen`, `team_nicht_gefunden`, `team_hat_dashboards`, `team_name_vergeben`, `team_grenze`, `mitglied_nicht_in_org`. Deutsche Anzeigetexte dafür fehlen.                                                                      | `services/dashboardStorageV2Types.ts:6–23`                                        |
| Storage-Hook   | `useDashboardV2Storage` lädt nur persönliche Dashboards (`listPersonalDashboardsV2`, `loadPersonalDashboardV2` über `loadAndActivateDashboardV2`). `StoredDashboardV2Row` kennt `scope`, aber weder `teamId` noch `canWrite`. Datei hat **395 Zeilen** (Grenze 400).                  | `hooks/useDashboardV2Storage.ts`, `services/dashboardSelectionV2.ts:266`          |
| Auswahl        | `DashboardSwitcherV2` (318 Zeilen) und `DashboardSwitcherMenuV2` (248) zeigen eine flache Liste `PersonalDashboardListItemV2[]` mit Scope-Badge „Persönlich“. Dialoge Neu/Duplizieren/Löschen nur für persönliche Dashboards.                                                         | `components/editor/selection/`                                                    |
| Editor         | Keine Leseansicht. `DashboardEditorShellV2.tsx` hat **400 Zeilen** (an der Grenze), `EditorTopBarV2.tsx` 376, `EditorInspectorV2.tsx` 360.                                                                                                                                            | `components/editor/`                                                              |
| Konflikt       | `DashboardConflictDialogV2` (Neu laden / als persönliche Kopie sichern) und `DashboardDeletedDialogV2` vorhanden.                                                                                                                                                                     | `components/editor/`                                                              |
| Admin          | `/admin/members` (`MembersPage.tsx`, 413 Zeilen inkl. Leerzeilen), `/admin/audit`, `/admin/health`; Admin-Prüfung über `session?.role === 'admin'`, Abweisung über `ForbiddenView`. Mitgliederliste der Organisation über `memberService`. Sidebar-Einträge in `Sidebar.tsx:251–268`. | `src/features/admin/`, `src/app/routes.tsx:258–275`, `src/app/routePages.tsx:239` |
| Vorschau/E2E   | Vorschau `dashboard-vorschau.html?bereich=editor_v2` speist drei persönliche Beispiel-Dashboards über Props ein (`DashboardEditorPreviewV2.tsx`). E2E gegen lokales Supabase mit echten Nutzern gibt es bereits (`e2e/member-management.spec.ts`).                                    | `src/features/dashboard/preview/`, `e2e/`                                         |
| Bundle         | Initial-JS 178,93 kB gzip, Grenze 180 kB. Spielraum ca. 1 kB.                                                                                                                                                                                                                         | `.size-limit.json`, BUILD_LOG 162                                                 |
| Restpunkte 161 | Fadenkreuz-Kopplung, E2E/Screenshots, Fach-Doku zu 161 offen. **Nicht Teil dieses Auftrags.**                                                                                                                                                                                         | BUILD_LOG 17.11.2026                                                              |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich)

1. **Der Server entscheidet.** Die Oberfläche blendet nur aus, was der Server ohnehin verweigern würde. Grundlage ist ausschließlich `canWrite` aus `list_accessible_dashboards_v2` bzw. `load_dashboard_v2` und `session.role === 'admin'` für die Teamverwaltung. Keine eigene Rechteberechnung im Client.
2. **Leseansicht** bei `canWrite === false`: Das Dashboard ist vollständig sichtbar und bedienbar zum Lesen (Zeitsteuerung, Kachel-Details, Filter, Breakpoint-Ansicht). Nicht verfügbar: Widget-Bibliothek, Verschieben, Größe ändern, Kachel hinzufügen/entfernen, Inspector-Bearbeitung, Sektionen bearbeiten, Rückgängig/Wiederholen, Speichern, Tastenkürzel für Änderungen. Ein Hinweisbalken sagt: „Nur Lesen – Team-Dashboard ‚<Teamname>‘. Für eigene Änderungen eine persönliche Kopie anlegen.“ mit Schaltfläche „Als persönliche Kopie“.
3. **Teilen heißt Kopieren.** Der Server kennt kein Verschieben. „Mit Team teilen“ legt über `copyDashboardV2` eine **unabhängige Team-Kopie** an; das persönliche Original bleibt unverändert. Der Dialog sagt das ausdrücklich („Das Team erhält eine eigene Kopie. Dein persönliches Dashboard bleibt bestehen; spätere Änderungen werden nicht abgeglichen.“). Zielteams sind nur Teams mit `canWrite`.
4. **Als persönliche Kopie** ist für jedes lesbare Dashboard verfügbar (auch für Viewer). Titelvorschlag nach der bestehenden Titelregel (`buildDerivedDashboardTitle`).
5. **Neu und Duplizieren** bieten ein Ziel „Persönlich“ oder ein Team mit `canWrite`. Duplizieren eines Team-Dashboards ohne Schreibrecht ist nur als persönliche Kopie möglich.
6. **Löschen eines Team-Dashboards** nur bei `canWrite`, über `deleteTeamDashboardV2` mit erwarteter Revision. Bestätigungstext: „Das Dashboard wird für alle Mitglieder von ‚<Teamname>‘ gelöscht, einschließlich aller Versionen.“ Die Regel „letztes persönliches Dashboard nicht löschbar“ gilt nur für persönliche Dashboards.
7. **Rechteentzug verliert nie einen Entwurf.** Liefert Speichern `team_zugriff_entzogen`, erscheint ein eigener Dialog: „Deine Bearbeitungsrechte für dieses Team-Dashboard wurden entzogen.“ Optionen: „Entwurf als persönliche Kopie sichern“ (aus dem aktuellen Entwurf, nicht aus dem Serverstand) und „Verwerfen und neu laden“. Nach dem Neuladen gilt der neue Serverstand: Leseansicht, oder bei `nicht_gefunden` der bestehende Pfad aus `DashboardDeletedDialogV2` mit Wechsel auf das nächste zugängliche Dashboard.
8. **Konflikt bei Team-Dashboards:** Der bestehende Konfliktdialog bleibt; bei `scope = 'team'` lautet der Text „Ein anderes Teammitglied hat dieses Dashboard inzwischen gespeichert.“ Optionen unverändert. Reihenfolge wie Server: Rechteentzug vor Konflikt.
9. **Ohne Server (Demo/In-Memory):** Die Auswahl zeigt wie heute nur persönliche Dashboards. Team-Ziele, „Mit Team teilen“ und die Teamverwaltung sind ausgeblendet; `nicht_verfuegbar` aus den Team-Diensten wird **nicht** als Fehler angezeigt, sondern als „Team-Funktionen nicht verfügbar“ behandelt. Das Verhalten persönlicher Dashboards im Demo-Modus bleibt bytegleich.
10. **Teams filtern keine Daten (B1).** Ein Team-Dashboard zeigt dieselben Organisationsdaten wie ein persönliches. Kein Teamfilter in Kacheln, Zeitreihen oder CRM-Abfragen.
11. **Team-Rolle `lead`** wird nicht angezeigt und nicht bearbeitbar gemacht (P11 ohne Wirkung). Mitglieder werden immer als `member` hinzugefügt.

### 2.2 Dashboard-Auswahl und Storage-Hook

12. `useDashboardV2Storage` nutzt mit Supabase `listAccessibleDashboardsV2` für die Liste und `loadDashboardV2` zum Öffnen; ohne Supabase bleibt der heutige persönliche Pfad. Die Datei bleibt ≤ 400 Zeilen; der Builder lagert dafür die Lade- und Listenlogik in einen eigenen Baustein aus (z. B. `hooks/dashboardV2Access.ts`), statt den Hook weiter zu verlängern.
13. Listen-Typ: Die Auswahl arbeitet mit `AccessibleDashboardListItemV2`. Persönliche Einträge aus dem Demo-Pfad werden auf diesen Typ abgebildet (`teamId: null`, `teamName: null`, `canWrite: true`). `PersonalDashboardListItemV2` bleibt für die bestehenden Dienste erhalten.
14. Das aktive Dashboard trägt zusätzlich `teamId`, `teamName` und `canWrite`. Der Builder erweitert dafür **nicht** `StoredDashboardV2Row` in einer Weise, die bestehende Aufrufer bricht (optionale Felder oder eigener Typ `ActiveDashboardV2`).
15. Gemerkte Auswahl (`getActiveDashboardV2Id`/`setActiveDashboardV2Id`) funktioniert auch für Team-Dashboard-IDs. Ist das gemerkte Dashboard nicht mehr lesbar, wird ohne Fehlermeldung das erste persönliche Dashboard geöffnet und ein kurzer Hinweis „Das zuletzt geöffnete Team-Dashboard ist nicht mehr verfügbar“ gezeigt.
16. `DashboardSwitcherMenuV2` gruppiert: „Persönlich“ zuerst, danach je Team eine Gruppe „Team: <Name>“ (alphabetisch). Einträge ohne Schreibrecht tragen das Badge „Nur lesen“. Der Switcher-Button zeigt bei Team-Dashboards das Badge „Team: <Name>“ statt „Persönlich“. Tastaturbedienung und ARIA-Struktur wie heute (Gruppen mit `role="group"` und Beschriftung).

### 2.3 Leseansicht im Editor

17. Ein Schalter `readOnly` (aus `canWrite === false`) wird über einen kleinen Kontext oder eine Props-Gruppe an Shell, TopBar, Canvas, Inspector, Widget-Bibliothek und `useEditorShortcuts` gegeben. **`DashboardEditorShellV2.tsx` darf nicht wachsen**; der Builder lagert vorher passenden Code aus und weist die Zeilenzahl im BUILD_LOG nach.
18. Im Lesemodus darf der Entwurf nicht „schmutzig“ werden: keine Aktion setzt einen ungespeicherten Zustand, der Navigationsschutz (`useBrowserBackGuard`, `UnsavedChangesDialog`) springt nicht an.
19. Grid: Drag- und Resize-Griffe sind im Lesemodus nicht vorhanden (nicht nur deaktiviert), damit Tastatur- und Screenreader-Nutzer keine toten Bedienelemente finden.

### 2.4 Teilen, Kopieren, Neu, Löschen

20. Neue Dialoge, jeweils nachgeladen (`React.lazy`) und ≤ 400 Zeilen: `ShareWithTeamDialogV2.tsx` (Teamauswahl nur `canWrite`, Titel, Hinweistext aus 2.1 Nr. 3) und `TeamAccessRevokedDialogV2.tsx` (2.1 Nr. 7). „Als persönliche Kopie“ nutzt bei unverändertem Serverstand `copyDashboardV2` (Ziel `personal`), bei vorhandenem Entwurf `saveAsNewPersonalCopy` mit dem Entwurf.
21. `NewDashboardDialogV2` und `DuplicateDashboardDialogV2` erhalten eine Zielauswahl „Persönlich“ / Teams mit `canWrite` (nur sichtbar, wenn Team-Funktionen verfügbar sind und mindestens ein schreibbares Team existiert). Neu im Team: `createDashboardV2` mit `scope: 'team'`, `teamId`.
22. `DeleteDashboardDialogV2` unterscheidet persönlich/team (2.1 Nr. 6).
23. Fehlertexte für alle Team-Fehlerarten an **einer** Stelle (z. B. `model/dashboardTeamMessages.ts`), Deutsch, ohne Fachjargon. Grenzen nennen die Zahl („Ein Team kann höchstens 50 Dashboards haben.“).

### 2.5 Teamverwaltung für Admins

24. Neue Seite `src/features/admin/pages/DashboardTeamsPage.tsx` unter `/admin/teams`, Titel „Dashboard-Teams“, Kategorie „Administration“, nachgeladen wie die anderen Admin-Seiten, Sidebar-Eintrag nur für Admins (`data-testid="nav-item-admin-teams"`). Nicht-Admins erhalten die bestehende `ForbiddenView`.
25. Inhalt: Tabelle der Teams (Name, Beschreibung, Mitglieder, Dashboards), Anlegen, Umbenennen/Beschreibung ändern, Löschen. Löschen ist bei `dashboardCount > 0` deaktiviert mit Hinweis „Team hat noch N Dashboards. Erst löschen oder als persönliche Kopie sichern.“; der Server-Fehler `team_hat_dashboards` wird trotzdem sauber angezeigt.
26. Mitglieder je Team (aufklappbar oder Detailbereich): Liste mit E-Mail, Org-Rolle und Status (gesperrte Mitglieder sichtbar markiert „gesperrt – ohne Zugriff“), Hinzufügen aus den **aktiven** Organisationsmitgliedern über `memberService` (bereits zugeordnete ausgeblendet), Entfernen mit Bestätigung („<E-Mail> verliert sofort den Zugriff auf alle Dashboards dieses Teams.“). Bei Org-Rolle `viewer` zeigt die Liste „liest nur“.
27. Die Seite und ihre Komponenten bleiben je ≤ 400 Zeilen; Teilkomponenten unter `src/features/admin/components/` (z. B. `TeamFormDialog.tsx`, `TeamMembersPanel.tsx`). `MembersPage.tsx` wird nicht geändert.
28. Ohne Supabase zeigt die Seite „Team-Freigaben brauchen eine Server-Verbindung.“ statt einer leeren Tabelle.

### 2.6 Vorschau, Tests, Leistung

29. **Vorschau-Szenario** `dashboard-vorschau.html?bereich=editor_v2&teams=1`: `DashboardEditorPreviewV2` speist zusätzlich zwei Team-Dashboards über Props ein (eines mit `canWrite: true`, eines mit `canWrite: false`) und erlaubt über `&teams=entzogen` das Simulieren von `team_zugriff_entzogen` beim Speichern. Nur in der Vorschau; `dashboardInMemoryStoreV2.ts` wird **nicht** um Teams erweitert (Regel aus 162).
30. **Vitest:** Abbildung Liste/Laden im Hook (mit und ohne Supabase), Gruppierung und Badges im Switcher-Menü, Leseansicht (kein Speichern, keine Bibliothek, keine Griffe, Entwurf bleibt sauber), Teilen-Dialog (nur schreibbare Teams), Rechteentzug-Dialog (Entwurf landet in der Kopie), Löschtext team/persönlich, Fehlertexte für jede Team-Fehlerart, `DashboardTeamsPage` (Admin, Nicht-Admin, Löschen deaktiviert, Mitglied hinzufügen/entfernen, Demo-Hinweis).
31. **E2E Vorschau** `e2e/team-dashboards-preview.spec.ts`: Gruppen im Switcher, Öffnen des Nur-Lesen-Dashboards (keine Bearbeitungselemente, Hinweisbalken), persönliche Kopie anlegen, Rechteentzug-Szenario mit Sicherung des Entwurfs.
32. **E2E mit lokalem Supabase** `e2e/team-dashboards.spec.ts` nach Vorbild `member-management.spec.ts`: Admin legt Team an und ordnet Manager und Viewer zu; Manager legt Team-Dashboard an und speichert; Viewer sieht es nur lesend und kann eine persönliche Kopie anlegen; Admin entfernt den Manager, dessen nächstes Speichern zeigt den Rechteentzug-Dialog; Nutzer ohne Teammitgliedschaft sieht das Dashboard nicht. Testnutzer und Aufräumen nach dem bestehenden Muster, keine neuen Secrets.
33. **Bestehende E2E** (`personal-dashboard*.spec.ts`, `editor-*.spec.ts`, `member-management.spec.ts`, `routes.spec.ts`, `semantic-routes.spec.ts`, `a11y.spec.ts`, `visual.spec.ts`) bleiben grün. Ändern sich Routen- oder Navigationszählungen durch `/admin/teams`, passt der Builder nur die Erwartung an und begründet das im BUILD_LOG. Visuelle Baselines nur über den Branch-Weg `visual-baselines/**`, falls nötig.
34. **Bundle:** Initial-JS höchstens **+0,6 kB** gzip und unter 180 kB. Admin-Seite, neue Dialoge und die Team-Dienste liegen in nachgeladenen Chunks. `size-limit` vorher/nachher im BUILD_LOG.
35. **Screenshots** (lokal, nur README-Matrix committen, `docs/screenshots/auftrag-163/README.md`): Switcher mit Gruppen, Leseansicht mit Hinweisbalken, Teilen-Dialog, Rechteentzug-Dialog, `/admin/teams` mit Mitgliederbereich – jeweils 1440/768/375 px, Vorher/Nachher-Hashes verschieden, 0 px horizontaler Überlauf.

### 2.7 Dokumentation

36. `TEAM_FREIGABEN_P11.md`: neuer Abschnitt „Oberfläche (P11b, Auftrag 163)“ mit Bedienwegen, Leseansicht, Teilen-als-Kopie, Rechteentzug-Ablauf, Demo-Verhalten. §6 „Vorgaben für 163“ bleibt stehen und erhält einen datierten Vermerk „umgesetzt“.
37. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Umsetzungsstand P11b“; P11 gilt erst damit als abgeschlossen. Nichts umschreiben.
38. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Teilen = Kopie, Leseansicht aus `canWrite`, Teamverwaltung unter `/admin/teams`).
39. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 163; `docs/BUILD_LOG.md` Builder-Eintrag mit Deployment-Hinweis (2.8).

### 2.8 Deployment-Reihenfolge

40. Die App aus 163 setzt voraus, dass Migration `20261122_dashboard_team_sharing.sql` auf Hosted angewendet ist. Fehlt sie, würde `list_accessible_dashboards_v2` fehlschlagen. Deshalb fällt der Hook bei Fehler „Funktion nicht vorhanden“ (PostgREST `PGRST202` bzw. Postgres `42883`) auf den persönlichen Pfad zurück und blendet Team-Funktionen aus, statt die Auswahl zu blockieren. Der Builder testet diesen Rückfall in Vitest. Die Deployment-Anleitung im BUILD_LOG nennt die Reihenfolge: erst Migration, dann App.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Keine Migration, keine Änderung an RPCs oder pgTAP.** Fehlt serverseitig etwas: stoppen und im PR begründen. `supabase/**` bleibt unverändert.
3. **Keine Rechtelogik im Client** über 2.1 Nr. 1 hinaus. `src/auth/permissions.ts` bleibt unverändert; die Admin-Prüfung folgt dem Muster von `MembersPage` (`session?.role === 'admin'`).
4. **Persönliche Dashboards verhaltensgleich**, mit und ohne Supabase. Bestehende Tests für persönliche Dashboards bleiben unverändert grün; Änderungen an deren Erwartungen nur, wenn ein Text durch die Gruppierung zwingend wechselt, mit Begründung.
5. **V1-Pfad unverändert** (V1-Editor, `dashboardPresets.ts`, `dashboardRollout.ts`, V1-Teile von `PersonalExecutiveDashboard.tsx` und `DashboardTileDetailPage.tsx`).
6. **Keine Team-Datenfilter**; `src/features/dashboard/data`, `src/services/liveKpi`, `src/domain`, `crmRepository.ts`, `supabase/functions` unverändert.
7. **Keine neuen Abhängigkeiten.** Bestehende UI-Bausteine (`Table`, `Badge`, `Button`, Dialog-Muster aus `selection/` und `InvitationForm`) wiederverwenden.
8. **`max-lines` 400** für alle neuen und geänderten TS/TSX-Dateien; `DashboardEditorShellV2.tsx` wächst nicht.
9. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) Vitest Switcher-Menü zeigt Team-Gruppe → heute rot; (b) Vitest Leseansicht blendet Speichern aus → heute rot; (c) Vitest Rechteentzug-Dialog sichert Entwurf → heute rot; (d) Vitest `DashboardTeamsPage` für Nicht-Admin zeigt `ForbiddenView` → heute rot (Seite fehlt).
10. **Barrierefreiheit:** neue Dialoge mit Fokusfalle, Escape, Rückgabe des Fokus wie bestehende Dialoge; `a11y.spec.ts` ohne neue Verstöße gegenüber `a11y-baseline.json`.
11. **Keine Secrets**, keine Hosted-Änderung durch den Builder.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                                                                                           | Änderung                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_163_TEAM_FREIGABEN_OBERFLAECHE.md`                                                                                                                                                                         | Dieser Auftrag (Checkboxen, Status)               |
| `src/features/dashboard/hooks/useDashboardV2Storage.ts`, neu `hooks/dashboardV2Access.ts` (oder gleichwertig), `services/dashboardStorageV2Types.ts` (nur Typen/Ergebnisfelder aus 2.2), `services/dashboardSelectionV2.ts` (nur Aktivierung)  | Liste, Laden, aktives Dashboard (2.2, 2.8)        |
| `src/features/dashboard/components/editor/selection/*` (Switcher, Menü, Neu, Duplizieren, Löschen, `useDashboardSelection.ts`, `dashboardSelectionState.ts`)                                                                                   | Gruppen, Ziele, Löschtext (2.2, 2.4)              |
| neu `components/editor/selection/ShareWithTeamDialogV2.tsx`, neu `components/editor/TeamAccessRevokedDialogV2.tsx`, neu `components/editor/ReadOnlyNoticeV2.tsx` (oder gleichwertig)                                                           | Teilen, Rechteentzug, Hinweisbalken               |
| `components/editor/DashboardEditorShellV2.tsx`, `EditorTopBarV2.tsx`, `EditorCanvasV2.tsx`, `EditorInspectorV2.tsx`, `WidgetLibraryV2.tsx`, `useEditorShortcuts.ts`, `DashboardConflictDialogV2.tsx`, ggf. `canvas/`, `grid/`, `inspector/`    | Leseansicht, Konflikttext (2.1 Nr. 8, 2.3)        |
| neu `src/features/dashboard/model/dashboardTeamMessages.ts`                                                                                                                                                                                    | Fehlertexte (2.4 Nr. 23)                          |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx` (nur V2-Verdrahtung)                                                                                                                                                             | Dialoge einhängen                                 |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`, ggf. neu `preview/previewTeamDashboards.ts`                                                                                                                                     | Vorschau-Szenario (2.6 Nr. 29)                    |
| neu `src/features/admin/pages/DashboardTeamsPage.tsx`, neu `src/features/admin/components/TeamFormDialog.tsx`, `TeamMembersPanel.tsx` (oder gleichwertig), `src/app/routes.tsx`, `src/app/routePages.tsx`, `src/components/layout/Sidebar.tsx` | Teamverwaltung (2.5)                              |
| `src/features/dashboard/__tests__/*` (neu bzw. ergänzt), `src/features/admin/pages/__tests__/DashboardTeamsPage.vitest.tsx` (neu)                                                                                                              | Vitest (2.6 Nr. 30)                               |
| neu `e2e/team-dashboards-preview.spec.ts`, neu `e2e/team-dashboards.spec.ts`; ggf. Erwartungen in `e2e/routes.spec.ts`, `e2e/semantic-routes.spec.ts`, `e2e/a11y.spec.ts`                                                                      | E2E (2.6 Nr. 31–33)                               |
| neu `scripts/captureAuftrag163GateScreenshots.mjs`, neu `docs/screenshots/auftrag-163/README.md`                                                                                                                                               | Screenshot-Harness und Matrix (2.6 Nr. 35)        |
| `docs/dashboard/TEAM_FREIGABEN_P11.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                    | Doku, Status, Builder-Eintrag, Prüfnachweis (2.7) |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Baseline festlegen, Ist-Tabelle §1 prüfen, Zeilenzahlen der Grenzdateien und `size-limit` als Ausgangswert notieren, prüfen ob Routen-/Navigationszählungen in Tests oder `scripts/verifyIntegrity.ts` von `/admin/teams` betroffen sind, lokale Supabase starten (`supabase start`, `supabase db reset`).
- [ ] **T1 Rot-Nachweise:** §3 Nr. 9 (a)–(d), Ergebnisse im BUILD_LOG.
- [ ] **T2 Auslagerung ohne Verhaltensänderung:** Hook-Lade-/Listenlogik und Shell-Teile auslagern, bestehende Tests unverändert grün, Zeilenzahlen nachweisen.
- [ ] **T3 Liste und Laden:** 2.2 inkl. Demo-Pfad und Rückfall 2.8.
- [ ] **T4 Switcher-Gruppen und Badges:** 2.2 Nr. 16.
- [ ] **T5 Leseansicht:** 2.3, Navigationsschutz bleibt still.
- [ ] **T6 Teilen, Kopieren, Neu, Duplizieren, Löschen:** 2.4, Fehlertexte.
- [ ] **T7 Rechteentzug und Konflikt:** 2.1 Nr. 7–8, Entwurf landet nachweislich in der Kopie.
- [ ] **T8 Teamverwaltung:** 2.5, Route, Sidebar, `ForbiddenView`, Demo-Hinweis.
- [ ] **T9 Vorschau-Szenario und E2E:** 2.6 Nr. 29, 31–33.
- [ ] **T10 Bundle- und A11y-Gegenprobe:** `size-limit` vorher/nachher, `a11y.spec.ts`.
- [ ] **T11 Screenshots:** 2.6 Nr. 35.
- [ ] **T12 Doku:** 2.7.
- [ ] **T13 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag inklusive Deployment-Anleitung für Marc (erst Migration 20261122 auf Hosted, dann App; Smoke im Browser: Admin legt unter `/admin/teams` ein Team an und ordnet einen Manager und einen Viewer zu, Manager legt ein Team-Dashboard an und speichert, Viewer sieht es mit „Nur lesen“ und legt eine persönliche Kopie an, Admin entfernt den Manager, dessen nächstes Speichern zeigt den Rechteentzug-Dialog), PR öffnen, Review anfordern.

## 6. Abnahme

- Die Auswahl zeigt persönliche Dashboards und Team-Dashboards getrennt nach Team; „Nur lesen“ ist sichtbar, wo kein Schreibrecht besteht.
- Ein Viewer-Mitglied öffnet ein Team-Dashboard in der Leseansicht ohne jedes Bearbeitungselement und kann eine persönliche Kopie anlegen.
- Ein Manager-Mitglied legt ein Team-Dashboard an, bearbeitet und speichert es; ein zweites Mitglied sieht den neuen Stand.
- „Mit Team teilen“ legt eine Team-Kopie an; das persönliche Original bleibt unverändert.
- Nach Entfernen aus dem Team führt das nächste Speichern zum Rechteentzug-Dialog; der Entwurf lässt sich als persönliche Kopie sichern; nach Neuladen gilt der Serverstand.
- Ein Admin verwaltet unter `/admin/teams` Teams und Mitglieder; Nicht-Admins werden abgewiesen; ein Team mit Dashboards lässt sich nicht löschen.
- Ohne Server verhält sich der Editor für persönliche Dashboards wie bisher, Team-Funktionen sind ausgeblendet.
- Schutzbereichs-Diff leer, `supabase/**` unverändert, V1 unverändert, keine neuen Abhängigkeiten, Initial-Bundle ≤ +0,6 kB und unter 180 kB.

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
supabase test db              # Gegenprobe, keine Änderung erwartet
npx tsx scripts/verifyLiveKpiCatalog.ts
npx playwright test e2e/team-dashboards-preview.spec.ts e2e/team-dashboards.spec.ts e2e/personal-dashboard*.spec.ts e2e/editor-*.spec.ts e2e/member-management.spec.ts e2e/a11y.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- supabase src/auth src/services/liveKpi src/services/db/crmRepository.ts src/domain src/features/dashboard/data   # leer
git diff <baseline> -- src/features/admin/pages/MembersPage.tsx src/features/dashboard/services/dashboardInMemoryStoreV2.ts   # leer
```

CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Hosted-Migration:** Ohne Migration 20261122 auf Hosted greift der Rückfall aus 2.8. Marc wendet die Migration vor dem Deploy an.
- **Zeilengrenzen:** Shell (400), Storage-Hook (395) und Inspector (360) lassen kaum Platz; deshalb T2 vor jeder Funktionsänderung.
- **Bundle:** Spielraum ca. 1 kB. Alles Team-Spezifische gehört in nachgeladene Chunks.
- **Teilen als Kopie** kann Nutzer überraschen, die ein gemeinsames Original erwarten. Der Dialogtext klärt das; ein echtes Verschieben bräuchte einen eigenen Server-Auftrag.
- **Offene Entscheidung für Marc (nicht blockierend):** Ob die Team-Rolle `lead` künftig Rechte bekommt. In 163 ohne Wirkung und unsichtbar.
- **Nicht Teil dieses Auftrags:** Restpunkte 161 (Fadenkreuz-Kopplung, E2E/Screenshots, Fach-Doku), Benachrichtigung bei Rechteentzug, Org-Standard-Dashboard `scope = 'organization'`, Versionsoberfläche und Import/Export (P12), Alarm-Lebenszyklus nach Ersteller-Austritt (P13).
