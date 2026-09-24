# Auftrag 067N / Gate G60 — Screenshot- & Overflow-Matrix (Serverseitige CRM-Abfragen & CSV-Export)

Dieser Bericht dokumentiert den visuellen und A11y-Regressionsstatus für die in Auftrag 067N (Gate G60) umgesetzten serverseitigen CRM-Abfragen, Filter-, Paginierungs- und CSV-Export-Funktionen:
1. Paginierte und URL-synchrone Listenansichten:
   - `/crm/companies` (B2B-Accounts mit Firmografie, Branchenfilter, Paginierung und CSV-Export)
   - `/crm/deals` (Deal Pipeline mit Stagefilter, Paginierung und CSV-Export)
   - `/crm/leads` (Leads & Kontakte mit Tabs, Paginierung und CSV-Export)
2. 0 px horizontaler Overflow auf allen 3 Referenz-Viewports (1440×900, 768×1024, 375×812).
3. Unveränderte Baseline auf bestehenden Seiten (`/dashboard` ist bitgenau identisch zu Gate G58 und Gate G59).
4. Alle interaktiven Filter-, Sortier- und Paginierungselemente sind voll barrierefrei und per Tastatur bedienbar.

## Screenshot- & Overflow-Matrix (Vorher-/Nachher-Vergleich)

Gemessen mit Chromium über Vite Preview (Port 4321), authentifiziert mit Seed-Admin (`admin-a@e2e.local`):

| Route | Viewport | G59 Baseline SHA-256 | G60 Ist-Zustand SHA-256 | Hash-Differenz / Änderung | Horizontal Overflow | Befund |
|---|---|---|---|---|---|---|
| `/crm/companies` | 1440px (1440×900) | `b3e81a0298d02c7e8df3c0042451c383ff9d8ea4f97ea159f811409dc592a39a` | `dc938215122031af1c71dc61b45e8f7ede6e8576813ddddd0401ecd53ec1e98c` | Beabsichtigte visuelle Änderung (CSV-Export-Button, Server-Pager, Sortiercontrols) | 0px | 0px Overflow, WCAG konform |
| `/crm/companies` | 768px (768×1024) | `552cb8b2512f71804f9829fbaec5125301fe133e9ce32104084f7b233a7587ef` | `1786dbaaa191ec9badb9de9da744f342441f47b4dde7723eb6af0f6de8014c18` | Beabsichtigte visuelle Änderung (CSV-Export-Button, Server-Pager, Sortiercontrols) | 0px | 0px Overflow, WCAG konform |
| `/crm/companies` | 375px (375×812) | `9c43b9240eb0f4b32bc717a6c9eef200e620f4c9c2d1b70ebca77cae26c6bb56` | `32bb1128fd098c901c61d0eeec023bcf55fdec233fe516c1ffd72df49fdbbb5e` | Beabsichtigte visuelle Änderung (Mobile-Karten, CSV-Export, Paginierung) | 0px | 0px Overflow, Mobile-Karten aktiv |
| `/crm/deals` | 1440px (1440×900) | `74f1b539c3e98f09bc5a4f7e5e3c63d59656fa7698506db81180214a1eefaa90` | `16ddc3c08acf1c52d94c39108ef2c682f401550fc3d9c0cd2739b5f5401dbb0a` | Beabsichtigte visuelle Änderung (CSV-Export-Button, Server-Pager, Sortiercontrols) | 0px | 0px Overflow, WCAG konform |
| `/crm/deals` | 768px (768×1024) | `189b6f8490a6ea2db686eeebfae386ce293c66fcfd58f38ff120d82998a63dc1` | `015e0e69ff8821ffe48cc828ac3932048b5cdc5594cbc103f7a1f545ac4f6262` | Beabsichtigte visuelle Änderung (CSV-Export-Button, Server-Pager, Sortiercontrols) | 0px | 0px Overflow, WCAG konform |
| `/crm/deals` | 375px (375×812) | `41a6902dcab5e28a5043bf526dcba5ec0d8792ebca75eb5cb19e8cf1639d6756` | `27f46e8988ed1a4096a0ceb9582f4ab8fe0358a749d14252d01a517000bc19e3` | Beabsichtigte visuelle Änderung (Mobile-Karten, CSV-Export, Paginierung) | 0px | 0px Overflow, Mobile-Karten aktiv |
| `/crm/leads` | 1440px (1440×900) | `86e2dc05c93549646b96e6dcae3c907153b49704e6c4e09f582046487e492b47` | `0cf0f007c2351cdcd5136527a009779cb388ab34765609af2b911f1a12329fe1` | Beabsichtigte visuelle Änderung (Server-Query für alle 3 Tabs, CSV-Export, Pager) | 0px | 0px Overflow, WCAG konform |
| `/crm/leads` | 768px (768×1024) | `fa6d03d421d0ebcc3c6cf67f5df5df45e99d7990159fa6e9be1eef73c713b632` | `c5c22fd2f5425ae5d2abb8949bc4ca266ca46440c362cea410f88422c2360d26` | Beabsichtigte visuelle Änderung (Server-Query für alle 3 Tabs, CSV-Export, Pager) | 0px | 0px Overflow, WCAG konform |
| `/crm/leads` | 375px (375×812) | `027419139f4e2f9d9b6c075ce86c77bb3a0bfa6e5114c000570b7764d852a4ef` | `3e09a51a4f38ae215d8e42116d8d60dc2c5783946c3ba5cd55b6f916c13fd0a5` | Beabsichtigte visuelle Änderung (Mobile-Karten, CSV-Export, Paginierung) | 0px | 0px Overflow, Mobile-Karten aktiv |
| `/dashboard` | 1440px (1440×900) | `cbd0b62f4b71b496b0d5359cd5a933199d029080ffe1198e51a1d92291cd11c7` | `cbd0b62f4b71b496b0d5359cd5a933199d029080ffe1198e51a1d92291cd11c7` | Keine (0 Byte Differenz / Hash identisch) | 0px | 0px Overflow, bitgenau identisch zu G58/G59 |
| `/dashboard` | 768px (768×1024) | `f323112b37d15c9477e7c325a8739abd7a0ae10a1e55a281c86b6b798ab0b940` | `f323112b37d15c9477e7c325a8739abd7a0ae10a1e55a281c86b6b798ab0b940` | Keine (0 Byte Differenz / Hash identisch) | 0px | 0px Overflow, bitgenau identisch zu G58/G59 |
| `/dashboard` | 375px (375×812) | `c721d42ba06a719485c186bb91a504430710f36124d91d9bfed38fd65ac8cabb` | `c721d42ba06a719485c186bb91a504430710f36124d91d9bfed38fd65ac8cabb` | Keine (0 Byte Differenz / Hash identisch) | 0px | 0px Overflow, bitgenau identisch zu G58/G59 |

## Verifikationsergebnis

- `e2e/crm-query-export.spec.ts`: 9 Testdefinitionen über alle 3 Viewports (Desktop 1440px, Tablet 768px, Mobile 375px) = 27/27 Durchläufe bestanden (Exit 0).
  - Getestete Pfade: Paginierungsvertrag (Mehrseitige Navigation, Zeilenauswahl auf 1, Pager-Bedienung, Vor/Zurück, URL-Synchronisation), URL-Roundtrip (Deep Link mit Filter & Paginierung), CSV-Export mit Whitespace-Formelschutz, Tenant-Angriffsabwehr, Auth-Schutz, Deaktivierter Viewer-Export mit Tooltip, Manager/Admin-Export, Live-Deals über `imported_funnel_deals`.
- `e2e/tenant-isolation.spec.ts`: 3 Testdefinitionen über alle 3 Viewports = 9/9 Durchläufe bestanden (Exit 0).
- Gesamtsumme: 36/36 Playwright-Durchläufe bestanden (0 Fehler).
- Keine Secrets, Tokens oder Fremdmandantendaten in Screenshots oder DOM-Strukturen vorhanden.
- Filter, Suche, Sortierung und Paginierung sind über alle Auflösungen ohne horizontalen Overflow (exakt 0px) nutzbar.
