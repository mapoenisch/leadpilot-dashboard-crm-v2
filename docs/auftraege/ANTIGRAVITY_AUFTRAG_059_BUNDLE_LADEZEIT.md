# AUFTRAG 059 / Gate G41 — Bundle & Ladezeit

**Builder:** Antigravity
**Prüfung:** Codex / Claude Code
**Baseline:** `3da1334` (Gate G40 freigegeben, Auftrag 058 abgeschlossen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G41 / 059 (Befund „MITTEL 6"
+ Web-Fonts; Definition-of-Done-Metriken #17–#20).

## Ziel

Ladezeit messbar verbessern: Bundle sinnvoll aufteilen, Web-Fonts
entblocken, die bereits vorhandenen `size-limit`-Budgets korrekt zum Laufen
bringen (sie messen aktuell nachweislich das Falsche), und die bisher
komplett unmessbaren Lighthouse-Metriken erstmals erfassen.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

Frischer `npm run build` + `npx size-limit` auf `3da1334`:

- **Größter Einzel-Chunk:** `vendor-*.js` = **863,42 KB roh / 240,03 KB
  gzip.** Der Plan nennt „798 KB" — das war der Stand vor G35–G40, seither
  gewachsen (mehr Code, mehr Abhängigkeiten). Nicht aus dem Plan
  übernehmen.
- **`size-limit` ist bereits konfiguriert** (`.size-limit.json`, zwei
  Budgets: „Initial JS bundle (gzip)" ≤ 180 KB, „Largest chunk (gzip)"
  ≤ 250 KB) **und läuft bereits als eigener CI-Job** (`.github/workflows/ci.yml:94`,
  `npx size-limit`). Trotzdem **misst die Konfiguration nachweislich das
  Falsche**:
  - „Largest chunk"-Budget nutzt den Glob `dist/assets/*.js`. `@size-limit/file`
    summiert bei einem Mehrfach-Match **alle** passenden Dateien statt nur
    die größte — gemessen wurden **435,5 KB** (Summe vieler Chunks), nicht
    die 240,03 KB des tatsächlich größten Einzelchunks. **Der CI-Job ist
    aktuell rot** (`npx size-limit` schlägt lokal mit „exceeded by 185.5 kB"
    fehl) — unabhängig vom Rendering-Optimierungs-Fortschritt aus G40.
  - „Initial JS bundle"-Budget nutzt den Glob `dist/assets/index-*.js` und
    trifft nur den Einstiegs-Chunk (27,88 KB gzip) — die synchron mit
    geladenen `react-vendor` (45,61 KB gzip) und `vendor` (240,03 KB gzip)
    fehlen komplett. Das reale Initial-Payload liegt bei **≈ 313,5 KB gzip**
    (27,9 + 45,6 + 240,0), nicht bei den gemeldeten 27,88 KB — das deckt
    sich mit der Plan-Schätzung „~308 KB" (Metrik #18), die also uneinsehbar
    zufällig richtig war, während das Budget selbst sie nicht prüft.
  - **Beide Budgets sind aktuell wirkungslos als Regressionsschutz**, weil
    sie nicht das messen, was ihr Name behauptet.
- **`manualChunks`** (`vite.config.ts:20`) unterscheidet nur „React-Familie"
  vs. „alles andere aus `node_modules`" in einem einzigen `vendor`-Bucket.
  Darin unter anderem (Größe = `node_modules`, roh, zur Einordnung, nicht
  Bundle-Anteil): `@supabase/supabase-js` (8,6 MB, eager importiert über
  `src/services/db/supabaseClient.ts`, das wiederum von `LeadsPage.tsx`,
  `crmRepository.ts`, `liveKpiReadAdapter.ts`, `crmSeeder.ts` referenziert
  wird), `recharts` (5,2 MB, 4 Verwendungsstellen), `framer-motion` (3,8 MB,
  5 Verwendungsstellen), `@radix-ui/*` (1,9 MB), `zustand` (256 KB, klein).
  Diese undifferenzierte Bündelung ist die Hauptursache für den großen
  `vendor`-Chunk.
- **Web-Fonts:** `src/styles/global.css:1` lädt Google Fonts per
  `@import url(...)` — das ist render-blocking. `font-display: swap` ist
  zwar in der URL gesetzt, verhindert aber nicht das Blockieren durch das
  `@import` selbst. Kein `<link rel="preconnect">` in `index.html`.
- **Baseline-JSON-Dateien** liegen unter `src/services/data/baselines/**` —
  das ist **Schutzbereich** (DataSource-Abstraktion). Der Plan-Wortlaut
  „Baseline-JSON nach `public/`" würde zwingend die Lade-Mechanik dieser
  Dateien anfassen (von synchronem JS-Import auf Laufzeit-`fetch`
  umstellen) — kein reines Asset-Verschieben, sondern ein Eingriff in
  Reproduzierbarkeits-/Ladeverhalten der Datenschicht. **Siehe Entscheidung 1.**
- **Lighthouse CI ist nirgends eingerichtet** (kein `lighthouserc`, kein
  CI-Step) — Metriken #19 (Performance ≥ 90) und #20 (Accessibility ≥ 95)
  sind laut Definition-of-Done-Tabelle „ungemessen". Der CI-Pipeline-Entwurf
  im Plan (`docs/BUILD_PLAN_V2.2.0.md`, Abschnitt „CI-Pipeline") sieht
  Lighthouse explizit im `e2e`-Job vor („Playwright: Screenshots + axe +
  Lighthouse"). `axe` ist über `e2e/a11y.spec.ts` bereits etabliert,
  Lighthouse fehlt komplett.

## Verbindliche Entscheidungen

1. **„Baseline-JSON nach `public/`" wird aus diesem Auftrag ausgenommen.**
   Begründung: Der Schritt würde `src/services/data/**` anfassen
   (Schutzbereich, DataSource-/Reproduzierbarkeits-Logik) — dafür gibt es
   keinen dedizierten Auftrag, der diesen Pfad explizit als Ziel nennt.
   Bleibt offener Punkt für einen künftigen, eigens dafür geschriebenen
   Auftrag mit expliziter Schutzbereich-Freigabe. Im Bericht diese Auslassung
   ausdrücklich begründen, nicht stillschweigend weglassen.
2. **`size-limit`-Konfiguration zuerst reparieren, bevor über neue Zahlen
   berichtet wird.** Beide Budgets so umbauen, dass sie tatsächlich messen,
   was ihr Name behauptet — z. B. „Largest chunk" über ein Glob-Muster oder
   eine Prüfmethode, die nachweislich nur die größte Einzeldatei bewertet
   (nicht die Summe aller Treffer), „Initial JS bundle" über die Summe der
   beim ersten Seitenaufruf synchron geladenen Chunks (Einstiegs-Chunk +
   alle vom Entry-Point synchron importierten Vendor-Chunks). Vor jeder
   Optimierung: Vorher-Messung mit der reparierten Konfiguration im Bericht
   dokumentieren — sonst ist jede „Verbesserung" nicht überprüfbar (analog
   zur Beweispflicht aus G39/G40).
3. **`manualChunks` nach tatsächlicher Nutzung aufteilen, nicht pauschal.**
   Mindestens die identifizierten schweren, nicht überall benötigten Pakete
   (`@supabase/supabase-js`, `recharts`, `framer-motion`) in eigene Chunks
   auslagern, damit sie nur dort geladen werden, wo sie gebraucht werden.
   Ziel: kein einzelner Chunk (gzip, nach Reparatur aus Entscheidung 2)
   überschreitet sein Budget. Reine Bündelungs-Umstellung — keine
   Funktions- oder Verhaltensänderung der App.
4. **Web-Fonts entblocken:** `@import` aus `global.css` entfernen,
   stattdessen `<link rel="preconnect" href="https://fonts.googleapis.com">`
   + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
   und asynchrones Laden des Stylesheets in `index.html` (z. B. das
   `media="print" onload="this.media='all'"`-Muster oder ein
   `<link rel="preload" as="style">` mit nachgeschaltetem Stylesheet-Link).
   `font-display: swap` bleibt erhalten. **Kein Self-Hosting der Fonts** —
   das wäre ein größerer, hier nicht verlangter Eingriff.
5. **Lighthouse CI einrichten**, weil G41 („Bundle & Ladezeit") der
   sachlich richtige Ort für die bislang komplett unmessbaren Metriken #19
   und #20 ist und sie sonst bis zum Release-Audit (G43) unüberprüft
   blieben. Umfang: ein etabliertes Lighthouse-CI-Werkzeug (z. B. `@lhci/cli`)
   als neuer Schritt im `e2e`-Job gegen den Preview-Build, mit den
   DoD-Schwellen (Performance ≥ 90, Accessibility ≥ 95) als Assertion.
   **Falls die Schwellen beim ersten Lauf nicht erreicht werden, ist das
   ein valides Zwischenergebnis** — im Bericht mit dem echten gemessenen
   Score dokumentieren, nicht das Gate künstlich weich einstellen, um grün
   zu erscheinen. Ein nicht erreichter Schwellenwert ist dann ein offener
   Punkt für G43, kein Blocker für diesen Auftrag.
6. **Kein neues Business-Feature, keine Verhaltensänderung der App aus
   Nutzersicht.** Einzige neue erlaubte Abhängigkeit: das Lighthouse-CI-Tool
   aus Entscheidung 5, ausschließlich als Dev-/CI-Abhängigkeit.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- `src/services/data/**` bleibt in diesem Auftrag unangetastet (Entscheidung 1) —
  **zusätzlich** zu den ohnehin dauerhaft geltenden Schutzbereichen.
- `git diff 3da1334 -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — `size-limit` reparieren (Vorher-Messung korrekt herstellen)

- [ ] Beide Budgets in `.size-limit.json` so umbauen, dass sie tatsächlich
      den größten Einzelchunk bzw. das reale Initial-Payload messen
      (Entscheidung 2).
- [ ] Mit der reparierten Konfiguration eine Vorher-Messung auf dem
      unveränderten `vite.config.ts` ziehen und im Bericht festhalten —
      das ist die Referenz für Block C.

### Block B — Web-Fonts entblocken

- [ ] `@import` aus `src/styles/global.css` entfernen, `preconnect` +
      asynchrones Stylesheet-Laden in `index.html` einbauen (Entscheidung 4).
- [ ] Screenshot-Nachweis, dass sich am gerenderten Ergebnis nichts ändert
      (Font bleibt identisch, nur die Ladeart ändert sich).

### Block C — `manualChunks` verfeinern

- [ ] `vite.config.ts`: `@supabase/supabase-js`, `recharts`, `framer-motion`
      (mindestens diese drei) in eigene Chunks auslagern (Entscheidung 3).
- [ ] Nachher-Messung mit der reparierten `size-limit`-Konfiguration aus
      Block A, Vergleich gegen die Vorher-Zahl im Bericht.

### Block D — Lighthouse CI + Abschluss

- [ ] Lighthouse-CI-Tool einrichten, neuer CI-Schritt im `e2e`-Job
      (Entscheidung 5), Schwellen aus der DoD-Tabelle als Assertion.
- [ ] Ersten echten Lighthouse-Lauf im Bericht dokumentieren (Performance-
      und Accessibility-Score), unabhängig davon, ob die Schwelle erreicht
      wird.
- [ ] Gate-G41-Bilanz im Bericht: alte vs. neue Zahlen für Metriken #17/#18
      (mit der reparierten Messmethode), erster Lighthouse-Score für #19/#20,
      ausdrückliche Begründung, warum Baseline-JSON-Migration nicht Teil
      dieses Auftrags ist (Entscheidung 1).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `npm test`,
      `npm run build`, `npx playwright test`, `npx size-limit` grün.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `.size-limit.json` | A |
| `src/styles/global.css`, `index.html` | B |
| `vite.config.ts` | C |
| `package.json`, `package-lock.json` (nur Lighthouse-CI-Tool aus Entscheidung 5) | D |
| `.github/workflows/ci.yml` (neuer Lighthouse-Schritt, `size-limit`-Ratschen) | D |
| Neue Konfigurationsdatei für Lighthouse CI (z. B. `.lighthouserc.json`) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere nichts in
`src/services/data/**` (in diesem Auftrag bewusst ausgenommen, Entscheidung 1),
nichts in `src/simulation/**`, nichts in `src/features/resources/**`.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
npx size-limit   # beide Budgets grün, mit der reparierten Messmethode aus Entscheidung 2
git diff 3da1334 -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Nachweis für Block B (Web-Fonts) analog G39/G40-Methodik: nie
PNGs in den eigenen Kontext laden, `shasum -a 256`-Vergleich, Pixel-Diff nur
bei Abweichung. Matrix unter `docs/screenshots/auftrag-059/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G41 – Auftrag 059 (Abschluss)"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, die reparierte
`size-limit`-Methodik mit Vorher/Nachher-Zahlen, welche Pakete in eigene
Chunks ausgelagert wurden und warum, der erste echte Lighthouse-Score
(Performance/Accessibility) mit Interpretation, Screenshot-Nachweis für die
Web-Font-Änderung, Command-Matrix, und die ausdrückliche Begründung für die
Auslassung der Baseline-JSON-Migration (Entscheidung 1).

## Akzeptanzkriterien für die Prüfung

- `size-limit`-Budgets messen nachweislich den größten Einzelchunk bzw. das
  reale Initial-Payload — nicht mehr die Summe beliebiger Glob-Treffer.
- `npx size-limit` grün, mit echten Vorher/Nachher-Zahlen im Bericht.
- `manualChunks` verfeinert, mindestens die 3 genannten Pakete ausgelagert,
  keine Funktionsänderung.
- Web-Fonts nicht mehr render-blockend, Screenshot-Nachweis ohne visuelle
  Abweichung.
- Lighthouse CI läuft im `e2e`-Job, erster echter Score dokumentiert —
  unabhängig davon, ob die Zielschwelle schon erreicht wird.
- `src/services/data/**` (und alle übrigen Schutzbereiche) unangetastet,
  Diff leer.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, keine Ratsche
  erhöht.
- Kein neues Business-Feature; einzige neue Abhängigkeit ist das
  Lighthouse-CI-Tool.
- Auslassung von „Baseline-JSON nach public/" nachvollziehbar begründet.

**Abnahme:** Erst nach unabhängigem Review ist Gate G41 abgeschlossen. Kein
Merge, Tag oder Push ohne ausdrückliche Freigabe.
