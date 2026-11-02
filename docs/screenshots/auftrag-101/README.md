# Auftrag 101 – Screenshot-Matrix Strategieseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/strategy/okrs`, `/strategy/balanced-scorecard`, `/strategy/growth-drivers` als ganze Seite.
Vorher = `main` nach PR #87 (Ganzseitenbild), Nachher = Branch `claude/auftrag-101-g2-welle-8`
(Seitenfreigabe `HTML_PAGES`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter `artifacts/auftrag-101/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Diagramme (Headcount 1, HR 0, Team 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0; bei 150 %/200 % Textgröße wächst die kleinste berechnete Schrift im Hauptinhalt (inkl. Diagrammbeschriftung) mindestens um den Faktor gegenüber 375 px.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | kleinste Schrift | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | ---------------: | --- |
| okrs | 1440 | dark | `864dc4e3f48d` | `fea76b16a27c` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 1440 | light | `605d57b0702c` | `ce760b599e12` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 768 | dark | `edba5de4b8b4` | `89cdff4f4021` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 768 | light | `d4ced8ccc7c1` | `498fbf736b30` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 375 | dark | `523dc6957098` | `d546eec2c1f9` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 375 | light | `e739c7cb793b` | `f17cac739d8f` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 320 | dark | `ff3f02569cf1` | `572dfd66ed8b` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 320 | light | `eade007f4423` | `c3b5b6e41bad` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 250 | dark | `07dd78016543` | `808f76928119` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 250 | light | `7b35b78f8aba` | `e1efa6b7c0a3` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 11 px | 0 |
| okrs | 375t150 | dark | `e06b16e83717` | `8aa55182b6f9` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 16.5 px | 0 |
| okrs | 375t150 | light | `49746f18eb02` | `a66a47cf2817` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 16.5 px | 0 |
| okrs | 375t200 | dark | `03f6f4d5d64e` | `970d6e3e110e` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 22 px | 0 |
| okrs | 375t200 | light | `40d4125e4566` | `1a8149286c90` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 px | 22 px | 0 |
| bsc | 1440 | dark | `b9743139cfe9` | `562496c5d78a` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 1440 | light | `0c6b3aa8522e` | `083c0ba357e7` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 768 | dark | `d13e36ba97f0` | `8450e771ac2b` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 768 | light | `ae2a9e378246` | `e517a7e5e1e9` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 375 | dark | `e6deb377f23d` | `d92e315b41ac` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 375 | light | `66670fb23178` | `ebbf69c7e0eb` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 320 | dark | `ad82696ed5f3` | `e1e024bd4ad0` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 320 | light | `381dc7c286bb` | `9b3365b680df` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 250 | dark | `87a526668106` | `8e85dfc87be2` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 250 | light | `ff4be3a57eb1` | `bd050cc17c04` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 11 px | 0 |
| bsc | 375t150 | dark | `77f3c488aee2` | `2f1e543c0cd8` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 16.5 px | 0 |
| bsc | 375t150 | light | `abaa6b2e3577` | `0add57c8136e` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 16.5 px | 0 |
| bsc | 375t200 | dark | `ed69426f76a0` | `4b7d1ee36539` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 22 px | 0 |
| bsc | 375t200 | light | `78318e6ed23e` | `d3a38416ac94` | 1 → 0 | 1 | 5/5 | 0 | 0 px | 0 px | 22 px | 0 |
| growth | 1440 | dark | `65d22176aef7` | `ceb595f92878` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 1440 | light | `a77a27a42ff2` | `f5e374a3ee58` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 768 | dark | `ceb963d1ae8d` | `d6f295dd0d9f` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 768 | light | `1d98f7bdbc82` | `ecda491a0cb1` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 375 | dark | `583888bd7198` | `3513a5809216` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 375 | light | `84c64c6795fd` | `3d36f64728c8` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 320 | dark | `62341ea6f1d6` | `fdf6b96fac25` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 320 | light | `a0cbab235975` | `ab9fc7ea79f4` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 250 | dark | `76c3f1a89f6f` | `8b5daef4a051` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 250 | light | `373b536183da` | `e9ce6196793e` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 11 px | 0 |
| growth | 375t150 | dark | `96c3a3266129` | `0b2739b1083b` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| growth | 375t150 | light | `eb6ccedc1ea7` | `8300804ced5b` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 16.5 px | 0 |
| growth | 375t200 | dark | `2fba1ed04ea0` | `2dc9496c5073` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |
| growth | 375t200 | light | `3f2b96be8ed7` | `e9588e6ebe84` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 22 px | 0 |

**Ergebnis:** 42/42 Aufnahmen bestanden.
