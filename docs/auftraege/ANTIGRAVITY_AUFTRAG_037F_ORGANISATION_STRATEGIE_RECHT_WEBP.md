# AUFTRAG 037F / Gate G21F — Organisation, Strategie und Recht: direkte WebP-Ansichten

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `e789de9`
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel und verbindliche Entscheidung

Bearbeite ausschließlich diese neun Routen:

| Bereich | Route | Zielseite | Direkt-Asset | Test-ID |
|---|---|---|---|---|
| Organisation & Team | `/organisation/headcount` | `HeadcountPage.tsx` | `/assets/auftrag-037f/01-headcount-entwicklung.webp` | `organisation-headcount-webp` |
| Organisation & Team | `/organisation/hr` | `HrPage.tsx` | `/assets/auftrag-037f/02-hr-kennzahlen.webp` | `organisation-hr-webp` |
| Organisation & Team | `/organisation/team` | `TeamStructurePage.tsx` | `/assets/auftrag-037f/03-teamstruktur-engpaesse.webp` | `organisation-team-webp` |
| Strategie 2026+ | `/strategy/okrs` | `OkrsPage.tsx` | `/assets/auftrag-037f/04-ziele-okrs.webp` | `strategy-okrs-webp` |
| Strategie 2026+ | `/strategy/balanced-scorecard` | `BalancedScorecardPage.tsx` | `/assets/auftrag-037f/05-balanced-scorecard.webp` | `strategy-bsc-webp` |
| Strategie 2026+ | `/strategy/growth-drivers` | `GrowthDriversPage.tsx` | `/assets/auftrag-037f/06-wachstumstreiber.webp` | `strategy-growth-webp` |
| Recht & Gründung | `/legal/articles` | `ArticlesPage.tsx` | `/assets/auftrag-037f/07-satzung-leadpilot.webp` | `legal-articles-webp` |
| Recht & Gründung | `/legal/shareholders` | `ShareholdersPage.tsx` | `/assets/auftrag-037f/08-gesellschafterliste.webp` | `legal-shareholders-webp` |
| Recht & Gründung | `/legal/commercial-register` | `CommercialRegisterPage.tsx` | `/assets/auftrag-037f/09-handelsregister.webp` | `legal-register-webp` |

Die neun WebPs sind **direkte, autorisierte Seiteninhalte**, keine Stilreferenzen. Pro Route wird ausschließlich die zugeordnete Originaldatei als sichtbarer Hauptinhalt verwendet: keine CSS-/JSX-Nachzeichnung, keine Stilinterpretation und keine zweite Fachansicht. Das mitgelieferte WebP für **Wachstumstreiber** wird ohne alternative Neugestaltung direkt übernommen.

Sidebar und globale Simulationssteuerungsleiste bleiben unverändert. **Internal Resources — Originalmaterialien & Decks bleibt exakt wie es ist.**

## Verbindlicher Ablauf

1. Lies `CLAUDE.md`, diese Spezifikation sowie die G21D-/G21E-Einträge in `docs/BUILD_LOG.md` vollständig. Öffne danach alle neun Originale unter `docs/references/auftrag-037f/` visuell.
2. Erstelle `scripts/captureAuftrag037fGateScreenshots.mjs` und erfasse vor jeder Code-Änderung alle neun Routen mit `--stage=vorher` bei 1440px, 768px und 375px sowie je einen Fokus-Ausschnitt auf Desktop.
3. Ersetze auf den neun genannten Zielseiten den bisherigen sichtbaren Fachinhalt (Header, Tabellen, Karten, Charts, Badges und Hinweise) durch genau ein sichtbares `<img>`: exakte öffentliche Asset-URL, zugeordnete Test-ID, `loading="eager"`, nichtleerer routenspezifischer Alt-Text und Klasse `auftrag-037f-webp-img`.
4. Ergänze in `src/styles/global.css` ausschließlich die gemeinsamen Klassen `.auftrag-037f-webp-view` und `.auftrag-037f-webp-img` mit `display: block`, `width: 100%`, `max-width: 100%`, `height: auto` sowie bei Bedarf `margin: 0` und `padding: 0` auf dem Wrapper.

## Unveränderbarkeit und Responsivität

- Zulässig ist ausschließlich proportionale Größenanpassung über die Content-Breite. Kein festes Seitenverhältnis, kein Zuschnitt, kein `object-fit: cover`, kein horizontaler Scrollbereich.
- Strikt verboten: `filter`, `opacity`, `mix-blend-mode`, Masken, `clip-path`, Overlays, zusätzliche Farbflächen, Glow, Rahmen, Schatten, `border-radius` sowie Text- oder Logo-Überlagerungen auf Bildpixeln.
- Bei 1440px, 768px und 375px müssen die Originale vollständig, proportional und ohne Überdeckung durch die App-Chrome erscheinen. Kein Mobile-Ersatzbild und keine CSS-Rekonstruktion.
- Die Bilder enthalten bewusst Text, Zahlen, Logos und UI-Elemente; die Regel für textfreie Dekorationsassets gilt für diese direkten Inhaltsbilder nicht.

## Daten- und Bereichsschutz

- Keine Änderung an Geschäftslogik, Simulation, Routing, Navigation oder Stammdaten. `src/domain/organisationData.ts`, `src/domain/strategieData.ts` und `src/domain/rechtData.ts` bleiben unverändert und werden nicht von den Zielseiten importiert.
- Nicht anfassen: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`, `src/features/resources/**`, `src/features/crm/**`, `src/components/layout/**`, `src/app/**`, `src/domain/executiveCockpitData.ts` sowie alle G21B–G21E-Zielansichten.
- **Internal Resources ist ausnahmslos eingefroren:** keine Änderung an `/resources/materials`, `src/features/resources/**`, Resource-Assets oder Ressourcenansicht.
- Keine neuen npm-Abhängigkeiten.

## Ausschließlich erlaubte Dateien

| Datei oder Pfad | Zulässige Änderung |
|---|---|
| Die neun oben genannten Page-Komponenten | Jeweilige Direktbild-Integration. |
| `src/styles/global.css` | Ausschließlich gemeinsame, nicht-pixelverändernde G21F-Klassen. |
| `scripts/verifyOrganisationStrategyLegalWebpViews.ts` | Gate-Audit. |
| `scripts/captureAuftrag037fGateScreenshots.mjs` | Vorher-/Nachher-Captures. |
| `scripts/generateAuftrag037fScreenshotMatrix.mjs` | Matrix erzeugen. |
| `docs/screenshots/auftrag-037f/README.md` | Matrix und Overflow-Nachweis. |
| `docs/BUILD_LOG.md` | Builder-Bericht. |

`public/assets/auftrag-037f/` und `docs/references/auftrag-037f/` sind bereitgestellt. Sie dürfen nicht gelöscht, umbenannt, konvertiert, komprimiert oder überschrieben werden.

## Gate-Audit und Übergabe

Erstelle `scripts/verifyOrganisationStrategyLegalWebpViews.ts`. Es prüft mindestens: Asset-Existenz beider Ordner, SHA-256 gegen `public/assets/auftrag-037f/ASSET_SOURCE.md`, Bitidentität, exakte URL/Test-ID/`<img>`/`loading="eager"`/Alt-Text, Pflicht `height: auto`, Ausschluss aller verbotenen Bild-Properties, fehlende `supabaseClient`- und Domänenimports sowie exakt 0 Diff-Zeilen gegen `e789de9` in `organisationData.ts`, `strategieData.ts`, `rechtData.ts` und allen Schutzbereichen einschließlich `src/features/resources/**`.

Führe anschließend aus: `npx tsx scripts/verifyOrganisationStrategyLegalWebpViews.ts`, `npx tsc --noEmit`, `npm run verify`, `npx tsx scripts/testButtonLoading.ts`, `npx tsx scripts/verifyNoModuleViewCascades.ts`, `npm run build`, `git diff --check e789de9..HEAD`, den Schutzbereichs-Diff gegen `e789de9`, Nachher-Capture und Matrix-Generator.

Der Harness weist bei jeder Route und jedem Viewport **0px horizontalen Overflow** nach. Die Matrix dokumentiert 27/27 Vollseiten-Paare und 9/9 Fokuspaare als `DISTINCT`. Ergänze danach den Builder-Bericht in `docs/BUILD_LOG.md`, committe nur erlaubte Dateien, pushe nicht und übergib Codex Commit-ID, Branch, Baseline, Dateiliste und vollständige Gate-Ergebnisse.
