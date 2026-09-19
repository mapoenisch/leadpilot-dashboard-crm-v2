# Auftrag 067L / Gate G58 — UX- & A11y-Nachweis (Entscheidung E2)

Dieser Bericht dokumentiert den visuellen und A11y-Regressionsstatus für die im Auftrag 067L (Nacharbeit 4, Entscheidung E2) vorgenommenen Frontend-Korrekturen:
1. Tastaturfokussierung des Hauptinhalts (`tabIndex={0}` in `src/components/layout/Layout.tsx`).
2. Tastaturfokussierung scrollbarer Datentabellen (`tabIndex={0}` und `role="region"` in `src/components/ui/Table.tsx`).
3. Behebung des geschachtelten Landmark-Elements auf `/company/data-basis` (`<div>` statt geschachteltem `<main>` in `src/features/overview/pages/DataBasisPage.tsx`).

Die Änderungen sind visuell neutral bzw. unsichtbar (Fokusattribute und semantische HTML-Elementanpassung); kein Layout-Shift, 0 px horizontaler Overflow auf allen Viewports.

## Screenshot- & Overflow-Matrix

Gemessen mit Chromium über Vite Preview (Port 4321), authentifiziert mit Seed-Admin (`admin-a@e2e.local`):

| Route | Viewport | Horizontal Overflow | SHA-256 Hash | Befund |
|---|---|---|---|---|
| `/dashboard` | 375px (375×812) | 0px | `c721d42ba06a719485c186bb91a504430710f36124d91d9bfed38fd65ac8cabb` | 0px Overflow, WCAG tastaturfokussierbar |
| `/dashboard` | 768px (768×1024) | 0px | `f323112b37d15c9477e7c325a8739abd7a0ae10a1e55a281c86b6b798ab0b940` | 0px Overflow, WCAG tastaturfokussierbar |
| `/dashboard` | 1440px (1440×900) | 0px | `cbd0b62f4b71b496b0d5359cd5a933199d029080ffe1198e51a1d92291cd11c7` | 0px Overflow, WCAG tastaturfokussierbar |
| `/finance/p-and-l` | 375px (375×812) | 0px | `db65c196374594778c5e32ad550130e59a672848f14dcdf202b18295a1a1514c` | 0px Overflow, WCAG tastaturfokussierbar |
| `/finance/p-and-l` | 768px (768×1024) | 0px | `6f93a62aa02bace71ff04f81cd5bfa352d91d0659aea31b41f902c9f98d41732` | 0px Overflow, WCAG tastaturfokussierbar |
| `/finance/p-and-l` | 1440px (1440×900) | 0px | `e3ab74334eb3eae7d008fc523e697da06912056a8243afb1b83ff4f3f4583b01` | 0px Overflow, WCAG tastaturfokussierbar |
| `/company/data-basis` | 375px (375×812) | 0px | `c2028fdd8b0b1689f602c2eb7b5ac472ec2664b732577903a24ecb2ef416ded7` | 0px Overflow, WCAG tastaturfokussierbar |
| `/company/data-basis` | 768px (768×1024) | 0px | `149b9f0ae54deeffa42690739dc23df7feeb9892d1df247c31bc45ddcfd958b4` | 0px Overflow, WCAG tastaturfokussierbar |
| `/company/data-basis` | 1440px (1440×900) | 0px | `be4076c876d05d61f102af3fb0485544ef9d6476fe90e9486b51bf4fc21c034d` | 0px Overflow, WCAG tastaturfokussierbar |

## E2E- und A11y-Verifikation

- `e2e/a11y.spec.ts`: 12/12 Tests bestanden (0 critical/serious Verstöße, unberührte Baseline).
- `e2e/routes.spec.ts -g "company/data-basis"`: 3/3 Tests bestanden (Deep-Link + Reload über alle 3 Viewports).
