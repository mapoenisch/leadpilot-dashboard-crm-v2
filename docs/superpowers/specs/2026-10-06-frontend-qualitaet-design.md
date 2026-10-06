# LeadPilot – Entwurf für Frontend und Bedienqualität

**Stand:** 06.10.2026 · **Status:** Vorschlag zur Prüfung, keine Umsetzungs- oder Designfreigabe.
**Ausgangspunkt:** Marcs visuelles Review der aktuellen Anwendung und Auftrag, einen umfassenden Behebungsplan zu schreiben. Lokal geprüfter Stand: `5c0deba`, Versionsanzeige `2.3.2`.
**Plan:** [Umsetzungsplan](../plans/2026-10-06-frontend-qualitaet-plan.md).
**Freigabe:** Plan und Entwurf als Arbeitsgrundlage von Marc am 06.10.2026 freigegeben. Die Designentscheidungen in Abschnitt 6 bleiben bis zur jeweiligen Sichtabnahme Empfehlungen.

## 1. Ziel und Grenzen

Marc soll Kennzahlen schneller erfassen, ihre Bedeutung verstehen und die Anwendung auf Desktop und Handy verlässlich bedienen können. LeadPilot bleibt eine bestehende React-Anwendung mit ihrer eigenen dunkelgrünen/türkisen Marke. Kein Neubau, kein Austausch der technischen Grundlage.

Der Auftrag erlaubt das Schreiben des Plans. Die folgenden Designentscheidungen sind Empfehlungen, noch keine bestätigten neuen Produktregeln. Insbesondere die Bildseiten beruhen auf Marcs ausdrücklicher Entscheidung vom 26.09.2026 (ARCHITECTURE_DECISIONS.md B18, Auftrag 069). Ihre Ablösung beginnt erst nach Freigabe einer sichtbaren Musterseite.

Der Bericht hat den dunklen Modus, Dashboard einschließlich Editor/Details, Pipeline sowie die Sales-Funnel-Bildseite direkt geprüft. Andere Seiten und der helle Modus sind vor der Umsetzung zusätzlich zu untersuchen. Bewertungen der gesamten App werden nicht aus einer Einzelansicht abgeleitet.

## 2. Bestätigte Befunde und offene Ursachen

| ID | Befund | Beleg / Grenze |
|---|---|---|
| F01 | Große Kennzahlenkacheln, viel Platz vor den Daten | Desktop-Sichtprüfung; Abstände und Höhen müssen vor Änderung exakt gemessen werden |
| F02 | Wiederholte Angaben zu historischen Daten | Dashboard zeigt Quelle, Zeitbezug und „Historischer Stand ist fest“ |
| F03 | Kennzahlen ohne ausreichende verständliche Einordnung | Standardansicht zeigt gleichgewichtete Werte; Vergleichsdaten und Ziele nicht pauschal verfügbar |
| F04 | Bedienbarer Datumsfilter ohne Filterwirkung | `DashboardFilters.tsx`, sichtbarer Hinweis und Codekommentar |
| F05 | Pipeline als freies Textfeld | `DashboardFilters.tsx`; Herkunft einer vollständigen Auswahlliste noch zu prüfen |
| F06 | Mobile Startansicht ohne sichtbaren Kennzahlwert | Bei 375 × 811 CSS-Pixeln; Dashboard-Inhaltsfläche im Review rund 8.084 Pixel hoch |
| F07 | 32 statische Seiten standardmäßig als Ganzseitenbilder | `pagePresentation.ts`, `ImagePage.tsx`; konkret am Sales Funnel geprüft |
| F08 | Funnel-Bild und Textfassung widersprechen sich | Bild: 65,3 %; Text: 56 % der SQL bei Angeboten. 108 / 192 ≈ 56,25 %. Ursprung und verbindlicher Nenner müssen bestätigt werden |
| F09 | Technische Begriffe und gemischte Sprache | „Server Query“, „RLS“, „closeDate“, „Stage“, „Headcount“, „baseline.arr_verlauf“ |
| F10 | Zu viele Editoraktionen und deaktivierte Konfiguratoroptionen | Direkte Bedienprüfung; Ziehen ist im vorhandenen Raster bereits ergänzend implementiert |
| F11 | Stark dekorierte Diagramme, ähnliche Farbtöne | Sichtprüfung von Ring, Balken und Funnel; keine behauptete pauschale Kontrastverletzung |
| F12 | Pipeline-Fehler zeigt Nullwerte und blockiert beobachtete Navigation | Lokal SERVER_ERROR, Adresse wechselt bei altem Inhalt, wiederholtes „Maximum update depth exceeded“. Exakte Ursache und Produktionsbetroffenheit offen |
| F13 | Abmelden visuell verborgen | `Layout.tsx`: `opacity-0`, sichtbar erst bei Hover/Fokus |
| F14 | Umfangreiches Menü und unzureichend klare Zustandsunterschiede | Sichtprüfung; gespeicherte Aufklappzustände und aktive Markierung gesondert überprüfen |

Temporäre Review-Bilder liegen unter `/private/tmp/leadpilot-visuelles-review-2026-10-06/`. Sie sind Anschauungsmaterial, kein dauerhaftes Archiv. Der erste Umsetzungsauftrag erzeugt neue reproduzierbare Nachweise.

## 3. Drei mögliche Wege

| Weg | Nutzen | Nachteil |
|---|---|---|
| Nur bestehende Abstände und Farben korrigieren | Kleine Eingriffe, schnelle Entlastung | Bildseiten bleiben auf dem Handy schlecht lesbar; Datenfassungen bleiben doppelt |
| **Schrittweise Modernisierung vorhandener Komponenten** | Fehler zuerst beheben, Design an echten Mustern prüfen, Seiten in kleinen Gruppen migrieren | Benötigt geordneten Übergang und mehrere Abnahmen |
| Vollständiger Neuaufbau | Große gestalterische Freiheit | Unnötiges Risiko für bestehende Funktionen, Daten und Präferenzen |

**Empfehlung:** Schrittweise Modernisierung. Bestehendes Page-Kit und die vorhandenen HTML-Inhalte nutzen, aber vor der Rückkehr zu HTML auf fachliche Vollständigkeit, mobile Darstellung und Markenqualität prüfen. Nicht lediglich den globalen Schalter umlegen.

## 4. Vorgeschlagenes Design

### Farben, Schrift und Interaktion

- Vorhandene Basiswerte beibehalten: Hintergrund `#0B211F`, tiefer Hintergrund `#061613`, Oberfläche `#123330`, Türkis `#00D9C6`, Warnung `#FF7A3D`, Text `#FFFFFF`.
- Inter für Lesetexte und Bedienung; Space Grotesk für Überschriften; Zahlen mit gleich breiten Ziffern. Vorhandene lokale Schriftdateien verwenden.
- Haupttext und Formularbeschriftungen grundsätzlich 14–16 px; ergänzende Metadaten 12–13 px. Keine entscheidende Information allein in winziger Schrift.
- Eine klar erkennbare Hauptaktion je Aufgabenbereich; weitere Aktionen zurückhaltend. Deaktiviert, aktiv, fokussiert und ausgewählt müssen unterscheidbar sein.
- Türkis bezeichnet Marke/Aktion, nicht automatisch fachlichen Erfolg. Warnungen haben Text und Symbol zusätzlich zur Farbe. Keine Alarmbewertung ohne belegtes Ziel oder fachliche Regel.
- Keine dekorative Tiefe/Glanzflächen an Datenbalken. Größere Diagrammflächen und gut lesbare Achsen sind wichtiger als Effekte.
- Normaler Text mindestens 4,5:1 Kontrast, großer Text 3:1, wichtige Bediengrenzen/Fokusindikatoren 3:1. Ziel für Touchflächen 44 × 44 px.

### Desktop-Dashboard

```text
Navigation | Seitentitel                       Profil / Abmelden
           | kompakter Simulationsstatus und Steuerung
           | Dashboard                Filter · Bearbeiten
           | 4–6 vorrangige Kennzahlen mit Stand / Einordnung
           | Verlauf                         Verteilung
           | CRM-Übersicht und weitere persönliche Kacheln
```

Linksbündige Inhalte, konsistentes Raster. Richtwert für reine Zahlenkacheln: 160–220 px Höhe bei normalen Inhalten. Lange Titel oder Einschränkungen dürfen mehr Platz benötigen; nichts abschneiden. Quelleninformationen bleiben in den Details, kurze Datenstands-/Geltungshinweise bleiben sichtbar. Ein historischer Wert darf nicht wie ein Live-Wert erscheinen.

Die gespeicherte Reihenfolge persönlicher Dashboards wird nicht durch diese Skizze überschrieben. Eine kompaktere Standardauswahl gilt nur für Benutzer ohne gespeicherte Konfiguration oder nach bewusstem Zurücksetzen. Einordnung ergänzt Daten, erfindet sie nicht.

### Handy-Dashboard

```text
Menü | Dashboard                         Profil
Simulation pausiert · Steuerung öffnen
Dashboard                 Filter · Bearbeiten
Wichtige Kennzahl und Wert
Weitere Kennzahlen
Verlauf / Verteilung / zusätzliche Bereiche
```

Bei 375 × 812 CSS-Pixeln muss mindestens ein vollständiger Kennzahlwert ohne Scrollen sichtbar sein. Bei 320 px Breite bleibt alles bedienbar. Filter und erweiterte Simulationssteuerung öffnen sich bei Bedarf. Der aktuelle Filterzustand bleibt auch geschlossen sichtbar. Auf kleinen Screens wird zuerst weniger gezeigt, ohne Informationen dauerhaft zu entfernen.

### Fachseiten, Editor und Details

Fachseiten bestehen aus echtem Text, Diagrammen und Tabellen. Tabellen dürfen ihren eigenen horizontalen Scrollbereich behalten; die gesamte Seite darf nicht seitlich überlaufen. Lange Fließtexte werden sichtbar gegliedert. Keine abgebildeten Buttons oder zweite Simulationsleiste im Seiteninhalt.

Editor: kompakte Kachelaktionen, vorhandenes Ziehen besser erkennbar, gleichwertige Tastatur- und Touchbedienung. Auswahl, Darstellung und Vorschau zuerst; Kombination und besondere Filter als erweiterte Optionen. Eine aus fachlichen Gründen unmögliche Einstellung darf auch bei kompakter Anzeige nicht auswählbar werden.

Details: verständliche Erklärung, Wert, Zeitraum, Herkunft, Aktualität, Berechnung und Geltungsbereich. Technische IDs gehören in eine ausdrücklich technische Diagnoseansicht. Historische Aktualität und Verfügbarkeit werden sprachlich getrennt, damit „Aktuell“ nicht fälschlich „heutiger Geschäftswert“ bedeutet.

### Fehler und unvollständige Daten

Ein bestätigter Wert 0, fehlende Daten, Laden und Fehler sind vier unterschiedliche Zustände. Ein CRM-Ausfall zeigt „Daten derzeit nicht verfügbar“ statt 0. Vorhandene ältere Werte dürfen nur mit sichtbarem Stand und Hinweis weiter angezeigt werden. Navigation und Wiederholen müssen trotz Fehler funktionieren. Keine Ersatzdaten zur optischen Beruhigung einsetzen.

## 5. Schutz und Abnahme

- Kein Ändern von `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` ohne eigens geschriebenen Auftrag mit ausdrücklichem Zielpfad.
- Reine Anpassung der Simulationsleiste betrifft Darstellung, nicht Tick, Tempo, Run, RNG oder Persistenz.
- Dashboard-Konfigurationsversion, gespeicherte IDs, Reihenfolge und Konflikterkennung beibehalten. Keine unbemerkte Migration oder automatische Rücksetzung.
- Keine neuen Abhängigkeiten ohne explizite Freigabe. Kein neuer Freigabe-/Merge-Automatismus.
- Dunkler und heller Modus, 1440/768/375 px sowie 320 px als enger Zusatzfall; Tastatur, Touch, 200-%-Textvergrößerung, reduzierte Bewegung, Lade-/Leer-/Fehlerzustände prüfen.
- Jede geänderte Bildschirmgruppe hat manuelle Sichtprüfung und technische Gates. Screenshot-Baselines erst nach Prüfung des geladenen Inhalts übernehmen.

## 6. Entscheidungen vor Umsetzung der betroffenen Teile

1. Marc prüft die Musteransichten: kompakte Zahlkachel, flaches Diagramm, mobile Startansicht, echte Funnel-Seite und Editor.
2. Erst die Freigabe der Funnel-Musterseite erlaubt die Revision der Bildseitenentscheidung. Eine explizite Architekturrevision dokumentiert diese Änderung; die Historie bleibt erhalten.
3. Priorisierte Standardkennzahlen: Vorschlag ARR, Umsatzerlöse, EBITDA, aktive Kunden; weitere Kennzahlen in der zweiten Gruppe. Keine automatische Veränderung gespeicherter Ansichten.
4. Vergleichsperioden und Zielwerte nur übernehmen, wenn Herkunft und fachliche Bedeutung nachgewiesen sind. Bei fehlenden Grundlagen entfällt die jeweilige Zusatzanzeige.
5. Vollständige Pipeline-Auswahl nur aus einer belegten organisationsbezogenen Quelle. Ohne solche Quelle vorerst beschriftetes Suchfeld verbessern, keine scheinbar vollständige Liste aus der aktuellen Ergebnisseite ableiten.
6. Release-Zuordnung und Builder außerhalb des Dashboard-Abschnitts aus dem aktuellen Projektprozess festlegen. Dieser Entwurf reserviert keine Auftragsnummer und erklärt keinen Release für fertig.
