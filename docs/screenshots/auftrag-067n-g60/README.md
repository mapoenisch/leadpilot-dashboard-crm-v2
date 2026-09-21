# Auftrag 067N / Gate G60 — Screenshot- & Overflow-Matrix (Serverseitige CRM-Abfragen & CSV-Export)

Dieser Bericht dokumentiert den visuellen und A11y-Regressionsstatus für die in Auftrag 067N (Gate G60) umgesetzten serverseitigen CRM-Abfragen, Filter-, Paginierungs- und CSV-Export-Funktionen:
1. Paginierte und URL-synchrone Listenansichten:
   - `/crm/companies` (B2B-Accounts mit Firmografie, Branchenfilter, Paginierung und CSV-Export)
   - `/crm/deals` (Deal Pipeline mit Stagefilter, Paginierung und CSV-Export)
   - `/crm/leads` (Leads & Kontakte mit Tabs, Paginierung und CSV-Export)
2. 0 px horizontaler Overflow auf allen 3 Referenz-Viewports (1440×900, 768×1024, 375×812).
3. Unveränderte Baseline auf bestehenden Seiten (`/dashboard` ist bitgenau identisch zu Gate G58 und Gate G59).
4. Alle interaktiven Filter-, Sortier- und Paginierungselemente sind voll barrierefrei und per Tastatur bedienbar.

## Screenshot- & Overflow-Matrix

Gemessen mit Chromium über Vite Preview (Port 4321), authentifiziert mit Seed-Admin (`admin-a@e2e.local`):

| Route | Viewport | Horizontal Overflow | SHA-256 Hash | Befund |
|---|---|---|---|---|
| `/crm/companies` | 1440px (1440×900) | 0px | `dc938215122031af1c71dc61b45e8f7ede6e8576813ddddd0401ecd53ec1e98c` | 0px Overflow, WCAG konform |
| `/crm/companies` | 768px (768×1024) | 0px | `1786dbaaa191ec9badb9de9da744f342441f47b4dde7723eb6af0f6de8014c18` | 0px Overflow, WCAG konform |
| `/crm/companies` | 375px (375×812) | 0px | `32bb1128fd098c901c61d0eeec023bcf55fdec233fe516c1ffd72df49fdbbb5e` | 0px Overflow, Mobile-Karten aktiv |
| `/crm/deals` | 1440px (1440×900) | 0px | `16ddc3c08acf1c52d94c39108ef2c682f401550fc3d9c0cd2739b5f5401dbb0a` | 0px Overflow, WCAG konform |
| `/crm/deals` | 768px (768×1024) | 0px | `015e0e69ff8821ffe48cc828ac3932048b5cdc5594cbc103f7a1f545ac4f6262` | 0px Overflow, WCAG konform |
| `/crm/deals` | 375px (375×812) | 0px | `27f46e8988ed1a4096a0ceb9582f4ab8fe0358a749d14252d01a517000bc19e3` | 0px Overflow, Mobile-Karten aktiv |
| `/crm/leads` | 1440px (1440×900) | 0px | `0cf0f007c2351cdcd5136527a009779cb388ab34765609af2b911f1a12329fe1` | 0px Overflow, WCAG konform |
| `/crm/leads` | 768px (768×1024) | 0px | `c5c22fd2f5425ae5d2abb8949bc4ca266ca46440c362cea410f88422c2360d26` | 0px Overflow, WCAG konform |
| `/crm/leads` | 375px (375×812) | 0px | `3e09a51a4f38ae215d8e42116d8d60dc2c5783946c3ba5cd55b6f916c13fd0a5` | 0px Overflow, Mobile-Karten aktiv |
| `/dashboard` | 1440px (1440×900) | 0px | `cbd0b62f4b71b496b0d5359cd5a933199d029080ffe1198e51a1d92291cd11c7` | 0px Overflow, bitgenau identisch zu G58/G59 |
| `/dashboard` | 768px (768×1024) | 0px | `f323112b37d15c9477e7c325a8739abd7a0ae10a1e55a281c86b6b798ab0b940` | 0px Overflow, bitgenau identisch zu G58/G59 |
| `/dashboard` | 375px (375×812) | 0px | `c721d42ba06a719485c186bb91a504430710f36124d91d9bfed38fd65ac8cabb` | 0px Overflow, bitgenau identisch zu G58/G59 |

## Verifikationsergebnis

- `e2e/crm-query-export.spec.ts`: 12/12 Tests bestanden (4 Tests über alle 3 Viewports).
- `e2e/tenant-isolation.spec.ts`: 9/9 Tests bestanden (3 Tests über alle 3 Viewports inklusive reaktivierter Tests 1 & 2).
- Keine Secrets, Tokens oder Fremdmandantendaten in Screenshots oder DOM-Strukturen vorhanden.
- Filter, Suche, Sortierung und Paginierung sind über alle Auflösungen ohne horizontalen Overflow nutzbar.
