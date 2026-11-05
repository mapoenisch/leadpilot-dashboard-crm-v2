# LeadPilot – Paket 1: CRM Deals Interaktive Kanban-Pipeline

> **Kontext:** Teil 1 des Master-Plans `2026-11-05-crm-analytics-master-plan.md`.  
> **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_129_CRM_DEALS_KANBAN.md`  
> **Branch:** `claude/auftrag-129-crm-deals-kanban`  
> **Ziel-Route:** `/crm/deals`

---

## 1. Motivation & Ausgangslage

Aktuell bietet `/crm/deals` eine tabellarische Liste (`CrmResponsiveList`) mit Pagination und Sortierung. Im Vertriebsalltag ist jedoch eine visuelle Pipeline (Kanban) der Standard, um Deals nach Phasen zu überblicken, Engpässe zu erkennen und Deals per Drag & Drop in die nächste Phase voranzutreiben.

---

## 2. Fachliche & Technische Spezifikation

### 2.1 Ansichtsumschaltung (View Toggle)
- In der Toolbar neben dem Export-Button wird ein Umschalter integriert:
  - Button 1: **Tabelle** (Tabellen-Icon)
  - Button 2: **Kanban-Board** (Kanban/Columns-Icon)
- Gesteuert über den URL-Parameter `?ansicht=kanban` (Standard: `tabelle`, bei vorhandenem Parameter umschaltbar).
- Alle bestehenden Filter (Suche nach Deal/Unternehmen, Betragsbereich, Sortierung) bleiben wirksam.

### 2.2 Die 7 Kanban-Spalten
Entsprechend `BASE_STAGE_OPTIONS`:
1. `Lead eingegangen`
2. `Erstgespräch geführt`
3. `Bedarfsanalyse`
4. `Angebot erstellt`
5. `Verhandlung`
6. `Deal gewonnen` (mit speziellem Erfolgs-Akzent `var(--mint-green)`)
7. `Deal verloren` (mit neutralem/gedämpftem Akzent)

Jeder Spaltenkopf zeigt:
- Phasen-Name
- Anzahl der Deals in dieser Phase (z. B. `4 Deals`)
- Aggregierte Gesamtsumme der Phase (z. B. `184.500 €`)

### 2.3 Deal-Karte (`DealKanbanCard.tsx`)
- Deal-Titel (fett, umbruchgeschützt)
- Unternehmensname (mit Link zu `/crm/companies` oder Firmen-Chip)
- Betrag prominent formatiert (z. B. `45.000 €`)
- Abschlussdatum (Close Date) mit Fälligkeits-Indikator (überfällig = Warnbadge)
- Tastatur-Menü: Drei-Punkte-Menü mit Aktion *„In Phase verschieben → [Auswahl]“* für barrierefreie Tastaturnavigation.

### 2.4 Drag & Drop Interaktion
- Nutzt die in Auftrag 128 erprobte HTML5-Drag-and-Drop-Mechanik:
  - Spalten dienen als Drop-Targets (`onDragOver`, `onDrop`).
  - Beim Ziehen über eine Spalte wird diese dezent hervorgehoben (`ring-2 ring-primary bg-primary/5`).
  - Optimistisches UI-Update: Der Deal wechselt sofort die Spalte, und die Spaltensummen passen sich in Echtzeit an.
  - Speichern des Phasenwechsels über die bestehende Datenabstraktion.

### 2.5 Responsive Verhalten & Touch
- **Desktop (≥ 1280 px):** Horizontales Scrolling über die 7 Spalten mit gut lesbaren Breiten (mind. 280 px je Spalte).
- **Tablet (768–1024 px):** 2 bis 3 sichtbare Spalten mit sanftem Wischen / Scrollen.
- **Mobile (< 768 px):** Akkordeon- oder Karussellansicht der Phasen, alternativ automatische Umschaltung auf Tabellenliste.

---

## 3. Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/crm/components/DealsKanbanBoard.tsx` | Neu | Hauptkomponente des Kanban-Boards, Spalten-Layout |
| `src/features/crm/components/DealKanbanCard.tsx` | Neu | Einzelne Deal-Karte mit Betrag, Metadaten und DnD |
| `src/features/crm/components/KanbanColumn.tsx` | Neu | Spalte mit Kopf, Zähler, Summenanzeige und Drop-Zone |
| `src/features/crm/pages/DealsPage.tsx` | Änderung | Integration des Ansichtsumschalters und Einbindung des Boards |
| `src/features/crm/__tests__/DealsKanban.ui.vitest.tsx` | Neu | UI- und Interaktionstests für Spalten, Karten und Phasenwechsel |
| `scripts/captureAuftrag129Gate.mjs` | Neu | Screenshot-Gate-Harness für Kanban- und Tabellenansicht |
| `docs/screenshots/auftrag-129/README.md` | Neu | Textuelle Vorher/Nachher-Matrix |
| `docs/BUILD_LOG.md` | Änderung | Nachweis aller Gates |

---

## 4. Definition of Done & Verifikation

- [ ] Umschalter zwischen Tabelle und Kanban schaltet flüssig um und synchronisiert mit `?ansicht=kanban`.
- [ ] Alle 7 Vertriebsphasen werden mit korrekten Deal-Zahlen und Betragssummen dargestellt.
- [ ] Deals lassen sich per Drag & Drop zwischen Phasen verschieben; Summen aktualisieren sich live.
- [ ] Barrierefreie Tastaturbedienung über Aktionsmenü vorhanden.
- [ ] `npx tsc --noEmit` hat 0 Fehler; `npm run lint` hat 0 Warnungen; `npm run verify` und `npm run build` grün.
- [ ] Schutzbereiche (`src/simulation/`, etc.) 100 % unberührt.
- [ ] PR für Codex-Review eröffnet und freigegeben.
