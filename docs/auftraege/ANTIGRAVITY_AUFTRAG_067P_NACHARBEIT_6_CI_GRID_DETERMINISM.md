# Auftrag 067P – Nacharbeit 6: Deterministisches CRM-KPI-Raster für CI-Visuals

## Rolle und Ziel

Du bist der **Builder**. Setze ausschließlich diese Nacharbeit um, führe die verlangten
Gates aus und dokumentiere das Ergebnis in `docs/BUILD_LOG.md`. Kein Push des
Feature-Branches, Merge, Deploy oder Issue-Close. Die einzige Ausnahme ist der in Schritt 5
verlangte, kurzlebige Push von `visual-baselines/067p-n6`, damit die bestehende
Baseline-Erzeugung in GitHub Actions laufen kann.

Die Authentifizierung ist geschlossen, die Zeitstempelmaske greift. Der PR-CI-Lauf
`35755068622` scheitert dennoch mit genau zwei Visualtests: `/crm/leads` auf Desktop
(3.996 differierende Pixel) und Tablet (2.351/2.360 differierende Pixel). Mobile und die
restlichen 598 Playwright-Tests sind grün.

## Belegter Root Cause

Die Zeitstempelmaske ist **nicht** die Ursache: In den CI-Artefakten liegt ihre Box an
derselben Stelle, während die Differenzen von `x=33..1406, y=83..671` reichen. Die
committeten N5-Baselines stimmen bytegleich mit den Sollbildern im CI-Report überein; die
Istbilder zeigen jedoch ein anders verteiltes CRM-KPI-Raster.

`.crm-v2-kpi-grid` verwendet aktuell `repeat(4, 1fr)` bzw. `repeat(2, 1fr)`. Bei diesem
Grid-Sizing dürfen intrinsische Mindestbreiten der Kartentexte das jeweilige `1fr`-Track
verformen. Der Fallback des `⚡`-Glyphen in „⚡ Supabase Verbunden“ variiert zwischen der
Baseline-Umgebung und dem echten GitHub-Ubuntu-Runner. Das verschiebt Karten, Text und
nachgelagerte Elemente, obwohl Inhalt und Daten korrekt sind. `minmax(0, 1fr)` unterbindet
diesen min-content-Einfluss und macht die vier bzw. zwei Tracks unabhängig von Font-Fallbacks
gleich breit.

## Erlaubter Scope

- `src/styles/global.css` – ausschließlich `.crm-v2-kpi-grid` und ihre zwei vorhandenen
  Breakpoint-Regeln
- `e2e/visual.spec.ts` – nur die `/crm/leads`-Sicherung gegen ungleiche Grid-Tracks;
  N3-Fail-Closed-Checks und N5-Zeitstempelmaske bleiben erhalten
- genau die drei Linux-Baselines zu `visual /crm/leads` unter
  `e2e/visual.spec.ts-snapshots/`
- `docs/BUILD_LOG.md`

Produktdaten, Authentifizierung, `DataSourceStatus`, globale Playwright-Konfiguration,
Workflows, sonstige Baselines und Schutzbereiche bleiben unverändert.

## Umsetzung – strikt TDD

1. Ergänze im bestehenden `/crm/leads`-Zweig **vor** `toHaveScreenshot` eine explizite
   Layout-Invariante für `.crm-v2-kpi-grid`. Lies `getComputedStyle(grid).gridTemplateColumns`,
   parse die Pixelbreiten und fordere eine Streuung von höchstens einem Pixel. Prüfe zugleich
   die erwartete Track-Anzahl: vier oberhalb von 900 px, zwei von 641 bis 900 px, eins bis
   einschließlich 640 px. Beispiel:

   ```ts
   const tracks = await page.locator('.crm-v2-kpi-grid').evaluate((grid) =>
     getComputedStyle(grid).gridTemplateColumns
       .split(' ')
       .map((track) => Number.parseFloat(track)),
   );
   const expectedTrackCount = window.innerWidth > 900 ? 4 : window.innerWidth > 640 ? 2 : 1;
   expect(tracks, 'CRM-KPI-Raster hat die falsche Track-Anzahl.').toHaveLength(expectedTrackCount);
   expect(
     Math.max(...tracks) - Math.min(...tracks),
     'CRM-KPI-Tracks dürfen nicht von Glyphen-Metriken abhängen.',
   ).toBeLessThanOrEqual(1);
   ```

   Der `window`-Wert muss im Browser-Kontext gelesen werden (beispielsweise zusammen mit den
   Tracks in einem einzelnen `evaluate`). Passe den Beispielcode so an, dass TypeScript und
   Playwright strikt typisiert bleiben.

2. **Red-Nachweis:** Führe genau diesen Visualtest gegen den unveränderten CSS-Stand in der
   gleichen Ubuntu-/Chromium-Umgebung wie CI aus. Der Desktop-/Tablet-Check muss mit der
   ungleichen Track-Streuung scheitern. Kein Baseline-Update und keine Lockerung von
   `maxDiffPixelRatio` in diesem Schritt.

3. Ändere nur die zwei Track-Deklarationen in `src/styles/global.css`:

   ```css
   .crm-v2-kpi-grid {
     grid-template-columns: repeat(4, minmax(0, 1fr));
   }

   @media (max-width: 900px) {
     .crm-v2-kpi-grid {
       grid-template-columns: repeat(2, minmax(0, 1fr));
     }
   }
   ```

   Die bestehende Mobile-Regel `grid-template-columns: 1fr` bleibt unverändert. Keine
   Änderungen an Komponenten oder CRM-Daten.

4. Führe den `/crm/leads`-Visualtest nun wiederholt aus. Die neue Track-Invariante und die
   N5-Maske müssen auf allen drei Projekten grün sein. Prüfe die drei Istbilder vor einem
   Snapshot-Update: echte Seed-Daten, sichtbarer Status/Frische/Datenanzahl, sichtbarer
   `Stand:`-Text vor der Maskierung, keine `AUTH_REQUIRED`-Fehlerseite und 0 px Overflow.

5. **Baselines ausschließlich aus echter CI:** Die lokalen Containerbilder dürfen nicht mehr
   committet werden. Lege vom aktuellen Commit einen kurzlebigen Branch
   `visual-baselines/067p-n6` an und pushe ausschließlich diesen Branch, damit der bestehende
   Workflow `Update Visual Baselines` in der identischen `ubuntu-latest`-Umgebung läuft.
   Lade anschließend sein Artefakt `visual-baselines` herunter, übernimm daraus ausschließlich
   die drei `visual-crm-leads-1-*-linux.png`-Dateien. Der normale Feature-Branch und PR #20
   bleiben dabei bis zur Prüferfreigabe ungepusht; den temporären Remote-Branch erst nach
   bestätigter Übernahme und nach Rücksprache entfernen.

6. Wiederhole mit den übernommenen CI-Baselines mindestens dreimal den `/crm/leads`-Visualtest
   in derselben Ubuntu-/Chromium-Umgebung und dokumentiere die 3×3 Resultate. Der spätere
   vollständige PR-CI-Lauf ist weiterhin der maßgebliche E2E-Nachweis.

## Nachweise und Gates

- Red-Nachweis des neuen Track-Checks mit dem alten `1fr`-Grid; grüner Nachweis nach
  `minmax(0, 1fr)`.
- CI-Artefakt-ID/Run-URL der Baseline-Erzeugung, SHA-256 der drei übernommenen Linux-PNGs und
  individuelle Sichtprüfung (Route, Viewport, Datenzustand, Overflow) im BUILD_LOG.
- `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run verify`,
  `npm run test:coverage`, `npm run build`.
- `/crm/leads`-Visualtest 3× hintereinander gegen die CI-generierten Baselines; alle drei
  Projekte in jeder Wiederholung.
- `git diff --check` und Schutzbereichs-Diff leer; keine Secrets in Diff, Artefakten oder Log.

## Abschlussbedingung

Committe lokal mit einer präzisen Nachricht und übergib an den Prüfer. **Issue #13 bleibt
offen, bis die vollständige PR-CI grün ist.**
