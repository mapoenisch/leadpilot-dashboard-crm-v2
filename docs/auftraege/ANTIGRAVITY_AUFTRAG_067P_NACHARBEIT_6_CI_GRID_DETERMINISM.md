# Auftrag 067P – Nacharbeit 6: Deterministisches CRM-KPI-Raster für CI-Visuals

## Rolle und Ziel

Du bist der **Builder**. Setze ausschließlich diese Nacharbeit um, führe die verlangten
Gates aus und dokumentiere das Ergebnis in `docs/BUILD_LOG.md`. Kein Push des
Feature-Branches, Merge, Deploy oder Issue-Close. Die einzige Ausnahme ist der im
Preflight verlangte, kurzlebige Push von `visual-baselines/067p-ci-preflight`, damit die
bestehende Baseline-Erzeugung in GitHub Actions als Diagnose-Umgebung laufen kann.

**N6 darf noch nicht implementiert werden.** Die Authentifizierung ist geschlossen, die
Zeitstempelmaske greift. Der PR-CI-Lauf
`35755068622` scheitert dennoch mit genau zwei Visualtests: `/crm/leads` auf Desktop
(3.996 differierende Pixel) und Tablet (2.351/2.360 differierende Pixel). Mobile und die
restlichen 598 Playwright-Tests sind grün.

## Belegte Fakten und unbestätigte Hypothese

Die Zeitstempelmaske ist **nicht** die Ursache: In den CI-Artefakten liegt ihre Box an
derselben Stelle, während die Differenzen von `x=33..1406, y=83..671` reichen. Die
committeten N5-Baselines stimmen bytegleich mit den Sollbildern im CI-Report überein; die
Istbilder zeigen jedoch ein anders verteiltes CRM-KPI-Raster.

Die Baseline-/Istbild-Differenz ist damit belegt. Die Erklärung über das intrinsische
Grid-Mindestmaß und den `⚡`-Font-Fallback ist dagegen nur eine **Hypothese**: Sie erklärt das
sichtbare unterschiedliche Raster, ist aber noch nicht in derselben GitHub-Ubuntu-Ausführung
experimentell gegengetestet. `minmax(0, 1fr)` darf daher weder in Produkt-CSS noch in eine
Baseline gelangen, bevor der folgende Preflight beide Punkte nachweist.

## Pflicht-Preflight vor jeder Produktänderung

1. Lege ausschließlich für die Untersuchung den temporären Branch
   `visual-baselines/067p-ci-preflight` vom unveränderten N5-Stand an. Der Feature-Branch,
   die PR und ihre Baselines bleiben unverändert.
2. Ändere nur auf diesem temporären Branch den bestehenden Baseline-Workflow so, dass er
   `e2e/visual.spec.ts` ohne `--update-snapshots`, mit denselben zwei Workern und mindestens
   drei Wiederholungen ausführt. Das erwartete rote Ergebnis liefert den Report, aber ändert
   keine versionierte Baseline.
3. Gib im temporären Testlauf für `/crm/leads` maschinenlesbar aus: Browser-Version,
   `window.innerWidth`, `devicePixelRatio`, die geladenen lokalen Font-Familien,
   `gridTemplateColumns` der `.crm-v2-kpi-grid` sowie alle vier bzw. zwei Kartenbreiten.
   Keine Tokens, URLs mit Schlüsseln oder Storage-State ausgeben.

   ```ts
   const ciVisualPreflight = await page.locator('.crm-v2-kpi-grid').evaluate((grid) => ({
     viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
     gridTemplateColumns: getComputedStyle(grid).gridTemplateColumns,
     cards: Array.from(grid.children, (card) => card.getBoundingClientRect().width),
     fonts: ['Inter', 'Space Grotesk', 'JetBrains Mono'].map((family) => ({
       family,
       loaded: document.fonts.check(`16px "${family}"`),
     })),
   }));
   console.info(`[CI_VISUAL_PREFLIGHT] ${JSON.stringify(ciVisualPreflight)}`);
   ```
4. Beweise anhand des Artefakts eine von zwei Aussagen:
   - Das isolierte Ubuntu-Visual reproduziert dieselbe Desktop-/Tablet-Abweichung: Dann ist
     eine umgebungsabhängige Rasterberechnung bestätigt und die `minmax(0, 1fr)`-Hypothese
     wird mit einem zweiten, kleinen A/B-Test geprüft.
   - Das isolierte Visual ist grün: Dann ist Parallelität bzw. geteilter Testzustand die
     Ursache; N6 wird gestoppt und es erfolgt **keine** CSS- oder Baseline-Änderung.
5. Erst nach schriftlichem Prüferbefund aus diesem Preflight darf der nachfolgende Teil
   „Umsetzung – strikt TDD“ ausgeführt werden. Der Preflight ist ein einzelner gezielter
   GitHub-Run, keine weitere PR-CI-Runde.

## Preflight-Revision nach Run `35760287093`

Der erste Preflight ist **ungültig**, weil sein Workflow `edge-runtime` in `supabase start -x`
abschaltet. Die CRM-Edge-Function liefert dann `SERVER_ERROR`; alle drei Visuals zeigen einen
Fehlerzustand statt der PR-CI-Seed-Daten. Die gemessenen Pixelwerte sind deshalb nicht mit
PR-CI `35755068622` vergleichbar.

Der bestehende Diagnose-Branch `visual-baselines/067p-ci-preflight` wird einmalig korrigiert
und erneut gepusht. Er darf weiterhin weder den Feature-Branch noch PR #20 verändern:

1. Entferne **nur** `edge-runtime` aus der Ausschlussliste von
   `.github/workflows/update-visual-baselines.yml`. Damit startet derselbe lokale
   Supabase-Edge-Function-Dienst wie in `ci.yml`. `E2E_CLEANUP_KEY`, Manager- und Viewer-Login
   bleiben bewusst ausgenommen: `e2e/visual.spec.ts` verwendet nur den existierenden
   `admin-a`-Login und führt weder Cleanup noch Rollenwechsel aus.
2. Behalte den normalen, dreifach wiederholten Visualbefehl und die vorhandene Telemetrie bei.
   Ergänze vor Telemetrie und Screenshot für `/crm/leads` einen Fail-Closed-Seed-Check:

   ```ts
   const sourceStatus = page.getByRole('status', { name: 'Status der Datenquelle' });
   await expect(sourceStatus).toContainText('Supabase CRM');
   await expect(sourceStatus).toContainText(/Status: Gesund/i);
   await expect(sourceStatus).toContainText(/Frische: Aktuell/i);
   await expect(sourceStatus).not.toContainText('SERVER_ERROR');
   await expect(page.getByText(/^1 Einträge$/i)).toBeVisible();
   ```

   Schlägt einer dieser Checks fehl, ist das ein Diagnosefehler, keine Screenshot-Differenz;
   es werden weder CSS noch Baselines geändert.
3. Lade `regen-report` nach dem Lauf herunter und vergleiche für jeden Viewport das aktuelle
   Istbild mit dem Istbild aus PR-CI `35755068622`. Dokumentiere je Viewport: Seed-Check,
   Diff-Pixelzahl, Diff-Bounding-Box und ob die PR-CI-Signatur (Desktop/Tablet rot, Mobile
   grün) reproduziert ist.
4. Auswertung:
   - Nur bei gültigem Seed-Check **und** gleicher Signatur ist die Baseline-/Rasterfrage
     isoliert. Der Prüfer entscheidet dann getrennt über Desktop und Tablet; ein
     `minmax(0, 1fr)`-Fix darf nicht ohne Erklärung der Tablet-Differenz erfolgen.
   - Bei abweichender Signatur bleibt N6 gesperrt. Dokumentiere die Differenz, aber starte
     weder CSS-Änderung noch einen weiteren Preflight ohne neuen Prüferauftrag.

## Erlaubter Scope

**Temporärer Diagnose-Branch, nie Feature-Branch/PR:**

- `.github/workflows/update-visual-baselines.yml` – nur den Aufruf von
  `--update-snapshots` auf den normalen dreifach wiederholten Visualtest umstellen
- `e2e/visual.spec.ts` – nur die oben definierte, secret-freie Preflight-Telemetrie
- keine Baselines, kein Produktcode, keine BUILD_LOG-Änderung in diesem Branch

**Erst nach bestandenem Preflight im Feature-Branch:**

- `src/styles/global.css` – ausschließlich `.crm-v2-kpi-grid` und ihre zwei vorhandenen
  Breakpoint-Regeln
- `e2e/visual.spec.ts` – nur die `/crm/leads`-Sicherung gegen ungleiche Grid-Tracks;
  N3-Fail-Closed-Checks und N5-Zeitstempelmaske bleiben erhalten
- genau die drei Linux-Baselines zu `visual /crm/leads` unter
  `e2e/visual.spec.ts-snapshots/`
- `docs/BUILD_LOG.md`

Produktdaten, Authentifizierung, `DataSourceStatus`, globale Playwright-Konfiguration,
sonstige Baselines und Schutzbereiche bleiben unverändert. Der Workflow wird ausschließlich
im kurzlebigen Diagnose-Branch geändert und niemals in den Feature-Branch übernommen.

## Umsetzung – strikt TDD (gesperrt bis der Preflight die Hypothese bestätigt)

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
