# Auftrag 097 – Screenshot-Matrix Finanzseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/finance/p-and-l`, `/finance/balance-sheet`, `/finance/unit-economics` als ganze Seite.
Vorher = `main` nach PR #83 (Ganzseitenbild), Nachher = Branch `claude/auftrag-097-g2-welle-4`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-097/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Säulen (GuV 12, Bilanz 0, Unit Economics 0), 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
| guv | 1440 | dark | `3da2688b3b2f` | `ba8b789e46f9` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 1440 | light | `d7dc6bbce836` | `21010c2e78bc` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 768 | dark | `4333173f4efe` | `4ecdad97f1b3` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 768 | light | `2351ac3d9e20` | `ec08917d3a8a` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 375 | dark | `5bdc64fb7df9` | `db65e5f6eff0` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 375 | light | `f52e7e08d185` | `eeb3f67364c1` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 320 | dark | `214a7ef66240` | `6ca740017367` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 320 | light | `6612bf7515f2` | `1efc56cdcd05` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 250 | dark | `8f23d2fa654d` | `19c99ebedb88` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| guv | 250 | light | `aa38dcf0b7f8` | `7a84c0e12553` | 1 → 0 | 1 | 3/3 | 12 | 0 px | 0 |
| bilanz | 1440 | dark | `f1082d83a3ec` | `e20adafd072f` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 1440 | light | `81cb8f96d8e5` | `17fae3b5ff59` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 768 | dark | `2682a0422603` | `8a47e75e2606` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 768 | light | `54dddd6d578f` | `8015b6121508` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 375 | dark | `84c033e85946` | `cd8eab827c38` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 375 | light | `3917c6b4d993` | `929a4fdea640` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 320 | dark | `7b0802452cd9` | `ea7688fd17da` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 320 | light | `f0d47f421a16` | `625026b0bd0a` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 250 | dark | `ca6ed3c69bfb` | `a3bcdac3de34` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| bilanz | 250 | light | `e45eb8ec800e` | `eaaafc356941` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 1440 | dark | `97506c1733be` | `d8a82a5d27f8` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 1440 | light | `fa4007e396eb` | `891ecc0991b4` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 768 | dark | `53cb2ef564ab` | `5df8f3e7c937` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 768 | light | `30e9812bc6fe` | `505e2dec7964` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 375 | dark | `c0d8eb27be1d` | `cc68014f1cd6` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 375 | light | `d3cbd90d14d7` | `13db29a873df` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 320 | dark | `c039d355d0c2` | `59ddc2a8acfa` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 320 | light | `b77f03accd4f` | `b20cd69b6d8e` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 250 | dark | `d19d05651e33` | `cf799274c6cb` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| unit | 250 | light | `d2a430e2ad6e` | `85f1bbfeb170` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |

**Ergebnis:** 30/30 Aufnahmen bestanden.
