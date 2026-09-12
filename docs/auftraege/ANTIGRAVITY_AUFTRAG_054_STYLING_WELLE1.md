# AUFTRAG 054 / Gate G39 (Welle 1) — Styling-Migration + Theme/Skeleton/Container-Queries-Fundament

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `401c9f7` (Gate G38 komplett)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G39 / 054–057:
„Styling-Migration in vier Wellen à 25–38 Dateien. Je Welle:
Screenshot-Vergleich muss pixelidentisch sein. Zusätzlich:
Skeleton-Loading, Container Queries, Hell/Dunkel-Umschaltung."
Dieser Auftrag ist **Welle 1**: die drei neuen Infrastruktur-Stücke
(einmalig) + die erste Migrationswelle. Wellen 2–4 (Aufträge 055–057)
migrieren die restlichen Dateien mit der hier gebauten Infrastruktur,
ohne sie erneut zu bauen.

## Ziel

1. **Theme-Mechanismus** (Hell/Dunkel-Umschaltung) bauen — aktuell
   existiert **nur ein dunkles Theme**, keine Lichtwerte.
2. **Container-Query-Unterstützung** einrichten.
3. **`Skeleton`-Primitive** (neue 20. Komponente in `src/components/ui/`,
   `cva`-Muster wie G38).
4. **Welle 1: 22 Dateien** von Inline-Styles auf die G38-Primitives/
   Tailwind-Klassen umstellen (Liste unten) — **Marc hat die
   Methodik für die Hell-Werte bereits entschieden: systematisch
   ableiten, vorläufig markieren, visuelle Freigabe folgt separat**
   (siehe Entscheidung 1).

## Ist-Stand (nachgemessen)

- **94 Dateien** mit `style={{...}}` außerhalb `src/components/ui/**`
  (= `INLINE_STYLE_BASELINE` aus G38). Diese Welle nimmt **22** davon:

  | Verzeichnis | Dateien |
  | --- | --- |
  | `src/components/layout/` | `Header.tsx`, `Layout.tsx`, `Sidebar.tsx`, `SimulationBar.tsx` |
  | `src/components/liveKpi/` | `LiveActivityFeed.tsx`, `LiveArrMixDonut.tsx`, `LiveFunnelBarChart.tsx`, `LiveKpiCard.tsx`, `LivePerformanceSection.tsx`, `StreamingAreaChart.tsx` |
  | `src/components/executiveCockpit/` | `CockpitKpiRail.tsx`, `CockpitPanel.tsx`, `ExecutiveCockpit.tsx`, `PipelineSnapshot.tsx`, `RoadmapSnapshot.tsx`, `TeamHrSnapshot.tsx` |
  | `src/components/ai/` | `AIInsightDrawer.tsx` |
  | `src/components/facelift/` | `DiagramCanvas.tsx`, `FaceliftGlyph.tsx`, `MetricToken.tsx` |
  | `src/app/` | `App.tsx`, `NotFoundPage.tsx` |

  Begründung der Auswahl: `layout/` ist der Rahmen um jede Seite (Theme-
  Umschalter gehört dorthin), `liveKpi/` hat die dichtesten Lade-
  Zustände (Skeleton-Erprobung), `executiveCockpit/` hat die
  responsivsten Grid-Layouts (Container-Query-Erprobung). Die
  restlichen 72 Dateien (`features/**`, `components/executiveCockpit`
  war Teil dieser Welle) folgen in 055–057, gruppiert nach
  Feature-Verzeichnis — dort wird nur noch migriert, nichts mehr gebaut.

- **Kein Dark/Light-Mechanismus vorhanden:** kein `data-theme`, kein
  `prefers-color-scheme`, keine Lichtwerte für die 67 Tokens aus G38.
  Alles in `:root` sind aktuell dunkle Werte.
- **Kein Container-Query-Plugin installiert.** Tailwind-Version im
  Projekt: `^3.4.19` → `@tailwindcss/container-queries` (offizielles
  Plugin für Tailwind v3) ist die korrekte Wahl, **einzige neue
  Abhängigkeit dieses Auftrags**.
- **Keine `Skeleton`-Komponente vorhanden.** `ManagementChartState` hat
  einen `type: 'loading'`-Zweig (Text/Spinner), aber kein Skeleton
  (Platzhalter-Flächen im Layout der eigentlichen Inhalte).

## Verbindliche Entscheidungen

1. **Theme-Mechanismus (Marcs Entscheidung: systematisch ableiten):**
   - Explizite Umschaltung über `[data-theme="light"]` /
     `[data-theme="dark"]` auf dem Root-Element, Präferenz in
     `localStorage` persistiert. **Kein** automatisches Umschalten
     nach `prefers-color-scheme` beim ersten Besuch — Standard bleibt
     exakt der heutige Zustand (dunkel), bis jemand aktiv umschaltet.
     Kein überraschender Wechsel für bestehende Nutzer.
   - **Ableitungsformel (dokumentationspflichtig, reproduzierbar):**
     jeden der 67 `--*`-Tokens nach HSL konvertieren.
     - Neutrale (Hintergrund/Oberfläche/Text/Rahmen): Lightness
       gespiegelt (`L_hell ≈ 100 − L_dunkel`, mit Rand-Clamping — kein
       reines Schwarz auf Weiß, Kontrastprüfung entscheidet).
     - Marken-/Status-Farben (`primary`, `accent`, `success`, `error`,
       `warning` + die Chart-Rohfarben `cyan`/`orange`/`coral`/`mint`):
       Hue/Chroma **beibehalten**, Lightness auf WCAG-AA-Kontrast gegen
       den neuen hellen Hintergrund angepasst (4.5:1 für Text-Nutzung,
       3:1 für großflächige/UI-Nutzung).
     - Glass-/Shadow-Token (`rgba(...)`-Werte): Basis-Helligkeit
       mitspiegeln, Alpha-Kanal vorerst unverändert lassen.
     - Ein kleines Skript, das jeden abgeleiteten Wert gegen seinen
       Verwendungskontext auf WCAG-AA prüft, gehört in den Bericht
       (Werte, die durchfallen, iterativ nachgebessert).
   - **Alle abgeleiteten Werte sind im Bericht ausdrücklich als
     „vorläufig — visuelle Freigabe durch Marc ausstehend" markiert.**
     Diese Freigabe ist **nicht** Teil der Abnahme dieses Auftrags —
     der Mechanismus muss funktionieren und die Werte müssen
     kontrastkonform sein, das Feintuning „sieht gut aus" kommt separat.
   - Toggle-UI: ein Button/Icon in `Header.tsx` oder `Sidebar.tsx`
     (Builder entscheidet, bestehende Primitives wiederverwenden).
2. **Container Queries:** `@tailwindcss/container-queries` installieren,
   in `tailwind.config.js` `plugins: []` eintragen. Mindestens die
   `executiveCockpit/`-Grids (Entscheidung: welche Komponenten
   tatsächlich von containerbasiertem statt viewportbasiertem
   Responsive-Verhalten profitieren, ist Builder-Ermessen — nicht
   jede Datei braucht zwingend `@container`, nur wo ein Layout von
   seiner eigenen Breite abhängen soll, nicht von der Viewport-Breite).
3. **`Skeleton`-Primitive:** neue Datei `src/components/ui/Skeleton.tsx`,
   `cva`-Varianten (mindestens `text`/`circle`/`rect`, Breite/Höhe als
   Props). Wo eine der 22 Welle-1-Dateien einen Ladezustand hat
   (insbesondere `liveKpi/*`), diesen durch `Skeleton` ersetzen oder
   ergänzen — nicht `ManagementChartState`s `loading`-Zweig anfassen
   (der bleibt wie er ist, andere Baustelle).
4. **Migration der 22 Dateien:** gleiches Muster wie G38 — `style={{...}}`
   durch `cva`/Tailwind-Klassen ersetzen, wo eine exakte
   Tailwind-Standardskala den alten Pixel-Wert nicht trifft:
   Arbitrary-Value-Klasse (`px-[Xpx]`), dokumentationspflichtig wie in
   G38. **Laufzeitberechnete Werte bleiben `style`-Attribut** (Muster
   aus Auftrag 053 Nachtrag 2: `LiveArrMixDonut`/`LiveFunnelBarChart`/
   `StreamingAreaChart` zeichnen vermutlich datengetriebene Chart-
   Geometrie — dieselbe Teilmigrations-Logik wie bei `Charts.tsx`
   anwenden, nicht pauschal verbieten oder pauschal durchwinken).
5. **ESLint-Regel-Scope erweitern:** die `react/forbid-dom-props`-Regel
   aus G38 (aktuell nur `src/components/ui/*.tsx` +
   `DesignSystemPage.tsx`) um die 22 Welle-1-Dateien ergänzen, sobald
   migriert — sonst schützt die Regel diese Dateien nicht vor
   Rückfällen. `INLINE_STYLE_BASELINE` in `ci.yml` entsprechend senken
   (94 → 72, nie erhöht).
6. **Keine neue Abhängigkeit außer `@tailwindcss/container-queries`.**
7. **Sichtbares Verhalten unverändert** (im aktuellen dunklen Theme —
   das ist die einzige Screenshot-Baseline, die existiert). Das neue
   helle Theme hat keine Baseline zum Vergleichen, das ist erwartet.
8. **Bildlektion aus der letzten Session:** Screenshots **nicht** in den
   eigenen Kontext laden. Baseline/After-Paare per `shasum -a 256`
   vergleichen, Abweichungen per Skript-Pixel-Diff (BBox + max.
   Kanal-Delta) bewerten, Zahlen in den Bericht — kein Bild ansehen
   außer bei einem tatsächlich auffälligen Befund.
9. **`/design-system`-Route (aus G38) erweitern:** neue `Skeleton`-Sektion
   ergänzen, Theme-Umschalter dort sichtbar/testbar machen — diese
   Seite ist die wichtigste Vergleichsfläche für Modal-/Interaktions-
   zustände, die reine Routen-Screenshots nicht zeigen (siehe G38-Review).

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen — die
  restlichen 72 Inline-Style-Dateien sind **nicht** Teil dieses Auftrags.
- `git diff 401c9f7 -- src/simulation src/types src/context src/services/data src/features/resources src/store src/features` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Theme-Infrastruktur

- [ ] Lichtwerte für alle 67 Tokens nach der Ableitungsformel (Entscheidung 1) erzeugt, Kontrast-Skript im Bericht.
- [ ] `[data-theme]`-Mechanismus + `localStorage`-Persistenz + Toggle-UI.
- [ ] Als „vorläufig" markiert im Bericht.
- [ ] `npx tsc --noEmit`, `npm run build` grün. Kein bestehender Screenshot ändert sich (Default bleibt dunkel).

### Block B — Container Queries

- [ ] `@tailwindcss/container-queries` installiert, in `tailwind.config.js` eingebunden.
- [ ] Mindestens ein sinnvoller Einsatz in `executiveCockpit/`, begründet im Bericht.

### Block C — `Skeleton`-Primitive

- [ ] `src/components/ui/Skeleton.tsx` (cva-Varianten), in `/design-system` sichtbar.
- [ ] Mindestens in `liveKpi/`-Ladezuständen eingesetzt.

### Block D — Welle-1-Migration (22 Dateien)

- [ ] Alle 22 Dateien aus der Tabelle oben migriert (Entscheidung 4).
- [ ] ESLint-Regel-Scope erweitert, `INLINE_STYLE_BASELINE` gesenkt (Entscheidung 5).
- [ ] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün.
- [ ] Screenshot-Nachweis analog G38 (Methodik: Entscheidung 8) für alle Routen, die diese 22 Dateien berühren.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `tailwind.config.js` | A, B |
| `src/styles/global.css` | A |
| `package.json`, `package-lock.json` (nur `@tailwindcss/container-queries`) | B |
| `src/components/ui/Skeleton.tsx` (neu) | C |
| `src/app/DesignSystemPage.tsx` | A, C |
| die 22 Dateien aus der Tabelle oben | D |
| `eslint.config.js`, `.github/workflows/ci.yml` (nur Scope-Erweiterung + Ratsche) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere keine der 72
verbleibenden Inline-Style-Dateien.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
grep -rl "style={{" src --include="*.tsx" | grep -v "^src/components/ui/" | wc -l   # 72 nach Block D
git diff 401c9f7 -- src/simulation src/types src/context src/services/data src/features/resources src/store src/features   # leer
```

Screenshot-Harness analog G38, Methodik aus Entscheidung 8. Matrix unter
`docs/screenshots/auftrag-054/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G39 Welle 1 – Auftrag 054"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, die
Kontrast-Prüfung der Lichtwerte (mit „vorläufig"-Vermerk), welche
Datei(en) `@container` bekommen haben und warum, wo `Skeleton`
eingesetzt wurde, Command-Matrix.

## Akzeptanzkriterien für die Prüfung

- Theme-Mechanismus funktioniert (Umschalten sichtbar, persistiert,
  kein automatischer Sprung beim ersten Laden), Lichtwerte
  kontrastkonform (stichprobenartig nachgerechnet), als vorläufig
  gekennzeichnet.
- `Skeleton` existiert, folgt dem `cva`-Muster, mindestens ein echter
  Einsatzort.
- Container-Query-Plugin installiert und mindestens einmal sinnvoll genutzt.
- Alle 22 Dateien migriert, 0 `style={{` außer dokumentierter
  Laufzeit-Ausnahmen (Muster wie Auftrag 053 Nachtrag 2).
- `INLINE_STYLE_BASELINE` korrekt auf 72 gesenkt, ESLint-Scope erweitert.
- Dunkles Theme (die einzige existierende Baseline) bleibt pixelidentisch.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-Ratsche
  nicht erhöht.
- Kein neues Business-Feature außerhalb des explizit beauftragten
  Theme-Umschalters/Skeleton/Container-Queries.

**Abnahme:** Erst nach unabhängigem Review ist Welle 1 von Gate G39
abgeschlossen. Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.
