# Auftrag 095 – Screenshot-Matrix Unternehmensseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/company/profile`, `/company/highlights`, `/product/features`, `/product/roadmap` als ganze Seite.
Vorher = `main` nach PR #81 (Ganzseitenbild), Nachher = Branch `claude/auftrag-095-g2-welle-2`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-095/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, bei der
Funktionsweise vier 3D-Illustrationen, bei der Roadmap der Berg ab 900 px Breite, 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
| profil | 1440 | dark | `0fa3e8f8d395` | `0357df49c913` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 1440 | light | `f0dc0d664785` | `054c0c62f48a` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 768 | dark | `060afed10c1e` | `52abf0d2f981` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 768 | light | `addd9e08ab27` | `f4ed5c81f792` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 375 | dark | `cad795b1324c` | `6d6c80811853` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 375 | light | `808824dcb032` | `db318edf0529` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 320 | dark | `7d1037a3c1ec` | `7c073a895c16` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 320 | light | `24844e3fb0c8` | `fea9f8ab0f3c` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 250 | dark | `b70a56876295` | `597b944c2908` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| profil | 250 | light | `3a0c11ba2334` | `adbe6d0c522f` | 1 → 0 | 1 | 5/5 | – | 0 px | 0 |
| highlights | 1440 | dark | `b61d361cac6b` | `0ceae6cdc9ba` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 1440 | light | `110bb51c7e8e` | `c191928c3b2e` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 768 | dark | `cd851c83e029` | `fa32735549b4` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 768 | light | `deef6fedf70b` | `9d43c831492c` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 375 | dark | `10aa5d2005bc` | `d9118c5c9bcd` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 375 | light | `886c818b9d41` | `cd66bc61f017` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 320 | dark | `26fe654a7d8d` | `c508a796b7ee` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 320 | light | `4305a4252c0a` | `20c9615fefb6` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 250 | dark | `3e5c07d82f07` | `2ee225e198a0` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| highlights | 250 | light | `d98fd4d544e7` | `3603e5c3f4e8` | 1 → 0 | 1 | 4/4 | – | 0 px | 0 |
| funktion | 1440 | dark | `bb9a2f766ace` | `cb582910e002` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 1440 | light | `c1f1a8a42f96` | `f8f12f54d44b` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 768 | dark | `c8a1a64df520` | `91000cb9292c` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 768 | light | `4ce0afed01e7` | `8f06e9d3eceb` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 375 | dark | `3a08f88a430a` | `7f2114229828` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 375 | light | `fd5ce7927be9` | `f7d5ba96b1ee` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 320 | dark | `cb611d82e68e` | `2b898f166f00` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 320 | light | `392b86fa3b3b` | `d4447b2bad4a` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 250 | dark | `93629d040dd2` | `47d3758b54a2` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| funktion | 250 | light | `0d002a85dc5c` | `79f92cd92c80` | 1 → 0 | 1 | 5/5 | 4 | 0 px | 0 |
| roadmap | 1440 | dark | `5bacaca46c48` | `2594789bf52d` | 1 → 0 | 1 | 7/7 | 1 | 0 px | 0 |
| roadmap | 1440 | light | `81b557bedd4e` | `c28f156b0999` | 1 → 0 | 1 | 7/7 | 1 | 0 px | 0 |
| roadmap | 768 | dark | `3bedb041d241` | `3b23f83664ac` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 768 | light | `04f2b7a843d8` | `329b71444d04` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 375 | dark | `e6f574c8d575` | `f72344076f9e` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 375 | light | `9d725fe421d2` | `0ce0cb091161` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 320 | dark | `1e9343f46cf3` | `c6ab5b47633b` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 320 | light | `5f8dcc559d13` | `41f0a3868636` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 250 | dark | `1288737c80bf` | `691c85c28bbf` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |
| roadmap | 250 | light | `893f5adcac8a` | `2c54c993962e` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 |

**Ergebnis:** 40/40 Aufnahmen bestanden.
