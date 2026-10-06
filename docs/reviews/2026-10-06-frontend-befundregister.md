# Befundregister Frontend-Qualität (Arbeitspaket 0)

**Stand:** 06.10.2026 · **Auftrag:** [081](../auftraege/ANTIGRAVITY_AUFTRAG_081_FRONTEND_BESTANDSAUFNAHME.md) ·
**Plan:** [Frontend-Qualität](../superpowers/plans/2026-10-06-frontend-qualitaet-plan.md), Abschnitt 5 ·
**Entwurf:** [Design](../superpowers/specs/2026-10-06-frontend-qualitaet-design.md)

Dieses Register ist die überprüfbare Ausgangslage vor jeder Änderung. Es nimmt keine frühere
Freigabe zurück: Die Bildseiten-Entscheidung aus Auftrag 069 (`ARCHITECTURE_DECISIONS.md` B18) und
die Dashboard-Abnahme aus Auftrag 079 gelten weiter, bis ein freigegebener Folgeauftrag sie ändert.

## 1. Messumgebung

| Punkt               | Wert                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / Commit     | `claude/frontend-paket-0`, Code-Stand `main` `5c0deba` (Merge PR #65)                                                                                                                                                        |
| Versionsanzeige     | Sidebar „LeadPilot v2.3.2“, Login „V2.3.2“ (Release v2.4.0 läuft parallel in PR #66)                                                                                                                                         |
| Startmodus          | Produktionsbuild (`vite build`) gegen lokales Supabase, `vite preview`; Dashboard-Rollout an (Standard)                                                                                                                      |
| Darstellung         | `PAGE_PRESENTATION = 'bild'` (32 Seiten als Ganzseitenbild)                                                                                                                                                                  |
| Browser             | Chromium (Playwright), Zoom 100 %, `deviceScaleFactor` 1, reduzierte Bewegung                                                                                                                                                |
| CSS-Viewports       | 1440 × 1000, 768 × 1024, 375 × 812; Zusatz 320 × 640 (Dashboard, Funnel)                                                                                                                                                     |
| Themes              | dunkel und hell getrennt (`localStorage` `leadpilot-theme`)                                                                                                                                                                  |
| Benutzer            | CI-Testbenutzer `admin-a` (Organisation A); keine Zugangsdaten protokolliert                                                                                                                                                 |
| Lazy Loading        | `<main>` wird vor jeder Aufnahme einmal durchgescrollt, danach `networkidle`                                                                                                                                                 |
| Lokale Besonderheit | Edge Function `crm-query-export` läuft lokal nicht: CRM-Listen (Leads, Accounts, Pipeline) stehen ohne Eingriff im Fehlerzustand `SERVER_ERROR`. Die CRM-Kacheln im Dashboard laden über einen anderen Weg und zeigen Daten. |

Reproduktion: `BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag081Inventory.mjs`.
Der Lauf endet mit Exit-Code 1, sobald eine erwartete Aufnahme fehlt oder fehlschlägt.
Messwerte je Aufnahme (256 von 256 erwarteten Aufnahmen, keine fehlgeschlagen): [`2026-10-06-frontend-inventar.json`](2026-10-06-frontend-inventar.json).
Bilder bleiben lokal unter `docs/screenshots/auftrag-081/` (Ergebnismatrix: [README](../screenshots/auftrag-081/README.md)).

## 2. Einstufung der Befunde

Legende: **bestätigt** = gemessen oder im Code belegt; **begrenzt bestätigt** = belegt, Umfang oder
Ursache noch offen; **noch zu prüfen** = in Paket 0 nicht entscheidbar.

| ID  | Befund                                                  | Einstufung         | Beleg und Reproduktion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Paket   |
| --- | ------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| F01 | Große Kennzahlkacheln, viel Platz vor den Daten         | bestätigt          | `/dashboard`, Standardansicht: Zahlenkacheln 349 px (1440) bzw. 331 px (768/375) hoch, Richtwert 160–220 px. Der Wert beginnt erst rund 200 px unter der Kachelkante, darüber vier Metazeilen.                                                                                                                                                                                                                                                                                                                                                             | D, E    |
| F02 | Wiederholte Angaben zu historischen Daten               | bestätigt          | Jede historische Kachel zeigt „Stand … · Quelle: Stammdaten“, „Zeitbezug: Fester historischer Stand“ und „Historischer Stand ist fest“ (drei Zeilen, gleiche Aussage).                                                                                                                                                                                                                                                                                                                                                                                     | E       |
| F03 | Kennzahlen ohne verständliche Einordnung                | bestätigt          | Standardansicht: keine Vergleichswerte, Ziele oder Entwicklung; alle Kacheln gleich gewichtet. Ob belegte Vergleichsdaten existieren, klärt Paket E (Spec §6.4).                                                                                                                                                                                                                                                                                                                                                                                           | E       |
| F04 | Bedienbarer Datumsfilter ohne Wirkung                   | bestätigt          | `DashboardFilters.tsx:4` und Hinweis auf der Seite: „Der Zeitraum wird gespeichert, wirkt aber noch nicht“. Zusätzlich zeigen die Datumsfelder das US-Format `mm/dd/yyyy` (Chromium, Sprache der Seite nicht gesetzt; noch zu prüfen).                                                                                                                                                                                                                                                                                                                     | C       |
| F05 | Pipeline als freies Textfeld                            | bestätigt          | `/dashboard`: Feld „Pipeline“ ohne Auswahl, Vorschläge oder Erklärung. Herkunft einer vollständigen Liste offen.                                                                                                                                                                                                                                                                                                                                                                                                                                           | C       |
| F06 | Mobil kein Kennzahlwert im ersten Bildschirm            | bestätigt          | 375 × 812: 0 Werte sichtbar, erster Wert bei 916 px; 320 px: erster Wert bei 1069 px. Davor Simulationsleiste, Überschrift, Text, Button und der offene Filterbereich.                                                                                                                                                                                                                                                                                                                                                                                     | C, D, E |
| F07 | 32 Seiten als Ganzseitenbilder                          | bestätigt          | Alle 32 Seiten: Bild auf 0,58–0,70 (1440), 0,38–0,46 (768), 0,18–0,22 (375) und 0,17 (320) der Originalgröße verkleinert. Text im Bild wird auf dem Handy damit auf rund ein Fünftel verkleinert. Tabelle in Abschnitt 4.                                                                                                                                                                                                                                                                                                                                  | D, G    |
| F08 | Funnel: Bild und Textfassung widersprechen sich         | noch zu prüfen     | Entwurf nennt 65,3 % (Bild) gegen 56 % (Text). Paket 0 gleicht keine Zahlen ab; Abgleich aller 32 Seiten ist Aufgabe von Paket B (Plan §7).                                                                                                                                                                                                                                                                                                                                                                                                                | B       |
| F09 | Technische Begriffe und gemischte Sprache               | bestätigt          | Sichtbar u. a.: „Server Query“, „Edge Function / RLS geschützt“, „SERVER_ERROR“ (Pipeline), „closeDate“ (vier CRM-Kacheln), Stufen „PROPOSAL“/„LEAD“, „baseline.arr_verlauf“ (Details ARR), „Headcount“. Fundstellen im Code: „Server Query“ 2 Dateien, „closeDate“ 6, „Stage“ 12, „Headcount“ 10.                                                                                                                                                                                                                                                         | C, E, H |
| F10 | Zu viele Editoraktionen                                 | bestätigt          | Bearbeiten-Modus 1440 px: je Kachel vier Schaltflächen („Nach oben“, „Nach unten“, „Bearbeiten“, „Entfernen“) über der Kachel, dazu vier in der Werkzeugleiste und vier im Filterbereich. Inhaltshöhe steigt von 3423 auf 4177 px (1440) bzw. von 7997 auf 9593 px (375).                                                                                                                                                                                                                                                                                  | F       |
| F11 | Dekorierte Diagramme, ähnliche Farbtöne                 | bestätigt          | Standardansicht: Balken mit 3D-Tiefe und Leuchtrand („Pipeline-Volumen nach Stufe“), Ring mit Glanz („MRR nach Paket“); die drei Ringsegmente sind Türkistöne. Kontrast der Segmente nicht gemessen.                                                                                                                                                                                                                                                                                                                                                       | D, E    |
| F12 | CRM-Fehler zeigt Nullwerte und blockiert die Navigation | bestätigt (lokal)  | Siehe Abschnitt 5. Fehler als „0“: „Funnel Deals Gesamt 0“, „0 Deals gefunden“ neben „Status: nicht verfügbar“. Navigation: von `/crm/deals` oder `/crm/leads` im Fehlerzustand zu „Unternehmenssteckbrief“ wechselt die Adresse, der Inhalt bleibt auch nach 6 s die CRM-Seite. Gegenprobe vom Funnel aus: Wechsel klappt. „Maximum update depth exceeded“ erscheint im Produktionsbuild nicht; Ursache und Produktionsbetroffenheit bleiben offen.                                                                                                       | A       |
| F13 | Abmelden verborgen                                      | bestätigt          | `Layout.tsx:130`: Abmelde-Button `opacity-0`, sichtbar nur bei Hover/Fokus, unten rechts fixiert.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | H       |
| F14 | Umfangreiches Menü, unklare Zustände                    | begrenzt bestätigt | Sidebar 1440 px: zehn Bereiche plus Administration; aktiver Eintrag (Hintergrund) und aufgeklappter Bereich (Türkis-Überschrift) nutzen dieselbe Farbe. Gespeicherte Aufklappzustände nicht geprüft.                                                                                                                                                                                                                                                                                                                                                       | H       |
| F15 | **Neu:** Heller Modus großflächig unlesbar              | bestätigt          | Ursache im Code: Token `--color-text-primary` ist nirgends definiert; 18 Verwendungen in 10 Dashboard-Dateien fallen auf `#fff` zurück. Sichtbar: Dashboard-Überschrift, Kachel-Details (Zeitraum, Quelle, Aktualität), Kopfzeile und Simulationsleiste weiß/hell auf Mint. axe über die ganze Seite meldet im hellen Modus auf **allen 42 Ansichten** `color-contrast` (Kopfzeile/Sidebar), im dunklen Modus nirgends. Beschränkt auf `<main>` sieht axe auf `/dashboard` nichts, nur auf Datenbasis, Standort (768), Live-Simulation und den CRM-Listen. | D, E    |

## 3. Weitere Beobachtungen

- **Überlauf:** 0 px auf Dokumentebene überall. Innerhalb von `<main>` bei 375 px: Live-Simulation
  184 px, Leads 14 px (beide Themes). Alle anderen Ansichten 0 px.
- **Überschriftenstruktur:** Auf Dashboard, Details und den CRM-Seiten liegt in `<main>` keine `h1`
  (die Seitenüberschrift steht im Header bzw. ist `h2`); die Bildseiten haben ihre `h1` in der
  Textschicht. Noch zu prüfen, ob das gewollt ist (Paket H).
- **Fokus:** Erster Tab-Druck ab Dokumentanfang führt in allen 256 Aufnahmen auf „Zum Hauptinhalt
  springen“, sichtbar mit Fokusrahmen. Gemessen mit zurückgesetztem Tab-Startpunkt, auch nach dem
  Öffnen von Editor und Details per Klick.
- **axe:** Zwei Scans je Aufnahme, nur `<main>` und ganze Seite (Spalten in der Ergebnismatrix).
  Außerhalb von `<main>` gibt es ausschließlich `color-contrast` im hellen Modus (F15).
- **Verschachtelte Scrollbereiche:** Kachel „Team und HR“ scrollt im Dashboard innerhalb der Kachel.
- **Leere Rasterfläche:** Neben „Produkt-Roadmap“ bleibt bei 1440 px eine halbe Zeile leer.
- **Theme ohne Höhenwirkung:** Dunkel und hell ergeben überall dieselbe Inhaltshöhe; jedes Bildpaar
  unterscheidet sich (SHA-256).

## 4. Inventar der 32 Bildseiten

Alle 32 Seiten rendern über `src/components/imagePage/ImagePage.tsx` (Bild aus
`imagePages.ts`, darunter die HTML-Fassung als unsichtbare Textschicht). Die HTML-Fassung existiert
für jede Seite vollständig (Auftrag 068, Page-Kit) und ist über `PAGE_PRESENTATION = 'html'` global
sichtbar. Keine Seite liegt in einem Schutzbereich; `src/features/resources/**` ist keine Bildseite.
„Umfang“ = Zeilen der Seitenkomponente (klein < 70, mittel 70–119, groß ≥ 120). Bild-/Textabgleich
der Zahlen: Paket B.

| Nr. | Bereich              | Seite                        | Route                          | Komponente (`src/features/`)                 | Domänenquelle (`src/domain/`) | Diagramme/Tabellen in HTML-Fassung | Umfang (Zeilen) | Bildmaßstab 1440 / 375 | Höhe 375 px | Schutzbereich | Zahlenabgleich |
| --- | -------------------- | ---------------------------- | ------------------------------ | -------------------------------------------- | ----------------------------- | ---------------------------------- | --------------- | ---------------------- | ----------- | ------------- | -------------- |
| 1   | Übersicht            | Unternehmenssteckbrief       | `/company/profile`             | `overview/pages/CompanyProfilePage.tsx`      | execData                      | –                                  | mittel (74)     | 0,65 / 0,20            | 626         | nein          | B              |
| 2   | Übersicht            | Jahres-Highlights 2025       | `/company/highlights`          | `overview/pages/YearHighlightsPage.tsx`      | execData                      | –                                  | klein (69)      | 0,65 / 0,20            | 626         | nein          | B              |
| 3   | Unternehmen          | Geschäftsidee                | `/company/idea`                | `unternehmen/pages/IdeaPage.tsx`             | unternehmenData               | –                                  | klein (42)      | 0,63 / 0,19            | 626         | nein          | B              |
| 4   | Unternehmen          | Value Proposition            | `/company/value-proposition`   | `unternehmen/pages/ValuePropositionPage.tsx` | unternehmenData               | –                                  | klein (46)      | 0,59 / 0,18            | 626         | nein          | B              |
| 5   | Unternehmen          | Gründung & Entwicklung       | `/company/history`             | `unternehmen/pages/HistoryPage.tsx`          | unternehmenData               | –                                  | klein (52)      | 0,59 / 0,18            | 626         | nein          | B              |
| 6   | Produkt              | Produkt & Funktionsweise     | `/product/features`            | `produkt/pages/FeaturesPage.tsx`             | produktData                   | –                                  | klein (46)      | 0,59 / 0,18            | 626         | nein          | B              |
| 7   | Produkt              | Pakete & Preismodell         | `/product/pricing`             | `produkt/pages/PricingPage.tsx`              | produktData                   | –                                  | klein (67)      | 0,59 / 0,18            | 626         | nein          | B              |
| 8   | Produkt              | Produkt-Performance 2025     | `/product/performance`         | `produkt/pages/PerformancePage.tsx`          | produktData                   | Line                               | groß (142)      | 0,58 / 0,18            | 626         | nein          | B              |
| 9   | Produkt              | Releases & Roadmap           | `/product/roadmap`             | `produkt/pages/RoadmapPage.tsx`              | produktData                   | –                                  | mittel (76)     | 0,70 / 0,22            | 626         | nein          | B              |
| 10  | Markt & Wettbewerb   | Marktlage DACH               | `/market/overview`             | `markt/pages/MarketOverviewPage.tsx`         | marktData                     | Table                              | klein (52)      | 0,65 / 0,20            | 626         | nein          | B              |
| 11  | Markt & Wettbewerb   | Wettbewerbslandschaft        | `/market/competition`          | `markt/pages/CompetitionPage.tsx`            | marktData                     | Column, Table                      | mittel (90)     | 0,65 / 0,20            | 626         | nein          | B              |
| 12  | Markt & Wettbewerb   | SWOT-Analyse                 | `/market/swot`                 | `markt/pages/SwotPage.tsx`                   | marktData                     | –                                  | klein (49)      | 0,65 / 0,20            | 626         | nein          | B              |
| 13  | Kunden & ICP         | Ideal Customer Profile (ICP) | `/customers/icp`               | `kunden/pages/IcpPage.tsx`                   | kundenData                    | –                                  | klein (49)      | 0,63 / 0,19            | 626         | nein          | B              |
| 14  | Kunden & ICP         | Buyer Persona „Volker"       | `/customers/persona`           | `kunden/pages/PersonaPage.tsx`               | kundenData                    | –                                  | mittel (70)     | 0,63 / 0,19            | 626         | nein          | B              |
| 15  | Kunden & ICP         | Kundensegmente               | `/customers/segments`          | `kunden/pages/SegmentsPage.tsx`              | kundenData                    | Column, Table                      | mittel (93)     | 0,63 / 0,19            | 626         | nein          | B              |
| 16  | Kunden & ICP         | Top-10-Kunden                | `/customers/top-customers`     | `kunden/pages/TopCustomersPage.tsx`          | kundenData                    | Table                              | klein (58)      | 0,63 / 0,19            | 626         | nein          | B              |
| 17  | Vertrieb & Marketing | Sales Funnel 2025            | `/sales/funnel`                | `vertrieb/pages/FunnelPage.tsx`              | vertriebData                  | Column, Table                      | groß (129)      | 0,66 / 0,20            | 626         | nein          | B              |
| 18  | Vertrieb & Marketing | SLA Marketing & Sales        | `/sales/sla`                   | `vertrieb/pages/SlaPage.tsx`                 | vertriebData                  | Table                              | klein (60)      | 0,65 / 0,20            | 626         | nein          | B              |
| 19  | Vertrieb & Marketing | Kanalperformance & CAC       | `/sales/channels`              | `vertrieb/pages/ChannelsPage.tsx`            | vertriebData                  | Column, Table                      | groß (150)      | 0,65 / 0,20            | 626         | nein          | B              |
| 20  | Vertrieb & Marketing | Marketingplanung H2 2026     | `/sales/planning`              | `vertrieb/pages/PlanningPage.tsx`            | vertriebData                  | Column, Table                      | mittel (110)    | 0,65 / 0,20            | 626         | nein          | B              |
| 21  | Finanzen             | Gewinn- und Verlustrechnung  | `/finance/p-and-l`             | `finanzen/pages/PnLPage.tsx`                 | finanzenData                  | Column, Table                      | groß (153)      | 0,65 / 0,20            | 603         | nein          | B              |
| 22  | Finanzen             | Bilanz & SaaS KPIs           | `/finance/balance-sheet`       | `finanzen/pages/BalanceSheetPage.tsx`        | finanzenData                  | Table                              | klein (60)      | 0,66 / 0,20            | 626         | nein          | B              |
| 23  | Finanzen             | Unit Economics 2026          | `/finance/unit-economics`      | `finanzen/pages/UnitEconomicsPage.tsx`       | finanzenData                  | Line                               | groß (166)      | 0,66 / 0,20            | 626         | nein          | B              |
| 24  | Organisation & Team  | Headcount-Entwicklung        | `/organisation/headcount`      | `organisation/pages/HeadcountPage.tsx`       | organisationData              | Line                               | mittel (98)     | 0,65 / 0,20            | 626         | nein          | B              |
| 25  | Organisation & Team  | HR-Kennzahlen                | `/organisation/hr`             | `organisation/pages/HrPage.tsx`              | organisationData              | –                                  | klein (59)      | 0,64 / 0,20            | 626         | nein          | B              |
| 26  | Organisation & Team  | Teamstruktur & Engpässe      | `/organisation/team`           | `organisation/pages/TeamStructurePage.tsx`   | organisationData              | –                                  | groß (132)      | 0,63 / 0,20            | 626         | nein          | B              |
| 27  | Strategie 2026+      | Ziele & OKRs                 | `/strategy/okrs`               | `strategie/pages/OkrsPage.tsx`               | strategieData                 | Column                             | mittel (78)     | 0,63 / 0,20            | 626         | nein          | B              |
| 28  | Strategie 2026+      | Balanced Scorecard           | `/strategy/balanced-scorecard` | `strategie/pages/BalancedScorecardPage.tsx`  | strategieData                 | –                                  | klein (59)      | 0,64 / 0,20            | 626         | nein          | B              |
| 29  | Strategie 2026+      | Wachstumstreiber             | `/strategy/growth-drivers`     | `strategie/pages/GrowthDriversPage.tsx`      | strategieData                 | –                                  | mittel (70)     | 0,64 / 0,20            | 626         | nein          | B              |
| 30  | Recht & Gründung     | Satzung LeadPilot GmbH       | `/legal/articles`              | `recht/pages/ArticlesPage.tsx`               | rechtData                     | Table                              | klein (52)      | 0,64 / 0,20            | 626         | nein          | B              |
| 31  | Recht & Gründung     | Gesellschafterliste          | `/legal/shareholders`          | `recht/pages/ShareholdersPage.tsx`           | rechtData                     | Table                              | klein (64)      | 0,64 / 0,20            | 626         | nein          | B              |
| 32  | Recht & Gründung     | Handelsregister              | `/legal/commercial-register`   | `recht/pages/CommercialRegisterPage.tsx`     | rechtData                     | –                                  | klein (44)      | 0,64 / 0,20            | 626         | nein          | B              |

## 5. Fehlerfall Pipeline (F12)

Reproduktion (Teil der Harness, zusätzlich mit 6 s Wartezeit gegengeprüft):

1. Anmelden als `admin-a`, `/crm/deals` öffnen. `crm-query-export` antwortet mit 500 (lokal ohne
   Eingriff, in der Harness zusätzlich per `context.route` erzwungen).
2. Anzeige: Badges „Status: nicht verfügbar“, „Frische: keine Daten (SERVER_ERROR)“; gleichzeitig
   „0 Funnel Deals“, Karte „Funnel Deals Gesamt 0“, „0 Deals gefunden“ und ein sichtbarer
   „CSV Export“-Button. Unten: „Integritätsfehler: Ein interner Serverfehler ist aufgetreten.“
3. In der Sidebar „Unternehmenssteckbrief“ wählen: Adresse wird `/company/profile`, `<main>` zeigt
   weiter „Deal Pipeline“. Danach „Sales Funnel 2025“: Adresse `/sales/funnel`, Inhalt unverändert.
4. Gleiches Verhalten von `/crm/leads` aus. Gegenprobe `/sales/funnel` → Steckbrief: Wechsel klappt.
5. Konsole: nur die beiden 500-Antworten, keine Seitenfehler, kein „Maximum update depth exceeded“.

Offen für Paket A: Ursache (Plan §6 nennt `useUrlSyncedState`, `useCrmListQuery`, `DataSourceStatus`,
`RouteErrorBoundary` als Diagnosekandidaten), Verhalten bei erfolgreicher und leerer Antwort
(braucht lokal laufende Edge Function), Betroffenheit der Produktion.

## 6. Interaktive Abläufe

| Ansicht                | Route                  | Höhe 1440 / 768 / 375 px  | Messung                                                                             |
| ---------------------- | ---------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| Dashboard (Standard)   | `/dashboard`           | 3423 / 5781 / 7997        | 17 Kacheln; Werte im ersten Bildschirm 4 / 2 / 0; 320 px: 8126 px, 0 Werte          |
| Dashboard bearbeiten   | `/dashboard`           | 4177 / 6513 / 9593        | erster Wert bei 833 / 829 / 1168 px                                                 |
| Kachel-Details (ARR)   | `/dashboard/tiles/…`   | Viewport                  | im hellen Modus Werte unlesbar (F15); Beschreibung mit `baseline.arr_verlauf` (F09) |
| Datenbasis             | `/company/data-basis`  | Viewport / Viewport / 721 | axe `color-contrast` hell                                                           |
| Standort               | `/company/location`    | 1765 / 1931 / 2575        | axe `color-contrast` hell bei 768                                                   |
| Live-Simulation        | `/crm/live-simulation` | 1261 / 1565 / 2651        | 184 px Überlauf in `<main>` bei 375; axe `color-contrast` hell                      |
| Leads & Kontakte       | `/crm/leads`           | Viewport / 1135 / 1839    | Fehlerzustand (lokal); 14 px Überlauf in `<main>` bei 375; axe hell                 |
| Unternehmen (Accounts) | `/crm/companies`       | Viewport / 1029 / 1786    | Fehlerzustand (lokal); axe hell                                                     |
| Deal Pipeline          | `/crm/deals`           | Viewport / 1029 / 1751    | Fehlerzustand (lokal), F12; axe hell                                                |
| Aktivitäten            | `/crm/activities`      | Viewport / Viewport / 626 | axe hell                                                                            |

„Viewport“ = Inhalt passt in den ersten Bildschirm. axe-Angaben in der Tabelle beziehen sich auf
`<main>`; über die ganze Seite kommt im hellen Modus überall `color-contrast` hinzu (F15). Administration (`/admin/*`) und Internal
Resources (Schutzbereich) sind nicht Teil des Plans und wurden nicht aufgenommen.

## 7. Übergabe

- **Paket A** startet mit Abschnitt 5. Für den Erfolgs- und Leerfall muss die Edge Function lokal
  laufen (`supabase functions serve`); das gehört in den Detailauftrag.
- **F15** ist ein Fehler, keine Gestaltungsfrage: ein fehlendes Token. Empfehlung: eigener kleiner
  Auftrag vor Paket D, damit Musterabnahmen im hellen Modus überhaupt bewertbar sind.
- **Paket B** übernimmt den Zahlenabgleich aller 32 Seiten (Spalte „Zahlenabgleich“).
