# Auftrag 129 – CRM Deals: Interaktive Kanban-Pipeline

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `d3fe131` (`main` nach PR #138) · **Branch:** `claude/auftrag-129-crm-deals-kanban`

## Anlass & Motivation

Im Rahmen der Plattform-Evolution (Paket 1 von 5 auf dem Weg zu v3.0.0, spezifiziert in `docs/superpowers/plans/2026-11-05-paket-1-crm-deals-kanban-plan.md`) wird die Deal-Pipeline unter `/crm/deals` erweitert. Bisher bot die Seite ausschließlich eine tabellarische Liste (`CrmResponsiveList`). Im Vertriebsalltag ist eine visuelle Kanban-Pipeline der Standard, um Deals nach Phasen zu überblicken, Engpässe zu erkennen und Deals per Drag & Drop oder Tastatur in die nächste Phase voranzutreiben.

## Ziel

1. **Ansichtsumschaltung (View Toggle):**
   - Nahtloser Umschalter in der Toolbar: **Tabelle** ⟷ **Kanban-Board**.
   - URL-synchron gesteuert über `?ansicht=kanban` (bzw. `tabelle`).
   - Bestehende Such- und Filterkriterien bleiben wirksam.
2. **Die 7 Vertriebsphasen:**
   - 7 Spalten gemäß `BASE_STAGE_OPTIONS` (`Lead eingegangen` bis `Deal gewonnen/verloren`).
   - Spaltenkopf mit Titel, Anzahl der Deals und dynamisch summierter Gesamtsumme in Euro.
   - Farblicher Erfolgsakzent für gewonnene Deals (`var(--mint-green)`) und gedämpfter Akzent für verlorene Deals.
3. **Deal-Karten (`DealKanbanCard.tsx`):**
   - Deal-Titel, Unternehmensbezug, formatierter Betrag (z. B. `45.000 €`), Abschlussdatum mit Fälligkeitsindikator.
   - Barrierefreies Aktionsmenü: *„In Phase verschieben → [Auswahl]“* für vollständige Tastaturbedienung.
4. **Drag & Drop Interaktion:**
   - HTML5 Drag & Drop zwischen Spalten mit visueller Hervorhebung der Zielspalte (`ring-2 ring-primary bg-primary/5`).
   - Optimistisches UI-Update: Sofortige Aktualisierung der Spalten und Phasensummen im Frontend.
5. **Responsivität & Budgets:**
   - Horizontales Scrolling mit mind. 280 px Spaltenbreite auf Desktop/Tablet.
   - Alle Dateien strikt $\le 400$ Zeilen.
6. **Schutzbereiche:**
   - `src/simulation/**`, `src/types/**`, etc. bleiben zu 100 % unberührt.

## Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/crm/components/DealsViewToggle.tsx` | Neu | Ansichtsumschalter (Tabelle / Kanban) |
| `src/features/crm/components/DealKanbanCard.tsx` | Neu | Einzelne Deal-Karte mit Betrag, Metadaten, DnD & Menü |
| `src/features/crm/components/KanbanColumn.tsx` | Neu | Spalte mit Kopf, Zähler, Summenanzeige und Drop-Zone |
| `src/features/crm/components/DealsKanbanBoard.tsx` | Neu | Hauptkomponente des Kanban-Boards, Spalten-Layout & DnD |
| `src/features/crm/pages/DealsPage.tsx` | Änderung | Einbindung des Umschalters und des Kanban-Boards |
| `src/features/crm/__tests__/DealsKanban.ui.vitest.tsx` | Neu | UI- und Interaktionstests für Spalten, Karten, DnD und Tastatur |
| `scripts/captureAuftrag129Gate.mjs` | Neu | Screenshot-Gate-Harness für Kanban- und Tabellenansicht |
| `docs/screenshots/auftrag-129/README.md` | Neu | Textuelle Vorher/Nachher-Matrix |
| `docs/BUILD_LOG.md`, dieser Auftrag | Dokumentation | Nachweis aller Gates |

## Globale Grenzen

Schutzbereiche (`CLAUDE.md` §6: `src/simulation/`, `src/types/`, `src/context/`, `src/services/data/`, `src/features/resources/`) bleiben zu 100 % unberührt. Keine neuen externen Abhängigkeiten.

## Tasks

- [ ] T1 Umschalter `DealsViewToggle.tsx` erstellen und in `DealsPage.tsx` integrieren (`?ansicht=kanban`).
- [ ] T2 Deal-Karte `DealKanbanCard.tsx` mit Betrag, Datum, Fälligkeitswarnung, Drag & Drop und barrierefreiem Tastaturmenü implementieren.
- [ ] T3 Spaltenkomponente `KanbanColumn.tsx` mit Kopf, Zähler, Gesamtsumme und Drop-Target erstellen.
- [ ] T4 Board `DealsKanbanBoard.tsx` mit den 7 Phasen, optimistischem Phasenwechsel und responsivem Layout implementieren.
- [ ] T5 `DealsPage.tsx` um Kanban-Modus erweitern und Zeilenbudget ($\le 400$ Zeilen) einhalten.
- [ ] T6 Vitest-Tests in `DealsKanban.ui.vitest.tsx` für Spalten, Summen, DnD und Tastatursteuerung schreiben.
- [ ] T7 Screenshot-Harness `scripts/captureAuftrag129Gate.mjs` und Matrix `docs/screenshots/auftrag-129/README.md` erstellen.
- [ ] T8 Gates grün fahren (`tsc`, `lint`, `format:check`, `verify`, `test`, `build`).
- [ ] T9 BUILD_LOG schreiben, Commit, Push, PR für Codex-Review öffnen.
