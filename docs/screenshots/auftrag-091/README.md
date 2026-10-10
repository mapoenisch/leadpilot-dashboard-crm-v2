# Auftrag 091 – Screenshot-Matrix Kennzahlnamen, Vorjahr, kompakte Zahlkachel

Produktionsbuild gegen lokales Supabase (Testnutzer aus `supabase/seed.sql`), `/dashboard`.
Vorher = `main` nach Auftrag 090, Nachher = Branch `claude/auftrag-091-paket-e-rest`. Höhen über alle
Zahlkacheln der Standardansicht (auch außerhalb des ersten Bildschirms). „Gewöhnlich“ = Klartext,
Metazeile und Zahl je einzeilig und ohne Vorjahreszeile; für sie gilt der Richtwert 160–220 px. Bilder bleiben lokal unter
`artifacts/auftrag-091/`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Median Zahlkachel | höchste Zahlkachel | gewöhnliche Zahlkacheln | Klartext / Vorjahr | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|---|---|
| 1440 | dark | `044a288e72a5` | `58f0a1793762` | 286 → 240 px | 340 → 272 px | 3 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 1440 | light | `37732bedc215` | `3484ff28fcdd` | 286 → 240 px | 340 → 272 px | 3 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 768 | dark | `50fac0b1618c` | `dc70ee6af434` | 268 → 222 px | 304 → 254 px | 5 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 768 | light | `ef529948c33e` | `d08f21551b30` | 268 → 222 px | 304 → 254 px | 5 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 375 | dark | `86ff03381344` | `059f068189bd` | 268 → 222 px | 304 → 254 px | 5 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 375 | light | `76c5ecbab6d2` | `e43a6ba13ca8` | 268 → 222 px | 304 → 254 px | 5 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 320 | dark | `159a8bfd22a6` | `576be85a412e` | 268 → 240 px | 322 → 272 px | 4 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |
| 320 | light | `a1a891a71a1b` | `324d00c9ee41` | 268 → 240 px | 322 → 272 px | 4 × ≤ 218 px | 8 / 3 | 0/0 px | 0 |

**Ergebnis:** 8/8 Aufnahmen bestanden. Richtwert 160–220 px für gewöhnliche Zahlkacheln geprüft bei 1440 px; längere Inhalte bleiben vollständig sichtbar und dürfen höher sein.
