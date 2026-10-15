# Auftrag 094 – Screenshot-Matrix Unternehmensseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/company/idea`, `/company/value-proposition`, `/company/history` als ganze Seite.
Vorher = `main` nach PR #80 (Ganzseitenbild), Nachher = Branch `claude/auftrag-094-g2-welle-1`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-094/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, bei der
Geschäftsidee beide 3D-Illustrationen sichtbar, 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
| idee | 1440 | dark | `7ba991cd7166` | `407e5f75238c` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 1440 | light | `e948d7bac028` | `5d2fa3a9cd4f` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 768 | dark | `ff3b3f863ded` | `72b61c7b7d48` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 768 | light | `a24be40dbabe` | `b7742bd2597e` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 375 | dark | `5c505009c7d9` | `efc1d6c0d939` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 375 | light | `a5532cb0504e` | `2989ae7ed621` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 320 | dark | `ae26b12529af` | `00bd62637496` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 320 | light | `a5b25660f572` | `a2eca977e77b` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 250 | dark | `e450cd09e9c5` | `e5cc401993b4` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| idee | 250 | light | `979f0ef76933` | `96958e6f943b` | 1 → 0 | 1 | 2/2 | 2 | 0 px | 0 |
| value | 1440 | dark | `1889511889a4` | `71c3978f4201` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 1440 | light | `ebeb1391e1af` | `e0a65e556485` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 768 | dark | `30bb8fca0c31` | `d9aa1170e410` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 768 | light | `2cbb8abb185e` | `5f261c05894e` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 375 | dark | `9201fbd8d04c` | `5e291dc4f7e0` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 375 | light | `c73bb8e3b28f` | `928e2fc52e13` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 320 | dark | `227a9383fe4b` | `5451b15c378f` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 320 | light | `e633845ed3c8` | `4f79908feb2f` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 250 | dark | `fba02ae2647e` | `61fec5e8a62a` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| value | 250 | light | `10b66efb7996` | `c0fd69274e2e` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| historie | 1440 | dark | `0eec58fafaa8` | `4ff998ae120a` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 1440 | light | `850a60cf461a` | `05bd7bdc83b6` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 768 | dark | `a8b36950991d` | `739edb2cec9d` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 768 | light | `4f962d02331c` | `3f6f25827830` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 375 | dark | `4301665df9b8` | `71a45e3375f9` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 375 | light | `ac2b852cd82d` | `5e7fa780ac35` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 320 | dark | `9d70f6ffad84` | `76862430a6b2` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 320 | light | `bd8fe1717b8e` | `c6fac5fb9e79` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 250 | dark | `cfd88e47f183` | `39345b677248` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |
| historie | 250 | light | `d907a1c04c18` | `5df7a6ad5e1d` | 1 → 0 | 1 | 6/6 | – | 0 px | 0 |

**Ergebnis:** 30/30 Aufnahmen bestanden.
