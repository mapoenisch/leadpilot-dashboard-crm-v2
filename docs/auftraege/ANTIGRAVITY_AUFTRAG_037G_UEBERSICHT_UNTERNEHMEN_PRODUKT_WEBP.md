# AUFTRAG 037G / Gate G21G — Übersicht, Unternehmen und Produkt: direkte WebP-Ansichten

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `22ae40d`
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel und verbindliche Entscheidung

Bearbeite ausschließlich diese zehn Routen:

| Bereich | Route | Zielseite | Direkt-Asset | Test-ID |
|---|---|---|---|---|
| Übersicht | `/company/profile` | `CompanyProfilePage.tsx` | `/assets/auftrag-037g/01-unternehmenssteckbrief.webp` | `overview-profile-webp` |
| Übersicht | `/company/highlights` | `YearHighlightsPage.tsx` | `/assets/auftrag-037g/02-jahres-highlights-2025.webp` | `overview-highlights-webp` |
| Übersicht | `/company/data-basis` | `DataBasisPage.tsx` | `/assets/auftrag-037g/03-datenbasis-konsistenz.webp` | `overview-data-basis-webp` |
| Unternehmen | `/company/idea` | `IdeaPage.tsx` | `/assets/auftrag-037g/04-geschaeftsidee.webp` | `company-idea-webp` |
| Unternehmen | `/company/value-proposition` | `ValuePropositionPage.tsx` | `/assets/auftrag-037g/05-value-proposition.webp` | `company-value-proposition-webp` |
| Unternehmen | `/company/history` | `HistoryPage.tsx` | `/assets/auftrag-037g/06-gruendung-entwicklung.webp` | `company-history-webp` |
| Produkt | `/product/features` | `FeaturesPage.tsx` | `/assets/auftrag-037g/07-produkt-funktionsweise.webp` | `product-features-webp` |
| Produkt | `/product/pricing` | `PricingPage.tsx` | `/assets/auftrag-037g/08-preismodell.webp` | `product-pricing-webp` |
| Produkt | `/product/performance` | `PerformancePage.tsx` | `/assets/auftrag-037g/09-produkt-performance-2025.webp` | `product-performance-webp` |
| Produkt | `/product/roadmap` | `RoadmapPage.tsx` | `/assets/auftrag-037g/10-releases-roadmap.webp` | `product-roadmap-webp` |

Die zehn bereitgestellten WebPs sind **direkte, autorisierte Seiteninhalte**, nicht Stilreferenzen. Jede Zielroute verwendet ausschließlich das zugeordnete Original als sichtbaren Hauptinhalt: keine CSS-/JSX-Nachzeichnung, keine Stilinterpretation, keine zweite Fachansicht.

Sidebar und globale Simulationssteuerungsleiste bleiben unverändert. **`/company/location` (Sitz & Räumlichkeiten) bleibt exakt unangetastet.**

## Verbindlicher Ablauf

1. Lies `CLAUDE.md`, diese Spezifikation sowie die G21B-/G21C-Einträge in `docs/BUILD_LOG.md` vollständig. Öffne danach alle zehn Originale unter `docs/references/auftrag-037g/` visuell.
2. Erstelle `scripts/captureAuftrag037gGateScreenshots.mjs`. Erfasse **vor jeder Code-Änderung** die zehn Routen mit `--stage=vorher` bei 1440px, 768px und 375px sowie je einen fokussierten Desktop-Ausschnitt.
3. Ersetze auf den zehn genannten Zielseiten den bisherigen sichtbaren Fachinhalt durch genau ein sichtbares `<img>` mit exakter Asset-URL, der zugeordneten Test-ID, `loading="eager"`, nichtleerem routenspezifischem Alt-Text und Klasse `auftrag-037g-webp-img`.
4. Ergänze in `src/styles/global.css` ausschließlich `.auftrag-037g-webp-view` und `.auftrag-037g-webp-img`: `display: block`, `width: 100%`, `max-width: 100%`, `height: auto` sowie bei Bedarf `margin: 0` und `padding: 0` auf dem Wrapper.

## Unveränderbarkeit und Responsivität

- Zulässig ist nur die proportionale Größenanpassung über die verfügbare Content-Breite. Kein fixes Seitenverhältnis, kein Zuschnitt, kein `object-fit: cover`, kein horizontaler Scrollbereich.
- Strikt verboten: `filter`, `opacity`, `mix-blend-mode`, Masken, `clip-path`, Overlays, zusätzliche Farbflächen, Glow, Rahmen, Schatten, `border-radius` sowie Text- oder Logo-Überlagerungen auf den Bildpixeln.
- Bei 1440px, 768px und 375px müssen die Originale vollständig, proportional und ohne Überdeckung durch App-Chrome erscheinen. Kein Mobile-Ersatzbild und keine CSS-Rekonstruktion.
- Die Originalbilder enthalten bewusst Text, Zahlen, Logos und UI-Elemente. Die Regel für textfreie Dekorationsassets gilt deshalb hier nicht.
- Der Alt-Text benennt die jeweilige Ansicht knapp. Der eingebettete Bildtext wird nicht semantisch nachgebaut; das ist eine bekannte, akzeptierte Konsequenz der verbindlichen Vorgabe zur unveränderten Direktbild-Verwendung.

## Daten- und Bereichsschutz

- Keine Änderung an Geschäftslogik, Simulation, Routing, Navigation oder Domänenstammdaten. `src/domain/execData.ts`, `src/domain/unternehmenData.ts` und `src/domain/produktData.ts` bleiben unverändert und werden nicht von den zehn Zielseiten importiert.
- **Sitz & Räumlichkeiten ist eingefroren:** keine Änderung an `/company/location`, `src/features/unternehmen/pages/LocationPage.tsx`, den zugehörigen Standort-Komponenten oder Standort-Assets. Die neue G21G-CSS-Klasse darf keine vorhandene Standort-Klasse überschreiben.
- Nicht anfassen: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`, `src/features/resources/**`, `src/features/crm/**`, `src/components/layout/**`, `src/app/**`, `src/domain/executiveCockpitData.ts` sowie sämtliche G21D–G21F-Zielansichten.
- **Internal Resources bleibt ausnahmslos eingefroren:** keine Änderung an `/resources/materials`, `src/features/resources/**`, Resource-Assets oder der Ressourcenansicht.
- Keine neuen npm-Abhängigkeiten.

## Ausschließlich erlaubte Ziel-Dateien

| Datei oder Pfad | Zulässige Änderung |
|---|---|
| `src/features/overview/pages/CompanyProfilePage.tsx` | Direktbild Unternehmenssteckbrief. |
| `src/features/overview/pages/YearHighlightsPage.tsx` | Direktbild Jahres-Highlights. |
| `src/features/overview/pages/DataBasisPage.tsx` | Direktbild Datenbasis. |
| `src/features/unternehmen/pages/IdeaPage.tsx` | Direktbild Geschäftsidee. |
| `src/features/unternehmen/pages/ValuePropositionPage.tsx` | Direktbild Value Proposition. |
| `src/features/unternehmen/pages/HistoryPage.tsx` | Direktbild Gründung & Entwicklung. |
| `src/features/produkt/pages/FeaturesPage.tsx` | Direktbild Produkt & Funktionsweise. |
| `src/features/produkt/pages/PricingPage.tsx` | Direktbild Pakete & Preismodell. |
| `src/features/produkt/pages/PerformancePage.tsx` | Direktbild Produkt-Performance. |
| `src/features/produkt/pages/RoadmapPage.tsx` | Direktbild Releases & Roadmap. |
| `src/styles/global.css` | Ausschließlich die gemeinsamen, nicht-pixelverändernden G21G-Klassen. |
| `scripts/verifyOverviewCompanyProductWebpViews.ts` | Neuer Gate-Audit. |
| `scripts/captureAuftrag037gGateScreenshots.mjs` | Vorher-/Nachher-Captures. |
| `scripts/generateAuftrag037gScreenshotMatrix.mjs` | Screenshot-Matrix erzeugen. |
| `docs/screenshots/auftrag-037g/README.md` | Matrix und Overflow-Nachweis. |
| `docs/BUILD_LOG.md` | Builder-Bericht nach erfolgreicher Umsetzung. |

`public/assets/auftrag-037g/` und `docs/references/auftrag-037g/` sind bereitgestellt. Diese Dateien nicht löschen, umbenennen, konvertieren, komprimieren oder überschreiben.

## Gate-Audit und Verifikation

Erstelle `scripts/verifyOverviewCompanyProductWebpViews.ts`. Der Audit prüft mindestens:

1. Alle zehn WebPs existieren in beiden G21G-Asset-Ordnern; ihre SHA-256-Werte entsprechen `public/assets/auftrag-037g/ASSET_SOURCE.md` und jede öffentliche Datei ist bitidentisch zur Referenzkopie.
2. Jede Zielseite enthält ihre exakte öffentliche Asset-URL, ein sichtbares `<img>`, zugeordnete Test-ID, `loading="eager"`, nichtleeren Alt-Text sowie die Pflicht `height: auto`.
3. Kein Zielbild oder G21G-CSS verwendet zugeschnittene, gefilterte oder überlagerte Bilddarstellung; insbesondere sind `object-fit: cover`, `aspect-ratio`, Filter, Opazität, Masken, Clip-Paths, Schatten und Border-Radius verboten.
4. Keine Zielseite importiert `supabaseClient`, fachliche Domänendaten oder Altdarstellungs-Komponenten.
5. Gegen `22ae40d` haben `src/domain/execData.ts`, `src/domain/unternehmenData.ts`, `src/domain/produktData.ts`, `src/features/unternehmen/pages/LocationPage.tsx` und sämtliche Schutzbereiche exakt 0 Diff-Zeilen.

Führe anschließend `npx tsx scripts/verifyOverviewCompanyProductWebpViews.ts`, `npx tsc --noEmit`, `npm run verify`, `npx tsx scripts/testButtonLoading.ts`, `npx tsx scripts/verifyNoModuleViewCascades.ts`, `npm run build`, `git diff --check 22ae40d..HEAD` und folgenden Schutzbereichs-Diff aus:

```bash
git diff --exit-code 22ae40d..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/components/layout src/app src/domain/execData.ts src/domain/unternehmenData.ts src/domain/produktData.ts src/domain/executiveCockpitData.ts src/features/unternehmen/pages/LocationPage.tsx
```

Danach `node scripts/captureAuftrag037gGateScreenshots.mjs --stage=vorher`, `node scripts/captureAuftrag037gGateScreenshots.mjs --stage=nachher` und `node scripts/generateAuftrag037gScreenshotMatrix.mjs` ausführen.

Der Harness weist bei jeder Route und jedem Viewport **0px horizontalen Overflow** nach. Die Matrix dokumentiert 30/30 Vollseiten-Paare und 10/10 fokussierte Desktop-Ausschnitte als `DISTINCT`. Ergänze danach den Builder-Bericht in `docs/BUILD_LOG.md`, committe nur erlaubte Dateien, pushe nicht und übergib Codex Commit-ID, Branch, Baseline, Dateiliste und vollständige Gate-Ergebnisse.

## Akzeptanzkriterien für Codex

- Alle zehn Routen zeigen das richtige, unveränderte Original-WebP als vollständigen Content.
- Keine Nachzeichnung und keine zusätzliche konkurrierende Datenansicht.
- Alle Originale sind bytegenau zur Prüfvorlage.
- 1440px, 768px und 375px: vollständig sichtbar, proportional und 0px horizontaler Overflow.
- „Sitz & Räumlichkeiten“, Internal Resources, Routing, Navigation, Daten- und Simulationsschutzbereiche sind unverändert.
- Alle Gates grün; finale Freigabe erst nach unabhängiger Codex-Prüfung.
