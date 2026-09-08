# Facelift – Antigravity-Aufträge

Die Aufträge werden **in der untenstehenden Reihenfolge** ausgeführt. Auftrag 1 schafft die gemeinsame Basis; alle weiteren bauen darauf auf. Die vollständige gestalterische Quelle ist [die Designspezifikation](../specs/2026-09-03-facelift-design.md), die technische Quelle [der Umsetzungsplan](2026-09-03-facelift-implementation-plan.md).

## Globale Arbeitsanweisung für jeden Auftrag

```text
Arbeite im Repository /Users/marcpoenisch/.codex/worktrees/7610/LeadPilot Dashboard-CRM.

Lies vor Änderungen:
- docs/superpowers/specs/2026-09-03-facelift-design.md
- docs/superpowers/plans/2026-09-03-facelift-implementation-plan.md
- die betreffende bestehende View und ihre Domain-Datei.

Verbindliche Regeln:
- Bewahre die bestehende Farbwelt, Typografie, Datenwerte, Quellen und Business-Logik.
- Keine neue externe Abhängigkeit installieren.
- Keine generischen Emojis oder Standard-Icon-Kacheln für neue Vertriebs-/Erklärungsgrafiken verwenden. Nutze die vorgesehenen eigenen SVG-Glyphen.
- Jede neue Grafik braucht sichtbare Beschriftungen, Textalternative und eine Detailansicht beziehungsweise vorhandene Tabelle als Fallback. Informationen dürfen nie nur per Farbe codiert sein.
- Keine Dateien außerhalb des klar genannten Scopes umgestalten. Nicht committen, nicht resetten und keine vorhandenen unversionierten Dateien löschen.
- Nach deiner Änderung zuerst den engsten sinnvollen Check ausführen, danach npm run build, npm run verify und – sobald vorhanden – npm run verify:facelift.
- Liefere am Ende: (1) Kurzbeschreibung, (2) geänderte Dateien, (3) Prüfbefehle mit Ergebnis, (4) verbleibende Risiken. Frage nicht nach Designentscheidungen; sie sind in der Spezifikation getroffen.
```

---

## Auftrag 1/12 – Gemeinsames Visual-System und Qualitätsgate

```text
Setze ausschließlich die technische Facelift-Grundlage um.

Erstelle:
- src/domain/faceliftVisualData.ts
- src/components/facelift/FaceliftGlyph.tsx
- src/components/facelift/DiagramCanvas.tsx
- src/components/facelift/MetricToken.tsx
- scripts/verifyFacelift.ts

Ändere ausschließlich package.json zusätzlich, um das neue Script einzuhängen.

Anforderungen:
1. Lege eine streng typisierte, fachlich benannte Konfiguration für alle freigegebenen Facelift-Darstellungen an. Sie enthält IDs und semantische Zustände, aber keine erfundenen Kennzahlen. Daten kommen weiterhin aus den bestehenden Dateien unter src/domain/.
2. FaceliftGlyph bietet eigene inline-SVG-Zeichen mindestens für contactToCustomer, focus, ready, success, challenge, fit, risk und opportunity. Ein Glyph ist nur dann aria-hidden, wenn direkt sichtbarer Text dieselbe Bedeutung vermittelt; sonst hat es role="img" und aria-label.
3. DiagramCanvas kapselt responsives SVG mit title, description, Legendenbereich und Textzusammenfassung. Es verhindert starre Breiten und unterstützt mobile Darstellung.
4. MetricToken stellt Kennzahl, Einheit, Delta und den Ton positive/attention/neutral einheitlich dar, ohne Zahlenlogik neu zu implementieren.
5. verifyFacelift prüft mit Node/tsx alle vereinbarten Visual-IDs, die vier Standortbilder, das Logo-Asset und die KfW-/Destatis-Quellen-URLs. Ergänze package.json um "verify:facelift": "tsx scripts/verifyFacelift.ts".
6. Verwende keine neue Bibliothek und ändere noch keine Fach-View.

Abnahme: npm run verify:facelift, npm run build und npm run verify laufen erfolgreich.
```

## Auftrag 2/12 – Überblick: Firmenakte, Performance-Puls und Datenfluss

```text
Setze ausschließlich den Facelift für src/features/overview/OverviewView.tsx um.

Erstelle unter src/features/overview/components/:
- CompanyRegisterCard.tsx
- PerformancePulse.tsx
- SourceDecisionFlow.tsx

Erweitere nur die nötigen Einträge in src/domain/faceliftVisualData.ts.

Verbindliches Design:
1. CompanyRegisterCard ist eine hochwertige Registerkarte mit drei klaren Gruppen: Identität, Stammdaten sowie Recht & Beurkundung. Verwende ausschließlich die vorhandenen Overview-/exec-Daten.
2. PerformancePulse ersetzt die zwei bisherigen Standardsymbole: vertikale Jahresachse, positive Signale auf der rechten Seite, Herausforderungen links. Nutze FaceliftGlyph für Erfolg und Herausforderung sowie neben jedem Punkt einen ausgeschriebenen Status.
3. SourceDecisionFlow liest sich von Quellsystemen über Validierung zur gemeinsamen Vertriebsentscheidung. Die vorhandene Tabelle bleibt als Detail-/Mobile-Fallback bestehen.
4. Mobile: Registerfelder einspaltig; Pulsstationen untereinander; Datenfluss vertikal. Desktop: alle drei Elemente eigenständig und gut unterscheidbar.

Verändere keine fachlichen Kennzahlen oder Quellsystemdaten.

Abnahme: Overview auf 1440 px, 768 px und 375 px ohne Überlauf; anschließend alle Standardchecks ausführen.
```

## Auftrag 3/12 – Unternehmen: Geschäftsidee, Value Proposition und Gründungszeitachse

```text
Setze ausschließlich den fachlichen Teil von src/features/unternehmen/UnternehmenView.tsx um, ohne Standortbild (das folgt separat).

Erstelle unter src/features/unternehmen/components/:
- BusinessIdeaSignalMap.tsx
- ValueBenefitStage.tsx
- FundingTimeline.tsx

Nutze bestehende Daten aus src/domain/unternehmenData.ts und ergänze nur Visual-Metadaten in src/domain/faceliftVisualData.ts.

Verbindliches Design:
1. BusinessIdeaSignalMap folgt der Reihenfolge DACH-KMU-Situation → Vertriebsreibung → LeadPilot-Mechanik → Nutzen. Zeige 868.000 digital umsatzaktive KMU, 21 % Cloud-CRM-Nutzung bei Unternehmen mit 10–49 Beschäftigten und „unter 30 Minuten“ bis zur Nutzbarkeit. Die KfW- und Destatis-URLs stehen klein, lesbar und direkt an der Visualisierung.
2. ValueBenefitStage hat eine große horizontale Hauptaussage, links drei vertikal gestapelte Vorteile „Kontakt wird Kunde“, „Fokus statt Reporting-Aufwand“ und „vom ersten Tag handlungsfähig“, rechts ein großes, eigenes, menschlich-vertriebsnahes Symbolbild. Kein Emoji und kein Standard-Library-Icon als zentrale Grafik.
3. FundingTimeline hat eine gemeinsame Zeitachse mit zwei synchronisierten Spuren: oben Kapital & Recht (GmbH/25.000 € am 21.07.2022, Convertible 250.000 € im Mai 2023, Seed 950.000 € plus Kapitalerhöhung Q1 2024), unten Produkt & Markt (Launch Q1 2024 sowie Marktfortschritt bis Dezember 2025: 66 Kunden, 411.840 € ARR). Senkrechte Verbinder zeigen die Ermöglichungsbeziehung.
4. Vorhandene Tabellen/Details bleiben als fachliche Referenz zugänglich.

Abnahme: Quellen, Zeitachsenwerte und mobile Reihenfolge gegen die Domain-Datei prüfen; anschließend Standardchecks ausführen.
```

## Auftrag 4/12 – Unternehmen: Company Atlas mit Standortbildern

```text
Setze ausschließlich den Standort-/Bildteil in src/features/unternehmen/UnternehmenView.tsx um.

Erstelle src/features/unternehmen/components/LocationAtlas.tsx und ergänze nur notwendige Visual-Metadaten.

Verwende genau diese Assets:
- assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png
- assets/facelift/unternehmen/unternehmen-innen-besprechung.png
- assets/facelift/unternehmen/unternehmen-innen-workspace.png
- assets/facelift/unternehmen/unternehmen-innen-empfang.png
- assets/logo/leadpilot-logo-full.png

Verbindliches Design:
1. Großes Leitbild plus drei ergänzende Bildstationen ergeben den Company Atlas.
2. Auf jedem Bild ist das echte LeadPilot-Logo als HTML-img-Overlay zu platzieren. Generierte Markenzeichen innerhalb der Pixelbilder dürfen nicht verwendet oder als korrekt vorausgesetzt werden.
3. Jedes Bild trägt gut sichtbar das Overline-Label „FIKTIVE VISUALISIERUNG“.
4. Mietobjekt-Fakten stammen unverändert aus den vorhandenen Daten und erscheinen als schlanke Faktenleiste, nicht als erfundene Immobilienbeschreibung.
5. Schreibe präzise deutsche Alt-Texte und achte auf lesbaren Text über dunklem Bildgrund.

Abnahme: Bilder bei 1440 px, 768 px und 375 px ohne verzerrten Zuschnitt oder verdecktes Label; danach Standardchecks.
```

## Auftrag 5/12 – Produkt: Betriebszentrale, Produktgesundheit und Roadmap

```text
Setze ausschließlich src/features/produkt/ProduktView.tsx um.

Erstelle unter src/features/produkt/components/:
- OperationsHub.tsx
- ProductHealth.tsx
- RoadmapHorizons.tsx

Nutze die bestehende Datenbasis aus src/domain/produktData.ts; ergänze nur Visual-Metadaten.

Verbindliches Design:
1. OperationsHub zeigt das Pipeline-Cockpit im Zentrum und die vier Produktmodule darum. Jede Verbindung nennt den konkreten Vertriebsbezug des bestehenden Moduls.
2. ProductHealth gruppiert die sechs vorhandenen Leistungskennzahlen in Stabilität, Nutzung und Onboarding. Kennzahlen und Formate bleiben unverändert.
3. RoadmapHorizons gliedert alle vorhandenen Einträge in Now (geliefert), Next (aktuell) und Later (geplant). Status nicht umdeuten.
4. Der bestehende Pricing-Bereich bleibt inhaltlich und strukturell unverändert; passe nur gemeinsame Abstände an.

Abnahme: Grafikreihenfolge per Tastatur/Screenreader sinnvoll, mobile Darstellung ohne abgeschnittene Verbindungen, danach Standardchecks.
```

## Auftrag 6/12 – Markt: Chancenstapel, Wettbewerbs-Topografie und SWOT-Kompass

```text
Setze ausschließlich src/features/markt/MarktView.tsx um.

Erstelle unter src/features/markt/components/:
- MarketOpportunityStack.tsx
- DecisionTopology.tsx
- SwotCompass.tsx

Nutze ausschließlich src/domain/marktData.ts und vorhandene Tabellen/Charts als Datenquelle.

Verbindliches Design:
1. MarketOpportunityStack übersetzt die drei vorhandenen Markt-Aussagen in Marktvolumen → adressierbarer Fokusmarkt → erreichte Aufmerksamkeit. Alle drei Werte bleiben auch tabellarisch nachvollziehbar.
2. DecisionTopology ist eine isometrische Entscheidungs-Topografie mit Zonen Enterprise Suite, Marketing/Service und Pipeline Tools. LeadPilot liegt als cyanfarbene B2B-Mid-Market-Hochebene auf der sichtbar kürzesten Route zur Nutzbarkeit.
3. Die Höhenlegende lautet klar „Einführungsaufwand“. Ergänze die explizite Aussage „Keine Darstellung von Marktanteilen.“ Marktanteile bleiben in der vorhandenen Tabelle, die Topografie enthält keine Marktanteilsbehauptung.
4. SwotCompass zeigt vier eigene Fachzeichen um ein Entscheidungszentrum, mit lesbaren Achsen intern/extern und stärken/schützen. Jedes Feld enthält eine handlungsorientierte Textübersetzung.

Abnahme: Die Topografie ist bei 200-%-Zoom, ohne Farbe und mit Screenreader-Text verständlich; danach Standardchecks.
```

## Auftrag 7/12 – Kunden: ICP, Volker, Segmente und Kundenportfolio

```text
Setze ausschließlich src/features/kunden/KundenView.tsx um.

Erstelle unter src/features/kunden/components/:
- IcpFitMap.tsx
- PersonaDossier.tsx
- VolkerDayTimeline.tsx
- SegmentFields.tsx
- RevenueStaircase.tsx
- CustomerPortfolio.tsx

Nutze nur src/domain/icpData.ts, src/domain/personaData.ts und src/domain/kundenData.ts.

Verbindliches Design:
1. IcpFitMap zeigt Idealprofil, Branchen, Größenbereich, Umsatz, Sales-Team, DACH, Trigger-Priorität und eine klar beschriftete Ausschlusszone „Nicht verfolgen“.
2. Oben erscheint PersonaDossier als Entscheider-Dossier für Volker; darunter VolkerDayTimeline als „Ein Tag in Volkers Vertrieb“. Beides zeigt unterschiedliche Blickwinkel auf dieselben gültigen Persona-Daten, nicht denselben Text doppelt.
3. SegmentFields ist oben die große Hingucker-Grafik. Direkt darunter steht RevenueStaircase kleiner, mit den exakten Segmentwerten.
4. CustomerPortfolio ersetzt die Top-10-Rangliste durch einen Raum mit ARR und aktiven Nutzern als klar beschrifteten Achsen. Punkte haben Label und die bestehende Tabelle bleibt verfügbar.

Abnahme: Flächengrößen/Bubbles sind nicht nur farbcodiert, Achsen und Legenden lesbar, mobile Reihenfolge: ICP → Persona → Segmente → Portfolio; danach Standardchecks.
```

## Auftrag 8/12 – Vertrieb: Leckage, SLA, Investitionsroute und Ziel-Leiter

```text
Setze ausschließlich src/features/vertrieb/VertriebView.tsx um.

Erstelle unter src/features/vertrieb/components/:
- FunnelLeakageWaterfall.tsx
- SlaSwimlane.tsx
- ChannelInvestmentRoute.tsx
- BudgetTargetLadder.tsx

Nutze ausschließlich src/domain/vertriebData.ts und die bestehenden Funnel-/Chartdaten.

Verbindliches Design:
1. Den vorhandenen Funnel beibehalten und darunter FunnelLeakageWaterfall setzen. Es zeigt pro Stufe Verlust und verbleibendes Potenzial; seine Summen müssen mit dem Funnel übereinstimmen.
2. SlaSwimlane hat parallele Bahnen für Marketing, Sales und Rückgabe/Eskalation. Übergabe, Frist und Eskalation sind als Text und Richtung sichtbar.
3. ChannelInvestmentRoute macht den Weg Kanalbudget → CAC → Neukundengewinnung nachvollziehbar. Jeder Kanal endet anhand vorhandener Regeln mit erhöhen, halten oder stoppen.
4. BudgetTargetLadder zeigt die prüfbare Kette Budget → MQL → SQL → Umsatz und verändert keine Zielzahl.

Abnahme: Funnel-Summen, SLA-Zuständigkeiten und CAC-Werte gegen Domain-Daten prüfen; alle Diagramme auf Mobilgeräten vertikal lesbar; danach Standardchecks.
```

## Auftrag 9/12 – Finanzen: Ertragsufer, Kapital-Schnitt und SaaS-Motor

```text
Setze ausschließlich src/features/finanzen/FinanzenView.tsx um.

Erstelle unter src/features/finanzen/components/:
- RevenueCostShoreline.tsx
- CapitalCut.tsx
- SaasMotor.tsx

Nutze ausschließlich src/domain/finanzenData.ts und die vorhandene Zahlendarstellung.

Verbindliches Design:
1. RevenueCostShoreline zeigt Umsatz- und Kostenverlauf über Zeit sowie die Ergebnislücke. Es ersetzt das alte GuV-Standarddiagramm, nicht die Detaildaten.
2. CapitalCut stellt Mittelverwendung und Finanzierung als zwei kompakte, gleichwertige Hälften dar. Die ausführliche Bilanz bleibt darunter verfügbar.
3. SaasMotor ist ein gerichteter Ursache-Wirkungs-Kreis aus ARPA, CAC-Payback, Retention und MRR. Jede Kante hat eine kurze Textbeschreibung; der Kreis darf keine unbelegte Kausalität behaupten.
4. Bestehende Währungs-, Vorzeichen- und Zahlenformatierung zwingend wiederverwenden.

Abnahme: GuV- und Bilanzsummen gegen die Domain prüfen; keine gequetschten Achsen auf 375 px; danach Standardchecks.
```

## Auftrag 10/12 – Organisation: FTE, People-Health, Kapazitätsnetz und Rollen-Landkarte

```text
Setze ausschließlich src/features/organisation/OrganisationView.tsx und unmittelbar dazugehörige Styles um.

Erstelle unter src/features/organisation/components/:
- OrganisationScaffold.tsx
- PeopleHealthRail.tsx
- CapacityNetwork.tsx
- RoleLegend.tsx

Nutze ausschließlich src/domain/organisationData.ts und vorhandene Organisationstexte.

Verbindliches Design:
1. OrganisationScaffold zeigt FTE je Funktion als wachsende Organisationsbausteine. Die Höhe steht nur für Kapazität und ist beschriftet.
2. Behebe den vorhandenen Textüberlauf beim Personalaufwand robust: Container brauchen schrumpfbare Grid-Spalten, lange Werte dürfen umbrechen, und auf 320–375 px darf es keinen horizontalen Überlauf geben.
3. PeopleHealthRail bringt Personalaufwand, Bindung und Zufriedenheit in eine eindeutige, textlich erklärte Beziehung.
4. CapacityNetwork ist die zentrale Grafik. Es zeigt Rollen und Übergaben als Netz; Engpässe sind orange und zusätzlich textlich markiert. RoleLegend steht unmittelbar bei der Grafik und erklärt Engineering/Product, Sales-Demo-Kapazität und CTO-Single-Point-of-Failure.

Abnahme: 320 px, 375 px, 768 px und Desktop auf Überlauf prüfen; Legende folgt im DOM nach dem Netz; danach Standardchecks.
```

## Auftrag 11/12 – Strategie: Ziel-Startbahn und Balanced-Scorecard-Wirkungsbahn

```text
Setze ausschließlich src/features/strategie/StrategieView.tsx um.

Erstelle unter src/features/strategie/components/:
- GoalRunway.tsx
- BalancedScorecardPath.tsx

Nutze ausschließlich src/domain/strategieData.ts.

Verbindliches Design:
1. GoalRunway visualisiert für jedes OKR Ausgangswert, Zwischenmeilensteine, Ziel und Zeithorizont. Sie zeigt verständlich die noch vorhandene Lücke, ohne Kennzahlen neu zu berechnen.
2. BalancedScorecardPath bildet die kausale Wirkungskette Lernen → Prozesse → Kunde → Finanzen ab. Jede Verbindung enthält einen kurzen erklärenden Satz. Es darf keine reine Hierarchie- oder Hausgrafik entstehen.
3. Growth Driver bleibt fachlich und strukturell unverändert. Passe nur gemeinsame Abstände, Containerbreite und mobile Responsivität an.

Abnahme: Ursache-Wirkungs-Kette in DOM- und Screenreader-Reihenfolge verständlich, Keyboard-Fokus sichtbar, danach Standardchecks.
```

## Auftrag 12/12 – Facelift-Gesamtabnahme und Fehlerkorrekturen

```text
Führe die komplette Facelift-Abnahme durch. Ändere nur Komponenten oder Styles, in denen du einen nachweisbaren Abnahmefehler findest.

Prüfe verbindlich:
1. Inhalt: Jede neue Visualisierung gegen die jeweils zugehörige Domain-Datei und Tabellenansicht. Entferne unbelegte Behauptungen oder Werte statt sie zu schätzen.
2. Auswahl: Beide Volker-Ansichten sind vorhanden; Segment-Felder stehen groß über Umsatz-Staffel; Kapazitätsnetz und Rollen-Landkarte stehen zusammen; Gründung hat zwei synchronisierte Spuren; Wettbewerb nutzt Einführungsaufwand, nicht Marktanteil.
3. Bildregeln: Alle vier Standortbilder sind vorhanden, haben echtes Logo-Overlay und das sichtbare Label „FIKTIVE VISUALISIERUNG“.
4. Responsivität: Jede Facelift-Seite auf 1440 px, 768 px, 375 px und die Organisationsseite zusätzlich auf 320 px. Keine abgeschnittenen SVGs, keine überdeckten Labels, keine horizontale Seitenscrollbar.
5. Accessibility: sichtbarer Fokus, sinnvolle Überschriften, Textalternative für jede bedeutungstragende Grafik und keine Information allein per Farbe.
6. Technische Gates ausführen:
   - npm run build
   - npm run verify
   - npm run verify:facelift
   - git diff --check

Liefere eine Abnahmeübersicht pro Bereich mit gefundenen und behobenen Fehlern. Wenn alle Gates erfolgreich sind, bestätige ausdrücklich, dass der Facelift zur fachlichen Abnahme bereit ist. Nicht committen.
```
