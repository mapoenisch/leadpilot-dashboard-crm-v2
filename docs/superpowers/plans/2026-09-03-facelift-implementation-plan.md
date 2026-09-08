# Facelift – Umsetzungsplan

> **Für die Umsetzung:** Die Planung wird schrittweise ausgeführt. Jede Änderung bewahrt Farben, Datenwerte und bestehende Funktionalität; die aktuelle Arbeitskopie wird nicht bereinigt oder automatisch committed.

**Ziel:** Die statischen Unternehmensdaten erhalten eine einheitliche, vertriebsnahe Visualisierungssprache, ohne die vorhandene Datenbasis oder den Charakter des Dashboards zu verändern.

**Architektur:** Jede Seite bleibt Eigentümerin ihrer fachlichen Darstellung. Ein kleiner Satz wiederverwendbarer SVG- und Layoutbausteine definiert die Signal-Map-Grammatik; fachliche Visual-Konfigurationen werden typsicher aus den vorhandenen Domain-Dateien abgeleitet. Tabellen bleiben als Detail- und mobile Fallbacks erhalten.

**Technik:** React 18, TypeScript, Vite, vorhandene CSS-Variablen, vorhandene Diagrammkomponenten, inline SVG, `npm run build`, `npm run verify`.

**Designvorgabe:** [verabschiedete Designspezifikation](../specs/2026-09-03-facelift-design.md)

---

## Leitplanken vor dem ersten Code-Schritt

- Keine externe Chart-, Icon- oder UI-Abhängigkeit ergänzen.
- Bestehende Zahlen, Quellen, Tabellen und Berechnungen bleiben fachlich unverändert. Eine neue Darstellung referenziert immer ihren existierenden Datensatz.
- Cyan markiert positive Verbindung, Auswahl und Fortschritt; Orange nur Engpass, Verlust, Risiko oder Zielkonflikt. Keine Aussage nur über Farbe vermitteln.
- Für neue custom Illustrationen `FaceliftGlyph` und SVG-Pfade verwenden; keine Emoji als Ersatz für Erfolg, Herausforderung, SWOT, Value Proposition oder ICP.
- Standortfotos immer mit sichtbarem Overline-Label `FIKTIVE VISUALISIERUNG` und mit echtem Logo-Overlay aus `assets/logo/leadpilot-logo-full.png` zeigen.
- Während der Umsetzung nicht committen: Die Arbeitskopie enthält bereits unversionierte Assets und `.superpowers/`-Arbeitsmaterial.

## Geplante Modulgrenzen

| Ziel | Primäre Dateien |
| --- | --- |
| Visual-Semantik und Qualitätsprüfung | `src/domain/faceliftVisualData.ts`, `src/components/facelift/FaceliftGlyph.tsx`, `src/components/facelift/DiagramCanvas.tsx`, `src/components/facelift/MetricToken.tsx`, `scripts/verifyFacelift.ts`, `package.json` |
| Überblick | `src/features/overview/OverviewView.tsx`, `src/features/overview/components/{CompanyRegisterCard,PerformancePulse,SourceDecisionFlow}.tsx` |
| Unternehmen | `src/features/unternehmen/UnternehmenView.tsx`, `src/features/unternehmen/components/{BusinessIdeaSignalMap,ValueBenefitStage,FundingTimeline,LocationAtlas}.tsx` |
| Produkt | `src/features/produkt/ProduktView.tsx`, `src/features/produkt/components/{OperationsHub,ProductHealth,RoadmapHorizons}.tsx` |
| Markt | `src/features/markt/MarktView.tsx`, `src/features/markt/components/{MarketOpportunityStack,DecisionTopology,SwotCompass}.tsx` |
| Kunden | `src/features/kunden/KundenView.tsx`, `src/features/kunden/components/{IcpFitMap,PersonaDossier,VolkerDayTimeline,SegmentFields,RevenueStaircase,CustomerPortfolio}.tsx` |
| Vertrieb | `src/features/vertrieb/VertriebView.tsx`, `src/features/vertrieb/components/{FunnelLeakageWaterfall,SlaSwimlane,ChannelInvestmentRoute,BudgetTargetLadder}.tsx` |
| Finanzen | `src/features/finanzen/FinanzenView.tsx`, `src/features/finanzen/components/{RevenueCostShoreline,CapitalCut,SaasMotor}.tsx` |
| Organisation | `src/features/organisation/OrganisationView.tsx`, `src/features/organisation/components/{OrganisationScaffold,PeopleHealthRail,CapacityNetwork,RoleLegend}.tsx` |
| Strategie | `src/features/strategie/StrategieView.tsx`, `src/features/strategie/components/{GoalRunway,BalancedScorecardPath}.tsx` |

---

### Aufgabe 1: Visual-System, Quellenbindung und Prüfschleife anlegen

**Dateien:**
- Neu: `src/domain/faceliftVisualData.ts`
- Neu: `src/components/facelift/FaceliftGlyph.tsx`
- Neu: `src/components/facelift/DiagramCanvas.tsx`
- Neu: `src/components/facelift/MetricToken.tsx`
- Neu: `scripts/verifyFacelift.ts`
- Ändern: `package.json`

1. Zuerst eine typsichere Visual-Konfiguration anlegen, die nur IDs und semantische Zustände enthält. Beispiel:

   ```ts
   export type VisualTone = 'positive' | 'attention' | 'neutral';
   export type FaceliftVisualId =
     | 'company-register' | 'performance-pulse' | 'source-decision'
     | 'benefit-stage' | 'funding-timeline' | 'decision-topology'
     | 'icp-fit-map' | 'capacity-network' | 'bsc-path';

   export const faceliftVisualIds: readonly FaceliftVisualId[] = [/* alle freigegebenen Bilder */];
   ```

2. `FaceliftGlyph` als geschlossene Union fachlicher Zeichen implementieren, etwa `contactToCustomer`, `focus`, `ready`, `success`, `challenge`, `fit`, `risk`, `opportunity`. Jeder Aufrufer liefert zusätzlich einen Texttitel; das SVG trägt `aria-hidden="true"` nur neben sichtbarem Text, sonst `role="img"` und `aria-label`.
3. `DiagramCanvas` als semantischen Rahmen für SVG-Diagramme schaffen: responsives `viewBox`, Titel, Beschreibung, Legendenplatz und eine zugängliche Textzusammenfassung. `MetricToken` vereinheitlicht Kennzahl, Einheit, Delta und Tonalität, ohne neue Zahlen zu berechnen.
4. `scripts/verifyFacelift.ts` als daten- und assetbezogenen Schutztest schreiben: Es prüft alle verabschiedeten Visual-IDs, das Vorhandensein der vier Standortbilder, den Logo-Pfad sowie die geforderten Quellen-URLs. Das Script mit `"verify:facelift": "tsx scripts/verifyFacelift.ts"` in `package.json` einhängen.
5. Prüfen: `npm run verify:facelift`, `npm run build`, `npm run verify`.

### Aufgabe 2: Überblick in drei sofort verständliche Entscheidungsmodule umsetzen

**Dateien:**
- Neu: `src/features/overview/components/CompanyRegisterCard.tsx`
- Neu: `src/features/overview/components/PerformancePulse.tsx`
- Neu: `src/features/overview/components/SourceDecisionFlow.tsx`
- Ändern: `src/features/overview/OverviewView.tsx`, `src/domain/faceliftVisualData.ts`

1. Den Unternehmenssteckbrief als `CompanyRegisterCard` mit klaren Feldgruppen „Identität“, „Stammdaten“, „Recht & Beurkundung“ aufbauen. Werte kommen unverändert aus den bisherigen Overview-Daten.
2. Die bisherigen Erfolg-/Herausforderungssymbole durch `PerformancePulse` ersetzen: mittige Jahresachse, rechts positive Signale, links Herausforderungen und zugehörige custom Glyphs. Jede Station erhält sowohl Tonalität als auch einen Textstatus.
3. `SourceDecisionFlow` aus den vorhandenen Quellsystemen ableiten und in „Quelle“, „Validierung“, „gemeinsame Vertriebsentscheidung“ gliedern. Unter dem Ablauf bleibt die bestehende Datentabelle als Detailansicht.
4. Auf 375 px: Registerfelder einspaltig, Pulsstationen untereinander und der Datenfluss als vertikale Kette. Auf großen Ansichten bleiben die drei Module klar unterschiedlich.
5. Prüfen: Desktop-, Tablet- und Mobilansicht des Overview-Tabs; anschließend `npm run build && npm run verify && npm run verify:facelift`.

### Aufgabe 3: Unternehmen mit Signal Map, Benefit Stage und Doppel-Zeitachse aufbauen

**Dateien:**
- Neu: `src/features/unternehmen/components/BusinessIdeaSignalMap.tsx`
- Neu: `src/features/unternehmen/components/ValueBenefitStage.tsx`
- Neu: `src/features/unternehmen/components/FundingTimeline.tsx`
- Ändern: `src/features/unternehmen/UnternehmenView.tsx`, `src/domain/faceliftVisualData.ts`

1. `BusinessIdeaSignalMap` als links-nach-rechts-Lesefluss bauen: DACH-KMU-Situation → Reibung im Vertriebsalltag → LeadPilot-Mechanik → Nutzen. Die drei freigegebenen Kennzahlen stehen mit präziser Einheit und kleiner Quellenzeile an ihren Knoten; Quellen sind KfW und Destatis gemäß Spezifikation.
2. `ValueBenefitStage` exakt in der festgelegten Gewichtung anlegen: große horizontale Hauptaussage, links die drei Vertriebsnutzen und rechts das eigene vernetzende Sales-Symbol. Auf Mobilgeräten steht die Bildmarke nach der Aussage und vor den drei Vorteilen.
3. `FundingTimeline` mit einer gemeinsamen Zeitachse und zwei Zeilen implementieren. Oben Kapital & Recht (GmbH, Convertible, Seed/Kapitalerhöhung); unten Produkt & Markt (Launch und Marktfortschritt). Senkrechte Verbinder machen sichtbar, welcher obere Meilenstein den unteren Schritt ermöglichte.
4. Die bisherige Historientabelle bleibt unter der Grafik erreichbar. Das Diagramm wird nicht als Ersatz für die Details verwendet.
5. Prüfen: Zeitachsenbeschriftungen bei 375 px und 768 px, Quellenlinks, Farben, anschließender kompletter Prüf-Run.

### Aufgabe 4: Standort als Company Atlas mit echten Bild-Assets integrieren

**Dateien:**
- Neu: `src/features/unternehmen/components/LocationAtlas.tsx`
- Ändern: `src/features/unternehmen/UnternehmenView.tsx`, `src/domain/faceliftVisualData.ts`
- Verwenden: `assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png`, `assets/facelift/unternehmen/unternehmen-innen-besprechung.png`, `assets/facelift/unternehmen/unternehmen-innen-workspace.png`, `assets/facelift/unternehmen/unternehmen-innen-empfang.png`, `assets/logo/leadpilot-logo-full.png`

1. Das Leitbild groß über den Mietobjekt-Fakten zeigen und die drei ergänzenden Innenansichten als Bildstationen mit jeweils einer Orts-/Funktionsbeschriftung einsetzen.
2. Auf jedem Bild das offizielle Logo als HTML-`img` platzieren sowie das sichtbare Label `FIKTIVE VISUALISIERUNG`. Keinen Text oder Markenbestandteil aus der generierten Pixelgrafik als verlässlich behandeln.
3. Die Mietobjekt-Fakten aus der bestehenden Datenquelle in eine schlanke Faktenleiste überführen; Adresse, Verträge oder weitere Daten nicht erweitern.
4. Für alle Bilder sinnvolle deutsche `alt`-Texte formulieren; bei dekorativen Wiederholungen bewusst leere Alternativtexte nutzen.
5. Prüfen: Bildzuschnitt ohne Textverlust bei 1440 px, 768 px und 375 px; Bilddateien und Logo erneut durch `verify:facelift` prüfen.

### Aufgabe 5: Produkt als Betriebszentrale, Gesundheitsbild und klare Release-Horizonte darstellen

**Dateien:**
- Neu: `src/features/produkt/components/OperationsHub.tsx`
- Neu: `src/features/produkt/components/ProductHealth.tsx`
- Neu: `src/features/produkt/components/RoadmapHorizons.tsx`
- Ändern: `src/features/produkt/ProduktView.tsx`, `src/domain/faceliftVisualData.ts`

1. Die vier Produktmodule in `OperationsHub` um den zentralen Pipeline-Cockpit-Knoten legen. Jeder Modulstrahl enthält die bestehende Funktionsbezeichnung und seinen konkreten Vertriebsbezug.
2. Die sechs Performance-Kacheln in `ProductHealth` exakt den Ebenen Stabilität, Nutzung und Onboarding zuordnen. Bestehende Werte bleiben sichtbar; Gruppierung erklärt, warum sie zusammengehören.
3. Die Roadmap in `RoadmapHorizons` als Now/Next/Later strukturieren. „Now“ ist bereits geliefert, „Next“ laufende Arbeit, „Later“ geplant; Statusbezeichnungen werden nicht vertauscht.
4. Das Pricing unverändert lassen und nur mit gemeinsamen Abständen zum neuen Produktbild ausrichten.
5. Prüfen: Tastatur-/Screenreader-Reihenfolge der zentralen Grafik, klare Statuslegende und vollständiger Prüfrun.

### Aufgabe 6: Markt mit Chancenstapel, Wettbewerbs-Topografie und SWOT-Kompass schärfen

**Dateien:**
- Neu: `src/features/markt/components/MarketOpportunityStack.tsx`
- Neu: `src/features/markt/components/DecisionTopology.tsx`
- Neu: `src/features/markt/components/SwotCompass.tsx`
- Ändern: `src/features/markt/MarktView.tsx`, `src/domain/faceliftVisualData.ts`

1. `MarketOpportunityStack` aus den drei bestehenden Marktchart-Aussagen erstellen: Marktvolumen, adressierbarer Fokusmarkt, erreichte Aufmerksamkeit. Jede Ebene führt zur bestehenden Zahl/Tabelle zurück.
2. `DecisionTopology` als isometrisches SVG mit den Zonen Enterprise Suite, Marketing/Service und Pipeline Tools umsetzen. Die cyanfarbene LeadPilot-Hochebene liegt im B2B-Mid-Market und enthält den markierten schnellsten Weg zur Nutzbarkeit.
3. Die Höhenlegende zwingend als „Einführungsaufwand“ beschriften und eine direkte Textnotiz ergänzen: „Keine Darstellung von Marktanteilen.“ Marktanteilsdaten verbleiben in ihrer bisherigen tabellarischen Form.
4. `SwotCompass` mit vier eigenen Fachsymbolen, klaren Quadranten und Handlungsübersetzungen aufbauen; intern/extern und stärken/schützen zusätzlich beschriften.
5. Prüfen: Topografie ist ohne Farbe und bei 200-%-Zoom verständlich, dann Build/Verify-Run.

### Aufgabe 7: Kundenbild mit ICP, Persona-Doppelansicht, Segment-Doppelansicht und Portfolio umsetzen

**Dateien:**
- Neu: `src/features/kunden/components/IcpFitMap.tsx`
- Neu: `src/features/kunden/components/PersonaDossier.tsx`
- Neu: `src/features/kunden/components/VolkerDayTimeline.tsx`
- Neu: `src/features/kunden/components/SegmentFields.tsx`
- Neu: `src/features/kunden/components/RevenueStaircase.tsx`
- Neu: `src/features/kunden/components/CustomerPortfolio.tsx`
- Ändern: `src/features/kunden/KundenView.tsx`, `src/domain/faceliftVisualData.ts`

1. Die ICP-Fit-Karte mit Idealprofil, Industrie, Teamgröße, Umsatz, Sales-Team, DACH, Triggern und expliziter „Nicht verfolgen“-Zone bauen. Die Größenbereiche stammen aus den bestehenden ICP-Daten.
2. Volker als zwei bewusst unterschiedliche Ebenen zeigen: `PersonaDossier` oben für Rolle, Zitat, Pain und Fit; `VolkerDayTimeline` darunter für die konkrete Tagesreise im Vertrieb. Beide Darstellungen teilen Daten, verdoppeln sie aber nicht wortgleich.
3. `SegmentFields` groß als erstes Segmentbild einsetzen; die Fläche steht nachvollziehbar für die vorhandene ARR-Relation. Direkt darunter `RevenueStaircase` kleiner und präziser mit den Tabellenwerten.
4. Den bisherigen Top-10-Rang durch `CustomerPortfolio` ersetzen: x-/y-Achse ARR und aktive Nutzer, Punktlabel plus zugängliche Datentabelle. Die Sortierung bleibt in den Quelldaten unverändert verfügbar.
5. Prüfen: alle Achsen/Flächen haben Legenden, keine Bubble ist nur über Farbe unterscheidbar, kompletter Prüf-Run.

### Aufgabe 8: Vertrieb als nachvollziehbare Bewegung von Budget bis Abschluss darstellen

**Dateien:**
- Neu: `src/features/vertrieb/components/FunnelLeakageWaterfall.tsx`
- Neu: `src/features/vertrieb/components/SlaSwimlane.tsx`
- Neu: `src/features/vertrieb/components/ChannelInvestmentRoute.tsx`
- Neu: `src/features/vertrieb/components/BudgetTargetLadder.tsx`
- Ändern: `src/features/vertrieb/VertriebView.tsx`, `src/domain/faceliftVisualData.ts`

1. Den bestehenden Funnel belassen und darunter `FunnelLeakageWaterfall` mit den Verlusten je Stufe und dem verbleibenden Potenzial verankern. Der Wasserfall muss mit den Funnel-Summen übereinstimmen.
2. Die SLA-Übergabe als Swimlane aus Verantwortungsbahnen implementieren: Marketing, Sales und Rückgabe/Eskalation. Frist, Übergabepunkt und Eskalation sind textlich markiert.
3. `ChannelInvestmentRoute` verknüpft Kanalbudget, CAC und Neukundengewinnung. Jede Route endet sichtbar mit „erhöhen“, „halten“ oder „stoppen“, abgeleitet aus den vorhandenen Kennzahlen und Regeln.
4. `BudgetTargetLadder` setzt Budget, MQL, SQL und Umsatzziel in eine nach unten prüfbare Kette; keine Zielzahl neu berechnen oder überschreiben.
5. Prüfen: Funnel-/Wasserfallwerte stimmen gegen die Domänendaten, Swimlane funktioniert als Hochkantlayout, kompletter Prüf-Run.

### Aufgabe 9: Finanzseite in Ursache, Ergebnis und Kapitalherkunft übersetzen

**Dateien:**
- Neu: `src/features/finanzen/components/RevenueCostShoreline.tsx`
- Neu: `src/features/finanzen/components/CapitalCut.tsx`
- Neu: `src/features/finanzen/components/SaasMotor.tsx`
- Ändern: `src/features/finanzen/FinanzenView.tsx`, `src/domain/faceliftVisualData.ts`

1. `RevenueCostShoreline` aus den vorhandenen Zeitreihen erstellen: Umsatzlinie, Kostenlinie und die visuell erkennbare Ergebnislücke. Wertebeschriftung und Tabelle bleiben verfügbar.
2. Die Bilanz in `CapitalCut` mit zwei gleichwertigen Hälften „Mittelverwendung“ und „Finanzierung“ abstrahieren; die detaillierte Bilanz bleibt unverändert darunter.
3. `SaasMotor` als gerichteten Kreis mit ARPA, CAC-Payback, Retention und MRR bauen. Jede Verbindung erhält eine kurze Ursache-Wirkungs-Beschriftung statt impliziter Pfeile.
4. Zahlenformate, Währungen und negative Werte an die bestehende Finanzformatierung anbinden.
5. Prüfen: Bilanz- und GuV-Summen entsprechen weiterhin den Ausgangsdaten, auf mobilem Layout gibt es keine gequetschten Achsen, dann Prüfrun.

### Aufgabe 10: Organisation mit robustem People-Bild und sichtbaren Engpässen ausarbeiten

**Dateien:**
- Neu: `src/features/organisation/components/OrganisationScaffold.tsx`
- Neu: `src/features/organisation/components/PeopleHealthRail.tsx`
- Neu: `src/features/organisation/components/CapacityNetwork.tsx`
- Neu: `src/features/organisation/components/RoleLegend.tsx`
- Ändern: `src/features/organisation/OrganisationView.tsx`, zugehörige Styles oder bestehende Layout-Komponente, `src/domain/faceliftVisualData.ts`

1. FTE nach Funktion als `OrganisationScaffold` darstellen: Bauhöhe zeigt Kapazität, Beschriftung zeigt Funktion und FTE. Die Karte bleibt eine Organisationssicht, keine finanzielle Aussage.
2. Den Überlauf bei „Personalaufwand“ mit einem festen Grid- und Textumbruchvertrag beheben, etwa `minmax(0, 1fr)`, `overflow-wrap: anywhere` für harte Werte und keine starre Mindestbreite auf kleinen Displays.
3. `PeopleHealthRail` verbindet Personalaufwand, Bindung und Zufriedenheit als lesbare Kennzahlenbeziehung; Trends werden textlich benannt.
4. `CapacityNetwork` als Hauptgrafik umsetzen: Rollen/Kapazitäten als Knoten, Übergaben als Kanten, Engpass als orange markierter Knoten oder Pfad. `RoleLegend` steht direkt daneben beziehungsweise darunter und erklärt Engineering/Product, Sales-Demo-Kapazität und CTO-Single-Point-of-Failure.
5. Prüfen: kein horizontaler Überlauf bei 320–375 px, Legende folgt dem Netz im DOM, vollständiger Prüfrun.

### Aufgabe 11: Strategie mit einer Startbahn und einer echten Wirkungslogik abschließen

**Dateien:**
- Neu: `src/features/strategie/components/GoalRunway.tsx`
- Neu: `src/features/strategie/components/BalancedScorecardPath.tsx`
- Ändern: `src/features/strategie/StrategieView.tsx`, `src/domain/faceliftVisualData.ts`

1. Die OKRs als `GoalRunway` bauen: klarer Ausgangswert, benannte Zwischenmeilensteine, Ziel und Zeithorizont. Das Bild betont die Lücke zur Zielerreichung, nicht nur die Zielzahl.
2. `BalancedScorecardPath` von Lernen über Prozesse und Kunden zu Finanzen führen. Jede Verbindung beschreibt den Mechanismus in einem kurzen Satz; es entsteht keine Hierarchie-Grafik.
3. Den bestehenden Bereich Growth Driver fachlich unverändert lassen, aber an die gemeinsamen Abstände und responsive Breite der neuen Strategiemodule anpassen.
4. Prüfen: Ursache-Wirkungs-Kette in Screenreader-Reihenfolge verständlich, Tabs und Überschriften korrekt hierarchisiert, dann Prüfrun.

### Aufgabe 12: Gesamtabnahme mit visuellen und technischen Gates durchführen

**Dateien:**
- Ändern, falls ein Fehler gefunden wird: nur die betroffene Komponenten-/Domain-Datei
- Prüfen: alle in den Aufgaben genannten Dateien

1. Alle neuen Diagramme gegen die jeweiligen bisherigen Tabellen und Domain-Konstanten prüfen. Abweichende Werte oder nicht belegte Beschriftungen werden entfernt, nicht geraten.
2. Jede Seite in mindestens 1440 px, 768 px und 375 px ansehen. Prüfkriterien: keine Überlappung, keine abgeschnittene SVG, sichtbare Legende, sinnvolle mobile Reihenfolge und gut lesbare Quellen.
3. Mit Tastatur durch alle Tabs und Diagrammbereiche navigieren. Prüfen: Fokus sichtbar, Bild-/SVG-Alternativen vorhanden, Orange und Cyan nie alleiniger Informationsträger.
4. Die vollständige technische Prüfung ausführen:

   ```bash
   npm run build
   npm run verify
   npm run verify:facelift
   git diff --check
   ```

5. Abschließend eine kurze Änderungsübersicht mit Screenshot-Nachweisen pro Bereich erstellen. Erst danach ist der Facelift zur inhaltlichen Abnahme bereit.

## Abnahmekriterien

- Jeder in der Designspezifikation genannte Bereich ist umgesetzt oder bewusst unverändert belassen.
- Die finale UI zeigt alle vom Nutzer gewählten Doppelansichten: Volker-Dossier plus Tagesreise, Segment-Felder plus Umsatz-Staffel sowie Kapazitätsnetz plus Rollen-Landkarte.
- Die zwei Gründungsspuren und die Wettbewerbs-Topografie sind ohne zusätzliche Erklärung in ihrer Bedeutung verständlich.
- Vier Standortbilder und das echte LeadPilot-Logo sind integriert, jedes Bild trägt die Fiktionskennzeichnung.
- Preise, Growth Driver, interne Ressourcen und rechtliche Dokumente sind fachlich unverändert.
- Build, Integritätsprüfung, Facelift-Prüfung und `git diff --check` sind erfolgreich.
