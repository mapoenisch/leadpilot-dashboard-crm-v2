# Dashboard-Editor: UX-Konzept und Fachverträge (P02)

**Stand:** 10.11.2026  
**Status:** Baugrundlage für P03 (Rasterengine und Ziel-Tabellenmodell)  
**Bezug:** [Dashboard-Editor-Masterplan (Revision 2)](./DASHBOARD_EDITOR_MASTERPLAN.md) und [Bestandsbericht Auftrag 144](./EDITOR_BESTAND_144.md)  
**Autor:** Antigravity (Builder) · **Prüfung:** Unabhängiges Review durch Codex

---

## 1. Einleitung und Zielsetzung

Dieser Bericht legt die verbindlichen Benutzeroberflächen-, Interaktions- und Fachverträge für den neuen visuellen LeadPilot Dashboard-Editor fest (Paket P02). Er baut auf den Befunden der Bestandsprüfung aus Auftrag 144 (P01) auf und löst sämtliche offenen konzeptionellen Fragen, bevor in P03 die Rasterengine ausgewählt und das versionierte relationale Speichermodell festgelegt werden.

### 1.1 Leitprinzipien

1. **Kontextuelle Bearbeitung:** Der Nutzer bearbeitet sein Dashboard direkt im sichtbaren Layout (WYSIWYG auf 12 Spalten).
2. **Fachliche Integrität:** Es werden ausschließlich belegte CRM- und Baseline-Kennzahlen aus `DASHBOARD_CATALOG` angeboten. Fachlich unzulässige Aggregationen oder Zeitfilter werden durch den Editor gesperrt und transparent begründet.
3. **Strikte Mandantentrennung & Teams als Freigabegruppen:** Die Organisation ist der alleinige Daten- und Sicherheitsmandant. Teams existieren ausschließlich als Freigabe- und Empfängergruppen; Deals oder CRM-Daten besitzen keine Owner- oder Team-Zuordnung.
4. **Verlustfreies Arbeiten & Revisionssicherheit:** Änderungen werden in einer lokalen Arbeitskopie geführt. Parallele Bearbeitungen werden über optimistisches Locking (`expected_revision`) geschützt.

---

## 2. UX-Architektur des Haupt-Editors (4-Zonen-Shell)

Der Haupt-Editor teilt den Bildschirm in vier klar voneinander abgegrenzte Zonen auf, ergänzt durch eine übergeordnete Top-Bar und eine untere Statusleiste.

```text
+---------------------------------------------------------------------------------------------------+
| Top-Bar: Dashboard-Auswahl | Scope | Titel* | Globale Filter | Live/Pause | Vorschau | Speichern  |
+----------------------+----------------------------------------------------+-----------------------+
| Widget-Bibliothek    | 12-Spalten-Canvas (WYSIWYG)                        | Inspector             |
| (Breite: ~260 px)    |                                                    | (Breite: ~320 px)     |
|                      |  +--------------------+  +----------------------+  |                       |
| - Suche              |  | Kachel 1 (6 Sp.)   |  | Kachel 2 (6 Sp.)     |  | Tabs:                 |
| - Kategorien         |  |                    |  |                      |  | - Daten & Filter      |
| - Typen              |  +--------------------+  +----------------------+  | - Darstellung         |
| - Kachel-Karten      |  +-----------------------------------------------+  | - Schwellenwerte      |
|   (Drag / Klick)     |  | Kachel 3 (12 Sp. / Fokusrahmen aktiv)         |  | - Interaktion         |
|                      |  +-----------------------------------------------+  |                       |
+----------------------+----------------------------------------------------+-----------------------+
| Statusleiste: Verbindung: OK (Live) | Datenstand: 14:32:05 | 12/24 Kacheln | Undo/Redo bereit    |
+---------------------------------------------------------------------------------------------------+
```

### 2.1 Top-Bar (Globale Steuerung)

- **Dashboard-Auswahl & Scope-Badge:** Dropdown zur Auswahl verfügbarer Dashboards mit deutlicher Kennzeichnung:
  - `Persönlich` (blauer Badge): Nur für den aktuellen Benutzer sichtbar und bearbeitbar.
  - `Team: [Teamname]` (violetter Badge): Geteiltes Dashboard einer Freigabegruppe.
  - `Organisation` (grüner Badge): Für alle Organisationsmitglieder einsehbares Dashboard.
- **Titel & Änderungsstatus:**
  - Klick auf den Titel aktiviert ein Inline-Eingabefeld (max. 80 Zeichen).
  - Ungespeicherte Änderungen werden durch einen Stern am Titel (`*`) und einen bernsteinfarbenen Indikatorpunkt visualisiert.
- **Globale Dashboard-Filter:**
  - Zeitraum-Schnellauswahl (z. B. `Heute`, `7 Tage`, `30 Tage`, `Quartal`, `Jahr`, `Gesamt`). Wirkt auf alle Kacheln, die nicht kachelspezifisch fixiert sind.
  - Pipeline-Filter (z. B. `Alle Pipelines`, `Vertrieb Q4`).
- **Live / Pause Schalter:** Pausiert Live-KPI-Streams im Editor, um visuelle Unruhe bei der Layoutgestaltung zu vermeiden.
- **Vorschau-Modus (Umschalter):** Blendet Rasterlinien, Kachelrahmen und Seitenpaneele temporär aus, um die exakte Leseansicht zu prüfen.
- **Primäre Aktionen:**
  - `Speichern` (Primary Button): Atomare Persistierung über Backend-RPC mit Konfliktprüfung.
  - `Abbrechen` (Secondary Button): Verwirft die lokale Arbeitskopie nach Bestätigungsdialog (`UnsavedChangesDialog`).

### 2.2 Widget-Bibliothek (Zone Links, ca. 260 px)

- **Suche:** Live-Filterung über Kachelname, Kategorie und Quell-ID.
- **Kategorie-Filter (Pills):** `Alle`, `CRM & Vertrieb`, `Finanzen & SaaS`, `Live-Performance`, `Kombination`.
- **Kachel-Karten (Palette):**
  - Zeigt Kacheltyp, Name, empfohlene Standardgröße (z. B. `6×4`), unterstützte Ansichten (Icon-Reihe) und Datenherkunft (Badge: `CRM Snapshot`, `Live Stream`, etc.).
  - **Hinzufügen-Aktionen:**
    - Per Drag-and-Drop auf das Canvas ziehen (visueller Platzhalter zeigt Landeposition).
    - Per Klick / Tastatur-Enter auf die Karte: Kachel wird automatisch an der nächsten freien Position im 12-Spalten-Raster platziert (`Auto-Placement`).

### 2.3 Canvas (Zone Mitte, 12 Spalten)

- **12-Spalten-Raster:** Standardisierte Desktop-Breite; Kacheln besitzen Ganzzahl-Koordinaten `x (0..11)`, `y (0..n)`, `w (1..12)`, `h (1..n)`.
- **Visuelle Führung:** Subtile Rasterpunkte oder -linien werden nur im Bearbeitungsmodus eingeblendet.
- **Selektionsmodell:**
  - Klick auf Kachel selektiert diese: Kachel erhält einen 2 px Akzentrahmen (`border-primary-500`) mit sichtbaren Resize-Griffen an den Ecken und Kanten.
  - Öffnet automatisch den Inspector für diese Kachel.
  - Tastatur `Escape` hebt die Selektion auf.
- **Kollisionserkennung & Auto-Reflow:**
  - Beim Verschieben oder Vergrößern einer Kachel weichen darunterliegende Kacheln nach unten aus (`Vertical Compact / Gravity`).
  - Kacheln dürfen sich niemals überlappen.
  - Kacheln rasten an ganzzahligen Spalten ein.

### 2.4 Inspector (Zone Rechts, ca. 320 px)

- **Leerzustand:** Wenn keine Kachel selektiert ist, zeigt der Inspector allgemeine Dashboard-Einstellungen (Standard-Zeitraum, Beschreibung, Raster-Hintergrund) sowie eine Schnellhilfe zur Bedienung.
- **Selektierte Kachel:**
  - **Tab 1: Daten & Filter:**
    - Ausgewählte Kennzahl (mit Link zum Wechseln).
    - Kachelspezifischer Zeitraum / Filter-Override (vom Dashboard-Filter erben oder fixieren).
    - Aggregation (nur zulässige Operatoren gemäß Matrix aus Auftrag 144 aktiv).
  - **Tab 2: Darstellung:**
    - Auswahl der Darstellungsart (z. B. Zahl, Balken, Linie, Donut, Tabelle, Trichter, Gauge, Sparkline).
    - Titel & Untertitel der Kachel.
    - Achsenbeschriftung, Einheiten-Suffix, Legende (an/aus).
  - **Tab 3: Schwellenwerte:**
    - Warn- und Kritisch-Grenzwerte definieren.
    - Farbkodierung der Werte (Ampelfarben oder Akzentfarben).
  - **Tab 4: Interaktion:**
    - Drilldown-Ziel bei Klick (z. B. Wechsel zur CRM-Pipeline, Kundenübersicht oder keine Aktion).
  - **Aktion unten:** Prominente Schaltfläche `Im Panel-Editor öffnen`, um in den erweiterten Baukasten zu wechseln.

### 2.5 Statusleiste (Zone Unten, 36 px)

- **Verbindungsindikator:** Zeigt aktuellen Live-Status (`Verbunden`, `Pausiert`, `Offline`).
- **Aktualitäts-Zeitstempel:** `Letzter Datenabgleich: HH:MM:SS`.
- **Kachel-Budget:** Zähler der aktiven Kacheln gegen das Maximum (`12 / 24 Kacheln belegt`).
- **Undo/Redo-Verlauf:** Schnellanzeige des aktuellen Historienschritts mit Tooltip der letzten Aktion.

---

## 3. Panel-Editor (Erweiterter Baukasten)

Der Panel-Editor ist eine Vollflächen-Fokusansicht, die aus dem Inspector oder per Kachel-Aktion aufgerufen wird. Er dient der feingranularen Datenkonfiguration und visuellen Feinabstimmung einer einzelnen Kachel.

### 3.1 Aufbau des Panel-Editors

1. **Header:**
   - Zurück-Pfeil (führt zum Haupt-Editor zurück).
   - Editierbarer Widget-Titel.
   - Modus-Umschalter: `Visueller Baukasten` vs. `Deklarative Abfrage`.
   - Primäre Schaltflächen: `Übernehmen` (schreibt in die lokale Dashboard-Arbeitskopie) und `Verwerfen / Schließen`.
2. **Obere Hälfte: Live-Vorschau:**
   - Großformatige Rendering-Fläche der Kachel.
   - Umschaltbar zwischen Desktop-, Tablet- und Mobilvorschau.
   - Anzeige von Lade-, Fehler- und Leerzuständen.
3. **Untere Hälfte: Konfigurations-Tabs:**
   - **Tab A: Kennzahl & Pipeline:** Auswahl der Datenquelle (Katalog) und Filterbedingungen.
   - **Tab B: Transformationen:** Berechnungen, Sortierung, Limitierung von Zeilen.
   - **Tab C: Alarmschwellen:** Exakte Festlegung der Warn- und Alarmgrenzen.
   - **Tab D: Rohdaten-Inspektor:** Tabellarische Ansicht der zugrundeliegenden JSON-Datenzeilen zur Verifikation der Berechnung.

### 3.2 Visueller Baukasten (6-Stufen-Fluss)

Der visuelle Baukasten erzwingt eine fachlich korrekte Konfiguration über geführte Schritte:

```text
[1. Kennzahl wählen] ──> [2. Aggregation] ──> [3. Filter setzen] ──> [4. Gruppierung] ──> [5. Zeitraum] ──> [6. Darstellung]
```

- **Stufe 1 (Kennzahl):** Auswahl aus den 144 aktiven Katalog-IDs.
- **Stufe 2 (Aggregation):** Nur die für diese Kennzahl freigegebenen Operatoren sind wählbar (z. B. bei Bestandsgrößen nur `Letzter Stand` oder `Durchschnitt`, kein unzulässiges Aufsummieren über Zeit).
- **Stufe 3 (Filter):** Unterstützte Filterfelder (z. B. Pipeline, Deal-Status, Lead-Kanal).
- **Stufe 4 (Gruppierung):** Unterstützte Dimensionen (z. B. nach Phase, nach Region, nach Segment).
- **Stufe 5 (Zeitbasis):** Fixer Stichtag, rollierendes Fenster (30 Min, 7 Tage, 30 Tage) oder Geschäftsjahr.
- **Stufe 6 (Darstellung):** Vorschlag der optimalen Darstellungsform (z. B. Donut für Anteile, Balken für Phasenvergleich, Zahl für Einzelwert).

### 3.3 Deklarativer Abfragemodus (LeadPilot Query DSL)

Für erfahrene Anwender bietet der Panel-Editor eine strukturierte, deklarative JSON-Abfrage-Ansicht:

- **Keine freie SQL-Konsole:** Es wird kein SQL an die Datenbank gesendet. Die Abfrage verwendet ein sicheres, validiertes LeadPilot-Objektmodell.
- **Schema-Prüfung:** Live-Validierung der JSON-Struktur gegen das `TileQuerySchema`. Syntaxfehler und unzulässige Felder werden sofort markiert.
- **Verlustfreie Umschaltung:** Jede im deklarativen Modus vorgenommene gültige Änderung spiegelt sich 1:1 im visuellen Baukasten wider und umgekehrt.

---

## 4. Undo/Redo & Sitzungs-Zustandsmanagement

### 4.1 Entkopplung von Arbeitskopie und Persistenz

- Der Bearbeitungszustand wird in einer isolierten, clientseitigen Arbeitskopie (`DashboardDraftState`) geführt.
- Das Verlassen der Seite mit ungespeicherten Änderungen wird durch den `useInAppLinkGuard` blockiert.
- Erst ein Klick auf `Speichern` sendet die serialisierte V2-Konfiguration an den Server.

### 4.2 Undo/Redo-Regeln & Eingabebündelung (Debounce)

- **Keine künstliche Anzahlgrenze (Reversible Commands & Checkpoints):**
  - Gemäß Masterplan (Abschnitt 4.A) bedeutet „unbegrenzt“ den Verzicht auf eine starre Obergrenze (weder 50 noch 200 Aktionen).
  - Statt kompletter Snapshots der `DashboardConfigV2` speichert der Verlauf speichereffiziente, **reversible Befehle** (Delta-Patches, z. B. `MoveTile(id, oldGrid, newGrid)`, `UpdateOptions(id, oldOpts, newOpts)`, `AddTile(tile)`, `RemoveTile(tile)`). Dadurch benötigt ein Verlaufsschritt typischerweise unter 1 KiB RAM.
  - **Sitzungs-Checkpoints & Speicherüberwachung:**
    - Bei umfangreichen Bearbeitungssitzungen legt der Editor nach Meilensteinen (z. B. nach jeweils 50 Aktionen oder bei manueller Zwischensicherung) interne Checkpoints an.
    - Sollte das clientseitige Speicherbudget (Soft-Limit: 15 MiB für den History-Puffer) erreicht werden, erfolgt **keine stille Verwurfkürzung**. Stattdessen wird in der Statusleiste ein sichtbarer Hinweis eingeblendet („Verlauf wird ab Checkpoint X konsolidiert“), und ältere Deltas vor dem letzten stabilen Checkpoint werden speicheroptimiert freigegeben.
- **Eingabebündelung (Debouncing):**
  - Reine Texteingaben (z. B. Kacheltitel, Untertitel, Beschreibungen) in Inspector-Feldern erzeugen nicht pro Tastendruck einen Historienschritt.
  - Ein Undo-Schritt wird erst abgeschlossen, wenn:
    1. Der Fokus das Textfeld verlässt (`onBlur`), ODER
    2. Eine Tipp-Pause von **600 ms** eintritt.
- **Transaktions-Bündelung für Layout-Aktionen:**
  - Das Ziehen oder Skalieren einer Kachel (`Drag & Drop` / `Resize`) erzeugt während der Mausbewegung kontinuierliche visuelle Updates, aber genau **einen** Undo-Schritt beim Loslassen (`onDragEnd` / `onResizeStop`).
  - Ein Auto-Reflow (Verschieben mehrerer Nachbarkacheln durch Kollision) wird zusammen mit dem Auslöser in einer einzigen atomaren Undo-Transaktion zusammengefasst.
- **Ausschluss von Daten-Updates:**
  - Hintergrund-Refetches von CRM-Daten oder neue Ticks aus dem Live-Stream aktualisieren ausschließlich die Daten-Caches; sie erzeugen **niemals** Einträge im Undo/Redo-Verlauf und setzen das Dashboard nicht auf ungespeichert (`dirty = false`).

---

## 5. Responsive-, Touch- und Barrierefreiheitskonzept

### 5.1 Breakpoint-Matrix & Layoutanpassung

| Breakpoint     | Breite                   | Spalten | Shell-Verhalten                                                                                                             | Interaktion Kachel                                                                                                                               |
| -------------- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Desktop**    | ≥ 1200 px (Ziel 1440 px) | 12      | Bibliothek links (~260 px), Canvas flexibel, Inspector rechts (~320 px) fest angedockt. App-Sidebar bei Bedarf eingeklappt. | Vollständiges 2D Drag & Drop, freies Resizing an Kanten/Ecken, Hover-Aktionen.                                                                   |
| **Tablet**     | 768 px – 1199 px         | 6       | Bibliothek und Inspector als einklappbare Slide-Over-Paneele (Drawers). Canvas nimmt volle Breite ein.                      | Touch-Drag mit visueller Schattenführung; Ein-Klick-Größenwahl (Halb / Voll).                                                                    |
| **Smartphone** | < 768 px (Ziel 375 px)   | 1       | Single-Column-Layout. Bibliothek und Konfigurator öffnen als modale Vollbild-Sheets.                                        | **Kein horizontales Drag:** Kacheln haben feste 100 % Breite. Verschieben ausschließlich vertikal über Kachel-Menü (`Nach oben` / `Nach unten`). |

### 5.2 Tastatursteuerung (Keyboard Navigation)

- **Fokus-Hierarchie:** Das Raster implementiert das `grid`-Muster nach WAI-ARIA.
- **Navigation im Raster:**
  - `Pfeiltasten (Hoch / Runter / Links / Rechts)`: Bewegt den Fokus zwischen Kacheln.
  - `Enter` / `Leertaste`: Selektiert eine Kachel und öffnet den Inspector.
  - `Escape`: Hebt Selektion auf oder schließt Drawers; Fokus kehrt zum auslösenden Element zurück.
- **Kachel verschieben per Tastatur:**
  - `Alt + Pfeiltasten`: Verschiebt die selektierte Kachel um 1 Rastereinheit in die jeweilige Richtung.
  - `Alt + Shift + Pfeiltasten`: Ändert die Breite/Höhe der selektierten Kachel um 1 Rastereinheit.
- **Globale Shortcuts:**
  - `Strg / Cmd + Z`: Rückgängig (Undo).
  - `Strg / Cmd + Shift + Z` bzw. `Strg / Cmd + Y`: Wiederholen (Redo).
  - `Strg / Cmd + S`: Dashboard speichern (unterdrückt Browser-Standard-Save).

### 5.3 Barrierefreiheit (WCAG 2.1 AA)

- **Kontraste:** Alle Texte, Steuerelemente und Farbindikatoren erfüllen mindestens das Kontrastverhältnis 4.5:1 (normaler Text) bzw. 3.0:1 (großer Text / UI-Komponenten) im hellen und dunklen Theme.
- **Semantische Rollen & ARIA:**
  - `role="toolbar"` für Top-Bar und Kachel-Aktionsleisten.
  - `aria-expanded` für einklappbare Gruppen und Akkordeons.
  - `aria-live="polite"` für Statusleistenmeldungen und Ladeindikatoren.
  - `aria-grabbed` / `aria-dropeffect` für barrierefreies Drag-and-Drop.
- **Reduzierte Bewegung (`prefers-reduced-motion`):**
  - Kachel-Verschiebungen und Auto-Reflows verzichten bei aktivem Flag auf CSS-Übergangsanimationen und schalten Positionen verzögerungsfrei um.

---

## 6. Rechte-, Eigentums- und Freigabemodell

### 6.1 Mandantentrennung & Abgrenzung

- **Organisationsebene (Mandant):** Alle Dashboards, Kacheln und Metriken gehören zwingend zu genau einer `organization_id`. Ein Zugriff oder eine Freigabe über Organisationsgrenzen hinweg ist strikt ausgeschlossen.
- **Teams als Freigabegruppen:**
  - Teams sind reine administrative Gruppierungen von Benutzern innerhalb einer Organisation (z. B. `Vertriebsteam Süd`, `Management`).
  - Ein Dashboard kann einem Team freigegeben werden.
  - **Klarstellung:** Deals, Kontakte und Leads besitzen weiterhin **keine** Team- oder Owner-Zuordnung. Team-Dashboards filtern keine Daten nach "Deal-Besitzer", sondern teilen eine gemeinsame Sicht auf Organisationsdaten.

### 6.2 Dashboard-Scope, Eigentum und Rechteentzug

1. **Persönliches Dashboard (`scope: 'personal'`):**
   - Gehört exakt einem Benutzer (`owner_user_id`).
   - Jeder Benutzer (einschließlich `viewer`) darf sein eigenes persönliches Dashboard anlegen, umordnen und speichern.
2. **Team-Dashboard (`scope: 'team'`):**
   - Gehört der Organisation und ist einer Freigabegruppe (`team_id`) zugeordnet.
   - **Bindung an aktive Team-Berechtigung (Rechteentzug):**
     - Gemäß Masterplan (Abschnitt 4.E) liegt das Eigentum bei der Organisation. Das Feld `created_by_user_id` dient ausschließlich als unveränderlicher historischer Audit-Autor.
     - Schreib-, Bearbeitungs- und Löschrechte leiten sich **ausschließlich aus der aktuellen Mitgliedschaft** im freigegebenen Team ab.
     - Scheidet ein Benutzer mit Rolle `manager` aus einem Team aus (oder wird entfernt), verliert er **augenblicklich alle Schreib- und Löschrechte** an allen Dashboards dieses Teams – selbst dann, wenn er das Dashboard ursprünglich selbst angelegt hat. Die bloße historische Urheberschaft begründet nach einem Team-Austritt keinerlei Sonderrechte.
3. **Organisations-Standard (`scope: 'organization'`):**
   - Zentrales Dashboard für alle Benutzer der Organisation; Pflege ausschließlich durch Organisations-`admin`.

### 6.3 Rollenmatrix für Dashboard-Operationen

| Aktion                                                         | Rolle: `admin` |                       Rolle: `manager`                       |      Rolle: `viewer`      |
| -------------------------------------------------------------- | :------------: | :----------------------------------------------------------: | :-----------------------: |
| Eigenes persönliches Dashboard anpassen & speichern            |     ✅ Ja      |                            ✅ Ja                             |           ✅ Ja           |
| Eigenes persönliches Dashboard auf Voreinstellung zurücksetzen |     ✅ Ja      |                            ✅ Ja                             |           ✅ Ja           |
| Team-Dashboard erstellen                                       |     ✅ Ja      |   ✅ Ja (nur für Teams mit eigener aktiver Mitgliedschaft)   |          ❌ Nein          |
| Team-Dashboard bearbeiten & speichern                          |     ✅ Ja      | ✅ Ja (strikt an **aktive Mitgliedschaft** im Team gebunden) | ❌ Nein (nur Leseansicht) |
| Team-Dashboard löschen                                         |     ✅ Ja      | ✅ Ja (strikt an **aktive Mitgliedschaft** im Team gebunden) |          ❌ Nein          |
| Organisations-Standard-Dashboard bearbeiten                    |     ✅ Ja      |                           ❌ Nein                            |          ❌ Nein          |
| Freigabegruppen (Teams) verwalten                              |     ✅ Ja      |                           ❌ Nein                            |          ❌ Nein          |
| Dashboard-Export durchführen (JSON / PDF)                      |     ✅ Ja      |                            ✅ Ja                             |           ✅ Ja           |

---

## 7. Revisions- & Konfliktmodell (Mehrbenutzer-Integrität)

Beim Speichern von Dashboards – insbesondere geteilten Team-Dashboards – können parallele Sitzungen zu Überschreibkonflikten führen.

### 7.1 Optimistisches Locking (`expected_revision`)

- Jedes gespeicherte Dashboard besitzt eine fortlaufende Revisionsnummer (`revision: number`, beginnend bei 1).
- Beim Laden eines Dashboards merkt sich der Client die geladene Revision (`loadedRevision`).
- Der Speicher-RPC verlangt zwingend:
  ```typescript
  save_dashboard(dashboard_id: UUID, expected_revision: number, config: JSON)
  ```
- Stimmt `expected_revision` in der Datenbank nicht mehr mit dem übergebenen Wert überein, bricht die Datenbanktransaktion atomar ab und liefert den Fehlercode `REVISION_CONFLICT` (HTTP 409).

### 7.2 Konfliktbehandlungs-Dialog

Tritt beim Speichern ein Revisionskonflikt auf, blockiert der Editor das Überschreiben und öffnet einen modalen Konflikt-Dialog:

```text
+---------------------------------------------------------------------------------+
| Konflikt beim Speichern                                                         |
| Ein anderes Teammitglied hat dieses Dashboard zwischenzeitlich geändert.        |
|                                                                                 |
| Was möchten Sie mit Ihren ungespeicherten Änderungen tun?                       |
|                                                                                 |
| ( ) Neuesten Server-Stand laden (Ihre Änderungen werden verworfen)              |
| ( ) Als neues persönliches Dashboard speichern (Ihre Änderungen bleiben sicher) |
| ( ) Änderungen visuell vergleichen (Diff-Ansicht öffnen)                        |
|                                                                                 |
|                                     [Abbrechen]   [Ausgewählte Aktion anwenden] |
+---------------------------------------------------------------------------------+
```

1. **Option 1 (Verwerfen & Laden):** Aktualisiert den Client auf die neueste Revision der Datenbank.
2. **Option 2 (Fork / Als Kopie retten):** Erstellt ein neues persönliches Dashboard (`scope = 'personal'`) mit dem Inhalt des aktuellen Entwurfs. Kein Datenverlust.
3. **Option 3 (Diff-Ansicht):** Hebt im Layout hervor, welche Kacheln zwischen Server-Stand und lokalem Entwurf hinzugefügt, entfernt oder verschoben wurden.

### 7.3 Revisions-Historie & Audit-Trail

- Jede erfolgreiche Speicherung eines Dashboards erzeugt in einer Revisions-Tabelle (`dashboard_revisions`) einen unveränderlichen Snapshot.
- Der Snapshot enthält: `revision_id`, `dashboard_id`, `revision_number`, `created_at`, `created_by_user_id`, `config_json`.
- Ermöglicht in P12 den tabellarischen Versionsvergleich und das Wiederherstellen früherer Stände.

---

## 8. In-App-Alarme & Schwellenwert-Zustände

Gemäß Marcs Vorgabe konzentriert sich das Schwellenwert-Modell zunächst auf **In-App-Zustände** innerhalb des Dashboards. Externe Benachrichtigungen (E-Mail, Webhooks, Slack) oder KI-Alarme sind spätere Ausbaustufen.

### 8.1 Kachelspezifische Schwellenwert-Regeln

Jede Kennzahl-Kachel kann optional mit bis zu zwei Schwellenwerten konfiguriert werden:

1. **Warnschwelle (Warning):** Kennzeichnet Werte im Beobachtungsbereich (Farbe: Bernsteingelb / `amber-500`).
2. **Kritische Schwelle (Critical):** Kennzeichnet Zielverfehlungen oder akute Risiken (Farbe: Signalrot / `rose-500`).

Unterstützte Operatoren:

- Größer als (`>`) / Größer gleich (`>=`)
- Kleiner als (`<`) / Kleiner gleich (`<=`)
- Wertebereich (`between [min, max]`)

### 8.2 Visuelle Alarm-Indikatoren auf der Kachel

Befindet sich ein Kachelwert in einem Schwellenwert-Zustand, passt der Renderer die Darstellung an:

- **Subtiler Akzent:** Ein 2 px farbiger Rand links oder oben an der Kachel.
- **Statustoken:** Ein kompaktes Badge neben dem Kachelwert (z. B. `⚠️ Warnung` oder `🚨 Kritisch`).
- **Kein störendes Blinken:** Zur Wahrung der Barrierefreiheit und visuellen Ruhe wird auf pulsierende oder animierte Vollflächen-Warnungen verzichtet.

### 8.3 Entkopplung von Client-Visualisierung und Server-Scheduler

- **Phase A (Haupt-Editor / P02–P08):** Das Frontend evaluiert Schwellenwerte live anhand der abgerufenen KPI-Werte. Beim Rendern der Kachel wird der Wert gegen die Schwellenwerte geprüft und das Status-Badge gesetzt.
- **Phase B (Server-Alarmbetrieb / P13):** Die Schwellenwert-Definition wird in einem separaten Tabellenfeld persistent abgelegt, sodass ein späterer Server-Worker (pg_cron / Edge Function) dieselbe Regel bei geschlossenem Browser auswerten kann.

---

## 9. Vorgaben und Verträge für Paket P03 (Schema & Engine)

Aus den hier definierten UX- und Fachverträgen ergeben sich die bindenden Anforderungen für Paket P03:

### 9.1 TypeScript-Vertragsmodell (Baugrundlage V2)

```typescript
/** Geltungsbereich eines Dashboards */
export type DashboardScope = 'personal' | 'team' | 'organization';

/** Breakpoint-Identifikatoren */
export type EditorBreakpoint = 'desktop' | 'tablet' | 'mobile';

/** Koordinaten in einem Spaltenraster */
export interface GridPosition {
  x: number; // Spaltenindex (Desktop: 0..11, Tablet: 0..5, Mobile: 0)
  y: number; // Zeilenindex (0..n)
  w: number; // Spaltenbreite (Desktop: 1..12, Tablet: 1..6, Mobile: 1)
  h: number; // Zeilenhöhe (1..n, Mindesthöhe abhängig vom Kacheltyp)
}

/** Getrennte Rasterpositionen je Breakpoint mit deterministischer Vererbung */
export interface BreakpointGridPositions {
  desktop: GridPosition; // 12-Spalten-Raster (Pflicht)
  tablet?: GridPosition; // 6-Spalten-Raster (optional; wenn ausgelassen, deterministischer Fallback)
  mobile?: GridPosition; // 1-Spalten-Raster (optional; wenn ausgelassen, deterministischer Fallback)
}

/** Editierbare visuelle Darstellungsoptionen aus dem Inspector */
export interface TileDisplayOptions {
  subtitle?: string; // Editierbarer Untertitel
  showLegend?: boolean; // Legendenanzeige ein/aus
  xAxisLabel?: string; // Achsenbeschriftung X
  yAxisLabel?: string; // Achsenbeschriftung Y
  unitSuffix?: string; // Benutzerdefiniertes Einheitensuffix (z. B. '€', '%', 'h')
  colorScheme?: 'default' | 'monochrome' | 'status'; // Farbschema
  compactNumbers?: boolean; // Kompakte Zahlenformatierung (z. B. '120k' statt '120.000')
}

/** Filterregel für Panel-Abfragen */
export interface TileFilterRule {
  field: string; // z. B. 'stage', 'status', 'channel', 'segment'
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number | boolean | string[] | number[];
}

/** Transformationen für Panel-Abfragen */
export interface TileTransformationConfig {
  sortBy?: string; // Sortierdimension
  sortDirection?: 'asc' | 'desc';
  limit?: number; // Zeilenbegrenzung (z. B. Top 5)
  hideEmpty?: boolean; // Leere Einträge ausblenden
}

/** Vollständige Datenabfrage einer Kachel (Single Source of Truth für den Panel-Editor) */
export interface TileQueryConfig {
  metricId: string; // Referenz auf DASHBOARD_CATALOG
  aggregation?: string; // z. B. 'summe', 'schnitt', 'anzahl', 'verhaeltnis', 'letzter_stand'
  groupBy?: string; // z. B. 'stage', 'region', 'segment', 'channel'
  timeframe?: string; // z. B. '30d', 'quarter', 'year', 'all'
  pipelineId?: string; // Optionaler Pipeline-Filter
  filters?: TileFilterRule[]; // Detaillierte Filterregeln
  transformations?: TileTransformationConfig; // Sortierung und Begrenzung
}

/** Schwellenwert-Regel */
export interface TileThresholdRule {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'between';
  warningValue: number;
  criticalValue: number;
  secondaryWarningValue?: number; // für between
  secondaryCriticalValue?: number; // für between
}

/** Konfiguration einer einzelnen Kachel (V2) */
export interface DashboardTileConfigV2 {
  id: string; // Eindeutige Kachel-ID (UUID v4)
  catalogId: string; // Referenz auf DASHBOARD_CATALOG (z. B. 'baseline.arr')
  title: string; // Benutzerdefinierter Titel
  presentation: string; // Renderer (z. B. 'zahl', 'balken', 'donut', etc.)
  layouts: BreakpointGridPositions; // Getrennte Rasterpositionen je Breakpoint
  displayOptions?: TileDisplayOptions; // Editierbare Darstellungsoptionen
  query?: TileQueryConfig; // Vollständige persistierte Panel-Abfragestruktur
  timeframeOverride?: string; // Optionaler kachelspezifischer Zeitraum
  pipelineOverride?: string; // Optionaler Pipeline-Filter
  aggregationOverride?: string; // Erlaubte Aggregation
  threshold?: TileThresholdRule; // In-App-Schwellenwert
  drilldownUrl?: string; // Klick-Navigation
}

/** Vollständige Dashboard-Konfiguration (V2) */
export interface DashboardConfigV2 {
  version: 2;
  id: string; // Dashboard-UUID
  title: string;
  scope: DashboardScope;
  teamId?: string; // Pflicht wenn scope === 'team'
  ownerUserId: string; // Ersteller / Eigentümer
  organizationId: string; // Mandant
  globalTimeframe: string; // Standard-Zeitraum
  globalPipeline?: string; // Standard-Pipeline
  tiles: DashboardTileConfigV2[]; // Max. 24 Kacheln
  createdAt: string;
  updatedAt: string;
}
```

#### Vererbungs- und Fallback-Regeln für Breakpoint-Layouts:

1. **Desktop als Master (`desktop`):** Die 12-Spalten-Positionierung ist immer vorhanden und bildet das Master-Layout.
2. **Deterministischer Fallback für Tablet & Mobile:**
   - Fehlt `tablet`, skaliert die Render-Engine Kacheln mit `w > 6` auf `w = 6` und ordnet Kacheln kollisionsfrei im 6-Spalten-Raster an.
   - Fehlt `mobile`, setzt die Engine `w = 1`, `x = 0` und ordnet Kacheln vertikal strikt nach der Desktop-Reihenfolge (`y`, dann `x`).
3. **Isolierte Speicherung mobiler Anpassungen:**
   - Verändert ein Anwender auf Tablet oder Smartphone die Reihenfolge (z. B. über das mobile Aktionsmenü `Nach oben` / `Nach unten`), wird ausschließlich `layouts.tablet` bzw. `layouts.mobile` persistiert.
   - Das Desktop-Layout (`layouts.desktop`) bleibt bei mobiler Nutzung vollständig unangetastet.

### 9.2 Bindende Anforderungen an das Speichermodell (P03/P07)

1. **Trennung von Metadaten und Konfiguration:**
   - Tabellenstruktur: `dashboards` (ID, Org, Scope, Team, Name, Revision) und `dashboard_revisions` (Historie aller Stände).
2. **Kopiermigration von V1 nach V2 anhand der tatsächlichen V1-Größenwerte:**
   - Die bestehende V1-Zeile in `executive_dashboard_preferences` bleibt unangetastet.
   - V1 verwendet laut `DashboardTileConfig.size` (`src/features/dashboard/model/dashboardConfig.ts`) ausschließlich die Stringwerte `'klein' | 'mittel' | 'gross' | 'voll'`, die in `DashboardGrid.tsx:44–47` den Desktop-Spaltenbreiten 3, 6, 9 und 12 entsprechen.
   - Die Kopiermigration überführt diese Werte deterministisch in das neue V2-Breakpoint-Raster (`BreakpointGridPositions`):
     - `'klein'`: Desktop `w = 3, h = 3`; Tablet `w = 3, h = 3`; Mobile `w = 1, h = 3`
     - `'mittel'`: Desktop `w = 6, h = 4`; Tablet `w = 6, h = 4`; Mobile `w = 1, h = 4`
     - `'gross'`: Desktop `w = 9, h = 5`; Tablet `w = 6, h = 5`; Mobile `w = 1, h = 5`
     - `'voll'`: Desktop `w = 12, h = 6`; Tablet `w = 6, h = 6`; Mobile `w = 1, h = 6`
   - **Kollisionsfreie Koordinatenberechnung getrennt je Breakpoint:**
     - **Desktop (12 Spalten):** Start bei `(x = 0, y = 0)`. Wenn `x + w > 12`, erfolgt ein Zeilenumbruch zu `x = 0, y = y + max_h_in_zeile`.
     - **Tablet (6 Spalten):** Start bei `(x = 0, y = 0)`. Wenn `x + w > 6`, erfolgt ein Zeilenumbruch zu `x = 0, y = y + max_h_in_zeile`.
     - **Mobile (1 Spalte):** Alle Kacheln erhalten strikt `x = 0, w = 1`. Die Platzierung erfolgt rein vertikal nacheinander: Für Kachel $i$ gilt $x_i = 0$ und $y_i = \sum_{k=0}^{i-1} h_k$.
3. **Vorbereitung für Teams:**
   - Bereitstellung einer Tabelle `dashboard_teams` und `dashboard_team_members` für Freigabegruppen, die in P07 als relationale Struktur angelegt und in P11 für die Benutzeroberfläche freigeschaltet wird.

---

## 10. Fazit und Übergabe an P03

Mit dieser Spezifikation sind alle fachlichen und bedienungsseitigen Grundlagen für den visuellen Dashboard-Editor gelegt:

- Die 4-Zonen-Shell und der Panel-Editor sind vollständig strukturiert.
- Das Rechte- und Freigabemodell trennt persönliche Entwürfe sauber von gemeinsamen Team-Sichten, ohne bestehende CRM-Datenbereiche zu verletzen.
- Das Revisionsmodell schützt vor Datenverlust durch paralleles Bearbeiten.
- Die Vorgaben für P03 definieren das exakte Zielschema und die Migrationsregeln.

Damit ist das Paket P02 abgeschlossen und bereit für das unabhängige Review durch Codex.
