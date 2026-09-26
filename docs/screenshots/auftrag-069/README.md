# Auftrag 069 / Gate G67 — Bild-zu-Bild-Gate v2.3.2

Referenz = Build von Tag `v2.2.0` (`4e2b0ef`), Baseline = `61e70dc` (v2.3.1 + PR #36),
neu = Branch `main-jytadn`. Bilder bleiben lokal (`.gitignore`, Policy ab Auftrag 066);
committet wird nur diese Matrix.

## Lauf

- Harness: `scripts/captureAuftrag069Screenshots.mjs`, drei Vite-Dev-Server mit
  `VITE_SUPABASE_URL=http://supabase.mock VITE_SUPABASE_ANON_KEY=mock`
  (v2.2.0-Worktree Port 3100, Baseline-Worktree Port 3200, neuer Stand Port 3000),
  Chromium 1194, `reducedMotion: 'reduce'`.
- v2.2.0 mit lokalem Demo-Login (Sitzung in `localStorage`), neuer Stand und Baseline mit der
  Supabase-Attrappe aus Auftrag 068.
- **Vergleich (G67-2/3):** Element-Screenshot des Bildes (`data-testid` wie in v2.2.0) in beiden
  Ständen, Pixelvergleich im Browser (Canvas, Kanal-Toleranz 16), Grenze 0,5 %.
- **Subpixel-Ausgleich:** Der Kopfbereich über dem Inhalt ist seit v2.2.0 anders hoch, das Bild
  liegt dadurch auf einem anderen Bruchteil eines Pixels (768 px: y 154,5 bzw. 179,25 → 155,5).
  Chromium rastert es dann an Kanten anders (vorher bis 5 % „Abweichung“ bei identischem Bild).
  Das neue Bild wird für die Aufnahme per `position: relative` um < 1 px auf denselben
  Bruchteil geschoben. Die echte Lage steht im Manifest (`refRect`/`curRect`).
- Überlauf gemessen im Dokument und in `#main-content` (Maximum).

## Ergebnis

| Kriterium | Ergebnis |
|---|---|
| G67-1 Bild-Identität | 32/32 Seiten zeigen die Datei laut Auftrag; SHA-256 = `ASSET_SOURCE.md` (Test); `git diff v2.2.0 -- public/assets/auftrag-037*` leer |
| G67-2 Bild-zu-Bild 1440 px | 32/32 gleiche Größe, **0,000 %** Abweichung (max.) |
| G67-3 Bild-zu-Bild 768 px | 32/32 gleiche Größe, **0,000 %** Abweichung (max.) |
| G67-4 Mobile 375 px | 32/32: Vollbild ausgeblendet, 2 Kacheln, Vergrößerung 1,82×, 0 px Überlauf |
| G67-5 Textschicht | 96/96 Aufnahmen: genau eine `h1` in `#main-content`, Textschicht 1×1 px, ≥ 371 Zeichen |
| G67-6 Rückweg | Test beide Schalterstellungen grün; `v2.3.1^{commit}` = `1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2` |
| G67-7 Unberührt | 21 Aufnahmen, max. 0,307 % (Login 375 px: Versionstext V2.3.2). Siehe unten |
| Horizontaler Überlauf 1440/768 | 0 von 64 |

### Befund Lage (keine Änderung, nur zur Kenntnis)

Das Bild sitzt im neuen Stand auf allen Breiten 1 px tiefer als in v2.2.0. Auf 768 px lagen
`/sales/planning` und `/organisation/team` in v2.2.0 23,75 px tiefer (der Seitentitel in der
Kopfleiste brach dort um); jetzt liegen alle 32 Seiten einheitlich. Ursache ist die Kopfleiste
(Sidebar/Topbar), die laut Auftrag nicht geändert wird.

## Matrix Bildseiten (Größe · Abweichung · Überlauf)

| Route | 1440 | 768 | 375 (Kacheln · Überlauf) | SHA-256 375 |
|---|---|---|---|---|
| `/market/overview` | 1116x596 · 0.000 % · 0 px | 736x394 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `465a63620d` |
| `/market/competition` | 1116x596 · 0.000 % · 0 px | 736x394 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `cd873119d8` |
| `/market/swot` | 1116x596 · 0.000 % · 0 px | 736x394 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `e0797cd6bd` |
| `/customers/icp` | 1116x565 · 0.000 % · 0 px | 736x373 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `cd43c42168` |
| `/customers/persona` | 1116x557 · 0.000 % · 0 px | 736x368 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `92186d8081` |
| `/customers/segments` | 1116x554 · 0.000 % · 0 px | 736x366 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `96b678b8db` |
| `/customers/top-customers` | 1116x555 · 0.000 % · 0 px | 736x367 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `a941cb4e7f` |
| `/sales/funnel` | 1116x618 · 0.000 % · 0 px | 736x408 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `9e824c8cf9` |
| `/sales/sla` | 1116x593 · 0.000 % · 0 px | 736x392 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `9a5f81c245` |
| `/sales/channels` | 1116x593 · 0.000 % · 0 px | 736x392 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `02ba42274f` |
| `/sales/planning` | 1116x596 · 0.000 % · 0 px | 736x393 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `d0bc99452f` |
| `/finance/p-and-l` | 1116x597 · 0.000 % · 0 px | 736x394 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `a871539c04` |
| `/finance/balance-sheet` | 1116x613 · 0.000 % · 0 px | 736x405 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `2937dc8123` |
| `/finance/unit-economics` | 1116x611 · 0.000 % · 0 px | 736x404 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `e1416429b0` |
| `/organisation/headcount` | 1116x596 · 0.000 % · 0 px | 736x393 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `ce78371574` |
| `/organisation/hr` | 1116x571 · 0.000 % · 0 px | 736x377 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `f60fe055ae` |
| `/organisation/team` | 1116x565 · 0.000 % · 0 px | 736x373 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `f234af23ce` |
| `/strategy/okrs` | 1116x567 · 0.000 % · 0 px | 736x375 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `8cb788f36f` |
| `/strategy/balanced-scorecard` | 1116x570 · 0.000 % · 0 px | 736x377 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `c9a97f3d49` |
| `/strategy/growth-drivers` | 1116x570 · 0.000 % · 0 px | 736x377 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `e606f79e26` |
| `/legal/articles` | 1116x569 · 0.000 % · 0 px | 736x376 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `3d33160e5a` |
| `/legal/shareholders` | 1116x570 · 0.000 % · 0 px | 736x377 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `a897e461ef` |
| `/legal/commercial-register` | 1116x571 · 0.000 % · 0 px | 736x377 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `41b474d14f` |
| `/company/profile` | 1116x596 · 0.000 % · 0 px | 736x393 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `d82a17cd61` |
| `/company/highlights` | 1116x599 · 0.000 % · 0 px | 736x395 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `47dd504abc` |
| `/company/idea` | 1116x552 · 0.000 % · 0 px | 736x364 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `5308c120e5` |
| `/company/value-proposition` | 1116x485 · 0.000 % · 0 px | 736x320 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `5045a6eb93` |
| `/company/history` | 1116x491 · 0.000 % · 0 px | 736x324 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `5450247b89` |
| `/product/features` | 1116x484 · 0.000 % · 0 px | 736x320 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `992b385d09` |
| `/product/pricing` | 1116x499 · 0.000 % · 0 px | 736x330 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `151beb5422` |
| `/product/performance` | 1116x471 · 0.000 % · 0 px | 736x311 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `65a636f72f` |
| `/product/roadmap` | 1116x694 · 0.000 % · 0 px | 736x458 · 0.000 % · 0 px | 1.82 / 1.82× · 0 px | `c2e35188ed` |

## Unveränderte Seiten (Baseline `61e70dc` → neu)

Abweichungen stammen aus der Uhrzeit des Datenstands („Stand: hh:mm:ss“), 1-px-Zeilenversatz in
Tabellen und dem Versionstext `V2.3.1` → `V2.3.2` (Login, Sidebar-Fuß). Der Quellcode dieser
Seiten ist unverändert.

| Seite | Breite | Abweichung | SHA-256 gleich |
|---|---|---|---|
| login | 1440 | 0.072 % | nein |
| company_data-basis | 1440 | 0.003 % | nein |
| company_location | 1440 | 0.003 % | nein |
| crm_leads | 1440 | 0.009 % | nein |
| crm_companies | 1440 | 0.010 % | nein |
| crm_deals | 1440 | 0.282 % | nein |
| crm_activities | 1440 | 0.003 % | nein |
| login | 768 | 0.118 % | nein |
| company_data-basis | 768 | 0.000 % | ja |
| company_location | 768 | 0.006 % | nein |
| crm_leads | 768 | 0.009 % | nein |
| crm_companies | 768 | 0.012 % | nein |
| crm_deals | 768 | 0.033 % | nein |
| crm_activities | 768 | 0.000 % | ja |
| login | 375 | 0.307 % | nein |
| company_data-basis | 375 | 0.000 % | ja |
| company_location | 375 | 0.008 % | nein |
| crm_leads | 375 | 0.028 % | nein |
| crm_companies | 375 | 0.029 % | nein |
| crm_deals | 375 | 0.026 % | nein |
| crm_activities | 375 | 0.000 % | ja |
