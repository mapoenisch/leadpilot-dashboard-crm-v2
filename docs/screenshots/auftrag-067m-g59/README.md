# Auftrag 067M / Gate G59 — Screenshot- & Overflow-Matrix (Mitgliederverwaltung)

Dieser Bericht dokumentiert den visuellen und A11y-Regressionsstatus für die im Auftrag 067M (Gate G59) eingeführte Mitglieder- und Einladungsverwaltung:
1. Neue Seite `/admin/members` (Rollenmatrix, Formular für neue Einladungen, Tabelle für aktive Mitglieder, Tabelle für ausstehende Einladungen).
2. Navigationseintrag `Mitgliederverwaltung` in der Sidebar (nur für angemeldete Administratoren sichtbar).
3. 0 px horizontaler Overflow auf allen 3 Referenz-Viewports (1440×900, 768×1024, 375×812).
4. Unveränderte Baseline auf bestehenden Seiten (`/dashboard` ist bitgenau identisch zu Gate G58).

## Screenshot- & Overflow-Matrix

Gemessen mit Chromium über Vite Preview (Port 4321), authentifiziert mit Seed-Admin (`admin-a@e2e.local`):

| Route | Viewport | Horizontal Overflow | SHA-256 Hash | Befund |
|---|---|---|---|---|
| `/admin/members` | 1440px (1440×900) | 0px | `910833f0686b748453a54f1db72bbf17f0cc631bbd80bc74c896586fa2a6946f` | 0px Overflow, WCAG konform |
| `/admin/members` | 768px (768×1024) | 0px | `043a9a4458a98ddc4725348e18ddccf15aa4c2676c5a23aab1fd4196867577fe` | 0px Overflow, WCAG konform |
| `/admin/members` | 375px (375×812) | 0px | `c42d98e67e8f8eb66dbec4afedcaf21137266ff98d8c281c8112b5a2b2bc532c` | 0px Overflow, WCAG konform |
| `/accept-invitation` | 1440px (1440×900) | 0px | `e17d74f880f0896798a3e74b3d87532d1f95a43b20ce291c9441a788e0019941` | 0px Overflow, WCAG konform |
| `/accept-invitation` | 768px (768×1024) | 0px | `380327f27e69888995349e5d4e12e3e60e0a5525bc40788647715f02bc65471d` | 0px Overflow, WCAG konform |
| `/accept-invitation` | 375px (375×812) | 0px | `80cf558f6937e0e7a1768846da1f8ad155e81d77cb31b9d40fe44d2d46e3d09a` | 0px Overflow, WCAG konform |
| `/dashboard` | 1440px (1440×900) | 0px | `cbd0b62f4b71b496b0d5359cd5a933199d029080ffe1198e51a1d92291cd11c7` | 0px Overflow, Baseline identisch zu G58 |
| `/dashboard` | 768px (768×1024) | 0px | `f323112b37d15c9477e7c325a8739abd7a0ae10a1e55a281c86b6b798ab0b940` | 0px Overflow, Baseline identisch zu G58 |
| `/dashboard` | 375px (375×812) | 0px | `c721d42ba06a719485c186bb91a504430710f36124d91d9bfed38fd65ac8cabb` | 0px Overflow, Baseline identisch zu G58 |

## Verifikationsergebnis

- `e2e/member-management.spec.ts`: 18/18 Tests bestanden (6 Tests über alle 3 Viewports).
- Rollenmatrix und Formulare sind per Tastatur voll bedienbar.
- Modaldialoge fangen den Fokus ein und bieten eindeutige Schließen- und Bestätigungs-Aktionen.
