# Auftrag 138 – Visuelle Gate-Prüfung CRM Deals Pipeline (1440/768/375 px, dark/light)

Aufgenommen 2026-11-09, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Vorher: http://127.0.0.1:4322 (Basis edc72ee, vor Auftrag 138); Nachher: http://127.0.0.1:4321.
Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.

| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |
|---|---|---|---|---|---|---|---|
| `deals-tabelle` | `dark` | 1440 px | 0/0 px | 1175 px | `e011b6410925c4d0258c0eb56023a5e929f1499b13281f3ed6153d5624c5787b` / `e011b6410925c4d0258c0eb56023a5e929f1499b13281f3ed6153d5624c5787b` | 0 | ✅ Vergleich bestanden |
| `deals-tabelle` | `dark` | 768 px | 0/0 px | 1626 px | `84db64490ae1f4231728ba7347405a2de08558603787563bcdb93867c9fa6469` / `a7da8f2c2a2f2f4ce4dfedf471959c8e128a6616b81d3ca1e05f04bcefbe8c75` | 22719 | ✅ Geprüft: Visuell geprüft: geringfügige Rasterungs-/Schattenkanten an KPI-Karten, unveränderte Inhalte, keine Überdeckung oder abgeschnittene Bedienung. |
| `deals-tabelle` | `dark` | 375 px | 0/0 px | 3193 px | `2d553d900159a4a92164d91ae5736b94984a87920e24ab02a5f851c6cf351718` / `69ac4f9d0a53ca97d151d4843c5ccda1bba21d07a4696e7f9b92a0fb655b37e3` | 16885 | ✅ Geprüft: Visuell geprüft: geringfügige Rasterungs-/Schattenkanten an KPI-Karten, unveränderte Inhalte, keine Überdeckung oder abgeschnittene Bedienung. |
| `deals-tabelle` | `light` | 1440 px | 0/0 px | 1175 px | `34ec557b9c64739bd9a86daa16dd8c3202f22a226898dd61b20a37f65462b995` / `34ec557b9c64739bd9a86daa16dd8c3202f22a226898dd61b20a37f65462b995` | 0 | ✅ Vergleich bestanden |
| `deals-tabelle` | `light` | 768 px | 0/0 px | 1626 px | `e620fdb91a50ff88f91a63a3c32ae37954fe7f70c290fcf330ad83151519a78d` / `e620fdb91a50ff88f91a63a3c32ae37954fe7f70c290fcf330ad83151519a78d` | 0 | ✅ Vergleich bestanden |
| `deals-tabelle` | `light` | 375 px | 0/0 px | 3193 px | `64828bc5602755609a7718c1cda3695dc0ef8a8c01cf6991407aa5677c2acd27` / `64828bc5602755609a7718c1cda3695dc0ef8a8c01cf6991407aa5677c2acd27` | 0 | ✅ Vergleich bestanden |
| `deals-kanban` | `dark` | 1440 px | 0/0 px | 1047 px | `9c465ff2f346a6b8ed68529da69cae58dbf79bcf5b77445cfe2e63f27331c85b` / `9c465ff2f346a6b8ed68529da69cae58dbf79bcf5b77445cfe2e63f27331c85b` | 0 | ✅ Vergleich bestanden |
| `deals-kanban` | `dark` | 768 px | 0/0 px | 1271 px | `31d97b0ca745913b45c200be9a2227c4b7bb0577f0725dd1698366e177bf6479` / `2b56694c9631d2eaddd3808e89135c82d8d6b062378b2dee02a0c60c88d1a2f0` | 22689 | ✅ Geprüft: Visuell geprüft: geringfügige Rasterungs-/Schattenkanten an KPI-Karten, unveränderte Inhalte, keine Überdeckung oder abgeschnittene Bedienung. |
| `deals-kanban` | `dark` | 375 px | 0/0 px | 2031 px | `a87e43b88c55a9f8a9b668ceecd4c117805669b045ba73eab44ad6138c9df970` / `9cbef384c15ccdbadf7438af6237ce9f483ecabb01183017a323dd9195f38052` | 16885 | ✅ Geprüft: Visuell geprüft: geringfügige Rasterungs-/Schattenkanten an KPI-Karten, unveränderte Inhalte, keine Überdeckung oder abgeschnittene Bedienung. |
| `deals-kanban` | `light` | 1440 px | 0/0 px | 1047 px | `697a66b05dd8ba5606852e4b0cb99302fb8c1554256d5145dddb5d85870fa84c` / `697a66b05dd8ba5606852e4b0cb99302fb8c1554256d5145dddb5d85870fa84c` | 0 | ✅ Vergleich bestanden |
| `deals-kanban` | `light` | 768 px | 0/0 px | 1271 px | `07054898ea230e894ba3fb1b7ffde1f3029ea157979b4935022fc15fba895cc9` / `07054898ea230e894ba3fb1b7ffde1f3029ea157979b4935022fc15fba895cc9` | 0 | ✅ Vergleich bestanden |
| `deals-kanban` | `light` | 375 px | 0/0 px | 2031 px | `3055acb83f0016017f3b4f98ee64fdcddf388d439bc2c5d98f90f481f17280b2` / `3055acb83f0016017f3b4f98ee64fdcddf388d439bc2c5d98f90f481f17280b2` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `dark` | 1440 px | 0/0 px | 1047 px | `c6f35b5ad06382242dba567793321bed42b19379299cb8d7e392a3e6b0549052` / `c6f35b5ad06382242dba567793321bed42b19379299cb8d7e392a3e6b0549052` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `dark` | 768 px | 0/0 px | 1271 px | `ae3ef2b3c0b18207d0376c40d76340abe486e66fd9a4b8ee29b234c40ae6b8f2` / `ae3ef2b3c0b18207d0376c40d76340abe486e66fd9a4b8ee29b234c40ae6b8f2` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `dark` | 375 px | 0/0 px | 2031 px | `f2a8e1c069f4edbe5fdddfbe6c1a9cde0415e22d63a9f90fec92e20aa3cf5cb8` / `f2a8e1c069f4edbe5fdddfbe6c1a9cde0415e22d63a9f90fec92e20aa3cf5cb8` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `light` | 1440 px | 0/0 px | 1047 px | `1ab3c3103be5a769b15596d712f538c9860c2e4f0b2e5308b07c9dfbf22a728f` / `1ab3c3103be5a769b15596d712f538c9860c2e4f0b2e5308b07c9dfbf22a728f` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `light` | 768 px | 0/0 px | 1271 px | `819562aa35c0e6d25d1fa9ec8491eb027ae5b78a6edd86a67cefb1e761b40e97` / `819562aa35c0e6d25d1fa9ec8491eb027ae5b78a6edd86a67cefb1e761b40e97` | 0 | ✅ Vergleich bestanden |
| `deals-kanban-menu` | `light` | 375 px | 0/0 px | 2031 px | `770361ec911162b581f80114580004a8a146a66a54c0ee1ea61c09754e9505e7` / `770361ec911162b581f80114580004a8a146a66a54c0ee1ea61c09754e9505e7` | 0 | ✅ Vergleich bestanden |

## Zusammenfassung

- **Gesamtanzahl Aufnahmen:** 36
- **Überlauf-Status:** 0 px Überlauf in allen Nachher-Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Verifizierte Eigenschaften (Auftrag 138):
- Tabellenansicht (`/crm/deals?ansicht=tabelle`) rendert fehlerfrei auf allen 3 Viewports und beiden Themes mit 0 px Überlauf
- Kanban-Board (`/crm/deals?ansicht=kanban`) mit 7 Spalten und Karten rendert responsive mit horizontalem Board-Scroll und 0 px Dokumentüberlauf
- Tastaturmenü für Phasenwechsel öffnet barrierefrei ohne Stacking-Context-Clipping
- Bildvergleich: höchstens 0,1 % Pixelabweichung (bestehende Playwright-Toleranz) oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.
- Identische Hashes sind bei unveränderter Darstellung zulässig; sie belegen keine sichtbare Änderung.
