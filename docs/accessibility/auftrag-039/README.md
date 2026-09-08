# Accessibility- & Tastatur-Protokoll Gate G23 (Auftrag 039)

**Messumgebung:** macOS, isolierter Chromium via Chrome DevTools Protocol (CDP).
**Baseline:** `766edd8` (`docs(review): approve Gate G22 motion and performance`)
**Datum:** 2026-09-08
**Status:** ✅ REPRESSIONSFREIER TASTATUR- & FOKUS-NACHWEIS (CDP-VERIFIZIERT)

---

## 1. Übersicht & Methodik

Dieser Prüfbericht dokumentiert das Tastatur-, Fokus- und Screenreader-Verhalten der LeadPilot V2.0.0 Oberfläche auf Desktop (1440 px), Tablet (768 px) und Mobile (375 px). Gemäß Spezifikation Auftrag 039 wurden alle Interaktionsmuster direkt über das Chrome DevTools Protocol (CDP) mit echten Tastaturereignissen (`Tab`, `Shift+Tab`, `Enter`, `Space`, `ArrowDown`, `ArrowUp`, `Escape`, `Input.insertText`) und harter Status-Verifikation im DOM ausgeführt.

---

## 2. Navigations- & Schalen-Bedienung

### Desktop-Sidebar (1440 × 900 px)
- **Tastaturbedienbarkeit:** Kategorien und Navigationslinks sind per `Tab` und `Shift+Tab` fokussierbar.
- **Kategorie-Akkordeon:** Kategorie-Buttons (`aside nav button[aria-expanded]`) toggeln mit `Space` und `Enter` synchron ihren Zustand (`aria-expanded="true|false"`).
- **Navigation:** Tastaturfokus auf Navigationslink und `Enter` führt den Routenwechsel (`/dashboard` → `/company/profile`) aus.
- **Aktiver Zustand:** Die aktive Route erhält `aria-current="page"` und sichtbaren Fokusring (`activeHref === '/company/profile'`).
- **Ergebnis:** ✅ BESTANDEN (`keyboardPass: true`)

### Mobile-Drawer (375 × 812 px)
- **Trigger-Button:** `#mobile-menu-trigger` mit `aria-label="Hauptmenü umschalten"`, `aria-expanded="false"`.
- **Öffnen per Tastatur:** `Enter` auf fokussiertem Trigger öffnet den Drawer (`aria-expanded="true"`).
- **Dialog-Semantik:** Drawer besitzt `role="dialog"`, `aria-modal="true"` und `aria-label="Hauptnavigation"`.
- **Fokus-Falle (Focus Trap):**
  - `Shift+Tab` auf dem ersten fokussierbaren Element (Schließen-Button `button[aria-label="Menü schließen"]`) springt zyklisch auf das letzte fokussierbare Element des Drawers (`wrappedToLast: true`).
  - `Tab` auf dem letzten fokussierbaren Element springt zyklisch auf das erste fokussierbare Element zurück (`wrappedToFirst: true`).
- **Schließen per Escape:** Ein Tastendruck auf `Escape` schließt den Drawer sofort (`drawerClosed: true`).
- **Fokus-Rückgabe:** Der Fokus wird synchron und vollständig an den Trigger `#mobile-menu-trigger` zurückgegeben (`focusRestoredToTrigger: true`).
- **Ergebnis:** ✅ BESTANDEN (`keyboardAndTrapPass: true`)

---

## 3. Vorhandene Interaktionen & Zustandsprüfung

| Interaktion | Geprüfte Route | Selektoren & Attribute | CDP-Tastaturablauf | Gemessener DOM-Zustand | Status |
|---|---|---|---|---|---|
| **Dialog / Modal** | `/crm/live-simulation` | `[role="dialog"][aria-modal="true"]`, `aria-labelledby`, Close-Button mit `aria-label="Dialog schließen"` | Button „Run / Re-Run“ fokussiert, `Enter` öffnet Dialog, `Escape` schließt | Modal geöffnet (`title: "Szenario- & Versions-Entscheidungswerkbank"`), nach `Escape` vollständig aus DOM entfernt | ✅ BESTANDEN |
| **Dropdown / Combobox** | `/crm/deals` | `button[role="combobox"]`, `aria-haspopup="listbox"`, `aria-expanded`, `[role="listbox"]` | Trigger fokussiert, `ArrowDown` öffnet Listbox, `ArrowDown` + `Enter` wählt Option | `aria-expanded` toggelt `false → true → false`, Option gewählt, Fokus zurück auf Trigger | ✅ BESTANDEN |
| **Filter & Suche** | `/crm/deals` | `input[type="search"]`, `aria-label="Deals suchen"` | Input fokussiert, CDP `typeText("Unternehmen V2 19")` | Deal-Zeilen reduziert von 40 auf 1, nach Reset wieder 40 | ✅ BESTANDEN |
| **Tabs** | `/crm/leads` | `[role="tablist"]`, `[role="tab"]`, `aria-selected` | Tab 2 per Tastatur fokussiert, `Enter` aktiviert Tab | `aria-selected="true"` wechselt auf Tab 2 (4 Tabs vorhanden) | ✅ BESTANDEN |
| **Tabelle / Liste** | `/crm/deals` | `table`, `tbody tr`, `.crm-table-row` | Tabellarische Ansicht mit semantischen Spalten | Exakt 40 Datenzeilen gerendert, 0 px horizontaler Überlauf | ✅ BESTANDEN |

> **Hinweis zu `/resources/materials`:** Die Ansicht `/resources/materials` stellt Dokumentationskarten mit Inline-Vorschau bereit und verfügt produktiv über keinen modalen Dialog mit `role="dialog"`. Der Dialog-Nachweis wurde daher auf der produktiven V2-Route `/crm/live-simulation` geführt, auf der die zentrale Modal-Komponente (`src/components/ui/Modal.tsx`) mit nativer Barrierefreiheit und Fokus-Trap im Einsatz ist.

---

## 4. Simulation & Live-KPI Barrierefreiheit

- **Simulation Command Strip:** Ausgezeichnet mit `role="region"` und `aria-label="Simulation Command Strip"`. Play/Pause-Button und Tempo-Radiogruppe (`role="radiogroup"`) vorhanden und bedienbar.
- **Ebene-C Live-KPI Fehlertoleranz:**
  - Auf `/dashboard` wird die `LiveKpiCard` (`[data-testid="live-kpi-card"]`) geprüft.
  - Bei unkonfiguriertem Supabase/E2E-Status rendert sie ehrlich den Badge `Offline (Lokal)` und den Informationstext `Supabase nicht konfiguriert` (`liveKpiOffline: true`).
  - Keine synthetischen Fake-Werte, keine Secret-Leaks im DOM.
- **Live-KPI-Zahlenübergänge:**
  - Zwischenwerte der Framer-Motion Animation sind mit `aria-hidden="true"` für Screenreader maskiert.
  - Der synchrone Endwert wird in einer `live-kpi-visually-hidden` Region (`aria-live="polite"`, `aria-atomic="true"`) bereitgestellt.
  - `prefers-reduced-motion: reduce` schaltet alle Motion-Elemente ab; der Endwert erscheint sofort (0 ms) ohne Glitch.

---

## 5. Bekannte Grenzen & WebP-Spezifikation

- **33 direkte Original-WebP-Ansichten:** Gemäß den Freigaben G21D, G21E, G21F und G21G sind die 33 Fachansichten als unveränderte Originalbilder eingebunden. Jedes Bild verfügt über ein barrierefreies `<img loading="eager" />` mit präzisem, routenspezifischem deutschen `alt`-Text. Eine weitergehende DOM-Segmentierung innerhalb der WebP-Grafiken ist architektonisch ausgeschlossen und bleibt unverändert.
