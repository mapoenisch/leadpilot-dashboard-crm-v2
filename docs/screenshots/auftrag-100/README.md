# Auftrag 100 – Screenshot-Matrix Organisationsseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/organisation/headcount`, `/organisation/hr`, `/organisation/team` als ganze Seite.
Vorher = `main` nach PR #86 (Ganzseitenbild), Nachher = Branch `claude/auftrag-100-g2-welle-7`
(Seitenfreigabe `HTML_PAGES`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter `artifacts/auftrag-100/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Diagramme (Headcount 1, HR 0, Team 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | --- |
| headcount | 1440 | dark | `9e6197bd3c04` | `c661047c6040` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 1440 | light | `467be72ad79f` | `d7a824c36571` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 768 | dark | `9de016e0c8ad` | `79e7e757b1d3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 768 | light | `d089ab94dc7c` | `c7f222eb6d7d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375 | dark | `20c13c81b110` | `c32bd84a27b5` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375 | light | `6484d4be4364` | `fe52714766fd` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 320 | dark | `de14af21e3ba` | `33bacb6040d9` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 320 | light | `d4fe5d3c5498` | `6380f511dd1c` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 250 | dark | `4593317b93f7` | `b0b78b0cd522` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 250 | light | `707198602bf6` | `cc5400c103c3` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375t150 | dark | `c857c1db8c5c` | `d7e5ce37cc07` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375t150 | light | `4f31dbbd92f1` | `31077296c989` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375t200 | dark | `9f6f810c1da6` | `1450cb4a4ae4` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375t200 | light | `02be6945bbcd` | `b8db6d40546d` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| hr | 1440 | dark | `90e70dfe21ba` | `b2339c412be4` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 1440 | light | `208fca3c54c1` | `d87aae83cce1` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 768 | dark | `4f30a18c0c1e` | `226801521e80` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 768 | light | `375f5c61984e` | `d35c8521631e` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375 | dark | `295287500f4f` | `e57b7ba62fdf` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375 | light | `0c7a91f4ca91` | `a8a0f999d16b` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 320 | dark | `e6de4890dd05` | `525560477344` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 320 | light | `85103ee05925` | `f1fee1deb5e7` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 250 | dark | `c08749204b43` | `99ac9b6fddd9` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 250 | light | `15089041a3ca` | `d5b101fc78db` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375t150 | dark | `0fab5894adc1` | `dd1695e2a5ed` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375t150 | light | `354d50823ca8` | `f1d4628b2c1d` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375t200 | dark | `ea44aa16b250` | `ab3b8045473c` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375t200 | light | `d51c48dd55f7` | `547d5cd1f681` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| team | 1440 | dark | `3126194347a4` | `ca5d33ec0f80` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 1440 | light | `6f571147287e` | `5df757a01473` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 768 | dark | `dd28799ef0c0` | `965e62243279` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 768 | light | `47eb21c99478` | `03ecd3c20b89` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375 | dark | `6a9bf544905e` | `f14eb007b1db` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375 | light | `20ed760f4887` | `69f062ea8012` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 320 | dark | `2493ce47d63e` | `6cf2c849bef7` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 320 | light | `a325516268c9` | `28da9a8c1ce3` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 250 | dark | `3354c7f3175a` | `c2075c9bce7a` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 250 | light | `1f85418deacb` | `a59c5f4430ab` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375t150 | dark | `32b5e93caa86` | `ed8bc2042c85` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375t150 | light | `29bc9f6b2cb2` | `2ef2aff8f6da` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375t200 | dark | `9d3a453a5081` | `8fc4a9bc9b31` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375t200 | light | `b45665d097dd` | `fe5b01d7d2e0` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |

**Ergebnis:** 42/42 Aufnahmen bestanden.
