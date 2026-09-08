# AUFTRAG 037D / Gate G21D — Markt & Wettbewerb sowie Kunden & ICP: direkte WebP-Ansichten

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `ea22bf6`
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel und verbindliche Entscheidung

Bearbeite ausschließlich diese sieben Routen:

| Bereich | Route | Verbindlicher Direkt-Asset | Test-ID |
|---|---|---|---|
| Markt & Wettbewerb | `/market/overview` | `/assets/auftrag-037d/01-marktlage-dach.webp` | `market-dach-webp` |
| Markt & Wettbewerb | `/market/competition` | `/assets/auftrag-037d/02-wettbewerbslandschaft.webp` | `market-competition-webp` |
| Markt & Wettbewerb | `/market/swot` | `/assets/auftrag-037d/03-swot-analyse.webp` | `market-swot-webp` |
| Kunden & ICP | `/customers/icp` | `/assets/auftrag-037d/04-ideal-customer-profile.webp` | `customers-icp-webp` |
| Kunden & ICP | `/customers/persona` | `/assets/auftrag-037d/05-buyer-persona-volker.webp` | `customers-persona-webp` |
| Kunden & ICP | `/customers/segments` | `/assets/auftrag-037d/06-kundensegmente.webp` | `customers-segments-webp` |
| Kunden & ICP | `/customers/top-customers` | `/assets/auftrag-037d/07-top-10-kunden.webp` | `customers-top10-webp` |

Die sieben bereitgestellten WebPs sind **direkte, autorisierte Seiteninhalte**. Sie sind nicht bloß Stilreferenzen und nicht dekorativ. Verwende pro Route genau die zugeordnete Originaldatei als sichtbares Hauptmotiv. Es gibt keine CSS-/JSX-Nachzeichnung, keine eigenständige Stilinterpretation und keine zweite, konkurrierende Datenansicht.

Sidebar und Simulationssteuerungsleiste bleiben unverändert. **Internal Resources werden nicht angefasst.**

## Vor Umsetzung verbindlich sichten

Lies `CLAUDE.md`, diese Spezifikation sowie die G21B-/G21C-Einträge in `docs/BUILD_LOG.md`. Öffne danach alle sieben Dateien in `docs/references/auftrag-037d/` visuell. Sie sind bitidentisch mit den verwendbaren App-Assets und stehen vollständig im Projekt zur Verfügung.

## Direkte, unveränderte Bildintegration

Für jede Route gilt:

- Nutze ein sichtbares `<img>` mit exakt der oben zugeordneten URL. Nicht als `background-image`, Pseudo-Element, Thumbnail oder nur ungenutztes Asset.
- Das Bild ist der vollständige Routeninhalt innerhalb des bestehenden Content-Bereichs. Entferne die bisher zusätzlich sichtbaren Header, Tabellen, Karten, Charts und Badge-Zeilen dieser Seite.
- Erhalte die Originalpixel: `display: block`, `width: 100%`, `max-width: 100%`, `height: auto`, `loading="eager"`. Kein festes Seitenverhältnis, kein `object-fit: cover`, kein Zuschnitt und kein horizontaler Scrollbereich.
- Strikt verboten: `filter`, `opacity`, `mix-blend-mode`, Masken, `clip-path`, Overlays, Farbflächen, Glow, Rahmen, Schatten, Border-Radius sowie Text- oder Logo-Überlagerungen auf den Bildpixeln.
- Verwende einen nichtleeren, routenspezifischen `alt`-Text. Er beschreibt die Ansicht knapp und erfindet keine Fakten. Eine ausschließlich für Screenreader sichtbare `<figcaption>` mit Seitentitel ist zulässig, aber kein zusätzlicher sichtbarer Fachtext.
- Bei 1440px, 768px und 375px skaliert das Original proportional über die verfügbare Content-Breite. Kein Abschneiden, keine Überdeckung durch Sidebar/Steuerungsleiste, kein Mobile-Ersatzbild und keine CSS-Rekonstruktion.

## Daten- und Bereichsschutz

- Dieses Ticket autorisiert nur die Darstellung der vom Nutzer freigegebenen WebP-Inhalte. Keine Änderung an Geschäftslogik, Simulation, Routing, Navigation oder Domänenstammdaten.
- `src/domain/marktData.ts`, `src/domain/icpData.ts`, `src/domain/kundenData.ts` und `src/domain/personaData.ts` bleiben unverändert. Die sichtbaren WebP-Inhalte sind für diese sieben Routen ausdrücklich als primäre Darstellung autorisiert; sie werden nicht in Stammdaten übertragen oder umgeschrieben.
- Die WebPs enthalten bewusst eigenen Text, Zahlen, UI-Elemente und Logos. Die Regel für ausschließlich textfreie **Dekorations**assets gilt für diese sieben direkt autorisierten Inhaltsbilder nicht.
- Nicht anfassen: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`, `src/features/resources/**`, `src/features/crm/**`, `src/components/layout/**`, `src/app/**`, `src/domain/executiveCockpitData.ts`, die G21B-Unternehmen-Ansichten sowie die G21C-Übersicht-/Produkt-Ansichten.
- Keine neuen npm-Abhängigkeiten.

## Ausschließlich erlaubte Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/markt/pages/MarketOverviewPage.tsx` | Direct WebP für Marktlage DACH. |
| `src/features/markt/pages/CompetitionPage.tsx` | Direct WebP für Wettbewerbslandschaft. |
| `src/features/markt/pages/SwotPage.tsx` | Direct WebP für SWOT-Analyse. |
| `src/features/kunden/pages/IcpPage.tsx` | Direct WebP für ICP. |
| `src/features/kunden/pages/PersonaPage.tsx` | Direct WebP für Buyer Persona Volker. |
| `src/features/kunden/pages/SegmentsPage.tsx` | Direct WebP für Kundensegmente. |
| `src/features/kunden/pages/TopCustomersPage.tsx` | Direct WebP für Top-10-Kunden. |
| `src/styles/global.css` | Höchstens eine gemeinsame, nicht-pixelverändernde Responsivklasse. |
| `scripts/verifyMarketCustomersWebpViews.ts` | Neuer Gate-Audit gemäß nächstem Abschnitt. |
| `scripts/captureAuftrag037dGateScreenshots.mjs` | Capture für sieben Routen bei 1440/768/375px und Fokus-Desktop. |
| `scripts/generateAuftrag037dScreenshotMatrix.mjs` | Screenshot-Matrix erzeugen. |
| `docs/screenshots/auftrag-037d/README.md` | Matrix und Overflow-Nachweis. |
| `docs/BUILD_LOG.md` | Builder-Bericht nach erfolgreicher Umsetzung. |

`public/assets/auftrag-037d/` und `docs/references/auftrag-037d/` sind bereitgestellt. Die Dateien nicht löschen, umbenennen, konvertieren, komprimieren oder überschreiben.

## Gate-Audit `verifyMarketCustomersWebpViews.ts`

Der Audit prüft mindestens:

1. Alle sieben WebPs existieren unter `public/assets/auftrag-037d/` und `docs/references/auftrag-037d/`.
2. Ihre SHA-256-Werte stimmen mit `public/assets/auftrag-037d/ASSET_SOURCE.md` überein; jede öffentliche Datei ist bitidentisch zur Prüfvorlage.
3. Jede Zielseite enthält ihre exakte öffentliche Asset-URL, ein sichtbares `<img>`, die zugeordnete `data-testid` und einen nichtleeren Alt-Text.
4. Kein Zielbild verwendet `object-fit: cover`, `aspect-ratio`, Filter, Opazität, Masken, Clip-Paths oder Bild-Overlays; `height: auto` ist Pflicht.
5. Die vier Domänendateien sowie alle geschützten Bereiche haben gegen `ea22bf6` exakt 0 Diff-Zeilen.
6. Keine Zielseite importiert `supabaseClient` oder fremde Domänendaten.

## Verifikation und Übergabe

Führe aus:

```bash
npx tsx scripts/verifyMarketCustomersWebpViews.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check ea22bf6..HEAD
git diff --exit-code ea22bf6..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/components/layout src/app src/domain/marktData.ts src/domain/icpData.ts src/domain/kundenData.ts src/domain/personaData.ts src/domain/executiveCockpitData.ts
node scripts/captureAuftrag037dGateScreenshots.mjs --stage=vorher
node scripts/captureAuftrag037dGateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag037dScreenshotMatrix.mjs
```

Die Matrix enthält 21 Vollseiten-Paare (7 Routen × 3 Viewports) und 7 fokussierte Desktop-Ausschnitte. Für jede Route ist 0px horizontaler Overflow nachzuweisen. Danach Builder-Bericht in `docs/BUILD_LOG.md`, Commit auf `codex/v2.0.0`, kein Push.

## Akzeptanzkriterien für Codex

- Jede Route zeigt das richtige, unveränderte Original-WebP als dominanten vollständigen Content.
- Keine Nachzeichnung und keine zusätzliche konkurrierende Datenansicht.
- Alle WebPs sind bytegenau zur Prüfvorlage.
- 1440px, 768px und 375px: vollständig sichtbar, 0px horizontaler Overflow.
- Daten-, Simulations-, Layout- und Ressourcen-Schutzbereiche sind unverändert.
- Alle Gates grün; finale Freigabe erst nach unabhängiger Codex-Prüfung.
