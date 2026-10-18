# Auftrag 100 – Screenshot-Matrix Organisationsseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/organisation/headcount`, `/organisation/hr`, `/organisation/team` als ganze Seite.
Vorher = `main` nach PR #86 (Ganzseitenbild), Nachher = Branch `claude/auftrag-100-g2-welle-7`
(Seitenfreigabe `HTML_PAGES`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter `artifacts/auftrag-100/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Diagramme (Headcount 1, HR 0, Team 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0; bei 150 %/200 % Textgröße wächst die kleinste berechnete Schrift im Hauptinhalt (inkl. Diagrammbeschriftung) mindestens um den Faktor gegenüber 375 px.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | kleinste Schrift | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | ---------------: | --- |
| headcount | 1440 | dark | `9e6197bd3c04` | `c661047c6040` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 1440 | light | `467be72ad79f` | `9ab1f1810c4c` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 768 | dark | `9de016e0c8ad` | `79e7e757b1d3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 768 | light | `d089ab94dc7c` | `3277cabac33d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375 | dark | `20c13c81b110` | `25ba88a4779b` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375 | light | `6484d4be4364` | `531509630974` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 320 | dark | `de14af21e3ba` | `33bacb6040d9` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 320 | light | `d4fe5d3c5498` | `1c74574147b3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 250 | dark | `4593317b93f7` | `b0b78b0cd522` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 250 | light | `707198602bf6` | `36edcf387567` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375t150 | dark | `c857c1db8c5c` | `8313198ab827` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 16.5 px | 0 |
| headcount | 375t150 | light | `4f31dbbd92f1` | `109b76727edd` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 16.5 px | 0 |
| headcount | 375t200 | dark | `9f6f810c1da6` | `d0ab08b843d6` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 22 px | 0 |
| headcount | 375t200 | light | `02be6945bbcd` | `f1b8cf789a9d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 22 px | 0 |
| hr | 1440 | dark | `90e70dfe21ba` | `b2339c412be4` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 1440 | light | `208fca3c54c1` | `d7d0b313ae11` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 768 | dark | `4f30a18c0c1e` | `226801521e80` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 768 | light | `375f5c61984e` | `a4935e7f4d0c` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375 | dark | `295287500f4f` | `e57b7ba62fdf` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375 | light | `0c7a91f4ca91` | `67c09e5f217b` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 320 | dark | `e6de4890dd05` | `525560477344` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 320 | light | `85103ee05925` | `7ec1622ca8fe` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 250 | dark | `c08749204b43` | `2a22157ddc06` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 250 | light | `15089041a3ca` | `792a330336bb` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375t150 | dark | `0fab5894adc1` | `1ba16783412a` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 16.5 px | 0 |
| hr | 375t150 | light | `354d50823ca8` | `bc048cba8cd0` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 16.5 px | 0 |
| hr | 375t200 | dark | `ea44aa16b250` | `f9e07ccb1bb6` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 22 px | 0 |
| hr | 375t200 | light | `d51c48dd55f7` | `f2b1195e98db` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 22 px | 0 |
| team | 1440 | dark | `3126194347a4` | `df502684bcbb` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 1440 | light | `6f571147287e` | `0ed0e9303159` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 768 | dark | `dd28799ef0c0` | `965e62243279` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 768 | light | `47eb21c99478` | `57e07db31b4c` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375 | dark | `6a9bf544905e` | `f14eb007b1db` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375 | light | `20ed760f4887` | `a12e5d9143a6` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 320 | dark | `2493ce47d63e` | `50a177552a51` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 320 | light | `a325516268c9` | `70ca0cfd0a06` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 250 | dark | `3354c7f3175a` | `3f26f6009cbd` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 250 | light | `1f85418deacb` | `16aa7a7745b3` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375t150 | dark | `32b5e93caa86` | `9b5533cc6c4b` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| team | 375t150 | light | `29bc9f6b2cb2` | `2ef2aff8f6da` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| team | 375t200 | dark | `9d3a453a5081` | `8fc4a9bc9b31` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |
| team | 375t200 | light | `b45665d097dd` | `9a5f33ab49f7` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |

**Ergebnis:** 42/42 Aufnahmen bestanden.
