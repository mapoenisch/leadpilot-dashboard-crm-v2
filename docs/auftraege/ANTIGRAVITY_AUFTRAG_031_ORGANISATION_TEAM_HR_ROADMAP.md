# Auftrag 031: Organisation, Team, HR und Roadmap

> **Für ausführende Agenten:** Dieser Auftrag wird seriell bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Befund wird in `docs/BUILD_LOG.md` festgehalten.

**Phase:** Phase 3 – Statische Produktansichten im V2-Design
**Gate:** G15
**Status:** BEREIT ZUR AUSFÜHRUNG
**Baseline:** `981b370` (`docs(build-log): mark Gate G14 as approved on commit 3d364d8`)

## Ziel

Die vier statischen Seiten für Organisation und Produkt-Roadmap erhalten die verbindliche LeadPilot-V2-Bildsprache: klare Management-Hierarchie, dunkle Glasflächen, präzise Linien, leuchtende Akzente und auf allen Zielbreiten lesbare Informationsdichte.

Betroffen sind ausschließlich:

| Route | Page | Inhalt |
|---|---|---|
| `/organisation/headcount` | `HeadcountPage.tsx` | Headcount-Verlauf und Teamkapazität |
| `/organisation/hr` | `HrPage.tsx` | HR-Kennzahlen |
| `/organisation/team` | `TeamStructurePage.tsx` | Teamstruktur und Engpässe |
| `/product/roadmap` | `RoadmapPage.tsx` | Release-Historie und Roadmap 2026 |

Alle Werte bleiben statisch und stammen ausschließlich aus `src/domain/organisationData.ts` beziehungsweise `src/domain/produktData.ts`. Es gibt keine Realtime-Anzeige, keine Simulationsdaten und keine neuen fachlichen Fakten.

## Verbindliche visuelle Referenz

Die vollständige V2-Referenz ist [in `reference/leadpilot-v2-style/`](../../reference/leadpilot-v2-style/README.md) versioniert. Für diesen Auftrag sind besonders relevant:

- [Executive-, Organisations- und Mobile-Entwurf](../../reference/leadpilot-v2-style/01-executive-organisation-mobile.png): Informationshierarchie, leuchtende Kartenränder, Organigramm-Layer und mobile Verdichtung.
- [Executive-, Szenario- und CRM-Entwurf](../../reference/leadpilot-v2-style/02-executive-scenarios-crm.png): Kartenrhythmus, Typografie, Status-Chips und Tabellen-/Listenkomposition.

Die Referenzen definieren die visuelle Sprache, aber weder Produktdaten noch fixe Pixelkoordinaten. Die Umsetzung übernimmt die Gesamtwirkung – tiefe Grün-/Schwarzflächen, transparente Layer, Cyan-/Türkis-/Mint-/Orange-Akzente und feine Glow-Linien – ohne eine generische Komponentenbibliotheksoptik zu erzeugen. Farbe darf nie der einzige Bedeutungsträger sein; Engpässe, Status und Zeitbezug bleiben als Text, Icon oder Struktur verständlich.

Die fiktiven Standortfotos der Anwendung sind nicht Gegenstand dieses Auftrags und erhalten keinen Stilfilter.

## Globale Grenzen

- Keine neuen npm-Abhängigkeiten, keine Änderung am Routing, an der App-Schale oder an Route-Metadaten.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**` und `src/features/resources/**` bleiben gegenüber `981b370` exakt unverändert.
- Alle fachlichen Werte, Namen, FTE-Angaben, Datumsangaben und Status stammen aus den vorhandenen Domain-Daten. Eine Datenform darf für die Darstellung typisiert werden, aber Werte und Aussagen dürfen nicht ergänzt, umgerechnet oder umgedeutet werden.
- Bestehende V2-Primitives und CSS-Tokens werden wiederverwendet: insbesondere `SectionHeader`, `Card variant="glass"`, `Badge`, `Alert`, `ChartFrame` und `SimpleChart`.
- Kein horizontaler Body- oder interner Tabellen-/Container-Überlauf bei 1440 px, 768 px oder 375 px. Für diese vier Seiten keine erzwungene Tabellen-Mindestbreite und kein notwendiges horizontales Scrollen.
- Neue Animationen sind nicht erforderlich. Dekorative Layer bleiben statisch; falls doch eine Transition ergänzt wird, respektiert sie `prefers-reduced-motion`.

## Ziel-Dateien

| Datei / Bereich | Verantwortung |
|---|---|
| `src/domain/organisationData.ts` | Bestehende Organisationsdaten gegebenenfalls in klar typisierte, wiederverwendbare Darstellungsstrukturen überführen – ohne Werteänderung. |
| `src/domain/produktData.ts` | Nur falls für eine typisierte Timeline-Darstellung erforderlich; die `ROADMAP.releases` bleiben inhaltlich identisch. |
| `src/features/organisation/components/OrganisationUnitCard.tsx` | Neue semantische DOM-Karte für eine Organisationseinheit. |
| `src/features/organisation/components/OrganisationStructure.tsx` | Neue DOM-first-Struktur für das Organigramm, inklusive dekorativer Connector-Layer. |
| `src/features/organisation/pages/HeadcountPage.tsx` | V2-Redesign für Headcount und Kapazitätsübersicht. |
| `src/features/organisation/pages/HrPage.tsx` | V2-Redesign für HR-Kennzahlen. |
| `src/features/organisation/pages/TeamStructurePage.tsx` | Hybride, zugängliche Teamstruktur mit Engpassanalyse. |
| `src/features/produkt/pages/RoadmapPage.tsx` | V2-Redesign als responsive Release-Timeline. |
| `src/styles/global.css` | Nur eng abgegrenzte, responsive Klassen für Organigramm und Timeline. Keine globale Token- oder Layout-Änderung. |
| `public/assets/organisation/team-structure-backdrop.webp` | Neues, selbst erstelltes, ausschließlich dekoratives Hintergrundasset für die Teamstruktur. |
| `public/assets/organisation/ASSET_SOURCE.md` | Provenienz, Nutzungszweck, Abmessungen und finale Dateigröße des dekorativen Assets. |
| `scripts/captureAuftrag031GateScreenshots.mjs` | Robuster CDP-Harness für die vier G15-Seiten und die 41 Routen. |
| `scripts/generateAuftrag031ScreenshotMatrix.mjs` | SHA-256-Matrix für die 12 Vorher-/Nachher-Paare. |
| `docs/screenshots/auftrag-031/` | Screenshot-Artefakte und Matrix-README. |
| `docs/BUILD_LOG.md` | Builder-Bericht und späterer unabhängiger Review-Befund. |

## Umsetzungsanforderungen

### 1. Datenbindung und sichtbarer Zeitbezug

- `HeadcountPage`, `HrPage` und `TeamStructurePage` kennzeichnen ihre statische Sicht sichtbar mit „Personalbestand 2025“ beziehungsweise „Stand: 31.12.2025“, sofern die vorhandenen Daten diesen Stand ausweisen.
- `RoadmapPage` kennzeichnet die Ansicht als „Release-Historie & Planung 2026“. Die Werte aus `ROADMAP.releases` bleiben mit ihren vorhandenen Quartals-/Versions- und Statusangaben sichtbar.
- Die vorhandenen Inhalte aus `HEADCOUNT.rows`, `HEADCOUNT.chart`, `HR.metrics`, `TEAM.title`, `TEAM.bottlenecks` und `ROADMAP.releases` bleiben vollständig erhalten. Eine Verdichtung darf keine Zeile oder Aussage verschlucken.
- Fallbackwerte wie hartcodierte FTE-Zahlen, Namen, Quartale oder Status sind unzulässig. Kurz-Karten und Diagramm-Nodes leiten ihre sichtbaren Werte aus den Domain-Daten ab.

### 2. Headcount-Entwicklung

- Die bestehende Linie aus `HEADCOUNT.chart` bleibt in einem V2-`ChartFrame` erhalten; Quelllabel: „Personalbestand 2025“.
- Eine V2-Kapazitätssektion zeigt alle Einheiten aus `HEADCOUNT.rows` als responsive DOM-Zeilen oder Karten. Die Summenzeile „Gesamtbestand 31.12.2025“ bleibt optisch hervorgehoben, aber fachlich unverändert.
- Auf schmalen Viewports wird jede Einheit einzeilig gestapelt: Rolle, FTE und Besetzungsinformation bleiben vollständig lesbar und umbrechen natürlich.

### 3. HR-Kennzahlen

- Alle sechs Einträge aus `HR.metrics` werden als V2-GlassCards mit klarer Zahlen-/Kontext-Hierarchie gezeigt.
- Die Seite beschreibt ausschließlich die vorhandenen Kennzahlen: Personalbestand, durchschnittlicher Personalbestand, Fluktuation, Arbeitgeber-Gesamtkosten, Personalaufwand und Remote-Anteil. Die bisher unbelegte Aussage „Mitarbeiterzufriedenheit und Bindung“ wird nicht fortgeführt.
- Die Fluktuation bleibt mit dem vorhandenen Benchmark-Text sichtbar. Ist ein Hinweis- oder Warnstatus grafisch akzentuiert, enthält er zusätzlich den erklärenden Text und ist nicht nur über Farbe unterscheidbar.

### 4. Teamstruktur und Engpässe

- Die Teamstruktur wird als echte DOM-Struktur umgesetzt, nicht als Bild, Canvas oder SVG mit eingebranntem Text. Jede Einheit hat eine semantische Überschrift, FTE-Wert und die vorhandene Besetzungsinformation.
- Das Organigramm zeigt CEO / Ops als Wurzel und die vorhandenen Funktionsbereiche Engineering / Product, Sales, Customer Success und Marketing als gleichrangige Einheiten. Diese Rollen-, FTE- und Besetzungsinformationen stammen aus `HEADCOUNT.rows`.
- Verbindungs- und 3D-Layer sind dekorativ (`aria-hidden`) und dürfen die DOM-Reihenfolge, den Fokusfluss oder die Lesbarkeit nicht beeinflussen. Auf 768 px und 375 px wechseln die Karten in eine lineare, logisch lesbare Reihenfolge; Connectoren dürfen dort reduziert oder ausgeblendet werden.
- `TEAM.bottlenecks` wird vollständig als separate Engpassanalyse ausgegeben. Jeder Eintrag behält seinen Text; ein Icon/Badge darf ergänzen, niemals den Text ersetzen.

#### Dekoratives WebP-Asset

- Erzeuge genau ein selbst erstelltes, abstraktes WebP: dunkle topografische/technische Netzwerkfläche mit dezenten cyan- und orangefarbenen Lichtkanten, ohne Text, Zahlen, Personen, Logos, Organigramm-Boxen oder fachliche Symbole.
- Ablage: `public/assets/organisation/team-structure-backdrop.webp`. Das Bild liegt ausschließlich hinter den DOM-Karten, hat keinen Informationsgehalt und wird bei fehlender Datei durch eine tokenbasierte CSS-Fläche ersetzt.
- Das eingebundene Bild ist dekorativ (`alt=""`, `aria-hidden="true"`), erhält feste `width`/`height`-Angaben sowie `loading="lazy"`. Die Karteninhalte müssen bei deaktivierten Bildern und bei Ladevorgang vollständig nutzbar bleiben.
- Budget: maximal 320 KB als WebP. In `public/assets/organisation/ASSET_SOURCE.md` stehen mindestens Dateiname, Abmessungen, finale Byte-/KB-Größe, Erstellungsdatum, Quelle „selbst erstellt“, der verwendete Prompt in Kurzform und der Hinweis „dekorativ, keine Produktdaten“.

### 5. Releases & Roadmap

- `RoadmapPage` ersetzt die starre Tabelle durch eine semantische, vertikale V2-Timeline. Jede Zeile aus `ROADMAP.releases` bildet einen Timeline-Eintrag mit Quartal/Version, Titel, Status und Beschreibung.
- „Released“, „In Entwicklung“ und „Geplant“ bleiben als lesbarer Status-Text erhalten. Visuelle Akzentfarben können sich unterscheiden, aber ihr Bedeutungsunterschied wird nie nur über Farbe vermittelt.
- Die Timeline zeigt historische Releases und Planung in einer klaren Zeitfolge. Sie erfindet weder Termine, Abhängigkeiten, Prognosen noch Fortschrittswerte.
- Auf Mobile ist die Timeline einspaltig; kein Teil einer Beschreibung oder eines Badges wird hinter einer horizontalen Scrollfläche verborgen.

### 6. Zugänglichkeit und Responsive-Verhalten

- Semantische Überschriftenhierarchie innerhalb jeder Karte; keine klickbaren `div`-/`span`-Elemente. Dieser Auftrag führt keine neuen Interaktionen ein.
- Dekorative Icons und das WebP sind für Screenreader verborgen. Alle fachlichen Informationen sind als Text im DOM vorhanden.
- Status nutzt mindestens Text plus Struktur/Badge; Kontrast, Fokuszustände und `prefers-reduced-motion` bleiben mit den bestehenden V2-Primitives kompatibel.
- Die drei Zielbreiten 1440 px, 768 px und 375 px sind verbindlich. Die mobile Ansicht priorisiert Reihenfolge und Lesbarkeit vor 3D-Dekor und seitlicher Verdichtung.

## Nicht Bestandteil dieses Auftrags

- Keine Änderungen an Simulation, Realtime/Supabase/n8n, Datenquellen, Persistenz, Berechnungen oder CRM.
- Keine Umgestaltung anderer Produktseiten, der Navigation, der App-Schale oder von `Internal Resources`.
- Keine neuen Produktdaten, HR-Prognosen, Recruiting-Pipeline, Mitarbeiterfotos oder fachlichen Organigramm-Fakten.
- Keine Anwendung des V2-Stils auf Standortfotografie.

## Screenshot- und Gate-Harness

Vor der visuellen Umsetzung werden die vier Baseline-Seiten auf `981b370` als `vorher` erfasst. Danach erfasst der Harness die gleiche Matrix als `nachher`:

| Seite | Route | Viewports |
|---|---|---|
| Headcount | `/organisation/headcount` | 1440 × 900, 768 × 1024, 375 × 812 |
| HR | `/organisation/hr` | 1440 × 900, 768 × 1024, 375 × 812 |
| Teamstruktur | `/organisation/team` | 1440 × 900, 768 × 1024, 375 × 812 |
| Roadmap | `/product/roadmap` | 1440 × 900, 768 × 1024, 375 × 812 |

Der neue Harness orientiert sich am robusten Lebenszyklus von Gate G14:

- freie Preview- und CDP-Ports vor dem Start ermitteln;
- je Lauf ein eindeutiges temporäres Chrome-Profil verwenden;
- Preview und Chrome kontrolliert beenden, auf ihre Exit-Events warten und das Profil erst danach bereinigen;
- bei Dokument-Overflow, internem horizontalen Container-/Tabellen-Scroll, abweichendem Seitentitel oder einem Prozessfehler mit Exit ungleich 0 abbrechen;
- alle 41 Routen aus `APP_ROUTES` mit Route-Titel und 0 px Body-Overflow prüfen.

`generateAuftrag031ScreenshotMatrix.mjs` prüft für jedes der 12 Paare den SHA-256-Hash. Erwartet sind `12/12 DISTINCT`; die Matrix und eventuelle Ausnahmen werden in `docs/screenshots/auftrag-031/README.md` festgehalten.

## Verifikation und Abnahme

Alle folgenden Befehle laufen gegen die Baseline `981b370` und müssen mit Exit 0 enden:

```bash
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 981b370..HEAD
git diff --exit-code 981b370..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
node scripts/captureAuftrag031GateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag031ScreenshotMatrix.mjs
```

Die Abnahme setzt voraus:

1. alle vier Seiten sind ausschließlich aus ihren vorhandenen statischen Daten gespeist;
2. Teamstruktur und Engpässe bleiben ohne Bild vollständig verständlich;
3. das WebP ist rein dekorativ, dokumentiert und innerhalb des Budgets;
4. 12/12 Screenshot-Paare sind `DISTINCT`, ohne horizontalen Body- oder internen Scroll-Überlauf;
5. der Deep-Link- und Titeltest besteht 41/41 Routen;
6. die Schutzbereichs-Prüfung liefert exakt 0 Zeilen Diff;
7. Builder-Bericht und unabhängiger Review-Befund stehen im `docs/BUILD_LOG.md`.
