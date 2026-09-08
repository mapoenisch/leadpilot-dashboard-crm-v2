# Auftrag 042: Live Performance Surface

> **Für Antigravity:** Dieser Auftrag wird seriell auf einem eigenen Arbeitsbranch auf Basis von `e243dca` bearbeitet. Lies vor dem ersten Edit `CLAUDE.md`, `ARCHITECTURE_DECISIONS.md`, `docs/BUILD_LOG.md`, die Aufträge 040 und 041, die UX-Spezifikation `docs/superpowers/specs/2026-09-08-v2-1-live-performance-design.md` sowie diese Datei vollständig. Ändere ausschließlich die unten benannten Dateien. Nach Abschluss folgt der Builder-Bericht; Codex prüft unabhängig. Kein Merge, Tag oder Push.

**Version:** V2.1.0
**Phase:** Live Performance – Oberfläche
**Gate:** G26
**Status:** FREIGEGEBEN
**Baseline:** `e243dca` (`fix(live-kpi): query latest 30 history points DESC and sort chronologically ASC for Gate G25`)
**Architekturquelle:** `docs/superpowers/specs/2026-09-08-v2-1-live-performance-design.md`
**Vorgänger:** G24 und G25 sind freigegeben.

## 1. Ziel

Ergänze `/dashboard` um die bestätigte Live-Performance-Fläche für Ebene C. Sie besteht aus drei isolierten Kern-Karten (ARR, MRR, Pipeline Coverage), einem Streaming-ARR-Graphen, einem ARR-Mix-Ring, einem Funnel-Balkendiagramm und einem kompakten Activity-Feed. Die Fläche verwendet ausschließlich den freigegebenen G24-Katalog und die G25-Selector-Hooks; sie zeigt niemals einen statischen Ersatzwert oder ein Fixture als Produktwert.

Die Gestaltung orientiert sich ausschließlich stilistisch an den bestätigten statischen LeadPilot-Referenzen: tiefgrüner Hintergrund, transparente Glass-Panels, feine Cyan-Kanten, zurückhaltende horizontale Gitterlinien, Cyan als Primärdatenfarbe und Orange nur für eine klar benannte Qualitäts-/Risikoabweichung. Die Referenzbilder liefern keine Anzeigedaten.

## 2. Verbindliche Daten- und Render-Grenze

- Ebene A bleibt historisch und unveränderlich, Ebene B bleibt deterministische Simulation, Ebene C zeigt nur bestätigte Live-Snapshots aus `live_kpi_public_feed`.
- Komponenten beziehen Daten ausschließlich über `useLiveKpi`, `useLiveKpiHistory`, `useLiveKpiActivity`, `LIVE_KPI_DEFINITIONS` und `getLiveKpiDefinition`.
- Kein Component- oder Hook-Import von `supabaseClient`, kein Browser-Schreibzugriff, kein Raw-Event, kein `context`, keine Event-/Correlation-ID, kein neuer Context/Redux-Store und kein Polling.
- Ohne Konfiguration oder ohne Snapshot zeigt jede betroffene Karte/Visualisierung ihren ruhigen, textlichen Zustand. Kein `0`, keine Schätzung und keine Fixture-Zahl als Fallback.
- `LiveKpiActivityItem` aus G25 enthält absichtlich nur `kpiId`, `value`, `unit`, `occurredAt`, `qualityStatus`. Der Feed zeigt deshalb Kataloglabel, formatierten Wert, Qualität und Zeit – **keine** Quelle oder fachliche Aussage wie „Neuer Deal“.
- Es gibt keine neue npm-Abhängigkeit. Reuse: React, Framer Motion, Recharts, `Card`, `Badge`, vorhandene Chart-Primitives und `MANAGEMENT_CHART_THEME`.

## 3. Verbindliches Layout

Die neue `LivePerformanceSection` steht in `ExecutiveDashboardPage` direkt **nach dem Page Header und vor** `ExecutiveCockpit`. Sie ist damit die sichtbare, führende Ebene der Seite; die bisherigen historischen Cockpit-Panels bleiben danach als Ebene A erhalten. Sie erhält einen klaren Abschnittstitel („Live Performance“) und die Kennzeichnung „Ebene C · bestätigte Live-Ist-Daten“.

| Breite | Anordnung |
|---|---|
| ab 1024 px | 12-Spalten-Grid: drei Karten je 4 Spalten; danach ARR-Graph 8 / Ring 4; danach Funnel 8 / Feed 4. |
| 768–1023 px | Alle Panels logisch einspaltig: ARR, MRR, Pipeline Coverage, ARR-Graph, ARR-Mix, Funnel, Feed. |
| bis 767 px | Dieselbe einspaltige Reihenfolge, Panel-Inhalt mit `min-width: 0`, nie horizontal scrollbar. |

Die Section ist keine Reihe generischer Standardkarten. Sie bildet eine zusammenhängende, tiefgrüne technische Oberfläche: klarer Eyebrow, große Überschrift, kompakte Status-Pills, ein ruhiges Cyan-Punkt-/Linienraster im Section-Hintergrund und deutlich lesbare, feine Cyan-Rahmen mit weichem Lichtsaum. Die vorhandene Glass-Card-Sprache wird dadurch sichtbar verstärkt, nicht ersetzt. Die Diagramme übernehmen die technische Tiefe der Referenzen: dezente perspektivische Balkenflächen, Cyan-Leuchtkanten, weiche Schatten, ein vertikaler Area-Gradient und ein zurückhaltendes Cyan-Punkt-/Linienraster sind verbindlich. Verboten bleiben dekorative Partikel, glitzernde Effekt-Hintergründe, übertriebene 3D-Animationen und neue Design-Tokens.

## 4. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_042_LIVE_PERFORMANCE_SURFACE.md` | Diese Auftragsquelle; nach Umsetzung nur Status pflegen. |
| `src/components/liveKpi/LivePerformanceSection.tsx` | Orchestriert ausschließlich das Layout, Abschnittslabel und die fünf Teilflächen. |
| `src/components/liveKpi/StreamingAreaChart.tsx` | ARR-Historie als begrenzter, zugänglicher Cyan-Area-Graph. |
| `src/components/liveKpi/LiveArrMixDonut.tsx` | Ring aus vier ARR-Mix-KPIs mit explizitem Unvollständigkeitszustand. |
| `src/components/liveKpi/LiveFunnelBarChart.tsx` | Balkendiagramm der fünf Funnel-Stufen mit Tabellenalternative. |
| `src/components/liveKpi/LiveActivityFeed.tsx` | Sicherer Activity-Feed aus G25-Activity-Items. |
| `src/components/liveKpi/LiveKpiCard.tsx` | Bestehende memoized Karte für ARR/MRR/Coverage erweitern; keine parallele Karten-Komponente. |
| `src/components/liveKpi/AnimatedKpiValue.tsx` | Bestehende Count-up-/Reduced-Motion-Semantik nur bei Bedarf präzisieren. |
| `src/styles/global.css` | Einmalige CSS-Animation `live-kpi-pulse` und responsive Surface-Klassen. |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | `LivePerformanceSection` unter `ExecutiveCockpit` einbinden und die frühere einzelne Coverage-Karte dort entfernen. |
| `scripts/verifyLivePerformanceSurface.ts` | Deterministischer lokaler G26-Verifier für Struktur, Datenquellengrenze, Motion und A11y. |
| `scripts/captureAuftrag042GateScreenshots.mjs` | Browser-Harness für getrennte Deep-Link-/Reload-Beweise und alle 12 PNGs. |
| `scripts/generateAuftrag042ScreenshotMatrix.mjs` | Liest echte PNG-Bytes, erzeugt Hash-Matrix und schlägt bei Lücken/Gleichheit fehl. |
| `docs/screenshots/auftrag-042/README.md` | Maschinen-generierte Matrix und Messwerte; manuell nicht vorab anlegen. |
| `docs/BUILD_LOG.md` | Neuer Builder-Bericht nach grünem Gate. |

Keine andere Datei ändern. Besonders unverändert bleiben:

- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/**`, `src/features/resources/**`
- `supabase/**`, `tools/n8n/**`, `package.json`, CRM-/Baseline-/RNG-/Run-/Versionspfade
- sämtliche Seiten außerhalb von `ExecutiveDashboardPage.tsx`.

## 5. Verbindliche Komponenten

### 5.1 Drei Live-Karten und Data Pulse

`LivePerformanceSection` rendert exakt drei Instanzen der bestehenden, weiterentwickelten `LiveKpiCard`:

| KPI | Titel | Fallback-Einheit |
|---|---|---|
| `arr` | `Live ARR` | `€` |
| `mrr` | `Live MRR` | `€` |
| `pipeline_coverage` | `Live Pipeline Coverage` | `x` |

`LiveKpiCard` bleibt `React.memo`-isiert. Das bestehende `data-testid="live-kpi-card"` bleibt für G19-Kompatibilität erhalten; ergänze das Attribut `data-kpi-id` mit der jeweiligen KPI-ID. Alle Karten zeigen weiter Ebene C, Status, Qualitätszustand und den vorhandenen ehrlichen Unconfigured-/Offline-/Error-Text.

Bei einem echten, neueren Snapshot nach dem ersten Wert:

1. Count-up bleibt maximal **220 ms** und nutzt tabellarische Ziffern (`font-variant-numeric: tabular-nums`).
2. Ein zusätzliches rein dekoratives Overlay startet genau einmal pro Snapshot mit `className="live-kpi-pulse"`; es besitzt `aria-hidden="true"`, `pointer-events: none` und einen Snapshot-spezifischen React-Key. Dadurch läuft es ohne JavaScript-Timer genau einmal und kann bei Event-Bursts neu starten, ohne sich zu stapeln.
3. Die CSS-Animation dauert exakt **1.2 s**, verändert kein Layout und verwendet sichtbar Cyan `#00f2fe` als Glow-/Shadow-Farbe.
4. Beim ersten Snapshot, bei unverändertem Wert, bei `unconfigured`, `loading`, `offline`, `error` und bei `prefers-reduced-motion: reduce` erscheint kein Pulse-Overlay.
5. Screenreader erhalten weiterhin synchron den finalen Zahlenwert; visuelle Zwischenwerte sind nicht die alleinige Informationsquelle.

In `global.css` ist `@media (prefers-reduced-motion: reduce)` für `.live-kpi-pulse` explizit `animation: none`. `AnimatedKpiValue` behält die bestehende Prüfung `useReducedMotion` und `matchMedia`; im reduzierten Modus darf kein Framer-Motion-Node für den Zahlenwechsel entstehen.

### 5.2 StreamingAreaChart

`StreamingAreaChart` bindet ausschließlich `useLiveKpiHistory('arr')`.

- `data-testid="live-performance-arr-chart"`; verständlicher `aria-label` und sichtbare Textalternative unterhalb des Charts.
- Bei Daten: höchstens 30 G25-Historienpunkte, zusätzlich auf die letzten 30 Minuten begrenzt. Die Eingabe ist chronologisch aufsteigend; der älteste Punkt steht links, der jüngste rechts.
- Recharts `ResponsiveContainer` + `AreaChart`, `MANAGEMENT_CHART_THEME`, Cyan-Hauptlinie, vertikaler Cyan-zu-transparent-Gradient und reduziertes horizontales Grid. Keine zweite Chart-Farbwelt.
- Der letzte Datenpunkt erhält einen Cyan-Halo. Achsen und Tooltip formatieren EUR deutschsprachig; Tooltip ist per Maus, Touch und Tastatur erreichbar.
- Neue Daten dürfen ausschließlich die Kurve mit höchstens 220 ms bewegen. Bei `prefers-reduced-motion: reduce` gibt es keine Chart-Transition.
- `unconfigured`, `loading`, `offline`, `error` und „noch keine ARR-Ereignisse“ sind textlich unterscheidbar. Die Textalternative enthält im Datenfall mindestens Zeit und formatierten Wert jedes sichtbaren Punktes; sonst den konkreten Status, ohne Ersatzwert.

### 5.3 LiveArrMixDonut

`LiveArrMixDonut` nutzt nur diese vier IDs über `useLiveKpiActivity`:

```ts
const ARR_MIX_IDS = ['arr_direct', 'arr_partner', 'arr_outbound', 'arr_other'] as const;
```

- `data-testid="live-performance-arr-mix"`, Überschrift „ARR-Mix nach Akquisitionsquelle“ und semantische Legende.
- Erst wenn zu **allen vier** IDs ein bestätigter Snapshot vorliegt, wird der Ring als vollständiger Mix gezeichnet. Fehlende Quellen werden nie als `0 €` interpretiert.
- Bei unvollständigem Mix: sichtbarer Text „Live-Mix unvollständig – es fehlen bestätigte Werte“, fehlende Kataloglabels und keine Prozentberechnung. Bereits bestätigte Werte dürfen als Liste erscheinen, eindeutig mit „bestätigt“ markiert.
- Bei vollständigem Mix: `PieChart`/`Pie` mit vier klar unterscheidbaren Cyan-/Mint-Abstufungen und Legende aus Kataloglabels; Prozentwerte nur aus der Summe der vier bestätigten Werte. Orange ausschließlich bei einem `degraded`-Snapshot samt textlicher Qualitätswarnung.
- Eine zugängliche Liste/Tabelle enthält Quelle, EUR-Wert und – nur bei vollständigem Mix – Anteil in Prozent.

### 5.4 LiveFunnelBarChart

`LiveFunnelBarChart` nutzt nur diese fünf IDs über `useLiveKpiActivity`:

```ts
const FUNNEL_IDS = [
  'pipeline_leads', 'pipeline_mql', 'pipeline_sql', 'pipeline_offers', 'pipeline_won',
] as const;
```

- `data-testid="live-performance-funnel"`, Überschrift „Live Funnel nach Stufe“ und fünf feste Kataloglabels in dieser Reihenfolge.
- Ein Balken ist nur sichtbar, wenn der zugehörige bestätigte Snapshot existiert; fehlende Stufen zeigen „Warte auf bestätigten Live-Wert“, nicht `0`.
- Recharts `BarChart` mit einer eigenen SVG-`shape` für die bestätigten Balken: sichtbare Vorderseite sowie schmale Ober- und Seitenfläche erzeugen eine ruhige Pseudo-3D-Tiefe wie in den Referenzen. Die Flächen verwenden vorhandene Cyan-/Mint-Werte, feine Cyan-Leuchtkante und weichen Shadow; bei `degraded` Orange mit sichtbarer Textwarnung. Keine Conversion-Rate und keine Risikobehauptung aus einzelnen Werten ableiten.
- Tabellenalternative mit Stufe, bestätigtem Wert bzw. fehlendem Status und Qualität; sie bleibt auf 375 px sichtbar.

### 5.5 LiveActivityFeed

`LiveActivityFeed` nutzt exakt diese explizite ID-Reihenfolge:

```ts
const ACTIVITY_IDS = [
  'arr', 'mrr', 'pipeline_coverage',
  'arr_direct', 'arr_partner', 'arr_outbound', 'arr_other',
  'pipeline_leads', 'pipeline_mql', 'pipeline_sql', 'pipeline_offers', 'pipeline_won',
] as const;
```

- `data-testid="live-performance-activity"`; maximal zehn Einträge, absteigend nach bestätigter Zeit.
- Je Eintrag ausschließlich Kataloglabel, formatierter Wert/Einheit, Zeit und Qualitätszustand. Keine Quelle, keine Rohdaten, keine Deutung eines Geschäftsereignisses.
- Ohne Daten: „Noch keine bestätigten Live-Aktivitäten“. Bei Offline-/Fehlerstatus bleibt dieser Status lesbar; es werden keine Einträge erfunden.
- Aktualisierungen tragen eine zugängliche, zurückhaltende Live-Region; sie dürfen keinen Fokus verschieben.

## 6. Erst Verifier schreiben (rot)

Lege `scripts/verifyLivePerformanceSurface.ts` **vor** den neuen Live-UI-Komponenten an. Der Rot-Test muss mit fehlenden Modulen/Test-IDs fehlschlagen. Der Verifier ist lokal, ohne Netzwerk, ohne Supabase und ohne echten n8n-Lauf.

Nach Umsetzung prüft er hart:

1. Existenz aller fünf neuen Komponenten, `LivePerformanceSection` im Executive Dashboard und keine weitere `LiveKpiCard`-Übergabe an `ExecutiveCockpit`.
2. Exakt drei `LiveKpiCard`-Bindings `arr`, `mrr`, `pipeline_coverage`, mit fortbestehendem `React.memo`, `data-testid="live-kpi-card"` und `data-kpi-id`.
3. Exakt die drei Surface-Test-IDs `live-performance-arr-chart`, `live-performance-arr-mix`, `live-performance-funnel`, `live-performance-activity` sowie `live-performance-section`.
4. Nur G24-Katalog-/G25-Hook-Imports: keine Supabase-Client-, `live_kpi_events`-, `context`-, Event-ID-, Correlation-ID-, Fixture- oder statische Zahlen-Fallback-Referenz in den neuen/angepassten UI-Dateien.
5. ARR-Chart nutzt `useLiveKpiHistory('arr')`, Recharts `AreaChart`, `ResponsiveContainer`, `MANAGEMENT_CHART_THEME`, einen Gradient und eine Textalternative; Ring und Funnel verwenden jeweils nur ihre exakt in Abschnitt 5 aufgeführten IDs.
6. Activity-Feed mappt nur `kpiId`, `value`, `unit`, `occurredAt`, `qualityStatus`; seine Render-Zeile enthält keine Quelle, keine technisch interne ID und keinen Rohkontext.
7. CSS enthält `live-kpi-pulse`, `#00f2fe`, eine Einzelanimation mit `1.2s` sowie die explizite Reduced-Motion-Deaktivierung. Karte/Value enthalten keinen Pulse-Timer, keine Endlosschleife und keine Motion-Node im Reduced-Motion-Zweig.
8. Alle drei Diagramme haben sichtbare Text-/Tabellenalternativen und behandeln fehlende Daten über Statuscopy, niemals über eine Zahl `0`.
9. Keine neue npm-Abhängigkeit und keine geschützte Datei wurde geändert.

Führe den Rot-Test aus und dokumentiere den echten Fehler im Builder-Bericht:

```bash
npx tsx scripts/verifyLivePerformanceSurface.ts
```

## 7. Screenshot-, Deep-Link- und Reload-Nachweis

### 7.1 Getrennte Browser-Prüfung

`captureAuftrag042GateScreenshots.mjs` misst `/dashboard` auf `1440×900`, `768×1024` und `375×812`, jeweils auf der isoliert gebauten Baseline `e243dca` (`vorher`) und dem aktuellen Branch (`nachher`). Er nutzt wie die bestehenden Harnesses Vite Preview und Headless Chrome/CDP.

Für **jede** Stage und **jeden** Viewport zwingend getrennt:

1. direkter `Page.navigate` auf `/dashboard`, DOM- und Overflow-Prüfung, Screenshot;
2. explizites `Page.reload`, erneute DOM- und Overflow-Prüfung, Screenshot.

Folgende zwölf Dateien müssen entstehen:

```text
dashboard-1440-vorher-deeplink.png   dashboard-1440-vorher-reload.png
dashboard-768-vorher-deeplink.png    dashboard-768-vorher-reload.png
dashboard-375-vorher-deeplink.png    dashboard-375-vorher-reload.png
dashboard-1440-nachher-deeplink.png  dashboard-1440-nachher-reload.png
dashboard-768-nachher-deeplink.png   dashboard-768-nachher-reload.png
dashboard-375-nachher-deeplink.png   dashboard-375-nachher-reload.png
```

Jede DOM-Prüfung assertiert: Titel vorhanden, `main` vorhanden, keine Not-Found-Seite, nachher `live-performance-section` und alle vier Visual-Test-IDs sichtbar und mit positiver Breite/Höhe, alle drei Karten im Dokument vorhanden, `scrollWidth - clientWidth === 0`. Für 768 und 375 muss die Element-Reihenfolge der in Abschnitt 3 genannten Stapelreihenfolge entsprechen.

### 7.2 Hash-Matrix

`generateAuftrag042ScreenshotMatrix.mjs` liest alle zwölf PNGs direkt vom Dateisystem und schreibt `docs/screenshots/auftrag-042/README.md` mit:

- Dateiname, Bytegröße und vollständigem SHA-256 je PNG;
- getrennten Messwerten für Deep-Link und Reload;
- sechs Paarvergleichen `vorher` gegen `nachher` derselben Viewport-/Ladeweg-Kombination; jedes Paar muss unterschiedliche Hashes haben;
- jeder fehlenden/leeren Datei, jedem gleichen Paar, jedem horizontalen Overflow oder einer gescheiterten DOM-Assertion als Exit 1.

Die Matrix darf keine erfundenen Hashes oder pauschale Erfolgstexte enthalten. Sie wird ausschließlich aus den gemessenen JSON-/PNG-Ergebnissen generiert.

## 8. Verifikation und Gate G26

Vor dem Builder-Bericht vollständig und mit Exit 0 ausführen:

```bash
npx tsx scripts/verifyLivePerformanceSurface.ts
npx tsx scripts/verifyLiveKpiStream.ts
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLiveKpiContract.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
node scripts/captureAuftrag042GateScreenshots.mjs --stage=all
node scripts/generateAuftrag042ScreenshotMatrix.mjs
git diff --check e243dca..HEAD
git diff --exit-code e243dca..HEAD -- src/simulation src/types src/context src/services/data src/services/db src/features/resources supabase package.json tools/n8n
```

Zusätzlich schriftlich nachweisen:

- Rot-Test vor den neuen UI-Dateien, anschließend grüne Verifier-Ausgabe.
- Alle drei verlangten Diagrammtypen – Area, Ring, Balken – sind als Recharts-Komponenten, zugängliche Textalternative und echte G24/G25-Datenbindung vorhanden.
- Count-up (max. 220 ms), Data Pulse (1.2 s, `#00f2fe`) und Reduced-Motion-Abschaltung sind hart verifiziert.
- Die zwölf tatsächlichen Screenshot-Dateien, Deep-Link und Reload sind vollständig und die sechs Vorher-/Nachher-Paare sind je Ladeweg unterschiedlich.
- Kein Wert, Event, Kontext oder Zugriff außerhalb der sicheren Ebene-C-Grenze wurde ergänzt.
- Der Schutzbereichs-Diff ist exakt leer.

## 9. Builder-Abschlussbericht

Ergänze ans Ende von `docs/BUILD_LOG.md` einen Abschnitt **„Gate G26 – Auftrag 042: Live Performance Surface“** mit Ziel/Kontext, allen geänderten Dateien, Datenquellengrenze, Komponenten-/Layoutnachweis, Motion-/Reduced-Motion-Nachweis, vollständiger Command-Matrix, Deep-Link-/Reload-Matrix, allen Screenshot-Hash-Ergebnissen, Schutzbereichs-Diff sowie dem Ergebnis `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

Erst danach einen einzelnen, fokussierten Commit erstellen, zum Beispiel:

```bash
git commit -m "feat(live-kpi): build live performance surface for Gate G26"
```

Weder `main`, Release-Tag noch Remote verändern.

## 10. Verbindliche Nacharbeit nach Codex-Review

Die Erstimplementierung auf `fd306cf` erfüllt die aktualisierte Referenzvorgabe für technische Diagrammtiefe noch nicht: `LiveFunnelBarChart.tsx` verwendet dort einen flachen Recharts-`Bar` ohne eigene SVG-`shape`, Ober-/Seitenfläche, Leuchtkante oder Schatten. Gate G26 ist deshalb nicht freigegeben und wird mit dieser Nacharbeit erneut vollständig bearbeitet.

1. Ersetze den flachen Balken durch eine lokale, typisierte Recharts-`shape`-Funktion. Sie erhält die von Recharts gelieferten Geometriewerte (`x`, `y`, `width`, `height`, `fill`) und zeichnet innerhalb des vorhandenen SVG-Viewports eine Vorderfläche als `rect`, eine schmale Oberseite als `polygon` und eine schmale rechte Seitenfläche als `polygon`.
2. Die Tiefe ist aus der vorhandenen Balkenbreite abzuleiten und auf höchstens 8 px zu begrenzen. Bei sehr kleinen Balken reduziert sie sich, darf nie negative Maße erzeugen und darf nicht über die Plot-Grenze hinausragen.
3. Verwende ausschließlich die vorhandenen Cyan-/Mint-/Orange-Werte und bestehende Chart-Theme-Werte. Ergänze eine feine Cyan-Leuchtkante und einen weichen SVG-Filter-Schatten; keine Partikel, keine Endlosanimation, keine neue Abhängigkeit und keine neuen globalen Design-Tokens.
4. Für `degraded` bleibt die bestehende Orange-/Qualitätssemantik erhalten. Die Pseudo-3D-Flächen dürfen diese Kennzeichnung nicht überdecken; die Tabellenalternative bleibt unverändert vollständig.
5. Erweitere `verifyLivePerformanceSurface.ts` so, dass er die eigene `shape`, Vorder-/Ober-/Seitenflächen, begrenzte Tiefe, SVG-Glow-/Shadow-Definition und die Abwesenheit dekorativer Endlosanimationen strikt prüft. Der alte flache `Bar` ohne `shape` muss den Verifier fehlschlagen lassen.
6. Wiederhole die vollständige G26-Command-Matrix aus Abschnitt 8 inklusive des 12-Dateien-Screenshot-/Deep-Link-/Reload-Nachweises. Ergänze `docs/BUILD_LOG.md` um Rot-/Grün-Nachweis für diese Nacharbeit und setze den Auftragsstatus erst dann auf `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

## 11. Verbindlicher visueller Neuaufbau nach Referenzvergleich

Der aktuelle Stand `fd306cf` ist auch über den einzelnen flachen Funnel hinaus **nicht abnahmefähig**. Der sichtbare Dashboard-Ausschnitt wirkt wie Standard-Recharts in schwach umrandeten Einzelkarten; die Live-Fläche liegt zudem unter den historischen Panels und prägt den ersten Bildschirm nicht. Das verfehlt die vom Auftrag gelieferten LeadPilot-Referenzen. Abschnitt 10 bleibt Pflicht und wird durch diesen Abschnitt erweitert.

1. **Priorität und Anordnung:** Binde `LivePerformanceSection` direkt nach `SectionHeader` und vor `ExecutiveCockpit` ein. Sie darf nicht unter den alten Ebene-A-Panels verschwinden. Auf 1440 px muss ihre Überschrift, die drei Live-Karten und mindestens der obere Rand der Diagrammzeile ohne Scrollen sichtbar sein. `ExecutiveCockpit` bleibt erhalten und folgt erst danach.
2. **Fläche statt Karten-Sammlung:** Gestalte die Section als eine zusammenhängende technische Bühne innerhalb der bestehenden Farben: dunkles Petrol als Grund, zurückhaltendes Cyan-Punkt-/Linienraster nur innerhalb der Section, leuchtende 1-px-Cyan-Kanten, Glass-Flächen mit klar erkennbarem Lichtsaum. Die Überschrift erhält Eyebrow, eine deutlich größere Display-Hierarchie als die Paneltitel und kompakte Status-Pills. Kein neues Theme, keine neuen globalen Tokens und keine Bild-/Partikel-Hintergründe.
3. **Kein Standarddiagramm-Look:** Sichtbare Diagramme dürfen nicht wie die unbearbeiteten Recharts-Defaults im beanstandeten Screenshot aussehen. Der ARR-Graph erhält den bestehenden Cyan-zu-Transparent-Area-Verlauf, ruhige horizontale Gitterlinien, eine leuchtende Hauptlinie und einen klaren letzten Datenpunkt mit Halo. Der ARR-Ring erhält einen erkennbar starken Ring, ein ruhiges Zentrum und eine eng zugeordnete Legende. Der Funnel erhält die in Abschnitt 10 beschriebene dreiflächige Pseudo-3D-Geometrie mit Lichtkante und Schatten. Datenlabels und Achsen bleiben lesbar und zurückhaltend.
4. **Ehrliche Zustände bleiben sichtbar gestaltet:** Ohne bestätigte Live-Daten erscheinen keine erfundenen Werte, Balken oder Tortenstücke. Der jeweilige Textzustand bleibt jedoch Teil derselben hochwertigen Fläche (Rahmen, Header, Raster, Proportionen) und nicht eine isolierte gestrichelte Standard-Placeholder-Box.
5. **Responsive Pflicht:** Auf 768 px und 375 px bleibt die Reihenfolge aus Abschnitt 3 einspaltig. Das technische Raster wird dabei gedrosselt, der Abschnittstitel bricht lesbar um und die Diagramme, Legenden sowie Tabellenalternativen bleiben ohne horizontalen Overflow nutzbar.
6. **Harter visueller Verifier:** Ergänze `verifyLivePerformanceSurface.ts`, so dass der bisherige Einbau unter `ExecutiveCockpit` fehlschlägt. Er prüft außerdem die Section-Klassen für Raster und Lichtsaum, die sichtbare Eyebrow-/Titelstruktur, den eigenen Pseudo-3D-Funnel sowie bei Area und Ring die vorgesehenen Gradient-/Halo-/Legenden-Elemente. Eine bloße `Bar`-/`Area`-/`Pie`-Standardkonfiguration ohne diese Elemente darf den Gate-Test nicht bestehen.
7. **Screenshot-Abnahme:** Ergänze zum G26-Bericht einen expliziten visuellen Vergleich auf 1440 px gegen die freigegebenen Referenzen. Nicht als Behauptung, sondern mit Verweis auf die nachher-Datei: Platzierung vor dem historischen Cockpit, sichtbare technische Bühne, Cyan-Kanten/Raster und die drei Diagrammtypen müssen darin kontrollierbar sein. Wenn der lokale Live-Feed nicht konfiguriert ist, ist das als Grenze zu dokumentieren; die Screenshot-Matrix ersetzt keine erfundenen Produktdaten.

## 12. Verbindliche Nacharbeit nach unabhängiger G26-Prüfung

Die Nacharbeitung auf `d3c9a37` erfüllt Platzierung, Datenisolation und die technischen Gates, ist aber visuell noch nicht freigegeben. Diese zwei Punkte sind vollständig nachzubessern:

1. **[P1] Kein gestrichelter Standard-Placeholder im sichtbaren Offline-Zustand:** Die 1440px-Nachher-Aufnahme zeigt drei `LiveKpiCard`- und den Funnel-Leerzustand mit der alten, isolierten gestrichelten Box. Das widerspricht Abschnitt 11.4 unmittelbar. Ersetze in `LiveKpiCard.tsx`, `LiveFunnelBarChart.tsx` und allen übrigen leeren Live-Visualisierungen jede `border: '1px dashed ...'`-Box durch einen ruhigen, integrierten Inset-Zustand der Live-Bühne: feste feine Cyan-/Petrol-Kante, derselbe Panel-Untergrund und keine Dummy-Zahl. Der Statuscopy bleibt unverändert ehrlich. Ergänze eine harte Verifier-Assertion, dass in den fünf Live-Surface-Komponenten keine gestrichelte Empty-State-Border mehr vorkommt.
2. **[P2] Pseudo-3D-Shape tatsächlich typisieren:** `renderPseudo3dBar(props: any)` ist trotz vorhandener `BarShapeProps` nicht typisiert. Deklariere die lokale Funktion mit `props: BarShapeProps` (bei Bedarf Interface für die von Recharts verwendeten Zusatzfelder erweitern), ohne `any` an dieser Shape-Grenze. Der Verifier muss die typisierte Signatur prüfen, sodass der aktuelle `props: any`-Stand scheitert.
3. Wiederhole danach Abschnitt 8 vollständig, einschließlich Browser-Screenshots und Hash-Matrix. Erst bei grünem Verifier sowie einer sichtbaren, nicht gestrichelten Offline-Fläche ist der Status wieder `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

## 13. P1: Reproduzierbare Vorher-Baseline im Screenshot-Harness

Die unabhängige Ausführung von `node scripts/captureAuftrag042GateScreenshots.mjs --stage=all` zeigt, dass der aktuelle Harness für `vorher` und `nachher` denselben Arbeitsordner baut und misst. `runStageCapture(stage)` startet `npm run build` und Vite Preview ohne stage-spezifisches `cwd`; es gibt weder einen Baseline-Commit noch einen isolierten Git-Worktree. Dadurch können die Vorher-Dateien aus dem aktuellen Build entstehen. Im unabhängigen Lauf waren fünf der sechs Vorher-/Nachher-Paare byteidentisch. Die bestehende Matrix ist daher kein reproduzierbarer Nachweis gegen `e243dca`.

1. Erweitere `captureAuftrag042GateScreenshots.mjs` nach dem erprobten Muster von `captureAuftrag039ReleaseMatrix.mjs`: Für Stage `vorher` muss Commit `e243dca` in einem temporären, isolierten Git-Worktree ausgecheckt, gebaut und über dessen eigenes `node_modules/vite/bin/vite.js` ausgeliefert werden. Stage `nachher` baut ausschließlich den aktuellen Arbeitsbranch. Die PNG-Ausgabe bleibt eindeutig unter `docs/screenshots/auftrag-042/` im aktuellen Arbeitsbranch.
2. Der Harness gibt vor jeder Stage den tatsächlich gebauten Git-Commit aus und prüft hart: `vorher === e243dca`, `nachher === HEAD`. Fehlender Worktree, abweichender Commit, gleicher Build-Pfad oder ein nicht existierendes Stage-Arbeitsverzeichnis führen zu Exit 1.
3. Erweitere `verifyLivePerformanceSurface.ts` um statische Assertions für Baseline-Commit, isolierten Worktree, stage-spezifisches Build-/Preview-`cwd` und getrennte Cleanup-Logik. Der aktuelle Harness ohne Worktree muss den Verifier fehlschlagen lassen.
4. Führe anschließend wirklich `--stage=all` und den Matrix-Generator aus. Die sechs Paar-Hashes dürfen im Builder-Bericht erst dann als Nachweis genannt werden. Erst nach grünem vollständigem Durchlauf wird der Auftragsstatus wieder auf `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG` gesetzt.

### Codex-Freigabe

Die Nacharbeit wurde unabhängig auf Commit `212e43b` geprüft. Der frische `--stage=all`-Lauf baute Stage `vorher` im isolierten Worktree auf `e243dca` und Stage `nachher` auf `212e43b`; der Matrix-Generator bestätigte 6/6 unterschiedliche Paare ohne horizontalen Overflow. Alle G26- und Vorgänger-Gates sowie der Schutzbereichs-Diff sind grün. Gate G26 ist freigegeben; ein Merge, Tag oder Push ist damit nicht angeordnet.
