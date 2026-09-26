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
- **axe (G67-5, Nacharbeit Codex-Befund):** `@axe-core/playwright` (vorhandene Abhängigkeit) je Seite im
  neuen Stand und in der Baseline; „neu“ = Regel-ID, die nur im neuen Stand verletzt ist.

## Ergebnis

| Kriterium | Ergebnis |
|---|---|
| G67-1 Bild-Identität | 32/32 Seiten zeigen die Datei laut Auftrag; SHA-256 = `ASSET_SOURCE.md` (Test); `git diff v2.2.0 -- public/assets/auftrag-037*` leer |
| G67-2 Bild-zu-Bild 1440 px | 32/32 gleiche Größe, **0,000 %** Abweichung (max.) |
| G67-3 Bild-zu-Bild 768 px | 32/32 gleiche Größe, **0,000 %** Abweichung (max.) |
| G67-4 Handy | 375×812 hoch: 32/32 ganzes Bild in voller Breite (343 px), Hinweis sichtbar. 812×375 quer: 32/32 volle Breite (780 px), kein Hinweis. 0 px Überlauf. Zoom nicht gesperrt (Test) |
| G67-5 Textschicht | 128/128 Aufnahmen: genau eine `h1` in `#main-content`, Textschicht 1×1 px, ≥ 371 Zeichen |
| G67-5 axe | 64/64 Scans (32 Seiten × 1440/375 px, alle Schweregrade): **0 neue Verstöße** gegenüber `61e70dc`. Vorbestehend in beiden Ständen: `landmark-unique` [moderate] auf `/customers/segments` und `/sales/sla` |
| G67-6 Rückweg | Test beide Schalterstellungen grün; `v2.3.1^{commit}` = `1bbe32da01d8b4b1b00b3a85e7d3c8108ce338e2` |
| G67-7 Unberührt | 21 Aufnahmen, max. 0,307 % (Login 375 px: Versionstext V2.3.2). Siehe unten |
| Horizontaler Überlauf 1440/768 | 0 von 64 |

### Befund Lage (keine Änderung, nur zur Kenntnis)

Das Bild sitzt im neuen Stand auf allen Breiten 1 px tiefer als in v2.2.0. Auf 768 px lagen
`/sales/planning` und `/organisation/team` in v2.2.0 23,75 px tiefer (der Seitentitel in der
Kopfleiste brach dort um); jetzt liegen alle 32 Seiten einheitlich. Ursache ist die Kopfleiste
(Sidebar/Topbar), die laut Auftrag nicht geändert wird.

## Matrix Bildseiten (Größe · Abweichung · Überlauf; Handy: Bildbreite · Hinweis · Überlauf)

Handy-Fassung nach Marcs Entscheid vom 26.09.2026: keine Kacheln, ganzes Bild; im Hochformat Hinweis
„Handy quer drehen oder mit zwei Fingern zoomen“. Die erste Kachel-Fassung ist verworfen.

| Route | 1440 | 768 | 375×812 hoch | 812×375 quer |
|---|---|---|---|---|
| `/market/overview` | 1116x596 · 0,000 % · 0 px | 736x394 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/market/competition` | 1116x596 · 0,000 % · 0 px | 736x394 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/market/swot` | 1116x596 · 0,000 % · 0 px | 736x394 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/customers/icp` | 1116x565 · 0,000 % · 0 px | 736x373 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/customers/persona` | 1116x557 · 0,000 % · 0 px | 736x368 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/customers/segments` | 1116x554 · 0,000 % · 0 px | 736x366 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/customers/top-customers` | 1116x555 · 0,000 % · 0 px | 736x367 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/sales/funnel` | 1116x618 · 0,000 % · 0 px | 736x408 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/sales/sla` | 1116x593 · 0,000 % · 0 px | 736x392 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/sales/channels` | 1116x593 · 0,000 % · 0 px | 736x392 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/sales/planning` | 1116x596 · 0,000 % · 0 px | 736x393 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/finance/p-and-l` | 1116x597 · 0,000 % · 0 px | 736x394 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/finance/balance-sheet` | 1116x613 · 0,000 % · 0 px | 736x405 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/finance/unit-economics` | 1116x611 · 0,000 % · 0 px | 736x404 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/organisation/headcount` | 1116x596 · 0,000 % · 0 px | 736x393 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/organisation/hr` | 1116x571 · 0,000 % · 0 px | 736x377 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/organisation/team` | 1116x565 · 0,000 % · 0 px | 736x373 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/strategy/okrs` | 1116x567 · 0,000 % · 0 px | 736x375 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/strategy/balanced-scorecard` | 1116x570 · 0,000 % · 0 px | 736x377 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/strategy/growth-drivers` | 1116x570 · 0,000 % · 0 px | 736x377 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/legal/articles` | 1116x569 · 0,000 % · 0 px | 736x376 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/legal/shareholders` | 1116x570 · 0,000 % · 0 px | 736x377 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/legal/commercial-register` | 1116x571 · 0,000 % · 0 px | 736x377 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/company/profile` | 1116x596 · 0,000 % · 0 px | 736x393 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/company/highlights` | 1116x599 · 0,000 % · 0 px | 736x395 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/company/idea` | 1116x552 · 0,000 % · 0 px | 736x364 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/company/value-proposition` | 1116x485 · 0,000 % · 0 px | 736x320 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/company/history` | 1116x491 · 0,000 % · 0 px | 736x324 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/product/features` | 1116x484 · 0,000 % · 0 px | 736x320 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/product/pricing` | 1116x499 · 0,000 % · 0 px | 736x330 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/product/performance` | 1116x471 · 0,000 % · 0 px | 736x311 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |
| `/product/roadmap` | 1116x694 · 0,000 % · 0 px | 736x458 · 0,000 % · 0 px | 343 px · Hinweis ja · 0 px | 780 px · Hinweis nein · 0 px |

## Unveränderte Seiten (Baseline `61e70dc` → neu)

Abweichungen stammen aus der Uhrzeit des Datenstands („Stand: hh:mm:ss“), 1-px-Zeilenversatz in
Tabellen und dem Versionstext `V2.3.1` → `V2.3.2` (Login, Sidebar-Fuß). Der Quellcode dieser
Seiten ist unverändert.

| Seite | Breite | Abweichung | SHA-256 gleich |
|---|---|---|---|
| login | 1440 | 0,072 % | nein |
| company_data-basis | 1440 | 0,003 % | nein |
| company_location | 1440 | 0,003 % | nein |
| crm_leads | 1440 | 0,009 % | nein |
| crm_companies | 1440 | 0,012 % | nein |
| crm_deals | 1440 | 0,012 % | nein |
| crm_activities | 1440 | 0,003 % | nein |
| login | 768 | 0,118 % | nein |
| company_data-basis | 768 | 0,000 % | ja |
| company_location | 768 | 0,006 % | nein |
| crm_leads | 768 | 0,011 % | nein |
| crm_companies | 768 | 0,033 % | nein |
| crm_deals | 768 | 0,012 % | nein |
| crm_activities | 768 | 0,000 % | ja |
| login | 375 | 0,307 % | nein |
| company_data-basis | 375 | 0,000 % | ja |
| company_location | 375 | 0,008 % | nein |
| crm_leads | 375 | 0,026 % | nein |
| crm_companies | 375 | 0,027 % | nein |
| crm_deals | 375 | 0,030 % | nein |
| crm_activities | 375 | 0,000 % | ja |
