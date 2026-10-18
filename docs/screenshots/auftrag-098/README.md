# Auftrag 098 – Screenshot-Matrix Marktseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/market/overview`, `/market/competition`, `/market/swot` als ganze Seite.
Vorher = `main` nach PR #84 (Ganzseitenbild), Nachher = Branch `claude/auftrag-098-g2-welle-4`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-098/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Säulen (Marktlage 0, Wettbewerb 6, SWOT 0), 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
| markt | 1440 | dark | `90a2b9a30264` | `029bed616455` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 1440 | light | `31c350e72616` | `251eea3f527d` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 768 | dark | `99d8ecbede97` | `3661f9c248f0` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 768 | light | `537f861a8c7a` | `50d67a146fb6` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 375 | dark | `240e0525799b` | `83d018bfea24` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 375 | light | `f68d40c4fec6` | `18e4b7f1f141` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 320 | dark | `57d3f5fe01e6` | `919056353364` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 320 | light | `9a1084801863` | `ae9b72981581` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 250 | dark | `74d9be469a59` | `e86d77646cb8` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| markt | 250 | light | `93cbee2a2276` | `00cc444d54f9` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 |
| wettbewerb | 1440 | dark | `2e8a21d7608e` | `1cd73193cacf` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 1440 | light | `d730fcd82bd3` | `93964cc3015d` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 768 | dark | `415c12bbc0bc` | `df09070ec867` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 768 | light | `83e80e7e3161` | `2d245c416835` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 375 | dark | `e707764f5c19` | `d7efcc034522` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 375 | light | `a9bcf600be71` | `2e04cde28466` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 320 | dark | `8a4bf2c62cd1` | `9d631d4ed76d` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 320 | light | `a2d3693104de` | `184a98c22e6c` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 250 | dark | `0e4a4908a1fb` | `fdbbf203bd4b` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| wettbewerb | 250 | light | `e521779e810d` | `721420e6bf18` | 1 → 0 | 1 | 2/2 | 6 | 0 px | 0 |
| swot | 1440 | dark | `bf1c3c162749` | `de71aa0f4ab7` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 1440 | light | `ae08d432ba9a` | `1a04b6aabf9f` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 768 | dark | `6b548324f651` | `969684658b56` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 768 | light | `6b2b0aec5400` | `3af729e956c3` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 375 | dark | `1ef93e46f20a` | `bb9818547851` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 375 | light | `d7b3bbf4cbb6` | `ad06460b29a1` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 320 | dark | `d995a8dc3272` | `39a54c25490d` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 320 | light | `c6a08164073e` | `de206190af2c` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 250 | dark | `ad7068cc266f` | `12a0211ca299` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |
| swot | 250 | light | `600efb8830a6` | `0eae600d4b4a` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 |

**Ergebnis:** 30/30 Aufnahmen bestanden.
