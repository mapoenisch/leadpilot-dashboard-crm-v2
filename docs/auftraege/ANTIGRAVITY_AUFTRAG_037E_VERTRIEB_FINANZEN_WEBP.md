# AUFTRAG 037E / Gate G21E — Vertrieb & Marketing sowie Finanzen: direkte WebP-Ansichten

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `ed496cf`
**Branch:** `codex/v2.0.0`
**Status:** BEREIT ZUR UMSETZUNG

## Ziel und verbindliche Entscheidung

Bearbeite ausschließlich diese sieben Routen:

| Bereich | Route | Zielseite | Verbindlicher Direkt-Asset | Test-ID |
|---|---|---|---|---|
| Vertrieb & Marketing | `/sales/funnel` | `FunnelPage.tsx` | `/assets/auftrag-037e/01-sales-funnel-2025.webp` | `sales-funnel-webp` |
| Vertrieb & Marketing | `/sales/sla` | `SlaPage.tsx` | `/assets/auftrag-037e/02-sla-marketing-sales.webp` | `sales-sla-webp` |
| Vertrieb & Marketing | `/sales/channels` | `ChannelsPage.tsx` | `/assets/auftrag-037e/03-kanalperformance-cac.webp` | `sales-channels-webp` |
| Vertrieb & Marketing | `/sales/planning` | `PlanningPage.tsx` | `/assets/auftrag-037e/04-marketingplanung-h2-2026.webp` | `sales-planning-webp` |
| Finanzen | `/finance/p-and-l` | `PnLPage.tsx` | `/assets/auftrag-037e/05-gewinn-verlustrechnung.webp` | `finance-pnl-webp` |
| Finanzen | `/finance/balance-sheet` | `BalanceSheetPage.tsx` | `/assets/auftrag-037e/06-bilanz-saas.webp` | `finance-balance-sheet-webp` |
| Finanzen | `/finance/unit-economics` | `UnitEconomicsPage.tsx` | `/assets/auftrag-037e/07-unit-economics-2026.webp` | `finance-unit-economics-webp` |

Die sieben bereitgestellten WebPs sind **direkte, autorisierte Seiteninhalte** — keine bloßen Stilreferenzen und keine Dekoration. Verwende pro Route ausschließlich die zugeordnete Originaldatei als sichtbaren Hauptinhalt. Es gibt keine CSS-/JSX-Nachzeichnung, keine Stilinterpretation und keine zweite, konkurrierende Datenansicht.

Die bestehende Sidebar und die echte Simulationssteuerungsleiste bleiben unangetastet. **Internal Resources werden nicht angefasst.**

## Vor Umsetzung verbindlich sichten

1. Lies `CLAUDE.md`, diese Spezifikation sowie die aktuellen G21C-/G21D-Einträge in `docs/BUILD_LOG.md` vollständig.
2. Öffne alle sieben Dateien unter `docs/references/auftrag-037e/` visuell. Sie stehen vollständig im Projekt bereit und sind bitidentisch mit den verwendbaren App-Assets.
3. Erstelle und führe vor jeder Code-Änderung den Screenshot-Harness mit `--stage=vorher` aus.

## Direkte, unveränderte Bildintegration

Für jede Zielroute gilt:

- Nutze ein sichtbares `<img>` mit exakt der oben zugeordneten URL. Nicht als `background-image`, Pseudo-Element, Thumbnail oder nur als ungenutztes Asset.
- Das Bild ist der vollständige fachliche Routeninhalt innerhalb des bestehenden Content-Bereichs. Entferne alle bislang zusätzlich sichtbaren Fachheader, Tabellen, Karten, Diagramme, Badges und Hinweise dieser Seite.
- Erhalte die Originalpixel: `display: block`, `width: 100%`, `max-width: 100%`, `height: auto`, `loading="eager"`. Eine Größenanpassung über die verfügbare Content-Breite ist erlaubt; ein festes Seitenverhältnis, `object-fit: cover`, Zuschnitt und horizontales Scrolling sind es nicht.
- Strikt verboten: `filter`, `opacity`, `mix-blend-mode`, Masken, `clip-path`, Overlays, zusätzliche Farbflächen, Glow, Rahmen, Schatten, Border-Radius sowie Text- oder Logo-Überlagerungen auf den Bildpixeln.
- Verwende einen nichtleeren, routenspezifischen `alt`-Text, der die Ansicht knapp benennt und keine Fachfakten erfindet. Eine ausschließlich für Screenreader sichtbare `<figcaption>` mit Seitentitel ist zulässig, aber kein zusätzlicher sichtbarer Fachtext.
- Bei 1440px, 768px und 375px skaliert das Original proportional über die verfügbare Content-Breite. Kein Abschneiden, keine Überdeckung durch die App-Chrome, kein Mobile-Ersatzbild und keine CSS-Rekonstruktion.
- Besonderheit Sales Funnel: `01-sales-funnel-2025.webp` enthält als Originalinhalt eine statische Simulationssteuerung am oberen Bildrand. Sie bleibt vollständig sichtbar und unverändert; sie wird nicht zugeschnitten oder durch Änderungen an der echten, globalen Simulationssteuerung ersetzt. Die globale Leiste bleibt ebenfalls unverändert.

## Daten- und Bereichsschutz

- Dieses Ticket autorisiert ausschließlich die Darstellung der freigegebenen WebP-Inhalte. Keine Änderung an Geschäftslogik, Simulation, Routing, Navigation oder Domänenstammdaten.
- `src/domain/vertriebData.ts` und `src/domain/finanzenData.ts` bleiben unverändert. Die sichtbaren WebP-Inhalte sind für diese sieben Routen ausdrücklich als primäre Darstellung autorisiert; sie werden nicht in Stammdaten übertragen, aktualisiert oder umgeschrieben.
- Die WebPs enthalten bewusst eigenen Text, Zahlen, UI-Elemente und Logos. Die Regel für ausschließlich textfreie **Dekorations**assets gilt für diese sieben direkt autorisierten Inhaltsbilder nicht.
- Nicht anfassen: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`, `src/features/resources/**`, `src/features/crm/**`, `src/components/layout/**`, `src/app/**`, `src/domain/executiveCockpitData.ts`, die G21B-Unternehmen-Ansichten sowie die G21C-/G21D-Ansichten.
- Keine neuen npm-Abhängigkeiten.

## Ausschließlich erlaubte Ziel-Dateien

| Datei | Zulässige Änderung |
|---|---|
| `src/features/vertrieb/pages/FunnelPage.tsx` | Direkte WebP-Einbindung für Sales Funnel 2025. |
| `src/features/vertrieb/pages/SlaPage.tsx` | Direkte WebP-Einbindung für SLA Marketing & Sales. |
| `src/features/vertrieb/pages/ChannelsPage.tsx` | Direkte WebP-Einbindung für Kanalperformance & CAC. |
| `src/features/vertrieb/pages/PlanningPage.tsx` | Direkte WebP-Einbindung für Marketingplanung H2 2026. |
| `src/features/finanzen/pages/PnLPage.tsx` | Direkte WebP-Einbindung für Gewinn- und Verlustrechnung. |
| `src/features/finanzen/pages/BalanceSheetPage.tsx` | Direkte WebP-Einbindung für Bilanz & SaaS. |
| `src/features/finanzen/pages/UnitEconomicsPage.tsx` | Direkte WebP-Einbindung für KPIs Unit Economics 2026. |
| `src/styles/global.css` | Höchstens eine gemeinsame, nicht-pixelverändernde Responsivklasse für G21E-Bilder. |
| `scripts/verifySalesFinanceWebpViews.ts` | Neuer Gate-Audit gemäß dem folgenden Abschnitt. |
| `scripts/captureAuftrag037eGateScreenshots.mjs` | Vorher-/Nachher-Capture für sieben Routen bei 1440/768/375px und Fokus-Desktop. |
| `scripts/generateAuftrag037eScreenshotMatrix.mjs` | Screenshot-Matrix erzeugen. |
| `docs/screenshots/auftrag-037e/README.md` | Matrix und Overflow-Nachweis. |
| `docs/BUILD_LOG.md` | Builder-Bericht nach erfolgreicher Umsetzung. |

`public/assets/auftrag-037e/` und `docs/references/auftrag-037e/` sind bereitgestellt. Die Dateien nicht löschen, umbenennen, konvertieren, komprimieren oder überschreiben.

## Gate-Audit `verifySalesFinanceWebpViews.ts`

Der Audit prüft mindestens:

1. Alle sieben WebPs existieren unter `public/assets/auftrag-037e/` und `docs/references/auftrag-037e/`.
2. Ihre SHA-256-Werte stimmen mit `public/assets/auftrag-037e/ASSET_SOURCE.md` überein; jede öffentliche Datei ist bitidentisch zur Prüfvorlage.
3. Jede Zielseite enthält ihre exakte öffentliche Asset-URL, ein sichtbares `<img>`, die zugeordnete `data-testid`, `loading="eager"` und einen nichtleeren Alt-Text.
4. Kein Zielbild verwendet `object-fit: cover`, `aspect-ratio`, Filter, Opazität, Masken, Clip-Paths, `mix-blend-mode`, Overlays, Schatten, Border-Radius oder Rahmen; `height: auto` ist Pflicht.
5. `src/domain/vertriebData.ts`, `src/domain/finanzenData.ts` sowie alle geschützten Bereiche haben gegen `ed496cf` exakt 0 Diff-Zeilen.
6. Keine Zielseite importiert `supabaseClient` oder fachliche Domänendaten.

## Verifikation und Übergabe

Führe aus:

```bash
node scripts/captureAuftrag037eGateScreenshots.mjs --stage=vorher
npx tsx scripts/verifySalesFinanceWebpViews.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check ed496cf..HEAD
git diff --exit-code ed496cf..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/components/layout src/app src/domain/vertriebData.ts src/domain/finanzenData.ts src/domain/executiveCockpitData.ts
node scripts/captureAuftrag037eGateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag037eScreenshotMatrix.mjs
```

Der Screenshot-Harness muss alle sieben Routen auf 1440px, 768px und 375px erfassen, einen fokussierten Desktop-Ausschnitt je Route erzeugen und bei jedem Viewport automatisiert **0px horizontalen Overflow** nachweisen. Die Matrix muss 21/21 Vollseiten-Paare und 7/7 Fokuspaare als `DISTINCT` dokumentieren.

Danach:

1. Alle Gates erneut ausführen, falls der Nachher-Capture oder die Matrix Dateien ändert.
2. Den Builder-Bericht in `docs/BUILD_LOG.md` ergänzen: Asset-Hash-Nachweis, Zielrouten, 0px Overflow, Screenshot-Matrix, alle Befehle samt Ergebnis und expliziten Schutzbereichs-Diff.
3. Nur die aufgelisteten Dateien committen. Kein Push, kein Merge nach `main`, `.claude/` nicht anfassen.
4. Übergib Codex Commit-ID, Branch, Baseline, Dateiliste und vollständige Gate-Ergebnisse zur unabhängigen Review.
