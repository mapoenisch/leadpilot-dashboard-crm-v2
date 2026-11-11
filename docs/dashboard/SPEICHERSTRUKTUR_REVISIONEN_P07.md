# Dashboard-Editor: Ziel-Speicherstruktur, RLS, dauerhafte Revisionen und V1→V2-Kopiermigration (P07)

**Stand:** 11.11.2026  
**Status:** Technische Spezifikation und Implementierungsdokumentation für Paket P07  
**Bezug:** [Dashboard-Editor-Masterplan (Revision 2)](./DASHBOARD_EDITOR_MASTERPLAN.md), [Ziel-Speichermodell Auftrag 146](./GRID_VERGLEICH_ZIELMODELL_146.md), [UX-Konzept Auftrag 145](./EDITOR_UX_FACHVERTRAEGE_145.md)  
**Autor:** Antigravity (Builder) · **Prüfung:** Unabhängiges Review durch Codex  

---

## 1. Einleitung und Zielsetzung

Paket **P07** etabliert das relationale Fundament für die Persistenz des neuen LeadPilot Dashboard-Editors (V2). Aufbauend auf der mathematischen Rasterengine (P06), der Vier-Zonen-Shell (P05) und dem entkoppelten Editor-Kern (P04) werden folgende Kernanforderungen in Supabase/PostgreSQL und dem Frontend umgesetzt:

1. **Vollständiges relationales Schema:**
   - Tabellen `dashboard_teams`, `dashboard_team_members`, `dashboards` und `dashboard_revisions`.
   - Strenge Fremdschlüssel (`ON DELETE CASCADE` auf Organisationen) und Check-Constraints.
2. **Sicherheitsmatrix und Row-Level-Security (RLS):**
   - Sperrung aller direkten Schreibzugriffe (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) für `anon` und `authenticated`.
   - `SELECT`-Freigabe auf `dashboards` und `dashboard_revisions` strikt begrenzt auf das eigene persönliche Dashboard (`organization_id = current_organization_id() AND user_id = auth.uid() AND scope = 'personal'`).
   - Serverseitige Sperrung von `scope = 'team'` bis Paket P11 (`LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11`).
3. **Serverseitige Schema- und Sicherheitsvalidierung:**
   - `public.dashboard_config_v2_invalid_reason(p_config JSONB)` erzwingt 64-KiB-Grenze, Schema-Version 2, maximal 24 Kacheln, eindeutige Kachel-IDs, 12-Spalten-Rasterkoordinaten und lehnt beliebige fremde JSON-Attribute ab.
4. **Atomare RPCs mit optimistischem Locking und Revisionshistorie:**
   - `create_dashboard_v2`: Legt Dashboard und initiale Revision 1 in einer Transaktion an.
   - `save_dashboard_v2`: Prüft erwartete Revision (`p_expected_revision`), inkrementiert `revision + 1` und schreibt unveränderliche Revision in `dashboard_revisions`.
   - `restore_dashboard_revision_v2`: Schreibt eine neue Revision an die Spitze der Historie (kein Löschen alter Stände).
   - `load_personal_dashboard_v2`: Lädt das persönliche V2-Dashboard des aktuellen Nutzers.
5. **Deterministische, verlustfreie V1→V2-Kopiermigration:**
   - Automatische Transformation bestehender V1-Konfigurationen (`executive_dashboard_preferences`) in V2.
   - Übersetzung von Größenklassen (`klein/mittel/gross/voll`) in kollisionsfreie Rasterpositionen für Desktop, Tablet und Mobile.
   - Übernahme aller Kachel-IDs, Katalog-Referenzen und kachelspezifischer Filter.
   - Idempotenzgarantie: Markierung mit `metadata.migrated_from_v1 = true`, `last_migrated_revision = 1` und `user_edited = false`.
   - Manuell im V2-Editor bearbeitete Entwürfe (`user_edited = true`) werden niemals durch erneute Migration überschrieben.
   - Die produktive V1-Tabelle bleibt 100 % unberührt.

---

## 2. Datenbank-Schema und Indizes

### 2.1 Tabellenübersicht

```text
+-----------------------+       +----------------------------+
| dashboard_teams       | 1---N | dashboard_team_members     |
| (id, org_id, name)    |       | (id, team_id, user_id, org)|
+-----------------------+       +----------------------------+
            | 1                                
            | N                                
+-----------------------+       +----------------------------+
| dashboards            | 1---N | dashboard_revisions        |
| (id, org_id, scope,   |       | (id, dashboard_id, rev,    |
|  user_id, team_id,    |       |  title, config, created_at)|
|  revision, config)    |       +----------------------------+
+-----------------------+
```

### 2.2 Revisionshistorie

Jeder erfolgreiche Aufruf von `save_dashboard_v2` erzeugt genau eine unveränderliche Zeile in `dashboard_revisions`. Dies ermöglicht lückenlose Revisionsprotokolle, Auditierbarkeit und Rollback-Fähigkeit ohne Datenverlust.

---

## 3. Client-Speicherarchitektur und State-Synchronisation

```text
DashboardEditorShellV2 / Workspace
            |
   useDashboardV2Storage
            |
   dashboardStorageV2 (Client-Adapter)
     |               \
   Supabase RPC       In-Memory Fallback (Offline / Dev)
     |
  save_dashboard_v2 (PostgreSQL)
```

1. **Erstaufruf:**
   - Prüfen, ob für die aktuelle Organisation und den Nutzer bereits ein V2-Dashboard vorliegt.
   - Falls nein: V1-Konfiguration abrufen. Wenn V1 vorhanden ist, `migrateV1ToV2` ausführen und via `create_dashboard_v2` als Pilot-Kopie speichern.
2. **Speichern:**
   - Speichern-Button ruft `saveDashboardV2(dashboardId, expectedRevision, title, config)` auf.
   - Bei Erfolg: `revision` im State inkrementieren, `isDirty` auf `false` setzen, `metadata.user_edited = true`.
3. **Konfliktbehandlung (`LP_DASHBOARD_CONFLICT`):**
   - Wenn ein anderer Tab oder Nutzer die Revision erhöht hat, meldet der Server `LP_DASHBOARD_CONFLICT`.
   - Der Editor zeigt einen modalen Konfliktdialog:
     - *Neuladen:* Aktuellen Serverstand laden (Entwurf verwerfen).
     - *Als Kopie speichern:* Lokale Änderungen als neues persönliches Dashboard retten (`create_dashboard_v2`).

---

## 4. Deterministische Kopiermigration (V1 -> V2)

### 4.1 Koordinaten-Mapping

| V1-Größe | Desktop (12 Spalten) | Tablet (6 Spalten) | Mobile (1 Spalte) |
| :--- | :--- | :--- | :--- |
| `klein` | `w: 3, h: 3` | `w: 3, h: 3` | `w: 1, h: 3` |
| `mittel` | `w: 6, h: 4` | `w: 6, h: 4` | `w: 1, h: 4` |
| `gross` | `w: 9, h: 5` | `w: 6, h: 5` | `w: 1, h: 5` |
| `voll` | `w: 12, h: 6` | `w: 6, h: 6` | `w: 1, h: 6` |

Die Kacheln werden zeilenweise von links nach rechts gepackt. Sobald `currentX + w > cols`, erfolgt ein Umbruch auf die nächste freie Zeile `currentY += rowMaxH`.
Dadurch ist das Layout über alle Breakpoints deterministisch, frei von Überlappungen und bricht keine Mindestgrößen.

---

## 5. Verifikation und Nachweise

- **DDL & Migration:** Syntaktisch valides PostgreSQL, lauffähig in Supabase CLI und Hosted Instances.
- **Unit-Tests:** 
  - Schemavalidierung weist ungültige Breiten (`w > 12`, `x + w > 12`), fehlerhafte Typen und unbekannte Attribute ab.
  - Kopiermigration erzeugt valide V2-Konfigurationen mit exakten Breakpoint-Layouts.
  - Speicheradapter fängt Fehler strukturiert ab.
- **UI-Tests:**
  - Speichern aktualisiert Revision und hebt Dirty-Zustand auf.
  - Revisionskonflikt wird abgefangen und verständlich angezeigt.
  - V1-Bestandspfad bleibt 100 % funktionsfähig.
