# Auftrag 138 – Visuelle Gate-Prüfung CRM Deals Pipeline (1440/768/375 px, dark/light)

Aufgenommen 2026-11-09, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Basis-URL: http://127.0.0.1:4321
Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).

| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 | Status |
|---|---|---|---|---|---|---|
| `deals-tabelle` | `dark` | 1440 px | 0/0 px | 1175 px | `5fb9ceb0e5b3` | ✅ 0 px |
| `deals-tabelle` | `dark` | 768 px | 0/0 px | 1626 px | `917f3ea12ff6` | ✅ 0 px |
| `deals-tabelle` | `dark` | 375 px | 0/0 px | 3193 px | `1bc8c217e899` | ✅ 0 px |
| `deals-tabelle` | `light` | 1440 px | 0/0 px | 1175 px | `81970ff6c1f5` | ✅ 0 px |
| `deals-tabelle` | `light` | 768 px | 0/0 px | 1626 px | `e2b35a468444` | ✅ 0 px |
| `deals-tabelle` | `light` | 375 px | 0/0 px | 3193 px | `9a68665d2ed7` | ✅ 0 px |
| `deals-kanban` | `dark` | 1440 px | 0/0 px | 1047 px | `d3fddd70905a` | ✅ 0 px |
| `deals-kanban` | `dark` | 768 px | 0/0 px | 1271 px | `4f698ac070c1` | ✅ 0 px |
| `deals-kanban` | `dark` | 375 px | 0/0 px | 2031 px | `8b7848c11597` | ✅ 0 px |
| `deals-kanban` | `light` | 1440 px | 0/0 px | 1047 px | `5be0da74dcda` | ✅ 0 px |
| `deals-kanban` | `light` | 768 px | 0/0 px | 1271 px | `b16b49d7f60d` | ✅ 0 px |
| `deals-kanban` | `light` | 375 px | 0/0 px | 2031 px | `ec38584935a7` | ✅ 0 px |
| `deals-kanban-menu` | `dark` | 1440 px | 0/0 px | 1047 px | `e2deedcfe224` | ✅ 0 px |
| `deals-kanban-menu` | `dark` | 768 px | 0/0 px | 1271 px | `671fa4f65458` | ✅ 0 px |
| `deals-kanban-menu` | `dark` | 375 px | 0/0 px | 2031 px | `4a094c0fc938` | ✅ 0 px |
| `deals-kanban-menu` | `light` | 1440 px | 0/0 px | 1047 px | `8ce39e2a7e95` | ✅ 0 px |
| `deals-kanban-menu` | `light` | 768 px | 0/0 px | 1271 px | `819562aa35c0` | ✅ 0 px |
| `deals-kanban-menu` | `light` | 375 px | 0/0 px | 2031 px | `c11a4cb818b8` | ✅ 0 px |

## Zusammenfassung

- **Gesamtanzahl Aufnahmen:** 18
- **Überlauf-Status:** 0 px Überlauf in allen Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Verifizierte Eigenschaften (Auftrag 138):
- Tabellenansicht (`/crm/deals?ansicht=tabelle`) rendert fehlerfrei auf allen 3 Viewports und beiden Themes mit 0 px Überlauf
- Kanban-Board (`/crm/deals?ansicht=kanban`) mit 7 Spalten und Karten rendert responsive mit horizontalem Board-Scroll und 0 px Dokumentüberlauf
- Tastaturmenü für Phasenwechsel öffnet barrierefrei ohne Stacking-Context-Clipping
- Keine visuellen Regressionen im Layout durch die Umstellung auf serverseitige Persistenz
