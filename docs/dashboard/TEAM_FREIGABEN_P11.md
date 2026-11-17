# Team-Freigaben und Kollaboration (P11a – Auftrag 162)

> **Status:** Umgesetzt im Backend & Dienstschicht (P11a / Auftrag 162, 2026-11-22). UI folgt in P11b (Auftrag 163).  
> **Migration:** `supabase/migrations/20261122_dashboard_team_sharing.sql`  
> **Dienste:** `src/features/dashboard/services/dashboardTeamsV2.ts`, `src/features/dashboard/services/dashboardSharingV2.ts`

---

## 1. Überblick & Fachregeln

Mit Phase 11 wird der Scope `team` im Executive Dashboard V2 aktiviert. Dashboards können Teams zugeordnet werden, sodass Mitglieder innerhalb einer Organisation kollaborativ an Dashboards arbeiten oder diese einsehen können.

### 1.1 Wesentliche Fachregeln (2.1)
1. **Zwei Rollenebenen:**
   - **Organisationsrolle (`organization_members.role`):** `admin`, `manager`, `viewer`.
   - **Teamrolle (`dashboard_team_members.role`):** `member` (Standard; `lead` ist für künftige Erweiterungen reserviert und hat in P11 dieselben Rechte wie `member`).
2. **Rechtematrix für Team-Dashboards:**
   - **Lesen (`dashboard_team_can_read`):**
     - Organisations-Admin: immer.
     - Organisations-Manager / Viewer: wenn aktives Mitglied im Team (`dashboard_team_members`).
   - **Schreiben / Aktualisieren / Löschen (`dashboard_team_can_write`):**
     - Organisations-Admin: immer.
     - Organisations-Manager: wenn aktives Mitglied im Team (`dashboard_team_members`).
     - Organisations-Viewer: **nie** (auch wenn im Team).
   - **Teamverwaltung (Teams anlegen, umbenennen, löschen, Mitglieder verwalten):**
     - Ausschliesslich Organisations-Admins (`LP_FORBIDDEN` für Manager/Viewer).
3. **Mandantentrennung (Tenant Isolation):**
   - Jedes Team und jedes Team-Dashboard gehört fest zu einer Organisation (`organization_id`).
   - Ein Zugriff über Organisationsgrenzen hinweg ist datenbankseitig ausgeschlossen. Teams und Team-Dashboards anderer Organisationen werden mit `LP_TEAM_NOT_FOUND` bzw. `LP_DASHBOARD_NOT_FOUND` beantwortet.
   - Mitglieder können nur zu Teams der eigenen Organisation hinzugefügt werden (`LP_MEMBER_NOT_IN_ORG`).
4. **Dynamische Rechteprüfung & Rechteentzug:**
   - Rechte werden bei jedem RPC-Aufruf live gegen `organization_members` und `dashboard_team_members` geprüft.
   - Wird einem Nutzer die Berechtigung entzogen (z. B. aus Team entfernt, Rolle auf `viewer` herabgestuft oder Mitgliedschaft suspendiert), scheitert die nächste Schreiboperation mit `LP_TEAM_ACCESS_REVOKED` (Dienstschicht: `team_zugriff_entzogen`).
   - Das Dashboard bleibt unverändert.
5. **Ersteller-Unabhängigkeit:**
   - Team-Dashboards gehören dem Team, nicht dem Ersteller.
   - Scheidet der ursprüngliche Ersteller (`created_by_user_id`) aus der Organisation oder dem Team aus, bleibt das Dashboard voll funktionsfähig und kann von verbleibenden berechtigten Mitgliedern weiter gepflegt werden.
6. **Reihenfolge bei Konflikten:**
   - Prüfungsreihenfolge beim Speichern/Löschen: 1. Auth & Organisation, 2. Dashboard-Existenz, 3. Team-Zugehörigkeit & Schreibrecht (`LP_TEAM_ACCESS_REVOKED`), 4. Revisionsstand (`LP_DASHBOARD_CONFLICT`).
   - Ein entzogener Nutzer mit veraltetem Revisionsstand erhält somit prioritär `LP_TEAM_ACCESS_REVOKED`.
7. **Löschschutz für Teams:**
   - Ein Team kann nur gelöscht werden, wenn ihm keine Dashboards mehr zugeordnet sind (`LP_TEAM_HAS_DASHBOARDS`).
8. **Config-Bindung:**
   - Das Speichern bindet `config.scope` und `config.teamId` serverseitig zwingend an die Zeilenwerte des Dashboards (`scope` und `team_id`), um Manipulationen an Metadaten im JSONB zu verhindern.
9. **Kopieren (`copy_dashboard_v2`):**
   - Quelle: Beliebiges lesbares Dashboard (persönlich oder Team).
   - Ziel `personal`: Erfordert Leserecht an Quelle; erzeugt persönliches Dashboard (Grenze: 20 Dashboards/Nutzer).
   - Ziel `team`: Erfordert Leserecht an Quelle und Schreibrecht am Zielteam (Grenze: 50 Dashboards/Team).
   - Startet immer mit Revision 1 und initialem Revisionsprotokoll („Kopie von <Quelltitel>“).
10. **Obergrenzen (Limits):**
    - 50 Teams pro Organisation (`LP_TEAM_LIMIT`).
    - 200 Mitglieder pro Team (`LP_TEAM_MEMBER_LIMIT`).
    - 50 Dashboards pro Team (`LP_TEAM_DASHBOARD_LIMIT`).
    - 20 persönliche Dashboards pro Nutzer (`LP_DASHBOARD_LIMIT`).

---

## 2. Rechtematrix im Detail

| Aktion | Admin | Manager (Team-Mitglied) | Manager (kein Mitglied) | Viewer (Team-Mitglied) | Viewer (kein Mitglied) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Teams auflisten** (`list_dashboard_teams_v2`) | Alle Teams der Org | Eigene Teams | Keine | Eigene Teams | Keine |
| **Team anlegen/bearbeiten/löschen** | Ja | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) |
| **Team-Mitglieder verwalten** | Ja | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) |
| **Team-Dashboard anlegen** | Ja | Ja | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) |
| **Team-Dashboard lesen** | Ja | Ja | Nein (`LP_DASHBOARD_NOT_FOUND`) | Ja | Nein (`LP_DASHBOARD_NOT_FOUND`) |
| **Team-Dashboard speichern/löschen** | Ja | Ja | Nein (`LP_TEAM_ACCESS_REVOKED`) | Nein (`LP_TEAM_ACCESS_REVOKED`) | Nein (`LP_TEAM_ACCESS_REVOKED`) |
| **Team-Revisionen lesen/wiederherstellen** | Ja | Ja | Nein (`LP_DASHBOARD_NOT_FOUND`) | Ja (Lesen) / Nein (Restore) | Nein (`LP_DASHBOARD_NOT_FOUND`) |
| **Kopieren (Ziel: Team)** | Ja | Ja (mit Schreibrecht) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) | Nein (`LP_FORBIDDEN`) |
| **Kopieren (Ziel: personal)** | Ja | Ja | Nein (wenn Quelle nicht lesbar) | Ja | Nein (wenn Quelle nicht lesbar) |

---

## 3. RPC-Übersicht & Fehlercodes

| RPC | Berechtigung | Rückgabe / Verhalten | Spezifische Fehlercodes |
|---|---|---|---|
| `list_dashboard_teams_v2()` | Angemeldet | Liste der Teams mit `id, name, description, member_count, dashboard_count, can_write, is_member` | `LP_AUTH_REQUIRED` |
| `create_dashboard_team_v2(p_name, p_description)` | Admin | `{ team_id, created_at }`, Audit `dashboard.team.created` | `LP_FORBIDDEN`, `LP_TEAM_NAME_TAKEN`, `LP_TEAM_LIMIT` |
| `update_dashboard_team_v2(p_team_id, p_name, p_description)` | Admin | `{ team_id, updated_at }`, Audit `dashboard.team.updated` | `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND`, `LP_TEAM_NAME_TAKEN` |
| `delete_dashboard_team_v2(p_team_id)` | Admin | `{ deleted_team_id }`, Audit `dashboard.team.deleted` | `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND`, `LP_TEAM_HAS_DASHBOARDS` |
| `list_dashboard_team_members_v2(p_team_id)` | Admin | Liste der Mitglieder mit `user_id, email, org_role, org_status, team_role, created_at` | `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND` |
| `add_dashboard_team_member_v2(p_team_id, p_user_id)` | Admin | `{ team_id, user_id, created_at }`, Audit `dashboard.team.member_added` | `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND`, `LP_MEMBER_NOT_IN_ORG`, `LP_TEAM_MEMBER_LIMIT` |
| `remove_dashboard_team_member_v2(p_team_id, p_user_id)` | Admin | `{ removed }`, Audit `dashboard.team.member_removed` | `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND` |
| `list_accessible_dashboards_v2()` | Angemeldet | Eigene persönliche + lesbare Team-Dashboards mit `id, title, scope, revision, tile_count, section_count, updated_at, team_id, team_name, can_write` | `LP_AUTH_REQUIRED` |
| `load_dashboard_v2(p_dashboard_id)` | Leserecht | `{ id, title, scope, team_id, revision, config, updated_at, can_write }` | `LP_DASHBOARD_NOT_FOUND`, `LP_TEAM_ACCESS_REVOKED` |
| `delete_team_dashboard_v2(p_dashboard_id, p_expected_revision)` | Schreibrecht | `{ deleted_id }`, Revisionen mitgelöscht, Audit `dashboard.team_dashboard.deleted` | `LP_DASHBOARD_NOT_FOUND`, `LP_TEAM_ACCESS_REVOKED`, `LP_DASHBOARD_CONFLICT` |
| `copy_dashboard_v2(p_source_id, p_target_scope, p_target_team_id, p_title)` | Leserecht an Quelle + Schreibrecht am Ziel | `{ dashboard_id, revision, created_at }`, Audit `dashboard.copied` | `LP_DASHBOARD_NOT_FOUND`, `LP_FORBIDDEN`, `LP_TEAM_NOT_FOUND`, `LP_DASHBOARD_LIMIT`, `LP_TEAM_DASHBOARD_LIMIT`, `LP_DASHBOARD_INVALID` |

---

## 4. RLS-Architektur

Alle Tabellen unterliegen strikter Row Level Security:
- `dashboards`: Direkter `SELECT` erlaubt für persönliche Dashboards des Nutzers sowie Team-Dashboards via `dashboard_team_can_read`. Keine direkten `INSERT/UPDATE/DELETE` für `authenticated` (nur über RPCs).
- `dashboard_revisions`: Direkter `SELECT` erlaubt, wenn zugehöriges Dashboard lesbar ist (`dashboard_team_can_read` bzw. persönlicher Besitzer).
- `dashboard_teams`: Direkter `SELECT` erlaubt für Admins (alle Teams) bzw. zugeordnete Mitglieder (`dashboard_team_is_active_member`). Keine direkten Mutationen.
- `dashboard_team_members`: Direkter `SELECT` erlaubt für Admins (alle Mitglieder der Org) bzw. Mitglieder auf eigene Zeilen. Keine direkten Mutationen.

---

## 5. Bewusste Abgrenzungen & Grenzen

1. **`lead`-Rolle:** Die Team-Rolle `lead` ist im Datenmodell vorbereitet, besitzt in P11 aber dieselben Rechte wie `member`. Team-Verwaltung bleibt Admins vorbehalten.
2. **Keine Team-Datenfilter:** Kacheln filtern CRM-Daten weiterhin über die Organisation und das Zeitfenster. Es gibt keine teamspezifische Einschränkung von CRM-Datensätzen.
3. **Kein Org-Standard-Dashboard (`scope = 'organization'`):** Dieser Scope bleibt bis zu einem späteren Auftrag deaktiviert.
4. **Keine Benachrichtigungen bei Rechteentzug:** Der Entzug von Rechten wird dynamisch beim nächsten API-Aufruf ausgewertet (`LP_TEAM_ACCESS_REVOKED`), es gibt keine Push-Events oder Benachrichtigungen.
5. **In-Memory / Demo-Modus:** Team-Funktionen stehen ohne Supabase-Verbindung nicht zur Verfügung und liefern standardisiert `{ ok: false, error: { kind: 'nicht_verfuegbar' } }`.

---

## 6. Vorgaben für Auftrag 163 (P11b – UI)

1. **Team-Switcher & Dashboard-Auswahl:**
   - Nutzt `listAccessibleDashboardsV2` für die Dashboard-Liste.
   - Zeigt Team-Zugehörigkeit (`teamName`) und Schreibberechtigung (`canWrite`) an.
2. **Editor-Berechtigungen:**
   - Ist `canWrite === false`, schaltet der Editor in den Nur-Lese-Modus (Inspektor deaktiviert, Toolbar auf Leseansicht, Speichern ausgeblendet).
3. **Teamverwaltung:**
   - Teamverwaltungs-Dialog nur für Organisations-Admins einblenden.
