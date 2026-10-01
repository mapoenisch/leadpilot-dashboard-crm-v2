# Persönliches Executive Dashboard – Produktentwurf

Stand: 01.10.2026, Revision 2. Grundlage: Marcs Antworten und ausdrückliche Festlegung des Plans mit fünf Änderungen. Der inhaltliche Plan ist festgelegt; technische Detailaufträge und die Designfreigabe der Testkachel folgen. Kein Release freigegeben. Verbindliches Versionsziel: v2.4.0 (Entscheidung Marc, 01.10.2026).

## Ziel

Die feste Executive-Ansicht unter `/dashboard` wird durch ein persönliches Dashboard ersetzt. Jeder Benutzer stellt Kennzahlen und Übersichten zusammen; seine gespeicherte Konfiguration steht nach Anmeldung auf anderen Geräten bereit. HubSpot dient ausschließlich als Ideenquelle.

## Bestätigte Anforderungen

1. Genau ein persönliches Dashboard pro Benutzer, mit brauchbarer Standardansicht.
2. KPI-Katalog aus allen geeigneten Anwendungsbereichen; schrittweise Erschließung und nur verlässliche Daten.
3. Unterstützte Darstellungen: Zahl, Tabelle, horizontale Balken, vertikale Säulen, Kreis, Ring, Linie und Fläche. Auswahl ausschließlich nach Eignung der Daten.
4. Feste Kachelgrößen und Raster; Drag-and-drop für die Anordnung.
5. Geführte Kombination zweier KPIs mit passenden Berechnungen; keine frei geschriebenen Formeln.
6. Jede Kachel besitzt eine sichtbare Details-Schaltfläche. KPI-Details erklären Daten, Zeitraum und Berechnung; ein weiterer Link führt zur passenden Fachseite.
7. Eigener Bearbeitungsmodus mit Speichern und Abbrechen.
8. Zentrale Zeiträume und Filter, mit sichtbar gekennzeichneten Ausnahmen je Kachel.
9. Auch Teamstruktur, Roadmap und Live-Telemetrie sind auswählbar und entfernbar.
10. Simulations-KPIs sind eine spätere Erweiterung. Historische Daten, CRM-Daten und vorhandene Live-KPIs bilden den ersten Umfang.
11. Gemeinsames Konfigurationsfenster mit unmittelbarer Vorschau; zusätzliche Optionen erscheinen nach Bedarf.
12. Mobile Bearbeitung einschließlich Hinzufügen, Konfiguration und Reihenfolge über Schaltflächen. Mobile Darstellung einspaltig.
13. Bestehende Markenbasis weiterentwickeln: ruhigere Kacheln, klare Beschriftung, dezente und informative Hover-Effekte.
14. Diagramme orientieren sich am Referenzbild: räumliche Tiefe, helle Oberkante, dunklere Seitenfläche, klare Werte. Für Linien und Flächen wird dies als dezente Schattierung interpretiert; keine perspektivische Verzerrung der Achsen.
15. Vor Beginn des eigentlichen Umbaus baut Claude Code eine isolierte Testkachel. Marc beurteilt ausschließlich das Design; erst seine ausdrückliche Designfreigabe erlaubt den Umbau.
16. Lazy Loading auf dem Executive Dashboard: schwere Komponenten, Datenabfragen und Kachelinhalte werden bedarfsgerecht geladen; sichtbare Startkacheln erscheinen ohne vermeidbare Verzögerung.
17. Claude Code baut diesen Abschnitt einschließlich der Testkachel, Codex prüft unabhängig. Parallel arbeitende Agenten sind erlaubt, sofern Aufgaben und Änderungen unabhängig sind; ein Builder gibt seine eigene Arbeit nicht frei.
18. Builder-/Review-Zyklus soll möglichst automatisiert ablaufen. Vorgeschlagener Ansatz: CI und Vorschau plus commitbezogene Codex-Reviews und Claude-Nacharbeit. Einrichtung und erfolgreicher Nachweis sind eigenständige Schritte; kein laufender Agent wird durch diesen Plan behauptet.

## Vorgelagerte Designprobe

Eine isolierte Vorschauseite zeigt eine Testkachel mit wechselbaren Darstellungen und Größen. Feste, ausdrücklich als Design-Beispieldaten bezeichnete Werte dienen nur der Gestaltung; kein Cloud-Speichern, kein vollständiger Editor und keine neuen produktiven KPI-Berechnungen. Marc bewertet Tiefe, Farben, Beschriftung, ruhige Kachelgestaltung und hilfreiche Hover-/Touch-/Fokusinformationen. Technische Pflichtgates bleiben erhalten, sind aber keine inhaltliche Designfreigabe. Die bestehende Executive-Ansicht bleibt unverändert, bis die Gestaltung freigegeben ist.

## Lazy Loading

Dashboard-Konfiguration und Katalog-Metadaten werden zuerst geladen. Platzhalter reservieren die endgültige Kachelfläche. Sichtbare bzw. unmittelbar bevorstehende Kacheln laden ihre Inhalte und unterstützten Datenabfragen; bereits aktivierte Kacheln werden beim Scrollen nicht ständig aus- und eingehängt. Chartmodule, Konfigurator und Details sind separate dynamische Imports. Der vorhandene zentrale Live-Stream wird geteilt und nicht pro Kachel geöffnet; seine notwendige Historie darf durch Lazy Loading nicht verloren gehen. Abnahme umfasst Netzwerk-/Chunk-Nachweis, rasches Scrollen, Filterwechsel und Tastaturzugang.

## Gestaltungsregeln

- Referenz: Bildschirmfoto vom 30.09.2026, 08:47:29 (liegt nur lokal bei Marc, nicht im Repo). Für Cloud-Builder muss Marc es vor der Testkachel erreichbar bereitstellen (z. B. PR-/Issue-Anhang); bis dahin ist die Testkachel blockiert.
- Bestehende dunkle Markenbasis und Türkisfarben erhalten; Orange signalisiert fachliche Warnungen, nicht bloß Dekoration.
- Säulen/Balken mit begrenzter SVG-Tiefe; Kreis/Ring mit dezenter Extrusion, ohne Neigung oder unterschiedliche optische Vergrößerung einzelner Segmente.
- Messwerte werden über Vorderfläche, gemeinsame Skala und lesbare Zahlen repräsentiert; Tiefe kodiert keine zusätzliche Kennzahl.
- Keine Kachelrotation, kein Springen oder starkes Aufleuchten beim Hover. Fokus/Hover hebt den betreffenden Datenpunkt dezent hervor.
- Tooltip: Bezeichnung, exakter Wert und Einheit, Zeitraum; Anteil/Delta nur mit belegbarer Berechnung. Touch und Tastatur bieten gleichwertigen Zugang.
- Zahlen/Tabelle bleiben ruhig; technische Begriffe wie „Pseudo-3D“ erscheinen nicht als Produktbeschreibung.
- Mindestgrößen je Darstellung verhindern abgeschnittene Legenden und unlesbare Tabellen.

## Datenregeln

- Historische Werte sind unveränderliche Referenzdaten; CRM und Live bleiben eigenständig identifizierbare Quellen. Der Begriff „verlässlich“ bezeichnet vorhandene und nachvollziehbare Daten im fiktiven LeadPilot-Kontext.
- Quelle und tatsächlicher Zeitraum/Stand sind pro Kachel sichtbar. Fehlend, 0, veraltet, eingeschränkt und Fehler sind unterschiedliche Zustände.
- Ein gültiger Katalogeintrag darf auch bei vorübergehend offline befindlicher Quelle auswählbar bleiben; Vorschau und Kachel zeigen den tatsächlichen Zustand.
- Keine künstlichen Zeitreihen aus Einzelwerten; keine Addition mehrerer Bestands-Snapshots zu einem Umsatz.
- Kombinierbarkeit wird anhand fachlicher Bedeutung, Bezugsmenge, Einheit, Quelle und Zeitbasis festgelegt. Gleiche Einheiten allein reichen nicht.
- Ein Kreis-/Ringdiagramm benötigt nichtnegative, gegenseitig ausschließende Teile einer definierten Gesamtheit. Trichterstufen sind keine Teile eines Ganzen.
- Ein unbekannter oder nicht verfügbarer Eintrag bleibt als erklärbare Kachel erhalten, statt still zu verschwinden.

## Vorgeschlagene technische Struktur

Ein eigenes Dashboard-Modul kapselt Konfiguration, Katalog, Lesemodelle und Darstellung. Bestehende Fachquellen werden ausschließlich gelesen. Eine getrennte Supabase-Tabelle speichert Konfiguration pro Organisation und Benutzer; Kennzahlenwerte werden darin nicht gespeichert. Versionsprüfung verhindert das unbemerkte Überschreiben einer neueren Konfiguration auf einem anderen Gerät.

Die erste Freischaltung erfolgt erst nach vollständiger Abnahme. Bis dahin bleibt die bisherige Executive-Ansicht erreichbar. Geschützte Simulation, Datenmodelle und Schreibpfade werden für diesen Umbau nicht verändert.

## Grenzen

Keine gemeinsame Dashboard-Freigabe, mehrere persönliche Dashboards, Exporte, freie Formelsprache, neue Datenimporte oder Simulationseinbindung im ersten Umfang. Keine neuen npm-Abhängigkeiten ohne ausdrückliche Freigabe im jeweiligen Auftrag.

## Umsetzung

Der detaillierte Plan steht unter `../plans/2026-10-01-executive-dashboard-plan.md`. Für diesen Abschnitt gilt Marcs Rollenentscheidung vom 01.10.2026: Claude Code baut, Codex prüft. Fachlich abhängige Schritte und Freigaben bleiben geordnet; unabhängige Arbeit darf parallel erfolgen. Ein automatisierter Ablauf koppelt Befunde und Freigaben an den geprüften Commit. Merge, Produktionsdeployment und Release benötigen weiterhin die jeweiligen Freigaben.
