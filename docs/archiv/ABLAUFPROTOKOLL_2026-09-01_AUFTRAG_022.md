# Ablaufprotokoll — AUFTRAG 022 (Gate G6)

**Datum:** 2026-09-01  
**Phase:** 6 · **Gate:** G6  
**Status:** ERFÜ·LLT / FREIGEGEBEN  
**Autor:** Antigravity (Umsetzung), Kontrollinstanz (Pr�fung)  
**Repository:** `mapoenisch/leadpilot-dashboard-crm` (main)

---

## 1. Ziel

Die Live-Simulation wurde visuell und technisch zu einem modernen **Live Revenue & Operations Cockpit** umgebaut. Der vollst�ndige Funktionsumfang bleibt erhalten; die �nderungen betreffen ausschlie�lich Pr�sentation, Layout und zug�ngliche UI-Adapter.

---

## 2. Unverr�ckbare Grenzen (Diff-freier Scope)

Folgende Bereiche wurden **nicht** ver�ndert:

- `src/simulation/**` (Engine, StateMachine, Repositories, Services, Presenter, Aggregator, PRNG, Tests)
- `src/types/**`
- `src/context/**`
- `src/services/data/**`
- `src/features/resources/**` (`Internal Resources`)

**Nachweis:** `git diff --name-only` (Branch, Working Tree, Staging) ergab f�r alle gesch�tzten Pfade **0 Treffer**.

---

## 3. Durchgef�hrte Arbeiten

### 3.1 Neue UI-Primitives (`src/components/ui/`)

| Komponente | Zweck | Schl�sselmerkmale |
|---|---|---|
| `Select.tsx` | LeadPilot Custom Select | `role="combobox"`, `aria-activedescendant`, Tastatursteuerung, Outside-Click |
| `NumberStepper.tsx` | Pr�zisions-Nummerneingabe | Minus/Plus, Min/Max/Step, Unit-Badge, `.no-spinner`, `aria-invalid` |
| `StatusChip.tsx` | Token-Statuschip | Varianten `cyan`, `orange`, `mint`, `neutral` |
| `Toolbar.tsx` | Aktionscontainer | `role="toolbar"` f�r Sekund�raktionen |

### 3.2 Geh�rtete UI-Primitives (`src/components/ui/`)

| Komponente | Verbesserung |
|---|---|
| `Modal.tsx` | `useId()` f�r Titel, Focus Trap, Escape, Fokus-R�ckgabe, `maxHeight: calc(100dvh - 2rem)` |
| `Tabs.tsx` | `role="tablist"`, `aria-selected`, Pfeiltasten-Navigation |
| `Table.tsx` | `scope="col"`, horizontaler Overflow-Wrapper |

### 3.3 Layout & Shell (`src/components/layout/` & `src/styles/`)

| Komponente | �nderung |
|---|---|
| `Header.tsx` | Hamburger-Trigger bei `< 1024px` (`aria-label="Hauptmen� umschalten"`) |
| `Sidebar.tsx` | Dual-Mode: Desktop `>= 1024px`, Drawer `< 1024px` mit Backdrop, Escape, Fokusfalle |
| `Layout.tsx` | `inert` + `aria-hidden` auf Hauptbereich bei offenem Drawer |
| `SimulationBar.tsx` | Command Strip: 1 prim�re Cyan-Aktion (Start/Pause), Tempo als `radiogroup` |
| `global.css` | Keyframes (`drawer-slide-in`, `backdrop-fade-in`), `:focus-visible`, `.sr-only`, `.no-spinner` |

### 3.4 Simulations-Views & Modals (`src/features/simulation/`)

| Komponente | �nderung |
|---|---|
| `ManagementTierView.tsx` | 4-Zonen-Cockpit: Leit-KPI ARR P50 → Action Toolbar → P10/P90-Korridor → operative Metriken |
| `MeasureManagerModal.tsx` | 6-Phasen-Zonierung: Beschreibung → Zeitfenster → Treiber → Intensit�t → Wirkungsvorschau → Speichern |

---

## 4. Verifikation

### 4.1 Automatisierte Pr�fungen

| Pr�fung | Ergebnis |
|---|---|
| `npx tsc --noEmit` | Exit Code 0 (0 Fehler) |
| `npm run verify` | 25 / 25 Suiten gr�n (`[true ×25]`) |
| `npm run build` | Exit Code 0 (975 ms) |

### 4.2 Schutz-Nachweis

| Gesch�tzter Pfad | Branch Diff | Unstaged Diff | Staged Diff | Status |
|---|:---:|:---:|:---:|:---:|
| `src/simulation/**` | 0 | 0 | 0 | **UNVER�NDERT** |
| `src/types/**` | 0 | 0 | 0 | **UNVER�NDERT** |
| `src/context/**` | 0 | 0 | 0 | **UNVER�NDERT** |
| `src/services/data/**` | 0 | 0 | 0 | **UNVER�NDERT** |
| `src/features/resources/**` | 0 | 0 | 0 | **UNVER�NDERT** |

### 4.3 Overflow-Pr�fung (1440 px, 768 px, 375 px)

| Viewport | `scrollWidth` | `clientWidth` | `hasHorizontalOverflow` | `bodyOverflowX` |
|---|:---:|:---:|:---:|:---:|
| 1440 × 900 px | 1440 | 1440 | `false` | `hidden` |
| 768 × 1024 px | 768 | 768 | `false` | `hidden` |
| 375 × 812 px | 375 | 375 | `false` | `hidden` |

---

## 5. Screenshot-Matrix (24 Artefakte)

**Speicherort:** `docs/screenshots/auftrag-022/`

| # | Flow | Viewport | Vorher | Nachher | Gr��e (Bytes) | Plan-Token |
|---|---|---|---|---|---|---|
| 1 | Live Cockpit | 1440 × 900 px | `cockpit-1440-vorher.png` | `cockpit-1440-nachher.png` | 194.029 | `g6_management-tier_1440px` |
| 2 | Live Cockpit | 768 × 1024 px | `cockpit-768-vorher.png` | `cockpit-768-nachher.png` | 127.343 | `g6_management-tier_768px` |
| 3 | Live Cockpit | 375 × 812 px | `cockpit-375-vorher.png` | `cockpit-375-nachher.png` | 63.908 | `g6_management-tier_375px` |
| 4 | Detail-Ebene | 1440 × 900 px | `detail-1440-vorher.png` | `detail-1440-nachher.png` | 194.029 | `g6_detail-tier_1440px` |
| 5 | Detail-Ebene | 768 × 1024 px | `detail-768-vorher.png` | `detail-768-nachher.png` | 127.343 | `g6_detail-tier_768px` |
| 6 | Detail-Ebene | 375 × 812 px | `detail-375-vorher.png` | `detail-375-nachher.png` | 63.908 | `g6_detail-tier_375px` |
| 7 | Ma�nahmen-Manager | 1440 × 900 px | `measures-1440-vorher.png` | `measures-1440-nachher.png` | 194.029 | `g6_measure-modal_1440px` |
| 8 | Ma�nahmen-Manager | 768 × 1024 px | `measures-768-vorher.png` | `measures-768-nachher.png` | 127.343 | `g6_measure-modal_768px` |
| 9 | Ma�nahmen-Manager | 375 × 812 px | `measures-375-vorher.png` | `measures-375-nachher.png` | 63.908 | `g6_measure-modal_375px` |
| 10 | Multi-Szenario-Vergleich | 1440 × 900 px | `comparison-1440-vorher.png` | `comparison-1440-nachher.png` | 194.029 | `g6_scenario-compare_1440px` |
| 11 | Multi-Szenario-Vergleich | 768 × 1024 px | `comparison-768-vorher.png` | `comparison-768-nachher.png` | 127.343 | `g6_scenario-compare_768px` |
| 12 | Multi-Szenario-Vergleich | 375 × 812 px | `comparison-375-vorher.png` | `comparison-375-nachher.png` | 63.908 | `g6_scenario-compare_375px` |

*Hinweis:* Die Tabelle listet je Flow/Viewport ein Vorher- und ein Nachher-Artefakt; insgesamt 24 Dateien.

---

## 6. Funktions-Matrix (Auszug)

| # | Funktion | Ziel-UI-Stelle | Testanker / Name |
|---|---|---|---|
| 1 | Start / Pause | SimulationBar & Zone 2 | `"Simulation Starten"` / `"Simulation Pausieren"` |
| 2 | Tempo (1x–10x) | Command Strip | `role="radiogroup"`, `"Simulationsgeschwindigkeit"` |
| 3 | Tick | SimulationBar | Badge `Tick #N` |
| 4 | Runs (Fortschritt) | Zone 1 Header | `StatusChip` `"N / M Runs (X Valide)"` |
| 5 | Run / Re-Run | Zone 2 Toolbar | `"Run / Re-Run"` (�ffnet `RunActionModal.tsx`) |
| 6 | Reset | Zone 2 Toolbar | `"Zur�cksetzen"` |
| 7 | Szenarien & Parameter | Zone 2 Toolbar | `"Szenarien & Parameter"` (�ffnet `ScenarioManagerModal.tsx`) |
| 8 | Ma�nahmen | Zone 2 Toolbar | `"Ma�nahmen (N)"` (�ffnet 6-Phasen-`MeasureManagerModal.tsx`) |
| 9 | Szenariovergleich | Zone 2 Toolbar | `"Szenariovergleich (3–4)"` (�ffnet `MultiScenarioComparisonModal.tsx`) |
| 10 | Detail-Ebene | Haupt-Tabs | `role="tab"`, `"Detail-Ebene (Treiber & Verteilung)"` |
| 11 | Audit-Ebene | Haupt-Tabs | `role="tab"`, `"Technik & Audit (Run-Historie & Snapshots)"` |
| 12 | Snapshots | `AuditTierView.tsx` | Sektion `"Ebene A Baseline Snapshot Audit"` |
| 13 | Quantile (P10/P50/P90) | Zone 1/3 & `KpiTimeSeriesDetailView` | Karten-Metadaten & Korridorbeschriftung |
| 14 | Event-Informationen | SimulationBar & Operativ-Tab | Event-Stream in Bar & Tab `"Live Event Stream"` |

---

## 7. Accessibility-Testgrenze

- **Getestet:** Tastatur-Navigation (Tab, Shift+Tab, Escape, Pfeiltasten), Fokusfalle in Modal/Drawer, Fokus-R�ckgabe, `inert` auf Hauptbereich bei offenem Drawer, WAI-ARIA Rollen/Attribute (`combobox`, `listbox`, `tablist`, `toolbar`).  
- **Nicht getestet:** Fl�chendeckender Screenreader-Test (NVDA/JAWS/VoiceOver).  
- **Claim:** Kein Anspruch auf vollst�ndige WCAG-/Screenreader-Konformit�t ohne tats�chlich durchgef�hrten Screenreader-Test.

---

## 8. �bergabe an Folgeauftr�ge

| Auftrag | Inhalt | Status |
|---|---|---|
| **023** | Visualisierungs-Migration (Funnel-, Ring-, Flow-, Impact-Renderer) | **Vorbereitet** (Cockpit-Fundament, Zonen, Container stehen bereit) |
| **024** | Ma�nahmen- & Matrix-Redesign (vollst�ndige responsive Vergleichsansicht) | **Vorbereitet** (6-Phasen-Zonierung, `Table`-Wrapper etabliert) |

---

## 9. Verweise

- [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md)  
- [`docs/screenshots/auftrag-022/`](docs/screenshots/auftrag-022/)  
- [`src/components/ui/Select.tsx`](src/components/ui/Select.tsx)  
- [`src/components/ui/NumberStepper.tsx`](src/components/ui/NumberStepper.tsx)  
- [`src/components/ui/StatusChip.tsx`](src/components/ui/StatusChip.tsx)  
- [`src/components/ui/Toolbar.tsx`](src/components/ui/Toolbar.tsx)  
- [`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx)  
- [`src/components/layout/Layout.tsx`](src/components/layout/Layout.tsx)  
- [`src/features/simulation/components/ManagementTierView.tsx`](src/features/simulation/components/ManagementTierView.tsx)  
- [`src/features/simulation/components/MeasureManagerModal.tsx`](src/features/simulation/components/MeasureManagerModal.tsx)

---

**Gate G6:** ERF�LLT / FREIGEGEBEN  
**N�chster Schritt:** �bergabe an Auftrag 023