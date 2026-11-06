# Auftrag 130 – CRM Leads: Lead-Scoring & Qualifizierungs-Cockpit

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `c11d53f` (`main` nach PR #139) · **Branch:** `claude/auftrag-130-crm-lead-scoring`

## Anlass & Motivation

Im Rahmen der Plattform-Evolution (Paket 2 von 5 auf dem Weg zu v3.0.0, spezifiziert in `docs/superpowers/plans/2026-11-05-paket-2-crm-lead-scoring-plan.md`) wird die Leads- und Kontaktansicht unter `/crm/leads` erweitert. Bisher listet die Seite Kontakte in einer einfachen Tabelle auf, ohne dass für den Vertrieb erkennbar ist, welche Leads die höchste Abschlusswahrscheinlichkeit besitzen oder ideal zum Kundenprofil (ICP) passen.

Paket 2 führt ein transparentes, regelbasiertes Lead-Scoring (ICP-Fit), einen barrierefreien Qualifizierungs-Drawer und einen geführten 1-Klick-Workflow zur Konvertierung qualifizierter Leads in Deals ein.

## Ziel

1. **ICP-Lead-Scoring Engine (`leadScoringService.ts`):**
   - Regelbasiertes, deterministisches Berechnungsmodell (0–100 Punkte / %) basierend auf Faktenblatt v1.2 und `kundenData.ts`:
     - Region / Standort: DACH-Raum (Deutschland, Österreich, Schweiz) = **+30 Punkte**.
     - Unternehmensgröße (Headcount): 20 bis 250 Mitarbeiter (Sweet-Spot für B2B SaaS) = **+30 Punkte** (andere Größen: 10–20 Punkte).
     - Branche / Vertikale: B2B Software, IT, Professional Services = **+20 Punkte** (sonstige 10 Punkte).
     - Interaktionsgrad / Quelle: Demo-Anfrage, Webinar oder Empfehlung = **+20 Punkte** (Content-Download: 10 Punkte).
   - Klassifikation:
     - 🔥 **Hot Lead (≥ 80 %):** Höchste Vertriebspriorität.
     - 🟡 **Warm Lead (50–79 %):** Reif für Nurturing oder Bedarfsanalyse.
     - ❄️ **Cold Lead (< 50 %):** Außerhalb des Kern-ICP oder unvollständige Daten.
2. **Visuelle Score-Darstellung (`LeadScoreBadge.tsx`):**
   - Transparenter Score-Badge in der Kontakttabelle mit Icon (🔥, 🟡, ❄️), Prozentwert und Tooltip mit Punkteaufschlüsselung.
   - Barrierefreie Screenreader-Ansage der Qualitätsstufe und Einzelkriterien.
3. **Qualifizierungs-Drawer (`LeadQualificationDrawer.tsx`):**
   - Klick auf einen Kontakt öffnet eine barrierefreie Detailübersicht (Drawer/Dialog) mit:
     - Kriterienübersicht und Fit-Faktoren.
     - Interaktiver BANT-Checkliste (Budget, Authority, Need, Timeline).
     - Notizfeld für das Erstgespräch.
4. **1-Klick-Aktion „In Deal umwandeln“ (`LeadConversionModal.tsx`):**
   - Geführter Konvertierungsdialog:
     - Deal-Name (vorbefüllt z. B. `[Unternehmen] – LeadPilot Enterprise`).
     - Geschätzter Betrag basierend auf Mitarbeiterzahl.
     - Startphase (standardmäßig `Erstgespräch geführt` oder `Bedarfsanalyse`).
     - Referenz zum Kontakt und Unternehmen.
   - Nach Bestätigung wird der Deal angelegt und der Lead als qualifiziert markiert.
5. **Qualitätsfilter in der Filterleiste:**
   - Dropdown-Filter für Kontakte: `Qualität: Alle | 🔥 Hot Leads (≥ 80%) | 🟡 Warm (50–79%) | ❄️ Cold (< 50%)`.
   - URL-Synchronisation über `?qualitaet=hot|warm|cold|ALL`.
6. **Modularisierung von `LeadsPage.tsx` ($\le 400$ Zeilen):**
   - `LeadsPage.tsx` (bisher 422 Zeilen) wird modularisiert, damit alle betroffenen Dateien strikt $\le 400$ Zeilen einhalten.
7. **Schutzbereiche:**
   - `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben zu 100 % unberührt (Diff = 0).

## Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/crm/services/leadScoringService.ts` | Neu | ICP-Scoring-Algorithmus, Klassifikation & BANT-Logik |
| `src/features/crm/components/LeadScoreBadge.tsx` | Neu | Visuelle Score-Pille mit Tooltip & Screenreader-Support |
| `src/features/crm/components/LeadQualificationDrawer.tsx` | Neu | Qualifizierungs-Drawer mit BANT-Checkliste & Details |
| `src/features/crm/components/LeadConversionModal.tsx` | Neu | Konvertierungs-Modal von Lead zu Deal |
| `src/features/crm/utils/leadsPageConfig.ts` | Neu | Tabellen- und Spaltenkonfiguration zur Modularisierung ($\le 400$ Zeilen) |
| `src/features/crm/pages/LeadsPage.tsx` | Änderung | Einbindung von Score-Spalte, Qualitätsfilter, Drawer & Modal |
| `src/features/crm/__tests__/leadScoring.unit.vitest.ts` | Neu | Unit-Tests für Scoring-Berechnung und Grenzwerte |
| `src/features/crm/pages/__tests__/LeadsPage.scoring.ui.vitest.tsx` | Neu | UI- und Integrationstests für Badges, Filter, Drawer & Konvertierung |
| `scripts/captureAuftrag130Gate.mjs` | Neu | Screenshot-Gate-Harness für Leads-Scoring |
| `docs/screenshots/auftrag-130/README.md` | Neu | Vorher/Nachher-Screenshot-Matrix |
| `docs/BUILD_LOG.md`, dieser Auftrag | Dokumentation | Nachweis aller Gates |

## Globale Grenzen

Schutzbereiche (`CLAUDE.md` §6: `src/simulation/`, `src/types/`, `src/context/`, `src/services/data/`, `src/features/resources/`) bleiben zu 100 % unberührt. Keine neuen externen Abhängigkeiten. Alle TypeScript-Dateien strikt $\le 400$ Zeilen.

## Tasks

- [ ] T1 Scoring-Engine `src/features/crm/services/leadScoringService.ts` implementieren (ICP-Fit 0–100, DACH, MA-Größe, Branche, Quelle, BANT).
- [ ] T2 Unit-Tests `src/features/crm/__tests__/leadScoring.unit.vitest.ts` schreiben und verifizieren.
- [ ] T3 UI-Komponente `src/features/crm/components/LeadScoreBadge.tsx` mit Farbchips, Icons und barrierefreiem Tooltip erstellen.
- [ ] T4 `src/features/crm/components/LeadQualificationDrawer.tsx` (Drawer mit Scoring-Kriterien, BANT-Checkliste, Notizen) implementieren.
- [ ] T5 `src/features/crm/components/LeadConversionModal.tsx` (Deal-Konvertierung mit Vorbefüllung) implementieren.
- [ ] T6 `src/features/crm/utils/leadsPageConfig.ts` erstellen und `src/features/crm/pages/LeadsPage.tsx` modularisieren ($\le 400$ Zeilen).
- [ ] T7 UI- und Integrationstests `src/features/crm/pages/__tests__/LeadsPage.scoring.ui.vitest.tsx` schreiben.
- [ ] T8 Screenshot-Harness `scripts/captureAuftrag130Gate.mjs` und Matrix `docs/screenshots/auftrag-130/README.md` erstellen.
- [ ] T9 Alle Gates grün fahren (`tsc`, `lint`, `format:check`, `verify`, `test`, `build`, Schutzbereichs-Diff) und in `docs/BUILD_LOG.md` dokumentieren.
- [ ] T10 Committen, auf `claude/auftrag-130-crm-lead-scoring` pushen und PR für Codex-Review öffnen.
