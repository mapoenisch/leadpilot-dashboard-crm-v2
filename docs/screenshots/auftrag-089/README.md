# Auftrag 089 – Screenshot-Matrix Seitenkopf und mobile Hülle

Produktionsbuild gegen lokales Supabase (Testnutzer aus `supabase/seed.sql`), erster Bildschirm von
`/dashboard`. Vorher = Stand Auftrag 088, Nachher = Branch `claude/auftrag-089-dashboard-kopf-mobil`.
Bilder bleiben lokal unter `artifacts/auftrag-089/`. ✓ = erste Zahl vollständig ohne Scrollen sichtbar.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Unterkante erste Zahl | Simulationsleiste | Überlauf Dok./main | axe |
|---|---|---|---|---|---|---|---|
| 1440 | dark | `98349872f1c1` | `69bc7914b593` | 710 → 636 / 900 px ✓ | 51 → 51 px | 0/0 px | 0 |
| 1440 | light | `209a8160db3c` | `50509cab5639` | 710 → 636 / 900 px ✓ | 51 → 51 px | 0/0 px | 0 |
| 768 | dark | `d2ccf25838f0` | `5301126604dc` | 748 → 652 / 1024 px ✓ | 84 → 84 px | 0/0 px | 0 |
| 768 | light | `f601e6f7897d` | `f4ad9ea60229` | 748 → 652 / 1024 px ✓ | 84 → 84 px | 0/0 px | 0 |
| 375 | dark | `ce22dc2a34c1` | `25b2c863b677` | 684 → 573 / 812 px ✓ | 131 → 93 px | 0/0 px | 0 |
| 375 | light | `86876c986f43` | `66f478fcab83` | 684 → 573 / 812 px ✓ | 131 → 93 px | 0/0 px | 0 |
| 320 | dark | `83cd93eb9e15` | `d0318d943421` | 707 → 596 / 720 px ✓ | 131 → 93 px | 0/0 px | 0 |
| 320 | light | `a040057adeb1` | `83c95e53b45a` | 707 → 596 / 720 px ✓ | 131 → 93 px | 0/0 px | 0 |

Lade- und Fehlerzustand bei 375 × 812 (Abfrage der Dashboard-Einstellungen hängt bzw. antwortet 500):

| Zustand | Meldung oben–unten | Sofort sichtbar |
|---|---|---|
| zustand-laden-375-dark | 301–321 / 812 px | ✓ |
| zustand-fehler-375-dark | 251–313 / 812 px | ✓ |
| zustand-laden-375-light | 301–321 / 812 px | ✓ |
| zustand-fehler-375-light | 251–313 / 812 px | ✓ |

**Ergebnis:** 12/12 Aufnahmen bestanden.
