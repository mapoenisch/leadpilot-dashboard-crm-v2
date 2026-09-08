# Auftrag 032: CRM-Listen, Pipeline und Aktivitäten

> **Für ausführende Agenten:** Dieser Auftrag wird seriell bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Befund wird in `docs/BUILD_LOG.md` festgehalten.

**Phase:** Phase 3 – Statische Produktansichten im V2-Design
**Gate:** G16
**Status:** BEREIT ZUR AUSFÜHRUNG
**Baseline:** `c51c904` (`docs(build-log): mark Gate G15 as approved by review`)

## Ziel

Die vier bestehenden CRM-Routen erhalten die verbindliche LeadPilot-V2-Listenarchitektur. Alle vorhandenen Datenzugriffe, Filter, Suche, Tab-Wechsel und Navigationspfade bleiben funktional unverändert. Der Auftrag modernisiert ausschließlich Informationshierarchie, Tabellen-/Listenpräsentation, Statussemantik, Fokuszustände und die responsive Darstellung.

| Route | Bestehende Darstellung | Ergebnis dieses Auftrags |
|---|---|---|
| `/crm/leads` | Leads, Kontakte, Accounts, Funnel-Deals und Audit-Tabs | V2-CRM-Übersicht mit zugänglichen Tabs, Kennzahlen und responsiven Listen |
| `/crm/companies` | Account-Tabelle mit Suche und Branchenfilter | V2-Account-Liste mit sichtbarem Filterzustand und Mobile-Karten |
| `/crm/deals` | Deal-Tabelle mit Suche und Stage-Filter | V2-Pipeline mit klaren Spalten, Text-Status und Mobile-Karten |
| `/crm/activities` | Aktivitäten-Historie mit Suche und Typfilter | V2-Aktivitätenliste mit lesbarem Zeit-/Statuskontext und Mobile-Karten |

Alle Werte, Namen, Daten, Beträge, Stages, Aktivitätstypen und Quellen bleiben exakt aus den bestehenden Komponenten und Repository-Ergebnissen abgeleitet. Dieser Auftrag führt weder CRM-Schreibvorgänge noch Live-Daten, Simulationslogik oder neue fachliche Aussagen ein.

## Verbindliche visuelle Referenz

Die vollständige V2-Referenz ist [in `reference/leadpilot-v2-style/`](../../reference/leadpilot-v2-style/README.md) versioniert. Für diesen Auftrag ist besonders [der CRM-Entwurf](../../reference/leadpilot-v2-style/02-executive-scenarios-crm.png) maßgeblich: dunkle, klar geschichtete Datenflächen, präzise Linien, GlassCards, cyanfarbene Primärakzente, sparsame orange Warnakzente, textlich verständliche Status-Chips und gute Informationsdichte.

Die Referenz definiert keine neuen CRM-Daten und keine fixen Pixelkoordinaten. Farbe darf nie der einzige Bedeutungsträger sein. Status, Quelle und Filterzustand bleiben als Text oder in semantischer Struktur verständlich.

## Globale Grenzen

- Keine neuen npm-Abhängigkeiten, keine Änderung am Routing, an Route-Metadaten, an der App-Schale oder an der Sidebar.
- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**` und `src/features/resources/**` bleiben gegenüber `c51c904` exakt unverändert.
- Auch `src/services/db/**`, `src/services/import/**`, `src/components/ui/Table.tsx`, `src/app/**` und `src/features/crm/CRMView.tsx` sind **nicht** Bestandteil dieses Auftrags. Die vorhandene Repository-Schicht und das globale Table-Primitive bleiben unverändert.
- Bestehende V2-Primitives und CSS-Tokens wiederverwenden: insbesondere `SectionHeader`, `Card variant="glass"`, `Badge`, `Input`, `Select`, `Tabs` und `Button`.
- Die bestehenden Filter-, Such-, Tab- und Seed-Aktionen bleiben funktional erhalten. Keine neue Schreib-, Lösch-, Export-, Drag-and-Drop- oder Mass-Action-Funktion ergänzen.
- Kein horizontaler Body- oder interner Tabellen-/Container-Überlauf bei 1440 px, 768 px oder 375 px. Auf 375 px ist eine DOM-basierte Karten-/Definitionslistenansicht anstelle erzwungenen Tabellenscrollens erforderlich.
- Neue Animationen sind nicht erforderlich. Falls eine Transition ergänzt wird, respektiert sie `prefers-reduced-motion`.

## Ziel-Dateien

| Datei / Bereich | Verantwortung |
|---|---|
| `src/features/crm/pages/LeadsPage.tsx` | Bestehende Lead-/Kontakt-/Audit-Datenbindung und Tabs ausschließlich in eine V2-kompatible Darstellung überführen. |
| `src/features/crm/components/CompaniesView.tsx` | V2-Account-Liste, Suche und Branchenfilter ohne Änderung der Datenabfrage. |
| `src/features/crm/components/DealsView.tsx` | V2-Pipeline mit Stage-Filter und klarer Status-/Betragsdarstellung ohne Änderung der Datenabfrage. |
| `src/features/crm/components/ActivitiesView.tsx` | V2-Aktivitätenliste ohne Änderung der vorhandenen Baseline- oder Simulationsdatenanbindung. |
| `src/features/crm/components/CrmResponsiveList.tsx` | Neue, CRM-lokale semantische Desktop-/Mobile-Darstellung für vorhandene Listeninhalte; ersetzt das globale `Table`-Primitive nicht. |
| `src/styles/global.css` | Ausschließlich eng abgegrenzte Klassen mit Präfix `crm-v2-` für CRM-Listen, Filterleisten und mobile Verdichtung. Keine globalen Token- oder Layout-Änderungen. |
| `scripts/captureAuftrag032GateScreenshots.mjs` | Robuster CDP-Harness für die vier G16-Routen und die bestehende vollständige Routenmatrix. |
| `scripts/generateAuftrag032ScreenshotMatrix.mjs` | SHA-256-Matrix für die zwölf Vorher-/Nachher-Paare. |
| `docs/screenshots/auftrag-032/` | Screenshot-Artefakte und Matrix-README. |
| `docs/BUILD_LOG.md` | Builder-Bericht und späterer unabhängiger Review-Befund. |

## Umsetzungsanforderungen

### 1. Gemeinsame CRM-Listenarchitektur

- `CrmResponsiveList` enthält auf Desktop und Tablet eine echte HTML-Tabelle mit `caption`, `thead`, `th scope="col"` und `tbody`.
- Auf Mobile wird dieselbe Information als semantische DOM-Kartenliste ausgegeben. Jede Karte besitzt eine erkennbare Überschrift und benannte Wertpaare; sie darf keine Fachinformation der Desktop-Zeile ausblenden.
- Desktop-Tabelle und Mobile-Karte werden über CSS-Breakpoints umgeschaltet. Es gibt keine doppelte Datenberechnung, keine horizontal scrollende Ersatzansicht und keine tabellenweite Mindestbreite auf 375 px.
- Leere und Ladezustände bleiben als Text sichtbar. Sie verwenden dieselben bestehenden Datenquellen und dürfen keine neuen Fallbackwerte erzeugen.

### 2. Leads & Kontakte

- Alle vier vorhandenen Tabs bleiben erhalten: Kontakte, Unternehmen, Funnel Deals sowie Supabase & Import Audit. Tab-Texte und Zählwerte bleiben aus den vorhandenen States abgeleitet.
- Die Kennzahlenkarten bleiben vollständig erhalten, werden aber als V2-GlassCards mit lesbarer Zahl-, Kontext- und Quellenhierarchie dargestellt.
- Die existierenden Tabelleninhalte bleiben sichtbar: Kontakte zeigen Name, E-Mail, Rolle und zugeordnetes Unternehmen; Unternehmen zeigen Name, Domain, Branche, Stadt, PLZ und Mitarbeiter; Funnel Deals zeigen Name, Stage, Betrag, Abschlussdatum und Pipeline.
- Der Audit-Tab behält die bestehende Seed-Aktion, den Ladezustand und den bestehenden Ergebnistext. Der Button bleibt ein echter `button`, sein Ladezustand bleibt zugänglich und es entsteht keine zusätzliche Schreibfunktion.

### 3. Accounts und Filterzustand

- Die bestehende Suche über Unternehmensname, Domain und Stadt sowie der Branchenfilter bleiben unverändert wirksam.
- Die Filterleiste hat auf allen Zielbreiten eine sichtbare Beschriftung. Auf 375 px werden Suche und Select vertikal gestapelt, ohne Überlappung oder abgeschnittene Labels.
- Die Liste zeigt weiterhin Unternehmensname, Domain, Branche, Stadt, PLZ und Mitarbeiterzahl. Fachliche Kennzahlen wie „Schwerpunkt: Maschinenbau & IT“ werden weder ergänzt noch umgedeutet.
- Der aktive Filterzustand ist über den ausgewählten Wert und eine textliche Ergebnisanzahl wahrnehmbar, nicht nur über Farbe.

### 4. Deal-Pipeline und Statussemantik

- Die vorhandene Suche über Dealname/Pipeline und der Stage-Filter bleiben unverändert wirksam.
- Auf Desktop und Tablet erscheint die Pipeline als klar strukturierte Spaltenansicht für Deal, Stage, Volumen, Abschlussdatum und Pipeline. Sie bleibt eine Leseansicht; es gibt kein Drag-and-Drop und keine Stage-Änderung.
- Jeder Stage-Badge enthält unverändert den fachlichen Stage-Text. Insbesondere „gewonnen“ und „verloren“ bleiben ausgeschrieben und werden nicht ausschließlich mit Cyan, Orange oder Grau unterschieden.
- Auf Mobile zeigt jede Deal-Karte Dealname, Stage, Volumen, Abschlussdatum und Pipeline vollständig. Ein Betrag, ein Datum oder ein Status darf nicht hinter einem Scrollbereich verschwinden.

### 5. Aktivitäten-Historie

- Suche und Aktivitätstyp-Filter bleiben unverändert wirksam. Die bestehende Kombination aus vorhandenen Simulationsaktivitäten/-events und den kanonischen Basisaktivitäten wird nicht verändert.
- Die Ansicht zeigt Zeitpunkt, Aktivitätstyp, Akteur, Bezug, Details und vorhandenen Status vollständig. Status bleibt als Text-Badge lesbar.
- Mobile Karten priorisieren in dieser Reihenfolge: Zeitpunkt und Typ, Bezug/Akteur, Details, Status. Die DOM-Reihenfolge bleibt logisch und ohne visuelle Reihungstricks lesbar.
- Es werden keine neuen Aktivitäten, Personen, Deals, Termine oder Quellen erzeugt.

### 6. Zugänglichkeit und Responsive-Verhalten

- Suche erhält einen zugänglichen Namen; Selects behalten sichtbare Labels. Ergebnisanzahlen werden über einen kurzen `aria-live="polite"`-Text aktualisiert.
- Alle bestehenden interaktiven Elemente bleiben per Tastatur erreichbar. Fokus bleibt sichtbar; keine klickbaren `div`- oder `span`-Elemente einführen.
- Status enthält immer Text. Dekorative Icons werden für Screenreader verborgen.
- Die drei Zielbreiten 1440 × 900, 768 × 1024 und 375 × 812 sind verbindlich. Auf 375 px dürfen Filter, Suche, Kennzahlen, Tab-Navigation, Zeilen/Karten und die vorhandene Seed-Aktion nicht kollidieren oder horizontal scrollen.

## Nicht Bestandteil dieses Auftrags

- Keine Änderungen an CRM-Datenmodellen, Repositories, Import, Seed-Logik, Supabase, Datenquellen, Persistenz oder Zugriffsrechten.
- Keine Änderung der Simulation, des `SimulationContext`, der Events oder der Initial-Aktivitäten.
- Keine Änderung von `src/components/ui/Table.tsx`, Navigation, App-Schale, Route-Metadaten oder `Internal Resources`.
- Keine neuen Produktdaten, Vertriebsprognosen, Conversion-Raten, Pipeline-Phasen, Aktivitäten oder Quellenbehauptungen.
- Keine Realtime-Funktion, keine Chart-Migration, keine Motion-Bibliothek und keine Release-Versionierung.

## Screenshot- und Gate-Harness

Vor der visuellen Umsetzung werden die vier Baseline-Seiten auf `c51c904` als `vorher` erfasst. Danach erfasst der Harness die gleiche Matrix als `nachher`:

| Seite | Route | Viewports |
|---|---|---|
| Leads & Kontakte | `/crm/leads` | 1440 × 900, 768 × 1024, 375 × 812 |
| Unternehmen | `/crm/companies` | 1440 × 900, 768 × 1024, 375 × 812 |
| Deal Pipeline | `/crm/deals` | 1440 × 900, 768 × 1024, 375 × 812 |
| Aktivitäten-Historie | `/crm/activities` | 1440 × 900, 768 × 1024, 375 × 812 |

Der Harness orientiert sich am robusten Lebenszyklus von Gate G15:

- freie Preview- und CDP-Ports vor dem Start ermitteln;
- je Lauf ein eindeutiges temporäres Chrome-Profil verwenden;
- Preview und Chrome kontrolliert beenden, auf ihre Exit-Events warten und das Profil erst danach bereinigen;
- bei Dokument-Overflow, internem horizontalen Listen-/Tabellen-Scroll, abweichendem Seitentitel oder einem Prozessfehler mit Exit ungleich 0 abbrechen;
- alle 41 Routen aus `APP_ROUTES` mit Route-Titel und 0 px Body-Overflow prüfen.

`generateAuftrag032ScreenshotMatrix.mjs` prüft für jedes der zwölf Paare den SHA-256-Hash. Erwartet sind `12/12 DISTINCT`; Matrix und Ausnahmen werden in `docs/screenshots/auftrag-032/README.md` festgehalten.

## Verifikation und Abnahme

Alle folgenden Befehle laufen gegen die Baseline `c51c904` und müssen mit Exit 0 enden:

```bash
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check c51c904..HEAD
git diff --exit-code c51c904..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
node scripts/captureAuftrag032GateScreenshots.mjs --stage=nachher
node scripts/generateAuftrag032ScreenshotMatrix.mjs
```

Die Abnahme setzt voraus:

1. die vier CRM-Routen behalten ihre bestehenden Datenbindungen, Funktionen, Filter, Suche, Tabs und die Seed-Aktion vollständig bei;
2. alle fachlichen Tabelleninformationen sind auf 1440 px, 768 px und 375 px ohne horizontalen Container- oder Body-Überlauf zugänglich;
3. alle Status sind als Text verständlich und nicht nur farblich codiert;
4. Filter, Suche, Tabs und Seed-Aktion sind per Tastatur bedienbar und haben sichtbaren Fokus;
5. zwölf Screenshot-Paare sind `DISTINCT`, der Deep-Link- und Titeltest besteht 41/41 Routen;
6. die Schutzbereichs-Prüfung liefert exakt 0 Zeilen Diff;
7. Builder-Bericht und unabhängiger Review-Befund stehen im `docs/BUILD_LOG.md`.
