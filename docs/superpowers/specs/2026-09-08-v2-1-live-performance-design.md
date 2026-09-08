# V2.1.0 Live Performance – Architektur und UX-Spezifikation

**Status:** Von Marc am 08.09.2026 fachlich und visuell bestätigt.
**Ausgangspunkt:** Release `v2.0.0` / Commit `5b22635`; Ebene-C-Datenvertrag, sichere Supabase-Projektion, Realtime-Adapter und eine einzelne `pipeline_coverage`-Karte existieren bereits.
**Ziel:** Die isolierte Ebene C wird zur eigenständigen, ehrlichen Live-Performance-Fläche im Executive Cockpit. Sie zeigt echte Live-Werte für ARR, MRR und Pipeline Coverage sowie die notwendigen, einzeln eingespeisten Teil-KPIs für Ring- und Balkendiagramm.

## 1. Produktentscheidung und Grenzen

Die Live-Ebene bleibt eine dritte Datenebene:

- **Ebene A:** historische, unveränderliche Baseline.
- **Ebene B:** deterministische Simulation.
- **Ebene C:** ausschließlich bestätigte, von n8n über die bestehende Ingest-RPC in Supabase geschriebene Live-Ereignisse.

Keine Live-Karte ersetzt eine historische oder simulierte Kennzahl. Ohne konfigurierte Quelle oder ohne akzeptiertes Ereignis zeigt die Oberfläche einen ruhigen, erklärenden Status – nie einen Ersatzwert, eine Schätzung oder Testdaten.

Das v2.1-Layout entspricht der bestätigten Skizze:

1. Drei gleichwertige Live-Karten: ARR, MRR und Pipeline Coverage.
2. Breiter Streaming-Area-Chart für ARR (letzte 30 Minuten).
3. Ring-Diagramm für die ARR-Verteilung nach Akquisitionsquelle.
4. Balken-Diagramm für die aktuelle Pipeline nach Funnel-Stufe.
5. Kompakter Activity-Feed aus denselben bestätigten öffentlichen Live-Events.

Die vier bereitgestellten WebP-Bilder sind ausschließlich Stilreferenzen: dunkle tiefgrüne Flächen, feine Cyan-Rahmen, dezente Gitternetzlinien, leuchtende cyanfarbene Primärdaten und Orange für Risiko/Abweichung. Sie sind keine Quelle für angezeigte Produktwerte.

Nicht Bestandteil sind eine Schreibfunktion im Browser, Live-Zugriff auf HubSpot, Änderungen an Simulation/Baselines, frei erfundene Aktivitätsbeschreibungen, ein globaler Redux-/Context-Store oder neue npm-Abhängigkeiten.

## 2. Verbindlicher Live-KPI-Katalog

Der bestehende Contract bleibt generisch; für v2.1 wird ein expliziter, zentraler Katalog mit Anzeigeformat, Einheit, Gruppen- und Quellenbezeichnung ergänzt. Nur diese IDs werden von der neuen Oberfläche gelesen:

| Gruppe | KPI-IDs | Einheit | Zweck |
|---|---|---:|---|
| Kernwerte | `arr`, `mrr`, `pipeline_coverage` | `EUR`, `EUR`, `x` | Drei isolierte Live-Karten |
| ARR-Mix | `arr_direct`, `arr_partner`, `arr_outbound`, `arr_other` | `EUR` | Ring-Diagramm; seine Segmente werden aus echten Live-Werten gebildet |
| Funnel | `pipeline_leads`, `pipeline_mql`, `pipeline_sql`, `pipeline_offers`, `pipeline_won` | `count` | Balken-Diagramm; keine aus anderen Werten geschätzten Stufen |

n8n emittiert für jede dieser Kennzahlen nur validierte `live-kpi-event/v1`-Ereignisse über die vorhandene Ingest-RPC. Die jeweiligen fachlichen Quellsysteme, Event-IDs, Zeitstempel, Qualitätsstatus und Korrelationen bleiben am bestehenden Contract gebunden. Der Browser liest weiterhin ausschließlich `live_kpi_public_feed`, niemals die Roh-Event- oder Rejection-Tabellen.

Die vorhandene Projektion speichert bereits jeden akzeptierten Wert mit KPI-ID, Quelle und Zeit. Deshalb genügt für die 30-Minuten-Historie eine begrenzte, sortierte Read-Abfrage auf diese Projektion; kein zweites Datenmodell und keine Browser-Schreibrechte werden eingeführt. Eine Retention-Entscheidung für alte Live-Ereignisse bleibt ein späterer Betriebsauftrag und ist für die v2.1-Darstellung nicht erforderlich.

## 3. Datenfluss und Render-Isolierung

```text
n8n → ingest_live_kpi_event RPC → live_kpi_events
    → sichere Trigger-Projektion → live_kpi_public_feed
    → Live-KPI-Stream-Store (eine Subscription je KPI-ID)
      ├─ LiveMetricCard (nur aktueller Snapshot)
      ├─ StreamingAreaChart (begrenzte ARR-Historie)
      ├─ LiveArrMixDonut / LiveFunnelBars (nur eigene KPI-Gruppe)
      └─ LiveActivityFeed (nur sichere öffentliche Metadaten)
```

Ein schlanker, modulinterner Stream-Store ersetzt nicht die Datenquellen-Architektur und ist kein globaler App-Context. Er hält pro KPI-ID den neuesten Snapshot, eine begrenzte Historie und genau einen referenzgezählten Supabase-Channel. Selektor-Hooks liefern nur den benötigten Teilzustand. Dadurch rendert ein neues ARR-Ereignis die ARR-Karte, den ARR-Chart, den ARR-Mix (falls betroffen) und den Feed neu – nicht die ganze Seite, die Simulation oder die anderen Fachbereiche.

Der Store lädt vor dem Abonnement den neuesten Snapshot beziehungsweise die begrenzte Historie. Bei `SUBSCRIBED` wird erneut gelesen; bei `CHANNEL_ERROR`, `TIMED_OUT` und `CLOSED` bleiben die bestehenden ehrlichen Statuszustände erhalten. Bei Unmount werden Listener und Channel exakt einmal entfernt. Ein verspäteter Read oder ein Event mit älterem Zeitstempel darf einen neueren Wert nicht überschreiben.

Der Activity-Feed zeigt nur sichere Felder der öffentlichen Projektion: KPI-Bezeichnung aus dem Katalog, formatierter Wert, Datenquelle, Qualitätsstatus und Zeit. Aussagen wie „Neuer Vertrag“ sind erst zulässig, wenn die Datenbank eine separate, serverseitig whiteliste öffentliche Zusammenfassung bereitstellt; Roh-`context` bleibt privat.

## 4. Komponenten und visuelle Regeln

### Live-Surface

`LivePerformanceSection` wird in `/dashboard` unterhalb des Executive Cockpits platziert. Auf Desktop nutzt sie ein 12-Spalten-Grid: drei KPI-Karten (je vier Spalten), ARR-Chart (acht Spalten) neben Ringdiagramm (vier Spalten), Funnel-Balken (acht Spalten) neben Feed (vier Spalten). Bei Tablet und Mobile stapeln sich die Panels logisch, ohne horizontalen Overflow oder unzugängliche Tooltip-Zonen.

### Karten und Motion

- `LiveMetricCard` entwickelt die bestehende `LiveKpiCard` weiter, statt eine parallele Karte zu erzeugen.
- Zahlendarstellung nutzt tabellarische Ziffern und die vorhandene Framer-Motion-Implementierung. Ein echter Wertwechsel zählt flüssig vom letzten zum neuen Wert; der finale Wert ist für Screenreader sofort verfügbar.
- Die Count-Up-Dauer bleibt bei höchstens 220 ms, entsprechend dem bestehenden Performance-Budget. Der sichtbare Data-Pulse dauert 1,2 Sekunden: animierter Cyan-Schatten mit `#00f2fe`, ohne Layout-Shift und ohne mehrfachen Timer bei Event-Bursts.
- Bei `prefers-reduced-motion: reduce` entfallen Count-Up, Puls und Chart-Gleiten vollständig. Der neue Endwert erscheint sofort.
- Die vorhandenen Zustände `unconfigured`, `loading`, `live`, `offline` und `error` bleiben sichtbar, textlich verständlich und unabhängig von Farbe lesbar.

### Diagramme

- `StreamingAreaChart`: Recharts-`AreaChart`, höchstens 30 Zeitpunkte oder 30 Minuten (der engere Wert gewinnt), Datenpunkt rechts, ältester Punkt links entfernt. Cyan-Linie, vertikaler Cyan-zu-transparent-Gradient, reduziertes horizontales Gitternetz und aktueller Punkt mit Halo. Nur die SVG-Kurve gleitet beim neuen Punkt maximal 220 ms; keine Seiten- oder Layoutanimation.
- `LiveArrMixDonut`: Ring aus den vier ARR-Quellen. Fehlt eine Quelle, wird sie nicht zu Null umgedeutet; der Ring erhält einen klaren „unvollständiger Live-Mix“-Zustand. Farben und Legende sind zusätzlich über Quellnamen verständlich.
- `LiveFunnelBarChart`: fünf semantische Funnel-Stufen mit Zahlenwert, Textlabel und zugänglicher Tabellenalternative. Cyan ist Standard; Orange markiert ausschließlich den im Katalog als risikobehaftet definierten Übergang und erhält immer eine Textbegründung.
- Alle Diagramme verwenden und erweitern `MANAGEMENT_CHART_THEME`. Sie führen kein zweites Tailwind-Farb- oder Chart-System ein.

## 5. Fehler-, Datenqualitäts- und Accessibility-Verhalten

- `unconfigured`: „Supabase nicht konfiguriert – Ebene C inaktiv“; keine Platzhalterzahlen.
- `loading`: strukturierter Ladezustand ohne hektische Skeleton-Animation.
- `offline`: zuletzt bestätigter Snapshot bleibt als solcher gekennzeichnet; ohne Snapshot erscheint „Warte auf Live-Events“.
- `error`: Verbindungsfehler wird ruhig erklärt; automatische Wiederverbindung wird genutzt.
- `degraded`: Wert bleibt sichtbar, ergänzt um die bestehende Qualitätswarnung.
- Karten, Datenpunkte und Feed-Updates haben zugängliche Namen. Die drei Diagramme besitzen verständliche Beschreibungen und textlich vollständige Wertealternativen. Farbe, Glow und Bewegung sind nie alleinige Bedeutungsträger.
- Tooltips funktionieren mit Maus, Tastatur und Touch; auf kleinen Breiten bleibt die Textalternative sichtbar.

## 6. Arbeitspakete und Release-Reihenfolge

| Auftrag | Gate | Ergebnis |
|---|---|---|
| 040 – Live-KPI-Katalog und Multi-KPI-Pipeline | G24 | Katalog, n8n-Workflow/Fixtures, Contract- und Replay-Nachweise für alle zwölf IDs; keine UI. |
| 041 – Realtime-Historie und Stream-Isolierung | G25 | Begrenzter öffentlicher History-Read, referenzgezählte Subscriptions, Selektor-Hooks und sichere Feed-Daten. |
| 042 – Live Performance Surface | G26 | Bestätigtes responsives Layout, drei Karten, Area-, Ring- und Balkendiagramm, Feed, Motion und Accessibility. |
| 043 – V2.1-Regression und Release | G27 | Vollständige UI-/Realtime-Regression, Screenshot-Matrix, Performance-, Schutzbereichs- und Versionsnachweis; danach Tag `v2.1.0`. |

Jeder Auftrag enthält nur seine Ziel-Dateien, seine eigene Baseline und einen Builder-/Prüfer-Zyklus. Produktcode wird erst nach der zugehörigen Auftragsdatei geändert.

## 7. Nachweise und Qualitätsgates

Jeder Auftrag führt mindestens `npx tsc --noEmit`, `npm run verify`, `npm run build` und `git diff --check` aus. Die unveränderten Schutzbereiche sind `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`, RNG, Run-/Versionsmodell und CRM-Schreibpfade.

Zusätzliche Nachweise:

- G24: V1-Contract akzeptiert alle Katalogwerte, weist Duplikate und ungültige Events zurück; n8n-Workflow/Fixtures enthalten keine Secrets.
- G25: History ist KPI-scharf begrenzt, zeitlich korrekt, ohne Stale-Write und ohne Channel-Leak; Browser liest keine Rohdaten.
- G26: Deep-Link und Reload von `/dashboard`, Screenshots bei 1440/768/375 px, null horizontaler Overflow, `prefers-reduced-motion` ohne Motion-Nodes, isolierte Updates der betroffenen Komponenten und textliche Diagrammalternativen.
- G27: Vollständige Regressionsmatrix sowie tag- und push-bereite Versionskonsistenz. Ein nicht konfigurierter externer Betreiber-Runner bleibt, wie für v2.0.0 beschlossen, transparent optional und kein Freigabeblocker.
