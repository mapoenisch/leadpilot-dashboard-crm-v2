# Versionshistorie, Vergleich, Wiederherstellen und Import/Export (P12 – Auftrag 165)

> **Status:** Vollständig umgesetzt (Backend & Frontend P12 / Auftrag 165, 2026-11-18).  
> **Migration:** `supabase/migrations/20261123_dashboard_revision_detail.sql`  
> **pgTAP:** `supabase/tests/dashboard_revision_detail.sql` (22 Tests bestanden)  
> **Dienste:** `src/features/dashboard/services/dashboardRevisionServiceV2.ts`, `src/features/dashboard/model/dashboardConfigDiff.ts`, `src/features/dashboard/model/dashboardExchangeV2.ts`  
> **UI-Komponenten:** `src/features/dashboard/components/editor/versions/`, `src/features/dashboard/components/editor/selection/ImportDashboardDialogV2.tsx`

---

## 1. Überblick & Fachregeln

Phase 12 komplettiert das Executive Dashboard V2 um Revisionshistorie, visuellen Versionsvergleich, atomares Wiederherstellen mit Entwurfsschutz und sicheren JSON-Export/Import.

### 1.1 Wesentliche Fachregeln (§2.1)
1. **Revisionen bleiben unveränderlich:** Kein Löschen, Kürzen oder Überschreiben alter Stände. Wiederherstellen erzeugt immer eine **neue** Revision an der Spitze der Historie.
2. **Der Server entscheidet die Rechte:**
   - Versionen ansehen, vergleichen und exportieren darf jeder mit Leserecht (`dashboard_team_can_read` bzw. persönlicher Eigentümer).
   - Wiederherstellen erfordert zwingend Schreibrecht (`dashboard_team_can_write` bzw. persönlicher Eigentümer).
   - Der Client blendet den Wiederherstellen-Knopf bei fehlendem Schreibrecht oder an der aktuellen Revision aus.
3. **Wiederherstellen schützt den Entwurf:**
   - Ungespeicherte Änderungen werden detektiert.
   - Der Bestätigungsdialog bietet drei klare Optionen:
     1. „Entwurf als persönliche Kopie sichern und wiederherstellen“
     2. „Verwerfen und wiederherstellen“
     3. „Abbrechen“
   - Bei Team-Dashboards weist der Dialog darauf hin: „Alle Mitglieder von ‚<Teamname>‘ sehen danach diesen Stand.“
   - Nach erfolgreichem Restore wird der neue Serverstand geladen, `isDirty` ist `false`, der Undo-Verlauf ist zurückgesetzt.
4. **Fehlerreihenfolge beim Wiederherstellen:**
   - 1. Authentifizierung & Organisation (`LP_AUTH_REQUIRED`)
   - 2. Dashboard-Existenz (`LP_DASHBOARD_NOT_FOUND`)
   - 3. Team-Schreibberechtigung (`LP_TEAM_ACCESS_REVOKED`)
   - 4. Revisionskonflikt (`LP_DASHBOARD_CONFLICT`)
   - 5. Existenz der Zielrevision (`LP_REVISION_NOT_FOUND`)
5. **Autorenanzeige & Datenschutz:**
   - Eigene Revisionen: „Du (<Vorname Nachname>)“
   - Andere aktive Mitglieder: „<Vorname Nachname>“
   - Ausgeschiedene Mitglieder: „<Vorname Nachname> (ehemalig)“
   - Gelöschte Benutzerkonten (`auth.users` nicht mehr vorhanden): „Gelöschtes Konto“
   - Zeitstempel formatiert in Zeitzone Europe/Berlin (relativ „vor X Min.“ bzw. absolut „18.11.2026, 14:30“).
6. **Paging:**
   - Server-Paging über `list_dashboard_v2_revisions_page` mit `p_before_revision` und Standardgrenze von 50 Einträgen je Seite.

---

## 2. Visueller Versionsvergleich & Konfigurations-Diff (`dashboardConfigDiff.ts`)

Der semantische Konfigurationsvergleich ignoriert technische Bezugsfelder (`id`, `teamId`, `organizationId`, `ownerUserId`, `metadata`) und konzentriert sich auf sichtbare inhaltliche Änderungen:

- **Zuordnung:** Kacheln werden primär über ihre fachliche `id` zugeordnet.
- **Kacheländerungen:**
  - `added`: Kachel in neuer Version hinzugefügt.
  - `removed`: Kachel entfernt.
  - `moved`: Position (`frame.x`, `frame.y`) oder Größe (`frame.w`, `frame.h`) verändert.
  - `modified`: Titel, Kacheltyp (`catalogId`) oder Filtereinstellungen geändert.
- **Sektionsänderungen:**
  - Hinzugefügte, entfernte, umbenannte oder umgeordnete Sektionen.
- **Globale Einstellungen:**
  - Titeländerungen (`title`).
  - Standard-Zeitraum (`globalTimeframe`).
  - Standard-Pipeline (`globalPipeline`).
- **Kurzzusammenfassung:** Automatische Erzeugung prägnanter deutscher Changelog-Texte (z. B. „2 Kacheln hinzugefügt, 1 verschoben“ oder „Titel geändert“).

---

## 3. JSON-Austauschformat & Sicherheit (`dashboardExchangeV2.ts`)

### 3.1 Envelope-Format
```json
{
  "format": "leadpilot-dashboard",
  "version": 2,
  "exportedAt": "2026-11-18T14:30:00.000Z",
  "appVersion": "2.2.0",
  "dashboard": {
    "title": "Vertrieb & Pipeline",
    "globalTimeframe": "letzte_30_tage",
    "globalPipeline": "vertrieb_q4",
    "layouts": { ... },
    "tiles": [ ... ],
    "sections": [ ... ]
  }
}
```

### 3.2 Sicherheits- & Validierungsregeln (§2.3)
1. **Export-Bereinigung:** Technische Mandanten- und Eigentümerfelder (`id`, `organizationId`, `ownerUserId`, `teamId`, `metadata`, `updatedAt`, `createdAt`) werden vor dem Export vollständig entfernt.
2. **Dateiname:** Bereinigter Slug aus dem Dashboard-Titel mit optionaler Revisionsnummer (z. B. `leadpilot-dashboard-vertrieb-pipeline-rev3-20261118.json`).
3. **Dateigrößenbegrenzung:** Maximal **128 KiB** (`DASHBOARD_EXCHANGE_LIMITS.maxFileSizeKiB`). Größere Dateien werden sofort vor dem Parsen abgewiesen.
4. **Schutz vor Prototype Pollution:** Rekursive Tiefenprüfung lehnt JSON-Dateien mit Schlüsseln wie `__proto__`, `constructor` oder `prototype` strikt ab.
5. **Katalog-ID-Validierung:** Alle Kacheln werden gegen den KPI-Katalog (`KPI_CATALOG`) validiert. Unbekannte Kacheln sperren den Import mit konkreter Benennung der fehlenden Kacheln.
6. **Ziel-Auswahl:** Beim Import wählt der Nutzer, ob das Dashboard persönlich (max. 20) oder in einem Team mit Schreibrecht (max. 50) angelegt werden soll.

---

## 4. Datenbank- & Dienstarchitektur

### 4.1 SQL-Migration `20261123_dashboard_revision_detail.sql`
- **`list_dashboard_v2_revisions_page(p_dashboard_id UUID, p_before_revision INT, p_limit INT)`:**
  - Paged-Historie mit Autorenauflösung über `profiles` und `organization_members`.
  - Liefert `created_by_is_self`, `created_by_name` und `created_by_active`.
  - RLS: Nutzt dieselbe Rechtematrix wie `load_dashboard_v2`.
- **`get_dashboard_v2_revision_detail(p_dashboard_id UUID, p_revision INT)`:**
  - Liefert das vollständige JSONB-Konfigurationsdetail einer historischen Revision zum Vergleichen oder Exportieren.
  - Prüft Leseberechtigung atomar.
- **`restore_dashboard_revision_v2(p_dashboard_id UUID, p_target_revision INT, p_expected_revision INT)`:**
  - Bestehende RPC aus P11b wiederverwendet; validiert Berechtigung und Revisionsstand atomar.

### 4.2 Fallback ohne Hosted-Migration (§2.4 Nr. 24)
Liefert die Datenbank den Fehler `server_funktion_fehlt` (z. B. vor Rollout der Migration auf einer Hosted-Umgebung), fällt der Versionsbereich transparent auf `get_dashboard_v2_revisions` zurück:
- Historie ohne Paging sichtbar.
- Autorenanzeige vereinfacht auf „Du“ bzw. „Anderes Mitglied“.
- Versionsvergleich wird deaktiviert mit dem Hinweis: *„Versionsvergleich ist nach dem nächsten Server-Update verfügbar.“*
- Wiederherstellen und Export des aktuellen Stands bleiben voll funktionsfähig.

---

## 5. UI-Komponenten & Lazy Loading

Alle neuen Dialoge und Schwergewichts-Panels sind lazy-loaded über dynamische Imports, um die Initial-Bundle-Größe strikt unter 180 kB zu halten:

- `RevisionHistoryPanelV2.tsx` (355 Zeilen): Slide-over-Drawer ab 768 px, Vollbild-Modal unter 768 px. Paging, Modus-Umschaltung, Autorenanzeige.
- `RevisionDiffViewV2.tsx` (230 Zeilen): Visueller Side-by-Side-/Zusammenfassungs-Diff zwischen zwei Revisionen.
- `RestoreRevisionDialogV2.tsx` (160 Zeilen): Bestätigungsdialog mit Entwurfsschutz und Team-Warnhinweis.
- `RevisionItemRowV2.tsx` (122 Zeilen): Zeilenkomponente der Revisionsliste.
- `ImportDashboardDialogV2.tsx` (292 Zeilen): Drag & Drop-Dateiupload, Validierungsanzeige, Zielauswahl (Persönlich / Team).

### 5.1 Einhaltung der Dateigrößen-Grenzen
Alle geänderten und neuen Dateien liegen ausnahmslos unter **400 Zeilen**:
- `PersonalExecutiveDashboard.tsx`: 387 Zeilen ($\le 400$)
- `DashboardEditorPreviewV2.tsx`: 389 Zeilen ($\le 400$)
- `DashboardEditorShellV2.tsx`: 335 Zeilen ($\le 400$)
- `EditorTopBarV2.tsx`: 348 Zeilen ($\le 400$)
- `dashboardStorageV2.ts`: 390 Zeilen ($\le 400$)
- `dashboardRevisionServiceV2.ts`: 289 Zeilen ($\le 400$)

---

## 6. Verifikation & Nachweise

| Prüfbereich | Werkzeug / Datei | Ergebnis |
|---|---|---|
| **pgTAP Datenbanktests** | `supabase/tests/dashboard_revision_detail.sql` | **22 / 22 bestanden** (Gesamtsuite 486/486) |
| **Unit- & Servicetests** | Vitest (`dashboardConfigDiff`, `dashboardExchangeV2`, `dashboardRevisionServiceV2`, etc.) | **119 / 119 Dateien, 1.145 / 1.145 Tests grün** |
| **Preview E2E** | `e2e/dashboard-versions-preview.spec.ts` | **3 / 3 Viewports grün** (Desktop, Tablet, Mobil) in 3.3s |
| **Supabase E2E** | `e2e/dashboard-versions.spec.ts` | **3 / 3 Viewports grün** (Desktop, Tablet, Mobil) in 11.0s |
| **Barrierefreiheit** | `e2e/a11y.spec.ts` | **36 / 36 Tests bestanden** (0 critical/serious) |
| **Screenshot-Gate** | `scripts/captureAuftrag165GateScreenshots.mjs` | **30 / 30 Screenshots erzeugt**, 0 px horizontaler Überlauf, distinkte Hashes |
| **Bundle-Größe** | `npm run build` | Initial-Bundle: **167.94 kB** (Grenze < 180 kB) |
