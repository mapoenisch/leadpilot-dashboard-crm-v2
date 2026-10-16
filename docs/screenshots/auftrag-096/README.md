# Auftrag 096 – Screenshot-Matrix Vertriebsseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/sales/sla`, `/sales/channels`, `/sales/planning` als ganze Seite.
Vorher = `main` nach PR #82 (Ganzseitenbild), Nachher = Branch `claude/auftrag-096-g2-welle-3`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-096/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Säulen (SLA 0, Kanäle 5, Planung 16), 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
| sla | 1440 | dark | `c2b8662f93da` | `644a10a7c618` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 1440 | light | `8d4b8c2a3ffa` | `6361c2ecc32a` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 768 | dark | `0fb766cc3844` | `9bae0cf46ee5` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 768 | light | `48ac3142bc37` | `a6a610f77296` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 375 | dark | `0bc0b82dbb44` | `1f9be6b95a13` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 375 | light | `98090157243b` | `2d65d2f60be0` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 320 | dark | `5699f8b0c763` | `f7c5d85a4216` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 320 | light | `7d9bd7403d05` | `678bc313c4df` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 250 | dark | `310c73274604` | `ee7cd65c42cb` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| sla | 250 | light | `f5d053e5b108` | `d0e9c7085ac5` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 |
| kanaele | 1440 | dark | `633f6b0bc959` | `60270c861b3a` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 1440 | light | `efdb47c695a9` | `9b639cd7e378` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 768 | dark | `c2e1dd0d0844` | `193816d94ee5` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 768 | light | `82e583a9bdb5` | `6820b0126d65` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 375 | dark | `b92e96f1033c` | `bb18a35e05f5` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 375 | light | `a79568450024` | `8770f7776d53` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 320 | dark | `439c6ff05931` | `e0024ced4f0c` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 320 | light | `1beb4c4055a9` | `339ffe734b04` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 250 | dark | `e1181326888b` | `067dba59fc88` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| kanaele | 250 | light | `7d7e29e57e0a` | `bba1ba106917` | 1 → 0 | 1 | 4/4 | 5 | 0 px | 0 |
| planung | 1440 | dark | `769e3f30953d` | `b6a4ddbe7f07` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 1440 | light | `a87282bcc539` | `ae8d53578951` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 768 | dark | `da30f40c7325` | `c0b2f53e47d4` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 768 | light | `6b441212ab64` | `0d3c7c3a2c2d` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 375 | dark | `39ec2bbef045` | `ca0f02f129aa` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 375 | light | `46a376a48b50` | `8045a7769bfb` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 320 | dark | `5ee99102a13f` | `816ffca53d81` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 320 | light | `8569a6f7d8f0` | `3e92ebf06fff` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 250 | dark | `8cd4f6139d94` | `f3e5513c7549` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |
| planung | 250 | light | `bc52e8e4a370` | `c1e1454d49dc` | 1 → 0 | 1 | 4/4 | 16 | 0 px | 0 |

**Ergebnis:** 30/30 Aufnahmen bestanden.
