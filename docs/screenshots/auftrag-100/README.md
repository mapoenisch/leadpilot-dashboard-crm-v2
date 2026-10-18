# Auftrag 100 – Screenshot-Matrix Organisationsseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/organisation/headcount`, `/organisation/hr`, `/organisation/team` als ganze Seite.
Vorher = `main` nach PR #86 (Ganzseitenbild), Nachher = Branch `claude/auftrag-100-g2-welle-7`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-100/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Diagramme (Headcount 1, HR 0, Team 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | --- |
| headcount | 1440 | dark | `624f19219107` | `c661047c6040` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 1440 | light | `f5139908726b` | `aa620bc9d91b` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 768 | dark | `f50eb7d8626e` | `363757634040` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 768 | light | `1871d43da0bc` | `3c7d4bd1050b` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375 | dark | `70eb33d2e804` | `c32bd84a27b5` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 375 | light | `36e56c117739` | `fe52714766fd` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 320 | dark | `959cd7015726` | `33bacb6040d9` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 320 | light | `239d3c6189fb` | `82bab11bb8ed` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 250 | dark | `69009b8543d2` | `08d3badc25c8` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| headcount | 250 | light | `a598998e095b` | `ef6781d7306c` | 1 → 0 | 1 | 4/4 | 1 | 0 px | 0 px | 0 |
| hr | 1440 | dark | `38079a4fadad` | `b2339c412be4` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 1440 | light | `fb371ee690c2` | `6b24eeff850f` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 768 | dark | `14a20465d13d` | `5777caa8b665` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 768 | light | `790744ad364b` | `a4935e7f4d0c` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375 | dark | `78709c533a30` | `e57b7ba62fdf` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 375 | light | `58773fb0faa4` | `67c09e5f217b` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 320 | dark | `bc264dd00a1d` | `ab40b707fd4a` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 320 | light | `8b71712e0789` | `27dff0779b3c` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 250 | dark | `995ad3b73a08` | `99ac9b6fddd9` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| hr | 250 | light | `337ab14648d3` | `d5b101fc78db` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| team | 1440 | dark | `0770ea8bfb4f` | `ca5d33ec0f80` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 1440 | light | `9a000c415130` | `112f916c4869` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 768 | dark | `a83350670db9` | `2b9cd42cc43f` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 768 | light | `88d35ee172cf` | `03ecd3c20b89` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375 | dark | `fd21357ece85` | `f14eb007b1db` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 375 | light | `b7846cb0aff6` | `a12e5d9143a6` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 320 | dark | `667f7c768dd4` | `1824da899d68` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 320 | light | `1e8d4a66510b` | `b3c87218953b` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 250 | dark | `4f0d4ab8193b` | `696601a4d9db` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |
| team | 250 | light | `e06f062f02de` | `538e466dcdff` | 1 → 0 | 1 | 3/3 | 0 | 0 px | 0 px | 0 |

**Ergebnis:** 30/30 Aufnahmen bestanden.
