import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import esbuild from 'esbuild';

const BASELINE_COMMIT = '766edd8';

function logPass(msg: string) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
}

let hasErrors = false;

function assert(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) {
    logPass(passMsg);
  } else {
    logFail(failMsg);
    hasErrors = true;
  }
}

console.log('================================================================');
console.log('Gate G23 / Auftrag 039 V2 Release Readiness Audit');
console.log('================================================================\n');

async function runAudit() {
  // 1. Audit Version Consistency (package.json, package-lock.json, V2.0.0.md)
  console.log('--- 1. Versions- und Release-Status Konsistenz ---');
  const pkgJsonPath = path.resolve('package.json');
  const pkgLockPath = path.resolve('package-lock.json');
  const releaseDocPath = path.resolve('docs/releases/V2.0.0.md');

  assert(fs.existsSync(pkgJsonPath), 'package.json existiert', 'package.json fehlt');
  assert(fs.existsSync(pkgLockPath), 'package-lock.json existiert', 'package-lock.json fehlt');
  assert(fs.existsSync(releaseDocPath), 'docs/releases/V2.0.0.md existiert', 'docs/releases/V2.0.0.md fehlt');

  if (fs.existsSync(pkgJsonPath) && fs.existsSync(pkgLockPath) && fs.existsSync(releaseDocPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
    const releaseDoc = fs.readFileSync(releaseDocPath, 'utf8');

    assert(pkg.version === '2.0.0', `package.json hat Version 2.0.0 (ist: ${pkg.version})`, 'package.json hat nicht Version 2.0.0');
    assert(lock.version === '2.0.0', `package-lock.json Root hat Version 2.0.0 (ist: ${lock.version})`, 'package-lock.json Root hat nicht Version 2.0.0');
    assert(lock.packages && lock.packages[''] && lock.packages[''].version === '2.0.0', 'package-lock.json packages[""] hat Version 2.0.0', 'package-lock.json packages[""] hat nicht Version 2.0.0');

    assert(
      releaseDoc.includes('2.0.0') && releaseDoc.includes('FREIGEGEBEN — TAG/PUSH AUTORISIERT'),
      'docs/releases/V2.0.0.md dokumentiert Version 2.0.0 und die lokale Release-Freigabe',
      'docs/releases/V2.0.0.md fehlt Version 2.0.0 oder der Status FREIGEGEBEN — TAG/PUSH AUTORISIERT'
    );
  }

  // 2. Audit 41 Routes dynamisch aus src/app/routes.tsx
  console.log('\n--- 2. Audit 41 Routen (direkt aus src/app/routes.tsx) ---');
  const routesPath = path.resolve('src/app/routes.tsx');
  assert(fs.existsSync(routesPath), 'src/app/routes.tsx existiert', 'src/app/routes.tsx fehlt');

  let loadedRouteCount = 0;
  let appRoutes: any[] = [];
  if (fs.existsSync(routesPath)) {
    const buildResult = await esbuild.build({
      entryPoints: [routesPath],
      bundle: true,
      format: 'esm',
      write: false,
      define: {
        'import.meta.env.DEV': 'false',
        'import.meta.env': '{}',
      },
      alias: {
        '@': path.resolve('src'),
      },
    });

    const code = buildResult.outputFiles[0].text;
    const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    appRoutes = mod.APP_ROUTES || [];
    loadedRouteCount = appRoutes.length;
    assert(loadedRouteCount === 41, `src/app/routes.tsx exportiert genau 41 Routen (gefunden: ${loadedRouteCount})`, `src/app/routes.tsx exportiert ${loadedRouteCount} Routen statt 41`);
  }

  // 3. Audit 33 WebP-Ansichten
  console.log('\n--- 3. Audit 33 geschützte WebP-Originalansichten ---');
  const webpFolders = [
    { dir: 'public/assets/auftrag-037d', expected: 7 },
    { dir: 'public/assets/auftrag-037e', expected: 7 },
    { dir: 'public/assets/auftrag-037f', expected: 9 },
    { dir: 'public/assets/auftrag-037g', expected: 10 },
  ];

  let totalWebp = 0;
  for (const f of webpFolders) {
    if (fs.existsSync(f.dir)) {
      const count = fs.readdirSync(f.dir).filter((file) => file.endsWith('.webp')).length;
      totalWebp += count;
      assert(count === f.expected, `${f.dir} enthält genau ${f.expected} WebP-Assets (gefunden: ${count})`, `${f.dir} enthält ${count} WebP-Assets statt ${f.expected}`);
    } else {
      logFail(`Verzeichnis ${f.dir} fehlt`);
      hasErrors = true;
    }
  }
  assert(totalWebp === 33, `Gesamtzahl geschützter WebP-Ansichten ist exakt 33 (gefunden: ${totalWebp})`, `Gesamtzahl WebP-Ansichten ist ${totalWebp} statt 33`);

  // 4. Audit Screenshot Matrix & Accessibility Berichte
  console.log('\n--- 4. Audit Berichte (Screenshots, Accessibility, Performance) ---');
  const shotReadmePath = path.resolve('docs/screenshots/auftrag-039/README.md');
  const a11yReadmePath = path.resolve('docs/accessibility/auftrag-039/README.md');
  const perfReadmePath = path.resolve('docs/performance/auftrag-039/README.md');
  const perfVorherJson = path.resolve('docs/performance/auftrag-039/perf-vorher.json');
  const perfNachherJson = path.resolve('docs/performance/auftrag-039/perf-nachher.json');

  assert(fs.existsSync(shotReadmePath), 'docs/screenshots/auftrag-039/README.md existiert', 'Screenshot README fehlt');
  assert(fs.existsSync(a11yReadmePath), 'docs/accessibility/auftrag-039/README.md existiert', 'Accessibility README fehlt');
  assert(fs.existsSync(perfReadmePath), 'docs/performance/auftrag-039/README.md existiert', 'Performance README fehlt');
  assert(fs.existsSync(perfVorherJson), 'docs/performance/auftrag-039/perf-vorher.json existiert', 'perf-vorher.json fehlt');
  assert(fs.existsSync(perfNachherJson), 'docs/performance/auftrag-039/perf-nachher.json existiert', 'perf-nachher.json fehlt');

  const matrixVorherJson = path.resolve('docs/screenshots/auftrag-039/matrix-vorher.json');
  const matrixNachherJson = path.resolve('docs/screenshots/auftrag-039/matrix-nachher.json');
  assert(fs.existsSync(matrixVorherJson), 'matrix-vorher.json existiert', 'matrix-vorher.json fehlt');
  assert(fs.existsSync(matrixNachherJson), 'matrix-nachher.json existiert', 'matrix-nachher.json fehlt');

  let matrixData: any = null;
  let vorherMatrix: any = null;

  if (fs.existsSync(matrixVorherJson)) {
    vorherMatrix = JSON.parse(fs.readFileSync(matrixVorherJson, 'utf8'));
  }

  if (fs.existsSync(matrixNachherJson)) {
    matrixData = JSON.parse(fs.readFileSync(matrixNachherJson, 'utf8'));

    assert(matrixData.routeCount === 41, 'Matrix deckt exakt 41 Routen ab', `Matrix deckt ${matrixData.routeCount} statt 41 Routen ab`);
    assert(matrixData.historyPass === true, 'History-Navigation (Zurück/Vorwärts) synchron belegt', 'History-Navigation fehlgeschlagen');
    assert(matrixData.rootPass === true, 'Root-Redirect (/) nach /dashboard erfolgreich', 'Root-Redirect fehlgeschlagen');
    assert(matrixData.returnPass === true, '404-Seite und barrierefreier Rücksprung nach /dashboard belegt', '404-Prüfung fehlgeschlagen');

    // Accessibility- & Tastaturnachweise
    assert(matrixData.desktopA11y?.keyboardPass === true, 'Desktop Sidebar Tastatur-Akkordeon und Navigation per Enter belegt', 'Desktop Sidebar Tastaturnachweis fehlt');
    assert(matrixData.mobileA11y?.keyboardAndTrapPass === true, 'Mobile Drawer Fokus-Trap (Shift+Tab/Tab), Escape und Fokus-Restore belegt', 'Mobile Drawer Fokus-Trap fehlt');
    assert(matrixData.dialogTest?.pass === true && matrixData.dialogTest?.openedModal === true && matrixData.dialogTest?.closedCleanly === true, 'Dialog/Modal (RunActionModal auf /crm/live-simulation) öffnet per Enter und schließt per Escape', 'Dialog/Modal Prüfung fehlgeschlagen');
    assert(matrixData.crmInteractions?.hasSelect === true && matrixData.crmInteractions?.selectOpened === true && matrixData.crmInteractions?.selectClosed === true, 'Combobox/Select auf /crm/deals per ArrowDown/Enter bedienbar', 'Combobox/Select Prüfung fehlgeschlagen');
    assert(matrixData.crmInteractions?.filterActive === true && matrixData.crmInteractions?.filteredRows < matrixData.crmInteractions?.initialRows, `Filter auf /crm/deals reduziert Deal-Zeilen (${matrixData.crmInteractions?.initialRows} → ${matrixData.crmInteractions?.filteredRows})`, 'Filter reduzierte Zeilen nicht');
    assert(matrixData.tabsTest?.pass === true && matrixData.tabsTest?.tabSwitched === true, 'Tabs auf /crm/leads per Tastatur umschaltbar (aria-selected aktualisiert)', 'Tabs Prüfung fehlgeschlagen');
    assert(matrixData.simKpiCheck?.pass === true && matrixData.simKpiCheck?.liveKpiOffline === true, 'Live-KPI Card auf /dashboard zeigt ehrlich Offline (Lokal) und unkonfigurierten Status', 'Live-KPI Offline Nachweis fehlt');

    // Harte Validierung der Matrix-Vollständigkeit gegen APP_ROUTES
    const expectedViewports = ['1440', '768', '375'];
    const matrixResults = matrixData.matrixResults || [];

    // 1. Eindeutigkeit und Anzahl der Routen in der Matrix
    const matrixPaths = new Set(matrixResults.map((r: any) => r.path));
    assert(
      matrixResults.length === 41 && matrixPaths.size === 41,
      `Matrix enthält exakt 41 eindeutige Routenpfade (gefunden: ${matrixResults.length} Einträge, ${matrixPaths.size} eindeutig)`,
      `Matrix enthält ${matrixResults.length} Einträge (${matrixPaths.size} eindeutige Pfade) statt exakt 41`
    );

    const matrixByPath = new Map<string, any>();
    for (const r of matrixResults) {
      matrixByPath.set(r.path, r);
    }

    let allExpectedRoutesPresent = true;
    let allTitlesMatch = true;
    let allIdsMatch = true;
    let allViewportsPresent = true;
    let allDeepLinkPass = true;
    let allReloadPass = true;
    let allNavsMatch = true;
    let allZeroOverflow = true;
    let allHaveMain = true;

    for (const route of appRoutes) {
      const r = matrixByPath.get(route.path);
      if (!r) {
        allExpectedRoutesPresent = false;
        logFail(`Route ${route.path} (${route.title}) fehlt vollständig in matrixResults!`);
        continue;
      }

      if (r.title !== route.title) {
        allTitlesMatch = false;
        logFail(`Titel-Mismatch auf ${route.path}: Matrix="${r.title}", APP_ROUTES="${route.title}"`);
      }

      if (r.id !== route.id) {
        allIdsMatch = false;
        logFail(`ID-Mismatch auf ${route.path}: Matrix="${r.id}", APP_ROUTES="${route.id}"`);
      }

      for (const vpName of expectedViewports) {
        const vpData = r.viewports ? r.viewports[vpName] : null;
        if (!vpData) {
          allViewportsPresent = false;
          logFail(`Viewport ${vpName} fehlt auf Route ${route.path} in matrixResults!`);
          continue;
        }

        // Deep-Link Prüfung (strikte Pflichtfeldprüfung)
        const dl = vpData.deepLink;
        if (!dl || typeof dl !== 'object') {
          allDeepLinkPass = false;
          logFail(`Deep-Link Datenobjekt fehlt auf ${route.path} (${vpName}px)`);
        } else {
          const dlStrictValid =
            dl.pass === true &&
            dl.overflow === 0 &&
            dl.hasMain === true &&
            dl.isNotFound === false &&
            dl.titleMatches === true &&
            (vpName !== '1440' || dl.navMatches === true);

          if (!dlStrictValid) {
            allDeepLinkPass = false;
            logFail(`Deep-Link Pflichtfelder nicht strikt erfüllt auf ${route.path} (${vpName}px): ${JSON.stringify(dl)}`);
          }
          if (dl.overflow !== 0) allZeroOverflow = false;
          if (dl.hasMain !== true || dl.isNotFound !== false) allHaveMain = false;
          if (dl.titleMatches !== true) allTitlesMatch = false;
          if (vpName === '1440' && dl.navMatches !== true) allNavsMatch = false;
        }

        // Reload Prüfung (strikte Pflichtfeldprüfung)
        const rl = vpData.reload;
        if (!rl || typeof rl !== 'object') {
          allReloadPass = false;
          logFail(`Reload Datenobjekt fehlt auf ${route.path} (${vpName}px)`);
        } else {
          const rlStrictValid =
            rl.pass === true &&
            rl.overflow === 0 &&
            rl.hasMain === true &&
            rl.isNotFound === false &&
            rl.titleMatches === true &&
            (vpName !== '1440' || rl.navMatches === true);

          if (!rlStrictValid) {
            allReloadPass = false;
            logFail(`Reload Pflichtfelder nicht strikt erfüllt auf ${route.path} (${vpName}px): ${JSON.stringify(rl)}`);
          }
          if (rl.overflow !== 0) allZeroOverflow = false;
          if (rl.hasMain !== true || rl.isNotFound !== false) allHaveMain = false;
          if (rl.titleMatches !== true) allTitlesMatch = false;
          if (vpName === '1440' && rl.navMatches !== true) allNavsMatch = false;
        }

        if (vpData.pass !== true) {
          allDeepLinkPass = false;
          logFail(`Viewport pass !== true auf ${route.path} (${vpName}px)`);
        }
      }
    }

    assert(allExpectedRoutesPresent, 'Alle 41 APP_ROUTES sind lückenlos in matrixResults vorhanden', 'Fehlende Routen in matrixResults');
    assert(allTitlesMatch, 'Alle 41 Routen stimmen exakt mit APP_ROUTES Seitentiteln überein (Deep-Link & Reload)', 'Mindestens ein Routentitel weicht ab');
    assert(allIdsMatch, 'Alle 41 Routen-IDs stimmen exakt mit APP_ROUTES IDs überein', 'Mindestens eine Routen-ID weicht ab');
    assert(allViewportsPresent, 'Alle drei Viewports (1440/768/375) sind für jede der 41 Routen lückenlos vorhanden', 'Fehlende Viewports in mindestens einer Route');
    assert(allDeepLinkPass, 'Alle 41 Routen bestehen Deep-Link Prüfung auf allen Viewports', 'Deep-Link Prüfung auf mindestens einer Route fehlgeschlagen');
    assert(allReloadPass, 'Alle 41 Routen bestehen Reload Prüfung auf allen Viewports', 'Reload Prüfung auf mindestens einer Route fehlgeschlagen');
    assert(allNavsMatch, 'Desktop 1440px Navigationslinks matchen exakt die aktiven Pfade (Deep-Link & Reload)', 'Navigationszustand matcht Route nicht');
    assert(allZeroOverflow, 'Alle 41 Routen haben 0 px horizontalen Overflow auf allen Viewports (Deep-Link & Reload)', 'Horizontaler Overflow gefunden');
    assert(allHaveMain, 'Alle 41 Routen rendern einen sichtbaren Hauptinhalt (<main>) (Deep-Link & Reload)', 'Hauptinhalt fehlt');
  }

  // 4b. Audit aller 36 Screenshot-Dateien & SHA-256 Hashes
  console.log('\n--- 4b. Audit aller 36 Screenshot-Dateien & SHA-256 Hashes ---');
  const representativeShots = [
    { id: 'dashboard', name: 'Executive Dashboard' },
    { id: 'company-profile', name: 'Unternehmenssteckbrief (WebP)' },
    { id: 'resources-materials', name: 'Internal Resources' },
    { id: 'crm-deals', name: 'Deal Pipeline' },
    { id: 'mobile-drawer', name: 'Navigation (Sidebar/Drawer)' },
    { id: 'not-found-404', name: '404-Fehlerseite' },
  ];
  const viewports = ['1440', '768', '375'];
  const shotReadmeContent = fs.existsSync(shotReadmePath) ? fs.readFileSync(shotReadmePath, 'utf8') : '';

  let allShotsExist = true;
  let allHashesMatchMatrix = true;
  let allHashesMatchReadme = true;

  for (const shot of representativeShots) {
    for (const vp of viewports) {
      for (const stg of ['vorher', 'nachher']) {
        const fileName = `${shot.id}-${vp}-${stg}.png`;
        const filePath = path.resolve(`docs/screenshots/auftrag-039/${fileName}`);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
          allShotsExist = false;
          logFail(`Screenshot-Datei fehlt oder ist leer: ${fileName}`);
          continue;
        }

        const fileBuf = fs.readFileSync(filePath);
        const realSha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
        const shortSha = realSha256.substring(0, 12);

        // Check against matrix json
        const targetMatrix = stg === 'vorher' ? vorherMatrix : matrixData;
        const entry = targetMatrix?.screenshotData?.find((s: any) => s.id === shot.id && s.viewport === vp && s.stage === stg);
        if (!entry || entry.hash !== realSha256) {
          allHashesMatchMatrix = false;
          logFail(`Hash-Diskrepanz in matrix-${stg}.json für ${fileName}: Datei=${realSha256}, Matrix=${entry?.hash}`);
        }

        // Check against README.md
        if (!shotReadmeContent.includes(shortSha)) {
          allHashesMatchReadme = false;
          logFail(`README.md enthält den tatsächlichen Hash (${shortSha}) für ${fileName} nicht`);
        }
      }
    }
  }

  assert(allShotsExist, 'Sämtliche 36 Screenshot-Dateien (6 Ansichten × 3 Breiten × 2 Stages) existieren und sind nicht leer', 'Fehlende Screenshot-Dateien festgestellt');
  assert(allHashesMatchMatrix, 'Alle 36 Datei-Hashes stimmen exakt mit matrix-vorher.json und matrix-nachher.json überein', 'Hash-Diskrepanz zwischen Dateien und Matrix-JSON');
  assert(allHashesMatchReadme, 'Alle 36 Datei-Hashes sind im docs/screenshots/auftrag-039/README.md exakt dokumentiert', 'README.md enthält inkonsistente Screenshot-Hashes');

  if (fs.existsSync(perfNachherJson)) {
    const perfData = JSON.parse(fs.readFileSync(perfNachherJson, 'utf8'));
    assert(perfData.scenario1?.pass === true, `Scenario 1 (Load <= 3000 ms): ${perfData.scenario1?.measuredMs} ms`, 'Scenario 1 verfehlt Budget');
    assert(perfData.scenario2?.pass === true, `Scenario 2 (Switch <= 600 ms): ${perfData.scenario2?.measuredMs} ms`, 'Scenario 2 verfehlt Budget');
    assert(perfData.scenario3?.pass === true, `Scenario 3 (Chart SVG <= 800 ms): ${perfData.scenario3?.measuredMs} ms`, 'Scenario 3 verfehlt Budget');
    assert(perfData.scenario4?.normalPass === true, `Scenario 4 (Normal Anim <= 220 ms): ${perfData.scenario4?.normalMs} ms, hadGlitch: ${perfData.scenario4?.hadGlitch}`, 'Scenario 4 Normal verfehlt Budget');
    assert(perfData.scenario4?.reducedMotionPass === true, `Scenario 4 (Reduced Motion = 0 ms): ${perfData.scenario4?.reducedMotionMs} ms`, 'Scenario 4 Reduced Motion verfehlt Budget');
    assert(perfData.webpAudit?.webpInJs === 0, 'Exakt 0 WebP-Assets in JS Chunks gebündelt', 'WebP-Assets in JS Chunks gefunden');
  }

  // 5. Audit Build Plan Phase 6 Status
  console.log('\n--- 5. Audit docs/BUILD_PLAN_V2.0.0.md (lokal freigegeben) ---');
  const buildPlanPath = path.resolve('docs/BUILD_PLAN_V2.0.0.md');
  assert(fs.existsSync(buildPlanPath), 'docs/BUILD_PLAN_V2.0.0.md existiert', 'BUILD_PLAN fehlt');
  if (fs.existsSync(buildPlanPath)) {
    const planContent = fs.readFileSync(buildPlanPath, 'utf8');
    assert(
      planContent.includes('### Auftrag 039 / Gate G23: V2-Regression, Accessibility und Release') &&
      planContent.includes('FREIGEGEBEN — TAG/PUSH AUTORISIERT') &&
      !planContent.includes('BLOCKED_LIVE_E2E'),
      'Auftrag 039 ist im BUILD_PLAN lokal für Tag und Push freigegeben',
      'BUILD_PLAN enthält nicht den lokal freigegebenen G23-Status'
    );
  }

  // 6. Audit Diff Scope gegen 766edd8
  console.log('\n--- 6. Audit Diff Scope gegen Baseline 766edd8 ---');
  const protectedPaths = [
    'src/simulation',
    'src/types',
    'src/context',
    'src/services',
    'src/features/resources',
    'src/features/crm',
    'src/components',
    'src/app',
    'src/domain',
    'public/assets/auftrag-037d',
    'public/assets/auftrag-037e',
    'public/assets/auftrag-037f',
    'public/assets/auftrag-037g',
    'docs/references/auftrag-037d',
    'docs/references/auftrag-037e',
    'docs/references/auftrag-037f',
    'docs/references/auftrag-037g',
  ];

  try {
    execSync(`git diff --exit-code ${BASELINE_COMMIT}..HEAD -- ${protectedPaths.join(' ')}`, { stdio: 'pipe' });
    logPass(`Schutzbereichs-Diff gegen ${BASELINE_COMMIT} ist exakt 0 Zeilen (Produktcode unverändert)`);
  } catch {
    logFail(`Schutzbereiche wurden gegenüber Baseline ${BASELINE_COMMIT} verändert!`);
    hasErrors = true;
  }

  // 7. Keine Secrets oder unautorisierte Tags/Pushes
  console.log('\n--- 7. Sicherheits- & Release-Disziplin ---');
  const tags = execSync('git tag --points-at HEAD', { encoding: 'utf8' }).trim();
  const tagList = tags ? tags.split('\n') : [];
  assert(
    tagList.length === 0 || (tagList.length === 1 && tagList[0] === 'v2.0.0'),
    tagList.length === 0
      ? 'Kein Tag vor dem autorisierten Release-Schritt erstellt'
      : 'Autorisierter Release-Tag v2.0.0 zeigt auf den geprüften Commit',
    `Unerlaubter Git-Tag gefunden: ${tags}`
  );

  console.log('\n================================================================');
  if (hasErrors) {
    console.error('\x1b[31mGate G23 Audit FEHLGESCHLAGEN. Bitte Fehler beheben.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mGate G23 Audit ERFOLGREICH BESTANDEN.\x1b[0m');
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
