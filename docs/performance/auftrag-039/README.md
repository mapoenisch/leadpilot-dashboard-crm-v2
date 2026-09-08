# Performance-Budgets & Messbericht Gate G23 (Auftrag 039)

**Messumgebung:** macOS, lokaler Vite Production Build (`npm run build` + `vite preview`), isolierter Headless Chrome via CDP.
**Baseline:** `766edd8` (`docs(review): approve Gate G22 motion and performance`)
**Status:** ✅ ALLE BUDGETS EINGEHALTEN

---

## 1. Budget-Vergleich & Messwerte

| Szenario | Messpunkt | Budget | Vorher (G22 Baseline 766edd8) | Nachher (G23 Release) | Status |
|---|---|---|---|---|---|
| **1. Initialer Load `/dashboard`** | `navigation` bis `loadEventEnd` | höchstens 3.000 ms | 22 ms | **31 ms** | ✅ BESTANDEN |
| **2. Clientseitiger Wechsel `/dashboard` → `/company/profile`** | Klick auf Sidebar-Link bis Zielroute, `main` und Zielbild sichtbar | höchstens 600 ms | 17 ms | **18 ms** | ✅ BESTANDEN |
| **3. Route mit Chart-Code `/dashboard`** | Navigation bis erstes sichtbares SVG / Chart-Element | höchstens 800 ms | 48 ms | **49 ms** | ✅ BESTANDEN |
| **4. Live-KPI-Wertwechsel (Normal)** | Start bis tatsächliches Animationsende (`data-animating="false"`) | höchstens 220 ms | 213 ms | **216 ms** (0 Glitch) | ✅ BESTANDEN |
| **4. Live-KPI-Wertwechsel (Reduced Motion)** | Sofortiger Endwert bei `prefers-reduced-motion: reduce` | 0 ms (kein Motion-Node) | 0 ms | **0 ms** | ✅ BESTANDEN |

---

## 2. JavaScript-Chunk & WebP-Asset Audit

- **WebP-Integrität:** Exakt **0 WebP-Dateien** sind in JavaScript-Chunks gebündelt oder als Base64 inlined. Sämtliche 33 Original-WebPs verbleiben als externe autorisierte Assets unter `/assets/auftrag-037[d-g]/`.
- **Route-Lazy-Loading:** Sämtliche 41 Page-Module werden über `React.lazy` erst bei Navigation zur jeweiligen Route nachgeladen. Die initiale Chunk-Größe für die App-Schale bleibt minimiert.
- **Barrierefreiheit & Anti-Flicker:** Zwischenwerte sind für Screenreader verborgen (`aria-hidden="true"`), während der synchrone Endwert in einer `live-kpi-visually-hidden` Region (`aria-live="polite"`, `aria-atomic="true"`) bereitgestellt wird. Visuell startet die Animation synchron beim Vorwert ohne Vorab-Aufblitzen des Endwerts (`hadGlitch: false`).
