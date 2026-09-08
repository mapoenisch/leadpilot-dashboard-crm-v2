# ANTIGRAVITY AUFTRAG 037B: Unternehmen – Cyberpunk-Fintech-Redesign

> **Gate:** G21B
> **Branch:** `codex/v2.0.0`
> **Baseline:** `44b5684`
> **Status:** BEREIT ZUR AUSFÜHRUNG  
> **Rolle:** Antigravity baut. Codex prüft ausschließlich.

## 1. Auftrag und harte Grenze

Dieser Auftrag gestaltet **ausschließlich** die vier Unternehmensansichten im verbindlichen Cyberpunk-Fintech-Stil der bereitgestellten Referenzen neu:

| Teilabschnitt | Route | Bestehende Page |
| --- | --- | --- |
| Geschäftsidee | `/company/idea` | `IdeaPage.tsx` |
| Value Proposition | `/company/value-proposition` | `ValuePropositionPage.tsx` |
| Gründung und Entwicklung | `/company/history` | `HistoryPage.tsx` |
| Sitz & Räumlichkeiten | `/company/location` | `LocationPage.tsx` |

**Sidebar und Simulationssteuerungsleiste bleiben unverändert.** Es werden keine anderen Routen, kein Executive Dashboard, keine CRM-Ansichten, keine Echtzeit-Integration und keine Geschäftslogik verändert. `Internal Resources` bleibt vollständig unangetastet.

## 2. Verbindliche Stilreferenz

Die vom Auftraggeber gelieferten Cyberpunk-Fintech-Referenzen sind der sichtbare Maßstab: tiefes Blaugrün und Schiefergrün, präzise Cyan-/Mint-Lichtkanten, dunkle Glasflächen, feine technische Rahmen, Orange ausschließlich für Risiken sowie hohe Informationsdichte.

Die heutigen Ansichten bestehen weitgehend aus Überschrift plus gewöhnlichen Text-, Karten- oder Tabellenblöcken. Das ist nicht abnahmefähig. Jede der vier Seiten muss nach der Umsetzung wie eine eigenständige, hochwertige Enterprise-Datenansicht wirken – nicht wie eine Dokumentseite mit neu gefärbten Karten.

Referenzbilder werden **nicht** als App-Asset kopiert: Sie enthalten Texte, Zahlen und UI-Inhalte. Alle geschäftlichen Texte, Zahlen, Namen, Adressen und Zeitpunkte bleiben echte semantische DOM-Daten aus `src/domain/unternehmenData.ts`.

## 3. Verbindliche Gestaltung je Ansicht

### 3.1 Geschäftsidee – `/company/idea`

- Der bisherige lange Fließtext wird zu einer klaren „Lead-Signal-Map“ inszeniert: Problemraum, LeadPilot-Mechanik und Nutzen werden als räumlich wirkende, verbundene Informationszonen dargestellt.
- Die zwei bestehenden Absätze bleiben vollständig und lesbar, werden aber als erklärende DOM-Ebene in einer dominanten Glasfläche mit Cyan-Lichtstruktur gesetzt.
- Die vier bestehenden USPs erscheinen als vier präzise, leuchtend gerahmte Nutzen-Knoten mit unterschiedlichen, zugänglichen Icons aus der bestehenden Icon-Bibliothek. Kein Emoji-Ersatz und keine neuen Behauptungen.
- Desktop/Tablet: Signal-Map mit sichtbarer Verbindungshierarchie. Mobile: Absätze zuerst, danach die vier Nutzen-Knoten in einer einzelnen, klaren Spalte.

### 3.2 Value Proposition – `/company/value-proposition`

- Das bestehende Markenversprechen wird als dominanter leuchtender „Command Statement“-Block gestaltet – nicht als gewöhnliches Zitat in einer Karte.
- Die drei bestehenden Nutzen werden als gleichwertige, technisch gerahmte Fintech-Panels inszeniert: sichtbare Hierarchie, Icon, Titel, Beschreibung und dezente Cyan-Lichtkante.
- Desktop/Tablet: dreigeteiltes Benefit-Deck mit gemeinsamer optischer Verbindung. Mobile: Statement, danach die drei Panels in stabiler Reihenfolge.

### 3.3 Gründung und Entwicklung – `/company/history`

- Die fünf existierenden Ereignisse werden nicht mehr als identische, vertikale Standardkarten dargestellt.
- Stattdessen entsteht eine leuchtende Unternehmens-Zeitachse: durchgehende Cyan-Achse, markante Zeitknoten, klar abgesetzte Ereignis-Panels und dezente Orange-Hervorhebung für Kapital-/Finanzierungsereignisse, wenn dies aus dem bestehenden Ereignistitel hervorgeht.
- Desktop/Tablet: alternierende oder zweispurige räumliche Zeitachse mit sichtbarer Entwicklung. Mobile: eine lineare Timeline mit Achse links und chronologisch lesbaren Ereigniskarten rechts.
- Datum, Titel und Beschreibung bleiben exakt die bestehenden DOM-Werte; keine neuen Meilensteine und keine umformulierten Fakten.

### 3.4 Sitz & Räumlichkeiten – `/company/location`

- Die einfache Tabelle wird zu einer „Headquarters“-Informationsansicht: eine dominierende Standort-/Adressfläche, darunter die vorhandenen Vertrags- und Kostendetails als klar gegliederte technische Daten-Panels.
- Eine optionale dekorative Hintergrundebene darf einen abstrakten urbanen Koordinaten-/Grundriss-Look zeigen. Sie enthält keine Ortsnamen, Zahlen, Kartenbeschriftungen, Logos oder UI.
- Die sechs bestehenden Details bleiben als vollständige, tabellarisch nachvollziehbare DOM-Daten erhalten. Auf Desktop dürfen sie als strukturierte Key-Value-Panels statt einer simplen Tabelle erscheinen; auf Mobile müssen sie linear lesbar bleiben.

## 4. Erlaubte technische Mittel

- Bestehende React-, Tailwind-, Design-Token-, Card- und Icon-Infrastruktur wiederverwenden. Keine neuen Pakete.
- Scopede CSS-Klassen nutzen das Präfix `unternehmen-v2-`; keine globale Umgestaltung anderer Routen.
- Dekorative WebP-Assets sind nur für sichtbare Tiefe zulässig, nie für Fakten. Jedes Asset ist kleiner als 320 KB, hat `alt=""` und `aria-hidden="true"` und wird in `public/assets/unternehmen/ASSET_SOURCE.md` mit Zweck, Herkunft, Maßen und Dateigröße dokumentiert.
- Keine Canvas-, WebGL- oder 3D-Bibliothek. Kein Monitorrahmen, keine kopierten Referenzbilder und keine KI-generierten Texte als Geschäftsinhalt.

## 5. Zulässige Dateien

| Datei oder Bereich | Aufgabe |
| --- | --- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_037B_EXECUTIVE_COCKPIT_VISUELLES_REDESIGN.md` | Diese Spezifikation. |
| `src/features/unternehmen/pages/IdeaPage.tsx` | Geschäftsidee neu inszenieren. |
| `src/features/unternehmen/pages/ValuePropositionPage.tsx` | Value Proposition neu inszenieren. |
| `src/features/unternehmen/pages/HistoryPage.tsx` | Unternehmens-Zeitachse umsetzen. |
| `src/features/unternehmen/pages/LocationPage.tsx` | Headquarters-Ansicht umsetzen. |
| `src/features/unternehmen/components/**` | Kleine, wiederverwendbare Darstellungsbausteine ausschließlich für diese vier Seiten. |
| `src/styles/global.css` | Nur `unternehmen-v2-`-Styles. |
| `public/assets/unternehmen/**` | Ausschließlich notwendige dekorative Visual-Assets samt `ASSET_SOURCE.md`. |
| `scripts/verifyUnternehmenCyberpunkDesign.ts` | Statischer Audit für Routen, Datenbindung, Asset-Hygiene und Scope. |
| `scripts/captureAuftrag037bGateScreenshots.mjs` | Screenshot-Harness für alle vier Routen. |
| `scripts/generateAuftrag037bScreenshotMatrix.mjs` | Matrix der vier Routen. |
| `docs/screenshots/auftrag-037b/**` | Vollseiten- und fokussierte Bildnachweise. |
| `docs/BUILD_LOG.md` | Builder-Bericht. |

## 6. Verbotene Änderungen

- Sidebar, Header, `SimulationBar`, Layout-Shell, Routing oder Navigation.
- `src/domain/unternehmenData.ts` und jede andere Domain-/Datenquelle.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/supabaseClient.ts`, `src/features/resources/**`, `src/features/crm/**`.
- Alle Dashboard-, Team-, Roadmap-, HR-, Produkt-, Markt-, Kunden-, Vertriebs-, Finanz-, Strategie- und Rechtsansichten.
- Package-Abhängigkeiten, `main`, Secrets und externe Anbindungen.

## 7. Verbindliche Abnahme

1. Jede der vier Routen besitzt auf 1440px eine sichtbar neue Cyberpunk-Fintech-Komposition; eine bloße neue Farbe für vorhandene Standardkarten genügt nicht.
2. Jede Route wird auf 1440px, 768px und 375px als Vollseiten-Screenshot erfasst. Zusätzlich gibt es je Route einen fokussierten Desktop-Ausschnitt der prägenden Visualisierung.
3. Auf 768px und 375px gilt 0px horizontaler Overflow; Texte überlagern sich nicht und alle Daten bleiben vollständig lesbar.
4. Geschäftsidee zeigt eine Signal-Map, Value Proposition ein Benefit-Deck, Geschichte eine leuchtende Timeline und Standort eine Headquarters-Datenansicht. Vier Standard-Card-Listen sind ein P1-Befund.
5. Codex nimmt zusätzlich zu Tests und Hashes die tatsächlichen Screenshots gegen die Referenzsprache visuell ab. Bis diese Abnahme erfolgt, keine Freigabe, kein Merge und keine Veröffentlichung.

## 8. Pflicht-Verifikation

```bash
npx tsx scripts/verifyUnternehmenCyberpunkDesign.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 44b5684..HEAD
git diff --exit-code 44b5684..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/domain/unternehmenData.ts src/components/layout src/app
node scripts/captureAuftrag037bGateScreenshots.mjs --stage=vorher
node scripts/captureAuftrag037bGateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag037bScreenshotMatrix.mjs
```

Die Übergabe enthält Commit-ID, Gate-Ergebnisse, die Matrix und eine kurze Gegenüberstellung: Referenzmerkmal → konkrete DOM-/Asset-Umsetzung je Seite. Kein Push.
