# AUFTRAG 038 / Gate G22 — Reduzierte Motion, Live-Zahlenübergänge und Performance

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `98bb53a` (`docs(review): approve Gate G21G direct WebP views`)
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel

Die Anwendung lädt Route-Module bedarfsgerecht und visualisiert ausschliesslich echte Änderungen einer Live-KPI dezent. Bewegungen sind immer optional, blockieren keine Eingabe und werden bei `prefers-reduced-motion: reduce` vollständig durch eine sofortige Wertaktualisierung ersetzt.

Dieser Auftrag ist **kein** neuer Seitenumbau. Die direkten Original-WebP-Ansichten aus G21D bis G21G bleiben pixelgenau, vollständig und unverändert.

## Verbindliche Entscheidungen

1. **Motion-Scope:** Nur der Hauptwert einer `LiveKpiCard` darf einen Count-up erhalten. Der erste geladene Snapshot wird nicht animiert. Animation startet ausschließlich nach einer tatsächlichen Änderung von `snapshot.value` bei Status `live`.
2. **Keine allgemeine Seitenanimation:** Es gibt keine Fade-/Slide-Transition für Seiten, Sidebar, Topbar, Dialoge, Tabellen oder direkte WebP-Routen. Sie bringt in der aktuellen Anwendung keinen zusätzlichen Informationswert und würde die Bildseiten unnötig beeinflussen.
3. **Route-Lazy-Loading:** Alle bestehenden Page-Module werden über `React.lazy` nur beim erstmaligen Aufruf ihrer Route geladen. Die App-Schale, Routen-Metadaten, Simulation und fachliche Daten bleiben statisch bzw. unverändert.
4. **WebP-Assets:** Die 32 Original-WebPs aus G21D bis G21G bleiben unter ihren vorhandenen URLs, mit ihren vorhandenen Hashes und mit `loading="eager"` unverändert. Da sie als öffentliche Bildressourcen erst von der jeweils gerenderten Route angefordert werden, werden sie nicht in JavaScript importiert, umgewandelt oder global vorgeladen.

## Globale Grenzen

- Keine neue npm-Abhängigkeit. `framer-motion` ist bereits in `package.json` vorhanden und darf ausschließlich für `AnimatedKpiValue` verwendet werden.
- Keine Änderung an Datenquellen, Live-KPI-Contract, Adapter, Subscription, Simulation, Domain-Daten oder Persistenz.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/**`, `src/features/resources/**`, `src/features/crm/**`, `src/components/layout/**` und `src/domain/**` bleiben gegenüber `98bb53a` exakt unverändert.
- Die 32 G21D–G21G-Zielseiten, `public/assets/auftrag-037[d-g]/**`, `docs/references/auftrag-037[d-g]/**` sowie ihre vier Bildklassen in `src/styles/global.css` bleiben exakt unverändert.
- Keine Animation darf `transform`, `opacity`, `filter`, Schatten, Rahmen oder Overlays auf ein direkt eingebundenes WebP anwenden.
- Kein Testmodus, keine Mock-Daten und keine neue Route im Produktionsbundle. Ein nicht konfigurierter Live-Feed zeigt weiterhin unverändert seinen ehrlichen Offline-Zustand.
- `Internal Resources` bleibt inhaltlich und strukturell eingefroren. Ein dynamischer Import seiner bestehenden Page-Komponente ist zulässig, weil er ihren Inhalt nicht verändert.

## Ziel-Dateien

| Datei | Verantwortung |
|---|---|
| `src/components/liveKpi/AnimatedKpiValue.tsx` | Neue, isolierte und zugängliche Darstellung eines bereits gelieferten numerischen KPI-Werts. |
| `src/components/liveKpi/LiveKpiCard.tsx` | Bindet `AnimatedKpiValue` ausschließlich im erfolgreichen Snapshot-Zweig ein; Hook, Status- und Fehlerlogik bleiben erhalten. |
| `src/styles/global.css` | Ausschließlich die Klassen `live-kpi-animated-value` und `live-kpi-visually-hidden`; keine Änderung bestehender G21-Klassen. |
| `src/app/routePages.tsx` | Ersetzt ausschließlich Page-Imports durch route-lokale `React.lazy`-Loader mit gleicher ID-/Komponenten-Zuordnung. |
| `src/app/App.tsx` | Umschließt die bereits gerenderte Page-Komponente mit `Suspense` und einem festen, zugänglichen Lade-Fallback ohne Animation. |
| `scripts/verifyMotionPerformance.ts` | Statischer Gate-Audit für Scope, Motion- und WebP-Schutz. |
| `scripts/measureAuftrag038Performance.mjs` | CDP-basierte Messung der definierten Budgets auf dem Produktions-Build. |
| `scripts/captureAuftrag038GateScreenshots.mjs` | Screenshots für die drei Messrouten sowie Reduced-Motion- und Overflow-Prüfung. |
| `docs/performance/auftrag-038/README.md` | Budgets, Messmethode und Vorher-/Nachher-Ergebnisse. |
| `docs/screenshots/auftrag-038/README.md` | Screenshot-Matrix, Hashes und Overflow-Nachweis. |
| `docs/BUILD_LOG.md` | Builder-Bericht; erst nach vollständig grüner Verifikation ergänzen. |

Andere Dateien sind nicht erlaubt. Insbesondere werden keine Page-Komponenten, Originalbilder oder G21-Audits verändert.

## Umsetzung

### 1. `AnimatedKpiValue`

- Props sind exakt:

  ```ts
  interface AnimatedKpiValueProps {
    value: number;
    unit?: string;
    fallbackUnit?: string;
    shouldAnimate: boolean;
  }
  ```

- Die sichtbare Zahl verwendet weiterhin `value.toLocaleString('de-DE')` plus bestehende Unit-/Fallback-Unit-Regel aus `LiveKpiCard`.
- Bei erstem Render, `shouldAnimate === false`, ungültigem Wert oder `useReducedMotion() === true` wird sofort der finale, formatierte Wert dargestellt. Es gibt in diesem Fall keinen Motion-Node, keinen Timer und keine Zwischenwerte.
- Bei einer echten Änderung animiert der Wert in höchstens **220 ms** linear vom zuletzt bestätigten Zahlenwert zum neuen Wert. Rundung erfolgt nur für die sichtbaren Zwischenwerte; der letzte gerenderte Frame entspricht immer exakt `value`.
- Die Komponente hält den finalen Text in einem `aria-live="polite" aria-atomic="true"`-Bereich synchron bereit. Zwischenwerte sind für Screenreader verborgen; ein Screenreader erhält ausschließlich den neuen Endwert samt Unit.
- Sie erzeugt keine Änderung an Höhe, Padding, Border oder Card-Layout. `font-variant-numeric: tabular-nums` ist erlaubt.

### 2. `LiveKpiCard` bleibt fachlich identisch

- `React.memo`, `useLiveKpi(kpiId)`, alle sechs Statuszustände, Fehlertexte, Qualitätskennzeichnung, Quellen- und Zeitstempeltext bleiben unverändert.
- Ein `useRef<number | null>` ermittelt, ob es vor dem aktuellen `snapshot.value` bereits einen erfolgreich gerenderten Wert gab. Nur dann wird `shouldAnimate` bei Status `live` gesetzt.
- Bei KPI-Wechsel, fehlendem Snapshot, Offline-, Lade-, Fehler- oder unkonfiguriertem Zustand wird der Merker zurückgesetzt. Ein alter Wert darf nie in eine andere KPI hineinanimiert werden.
- Weder `useLiveKpi.ts` noch die Services/Contracts werden verändert. Der Realtime-Update bleibt auf diese Karte begrenzt.

### 3. Route-Lazy-Loading ohne sichtbare WebP-Veränderung

- `routePages.tsx` ersetzt jeden statischen Page-Import durch `React.lazy(() => import(...))`. Die 41 IDs, Pfade, Titel, Reihenfolge und die `ROUTE_PAGES`-API bleiben unverändert.
- `App.tsx` verwendet pro Route einen `React.Suspense`-Fallback mit `role="status"`, Text `Ansicht wird geladen …` und `aria-live="polite"`. Der Fallback ist statisch: keine Transition, kein Spinner, keine Layout-Verschiebung der App-Schale.
- Eine erfolgreich geladene Route rendert dieselbe Page-Komponente wie vor G22. Besonders G21D–G21G müssen danach weiterhin genau ein vorhandenes `<img>` mit denselben Attributen ausgeben.

### 4. Budgets und Messung

`docs/performance/auftrag-038/README.md` definiert und `measureAuftrag038Performance.mjs` misst auf dem lokal erzeugten Produktions-Build:

| Szenario | Messpunkt | Budget |
|---|---|---|
| Initialer Load `/dashboard` | `navigation` bis `loadEventEnd` | höchstens 3.000 ms |
| Clientseitiger Wechsel `/dashboard` → `/company/profile` | Klick auf Sidebar-Link bis Zielroute, `main` und Zielbild sichtbar | höchstens 600 ms |
| Route mit Chart-Code `/dashboard` | Navigation bis erstes sichtbares SVG oder erklärter Empty-State | höchstens 800 ms |
| Live-KPI-Wertwechsel | Start bis finaler Endwert der Komponente | höchstens 220 ms; bei Reduced Motion 0 ms |

- Der CDP-Harness verwendet einen freien Preview-Port, ein isoliertes Chrome-Profil, prüft je Route `scrollWidth === clientWidth` und beendet Preview/Chrome kontrolliert.
- Bei `prefers-reduced-motion: reduce` verifiziert er per CDP `matchMedia`, dass `AnimatedKpiValue` keinen Motion-Node hat und der Endwert ohne Verzögerung sichtbar ist. Diese Prüfung erfolgt ausschließlich über eine kontrollierte Komponentenprüfung bzw. vorhandenen Live-E2E-Feed; niemals über Produktion-Mockdaten.
- Der Produktions-Build darf keine G21-WebP-Datei in einem JavaScript-Chunk enthalten. Die Netzwerkmessung lädt `/dashboard`, `/company/profile` und `/resources/materials` einzeln und protokolliert angeforderte JS-/Bildressourcen.
- Falls eines der Budgets auf der lokalen, dokumentierten Messumgebung überschritten wird, ist das Gate rot. Die Ursache und eine reproduzierbare Messung gehören in den Build-Log; keine stillschweigende Budgeterhöhung.

## Vorher-/Nachher-Nachweis

Vor jeder Codeänderung ausführen:

```bash
node scripts/captureAuftrag038GateScreenshots.mjs --stage=vorher
node scripts/measureAuftrag038Performance.mjs --stage=vorher
```

Die Screenshot-Routen sind `/dashboard`, `/company/profile` und `/resources/materials`, jeweils bei 1440 × 900, 768 × 1024 und 375 × 812. Das Capture protokolliert:

- 0 px horizontalen Body-Overflow;
- korrekten Seitentitel und sichtbaren Hauptinhalt;
- unveränderte Bildattribute auf `/company/profile`;
- Reduced-Motion-Resultat für die Live-KPI-Komponente.

Die Matrix unterscheidet zwischen stabilen statischen Referenzrouten (Hash-Gleichheit ist dort ein erwünschter Schutznachweis) und dem kontrolliert ausgelösten Live-KPI-Zahlenwechsel (Start-/Endzustand müssen verschieden sein). Eine bloße zeit- oder zufallsbedingte Hash-Differenz ist kein Nachweis.

Nach der Umsetzung werden dieselben Befehle mit `--stage=nachher` ausgeführt. Dokumentiere die Messwerte und Hashes nachvollziehbar; keine Screenshots außerhalb `docs/screenshots/auftrag-038/` ändern oder löschen.

## Gate-Audit und Verifikation

`verifyMotionPerformance.ts` prüft mindestens:

1. `AnimatedKpiValue` importiert `framer-motion` und `useReducedMotion`, besitzt die vier beschriebenen Props und bietet bei Reduced Motion sowie beim Erstwert einen sofortigen Endwert.
2. `LiveKpiCard` bleibt memoisiert, importiert weiterhin ausschließlich `useLiveKpi` als Datenquelle und setzt die Animation nur für einen echten Live-Snapshotwechsel ein.
3. `routePages.tsx` enthält 41 eindeutige IDs und ausschließlich dynamische Page-Loader; `App.tsx` stellt für jede lazy Page `Suspense` mit zugänglichem statischem Fallback bereit.
4. G21D–G21G-Page-Dateien, ihre CSS-Klassen und alle Original-WebPs sind gegen `98bb53a` bitgenau bzw. diffgleich; keine G21-Asset-URL erscheint in JavaScript-Imports.
5. Keine Datei außerhalb der Ziel-Dateien wurde gegenüber der Baseline verändert; alle Schutzbereiche weisen exakt 0 Diff-Zeilen auf.

Alle Befehle müssen mit Exit 0 enden:

```bash
npx tsx scripts/verifyMotionPerformance.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
node scripts/measureAuftrag038Performance.mjs --stage=nachher
node scripts/captureAuftrag038GateScreenshots.mjs --stage=nachher
git diff --check 98bb53a..HEAD
git diff --exit-code 98bb53a..HEAD -- src/simulation src/types src/context src/services src/features/resources src/features/crm src/components/layout src/domain public/assets/auftrag-037d public/assets/auftrag-037e public/assets/auftrag-037f public/assets/auftrag-037g docs/references/auftrag-037d docs/references/auftrag-037e docs/references/auftrag-037f docs/references/auftrag-037g
```

## Akzeptanzkriterien für Codex

- Count-up erklärt ausschließlich einen neuen Live-Wert, startet nicht beim Erstwert und endet exakt beim gelieferten Wert.
- `prefers-reduced-motion` zeigt ohne Übergang sofort den neuen Endwert und erzeugt keine versteckte Daueranimation.
- Die Live-KPI bleibt vollständig von Simulation, Datenvertrag und übrigen Seiten re-render-seitig getrennt.
- Route-Module und damit Chart-Code werden nicht mehr vorab geladen; Ladefallback, Routing, Reload, Browser-Historie und 404 bleiben funktional.
- G21D–G21G, Internal Resources und alle Schutzbereiche sind vollständig unverändert.
- Budgets, Messwerte, Screenshot-/Hash-Matrix und unabhängiger Review-Befund sind im Repository dokumentiert; erst dann kann G23 starten.
