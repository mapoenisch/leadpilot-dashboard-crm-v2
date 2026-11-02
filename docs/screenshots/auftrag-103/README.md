# Auftrag 103 – Screenshot-Matrix Produktseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/product/pricing`, `/product/performance` als ganze Seite.
Vorher = `main` nach PR #89 (Ganzseitenbild), Nachher = Branch `claude/auftrag-103-g2-welle-10`
(Seitenfreigabe `HTML_PAGES`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter `artifacts/auftrag-103/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Kerninhalte des Originals sichtbar, Zahl der
3D-Diagramme (Preismodell 0, Performance 1 – Quartalsverlauf als 3D-Fläche), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0; bei 150 %/200 % Textgröße wächst die kleinste berechnete Schrift im Hauptinhalt (inkl. Diagrammbeschriftung) mindestens um den Faktor gegenüber 375 px.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Kerninhalte | 3D | Überlauf | abgeschnitten | kleinste Schrift | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | ---------------: | --- |
| preismodell | 1440 | dark | `ad0e13699de8` | `95ad8cb644b1` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 1440 | light | `c1868a814144` | `c3a99d6ca8c9` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 768 | dark | `ab9b5a9e4863` | `9437c398a593` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 768 | light | `5eaecc9ac320` | `a26ba737968a` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 375 | dark | `c757fd9edc53` | `39ba39edef58` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 375 | light | `20d59f40d072` | `fcc3f4552af5` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 320 | dark | `2693ff38b9d6` | `9b7023fa63c2` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 320 | light | `4e2b1dc0a157` | `6387f514824b` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 250 | dark | `4b97a34e5cfd` | `c2951f312aad` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 250 | light | `4a8fd4851000` | `2cee7fa0d1a9` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 11 px | 0 |
| preismodell | 375t150 | dark | `3c9c46fcedae` | `390319923598` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 16.5 px | 0 |
| preismodell | 375t150 | light | `86b0e76057fa` | `40b7bb92ed0b` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 16.5 px | 0 |
| preismodell | 375t200 | dark | `f371783b4fbd` | `7499e92c59a7` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 22 px | 0 |
| preismodell | 375t200 | light | `692dbafc2b09` | `6de2e9a37b74` | 1 → 0 | 1 | 7/7 | 0 | 0 px | 0 px | 22 px | 0 |
| performance | 1440 | dark | `60817b2781ae` | `07fcce01f6b0` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 1440 | light | `db788c530d2a` | `eb122ac3b2b2` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 768 | dark | `5d413b4168ea` | `c2696510b76c` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 768 | light | `4a44594bc8bc` | `2486895262bf` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 375 | dark | `944b75619622` | `36ef6ad8012d` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 375 | light | `93c782e71b59` | `d082daa5c278` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 320 | dark | `d6d649e2eb44` | `4e55730e5f1e` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 320 | light | `cd8e23f93911` | `5aed630f8ddc` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 250 | dark | `a17a4904557b` | `46d51496ef67` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 250 | light | `0afd2cc8888e` | `8b65509f1c72` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 9 px | 0 |
| performance | 375t150 | dark | `e383c87bace5` | `571b4b08bc99` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 13.5 px | 0 |
| performance | 375t150 | light | `7dcd8ba38a44` | `1d220fba090f` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 13.5 px | 0 |
| performance | 375t200 | dark | `38d20c9b8fdd` | `5c6952643667` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 18 px | 0 |
| performance | 375t200 | light | `28b841df518e` | `9e8bf0a9d024` | 1 → 0 | 1 | 6/6 | 1 | 0 px | 0 px | 18 px | 0 |

**Ergebnis:** 28/28 Aufnahmen bestanden.
