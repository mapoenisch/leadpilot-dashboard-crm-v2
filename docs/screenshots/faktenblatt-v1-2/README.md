# Faktenblatt v1.2 (PR #80) – Screenshot-Matrix Quellenangaben

Builds mit `VITE_DASHBOARD_PREVIEW=true` (CI-Artefakt `dashboard-preview`) gegen lokales Supabase (Testnutzer aus
`supabase/seed.sql`), ganze Seite. Vorher = `main` nach PR #79, Nachher = Branch
`claude/faktenblatt-v1-2`. Gezählt werden sichtbare Nennungen im Seitentext. Einzige sichtbare Stelle
ist die Designmuster-Vorschau: `/dashboard` rendert den Hero-Untertitel aus `execData.ts` nicht, Projektkontext- und
Quellenseite (`projektkontextData.ts`, Quellenfluss in `execData.ts`) sind in keiner Route eingebunden,
`BASELINE_ACCESS` wird nicht gerendert. Die Vorschau hat keinen eigenen Theme-Schalter, dunkel und hell sind daher bildgleich. Bilder bleiben
lokal unter `artifacts/faktenblatt-v1-2/`.

| Seite | Breite | Theme | SHA-256 vorher | SHA-256 nachher | „v1.1“ vorher → nachher | „v1.2“ vorher → nachher | Überlauf |
|---|---|---|---|---|---|---|---|
| /dashboard-vorschau.html?bereich=muster | 1440 | dark | `303234e8f7aa` | `af70d636defa` | 23 → 0 | 0 → 23 | 0 px |
| /dashboard-vorschau.html?bereich=muster | 1440 | light | `303234e8f7aa` | `af70d636defa` | 23 → 0 | 0 → 23 | 0 px |
| /dashboard-vorschau.html?bereich=muster | 768 | dark | `f1a1fdf24252` | `ae1145f105b3` | 23 → 0 | 0 → 23 | 0 px |
| /dashboard-vorschau.html?bereich=muster | 768 | light | `f1a1fdf24252` | `ae1145f105b3` | 23 → 0 | 0 → 23 | 0 px |
| /dashboard-vorschau.html?bereich=muster | 375 | dark | `00386fe71e23` | `ceceff4b3652` | 23 → 0 | 0 → 23 | 0 px |
| /dashboard-vorschau.html?bereich=muster | 375 | light | `00386fe71e23` | `ceceff4b3652` | 23 → 0 | 0 → 23 | 0 px |

**Ergebnis:** 6/6 Aufnahmen bestanden.
