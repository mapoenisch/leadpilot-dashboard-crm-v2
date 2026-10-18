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
| headcount | 1440 | dark | `9e6197bd3c04` | `b8469a8514c9` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 1440 | light | `467be72ad79f` | `9ab1f1810c4c` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 768 | dark | `9de016e0c8ad` | `79e7e757b1d3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 768 | light | `d089ab94dc7c` | `3c7d4bd1050b` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375 | dark | `20c13c81b110` | `c32bd84a27b5` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375 | light | `6484d4be4364` | `b9f81d0b4c2e` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 320 | dark | `de14af21e3ba` | `d8350900f142` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 320 | light | `d4fe5d3c5498` | `f43e434415e4` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 250 | dark | `4593317b93f7` | `eb4c1f6855e8` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 250 | light | `707198602bf6` | `cc5400c103c3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 11 px | 0 |
| headcount | 375t150 | dark | `c857c1db8c5c` | `25a0789af048` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 16.5 px | 0 |
| headcount | 375t150 | light | `4f31dbbd92f1` | `2a16044d419d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 16.5 px | 0 |
| headcount | 375t200 | dark | `9f6f810c1da6` | `d88c6ba0f3de` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 22 px | 0 |
| headcount | 375t200 | light | `02be6945bbcd` | `fe11bebc2a9d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 22 px | 0 |
| hr | 1440 | dark | `90e70dfe21ba` | `b2339c412be4` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 1440 | light | `208fca3c54c1` | `e543f5924186` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 768 | dark | `4f30a18c0c1e` | `226801521e80` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 768 | light | `375f5c61984e` | `664ff70692fb` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375 | dark | `295287500f4f` | `e57b7ba62fdf` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375 | light | `0c7a91f4ca91` | `67c09e5f217b` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 320 | dark | `e6de4890dd05` | `525560477344` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 320 | light | `85103ee05925` | `f1fee1deb5e7` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 250 | dark | `c08749204b43` | `c67c1fb6d737` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 250 | light | `15089041a3ca` | `792a330336bb` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 11 px | 0 |
| hr | 375t150 | dark | `0fab5894adc1` | `1ba16783412a` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 16.5 px | 0 |
| hr | 375t150 | light | `354d50823ca8` | `bc048cba8cd0` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 16.5 px | 0 |
| hr | 375t200 | dark | `ea44aa16b250` | `01df124ce2af` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 22 px | 0 |
| hr | 375t200 | light | `d51c48dd55f7` | `f2b1195e98db` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 22 px | 0 |
| team | 1440 | dark | `3126194347a4` | `ca5d33ec0f80` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 1440 | light | `6f571147287e` | `6ba3bc3bab86` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 768 | dark | `dd28799ef0c0` | `2b9cd42cc43f` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 768 | light | `47eb21c99478` | `bb99b44607ae` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375 | dark | `6a9bf544905e` | `8d6b5d825fd6` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375 | light | `20ed760f4887` | `69f062ea8012` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 320 | dark | `2493ce47d63e` | `1824da899d68` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 320 | light | `a325516268c9` | `70ca0cfd0a06` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 250 | dark | `3354c7f3175a` | `3f26f6009cbd` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 250 | light | `1f85418deacb` | `edbdd5f3430e` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| team | 375t150 | dark | `32b5e93caa86` | `ed8bc2042c85` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| team | 375t150 | light | `29bc9f6b2cb2` | `a0e126c6a627` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| team | 375t200 | dark | `9d3a453a5081` | `1fc0a22e1f54` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |
| team | 375t200 | light | `b45665d097dd` | `261f5d10bf24` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |

**Ergebnis:** 42/42 Aufnahmen bestanden.
