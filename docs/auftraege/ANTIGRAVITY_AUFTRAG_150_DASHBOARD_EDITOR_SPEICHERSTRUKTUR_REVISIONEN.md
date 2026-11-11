# Auftrag 150 – Dashboard-Editor: Ziel-Speicherstruktur, RLS, dauerhafte Revisionen und V1→V2-Kopiermigration (P07)

**Ziel:** Vollständige Bereitstellung der relationalen Ziel-Speicherstruktur (Paket P07 aus dem Dashboard-Editor-Masterplan) für den neuen Dashboard-Editor V2 in Supabase/PostgreSQL und TypeScript-Client-Adaptern. Anlegen der Tabellen `dashboards`, `dashboard_revisions`, `dashboard_teams` und `dashboard_team_members` mit striktem Row-Level-Security (RLS), serverseitigen Schema- und Größen-Validatoren (`dashboard_config_v2_invalid_reason`), atomarer Speicherung mit optimistischem Locking und Revisionshistorie (`save_dashboard_v2`, `create_dashboard_v2`, `restore_dashboard_revision_v2`), serverseitiger Sperrung des Team-Scopes bis P11, sowie einer deterministischen, idempotenten V1→V2-Kopiermigration (`migrateV1ToV2` / `copy_v1_to_v2_migration`), die bestehende persönliche V1-Konfigurationen verlustfrei als V2-Pilotkopie bereitstellt, ohne die produktive V1-Speicherzeile (`executive_dashboard_preferences`) zu modifizieren.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P07 sowie Abschnitte 4.A, 5.1, 5.3 und 6.

**Vorgelagert:**
- [Auftrag 144 (Bestandsprüfung, PR #168)](./ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md)
- [Auftrag 145 (UX-Konzept & Fachverträge, PR #169)](./ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md) mit [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md)
- [Auftrag 146 (Grid-Vergleich & Ziel-Speichermodell, PR #170)](./ANTIGRAVITY_AUFTRAG_146_DASHBOARD_EDITOR_GRID_ZIEL_SPEICHERMODELL.md) mit [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md)
- [Auftrag 147 (Entkopplung des Editor-Kerns, PR #171 & #172)](./ANTIGRAVITY_AUFTRAG_147_DASHBOARD_EDITOR_KERN_ENTKOPPELN.md) mit [EDITOR_KERN_P04.md](../dashboard/EDITOR_KERN_P04.md)
- [Auftrag 148 (Vier-Zonen-Shell, Bibliothek, Inspector, PR #173)](./ANTIGRAVITY_AUFTRAG_148_DASHBOARD_EDITOR_SHELL_BIBLIOTHEK_INSPECTOR.md) mit [EDITOR_SHELL_P05.md](../dashboard/EDITOR_SHELL_P05.md)
- [Auftrag 149 (Rasterengine, PR #174)](./ANTIGRAVITY_AUFTRAG_149_DASHBOARD_EDITOR_RASTERENGINE.md) mit [RASTERENGINE_P06.md](../dashboard/RASTERENGINE_P06.md)

**Baseline:** `main`, Commit `49d7ea0` (nach Merge von PR #174).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** IN ARBEIT.

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag setzt Paket P07 aus dem Dashboard-Editor-Masterplan um. Er schafft das dauerhafte relationale Speicher- und Revisionsfundament für den neuen Dashboard-Editor (V2) und verknüpft die in P04–P06 gebaute Editor-Shell mit persistenter Supabase-Speicherung und deterministischer Migration.

Am Ende liegen vor:

1. **Supabase SQL-Migration (`supabase/migrations/20261113_dashboard_v2_storage_and_revisions.sql`):**
   - Tabellen `public.dashboard_teams`, `public.dashboard_team_members`, `public.dashboards` und `public.dashboard_revisions` mit Foreign Keys, Indizes und Check-Constraints.
   - Strikte RLS-Policies und Berechtigungen: Alle Direktmutationen (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) durch `anon` und `authenticated` gesperrt (`REVOKE`). `SELECT` auf eigene persönliche Dashboards und Revisionen beschränkt.
   - Serverseitige Schema- und Sicherheitsvalidierung `public.dashboard_config_v2_invalid_reason(p_config JSONB)`:
     - Maximalgröße 64 KiB.
     - Schema-Version strikt 2.
     - Maximale Kachelanzahl 24.
     - Keine SQL-Fragmente oder unzulässige Top-Level-Felder.
     - Einhaltung der 12-Spalten-Koordinaten für Desktop (`x+w <= 12`, `w >= 1`, `h >= 1`, `h <= 24`).
   - Atomare RPC-Funktionen mit optimistischem Locking:
     - `public.create_dashboard_v2(p_title, p_config, p_scope, p_team_id, p_description)`: Legt Dashboard und initiale Revision 1 in einer Transaktion an.
     - `public.save_dashboard_v2(p_dashboard_id, p_expected_revision, p_title, p_config, p_change_summary)`: Atomare Revisionserhöhung (`revision + 1`), Prüfen von `expected_revision` gegen Lost Updates, unveränderlicher Eintrag in `dashboard_revisions`.
     - `public.restore_dashboard_revision_v2(p_dashboard_id, p_target_revision, p_expected_revision)`: Erzeugt eine neue Revision an der Spitze der Revisionshistorie aus einem vergangenen Snapshot.
     - `public.load_personal_dashboard_v2()`: Lädt das persönliche V2-Dashboard des aktuellen Nutzers.
     - `public.get_dashboard_v2_revisions(p_dashboard_id)`: Liefert die Revisionsliste für Audit und Versionshistorie.
   - Serverseitige Sperre für `scope = 'team'` bis Paket P11 (`LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11`).

2. **Deterministische V1→V2-Kopiermigration (`src/features/dashboard/services/dashboardMigrationV1toV2.ts`):**
   - Verlustfreie Transformation von `executive_dashboard_preferences` (V1) in `DashboardConfigV2` (V2).
   - Abbildung alter Größenklassen (`klein`, `mittel`, `gross`, `voll`) auf exakte Rasterkoordinaten (`w, h, x, y`) für alle 3 Breakpoints ohne Überlappungen.
   - 1:1 Erhalt aller Kachel-IDs (`tileId` -> `id`) und Metrik-Katalog-IDs (`catalogId`).
   - Übernahme von Kachel-Filterausnahmen (`filterMode`, `period`, `pipeline`) in V2-Overrides und Queries.
   - Idempotenzgarantie: Markierung mit `metadata.migrated_from_v1 = true` und `user_edited = false`. Manuell bearbeitete V2-Kopien werden niemals still überschrieben.
   - Die produktive V1-Tabelle `executive_dashboard_preferences` bleibt unverändert und zu 100 % funktionsfähig für reguläre Nutzer.

3. **Client-Speicheradapter (`src/features/dashboard/services/dashboardStorageV2.ts`):**
   - Strukturierte Fehlertypisierung (`DashboardV2StorageError`: `konflikt`, `ungueltig`, `nicht_gefunden`, `nicht_berechtigt`, `sitzung_abgelaufen`, `nicht_konfiguriert`, `technisch`).
   - Methoden: `loadPersonalDashboardV2()`, `saveDashboardV2()`, `createDashboardV2()`, `getDashboardRevisions()`, `restoreDashboardRevision()`.
   - Robuster Offline-/In-Memory-Fallback für lokale Entwicklung und Testumgebungen.

4. **Integration in V2-Editor-Shell (`DashboardEditorShellV2.tsx` / Workspace):**
   - Laden des V2-Dashboards über `dashboardStorageV2`. Falls noch kein V2-Dashboard existiert, automatische On-Demand-Kopiermigration aus V1.
   - Speichern-Button ruft `saveDashboardV2` auf, führt Revision nach, aktualisiert Clean-State und setzt `metadata.user_edited = true`.
   - Browser-Reload erhält das bearbeitete Layout vollständig.
   - Mehrtab-Konfliktbehandlung: Bei `konflikt` verständliche Benachrichtigung im UI und Angebot zum Neuladen oder Speichern als neue persönliche Kopie.

5. **Testabdeckung:**
   - Vitest-Tests für Schemavalidierung, Kopiermigration, Speicheradapter, optimistisches Locking und Revisionshistorie.
   - UI-/Integrationstests für Lade-/Speicherzyklen, Revisionsfortschreibung und Konfliktfall.
   - Vollständige Einhaltung aller Qualitätsbudgets und Schutzbereichsgrenzen.

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt einhalten. Die Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Der V1-Bestandspfad (`executive_dashboard_preferences`) bleibt 100 % funktionsfähig; V2 bleibt hinter `isDashboardEditorV2Enabled()`.
3. Keine neuen externen npm-Abhängigkeiten in `package.json` (0 KiB zusätzliches Third-Party-Gewicht).
4. Einhaltung der Dateigrößengrenze (< 400 Zeilen je Datei nach ESLint `max-lines`).

---

## 3. Ziel-Dateien

| Pfad | Erlaubte Änderung / Zweck |
| :--- | :--- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_150_DASHBOARD_EDITOR_SPEICHERSTRUKTUR_REVISIONEN.md` | Dieser Auftrag |
| `docs/dashboard/SPEICHERSTRUKTUR_REVISIONEN_P07.md` | Neu: Architektur- und Funktionsspezifikation der Ziel-Speicherstruktur (P07) |
| `supabase/migrations/20261113_dashboard_v2_storage_and_revisions.sql` | Neu: SQL-DDL für Dashboards, Revisions, Teams, RLS und atomare RPCs |
| `src/features/dashboard/services/dashboardMigrationV1toV2.ts` | Neu: Deterministische, idempotente Kopiermigration V1 -> V2 |
| `src/features/dashboard/services/dashboardStorageV2.ts` | Neu: Client-Speicheradapter mit RPC-Aufrufen und Offline-Fallback |
| `src/features/dashboard/hooks/useDashboardV2Storage.ts` | Neu: React-Hook für Laden, Speichern, Revisionsabfrage und Konfliktbehandlung |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx` | Erweitern: Anbindung an persistenten Speicheradapter, Speichern & Konfliktdialog |
| `src/features/dashboard/__tests__/dashboardStorageV2.vitest.ts` | Neu: Unittests für Storage-Adapter, Migration und RPC-Typisierung |
| `src/features/dashboard/__tests__/dashboardMigrationV1toV2.vitest.ts` | Neu: Unittests für die deterministische V1->V2-Kopiermigration |
| `src/features/dashboard/__tests__/dashboardEditorV2Persistence.ui.vitest.tsx` | Neu: UI- und Integrationstests für Speicher- und Konfliktfluss |
| `docs/BUILD_LOG.md` | Builder-Eintrag & Prüfnachweis |
| `BUILD_PLAN.md` | Statusaktualisierung |
