# Auftrag 146 – Dashboard-Editor: Grid-Vergleich und Ziel-Speichermodell (P03)

**Ziel:** Fundierte Evaluation und Benchmark der Rasterengine-Kandidaten für 24 heterogene Kacheln, verbindliche Festlegung der Rasterarchitektur sowie Spezifikation des vollständigen relationalen V2-Ziel-Speichermodells (Supabase-Tabellen, Indizes, RLS, atomare RPCs) und des deterministischen V1→V2-Kopiermigrations-Algorithmus.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P03 sowie Abschnitte 1, 3, 5.1, 5.2 und 5.3.

**Vorgelagert:** [Auftrag 144 (Bestandsprüfung, PR #168)](./ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md) und [Auftrag 145 (UX-Konzept & Fachverträge, PR #169)](./ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md) mit [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md).

**Baseline:** `main`, Commit `e19d8397b988a087fca3a5257184d65a01025653` (nach Merge von PR #169).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** IN BEARBEITUNG (Branch: `auftrag-146-dashboard-editor-grid-ziel-speichermodell`).

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag setzt Paket P03 aus dem Dashboard-Editor-Masterplan um. Er schafft die verbindliche technische und datenbankseitige Baugrundlage für die folgenden Umsetzungspakete P04–P07 (Editor-Kern, Shell, Rasterengine und Datenbankmigration).

Am Ende liegen vor:

- Ein umfassendes technisches Architektur- und Spezifikationsdokument (`docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md`), das folgende Bereiche vollständig abdeckt:
  1. **Grid-Engine-Vergleich & Benchmark (24 heterogene Kacheln):**
     - Quantitative und qualitative Bewertung von `react-grid-layout`, `@dnd-kit` und einer maßgeschneiderten internen CSS-Grid-Engine.
     - Messungen: Berechnungs- und Packlatenz bei 24 heterogenen Kacheln (Desktop 12 Spalten, Tablet 6 Spalten, Mobile 1 Spalte), DOM-Komplexität, Frame-Budgets, Bundle-Impact (KB min+gzip) und Tree-Shaking.
     - Qualitätskriterien: React 18 Strict Mode Kompatibilität, WAI-ARIA `grid`-Tastaturbedienung (`Alt+Pfeiltasten`), Touch-Verhalten und deterministischer Kollisions-Reflow.
     - Verbindliche Architekturentscheidung und Begründung (ohne schwere Drittanbieter-Abhängigkeiten oder Begründung für Freigabeanträge).
  2. **Vollständiges relationales Ziel-Speichermodell (V2 für Supabase):**
     - Exakte DDL-Definitionen für `dashboards`, `dashboard_revisions`, `dashboard_teams` und `dashboard_team_members`.
     - Constraints, Primär- und Fremdschlüssel, Integritätsregeln und performante Indizes.
     - RLS-Sicherheitsmatrix mit strikter Mandantentrennung über `organization_id` und phasenweiser Freischaltung (in P07 ausschließlich `personal`, `team` serverseitig gesperrt bis P11).
  3. **Atomare Server-RPC-Verträge & Validierung:**
     - Spezifikation der PostgreSQL-Funktionen `save_dashboard_v2`, `get_dashboard_v2`, `list_dashboards_v2`, `restore_dashboard_revision_v2` und `migrate_v1_to_v2_dashboard`.
     - Optimistisches Locking über `p_expected_revision` (HTTP 409 `REVISION_CONFLICT`) und automatische persistente Revisionshistorie.
     - Serverseitiger JSON-Schema- und Größenvalidator `dashboard_config_v2_invalid_reason(p_config JSONB)` (Begrenzung auf 64 KiB, max. 24 Kacheln, Typsicherheit aller Felder).
  4. **Deterministischer V1→V2-Kopiermigrations-Algorithmus:**
     - Vollständige Spezifikation der Transformation von `executive_dashboard_preferences` (V1) nach `dashboards` (V2).
     - Erhalt der bestehenden V1-Kachel-IDs ohne UUID-Zwang (Wahrung der Identitätsstabilität).
     - Breakpoint-spezifische Koordinaten- und Größenberechnung (`'klein'`, `'mittel'`, `'gross'`, `'voll'`).
     - Idempotenzgarantie: Bearbeitete V2-Kopien werden niemals überschrieben; V1 bleibt unverändert schreibgeschützt.
- Aktualisierung von `BUILD_PLAN.md` und Builder-Eintrag in `docs/BUILD_LOG.md`.

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt einhalten. Die Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Kein Produktcode in `src/` und keine aktiven Datenbankmigrationen in `supabase/migrations/` in diesem Spezifikationsschritt. Die eigentliche Code-Implementierung erfolgt geordnet in P04 (Editor-Kern), P05 (Editor-Shell), P06 (Rasterengine) und P07 (Supabase-Migrationen).
3. Teams bleiben reine Freigabegruppen innerhalb einer Organisation (keine CRM-Owner-Felder an Deals oder Kontakten).
4. V1-Daten und bestehende Endpunkte bleiben vollständig unberührt und lesbar.

---

## 3. Ziel-Dateien

| Pfad                                                                                  | Erlaubte Änderung / Zweck                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_146_DASHBOARD_EDITOR_GRID_ZIEL_SPEICHERMODELL.md` | Dieser Auftrag                                                                  |
| `docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md`                                     | Neu: Spezifikation Grid-Evaluation, V2-Speichermodell und Kopiermigration (P03) |
| `docs/BUILD_LOG.md`                                                                   | Builder-Eintrag für Auftrag 146 und Prüfnachweis                                |
| `BUILD_PLAN.md`                                                                       | Statusaktualisierung auf Auftrag 146                                            |

---

## 4. Aufgaben in Reihenfolge

### T1 – Grid-Engine-Vergleich und Benchmark (24 heterogene Kacheln)

- [ ] Messung der Pack- und Layout-Berechnung für 24 Kacheln (Desktop 12, Tablet 6, Mobile 1 Spalte).
- [ ] Vergleich von `react-grid-layout`, `@dnd-kit` und maßgeschneiderter nativer CSS-Grid-Engine bzgl. Bundle Size, A11y (WAI-ARIA `grid`), Touch-Verhalten und React 18 Strict Mode.
- [ ] Fundierte Auswahl und Begründung der Engine für LeadPilot.

### T2 – Vollständiges relationales Ziel-Speichermodell (V2) spezifizieren

- [ ] Exakte Tabellenstrukturen mit DDL für `dashboards`, `dashboard_revisions`, `dashboard_teams` und `dashboard_team_members`.
- [ ] Definition von Primärschlüsseln, Fremdschlüsseln, Indizes und Integritäts-Constraints.
- [ ] RLS-Sicherheitsmatrix mit strikter Mandantentrennung und phasenweiser Freischaltung (persönlich in P07, Team gesperrt bis P11).

### T3 – Atomare Server-RPCs und serverseitige Validierung festlegen

- [ ] Spezifikation von `save_dashboard_v2` mit optimistischem Locking (`expected_revision`), Fehlercodes und atomarer Revisionserstellung.
- [ ] Spezifikation von `get_dashboard_v2`, `list_dashboards_v2` und `restore_dashboard_revision_v2`.
- [ ] Serverseitige Schema- und Größenvalidierung `dashboard_config_v2_invalid_reason` (max. 64 KiB, max. 24 Kacheln).

### T4 – Deterministische V1→V2-Kopiermigration definieren

- [ ] Regelwerk für Größen- und Koordinatenmapping (`'klein'`, `'mittel'`, `'gross'`, `'voll'`).
- [ ] Breakpoint-spezifische Layoutberechnung ohne Überlappung.
- [ ] Erhalt der bestehenden V1-Kachel-IDs (Identitätsstabilität).
- [ ] Idempotenz- und Konfliktbehandlung (kein Überschreiben bearbeiteter V2-Dashboards).

### T5 – Spezifikationsdokument `GRID_VERGLEICH_ZIELMODELL_146.md` ausarbeiten

- [ ] Alle Ergebnisse aus T1–T4 konsolidieren, verständlich strukturieren und dokumentieren.

### T6 – Verifizieren, Dokumentieren und PR öffnen

- [ ] Pflichtprüfungen (`tsc`, `lint`, `format:check`) ausführen.
- [ ] Schutzbereichs-Diff prüfen (strikt 0 Bytes gegen `e19d839`).
- [ ] `docs/BUILD_LOG.md` und `BUILD_PLAN.md` aktualisieren.
- [ ] PR auf GitHub öffnen und Codex-Review anfordern.
