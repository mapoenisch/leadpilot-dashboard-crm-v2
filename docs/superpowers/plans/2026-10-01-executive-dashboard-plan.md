# Persönliches Executive Dashboard – Umsetzungsplan

> Für ausführende Agenten: `superpowers:executing-plans` verwenden. Unabhängige Aufgaben dürfen parallel durch Agenten bearbeitet werden; Abhängigkeiten, kollidierende Dateischreibzugriffe und Freigaben werden koordiniert. Claude Code baut diesen Abschnitt, Codex prüft unabhängig. Vor jedem Teilauftrag dessen freigegebene Dateiliste und `CLAUDE.md` lesen. Vor dem eigentlichen Umbau ist Marcs Designfreigabe der Testkachel zwingend.

**Ziel:** Ein geräteübergreifend gespeichertes Executive Dashboard mit frei ausgewählten KPI- und Übersichtskacheln, geeigneten Darstellungen und nachvollziehbaren Details.

**Architektur:** Eigenständiges Dashboard-Modul mit Katalog, Datenleseschicht, Konfiguration, Editor und Darstellung. Die bestehenden Fachquellen liefern die Werte; Supabase speichert ausschließlich persönliche Einstellungen. Quelle, fachliche Eignung und Datenzustand bestimmen Darstellungen, Filter und Kombinationen.

**Technik:** React 18, TypeScript, Vite, bestehendes Recharts, React Query, vorhandene Dialog-Komponenten, Supabase. Keine neue Abhängigkeit als Voraussetzung.

**Produktentwurf:** `docs/superpowers/specs/2026-10-01-executive-dashboard-design.md`.

**Status:** Inhaltlich festgelegt durch Marc am 01.10.2026, einschließlich dieser Revision. Keine Implementierung begonnen, keine Gates ausgeführt, kein Commit oder Deployment. Der Review-Zyklus (Codex-Review, automatische Nacharbeit, Marc-Hinweis) ist eingerichtet (PR #42, PR #44); offen sind nur die Abgleich- und Nachweisschritte in Abschnitt 11. Verbindliches Versionsziel: v2.4.0 (Entscheidung Marc, 01.10.2026). Technische Dateinamen werden vor dem jeweiligen Detailauftrag gegen den aktuellen Repo-Stand abgeglichen.

## 1. Globale Grenzen

- Ein persönliches Dashboard je Benutzer; Speicherschlüssel Organisation + Benutzer.
- Erst historische Daten, CRM und vorhandene Live-KPIs; keine Simulations-KPIs.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` sowie bestehende CRM-Schreibpfade bleiben unverändert. Neue Dashboard-Typen liegen im neuen Feature-Modul.
- Persistenz ist ein eigener ausdrücklich beschriebener Teilauftrag: nur neue Dashboard-Konfiguration, keine Änderung an Simulations-/Run-Persistenz.
- Markenbasis erhalten; bestehende Design-Tokens und Komponenten bevorzugen.
- Kein neues Paket ohne ausdrückliche Freigabe im Auftrag. Drag-and-drop wird zunächst mit vorhandenen Browser-/React-Mitteln und bedienbaren Reihenfolge-Schaltflächen geplant.
- Ein abhängiger Teilauftrag beginnt erst nach Freigabe seiner Voraussetzungen. Unabhängige Aufgaben dürfen parallel laufen, mit getrennten Branches/Worktrees, klarer Dateizuständigkeit und koordiniertem Integrationsschritt. Gemeinsame Modelle werden vor den darauf aufbauenden Aufgaben festgelegt. Freigaben werden im `docs/BUILD_LOG.md` dokumentiert.
- Entscheidung Marc vom 01.10.2026 für diesen Abschnitt: Claude Code baut und schreibt Detailaufträge, Codex prüft unabhängig. Builder-Subagenten unter Claude Code sind zulässig; ein Builder prüft seine Arbeit nicht als unabhängiger Freigeber. Antigravity ist für diesen Abschnitt nicht der Builder.
- Vor dem Umbau: isolierte Testkachel und ausdrückliche Designfreigabe durch Marc. Automatisierte Tests oder Codex-Review ersetzen diese Designentscheidung nicht.
- Lazy Loading ist verbindlicher Bestandteil der neuen Executive-Ansicht, nicht nur Lazy Loading der gesamten Route.
- Die vorhandene unversionierte `.playwright-mcp/`-Ablage wird nicht verändert.

## 2. Abgewogene Ansätze

| Ansatz | Vorteil | Grenze |
|---|---|---|
| Bestehende Cockpit-Blöcke nur umsortieren | Kleiner Umbau | Erfüllt individuelle KPI-Wahl und Kombinationen nicht ausreichend |
| Eigener begrenzter KPI-Katalog mit Kacheleditor | Erweiterbar, nachvollziehbare Datenregeln, vorhandene Technik nutzbar | Benötigt Katalog und persönliche Speicherung |
| Universeller Berichtdesigner | Sehr freie Auswertungen | Zu umfangreich für den ausdrücklich gewünschten Rahmen |

**Empfehlung:** Eigener begrenzter KPI-Katalog mit Kacheleditor. Jede neue Kennzahl wird fachlich geprüft aufgenommen; kein universeller Abfragebaukasten.

## 3. Geplantes Nutzererlebnis

### Normalansicht

- Kopfbereich: Executive Dashboard, zentrale Filter, „Dashboard bearbeiten“.
- Persönliches Raster mit gespeicherter Reihenfolge und Größe.
- Je Kachel: Titel, Inhalt, Einheit, tatsächlicher Zeitraum/Stand, Quelle, Datenzustand und „Details“.
- KPI-Details öffnen eine eigene Seite; darunter führt „Zur Fachübersicht“ zum passenden vorhandenen Bereich.
- Übersichtskacheln wie Roadmap erhalten entsprechende Übersichtdetails statt einer erfundenen Kennzahlendefinition.
- Standardansicht wird benutzt, solange noch keine persönliche Konfiguration existiert.

### Bearbeitungsmodus

- Eine Arbeitskopie schützt die gespeicherte Ansicht vor Zwischenänderungen.
- Aktionen: hinzufügen, konfigurieren, entfernen, Größe wählen, verschieben.
- „Speichern“ schreibt die gesamte Konfiguration atomar. Erst nach Serverbestätigung erscheint „Gespeichert“.
- „Abbrechen“ verwirft alle Layout-/Konfigurationsänderungen. Neue Live-Werte werden dadurch nicht zurückgesetzt.
- „Auf Standard zurücksetzen“ ersetzt die Arbeitskopie und wird erst durch Speichern wirksam.
- Bei Navigation mit Änderungen: Änderungen speichern, verwerfen oder im Editor bleiben.
- Bei Speicherfehler bleibt der Entwurf erhalten. Bei Versionskonflikt kann die aktuelle Serveransicht geladen werden; der lokale Entwurf bleibt für erneute Bearbeitung erhalten. Keine stille Überschreibung.

### Konfigurationsfenster

- Suche und Kategorien: Finanzen, Vertrieb/CRM, Kunden, Marketing, Organisation, Produkt, Markt, Strategie, Unternehmen, Recht, Live.
- Auswahl KPI oder Übersicht, optional zweite KPI und zulässige Berechnung.
- Darstellung und Größe ausschließlich aus erlaubten Optionen.
- Optional verständlicher eigener Titel; Standardtitel bleibt automatisch verfügbar.
- Zentrale Filter übernehmen oder für diese Kachel unterstützte Ausnahmen festlegen.
- Direkte Vorschau aus derselben Daten-/Darstellungslogik wie die spätere Kachel.
- Begründung bei unzulässiger Kombination oder Darstellung, ohne technische Fehlermeldungen.

### Vorgeschlagenes Raster

| Größe | Desktop, 12 Spalten | Tablet, 6 Spalten | Handy |
|---|---:|---:|---:|
| Klein | 3 | 3 | Volle Breite |
| Mittel | 6 | 6 | Volle Breite |
| Groß | 9 | 6 | Volle Breite |
| Volle Breite | 12 | 6 | Volle Breite |

- Reihenfolge wird als Liste gespeichert, keine frei schwebenden Koordinaten.
- Raster nutzt diese Reihenfolge auch visuell; keine automatische Lückenfüllung, die Tastatur- und Lesereihenfolge vertauscht.
- Höhe ergibt sich aus Kachelgröße und Inhaltstyp. Diagramme und Tabellen erhalten festgelegte Mindestgrößen.
- Desktop: Drag-Griff im Editor. Auf allen Geräten: „Nach oben/unten“ mit Tastaturbedienung. Handy: einspaltig, kein Drag erforderlich.
- Mehrere Kacheln derselben KPI sind möglich, etwa Zahl und Zeitverlauf. Jede besitzt eine eigene Kachel-ID.
- Planungsgrenze für den ersten Umfang: maximal 24 Kacheln, um Übersicht und Ladeaufwand zu begrenzen; übernommen mit der inhaltlichen Festlegung des Plans.

## 4. Daten und Eignung

### Katalogeintrag

Jeder Eintrag enthält stabile ID, Name, Kategorie, Definition, Einheit, Datenquelle, Berechnungsart, verfügbare Zeitbasis, zulässige Gruppierungen, Filter, Darstellungen, Mindestgrößen und Fachseitenziel. IDs unterscheiden beispielsweise `baseline.arr` von `live.arr`.

Das Datenlesemodell liefert aktuelle Werte, verfügbare Reihen/Aufteilungen, Herkunft, tatsächliche Zeitbasis und Zustand. Konfiguration speichert nur IDs und Einstellungen, niemals Kopien von Kennzahlenwerten.

| Datenform | Zulässige Darstellung |
|---|---|
| Einzelwert | Zahl, kompakte Tabelle |
| Werte nach Kategorien | Tabelle, Balken, Säulen |
| Teile einer definierten Gesamtheit | Zusätzlich Kreis und Ring |
| Tatsächliche Zeitreihe | Tabelle, Linie, Fläche, passende Säulen |
| Geprüftes Verhältnis | Zahl, Tabelle; Diagramm nur mit geeigneter Reihe/Aufteilung |
| Team, Roadmap, Aktivitätsübersicht | Eigene Übersichtskachel |

- Bestandswerte wie ARR werden nicht über Snapshot-Ereignisse aufsummiert.
- Negative EBITDA-Werte sind keine Kreis-/Ringsegmente; Balken/Säulen müssen negative Werte korrekt unterhalb der Nullachse darstellen.
- Funnel-Stufen sind nicht gegenseitig ausschließende Teile einer Gesamtheit und werden deshalb nicht als Kreisdiagramm angeboten.
- Fehlende Werte ergeben „Keine Daten“, nicht 0. Veraltete Werte bleiben mit Zeitstempel und Hinweis sichtbar.
- Live-Historie bleibt auf tatsächlich verfügbare Historie begrenzt. Speicherhistorie einer Sitzung ist keine vollständige Jahreszeitreihe.

### Filter

- Globale Einstellungen und Kachelausnahmen ergeben einen nachvollziehbaren effektiven Filter.
- Pro Kachel sichtbar: „Dashboard-Filter“, „Eigener Zeitraum“ oder „Fester historischer Stand“.
- Historische Jahreswerte werden weder auf Monate verteilt noch als aktuelle Werte umetikettiert.
- CRM-Datumsfilter werden erst aktiviert, wenn das verwendete Datumsfeld und seine fachliche Bedeutung belegt sind.
- Filter für Pipeline, Mitarbeiter, Paket oder Kanal erscheinen nur bei unterstützender Quelle.
- Normales Filtern ändert die Ansicht der aktuellen Sitzung; dauerhafte Startfilter werden im Bearbeitungsmodus explizit gespeichert. Kachelausnahmen gehören zur gespeicherten Konfiguration.

### Kombinationen

- Fachlich freigegebene Beziehungen werden als Regeln hinterlegt; kein freier Formeleditor.
- Zwei erlaubte Berechnungen im ersten Umfang: Verhältnis `A / B` und Anteil `A / Gesamt × 100`.
- Verhältnis ist etwa für belegte LTV-/CAC-Werte derselben Berechnungsbasis geeignet.
- Anteil setzt eine nachweisbare Teilmenge voraus, etwa ARR Direct / Gesamt-ARR bei konsistentem Stand und Definition.
- Gleiche Einheit allein macht Kennzahlen nicht kombinierbar. Historische und Live-Werte werden im ersten Umfang nicht miteinander verrechnet.
- Live-Funnel-Bestände liefern nicht automatisch eine echte Conversion Rate: hierfür wären gleiche Kohorte und Zeitraum nötig.
- Null im Nenner, fehlende Werte, widersprüchliche Gesamtheit oder nicht kompatible Zeitbasis ergeben einen erklärten Zustand, kein Infinity und keinen künstlichen Prozentwert.
- Live-Werte für Kombinationen benötigen einen gemeinsamen bestätigten Snapshot oder dokumentierte zeitliche Konsistenz. Ist diese nicht belegbar, bleibt die betreffende Kombination gesperrt.
- Details zeigen beide Operanden, Formel, Einheit, Herkunft und Zeitpunkt. Neue Berechnungsregeln können später gezielt ergänzt werden.

## 5. Darstellung gemäß Referenz

- Vorhandener Ausgangspunkt: SVG-Form `renderPseudo3dBar` in `src/components/liveKpi/LiveFunnelBarChart.tsx`.
- Wiederverwendbare Darstellung in einem Dashboard-Chart-Modul aufbauen, zunächst ohne bestehende Live-Komponenten global umzuschreiben.
- Säulen und Balken: kleine feste Ober-/Seitenflächen, zurückhaltender Verlauf, klare Zahlen und gemeinsame Achsen.
- Kreis und Ring: geringe gleichmäßige Tiefe ohne geneigte Perspektive, weiterhin exakte Winkelanteile; Segmente über Legende/Werte verständlich.
- Linie und Fläche: klare Linien, dezente Fläche/Schatten, keine Tiefenverschiebung der Datenpunkte. Zahl und Tabelle erhalten keinen räumlichen Diagrammeffekt.
- Farben unterscheiden Datenreihen konsistent; keine unterschiedliche Tiefe als unbezeichnete Datenvariable.
- SVG-Verläufe und Filter erhalten eindeutige IDs pro Kachel; mehrere gleiche Charts dürfen sich nicht gegenseitig beeinflussen.
- Hover/Fokus: relevante Serie hervorheben und informativen Tooltip anzeigen. Kein Skalieren/Rotieren der Kachel, keine blinkenden Werte oder dauernd pulsierenden Rahmen.
- Tooltip enthält Wert, Einheit, Kategorie und Zeitraum. Anteile/Deltas erscheinen nur mit belastbarer Bezugsgröße.
- Daten sind auch über zugängliche Detailtabellen verfügbar. Touch, Tastatur und reduzierte Bewegung werden berücksichtigt.

### Lazy Loading und Ladeverhalten

- Katalog-Metadaten, persönliche Konfiguration, Filter und Rasterrahmen sind früh verfügbar. Inhalte laden je nach Sichtbarkeit; Reservefläche verhindert Layoutsprünge.
- Charttypen über modulbezogene dynamische Imports/React.lazy laden. Konfigurator erst beim Öffnen und Detailseite erst bei Navigation laden; eine verzögerte Einblendung bei bereits vollständig geladenem Code zählt nicht als Code-Splitting.
- Startkacheln im sichtbaren Bereich sofort aktivieren. IntersectionObserver aktiviert weitere Kacheln mit vorgeschlagenem Vorlauf von 300 px; dieser Wert wird im Performance-Nachweis geprüft.
- Datenabfragen erhalten Aktivierung und vollständigen Quell-/Filterkontext. Nur sichtbare bzw. bevorstehende Kacheln und ausdrücklich geöffnete Vorschauen starten neue schwere Abfragen.
- Einmal aktivierte Kacheln bleiben während des Seitenbesuchs eingebunden. Beim Verlassen der Seite werden Observer und nicht mehr benötigte Abonnements aufgeräumt; Cache und Anzahl aktivierter Kacheln bleiben durch den Katalog-/Kachelumfang begrenzt.
- Änderungen globaler Filter machen voraktivierte Kacheln nicht zu unbemerkten Abfragestürmen: sichtbare Kacheln aktualisieren zuerst, unsichtbare beim erneuten Annähern. Alte Daten werden nicht als neue Filterergebnisse angezeigt.
- Zentralen vorhandenen Live-Stream teilen; keine zusätzlichen Channels durch Kacheln. Für die benötigte Live-Historie darf die zentrale Erfassung unabhängig von der sichtbaren Diagrammkomponente weiterlaufen. Keine neue Hintergrundhistorie erfinden.
- Placeholder ist fokussierbar zugänglich, hält Titel/Details-Kontext bereit und blockiert Tastatur-/Touch-Navigation nicht. Laden fehlgeschlagener Module bietet Wiederholen, ohne Konfiguration zu verlieren.
- Daten- und Renderlogik bleiben identisch in Vorschau, Kachel und Detailseite; Lazy Loading darf Berechnungen oder Aktualität nicht verändern.

## 6. Speicherung und Berechtigungen

Neue Tabelle, vorgeschlagener Name `executive_dashboard_preferences`:

- `organization_id`, `user_id`: gemeinsamer eindeutiger Schlüssel.
- `config`: versionierte JSON-Konfiguration aus Kacheln, Startfiltern und Kachelausnahmen.
- `schema_version`: Formatversion; `revision`: monotoner Zähler für konkurrierende Änderungen.
- `created_at`, `updated_at`: Serverzeitpunkte.
- RLS, also serverseitige Zugriffsregeln: nur der aktuelle Benutzer in seiner aktiven Organisation darf seine Konfiguration lesen und speichern.
- Auch Viewer dürfen ihr persönliches Layout speichern, ohne CRM-Daten oder Organisationseinstellungen zu ändern. Dieser eng begrenzte Schreibzugriff erhält eigene Regeln statt einer allgemeinen Schreibberechtigung.
- Speichern erfolgt über eine atomare Serveroperation mit erwarteter Revision. Zwei gleichzeitige Erstanlagen und zwei gleichzeitige Änderungen werden als Konflikt behandelt.
- Servervalidierung prüft Konfigurationsform, Grenzen und Eigentümerschaft; UI prüft zusätzlich KPI-/Darstellungs-/Filtereignung. Keine SQL-Fragmente oder ausführbaren Formeln im JSON.
- Beim Logout oder Benutzerwechsel werden Cache, geladene Konfiguration und Arbeitskopie entfernt. Query-Schlüssel enthalten Organisation und Benutzer.
- Unbekannte zukünftige Formatversion: nicht überschreiben; erklärter Hinweis und sichere bisherige Ansicht. Bekannte ältere Versionen erhalten explizite Migration.
- Keine Cloud-Erfolgsmeldung bei nur lokalem Zustand. Kein Hintergrund-Autosave der Editoränderungen.
- Aktuelle Live-Datenpfade werden vor ihrer Übernahme auf vorhandene Mandanten-/Freigaberegeln geprüft. Persönliche Layoutspeicherung beweist noch keine Isolation der Datenquelle.

## 7. Geplante Dateien und Zuständigkeiten

Alle neuen Pfade sind Vorschläge für noch zu erstellende Dateien.

| Pfad | Verantwortung |
|---|---|
| `src/features/dashboard/model/dashboardConfig.ts` | Versionierte Kachel- und Filterkonfiguration |
| `src/features/dashboard/model/dashboardCatalog.ts` | Metadaten, Quellen-IDs und Fähigkeiten |
| `src/features/dashboard/model/dashboardValidation.ts` | Konfiguration und Eignung prüfen |
| `src/features/dashboard/model/dashboardFilters.ts` | Effektive Filter auflösen |
| `src/features/dashboard/model/dashboardCombinations.ts` | Erlaubte Beziehungen und Berechnungen |
| `src/features/dashboard/model/defaultDashboard.ts` | Standardansicht und Formatmigration |
| `src/features/dashboard/data/dashboardData.ts` | Einheitliches Lesemodell aus vorhandenen Quellen |
| `src/features/dashboard/data/dashboardPreferencesRepository.ts` | Persönliche Supabase-Persistenz |
| `src/features/dashboard/hooks/useDashboardData.ts` | Abfragen bündeln und Zustände bereitstellen |
| `src/features/dashboard/hooks/useDashboardPreferences.ts` | Konfiguration und Speicherkonflikte |
| `src/features/dashboard/hooks/useDashboardEditor.ts` | Arbeitskopie, Speichern, Abbrechen |
| `src/features/dashboard/hooks/useTileActivation.ts` | Sichtbarkeit, Vorladen und Aufräumen |
| `src/features/dashboard/components/LazyDashboardTile.tsx` | Platzhalter und bedarfsgerechtes Einbinden |
| `src/features/dashboard/components/charts/chartLoaders.ts` | Dynamische Imports je Diagrammart |
| `src/features/dashboard/components/DashboardGrid.tsx` | Raster und Reihenfolge |
| `src/features/dashboard/components/DashboardTile.tsx` | Einheitlicher Kachelrahmen und Details |
| `src/features/dashboard/components/TileConfigurator.tsx` | Auswahl und Vorschau |
| `src/features/dashboard/components/DashboardFilters.tsx` | Globale Filter |
| `src/features/dashboard/components/DashboardChart.tsx` | Auswahl des passenden Diagramms |
| `src/features/dashboard/components/charts/Pseudo3dBar.tsx` | Horizontale/vertikale SVG-Facetten |
| `src/features/dashboard/components/charts/DepthPieChart.tsx` | Kreis/Ring mit geringer Tiefe |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx` | Zusammenführung der neuen Ansicht |
| `src/features/dashboard/pages/DashboardTileDetailPage.tsx` | KPI-/Übersichtdetails und Fachseitenlink |
| `src/features/dashboard/preview/DashboardDesignPreview.tsx` | Vorgelagerte isolierte Testkachel |
| `src/features/dashboard/__tests__/` | Modell- und UI-Prüfungen |
| `supabase/migrations/<naechste_migrationskennung>_executive_dashboard_preferences.sql` | Tabelle, Policies, atomare Speicherung |
| `e2e/personal-dashboard.spec.ts` | Nutzungsabläufe und Isolation |

Bestehende Integrationsstellen: `src/features/overview/pages/ExecutiveDashboardPage.tsx`, `src/app/routes.tsx`, `src/app/routePages.tsx`, gegebenenfalls `src/app/App.tsx` für die dynamische Detailroute. Bestehende Quellmodule und Auth-Hooks werden gelesen und benutzt. Featureeigene Styles verwenden vorhandene Tokens; globale Effekte anderer Seiten werden nicht verändert.

Die Migrationskennung wird nach aktueller Repository-Reihenfolge vergeben: bereits vorhandene Migrationen reichen bis `20261003_tenant_schema_convergence.sql`. Deshalb keine neue Migration mit dem heutigen Datum davor einordnen.

## 8. Teilaufträge und Abhängigkeiten

Für jeden Teilauftrag vor Beginn eine eindeutige `ANTIGRAVITY_AUFTRAG_XXX_*.md` mit exakten Ziel-Dateien, Baseline und Gates schreiben. Die nächste freie Auftragsnummer wird anhand des dann aktuellen Repos vergeben, nicht in diesem Plan erfunden.

### Teilauftrag 0 – Testkachel und Designfreigabe

**Builder:** Claude Code. **Technischer Prüfer:** Codex. **Designentscheidung:** Marc.

**Dateien:** isoliertes Preview-Modul `src/features/dashboard/preview/DashboardDesignPreview.tsx`, minimal benötigte Vorschau-Charts/-Styles und explizit benannte Vorschauintegration. Keine Änderungen am produktiven Executive-Inhalt oder dessen Datenquellen.

- [ ] **Voraussetzung:** Marc stellt das Referenzbild für Cloud-Builder bereit (z. B. als PR-/Issue-Anhang oder freigegebener Ablageort; Bilddateien werden nicht ins Repo committet, siehe `CLAUDE.md` §7). Ohne erreichbare Referenz beginnt die Testkachel nicht; keine Gestaltung aus der Textbeschreibung raten.
- [ ] Claude Code schreibt einen eng begrenzten Designprobe-Auftrag mit Referenzbild, Ziel-Dateien und Vorschauzugang.
- [ ] Eine Testkachel mit umschaltbarer Zahl, Tabelle und allen geplanten Diagrammdarstellungen bauen; Größen und Fokus-/Hover-/Touchzustände demonstrieren.
- [ ] Feste Design-Beispieldaten deutlich kennzeichnen, ohne Cloud-Speicherung, vollständigen Katalog oder produktive Kombinationslogik.
- [ ] Kachel auf 1440/768/375 px zeigen, Überlauf und technische Pflichtgates prüfen; die Vorschau bleibt getrennt von Produktivdaten.
- [ ] Codex prüft Auftragstreue und technische Grenzen; Claude Code arbeitet technische Befunde nach.
- [ ] Marc erhält die bedienbare Vorschau und bewertet Tiefe, Farben, Beschriftung, Kachelruhe und Informationswert der Interaktion.
- [ ] Bei Designänderungen dieselbe Testkachel überarbeiten. Ausdrückliche Designfreigabe mit zugehörigem Commit und Referenznachweis protokollieren.

**Abnahme:** Marc ist mit dem Design zufrieden. Vor dieser Freigabe beginnen Teilaufträge 1–8 nicht. Die Probe allein erhält kein produktives Release und ist kein vollständiges Dashboard. Freigegebene Teile dürfen in Teilauftrag 4 wiederverwendet werden.

### Teilauftrag 1 – KPI-Inventar und Datenvertrag

**Dateien:** neues `docs/dashboard/KPI_CATALOG.md`; Katalog-/Konfigurations-/Validierungsmodelle; zugehörige Tests. Quellmodule ausschließlich lesen.

- [ ] Alle Kandidaten aus `execData`, `finanzenData`, `vertriebData`, `kundenData`, `organisationData`, `produktData`, `marktData` (u. a. `CHART_WETTBEWERB`), `strategieData` (u. a. `CHART_OKR`, `CHART_TREIBER`), `unternehmenData` (u. a. `HISTORIE.events` als Meilensteinübersicht), `rechtData` (u. a. `GESELLSCHAFTER.rows` als Aufteilung, summiert auf 100 %) und Live-Katalog inventarisieren (Quellen unter `src/domain/`). Ungeeignete Einträge mit konkretem Grund dokumentieren.
- [ ] Für jeden Kandidaten tatsächliche Rohwerte, Zeitbasis, Einheit, Definition, Fachseitenziel und Berechtigungen nachweisen.
- [ ] Katalogstatus setzen: aktiv, aufbereiten oder nicht geeignet. Text-/Bildseiten sind keine neue Datenquelle; Werte werden nicht aus Screenshots geschätzt.
- [ ] Erste aktive Auswahl: bisherige Executive-Zahlen, ARR-Verlauf, MRR-Paketmix, belegte CRM-Pipelinewerte, 12 vorhandene Live-IDs und bisherige Übersichtskacheln. Geeignete Produktkandidaten (z. B. `CHART_PRODUKT`, `CHART_CHURN` aus `src/domain/produktData.ts`) werden im Inventar bewertet und, soweit belegt, in Teilauftrag 8 aufgenommen.
- [ ] Katalogtests zuerst formulieren: eindeutige IDs, Quelle, erlaubte Formen, keine Simulationseinträge, keine Kreisfreigabe für Funnel-Stufen.
- [ ] Modell und Prüfung implementieren; Tests und Pflichtgates ausführen.

**Abnahme:** Jeder aktive Eintrag ist auf eine lesbare vorhandene Quelle zurückführbar. ARR als Einzelwert bietet keine erfundene Zeitreihe an. Größen-/Darstellungsregeln sind maschinenprüfbar.

### Teilauftrag 2 – Datenauflösung und Filter

**Dateien:** `data/dashboardData.ts`, `hooks/useDashboardData.ts`, `model/dashboardFilters.ts`, zugehörige Tests. **Voraussetzung:** Teilauftrag 1.

- [ ] Schnittstelle für Wert, Reihe/Aufteilung, Herkunft, Zeitbasis und Zustand implementieren.
- [ ] Historische Ableitungen, CRM-Abfragen und vorhandenen Live-Stream einbinden; gleiche Quelle/Abfrage zwischen mehreren Kacheln teilen.
- [ ] Effektive Filter aus zentralen Einstellungen und Kachelausnahmen auflösen.
- [ ] Unterstützte Datumsfelder und Bestands-/Flusswertsemantik explizit hinterlegen.
- [ ] Nullwert, fehlende Daten, Fehler, offline und veraltete Daten getrennt testen.
- [ ] Mehrere Live-Kacheln verwenden denselben vorhandenen Stream; Subscription-Anzahl und Aufräumen prüfen.
- [ ] Abfragen über Aktivierung steuerbar machen; Sichtbarkeitswechsel und Filterwechsel ohne unkontrollierte neue Abfragen testen.

**Abnahme:** Vorschau, Kachel und Details können denselben effektiven Kontext lesen. Eine historisch gebundene KPI verändert sich nicht durch einen ungeeigneten aktuellen Monatsfilter.

### Teilauftrag 3 – Persönliche Speicherung

**Dateien:** neue Dashboard-Migration und Persistenzrepository, `useDashboardPreferences.ts`, `defaultDashboard.ts`; neue Persistenz-/RLS-Tests und Erweiterung des vorhandenen Migrationsnachweises nur im ausdrücklich benannten Testpfad. **Voraussetzung:** Teilauftrag 1; kann unabhängig von Teilauftrag 2 bearbeitet werden.

- [ ] Tests für Erstanlage, Reload, zwei Benutzer, zwei Organisationen, abgelaufene Sitzung und zwei konkurrierende Saves aufsetzen.
- [ ] Tabelle und atomare Save-Operation mit Revision erstellen; Eigentümer-/Mitgliedschaftsprüfung serverseitig erzwingen.
- [ ] Konfiguration auf dem Server begrenzen und validieren; Dashboard-Viewer-Schreibrecht separat absichern.
- [ ] Laden/Speichern/Cachebereinigung implementieren; Fehler und Konflikt strukturiert zurückgeben.
- [ ] Standard laden, falls keine persönliche Konfiguration existiert; keine unnötige Erstanlage beim bloßen Öffnen.
- [ ] Upgrade aus bestehendem Schema und Sicherung/Wiederherstellung der neuen Konfiguration nachweisen.
- [ ] Load-/Migrationsvertrag: Eine gespeicherte Kachel mit unbekannter oder entfernter KPI-ID (Katalogänderung, Umbenennung) bleibt beim Laden und Migrieren unverändert erhalten und wird nicht verworfen; kein stiller Rückfall auf die Standardansicht. Test mit gespeicherter unbekannter ID.

**Abnahme:** Benutzer A kann Konfiguration von Benutzer B weder lesen noch schreiben. Nach erneutem Login ist das gespeicherte Layout verfügbar. Veraltete Revisionen überschreiben nichts.

### Teilauftrag 4 – Kachelrahmen und Diagramme

**Dateien:** `DashboardTile.tsx`, `DashboardChart.tsx`, neue Chartmodule einschließlich `chartLoaders.ts`, featureeigene Styles und zugehörige UI-Tests. **Voraussetzung:** Designfreigabe und Datenverträge aus Teilauftrag 1; anhand definierter Testdaten unabhängig von Teilaufträgen 2/3 baubar.

- [ ] Zahl und Tabelle mit einheitlicher Formatierung und Datenstatus umsetzen.
- [ ] Säulen und horizontale Balken aus dem SVG-Vorbild ableiten; Null-/Negativwerte und kleine Werte korrekt darstellen.
- [ ] Kreis/Ring mit begrenzter Tiefe sowie Linie/Fläche aus vorhandener Recharts-Technik erstellen.
- [ ] Werte, Einheiten, Achsen und Legenden auf jeder unterstützten Größe prüfen.
- [ ] Tooltip, Fokus, Touch und reduzierte Bewegung umsetzen; mehrfach identische Charts auf einer Seite prüfen.
- [ ] Referenzvergleich und Screenshots für alle Darstellungsarten, Warn-/Leerzustände und Größen erzeugen.
- [ ] Diagrammarten dynamisch importieren; Build-Ausgabe und Browsernetzwerk belegen das getrennte Laden tatsächlich benötigter Module.

**Abnahme:** Screenshot-Stil erkennbar, Werte unverzerrt, keine abgeschnittenen Beschriftungen, keine großflächigen Hover-Effekte. Jede Kachel besitzt eine bedienbare Details-Schaltfläche.

### Teilauftrag 5 – Raster, Editor und Konfigurationsfenster

**Dateien:** `DashboardGrid.tsx`, `TileConfigurator.tsx`, `DashboardFilters.tsx`, `useDashboardEditor.ts`, `useTileActivation.ts`, `LazyDashboardTile.tsx`, zugehörige Tests. **Voraussetzung:** integrierte Freigaben aus Teilaufträgen 2–4.

- [ ] Standardansicht im Raster darstellen und Arbeitskopie für Bearbeitung einführen.
- [ ] KPI-Suche, Kategorien, Vorschau, Darstellungswahl, Größe und Filterausnahmen implementieren.
- [ ] Hinzufügen, Bearbeiten und Entfernen mit stabiler Kachel-ID implementieren.
- [ ] Reihenfolge per Drag-Griff und per Schaltflächen ändern; mobile Reihenfolge entspricht gespeicherter Reihenfolge.
- [ ] Speichern, Abbrechen, Standard zurücksetzen und Navigationsschutz implementieren.
- [ ] Speicherfehler und Konflikt anzeigen, ohne den Entwurf zu verlieren; während laufendem Save widersprüchliche Aktionen verhindern.
- [ ] Nutzungsablauf testen: Zahl hinzufügen, Größe wechseln, umsortieren, speichern, neu laden; anschließend Änderungen vornehmen und abbrechen.
- [ ] Sichtbarkeitsgesteuertes Laden mit Platzhaltern umsetzen; rasches Scrollen, Vorladen, Tastaturbedienung, Filterwechsel und Aufräumen prüfen.
- [ ] Konfigurator erst beim Öffnen laden; initial werden die Komponenten und Daten außerhalb des Sichtbereichs nicht pauschal aktiviert.
- [ ] Unbekannte oder nicht verfügbare Kachel als erklärbaren Platzhalter im Raster anzeigen (Grund, Entfernen möglich); UI-Test mit gespeicherter unbekannter ID, Konfiguration geht nicht verloren.

**Abnahme:** Bearbeiten funktioniert auf 1440/768/375 px und mit Tastatur. Abbrechen erhält die letzte gespeicherte Konfiguration; keine Änderung wird vor Speichern serverseitig übernommen.

### Teilauftrag 6 – Geführte KPI-Kombinationen

**Dateien:** `dashboardCombinations.ts`, Katalog-Erweiterungen, Konfigurator-Erweiterung und konkrete fachliche Tests. **Voraussetzung:** Teilaufträge 2/5; unabhängige Modellarbeit bereits nach den Datenverträgen möglich.

- [ ] Inventar in eine freigegebene Beziehungsmatrix überführen, einschließlich kompatibler Quelle, Zeitbasis und Bezugsmenge.
- [ ] Nur zulässige zweite KPIs nach Wahl der ersten anbieten; Berechnung und Ergebnis direkt erklären.
- [ ] Verhältnis und Anteil implementieren, getrennt von bloßen nebeneinander dargestellten Werten.
- [ ] Testbeispiel Anteil: 25 von 100 ergibt 25 %. Nenner 0 oder fehlend ergibt nicht berechenbar.
- [ ] Quelle/Jahr unterschiedlich, nicht belegte Teilmenge, unstimmige Live-Zeitpunkte und Funnel-Bestände als angebliche Conversion ablehnen.
- [ ] Ringanzeige nur für belegten Teil/Gesamt-Zusammenhang, Verhältnis sonst als Zahl/Tabelle oder tatsächliche Reihe anbieten.

**Abnahme:** Kombinationen sind frei innerhalb der geprüften fachlichen Beziehungen wählbar; bloße Zahlentypgleichheit reicht nicht. Ergebnis und Formel sind reproduzierbar.

### Teilauftrag 7 – Details und Integration unter `/dashboard`

**Dateien:** neue Dashboard-Seiten; ausdrücklich benannte Änderungen an Executive-Einstieg und Router; zugehörige Seiten-/Routingtests. **Voraussetzung:** integrierte Teilaufträge 5/6. Detailmodell kann vorher unabhängig gebaut werden, sofern gemeinsame Dateien nicht kollidieren.

- [ ] Vorgeschlagene Detailroute `/dashboard/tiles/:tileId` in den bestehenden Router integrieren; dynamische Pfade nicht als 404-Metadaten behandeln.
- [ ] Titel, Definition, Wert, tatsächlichen Zeitraum, Quelle, Aktualität, Aufteilung/Verlauf und verfügbare Detailtabelle darstellen.
- [ ] Kombinationen mit beiden Operanden und Formel erklären; Übersichtskacheln mit passenden Übersichtdetails versehen.
- [ ] Fachseitenlink aus dem Katalog verwenden. Fehlende fachliche Unterseite wird durch eine aussagekräftige Detailseite abgedeckt, nicht durch einen toten Link.
- [ ] Sitzungsfilter bei Navigation übernehmen; nach Browser-Reload auf gespeicherten Kontext zurückfallen. Gelöschte/unbekannte Kachel erhält eine verständliche Rückkehr zur Übersicht.
- [ ] Rückkehr stellt Filterkontext und Fokus wieder her. Unsaved Editor-Vorschau navigiert nicht versehentlich aus dem Editor.
- [ ] Neue Ansicht hinter einem ausdrücklich definierten Rollout-Schalter anbinden; alte Ansicht bis zur Gesamtabnahme behalten.
- [ ] Detailseite als separate Lazy-Route laden; Chunkfehler und direkte Navigation nach Reload testen.

**Abnahme:** Jede KPI- und Übersichtskachel führt zu richtigen Details; Fachseitenziele bestehen. Bei Kombinationen stimmen Kachel und Details bei gleichem Datenstand überein.

### Teilauftrag 8 – Katalogausbau und Gesamtabnahme

**Dateien:** geprüfte weitere Katalogeinträge und Datenadapter; E2E-Suite; Screenshot-Harness; ausschließlich textuelle Screenshot-Matrix; `docs/BUILD_LOG.md`.

- [ ] Weitere belegte KPIs aus Produkt (u. a. `CHART_PRODUKT`, `CHART_CHURN`), Finanzen, Vertrieb/Marketing, Kunden, Organisation, Markt, Strategie, Unternehmen (Meilensteine) und Recht (Gesellschafteranteile) aufnehmen, soweit geeignet; jede Auslassung mit Grund im Inventar; Annahmen/Planwerte klar kennzeichnen und nicht als Istwerte anbieten.
- [ ] Kennzahlen ohne brauchbare Datenquelle nicht freischalten; Inventar dokumentiert den konkreten Grund und die nötige spätere Datenaufbereitung.
- [ ] Zwei Browser-/Gerätesitzungen und Benutzerwechsel testen; Speicherung, Revisionen und Filterkontext nachweisen.
- [ ] Alle acht Darstellungen, Übersichtskacheln, Kombinationen und alle Kachelgrößen prüfen.
- [ ] Realtime-Updates während Ansicht/Bearbeitung testen; keine zusätzlichen Channels, keine Neuordnung durch Datenupdates.
- [ ] Lazy Loading durch Request-/Chunk-/Rendernachweise prüfen: Startbereich sofort, weitere Kacheln erst nahe Sichtbereich, Platzhalter ohne sichtbare Layoutsprünge, keine doppelte Abfrage für gleiche Quelle/Filter, gleiche Werte nach Scrollen/Filterwechsel.
- [ ] Keyboard, Touch, Screenreader, Kontrast und reduzierte Bewegung prüfen; zugängliche Datentabelle anbieten.
- [ ] Vorher/Nachher bei 1440/768/375 px, 0 px horizontaler Überlauf, Hash-/Diff-Nachweise sowie unabhängige Sichtprüfung durch Marc.
- [ ] Pflichtgates und relevante CI-Prüfungen ausführen; unabhängigen Befund ins Ledger aufnehmen.
- [ ] Erst nach Abnahme Rollout-Schalter aktivieren. Bei Rückschaltung bleiben persönliche Konfigurationen gespeichert und alte Ansicht verfügbar.

**Abnahme:** Alle bestätigten Anforderungen sind nachgewiesen. Katalog wächst ohne Änderung an der Simulation. Kein Release ohne separate Freigabe und grüne Pflichtprüfungen.

## 9. Pflichtprüfungen je Teilauftrag

```sh
npx tsc --noEmit
npm run verify
npm run build
npm test
npm run lint
npm run format:check
```

Zusätzlich spezifische Tests des Teilauftrags. Bei Datenbankänderungen Migrationsupgrade, RLS-Isolation und Backup/Restore; bei UI-Änderungen Screenshot-/Overflow-/Accessibility-Nachweise. Screenshot-Harness startet mit festem Datenstand; Live-Zeitstempel nicht als zufällige Bilddifferenz werten. PNG-Dateien bleiben lokal, nur die README-Ergebnismatrix wird versioniert.

```sh
git diff <baseline-commit> -- src/simulation src/types src/context src/services/data src/features/resources
```

Erwartung: leer. Abweichung nur zulässig, wenn ein gesonderter expliziter Auftrag den betroffenen Schutzbereich nennt. Neues Dashboard-Speichern erhält einen eigenen Persistenzauftrag und darf bestehende CRM-/Run-Schreibpfade nicht verändern.

Ledger enthält Kontext, Ziel-Dateien, funktionale Befunde, Pflichtprüfungen, Schutzbereichs-Diff, Screenshot-Matrix und Freigabestatus. Bereits bestandene Prüfungen werden nur bei neuen Änderungen oder offenen Befunden wiederholt.

## 10. Ausbau und Freischaltung

1. **Designprobe:** Teilauftrag 0, danach ausdrückliche Designfreigabe durch Marc.
2. **Fundament:** Teilauftrag 1, anschließend Datenauflösung, Speicherung und Diagramme bei klarer Trennung parallel möglich.
3. **Bedienbare Ansicht:** Integration und Teilauftrag 5, einschließlich Lazy Loading.
4. **Nachvollziehbare Auswertung:** Teilaufträge 6–7, Kombinationen und Details.
5. **Erster vollständiger Umfang:** Teilauftrag 8, zusätzliche Bereiche und Abnahme.
6. **Spätere eigenständige Erweiterung:** Simulations-KPIs mit eigener Lauf-/Zeitbasisentscheidung und ausdrücklich freigegebenem Auftrag.

Teilaufträge sind unabhängig prüfbar; freigeschaltet wird erst nach gemeinsamer Abnahme. Kein verbindlicher Kalendertermin wird abgeleitet. Verbindliches Versionsziel ist v2.4.0.

## 11. Automatisierter Builder-/Review-Ablauf

### Vorhanden und noch einzurichten

Die geprüfte `.github/workflows/ci.yml` läuft bereits bei Pull Requests, Push auf `main` und manueller Auslösung. Sie enthält Typecheck, Tests, Build, Integritäts-, Datenbank-, Accessibility- und weitere Prüfungen. Zusätzlich bestehen ein Workflow für visuelle Baselines und der mit PR #42 eingerichtete Claude-/Codex-Zyklus (`codex-rework.yml`, `codex-review-request.yml`, siehe „Review-Auslösung“). Der automatische Hinweis an Marc nach einem erfolgreichen Nacharbeits-Push ist mit PR #44 umgesetzt (`codex-rework.yml`); ein zweiter Zyklus-Workflow ist nicht einzurichten. Ein Deployment-Workflow ist nicht belegt.

**Empfehlung: Kombination aus a und b.** CI prüft objektive Gates; eine Vorschau erlaubt die Designbewertung. Codex reviewt den konkreten PR-Commit, Claude Code verarbeitet Befunde und liefert Nacharbeit. Produktivdeployment steht am Ende hinter den Freigaben, nicht am Anfang des Reviews.

### Ablauf je Auftrag

1. Claude Code schreibt den Detailauftrag und implementiert auf einem Arbeitsbranch; Pull Request enthält Auftrag, Baseline, Ziel-Dateien und Nachweise.
2. Neue PR-Commits lösen CI und Codex-Review aus. Nach einer automatischen Nacharbeit stößt Marc beides an (siehe „Review-Auslösung“). Status und Review nennen den geprüften Head-SHA.
3. Codex kommentiert Befunde mit Datei/Zeile und Priorität bzw. gibt den geprüften Stand frei. Gate-Ausführung bleibt getrennt von einem bloßen Textreview.
4. Ein neuer Befund löst Claude-Nacharbeit aus; Claude liest nur noch nicht bearbeitete relevante Befunde, prüft sie gegen Auftrag und Code und dokumentiert die Behebung oder einen begründeten Widerspruch.
5. Nacharbeit erzeugt neue Commits. Alte Freigaben gelten nicht für den neuen Head-SHA; CI und Codex prüfen den veränderten Stand erneut.
6. Erst aktueller CI-Erfolg, Codex-Freigabe desselben Stands und erforderliche Marc-Freigaben ergeben Freigabebereitschaft. Noch offene Kommentare werden nicht durch Schweigen als erledigt gewertet.
7. Ein Integrationscommit aus parallel bearbeiteten Branches wird erneut geprüft, auch wenn Einzelbranches zuvor grün waren.

### Review-Auslösung (Stand 01.10.2026, nach Ende-zu-Ende-Test)

Eingerichtet mit PR #42 (`.github/workflows/codex-rework.yml`, `codex-review-request.yml`), Ablauf in `docs/dashboard/REVIEW_WORKFLOW.md`. Ergebnis des Ende-zu-Ende-Tests auf PR #43 (Zeitleiste in `docs/BUILD_LOG.md`):

- **Automatisch:** Codex prüft einen neu geöffneten PR von selbst (Einstellung „Team-PRs“ und „Bei jedem Push“). Ein Codex-Ergebnis mit Befunden startet die gesammelte Nacharbeit durch Claude. Claude arbeitet ohne Schreibrechte, ein getrennter Job prüft und pusht. Höchstens drei Runden, je Head-SHA höchstens eine.
- **Nicht automatisch:** Codex prüft Pushes des Workflow-Tokens nicht von selbst und reagiert nicht auf `@codex review` von `github-actions[bot]`. GitHub hält die PR-CI dieses Pushes als „action_required“ zurück.
- **Daher, Entscheidung Marc (Variante A):** Nach jedem Nacharbeits-Push pingt der Workflow Marc im PR an (umgesetzt mit PR #44, Auftrag `ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT_HINWEIS.md`). Marc gibt die CI mit „Approve and run workflows“ frei und kommentiert `@codex review`. Danach läuft die nächste Runde wieder automatisch.
- Ein Review ohne Bezug zum aktuellen Head-SHA zählt nicht als Freigabe.

### Technischer Automatisierungsauftrag

- [ ] Vor dem produktiven Umbau vorhandene GitHub-Apps/Agentenrunner, authentifizierte Claude-/Codex-Zugänge, PR-Kommentar-/Reviewrechte, CI-Konfiguration und Vorschauhosting feststellen. Keine Integration als vorhanden voraussetzen.
- [ ] PR-Ereignisse für neue Commits sowie Review-/Kommentarrückmeldungen verwenden. Für lokal laufende Agenten ist ein expliziter Runner nötig; GitHub-Kommentare starten keine Desktop-Sitzung von selbst.
- [ ] Ereignisbasierte Auslösung bevorzugen. Regelmäßiger Abgleich offener Dashboard-PRs als Wiederaufnahme bei verpassten Ereignissen vorsehen, vorgeschlagen alle 15 Minuten; er ersetzt keine Freigabe und garantiert keine sekundengenaue Ausführung.
- [ ] Eigenständige, serverseitig überprüfbare Statusmeldungen für CI und Codex-Review einrichten. Review-Identität muss von Builder-Identität getrennt sein; fehlende formale Approve-Berechtigung nicht durch einen scheinbaren Review-Erfolg ersetzen.
- [ ] Auftrags-ID + PR + Head-SHA + Befund-ID als Verarbeitungskennung verwenden; eigene Bot-Kommentare, wiederholte Ereignisse und bereits erledigte Befunde lösen keine endlose Nacharbeit aus.
- [ ] Pro Branch nur einen schreibenden Builder gleichzeitig zulassen; unabhängige Branches/Agenten dürfen parallel arbeiten. Gemeinsame Integrationsbranch-Schreibzugriffe koordinieren.
- [ ] Nach drei gestarteten automatischen Nacharbeitsrunden (`decideRework` zählt jeden Rundenmarker, unabhängig vom Erfolg) oder bei widersprüchlichen Anforderungen an Marc eskalieren; weitere Befunde danach bearbeitet Claude Code manuell; vorübergehende API-/Runnerausfälle als ausstehend markieren, nicht als Freigabe.
- [ ] Geschützte Zugänge nur aus passender Runner-/Secret-Konfiguration verwenden. Ungeprüfter PR-Code erhält keine privilegierten Produktionszugänge; Vorschau nutzt isolierte Testdaten.
- [ ] Den Ablauf an der Testkachel nachweisen: Commit → CI/Review → Befund → Nacharbeit → erneutes Review des aktuellen Commits. Designfreigabe durch Marc bleibt ein eigener Schritt.
- [ ] Neue E2E-Suite ausdrücklich in die bestehende CI-Testliste aufnehmen: `ci.yml` führt eine feste Dateiliste aus und würde `e2e/personal-dashboard.spec.ts` sonst nicht automatisch prüfen.
- [ ] Offen ist nur der Abgleich der vorhandenen Workflows (`codex-rework.yml`, `codex-review-request.yml`) mit `docs/dashboard/REVIEW_WORKFLOW.md`; der Marc-Ping nach jedem Nacharbeits-Push ist erledigt (PR #44). Kein zweiter Review-Workflow und kein weiterer Runner-Adapter. CI-Erweiterung und optionaler Vorschauworkflow erhalten explizite Ziel-Dateien.

Die Dokumentänderung richtet keine periodische Codex-App-Automation ein und startet keinen Agenten. Falls ein benötigter Agentenrunner fehlt, wird er vor Aktivierung eingerichtet; bis dahin kann derselbe definierte Review-Zyklus manuell durch Claude Code und Codex durchgeführt werden. Kein automatisches Merge, Tag oder Produktionsdeployment allein aufgrund dieser Planfestlegung.

## 12. Versionierung

**Festgelegt: v2.4.0** (Entscheidung Marc, 01.10.2026), ausgehend von v2.3.2. Personalisierung, Katalog, Editor, Kombinationen und Details sind neue Funktionen. Bestehende CRM-/Simulationsschnittstellen bleiben erhalten; daher ist eine Minor-Erhöhung angemessen. Reiner Bugfix wäre v2.3.3; inkompatible öffentliche Schnittstellenänderungen wären Anlass für v3.0.0.

- Testkachel: isolierte Vorschau, keine Änderung des veröffentlichten v2.3.2-Tags.
- Falls Vorabversionen veröffentlicht werden: `v2.4.0-alpha.1` während Aufbau, `v2.4.0-beta.1` für Funktionsprüfung und `v2.4.0-rc.1` zur abschließenden Abnahme.
- Finale Veröffentlichung: `v2.4.0` erst nach vollständig grünen Gates und Release-Freigabe.
- Spätere kompatible Fehlerkorrekturen: `v2.4.1`, `v2.4.2`.
- `package.json`, Lockfile, Release-Dokument und Tag werden erst im ausdrücklich benannten Release-Auftrag konsistent aktualisiert; in dieser Planrevision bleibt die App-Version unverändert.

Quellen: [SemVer](https://semver.org/lang/de/), [GitHub-Workflow-Ereignisse](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [React.lazy](https://react.dev/reference/react/lazy), [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API). Repo-Befunde beruhen auf dem lokal gelesenen Code, nicht auf einer Prüfung aktueller GitHub-App-Einstellungen.
