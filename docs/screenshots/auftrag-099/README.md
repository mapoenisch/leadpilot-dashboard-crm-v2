# Auftrag 099 – Screenshot-Matrix Kundenseiten als HTML-Seiten

Produktionsbuild (`vite preview`), Anmeldung über gespeicherten Playwright-Login. Seiten
`/customers/icp`, `/customers/persona`, `/customers/segments`, `/customers/top-customers` als ganze Seite.
Vorher = `main` nach PR #85 (Ganzseitenbild), Nachher = Branch `claude/auftrag-099-g2-welle-6`
(Seitenfreigabe `HTML_PAGES`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter `artifacts/auftrag-099/` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Säulen (ICP 0, Persona 0, Segmente 4, Top 10 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | --- |
| icp | 1440 | dark | `087f500d7442` | `d2bc8bfa7fa1` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 1440 | light | `8963e66e14f0` | `c3f561c1ca3a` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 768 | dark | `573d1b7c703f` | `f14511ce08a2` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 768 | light | `663deabd85aa` | `b706f50a7c51` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 375 | dark | `e941b61e801b` | `4ae47fe59d08` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 375 | light | `5eea981892f3` | `3febb77548c4` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 320 | dark | `e346b6efe2c7` | `3b4e90b60af6` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 320 | light | `aa1a5698bfae` | `87b2e9aab53c` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 250 | dark | `03459f17f706` | `07070f8312b3` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| icp | 250 | light | `ebe9a8ee68bf` | `9f10c682dc73` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 1440 | dark | `f28c864327f2` | `6dc0982f0f0b` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 1440 | light | `027ae5df951a` | `f5200f636205` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 768 | dark | `07575376e076` | `c03d85d606f6` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 768 | light | `b54ba7e2b5ce` | `1ec114a49f42` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 375 | dark | `efc1079df85f` | `dc330309c6f0` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 375 | light | `314c461fd716` | `0b0fe0f28021` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 320 | dark | `3058b4416ece` | `7e69b0107507` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 320 | light | `54f59af824fc` | `019c671ba1fa` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 250 | dark | `47ba4f90371d` | `7df60d1bd123` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| persona | 250 | light | `02900feeb7c7` | `87eb7575a2e8` | 1 → 0 | 1 | 4/4 | 0 | 0 px | 0 px | 0 |
| segmente | 1440 | dark | `48d18c034087` | `041b3aa2109d` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 1440 | light | `b1305c9ed240` | `2b709506c929` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 768 | dark | `a8093122d567` | `023033b96e42` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 768 | light | `b8a345672353` | `264981468978` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 375 | dark | `c846e16fd528` | `3b0aa197f7e2` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 375 | light | `36cba09db999` | `593d23b83781` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 320 | dark | `4c7a33e90f82` | `a8e0a2ed5df3` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 320 | light | `5818c365e7a6` | `54807cf43440` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 250 | dark | `0e29a5e1348d` | `81f95b738f78` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| segmente | 250 | light | `64d355bba83a` | `68f62fbfc407` | 1 → 0 | 1 | 4/4 | 4 | 0 px | 0 px | 0 |
| top10 | 1440 | dark | `443dfac27edf` | `4273634b1fa2` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 1440 | light | `3ba8515e9e83` | `30064f527662` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 768 | dark | `a30d500c5dc7` | `15eaf3f4554c` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 768 | light | `a6bd79e37408` | `b26a4f567a84` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 375 | dark | `7b04f8d16b8e` | `e2b162c17997` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 375 | light | `2fd8917eef48` | `4b1a5b54ad00` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 320 | dark | `8564eee58daf` | `c0b03f42e3b3` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 320 | light | `545ca3cbec53` | `88ba1cc91a8b` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 250 | dark | `fb538fcc5044` | `6db3541e5dca` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |
| top10 | 250 | light | `80a1d9275475` | `d43c387c2384` | 1 → 0 | 1 | 1/1 | 0 | 0 px | 0 px | 0 |

**Ergebnis:** 40/40 Aufnahmen bestanden.
