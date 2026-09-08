# AUFTRAG 039 / Gate G23 — V2-Regression, Accessibility und Release

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `766edd8` (`docs(review): approve Gate G22 motion and performance`)
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel

Gate G23 ist der abschließende Nachweis für V2.0.0. Er verändert keine Produktansicht und implementiert keine neuen Funktionen. Stattdessen belegt er reproduzierbar, dass die seit G21 bis G22 freigegebenen 41 Routen, die Bedienung mit Tastatur, die Live-KPI-Fehlerzustände sowie die Performance-Budgets zusammen funktionieren.

Erst nach einem vollständig grünen G23 darf eine autorisierte Person den Release-Tag `v2.0.0` erstellen. Das Erstellen eines Tags, ein Push oder eine Veröffentlichung sind **nicht** Teil dieses Builder-Auftrags.

## Verbindliche Entscheidungen

1. **Release statt Umbau:** G23 behebt keine gefundenen Produktfehler stillschweigend. Jeder Fehler in App-, Domain-, Simulations-, Service- oder Ressourcen-Code ist mit Route, Reproduktion und Auswirkung im Bericht als Blocker zu dokumentieren und an den zuständigen Folgeauftrag zurückzugeben.
2. **Echte Route-Matrix:** Die 41 Routen werden zur Laufzeit aus `src/app/routes.tsx` gelesen. Eine zweite, handgepflegte Routentabelle ist verboten.
3. **Echte Interaktion statt Testattrappen:** Navigation, Drawer, Dialoge, Dropdowns, Tabs, Filter, Tabellen, Simulation und Live-KPI-Status werden ausschließlich über vorhandene Produkt-UI bzw. den bereits vorhandenen, kontrollierten E2E-Pfad geprüft. Keine Produktions-Mocks, Testdaten, Test-Routen oder versteckten Flags hinzufügen.
4. **Externer Live-E2E-Runner ist optional:** `scripts/runLiveKpiE2e.ts` bleibt für Betreiber verfügbar und meldet ohne konfigurierte Umgebung transparent `SKIPPED_NOT_CONFIGURED`. Für V2.0.0 werden keine externen Testzugänge bereitgestellt; der Skip ist daher kein Release-Blocker. Freigabepflichtig bleiben die dokumentierten lokalen G23-Gates.
5. **Keine künstliche Bilddifferenz:** Der Auftrag ändert bewusst keine UI. Vorher-/Nachher-Screenshots der stabilen Ansichten und der 33 G21-WebP-Routen dürfen daher identisch sein; Hash-Gleichheit ist dort ein Schutzbeweis. Unterschiede sind nur bei eindeutig ausgelösten, bereits vorhandenen Interaktionszuständen sinnvoll und müssen erklärbar sein.
6. **Versionierung und Veröffentlichung:** `package.json` und der Root-Eintrag von `package-lock.json` werden von `1.3.0` auf exakt `2.0.0` synchronisiert. Nach unabhängiger lokaler Codex-Freigabe lautet der Status `FREIGEGEBEN — TAG/PUSH AUTORISIERT`; eine autorisierte Person darf den annotierten Tag `v2.0.0` erstellen und `main` mit dem Tag pushen.

## Grenzen und Schutzbereiche

- Keine neue npm-Abhängigkeit, kein Cloud-Upload, keine Telemetrie und keine neue Produktionsroute.
- Keine Änderung an Produktcode. Erlaubt sind ausschließlich die unten genannten Release-/Audit-Dateien sowie die beiden Versionsfelder in `package.json` und `package-lock.json`.
- Gegenüber `766edd8` bleiben exakt unverändert:
  - `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/**`, `src/features/resources/**`, `src/features/crm/**`, `src/components/**`, `src/app/**`, `src/domain/**`;
  - `public/assets/auftrag-037d/**`, `public/assets/auftrag-037e/**`, `public/assets/auftrag-037f/**`, `public/assets/auftrag-037g/**`;
  - `docs/references/auftrag-037d/**`, `docs/references/auftrag-037e/**`, `docs/references/auftrag-037f/**`, `docs/references/auftrag-037g/**`;
  - alle bestehenden G21- und G22-Harnesses, Berichte und Screenshots.
- Die 33 direkten Original-WebP-Ansichten, `Internal Resources`, `Sitz & Räumlichkeiten`, die globale Simulationsleiste sowie G22-Motion bleiben unverändert.
- `.claude/**` ist vollständig nutzerverwaltet und darf weder gelesen, noch verändert, noch in einen Commit aufgenommen werden.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `scripts/verifyV2ReleaseReadiness.ts` | Statischer Audit für Versionskonsistenz, erlaubten Diff-Scope, 41-Routen-Quelle, Berichts- und Freigabestatus. |
| `scripts/captureAuftrag039ReleaseMatrix.mjs` | CDP-Harness für Route-, History-, 404-, Sidebar-/Drawer- und Keyboard-Matrix mit Overflow- und Screenshot-Nachweis. |
| `scripts/measureAuftrag039ReleaseReadiness.mjs` | Eigenständige, dokumentierte Browser-Messung der G22-Budgets; verändert keine G22-Artefakte. |
| `docs/screenshots/auftrag-039/**` | Vorher-/Nachher-Captures, Hash-Matrix und nachvollziehbare Ergebnisse. |
| `docs/accessibility/auftrag-039/README.md` | Tastaturprotokoll, Namen-/Rollen-/Fokus-Nachweis und bekannte Grenzen. |
| `docs/performance/auftrag-039/**` | Messumgebung, Budgets, Rohwerte und Ergebnisbericht. |
| `docs/releases/V2.0.0.md` | Vollständige, wahrheitsgemäße Release-Notiz mit Freigabestatus. |
| `docs/BUILD_PLAN_V2.0.0.md` | Phase 6 nach allen lokalen PASS-Gates als für Tag und Push freigegeben markieren. |
| `docs/BUILD_LOG.md` | Builder-Bericht mit jedem einzelnen Gate-Ergebnis oder Blocker. |
| `package.json`, `package-lock.json` | Ausschließlich Versionsfelder auf `2.0.0` synchronisieren; keine Dependency- oder Script-Änderung. |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Audit-Harness bootstrapen, dann echte Vorher-Erfassung

Die drei in diesem Auftrag erlaubten G23-Audit-Skripte existieren auf der Baseline noch nicht. Sie dürfen deshalb **als einziger erster Patch** erstellt werden. Sie enthalten keine Produktlogik, bauen für `--stage=vorher` zwingend den unveränderten Commit `766edd8` in einem temporären Worktree und dürfen keine Ergebnisse aus dem aktuellen Arbeitsbaum als Vorher-Werte ausgeben.

Erst nachdem diese Skripte vorhanden sind, jedoch vor jeder Versions-, Release-, Bericht- oder Build-Log-Änderung ausführen:

Vor dem ersten Patch ausführen:

```bash
node scripts/captureAuftrag039ReleaseMatrix.mjs --stage=vorher
node scripts/measureAuftrag039ReleaseReadiness.mjs --stage=vorher
```

Der Harness baut den Baseline-Commit `766edd8` in einem temporären Worktree, erfasst dort die Vorher-Ergebnisse und entfernt den Worktree im `finally`-Pfad. Er verwendet einen freien lokalen Preview-Port, ein isoliertes Browser-Profil und beendet alle Kindprozesse kontrolliert.

### 2. Routen-, Navigations- und Zustandsmatrix

`captureAuftrag039ReleaseMatrix.mjs` prüft auf 1440 × 900, 768 × 1024 und 375 × 812:

1. **Alle 41 Routen:** Direkter Deep-Link, vollständiger Reload, sichtbarer Hauptinhalt, passender Seitentitel, kein unerwarteter 404-Fallback und `document.documentElement.scrollWidth <= clientWidth`.
2. **History:** `/dashboard` → `/company/profile` → `/crm/deals`; Browser-Zurück und -Vorwärts stellen jeweils URL, aktiven Navigationszustand und Hauptinhalt wieder her.
3. **Root und 404:** `/` leitet zu `/dashboard`; `/non-existent-sample-page-404` zeigt die explizite 404-Seite mit zugänglichem Rücksprung nach `/dashboard`.
4. **Navigation:** Auf Desktop die Sidebar; auf 375 px den Drawer. Beide zeigen den aktiven Eintrag, sind per Tastatur bedienbar und der Drawer schließt nach Routenwechsel bzw. mit `Escape`.
5. **Vorhandene Interaktionen:** Je ein bestehender Dialog, ein Dropdown, Tabs, ein Filter und eine Tabelle werden auf vorhandenen, stabilen Routen geöffnet bzw. bedient. Der Harness darf eine Interaktion nur prüfen, wenn sie auf der produktiven Route tatsächlich vorhanden ist; andernfalls protokolliert er die Route und begründet die Nichtanwendbarkeit.
6. **Simulation und Live-KPI:** Vorhandene UI-Zustände für Simulation, Offline/Loading/Fehler einer Live-KPI und deren Wiederherstellung werden ohne Änderung der Datenquelle überprüft. Der vollständige externe Live-Pfad wird zusätzlich ausschließlich über `runLiveKpiE2e.ts` nachgewiesen.

Mindestens die folgenden repräsentativen Screenshots sind pro Viewport zu sichern: `/dashboard`, `/company/profile`, `/resources/materials`, `/crm/deals`, Mobile-Drawer und 404. Die README verlinkt jedes Paar, enthält SHA-256, Dateigröße, Overflow und eine fachliche Erklärung für Gleichheit oder Differenz.

### 3. Accessibility- und Tastaturprotokoll

Der Harness und `docs/accessibility/auftrag-039/README.md` belegen mit konkreten Selector-/Textnachweisen:

- Alle geprüften Wege sind ausschließlich mit `Tab`, `Shift+Tab`, `Enter`, `Space` und `Escape` bedienbar.
- Bei jedem fokussierbaren Ziel ist ein sichtbarer Fokusindikator vorhanden; der aktive Fokus verlässt nicht den sichtbaren Viewport.
- Sidebar und mobiler Drawer haben erreichbare zugängliche Namen; der Drawer hält beim Öffnen den Fokus, lässt `Escape` zu und gibt den Fokus beim Schließen zurück.
- Dialoge und Dropdowns haben Namen, korrekte Expand-/Dialogzustände und ein nachvollziehbares Fokusverhalten.
- Tabs, Filter und Tabellen sind per Tastatur erreichbar und besitzen ihre vorhandenen zugänglichen Namen bzw. Beschriftungen.
- Die 404-Rückkehr, der G22-Suspense-Fallback und `prefers-reduced-motion: reduce` werden erneut geprüft.

Dies ist ein gezielter Regressionsnachweis, keine pauschale WCAG-Zertifizierung. Fehlende Semantik in den als unveränderte Originalbilder eingebundenen WebPs bleibt gemäß G21 dokumentiert; der vorhandene präzise `alt`-Text bleibt der zugängliche Ersatztext.

### 4. Performance gegen G22-Budgets

`measureAuftrag039ReleaseReadiness.mjs` misst auf einem frischen Produktions-Build, mit derselben lokalen Messmaschine und dokumentierter Methode wie G22:

| Szenario | Budget |
| --- | --- |
| Initialer Load `/dashboard` | höchstens 3.000 ms |
| Client-Wechsel `/dashboard` → `/company/profile` | höchstens 600 ms |
| `/dashboard` bis erstes sichtbares SVG oder erklärter Empty-State | höchstens 800 ms |
| Live-KPI-Wertwechsel normal | höchstens 220 ms |
| Live-KPI bei Reduced Motion | 0 ms und kein Motion-Node |

- Die Messung speichert Rohwerte, Browser/OS-Version, Anzahl Wiederholungen, gewählte Kennzahl (Median) und alle Ausreißer nachvollziehbar unter `docs/performance/auftrag-039/`.
- Sie prüft weiterhin, dass kein G21-WebP in JavaScript-Chunks gebündelt wird.
- Ein überschrittenes Budget ist ein G23-Blocker; Budgets werden nicht nachträglich angepasst.

### 5. Live-Daten-End-to-End und Fehlerzustände

```bash
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsx scripts/runLiveKpiE2e.ts
```

- Der lokale Preflight muss PASS liefern.
- Der externe Runner bleibt ein optionaler Betreiber-Test. `SKIPPED_NOT_CONFIGURED` wird transparent dokumentiert, ist aber kein Release-Blocker, weil für V2.0.0 keine externe Testumgebung vorgesehen ist.
- Fehlerantworten dürfen weder Geheimnisse noch rohe externe Antworten enthalten.

### 6. Versions- und Release-Dokumentation

- Setze exakt `"version": "2.0.0"` in `package.json` sowie im Root-Objekt und `packages[""]` von `package-lock.json`.
- `docs/releases/V2.0.0.md` enthält Datum, Baseline, enthaltene G21D–G23-Gates, bewusst unveränderte Bereiche, ausgeführte Checks, bekannte Einschränkungen und den Status `FREIGEGEBEN — TAG/PUSH AUTORISIERT`.
- Nach allen lokalen PASS-Gates und unabhängiger Codex-Freigabe darf eine ausdrücklich autorisierte Person einen annotierten Tag `v2.0.0` auf dem freigegebenen Commit erstellen und `main` mit dem Tag pushen.

## Verifikation

Alle lokalen Pflichtbefehle müssen mit Exit 0 enden. Der externe Runner bleibt optional; sein transparenter Status `SKIPPED_NOT_CONFIGURED` blockiert die V2.0.0-Freigabe nicht.

```bash
node scripts/captureAuftrag039ReleaseMatrix.mjs --stage=vorher
node scripts/measureAuftrag039ReleaseReadiness.mjs --stage=vorher
npx tsx scripts/verifyV2ReleaseReadiness.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsx scripts/runLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
node scripts/measureAuftrag039ReleaseReadiness.mjs --stage=nachher
node scripts/captureAuftrag039ReleaseMatrix.mjs --stage=nachher
git diff --check 766edd8..HEAD
git diff --exit-code 766edd8..HEAD -- src/simulation src/types src/context src/services src/features/resources src/features/crm src/components src/app src/domain public/assets/auftrag-037d public/assets/auftrag-037e public/assets/auftrag-037f public/assets/auftrag-037g docs/references/auftrag-037d docs/references/auftrag-037e docs/references/auftrag-037f docs/references/auftrag-037g
```

`verifyV2ReleaseReadiness.ts` prüft zusätzlich mindestens:

1. `package.json`, `package-lock.json` und `docs/releases/V2.0.0.md` verwenden durchgehend `2.0.0`.
2. Die Routenzahl wird direkt aus `APP_ROUTES` ermittelt und beträgt 41; der Screenshotbericht deckt alle 41 Deep-Links, Reloads und drei Viewports ab.
3. Die Berichte enthalten Hashes, Overflow-Ergebnisse, Accessibility-Protokoll und dokumentierte G22-Budgets mit Rohwerten.
4. Der Diff enthält ausschließlich erlaubte Dateien und exakt die zwei erlaubten Versionsänderungen in den Paketdateien.
5. Der Release-Bericht dokumentiert `SKIPPED_NOT_CONFIGURED` als optionalen, nicht ausgeführten Betreiber-Test; bei bestandenen lokalen Gates lautet der Status `FREIGEGEBEN — TAG/PUSH AUTORISIERT`.
6. Kein `git tag`, `git push`, Secret oder produktiver Konfigurationswert ist im Diff enthalten.

## Akzeptanzkriterien für Codex

- Alle 41 Routen, Root-Redirect, 404, Reload, History und Navigation funktionieren an allen drei Zielbreiten ohne horizontalen Overflow.
- Navigation, Drawer, Dialoge, Dropdowns, Tabs, Filter und Tabellen bestehen den dokumentierten Tastatur-/Fokus-/Namen-Nachweis.
- Simulation, statische Daten, Live-KPI-Fehlerzustände und Performance sind ohne Produktcode-Änderung regressionsfrei belegt.
- Alle G21-Assets und geschützten Bereiche sind gegen `766edd8` unverändert.
- `2.0.0` ist in Paket und Lockfile konsistent; die Release-Notiz ist vollständig und wahrheitsgemäß.
- Der lokale Live-KPI-Preflight ist PASS; der externe Runner bleibt optional und darf transparent `SKIPPED_NOT_CONFIGURED` melden.
- Tag und Push erfolgen nur nach ausdrücklicher Autorisierung.

**Abnahme:** Erst nach unabhängigem Codex-Review aller PASS-Nachweise kann eine autorisierte Person den separaten Release-Schritt mit annotiertem Tag `v2.0.0` entscheiden.
