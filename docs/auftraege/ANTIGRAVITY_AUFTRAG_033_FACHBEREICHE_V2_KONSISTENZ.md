# Auftrag 033: Restliche Fachbereiche und V2-Konsistenz

> **Für ausführende Agenten:** Dieser Auftrag wird seriell bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Builder-Bericht wird in `docs/BUILD_LOG.md` festgehalten; erst danach erfolgt der unabhängige Codex-Review.

**Phase:** Phase 3 – Statische Produktansichten im V2-Design
**Gate:** G17
**Status:** BEREIT ZUR AUSFÜHRUNG
**Baseline:** `90a4c19` (`docs(build-log): approve Gate G16 after review`)

## Ziel

Die noch nicht in G14–G16 überführten, tatsächlich gerouteten Fachseiten erhalten dort, wo noch ein sichtbares V1-Muster besteht, eine konsistente LeadPilot-V2-Darstellung. Zusätzlich wird der vom Auftraggeber bereitgestellte LeadPilot-Werbespot als neue, echte Marketing-Ressource in die ansonsten eingefrorene Materialbibliothek aufgenommen. Die Informationsarchitektur, alle vorhandenen Daten, Charts, Tabelleninhalte und Zeit-/Quellenbezüge bleiben erhalten. G17 ist ausschließlich ein Präsentations-, Responsive- und eng begrenzter Asset-Integrationsauftrag; er ergänzt keine Fachlogik und entfernt keine Routen oder Adapter.

Die 24 folgenden Routen bilden die vollständige G17-Matrix. Eine Seite, die nachweislich bereits dem V2-Muster entspricht (insbesondere `/product/roadmap`), wird nur auf Konsistenz und Responsive-Verhalten geprüft und nicht ohne konkreten Befund umgestaltet.

| Fachbereich | Routen |
| --- | --- |
| Produkt | `/product/features`, `/product/pricing`, `/product/performance`, `/product/roadmap` |
| Markt & Wettbewerb | `/market/overview`, `/market/competition`, `/market/swot` |
| Kunden & ICP | `/customers/icp`, `/customers/persona`, `/customers/segments`, `/customers/top-customers` |
| Vertrieb & Marketing | `/sales/funnel`, `/sales/sla`, `/sales/channels`, `/sales/planning` |
| Finanzen | `/finance/p-and-l`, `/finance/balance-sheet`, `/finance/unit-economics` |
| Strategie | `/strategy/okrs`, `/strategy/balanced-scorecard`, `/strategy/growth-drivers` |
| Recht & Gründung | `/legal/articles`, `/legal/shareholders`, `/legal/commercial-register` |
| Explizite Ausnahme: Internal Resources | `/resources/materials`: Karte und zugänglicher Player ausschließlich für den bereitgestellten Werbespot |

## Verbindliche visuelle Referenz

Die vollständige Referenz steht in [`reference/leadpilot-v2-style/README.md`](../../reference/leadpilot-v2-style/README.md). Maßgeblich sind die dunkle, klar geschichtete Management-Oberfläche, feine Rahmen, transparente V2-GlassCards, hohe Informationsdichte, cyanfarbene Primärakzente sowie sparsame orange Warnakzente.

Die Referenz ersetzt keine Produktdaten. Farben tragen niemals Bedeutung allein: Status, Quelle, Zeitraum, Delta und Warnung müssen immer zusätzlich als Text oder semantische Struktur verständlich bleiben. Bestehende Angaben wie „2025“, „2026“, „Plan“, „Ist“, „Stand“ und Quellenhinweise dürfen nicht entfernt oder inhaltlich umgedeutet werden.

## Globale Grenzen

- Keine neuen npm-Abhängigkeiten, keine Änderung an Routing, Route-Metadaten, App-Schale, Sidebar oder `src/app/**`.
- `src/simulation/**`, `src/context/**`, `src/services/data/**` bleiben gegenüber `90a4c19` exakt unverändert.
- `src/types/resource.ts`, `src/domain/resourceRegistry.ts` und `src/features/resources/{InternalResourcesView.tsx,components/ResourceCard.tsx,components/ResourceViewer.tsx}` sind die **einzige** Ausnahme in `src/types/**`, `src/domain/**` und `src/features/resources/**`. Sie dürfen ausschließlich um den Werbespot ergänzt werden; vorhandene Ressourcen, ihre Daten und ihr Verhalten bleiben unverändert.
- Ebenfalls unverändert bleiben `src/components/ui/**`, `src/services/**`, `src/features/*/*View.tsx` sowie alle Daten-, Chart- und Repository-Definitionen. G17 verändert nur die ausdrücklich genannten Page-Komponenten, die explizite Werbespot-Ausnahme, G17-lokales CSS, die QA-Artefakte und das Build-Log.
- `Internal Resources` (`/resources/materials`) bleibt außerhalb der Werbespot-Karte, der Viewer-Unterstützung und ihrer Metadaten eingefroren: keine sonstige Inhalts-, Struktur-, Styling-, Import- oder Routing-Änderung.
- Vor der Änderung jede Zielseite gegen die V2-Referenz prüfen. Nur bei einem sichtbaren V1-Muster umgestalten; bereits V2-konforme Seiten nicht rein kosmetisch verändern.
- Bestehende Primitives und Tokens wiederverwenden: insbesondere `SectionHeader`, `Card variant="glass"`, `Badge`, `Alert`, `ChartFrame`, `KeyValueTable`, `Table`, `Button`, `Input`, `Select` und `Tabs`, soweit die jeweilige Seite sie bereits sinnvoll einsetzt.
- Keine neuen Daten, Kennzahlen, Benchmarks, Prognosen, Quellen, rechtlichen Aussagen, Personen, Ziele oder Kausalbehauptungen erfinden. Zahlen, Label, Tabellenzeilen, Chart-Daten und Fachtexte bleiben aus den vorhandenen Domain-Imports abgeleitet.
- Keine Interaktion, Filterung, Formularaktion oder Tabellenfunktion entfernen oder in ihrer Wirkung ändern. Keine neue Schreib-, Lösch-, Export-, Drag-and-Drop- oder Realtime-Funktion hinzufügen.
- Keine globale CSS-Änderung. Neue Regeln in `src/styles/global.css` erhalten ausschließlich das Präfix `fachbereiche-v2-` und dürfen die Seiten außerhalb der 24 Zielrouten nicht beeinflussen.
- Kein horizontaler Body- oder interner Tabellen-/Container-Überlauf bei 1440 × 900, 768 × 1024 und 375 × 812. Auf 375 px müssen Datenzeilen lesbar umbrechen oder als semantische Karten-/Definitionslisten erscheinen; ein horizontal scrollender Ersatz ist nicht zulässig.
- Neue Animationen sind nicht erforderlich. Ergänzte Transitionen respektieren `prefers-reduced-motion`.

## Ziel-Dateien

| Datei / Bereich | Verantwortung |
| --- | --- |
| `src/features/produkt/pages/{FeaturesPage,PricingPage,PerformancePage,RoadmapPage}.tsx` | Produktseiten nur bei sichtbarem V1-Muster auf die V2-Schale überführen; Roadmap nicht regressieren. |
| `src/features/markt/pages/{MarketOverviewPage,CompetitionPage,SwotPage}.tsx` | Markt-, Wettbewerbs- und SWOT-Inhalte mit unveränderten Domaindaten konsistent darstellen. |
| `src/features/kunden/pages/{IcpPage,PersonaPage,SegmentsPage,TopCustomersPage}.tsx` | ICP-, Persona-, Segment- und Kundeninhalte responsiv und mit V2-Hierarchie darstellen. |
| `src/features/vertrieb/pages/{FunnelPage,SlaPage,ChannelsPage,PlanningPage}.tsx` | Funnel-, SLA-, Kanal- und Planungsansichten ohne Änderung der fachlichen Inhalte auf V2 bringen. |
| `src/features/finanzen/pages/{PnLPage,BalanceSheetPage,UnitEconomicsPage}.tsx` | Finanzkennzahlen, Tabellen und Charts ohne neue Finanzinterpretation V2-konform und mobil lesbar darstellen. |
| `src/features/strategie/pages/{OkrsPage,BalancedScorecardPage,GrowthDriversPage}.tsx` | Strategische Ziele, Scorecard und Treiber mit klarer Status-, Zeit- und Quellenhierarchie darstellen. |
| `src/features/recht/pages/{ArticlesPage,ShareholdersPage,CommercialRegisterPage}.tsx` | Rechts- und Gründungsinhalte ausschließlich visuell verdichten; Wortlaut und Quellenbindung wahren. |
| `src/types/resource.ts` | `ResourceType` ausschließlich um den Wert `VIDEO` ergänzen; vorhandene Typen und Metadatenstruktur nicht ändern. |
| `src/domain/resourceRegistry.ts` | Genau eine Marketing-Ressource `res-leadpilot-werbespot` mit dem gelieferten WebM-Asset, einem Poster, Quelle und Tags registrieren. |
| `src/features/resources/{InternalResourcesView.tsx,components/ResourceCard.tsx,components/ResourceViewer.tsx}` | Bestehende Bibliothek ausschließlich um die sichtbare Videokarte und ihren zugänglichen nativen Video-Player ergänzen. |
| `public/resources/videos/leadpilot-werbespot.webm` | Binäre Originaldatei, unverändert aus `/Users/marcpoenisch/Projekte/LeadPilot - Eine fiktive Geschäftsidee/new_marketing_assets_dashboard/LeadPilot - Werbespot.webm` kopieren. |
| `public/resources/videos/leadpilot-werbespot-poster.png` | Aus dem gelieferten Video abgeleitetes, repräsentatives Vorschaubild; keine KI-generierte oder fremde Bildquelle. |
| `public/resources/videos/ASSET_SOURCE.md` | Herkunft, Original-Dateiname, Zielpfade, Erstellungsweg des Posters, Dateigrößen und Lizenz-/Nutzungshinweis dokumentieren. |
| `src/styles/global.css` | Nur eng abgegrenzte Klassen mit Präfix `fachbereiche-v2-`; keine Token- oder App-Layout-Änderungen. |
| `scripts/captureAuftrag033GateScreenshots.mjs` | Neuer robuster CDP-Harness für die 24 Zielrouten, alle drei Zielgrößen und die vollständige Routenprüfung. |
| `scripts/generateAuftrag033ScreenshotMatrix.mjs` | SHA-256-Matrix für 72 Vorher-/Nachher-Paare erzeugen und drei Nachher-only Video-Nachweise ausweisen. |
| `docs/screenshots/auftrag-033/` | 72 Vorher- und 75 Nachher-Screenshots sowie README-Matrix. |
| `docs/BUILD_LOG.md` | Builder-Bericht; später ergänzt Codex ausschließlich den unabhängigen Review-Befund. |

## Umsetzungsanforderungen

### 1. Einheitliche Seitenhierarchie

- Jede veränderte Seite besitzt einen klaren `SectionHeader` oder eine gleichwertige bestehende Seitenüberschrift mit Fachbereich, Titel und ausschließlich vorhandener Zeit-, Quellen- oder Kontextinformation.
- Primäre Kennzahlen stehen, sofern die Seite solche Daten bereits besitzt, in kompakten V2-GlassCards. Tabellen, Erklärtexte und Charts folgen darunter in nachvollziehbarer Lesereihenfolge.
- Charts behalten Datensatz, Legende, Beschriftung, Zeitachse und vorhandene semantische Erläuterungen. Chartdaten werden weder umgerechnet noch ausgedünnt.
- Tabellen behalten alle fachlich relevanten Spalten und Zeilen. Auf Mobile ist jede Information lesbar; eine Karte enthält eine klare Überschrift und benannte Wertpaare.
- Positive, neutrale und kritische Zustände verwenden vorhandene `Badge`-/`Alert`-Semantik. Ein Statusbadge enthält immer seinen Text.

### 2. Fachliche Datenwahrheit

- Produkt: Funktionen, Pakete, Performance und Releases bleiben anhand der vorhandenen `produktData`-Inhalte beschrieben. Die G15-Roadmap bleibt inhaltlich unverändert.
- Markt und Kunden: Marktwerte, Wettbewerber, SWOT, ICP, Persona, Segmente und Top-Kunden werden nicht zusammengefasst, ergänzt oder neu gewichtet.
- Vertrieb und Finanzen: Funnelstufen, SLA, Kanäle, Planungswerte, GuV, Bilanz und Unit Economics bleiben unverändert. Insbesondere erzeugt das Styling keine Schein-Echtzeit oder Prognosen.
- Strategie und Recht: OKRs, Scorecard, Wachstumstreiber, Satzung, Gesellschafterliste und Handelsregister behalten ihren bestehenden Wortlaut, ihre Daten und ihren rechtlichen Kontext.

### 3. Responsive und zugängliche Umsetzung

- Überschriften, Kennzahlen, Filter/Controls (falls vorhanden), Chart-Container, Tabellen und Karten kollidieren bei 375 px nicht und besitzen sichtbaren Fokus für vorhandene Interaktionen.
- Semantische HTML-Struktur bleibt erhalten: Tabellen verwenden `table`, `caption`, `thead`, `th scope="col"`, `tbody`; Kartenlisten verwenden eine logische Überschrift und beschriftete Wertpaare.
- Dekorative Icons und Trennlinien sind für Screenreader verborgen. Informationen, die nur durch eine Farbe sichtbar wären, erhalten Text.
- Leere Zustände, Quellenhinweise und vorhandene Warnungen bleiben verständlich; sie dürfen nicht durch reine Dekoration ersetzt werden.

### 4. Routen- und Adapterhygiene

- Alle 41 Routen aus `APP_ROUTES` bleiben erreichbar und liefern ihren vorhandenen Titel. Die 24 G17-Routen müssen direkt ihre dedizierte Page-Komponente zeigen.
- `routes.tsx`, `routePages.tsx`, alle `*View.tsx` und `OverviewView` sind nicht veränderbar. Der im Build-Plan genannte mögliche Legacy-Abbau wird in G17 nur dokumentarisch geprüft und ausschließlich dann als Folgeauftrag spezifiziert, wenn ein konkreter Befund vorliegt.
- Es gibt keine neue Fallback-Ansicht, keinen neuen Redirect und keine Änderung der Navigation.

### 5. Werbespot in Internal Resources

- Die bereitgestellte Originaldatei wird byte-identisch als `public/resources/videos/leadpilot-werbespot.webm` versioniert. Der Asset-Pfad wird über einen einzelnen Registry-Eintrag `res-leadpilot-werbespot` in der Kategorie `MARKETING` referenziert; sie wird nicht als Inline-Base64 und nicht über eine externe URL eingebunden.
- `ResourceType` erhält ausschließlich `VIDEO`. Der Registry-Eintrag verwendet Titel `LeadPilot Werbespot`, Typ `VIDEO`, `pageCount: 1`, das Video als `assetPaths[0]`, das abgeleitete Poster als `thumbnailPath`, den Original-Dateinamen `LeadPilot - Werbespot.webm` als `originalSource` sowie passende Tags `Marketing`, `Werbespot`, `Video`.
- Die Ressourcenkarte zeigt das Poster, einen sichtbaren Play-Hinweis und den Text-Badge `Video`. Sie startet keine Wiedergabe selbst; weder Autoplay noch stummes Looping sind zulässig.
- Im bestehenden Viewer wird für `VIDEO` ein natives `<video controls playsInline preload="metadata">` mit dem lokalen WebM-Pfad gerendert. Der Player erhält einen zugänglichen Namen. Es gibt einen sichtbaren Text-Fallback mit Link zur Videodatei für Browser ohne WebM-Wiedergabe.
- Untertitel, Transkript, Dauer, Sprecher, Musik oder Werbeaussagen dürfen nicht erfunden werden. Ein `track`-Element wird nur ergänzt, falls eine echte Untertiteldatei bereitgestellt wird.
- Das Poster wird aus einem tatsächlichen Frame des gelieferten Videos erzeugt. Falls kein lokales Medienwerkzeug vorhanden ist, darf der bestehende Chrome-CDP-Harness einen pausierten Frame erfassen. Es werden keine npm-Abhängigkeit, keine Web-API und kein externes Asset dafür ergänzt.
- `ASSET_SOURCE.md` dokumentiert mindestens Quellpfad, Original-Dateiname, Ziel-Dateien, Dateigrößen, verwendetes lokales Erzeugungswerkzeug oder Harness-Verfahren, Erstellungsdatum und die vom Auftraggeber bestätigte Nutzung im LeadPilot-Dashboard.

## Nicht Bestandteil dieses Auftrags

- Keine Änderung an Internal Resources außer der in Abschnitt 5 beschriebenen Werbespot-Integration; keine Änderung an Simulation, CRM, Organisation, Executive- oder Unternehmensübersicht.
- Keine Änderung an Datenmodellen, Domaindaten, Chart-Konfigurationen, Repositories, Supabase, Import/Export, Persistenz oder Zugriffsrechten.
- Keine Änderung an globalen UI-Primitives, CSS-Tokens, Route-Metadaten, App-Schale, Sidebar oder Modulen außerhalb der Ziel-Dateien.
- Kein Löschen von Legacy-Adaptern, `OverviewView` oder Dateien, auch nicht bei vermuteter Nichtverwendung.
- Keine Phase-4-Echtzeitfunktion, keine neue Bibliothek und keine Release-/Deployment-Änderung.

## Screenshot- und Gate-Harness

Vor der visuellen Umsetzung werden die 24 Fachrouten auf `90a4c19` als `vorher` erfasst. Danach erfasst der Harness dieselbe 24-Routen-Matrix als `nachher`. Der Werbespot-Player ist eine neue Funktion und wird deshalb ausschließlich im Nachher-Stand auf allen drei Zielbreiten erfasst; auf der Baseline kann und darf kein nicht vorhandener Video-Modalzustand nachgestellt werden.

| Matrix | Umfang |
| --- | --- |
| Gepaarte Zielseiten | 24 geroutete G17-Fachseiten aus der Routentabelle oben |
| Nachher-only Zusatzfluss | Werbespot öffnen auf `/resources/materials` |
| Viewports | 1440 × 900, 768 × 1024, 375 × 812 |
| Paare und Nachweise | 72 Vorher-/Nachher-Paare plus 3 Nachher-only Video-Screenshots |

Der Harness orientiert sich am robusten Lebenszyklus von Gate G16:

- freie Preview- und CDP-Ports vor dem Start ermitteln;
- je Lauf ein eindeutiges temporäres Chrome-Profil verwenden;
- Preview und Chrome kontrolliert beenden, auf ihre Exit-Events warten und das Profil erst danach bereinigen;
- bei Body-Overflow, internem horizontalen Tabellen-/Container-Scroll, abweichendem Seitentitel oder Prozessfehler mit Exit ungleich 0 abbrechen;
- alle 41 Routen aus `APP_ROUTES` mit Routentitel und 0 px Body-Overflow prüfen;
- Der Werbespot-Flow öffnet die Videokarte und prüft Player, sichtbaren Titel, `controls`, fehlendes `autoplay`, fehlendes `loop`, lokalen WebM-Pfad und sichtbaren Fallback-Link. Seine drei Screenshots sind als `nachher-only` zu kennzeichnen.
- `generateAuftrag033ScreenshotMatrix.mjs` dokumentiert Hash, Größe und Erfassungsstatus aller 72 Paare sowie der drei Nachher-only Video-Screenshots. Nur Seiten, die nach dem vorangehenden V1-Audit tatsächlich verändert wurden, müssen als `DISTINCT` nachgewiesen werden. Eine nachweislich unveränderte, bereits V2-konforme Seite – insbesondere `/product/roadmap` – wird als `UNCHANGED` mit Begründung im Build-Log ausgewiesen; sie darf nicht für eine rein formale Hash-Änderung modifiziert werden.

## Verifikation und Abnahme

Alle folgenden Befehle laufen gegen die Baseline `90a4c19` und müssen mit Exit 0 enden:

```bash
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 90a4c19..HEAD
git diff --exit-code 90a4c19..HEAD -- src/simulation src/context src/services/data
node scripts/captureAuftrag033GateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag033ScreenshotMatrix.mjs
```

Die Abnahme setzt voraus:

1. Alle 24 Zielrouten wirken als zusammenhängende V2-Oberfläche; vorhandene Daten, Charts, Texte, Zeit- und Quellenbezüge sind vollständig erhalten.
2. Keine der 24 Zielseiten weist bei 1440 px, 768 px oder 375 px horizontalen Body- oder internen Tabellen-/Container-Überlauf auf; alle fachlich relevanten Informationen bleiben lesbar.
3. Status, Warnungen, Zeitbezüge und Quellen sind nicht nur farblich codiert.
4. Der Werbespot ist als lokale, echte Marketing-Ressource sichtbar, öffnet mit zugänglichen nativen Controls, startet nicht automatisch und verfügt über einen Text-Fallback; Original, Poster und Provenienz sind dokumentiert.
5. Alle 41 Deep-Links und Seitentitel bestehen; Routing, Adapter und Navigation bleiben unverändert.
6. Die Screenshot-Matrix enthält alle 72 Paare und drei Nachher-only Video-Screenshots. Jede veränderte Fachseite ist `DISTINCT`; jede bewusst unveränderte V2-Seite ist als `UNCHANGED` mit Begründung im Build-Log dokumentiert.
7. Die Schutzbereichs-Prüfung liefert für `src/simulation`, `src/context` und `src/services/data` exakt 0 Zeilen Diff. Änderungen an `src/types/resource.ts`, `src/domain/resourceRegistry.ts` und den drei genannten Resources-Komponenten dürfen ausschließlich die Werbespot-Integration enthalten.
8. Der Builder-Bericht steht im `docs/BUILD_LOG.md`; erst dann wird der Auftrag an Codex zur unabhängigen Prüfung übergeben.
