# ANTIGRAVITY AUFTRAG 037C: Übersicht & Produkt – Cyberpunk-Fintech-Redesign

> **Gate:** G21C
> **Branch:** `codex/v2.0.0`
> **Baseline:** `8cb500d`
> **Rolle:** Antigravity baut. Codex prüft ausschließlich.

## 1. Verbindliche Bildreferenzen – zuerst öffnen

Öffne **vor jeder Implementierung** alle Dateien unter `docs/references/auftrag-037c/` mit einem Bildbetrachter. Die Zuordnung steht in `docs/references/auftrag-037c/README.md`. Die Bilddateien sind der verbindliche Maßstab für Komposition, Informationshierarchie, Farbsemantik, räumliche Wirkung und Panelstruktur.

Sind die Dateien nicht lesbar oder nicht visuell prüfbar: stoppen und Zugriff anfordern. Nicht allein anhand dieser Textspezifikation bauen.

Die Referenzen sind nie App-Inhalte. Sie dürfen nicht importiert oder nach `public/assets` kopiert werden. Fachliche Inhalte bleiben semantisches DOM aus den bestehenden Datenquellen.

## 2. Auftrag und harte Grenze

Gestalte ausschließlich diese sieben Pages neu:

| Bereich | Route | Page | Referenz |
| --- | --- | --- | --- |
| Übersicht – Unternehmenssteckbrief | `/company/profile` | `CompanyProfilePage.tsx` | `01-unternehmenssteckbrief.png` |
| Übersicht – Jahres-Highlights 2025 | `/company/highlights` | `YearHighlightsPage.tsx` | `02-jahres-highlights-2025.png` |
| Übersicht – Datenbasis & Konsistenz | `/company/data-basis` | `DataBasisPage.tsx` | `03-datenbasis-konsistenz.png` |
| Produkt – Produkt & Funktionsweise | `/product/features` | `FeaturesPage.tsx` | `04-produkt-funktionsweise.png` |
| Produkt – Pakete & Preismodell | `/product/pricing` | `PricingPage.tsx` | `05-preismodell.png` |
| Produkt – Produkt-Performance 2025 | `/product/performance` | `PerformancePage.tsx` | `06-produkt-performance-2025.png` |
| Produkt – Releases & Roadmap | `/product/roadmap` | `RoadmapPage.tsx` | `07-releases-roadmap.png` |

`/dashboard` ist nicht Teil dieses Auftrags. Sidebar, Header, SimulationBar, Layout-Shell, Navigation, Routing, alle Unternehmen-Ansichten aus Auftrag 037B und Internal Resources bleiben unverändert.

## 3. Globale Regeln aus Auftrag 037B

- Cyberpunk-Fintech-Enterprise-Sprache: tiefes Schiefer-/Blaugrün, präzise Cyan-/Mint-Lichtkanten, dunkle Glasflächen, technische Raster und hohe Informationsdichte.
- Keine bloße Umfärbung vorhandener Standardkarten.
- Keine neuen fachlichen Behauptungen, Kennzahlen, Garantien, Preise, Ziele, Statuswerte, Funktionsnamen oder Meilensteine.
- Keine fachlichen Fallbacks wie `?? 'HRB 40912'` oder `?? '31.250'`.
- Orange ausschließlich für vorhandene negative, verfehlte, kritische, geplante oder In-Entwicklung-Status. Ein `featured`-Tarif erhält Cyan/Mint, nicht Orange.
- Keine neuen Packages, Canvas-, WebGL- oder 3D-Abhängigkeiten.
- Dekorative Assets sind text-, zahlen-, logo- und UI-frei. Fachliche Inhalte liegen nie in Assets.

## 4. Verbindliche Umsetzung je Route

### 4.1 `/company/profile` – Unternehmenssteckbrief

**Datenquelle:** ausschließlich `PROFILE_ROWS`, `NOTE_PROFIL` aus `src/domain/execData.ts`.

- Umsetzung wie `01-unternehmenssteckbrief.png`: Datenkopf, zwei Glas-Panels für rechtliche Stammdaten sowie Kapital & Organe, vollständige Key-Value-Matrix, darunter Fokus-/Hinweisstreifen.
- Handelsregister, Rechtsform, Kapital, Geschäftsführung und Gesellschafter ausschließlich aus `PROFILE_ROWS` ableiten.
- Alle Zeilen aus `PROFILE_ROWS` vollständig und lesbar ausgeben. `NOTE_PROFIL` ist der einzige Inhalt des Abschlussstreifens.

### 4.2 `/company/highlights` – Jahres-Highlights 2025

**Datenquelle:** ausschließlich `HIGHLIGHTS_GOOD_ROWS`, `HIGHLIGHTS_BAD_ROWS`, `NOTE_HIGHLIGHTS` aus `src/domain/execData.ts`.

- Umsetzung wie `02-jahres-highlights-2025.png`: zwei gleichwertige Enterprise-Panels, links Erfolge in Cyan/Mint, rechts Herausforderungen in Orange.
- Jede vorhandene Zeile zeigt Lucide-Icon, Titel und vollständige Beschreibung aus der Datenreihe. Keine Emojis.
- `NOTE_HIGHLIGHTS` wird als breiter orange akzentuierter Jahres-Fazit-Streifen umgesetzt.

### 4.3 `/company/data-basis` – Datenbasis & Konsistenz

**Datenquelle:** ausschließlich `BRIDGES_ROWS`, `SOURCES_ROWS`, `NOTE_DATEN` aus `src/domain/execData.ts`.

- Umsetzung wie `03-datenbasis-konsistenz.png`: oberes Schnittstellen-/Datenfluss-Panel, vertikale Cyan-Achse mit verbundenen Systemzeilen, darunter Quellenpanel und Methodikstreifen.
- Zählwerte ausschließlich aus `.length` der vorhandenen Reihen ableiten.
- Visuelle Pfeile erhalten kein erfundenes Klick-Verhalten.

### 4.4 `/product/features` – Produkt & Funktionsweise

**Datenquelle:** ausschließlich `FUNKTION` aus `src/domain/produktData.ts`.

- Umsetzung wie `04-produkt-funktionsweise.png`: vier Modulpanels als 2×2-Desktop-Grid, Modulname und Beschreibung als DOM, ergänzt durch textfreie räumlich wirkende Modulvisuals und Cyan-Verbindungen.
- Keine neue „Mehr erfahren“-Interaktion ohne vorhandenes Verhalten.
- Mobile linearisiert die vier Panels ohne Textüberdeckung oder horizontalen Überlauf.

### 4.5 `/product/pricing` – Pakete & Preismodell

**Datenquelle:** ausschließlich `PRICING` aus `src/domain/produktData.ts`.

- Umsetzung wie `05-preismodell.png`: drei Paketpanels.
- Preis, Zeitraum, Beschreibung, Feature-Liste und `featured`-Status ausschließlich aus `PRICING.tiers`.
- Der `featured`-Tarif erhält Cyan-/Mint-Hervorhebung. Paketvisuals dürfen ausschließlich textfreies Dekor sein.
- Bestehende „Paket wählen“-Buttons ausschließlich optisch verändern; keine Checkout-, Formular- oder externe Logik ergänzen.

### 4.6 `/product/performance` – Produkt-Performance 2025

**Datenquelle:** ausschließlich `PERF`, `CHART_PRODUKT`, `CHART_CHURN` aus `src/domain/produktData.ts`.

- Alle tatsächlich vorhandenen `PERF.metrics` als KPI-Rail darstellen; keine harte Zahl wie „4 Kernmetriken“ verwenden, wenn die Datenreihe mehr Einträge hat.
- Erfolg/Verfehlung und Cyan-/Orange-Semantik nur aus vorhandenen Metrik- und Zielinformationen ableiten.
- Umsetzung wie `06-produkt-performance-2025.png`: Aktivierung/KI-Nutzung als präziser Linien-/Flächenchart; Churn-Ursachen als Donut mit DOM-Legende und realen Werten.
- `src/components/ui/**` bleibt unverändert. Bei Bedarf nur scoped Komponenten unter `src/features/produkt/components/**` erstellen.

### 4.7 `/product/roadmap` – Releases & Roadmap

**Datenquelle:** ausschließlich `ROADMAP.releases` aus `src/domain/produktData.ts`.

- Umsetzung wie `07-releases-roadmap.png`: links vollständige DOM-Timeline mit Cyan-Achse; rechts textfreie räumliche Berg-/Routen-Szene mit Neon-Trasse.
- Quartal, Titel, Beschreibung und Status jedes Punktes stammen aus `ROADMAP.releases`.
- `Released` Cyan/Mint; `In Entwicklung` und `Geplant` Orange.
- Mobile zeigt zuerst die vollständige Timeline, danach die visuelle Route.

## 5. Zulässige Dateien

- `src/features/overview/pages/CompanyProfilePage.tsx`
- `src/features/overview/pages/YearHighlightsPage.tsx`
- `src/features/overview/pages/DataBasisPage.tsx`
- `src/features/overview/components/**` ausschließlich für diese drei Pages
- `src/features/produkt/pages/FeaturesPage.tsx`
- `src/features/produkt/pages/PricingPage.tsx`
- `src/features/produkt/pages/PerformancePage.tsx`
- `src/features/produkt/pages/RoadmapPage.tsx`
- `src/features/produkt/components/**` ausschließlich für diese vier Pages
- `src/styles/global.css` nur mit Präfixen `overview-v2-` oder `product-v2-`
- `public/assets/overview/**`, `public/assets/product/**` nur für zulässige Dekor-Assets plus `ASSET_SOURCE.md`
- `scripts/verifyOverviewProductCyberpunkDesign.ts`
- `scripts/captureAuftrag037cGateScreenshots.mjs`
- `scripts/generateAuftrag037cScreenshotMatrix.mjs`
- `docs/screenshots/auftrag-037c/**`, `docs/BUILD_LOG.md`

## 6. Verbotene Änderungen

Gegen `8cb500d` müssen exakt unverändert bleiben:

- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`
- `src/features/resources/**`, `src/features/crm/**`, `src/domain/**`
- `src/components/layout/**`, `src/components/ui/**`, `src/app/**`
- `src/features/unternehmen/**` sowie alle Feature-Bereiche außerhalb der sieben erlaubten Pages und ihrer scoped Components
- `src/features/overview/pages/ExecutiveDashboardPage.tsx`

Keine Änderung an Sidebar, SimulationBar, Routing, Datenquelle, Integrationen oder Packages.

## 7. Assets, Audit und Screenshots

Neue Dekor-Assets liegen nur unter `public/assets/overview/**` oder `public/assets/product/**`, sind kleiner als 320 KB und haben `alt=""`, `aria-hidden="true"` sowie `ASSET_SOURCE.md` mit Zweck, Herkunft, Prompt, Maßen und Dateigröße.

`verifyOverviewProductCyberpunkDesign.ts` prüft mindestens sieben eindeutige Page-`data-testid`s, die erlaubten Domain-Imports, fehlende fachliche Fallbacks und neuen Behauptungen, fehlende Supabase-/Realtime-Imports, Asset-Hygiene und den leeren Schutzbereichs-Diff.

Je Route: Vollseite auf 1440 px, 768 px und 375 px plus fokussierter Desktop-Ausschnitt, jeweils Vorher/Nachher. Das sind 21 Vollseiten- und sieben fokussierte Paare. Horizontaler Überlauf: exakt 0 px.

## 8. Pflicht-Verifikation

```bash
npx tsx scripts/verifyOverviewProductCyberpunkDesign.ts
npx tsx scripts/verifyUnternehmenCyberpunkDesign.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 8cb500d..HEAD
git diff --exit-code 8cb500d..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/domain src/components/layout src/components/ui src/app src/features/unternehmen src/features/markt src/features/kunden src/features/vertrieb src/features/finanzen src/features/organisation src/features/strategie src/features/recht src/features/geschaeftsmodell src/features/projektkontext src/features/overview/pages/ExecutiveDashboardPage.tsx
node scripts/captureAuftrag037cGateScreenshots.mjs --stage=vorher
node scripts/captureAuftrag037cGateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag037cScreenshotMatrix.mjs
```

## 9. Abnahmebedingung

Freigabe erst nach sichtbarer Cyberpunk-Fintech-Übersetzung aller sieben Referenzen, exakter Datenbindung, 0 px Überlauf auf allen Viewports und unabhängiger visueller Codex-Abnahme. Übergabe enthält Commit-ID, Gates, Screenshot-Matrix und die Zuordnung Referenzmerkmal → DOM-/Asset-Umsetzung. Kein Push.
