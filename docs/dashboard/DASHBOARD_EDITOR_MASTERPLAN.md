# Gesamtplan: LeadPilot Dashboard-Editor

Stand: 10.11.2026, Revision 2 nach Gegenprüfung durch Claude Opus 5.5 mit Effort „medium“. Geprüfte lokale Codebasis: `main`, Commit `b9e04f5c5d49fabad5b5484ec44216536f61827c`.

Status: Plan zur Abstimmung; keine Implementierungs- oder Release-Freigabe. Die Paketnummern P01–P18 sind Planungsnummern, keine bereits vergebenen Auftragsnummern. Vor Umsetzung entstehen einzelne Detailaufträge unter `docs/auftraege/`.

## 1. Ziel und bestätigter Umfang

LeadPilot erhält einen visuellen Dashboard-Editor, mit dem Nutzer ihre CRM-Kennzahlen auswählen, räumlich anordnen, konfigurieren, filtern und während der Bearbeitung mit aktuellen Daten prüfen können. Persönliche Dashboards und gemeinsam genutzte Team-Dashboards gehören zum Zielumfang. In-App-Alarme folgen im Hauptausbau; KI und externe Benachrichtigungen sind spätere Erweiterungen.

Marc hat für diesen Plan bestätigt:

- Ausschließlich Kennzahlen und Daten aus LeadPilot/CRM. Kafka, MQTT, Kinesis und beliebige fremde SQL-Datenquellen gehören nicht zum Auftrag.
- Persönliche und gemeinsame Team-Dashboards.
- Zunächst In-App-Alarme; KI und externe Alarmkanäle später planen.

Mit Marcs Auftrag zur Übernahme sämtlicher Opus-Empfehlungen gelten zusätzlich: Teams beschreiben Freigabe- und Empfängerkreise innerhalb einer Organisation, keine eigenen CRM-Datenbereiche. Das endgültige Speichermodell entsteht vor der ersten Bestandsmigration einschließlich dauerhafter Revisionen. Der alte Editor bleibt bis zur Umstellung in P16 auf seinem V1-Speicherpfad nutzbar.

Die Vorlage liefert die Interaktionsmuster: Haupt-Editor mit Top-Bar, Widget-Bibliothek, 12-Spalten-Canvas und Inspector sowie ein eigener Panel-Editor mit Vorschau und Kennzahlen-Baukasten. Eine zusätzliche Statusleiste zeigt Datenzustand und Bearbeitungsverlauf.

Vorgeschlagenes Produktprinzip: Ein Nutzer soll eine Kennzahl hinzufügen, ihre Aussage verstehen und sie verändern können, während das Dashboard sichtbar bleibt. Bestehende LeadPilot-Tokens, Schrift, UI-Komponenten und Chart-Primitives führen die Gestaltung. Fachlich unzulässige Darstellungen oder Berechnungen bleiben gesperrt und erklären den Grund.

## 2. Ist-Zustand und Entscheidung über Überarbeitung oder Ersatz

### 2.1 Am Code geprüfter Bestand

| Bereich        | Aktueller Stand                                                                                       | Bedeutung für den Umbau                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Arbeitsbereich | `DashboardWorkspace.tsx` verbindet Bearbeitung, Arbeitskopie, Filter, Raster und Konfiguration        | Geschäftslogik übernehmen; Oberfläche entflechten                                  |
| Raster         | `DashboardGrid.tsx`: 1/6/12 Spalten nach Bildschirmbreite; Größen 3/6/9/12 Desktop-Spalten            | 12-Spalten-Basis existiert, aber kein freies Koordinatenraster                     |
| Verschieben    | HTML-Drag-and-Drop verändert die Reihenfolge einer Liste                                              | Für zweidimensionale Platzierung und Kollisionen ersetzen                          |
| Größe          | Vier Größenklassen; Mindestgröße je Darstellung; Resize-Handle                                        | Mindestgrößen erhalten, freie Rasterbreite und -höhe ergänzen                      |
| Konfiguration  | 420-px-Drawer mit Suche, Kategorie, Darstellung, Titel, Filter und Vorschau                           | Fachliche Prüfung übernehmen; in Bibliothek, Inspector und Panel-Editor verteilen  |
| Kennzahlen     | Katalog mit Baseline-, CRM-, Live- und freigegebenen Kombinationsquellen                              | Herkunft und fachliche Verträge erhalten; keine zusätzlichen Datenquellen erfinden |
| Darstellungen  | Unter anderem Zahl, Tabelle, Balken, Linie, Fläche, Gauge, Sparkline und Trichter                     | Bestehende Renderer weiterverwenden; Heatmap gezielt ergänzen                      |
| Speicherung    | Konfigurationsversion 1, maximal 24 Kacheln; serverseitig maximal 32 KiB JSON                         | Versioniertes Folgeschema und angepasste Serverprüfung erforderlich                |
| Rechte         | Persönliche Konfiguration je Nutzer und Organisation; auch Viewer dürfen ihr eigenes Layout speichern | Persönliche Gestaltung von gemeinsamen Bearbeitungsrechten unterscheiden           |
| Konflikte      | RPC `save_dashboard_preferences` prüft erwartete Revision                                             | Optimistische Konfliktprüfung erhalten und auf Team-Dashboards erweitern           |
| Undo/Redo      | `useDashboardEditorHistory.ts`: maximal 50 gespeicherte Zustände                                      | Sitzungsverlauf ohne künstliche 50er-Grenze neu aufbauen                           |
| Echtzeit       | Supabase-Realtime-Feed mit geteiltem Stream und Verbindungszuständen                                  | Wiederverwenden; CRM-Aktualisierung separat nachweisen                             |
| Historie       | Live-Store und Adapter halten/lesen maximal 30 Punkte; initialer Abruf letzte 30 Minuten              | Kein Nachweis für beliebige Zeitfenster oder vollständige Historie                 |
| Live-Kachel    | `resolveLive.ts` liefert beim einzelnen Live-KPI `series: null`                                       | Zeitreihen aus Historie ausdrücklich an die Kachelauflösung anbinden               |
| Herkunft       | Live-Layer im Dashboard aktuell als organisationsübergreifend gekennzeichnet                          | Niemals als organisationsspezifische CRM-Kennzahl ausgeben                         |
| Export         | Bestehender Report-/Druckexport vorhanden                                                             | Beim Umbau erhalten und mit neuen Layouts abgleichen                               |

Auftrag 128 reparierte bereits Interaktionen und Drawer. Die neue Anforderung geht darüber hinaus: Freie Rasterpositionen, dauerhafte Seitenteile, Team-Dashboards und Abfragen verändern die Struktur des Editors.

Zusätzlicher Bestandsbefund aus der Opus-Gegenprüfung, bei der Nacharbeit am Schema überprüft: Es gibt keine Team-Tabelle und keinen Owner-/Team-Bezug an Deals. Die Rollen `admin`, `manager` und `viewer` gelten auf Organisationsebene. Ein bestehender `pg_cron`-Zeitplan oder eine geplante Edge Function für die Alarmauswertung ist ebenfalls nicht vorhanden. Team-Freigaben und Alarmbetrieb brauchen deshalb neue, ausdrücklich spezifizierte Bausteine.

Die Bestandsaufnahme beruht auf Quellcode und Projektdokumenten. Eine aktuelle Browserprüfung, Lastmessung und Ausführung der Tests gehören zur späteren Bestandsabnahme P01; dieser Plan behauptet keine bereits bestandenen Implementierungsgates.

### 2.2 Bewertete Wege

| Weg                                                                                                   | Vorteil                                                                    | Nachteil                                                                                               | Bewertung                                                        |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Bestehenden Drawer und Listen-Editor weiter ergänzen                                                  | Anfangs geringer Umbau                                                     | Raumaufteilung und Listenmodell bleiben Hindernisse; zunehmende Sonderfälle                            | Für kleinere Reparaturen passend, für dieses Zielbild ungeeignet |
| Editor-Oberfläche und Layoutmodell schrittweise ersetzen; Katalog, Renderer und Datenzugriff erhalten | Zielbild erreichbar; bestehende fachliche Regeln und Tests bleiben nutzbar | Migration, neue Zustandsführung und zusätzliche Backend-Funktionen nötig                               | Empfohlener Weg                                                  |
| Externe Plattform wie Grafana einbetten oder gesamten Daten-/Editorbereich neu bauen                  | Allgemeine Plattformfunktionen verfügbar                                   | Zusätzlicher Betrieb und Rechteabgleich; LeadPilot-spezifische Fachlogik muss erneut integriert werden | Für den bestätigten CRM-Umfang unverhältnismäßig                 |

Empfehlung: Den Editor als zusammenhängenden Produktbereich erneuern und schrittweise einschalten. Der geprüfte Datenkern bleibt Ausgangspunkt. Ein kompletter App-Neubau ist nicht begründet. Diese Empfehlung ist eine Planungsentscheidung, noch keine von Marc gewählte technische Bibliothek.

## 3. UI-Aufbau und Bedienabläufe

### 3.1 Haupt-Editor: Layout und schnelle Konfiguration

| Zone                    | Inhalt und Verhalten                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-Bar                 | Dashboard-Auswahl, bearbeitbarer Titel, Kennzeichnung persönlich/Team, Änderungsstatus, globale Filter, Zeitraum, Live/Pause, Vorschau, Speichern und Abbrechen |
| Widget-Bibliothek links | Zielbreite etwa 250 px; Suche, fachliche Kategorien und Darstellungsarten; Quelle und Aktualität erkennbar; Hinzufügen per Drag-and-Drop oder Schaltfläche      |
| Canvas                  | Verbleibende Breite; 12 Spalten auf Desktop; Rasterlinien nur beim Bearbeiten; Auswahlrahmen, Platzhalter, Kollisionserkennung, Auto-Reflow und Auto-Scroll     |
| Inspector rechts        | Zielbreite etwa 320 px; Tabs Daten, Darstellung, Schwellenwerte und Interaktion; ohne Auswahl verständlicher Leerzustand; Link zum ausführlichen Panel-Editor   |
| Statusleiste            | Verbindung bzw. gemischter Quellenstatus, letzter Datenstand, aktive/gesamte Widgets, Undo/Redo und Fehlerhinweise                                              |

Die Breiten sind Startwerte für die Gestaltung. Bei 1440 px müssen App-Navigation, beide Panels und Canvas gemeinsam geprüft werden; der Editor darf dazu die App-Seitennavigation einklappen oder eine eigene Arbeitsansicht verwenden. Ein schmaler Canvas darf keine Mindestgrößen von Diagrammen umgehen.

Klick auf eine Kachel wählt sie aus. „Widget bearbeiten“ öffnet den Panel-Editor; ein fachlicher Drilldown bleibt eine eigene Aktion. Während offener Änderungen darf ein Klick nicht unbemerkt den Editor verlassen. Die bisherige Navigationssicherung und Fokuswiederherstellung bleiben verbindlich.

Änderungen im Inspector wirken sofort in der Dashboard-Arbeitskopie. „Speichern“ persistiert diese atomar; „Abbrechen“ verwirft nur die aktuelle Bearbeitung. Datenupdates erzeugen weder einen Änderungsstern noch Undo-Einträge.

Zusammenhängende Texteingaben in ein Inspector-Feld zählen als eine Undo-Aktion, bis der Fokus das Feld verlässt oder eine definierte Tipp-Pause endet. P04 legt die Pause fest und prüft das Verhalten einschließlich Einfügen, Löschen und anschließender erneuter Eingabe. Ein Tastendruck erzeugt nicht automatisch einen eigenen Verlaufsschritt.

### 3.2 Panel-Editor: Vorschau und Datenkonfiguration

Oben stehen Zurück, Widget-Titel, „Übernehmen“ und „Abbrechen“. Die Hauptfläche zeigt oben die Vorschau und darunter Tabs für Kennzahl/Abfrage, Transformationen und Alarm. Rechts stehen Visualisierung, Einheit, Achsen, Legende, Farben und Puffer-/Zeitfensteroptionen.

Der Panel-Editor besitzt eine eigene temporäre Arbeitskopie. „Übernehmen“ überträgt die Änderung als eine rückgängig machbare Aktion in den Dashboard-Entwurf; gespeichert ist sie erst mit „Dashboard speichern“. „Abbrechen“ lässt den vorherigen Widget-Stand bestehen. Die Vorschau verwendet dieselbe validierte Abfrage und dieselben Renderer wie die spätere Dashboard-Ansicht.

Der visuelle Baukasten führt durch Kennzahl → zulässige Aggregation → Filter → Gruppierung → Zeitraum → Darstellung. Die verfügbaren Schritte richten sich nach den Fähigkeiten der Kennzahl. Ein historischer Festwert bietet keine erfundene Live-Aggregation.

Als zweiter Modus dient eine lesbare, deklarative LeadPilot-Abfrage mit strukturierten Feldern, Syntaxprüfung, Vervollständigung und Beispielen. Es gibt keine freie SQL-/PromQL-/KQL-Ausführung. Der Wechsel zurück in den visuellen Modus muss verlustfrei möglich sein; nicht unterstützte Ausdrücke werden vor Ausführung abgelehnt.

### 3.3 Responsive, Touch und Barrierefreiheit

- Desktop: Bibliothek, Canvas und Inspector nebeneinander, sofern ausreichend Platz vorhanden ist.
- Tablet: Canvas mit wahlweise eingeblendeter Bibliothek oder Inspector; Touch-Ziele und Auto-Scroll prüfen.
- Smartphone: eine Canvas-Spalte; Bibliothek und Konfiguration als Vollflächenansicht. Hinzufügen, Verschieben und Größenwahl funktionieren über Schaltflächen. Die konkrete mobile Bearbeitungstiefe wird im Design geprüft.
- Bildschirmvorschau: Desktop/Tablet/Smartphone wechseln nur die Layoutansicht; sie ändern keine Datenrechte.
- Jede Drag-/Resize-Aktion hat eine Tastatur- und Schaltflächenalternative. Sichtbarer Fokus, verständliche Ansagen und Farbe plus Text/Symbol für Status sind Pflicht. Bewegung berücksichtigt „reduzierte Bewegung“.

## 4. Funktionsumfang nach den fünf Bereichen der Vorlage

### A. Layout- und Canvas-Management

| Funktion                            | Geplante Umsetzung                                                                                                           | Paket    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- |
| Reaktives 12-Spalten-Raster         | Position `x/y`, Größe `w/h`, Mindestmaße und vorhersehbare Kollisionsregeln; Auto-Reflow mit Vorschau                        | P03, P06 |
| Bibliothek auf Canvas ziehen        | Sichere Drop-Zonen; Einfügevorschau; Abbruch ohne Entwurfsänderung; Schaltflächenalternative                                 | P05, P06 |
| Gruppierung und einklappbare Zeilen | Benannte Sektionen mit Reihenfolge und eigenen Widgets; versteckte Charts entlasten, Alarmprüfung läuft weiter               | P09      |
| Responsive Layouts                  | Getrennte Layouts je Breakpoint; Desktop-Layout bleibt bei mobiler Nutzung erhalten                                          | P03, P06 |
| TV/Kiosk                            | Vollbild, vorhandene Themes, ausgeblendete Menüs, pausierbare Rotation ausgewählter Dashboards und sichtbare Datenaktualität | P15      |
| Undo/Redo                           | Kommandobasierter Sitzungsverlauf ohne fachliche 50er-Grenze; vollständiger Drag zählt als eine Aktion                       | P04      |
| Versionshistorie                    | Dauerhafte Konfigurationsversionen, Autor, Zeitpunkt, JSON-Diff; Rücksetzen erzeugt eine neue Revision                       | P12      |
| YAML-Diff                           | Spätere zusätzliche Darstellung derselben validierten Konfiguration; JSON bleibt kanonisches Format                          | P17      |

„Unbegrenzt“ bedeutet hier ohne künstliche Anzahlgrenze während einer Bearbeitungssitzung. Speicher bleibt technisch endlich: reversible Befehle und Checkpoints vermeiden vollständige Kopien pro Mausbewegung; ein definierter Belastungstest prüft lange Sitzungen. Bei Ressourcenfehlern darf der Verlauf nicht still gekürzt werden. Eine dauerhafte Wiederherstellung ungespeicherter Entwürfe über Browserneustarts ist eine eigene, noch nicht zugesagte Funktion.

### B. Daten und Query-Editor

Die Datenwahl bleibt auf freigegebene LeadPilot-Kennzahlen beschränkt. Bibliothek und Baukasten zeigen Fähigkeiten je Kennzahl: filterbar nach Pipeline, zeitlich aggregierbar, gruppierbar, historisiert, aktuell oder live. Fähigkeiten werden durch Datenverträge belegt und serverseitig geprüft, soweit eine Serverabfrage erfolgt.

Für CRM-Queries müssen Aggregationen den vollständigen berechtigten Datenbestand auswerten. Summen aus der gerade geladenen Tabellenseite sind unzulässig. Mehrere Widgets mit identischer Abfrage teilen Ergebnis und Aktualisierung; die Zahl der Widgets darf nicht dieselbe Zahl identischer Datenbankabrufe auslösen.

Gleichheit einer Abfrage umfasst Organisation, Nutzer-/Team-Zugriffsbereich und wirksame Berechtigungen. Diese Angaben gehören in die Cache-Schlüssel. Bei Logout, Organisationswechsel und Rechteentzug werden betroffene Ergebnisse und Abonnements entfernt; ein alter Cache darf keinen inzwischen unberechtigten Datenstand zeigen.

Transformationen umfassen zunächst Feldumbenennung, belegte Einheitenumrechnung und gleitende Durchschnitte. Anschließend kommen Joins mit explizitem Schlüssel, Join-Typ, Zeitbezug und Begrenzung der Ergebnisgröße hinzu. Größere Transformationen laufen außerhalb des Renderpfads, bei Bedarf im Worker. Eine einzelne Übersichtszahl reicht weder für einen Moving Average noch für ein Perzentil. Freie JavaScript-Formeln gehören nicht zum Plan.

Die bisherigen freigegebenen Kombinationsregeln bleiben gültig. Ein Ausbau zu allgemeinen Ausdrücken benötigt ausdrücklich eine neue Fachfreigabe und eigene Prüfung von Einheiten, Nennern, Zeitraum und Herkunft.

Der spätere KI-Assistent übersetzt natürliche Sprache ausschließlich in diese zulässige Abfragestruktur und einen Widget-Vorschlag. Er zeigt Interpretation und Filter vor dem Übernehmen. Anbieter, Kosten, Datenweitergabe und Schlüsselverwaltung sind vor P18 zu entscheiden; der Hauptausbau braucht keine KI.

### C. Live- und Zeitsteuerung

Eine gemeinsame Zeitsteuerung verwaltet Live-Modus, Pause, relativen Zeitraum und absoluten Analysezeitpunkt. Widgets dürfen eigene Zeitfenster nur mit sichtbarer Abweichungskennzeichnung verwenden.

| Funktion         | Verhalten und Voraussetzung                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push und Refresh | Vorhandenes Supabase Realtime nutzen; für CRM geeignete Invalidierung/Refetch oder Push-Aggregate untersuchen. Intervalle 1/5/30 Sekunden nur anbieten, wenn die Quelle und Lastmessung sie tragen |
| Live-Status      | Transport verbunden, neue Daten eingetroffen und Daten fachlich aktuell getrennt darstellen. Keine erfundenen Ping- oder Latenzwerte                                                               |
| Pause/Play       | Nur die sichtbare Datenansicht einfrieren. Server-Alarme laufen weiter; Wiederaufnahme lädt einen konsistenten aktuellen Stand                                                                     |
| Rolling Windows  | Fenster wie letzte 5 Minuten/Stunde über belegte Zeitstempel; Punktzahl und Auflösung begrenzen, Datenlücken sichtbar lassen                                                                       |
| Time-Travel      | Einheitlicher absoluter Zeitraum für unterstützte Widgets; kein historischer Zustand aus heutigen CRM-Datensätzen ableiten                                                                         |
| Shared Crosshair | Gemeinsamen Zeitstempel in Zeitreihencharts markieren; Zeitzone, unregelmäßige Samples und fehlende Messpunkte berücksichtigen                                                                     |

Für echte CRM-Historie unterscheiden wir Ereignisse, Flussgrößen und Bestandsgrößen. Beispielsweise kann ein nachträglich geänderter Dealbetrag einen früheren Pipelinebestand verändern, wenn nur der heutige Datensatz vorliegt. P10 legt deshalb pro KPI fest, welche Aussage historisch rekonstruierbar ist und wo neue Snapshots/Ereignisse nötig sind. Neue Historie beginnt nach Inbetriebnahme; fehlende Vergangenheit wird nicht aufgefüllt, wenn keine Belege existieren.

Der Live-Feed ist im Bestand organisationsübergreifend. Er bleibt als solcher beschriftet; sensible CRM-Werte laufen über organisationsgebundene Abfragen und Rechte. Ein Umbau dieses Feed-Vertrags benötigt einen eigenen ausdrücklich passenden Auftrag.

### D. Darstellung, Schwellenwerte und Alarme

Inspector und Panel-Editor bieten Einheiten, Dezimalstellen, Legende, Achsen und freigegebene Farbpaletten. Prozent und Prozentpunkte sowie Währung und Skalierung dürfen nicht verwechselt werden. Eigene Titel überschreiben keine Herkunfts- oder Aktualitätshinweise.

Schwellenwerte unterstützen „höher ist besser“, „niedriger ist besser“ und Zielbereiche. Regeln enthalten Operator, Grenzwert, Einheit und optional Mindestdauer. Grenzen müssen eindeutig sein: etwa normal `< 200`, Warnung `>= 200 und < 500`, kritisch `>= 500`. Werte und Farben sind Beispiele, keine LeadPilot-Vorgaben.

In-App-Alarme laufen serverseitig, auch bei geschlossenem Browser. Vorgesehen sind Regel, Auswertungszustand, Ereignisprotokoll und persönliche Lesebestätigung/Quittierung. Mindestdauer, Hysterese, Abklingzeit und Deduplizierung verhindern wiederholte Meldungen bei pendelnden Werten. „Keine Daten“, „veraltet“ und „Auswertungsfehler“ sind eigene Zustände. Ein fehlender Messwert ist kein grüner KPI.

Ein Zeitplan oder Ereignis-Worker bewertet nur unterstützte organisationsbezogene Abfragen, verwendet dieselben fachlichen Formeln und dokumentiert den Datenstand. P01 prüft die technische Machbarkeit des Alarmbetriebs; spätestens vor P13 stehen Hosting, Zeitplan, Dienstkonto, Kosten und Betriebsüberwachung fest. Prüfkandidaten sind ein ausdrücklich eingerichteter `pg_cron`-Zeitplan, zeitgesteuert aufgerufene Edge Functions oder ein externer Scheduler. Keiner dieser Wege wird als bereits vorhanden angenommen. Ein Mindestintervall und ein unabhängig prüfbares Lebenszeichen des Workers machen Ausfälle sichtbar; eine reine Browserprüfung erfüllt die Anforderung nicht.

Jede Regel speichert ihre Organisation und ausdrücklich unterstützte Filter, beispielsweise die Pipeline. Der Teambezug bestimmt den Freigabe- und Empfängerkreis; er erzeugt keinen Team-Datenfilter. Persönliche Sitzungsfilter ändern die gespeicherte Alarmabfrage nicht. Technische Worker-Rechte dürfen den freigegebenen Auswertungsbereich nicht erweitern. Alarmereignisse sehen nur aktuell berechtigte Empfänger; Team-Austritt und Rechteentzug wirken auch auf bestehende Ereignisse und künftige Zustellungen.

Bereits in P13 erhält jede Basiskennzahl und Kombination die ausdrücklich geprüfte Fähigkeit „serverseitig alarmfähig“. Für jede freigeschaltete KPI belegt ein Paritätstest mit identischem Datenbestand, Datenstand, Filtern und Randfällen, dass Client und Server denselben Wert, dieselbe Einheit und denselben Fehler-/Leerdatenzustand liefern. Gemeinsame reine Fachfunktionen sind gegenüber getrennt nachgebauten Formeln vorzuziehen; die konkrete gemeinsame Ausführung spezifiziert P13. Alarmregeln bleiben gesperrt, solange dieser Nachweis fehlt. Statische Baseline-/Planwerte und der organisationsübergreifende Live-Feed sind als Alarmquellen im Hauptumfang ausgeschlossen; aus organisationsfremden Werten entsteht kein Organisationsalarm.

P14 erweitert die Fähigkeit „serverseitig alarmfähig“ auf Transformationen. Eine Alarmregel ist nur zulässig, wenn die Serverauswertung dieselbe Transformationsfolge und denselben Wert reproduziert. Bei rein browserseitigen Transformationen bleibt die Alarmkonfiguration mit verständlichem Grund gesperrt. Die Paritätstests gelten auch für Joins und Einheitenumrechnungen.

Vergleichskurven werden bei belegter Historie möglich. Erwartungskorridore folgen erst mit hinreichenden Daten und dokumentiertem Verfahren; die Darstellung erklärt, wie das Band entsteht. Es gibt keine zugesagte „KI-Anomalieerkennung“ ohne belastbare Datengrundlage.

### E. Variablen, Interaktion und Governance

Globale Variablen bauen zunächst auf Zeitraum und Pipeline auf. Filter nach Verantwortlichem oder CRM-Team gehören erst zu einem gesonderten Auftrag, der entsprechende Felder, Datenzuordnung und RLS einführt. Region und Umgebung aus dem Beispiel werden nicht als vorhandene CRM-Felder angenommen. Jedes Widget zeigt, welche globalen Filter wirken und welche es bewusst nicht unterstützt.

Drilldowns führen in vorhandene LeadPilot-Detailansichten und geben nur unterstützte Filter weiter. Externe Links benötigen erlaubte Protokolle, sichere Parameter und einen erkennbaren externen Zielhinweis. Interne Detailberechtigungen gelten auch nach dem Sprung.

Team-Dashboards erhalten eine eigene Identität und Organisation. „Team“ bezeichnet im Hauptumfang ausschließlich eine organisationsgebundene Freigabegruppe und den Empfängerkreis von Alarmen. Alle Kennzahlen bleiben auf die Organisation und unterstützte, explizite Filter begrenzt; ein Team-Dashboard behauptet keine Team-Umsätze oder Team-Dealbestände. Eigene CRM-Team-Datenbereiche erfordern später einen separaten Schema-/RLS-Auftrag.

Vorgeschlagenes Rechtemodell:

| Aktion                                             | Viewer               | Manager                         | Admin                   |
| -------------------------------------------------- | -------------------- | ------------------------------- | ----------------------- |
| Eigenes persönliches Dashboard gestalten/speichern | Ja, wie bisher       | Ja                              | Ja                      |
| Freigegebenes Team-Dashboard lesen                 | Im berechtigten Team | Im berechtigten Team            | In eigener Organisation |
| Team-Dashboard erstellen/bearbeiten                | Nein                 | Für zugeordnete Teams           | In eigener Organisation |
| Team-Freigaben verwalten                           | Nein                 | Noch festzulegen                | Ja                      |
| Serverseitige Team-Alarmregel verwalten            | Nein                 | Für berechtigte Team-Dashboards | In eigener Organisation |

P01 erhebt die vorhandenen Rechte und die Anforderungen an Freigabegruppen; P02 entscheidet die Rechtematrix und die Verwaltung ihrer Mitglieder. Vorhandene App-Rollen bleiben bestehen; keine neue Rolle „Editor“ ohne Bedarf. Layoutrechte erweitern niemals Datenleserechte. Die fehlende organisationsgebundene Team-/Mitgliedschaftsstruktur wird in P03 spezifiziert und in P07 zunächst inaktiv angelegt; P11 aktiviert ihre Verwaltung und Verwendung für Dashboard-Freigaben. „Team“ bedeutet einen ausdrücklich zugeordneten Nutzerkreis, nicht automatisch alle Organisationsmitglieder.

Team-Dashboards und ihre Alarmregeln gehören der Organisation; der Ersteller bleibt als Autor dokumentiert. Verlässt der Ersteller das Team oder die Organisation, wird seine Mitgliedschaft inaktiv oder verliert er die nötige Rolle, bleiben die Dashboards für weiter berechtigte Mitglieder erhalten. Betroffene Alarmregeln werden pausiert und einem Admin zur Prüfung angezeigt. Erst ein berechtigter Admin übernimmt die Verantwortung und aktiviert sie erneut. P11 regelt Dashboard-Eigentum und Rechteentzug, P13 den entsprechenden Alarm-Lebenszyklus. Persönliche Dashboards werden durch einen Austritt nicht automatisch an das Team freigegeben.

Gleichzeitiges Bearbeiten nutzt zunächst Revisionskonflikte und eine verständliche Vergleichs-/Neuladefunktion. Gemeinsame Nutzung ist damit möglich; paralleles Bearbeiten mit Live-Cursors und automatischem Zusammenführen gehört nicht zum Hauptumfang.

Dashboard-as-Code umfasst validierten JSON-Export/-Import mit Schema, Versionsprüfung, Vorschau und Diff. Exporte enthalten Konfiguration statt KPI-Werte, Zugangsdaten oder Freigabetokens. Importe sind nie ausführbarer Code und dürfen keine fremden Organisations-/Besitzerrechte übernehmen. Git-Pipelines können später dieselbe Validierung nutzen.

Public Sharing bleibt eine spätere, gesonderte Produktentscheidung: standardmäßig aus, nur explizit freigegebene Kennzahlen, Ablaufdatum und Widerruf, minimale öffentliche Datenansicht. Ein schwer erratbarer Link ersetzt keine Berechtigungsprüfung. Kiosk-Modus erteilt keinen öffentlichen Zugriff.

## 5. Technische Zielarchitektur

Der Aufbau trennt Darstellung, Editorzustand, fachliche Abfragen und Zugriff:

```text
Editor-Shell / Bibliothek / Canvas / Inspector / Panel-Editor
                         |
               Dashboard-Arbeitskopie
      Befehle + Undo/Redo + Auswahl + Navigationsschutz
                         |
      Validiertes Dashboard-Schema + Kennzahlen-Abfrage
                         |
       Katalog + Fähigkeiten + Abfrage-/Filterprüfung
                         |
       Gemeinsame Datenauflösung / Cache / Zeitsteuerung
              |                 |                 |
        Baseline            CRM-Aggregate      Live-Store
                         |
      Supabase: RLS, RPCs, Revisionen, Historie, Alarm-Worker
```

Bibliothek und Inspector abonnieren keine eigenen Streams pro Steuerelement. Vorschau und Dashboard teilen Abfrageergebnisse, soweit ihre Entwürfe dieselbe Abfrage erzeugen. Versteckte Tabs und eingeklappte Gruppen stoppen unnötiges Rendering; Alarmregeln besitzen eine davon unabhängige Serverauswertung.

### 5.1 Konfigurationsschema und Migration

Das nächste Schema enthält Dashboard-ID, Titel, Geltungsbereich persönlich/Team, Widgets, Sektionen, Variablen, Zeitsteuerung und Layouts je Breakpoint. Ein Widget referenziert Kennzahl/Abfrage, Visualisierung, Optionen, Schwellenwerte und Drilldowns. Persistente Alarmregeln besitzen eigene IDs und Rechte; eine Vorschauänderung aktiviert keine Alarmregel.

Layout, Datenabfrage und Visualisierung bleiben getrennte Strukturen. In der Konfiguration stehen keine abgerufenen KPI-Werte. UI-Auswahl, geöffnete Tabs und Hover-Cursor sind flüchtiger Zustand. Schema-Version und gespeicherte Revision erfüllen unterschiedliche Aufgaben und bleiben getrennt.

P03 legt das vollständige Ziel-Tabellenmodell einschließlich persönlichem/Team-Geltungsbereich, Freigabe-Zuordnung und dauerhaften Revisionen fest. P07 richtet diese Struktur bereits vollständig ein; zunächst erlauben ihre RLS/RPCs ausschließlich persönliche Dashboards. Jede erfolgreiche Speicherung legt ab P07 eine dauerhafte Revision an. P11 aktiviert Team-Freigaben und ihre Zugriffsregeln, P12 ergänzt die Oberfläche für Historie, Diff und Wiederherstellung sowie Import/Export. Eine zweite Migration persönlicher Bestandsdaten für Teams oder Versionen ist nicht vorgesehen.

V1-Konfigurationen erhalten in P07 eine deterministische, wiederholbare Kopiermigration: Kachel-ID und Katalog-ID bleiben erhalten; Größenklassen werden in passende Rasterbreiten übersetzt, Reihenfolge wird in kollisionsfreie Positionen überführt. Nicht mehr verfügbare Kacheln bleiben nachvollziehbar erhalten. Die V2-Kopie speichert Herkunft und Quellrevision der V1-Fassung. Die bisherige V1-Zeile bleibt unverändert; der alte Editor liest und schreibt weiter ausschließlich über seinen bisherigen Pfad. Neuere unbekannte Versionen bleiben schreibgeschützt.

Es gibt kein unkontrolliertes Doppelschreiben in beide Formate. Bis P16 sind V2-Dashboards getrennte Pilotkopien. Wenn sich die V1-Quellrevision seit dem Kopieren verändert, kennzeichnet die Umstellung die Abweichung und verlangt eine bewusste Übernahmeentscheidung. Ein erneuter Migrationslauf überschreibt keinen bearbeiteten V2-Entwurf und erzeugt keine Duplikate.

Der vorhandene RPC lehnt zusätzliche Felder und andere Schema-Versionen ab. Deshalb sind neue Servervalidatoren, Größenlimits, Migrations- und Rechteprüfungen Pflicht. Neue Versionen werden niemals durch eine bloße TypeScript-Änderung eingeführt. Grenzen für Anzahl, JSON-Größe, Verschachtelung und Query-Komplexität werden nach Lastprüfung festgelegt; die bisherige Grenze von 24 Kacheln bleibt bis zu einem belegten Ersatz bestehen.

### 5.2 Layout-Engine

`react-grid-layout` ist ein Prüfkandidat für Drag, Resize, Kollision und Breakpoints. P03 vergleicht ihn mit einer Weiterentwicklung der bestehenden Engine anhand der konkreten Anforderungen. React-18-Kompatibilität, Lizenz, Paketgröße, Touch-Bedienung, Tastaturalternative und deterministisches Layout sind Entscheidungskriterien.

Neue Pakete brauchen die ausdrückliche Freigabe im jeweiligen Detailauftrag. Das umfasst auch einen Code-Editor, YAML-Verarbeitung und neue Chart-Typen. Keine Abhängigkeit gilt durch diesen Plan bereits als genehmigt. Schwerer Editor-/Chart-Code wird erst beim Öffnen geladen; der normale Dashboard-Lesemodus behält die bestehenden Größenbudgets.

### 5.3 Backend-Bausteine

P03 spezifiziert getrennte Ressourcen für Dashboard-Metadaten, Freigabegruppen/-mitgliedschaften, versionierte Konfigurationen und Alarmregeln/-ereignisse. Das Zielspeichermodell umfasst eine Dashboard-Ressource (beispielsweise `dashboards`) mit Organisation und `scope` persönlich/Team sowie zugeordnete unveränderliche Revisionen. Die genaue Tabellenbenennung bleibt dem Detailauftrag überlassen. P07 legt Dashboard-, Revisions- und Freigabestruktur an, sperrt den Team-Geltungsbereich zunächst serverseitig und migriert persönliche Bestandskonfigurationen als zusätzliche Kopien. Persönliche und spätere Team-Dashboards verwenden denselben neuen Speichervertrag; die bisherige Nutzerzeile wird niemals zu einer Team-Ressource umgedeutet. Freigabegruppen ordnen Nutzer den Dashboards zu, nicht Deals einem Team.

Speichern erfolgt atomar mit erwarteter Revision, gültiger Mitgliedschaft und serverseitiger Schema-/Query-Prüfung. Restore und Import verwenden denselben Pfad. Konfiguration und zugehörige Regeländerungen brauchen eine definierte Transaktion bzw. einen nachvollziehbaren Aktivierungsablauf, damit eine fehlgeschlagene Speicherung keine aktiven Alarme zurücklässt.

## 6. Umsetzung in einzelnen Schritten

Alle Pakete laufen seriell als einzelne Aufträge/PRs. Größere Pakete werden vor Umsetzung weiter geteilt. Geschützte Pfade, Persistenzlogik und neue Datenverträge müssen im zugehörigen Auftrag ausdrücklich als zulässige Ziele stehen.

Die Nummern legen die vorgesehene Reihenfolge fest. Die Spalte „Fachliche Voraussetzung“ nennt dagegen die inhaltlichen Abhängigkeiten; sie behauptet keine notwendige Abhängigkeit vom unmittelbar vorhergehenden Schritt. Insbesondere braucht P11 keine fertige KPI-Historie aus P10. Eine spätere Umsortierung bleibt mit begründeter Plananpassung und seriellen PRs möglich.

| Schritt | Aufgabe und konkretes Ergebnis                                                                                                                                                                                                                                                                                               | Fachliche Voraussetzung                                                                       | Abnahme                                                                                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01     | Bestand prüfen: Editor im Browser, Organisationsrollen, fehlendes Teammodell, CRM-/Live-Datenwege, Historie, Tests und Budgets; KPI-Fähigkeitsmatrix und Machbarkeit des Alarm-Workers erheben                                                                                                                               | Start                                                                                         | Funktionen und Datenlücken belegt; offene Rechtefragen für P02 erfasst; mögliche Scheduler/Hostingwege samt Grenzen dokumentiert                                                                                                                         |
| P02     | UX und Fachverträge festlegen: Haupt-/Panel-Editor, mobil, Team als Freigabegruppe, Rechte-/Eigentumsmodell, Alarm- und Konfliktzustände; prüfbarer Entwurf                                                                                                                                                                  | P01                                                                                           | Design, Rechtematrix und Teamverwaltung abgestimmt; keine ungeklärten Rechtefragen für das Schema aus P03                                                                                                                                                |
| P03     | Grid-Vergleich mit 24 heterogenen Kacheln; vollständiges Zielmodell mit Dashboard-Scope, Revisionen und Freigabestruktur; einmalige V1-Kopiermigration planen                                                                                                                                                                | P01, P02                                                                                      | Engine anhand Messungen gewählt; Pakete ggf. ausdrücklich freigegeben; Tabellenmodell für P07/P11/P12 festgelegt; keine zweite Bestandsmigration für Teams/Versionen                                                                                     |
| P04     | Editor-Kern entkoppeln: Befehle, Entwürfe, Undo/Redo, Eingabebündelung, Navigationsschutz; neuen Rollout-Schalter mit Standard „alter Editor“ einführen                                                                                                                                                                      | P03                                                                                           | Lange Sitzungen ohne 50er-Abbruch; Drag und zusammenhängende Texteingabe je eine Aktion; Datenupdates erzeugen keine Undo-Schritte; Schalter trennt alten/neuen Editor                                                                                   |
| P05     | Vier-Zonen-Shell, Bibliothek und Inspector; bestehende Renderer; internen Pilotzugang hinter dem Schalter anbinden                                                                                                                                                                                                           | P04                                                                                           | Hinzufügen, Auswahl und Vorschau funktionieren; alter Editor bleibt für reguläre Nutzer erreichbar                                                                                                                                                       |
| P06     | Rasterengine: freie Position, Breite/Höhe, Reflow, Drop, Auto-Scroll, Tastatur und Breakpoints                                                                                                                                                                                                                               | P03, P05                                                                                      | Kein Überlappen/Datenverlust im Entwurf; deterministische Serialisierung; 1440/768/375 px ohne horizontalen Überlauf                                                                                                                                     |
| P07     | Vollständige Ziel-Speicherstruktur anlegen; persönliche RLS/RPCs aktivieren, Team-Scope sperren; V1 zusätzlich nach V2 kopieren; Revisionen dauerhaft speichern                                                                                                                                                              | P03, P04, P06                                                                                 | Reload erhält Layout; jede Speicherung erzeugt eine Revision; V1-Zeile und Altpfad durch Kopiermigration unverändert; Wiederholung ohne Duplikate/Überschreiben; Mehrtab-Konflikte und Rückweg belegt                                                    |
| P06b    | Nacharbeit Raster-Invarianten (Auftrag 151, Plananpassung 11.11.2026 nach externem Audit): eine kollisionssichere Platzierung für Hinzufügen/Duplizieren/Drop in allen Breakpoints, überlappungsfreier Tablet-Fallback, Reflow mit Wiedereinreihung, Scroll-Delta beim Ziehen, Drop nur mit Katalog-IDs, Speichervalidierung | P06, P07                                                                                      | Eigenschaftsbasierter Test: nach jeder Operation keine Überlappung in desktop/tablet/mobile; Audit-Regressionsfall grün; überlappende Layouts und unbekannte Katalog-IDs werden nicht als Revision gespeichert                                           |
| P08     | Panel-Editor und visuellen/strukturierten Kennzahlen-Baukasten; Vorschau, Rohdateninspektor und Abbruch                                                                                                                                                                                                                      | P05–P07, KPI-Verträge aus P01/P02                                                             | Queries entsprechen der Fachberechnung; Filter/Vollbestandsaggregation belegt; Zwischenstand A nur als Pilot auf V2-Kopien                                                                                                                               |
| P09     | Sektionen, einklappbare Gruppen, Vorlagen und Dashboard-Auswahl                                                                                                                                                                                                                                                              | P06–P08                                                                                       | Gruppenänderungen rückgängig machbar; Layouts stabil; versteckte Renderer entlastet                                                                                                                                                                      |
| P10     | Belegte Historie und gemeinsame Zeitsteuerung: Datenlücken, Auflösung, Rolling Windows, Pause, Time-Travel, Crosshair                                                                                                                                                                                                        | KPI-Fähigkeitsmatrix P01, Abfrageverträge P08                                                 | Gleicher Analysezeitpunkt in unterstützten Widgets; Historienbeginn ausgewiesen; keine erfundenen früheren CRM-Bestände                                                                                                                                  |
| P11     | Fehlendes Team-/Mitgliedschaftsmodell für Freigaben umsetzen; Team-Scope und RLS/RPCs im Zielmodell aktivieren; Kopieren, Konflikte, organisationsgebundenes Eigentum und Austritt                                                                                                                                           | P02, P07, P09; keine Abhängigkeit von P10                                                     | Zwei berechtigte Nutzer teilen ein Dashboard; fremde Organisationen und unberechtigte Gruppen abgewehrt; Team ändert keinen CRM-Datenbereich; Ersteller-Austritt zerstört kein Team-Dashboard                                                            |
| P12     | Oberfläche für bestehende Revisionen, JSON-Diff, Restore und validierten Import/Export                                                                                                                                                                                                                                       | Revisionsspeicher P07, Freigaben P11                                                          | Keine neue Bestandsmigration; Versionen seit P07 sichtbar; Restore erzeugt neue Revision; Export/Import ohne Rechte-/Secret-Übernahme                                                                                                                    |
| P13     | Schwellenwerte und serverseitige In-App-Alarme; KPI-/Kombinations-Alarmfähigkeit mit Client-/Server-Parität; Scheduler, Worker-Monitoring, Quittierung und Eigentumswechsel                                                                                                                                                  | KPI-Verträge P08, Rechte P11; festgelegter Betriebsweg; P10 nur für historienabhängige Regeln | Alarm ohne Browser; jede zugelassene KPI mit Paritätsnachweis; statische Baseline-/Planwerte und globaler Feed ausgeschlossen; No-Data, Grenzwerte, Deduplizierung und Ausfälle getestet; Regeln nach Ersteller-Rechteverlust pausiert, Admin informiert |
| P14     | Transformationen, Joins, Heatmap, Vergleichszeitraum und begründete Erwartungsbänder; Alarmfähigkeit je Transformation ergänzen                                                                                                                                                                                              | Abfragen P08, Historie P10; Alarmverträge P13 für alarmfähige Transformationen                | Einheiten/Zeitbezug/Joins mit Referenzfällen; Bänder nur bei ausreichenden Daten; Alarm nur bei nachgewiesener Serverparität                                                                                                                             |
| P15     | TV/Kiosk, Theme, Rotation, mobile Bedienung, Barrierefreiheit und Reportexport; Sitzungs-/Token-Erneuerung integrieren                                                                                                                                                                                                       | Editor-/Datenverträge P05–P14 soweit verwendet                                                | Langzeitsitzung mit Token-Erneuerung geprüft; abgelaufene Sitzung sichtbar, Zugriff gestoppt; Rotation pausierbar; Offline erkennbar; Druckexport nutzbar                                                                                                |
| P16     | Gesamtabnahme und gestufte Umstellung: aktuelle V1-Revision mit V2-Pilotkopie abgleichen, Übernahme entscheiden, Schalter je Stufe aktivieren; Last, Rechte, Betrieb und Rückweg prüfen                                                                                                                                      | P01–P15; unabhängige Prüfung und Marcs Freigabe je Rollout-Stufe                              | Keine unbemerkte Übernahme veralteter Kopien; Rückweg mit Datenstand belegt; Pflichtchecks grün; Prüfer ohne offene Befunde; Marc entscheidet Merge/Release                                                                                              |
| P17     | Optional YAML-Diff, Git-Validierung und separat entschiedene öffentliche Freigaben                                                                                                                                                                                                                                           | P12, P16 + Produktentscheidung                                                                | Parser-/Rechteprüfung; widerrufbare Freigaben ohne Zugriff auf private CRM-Daten                                                                                                                                                                         |
| P18     | Später KI-Copilot und externe Alarmkanäle (Teams, Slack, Webhook; PagerDuty bei Bedarf)                                                                                                                                                                                                                                      | P08/P13, P16 + Anbieterentscheidung                                                           | KI erzeugt zulässige Vorschläge; externe Zustellung mit Wiederholung, Deduplizierung und Secret-Verwaltung                                                                                                                                               |

**Plananpassung 11.11.2026:** Ein externes Audit (Triage: `docs/reviews/2026-11-11-externes-audit-triage.md`) hat gezeigt, dass P06 seine Abnahme „Kein Überlappen“ nicht erfüllt und P07 solche Layouts dauerhaft speichert. P06b wird deshalb vor P08 eingeschoben; P08 ist bis zur Gate-Freigabe von P06b sowie der Aufträge 152 (Sicherheits- und Robustheitsnacharbeit) und 153 (Live-KPI-Feed mandantengebunden; ändert nach Merge den Feed-Vertrag aus §4.C und den Alarmquellen-Ausschluss in §4.D) pausiert.

### 6.1 Nutzbare Zwischenstände

**Zwischenstand A, P01–P08:** neuer persönlicher Editor mit Vier-Zonen-Layout, richtigem Raster, Inspector, Panel-Editor und sicherer Speicherung. Eigenständig prüfbarer Pilot auf V2-Kopien hinter dem Rollout-Schalter; reguläre Nutzer bleiben bis P16 im alten Editor.

**Zwischenstand B, P09–P12:** Gruppen, belegte Zeitsteuerung, Team-Dashboards, Versionshistorie und JSON-Austausch. Der kontrollierte Pilotbetrieb bleibt vom V1-Pfad getrennt; Team-Freigaben betreffen keine CRM-Team-Datenbereiche.

**Zwischenstand C, P13–P16:** In-App-Alarme, erweiterte Auswertung, TV-Modus und Gesamtabnahme. Das ist der geplante Hauptumfang.

P17/P18 bleiben separat entscheidbare Erweiterungen. Auch im Hauptumfang dürfen Fähigkeiten datenabhängig deaktiviert bleiben, wenn ihre Voraussetzungen fehlen; die Abnahme muss diese Einschränkung ausdrücklich dokumentieren.

Kalendertermine und Kosten sind noch nicht belastbar. P01–P03 liefern Grundlage und Aufwandsspannen je Paket; Teamfreigaben, historische CRM-Zustände und dauerhafte Alarmauswertung sind die größten zusätzlichen Backend-Arbeiten. Reine Oberflächenschätzungen würden den Umfang unterschätzen.

## 7. Nachweise und Qualitätsgates

Jeder Detailauftrag nennt Ausgangscommit, Ziel-Dateien, erlaubte Schutzbereichsänderungen, überprüfbares Verhalten und Rückweg. Verbindlich bleiben `CLAUDE.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md` und `docs/BUILD_LOG.md`. Historische Entscheidungen werden ergänzt statt überschrieben.

### Funktionale Prüfungen

| Testfall                                                                 | Erwartung                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Widget hinzufügen, verschieben, skalieren, löschen und rückgängig machen | Entwurf und gespeicherte Konfiguration bleiben konsistent; stabile IDs                |
| Panel ändern und abbrechen                                               | Dashboard-Entwurf unverändert                                                         |
| Datenupdate während Layoutänderung                                       | Kein Sprung, kein verlorener Entwurf, kein zusätzlicher Undo-Eintrag                  |
| Verlassen, Browser-Zurück und Sitzungsablauf                             | Verständlicher Schutz; keine stille Datenverwerfung                                   |
| Zwei Nutzer speichern denselben Team-Stand                               | Zweiter Stand erzeugt Revisionskonflikt; kein automatisches Überschreiben             |
| Fremde Organisation oder unberechtigtes Team                             | Zugriff auch bei direktem RPC-/URL-Aufruf abgewiesen                                  |
| KPI-Filter und mehrere CRM-Seiten                                        | Aggregation über vollständigen berechtigten Bestand; ununterstützter Filter erkennbar |
| Reconnect, verspätete/doppelte/ungeordnete Daten und Datenlücken         | Eindeutiger Zustand; keine Doppelzählung oder erfundene Fortsetzung                   |
| Pause und historischer Zeitraum                                          | Widgets nutzen denselben Analysezeitpunkt; Server-Alarme laufen weiter                |
| Schwellengrenze, fehlende Daten und Alarm-Worker-Neustart                | Definierter Zustand ohne Meldungsflut; nachvollziehbares Alarmprotokoll               |
| V1-Migration, unbekannte Version und beschädigter Import                 | Bestand bleibt wiederherstellbar; keine stillen Schemaverluste                        |
| Teamsicht, persönliches Layout und Reportexport                          | Rechte und Darstellung bleiben über alle Zugangswege konsistent                       |

Zusätzliche Abnahmen aus der Opus-Gegenprüfung:

| Testfall                                                                      | Erwartung                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Kopiermigration erneut ausführen, nachdem V1 oder V2 geändert wurde           | Keine Duplikate und kein Überschreiben bearbeiteter V2-Stände; Quellrevision bleibt nachvollziehbar                                         |
| V2-Pilot nutzen und zum alten Editor zurückwechseln                           | V1-Speicherpfad bleibt getrennt; V2-Revisionen bleiben erhalten; sichtbarer Rückkehr-Datenstand                                             |
| Team-Dashboard mit identischen Filtern wie persönliches Dashboard             | Gleicher berechtigter Organisationsdatenbereich; Teamzuordnung erzeugt keinen zusätzlichen Dealfilter                                       |
| Basis-KPI/Kombination auf Client und Alarm-Server mit identischen Eingaben    | Identische Werte, Einheiten und Fehler-/Leerdatenzustände; ohne Nachweis keine Alarmfreigabe                                                |
| Statische Plan-/Baselinewerte oder globalen Live-Feed als Alarmquelle wählen  | Alarmanlage mit verständlichem Grund gesperrt                                                                                               |
| Alarm-Worker fällt aus, während Browser geschlossen sind                      | Fehlendes Lebenszeichen erkennbar; definierter Betriebshinweis statt vorgetäuschter erfolgreicher Auswertung                                |
| Ersteller tritt aus, wird inaktiv oder verliert nötige Rechte                 | Team-Dashboard bleibt organisationsgebunden verfügbar; betroffene Regeln pausieren; Admin wird zur Übernahme aufgefordert                   |
| Längere Inspector-Texteingabe und anschließendes Undo                         | Zusammenhängende Eingabe als eine Aktion; weitere Aktion nach Fokuswechsel/Tipp-Pause                                                       |
| Kiosk läuft über Token-Erneuerung und einen nicht erneuerbaren Sitzungsablauf | Erneuerung funktioniert; bei Ablauf sichtbarer Status, keine neuen Datenabrufe; vertrauliche Daten werden nach Sitzungskonzept ausgeblendet |

### Automatisierung und Sichtprüfung

Pflichtprüfungen umfassen TypeScript, Lint, Format, Qualitätsschuldenbudget, Tests, Integrity-Verifikation, Build, Größenlimits und die aktuellen CI-Pflichtjobs. Bei Schema/RPC/RLS-Änderungen kommen Migrations-, Upgrade- und pgTAP-Prüfungen hinzu. Fachliche Aggregationen erhalten Referenzfälle; neue Rechte erhalten negative Tests.

UI-Gates laufen auf 1440/768/375 px, in hell/dunkel und mit Tastatur sowie passenden Touch-Szenarien. Vorher/Nachher-Screenshots und Überlaufprüfung folgen dem Projektharness. Bewusst geänderte Ansichten brauchen geänderte Hashes; unveränderte Bereiche dürfen identisch bleiben und werden erklärt. Bilddateien bleiben lokal, nur die textuelle Matrix kommt ins Repository.

Leistung wird mit 24 gemischten Widgets und wiederholtem Öffnen/Schließen gemessen: geteilte Abfragen/Streams, verwaiste Abos, Rendering während Drag, Speichertrend und maximale Zeitfenster. Bestehende Bundle-Budgets gelten weiter. Neue Ziele für Eingabelatenz, Datenalter und Historienauflösung werden vor dem jeweiligen Bau anhand P01/P03 festgelegt; „Live 1s“ ist kein ungeprüftes Leistungsversprechen.

Vor jedem Commit steht der Schutzbereichs-Diff im BUILD_LOG. Ein anderer Agent reviewt den aktuellen Head, der Builder arbeitet Befunde nach. Gate-Freigabe setzt unabhängiges Review ohne offene Befunde, grüne Pflichtchecks und gelöste Konversationen voraus. Merge und Release macht Marc.

## 8. Rollout und Rückweg

P04 führt einen neuen Rollout-Schalter ein; sein Standard bleibt der alte Editor. P05 bindet den neuen Editor als internen Pilotpfad an. Der frühere Executive-Dashboard-Schalter ist entfernt und wird nicht wiederverwendet oder vorausgesetzt.

P07 richtet die vollständige Zielspeicherung einschließlich Revisionen und zunächst gesperrtem Team-Scope ein. Die Kopiermigration schreibt V2 zusätzlich und verändert keine bestehende V1-Zeile. Bis P16 sind dies getrennte Pilotkopien: Der alte Editor arbeitet ausschließlich im V1-Pfad, der neue ausschließlich im V2-Pfad. Jede V2-Kopie referenziert die V1-Quellrevision. P11 ergänzt Freigabeverwaltung und aktiviert Team-Scope/RLS; P12 erschließt bereits ab P07 abgelegte Versionen über die Oberfläche. Beide Pakete brauchen keine erneute Migration persönlicher Bestandskonfigurationen.

Die eigentliche Umstellung beginnt erst in P16. Für jede Stufe prüft der Builder den aktuellen V1-Stand gegen die Pilotkopie; bei Abweichungen wird vor Übernahme ausdrücklich entschieden, welche Änderungen gelten. Unabhängige Prüfung und Marcs Freigabe gehen der Aktivierung der jeweiligen Nutzer-/Organisationsgruppe voraus. Ein Wechsel des Schalters darf während offener Entwürfe keine Änderungen verwerfen.

Der alte Editor darf nur Konfigurationen lesen/schreiben, deren Schema er versteht. Für den Rückweg bleibt die gesicherte V1-Fassung lesbar. Sie entspricht gegebenenfalls dem Stand vor der V2-Nutzung: Neue V2-Widgets oder Team-Freigaben sind nicht automatisch im alten Format verfügbar. Der Rückweg benennt deshalb seinen Datenstand und diese Einschränkung. Aktuelle V2-Konfigurationen und Revisionen bleiben erhalten, damit eine erneute Aktivierung keine Pilot-/Produktivänderungen verliert. Es gibt kein stilles Zurückschreiben inkompatibler Felder und kein blindes Frontend-Downgrade.

Alarmauswertung lässt sich separat deaktivieren; ein Frontend-Rollback allein beendet keine Server-Regeln. P13/P16 prüfen das gezielte Pausieren und Wiederanlaufen. Neue Historie bleibt bei einem Frontend-Rollback erhalten.

Erst nach erfolgreicher Migration, funktionaler Abnahme, unabhängiger Prüfung und Marcs Release-Entscheidung entfällt der bisherige Bearbeitungspfad. Entfernung des alten Codes ist ein eigener Abschlussauftrag mit Verwendungsnachweis; V1-Sicherungen unterliegen der ausdrücklich festgelegten Aufbewahrung.

## 9. Entscheidungen und Review-Nachweis

### 9.1 Bereits festgelegt

Teams sind Freigabe- und Empfängerkreise innerhalb einer Organisation. Teambezogene CRM-Daten benötigen einen separaten Schema-/RLS-Auftrag. P03 definiert das vollständige Zielspeichermodell; P07 legt es mit dauerhaften Revisionen an und migriert V1 als zusätzliche Kopie. P04/P05 richten den abgeschirmten Pilotpfad ein, die eigentliche Umstellung erfolgt in P16. Team-Dashboards gehören der Organisation; Alarmregeln werden bei Rechteverlust ihres Erstellers pausiert und einem Admin zur Prüfung vorgelegt.

Diese Festlegungen übernehmen die Empfehlungen des Opus-Reviews auf Marcs ausdrücklichen Auftrag. Die konkrete technische Ausgestaltung bleibt den bezeichneten Paketen vorbehalten.

### 9.2 Noch zu entscheidende Ausgestaltung

| Entscheidung                                                                               | Vorgabe oder Vorschlag                                                                                                               | Spätestens                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Verwaltung der neuen Freigabegruppen und Mitgliedschaften                                  | Organisationsgebundenes Modell; P01 erhebt Anforderungen, P02 entscheidet Verwaltung und Rechte                                      | P02                                                                                |
| Dürfen Manager Team-Freigaben verwalten?                                                   | Admin verwaltet Freigaben; Manager bearbeitet berechtigte Team-Dashboards, sofern P02 nichts anderes festlegt                        | P02                                                                                |
| Wie weit sollen mobile Nutzer bearbeiten können?                                           | Grundaktionen über Formulare/Schaltflächen; präzises freies Ziehen nicht voraussetzen                                                | P02                                                                                |
| Vollständige Tabellen-, Revisions- und Freigabeverträge                                    | In P03 verbindlich spezifizieren; P07 legt Zielstruktur und dauerhafte Revisionen an, Team-Scope zunächst gesperrt                   | P03 vor P07                                                                        |
| Welche KPIs brauchen welche Historie?                                                      | Priorisierte CRM-Kennzahlen; je Quelle Verfügbarkeit und Beginn ausweisen                                                            | P10                                                                                |
| Aufbewahrung von Konfigurationsversionen, V1-Sicherungen, Messpunkten und Alarmereignissen | Getrennte Speicherbudgets und Regeln; Revisionsaufbewahrung vor erster V2-Speicherung festlegen                                      | P03/P07 für Versionen; P10/P13 für Messpunkte/Alarme; P16 für Ende des V1-Rückwegs |
| Ausführung des Alarm-Workers, Mindestintervall und Erkennung seines Ausfalls               | Machbarkeit in P01; Scheduler/Hosting, Dienstkonto, Kosten, Lebenszeichen und Betriebsverantwortung vor Bau festlegen                | P13, Vorprüfung P01                                                                |
| Gemeinsame Fachformeln und Client-/Server-Parität                                          | In P13 Ausführungsweg festlegen; jede alarmfähige Basis-KPI/Kombination mit Paritätstests; P14 erweitert auf Transformationen        | P13/P14                                                                            |
| Wer darf persönliche serverseitige Alarmregeln anlegen?                                    | Viewer behält persönliche Layoutrechte; Alarmverwaltung vorerst Manager/Admin                                                        | P13                                                                                |
| Admin-Übernahme nach Ersteller-Austritt oder Rollenverlust                                 | Organisatorisches Dashboard-Eigentum bleibt bestehen; Regel pausiert, bis berechtigter Admin Verantwortung übernimmt und reaktiviert | P11/P13                                                                            |
| Soll Public Sharing tatsächlich umgesetzt werden?                                          | Deaktiviert; P17 optional                                                                                                            | P17                                                                                |
| Welcher KI-Anbieter und welche externen Kanäle?                                            | Kein Anbieter gewählt, keine externe Datenübertragung                                                                                | P18                                                                                |

### 9.3 Vollständige Übernahme der Gegenprüfung

Die erste Codex-Unteragentenprüfung führte zu vier Ergänzungen: Persistenzabnahme zu P07, berechtigungsbezogene Cache-Trennung, begrenzter Alarm-Auswertungs-/Empfängerkreis und Serverparität für Transformationen. Diese bleiben erhalten; Opus präzisiert den Alarmbereich und erweitert die Parität auf Basis-KPIs.

Claude Opus 5.5 mit Effort „medium“ hat anschließend den Plan lesend gegen den Code geprüft. Die folgende Matrix dokumentiert die Übernahme sämtlicher Empfehlungen, einschließlich der optionalen Punkte. Sie dokumentiert die Nacharbeit; die Neufassung wurde noch nicht erneut von Opus geprüft und ist keine Implementierungsfreigabe.

| Review-ID | Empfehlung                                                       | Übernahme in dieser Neufassung                                                                                                                |
| --------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| B1        | Team-Freigabe von CRM-Datenbereich trennen                       | §1, §2.1, §4.D/E, §5.3, P02/P11/P13: Organisation plus unterstützte Filter; keine Team-/Owner-Daten ohne gesonderten Auftrag                  |
| B2        | Vollständiges Zielmodell vor erster Migration; Revisionen ab P07 | §5.1/5.3, P03/P07/P11/P12: einmalige Kopiermigration; Team-Scope später aktivieren, Versionsoberfläche später ergänzen                        |
| L1        | Rollout-Schalter und Parallelbetrieb zuordnen                    | P04/P05, P07 und §8: neuer Schalter, getrennte V1-/V2-Pfade; Umstellung erst P16                                                              |
| L2        | Serverparität auch für Basis-KPIs/Kombinationen                  | §4.D, P13/P14 und §7: explizite Alarmfähigkeit und Paritätstests; statische Baseline-/Planwerte und globaler Feed ausgeschlossen              |
| L3        | Alarm-Hosting und Ausfallüberwachung entscheiden                 | §2.1, §4.D, P01/P13 und §9.2: kein Scheduler vorausgesetzt; Hosting, Mindestintervall, Kosten und Lebenszeichen festlegen                     |
| L4        | Eigentums-/Regellebenszyklus festlegen                           | §4.E, P11/P13, §7/9.2: Team-Dashboards gehören der Organisation; Regeln nach Ersteller-Austritt/Rechteverlust pausieren und Admin informieren |
| O1        | Reihenfolge von fachlichen Abhängigkeiten trennen                | §6: eigene Fachvoraussetzungen; P11 hängt nicht von P10 ab; PRs bleiben seriell                                                               |
| O2        | Zeitpunkt der Rechteentscheidung vereinheitlichen                | P01 erfasst offene Fragen; P02 entscheidet vor P03; §4.E/9.2 entsprechend angepasst                                                           |
| O3        | Texteingaben für Undo bündeln                                    | §3.1 und P04: Fokuswechsel/Tipp-Pause begrenzen eine Eingabeaktion; Abnahme einschließlich Einfügen und Löschen                               |
| O4        | Kiosk-Token-Erneuerung und Sitzungsablauf prüfen                 | P15 und §7: Langzeitsitzung, Token-Erneuerung, sichtbarer Ablauf und gestoppter Zugriff                                                       |

## 10. Quellen und Referenzprinzipien

Lokale Grundlagen: `CLAUDE.md`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`, Auftrag 128 sowie die in Abschnitt 2 genannten Dashboard-Module; zusätzlich `src/services/liveKpi/liveKpiStreamStore.ts`, `liveKpiReadAdapter.ts`, `src/features/dashboard/data/resolveCrm.ts`, `supabase/schema.sql` und `supabase/migrations/20261004_executive_dashboard_preferences.sql`. Die Nacharbeit umfasst den Abgleich von Schema/Migrationen auf Team-/Owner-Felder und Scheduler sowie der CRM-Auflösung auf browserseitige Fachberechnung.

Externe Referenzen wurden am 10.11.2026 geprüft. Sie begründen Interaktionsmuster und Prüfkandidaten; ihre Plattformfunktionen sind keine Zusagen für LeadPilot:

- [Grafana Panel-Editor](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/panel-editor-overview/): getrennte Vorschau-, Abfrage- und Visualisierungsbereiche. Übernommen wird die Aufgabentrennung; fremde Abfragesprachen und Monitoring-Datenquellen werden nicht übernommen.
- [Datadog Template Variables](https://docs.datadoghq.com/dashboards/template_variables/): globale Variablen und widgetbezogene Anwendung. LeadPilot verwendet ausschließlich Filter, die seine Datenverträge unterstützen.
- [Geckoboard: Widgets anordnen](https://support.geckoboard.com/en/articles/6055766-arrange-widgets-on-a-dashboard): Verschieben, Größenänderung und Gruppierung als direkte Aktionen. Die bestehenden LeadPilot-Mindestgrößen bleiben maßgeblich.
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout): Prüfkandidat für responsive Drag-/Resize-Raster. Eine technische Freigabe erfolgt erst nach P03.
- [Grafana: Alarmzustände bei fehlenden Daten und Fehlern](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/): Anregung für getrennte Betriebszustände; konkrete LeadPilot-Regeln werden in P13 spezifiziert.
