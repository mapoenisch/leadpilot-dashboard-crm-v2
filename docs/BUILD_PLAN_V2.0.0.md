# LeadPilot Dashboard-CRM — Masterplan V2.0.0

**Stand:** 04.09.2026 · **Status:** Entwurf zur sequenziellen Ausführung

## Zielbild

V2.0.0 entwickelt LeadPilot von einer State-gesteuerten Single-Page-Oberfläche zu einem direkt adressierbaren, modularen Echtzeit-Dashboard weiter:

```text
BrowserRouter → AppLayout → Route-Page → isolierte UI-Komponente → Read-Model / Live-KPI-Hook
                                                           └── SimulationContext → Services → Engine
```

Die neue Oberfläche folgt der verbindlichen visuellen Referenzbasis aus den bereitgestellten LeadPilot-Entwürfen. Sie bleibt ein Management-Dashboard: Daten sind klar lesbar, Interaktionen zugänglich, Simulation und historische Daten fachlich getrennt. Räumliche Wirkung entsteht durch Layering, Glassmorphism und Glow — nicht durch verzerrte, schwer vergleichbare Datenvisualisierungen.

## Verbindliche visuelle Referenzbasis

Die drei vom Nutzer bereitgestellten Entwurfsbilder liegen versioniert und für alle Coding-Agenten lesbar im Repository unter [`reference/leadpilot-v2-style/`](../reference/leadpilot-v2-style/README.md). Sie definieren die visuelle Sprache für **die gesamte Anwendung**. Sie sind keine Vorgabe für fachliche Inhalte, Datenwerte oder konkrete Seitenlayouts, aber für jede sichtbare V2-Fläche verbindlich: App-Schale, Navigation, Tabellen, Diagramme, Karten, Dialoge, Simulation, Fachseiten und die mobile Ansicht.

- [`01-executive-organisation-mobile.png`](../reference/leadpilot-v2-style/01-executive-organisation-mobile.png): Executive Dashboard, Teamstruktur und mobile Ansicht.
- [`02-executive-scenarios-crm.png`](../reference/leadpilot-v2-style/02-executive-scenarios-crm.png): Executive Dashboard, Szenarien und CRM-Ansichten.
- [`03-simulation-crm.png`](../reference/leadpilot-v2-style/03-simulation-crm.png): SimulationRun-Modal sowie CRM-Tabellenansichten.

- Die Gestaltung übernimmt die erkennbare Bildsprache der Referenzen: tiefes dunkles Grün/Schwarz als Grundfläche, fein gerahmte und leicht leuchtende Flächen, transparente bzw. glasartige Layer, präzise Linien, hohe Informationsdichte sowie klar gegliederte Management-Oberflächen.
- Cyan, Türkis, Mint, Orange, Weiß und gedämpfte Dunkeltöne werden in der gleichen Gesamtwirkung wie in den Entwürfen eingesetzt. Ihre Verwendung wird nicht auf eine einzelne Interaktions- oder Statusrolle künstlich beschränkt; fachliche Bedeutung bleibt zusätzlich immer über Text, Icons oder Struktur verständlich.
- Eine Seite gilt nicht allein deshalb als V2-konform, weil sie Tokens oder einzelne GlassCards verwendet. Ihre Informationshierarchie, Karten-, Tabellen- und Diagrammsprache sowie ihre Desktop-/Mobile-Komposition müssen sich erkennbar an der Referenzbasis orientieren.
- Vor jeder visuellen Umgestaltung in den Aufträgen G14 bis G17 sowie G21 wird die jeweilige Seitenansicht gegen diese Referenzbasis geplant und anhand der Screenshot-Gates geprüft. Generische Standard-Dashboard- oder Komponentenbibliotheksoptik ist kein Ersatz für die Referenzbasis.
- Die Entwurfsbilder sind versionierte Planungsreferenzen im Repository; sie werden nicht in das App-Bundle übernommen und nicht als Quelle für Produktdaten verwendet.
- Davon ausgenommen sind die fiktiven, aber fotorealistischen Aufnahmen des Unternehmensstandorts: Außenansichten Leipzig Augustusplatz, Büroansichten und Eingangsbereich bleiben glaubwürdige Standortfotografie. Sie erhalten keinen Neon-, Glow-, Glassmorphism- oder sonstigen UI-Stilfilter; die V2-Bildsprache umrahmt sie lediglich im Interface.

Dieser Plan und die daraus abgeleiteten Aufträge sind für die technische Umsetzung verbindlich.

## Warum V2.0.0

Das Routing wechselt von lokalem View-State zu öffentlichen URLs, die Layout- und Seitenarchitektur wird grundlegend neu geschnitten und das Dashboard erhält einen neuen UI-Stack. Das ist eine fachlich und technisch sichtbare Major-Version.

**Wichtiger Baseline-Befund:** Das Repository hat den Tag `v1.3.0`, während `package.json` aktuell `1.2.0` enthält. Phase 0 klärt diese Abweichung dokumentiert; die Versionsnummer wird nicht beiläufig in einem UI-Auftrag geändert. Erst der Release-Auftrag setzt die bestätigte Zielversion `2.0.0` konsistent in Paket, Release-Dokumentation und Git-Tag.

---

## Phasenübersicht

| Phase | Fokus | Meilenstein | Aufwand |
|---|---|---|---|
| 0 | V2-Baseline und Governance | Ausgangsstand, Versionsquelle, Scope und Gate-Reihenfolge sind festgeschrieben. | Kurz |
| 1 | Infrastruktur und Routing | Tailwind/shadcn laufen token-kompatibel; alle Seiten besitzen reload-sichere URLs. | Mittel |
| 2 | UI-Architektur und Designsystem | Wiederverwendbare App-Schale, Glass-Card, Typografie und Navigationsmuster stehen. | Mittel |
| 3 | Statische Produktansichten | Executive-, Organisation-, Roadmap- und CRM-Ansichten folgen dem V2-Design. | Groß |
| 4 | Echtzeit-Datenschicht | Supabase und n8n liefern abgesicherte Live-KPIs in isolierte Karten. | Groß |
| 5 | Visualisierung und Motion | Recharts, konsistentes Chart-Theming und reduzierte Animationen sind produktionsreif. | Mittel |
| 6 | Stabilisierung und Release | Vollständige Regression, Accessibility-/Performance-QA und Release `v2.0.0`. | Mittel |

**Ausführungsregel:** Jede Zeile der nachfolgenden Roadmap wird als eigener Auftrag in `docs/auftraege/` spezifiziert, gebaut und abgenommen. Die Aufträge laufen strikt seriell: Builder implementiert → Prüfer führt Gates aus → Builder bessert nach. Ein nachfolgender Auftrag startet erst nach grünem Vorgänger-Gate.

---

## Unverrückbare Leitplanken

- Das bestehende LeadPilot-Token-System bleibt visuelle Quelle. Tailwind bildet Tokens ab; es etabliert keine konkurrierende Farb- oder Spacing-Sprache.
- Die Farbkomposition folgt der verbindlichen visuellen Referenzbasis. Farbe ist nie das einzige Bedeutungssignal; Status und Bedeutung bleiben zusätzlich über Text, Icons oder Struktur verständlich.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`, Repository-/Persistenzpfade, RNG, Run-/Versionsmodell und Berechnungen bleiben geschützt. Eine Ausnahme braucht einen expliziten Daten-/Realtime-Auftrag mit eigener Prüfung.
- `Internal Resources` bleibt bis auf eine reine Route-Verkabelung unverändert.
- Bestehende Datenebenen bleiben sichtbar getrennt: historische Baseline, Simulation und zukünftige Live-Feeds werden nicht vermischt oder gegenseitig als Wahrheit ausgegeben.
- Keine neuen Abhängigkeiten außerhalb der jeweils explizit freigegebenen Aufträge.
- Alle UI-Aufträge verwenden vor und nach der Änderung Screenshots bei 1440 px, 768 px und 375 px. Horizontaler Body-Overflow ist ein Gate-Fehler.
- Jeder Auftrag endet mindestens mit `npx tsc --noEmit`, `npm run verify` und `npm run build` sowie einem dokumentierten Schutzbereichs-Diff.
- Realtime, Routing und Bewegung respektieren Fehlerzustände, Ladezustände und `prefers-reduced-motion`.

---

## Phase 0 — V2-Baseline und Governance

**Ziel:** Einen reproduzierbaren Ausgangspunkt schaffen, bevor die Anwendung strukturell verändert wird.

### Auftrag V2-00: Baseline, Versionsklärung und V2-Abgrenzung

- [ ] Aktuellen Commit, Git-Tag, `package.json`-Version, Arbeitsbaum und alle Baseline-Gates dokumentieren.
- [ ] Die Differenz `v1.3.0` zu `package.json: 1.2.0` analysieren und in `ARCHITECTURE_DECISIONS.md` oder dem Build-Log als bekannte Versionsabweichung festhalten.
- [ ] Den V2-Scope gegenüber bestehenden Aufträgen 021–026 abgrenzen: abgeschlossene UI-Verbesserungen bleiben erhalten und werden nicht zurückgebaut.
- [ ] Die Zielbilder für Desktop, Tablet und Mobile als Screenshot-Referenzen katalogisieren. Die vom Nutzer gelieferten Entwürfe sind nur Stilreferenzen, keine Quelle für fachliche Fakten.
- [ ] Eine V2-Gate-Tabelle im Build-Log anlegen: G11 bis G20, Baseline-Commit und zugehöriger Auftrag.

**Abnahme:** Build, TypeScript und Integrity-Suiten sind auf dem dokumentierten Baseline-Commit grün. Es gibt keine unklare Versionsquelle und keinen verdeckten Scope-Konflikt.

---

## Phase 1 — Infrastruktur und URL-Routing

**Ziel:** Die URL wird zur Quelle der Seitenauswahl. Tailwind und shadcn sind sicher neben dem bestehenden Styling einsetzbar.

### Auftrag 027 / Gate G11: UI-Infrastruktur und URL-Routing

Der detaillierte Auftrag liegt in [ANTIGRAVITY_AUFTRAG_027_UI_INFRASTRUKTUR_ROUTING.md](auftraege/ANTIGRAVITY_AUFTRAG_027_UI_INFRASTRUKTUR_ROUTING.md).

- [ ] Tailwind 3, PostCSS, Autoprefixer, React Router, shadcn-Basisprimitives, Recharts und Framer Motion reproduzierbar installieren.
- [ ] Bestehende CSS-Tokens nach Tailwind spiegeln; Tailwind Preflight deaktivieren, um Legacy-Views nicht global zurückzusetzen.
- [ ] `BrowserRouter → AppLayout → Outlet` einführen und lokalen `activeView`-State aus `App.tsx` entfernen.
- [ ] Für jeden bestehenden Sidebar-Eintrag einen eindeutigen URL-Pfad bereitstellen; Root-Redirect und explizite 404-Seite ergänzen.
- [ ] Sidebar, Titel und Kategorie aus zentralen Route-Metadaten ableiten; Zurück/Vorwärts, Direktaufruf und Reload nachweisen.
- [ ] Die vier Overview-Subviews als route-fähige Pages extrahieren, `OverviewView` jedoch zunächst als Adapter erhalten.

**Abnahme:** Alle Navigationseinträge bleiben erreichbar; `/dashboard`, `/company/profile`, `/organisation/team` und `/crm/deals` sind Deep Links. Browser-History und Reload funktionieren, die Simulationsschicht bleibt unverändert.

---

## Phase 2 — UI-Architektur und Designsystem

**Ziel:** Wiederverwendbare, zugängliche V2-Bausteine schaffen, bevor einzelne Fachseiten visuell neu gebaut werden.

### Auftrag 028 / Gate G12: V2-App-Schale und Design-Primitives

- [ ] Die bestehende App-Schale als V2-Layout konsolidieren: Sidebar, Topbar, Command-/Simulation-Bar, Hauptbereich und mobile Drawer-Variante.
- [ ] Eine gemeinsame `GlassCard`-Primitive definieren: transparente Fläche, dezenter Blur, 1-px-Tokenschatten/-Rand, Varianten für Standard, hervorgehoben, Warnung und technische Information.
- [ ] Typografie- und Spacing-Regeln als Tailwind-Utilities und semantische Komponenten festlegen. Bestehende CSS-Tokens bleiben die Wertequelle.
- [ ] Die vorhandenen Primitives (`Card`, `Button`, `Badge`, `Modal`, `Select`, `Tabs`, `Table`, `StatusChip`) auditieren. Pro Primitive entscheiden: beibehalten, tokenbasiert erweitern oder gezielt mit einer lokal generierten shadcn-Primitive ergänzen. Kein pauschaler Austausch.
- [ ] Einen zugänglichen Standard für Hover, Fokus, Disabled, Loading, Empty und Error States festlegen.
- [ ] Alle neuen Motion-Hooks auf `prefers-reduced-motion` vorbereiten; in diesem Auftrag noch keine fachlichen Zähl- oder Diagrammanimationen einbauen.

**Abnahme:** Die V2-Schale ist auf Desktop/Tablet/Mobile stabil; GlassCard und Kernprimitives sind demonstriert, keyboard-bedienbar und ohne paralleles Designsystem einsetzbar.

### Auftrag 029 / Gate G13: Seiten- und Navigationsmodulierung

- [ ] Seitenmodule nach Verantwortlichkeit ordnen: Page-Komponente, lokale Section-Komponenten, Read-Model-/Datenadapter und gemeinsame UI-Primitives.
- [ ] Die verbliebenen Feature-Adapter aus der Router-Migration schrittweise durch eigenständige Page-Komponenten ersetzen, ohne Fachlogik umzuziehen.
- [ ] Seitentitel, Breadcrumbs und aktiven Navigationszustand ausschließlich aus Route-Metadaten generieren.
- [ ] Ein Route-Level-Error-/Empty-State-Muster einführen, das fehlende oder unvollständige Daten klar kommuniziert.

**Abnahme:** Pages sind ohne `activeSubView`-Kaskaden direkt verständlich; App, Sidebar und Header benötigen keinen doppelten View-State.

---

## Phase 3 — Statische Produktansichten im V2-Design

**Ziel:** Die im Entwurf gezeigten Management- und CRM-Flächen visuell neu aufbauen, zunächst mit den vorhandenen statischen Daten und ohne Realtime-Abhängigkeit.

### Auftrag 030 / Gate G14: Executive Dashboard und Unternehmensübersicht

- [x] Das Executive Dashboard als V2-Grid gestalten: KPI-Karten, Statusdeltas, historische Charts, Mission-/Kontextbereich und klare Informationshierarchie.
- [x] Unternehmenssteckbrief, Datenbasis und Jahres-Highlights mit V2-Karten, Tabellen- und Alert-Zuständen modernisieren.
- [x] Keine Live-Daten vortäuschen: Alle Werte behalten sichtbare Quellen-/Zeitebenenkennzeichnung.

**Abnahme:** Die vier Overview-Pages entsprechen der V2-Hierarchie, sind responsive und verwenden nur vorhandene statische Daten.


### Auftrag 031 / Gate G15: Organisation, HR und Roadmap

- [ ] Teamstruktur & Engpässe als hybride Visualisierung implementieren: semantisch lesbare DOM-Karten plus dekorative, lizenzierte/selbst erstellte WebP-Assets. Die Daten (Team, FTE, Engpass) bleiben echte Textinhalte, nicht Bestandteil eines Bildes.
- [ ] 3D-Eindruck nur dekorativ einsetzen; keine perspektivischen Datenflächen oder unlesbaren Kontraste.
- [ ] HR-Kennzahlen und Roadmap/Highlights im gleichen Karten-, Timeline- und Statussystem umsetzen.
- [ ] Für dekorative Assets Alt-Texte, Fallback-Flächen, Dateiquelle und Bundle-Größe dokumentieren.

**Abnahme:** Die Organisationsansicht ist inhaltlich vollständig ohne Bild lesbar; Engpässe sind zusätzlich zu Orange durch Text/Icons markiert.

### Auftrag 032 / Gate G16: CRM-Listen, Pipeline und Aktivitäten

- [ ] Accounts, Deals, Aktivitäten und Leads auf die V2-Tabellen-/Listenarchitektur migrieren.
- [ ] Deal-Pipeline mit klaren Spalten, Statusbadges, Hover-/Fokuszuständen, responsiver Verdichtung und Filterzuständen umsetzen.
- [ ] Begriffe wie „abgeschlossen und gewonnen“ bleiben fachlich eindeutig, nicht nur farblich codiert.
- [ ] Mobile Varianten priorisieren: Filter, Suche, Tabellenüberlauf und Zeilenaktionen dürfen bei 375 px nicht kollidieren.

**Abnahme:** Alle CRM-Flows aus dem bestehenden Dashboard sind erhalten; Filter, Suche, Navigation und Statussemantik sind per Tastatur sowie in der Screenshot-Matrix geprüft.

### Auftrag 033 / Gate G17: Restliche Fachbereiche und V2-Konsistenz

- [ ] Produkt, Markt & Wettbewerb, Kunden & ICP, Vertrieb & Marketing, Finanzen, Strategie, Recht und Internal-Resources-Route auf V2-Schale und gemeinsame Page-Konventionen prüfen.
- [ ] Nur Views umgestalten, die noch ein sichtbares V1-Muster zeigen. `Internal Resources` bleibt inhaltlich und strukturell eingefroren.
- [ ] Doppelte Styles, Seitentitel und leere Zwischen-Adapter abbauen, sobald jeder Router-Pfad eine dedizierte Page besitzt.
- [ ] Erst danach den Verbleib von `OverviewView` und anderen Legacy-Adaptern prüfen. Löschen ist nur mit vollzähliger Routen- und Screenshot-Abdeckung zulässig.

**Abnahme:** Die vollständige Navigation wirkt zusammenhängend, ohne unerreichbare oder alte Fallback-Ansichten.

---

## Phase 4 — Echtzeit-Datenschicht mit Supabase und n8n

**Ziel:** Neue Live-Daten kontrolliert von der n8n-Pipeline bis zu einzelnen KPI-Karten transportieren, ohne Simulationsdaten oder historische Baselines zu überschreiben.

### Auftrag 034 / Gate G18: Datenvertrag, Schema und sichere Schreibpipeline

- [ ] Einen versionierten Live-KPI-Datenvertrag definieren: Kennzahl-ID, Wert, Einheit, Zeitstempel, Datenquelle, Qualitätsstatus, Korrelation und optionaler Kontext.
- [ ] Supabase-Schema, Indizes, Migrationen, RLS-Policies und Least-Privilege-Rollen für den Live-Feed spezifizieren und implementieren. Keine Service-Role-Schlüssel im Frontend.
- [ ] n8n-Workflow so gestalten, dass er validierte, idempotente Events schreibt. Fehler, Duplikate und ungültige Werte werden protokolliert, nicht still übernommen.
- [ ] Datenherkunft eindeutig trennen: `historisch`, `simulation`, `live`. Ein Live-Event verändert keinen historischen Snapshot und keinen reproduzierbaren Simulationsrun.
- [ ] Contract- und Integritätstests sowie einen lokalen/stagingfähigen Seed-/Replay-Weg ergänzen.

**Abnahme:** Ein dokumentiertes Testevent durchläuft n8n und Supabase sicher; Schema, Policy und Herkunft sind nachvollziehbar, ohne Secrets in Repository oder Browserbundle.

### Auftrag 035 / Gate G19: Isolierter Live-KPI-Client und Komponentenbindung

- [ ] Den vorhandenen Supabase-Client nur über einen neuen, klar abgegrenzten Live-Read-Adapter verwenden.
- [ ] `useLiveKpi(kpiId)` implementieren: initialer Snapshot, Realtime-Subscription, Validierung, Cleanup, Wiederverbindung, Lade-/Fehler-/Offlinezustand und keine Subscription-Leaks.
- [ ] Eine isolierte `LiveKpiCard` implementieren. Nur diese Karte re-rendert bei einem Event; teure 3D-/Chart-/Seitenkomponenten bleiben durch stabile Props und sinnvolle Memoisierung unberührt.
- [ ] Fallback bei nicht konfiguriertem Supabase: aussagekräftiger, nicht alarmistischer Status statt leerer oder erfundener Kennzahl.
- [ ] Ein Testpanel oder kontrollierter Datenfeed darf ausschließlich im Entwicklungskontext verfügbar sein.

**Abnahme:** Ein Live-Update ist innerhalb der definierten Latenz sichtbar, aktualisiert nur die zuständige KPI-Fläche und beeinflusst weder Simulation noch übrige View-Zustände.

### Auftrag 036 / Gate G20: End-to-End-Realtime-Härtung

- [ ] n8n → Supabase → Hook → Karte über einen kontrollierten End-to-End-Test nachweisen.
- [ ] Mehrere schnelle Updates, ungültige Payloads, Netzwerkunterbrechung, Wiederverbindung und Browser-Navigation testen.
- [ ] Observability ergänzen: Quellstatus, letzter Aktualisierungszeitpunkt und sichere technische Diagnose ohne Secret-Leak.
- [ ] Datenqualitätszustände in der Management-Oberfläche verständlich darstellen.

**Abnahme:** Der Live-Feed ist belastbar, nachvollziehbar und bei Störungen ehrlich. Jeder Eventpfad ist testbar und dokumentiert.

---

## Phase 5 — Visualisierung und reduzierte Motion

**Ziel:** Statische und Live-Daten in einem einheitlichen, gut lesbaren Visualisierungssystem darstellen.

### Auftrag 037 / Gate G21: Recharts-Theme und Migration der Management-Charts

- [ ] Ein zentrales V2-Chart-Theme auf Basis der LeadPilot-Tokens definieren: Achsen, Grids, Legenden, Tooltips, Datenlabels, Empty- und Fehlerzustände.
- [ ] Zuerst die Executive- und CRM-Management-Charts migrieren; Simulations-/Monte-Carlo-Renderer nur nach ausdrücklicher fachlicher Prüfung verändern.
- [ ] Hintergrundgitter reduzieren, aber Orientierung und Werteablesbarkeit bewahren. Area-Gradients, Cyan-/Orange-Serien und Tooltips müssen Kontrast und Quellenebene vermitteln.
- [ ] Responsive Container, Datenlücken und zu kleine Breiten gezielt behandeln.

**Abnahme:** Charts sind bei allen Zielbreiten lesbar, thematisch konsistent und zeigen keine erfundenen Interpolationen oder Scheingenauigkeit.

### Auftrag 038 / Gate G22: Motion, Zahlenübergänge und Performance

- [ ] Framer Motion nur dort einsetzen, wo eine Zustandsänderung verständlicher wird: Einblenden, Seitenwechsel, Kartenstatus und optionaler Count-up in Live-KPIs.
- [ ] Jede Animation respektiert `prefers-reduced-motion`; sie blockiert weder Eingaben noch verschleiert sie einen neuen Datenwert.
- [ ] Performance-Budgets für initialen Load, Route-Wechsel, Realtime-Update und Chart-Render definieren und messen.
- [ ] Große WebP-Assets und Chart-Bundles nur lazy laden, wenn der jeweilige Route-Abschnitt sie benötigt.

**Abnahme:** Bewegungen wirken unterstützend, sind abschaltbar und führen nicht zu Layout Shift, Eingabelatenz oder unnötigen Re-Renders.

---

## Phase 6 — Stabilisierung und Release V2.0.0

**Ziel:** Alle V2-Änderungen als nachvollziehbare Major-Version freigeben.

### Auftrag 039 / Gate G23: V2-Regression, Accessibility und Release

- [x] Vollständige Routenmatrix auf Desktop, Tablet und Mobile prüfen: direkter Aufruf, Reload, Zurück/Vorwärts, 404, Sidebar/Drawer und Kontextwechsel.
- [x] End-to-End-Prüfung für statische Daten, Simulation, Live-KPIs und Fehlerzustände durchführen; der externe Betreiber-Runner bleibt optional.
- [x] Keyboard-Durchlauf für Navigation, Dialoge, Dropdowns, Tabs, Filter und Tabellen durchführen; sichtbaren Fokus und zugängliche Namen prüfen.
- [x] Lighthouse-/Performance-Messung oder gleichwertige dokumentierte Browser-Messung gegen die in Auftrag 038 festgelegten Budgets ausführen.
- [x] Alle Screenshots, Hash-Matrizen, Schutzbereichs-Diffs und Gate-Berichte vervollständigen.
- [x] Versionsabweichung aus Phase 0 bereinigen, `package.json` auf `2.0.0` setzen, Changelog/Release-Dokument schreiben; Tag und Push sind autorisiert.

**Status Phase 6:** `FREIGEGEBEN — TAG/PUSH AUTORISIERT` — Alle lokalen V2-Gates sind bestanden. Der externe Live-E2E-Runner bleibt ein optionaler Betreiber-Test; für V2.0.0 werden keine externen Testzugänge bereitgestellt.

**Abnahme:** Keine offenen Blocker, alle V2-Gates grün, Release-Notizen vollständig und die Versionsquelle ist in Tag, Paket und Dokumentation konsistent.

---

## Durchgängige Gate-Matrix

| Gate-Typ | Gilt für | Nachweis |
|---|---|---|
| Typen und Build | Jeder Auftrag | `npx tsc --noEmit`, `npm run verify`, `npm run build` |
| Schutzbereiche | Jeder UI-/Visualisierungsauftrag | Leerer Diff gegen die festgelegte Baseline für geschützte Pfade |
| Screenshot-Regression | Jeder sichtbare UI-Auftrag | Vorher/Nachher bei 1440/768/375 px, unterschiedliche SHA-256-Hashes, 0 px horizontaler Overflow |
| Routing | Ab G11 | Deep-Link, Reload, Zurück/Vorwärts, aktiver Nav-Status, 404 |
| Accessibility | Ab G12 | Tastatur, sichtbarer Fokus, Namen, Dialog-/Drawer-Fokusführung, reduzierte Bewegung |
| Datenintegrität | G18–G20 | Contract-, Policy-, Replay- und Fehlerszenarien; klare Datenherkunft |
| Performance | G21–G23 | Dokumentierte Budgets und Messungen für Route, Chart und Live-Update |

## Risiken und bewusste Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Tailwind-Preflight verändert bestehende V1-Views | Preflight in Phase 1 deaktivieren; Migration einzelner Komponenten nur nach Screenshots. |
| Router-Migration macht selten besuchte Seiten unerreichbar | Vollständige Route-Metadatenliste und Matrixtest für jeden `NAV_CATEGORIES`-Eintrag. |
| shadcn kollidiert mit bestehenden Komponenten | Eigener Ordner `src/components/shadcn/`; keine pauschale Ablösung. |
| Live-Events verfälschen Simulation oder historische Werte | Strikte Datenherkunft, getrennte Read-Modelle und expliziter Scope der Realtime-Aufträge. |
| Dekoratives 3D beeinträchtigt Lesbarkeit oder Bundle-Größe | DOM-first-Inhalte, WebP nur dekorativ, Fallback und Lazy Loading. |
| Animationen machen Datenzustände unklar | Reduced-Motion-Respekt, sofort sichtbarer Zielwert und Performance-Budgets. |
| Major-Version wird nur optisch, nicht fachlich geprüft | G23 bündelt Routing-, Daten-, Accessibility-, Performance- und Release-Nachweise. |

## Nächster konkreter Schritt

Der erste ausführbare V2-Auftrag ist [Auftrag 027](auftraege/ANTIGRAVITY_AUFTRAG_027_UI_INFRASTRUKTUR_ROUTING.md). Vor dessen Start wird Auftrag V2-00 als kurzer Dokumentations-/Baseline-Auftrag konkretisiert, damit Commit, Version und Gate-Folge eindeutig sind.
