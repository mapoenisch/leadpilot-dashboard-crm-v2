# Dashboard-Editor: V2-Vorlagen und Dashboard-Auswahl (P09b)

**Status:** Abgenommen & Verifiziert (Auftrag 158, 14. November 2026)  
**Bezug:** [DASHBOARD_EDITOR_MASTERPLAN.md](./DASHBOARD_EDITOR_MASTERPLAN.md) §3.1 / §4.A / §6, [SPEICHERSTRUKTUR_REVISIONEN_P07.md](./SPEICHERSTRUKTUR_REVISIONEN_P07.md), [SEKTIONEN_P09A.md](./SEKTIONEN_P09A.md), [EDITOR_UX_FACHVERTRAEGE_145.md](./EDITOR_UX_FACHVERTRAEGE_145.md) §2.1

---

## 1. Übersicht & Zielsetzung

Mit Paket P09b (Auftrag 158) erhält der Executive Dashboard V2-Editor die Unterstützung für **mehrere persönliche Dashboards** und eine integrierte **Vorlagenauswahl**. Benutzer können nahtlos zwischen ihren Dashboards wechseln, neue Dashboards aus vorgefertigten V2-Vorlagen erstellen, bestehende Dashboards duplizieren und nicht mehr benötigte Dashboards endgültig löschen.

Kernanforderungen:
1. **Mehrere persönliche Dashboards:** Bis zu 20 Dashboards je Benutzer und Organisation (`MAX_PERSONAL_DASHBOARDS = 20`).
2. **Vorlagenkatalog (V2):** Vier standardisierte Vorlagen (`executive`, `sales`, `finance`, `blank`), deterministisch und mit vollständiger Schema-Validierung.
3. **Schutz vor Datenverlust:** 
   - Das letzte verbleibende Dashboard kann nicht gelöscht werden (`LP_LAST_DASHBOARD` / `letztes_dashboard`).
   - Jeder Wechsel, jede Neuanlage und jedes Löschen bei ungespeichertem Entwurf (`isDirty`) erfordert eine explizite Nutzerentscheidung via `UnsavedChangesDialog`.
4. **Sichere Titel-Derivation:** Automatisch generierte Titel (Kopien, Rettungskopien) überschreiten niemals die Obergrenze von 80 Zeichen (`buildDerivedDashboardTitle`).
5. **Barrierefreiheit (WCAG 2.1 AA):**
   - Vollständige Tastaturbedienung im Dropdown-Menü (ArrowDown/Up, Home, End, Escape).
   - Live-Region-Ansagen für Screenreader (`aria-live="polite"`).
   - Sauberes Focus-Management (Fokus kehrt nach Dialog-/Menü-Schließung auf den Auslöser zurück).
   - Touch-Targets ≥ 44 × 44 px auf mobilen Endgeräten.
   - 0 px horizontaler Überlauf across 1440, 768 und 375 px Viewports.

---

## 2. Server-Schnittstellen & Datenbank (RPCs)

Alle Operationen sind in der Migration `supabase/migrations/20261118_dashboard_selection.sql` gekapselt:

### 2.1 `create_dashboard_v2(p_title, p_config, p_scope, p_team_id)`
- Erweitert um Obergrenzen-Prüfung: Max. 20 persönliche Dashboards je `(organization_id, owner_user_id)`.
- Verhindert das 21. Dashboard atomar via Advisory Lock und wirft `LP_DASHBOARD_LIMIT` (`42P09`).
- Schneidet führende und nachlaufende Leerzeichen im Titel ab (`btrim(p_title)`).
- Validiert Titel: 1 bis 80 Zeichen (`LP_TITLE_INVALID`).

### 2.2 `list_personal_dashboards_v2()`
- Gibt alle persönlichen Dashboards des angemeldeten Benutzers zurück.
- Berechnet serverseitig `tile_count` (aus `config->'tiles'`) und `section_count` (aus `config->'sections'`).
- Sortiert nach `updated_at DESC, id ASC`.
- Gibt leeres Array für anonyme oder fremde Organisationen zurück.

### 2.3 `duplicate_personal_dashboard_v2(p_dashboard_id, p_title)`
- Dupliziert ein persönliches Dashboard inklusive Layouts, Kacheln und Sektionen.
- Prüft die Obergrenze von 20 Dashboards.
- Erzeugt eine neue ID und setzt `revision = 1`.
- Gibt `{ dashboard_id, revision, updated_at }` zurück.

### 2.4 `delete_personal_dashboard_v2(p_dashboard_id, p_expected_revision)`
- Löscht das Dashboard und alle zugehörigen Revisionshistorien (`dashboard_revisions_v2`) transaktional.
- Verhindert das Löschen des letzten verbleibenden Dashboards und wirft `LP_LAST_DASHBOARD`.
- Prüft `expected_revision`: Verhindert versehentliches Löschen bei veralteter Revision (`LP_REVISION_CONFLICT`).
- Ermittelt atomar das als nächstes zu öffnende Dashboard (zuletzt aktualisiertes verbleibendes Dashboard).
- Gibt `{ deleted_id, next_dashboard_id }` zurück.

---

## 3. V2-Vorlagenkatalog (`dashboardTemplatesV2.ts`)

| ID | Name | Kacheln | Sektionen | Beschreibung |
|---|---|---|---|---|
| `executive` | Executive Summary | 9 | 0 | Die bewährte C-Level-Übersicht (ARR, Umsatz, EBITDA, Kunden, ARPA, CAC). Bytegleich zur V1-Erstmigration. |
| `sales` | Vertrieb & Pipeline | 9 | 2 | Fokus auf Pipeline, Deals, Stufen, ARR und Kunden. Unterteilt in „Pipeline & Abschluss“ und „Wachstum & Neukunden“. |
| `finance` | Finanzen & Unit Economics | 10 | 2 | Fokus auf ARR, Umsatz, EBITDA, CAC, ARPA und Runway. Unterteilt in „Ertrag & Rentabilität“ und „Effizienz & Kundenwert“. |
| `blank` | Leeres Dashboard | 0 | 1 | Startet mit einer leeren Sektion „Übersicht“. Bereit zum freien Bestücken aus der Widget-Bibliothek. |

### Bundle-Optimierung (Lazy Loading)
Um das initiale Bundle-Budget (`size-limit: 180 KB`) einzuhalten, wird der Vorlagenkatalog erst beim Öffnen des `NewDashboardDialogV2` dynamisch geladen (`import('../../../model/dashboardTemplatesV2')`). Das spart ~2,5 KB im initialen Ladezustand des Editors.

---

## 4. Titel-Derivation (`buildDerivedDashboardTitle`)

Sicherstellung der 80-Zeichen-Grenze für alle automatischen Titel:
- `buildDerivedDashboardTitle(baseTitle, suffix)`:
  - Wenn `baseTitle.length + suffix.length <= 80`, wird das Suffix direkt angehängt.
  - Wenn die Summe 80 Zeichen überschreitet, wird `baseTitle` so gekürzt, dass der resultierende Titel exakt 80 Zeichen lang ist.
  - Schneidet keine Unicode-Surrogat-Paare oder Emojis unvollständig ab.
  - Entfernt Leerzeichen vor dem Suffix, um doppelte Whitespaces zu verhindern.

---

## 5. UI-Komponenten & Barrierefreiheit

- **`DashboardSwitcherV2`**: Top-Bar Dropdown mit Scope-Badge („Persönlich“) und Aufklappmenü.
- **`DashboardSwitcherMenuV2`**: Ausgelagerte Menü-Komponente zur Einhaltung des 400-Zeilen-Limits. Enthält Liste mit relativen Zeitangaben („vor 5 Min.“) und Aktionen.
- **`NewDashboardDialogV2`**: Modaler Dialog mit Vorlagenkarten und Validierung des Dashboard-Titels.
- **`DuplicateDashboardDialogV2`**: Dialog mit Vorbelegung des Kopienamens und Hinweis bei ungespeicherten Änderungen.
- **`DeleteDashboardDialogV2`**: Bestätigungsdialog mit Kachelanzahl und Warnung vor endgültigem Datenverlust.
- **`useDashboardSelection`**: Kapselt Menüzustand, Tastaturbedienung, Navigationsschutz (`isDirty`) und Screenreader-Ansagen.
