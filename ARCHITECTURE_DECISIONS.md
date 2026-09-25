# LeadPilot Dashboard-CRM — ARCHITECTURE_DECISIONS

**Stand:** 31.08.2026
**Dokumentstatus:** Konsolidierter Masterstand — aus `ARCHITECTURE_DECISIONS_KANON.md` promotet, Review durch Marc noch offen, nicht committet
**Letzte belastbar dokumentierte Entscheidung:** **1673**
**Nächste Entscheidungsnummer:** **1674**

> **Herkunft**
> Im Projekt lagen mehrere widersprüchliche Architektur-Dateien nebeneinander
> (`ARCHITECTURE_DECISIONS1.md`, `ARCHITECTURE_DECISIONS2.md`, eine
> 2.902-Zeilen-Vollfassung im `archive/`-Ordner, weitere Kopien in Downloads,
> Papierkörben und einem Codex/ChatGPT-Projekt). Diese Datei führt die belegbaren
> Inhalte in **einer** Struktur zusammen. `…1.md`/`…2.md` und die Streu-Kopien
> liegen im Papierkorb; die 2.902-Zeilen-Vollfassung bleibt unter
> `archive/architecture-decisions/` als historischer Volltext erhalten.

> **Nummern-Diskrepanz (bewusst dokumentiert)**
> Die schlanke Konsolidierung (Linie A) und die jüngste Projektfassung (Linie C)
> nennen als Stand **1673 / 1674**. Die große Vollfassung (Linie D) sowie
> `LEADPILOT_GAP_ANALYSIS.md` nennen an anderer Stelle **1873 / 1874**. Der externe
> Code-Audit stellt ausdrücklich fest, dass für **1674–1873 kein prüfbarer
> Einzelentscheidungstext** vorliegt. Dieser Entwurf führt daher **1673** als
> letzte belastbare Nummer und behandelt 1674–1873 als nicht rekonstruiert.

---

## 0. Zweck und Dokumentationsregeln

Dieses Dokument ist die zentrale Entscheidungsquelle für die weitere Entwicklung
des LeadPilot Dashboard-CRM.

### Verbindliche Regeln

1. Jede relevante Architektur-/Produktentscheidung erhält eine fortlaufende Nummer.
2. Eine Empfehlung gilt als beschlossen, wenn sie im Gespräch mit **„alle“** bzw. **„Ja“** bestätigt wurde.
3. Spätere Änderungen werden als Revision dokumentiert und überschreiben die Historie nicht.
4. Fehlende historische Entscheidungen werden **nicht erfunden**. Nummernbereiche ohne belastbaren Quelltext werden ausdrücklich als Quellenlücke markiert.
5. Fachliche Entscheidungen (Teil A/B) und technischer Implementierungsstand (Teil C) werden getrennt betrachtet.
6. Eine dokumentierte Entscheidung bedeutet **nicht automatisch**, dass sie implementiert ist. Der Code muss gegen die beschlossene Architektur auditiert werden.
7. Diese Datei ersetzt nach Freigabe die verschiedenen Zwischenstände `ARCHITECTURE_DECISIONS*.md`.

### Aufbau

| Teil | Inhalt |
|---|---|
| **Teil A** | Entscheidungs-Historie — streng monoton nach Nummer, Lücken explizit |
| **Teil B** | Verbindliche Ziel-Architektur — thematisch, das „Soll“, entkoppelt von der Nummern-Historie |
| **Teil C** | Implementierungsstand & Audit — inklusive offenem Widerspruch zwischen den Audits |
| **Teil D** | Quellen, Änderungsprotokoll, Masterstatus |

---
---

# TEIL A — ENTSCHEIDUNGS-HISTORIE

Chronologisch nach Entscheidungsnummer. Bereiche ohne belastbaren Einzeltext sind
als **Quellenlücke** gekennzeichnet und werden nicht rekonstruiert.

## A0. Quellen- und Integritätsregel für Teil A

**Bewusst nicht rekonstruierte Bereiche:**

- Entscheidungen **1–108**
- Entscheidungen **309–328**
- Entscheidungen **339–358**
- Entscheidungen **524–773**
- Entscheidungen **1399–1448**
- Entscheidungen **1674–1873**

Für diese Bereiche liegt im aktuell verfügbaren Quellenbestand kein vollständiger,
belastbarer Einzeltext vor. Das ist beabsichtigt: eine Architektur-Masterdatei ist
besser mit einer markierten Quellenlücke als mit erfundenen Entscheidungen.

## A1. Entscheidungen 1–108 — Quellenlücke

**Status:** NICHT REKONSTRUIERT. Die frühe Einzelnummerierung liegt nicht vor.
Belegte frühe Grundlagen siehe A2.

## A2. Belegte frühe Grundlagen (Quellenbereich 1–773)

Aus den bereitgestellten früheren Projektquellen belegt, ohne Zuordnung zu
Einzelnummern:

**Frühe Simulationsarchitektur**

- In V1 läuft die Simulation nur während der aktiven Dashboard-Sitzung. Beim Schließen stoppt sie; beim späteren Öffnen wird vom gespeicherten Stand weitergearbeitet. Eine spätere dauerhaft laufende, unabhängige Simulation ist vorgesehen.
- V1 bietet Beobachtung und manuelle Test-Ereignisse. Eine spätere Management-Simulation erlaubt echte Managemententscheidungen als Simulationssteuerung.
- Phase 3 hält historische/statische Daten immutable und getrennt von veränderlichen Live-/Simulationsdaten.
- Ebene A bildet die historische Dashboard-Sicht ab (Geschäftsbericht 2025, Jahrescheckup 2025); sie wird von der Simulation nicht beeinflusst.
- Ebene B enthält u. a. Leads, Pipeline, Opportunities, Deals, Live-MRR/ARR/Kundenzahl sowie Activities/Events.
- `ISimulationService` wurde als Abstraktion festgelegt; der bestehende `engine.ts` bleibt zunächst erhalten.
- Die damalige Live-Simulation verwendet einen 12-Sekunden-Basistakt; Geschwindigkeiten 1× / 2× / 5× / 10×.
- Start/Pause erhält den Simulationszustand und darf die Navigation nicht zerstören.
- Events sind regelbasiert und kontrolliert pseudo-zufällig. AI/LLM/n8n werden **nicht** als Simulationsmechanismus verwendet.
- Simulierte Entitäten verwenden eigene Präfixe wie `sim-lead-*` / `sim-deal-*`.
- Verifikation der damaligen Phase: 100-Tick-Test, historische Integrität, `tsc`, Build.

**Status:** Historische Grundlage dokumentiert; Einzelentscheidungen 1–773 bleiben offen.

## A3. Entscheidungen 109–298 — Churn, Umsatz, Kanäle, Unit Economics, Customer Success, Persistenz, Szenario-Lifecycle

### 109–118
Laut Projektprotokoll mit „alle“ übernommen. Die vollständigen Einzeltexte liegen
im konsolidierten Quellenbestand nicht vor.
**Status:** BESCHLOSSEN — Einzeltexte nicht vollständig rekonstruiert.

### 119–128 — Churn & Setup-Umsatz
- Churn schwankt zufallsbedingt um die Baseline; 2,8 % als monatliche Rate.
- Churn wird auf individueller Kundenebene simuliert; Zeitpunkte zufällig, aber seed-reproduzierbar.
- Neukunden erhalten eine Mindestdauer vor möglichem Churn.
- Churn verändert die Pipeline nicht automatisch; reduziert MRR/ARR ab dem Churn-Zeitpunkt.
- Gewonnene Deals können einmaligen Setup-Umsatz erzeugen; Setup-Umsatz ist ein eigener Parameter, ggf. paketabhängig.
- Historischer Setup-Umsatz 2025 wird nicht rückwirkend auf simulierte Deals verteilt.

### 129–138 — Setup, Paketpreise & Expansion
- Setup-Umsatz entsteht nur bei Won und verändert weder MRR/ARR noch Pipeline Value.
- Paketpreisänderungen wirken nur auf neue Deals.
- Expansion/Contraction und Paketwechsel bestehender Kunden sind architektonisch vorbereitet, in V1 nicht aktiv.
- Die historischen 66 Kunden bleiben historische Basis und werden nicht zu individuellen Simulationsteilnehmern.

### 139–148 — Simulierte Kunden & Datenherkunft
- Neue simulierte Kunden sind individuelle Ebene-B-Datensätze; die historischen 66 Kunden bleiben aggregierte Basis.
- Neue Kunden erhalten Branche und Kanal; historische Branchenverteilung ist Baseline, Kanalverteilung eigene Simulationsannahme.
- Branchenverteilung ist zunächst kein Nutzerhebel; Kanalstrategie/Kanalbudget ist Nutzerhebel.
- Kanalbudget beeinflusst die Lead-Menge; Kanäle dürfen unterschiedliche Conversion-Faktoren besitzen.
- Nicht belegte Kanalwerte sind ausdrücklich Simulationsannahmen.

### 149–158 — Marketing & Kanäle
- Marketingbudget hat abnehmenden Grenznutzen; Kanäle mit Budget 0 sind deaktiviert.
- Kanalbudget kann innerhalb eines festen Gesamtbudgets verschoben werden; Gesamtbudget ist zusätzlich eigener Hebel.
- Budgetänderungen wirken nur ab Änderungszeitpunkt auf neue Lead Generation.
- Kanalbudget kann neben Lead-Menge auch Lead-Qualität/Conversion über explizite Annahmen beeinflussen.
- Partner ist ein eigener Kanal mit eigener Kapazität und eigenem Ramp-up; Ramp-up ist ein separater Parameter.

### 159–168 — Kanalregeln
- Paid und Organic sind getrennte Kanäle; Organic erzeugt auch ohne Budget Leads (eigener Baseline-/Momentum-Faktor).
- Outbound verbraucht vorhandene Sales-Kapazität; alle relevanten Kanäle erzeugen Sales-Workload.
- Kanal darf den Sales Cycle beeinflussen (neutral 1,0× ohne belastbare Daten); verändert nicht automatisch den Deal Value; darf die Paketwahl beeinflussen.
- Paket wird beim Deal als Vorgangsparameter eingefroren; der ursprüngliche Akquisitionskanal bleibt erhalten.

### 169–178 — Budget & Unit Economics
- Kanalbudgets müssen zusammen dem Gesamtbudget entsprechen; keine stille Normalisierung.
- Historische 40.500 € Media-Spend bleiben READ ONLY; Marketingbudget kann beliebig steigen oder auf 0 € sinken.
- Historischer CAC 862 € bleibt unverändert; Ebene B erhält einen eigenen Simulations-CAC (später auch Fully-Loaded CAC).
- CAC wird in den Szenariovergleich aufgenommen.

### 179–188 — CAC / LTV / Unit Economics
- CAC nur für Neukunden, kumulativ; bei 0 Neukunden „n/a“, nicht 0 €. Setup-Umsatz beeinflusst CAC nicht.
- Eigener Simulations-LTV auf Basis tatsächlicher simulierter Churn-/Lebensdauerentwicklung; eigene LTV:CAC-Ratio; simulierte Payback Period.
- Unit Economics können Plausibilitätswarnungen auslösen und werden in den Szenariovergleich aufgenommen.

### 189–198 — Kosten, Personal & Profitabilität
- Personalkosten werden in Ebene B simuliert; FTE-Kosten zunächst linear und konfigurierbar; Sales mit eigenem Kostensatz.
- Neue Sales-FTE haben einen Ramp-up (eigener Parameter), der die tatsächliche Kapazität beeinflusst.
- Personalkosten fließen in Fully-Loaded CAC ein, verändern ARR/MRR nicht direkt, beeinflussen EBITDA.
- Ebene B erhält einen eigenen simulierten EBITDA-Verlauf; historischer EBITDA −309.000 € bleibt vollständig getrennt.

### 199–208 — Umsatz, Kosten & Bruttomarge
- Marketingbudget ist Live-Kostenposition; höheres Budget belastet EBITDA; Marketingkosten werden zeitlich verteilt.
- Neukunden erzeugen keinen rückwirkenden Jahresumsatz; MRR beginnt ab tatsächlichem Vertrags-/Kundenstart; ARR = MRR × 12.
- Setup-Umsatz wird separat erfasst; Ebene B erhält eigenen simulierten Gesamtumsatz, COGS und Bruttomarge.
- Historische Werte bleiben davon vollständig getrennt.

### 209–218 — Cash / Burn / Runway
- Ebene B erhält eigenen simulierten Cash-Bestand; 363.000 € als definierter Startwert möglich.
- Einnahmen erhöhen Cash, Kosten reduzieren Cash; Cash ≠ EBITDA.
- Burn Rate wird simuliert (Netto-Cash-Abfluss); Runway aus Cash und Burn.
- Kritische Liquidität erzeugt Warnungen; Warnungen verändern die Simulation nicht automatisch.

### 219–228 — Cashflow & Customer Success
- Cashflow wird täglich simuliert; V1 setzt Zahlungseingang = Umsatzzeitpunkt; kein separates Forderungsmodell in V1.
- Variable COGS können mit Kunden/Nutzern skalieren; fixe und variable Kosten getrennt.
- CS erhält eigene Kapazitätslogik; CS-Headcount ist in V1 kein Nutzerhebel.
- CS-Überlastung kann Churn erhöhen; CS beeinflusst MRR/ARR nur indirekt über Churn.

### 229–238 — Customer Success / Customer Health
- CS-Workload variiert nach Paket und Nutzerzahl; CS-Kapazität mit abnehmendem Grenznutzen.
- Überlastete Vorgänge gehen in eine Warteschlange; Überlastung erhöht Reaktionszeiten und Churn-Risiko.
- Interner Customer Health Score wird vorbereitet (kein Nutzerhebel), darf Churn-Risiko beeinflussen.
- Expansion/Contraction bleibt für V1 deaktiviert.

### 239–248 — Customer Health
- Health Score wird täglich aktualisiert; Änderungen wirken nur auf zukünftiges Churn-Risiko; am Kunden gespeichert.
- Darstellung Healthy / At Risk / Critical; kein prominenter Dashboard-KPI in V1.
- Churn-Warnungen erklären ihre Ursachen.
- Szenariovergleich berücksichtigt Churn, EBITDA sowie Cash/Burn/Runway; kein künstlicher Gesamt-Score in V1.

### 249–258 — Persistenz, Zeitreihen & Wiederherstellung
- Relevante KPI-Werte werden je Simulationstag gespeichert; jeder Tick erzeugt einen KPI-Snapshot.
- Der vollständige notwendige Simulationszustand ist speicherbar; gespeicherte Läufe können nach Reload fortgesetzt werden; Neustarts verändern die Simulation nicht.
- Live-State wird automatisch gespeichert; Ebene A wird nicht in den Live-State kopiert.
- Baseline-/Reference-Version wird im Lauf gespeichert; alte Läufe bleiben gegen spätere Baseline-Änderungen geschützt.

### 259–278
Laut Projektprotokoll mit „alle“ bestätigt; Einzeltexte nicht separat enthalten.
**Status:** BESCHLOSSEN — Einzeltexte nicht vollständig rekonstruiert.

### 279–288 — Laufduplizierung & Szenarioerzeugung
- Gespeicherte Läufe können dupliziert werden (reproduzierbarer Zustand inkl. Seed); Duplizieren startet nicht automatisch eine neue Simulation.
- Aus einem Lauf kann direkt ein neues Szenario erstellt werden; Szenarien speichern Parameter, nicht den kompletten Live-State.
- Ein neu gespeichertes Szenario wird anschließend aktiv; Szenario-Laden startet keinen neuen Lauf, informiert aber bei laufender Simulation über Auswirkungen.
- Aktive Parameter und temporäre Overrides bleiben jederzeit transparent.

### 289–298 — Szenario-Lifecycle & Overrides
- Aktives Szenario / Konfigurationsstatus ist jederzeit eindeutig sichtbar.
- Geladene Szenarien dürfen manuell verändert werden; Änderungen werden als ungespeichert gekennzeichnet; Szenarien können bewusst überschrieben werden.
- Nicht jede Kleinigkeit erzeugt automatisch eine neue Version.
- Vor dem Laden gibt es eine Szenario-Vorschau; Szenarien können direkt aus der Liste verglichen werden.
- Szenarien erhalten optionale Kategorien/Tags; freie Tag-Verwaltung kommt nicht in V1.

## A4. Entscheidungen 299–308 — Szenarioverwaltung & Nutzerführung

**Status: ALLE EMPFEHLUNGEN ÜBERNOMMEN**

### 299 — Szenarien nach Kategorien filtern
**Entscheidung:** JA — Die Szenarioliste ist nach den definierten Kategorien filterbar.

### 300 — Szenarien sortieren
**Entscheidung:** JA — Sortierung mindestens nach Name, Erstellungsdatum, Änderungsdatum, zuletzt verwendet.

### 301 — Zuletzt verwendetes Szenario markieren
**Entscheidung:** JA — Das zuletzt verwendete Szenario wird eindeutig erkennbar markiert.

### 302 — Favoriten für Szenarien
**Entscheidung:** NEIN — In V1 keine zusätzliche Favoritenfunktion (bei max. 10 eigenen Szenarien nicht erforderlich).

### 303 — Szenario-Suche
**Entscheidung:** JA — Einfache Suche nach Name und Beschreibung.

### 304 — Szenario-Beschreibung verpflichtend
**Entscheidung:** NEIN — Der Szenarioname ist verpflichtend, eine Beschreibung bleibt optional.

### 305 — Szenario-Metadaten automatisch ergänzen
**Entscheidung:** JA — erstellt am, geändert am, zuletzt verwendet, Version, Anzahl der Läufe, ggf. letzter Ergebnis-Snapshot.

### 306 — Szenario-Limit von 10 erzwingen
**Entscheidung:** JA — Technisch erzwungen; ein elftes Szenario wird nicht stillschweigend angelegt, der Nutzer wird informiert.

### 307 — Basis 2026 in der normalen Szenarioliste anzeigen
**Entscheidung:** JA — sichtbar, aber eindeutig als geschützte System-Baseline gekennzeichnet.

### 308 — Basis 2026 duplizieren
**Entscheidung:** JA — als Ausgangspunkt für ein eigenes Szenario; die geschützte Baseline selbst wird nicht verändert.

**Architekturkonsequenz:** Die Szenarioverwaltung benötigt neben Szenario-ID und
Versionierung deterministische Metadaten für Erstellung, Änderung und letzte
Verwendung sowie Filter-, Such- und Sortierfähigkeit.

## A5. Entscheidungen 309–328 — Quellenlücke

**Status:** NICHT REKONSTRUIERT.

## A6. Entscheidungen 329–338 — Lauf / Seed / Reproduzierbarkeit

- 10 Ergebnisläufe pro Szenario werden gespeichert; wiederholte neue Läufe erhalten jeweils einen neuen Seed.
- „Erneut ausführen“ ≠ Reproduktion; ein gespeicherter Lauf kann explizit reproduziert werden.
- Identische Ausgangsbedingungen + Seed + Versionen → identische Ergebnisse.
- Zentral kontrollierter RNG; bei pausierbaren Läufen wird zusätzlich der RNG-State gespeichert.
- Seed bleibt aus der normalen Managementansicht heraus; Reproduzierbarkeit funktioniert auch nach App-Neustart; Simulationsschema-Version wird gespeichert.

## A7. Entscheidungen 339–358 — Quellenlücke

**Status:** NICHT REKONSTRUIERT.

## A8. Entscheidungen 359–523 — Management-Hinweise, Engpass, Ursache-Wirkung, Monte Carlo, Performance, Maßnahmen, Lead Quality, Sales-Priorisierung

### 359–368 — Finanzierungsbedarf & Management-Hinweise
- Finanzierungsbedarf ist eigene KPI; Höhe und Zeitpunkt werden ausgewiesen; Finanzierungslücken im Cash-Chart markiert; fließt in den Szenariovergleich ein.
- Wachstum wird nicht automatisch als positiv bewertet; Liquidität und Wachstum gleichwertig.
- Regelbasierte Management-Hinweise werden erzeugt; V1 gibt keine automatischen Handlungsempfehlungen; Hinweise mit konkreten Ursachen verknüpft und nach Relevanz priorisiert.

### 369–378 — Engpassanalyse
- Automatische Erkennung von Engpässen in Sales, CS, Marketing und Liquidität; Kapazität gegen tatsächliche Workload.
- Warnungen verändern die Simulation nicht; Ursachen und Auswirkungen werden erklärt; Engpässe als Zeitreihe nachvollziehbar; zukünftige Engpässe prognostizierbar.
- Kein künstlicher Gesamt-Score; Engpässe erhalten Schweregrad nach Intensität und Dauer; werden im Szenariovergleich berücksichtigt.

### 379–388 — Ursache-Wirkungs-Analyse
- Szenarien werden automatisch auf relevante KPI-Abweichungen untersucht; Monte-Carlo-Unsicherheit wird berücksichtigt; absolute und relative Abweichungen angezeigt.
- Ursache-Wirkungs-Ketten werden dargestellt, nur aus der Simulation ableitbare Zusammenhänge; mehrere Ursachen gleichzeitig, sortiert nach Einflussstärke, möglichst mit KPI-Effekten quantifiziert.
- Basis-Erklärungslogik bleibt in V1 deterministisch/regelbasiert; freie KI-Erklärung nicht in der Kernlogik.

### 389–398 — Monte Carlo
- Anzahl der Runs technisch konfigurierbar, kein normaler Nutzerhebel; strategische Parameter innerhalb eines Szenarios gleich; jeder Run eigener Seed.
- Median ist primärer Prognosewert; Standardkorridor P10–P90; P50 in der UI als Median bezeichnet; Min/Max keine Hauptprognose.
- Einzelne Runs untersuchbar und reproduzierbar; Ausreißer werden nicht automatisch entfernt.

### 399–408 — Monte-Carlo-Ausführung
- Qualität hängt von Run-Anzahl ab; es gibt eine technische Mindestanzahl; Runs möglichst parallel; UI bleibt responsiv; Fortschritt wird angezeigt.
- Laufende Berechnung kann abgebrochen werden; abgebrochene Läufe „unvollständig“; bereits berechnete Runs nach Möglichkeit weiterverwenden.
- Teilresultate sind keine finale Prognose; vorläufige Statistik nur eindeutig als „nicht final“ gekennzeichnet.

### 409–418 — Performance & Simulationsausführung
- V1 unterscheidet Schnellsimulation und Detail-/Monte-Carlo-Simulation; Schnellmodus mit weniger Runs.
- Vollständige Detailberechnung startet nicht bei jedem Slider-Move; Slider per Debouncing; eine gewisse Live-Reaktion bleibt.
- Detailberechnungen laufen möglichst im Hintergrund; Web Worker für rechenintensive Simulation vorgesehen.
- Ergebnisse werden gecacht; Cache verwendet eine vollständige Simulationssignatur.

### 419–428 — Managementmaßnahmen
**Status:** IMPLEMENTIERT (AUFTRAG 017 — `Measure`, `EffectiveParameterResolver`, `RunManifest.measures`, `MeasureManagerModal`).
- Maßnahmen sind eigene Objekte mit Startzeitpunkt; dauerhaft oder zeitlich begrenzt; temporäre Maßnahmen werden automatisch zurückgesetzt.
- Maßnahmen verändern niemals Ebene A; noch nicht ausgeführte können bearbeitet werden; ausgeführte nicht rückwirkend; Maßnahmenhistorie wird gespeichert.
- Maßnahmen können in Ursache-Wirkungs-Erklärungen auftauchen; V1 enthält keinen automatischen Strategieoptimierer.

### 429–438 — Maßnahmenlogik
**Status:** IMPLEMENTIERT (AUFTRAG 017 — Multi-Parameter-Änderungen, `MeasureConflict`-Detektion).
- Eine Maßnahme kann mehrere Parameter gleichzeitig verändern; zusammengehörige Änderungen = eine Maßnahme.
- Maßnahmen haben Namen und Beschreibung; erwarteter Effekt wird von der Simulation berechnet; Maßnahmen können Prioritäten besitzen.
- Widersprüchliche Maßnahmen überschreiben sich nicht stillschweigend; Konflikte erzeugen Warnungen; Abhängigkeiten architektonisch vorbereitet; keine automatischen Maßnahmen aus Warnungen in V1.

### 439–448 — Maßnahmen-Zeit & Lifecycle
**Status:** IMPLEMENTIERT (AUFTRAG 017 — `startTick`, `durationTicks`, `revert`).
- Maßnahmen können sofort oder geplant starten; wiederkehrende Maßnahmen architektonisch vorbereitet; feste Laufzeit oder dauerhaft möglich.
- Neue Maßnahmen können während eines laufenden Laufs hinzugefügt werden; keine rückwirkenden Änderungen der Simulation.
- Geplante Maßnahmen können vor Ausführung geändert/gelöscht werden; ausgeführte bleiben Teil der Historie; Gegenmaßnahmen möglich, ohne die Vergangenheit zu überschreiben.

### 449–458 — V1-Maßnahmenkatalog
**Status:** IMPLEMENTIERT (AUFTRAG 017 — V1-Kataloghebel in Engine verdrahtet: `marketingBudgetYearly`, `channelMix`, `trialToPaidConversion`, `salesRepCount`, `salesCycleDays`, `discountPercent`).
- Aktiv: Marketing-Gesamtbudget, einzelne Kanalbudgets, Sales-FTE, Trial-to-Paid, globaler Sales Cycle, Paketpreise.
- Bewusst außerhalb der direkten V1-Steuerung: Churn-Baseline, künstlicher CS-Qualitätsregler, direkte Paketwechsel bestehender Kunden.

### 459–468 — Maßnahmenwirkung & Timing
**Status:** IMPLEMENTIERT (AUFTRAG 017 — `rampUpTicks`, lineare Interpolation).
- Maßnahmen können zeitlich gestaffelt werden und einen Wirkungsverzug besitzen; Marketing und Sales-FTE erhalten je eigenen Ramp-up.
- Trial-to-Paid wirkt für neu startende Trials unmittelbar; Sales-Cycle-Änderungen wirken sofort auf die verbleibende Zeit laufender Vorgänge; Paketpreisänderungen für neue Deals.
- Marketing-Ramp-up konfigurierbar; unterschiedliche Kanäle mit unterschiedlichen Ramp-ups; die UI zeigt Start → Ramp-up → volle Wirkung → Ende.

### 469–478 — Marketing-Response & Lead Expiration
- Marketingbudget wirkt über eine nichtlineare Response-Kurve; je Kanal eigene Kurve möglich; komplexe Kurvenkonfiguration nicht als V1-UI.
- Marketingeffizienz darf sich mit Unternehmensgröße verändern; Sales-Kapazität begrenzt die Verarbeitung, nicht die Lead-Erzeugung.
- Nicht rechtzeitig bearbeitete Leads können verfallen; Lead-Expiration ist eigener Parameter, ggf. kanalabhängig; Lead Expired ≠ Customer Churn; fließt in die Ursachenanalyse ein.

### 479–488 — Lead Expiration & Bottleneck-Logik
- `LEAD_EXPIRED` ist eigenes Event; Expired Leads konvertieren nicht mehr über den normalen Funnel; keine automatische Reaktivierung in V1; Expiration kann von der Funnel-Stufe abhängen.
- Sales-Überlastung verlängert nicht künstlich die Toleranzzeit; Kapazität beeinflusst Expiration indirekt über die Warteschlange; Marketing erzeugt weiter Leads bei überlastetem Sales.
- Bottlenecks können zwischen Marketing, Sales, CS und Liquidität wandern; werden nicht automatisch behoben; der Bottleneck-Verlauf ist zwischen Szenarien vergleichbar.

### 489–498 — Lead Quality
- Jeder Lead erhält einen internen Lead Quality Score (intern numerisch, z. B. 0–100), nicht prominent im Hauptdashboard.
- Höhere Qualität darf Conversion-Wahrscheinlichkeit erhöhen, kürzeren Sales Cycle ermöglichen und beeinflusst den Sales-Kapazitätsverbrauch.
- Initialer Score bei Lead-Erzeugung; beobachtete Qualität kann sich durch neue Informationen ändern; kein direkter Nutzerhebel; keine V1-Maßnahme „Lead Quality +20 %“.
- Qualität entsteht aus definierten Simulationsmechanismen, Strategie- und Kanalentscheidungen.

### 499–523 — Sales-Priorisierung & Workload
- Lead Quality Score darf die Priorisierung innerhalb der Sales-Warteschlange beeinflussen, aber nicht allein bestimmen.
- Mehrere Faktoren kombiniert: Quality, Deal Value, Alter, Kanal etc.; Priorisierungslogik ist eigener interner Parameter-/Regelblock, in V1 kein frei konfigurierbarer Nutzerhebel.
- Höherer Deal Value darf Priorität erhöhen, nicht allein bestimmen; alte wartende Leads erhalten Alterungs-/Dringlichkeitsfaktor; keine absolute FIFO-Warteschlange.
- Priorität wird bei jedem Tick neu bewertet; Neuberechnung setzt verbrauchten Bearbeitungsaufwand nicht zurück; ein aktiv bearbeiteter Vorgang behält seinen Fortschritt; Preemption ist in V1 ausgeschlossen.
- Sales Workload wird pro Vorgang gespeichert; abhängig von Lead Quality, Paket und Nutzerzahl; unterschiedliche Kanäle mit unterschiedlichen durchschnittlichen Workloads; in V1 kein direkter Nutzerhebel.
- Die Simulation macht sichtbar, welche Faktoren Sales-Kapazität verbrauchen; diese Faktoren erscheinen in der Ursachenanalyse eines Sales-Engpasses.

## A9. Entscheidungen 524–773 — Quellenlücke

**Status:** NICHT REKONSTRUIERT. Belegte historische Grundlagen für diesen
Quellenbereich siehe A2.

## A10. Entscheidungen 774–1223 — Dashboard, Ziele, Events, Datenmodell, Persistenz, Export, Rechte, Tech-Grundarchitektur, Frontend-Stack, Teststrategie, Fehler, Performance, UI/UX, Designsystem

Alle folgenden Entscheidungen wurden im Entscheidungsprozess explizit bestätigt.

### 774–798 — Dashboard & Nutzerführung
- **774:** Historische Unternehmensdaten und Simulationsergebnisse werden klar getrennt.
- **775:** Eigener Bereich „Historische Daten / 2025“.
- **776:** Eigener Bereich „Simulation / Prognose“.
- **777:** Aktives Szenario ist immer sichtbar.
- **778:** Schnell-/Detail-Simulation wird sichtbar unterschieden.
- **779:** Laufende Simulation zeigt Status/Fortschritt.
- **780:** Dashboard bleibt während einer Simulation nutzbar.
- **781:** Historische und simulierte Zeiträume können umgeschaltet werden.
- **782:** Historische und simulierte Entsprechungen können direkt gegenübergestellt werden.
- **783:** Herkunft jedes Wertes bleibt eindeutig gekennzeichnet.
- **784:** Zentraler KPI-Bereich.
- **785:** Kernbereich bleibt bewusst auf wichtigste KPIs begrenzt.
- **786:** Zweite Detailansicht für zusätzliche KPIs.
- **787:** Keine freie KPI-Konfiguration in V1.
- **788:** MRR, ARR, Kunden, EBITDA und Cash prominent.
- **789:** Burn und Runway prominent.
- **790:** CAC/LTV nicht im Hauptbereich, sondern Unit Economics.
- **791:** Churn prominent.
- **792:** Historische 2025-Zahl wird als „Baseline“ bezeichnet.
- **793:** Simulationsausgangslage wird als „Simulation Start“ bezeichnet.
- **794:** Zielwerte werden separat dargestellt.
- **795:** Zielerreichung direkt am KPI sichtbar.
- **796:** Kritische KPIs erzeugen Warnhinweise.
- **797:** Warnungen führen zur Detailanalyse.
- **798:** Nutzerführung: **Was passiert? → Warum passiert es?**

### 799–823 — Dashboard-Struktur & Analysebereiche
- **799:** Dashboard in klare Bereiche/Karten gliedern.
- **800:** Eigene Simulation Control Area.
- **801:** Simulation Control Area oben im Dashboard.
- **802:** Eigener Scenario Overview.
- **803:** Scenario Overview zeigt Name, Version und Status.
- **804:** Letzter Simulationszeitpunkt wird angezeigt.
- **805:** Monte-Carlo-Run-Anzahl wird angezeigt.
- **806:** Seed bleibt technische Detailinformation.
- **807:** Eigene Core-KPIs-Sektion.
- **808:** KPI-Karten zeigen Startwert, Prognosewert und Veränderung.
- **809:** P10/P90 können in KPI-Karten verfügbar sein.
- **810:** P10/P90 nicht dauerhaft dominant im Hauptdashboard.
- **811:** KPI-Karten sind anklickbar und führen zur Detailanalyse.
- **812:** Eigene Trend-Analysis-Sektion.
- **813:** Mehrere KPIs können im Trend verglichen werden.
- **814:** Historische Baseline optional in Trend-Charts.
- **815:** 2026-Ziel optional in Trend-Charts.
- **816:** Eigene Bottleneck-&-Risks-Sektion.
- **817:** Wichtigste drei Risiken werden hervorgehoben.
- **818:** Vollständige Risikoanalyse bleibt zugänglich.
- **819:** Eigene Unit-Economics-Seite.
- **820:** Eigene Funnel-Analysis-Seite.
- **821:** Eigene Customer-Analysis-Seite.
- **822:** Eigene Financial-Analysis-Seite.
- **823:** Eigene Scenario-Comparison-Seite.

**Hauptnavigation:** `Dashboard → Funnel Analysis → Customer Analysis → Unit Economics → Financial Analysis → Scenario Comparison` plus übergreifende **Simulation Control Area**.

### 824–848 — Szenario-/Run-Lifecycle
- **824:** Dashboard ist zentrale Startseite.
- **825:** Zuletzt verwendetes Szenario wird wiederhergestellt.
- **826:** Keine automatische erneute Detailsimulation beim Öffnen.
- **827:** Aktualität des vorhandenen Ergebnisses wird angezeigt.
- **828:** Parameteränderung markiert bisheriges Ergebnis als veraltet.
- **829:** Schnellsimulation aktualisiert sich bei Parameteränderung.
- **830:** Detailsimulation wird manuell gestartet.
- **831:** Eindeutiger Button „Detailsimulation starten“.
- **832:** Run-Anzahl wird am Start angezeigt.
- **833:** Keine zusätzliche Bestätigungsabfrage vor langer Simulation.
- **834:** Laufender Simulationsjob zeigt Status/Fortschritt.
- **835:** Andere Szenarien können während eines laufenden Jobs geöffnet werden, sofern sauber unterstützt.
- **836:** Neuer Job bricht alten Job nicht automatisch ab.
- **837:** Jeder Simulationsjob erhält eine eindeutige `runId`.
- **838:** Ergebnis ist Szenario + Szenarioversion eindeutig zugeordnet.
- **839:** Ergebnis speichert Simulationsmodell-Version.
- **840:** Ergebnis wird nicht nachträglich auf eine andere Szenarioversion umgebogen.
- **841:** Alte Modellversionen bleiben auswertbar.
- **842:** Ergebnisse unterschiedlicher Modellversionen werden nicht ungeprüft verglichen.
- **843:** Kompatibilitätsprüfung für Ergebnisversionen.
- **844:** Ergebnisansicht zeigt relevante Annahmen.
- **845:** Neues Szenario kann aus einem Ergebniszustand abgeleitet werden.
- **846:** Ursprüngliches Szenario bleibt dabei unverändert.
- **847:** Parent-Szenario wird gespeichert.
- **848:** Szenario-/Versionshistorie wird visualisiert.

### 849–873 — Szenariovergleich [IMPLEMENTIERT (AUFTRAG 019)]
- **849:** Direkter Vergleich zweier Szenarien.
- **850:** Vergleich von drei oder mehr Szenarien möglich.
- **851:** V1 maximal vier Szenarien gleichzeitig.
- **852:** Nutzer wählt Vergleichsszenarien selbst.
- **853:** Basisszenario wird als Referenz angeboten.
- **854:** Gleiche Simulationsdauer im Vergleich.
- **855:** Gleiche Run-Anzahl im Vergleich.
- **856:** Szenarien besitzen unabhängig reproduzierbare Seeds.
- **857:** Optional gemeinsamer Random-Stream für faire Vergleichsexperimente.
- **858:** Gemeinsamer Random-Stream ist keine normale V1-UI-Option.
- **859:** Absolute KPI-Werte im Vergleich.
- **860:** Relative Unterschiede im Vergleich.
- **861:** Absolute Differenzen im Vergleich.
- **862:** Median ist primärer Vergleichswert.
- **863:** P10/P90 werden zusätzlich verglichen.
- **864:** Höherer ARR allein macht ein Szenario nicht automatisch „besser“.
- **865:** Vergleichsperspektiven: Growth, Profitability, Liquidity, Acquisition, Retention.
- **866:** Kein künstlicher Gesamt-Score.
- **867:** Nutzer kann einen Ziel-KPI auswählen.
- **868:** Trade-offs werden explizit hervorgehoben.
- **869:** Relevante Unterschiede werden automatisch identifiziert.
- **870:** Unterschiede erhalten, sofern möglich, eine Ursache.
- **871:** Unklare Ursache wird transparent als nicht eindeutig bestimmbar ausgewiesen.
- **872:** Szenariokonfiguration kann aus Vergleich übernommen werden.
- **873:** Anwendung entscheidet nicht automatisch, welches Szenario gewählt werden soll.

### 874–898 — Ziele & Zielerreichung
- **874:** Jedes Ziel besitzt einen eindeutigen Namen.
- **875:** Jedes Ziel ist einer KPI zugeordnet.
- **876:** Jedes Ziel besitzt einen numerischen Zielwert.
- **877:** Jedes Ziel besitzt einen Zielzeitpunkt.
- **878:** Zielrichtungen: höher ist besser, niedriger ist besser, Bereich.
- **879:** Mindestwert und Idealwert können optional vorhanden sein.
- **880:** Ziel wird nicht nur am Enddatum bewertet.
- **881:** Zielpfad kann gegen KPI-Zeitreihe dargestellt werden.
- **882:** Ziel kann eine Toleranzzone besitzen.
- **883:** Ziel-Toleranz und Monte-Carlo-Unsicherheit bleiben getrennt.
- **884:** Zielerreichung berücksichtigt die gesamte Monte-Carlo-Verteilung.
- **885:** Zielerreichungswahrscheinlichkeit wird angezeigt.
- **886:** Wahrscheinlichkeit wird nicht als Gewissheit dargestellt.
- **887:** Hohe Unsicherheit kann trotz gutem Median zu einem unsicheren Status führen.
- **888:** Zielerreichungswahrscheinlichkeit wird je Szenario berechnet.
- **889:** Mehrere Ziele gleichzeitig.
- **890:** V1 maximal 10 aktive Ziele.
- **891:** Ziele können archiviert werden.
- **892:** Zieländerungen erzeugen neue Zielversionen.
- **893:** Jede Zieländerung wird versioniert.
- **894:** Alte Ergebnisse können gegen neue Zielwerte neu ausgewertet werden.
- **895:** Ursprünglicher Zielwert bleibt gespeichert.
- **896:** Ziele können aus historischer Baseline abgeleitet werden.
- **897:** Daraus berechneter absoluter Zielwert wird gespeichert.
- **898:** Anwendung bestimmt nicht automatisch das wichtigste Ziel.

### 899–923 — Zielstatus & Zielkonflikte
- **899:** Ziele besitzen Status.
- **900:** Zielstatus wird automatisch berechnet.
- **901:** „Erreicht“ kann vor dem Zieltermin möglich sein.
- **902:** Aktuell erreicht und zum Zieltermin voraussichtlich erreicht werden unterschieden.
- **903:** Gute aktuelle Lage kann bei negativer Prognose als gefährdet gelten.
- **904:** Monte-Carlo-Unsicherheit beeinflusst den Zielstatus.
- **905:** Zielstatus und Zielerreichungswahrscheinlichkeit werden getrennt angezeigt.
- **906:** 51 % Zielwahrscheinlichkeit ist nicht automatisch „erreicht“.
- **907:** V1 verwendet feste Systemschwellen.
- **908:** Schwellen sind in V1 nicht frei konfigurierbar.
- **909:** Ziele besitzen einen Fortschrittswert.
- **910:** Fortschrittsberechnung hängt vom Zieltyp ab.
- **911:** Zielpfad kann automatisch erzeugt werden.
- **912:** Zielpfade sind architektonisch nicht auf Linearität begrenzt.
- **913:** V1 bietet zunächst lineare Zielpfade als UI-Option.
- **914:** Ziele können mit Szenarien verknüpft werden.
- **915:** Ein Ziel kann mit mehreren Szenarien verglichen werden.
- **916:** Szenario mit höchster Zielwahrscheinlichkeit wird angezeigt.
- **917:** Dieses Szenario wird nicht automatisch als „bestes Szenario“ bezeichnet.
- **918:** Hohe Zielwahrscheinlichkeit kann gleichzeitig mit Liquiditätsrisiko bestehen.
- **919:** Zielkonflikte werden erkannt.
- **920:** Zielkonflikte werden als Management-Hinweis dargestellt.
- **921:** Zielkonflikte werden nicht automatisch aufgelöst.
- **922:** Ein Ziel kann als Fokusziel markiert werden.
- **923:** Fokusziel blendet andere Ziele nicht aus.

### 924–948 — Events & Auditierbarkeit
- **924:** Relevante Simulationsereignisse werden als eigene Events gespeichert.
- **925:** Jedes Event besitzt `eventId`.
- **926:** Jedes Event besitzt einen Event-Typ.
- **927:** Jedes Event besitzt einen Simulationstag.
- **928:** Events am selben Tag besitzen deterministische Reihenfolge.
- **929:** Reihenfolge darf logisch relevante Ergebnisse beeinflussen, wenn fachlich erforderlich.
- **930:** Identischer Seed erzeugt identische Event-Reihenfolge.
- **931:** Events können betroffene Entitäten referenzieren.
- **932:** Events können mehrere Entitäten referenzieren.
- **933:** Auslösende Ursache wird soweit möglich referenziert.
- **934:** Ursachen werden strukturiert und nicht nur als Freitext gespeichert.
- **935:** Menschenlesbare Erklärungen können aus strukturierten Ursachen erzeugt werden.
- **936:** Relevante Event-Parameter werden zum Ereigniszeitpunkt gespeichert.
- **937:** Events sind immutable.
- **938:** Fehlerhafte Events werden nicht stillschweigend gelöscht.
- **939:** Jeder Event-Typ besitzt ein definiertes Schema.
- **940:** Unbekannte Event-Typen sind Schemafehler.
- **941:** Auch technische Zustandsänderungen können Events sein.
- **942:** Parameteränderungen werden als Events dokumentiert.
- **943:** Maßnahmenobjekt und tatsächliche Maßnahmen-Events werden getrennt dokumentiert.
- **944:** Events referenzieren `runId`.
- **945:** Events referenzieren Szenario und Szenarioversion.
- **946:** Events speichern Modell-/Schema-Version.
- **947:** Vollständige Event-Historie gehört nicht ins normale Dashboard.
- **948:** Wesentliche Management-Erklärungen müssen auf Events und Berechnungen zurückführbar sein.

**Audit-Kette:** `Szenario → Version → Run → Event → Entität → Berechnung → KPI → Erklärung`

### 949–973 — Datenmodell, Konfiguration, State & Snapshots
- **949:** Zentrale Simulationskonfiguration.
- **950:** Konfiguration und Ergebnis getrennt.
- **951:** Konfiguration versioniert.
- **952:** Veröffentlichte Konfigurationsversionen immutable.
- **953:** Jeder Run erhält Konfigurations-Snapshot.
- **954:** Run speichert Versionsreferenz und tatsächlich verwendeten Parameter-Snapshot.
- **955:** Historische Baseline, Simulation und UI-Parameter getrennt.
- **956:** Historische Baseline ist readonly.
- **957:** Simulation kann eigene Baseline-Kopie besitzen.
- **958:** Historische Baseline-Änderung verändert Szenarien nicht automatisch.
- **959:** Neue Baseline-Version kann explizit für zukünftige Simulationen genutzt werden.
- **960:** Szenarien speichern vollständigen Parametersatz.
- **961:** Szenarien sind vollständig reproduzierbar.
- **962:** Stammdaten und Laufdaten getrennt.
- **963:** `customerId` bleibt stabil.
- **964:** Simulierter Kunden-State ist veränderlich.
- **965:** State ist aus Events rekonstruierbar.
- **966:** Optimierter aktueller State wird zusätzlich gespeichert.
- **967:** State ist nicht die autoritative historische Quelle.
- **968:** State muss aus Events wiederaufbaubar sein.
- **969:** Snapshots werden zur Performance unterstützt.
- **970:** Snapshots ersetzen keine Events.
- **971:** Kein Snapshot nach jedem Event.
- **972:** Definierte Snapshot-Zeitpunkte.
- **973:** Snapshot-Frequenz ist technisch konfigurierbar.

### 974–998 — Simulationslauf & Persistenz
- **974:** Lauf wird während Berechnung temporär gespeichert.
- **975:** Unvollständiger Lauf wird als `INCOMPLETE` markiert.
- **976:** Erfolgreicher Lauf erhält `COMPLETED`.
- **977:** Fehlgeschlagener Lauf erhält `FAILED`.
- **978:** Bewusst abgebrochener Lauf erhält `CANCELLED`.
- **979:** `COMPLETED`-Läufe sind unveränderlich.
- **980:** Kein unkontrolliertes automatisches Retry.
- **981:** Architektur bereitet gezielte Retries für transiente Fehler vor.
- **982:** Fehler-/Diagnoseinformationen werden gespeichert.
- **983:** Technische Fehlerdiagnose ist nicht Teil des normalen Dashboards.
- **984:** Teilweise berechnete fehlerhafte Läufe sind keine gültigen Prognosen.
- **985:** Abgebrochene Läufe behalten bereits berechnete Runs.
- **986:** Erfolgreiche Fortsetzung erzeugt einen vollständigen Ergebniszustand.
- **987:** Fortsetzung desselben Jobs kann dieselbe `runId` behalten.
- **988:** Fortsetzungszeitpunkt wird dokumentiert.
- **989:** Ergebnis enthält Monte-Carlo-Statistiken.
- **990:** Rohwerte aller Monte-Carlo-Runs bleiben analysierbar.
- **991:** Rohwerte sind nicht standardmäßig im Managementdashboard sichtbar.
- **992:** Detailansicht kann Verteilungen darstellen.
- **993:** Ausreißer werden sichtbar gemacht.
- **994:** Minimum und Maximum sind technische Zusatzstatistiken.
- **995:** Mittelwert und Standardabweichung werden gespeichert.
- **996:** Median bleibt Management-Hauptwert.
- **997:** Statistische/technische Qualitätsprüfung vor `COMPLETED`.
- **998:** Nicht bestandene Qualitätsprüfung verhindert normale Ergebnisveröffentlichung.

**Run-Lifecycle:** `CREATED → RUNNING → COMPLETED / CANCELLED / FAILED / INCOMPLETE`

### 999–1023 — Export & Reporting
- **999:** Simulationsergebnis ist exportierbar.
- **1000:** PDF-Managementexport.
- **1001:** Excel-/Tabellenexport.
- **1002:** CSV-Export.
- **1003:** Export enthält Szenario, Version und Run.
- **1004:** Simulationszeitraum wird exportiert.
- **1005:** Monte-Carlo-Run-Anzahl wird exportiert.
- **1006:** Seed und Modellversion sind im technischen Exportbereich nachvollziehbar.
- **1007:** Seed-Details nicht standardmäßig im Management-PDF.
- **1008:** Historische Baseline und Simulation getrennt im Bericht.
- **1009:** Ziele und Zielerreichungswahrscheinlichkeiten im Bericht.
- **1010:** Risiken und Bottlenecks im Bericht.
- **1011:** Wichtige Ursache-Wirkungs-Ketten im Bericht.
- **1012:** Keine automatischen strategischen Entscheidungen durch den Bericht.
- **1013:** Regelbasierte Management-Hinweise sind zulässig.
- **1014:** Maßnahmen werden im Bericht dargestellt.
- **1015:** Geplante und ausgeführte Maßnahmen werden unterschieden.
- **1016:** Vollständige Event-Historie nicht im Managementexport.
- **1017:** Separater technischer Audit-Export.
- **1018:** Audit-Export enthält Events, Seeds, Parameter und Versionen.
- **1019:** Audit-Export ist weniger prominent als Managementexport.
- **1020:** Export enthält Erstellungszeitpunkt.
- **1021:** Export besitzt eindeutige Export-ID.
- **1022:** Exporte sind immutable Momentaufnahmen.
- **1023:** Export bleibt bis zum ursprünglichen Ergebnis rückverfolgbar.

### 1024–1048 — Benutzer, Rechte & Datenschutz
- **1024:** Benutzer- und Systemdaten werden getrennt.
- **1025:** Szenarien können einem Benutzer gehören.
- **1026:** V1 bleibt Single User; Mehrbenutzerfähigkeit wird vorbereitet.
- **1027:** Szenario besitzt Owner.
- **1028:** Späteres Sharing wird vorbereitet.
- **1029:** Keine komplexen Rollen in V1.
- **1030:** Internes Berechtigungskonzept wird vorbereitet.
- **1031:** Lesen und Bearbeiten können getrennt werden.
- **1032:** Szenarien können gegen versehentliche Änderungen gesperrt werden.
- **1033:** Historische Ergebnisse bleiben unveränderlich.
- **1034:** Gesperrte Szenarien können dupliziert werden.
- **1035:** Read-only-Modus.
- **1036:** Read-only erlaubt keine Simulationen/Zustandsänderungen.
- **1037:** Leseberechtigte Nutzer können Exporte erzeugen.
- **1038:** Fremde Szenarien sind nicht standardmäßig sichtbar.
- **1039:** Explizites Sharing wird vorbereitet.
- **1040:** Read-only-Sharing wird unterstützt.
- **1041:** Bearbeitungs-Sharing wird vorbereitet.
- **1042:** Szenarioänderungen können Benutzern zugeordnet werden.
- **1043:** Maßnahmen können Benutzern zugeordnet werden.
- **1044:** Simulationslauf speichert Starter/Owner.
- **1045:** Export speichert Ersteller.
- **1046:** Keine personenbezogenen Kundendaten in V1.
- **1047:** `customerId` ist technische, nicht personenbezogene ID.
- **1048:** Simulation funktioniert ohne reale Kundendaten.

### 1049–1073 — Technische Grundarchitektur
- **1049:** Web-App.
- **1050:** Frontend und Simulationskern logisch getrennt.
- **1051:** Simulationskern unabhängig vom Dashboard testbar.
- **1052:** Reproduzierbare/pure Simulation Engine.
- **1053:** UI greift nicht direkt auf interne Simulationsobjekte zu.
- **1054:** Trennung von Simulation Engine, State/Storage, Analytics und UI.
- **1055:** Analytics verändert Rohdaten nicht.
- **1056:** Simulation ruft keine UI-Komponenten auf.
- **1057:** UI startet Simulation über definierten Service.
- **1058:** Service kapselt Schnell- und Detail-Simulation.
- **1059:** Web Worker wird hinter Simulation Service abstrahiert.
- **1060:** Architektur bleibt für serverseitige Simulation offen.
- **1061:** V1 rechnet primär clientseitig.
- **1062:** V1 kann ohne Backend funktionieren.
- **1063:** Backend kann später ergänzt werden, ohne Engine neu zu schreiben.
- **1064:** Storage über Abstraktionsschicht.
- **1065:** V1 primär lokale Speicherung.
- **1066:** Local Storage nicht für große Simulationsergebnisse.
- **1067:** IndexedDB als primärer V1-Datenspeicher.
- **1068:** Offline-Fähigkeit.
- **1069:** PWA wird vorbereitet.
- **1070:** Keine vollständige Cloud-Synchronisation in V1.
- **1071:** Storage-Schicht bleibt cloudfähig.
- **1072:** Engine läuft ohne Browser-DOM.
- **1073:** Komponenten werden lose gekoppelt und austauschbar gehalten.

**Architekturfluss:** `UI → Simulation Service → Simulation Engine → State / Events`
Parallel: `State / Events → Analytics → Dashboard / Reports`
Storage: `Storage Abstraction → IndexedDB V1 → später optional Backend / Cloud`

### 1074–1098 — Frontend-Stack & Projektstruktur
- **1074:** Single-Page-Web-App.
- **1075:** Komponentenbasiertes Frontend-Framework.
- **1076:** React.
- **1077:** React bleibt auf UI fokussiert.
- **1078:** TypeScript.
- **1079:** Simulation Engine ebenfalls TypeScript.
- **1080:** Vite.
- **1081:** Keine klassische Multi-Page-Anwendung.
- **1082:** Router für SPA-Navigation.
- **1083:** Eigene Routen für Hauptbereiche.
- **1084:** Engine in eigenem Modul/Verzeichnis.
- **1085:** Domain-Modell getrennt vom UI.
- **1086:** Eigenes Analytics-Modul.
- **1087:** Eigenes Storage-/IndexedDB-Modul.
- **1088:** Eigenes Export-Modul.
- **1089:** Eigenes Validierungsmodul.
- **1090:** Eigenes Fehler-/Diagnosemodul.
- **1091:** Zentraler UI-State für globale Zustände.
- **1092:** Vollständige Simulationshistorie nicht im UI-Store.
- **1093:** Formularzustand lokal.
- **1094:** Szenario-Editor persistiert erst beim Speichern.
- **1095:** Ungespeicherte Änderungen werden sichtbar angezeigt.
- **1096:** Verlassen mit ungespeicherten Änderungen erzeugt Warnung.
- **1097:** Verständliche Inline-Validierungsfehler.
- **1098:** Unit-, Integration- und E2E-Tests sind vorgesehen.

### 1099–1123 — Teststrategie & Qualitätssicherung
- **1099:** Zentrale Simulationsfunktionen erhalten Unit-Tests.
- **1100:** Gleicher Input + gleicher Seed → gleiches Ergebnis.
- **1101:** Reproduzierbarkeit wird automatisch getestet.
- **1102:** Golden Runs als Regressionstests.
- **1103:** Golden Runs werden automatisch geprüft.
- **1104:** Modelländerung darf Golden Runs verändern, aber nur dokumentiert.
- **1105:** Jede Modellversion besitzt eigenen Regressionstest-Satz.
- **1106:** Event-Reihenfolge wird getestet.
- **1107:** Kundenverarbeitungsreihenfolge wird auf deterministische Konsistenz geprüft.
- **1108:** Unrealistische Werte werden automatisch validiert.
- **1109:** Harte Invarianten können einen Lauf fehlschlagen lassen.
- **1110:** Ein fehlerhafter Kunde darf nicht stillschweigend ignoriert werden.
- **1111:** Fehlerhafte Runs werden nicht aus der Verteilung entfernt.
- **1112:** Fehler in einem Run markiert den Simulationsjob als fehlerhaft.
- **1113:** Property-Based-Tests für zentrale Regeln.
- **1114:** Health bleibt in 0–100.
- **1115:** ARR = MRR × 12.
- **1116:** Churned Customer besitzt keinen aktiven MRR.
- **1117:** Aktiver Sales-Vorgang wird nicht preempted.
- **1118:** Historische Ebene A bleibt unverändert.
- **1119:** Ergebnis referenziert existierende Szenarioversion.
- **1120:** Events bleiben immutable.
- **1121:** Integrationstests für komplette Prozessketten.
- **1122:** E2E-Tests für zentrale Nutzerabläufe.
- **1123:** Zentrale Simulationstestfehler blockieren Release.

**Qualitätsebenen:** `Unit → Integration → Simulation Regression → Invarianten → E2E`

### 1124–1148 — Fehlerbehandlung & Nutzerkommunikation
- **1124:** Fachliche und technische Fehler werden getrennt.
- **1125:** Fachliche Validierungsfehler erscheinen am betroffenen Feld.
- **1126:** Zusätzlich zusammenfassende Fehlerübersicht.
- **1127:** Ungültige Konfiguration blockiert Simulation.
- **1128:** Warnungen und blockierende Fehler werden unterschieden.
- **1129:** Ungewöhnliche, aber zulässige Konfiguration erzeugt Warnung.
- **1130:** Warnungen können bewusst bestätigt werden.
- **1131:** Technischer Fehler erhält verständliche Nutzerbeschreibung.
- **1132:** Technische Details sind optional zugänglich.
- **1133:** Technischer Fehler besitzt Fehler-ID.
- **1134:** Fehler-ID wird mit `runId` und Modellversion gespeichert.
- **1135:** Keine automatische Übertragung technischer Fehler an externe Dienste in V1.
- **1136:** Lokale Fehlerlogs.
- **1137:** Fehlerdiagnose kann exportiert werden.
- **1138:** Fehler erzeugt nicht automatisch einen neuen Lauf.
- **1139:** Manueller Retry möglich.
- **1140:** Retry verwendet standardmäßig gleiche Konfiguration/Modellversion.
- **1141:** Retry darf nach Fehlerkorrektur geänderte Konfiguration verwenden.
- **1142:** Geänderte Konfiguration erzeugt neuen Run.
- **1143:** Fortsetzung desselben Jobs kann `runId` behalten.
- **1144:** Letztes gültiges Ergebnis bleibt bei neuem Fehler erhalten.
- **1145:** Fallback-Ergebnis wird eindeutig als nicht aus dem fehlerhaften Lauf stammend gekennzeichnet.
- **1146:** Anzeige-Fallback auf letzten erfolgreichen Stand ist zulässig.
- **1147:** Fehler verändert historische Daten nicht.
- **1148:** Kritische technische Fehler können weitere Simulation blockieren.

### 1149–1173 — Performance & Monte-Carlo-Ausführung
- **1149:** Run-Anzahl hängt vom Simulationsmodus ab.
- **1150:** Schnell-Simulation verwendet deutlich weniger Runs.
- **1151:** Detail-Simulation verwendet deutlich mehr Runs.
- **1152:** Run-Anzahl zentral konfiguriert.
- **1153:** Freie Run-Anzahl in V1 nicht als Nutzerhebel.
- **1154:** Simulationsqualitäten: Schnell / Standard / Hochpräzise.
- **1155:** V1 maximal drei Qualitätsstufen.
- **1156:** Run-Anzahl je Qualität wird angezeigt.
- **1157:** Keine automatische Qualitätsreduktion wegen Laufzeit.
- **1158:** Warnung bei erwartbar langer Laufzeit.
- **1159:** Simulation läuft in Batches.
- **1160:** UI-Thread wird zwischen Batches entlastet.
- **1161:** Web Worker.
- **1162:** Worker besitzt Input-/Output-Vertrag.
- **1163:** Worker greift nicht direkt auf IndexedDB zu.
- **1164:** Worker greift nicht auf React-State zu.
- **1165:** Fortschritt basiert auf abgeschlossenen Runs.
- **1166:** Keine vorläufigen KPI-Ergebnisse in V1.
- **1167:** Laufende Simulation kann abgebrochen werden.
- **1168:** Cancellation wird zwischen Batches geprüft.
- **1169:** Bereits berechnete Runs bleiben erhalten.
- **1170:** Große Rohdaten werden bei Bedarf geladen.
- **1171:** Dashboard lädt primär aggregierte Projektionen.
- **1172:** Analytics kann in Worker/Background ausgelagert werden.
- **1173:** Performanceoptimierung darf Genauigkeit/Reproduzierbarkeit nicht stillschweigend reduzieren.

### 1174–1198 — UI/UX
- **1174:** Einheitliches LeadPilot-Designsystem.
- **1175:** Das vorhandene LeadPilot-Designsystem ist zentrale Design-/UI-Referenz; kein paralleles neues Designsystem.
- **1176:** Designsystem und fachliche semantische Datenfarben werden getrennt gedacht.
- **1177:** Semantische Zustandsfarben für positiv/negativ/Warnung.
- **1178:** Farbe allein vermittelt keine Bedeutung.
- **1179:** Responsive Web-App.
- **1180:** Desktop/Laptop als V1-Hauptziel.
- **1181:** Mobile besitzt in V1 nicht zwingend denselben vollständigen Funktionsumfang.
- **1182:** Navigation wird auf kleinen Displays kompakter.
- **1183:** V1 nutzt das bestehende Dark Theme.
- **1184:** Kein automatisch wechselndes Light/System-Theme in V1.
- **1185:** Kein frei wählbarer Light Mode in V1.
- **1186:** Einheitliches Card-/Panel-System.
- **1187:** Eine zentrale Aussage pro Karte, soweit sinnvoll.
- **1188:** Progressive Detailstufen.
- **1189:** Technische Begriffe werden aus der Management-Hauptansicht weitgehend herausgehalten.
- **1190:** Technische Informationen bleiben in Detail-/Auditansichten zugänglich.
- **1191:** Diagramme erhalten verständlichen Titel und kurze Interpretation.
- **1192:** Interpretation kann regelbasiert automatisch erzeugt werden.
- **1193:** Automatische Interpretation bleibt auf Daten zurückführbar.
- **1194:** Charts können absolute und prozentuale Perspektiven anbieten.
- **1195:** Probabilistische Charts zeigen Unsicherheit.
- **1196:** Historische Daten und Simulation sind visuell unterscheidbar.
- **1197:** Hover/Tooltip für Detailwerte.
- **1198:** Animation nur dort, wo sie Verständnis oder Statuskommunikation verbessert.

### 1199–1223 — Bestehendes LeadPilot-Designsystem
**Grundsatz:** Das vorhandene Designsystem wird verwendet, nicht ersetzt.
- **1199:** Designsystem ist für die gesamte Webapp verbindlich.
- **1200:** Vor Implementierung werden vorhandene Tokens/Komponenten geprüft.
- **1201:** Vorhandene Komponenten werden direkt wiederverwendet, sofern technisch möglich.
- **1202:** Fehlende Komponenten werden vor Neubau identifiziert und dokumentiert.
- **1203:** Neue Komponenten kommen nur bei absehbarer Wiederverwendung ins zentrale System.
- **1204:** Einmalige simulationsspezifische Komponenten dürfen zunächst lokal bleiben.
- **1205:** Keine parallelen semantischen Farben, wenn passende Designsystem-Tokens existieren.
- **1206:** Fehlende semantische Tokens werden systemkonform ergänzt.
- **1207:** Historisch-vs.-simuliert-Unterscheidung nutzt das bestehende System.
- **1208:** Unterscheidung wird zusätzlich über Labels/Typografie vermittelt.
- **1209:** Charts folgen der visuellen Sprache des Designsystems.
- **1210:** Vor eigener Chart-Sprache werden vorhandene Regeln geprüft.
- **1211:** Neue Chart-Palette nur bei tatsächlichem Bedarf.
- **1212:** Bestehendes Spacing-System für Dashboard-Grids/KPI-Karten.
- **1213:** Bestehendes Typografie-System für KPI-/Managementzahlen.
- **1214:** Navigation folgt Designsystem.
- **1215:** Dark Mode bleibt an vorhandene Designsystem-Unterstützung gebunden.
- **1216:** Responsive Umsetzung folgt vorhandenen Designsystem-Breakpoints, soweit vorhanden.
- **1217:** Fehlende Breakpoints werden systemkonform ergänzt.
- **1218:** Accessibility wird von Anfang an berücksichtigt.
- **1219:** Semantisches HTML und Tastaturbedienung.
- **1220:** Kontrastprüfung gehört zur UI-Qualitätssicherung.
- **1221:** Visuelle Regressionstests für wichtige UI-Komponenten.
- **1222:** Designsystem selbst wird versioniert.
- **1223:** Exporte/Screenshots sollen die verwendete Designsystem-Version nachvollziehbar machen können.

## A11. Entscheidungen 1224–1248 — Dashboard-KPI- und Simulations-UI

### 1224 — KPI-Karten
**Entscheidung:** D — KPI-Karten zeigen aktuellen Wert, Veränderung gegenüber der Ausgangsbasis, Zielwert und P10–P90-Unsicherheitsbereich. Historische und simulierte Werte bleiben klar getrennt.

### 1225 — Darstellung der Unsicherheit
**Entscheidung:** D — Kompakte Range-/Whisker-Anzeige; detaillierte Verteilungen bei Hover/Klick.

### 1226 — KPI-Priorisierung
**Entscheidung:** D — Feste Kern-KPIs plus dynamischer Bereich für aktuell relevante KPIs und Risiken.

### 1227 — Stabile Kern-KPI-Reihenfolge
**Entscheidung:** JA — Die oberste KPI-Reihe bleibt über Ansichten und Szenarien möglichst stabil.

### 1228 — Hervorhebung kritischer KPIs
**Entscheidung:** JA — Subtile Hervorhebung ohne kompletten Kartenumbau.

### 1229 — KPI-Drill-down
**Entscheidung:** JA — KPI-Karten sind anklickbar und führen zur Detailanalyse.

### 1230 — Historie und Simulation im Drill-down
**Entscheidung:** JA, klar getrennt — gemeinsame Analyse erlaubt, eindeutig getrennte Darstellung.

### 1231 — Herkunft simulierter KPIs
**Entscheidung:** JA — Szenario und Run müssen in der Detailansicht nachvollziehbar sein.

### 1232 — Technische IDs auf KPI-Karten
**Entscheidung:** NEIN — `runId` etc. gehören in Detail-/Auditansichten.

### 1233 — Aktives Szenario
**Entscheidung:** JA — global sichtbar.

### 1234 — Globaler Simulationsstatus
**Entscheidung:** JA — laufend, pausiert und abgeschlossen eindeutig dargestellt.

### 1235 — Zentrale Simulation Control Area
**Entscheidung:** JA — unabhängig vom geöffneten Analysebereich erreichbar.

### 1236 — Kompakte Steuerungsfläche
**Entscheidung:** JA — im Normalzustand kompakt, bei Bedarf erweiterbar.

### 1237 — Simulationstempo
**Entscheidung:** JA — 1× / 2× / 5× / 10× über die zentrale Control Area steuerbar.

### 1238 — Start/Pause/Reset
**Entscheidung:** JA — klar voneinander getrennt.

### 1239 — Bestätigung beim Simulations-Reset
**Entscheidung:** JA — Zurücksetzen des Simulationszustands verlangt deutliche Bestätigung.

### 1240 — Parameter-Reset
**Entscheidung:** JA — funktional und visuell getrennt von „Simulation zurücksetzen“.

### 1241 — Szenarioänderungen
**Entscheidung:** JA — aktives Szenario zeigt gespeichert / ungespeichert an.

### 1242 — Historisch + simuliert
**Entscheidung:** JA, bei eindeutiger Trennung — keine verschmolzene gemeinsame Zahl.

### 1243 — Historie als Referenz, Simulation als Prognose
**Entscheidung:** JA — Simulationsergebnisse werden als Prognose gekennzeichnet.

### 1244 — Ebenenumschaltung
**Entscheidung:** JA — Wechsel zwischen Historisch, Simulation und Ziel, wo fachlich sinnvoll.

### 1245 — Empty States
**Entscheidung:** JA — erklärender Empty State statt leerem Diagramm.

### 1246 — Anzeige während laufender Simulation
**Entscheidung:** JA — primär Fortschritt; vorläufige KPI-Ergebnisse nicht als final.

### 1247 — Ergebnis nach erfolgreichem Lauf
**Entscheidung:** JA — Ergebnisansicht wird automatisch aktualisiert.

### 1248 — Fehlerhafter Lauf
**Entscheidung:** JA — letztes gültiges Ergebnis bleibt sichtbar; Fehler separat.

**Übergeordnete UI-Regel:** Informationshierarchie **Management → Analyse → Technik**. Historische Realität, Simulation und Ziele werden visuell und semantisch unterscheidbar dargestellt.

## A12. Entscheidungen 1249–1273 — KPI-Architektur und Management-Erklärungen

### 1249 — Feste Anzahl zentraler KPI-Karten
**Entscheidung:** JA

### 1250 — Anzahl der Kern-KPIs
**Entscheidung:** A – 4

### 1251 — Kern-KPIs
**Entscheidung:** A – ARR, MRR, Kunden, Cash

### 1252 — EBITDA
**Entscheidung:** JA — prominent verfügbar, aber im dynamischen KPI-/Financial-Bereich.

### 1253 — Pipeline Value
**Entscheidung:** JA — wichtig für Funnel- und Sales-Analysen.

### 1254 — Churn
**Entscheidung:** JA — eigener wichtiger KPI, prominent.

### 1255 — Burn und Runway
**Entscheidung:** JA — gemeinsam als Liquiditätsinformationen.

### 1256 — KPI-Einheit
**Entscheidung:** JA — jede KPI-Karte zeigt ihre Einheit eindeutig.

### 1257 — Veränderung gegenüber Startbasis
**Entscheidung:** JA — absolut und relativ verfügbar; Details im Drill-down.

### 1258 — Zielabstand
**Entscheidung:** JA — KPI-Karten zeigen den Abstand zum Ziel.

### 1259 — Zielerreichungswahrscheinlichkeit
**Entscheidung:** JA, aber kompakt — Details im Drill-down.

### 1260 — P10/P90
**Entscheidung:** JA — unabhängig von der Höhe der Zielerreichungswahrscheinlichkeit.

### 1261 — Semantik einer Veränderung
**Entscheidung:** JA — KPI-spezifisch positiv/negativ.

### 1262 — Semantische Farben
**Entscheidung:** JA — bestehende LeadPilot-Semantik verwenden.

### 1263 — Farbe nicht als einziges Signal
**Entscheidung:** JA — zusätzlich Icon, Label oder Text.

### 1264 — Sortierung dynamischer KPIs
**Entscheidung:** JA — transparente Management-Relevanzregeln.

### 1265 — Relevanzfaktoren
**Entscheidung:** JA — Zielabweichung, Veränderung, Risiko, Unsicherheit, Einfluss auf andere KPIs.

### 1266 — Erklärbarkeit der Priorisierung
**Entscheidung:** JA — Hervorhebungen müssen begründbar sein.

### 1267 — KPI-Treiber
**Entscheidung:** JA — Drill-down zeigt die wichtigsten Treiber.

### 1268 — Hierarchische Treiber
**Entscheidung:** JA — Ursache-Wirkungs-Ketten.

### 1269 — Top-3-Treiber
**Entscheidung:** JA — Managementansicht zeigt zunächst drei Treiber.

### 1270 — Vollständige Treiberliste
**Entscheidung:** JA — weitere Treiber aufklappbar.

### 1271 — Treiber → Events
**Entscheidung:** JA — Treiber bis zu den Simulation Events zurückverfolgbar.

### 1272 — Treibervergleich zwischen Szenarien
**Entscheidung:** JA — Szenariovergleich erklärt Ergebnis- und Treiberunterschiede.

### 1273 — Automatische Management-Erklärung
**Entscheidung:** JA — regelbasiert, datenbasiert, auf die tatsächlichen Simulationsergebnisse zurückführbar.

**Übergeordnete Kette:** `KPI → Ziel → Unsicherheit → Treiber → Ursache-Wirkung → Event → Management-Erklärung`

## A13. Entscheidungen 1274–1298 — KPI-Detailanalyse, Zeitreihen und Monte-Carlo-Analyse [IMPLEMENTIERT (AUFTRAG 018)]

### 1274 — Eigene KPI-Detailseite
**Entscheidung:** JA — vollständige Analyse-Seite, nicht nur aufgeklapptes Dashboard-Element.

### 1275 — KPI-Zusammenfassung im Drill-down
**Entscheidung:** JA — Detailseite zeigt oben weiterhin die wichtigste Zusammenfassung.

### 1276 — Standard-Zeitraum
**Entscheidung:** JA — Zeitreihe zeigt standardmäßig den gesamten Simulationszeitraum.

### 1277 — Zeitraum einschränken
**Entscheidung:** JA — Nutzer kann den betrachteten Zeitraum einschränken.

### 1278 — Historie und Simulation im Zeitreihen-Chart
**Entscheidung:** JA, klar getrennt.

### 1279 — Ende historischer Daten
**Entscheidung:** JA — historische Linie reicht nur bis zum tatsächlichen Ende, keine künstliche Verlängerung.

### 1280 — Übergang Historie → Simulation
**Entscheidung:** JA — Simulation darf sichtbar anschließen.

### 1281 — Simulations-Baseline
**Entscheidung:** JA — Startpunkt/Baseline wird im Chart explizit markiert.

### 1282 — Zielwert im Chart
**Entscheidung:** JA — als eigene Linie oder Zielmarke.

### 1283 — Zielpfad
**Entscheidung:** JA — zeitabhängige Ziele als Zielpfad statt nur horizontaler Ziellinie.

### 1284 — P10/P90 im Zeitreihen-Chart
**Entscheidung:** JA — als Unsicherheitsband.

### 1285 — Visuelle Gewichtung des Unsicherheitsbands
**Entscheidung:** JA — dezent, damit Medianlinie und Zielpfad klar bleiben.

### 1286 — Umschalten statistischer Hauptkennzahlen
**Entscheidung:** NEIN — Median bleibt verbindlicher Management-Hauptwert.

### 1287 — Mittelwert in der Detailanalyse
**Entscheidung:** JA — in der analytischen Detailansicht verfügbar.

### 1288 — Monte-Carlo-Verteilung
**Entscheidung:** JA — Detailansicht zeigt neben Zeitreihe auch die Verteilung.

### 1289 — Histogramm
**Entscheidung:** JA — Standarddarstellung der Monte-Carlo-Verteilung.

### 1290 — P10/Median/P90 in der Verteilung
**Entscheidung:** JA — direkt in der Verteilung markiert.

### 1291 — Einzelne Runs untersuchen
**Entscheidung:** JA.

### 1292 — Run-Detailansicht
**Entscheidung:** JA — ein einzelner Run kann in seiner Entwicklung analysiert werden.

### 1293 — Szenario-/Versionsinformationen eines Runs
**Entscheidung:** JA — in der technischen Detailansicht.

### 1294 — Run-Liste im Management-Dashboard
**Entscheidung:** NEIN — gehört in die Analyse-/Audit-Ebene.

### 1295 — „Warum?“ / Treiber
**Entscheidung:** JA — klarer Bereich für Ursachen und Treiber.

### 1296 — Top-3-Treiber
**Entscheidung:** JA.

### 1297 — Quantifizierung der Treiber
**Entscheidung:** JA — sofern die Wirkung messbar ist.

### 1298 — Navigation von Treibern zu Ursachen/Events
**Entscheidung:** JA.

**Übergeordnete Kette:** `KPI-Zusammenfassung → Zeitreihe → Ziel → Unsicherheit → Monte-Carlo-Verteilung → Treiber → Faktoren/Events` — bei durchgehender Trennung **Ebene A ≠ Ebene B**.

## A14. Entscheidungen 1299–1323 — KPI-Zeitreihen, Zielsemantik und statistische Aussagekraft [IMPLEMENTIERT (AUFTRAG 018)]

### 1299 — Standarddarstellung der KPI-Zeitreihe
**Entscheidung:** JA — Median sowie P10–P90, nicht die einzelnen Runs.

### 1300 — Einzelne Runs einblenden
**Entscheidung:** JA — optional in der Analyseansicht.

### 1301 — Begrenzung sichtbarer Einzel-Runs
**Entscheidung:** JA — zunächst maximal 5.

### 1302 — Run-Auswahl
**Entscheidung:** JA — über Run-Selektor bzw. Run-ID.

### 1303 — Kennzeichnung einzelner Runs
**Entscheidung:** JA — eindeutig von Median und P10–P90 getrennt.

### 1304 — Absolute Werte vs. Baseline-Veränderung
**Entscheidung:** JA — umschaltbar in der Analyseansicht.

### 1305 — Prozentuale Veränderung
**Entscheidung:** JA — zusätzlich verfügbar.

### 1306 — Darstellungsumschaltung
**Entscheidung:** JA — verändert nur die Darstellung, nicht die Daten.

### 1307 — Baseline-Kennzeichnung
**Entscheidung:** JA — auch in Veränderungsdarstellungen eindeutig erkennbar.

### 1308 — Monats-/Jahresdarstellung
**Entscheidung:** JA — bei Finanz-KPIs, sofern fachlich sinnvoll.

### 1309 — ARR-Berechnung
**Entscheidung:** JA — ARR weiterhin ausschließlich aus MRR × 12.

### 1310 — KPI-Zielrichtung
**Entscheidung:** JA — UI berücksichtigt automatisch die fachliche Zielrichtung (z. B. Churn: niedriger ist besser).

### 1311 — Zentrale KPI-Semantik
**Entscheidung:** JA — Zielrichtung und Semantik zentral im KPI-Modell, nicht in UI-Komponenten dupliziert.

### 1312 — KPI ohne Ziel
**Entscheidung:** JA — kann normal dargestellt werden.

### 1313 — Keine künstliche Zielwahrscheinlichkeit
**Entscheidung:** JA — KPI ohne Ziel erhält keine künstliche Zielerreichungswahrscheinlichkeit.

### 1314 — Zeitabhängige Zielerreichung
**Entscheidung:** JA.

### 1315 — Aktuell erreicht vs. am Zieltermin erreicht
**Entscheidung:** JA — beide werden unterschieden.

### 1316 — Dynamischer Zielstatus
**Entscheidung:** JA — ein erreichtes Ziel kann später wieder als gefährdet gelten.

### 1317 — Schwellenwerte für Zielstatus
**Entscheidung:** JA — feste, dokumentierte Schwellen.

### 1318 — Zentrale Schwellenwerte
**Entscheidung:** JA — zentral definiert.

### 1319 — Nutzerkonfiguration der Schwellen
**Entscheidung:** NEIN — in V1 keine frei konfigurierbaren Nutzerparameter.

### 1320 — Erklärung des Zielstatus
**Entscheidung:** JA — Detailansicht zeigt, welche Schwelle zum Zielstatus geführt hat.

### 1321 — Aggregierte Zielbewertung
**Entscheidung:** JA — aus der aggregierten statistischen Betrachtung, nicht aus einem einzelnen Run.

### 1322 — Statistische Aussagekraft
**Entscheidung:** JA — bei geringer Run-Anzahl transparent gekennzeichnet.

### 1323 — Ergebnisse trotz eingeschränkter Aussagekraft
**Entscheidung:** JA — werden angezeigt, aber mit deutlichem Hinweis.

**Übergeordnete Regel:** `Darstellung → Statistik → Zielsemantik → Zielstatus`. Median bleibt Management-Hauptwert.

## A15. Entscheidungen 1324–1348 — Versionierung, Reproduzierbarkeit und Simulation Clock

### 1324 — Schema-Version
**Entscheidung:** JA — jede Simulation speichert Modell- **und** Schema-Version.

### 1325 — Schema-Kompatibilitätsprüfung
**Entscheidung:** JA — Run wird beim Laden gegen seine Schema-Version geprüft.

### 1326 — Alte Runs
**Entscheidung:** JA, Read-only — dürfen weiterhin angezeigt werden.

### 1327 — Migration vor erneuter Berechnung
**Entscheidung:** JA — veralteter Run muss vor Neuberechnung migriert werden.

### 1328 — Migration protokollieren
**Entscheidung:** JA — vollständig protokolliert.

### 1329 — Originaldaten erhalten
**Entscheidung:** JA — Migration erzeugt eine neue Version, überschreibt nicht.

### 1330 — Original vs. migriert
**Entscheidung:** JA — eindeutig unterschieden.

### 1331 — Rückverweis auf Original
**Entscheidung:** JA — migrierter Run verweist auf ursprünglichen Seed und ursprüngliche Parameter.

### 1332 — Nicht reproduzierbare Runs
**Entscheidung:** JA — ausdrücklich als „nicht reproduzierbar“ gekennzeichnet.

### 1333 — Historische Nutzung
**Entscheidung:** JA, aber nicht als aktuelle Prognose.

### 1334 — Run-Typ
**Entscheidung:** JA — z. B. `BASELINE`, `SCENARIO`, `REPRODUCTION`, `MIGRATION`.

### 1335 — Reproduktion als eigener Run
**Entscheidung:** JA — ersetzt den Original-Run nicht.

### 1336 — Simulation Run vs. Analyse Run
**Entscheidung:** JA, konzeptionell vorbereiten.

### 1337 — Determinismus und Zufall
**Entscheidung:** JA — deterministische Berechnungen und Zufallsprozesse strikt getrennt.

### 1338 — Pure Simulationsfunktionen
**Entscheidung:** JA — möglichst pure / side-effect-free.

### 1339 — State nicht direkt aus UI
**Entscheidung:** JA.

### 1340 — State-Änderungen über Commands/Services
**Entscheidung:** JA.

### 1341 — Read-only Snapshot während Run
**Entscheidung:** JA.

### 1342 — Interne Zeiteinheit
**Entscheidung:** JA — Monat als zentrale Zeiteinheit; UI kann Quartal/Jahr aggregieren.

### 1343 — Tagesgenauigkeit
**Entscheidung:** JA — zeitabhängige Prozesse unterstützen Tagesgenauigkeit.

### 1344 — Simulation Clock
**Entscheidung:** JA — zentrale Clock für den aktuellen simulierten Tag/Monat.

### 1345 — UI-Zugriff auf Clock
**Entscheidung:** NEIN — nicht direkt von UI-Komponenten veränderbar.

### 1346 — Explizites Startdatum
**Entscheidung:** JA — jeder Run beginnt mit exakt definiertem Startdatum.

### 1347 — Baseline-Zeitraum 2026
**Entscheidung:** JA — Basisjahr 2026 als eigener Baseline-Zeitraum mit Start-/Enddatum.

### 1348 — Mehrjährige Simulation
**Entscheidung:** JA — Zeitarchitektur von Beginn an mehrjahresfähig.

## A16. Entscheidungen 1349–1398 — Tick/Event, Sales Queue und Customer Success

### 1349–1373 — Simulation Tick und Sales
- **1349:** Simulation Clock besitzt Tick-Nummer.
- **1350:** Tick ist deterministisch aus vorherigem State, Parametern und RNG-State ableitbar.
- **1351:** Ein Tick kann mehrere Events erzeugen.
- **1352:** Event-Reihenfolge innerhalb eines Ticks ist deterministisch.
- **1353:** Pro Tick wird der bisherige State als Berechnungsbasis eingefroren.
- **1354:** Innerhalb eines Ticks erzeugte Folge-Events wirken erst im nächsten Berechnungsschritt.
- **1355:** Keine künstliche vollständige Lead→Won-Kette innerhalb eines einzelnen Ticks.
- **1356:** Definierte Event-Prioritätsklassen.
- **1357:** Prioritätsreihenfolge ist Bestandteil der Modellversion.
- **1358:** Fällige bestehende Vorgänge werden vor der Erzeugung neuer Vorgänge bearbeitet.
- **1359:** Neue Leads gelangen frühestens ab dem nächsten Tick in die Qualifizierungs-/Sales-Logik.
- **1360:** Zeitabhängige Vorgänge besitzen explizites `dueAt`/Fälligkeitsdatum.
- **1361:** `dueAt` führt bei fehlender Kapazität nicht automatisch zum Abschluss.
- **1362:** Fehlende Kapazität erzeugt Warteschlange bzw. Verzögerung.
- **1363:** Queue-/Waiting-Time wird messbar gespeichert.
- **1364:** Queue Time fließt in die Bottleneck-Analyse ein.
- **1365:** Sales Queue besitzt eine persistente Projektion.
- **1366:** Priorität wartender Vorgänge wird dynamisch neu berechnet.
- **1367:** Aktive Vorgänge werden nicht durch höher priorisierte Vorgänge verdrängt.
- **1368:** Nach Abschluss einer Bearbeitungsphase darf ein Vorgang neu priorisiert werden.
- **1369:** Bearbeitungsschritte eines Sales-Vorgangs werden nachvollziehbar dokumentiert.
- **1370:** Sales Cycle muss bis zu seinen zeitlichen Ursachen erklärbar sein.
- **1371:** Gesamt-Sales-Cycle und einzelne Zeitanteile werden gespeichert.
- **1372:** Analytics unterscheidet Prozesszeit von Kapazitätswartezeit.
- **1373:** Diese Unterscheidung wird in der Managementansicht als Ursache eines Sales-Cycle-Problems dargestellt.

### 1374–1398 — Customer Success
- **1374:** Customer Success erhält ein eigenes Workload-/Queue-Modell.
- **1375:** CS-Workload kann abhängig von Kundentyp, Paket, Nutzerzahl und Health variieren.
- **1376:** Customer Success besitzt eine priorisierte Warteschlange.
- **1377:** CS-Priorisierung berücksichtigt Health, Churn-Risiko, Kundenwert und Vorgangsalter.
- **1378:** Hohes Churn-Risiko kann die CS-Priorität erhöhen.
- **1379:** Customer Value darf die CS-Priorität erhöhen, aber nicht allein bestimmen.
- **1380:** CS-Priorität wird dynamisch neu berechnet.
- **1381:** Aktive CS-Vorgänge werden nicht preempted.
- **1382:** CS-Wartezeit und Bearbeitungszeit werden getrennt gespeichert.
- **1383:** Daraus wird eine CS Queue Time gebildet.
- **1384:** CS Queue Time darf in Customer-Health-/Churn-Logik einfließen.
- **1385:** Der Einfluss einzelner Verspätungen auf Churn ist begrenzt.
- **1386:** Customer Health wird auf einer Skala von 0–100 geführt.
- **1387:** Health wird durch mehrere Faktoren bestimmt.
- **1388:** Health-Faktoren: insbesondere Onboarding, Support-Erfahrung, Nutzung/Engagement, offene Probleme.
- **1389:** Sinkende Health erhöht das Churn-Risiko.
- **1390:** Churn-Risiko bleibt probabilistisch; kein einzelner Health-Schwellenwert löst automatisch Churn aus.
- **1391:** `CUSTOMER_CHURNED` markiert den Kunden dauerhaft als beendet.
- **1392:** Churned Kunden werden in V1 nicht automatisch reaktiviert.
- **1393:** Re-Engagement ist ein separater Prozess, keine Rückgängigmachung des Churn-Events.
- **1394:** Erfolgreiches Re-Engagement erzeugt einen neuen Deal-/Akquisitionsvorgang.
- **1395:** Der neue Vorgang referenziert den ursprünglichen Vorgang über `parentDealId` o. Ä.
- **1396:** Ursprüngliche Kunden-/Deal-Historie bleibt unverändert.
- **1397:** Analytics unterscheidet Churn-Ursachen nach Health-Problemen, CS-Kapazität und allgemeinem Churn-Niveau.
- **1398:** Daraus kann automatisch ein Customer-Success-Bottleneck bzw. Risikotreiber abgeleitet werden.

**Übergeordnete Kapazitätskette:** `Vorgang → Workload → Priorität → Queue → Kapazität → Wartezeit → Ergebnis`
**Customer Success ergänzt:** `CS-Kapazität → Wartezeit/Bearbeitung → Customer Health → Churn-Risiko → Churn`

## A17. Entscheidungen 1399–1448 — Quellenlücke

**Status:** NICHT REKONSTRUIERT. Zwischen dem Addendum 1349–1398 und dem Block
1449–1473 liegt in keiner Quelle ein belastbarer Einzeltext vor.

## A18. Entscheidungen 1449–1473 — State Machines, atomare Transitions und Analytics-Konsistenz

- **1449:** Jede fachliche State-Änderung erfolgt ausschließlich über eine definierte State Transition.
- **1450:** Jede Transition prüft anhand des aktuellen Zustands, ob sie fachlich zulässig ist.
- **1451:** Wichtige Entitäten (Leads, Deals, Kunden) verwenden explizite State Machines.
- **1452:** State Machines lassen ausschließlich fachlich erlaubte Übergänge zu.
- **1453:** Kein direkter Funnel-Sprung, z. B. `NEW` → `WON`.
- **1454:** Ein Deal kann nur bei erfüllten fachlichen Voraussetzungen `WON` werden.
- **1455:** Ein Kunde entsteht nur über einen gültigen fachlichen Übergang, insbesondere `DEAL_WON`.
- **1456:** `CUSTOMER_CHURNED` ist nur für einen aktuell aktiven Kunden zulässig.
- **1457:** Eine ungültige Transition erzeugt einen strukturierten Fehler, wird nicht stillschweigend ignoriert.
- **1458:** Fachlich ungültige Zustände und technische Verarbeitungsfehler werden getrennt behandelt.
- **1459:** Ein fachlich ungültiges Event wird fachlich abgewiesen und diagnostiziert, nicht als Engine-Crash.
- **1460:** Auch abgewiesene State Transitions bleiben im Audit nachvollziehbar.
- **1461:** Der vorherige gültige State bleibt bei einer fehlgeschlagenen Transition unverändert.
- **1462:** Eine fehlgeschlagene Transition darf keine teilweise veränderte State-Struktur hinterlassen.
- **1463:** Eine State Transition ist atomar: vollständig erfolgreich oder vollständig verworfen.
- **1464:** Die Event-Pipeline validiert zuerst die Transition und übernimmt erst danach den neuen State.
- **1465:** Der neue State wird erst nach erfolgreicher Transition für nachfolgende Analytics sichtbar.
- **1466:** Analytics dürfen niemals auf halb abgeschlossene State Transitions zugreifen.
- **1467:** Jeder abgeschlossene Tick erzeugt einen konsistenten State Snapshot.
- **1468:** Dieser Snapshot ist Grundlage für Dashboard- und KPI-Berechnungen des Ticks.
- **1469:** Analytics lesen den Simulations-State, verändern ihn aber niemals direkt.
- **1470:** Identischer State und identische Parameter liefern bei Analytics deterministisch dasselbe Ergebnis.
- **1471:** Nach jedem Tick können zentrale Simulations-Invarianten geprüft werden.
- **1472:** Ein Invariantenverstoß markiert den Run diagnostisch als fehlerhaft; keine stille Korrektur.
- **1473:** Zentrale Invarianten: u. a. `ARR = MRR × 12`, kein aktiver MRR nach Churn, gültige Funnel-Zustände.

**Übergeordnete Regel:** `Event → Validierung → atomare State Transition → konsistenter Snapshot → Analytics`

## A19. Entscheidungen 1474–1573 — Snapshots, Identitäten, Treiber, Szenariovergleich, Maßnahmen (konsolidiert)

> Für diesen Bereich liegt eine konsolidierte Zusammenfassung vor, keine
> nummerngenaue Einzelauflistung.

### Snapshots
- Jeder abgeschlossene Tick besitzt einen unveränderlichen Snapshot-Zeitpunkt.
- Snapshot ist eindeutig `runId` + `tickId` zugeordnet und speichert `simulationDay`.
- Snapshot enthält den vollständigen Simulations-State; zusätzlich existieren optimierte KPI-/Analytics-Projektionen.
- Dashboard arbeitet grundsätzlich mit Projektionen; vollständiger State dient Detailanalyse, Rekonstruktion und Debugging.
- Snapshot-Frequenz in V1 fest (zunächst je Tick); spätere Kompression/Intervalle werden unterstützt.
- Snapshots referenzieren Modell- und Schema-Version und werden nach Erstellung nicht verändert.
- Löschen alter Snapshots wird in V1 grundsätzlich vermieden; spätere technische Retention ist möglich, darf aber Fach-/Auditdaten nicht unbemerkt löschen.
- Snapshot kann aus der Event-Historie reproduziert werden; Abweichungen zwischen gespeichertem und rekonstruiertem Snapshot sind Integritätsfehler.

### Decision Support / Maßnahmen
- Ablauf: `Snapshot → Identität → Event/Audit → Treiber → Szenariovergleich → Maßnahme → Simulation`.
- `Parameter → Wirkung → KPI` kann dargestellt werden; eine Maßnahme kann mehrere Parameter ändern.
- Jede Maßnahme besitzt Startzeitpunkt; Enddatum und Ramp-up sind optional; Wirksamkeit beginnt erst ab Startzeitpunkt.
- Ausgeführte Maßnahmen werden unveränderlich dokumentiert; noch nicht ausgeführte dürfen verändert werden; ausgeführte nicht rückwirkend.
- Wirkungsvorschau kann KPIs, Risiken und Trade-offs simulieren; eine Maßnahme kann als eigenes Szenario simuliert werden, ohne das bestehende zu verändern.

**Decision-Support-Kreislauf:** `Beobachten → verstehen → Maßnahme definieren → simulieren → vergleichen → entscheiden`

## A20. Entscheidungen 1574–1673 — Command Layer, Baseline, Szenarioversionen und Persistenz (konsolidiert)

> Konsolidierte Zusammenfassung; keine nummerngenaue Einzelauflistung.

### 1574–1584 — Command/Application Layer
- Klarer Command Layer zwischen UI und Simulation Engine; Commands werden validiert und besitzen eindeutige IDs, optional Correlation IDs.
- Technische Command-Ausführung kann protokolliert werden; Command-Log und fachliche Event-Historie bleiben getrennt.
- Ein zentraler Application Service koordiniert Szenario, Parameter, Run und Engine.

### 1585–1600 — Schichten- und Modelltrennung
- Simulation Engine bleibt unabhängig von UI, React und Browser-APIs.
- Persistence erfolgt über Repository-/Storage-Interfaces.
- Domain Model, Persistence Model und View Model bleiben getrennt; Transformationen erfolgen explizit über Mapper/Adapter.

### 1601–1616 — CRM-Baseline
- CRM-Daten werden über Repository gekapselt und explizit als Baseline-Input in einen Run übernommen.
- Jeder Run erhält Input Snapshot bzw. Baseline-Version; CRM-Änderungen verändern bestehende Runs nicht.
- Neue Ausgangsdaten erzeugen eine neue Baseline-Version; die Baseline ist Bestandteil der Reproduzierbarkeit und wird beim Run-Start angezeigt.

### 1617–1625 — Run Manifest / Parameter
- Run speichert die verwendete Parameter-Version; ein unveränderliches Run Manifest enthält Reproduzierbarkeitsinformationen.
- Parameter werden während eines laufenden Runs nicht verändert; Änderungen erfolgen über Entwürfe und werden explizit als neuer Szenariostand angewendet.

### 1626–1636 — Szenario-Lifecycle
- Szenarioentwürfe besitzen Draft-Status; Szenarien können gespeichert und archiviert werden; historische Runs bleiben erhalten.
- Physisches Löschen von Szenarien wird in V1 vermieden.
- Szenario, Szenarioversion und Run sind eigenständige Objekte; jeder Run referenziert exakt eine Szenarioversion.

### 1637–1648 — Szenarioversionen / Diff [IMPLEMENTIERT (AUFTRAG 019)]
- Szenarioversionen können verglichen werden; Parameteränderungen werden als Diff dargestellt; der Diff kann zu betroffenen KPIs und Treibern führen.
- Versionen sind nach Run-Start unveränderlich; Änderungen erzeugen neue Versionen; frühere Versionen können als Ausgangspunkt kopiert werden.

### 1649–1660 — Version History / Audit
- Szenarien besitzen eine chronologische Version History; Versionen können einen technischen Actor referenzieren.
- Eine zentrale Audit Timeline unterscheidet Benutzeraktionen, Systemaktionen und Simulation Events.
- Auditdaten bleiben von der fachlichen immutable Event-Historie getrennt und unveränderlich.

### 1661–1673 — Archivierung / Integrität
- Wichtige Datenobjekte verwenden grundsätzlich Soft Delete bzw. Archivierung; physisches Löschen bleibt auf eindeutig technische, nicht revisionsrelevante Daten beschränkt.
- Referenzielle Integrität wird zwischen Companies, Contacts, Deals, Customers, Runs und Events sichergestellt.
- Fachlich atomare Operationen müssen auch persistenzseitig konsistent abgeschlossen werden; inkonsistente oder nur teilweise gespeicherte Ergebnisse dürfen nicht als erfolgreich gemeldet werden.

**Übergeordnete Architektur:** `UI → Commands → Application Services → Domain/Simulation Engine → Repository/Storage`
**Reproduzierbare Simulation:** `CRM-Baseline → Szenarioversion → Run Manifest → Run → Snapshots/Events → Analytics`
Historische Daten, Szenarioversionen und abgeschlossene Runs werden niemals stillschweigend durch spätere Änderungen überschrieben.

## A21. Entscheidungen 1674–1873 — nur thematisch referenziert

**Status:** NICHT REKONSTRUIERT. Ältere Stände (Linie D, `LEADPILOT_GAP_ANALYSIS.md`)
nennen einen Dokumentationsstand „bis 1873“. Der externe Code-Audit stellt jedoch
fest, dass für 1674–1873 **kein prüfbarer Einzelentscheidungstext** im
bereitgestellten Bestand vorliegt. Bis ein belastbarer Quelltext auftaucht, gilt
**1673** als letzte belastbare Nummer und **1674** als nächste freie Nummer.

---
---

# TEIL B — VERBINDLICHE ZIEL-ARCHITEKTUR

Das „Soll“, thematisch geordnet und von der Nummern-Historie entkoppelt. Bei
Widersprüchen zwischen Teil A und Teil B gilt Teil B als aktuell konsolidierte
Zielarchitektur.

## B1. Datenebenen A / B

**Ebene A – historische Unternehmensdaten**
- historische Referenz, READ ONLY
- niemals durch die Simulation verändern
- Datenquellen u. a. Geschäftsbericht 2025, Jahrescheckup 2025

**Ebene B – Simulation**
- eigene dynamische Daten, zukünftige Entwicklung
- durch Szenarien und Maßnahmen veränderbar
- überschreibt Ebene A niemals

Historischer Wert und Simulations-Baseline können numerisch identisch sein,
bleiben aber fachlich getrennte Variablen. Keine stillschweigende Vermischung von
A und B — weder fachlich noch visuell.

## B2. Funnel

```
Lead → MQL → SQL → Opportunity → Won/Lost
```

Trial-Pfad: `Opportunity → Trial → Trial-to-Paid → Won/Lost`
Non-Trial-Pfad: `Opportunity → Conversion/Win Rate → Won/Lost`

Die beiden Pfade werden nicht durch Multiplikation von Trial-to-Paid und Win Rate
vermischt.

## B3. Zeit & Vorgangsparameter

Vorgangsparameter werden beim Entstehen eines Vorgangs eingefroren: Conversion,
Trial-to-Paid, Paket, Nutzerzahl, initialer Sales Cycle, weitere relevante
Deal-Eigenschaften.

Globale Betriebsparameter dürfen laufende Prozesse ab Änderungszeitpunkt
beeinflussen, ohne die Vergangenheit rückwirkend zu verändern.

## B4. Churn

- historische Baseline 2,8 %, monatliche Interpretation
- individuelle Kundenebene, seed-basierte Reproduzierbarkeit
- Mindestkundenalter vor möglichem Churn
- `CUSTOMER_CHURNED` reduziert MRR/ARR ab Ereigniszeitpunkt
- Churn verändert die Pipeline nicht automatisch
- Churn bleibt probabilistisch; kein einzelner Health-Schwellenwert löst automatisch Churn aus

## B5. Umsatz

```
ARR = MRR × 12         bzw.   ARR = Nutzerzahl × Paketpreis × 12
```

Setup-Umsatz ist einmaliger Umsatz und getrennt von MRR/ARR.

## B6. Marketing

```
Marketingbudget → Response-Kurve → Leads → Sales Workload → Sales Capacity / Queue
```

Marketingwirkung ist nichtlinear und kann kanalabhängig modelliert werden.

## B7. Sales Capacity & Sales Queue

Sales-FTE sind Nutzerhebel.

```
Sales Capacity → Queue → Waiting Time → Lead Expiration / Sales Cycle → Conversion / Won Deals
```

Priorität = Kombination aus Quality, Deal Value, Alter/Dringlichkeit, Kanal und
weiteren definierten Faktoren. Keine FIFO-only Queue, kein Preemption eines bereits
laufenden Vorgangs.

## B8. Customer Success & Customer Health

```
CS Capacity → Workload / Queue → Reaktionszeit → Customer Health → Churn Risk → Churn
```

Customer Health 0–100, bestimmt durch Onboarding, Support, Nutzung/Engagement und
offene Probleme. CS-Wartezeit und Bearbeitungszeit werden getrennt gespeichert;
aktive CS-Vorgänge werden nicht preempted.

## B9. Lead Quality

- intern numerisch (z. B. 0–100)
- initial bei Lead-Erzeugung festgelegt, kann sich durch neue Informationen verändern
- beeinflusst Conversion, Sales Cycle und Workload
- kein direkter Nutzerhebel

## B10. Monte Carlo

- mehrere Runs, eigener Seed je Run
- strategische Parameter innerhalb eines Szenarios konstant
- Median/P50 als primärer Prognosewert, P10–P90 als Standardkorridor
- Runs reproduzierbar, Ausreißer nicht automatisch entfernen

## B11. Decision Support

Deterministisch, regelbasiert, quantitativ nachvollziehbar, ursachenorientiert,
nicht automatisch handelnd. Die Anwendung erklärt Ergebnisse, Trade-offs, Risiken
und Ursachen und unterstützt Entscheidungen — sie trifft die strategische
Entscheidung des Nutzers nicht automatisch.

## B12. Technische Schichtung

```
UI → Commands → Application Services → Domain / Simulation Engine → Repository / Storage
```

Verbindliche Prinzipien:
- UI verändert Simulation State nicht direkt; State-Änderungen erfolgen über Commands/Services.
- Simulation ist möglichst pure / side-effect-free.
- deterministischer RNG statt `Math.random()`.
- keine direkte IndexedDB-Nutzung aus UI oder Worker.
- historische Ebene A bleibt unverändert; abgeschlossene Runs bleiben reproduzierbar.
- fachliche und technische Fehler werden getrennt behandelt.
- Persistenz muss atomar und referenziell konsistent sein.

## B13. Simulation Engine, Clock, RNG, Tick & Event-Pipeline

- SimulationEngine unabhängig von UI, React und Browser-APIs.
- SimulationClock liefert die fachliche Zeit (Monat als interne Einheit, Tagesgenauigkeit für zeitabhängige Prozesse); UI kann die Clock nicht verändern.
- DeterministicRNG liefert den Zufall; Determinismus und Zufall strikt getrennt.
- Tick ist deterministisch aus vorherigem State, Parametern und RNG-State ableitbar; Event-Reihenfolge innerhalb eines Ticks ist deterministisch; Berechnungsbasis wird pro Tick eingefroren.
- Fällige bestehende Vorgänge vor neuen Vorgängen; fehlende Kapazität erzeugt Queue statt automatischem Abschluss.
- Event History ist Source of Truth; Events sind immutable; die Historie wird **nicht** abgeschnitten.

## B14. Snapshots & Event History

- Jeder abgeschlossene Tick erzeugt einen immutable Snapshot (`runId` + `tickId`, `simulationDay`).
- Snapshots ersetzen Events nicht; Dashboard arbeitet mit optimierten Projektionen.
- Snapshot muss aus der Event-Historie reproduzierbar sein; Abweichungen sind Integritätsfehler.

## B15. Scenario / ScenarioVersion / SimulationRun / RunManifest / Baseline

```
Scenario → ScenarioVersion → SimulationRun → RunManifest / Events / Snapshots / Analytics
```

- Szenario, Szenarioversion und Run sind eigenständige Objekte; jeder Run referenziert genau eine Szenarioversion.
- CRM-Baseline wird als unveränderlicher Run-Input versioniert; neue Ausgangsdaten erzeugen eine neue Baseline-Version.
- Run Manifest ist unveränderlich und enthält alle Reproduzierbarkeitsinformationen (Seed, Parameter-Version, Modell-/Schema-Version).
- ParameterRegistry ist Single Source of Truth für Typ, Einheit, Range, Validierung und Semantik.
- Preflight ist side-effect-free.
- Worker ist von React, DOM, IndexedDB und UI-Repositories isoliert.
- ScenarioService orchestriert Scenario/Version/Run; SimulationService orchestriert Live-Simulation/Worker.

## B16. State Machines & Invarianten

- Jede fachliche State-Änderung erfolgt über eine definierte, validierte, atomare State Transition.
- Nur fachlich erlaubte Übergänge; kein direkter Funnel-Sprung; `WON` und `DEAL_WON` nur bei erfüllten Voraussetzungen.
- Ungültige Transition erzeugt strukturierten Fehler und hinterlässt keinen partiell veränderten State.
- Zentrale Invarianten (z. B. `ARR = MRR × 12`, kein aktiver MRR nach Churn, gültige Funnel-Zustände) können nach jedem Tick geprüft werden; ein Verstoß markiert den Run diagnostisch als fehlerhaft.

## B17. Persistenz & referenzielle Integrität

- Persistence über Repository-/Storage-Abstraktionen; IndexedDB als primärer V1-Speicher, cloudfähig gehalten.
- Domain-, Persistence- und View-Modelle bleiben getrennt.
- Referenzielle Integrität zwischen Companies, Contacts, Deals, Customers, Runs und Events.
- Soft Delete / Archivierung als Regel; physisches Löschen nur für eindeutig technische, nicht revisionsrelevante Daten.
- **Revision 25.09.2026 (Entscheid Marc Poenisch, Nachtrag zu G49/G63):** Das Speichern von Simulationsläufen (`persist_completed_run`) ist nicht mehr rollenunabhängig. Es folgt der Berechtigung `simulation:run` (Admin, Manager). Viewer bleiben strikt lesend: Sie sehen Runs, Ergebnisse und Pausen, starten, wiederholen und reproduzieren aber keine Läufe. Durchgesetzt in Datenbank (42501), Store (`FORBIDDEN`) und UI. Nicht persistierende Vorschau und Szenariovergleich bleiben für Viewer erlaubt. Die frühere G49-Festlegung bleibt als Historie in `docs/BUILD_LOG.md` stehen.

## B18. UI-Architektur & Designsystem

- Das bestehende LeadPilot-Designsystem ist verbindliche Foundation; Dark-first.
- Progressive Informationsebenen: **Management → Detail → Technik/Audit**.
- Historische und simulierte Daten klar unterscheiden; keine parallele Design-Sprache; technische IDs nicht auf Management-Karten.
- Empty States statt leerer Ergebnisdarstellungen; laufende Simulationen eindeutig kennzeichnen; vorläufige Ergebnisse nie als final darstellen.
- React enthält keine fachliche Simulations-, Statistik- oder Persistence-Logik.

**Regel DS-01:** Das vorhandene LeadPilot-Designsystem ist Single Source of Truth
für visuelle Foundation und Core UI. Neue Simulations-/Analytics-Komponenten müssen
dessen Tokens, Typografie, Spacing, Farben, Radius, Interaktionsprinzipien und
vorhandene Komponenten verwenden. Ein paralleles zweites Designsystem wird nicht
erstellt.

Vorhandene Core-Komponenten: Button, Input, Link, Divider, Card, Modal, Badge,
Alert, Tabs, NavItem, SectionHeader, Table, Icon.
Für die Simulation neu/zu erweitern: KPI Card, KPI Comparison, Trend Chart, Target
Line, Confidence Band, Distribution Chart, Funnel Chart, Health Indicator, Risk
Indicator, Bottleneck Card, Scenario Card, Scenario Comparison, Simulation Status,
Simulation Progress, Goal Status, Event Timeline.

## B19. Verbindliche technische Kernarchitektur — Kurzliste

- Ebene A = historisch / read-only; Ebene B = Simulation
- `Scenario → ScenarioVersion → SimulationRun → RunManifest / Events / Snapshots / Analytics`
- SimulationEngine unabhängig von UI und Browser-APIs
- SimulationClock liefert fachliche Zeit
- DeterministicRNG liefert Zufall
- State Transitions sind atomar
- ParameterRegistry ist Single Source of Truth
- Preflight ist side-effect-free
- Worker ist von React, DOM, IndexedDB und UI-Repositories isoliert
- Persistence läuft über Repository-/Storage-Abstraktionen
- Event History ist Source of Truth
- Snapshots sind immutable und ersetzen Events nicht
- Domain-, Persistence- und View-Modelle bleiben getrennt
- React enthält keine fachliche Simulations-, Statistik- oder Persistence-Logik
- ScenarioService orchestriert Scenario/Version/Run
- SimulationService orchestriert Live-Simulation/Worker
- UI folgt Management → Detail → Technik/Audit
- historische und simulierte Werte werden klar getrennt
- bestehendes LeadPilot-Designsystem bleibt UI-Foundation

## B20. Ausführungspfade (V1, beschlossen)

Es gibt zwei Pfade **by design**:

- **Live / Playground** — `SimulationService`, `window.setTimeout`-Takt, nicht
  reproduzierbar, nie entscheidungsrelevant. Schreibt **nie** in den Snapshot-
  oder Run-Store. Speist nur die Echtzeit-Kacheln (Ebene C, siehe B22).
- **Reproduzierbare Runs** — `ScenarioService` + Worker, deterministisch,
  seed- und manifest-basiert. Einzige Quelle entscheidungsrelevanter Zahlen.
  Alle nicht-deterministischen Quellen (Zeit, IDs, neue Seeds) laufen über
  `systemContext` und sind test-überschreibbar.

## B21. Anwendungs-Schichtung (V1, beschlossen)

`UI → SimulationContext → ScenarioService / SimulationService → Domain/Engine → Repository/Storage`

Kein `CommandBus` in V1. Nachvollziehbarkeit über eine `correlationId`, die von
der UI-Aktion ausgeht und in `RunManifest` sowie jedem erzeugten
`SimulationEvent` steht. Ein vollständiger Command Layer mit eigenem Command-Log
(Entscheidungen 1574–1584) ist ausdrücklich Ausbaustufe.

## B22. Datenquellen-Abstraktion & Datenebenen (beschlossen, seam ab AUFTRAG 016)

Die App ist ein **firmeninternes Echtzeit-Dashboard eines fiktiven Unternehmens**,
dessen Daten aus austauschbaren Quellen kommen — heute ein simuliertes CRM +
n8n-generierte Baselines, später theoretisch eine oder mehrere **echte** Quellen
(HubSpot, Salesforce, Postgres, API …).

**Datenebenen:**

- **Ebene A — Historie (read-only):** eingefrorene historische Fakten.
- **Ebene B — Simulation:** deterministische Engine-Projektion. Unverändert.
- **Ebene C — Live-Ist (optional):** Echtzeit-Feed aktueller Ist-Werte. Heute der
  simulierte Live-Loop, später ein realer `LiveFeed`.

**Verbindliche Regeln:**

- Die Dashboard-UI hängt an einem **quellen-agnostischen Read-Model**
  (`CrmReadModel`: companies / contacts / deals / activities), nicht an einer
  konkreten Quelle.
- Jede Quelle implementiert `DataSource` (`fetchSnapshot(): CrmReadModel`) und
  mappt ihr Eigenformat über einen Adapter auf das Read-Model
  (Modelltrennung + Mapper aus 1585–1600).
- Eine `DataSource` wird **nie direkt** von einem Simulationslauf gelesen. Beim
  Run-Start friert `BaselineSnapshotService.capture(sourceId)` einen
  konsistenten Stand als versionierte `BaselineDataset` ein; der Lauf bindet
  über `RunManifest.baselineVersion` an genau diese eingefrorene Version
  (Entscheidungen 1601–1616). Spätere Änderungen der Quelle verändern
  bestehende Runs nie.
- **n8n ist die Integrationsschicht und läuft immer offline gegenüber der App:**
  es erzeugt bzw. normalisiert Datensätze und schreibt versionierte Artefakte;
  es wird von der App zur Laufzeit nicht aufgerufen.
- **Erste reale externe Quelle (AUFTRAG 020 / Gate G4):** HubSpot wird ausschließlich offline über n8n
  angebunden (`generate-baseline-hubspot.workflow.json` + `hubspot-stage-map.json`); der gezogene Snapshot wird
  als versionierte JSON-Baseline (`baseline-hubspot-<datum>.json`) im Repo eingefroren und über
  `HubSpotBaselineSource` (`kind: 'external'`, `supportsLiveFeed: false`, ID `hubspot-baseline:<version>`)
  quellen-agnostisch bereitgestellt. Kein Secret im Repo, kein Netz-Call in App-Code oder Tests.
- Reale Live-Konnektoren, `CompositeDataSource` (Merge mehrerer Quellen) und echte
  `LiveFeed`-Implementierungen sind **je ein eigener Auftrag**.

## B23. Maßnahmen-Schicht & Wirkungsvorschau (beschlossen, implementiert ab AUFTRAG 017)

Maßnahmen sind eigenständige Steuerungsobjekte, die über der Szenario-Baseline liegen
und zeitlich parametrisierte Management-Eingriffe modellieren (Entscheidungen 419–468, 1474–1573).

**Verbindliche Regeln:**

- **Unveränderliche Baseline (Ebene A):** Maßnahmen verändern niemals historische Daten
  oder die statischen Baseline-Parameter der `ScenarioVersion`.
- **`EffectiveParameterResolver`:** Berechnet für jeden Zeittakt (`tick`) die effektiven
  Parameter aus `baseParameters + activeMeasures(tick)`.
- **Ramp-up & Duration/Revert:**
  - `startTick`: Tick, ab dem die Maßnahme aktiv wird.
  - `rampUpTicks`: Lineare Interpolation zwischen Basiswert und Zielwert über die Ramp-up-Dauer.
  - `durationTicks`: Nach Ablauf wird der Parameterwert deterministisch auf den Vorzustand zurückgesetzt.
- **Parametermodi & Clamping:**
  - Modi: `set` (absoluter Zielwert), `delta` (+/- Abweichung), `multiply` (Faktor).
  - Effektive Werte werden strikt gegen die Min/Max-Grenzen der `V1_PARAMETER_DEFINITIONS` geclampt.
- **Konflikterkennung:** Überlappende `set`- oder gemischte `set`/`delta`-Maßnahmen auf
  denselben Parameter erzeugen nicht-blockierende Warnungen (`MeasureConflict`).
- **Reproduzierbarkeit:** Bei echten Simulationsläufen werden die Maßnahmen im
  `RunManifest.measures` tief eingefroren (`Object.freeze`). `reproduce(runId)` spielt
  identische Maßnahmen mit identischen Ergebnissen ab.
- **Side-Effect-Free Wirkungsvorschau (`previewMeasures`):**
  - Führt eine Zwillings-Simulation mit identischem Seed aus (Base vs. mit Maßnahmen).
  - Vergleicht KPI-Endwerte und liefert `MeasureKpiDelta[]` + `MeasureConflict[]`.
  - Persistiert keine Runs im Repository und erzeugt keine neuen Szenarioversionen (`persist: false`).

## B24. KPI-Detailanalyse, Zeitreihen & Monte-Carlo-Verteilung (beschlossen, implementiert ab AUFTRAG 018)

Die analytische Detail-Ebene (Tier 2) stellt für alle wesentlichen operativen und finanziellen Kennzahlen eine einheitliche, interaktive Detailanalyse bereit (Entscheidungen 1274–1323):

**Verbindliche Regeln:**

- **Standarddarstellung (P50 Median & Unsicherheitsband):**
  - Medianlinie als führende Prognoselinie (`#00e5ff`).
  - P10/P90-Unsicherheitskorridor als dezentes polygonales Band (`rgba(0, 229, 255, 0.12)`).
- **Historien-Anbindung (Ebene A Baseline):**
  - Tick 0 markiert den unberührten Ausgangspunkt (31.12.2025). Die Simulation schließt sichtbar und transparent daran an.
- **Zielpfad & Zielsemantik (`GoalTargetEvaluator`):**
  - Dynamischer Zielpfad als gestrichelte Ziellinie.
  - Zielbewertung erfolgt deterministisch außerhalb der React-Renderzyklen mit festen Schwellen (`ACHIEVED`, `AT_RISK`, `MISSED`, `NO_TARGET`).
- **Monte-Carlo-Histogramm:**
  - Binned-Häufigkeitsverteilung der Simulationsläufe mit P10-, Median-, P90- und Mean-Markern.
- **Einzel-Run-Overlay:**
  - Bis zu 5 selektierbare Einzelläufe zur detaillierten Trajektorienanalyse (Entscheidungen 1300–1301).
- **Darstellungsmodi:**
  - Mathematisch exakte Umschaltung zwischen Absolutwerten, Delta zur Baseline (Δ) und Prozentualer Abweichung (%).
- **Treiberanalyse & Event-Drilldown:**
  - Quantifizierte Top-3-Wachstumstreiber je KPI mit Filterung der zugehörigen Simulationsevents.
- **Statistische Aussagekraft:**
  - Transparente Kennzeichnung bei geringer Stichprobengröße (< 3 Runs).

## B25. Multi-Szenario-Vergleich, 5-Dimensionen-Trade-Offs & Konfigurations-Übernahme (beschlossen, implementiert ab AUFTRAG 019)

Der Multi-Szenario-Vergleich ermöglicht die parallele, strukturierte Gegenüberstellung von 2 bis max. 4 Szenarioversionen (Entscheidungen 849–873, 1637–1648):

**Verbindliche Regeln:**

- **Multi-Versionen-Matrix (2–4 Szenarien):**
  - Paralleler Parameter- und KPI-Vergleich (P50 Median + P10/P90 Quantilskorridor).
  - Harte Begrenzung auf maximal 4 Szenarien gleichzeitig (Entscheidung 851).
- **Trade-Off-Analyse in 5 Dimensionen (Entscheidungen 864–868):**
  - **Growth** (ARR, MRR)
  - **Profitability** (EBITDA, Net Revenue, OPEX)
  - **Liquidity** (Net Cashflow)
  - **Acquisition** (CAC, Won Deals)
  - **Retention** (Kundenbestand, Churn Loss)
- **Striktes Verbot eines künstlichen Gesamt-Scores (Entscheidung 866):**
  - Kein synthetischer Composite-Score oder automatisches Management-Ranking („Szenario A ist Gesamtsieger“).
  - Das System erklärt Stärken und Schwächen objektiv, die Management-Entscheidung verbleibt beim Nutzer (Entscheidung 873).
- **Automatische Ursachenidentifikation & Transparenz unklarer Ursachen (Entscheidungen 869–871):**
  - Primäre Treiberunterschiede werden mit betroffenen KPIs und Wirkungszusammenhängen annotiert.
  - Komplexe oder nicht eindeutig ableitbare Effekte werden transparent als `INDETERMINATE` („Ursache nicht eindeutig bestimmbar“) ausgewiesen.
- **Vergleichsbasis-Validierung (Entscheidungen 854, 855):**
  - Prüfung auf gleiche Simulationsdauer und gleiche Run-Anzahl mit strukturierten Hinweisen bei Abweichungen.
- **Konfigurations-Übernahme (`adoptConfiguration`, Entscheidung 872):**
  - Übernahme der Parameter einer verglichenen Version erzeugt eine neue, unveränderliche `ScenarioVersion` im Zielszenario.

## B26. Drei parallele State-Schichten (beschlossen, implementiert ab AUFTRAG 051)

Drei State-Schichten laufen parallel, jede mit eigenem Mechanismus und klarer Grenze — keine Schicht ersetzt eine andere:

**TanStack Query (HTTP-Server-State).** Alle Request/Response-Lesezugriffe gegen `CRMRepository` (`getCompanies`, `getContacts`, `getImportedFunnelDeals`, `getAuditSummary`, `getPipelineOverview`) sowie die einzige echte Server-Mutation (`seedDatabase`) laufen über `useQuery`/`useMutation` mit zentraler Key-Factory (`crmKeys`, `src/services/query/queryKeys.ts`) und einem `QueryClient` (`src/app/queryClient.ts`, `staleTime` 60s, `retry` 1). Optimistic Updates gibt es nur auf Metadaten-Ebene (Sync-Status); granulare Entity-Schreibpfade (`addLead`, `updateLeadStatus`) bleiben absichtlich deaktiviert (B22/BUILD_PLAN D1).

**Zustand/`useSyncExternalStore` (Realtime-Stream).** Die Live-KPI-Hooks (`useLiveKpi`, `useLiveKpiHistory`, `useLiveKpiActivity`) laufen über einen eigenen Store mit `useSyncExternalStore` (gehärtet G33/G34) — Push-Strom ohne Request/Response-Zyklus, deshalb kein TanStack-Query-Fall. Bleibt unverändert.

**`SimulationContext` (In-Memory-Simulationszustand).** `RunActionModal` und `AuditTierView` rufen `scenService.runVersion/reRun/reproduce` über `SimulationContext` auf — Domänenaktionen der geschützten `src/simulation/`-Zone, kein HTTP-Server-State. Bleibt unverändert.

---
---

# TEIL C — IMPLEMENTIERUNGSSTAND & AUDIT

## C1. Klassifikationsschema

Die Dokumentation unterscheidet strikt:

1. **IMPLEMENTIERT**
2. **TEILWEISE IMPLEMENTIERT**
3. **NUR BESCHLOSSEN**
4. **ECHTES OFFENES GAP**
5. **BEWUSST FÜR SPÄTER**

Eine Architekturentscheidung wird nicht automatisch als Implementierungs-Gap
klassifiziert. Dafür ist ein Code-Audit erforderlich.

## C2. Selbstberichteter Stand (aus Linie A / Linie C, 31.08.2026)

**CRM-Routing & Views — als abgenommen berichtet:**

| Route | Ergebnis |
|---|---|
| `s-companies` | Unternehmen (Accounts), 20 Tabellenzeilen — dedizierte `CompaniesView` |
| `s-deals` | Deal Pipeline, 40 Tabellenzeilen — dedizierte `DealsView` (Pipeline 1.000.000 €, 8 gewonnen / 172.000 €, 20 offen / 559.000 €) |
| `s-activities` | Aktivitäten-Historie, 10 Tabellenzeilen — dedizierte `ActivitiesView` |
| `s-leads` / `s-crm` | Leads & Kontakte, 100 Kontakte / 20 Unternehmen / 40 Funnel Deals + Supabase-/Import-Audit |

Routing-Weiche in `CRMView.tsx`; `App.tsx` übergibt `activeSubView={activeView}`.
Neue/angepasste Dateien: `src/features/crm/components/CompaniesView.tsx`,
`DealsView.tsx`, `ActivitiesView.tsx`, `src/features/crm/CRMView.tsx`,
`src/app/App.tsx`, `src/services/db/supabaseClient.ts`.

**Berichteter Build-/Regression-Status:**
- `npm run build` → Exit Code 0
- `npx tsc --noEmit` → erfolgreich
- `npx tsx scripts/verifyIntegrity.ts` → 17/17 Suiten (Linie A) bzw. Suiten 001–018-A (Linie C)
- Browser-Validierung der vier CRM-Subviews → erfolgreich
- Linie C zusätzlich: „0 P0-Architekturbrüche, 0 P1-Gaps, Architektur als technische Soll-Grundlage freigegeben“

## C3. Externer Code-vs.-Architecture-Audit (30.08.2026) — VERALTET

> **Dieser Audit beschreibt nicht den aktuellen Code.** Er prüfte den alten
> `Archiv.zip`-Export. Die Eigenprüfung des Arbeitsverzeichnisses am 31.08. (siehe
> C4) zeigt, dass praktisch alle hier als „P0 GAP" gelisteten Bausteine im
> Live-Code vorhanden sind. Die Matrix bleibt nur als historischer Beleg stehen.

Geprüft wurde der als `Archiv.zip` bereitgestellte Bestand mit statischer
Codeprüfung sowie TypeScript- und Produktions-Build. Ergebnis:

> Der gelieferte Codebestand ist **nicht** der Stand, den die Abschlussberichte
> 001–007 beschreiben: eine ältere, browser- und zufallsabhängige In-Memory-
> Simulation ohne die erwartbaren Artefakte für Szenarien, Runs, Worker, Monte
> Carlo, Snapshots, IndexedDB oder UI-Audit.

**Konkrete Codebefunde:**
- `src/simulation/eventRules.ts:65` nutzt `Math.random()`; Event-IDs via `Date.now()` (`:99`).
- `src/simulation/engine.ts:58,71,94,114–125` nutzt `Date.now()`, `window.setTimeout()` und mehrfach `Math.random()`.
- `src/simulation/simulationService.ts:35–36,139–140,149–151` nutzt lokale Browserzeit und `window.setTimeout()` statt fachlicher Simulationszeit.
- `src/simulation/simulationService.ts:204–208` beschränkt den Eventverlauf auf die letzten **50 Einträge**.
- Unter `src/` **keine** Dateien/Typen für `ScenarioVersion`, `SimulationRun`, `RunManifest`, Worker, Snapshot, Monte Carlo, Parameter Registry, Preflight oder Command Layer.
- `src/services/db/crmRepository.ts:125–146` — `getLeads()`, `getDeals()`, `getActivities()` liefern leere Arrays; `updateLeadStatus()` liefert `null` (CRM-Stubs).
- React-Komponenten greifen direkt auf `CRMRepository` zu (`src/features/crm/CRMView.tsx:38–41`, `src/components/layout/Sidebar.tsx:34`) — nicht konform zur Command-/Application-Service-Grenze.
- `src/context/SimulationContext.tsx:37–81` kapselt nur die alte In-Memory-Live-Simulation, keine Run-/Scenario-/Persistenzschnittstellen.

**Audit-Matrix (verdichtet):**

| Architekturblock | Status | Prio |
|---|---|---:|
| Bestehende In-Memory-Simulation + React-Anbindung | TEILWEISE IMPLEMENTIERT | P2 |
| Deterministische Engine, PRNG, reproduzierbare IDs | ECHTES OFFENES GAP | P0 |
| SimulationClock, `dayIndex`, fachliche Zeit | ECHTES OFFENES GAP | P0 |
| Deterministische Event-Pipeline + vollständige Historie | ECHTES OFFENES GAP | P0 |
| Scenario → Version → Run → RunManifest; Baseline-Versionierung | ECHTES OFFENES GAP | P0 |
| ParameterRegistry + Preflight | ECHTES OFFENES GAP | P0 |
| Worker-Isolation und Lifecycle | ECHTES OFFENES GAP | P0 |
| Monte-Carlo-Aggregation, P10/P50/P90 | ECHTES OFFENES GAP | P1 |
| Immutable Snapshots, Analytics Projection, IndexedDB hinter Repository | ECHTES OFFENES GAP | P1 |
| Command Layer / UI → Application-Service-Grenze | ECHTES OFFENES GAP | P1 |
| UI-Integration Management → Detail → Technik/Audit | ECHTES OFFENES GAP | P2 |
| CRM-Baseline als unveränderlicher Run-Input | TEILWEISE IMPLEMENTIERT | P0 |
| KPI-Zeitreihen, Baseline-Kennzeichnung, Zielsemantik (1299–1323) | NUR BESCHLOSSEN | P2 |
| Sales-/CS-Queues, Workload/Wartezeit/Health | NUR BESCHLOSSEN | P2 |
| Maßnahmen, Wirkungsvorschau, Szenariovergleich | NUR BESCHLOSSEN | P2 |
| Audit-/Version-History, Correlation IDs, Persistenzintegrität | NUR BESCHLOSSEN | P2 |
| Automatische Retention/Löschung von Snapshots | BEWUSST FÜR SPÄTER | P3 |

## C4. Widerspruch aufgelöst — Eigenprüfung des Live-Codes (31.08.2026)

Der in C3 vermutete Artefakt-/Versionsabgleich wurde durchgeführt: Der externe
Audit (C3) prüfte den alten `Archiv.zip`. Das **Arbeitsverzeichnis**
`~/Projekte/LeadPilot Dashboard-CRM/` ist ein anderer, deutlich weiter
fortgeschrittener Stand (V1.0, Git-Tag `v1.0.0` auf Commit `f8384fb`,
~20.500 Zeilen TS/TSX, ~18 Integrity-Suiten). Damit gilt: **C2 ist im Kern
korrekt, C3 ist überholt.**

### Gegenüberstellung: C3-„P0 GAP" vs. Live-Code

| C3-Befund | Live-Code (31.08.) |
|---|---|
| Kein deterministischer PRNG | `src/simulation/prng.ts` — `DeterministicRNG` (Mulberry32), seed + `getState()`; genutzt in Engine + beiden Services |
| Keine SimulationClock / fachliche Zeit | `SimulationClock` in `eventRules.ts` (`getDayIndex`, `formatSimulatedDate`, `TICKS_PER_DAY`); Engine leitet `dayIndex`/`simulatedDate` daraus ab |
| Event-Historie nach 50 Einträgen abgeschnitten | `simulationService.executeTick`: „Record new events into full store without truncating" — kein Cap mehr |
| Keine `ScenarioVersion`/`SimulationRun`/`RunManifest` | `src/types/scenario.ts` — alle drei vorhanden, `RunManifest` vollständig `readonly` (seed, initialRngState, model-/schema-/baselineVersion) |
| Keine `ParameterRegistry` / `Preflight` | `parameterRegistry.ts` (295 Z.) + `preflightValidator.ts` (100 Z., „NEVER alters RNG state, executes ticks … or touches historical CRM data") |
| Kein Worker | `src/simulation/worker/simulation.worker.ts` + `workerAdapter.ts` (`new Worker(new URL(...), {type:'module'})`), typisiertes `WorkerMessageCommand` (START/PAUSE/RESUME/CANCEL); `workerIntegrity.test.ts` prüft Null-React/DOM |
| Keine Monte-Carlo-Aggregation | `monteCarloAggregator.ts` (231 Z.) + `monteCarloIntegrity.test.ts` |
| Keine Snapshots / IndexedDB | `types/snapshot.ts`, `services/db/indexedDbSnapshotRepository.ts` (332 Z.), `snapshotMapper`, `snapshotIntegrityService`, `snapshotPruningManager` |
| Keine State Machines / Invarianten | `tickInvariantValidator.ts`, `stateMachineEvaluator.ts`, `types/stateMachine.ts`; Engine-Schritt 7 ruft `verifyTickInvariants` und stempelt `hasInvariantViolation` |
| Keine Management/Detail/Audit-UI | `ManagementTierView.tsx`, `DetailTierView.tsx`, `AuditTierView.tsx` (RunManifest- + Snapshot-Integritäts-Tabs) |

`engine.ts` ist tatsächlich pure/headless (Header + Imports: kein React/window/Timer);
Tick-Ablauf: Rules → Queues → Churn → Metrics → State bauen → **Invariantenprüfung →
stempeln → immutably zurückgeben.** `docs/releases/V1.0.md` listet Aufträge 001–014 als
abgeschlossen.

### Verbleibende echte Befunde (Eigenreview, nicht C3) — mit Beschluss vom 31.08.

| # | Befund | Beschluss & Umsetzung | Prio |
|---|---|---|---:|
| C4-1 | **CRM-Schreibpfad noch Stub.** `crmRepository.ts`: `getLeads()/getDeals()/getActivities()` → `[]`, `updateLeadStatus()` → `null`. Lesepfad ist echt. | **Erledigt (AUFTRAG 016 / Gate G2):** `DataSource`-Abstraktion (`CrmReadModel`, `DataSource`, `DataSourceRegistry`), `BaselineSnapshotService` zur konsistenten Snapshot-Erfassung & FK-Integritätsprüfung, n8n-Offline-Fabrik für deterministische Baseline-Datensätze, Schreib-Stubs in `crmRepository.ts` werfen informative Fehler. Test-Suite 016 grün. Siehe **B22**. | P2 |
| C4-2 | **Kein dedizierter Command Layer / Correlation IDs** (1574–1584). | **Teilweise erledigt (AUFTRAG 015):** `correlationId` (String) in `RunManifest`, `SimulationRun` + jedem `SimulationEvent`, ausgehend von der UI-Aktion. Kein `CommandBus`. Voller Command Layer = Ausbaustufe (B21). | P2 |
| C4-3 | **Run-*Erzeugung* nicht deterministisch/injizierbar.** `Math.random()` (Z. 87/192/205/357) und `new Date()` (Z. 90/146/206/313) in `scenarioService.ts`; `simulationStartDate` aus `new Date()` widerspricht 1346. | **Erledigt (AUFTRAG 015):** neues Modul `systemContext.ts` (test-überschreibbar) + `RunOptions`-Parameter; `simulationStartDate` aus `BASELINE_PERIOD_START`. Golden-Run-Test als Abnahme bestanden. | P2 |
| C4-4 | **`simulationService` Live-Loop nutzt `window.setTimeout`**. | **Dokumentiert (B20):** bewusste Architektur (Live ≠ reproduzierbar). Live-Service schreibt nie in Snapshot-/Run-Store. | P3 |
| C4-5 | **`Date.now()` für `errorId`** im Worker (4×). | **Erledigt (AUFTRAG 015):** `errorId = err-${runId}-t${tick}-${seq}` deterministisch injiziert. | P3 |
| C4-6 | **Queue-Projektionen `entries.slice(-20)`** (`salesQueueManager.ts:261`, `csQueueManager.ts:269`). | **Verifiziert (kein Bug):** Die volle Liste wird separat als `updatedEntries` zurückgegeben (`salesQueueManager.ts:206`, `csQueueManager.ts:214`); `slice(-20)` betrifft nur das Projektions-View-Objekt (konform zu B14). Absicherung via `runQueueHistoryTest` (015a) bestanden. | — |
| C4-7 | **`ScenarioParameters` hat nur 10 Felder.** Entscheidungen 149–478 beschreiben deutlich mehr (Kanalbudgets einzeln, Ramp-ups, Lead-Expiration, Setup-Fees, Paketpreise …). | **V1-Ausschnitt erweitert & umgesetzt:** Maßnahmen-Schicht (419–468) in AUFTRAG 017 implementiert; KPI-Zeitreihen, Zielsemantik & Monte-Carlo-Detailanalyse (1274–1323) in AUFTRAG 018 implementiert (**B24**). Verbleibende Parameterbereiche 149–418 gelten als **NUR BESCHLOSSEN** (Erweiterung = eigener Auftrag). | P2 |

**Fazit:** Der Live-Code setzt Teil B zu grob **80–85 %** um, mit echten Tests. Kein
Big-Bang. Umsetzungsreihenfolge: Phase 0 (Doku/Freeze) → **AUFTRAG 015** (C4-2/3/4/5/6)
→ **AUFTRAG 016** (C4-1 als Datenquellen-Abstraktion). Details: `BUILD_PLAN.md`,
`docs/auftraege/ANTIGRAVITY_AUFTRAG_015_REPRODUCIBILITY.md`, `docs/auftraege/ANTIGRAVITY_AUFTRAG_016_DATA_SOURCES.md`.

## C5. Priorisierte GAP-Liste (aus `LEADPILOT_GAP_ANALYSIS.md`, 30.08.2026)

| ID | Bereich | Bewertung | Prio |
|---|---|---|---:|
| GAP-001 | Simulation Engine — pure/deterministisch, UI-getrennt | Codeprüfung erforderlich | P0 |
| GAP-002 | Simulation Clock + `dayIndex` | Codeprüfung erforderlich | P0 |
| GAP-003 | Event Pipeline — Lifecycle + deterministische Reihenfolge | Codeprüfung erforderlich | P0 |
| GAP-004 | State Machines — explizit, validiert, atomar | Codeprüfung erforderlich | P0 |
| GAP-005 | Run Manifest — Versionen/Baseline/Parameter/Seed unveränderlich | Ergänzung erforderlich | P0 |
| GAP-006 | Snapshots — unveränderlich + Rekonstruktion aus Events | prüfen/ergänzen | P0 |
| GAP-007 | Command Layer — UI → Commands → Application Services → Domain | neu/Erweiterung | P0 |
| GAP-008 | Application State — UI-State vs. fachlicher Simulation-State | prüfen | P1 |
| GAP-009 | Parameter Registry | Ergänzung wahrscheinlich | P0 |
| GAP-010 | Preflight Validation | Ergänzung wahrscheinlich | P1 |
| GAP-011 | Baseline Versioning — CRM-Snapshot als unveränderlicher Run-Input | prüfen | P0 |
| GAP-012 | Szenarioversionen — Szenario ≠ Version ≠ Run | prüfen | P0 |
| GAP-013 | Audit Timeline — Benutzer/System/Simulation getrennt | Ergänzung wahrscheinlich | P1 |
| GAP-014 | Analytics — read-only auf konsistenten Snapshots | prüfen | P0 |
| GAP-015 | KPI-Projektionen statt Voll-State im Dashboard | prüfen | P1 |
| GAP-016 | Worker Protocol — Progress/Cancel/Fehler | prüfen | P0 |
| GAP-017 | Persistenz — Repository/Storage-Adapter, atomar | prüfen | P0 |
| GAP-018 | Testing — Unit + Integration + E2E + Determinismus/Regression | prüfen/erweitern | P0 |
| GAP-019 | Designsystem — neue UI nur auf bestehender Foundation | Konformität prüfen | P1 |
| GAP-020 | Management UI — Management → Analyse → Technik, A/B getrennt | UI-Code prüfen | P1 |

**Arbeitsregel:** kein Big-Bang-Rewrite. Pro GAP: bestehenden Code lesen →
Architekturregel zuordnen → kleinste sinnvolle Änderung → implementieren → Tests →
Ergebnis dokumentieren. Bestehende, konforme Teile bleiben erhalten.

## C6. Bewusst spätere Bereiche (nicht als Gap zu werten)

- Dedizierter Analyse-Run (getrennt vom Simulation Run)
- erweiterte Re-Engagement-Workflows aus dem operativen CRM
- weitergehende Snapshot-Kompression / technische Retention
- globale Audit-Timeline in voller Ausbaustufe
- weitergehende Multi-Run-Visualisierung, sofern noch nicht umgesetzt

## C7. Antigravity-Aufträge — Einordnung

Im Projekt liegen Auftragsdokumente `docs/auftraege/ANTIGRAVITY_AUFTRAG_001` … `006`
(Simulation, Szenario-Run, Parameter-Registry, Web-Worker, Monte-Carlo-
Aggregation, Snapshot/IndexedDB). Der Git-Verlauf nennt zusätzlich „Auftrag 007“,
„Auftrag 009“ sowie „Auftrag 014“. Verschiedene Dokumente sprechen abwechselnd
von „Aufträgen 001–007“ und „001–008“.

**Status:** Aufträge sind als Ziel-/Historiennachweis dokumentiert. Ihr
Abschlussnachweis ist laut C3/C4 **strittig** und Teil des ausstehenden
Artefakt-/Versionsabgleichs.

---
---

# TEIL D — QUELLEN, ÄNDERUNGSPROTOKOLL, MASTERSTATUS

## D1. Konsolidierte Quellen

| Kürzel | Datei | Rolle in diesem Entwurf |
|---|---|---|
| Linie A | `~/.Trash/ARCHITECTURE_DECISIONS.md` (≈710 Zeilen, 31.08.) | schlanke Konsolidierung; Basis für Kopf, Teil B, Teil C, Teil D |
| Linie C | `ARCHITECTURE_DECISIONS2.md` (Projekt, 1.795 Zeilen, 31.08., untracked) | jüngste Projektfassung; Quelle für 109–523, 299–308, Architektur-Grundsätze |
| Linie D | `~/Downloads/ARCHITECTURE_DECISIONS.md` (2.902 Zeilen, „Stand 29.08.“) | Voll-Historie; Quelle für 774–1473 im Volltext, Designsystem-Audit |
| — | `docs/archiv/LEADPILOT_GAP_ANALYSIS.md` (Projekt, 30.08.) | GAP-Liste C5 |
| — | `CODE_VS_ARCHITECTURE_AUDIT.md` (Codex-Projekt, 30.08.) | externer Audit C3 |
| — | `ARCHITECTURE_DECISIONS1.md` (Projekt, untracked) | inhaltlich = Linie C minus Block 299–308; nicht separat benötigt |
| — | `archive/architecture-decisions/ARCHITECTURE_DECISIONS(20260830-113118).md` (git-tracked) | ≈ Linie D; bleibt als historische Voll-Fassung im Archiv |

Weitere identische bzw. veraltete Kopien liegen in `~/Library/Mobile Documents/.Trash/`,
`~/.Trash/LeadPilot_workspace_after_gap_2026-08-31/`, `~/.codex/.chatgpt-projects/…`,
`~/.codex/.chatgpt-projects Kopie/…` sowie in `Archiv.zip` /
`LeadPilot_workspace_after_gap_2026-08-31.zip`. Sie sind für den Kanon nicht
erforderlich.

Der Ordner `~/.codex/.chatgpt-projects Kopie/` wurde gegengeprüft: gleicher
Dateisatz wie das Original (nur zusätzliche `.DS_Store`- und `__MACOSX`-Reste),
**kein** neuer Entscheidungstext. Die Fragmentdateien `ARCHITECTURE_DECISIONS_1224-1298.md`,
`…_1224-1873.md` und `…_1299-1323.md` tragen zwar hohe Nummern im Namen, enden aber
selbst bei „Nächste Entscheidungsnummer: 1224“ bzw. „1274“ und enthalten für diese
Bereiche keine Einzelentscheidungen. Damit bleibt es dabei: **1674–1873 ist nirgends
mit Einzeltext belegt.**

## D2. Überholte Zwischenstände

Fassungen mit widersprüchlicher „Nächste Entscheidungsnummer“ — **1224, 1249,
1274, 1399, 1474, 1574** — sind überholt. Ebenso die reine Aktualisierungsnotiz
`ARCHITECTURE_DECISIONS_AKTUALISIERT.md` und die Range-Auszüge
`ARCHITECTURE_DECISIONS_1224-1298.md`, `…_1299-1323.md`, `…_1349-1398_ADDENDUM.md`,
`…_1224-1873.md` (waren Audit-Eingaben, kein eigenständiger Stand).

## D3. Offene Punkte für die nächste Pflege-Runde

1. **Widerspruch C2 ↔ C3 auflösen** (Artefakt-/Versionsabgleich), dann Teil C aktualisieren.
2. **1674–1873**: prüfen, ob irgendwo ein belastbares Originalprotokoll existiert; sonst dauerhaft als Quellenlücke führen.
3. **1–108 / 309–328 / 339–358 / 524–773 / 1399–1448**: dito.
4. **Auftrags-Nummerierung** vereinheitlichen: `ANTIGRAVITY_AUFTRAG_001…006`, Git-Log „007/009", `docs/releases/V1.0.md` „001–014", Doku-Text „023A" — Git-Commit-Labels 007/009 waren Zwischenbezeichnungen; verbindlich ist die Zählung aus `docs/releases/V1.0.md`. Integrity-Suiten sind seit `f956f4b` fortlaufend (001–024, Suite ≠ Auftrag).
5. ~~**C4-3** umsetzen (Clock/ID-Factory in `ScenarioService` injizieren)~~ — erledigt AUFTRAG 015 (`systemContext`). ~~**C4-4** in Teil B als bewusste Live-/Reproduzierbar-Grenze festhalten~~ — erledigt (B20).
6. ~~**C4-1** entscheiden~~ — entschieden: kein operativer Schreibpfad, `DataSource`-Abstraktion (B22), Stubs `throw`. Erledigt AUFTRAG 016.
7. **Release v1.1.0** durchziehen — siehe D5 „Nächster Schritt" bzw. `BUILD_PLAN.md` §6.

## D4. Änderungsprotokoll

| Datum | Änderung |
|---|---|
| 2026-08-29 | Zentrale Architektur-Dokumentation angelegt; Entscheidungen 774–1223 konsolidiert; historische Eckpunkte 1–773 aufgenommen (ohne Erfindung); LeadPilot-Designsystem als Foundation. |
| 2026-08-29/30 | KPI-, Simulation-, Queue-, State-Machine-, Snapshot-, Decision-Support- und Persistenzentscheidungen ergänzt (bis Bereich 1473 im Volltext, konsolidiert bis 1673). |
| 2026-08-30 | Gap-Analyse-Prozess formalisiert; externer Code-vs.-Architecture-Audit erstellt. |
| 2026-08-31 | CRM-Routing und CRM-Subviews implementiert und per Browser validiert; Build/TypeScript/Integrity als grün berichtet. |
| 2026-08-31 | Historische Entscheidungsblöcke 109–523 sowie 299–308 aus dem Projektprotokoll konsolidiert. |
| 2026-08-31 | Linien A, C und D in eine Struktur zusammengeführt (Teil A Historie / Teil B Ziel-Architektur / Teil C Audit / Teil D Meta); Nummern- und Audit-Widersprüche explizit markiert. Altdateien unverändert. |
| 2026-08-31 | Aufräumen: Entwurf zu `ARCHITECTURE_DECISIONS.md` promotet; `…1.md`/`…2.md`, Downloads-Kopie und `.codex/.chatgpt-projects Kopie/` in den Papierkorb. |
| 2026-08-31 | Eigenprüfung des Live-Codes (`~/Projekte/LeadPilot Dashboard-CRM/`, V1.0/`v1.0.0`): C3-Audit als überholt markiert, C4 aufgelöst, 7 verbleibende Befunde (C4-1…7) aufgenommen. |
| 2026-08-31 | AUFTRAG 015 — Reproduzierbarkeit gehärtet (systemContext, correlationId, RunOptions, deterministische Worker errorIds, Golden Run Test, Queue History Test). Gate G1 erfüllt. |
| 2026-08-31 | AUFTRAG 016 — Datenquellen-Abstraktion & n8n-Offline-Fabrik (CrmReadModel, DataSource, DataSourceRegistry, BaselineSnapshotService, n8n Generator Workflow, Test-Suite 016). Gate G2 erfüllt. |
| 2026-09-01 | AUFTRAG 017 — Maßnahmen-Schicht, EffectiveParameterResolver, V1-Kataloghebel-Verdrahtung in Engine (D8 Option A), side-effect-free Wirkungsvorschau (`previewMeasures`), Test-Suite 022 (`measureIntegrity.test.ts`). Gate G3 erfüllt. |
| 2026-09-01 | AUFTRAG 018 — KPI-Zeitreihen-Detailseite, Unsicherheitsbänder (P10/P90), Zielpfad & Zielerreichung, Monte-Carlo-Histogramm, Einzel-Run-Overlay (max. 5), Test-Suite 023 (`kpiTimeSeriesIntegrity.test.ts`). Gate G3b erfüllt. |
| 2026-09-01 | AUFTRAG 019 — Multi-Szenario-Vergleich (2–4 Versionen), 5-Dimensionen-Trade-Offs (ohne Composite Score), automatische Treiber-Diff-Ursachenerkennung (`INDETERMINATE`-Transparenz), Konfigurationsübernahme (`adoptConfiguration`), Test-Suite 024 (`multiScenarioComparisonIntegrity.test.ts`). Gate G3c erfüllt. |
| 2026-09-01 | **Release `v1.1.0`** (Phase 3 = Aufträge 015–019) getaggt & auf GitHub veröffentlicht; Fresh-Clone-Test 24/24 grün. Release-Doku `docs/releases/V1.1.md`. |
| 2026-09-01 | Doku-Hygiene: Release-Meldungen → `docs/releases/`, Detail-Auftragsdateien → `docs/auftraege/`, `LEADPILOT_GAP_ANALYSIS.md` + `chat_protokoll_auftrag_016_gate_g2.md` → `docs/archiv/`, `CONTENT_VISUAL_REINTEGRATION_PLAN.md` → `docs/`. `Archiv.zip` (326 MB, gitignore) in den Papierkorb. |
| 2026-09-01 | AUFTRAG 020 — HubSpot als erste reale Datenquelle (offline über n8n eingefroren, `HubSpotBaselineSource` mit `kind: 'external'`, Stage-Map `tools/n8n/hubspot-stage-map.json`, Workflow `generate-baseline-hubspot.workflow.json`, Test-Suite 025). Gate G4 erfüllt. |
| 2026-09-25 | Revision zu B17 (Nachtrag zu G49/G63): Viewer strikt lesend bei Simulationsläufen; `persist_completed_run` nur für Admin/Manager ([Auftrag](docs/auftraege/ANTIGRAVITY_AUFTRAG_VIEWER_READ_ONLY_RUNS.md)). |

## D5. MASTERSTATUS

**Datei:** `ARCHITECTURE_DECISIONS.md` (aus `…_KANON.md` promotet; committet, Stand `v1.1.0` + AUFTRAG 020)

| Feld | Wert |
|---|---|
| Letzte belastbare Entscheidung | **1673** |
| Nächste Entscheidung | **1674** |
| Volltext-Einzelentscheidungen vorhanden | 109–298, 299–308, 329–338, 359–523, 774–1398, 1449–1473 |
| Konsolidiert (ohne Einzelnummern) | 774–1223-Eckpunkte, 1474–1573, 1574–1673 |
| Quellenlücken (nicht rekonstruiert) | 1–108, 309–328, 339–358, 524–773, 1399–1448, 1674–1873 |
| CRM-Routing | ABGENOMMEN (Linie A/C); dedizierte CompaniesView/DealsView/ActivitiesView im Live-Code bestätigt |
| Build / Regression | GRÜN; `tsc` EXIT 0, `build` EXIT 0, **25/25** Integrity-Suiten (001 bis 025). `main` = `origin/main`. |
| Audit-Status | **C4 aufgelöst & C4-1 vollständig belegt**: Gate G1, G2, G3, G3b, G3c + G4 abgenommen (`docs/BUILD_LOG.md`). |
| Nächster Schritt | Phase 4 Folge-Aufträge (Composite Data Sources / Multi-Source Merge oder erweiterte Feld-Extraktionen). |
