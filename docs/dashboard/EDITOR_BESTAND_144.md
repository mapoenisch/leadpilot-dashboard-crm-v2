# Bestandsbericht Dashboard-Editor (Auftrag 144 / P01)

Stand: 2026-11-10  
Basis: `main`, Commit `b9e04f5c5d49fabad5b5484ec44216536f61827c`  
Gültig für: Dashboard-Editor-Masterplan, Vorbereitung für P02, P03 und P13

---

## 1. Ausgangslage und Prüfumgebung (T1)

### 1.1 Quellcode-Stand und Integrität

- **Ausgangscommit:** `b9e04f5c5d49fabad5b5484ec44216536f61827c` auf Branch `main`.
- **Status des Arbeitsbaums vor Ausführung:** Sauber bis auf die vorab erstellte Auftragsdatei `docs/auftraege/ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md` und den Masterplan `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md`.
- **Schutzbereiche:** Unverändert. Diff gegen `b9e04f5c5d49fabad5b5484ec44216536f61827c` auf `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources` ist exakt leer (0 Bytes).

### 1.2 Prüf- und Laufzeitumgebung

- **Betriebssystem:** macOS (Darwin arm64).
- **Laufzeitumgebungen:** Node.js v22.18.0, npm 10.9.2.
- **Browser:** Google Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) über Playwright v1.64.1.
- **Lokale Dienste & Grenzen:**
  - Der Docker-Daemon ist auf dem Host nicht aktiv (`docker.sock` fehlt). Lokale Supabase-Container (`supabase start`) sind daher nicht gestartet.
  - Das E2E-Playwright-Gate gegen die gehostete oder lokale Datenbank (`e2e/personal-dashboard.spec.ts`, `e2e/dashboard-config-states.spec.ts`) setzt eine gestartete Testdatenbank mit Seed voraus. Dieses Gate ist lokal nicht direkt ausführbar und wird ehrlich als **in lokaler Testumgebung geblockt (Docker erforderlich, in CI mit runner ubuntu-latest vollständig abgedeckt)** dokumentiert.
  - Der isolierte Vorschau- und Editor-Harness (`/dashboard-vorschau.html?bereich=editor`) nutzt feste synthetische Testdaten ohne Backend-Abhängigkeit und läuft 100 % lokal reproduzierbar.

### 1.3 Verifikations- und Qualitätsbudgets

Alle statischen und unit-/integrationsbasierten Prüfungen wurden auf dem Ausgangsstand erfolgreich ausgeführt:

- `npx --no-install tsc --noEmit`: 0 TypeScript-Fehler.
- `npm run lint`: 0 ESLint-Fehler, 0 Warnungen (`--max-warnings 0`).
- `npm run format:check`: Alle Dateien in `src` entsprechen dem Prettier-Code-Style.
- `npm run verify:quality-budget`: 100 % konform mit `docs/quality/debt-budget.json` (0 Verstöße in `src/`, 49 dom-props, 96 in resources).
- `npm test`: 354 Test-Suites bestanden, 2.641 Tests bestanden, 0 Fehler (Dauer: 29,28 s).
- `npm run verify`: Alle 25 Integrity- und Domain-Suiten grün (Auftrag 001 bis 025).
- `npm run build`: Produktions-Build in 3,18 s erfolgreich erzeugt.
- `npx --no-install size-limit`: Initial JS Bundle 177,01 kB gzip (Limit 180 kB); Largest Chunk 79,41 kB gzip (Limit 250 kB).

---

## 2. Editor, Zustandsführung und Persistenz (T2)

### 2.1 Datenfluss- und Architekturdiagramm

```
[Seite: PersonalExecutiveDashboard.tsx]
       │
       ▼ (preferences, nav, router-context)
[Arbeitsbereich: DashboardWorkspace.tsx]
   ├── [useDashboardEditor.ts] ── [useDashboardEditorHistory.ts] (max 50 Zustände)
   │        │
   │        ▼ (Arbeitskopie / Draft)
   ├── [EditorToolbar.tsx] (Speichern, Abbrechen, Undo, Redo, Add, Vorlagen)
   ├── [DashboardFilters.tsx] (Sitzungs- & Startfilter)
   ├── [DashboardGrid.tsx] (1/6/12 Spalten CSS-Grid, 1D-Listenfluss)
   │        │
   │        ├── [TileActionsMenu.tsx] (Kachel-Aktionen: Verschieben, Löschen, Bearbeiten)
   │        ├── [TileQuickSizeSelector.tsx] (Spaltenwahl 3/6/9/12 Sp.)
   │        ├── [TileResizeHandle.tsx] (Rechtskante-Resize)
   │        └── [LazyDashboardTile.tsx] ── [useDashboardData.ts]
   │                                              │
   │                     ┌────────────────────────┼────────────────────────┐
   │                     ▼                        ▼                        ▼
   │             [resolveBaseline.ts]      [resolveCrm.ts]          [resolveLive.ts]
   │             (Stammdaten-Objekte)  (FilteredFunnelDealSource) (LiveKpiStreamStore)
   │                                              │                        │
   │                                              ▼                        ▼
   │                                     [imported_funnel_deals]  [Supabase Realtime]
   │
   └── [TileConfigurator.tsx] (Drawer 420 px, React.lazy)
            │
            ▼ (Validierung: validateTileCandidate)
       [useDashboardDraftActions.ts] ──> Aktualisiert Draft in useDashboardEditor

Speicherpfad:
   [editor.save()]
       │
       ▼ (validateDashboardConfig)
   [useDashboardPreferences.ts: savePreferences()]
       │
       ▼ (RPC save_dashboard_preferences, p_expected_revision)
   [PostgreSQL: executive_dashboard_preferences]
```

### 2.2 Quellcodebelege der Komponenten und Hooks

| Komponente / Hook          | Dateipfad                                                                     | Wesentliche Implementierung & Verhalten                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Einstiegsseite**         | `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx` (Z. 16–64)      | Bindet `useDashboardPreferences`, `useDashboardNavigation` und `useOrganization` ein. Reicht Callbacks für Detailnavigation, Fokus-Rückkehr und Browser-Back-Guard an `DashboardWorkspace` durch.                                                   |
| **Arbeitsbereich**         | `src/features/dashboard/components/DashboardWorkspace.tsx` (Z. 29–371)        | Steuert Anzeige (Ansichtsmodus vs. Bearbeitungsmodus), Entwurf (`shown = editing ? editor.draft : state?.config`), Tastatur-Undo/Redo (Z. 121–150), Navigationsschutz via `useInAppLinkGuard` (Z. 106–110) und `UnsavedChangesDialog` (Z. 347–354). |
| **Editor-Hook**            | `src/features/dashboard/hooks/useDashboardEditor.ts` (Z. 34–307)              | Hält `mode` (`'ansicht'` / `'bearbeiten'`), `draft`, `snapshot` mit Revision, `saveStatus` und `conflict`. Erzeugt bei Start eine isolierte Arbeitskopie (`commit(state.config)`).                                                                  |
| **Undo/Redo-Verlauf**      | `src/features/dashboard/hooks/useDashboardEditorHistory.ts` (Z. 5–76)         | Führt linearen History-Stack mit fester Obergrenze `MAX_HISTORY = 50`. Jeder Schritt speichert ein vollständiges `DashboardConfig`-Objekt.                                                                                                          |
| **Editor-Reducer & Logik** | `src/features/dashboard/hooks/dashboardEditorReducer.ts` (Z. 1–250)           | Reine Fachfunktionen: `validateTileCandidate`, `activeEntryOf`, `tileTitle`, `isSameConfig`, `saveErrorMessage`. Verhindert das Einfügen nicht freigegebener Kombinationen oder Kacheln oberhalb `MAX_TILES`.                                       |
| **Raster-Engine**          | `src/features/dashboard/components/DashboardGrid.tsx` (Z. 209–395)            | CSS-Grid mit `grid-cols-1 md:grid-cols-6 lg:grid-cols-12`. Kacheln sind `<li>`-Elemente in einer 1D-Liste. HTML5-Drag-and-Drop (`calculateDropIndex`, Z. 31–41) verändert die Reihenfolge im Array; kein freies 2D-(x,y)-Koordinatenmodell.         |
| **Konfigurator-Drawer**    | `src/features/dashboard/components/TileConfigurator.tsx` (Z. 65–401)          | 420 px breiter rechter Drawer (`Drawer`-Komponente). Bietet Suchfeld, Kategorie-Filter, Kennzahlenauswahl, Darstellungsoptionen mit `minSizeFor`-Sperren, Vorschau und optionale Kombinationsauswahl (`CombinationPicker`).                         |
| **Preferences-Hook**       | `src/features/dashboard/hooks/useDashboardPreferences.ts` (Z. 56–172)         | React Query-Hook mit Cache-Schlüssel `dashboardPreferencesKey(orgId, userId)`. Reagiert auf Benutzer- und Organisationswechsel mit verzögertem Cache-Abbau (Z. 71–98). Atomares Speichern mit Revisionsprüfung.                                     |
| **Repository**             | `src/features/dashboard/data/dashboardPreferencesRepository.ts` (Z. 62–120)   | Führt `loadPreferences` (`select` über RLS) und `savePreferences` (Aufruf RPC `save_dashboard_preferences`) aus. Mappt Datenbankfehler auf typisierte `PreferencesError`-Objekte.                                                                   |
| **Validierung**            | `src/features/dashboard/model/dashboardValidation.ts` (Z. 238–277)            | Strikte Whitelist-Prüfung aller Objektfelder. Lehnt unbekannte Schlüssel fail-closed ab (`ValidationIssue`). Meldet nicht freigegebene Kacheln als `unavailable`, ohne sie zu verwerfen.                                                            |
| **Datenbank & RPC**        | `supabase/migrations/20261004_executive_dashboard_preferences.sql` (Z. 7–166) | Tabelle `executive_dashboard_preferences` (PK: `organization_id, user_id`). RLS erlaubt nur SELECT der eigenen Zeile. INSERT/UPDATE/DELETE ist gesperrt; Schreiben ausschließlich über `SECURITY DEFINER`-Funktion `save_dashboard_preferences`.    |

### 2.3 Persistenzvertrag und Limits

| Eigenschaft                       | Client-Regel (`dashboardValidation.ts`)                                            | Server-Regel (`20261004_executive_dashboard_preferences.sql`)                       | Abgleich & Befund                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Formatversion**                 | `DASHBOARD_CONFIG_VERSION = 1`                                                     | `p_config->'version' IS DISTINCT FROM '1'::jsonb`                                   | Konsistent. Abweichende Versionen werden abgelehnt bzw. clientseitig als `zukuenftige_version` schreibgeschützt gerendert. |
| **Kachelobergrenze**              | `MAX_TILES = 24`                                                                   | `jsonb_array_length(p_config->'tiles') > 24`                                        | Konsistent. Überschreitung führt zu `LP_DASHBOARD_INVALID` ('zu viele Kacheln').                                           |
| **JSON-Größenlimit**              | Nicht explizit begrenzt (implizit durch Feldlängen)                                | `octet_length(p_config::text) > 32768` (32 KiB)                                     | Konsistent. Schützt vor Injection überdimensionierter JSON-Nutzlasten.                                                     |
| **Erlaubte Root-Schlüssel**       | Nur `version`, `tiles`, `filters`                                                  | Nur `version`, `tiles`, `filters`                                                   | Konsistent. Unbekannte Schlüssel werden fail-closed abgewiesen.                                                            |
| **Erlaubte Kachel-Schlüssel**     | `tileId`, `catalogId`, `view`, `size`, `title`, `filterMode`, `period`, `pipeline` | Exakt dieselben 8 Schlüssel                                                         | Konsistent. Keine fremden Felder zulässig.                                                                                 |
| **Optimistischer Konfliktschutz** | Übergibt `state.revision` an RPC                                                   | `p.revision = p_expected_revision` (Inkrement auf `revision + 1`)                   | Konsistent. Bei Nichtübereinstimmung wirft die RPC `LP_DASHBOARD_CONFLICT`.                                                |
| **Umgang mit unbekannten KPIs**   | Kacheln verbleiben in `config`, landen in `unavailable`                            | Server prüft nur Feldtypen (`catalogId` als String), nicht gegen den Client-Katalog | Konsistent. Der Ladevertrag sichert, dass bei Katalogänderungen Kacheln nicht verloren gehen.                              |

---

## 3. Teamfreigaben und Alarmbetrieb: Machbarkeitsanalyse (T4)

### 3.1 Organisations- und Rechtebestand

1. **Rollenmodell:**
   - In `public.organization_members` existieren ausschließlich die Rollen `admin`, `manager` und `viewer` auf **Organisationsebene**.
   - Die Autorisierung erfolgt über die RLS-Hilfsfunktionen `current_organization_id()`, `has_org_role(required_roles)` und `is_active_member()`.
2. **Fehlendes Team-Modell:**
   - Es existiert **keine Tabelle für Teams, Gruppen oder Abteilungen** in der Datenbank.
   - Die Tabelle `imported_funnel_deals` besitzt eine `organization_id`, aber **keinerlei Spalten für `owner_id`, `assigned_to` oder `team_id`**.
   - **Schlussfolgerung:** Deals können im aktuellen Schema keinem Team und keinem individuellen Vertriebsmitarbeiter zugeordnet werden. Kennzahlen wie „Umsatz nach Team“ oder „Deals nach Owner“ sind ohne Schemaerweiterung fachlich unmöglich.
3. **Persönliche Layoutrechte:**
   - Auch Benutzer mit der Rolle `viewer` dürfen ihr eigenes persönliches Dashboard anpassen und speichern (`save_dashboard_preferences`).
   - Die RPC berührt keine CRM- oder Organisationsdaten; sie schreibt ausschließlich in `executive_dashboard_preferences` für `user_id = auth.uid()`.

### 3.2 Anforderungen an Team-Dashboards (Entscheidungen für P02)

Für gemeinsame Team-Dashboards muss in P02 folgendes entschieden werden:

- **Konzept „Team“:** Da Teams keine Datenfilter an Deals sind, beschreibt ein „Team“ einen **Freigabe- und Empfängerkreis** (z. B. „Management“, „Vertriebsleitung“) innerhalb derselben Organisation.
- **Eigentum & Rollenverlust:**
  - Team-Dashboards müssen der Organisation gehören (`owner_type: 'organization'`), nicht dem individuellen Ersteller.
  - Scheidet der Ersteller aus oder verliert seine Rolle, bleibt das Team-Dashboard erhalten.
  - Bearbeitungsrechte auf Team-Dashboards müssen auf `admin` und `manager` beschränkt sein; `viewer` dürfen Team-Dashboards nur lesen.
  - Persönliche Arbeitskopien („Kopie in mein Dashboard übernehmen“) ermöglichen Viewern eigene Anpassungen.

### 3.3 Machbarkeitsprüfung des serverseitigen Alarmbetriebs

Aktuell werden alle CRM-KPIs (`crm.pipeline_*`) rein browserseitig in TypeScript über die Funktion `getPipelineOverview()` berechnet (`src/domain/executiveCockpitData.ts`). Für In-App-Alarme, die anschlagen, wenn der Browser geschlossen ist, muss die Berechnung serverseitig erfolgen.

#### Vergleich der Ausführungswege

| Kriterium                    | Weg 1: Datenbank-Zeitplan (`pg_cron`)                                                   | Weg 2: Zeitgesteuerte Edge Function                      | Weg 3: Externer Scheduler (z. B. GitHub Actions / Cloud Cron) |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| **Technischer Ansatz**       | PostgreSQL-Extension `pg_cron` ruft periodisch eine PL/pgSQL-Prozedur auf               | Supabase Edge Function via Scheduled Cron Trigger (Deno) | Externer Dienst ruft Edge Function oder RPC via HTTP auf      |
| **Verfügbarkeit im Hosting** | In Supabase Pro / Enterprise verfügbar; im Free-Tier oft deaktiviert oder eingeschränkt | In Supabase Standard/Pro über Cron Triggers verfügbar    | Immer verfügbar (unabhängig vom Datenbank-Tarif)              |
| **Authentifizierung**        | Läuft intern als `postgres` / Superuser; kein API-Token nötig                           | Service-Role-Schlüssel oder Vault-Secret erforderlich    | Benötigt sichere API-Keys und Ingress-Absicherung             |
| **Intervallgrenzen**         | Bis zu 1 Minute min. Intervall                                                          | 1 Minute min. Intervall (Cron-Syntax)                    | Beliebig (z. B. alle 5–15 Minuten)                            |
| **Netzwerk & Ausfallrisiko** | 0 Netzwerk-Hops; transaktional atomar in der DB                                         | Netzwerk-Hop DB ↔ Deno; Kaltstart-Latenz                 | Zusätzliche externe Fehlerquelle und Netzwerklatenz           |
| **Laufzeit-Kosten**          | Inklusiv im DB-Compute                                                                  | Edge Function Invocations + CPU-Zeit                     | Externe Compute-Kosten                                        |
| **Worker-Beobachtbarkeit**   | Tabelle `cron.job_run_details` protokolliert Läufe                                      | Supabase Function Logs / Edge-Telemetrie                 | Runner-Logs des externen Anbieters                            |

#### Empfehlung für P13 (Alarmbetrieb)

- **Empfohlener Pfad:** **Weg 1 (PostgreSQL-basierte Berechnung via `pg_cron` bzw. interne Scheduler-Tabelle) kombiniert mit einer Fallback-Edge-Function.**
  - Die Kernberechnung der Schwellenwerte (`eval_alert_rules()`) muss als reine PL/pgSQL-Funktion implementiert werden. Dies garantiert atomare Transaktionen direkt auf `imported_funnel_deals` ohne Datentransfer über das Netzwerk.
  - Die Speicherung der Alarme erfolgt in einer neuen Tabelle `in_app_alerts` mit Status (`unread`, `read`, `dismissed`).
  - **Paritätsnachweis:** Vor Freigabe in P13 muss ein automatisierter Paritätstest nachweisen, dass die serverseitige SQL-Berechnung exakt dieselben Zahlen liefert wie die TypeScript-Funktion `getPipelineOverview()`:
    - `totalVolume`: Summe über _alle_ Deals der Organisation (inklusive gewonnener und verlorener Deals).
    - `wonVolume`: `stage.toLowerCase().includes('gewonnen')`.
    - `openVolume`: Deals, deren Stufe weder `'gewonnen'` noch `'verloren'` enthält (`!lowerStage.includes('gewonnen') && !lowerStage.includes('verloren')`).
    - Deals mit `'verloren'` zählen ausschließlich zum Gesamtvolumen, nicht zum offenen oder gewonnenen Volumen.

#### Betriebsvoraussetzungen und Schutzmechanismen

- **Worker-Lebenszeichen (Heartbeat):** Speicherung von `last_run_at` und `status` in einer Steuerungstabelle `alert_worker_status`. Bleibt der Timestamp länger als 3 Intervalle aus, wechselt der Zustand auf `stale`.
- **Deduplizierung:** Ein Schwellenwert-Event darf nicht bei jedem Intervall-Tick denselben Alarm erneut erzeugen. Ein Alarm wird erst erneut ausgelöst, wenn der Wert zwischenzeitlich unter die Schwelle gefallen ist (Hysterese) oder ein konfigurierter Cooldown (z. B. 24 h) abgelaufen ist.
- **Rechteverlust des Regel-Erstellers:** Verlässt der Benutzer die Organisation oder wird sein Status auf `suspended` gesetzt, werden seine privaten Alarmregeln automatisch auf `paused` gesetzt (`active = false`).
- **No-Data-Behandlung:** Fehlen Daten für eine Kennzahl, darf kein Fehlalarm ausgelöst werden; stattdessen wird ein `NO_DATA`-Statusflag gesetzt.

---

## 4. Oberflächenprüfung, Überlauf und A11y (T5)

### 4.1 Zusammenfassung der 18 Bestandsaufnahmen

Die Aufnahmen wurden mit dem dedizierten Test-Harness `scripts/captureAuftrag144EditorBestand.mjs` gegen `/dashboard-vorschau.html?bereich=editor` durchgeführt:

- **Erfolgsquote:** 18 von 18 Aufnahmen erfolgreich erstellt (100 %).
- **Horizontaler Überlauf:** Exakt **0 px** Überlauf (Dokument und Main) in allen 18 Kombinationen (1440, 768, 375 px × Dark/Light).
- **Matrix-Ablage:** Vollständig dokumentiert in `docs/screenshots/auftrag-144/README.md` inklusive SHA-256-Prüfsummen. Die Bilddateien verbleiben lokal (`.gitignore`).

### 4.2 Tastatur- und Barrierefreiheitsbefunde

1. **Tastaturbedienung im Raster:**
   - Im Bearbeitungsmodus können Kacheln über die Schaltflächen im Menü „Kachel-Aktionen“ verschoben werden (`data-action="hoch"` / `data-action="runter"`).
   - Der Fokus wird nach dem Verschieben über `focusRequest` bewusst auf der verschobenen Aktion gehalten (`DashboardGrid.tsx`, Z. 100–120), sodass eine Kachel mehrfach ohne Mausbedienung bewegt werden kann.
2. **Mobile Bearbeitungsalternativen (375 px):**
   - Auf 375 px schaltet das Raster auf 1 Spalte (`col-span-1`). Ein horizontales Drag-and-Drop nebeneinander ist mobil nicht darstellbar.
   - Die Ein-Klick-Spaltenwahl (`3 Sp.`, `6 Sp.`, etc.) ist auf mobilen Geräten wirkungslos, da alle Kacheln die volle Breite einnehmen.
   - Der Drawer passt sich responsiv an, nimmt jedoch bei 375 px fast den gesamten Bildschirm ein.
3. **Fokus-Wiederherstellung:**
   - Beim Schließen des Konfigurator-Drawers kehrt der Fokus zuverlässig zum auslösenden Element zurück (`DashboardWorkspace.tsx`, Z. 43–60).

---

## 5. Wiederverwendbare Bausteine und Lücken

### 5.1 Wiederverwendbare Bausteine für den Umbau

1. **Katalog- und Validierungskern:**
   - `dashboardCatalog.ts` und `dashboardValidation.ts` sind vollständig getestet und können 1:1 als fachliche Validierungsbasis im neuen Editor übernommen werden.
2. **Chart-Primitives und Renderer:**
   - `DepthLineChart`, `DepthGaugeChart`, `DepthFunnelChart`, `DepthSparklineChart`, `Depth3dDonutChart` und `Depth3dBarChart` bieten erprobte, container-responsive Darstellungen mit Farbtokens.
3. **Daten-Resolver:**
   - `resolveBaseline.ts`, `resolveCrm.ts` und `resolveCombination.ts` trennen Datenauflösung sauber von der UI-Darstellung und unterstützen React Query-Caching.
4. **Navigations- und Unsaved-Changes-Schutz:**
   - `useInAppLinkGuard` und `UnsavedChangesDialog` bieten einen vollständigen Schutz vor versehentlichem Datenverlust beim Verlassen des Editors.

### 5.2 Identifizierte Lücken für P02 und P03

| Bereich                      | Gefundene Lücke im Bestand                                                                                                                               | Konsequenz für den Umbau                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Raster-Koordinaten**       | Das aktuelle Raster speichert nur eine 1D-Reihenfolge von Kacheln (`tiles: DashboardTileConfig[]`). Es gibt keine `(x, y, w, h)`-Koordinaten.            | In P03 muss ein versioniertes Zielschema (`version: 2`) mit zweidimensionalem Koordinatenmodell entworfen werden.                       |
| **History-Management**       | Fester 50-Schritte-Array-Stack speichert jeweils komplette Konfigurationsobjekte; Texteingaben im Inspector erzeugen noch keine konsolidierten Schritte. | In P04 muss ein robuster History-Manager mit Debouncing für Texteingaben und unbegrenztem bzw. speichereffizientem Stack gebaut werden. |
| **Live-Zeitreihen**          | `resolveLive.ts` liefert für Einzel-KPIs `series: null`. Historische Live-Diagramme sind nicht verdrahtet.                                               | In P05/P06 muss entschieden werden, ob Live-Historie visualisiert wird (unter Beachtung des 30-Punkte-Limits).                          |
| **Team-Modell**              | Keine Team-Tabellen und keine Owner-Felder an Deals.                                                                                                     | In P02 muss das Freigabe- und Rollenkonzept ohne deal-bezogene Teamfilter spezifiziert werden.                                          |
| **Server-Aggregations-RPCs** | Keine PostgreSQL-Funktionen für CRM-KPI-Berechnung vorhanden.                                                                                            | Für P13 müssen dezidierte Server-RPCs mit Paritätstests entwickelt werden.                                                              |

---

## 6. Offene Entscheidungen zur Übergabe an P02 und P03

1. **Für P02 (Bedienkonzept & Rechte):**
   - Wie werden gemeinsame Team-Dashboards in der Navigation und Top-Bar organisiert (Umschalter Persönlich / Team)?
   - Welche Rollen dürfen Team-Dashboards anlegen und bearbeiten (`admin`, `manager`)?
   - Wie tief soll die mobile Bearbeitung unterstützt werden (z. B. reines Umsortieren und Löschen auf dem Smartphone, komplettes Layouten nur ab Tablet/Desktop)?
2. **Für P03 (Rasterengine & Zielschema):**
   - Festlegung der Koordinaten-Schnittstelle: `x: 0..11`, `y: 0..n`, `w: 1..12`, `h: 1..n` und Mindesthöhen je Diagrammtyp.
   - V1-zu-V2-Migrationslogik: Automatische Umrechnung des 1D-Reihenfolge-Arrays in ein 12-Spalten-Raster ohne Kachelüberlappung.
3. **Für P13 (Alarmbetrieb):**
   - Bestätigung der Schwellenwert-Architektur auf Basis von PostgreSQL-Funktionen und `pg_cron` bzw. internem Trigger-Polling.
