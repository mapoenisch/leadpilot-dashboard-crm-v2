# Auftrag 102 – Screenshot-Matrix Rechtsseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/legal/articles`, `/legal/shareholders`, `/legal/commercial-register` als ganze Seite.
Vorher = `main` nach PR #88 (Ganzseitenbild), Nachher = Branch `claude/auftrag-102-g2-welle-9`
(Seitenfreigabe `HTML_PAGES`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter `artifacts/auftrag-102/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Kerninhalte des Originals sichtbar, Zahl der
3D-Diagramme (Satzung 0, Gesellschafter 0, Register 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0; bei 150 %/200 % Textgröße wächst die kleinste berechnete Schrift im Hauptinhalt (inkl. Diagrammbeschriftung) mindestens um den Faktor gegenüber 375 px.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Kerninhalte | 3D | Überlauf | abgeschnitten | kleinste Schrift | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | ---------------: | --- |
| satzung | 1440 | dark | `2bce62e69134` | `c1ad77dda46a` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 1440 | light | `0f83287326bc` | `ca462e967655` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 768 | dark | `9cfaa59b11a5` | `0cd9917a7bcb` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 768 | light | `b49da4eaa7ba` | `921a75f5a790` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 375 | dark | `4f1f27eeb3a4` | `909276ab3cdd` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 375 | light | `de139356aae5` | `51679b459484` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 320 | dark | `7b3c85d2c515` | `e80e0275ab32` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 320 | light | `16326c2c43a6` | `a012ce637950` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 250 | dark | `24cbfa47c06e` | `c662f9b8af92` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 250 | light | `2e1917caac80` | `dea939ded044` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| satzung | 375t150 | dark | `6fc4b07f233d` | `14fee09b886e` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| satzung | 375t150 | light | `352c9a1dd014` | `f8ab9ac15d2b` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| satzung | 375t200 | dark | `d43014c5b94b` | `a611a73b6552` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |
| satzung | 375t200 | light | `18593ff36185` | `0233eb822e3c` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |
| gesellschafter | 1440 | dark | `ccdfe3b0d54e` | `8627fd361f8c` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 1440 | light | `d0324ab3671e` | `1721e19529a1` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 768 | dark | `79a8ced4b2cf` | `e4f48abe8e54` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 768 | light | `5929bd606133` | `439d472e3f46` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 375 | dark | `83f2d604755d` | `05e4d033d2ed` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 375 | light | `22c3003ae8ae` | `fa4fdaea1f76` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 320 | dark | `e3ce492e6bdf` | `bc6ba836c27d` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 320 | light | `49a78c021012` | `39a3d3480744` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 250 | dark | `0a46bc52707b` | `eaf1fcf302eb` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 250 | light | `e0c41b4f1373` | `4a35bf3e2570` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| gesellschafter | 375t150 | dark | `55998713551c` | `1407f7d62594` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| gesellschafter | 375t150 | light | `3574c3a19b61` | `b44dd8a1f384` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| gesellschafter | 375t200 | dark | `487ace8fa632` | `fe8b262db813` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |
| gesellschafter | 375t200 | light | `d7530199bce0` | `f3f4a2728665` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |
| register | 1440 | dark | `73bb8e2697c9` | `b04d9b550555` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 1440 | light | `81f2ddfd5f4e` | `582a15bebfc3` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 768 | dark | `6fd39385bd78` | `359a7e2b780e` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 768 | light | `8d1342b41da4` | `cb34f62d9f42` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 375 | dark | `4aae1ff8aacb` | `e15bb1d689a6` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 375 | light | `665e47d53778` | `67ac91ca0012` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 320 | dark | `7f0c6d94b5b2` | `f96754173d98` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 320 | light | `84293c0aed7f` | `9a7ff9d43969` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 250 | dark | `61979de08370` | `e3521acda3e7` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 250 | light | `906e30df0991` | `e585c7f1e7fc` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 11 px | 0 |
| register | 375t150 | dark | `026b1110e425` | `403c338e4e82` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| register | 375t150 | light | `2a5c2cca5e4d` | `a8b87428c544` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 16.5 px | 0 |
| register | 375t200 | dark | `1b2e88fabcc7` | `0d89eba790e3` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |
| register | 375t200 | light | `0d59a0318dd8` | `11def6caa733` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 22 px | 0 |

**Ergebnis:** 42/42 Aufnahmen bestanden.
