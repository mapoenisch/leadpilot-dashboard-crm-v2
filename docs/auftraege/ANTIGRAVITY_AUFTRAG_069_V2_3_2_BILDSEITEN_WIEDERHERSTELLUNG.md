# ANTIGRAVITY_AUFTRAG_069 — v2.3.2 Echte Wiederherstellung der Bildseiten (Gate G67)

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Entscheidungen Marc Poenisch, 26.09.2026 (Option A, Dateiauswahl, Umfang, Logo, Mobile, Rückweg).

## Ziel

Die 32 statischen Inhaltsseiten sehen wieder **genau so aus wie in v2.2.0**. Maßstab ist das
Bild, nicht die Struktur.

v2.3.0 (G52–G55) hat die Original-WebPs durch HTML ersetzt. v2.3.1 (Auftrag 068 / G66) hat
versucht, das Aussehen in HTML nachzubauen, und ist daran gescheitert: Schriftgröße, Kopfbereich,
Diagramme (3D-Säulen, Leuchteffekte) und Texte weichen sichtbar ab. Ursache: 068 hat das Ziel
„Zustand wiederherstellen“ zu „im Stil der Vorlage neu bauen“ umgedeutet, und die Gates haben
Struktur statt Aussehen geprüft.

Die Original-WebPs aus v2.2.0 liegen bitgenau im Repo (`public/assets/auftrag-037d`–`037g`,
SHA-256 in den `ASSET_SOURCE.md`). Sie werden wieder angezeigt.

## Entscheidungen (Marc, 26.09.2026)

| Punkt | Entscheidung |
|---|---|
| Richtung | Option A: echte Wiederherstellung mit den Original-WebPs. |
| Dateiauswahl | Die „(final)“-Fassung gilt, sonst die Datei ohne Zusatz. Die Dateien im Repo folgen dieser Regel bereits (Originalnamen in `ASSET_SOURCE.md`). Releases & Roadmap: `10-releases-roadmap.webp` ist die in v2.2.0 gezeigte Datei; Marc bestätigt sie im Gate-Screenshot. |
| Umfang | Nur die 32 statischen Inhaltsseiten. Executive Dashboard, Live-Simulation, Leads, Accounts, Deal-Pipeline, Aktivitäten und die Datenbasis-Seite (`s-daten`, seit G47 echte Live-Daten) bleiben interaktiv und unverändert. |
| Logo | Keine Änderung. Das aktuelle Logo entspricht dem Stand vor v2.3.0. |
| Mobile | **Revision 26.09.2026 (Marc, nach Sichtprüfung der Kachel-Fassung):** keine Kacheln. Auf dem Handy immer das ganze Bild in voller Breite. **Querformat:** Bild füllt die Breite, kein Hinweis. **Hochformat:** Hinweis „Handy quer drehen oder mit zwei Fingern zoomen“; der Zwei-Finger-Zoom des Browsers bleibt erlaubt. **Unsichtbare Textschicht:** Unter dem Bild liegt der Seiteninhalt als Text für Screenreader, Suche und Barrierefreiheit, optisch nicht sichtbar. *(Ursprünglich: Kacheln in überlappenden Ausschnitten; verworfen.)* |
| Rückweg | v2.3.1 muss **jederzeit** wiederherstellbar sein (siehe unten). |

## Zurückgenommene Regeln

Diese Regeln stehen im Widerspruch zu „sieht aus wie vorher“ und entfallen für die 32 Seiten:

- G52–G55: „kein Ganzseiten-WebP“ und „Inhalt als sichtbarer, auswählbarer Text“.
- G66: Design-Gate gegen einen HTML-Nachbau.

Erhalten bleiben: genau eine `h1` je Seite, Chart-Zusammenfassungen, Inhalte aus `src/domain/*`.
Sie leben ab jetzt in der unsichtbaren Textschicht. Die Rücknahme wird in
`ARCHITECTURE_DECISIONS.md` als neue Revision **ergänzt** (Teil A bleibt unverändert).

## Rückweg zu v2.3.1 (Pflicht)

1. **Tag bleibt unangetastet:** `v2.3.1` zeigt auf Commit `1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2`
   (Tag-Objekt `fc2a346e`). Kein Löschen, Verschieben oder Überschreiben. Das GitHub-Release
   v2.3.1 bleibt bestehen. Ein Deployment von `v2.3.1` ist damit jederzeit möglich.
2. **Schalter im Code:** Die v2.3.1-Seitenkomponenten (Page-Kit) werden **nicht gelöscht**. Ein
   zentraler Schalter `PAGE_PRESENTATION` in `src/config/pagePresentation.ts` mit den Werten
   `'bild'` (Standard) und `'html'` (= Aussehen v2.3.1) wählt die Darstellung. Rückkehr auf den
   v2.3.1-Stand = eine Zeile ändern, ohne Git-Rückbau.
3. **Nachweis im Gate:** Test für beide Schalterstellungen, dazu Prüfung, dass `v2.3.1` noch auf
   den oben genannten Commit zeigt.
4. Neue Version `v2.3.2`. Kein Force-Push, keine Änderung an `main`-Historie.

## Baseline

- Branch `main-jytadn` von `main` `61e70dc` (Merge PR #36).
- Schutzbereichs-Baseline: `61e70dc`.
- Bild-Referenz: Build von Tag `v2.2.0` (`4e2b0ef`), lokal in einem Worktree im Scratchpad.

## Globale Grenzen

- Schutzbereiche `src/simulation/**`, `src/types/**`, `src/context/**`,
  `src/services/data/**`, `src/features/resources/**`: **keine Änderung**.
- WebP-Dateien werden **nicht verändert**: kein Zuschnitt, keine Neukodierung, keine Kopie in
  Einzelteile.
- Keine neuen Abhängigkeiten, keine Inline-Styles (Budget `src/` = 0), keine neuen Suppressions.
- Zoom nicht sperren: kein `user-scalable=no`, kein `maximum-scale=1`, kein `touch-action` auf der Bildseite.
- Interaktive Seiten, Sidebar, Topbar, Logo: keine Änderung.

## Ziel-Dateien

| Datei | Art |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_069_V2_3_2_BILDSEITEN_WIEDERHERSTELLUNG.md` | neu |
| `src/config/pagePresentation.ts` | neu (Schalter `'bild'` / `'html'`) |
| `src/components/imagePage/**` | neu (Bildseite, Hochformat-Hinweis, Textschicht) |
| die 32 Seiten unter `src/features/{finanzen,kunden,markt,organisation,overview,produkt,recht,strategie,unternehmen,vertrieb}/pages/*.tsx` (ohne `DataBasisPage.tsx`) | ändern (Hülle: Bild oder v2.3.1-Inhalt) |
| `src/styles/global.css` | ändern (Bildansicht, Hochformat-Hinweis) |
| `src/app/__tests__/g5[2-5]SemanticPages.ui.vitest.tsx`, `g66DesignRestore.ui.vitest.tsx`, `g67ImagePages.ui.vitest.tsx` | ändern/neu |
| `scripts/verify*WebpViews.ts`, `scripts/verifyIntegrity.ts` | ändern, falls sie der neuen Darstellung widersprechen |
| `scripts/captureAuftrag069Screenshots.mjs`, `docs/screenshots/auftrag-069/README.md` | neu |
| `package.json`, `package-lock.json`, `src/features/auth/pages/LoginPage.tsx` | ändern (Version `2.3.2`) |
| `ARCHITECTURE_DECISIONS.md` (nur Ergänzung), `docs/releases/V2.3.2.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | ändern/neu |

## Zuordnung Seite → Bild (identisch zu v2.2.0)

| Route-Komponente | Bild |
|---|---|
| `markt/MarketOverviewPage` | `037d/01-marktlage-dach.webp` |
| `markt/CompetitionPage` | `037d/02-wettbewerbslandschaft.webp` |
| `markt/SwotPage` | `037d/03-swot-analyse.webp` |
| `kunden/IcpPage` | `037d/04-ideal-customer-profile.webp` |
| `kunden/PersonaPage` | `037d/05-buyer-persona-volker.webp` |
| `kunden/SegmentsPage` | `037d/06-kundensegmente.webp` |
| `kunden/TopCustomersPage` | `037d/07-top-10-kunden.webp` |
| `vertrieb/FunnelPage` | `037e/01-sales-funnel-2025.webp` |
| `vertrieb/SlaPage` | `037e/02-sla-marketing-sales.webp` |
| `vertrieb/ChannelsPage` | `037e/03-kanalperformance-cac.webp` |
| `vertrieb/PlanningPage` | `037e/04-marketingplanung-h2-2026.webp` |
| `finanzen/PnLPage` | `037e/05-gewinn-verlustrechnung.webp` |
| `finanzen/BalanceSheetPage` | `037e/06-bilanz-saas.webp` |
| `finanzen/UnitEconomicsPage` | `037e/07-unit-economics-2026.webp` |
| `organisation/HeadcountPage` | `037f/01-headcount-entwicklung.webp` |
| `organisation/HrPage` | `037f/02-hr-kennzahlen.webp` |
| `organisation/TeamStructurePage` | `037f/03-teamstruktur-engpaesse.webp` |
| `strategie/OkrsPage` | `037f/04-ziele-okrs.webp` |
| `strategie/BalancedScorecardPage` | `037f/05-balanced-scorecard.webp` |
| `strategie/GrowthDriversPage` | `037f/06-wachstumstreiber.webp` |
| `recht/ArticlesPage` | `037f/07-satzung-leadpilot.webp` |
| `recht/ShareholdersPage` | `037f/08-gesellschafterliste.webp` |
| `recht/CommercialRegisterPage` | `037f/09-handelsregister.webp` |
| `overview/CompanyProfilePage` | `037g/01-unternehmenssteckbrief.webp` |
| `overview/YearHighlightsPage` | `037g/02-jahres-highlights-2025.webp` |
| `unternehmen/IdeaPage` | `037g/04-geschaeftsidee.webp` |
| `unternehmen/ValuePropositionPage` | `037g/05-value-proposition.webp` |
| `unternehmen/HistoryPage` | `037g/06-gruendung-entwicklung.webp` |
| `produkt/FeaturesPage` | `037g/07-produkt-funktionsweise.webp` |
| `produkt/PricingPage` | `037g/08-preismodell.webp` |
| `produkt/PerformancePage` | `037g/09-produkt-performance-2025.webp` |
| `produkt/RoadmapPage` | `037g/10-releases-roadmap.webp` |

`037g/03-datenbasis-konsistenz.webp` wird nicht verwendet (Datenbasis bleibt Live-Seite, G47).
Der Builder gleicht die Tabelle vor Task 3 per `git grep webp-img v2.2.0 -- src` ab.

## Tasks

- [x] **1. Roter Start:** `g67ImagePages.ui.vitest.tsx` verlangt für jede der 32 Seiten im Modus
      `'bild'`: genau ein sichtbares `<img>` mit der Datei laut Tabelle, genau eine `h1` in der
      Textschicht, Textschicht optisch verborgen. Im Modus `'html'`: Ausgabe wie v2.3.1.
      Vor dem Umbau rot.
- [x] **2. Schalter:** `src/config/pagePresentation.ts` mit `PAGE_PRESENTATION = 'bild'`.
- [x] **3. Bildseite:** Komponente `ImagePage` (Bild, Hochformat-Hinweis, Textschicht). Auf allen Breiten
      das ganze Bild in voller Breite des Inhaltsbereichs, Seitenverhältnis erhalten, kein
      Beschnitt, keine Filter oder Überlagerungen, Darstellung wie `.auftrag-037x-webp-view` in
      v2.2.0.
- [x] **4. Handy (Revision 26.09.2026):** ganzes Bild in voller Breite, im Hochformat unter
      600 px ein Hinweis „Handy quer drehen oder mit zwei Fingern zoomen“ (`aria-hidden`, Icon
      aus `lucide-react`), im Querformat kein Hinweis. Browser-Zoom bleibt erlaubt.
      *Historie:* Die erste Fassung teilte das Bild in zwei überlappende Ausschnitte (0–55 % /
      45–100 %). Marc hat das nach der Sichtprüfung verworfen.
- [x] **5. Textschicht:** die bisherigen v2.3.1-Seiteninhalte (echte `h1`, Tabellen, Listen,
      Chart-Zusammenfassungen) werden im Modus `'bild'` visuell verborgen gerendert
      (`sr-only`-Muster, kein `display:none`, kein `aria-hidden`). Das Bild erhält ein kurzes
      `alt`, das auf die Textschicht verweist, damit Screenreader den Inhalt nicht doppelt lesen.
- [x] **6. Seiten:** die 32 Seiten auf `ImagePage` umstellen, Modus `'html'` rendert die
      v2.3.1-Komponente unverändert.
- [x] **7. Tests und Suiten anpassen:** G52–G55/G66-Tests prüfen Semantik jetzt in der
      Textschicht bzw. im Modus `'html'`. Assertions „kein WebP“ entfallen mit Verweis auf
      diesen Auftrag. Integrity-Suiten entsprechend.
- [x] **8. Bild-zu-Bild-Gate:** Screenshot-Harness baut `v2.2.0` und den neuen Stand, fotografiert
      alle 32 Routen und vergleicht den Inhaltsbereich pixelweise.
- [x] **9. Rückweg-Nachweis:** Test beide Modi; `git rev-parse v2.3.1^{commit}` =
      `1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2` im BUILD_LOG belegt.
- [x] **10. Version & Doku:** `2.3.2`, Release-Notiz, Revision in `ARCHITECTURE_DECISIONS.md`,
      `BUILD_PLAN.md`, BUILD_LOG-Eintrag.

## Gate G67 — Abnahmekriterien

| # | Kriterium | Maßstab |
|---|---|---|
| G67-1 | Bild-Identität | Jede der 32 Seiten zeigt die Datei laut Tabelle; SHA-256 aller 32 Dateien = `ASSET_SOURCE.md`; `git diff v2.2.0 -- public/assets/auftrag-037*` leer. |
| G67-2 | Bild-zu-Bild 1440 px | Inhaltsbereich neu vs. v2.2.0: Pixelabweichung ≤ 0,5 % je Seite. Abweichungen darüber werden einzeln begründet oder behoben. |
| G67-3 | Bild-zu-Bild 768 px | wie G67-2. |
| G67-4 | Handy 375×812 (hoch) und 812×375 (quer) | Genau ein Bild in voller Inhaltsbreite, Hinweis nur im Hochformat, Zoom nicht gesperrt, 0 px horizontaler Overflow. |
| G67-5 | Textschicht | Genau eine `h1`, Inhalt im DOM, optisch unsichtbar (Bounding-Box 1×1 bzw. geclippt), axe ohne neue Verstöße. |
| G67-6 | Rückweg | Modus `'html'` = v2.3.1-Darstellung (Test); Tag `v2.3.1` unverändert. |
| G67-7 | Unberührt | Interaktive Seiten, Datenbasis, Sidebar, Logo: Screenshots gleich v2.3.1. Schutzbereichs-Diff leer. |
| G67-8 | Standard | `npx tsc --noEmit` 0 Fehler, `npm run verify` grün, `npm run build` grün. |
| G67-9 | Sichtprüfung Marc | Marc bestätigt anhand der Screenshot-Matrix, dass die Seiten aussehen wie vor v2.3.0, inkl. Releases & Roadmap. |

Ohne G67-9 kein Release-Tag `v2.3.2`.
