# Auftrag Dashboard-Testkachel (Designprobe, Teilauftrag 0)

**Stand:** 02.10.2026

**Basis:** `main` nach PR #47. Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 0. Produktentwurf: `docs/superpowers/specs/2026-10-01-executive-dashboard-design.md`.

**Builder:** Claude Code. **Technischer Prüfer:** Codex. **Designentscheidung:** Marc. **Merge:** nur Marc.

## Referenz (Entscheidung Marc, 02.10.2026)

Das Referenzbild zeigt den **bestehenden** Live-Funnel (`src/components/liveKpi/LiveFunnelBarChart.tsx`). Es dient **nur** der Veranschaulichung des gewünschten 3D-Effekts der Diagramme. Layout, Kachelaufbau, Texte und Interaktion kommen aus Plan und Entwurf. Eine weitere Referenz gibt es nicht. Das Bild liegt nicht im Repo und gehört nicht in diesen Auftrag (`CLAUDE.md` §7).

Aus dem Bild übernommener Stil, den die Probe weiterentwickelt:

- Säulen mit kleiner fester Oberfläche (helle Kappe) und dunklerer rechter Seitenfläche, Verlauf von hell oben nach dunkel unten, dezentes Leuchten an den Kanten und am Boden.
- Wert fett über jeder Säule, gestrichelte Hilfslinien, ruhige graue Achsenwerte, Beschriftung unter der Grundlinie.
- Dunkle Karte mit türkiser Randlinie, Kleinschrift-Kopfzeile in Großbuchstaben, Titel, Status-Chip, darunter eine ruhige Tabelle mit türkisen Zahlen.
- **Revision Ring und Kreis (Rückmeldung Marc, 02.10.2026):** Ring und Kreis passten nicht zu den Säulen. Zweite Referenz (Ring „MRR-Verteilung nach Paket“, nur als Stilvorlage, nicht im Repo): Draufsicht, Türkis-Abstufung vom größten (hell) zum kleinsten Anteil (dunkel), dunkle Fugen, Wölbung durch Verlauf (innen dunkler, helle Außenkante), dezentes Leuchten, Wert groß in der Mitte. Die Tiefe entsteht dort durch Schattierung statt durch eine Verlängerung nach unten. Alle übrigen Darstellungen bleiben unverändert; die Mobilansicht scrollt weiter (nicht verkleinern).
- Farben aus `MANAGEMENT_CHART_THEME` (`src/components/ui/charts/managementChartTheme.ts`); Orange nur für Risiken und Abweichungen.

## Ziel

Eine **isolierte, bedienbare** Kachel, an der Marc Tiefe, Farben, Beschriftung, Kachelruhe und Informationswert der Interaktion bewertet. Keine produktive Anbindung, kein vollständiges Dashboard.

## Globale Grenzen

- Schutzbereiche unverändert (`CLAUDE.md` §6). Keine Änderung an `LiveFunnelBarChart.tsx` und keinen Live-Komponenten (der Plan verlangt das ausdrücklich nicht).
- **Feste Beispieldaten**, deutlich gekennzeichnet („Beispieldaten · Designprobe“). Keine Abfragen, keine Cloud-Speicherung, kein Katalog, keine Kombinationslogik, keine Anbindung an Produktivdaten.
- Keine neue Abhängigkeit (`CLAUDE.md` §8). Vorhanden und nutzbar: `recharts`, `framer-motion`, `Card`, `Badge`, `Tabs`, `Table`, `Skeleton`, `AccessibleChartSummary`.
- Technische Begriffe wie „Pseudo-3D“ erscheinen nicht in der sichtbaren Oberfläche.
- Der Stil wird in einem **neuen** Chart-Modul wiederverwendbar aufgebaut (Plan Abschnitt 5). Teilauftrag 4 darf freigegebene Teile übernehmen.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/dashboard/preview/DashboardDesignPreview.tsx` | Die Testkachel mit Darstellungsumschalter und Größenwahl |
| `src/features/dashboard/preview/previewSampleData.ts` | Feste, gekennzeichnete Beispieldaten |
| `src/features/dashboard/preview/charts/Depth3dBarChart.tsx` | Säulen/Balken mit Tiefe, Stil wie Referenz |
| `src/features/dashboard/preview/charts/Depth3dDonutChart.tsx` | Ring und Kreis, exakte Winkelanteile; Revision 02.10.2026: Stil nach zweiter Referenz (Wölbung statt Verlängerung) |
| `src/features/dashboard/preview/charts/DepthLineChart.tsx` | Linie, klare Linie, dezenter Schatten, keine Tiefenverschiebung der Punkte |
| `src/features/dashboard/preview/charts/DepthAreaChart.tsx` | Fläche mit dezentem Verlauf |
| `src/features/dashboard/preview/charts/depthGeometry.ts` | Reine Funktionen für Tiefe, Winkel, Skalen (testbar) |
| `src/features/dashboard/preview/__tests__/*.vitest.ts(x)` | Geometrie-, Ansichts- und Zugänglichkeitstests |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx` | Nachtrag bei der Umsetzung: Vorschauseite um die Kachel |
| `src/features/dashboard/preview/ChartModuleBoundary.tsx` | Nachtrag: Fehlergrenze mit „Wiederholen“ und Ladeplatzhalter; beide mit dem Gerüst des erwarteten Diagramms |
| `src/features/dashboard/preview/previewRoute.ts` | Nachtrag: Adresse der Vorschau |
| `src/features/dashboard/preview/charts/ChartReadout.tsx` | Nachtrag: gemeinsame Tooltip-Zeile, Legenden-Schaltflächen und unsichtbares Diagrammgerüst (Endhöhe für Lade- und Fehlerzustand) |
| `src/features/dashboard/preview/charts/chartTypes.ts` | Nachtrag: gemeinsame Typen und Serienfarben |
| `dashboard-vorschau.html` | Revision (Entscheidung Marc 02.10.2026, „Weg 2“): eigene Vorschauseite statt Route in der App |
| `src/features/dashboard/preview/previewMain.tsx` | Revision: eigener Einstieg, lädt nur Vorschauseite und globale Styles |
| `vite.config.ts` | Revision: `dashboard-vorschau.html` nur bei `VITE_DASHBOARD_PREVIEW=true` als Build-Eingang |
| ~~`src/app/App.tsx`~~, ~~`src/vite-env.d.ts`~~ | Revision: bleiben unverändert wie auf `main`; die Produktiv-App kennt die Vorschau nicht |
| `.github/workflows/ci.yml` | Job `build`: `VITE_DASHBOARD_PREVIEW=true` nur dort, damit das Artefakt `dashboard-preview` die Probe enthält |
| `scripts/captureDashboardPreviewScreenshots.mjs` | Screenshot-Harness 1440/768/375 px, SHA-256, Überlauf |
| `docs/screenshots/auftrag-dashboard-testkachel/README.md` | Nur die textuelle Ergebnis-Matrix, keine Bilddateien |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_DASHBOARD_TESTKACHEL.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Builder-Nachweis und später Designfreigabe |

Weitere Dateien nur nach Rückfrage (`CLAUDE.md` §5.3).

## Umsetzung

- [x] Beispieldaten: eine Zahl mit Einheit und Stand, eine Tabelle mit fünf Zeilen, eine Kategorienreihe (Funnel-artig), ein Anteilssatz (fünf Anteile, exakt 100 %), eine Zeitreihe (12 Punkte). Alles deutlich als Beispiel gekennzeichnet.
- [x] Geometrie zuerst (Tests zuerst): Tiefe aus Säulenbreite (3 bis 8 px wie im bestehenden Stil), Ring-Winkel summieren exakt auf 360°, Skalenwerte „schön“ gerundet, leere und einzelne Werte, negative Werte abgewiesen.
- [x] Vier Diagrammmodule und die Zahl-/Tabellenansicht. Zahl und Tabelle erhalten **keinen** räumlichen Effekt.
- [x] Kachel mit Kopf (Kategorie in Großbuchstaben, Titel, Status-Chip), Umschalter „Zahl · Tabelle · Säulen · Ring · Linie · Fläche“, Größenwahl Klein/Mittel/Groß/Volle Breite nach dem Raster des Plans.
- [x] Zustände: Hover, Tastaturfokus, Touch, reduzierte Bewegung (keine Animation), Tooltip mit Wert, Einheit, Kategorie und Zeitraum. Kein Skalieren oder Rotieren der Kachel, keine blinkenden Werte, kein dauerndes Pulsieren.
- [x] Zugänglichkeit: jedes Diagramm hat eine Tabellenalternative, zugängliche Zusammenfassung, Fokusreihenfolge ohne Falle, Kontrast geprüft.
- [x] SVG-Verläufe und Filter mit eindeutiger ID je Kachel (mehrere Kacheln beeinflussen sich nicht), geprüft durch einen Test mit zwei Instanzen.
- [x] Vorschau als eigene Seite `dashboard-vorschau.html` mit eigenem Einstieg, ohne Anmeldung und ohne Supabase; nur im Dev-Modus oder mit Vorschau-Flag gebaut. In einem Produktionsbuild ohne Flag existiert sie nicht (Build-Nachweis und Vertragstest). Revision nach Entscheidung Marc („Weg 2“): ursprünglich als Route in `App.tsx` geplant.
- [x] Kachel zeigt Lade- und Fehlerzustand eines nachgeladenen Moduls mit „Wiederholen“.
- [x] Gates: `tsc`, Lint, Vitest, `verify`, Build; Schutzbereichs-Diff leer. Zusätzlich Screenshot-Harness (1440/768/375 px, SHA-256-Hashes verschieden, 0 px horizontaler Überlauf), Matrix als Text im BUILD_LOG.
- [ ] PR-CI und Codex-Prüfung (Auftragstreue, technische Grenzen).
- [x] Marc bewertet die Vorschau. Bei Änderungswünschen dieselbe Testkachel überarbeiten. Designfreigabe mit Commit-SHA und Hinweis auf das Referenzbild im BUILD_LOG protokollieren. **Erteilt am 02.10.2026 für Stand `f779901`** (nach Überarbeitung von Ring und Kreis).

## Wie Marc die Vorschau öffnet

1. **Lokal:** `npm run dev`, dann `/dashboard-vorschau.html` öffnen.
2. **Ohne Entwicklungsumgebung:** CI-Artefakt `dashboard-preview` des PR herunterladen und entpacken, dann `npx vite preview --outDir <Ordner>` und `/dashboard-vorschau.html` öffnen (Anleitung in `docs/dashboard/REVIEW_WORKFLOW.md`).

## Abnahme

Marc ist mit dem Design zufrieden. **Vor dieser Freigabe beginnen die Teilaufträge 1 bis 8 nicht.** Die Probe erhält kein produktives Release. Freigegebene Teile dürfen in Teilauftrag 4 wiederverwendet werden.

## Nicht Teil dieses Auftrags

- Katalog, Datenauflösung, Speicherung, Raster, Editor, Kombinationen, Detailseiten (Teilaufträge 1 bis 8).
- Umbau des bestehenden Live-Funnels oder anderer Live-Komponenten.
- Ablaufnachweis des Review-Zyklus: Dieser PR ist der Nachweis (Punkt 5 der Automatisierung, Plan Abschnitt 11).
