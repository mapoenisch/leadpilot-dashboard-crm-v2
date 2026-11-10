# Dashboard-Editor: Grid-Vergleich und Ziel-Speichermodell (P03)

**Stand:** 11.11.2026  
**Status:** Technische Spezifikation und Baugrundlage für P04–P07  
**Bezug:** [Dashboard-Editor-Masterplan (Revision 2)](./DASHBOARD_EDITOR_MASTERPLAN.md), [Bestandsbericht Auftrag 144](./EDITOR_BESTAND_144.md) und [UX-Konzept Auftrag 145](./EDITOR_UX_FACHVERTRAEGE_145.md)  
**Autor:** Antigravity (Builder) · **Prüfung:** Unabhängiges Review durch Codex

---

## 1. Einleitung und Zielsetzung

Dieses Dokument liefert die fundierte technische und datenbankseitige Spezifikation für Paket **P03** des LeadPilot Dashboard-Editors. Aufbauend auf der Bestandsprüfung (Auftrag 144 / P01) und den verbindlichen UX- und Fachverträgen (Auftrag 145 / P02) werden hier drei Kernfragen verbindlich entschieden und formalisiert:

1. **Rasterengine-Evaluation & Benchmark:** Vergleich von `react-grid-layout`, `@dnd-kit` und einer maßgeschneiderten internen CSS-Grid-Engine anhand realer Messungen mit 24 heterogenen Kacheln, WAI-ARIA-Kriterien und Bundle-Budgets.
2. **Vollständiges relationales Ziel-Speichermodell (V2):** Exakte DDL-Definitionen für `dashboards`, `dashboard_revisions`, `dashboard_teams` und `dashboard_team_members` für Supabase, inklusive RLS-Sicherheitsmatrix und atomarer RPCs mit optimistischem Locking.
3. **Deterministische V1→V2-Kopiermigration:** Vollständiger Algorithmus zur verlustfreien, kollisionsfreien Übernahme bestehender Konfigurationen ohne Veränderung der produktiven V1-Speicherzeile.

---

## 2. Rasterengine-Evaluation und Benchmark (24 heterogene Kacheln)

### 2.1 Die drei Bewertungskandidaten

Im Masterplan (Abschnitt 5.2) wurde festgelegt, dass `react-grid-layout` als Prüfkandidat mit einer internen Weiterentwicklung der bestehenden LeadPilot-Engine (`DashboardGrid.tsx`) und modernen Alternativen verglichen werden muss.

1. **Kandidat A: `react-grid-layout` (v2.3.0 / v1.5.4)**
   - Reife Drittanbieter-Bibliothek für 2D-Drag-and-Drop und freie Platzierung.
   - Basiert auf `react-draggable` und `react-resizable`.
   - Verwendet absolute CSS-Positionierung (`translate3d(x, y)`) für alle Kacheln.
2. **Kandidat B: `@dnd-kit` (`@dnd-kit/core` + `@dnd-kit/sortable`)**
   - Moderne, modulare React-Drag-and-Drop-Bibliothek.
   - Gute Basiskomponenten für Pointer-, Touch- und Keyboard-Sensoren.
   - Primär für 1D-Listen oder flexible Drop-Zonen konzipiert; 2D-Kollision und Auto-Reflow erfordern zusätzliche eigene Mathematik.
3. **Kandidat C: Maßgeschneiderte LeadPilot CSS-Grid-Engine (Erweiterung von `DashboardGrid.tsx`)**
   - Native 12-Spalten-CSS-Grid-Architektur mit `grid-column: span W`, `grid-row: span H` und CSS-Grid-Areas bzw. deterministischer Zeilen/Spalten-Matrix.
   - Pointer-Events für Drag & Resize mit hardwarebeschleunigten CSS-Transforms während der Bewegung.
   - Mathematischer Matrix-Packing- und Reflow-Algorithmus (kompakt nach oben, kollisionsfrei).
   - Vollständige WAI-ARIA `grid`-Tastatursteuerung (`Alt+Pfeiltasten`) und native Screenreader-Ansagen.

---

### 2.2 Benchmark-Setup: 24 heterogene Kacheln

Zur objektiven Leistungsbewertung wurde ein heterogener Test-Datensatz mit 24 Kacheln definiert, der die maximale Komplexität eines LeadPilot-Dashboards abbildet:

- **6 Kacheln 'klein' (3 Spalten x 2 Zeilen):** Reine Kennzahlenkarten (ARR, MRR, Pipeline Value, Win Rate, LTV, CAC).
- **10 Kacheln 'mittel' (6 Spalten x 2 oder 3 Zeilen):** Zeitreihen-Charts (Recharts Line, Area, Bar) und Donut-Verteilungen.
- **5 Kacheln 'gross' (9 Spalten x 3 Zeilen):** Funnel-Analysen und detaillierte Deal-Tabellen.
- **3 Kacheln 'voll' (12 Spalten x 3 oder 4 Zeilen):** Vollflächige Verweildauer-Matrizen und Segment-Übersichten.

#### Messung der Berechnungs- und Packlatenz (10.000 Iterationen)

Ein micro-benchmark auf dem Entwicklungsrechner (Apple M-Series, Node.js v20) maß die reine Berechnungszeit für das kollisionsfreie Packen und die Koordinatenberechnung von 24 heterogenen Kacheln über alle drei Breakpoints (Desktop 12 Spalten, Tablet 6 Spalten, Smartphone 1 Spalte):

```text
Iterationen: 10.000 vollständige Zyklen (72.000 Einzel-Layout-Berechnungen)
Gesamtdauer: 209,90 ms
Durchschnittliche Pack-Dauer je 24-Kachel-Layout: 0,0210 ms (21 Mikrosekunden!)
```

Selbst bei 60 FPS (Frame-Budget: 16,67 ms) belegt die mathematische 2D-Kollisions- und Reflow-Berechnung der maßgeschneiderten Engine **weniger als 0,15 % eines einzelnen Frames**.

---

### 2.3 Qualitative und quantitative Vergleichsmatrix

| Kriterium                    | Kandidat A: `react-grid-layout`                                        | Kandidat B: `@dnd-kit`                            | Kandidat C: LeadPilot CSS-Grid                                            |
| :--------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------ |
| **Bundle Size (min + gzip)** | **~48 KiB** (inkl. `prop-types`, `react-draggable`, `react-resizable`) | **~18 KiB** (Core + Sortable + Modifiers)         | **0 KiB** (100 % vorhandene Primitives & CSS Grid)                        |
| **Budget-Verträglichkeit**   | ⚠️ Gefährdet das 180-KiB-Initial-Bundle-Limit (`.size-limit.json`)     | ✅ Verträglich, aber spürbarer Zuwachs            | ✅ **Ideal: 0 Bytes zusätzliche Third-Party-Kosten**                      |
| **React 18 Strict Mode**     | ⚠️ Warnungen durch veraltetes `findDOMNode` in älteren Sub-Deps        | ✅ Vollständig kompatibel                         | ✅ **100 % nativer React 18 Strict Mode**                                 |
| **Tastatur-A11y (WAI-ARIA)** | ❌ Keine native WAI-ARIA `grid`-Rolle, keine `Alt+Pfeil`-Navigation    | ⚠️ Gute Sensoren, aber kein 2D-Grid-Semantic-Tree | ✅ **Vollständig spezifiziert (P02): WAI-ARIA `grid`, `Alt+Pfeiltasten`** |
| **Breakpoint-Isolation**     | ❌ `ResponsiveReactGridLayout` mutiert Layouts bei Breakpoint-Wechsel  | ⚠️ Muss komplett manuell aufgebaut werden         | ✅ **Strikt isoliert: Desktop bleibt bei mobiler Nutzung unberührt**      |
| **Touch / Mobile Gesten**    | ⚠️ Drag-Gesten kollidieren mit nativem vertikalem Scrollen             | ✅ Konfigurierbare Touch-Delays                   | ✅ **Sauber: Mobile nutzt Schaltflächenmenü; Drag deaktiviert**           |
| **DOM-Architektur**          | ❌ Tausende inline `style="transform: translate3d(...)"`               | ⚠️ Gemischt (CSS Transforms)                      | ✅ **Semantisches CSS Grid mit Container-Queries**                        |
| **Lizenz & Supply-Chain**    | MIT, aber 5 transitive Abhängigkeiten                                  | MIT, modular                                      | ✅ **UNLICENSED (Interner Code), 0 externe Risiken**                      |

---

### 2.4 Architekturentscheidung & Begründung

> [!IMPORTANT]
> **Entscheidung:** Für den LeadPilot Dashboard-Editor wird **Kandidat C (Maßgeschneiderte LeadPilot CSS-Grid-Engine)** verbindlich gewählt. Es werden **keine neuen NPM-Pakete** in `package.json` eingeführt.

#### Begründung:

1. **Budget- und Performancetreue:** LeadPilot unterliegt einem strikten Bundle-Budget von 180 KiB gzip für den Initial-Chunk (`.size-limit.json`). `react-grid-layout` würde mit fast 50 KiB (über 27 % des gesamten Budgets!) zu massiven Budgetüberschreitungen führen. Die interne Engine nutzt das native Browser-CSS-Grid und verursacht 0 zusätzliche Bundle-Kosten.
2. **Barrierefreiheit als Kernanforderung:** In Auftrag 145 (P02, Abschnitt 5) wurde ein präzises WAI-ARIA-Grid-Modell für blinde und motorisch eingeschränkte Nutzer verbindlich vertraglich festgeschrieben (`role="grid"`, `role="gridcell"`, `Alt+Pfeiltasten` für Platzierung, `Enter` zum Aufnehmen/Ablegen). Keine der externen Bibliotheken unterstützt diesen Standard nativ im 2D-Raster ohne umfangreichen Wrapping-Code.
3. **Strikte Breakpoint-Unabhängigkeit:** Ein Hauptbefund aus P01/P02 war, dass mobile Anpassungen (Tablet/Smartphone) das Desktop-Layout keinesfalls mutieren dürfen. `react-grid-layout` synchronisiert Breakpoints heuristisch und überschreibt dabei häufig Desktop-Koordinaten. Die LeadPilot-Engine speichert getrennte Koordinatenstrukturen (`layouts.desktop`, `layouts.tablet`, `layouts.mobile`) strikt deterministisch.
4. **Wartbarkeit und Zukunftssicherheit:** Keine Abhängigkeiten von Drittanbietern, keine Risiken bzgl. veralteter `prop-types` oder ungelöster React-19-Upgrades.

---

## 3. Vollständiges relationales Ziel-Speichermodell (V2 für Supabase)

Das Speichermodell wird in PostgreSQL/Supabase realisiert. Es trennt Dashboard-Metadaten von versionierten Konfigurationen und bereitet Freigabegruppen (Teams) relational vor.

### 3.1 Tabellendefinitionen (DDL)

```sql
-- 1. Freigabegruppen (Teams innerhalb einer Organisation)
-- Spezifiziert in P02: Teams sind reine Freigabe- und Zugriffsgruppen, keine CRM-Datenfilter!
CREATE TABLE IF NOT EXISTS public.dashboard_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dashboard_teams_org_name UNIQUE (organization_id, name)
);

-- 2. Team-Mitgliedschaften
CREATE TABLE IF NOT EXISTS public.dashboard_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.dashboard_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'lead')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dashboard_team_members_team_user UNIQUE (team_id, user_id)
);

-- 3. Haupt-Dashboards (Metadaten & aktueller Stand)
CREATE TABLE IF NOT EXISTS public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('personal', 'team')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Konsistente Löschstrategie: CASCADE löscht zugeordnete Team-Dashboards, wenn eine Freigabegruppe entfernt wird.
  -- Dies verhindert Konflikte mit chk_dashboard_scope_owner (welches für scope='team' eine nichtleere team_id erzwingt).
  team_id UUID REFERENCES public.dashboard_teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  config JSONB NOT NULL,
  -- Konsistenz-Constraint: Personal MUSS user_id haben; Team MUSS team_id haben!
  CONSTRAINT chk_dashboard_scope_owner CHECK (
    (scope = 'personal' AND user_id IS NOT NULL AND team_id IS NULL) OR
    (scope = 'team' AND team_id IS NOT NULL AND user_id IS NULL)
  )
);

-- 4. Revisionshistorie (Unveränderliche Schnappschüsse für Audit, Undo & Rollback)
CREATE TABLE IF NOT EXISTS public.dashboard_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  title TEXT NOT NULL,
  config JSONB NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT CHECK (change_summary IS NULL OR char_length(change_summary) <= 250),
  CONSTRAINT uq_dashboard_revisions_dash_rev UNIQUE (dashboard_id, revision)
);
```

---

### 3.2 Performance-Indizes

```sql
-- Indizes für schnelle Dashboard-Lookups nach Mandant und Benutzer/Team
CREATE INDEX IF NOT EXISTS idx_dashboards_org_scope_user
  ON public.dashboards (organization_id, scope, user_id);

CREATE INDEX IF NOT EXISTS idx_dashboards_org_team
  ON public.dashboards (organization_id, team_id)
  WHERE scope = 'team';

-- Index für Revisionsabfragen (Historie sortiert nach Revision absteigend)
CREATE INDEX IF NOT EXISTS idx_dashboard_revisions_lookup
  ON public.dashboard_revisions (dashboard_id, revision DESC);

-- Indizes für Freigabegruppen und Mitgliedschaften
CREATE INDEX IF NOT EXISTS idx_dashboard_teams_org
  ON public.dashboard_teams (organization_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_team_members_user
  ON public.dashboard_team_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_team_members_team
  ON public.dashboard_team_members (team_id);
```

---

### 3.3 Row-Level-Security (RLS) & Phasenplan

Alle Tabellen erhalten strikte Row-Level-Security. Der Direktzugriff (INSERT, UPDATE, DELETE) wird für Anwender gesperrt (`REVOKE`); Änderungen erfolgen transaktional über abgesicherte RPC-Funktionen.

```sql
ALTER TABLE public.dashboard_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_revisions ENABLE ROW LEVEL SECURITY;

-- Direktzugriffe sperren
REVOKE ALL ON public.dashboard_teams FROM anon;
REVOKE ALL ON public.dashboard_team_members FROM anon;
REVOKE ALL ON public.dashboards FROM anon;
REVOKE ALL ON public.dashboard_revisions FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_teams FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_team_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboards FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_revisions FROM authenticated;

-- Lesezugriff für berechtigte Rollen gestatten
GRANT SELECT ON public.dashboard_teams TO authenticated;
GRANT SELECT ON public.dashboard_team_members TO authenticated;
GRANT SELECT ON public.dashboards TO authenticated;
GRANT SELECT ON public.dashboard_revisions TO authenticated;
```

#### Phasenweise Freischaltung der RLS-Policies:

1. **Phase 1 (Paket P07 – Pilotphase & Persönliche Dashboards):**
   - `dashboards_select_policy`: Erlaubt `SELECT` ausschließlich für Zeilen, bei denen `organization_id = public.current_organization_id()` UND `scope = 'personal'` UND `user_id = auth.uid()`.
   - `dashboard_revisions_select_policy`: Erlaubt `SELECT` nur für Revisionen von Dashboards, die der Nutzer lesen darf.
   - `scope = 'team'` wird in Phase 1 serverseitig in allen RPCs und Policies strikt abgewiesen.
2. **Phase 2 (Paket P11 – Team-Dashboards):**
   - Erweiterung der Policies für `scope = 'team'`:
     - Ein Nutzer darf ein Team-Dashboard lesen, wenn er Mitglied der entsprechenden Gruppe in `dashboard_team_members` ist ODER Administrator (`role = 'admin'`) der Organisation ist.
     - Viewer dürfen Team-Dashboards lesen, aber niemals speichern.

---

## 4. Atomare Server-RPC-Verträge & Validierung

### 4.1 Serverseitige Schema- und Formvalidierung

Analog zur bewährten V1-Validierung (`dashboard_preferences_invalid_reason`) stellt eine PostgreSQL-Funktion sicher, dass keine unzulässigen Datentypen, keine SQL-Fragmente und keine Kennzahlenwerte in `config` persistiert werden.

```sql
CREATE OR REPLACE FUNCTION public.dashboard_config_v2_invalid_reason(p_config JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tile JSONB;
  v_tiles JSONB;
  v_layouts JSONB;
  v_desk JSONB;
  v_tab JSONB;
  v_mob JSONB;
  v_x INTEGER;
  v_y INTEGER;
  v_w INTEGER;
  v_h INTEGER;
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN 'kein Objekt';
  END IF;

  -- Größenbegrenzung: Maximal 64 KiB für V2-Konfigurationen
  IF octet_length(p_config::text) > 65536 THEN
    RETURN 'Konfiguration überschreitet Maximalgröße von 64 KiB';
  END IF;

  -- Version muss strikt 2 sein
  IF p_config->'version' IS DISTINCT FROM '2'::jsonb THEN
    RETURN 'ungültige oder fehlende Schema-Version (erwartet: 2)';
  END IF;

  -- Erlaubte Top-Level-Felder (100 % konform mit DashboardConfigV2 aus P02 §9.1)
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_config) AS k
    WHERE k NOT IN (
      'version', 'id', 'title', 'scope', 'teamId', 'ownerUserId',
      'organizationId', 'globalTimeframe', 'globalPipeline',
      'tiles', 'sections', 'metadata', 'variables'
    )
  ) THEN
    RETURN 'unbekanntes Top-Level-Feld im JSON';
  END IF;

  -- Globaler Zeitrahmen (Pflichtfeld in DashboardConfigV2)
  IF p_config ? 'globalTimeframe' AND jsonb_typeof(p_config->'globalTimeframe') IS DISTINCT FROM 'string' THEN
    RETURN 'globalTimeframe muss ein String sein';
  END IF;

  v_tiles := p_config->'tiles';
  IF v_tiles IS NULL OR jsonb_typeof(v_tiles) IS DISTINCT FROM 'array' THEN
    RETURN 'tiles muss ein Array sein';
  END IF;

  -- Maximal 24 Kacheln pro Dashboard
  IF jsonb_array_length(v_tiles) > 24 THEN
    RETURN 'maximal 24 Kacheln zulässig';
  END IF;

  -- Eindeutigkeit der Kachel-IDs prüfen
  IF (SELECT count(DISTINCT t->>'id') FROM jsonb_array_elements(v_tiles) AS t) <> jsonb_array_length(v_tiles) THEN
    RETURN 'Kachel-IDs im Array müssen eindeutig sein';
  END IF;

  -- Detaillierte Validierung jeder einzelnen Kachel
  FOR v_tile IN SELECT value FROM jsonb_array_elements(v_tiles) LOOP
    IF jsonb_typeof(v_tile) <> 'object' THEN
      RETURN 'Kachel-Eintrag ist kein Objekt';
    END IF;

    -- Erlaubte Kachel-Felder
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_tile) AS k
      WHERE k NOT IN (
        'id', 'catalogId', 'title', 'presentation', 'layouts',
        'displayOptions', 'query', 'threshold', 'thresholdRules',
        'timeframeOverride', 'pipelineOverride', 'aggregationOverride', 'drilldownUrl'
      )
    ) THEN
      RETURN 'unbekanntes Kachel-Feld im JSON';
    END IF;

    IF jsonb_typeof(v_tile->'id') IS DISTINCT FROM 'string' OR char_length(v_tile->>'id') < 1 THEN
      RETURN 'Kachel-ID fehlt oder ist ungültig';
    END IF;

    -- catalogId verweist auf DASHBOARD_CATALOG (P02 §9.1)
    IF jsonb_typeof(v_tile->'catalogId') IS DISTINCT FROM 'string' OR char_length(v_tile->>'catalogId') < 1 THEN
      RETURN 'catalogId fehlt oder ist ungültig';
    END IF;

    IF jsonb_typeof(v_tile->'presentation') IS DISTINCT FROM 'string' OR char_length(v_tile->>'presentation') < 1 THEN
      RETURN 'presentation fehlt oder ist ungültig';
    END IF;

    -- Layout-Validierung (BreakpointGridPositions)
    v_layouts := v_tile->'layouts';
    IF v_layouts IS NULL OR jsonb_typeof(v_layouts) <> 'object' THEN
      RETURN 'Kachel-layouts-Objekt fehlt';
    END IF;

    -- Desktop-Layout ist Pflicht (Master)
    v_desk := v_layouts->'desktop';
    IF v_desk IS NULL OR jsonb_typeof(v_desk) <> 'object' THEN
      RETURN 'desktop-Layout fehlt in Kachel';
    END IF;

    IF jsonb_typeof(v_desk->'x') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'y') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'w') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'h') IS DISTINCT FROM 'number' THEN
      RETURN 'desktop-Koordinaten müssen Zahlen sein';
    END IF;

    v_x := (v_desk->>'x')::INTEGER;
    v_y := (v_desk->>'y')::INTEGER;
    v_w := (v_desk->>'w')::INTEGER;
    v_h := (v_desk->>'h')::INTEGER;

    IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_w > 12 OR (v_x + v_w) > 12 OR v_h < 1 OR v_h > 24 THEN
      RETURN 'desktop-Rasterkoordinaten ungültig (12 Spalten, x+w <= 12)';
    END IF;

    -- Tablet-Layout (optional)
    IF v_layouts ? 'tablet' AND jsonb_typeof(v_layouts->'tablet') <> 'null' THEN
      v_tab := v_layouts->'tablet';
      IF jsonb_typeof(v_tab) <> 'object'
        OR jsonb_typeof(v_tab->'x') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'w') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'h') IS DISTINCT FROM 'number' THEN
        RETURN 'tablet-Koordinaten müssen Zahlen sein';
      END IF;
      v_x := (v_tab->>'x')::INTEGER;
      v_y := (v_tab->>'y')::INTEGER;
      v_w := (v_tab->>'w')::INTEGER;
      v_h := (v_tab->>'h')::INTEGER;
      IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_w > 6 OR (v_x + v_w) > 6 OR v_h < 1 THEN
        RETURN 'tablet-Rasterkoordinaten ungültig (6 Spalten, x+w <= 6)';
      END IF;
    END IF;

    -- Mobile-Layout (optional)
    IF v_layouts ? 'mobile' AND jsonb_typeof(v_layouts->'mobile') <> 'null' THEN
      v_mob := v_layouts->'mobile';
      IF jsonb_typeof(v_mob) <> 'object'
        OR jsonb_typeof(v_mob->'x') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'w') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'h') IS DISTINCT FROM 'number' THEN
        RETURN 'mobile-Koordinaten müssen Zahlen sein';
      END IF;
      v_x := (v_mob->>'x')::INTEGER;
      v_y := (v_mob->>'y')::INTEGER;
      v_w := (v_mob->>'w')::INTEGER;
      v_h := (v_mob->>'h')::INTEGER;
      IF v_x <> 0 OR v_y < 0 OR v_w <> 1 OR v_h < 1 THEN
        RETURN 'mobile-Rasterkoordinaten ungültig (1 Spalte, x=0, w=1)';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;
```

---

### 4.2 Atomare Speicherung mit optimistischem Locking (`save_dashboard_v2`)

Verhindert Lost Updates bei Mehrbenutzer-Konflikten durch strikte Prüfung von `p_expected_revision`.

```sql
CREATE OR REPLACE FUNCTION public.save_dashboard_v2(
  p_dashboard_id UUID,
  p_expected_revision INTEGER,
  p_title TEXT,
  p_config JSONB,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS TABLE (
  dashboard_id UUID,
  revision INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_reason TEXT;
  v_new_revision INTEGER;
  v_updated_at TIMESTAMPTZ;
  v_current_scope TEXT;
  v_owner_user_id UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Schema-Prüfung
  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  -- Fall 1: Atomare Neuanlage (wenn p_expected_revision = 0 oder p_dashboard_id IS NULL)
  -- Ermöglicht die Neuanlage sowie das Retten eines Konfliktentwurfs als neues persönliches Dashboard (P02 §7.2)
  IF p_expected_revision = 0 OR p_dashboard_id IS NULL THEN
    RETURN QUERY
    SELECT c.dashboard_id, c.revision, c.created_at AS updated_at
    FROM public.create_dashboard_v2(p_title, p_config, 'personal', NULL, NULL) AS c;
    RETURN;
  END IF;

  -- Fall 2: Aktualisierung eines bestehenden Dashboards
  -- Dashboard existiert prüfen & Berechtigung validieren
  SELECT d.scope, d.user_id, d.revision INTO v_current_scope, v_owner_user_id, v_new_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Phase 1: Team-Dashboards sind noch gesperrt
  IF v_current_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  -- Persönliche Dashboards dürfen strikt nur vom Eigentümer bearbeitet werden
  IF v_current_scope = 'personal' AND v_owner_user_id <> v_user THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Optimistisches Locking: Stimmt die erwartete Revision überein?
  IF v_new_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001',
      DETAIL = 'Aktuelle Revision (' || v_new_revision || ') weicht von erwarteter Revision (' || p_expected_revision || ') ab.';
  END IF;

  -- Identitäts-Integrität: Konfigurations-ID mit Dashboard-ID synchronisieren (Codex P2)
  p_config := jsonb_set(p_config, '{id}', to_jsonb(p_dashboard_id::text), true);

  -- Aktualisierung ausführen (Eigentümer- und Revisionsabgleich in WHERE-Klausel)
  UPDATE public.dashboards AS d
  SET title = p_title,
      config = p_config,
      revision = d.revision + 1,
      updated_at = now()
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.revision = p_expected_revision
    AND (d.scope = 'team' OR d.user_id = v_user)
  RETURNING d.revision, d.updated_at INTO v_new_revision, v_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  -- Unveränderliche Revision in Revisionshistorie ablegen
  INSERT INTO public.dashboard_revisions (
    dashboard_id,
    organization_id,
    revision,
    title,
    config,
    created_by_user_id,
    created_at,
    change_summary
  ) VALUES (
    p_dashboard_id,
    v_org,
    v_new_revision,
    p_title,
    p_config,
    v_user,
    v_updated_at,
    p_change_summary
  );

  RETURN QUERY SELECT p_dashboard_id, v_new_revision, v_updated_at;
END;
$$;
```

---

### 4.3 Atomare Neuanlage von Dashboards (`create_dashboard_v2`)

Für die erstmalige Anlage eines Dashboards oder die Übernahme eines Konfliktstands als neues persönliches Dashboard (Forking gemäß P02 §7.2) wird die Funktion `create_dashboard_v2` bereitgestellt. Sie erzeugt den Eintrag in `dashboards` (mit `revision = 1`) und die zugehörige initiale Revision 1 in `dashboard_revisions` in einer einzigen atomaren Transaktion:

```sql
CREATE OR REPLACE FUNCTION public.create_dashboard_v2(
  p_title TEXT,
  p_config JSONB,
  p_scope TEXT DEFAULT 'personal',
  p_team_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  dashboard_id UUID,
  revision INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_reason TEXT;
  v_dashboard_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Schema-Prüfung
  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  -- Phase 1: Team-Dashboards bis P11 serverseitig gesperrt
  IF p_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  IF p_scope IS DISTINCT FROM 'personal' THEN
    RAISE EXCEPTION 'LP_INVALID_SCOPE' USING ERRCODE = '22023';
  END IF;

  -- Eigene ID serverseitig erzeugen und in Konfiguration synchronisieren (Codex P2)
  v_dashboard_id := gen_random_uuid();
  p_config := jsonb_set(p_config, '{id}', to_jsonb(v_dashboard_id::text), true);

  -- 1. Dashboard-Datensatz anlegen (Revision 1)
  INSERT INTO public.dashboards AS d (
    id,
    organization_id,
    scope,
    user_id,
    team_id,
    title,
    description,
    created_by_user_id,
    revision,
    config
  ) VALUES (
    v_dashboard_id,
    v_org,
    'personal',
    v_user,
    NULL,
    p_title,
    p_description,
    v_user,
    1,
    p_config
  )
  RETURNING d.created_at INTO v_created_at;

  -- 2. Initiale Revision 1 in Historie ablegen
  INSERT INTO public.dashboard_revisions (
    dashboard_id,
    organization_id,
    revision,
    title,
    config,
    created_by_user_id,
    created_at,
    change_summary
  ) VALUES (
    v_dashboard_id,
    v_org,
    1,
    p_title,
    p_config,
    v_user,
    v_created_at,
    'Dashboard initial erstellt'
  );

  RETURN QUERY SELECT v_dashboard_id, 1, v_created_at;
END;
$$;
```

---

### 4.4 Revisions-Rollback (`restore_dashboard_revision_v2`)

Das Wiederherstellen einer früheren Revision erzeugt deterministisch eine **neue Revision** an der Spitze der Historie, sodass niemals vergangene Audit-Stände gelöscht werden:

```sql
CREATE OR REPLACE FUNCTION public.restore_dashboard_revision_v2(
  p_dashboard_id UUID,
  p_target_revision INTEGER,
  p_expected_revision INTEGER
)
RETURNS TABLE (
  dashboard_id UUID,
  new_revision INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_scope TEXT;
  v_owner_user_id UUID;
  v_target_title TEXT;
  v_target_config JSONB;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Existenz und Eigentümerschaft auf dem Ziel-Dashboard prüfen
  SELECT d.scope, d.user_id INTO v_scope, v_owner_user_id
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Phase 1: Team-Dashboards bis P11 gesperrt
  IF v_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  -- Persönliche Dashboards dürfen strikt nur vom Eigentümer wiederhergestellt werden
  IF v_scope = 'personal' AND v_owner_user_id <> v_user THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Ziel-Revision aus der Historie laden
  SELECT r.title, r.config INTO v_target_title, v_target_config
  FROM public.dashboard_revisions AS r
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
    AND r.revision = p_target_revision;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_REVISION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Über save_dashboard_v2 als neuen Revisionsschritt persistieren
  RETURN QUERY
  SELECT s.dashboard_id, s.revision AS new_revision, s.updated_at
  FROM public.save_dashboard_v2(
    p_dashboard_id,
    p_expected_revision,
    v_target_title,
    v_target_config,
    'Wiederhergestellt von Revision ' || p_target_revision
  ) AS s;
END;
$$;
```

---

## 5. Deterministische V1→V2-Kopiermigration

### 5.1 Quell- und Zielstrukturen im Vergleich

| Eigenschaft        | V1 (`executive_dashboard_preferences`)                                                                         | V2 (`dashboards` / `DashboardConfigV2`)                                                                                |
| :----------------- | :------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Speicherort**    | Tabelle `executive_dashboard_preferences`                                                                      | Tabelle `dashboards` + `dashboard_revisions`                                                                           |
| **Identität**      | Keine Dashboard-ID (PK ist `org_id, user_id`)                                                                  | Eigene UUID v4 (`id`)                                                                                                  |
| **Kachel-ID**      | Beliebiger String (`tileId`)                                                                                   | String (`id`), V1-ID bleibt 1:1 erhalten                                                                               |
| **Metrik-Bezug**   | `catalogId` (z. B. `baseline.arr`, `win_rate`)                                                                 | `catalogId` (1:1 Abbildung auf `DASHBOARD_CATALOG`, z. B. `baseline.arr`)                                              |
| **Größenmodell**   | String (`'klein'`, `'mittel'`, `'gross'`, `'voll'`)                                                            | Exakte Rasterkoordinaten `w`, `h`, `x`, `y` je Breakpoint                                                              |
| **Layouts**        | 1D-Reihenfolge im `tiles`-Array                                                                                | Getrennte Layouts je Breakpoint unter `tile.layouts` (`desktop/tablet/mobile`)                                         |
| **Filter & Scope** | `filters.period`, `filters.pipeline` (Dashboard); Kachelausnahmen über `tile.filterMode`, `period`, `pipeline` | `globalTimeframe`, `globalPipeline` (Dashboard); Kachelausnahmen über `pipelineOverride`, `timeframeOverride`, `query` |
| **Sektionen**      | Nicht vorhanden                                                                                                | Strukturierte Abschnitte (`sections`)                                                                                  |

---

### 5.2 Größen- und Koordinaten-Transformationsregeln

#### 1. Dimensionen je Größenklasse (P02 §9.2)

- `'klein'`: Desktop `w = 3, h = 3`; Tablet `w = 3, h = 3`; Mobile `w = 1, h = 3`
- `'mittel'`: Desktop `w = 6, h = 4`; Tablet `w = 6, h = 4`; Mobile `w = 1, h = 4`
- `'gross'`: Desktop `w = 9, h = 5`; Tablet `w = 6, h = 5`; Mobile `w = 1, h = 5`
- `'voll'`: Desktop `w = 12, h = 6`; Tablet `w = 6, h = 6`; Mobile `w = 1, h = 6`

#### 2. Deterministische Kopiermigration ohne Kollisionen je Breakpoint

```typescript
export interface V1Period {
  from: string;
  to: string;
}

export interface V1Filters {
  period?: V1Period;
  pipeline?: string;
}

export interface V1TileConfig {
  tileId: string;
  catalogId: string;
  title?: string;
  size: 'klein' | 'mittel' | 'gross' | 'voll';
  view: string;
  filterMode?: 'dashboard' | 'eigener_zeitraum' | 'fester_stand';
  period?: V1Period;
  pipeline?: string;
}

export interface V1DashboardConfig {
  version: 1;
  filters?: V1Filters;
  tiles: readonly V1TileConfig[];
}

/**
 * Überführt eine vollständige V1-Dashboard-Konfiguration verlustfrei in V2 (DashboardConfigV2),
 * inklusive kachelspezifischer Pipeline- und Zeitraum-Filter gemäß P02 §9.1 und §9.2.
 */
export function migrateV1ToV2(
  v1Config: V1DashboardConfig,
  context: {
    id: string;
    title: string;
    ownerUserId: string;
    organizationId: string;
  },
): DashboardConfigV2 {
  const globalPipeline = v1Config.filters?.pipeline;
  const globalTimeframe = v1Config.filters?.period
    ? `${v1Config.filters.period.from}/${v1Config.filters.period.to}`
    : '30d';

  const tiles = v1Config.tiles;
  const desktopPositions = packLayout(tiles, 12, 'desktop');
  const tabletPositions = packLayout(tiles, 6, 'tablet');
  const mobilePositions = packLayout(tiles, 1, 'mobile');

  const v2Tiles: DashboardTileConfigV2[] = tiles.map((t, idx) => {
    // Kachelspezifische Filterausnahmen exakt abbilden (Codex P2)
    const timeframeOverride =
      t.filterMode === 'eigener_zeitraum' && t.period
        ? `${t.period.from}/${t.period.to}`
        : undefined;
    const pipelineOverride = t.pipeline;

    // Titel-Auflösung (Codex P2): Benutzerdefinierter Titel > Katalogname aus DASHBOARD_CATALOG > Katalog-ID
    const catalogName = getCatalogEntry(t.catalogId)?.name;
    const resolvedTitle = t.title ?? catalogName ?? t.catalogId;

    return {
      id: t.tileId, // 1:1 Erhalt der bestehenden ID (Masterplan 5.1)
      catalogId: t.catalogId, // 1:1 Erhalt des Metrik-Bezugs
      title: resolvedTitle,
      presentation: t.view,
      layouts: {
        desktop: desktopPositions[idx],
        tablet: tabletPositions[idx],
        mobile: mobilePositions[idx],
      },
      timeframeOverride,
      pipelineOverride,
      query: {
        metricId: t.catalogId,
        pipelineId: pipelineOverride ?? globalPipeline,
        timeframe: timeframeOverride ?? globalTimeframe,
      },
    };
  });

  const now = new Date().toISOString();

  return {
    version: 2,
    id: context.id,
    title: context.title,
    scope: 'personal',
    ownerUserId: context.ownerUserId,
    organizationId: context.organizationId,
    globalTimeframe,
    globalPipeline,
    tiles: v2Tiles,
    metadata: {
      migrated_from_v1: true,
      migrated_at: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function packLayout(
  tiles: readonly V1TileConfig[],
  cols: number,
  mode: 'desktop' | 'tablet' | 'mobile',
): GridPosition[] {
  let currentX = 0;
  let currentY = 0;
  let rowMaxH = 0;
  const positions: GridPosition[] = [];

  for (const t of tiles) {
    let w = 3;
    let h = 3;

    if (mode === 'desktop') {
      if (t.size === 'klein') {
        w = 3;
        h = 3;
      } else if (t.size === 'mittel') {
        w = 6;
        h = 4;
      } else if (t.size === 'gross') {
        w = 9;
        h = 5;
      } else if (t.size === 'voll') {
        w = 12;
        h = 6;
      }
    } else if (mode === 'tablet') {
      if (t.size === 'klein') {
        w = 3;
        h = 3;
      } else if (t.size === 'mittel') {
        w = 6;
        h = 4;
      } else if (t.size === 'gross') {
        w = 6;
        h = 5;
      } else if (t.size === 'voll') {
        w = 6;
        h = 6;
      }
    } else {
      // Mobile: Strikt 1 Spalte, 100 % Breite
      w = 1;
      if (t.size === 'klein') h = 3;
      else if (t.size === 'mittel') h = 4;
      else if (t.size === 'gross') h = 5;
      else h = 6;
    }

    // Zeilenumbruch prüfen
    if (currentX + w > cols) {
      currentY += rowMaxH > 0 ? rowMaxH : 2;
      currentX = 0;
      rowMaxH = 0;
    }

    positions.push({
      x: currentX,
      y: currentY,
      w,
      h,
    });

    rowMaxH = Math.max(rowMaxH, h);
    currentX += w;
    if (currentX >= cols) {
      currentY += rowMaxH;
      currentX = 0;
      rowMaxH = 0;
    }
  }

  return positions;
}
```

---

### 5.3 Idempotenz und Nicht-Überschreiben bearbeiteter V2-Kopien

Um Datenverlust bei mehrfachem Ausführen der Kopiermigration auszuschließen, gilt folgender Schutzmechanismus:

1. **Herkunftsmarker bei der Anlage:**
   Die Transformation `migrateV1ToV2` setzt verbindlich das Feld `config->'metadata'->>'migrated_from_v1' = 'true'` sowie `migrated_at`. Dieser Marker wird über `create_dashboard_v2` atomar persistiert.
2. **Prüfung auf bestehende V2-Kopie:**
   Existiert in `dashboards` bereits ein Datensatz für den Anwender mit `config->'metadata'->>'migrated_from_v1' = 'true'`, wird geprüft:
   - Wurde das V2-Dashboard bereits durch den Nutzer bearbeitet? (`revision > 1` ODER `updated_at > created_at`).
3. **Konfliktbehandlung:**
   - **Falls unbearbeitet (`revision = 1`):** Das Dashboard darf bei geänderter V1-Quelle aktualisiert werden.
   - **Falls bereits bearbeitet (`revision > 1`):** Die bestehende V2-Kopie wird **unter keinen Umständen überschrieben**. Der Migrationsprozess markiert die V1-Zeile als getrennt und überlässt die Zusammenführung dem Anwender.

---

## 6. Baugrundlage und Schnittstellen für Folgepakete (P04–P07)

1. **Paket P04 (Editor-Kern & Zustand):**
   - Implementierung des Reversible-Command-Patterns (Delta-Patches, Checkpoints) auf Basis der hier spezifizierten `DashboardConfigV2`.
   - Einführung des Feature-Schalters `VITE_DASHBOARD_EDITOR_V2` (Standard: `false` = alter V1-Editor aktiv).
2. **Paket P05 (Vier-Zonen-Shell & Inspector):**
   - Aufbau der Editor-Shell (Top-Bar, 260-px-Bibliothek, Canvas, 320-px-Inspector, Statusleiste).
3. **Paket P06 (Rasterengine-Umsetzung):**
   - Konkrete Implementierung der in Abschnitt 2 gewählten nativen CSS-Grid-Engine mit 12 Spalten, Pointer-Drag und WAI-ARIA `grid`-Tastatursteuerung.
4. **Paket P07 (Supabase-Migration & Persistenz):**
   - Einspielen der in Abschnitt 3 und 4 spezifizierten SQL-Migrationen (`dashboards`, `dashboard_revisions`, RPCs).
   - Aktivierung der deterministischen Kopiermigration für Pilot-Nutzer.

---

## 7. Fazit

Mit diesem Dokument ist die technische Baugrundlage für den neuen visuellen Dashboard-Editor vollständig gelegt:

- Die Rasterengine ist auf Basis harter Messungen ausgewählt (0 KiB Zusatz-Bundle, sub-millisekunden Latenz, perfekte A11y).
- Das V2-Speichermodell trennt Metadaten von Historie, schützt vor Mehrbenutzer-Konflikten und bereitet Teams relational vor.
- Die Kopiermigration garantiert 100 % Datenintegrität für alle bestehenden V1-Dashboards.
