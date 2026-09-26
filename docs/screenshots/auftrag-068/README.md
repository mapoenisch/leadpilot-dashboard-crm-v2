# Auftrag 068 / Gate G66 — Design-Gate v2.3.1

Vorher = `v2.3.0` (`e63eec5`), Nachher = Branch `claude/fervent-cray-2snu5b`.
32 Inhaltsseiten plus Login und Sidebar, je 1440/768/375 px. Unter 1024 px ist die Sidebar ein
Drawer; das Harness öffnet ihn für die Sidebar-Aufnahme. Login-Überlauf wird gemessen.
Bilder bleiben lokal (`.gitignore`, Policy ab Auftrag 066); committet wird nur diese Matrix.

## Lauf

- Harness: `scripts/captureAuftrag068Screenshots.mjs` gegen den Vite-Dev-Server der echten App.
- Ohne Docker in der Build-Umgebung lief das Harness mit `SUPABASE_MOCK=1`: Die Supabase-Aufrufe
  werden im Browser abgefangen (Passwort-Login, aktive Admin-Mitgliedschaft, sonst leere Antworten).
  Die 32 Seiten lesen ihre Werte aus `src/domain/*`; Login, Layout, Sidebar und Header laufen unverändert.
- Aufruf: `VITE_SUPABASE_URL=http://supabase.mock VITE_SUPABASE_ANON_KEY=mock npx vite --port 3200`, dann
  `SUPABASE_MOCK=1 BASE_URL=http://localhost:3200 node scripts/captureAuftrag068Screenshots.mjs after`
  (Vorher analog auf einem Worktree von `e63eec5`, Port 3201, Label `before`).
- Überlauf gemessen im Dokument **und** im scrollenden Hauptbereich `#main-content` (Maximum).

## Ergebnis

| Prüfung | Ergebnis |
|---|---|
| Screenshots je Lauf | 102 (34 Routen × 3 Breiten) |
| SHA-256 Vorher = Nachher | 0 von 102 |
| Horizontaler Überlauf Vorher | 2 (/market/competition @375: 17 px, /company/profile @375: 33 px) |
| Horizontaler Überlauf Nachher | 0 |

## Matrix (SHA-256-Präfix Vorher → Nachher · Überlauf Vorher → Nachher)

| Route | Vorlage v2.2.0 (`public/assets/auftrag-…`) | 1440 | 768 | 375 |
|---|---|---|---|---|
| `/login` | — | `187d95df` → `d2360172` ≠ · 0→0 px | `7c5c7aba` → `43a4f399` ≠ · 0→0 px | `4c7e1cf4` → `4e4cf806` ≠ · 0→0 px |
| `/sidebar` | — (Drawer unter 1024 px geöffnet) | `83023ae9` → `b895090e` ≠ · 0→0 px | `d5b1ed48` → `3a66c3f7` ≠ · 0→0 px | `a78721a7` → `9f855e6b` ≠ · 0→0 px |
| `/finance/p-and-l` | 037e/05 | `3e069e15` → `84ef570c` ≠ · 0→0 px | `b70759f1` → `4c4768fa` ≠ · 0→0 px | `a8d75279` → `2c244337` ≠ · 0→0 px |
| `/finance/balance-sheet` | 037e/06 | `ba00a995` → `c1fdfa97` ≠ · 0→0 px | `3826e571` → `20be6f69` ≠ · 0→0 px | `6d86b6cc` → `6d77de79` ≠ · 0→0 px |
| `/finance/unit-economics` | 037e/07 | `01e7bc68` → `de9635fa` ≠ · 0→0 px | `f6cd2c5f` → `794722bd` ≠ · 0→0 px | `02806305` → `686a0b1c` ≠ · 0→0 px |
| `/legal/articles` | 037f/07 | `5c063504` → `4a9ea729` ≠ · 0→0 px | `4513bfcf` → `b58c43c4` ≠ · 0→0 px | `6777e12e` → `eec7ce3d` ≠ · 0→0 px |
| `/legal/shareholders` | 037f/08 | `f9c0aff2` → `154893d9` ≠ · 0→0 px | `8a683624` → `8eb6e9f9` ≠ · 0→0 px | `d8036181` → `dffbc56e` ≠ · 0→0 px |
| `/legal/commercial-register` | 037f/09 | `82dff471` → `bb474acd` ≠ · 0→0 px | `a53004c1` → `653d4038` ≠ · 0→0 px | `f53fbf2e` → `9bd8abff` ≠ · 0→0 px |
| `/strategy/okrs` | 037f/04 | `c90b5d99` → `debea476` ≠ · 0→0 px | `73418e07` → `565ccd53` ≠ · 0→0 px | `48e70519` → `38e80a97` ≠ · 0→0 px |
| `/strategy/balanced-scorecard` | 037f/05 | `649c94cc` → `52b15f4e` ≠ · 0→0 px | `11e25c3c` → `dc0a61a6` ≠ · 0→0 px | `98ec2c98` → `db3f0dfd` ≠ · 0→0 px |
| `/strategy/growth-drivers` | 037f/06 | `989d3e18` → `3c8dca6d` ≠ · 0→0 px | `a0d62938` → `fb2124ce` ≠ · 0→0 px | `4814d3f4` → `a9db79e7` ≠ · 0→0 px |
| `/market/overview` | 037d/01 | `2146b7ca` → `83e4cf03` ≠ · 0→0 px | `7b33f444` → `0aefe359` ≠ · 0→0 px | `36ff903d` → `54722f4c` ≠ · 0→0 px |
| `/market/competition` | 037d/02 | `3065ded7` → `1d224fa9` ≠ · 0→0 px | `012e1401` → `07e1be6a` ≠ · 0→0 px | `3c0695e7` → `cfec8f36` ≠ · 17→0 px |
| `/market/swot` | 037d/03 | `b8536a02` → `1911ae0e` ≠ · 0→0 px | `1007afcb` → `7a3a54c3` ≠ · 0→0 px | `66d5fc3b` → `2126fee8` ≠ · 0→0 px |
| `/customers/icp` | 037d/04 | `aad834aa` → `f29fa97e` ≠ · 0→0 px | `119a8044` → `6f109915` ≠ · 0→0 px | `e0a5e572` → `6eef0839` ≠ · 0→0 px |
| `/customers/persona` | 037d/05 | `e0f19237` → `22c51ea4` ≠ · 0→0 px | `629d5401` → `badf8dc0` ≠ · 0→0 px | `edf0065d` → `ae909722` ≠ · 0→0 px |
| `/customers/segments` | 037d/06 | `3c8fe365` → `26091b79` ≠ · 0→0 px | `49b02d79` → `edbf8c98` ≠ · 0→0 px | `22e8db39` → `2f49f0da` ≠ · 0→0 px |
| `/customers/top-customers` | 037d/07 | `440e9738` → `9b6d737c` ≠ · 0→0 px | `cce66afc` → `720c9151` ≠ · 0→0 px | `76e68538` → `f2bb1f7c` ≠ · 0→0 px |
| `/sales/funnel` | 037e/01 | `916a8bfd` → `cd1aeaaa` ≠ · 0→0 px | `f5690a34` → `cfe98671` ≠ · 0→0 px | `26b1a01a` → `2d6c4712` ≠ · 0→0 px |
| `/sales/sla` | 037e/02 | `534b39ab` → `e063acb7` ≠ · 0→0 px | `f159800a` → `e62c4645` ≠ · 0→0 px | `923abde2` → `458f0dd9` ≠ · 0→0 px |
| `/sales/channels` | 037e/03 | `21e75441` → `b9d94202` ≠ · 0→0 px | `af6f98a4` → `cd3d3785` ≠ · 0→0 px | `f8c0e54d` → `60f2c5a5` ≠ · 0→0 px |
| `/sales/planning` | 037e/04 | `873b4dbf` → `84cba0ad` ≠ · 0→0 px | `04c38c5a` → `0ac67f97` ≠ · 0→0 px | `1b543a23` → `21434e24` ≠ · 0→0 px |
| `/company/profile` | 037g/01 | `bf9c9289` → `7d9681ee` ≠ · 0→0 px | `791d2a39` → `f7de908f` ≠ · 0→0 px | `cec0a4cc` → `cceb0525` ≠ · 33→0 px |
| `/company/highlights` | 037g/02 | `21956412` → `27fdf42a` ≠ · 0→0 px | `c5070b61` → `20173a7d` ≠ · 0→0 px | `e13afc14` → `67fe70eb` ≠ · 0→0 px |
| `/company/idea` | 037g/04 | `bca0703e` → `f3bdaa94` ≠ · 0→0 px | `46202f63` → `4c66c73b` ≠ · 0→0 px | `d7eaf22b` → `6b366683` ≠ · 0→0 px |
| `/company/value-proposition` | 037g/05 | `6a1f34b2` → `3248c7bb` ≠ · 0→0 px | `ee343a4e` → `4a669951` ≠ · 0→0 px | `24e4a4f2` → `3a7d1cd5` ≠ · 0→0 px |
| `/company/history` | 037g/06 | `8a5d72c4` → `340ec7f1` ≠ · 0→0 px | `a056ccdd` → `2e66fb99` ≠ · 0→0 px | `6facb0ec` → `c8b6aff6` ≠ · 0→0 px |
| `/product/features` | 037g/07 | `f523e608` → `6403aab4` ≠ · 0→0 px | `5b8cdd84` → `9c3c21bb` ≠ · 0→0 px | `6c9b81b7` → `c5322303` ≠ · 0→0 px |
| `/product/pricing` | 037g/08 | `229f276a` → `3cacd990` ≠ · 0→0 px | `232d14cd` → `cfa08d36` ≠ · 0→0 px | `d65e235d` → `aa2c0a07` ≠ · 0→0 px |
| `/product/performance` | 037g/09 | `e59fb44a` → `487ae040` ≠ · 0→0 px | `af0209cd` → `1c97ce02` ≠ · 0→0 px | `edf29cd0` → `6199b8ec` ≠ · 0→0 px |
| `/product/roadmap` | 037g/10 | `e39f2d22` → `fe353a54` ≠ · 0→0 px | `3d06b946` → `0396380b` ≠ · 0→0 px | `207171a2` → `99ea44aa` ≠ · 0→0 px |
| `/organisation/headcount` | 037f/01 | `03e7c3c8` → `694fbd4c` ≠ · 0→0 px | `121c040a` → `f773aed3` ≠ · 0→0 px | `d84dcebe` → `45da7013` ≠ · 0→0 px |
| `/organisation/hr` | 037f/02 | `7350171c` → `9a8a4cdf` ≠ · 0→0 px | `03e73a82` → `abdd1c20` ≠ · 0→0 px | `63e4e68c` → `e064ed82` ≠ · 0→0 px |
| `/organisation/team` | 037f/03 | `beeaa6dc` → `6ca8efd2` ≠ · 0→0 px | `369e269f` → `7a77ae07` ≠ · 0→0 px | `00e48087` → `5ada0489` ≠ · 0→0 px |

## Sichtvergleich gegen die v2.2.0-Vorlagen

Grundlage sind vollständige Aufnahmen (Codex-Review PR #34): Der Inhalt scrollt in `#main-content`,
darum hebt das Harness die Höhenbegrenzung des Layouts für die Aufnahme auf. Die Bildhöhe liegt damit
über der Viewporthöhe (900/1024/812 px), wo die Seite länger ist. Je Seite wurde Vorlage und
Nachher-Aufnahme (1440 px) nebeneinander bis zum Seitenende verglichen.

| Route | Vorlage | Bildhöhe px (1440 / 768 / 375) | Abgleich |
|---|---|---|---|
| `/finance/p-and-l` | 037e/05 | 1594 / 1923 / 2682 | Donut, Säulen FY24/25 (Beschriftung versetzt), GuV-Tabelle bis Jahresfehlbetrag |
| `/finance/balance-sheet` | 037e/06 | 1386 / 1459 / 1950 | Aktiva cyan / Passiva orange, Summenzeilen hervorgehoben |
| `/finance/unit-economics` | 037e/07 | 1539 / 2129 / 2967 | 9 KPI-Kacheln, MRR- und Churn-Linien, Kostenstruktur (zusätzlich, aus BUDGET) |
| `/legal/articles` | 037f/07 | 1386 / 1024 / 1003 | Paragraphentabelle |
| `/legal/shareholders` | 037f/08 | 1386 / 1024 / 900 | Stimmrechtsbalken; Pill 31.250,00 € statt 25.000 € (Daten) |
| `/legal/commercial-register` | 037f/09 | 1386 / 1024 / 866 | Merkmal/Details-Liste |
| `/strategy/okrs` | 037f/04 | 1386 / 1372 / 1908 | 8 Kategorien Basis/Ziel, 2 Objectives mit KR-Listen |
| `/strategy/balanced-scorecard` | 037f/05 | 1386 / 1024 / 966 | 4 Perspektiven; Chip „Steuerung“ entfällt (keine Daten) |
| `/strategy/growth-drivers` | 037f/06 | 1386 / 1024 / 1340 | Balken mit Effekt; Unterzeilen je Hebel entfallen (keine Daten) |
| `/market/overview` | 037d/01 | 1386 / 1024 / 910 | Kennzahlentabelle, LeadPilot-Zeile orange |
| `/market/competition` | 037d/02 | 1386 / 1283 / 1432 | Säulen, LeadPilot orange, Anbietertabelle mit Chips |
| `/market/swot` | 037d/03 | 1386 / 1330 / 1902 | Vier Quadranten Cyan/Rot/Orange/Neutral |
| `/customers/icp` | 037d/04 | 1426 / 1117 / 1504 | Kriterien, Trigger, Negative Fit |
| `/customers/persona` | 037d/05 | 1426 / 1511 / 1987 | Zitat, Ziele, Schmerzpunkte; Stammdaten und Kanäle zusätzlich aus Daten |
| `/customers/segments` | 037d/06 | 1426 / 1316 / 1764 | ARR je Segment, Branchen- und Regionaltabelle |
| `/customers/top-customers` | 037d/07 | 1426 / 1024 / 1193 | Referenzkunden mit ARR (Namen/Werte laut Daten, Vorlage abweichend) |
| `/sales/funnel` | 037e/01 | 1652 / 1715 / 2196 | Trichterbalken, Quartalssäulen, Tabelle, Hinweisbox |
| `/sales/sla` | 037e/02 | 1265 / 1024 / 1359 | Übergabetabelle, Pflichten Marketing/Sales |
| `/sales/channels` | 037e/03 | 1265 / 1622 / 2024 | Donut + Balken, CAC-Säulen, Kanalvergleich |
| `/sales/planning` | 037e/04 | 1265 / 1467 / 1821 | Budget- und KPI-Säulen, Initiativen |
| `/company/profile` | 037g/01 | 1265 / 1169 / 1646 | Stammdaten und Kapital in zwei Panels (Vorlage zeigt sie zusätzlich doppelt), Fokus-Box |
| `/company/highlights` | 037g/02 | 1265 / 1362 / 1790 | Erfolge/Baustellen mit Icons, Fazit |
| `/company/idea` | 037g/04 | 1426 / 1024 / 1335 | Problem & Lösung, USPs; 3D-Illustrationen entfallen |
| `/company/value-proposition` | 037g/05 | 1426 / 1024 / 1111 | Zitat, drei Nutzenkarten |
| `/company/history` | 037g/06 | 1426 / 1140 / 1608 | Zeitleiste mit 5 Meilensteinen |
| `/product/features` | 037g/07 | 1426 / 1024 / 1192 | 4 Module; 3D-Illustrationen und „Mehr erfahren“ entfallen |
| `/product/pricing` | 037g/08 | 1426 / 1089 / 1576 | 3 Tarife, Bestseller; „Paket wählen“ entfällt |
| `/product/performance` | 037g/09 | 1426 / 1461 / 2340 | 6 KPIs mit Zielstatus, Linien, Donut; Sparklines/Dropdowns entfallen |
| `/product/roadmap` | 037g/10 | 1426 / 1024 / 1560 | Zeitleiste Released/geplant; Berg-Illustration entfällt |
| `/organisation/headcount` | 037f/01 | 1386 / 1243 / 1641 | FTE-Linie, Kapazitätszeilen; „Engpass“ aus TEAM.bottlenecks |
| `/organisation/hr` | 037f/02 | 1386 / 1024 / 1114 | 6 Kacheln, Fluktuation orange (Benchmark) |
| `/organisation/team` | 037f/03 | 1386 / 1317 / 2112 | Organigramm mit Linien, 4 Analysefelder |

Hinweis zu den CI-Baselines (`e2e/visual.spec.ts`): Sie decken nur fünf Routen ab, davon zwei der
32 Inhaltsseiten, und belegen die Gestaltung daher nicht. Das leistet dieser Abgleich. Die CI-Aufnahmen
erfassen jetzt ebenfalls den ganzen Inhalt.

Jede Seite wurde auf 1440/768/375 px gegen ihre Vorlage abgeglichen: Seitenkopf mit Eyebrow,
Titel, Untertitel und Pills; Leucht-Panels in Cyan/Orange/Rot mit Icon-Kacheln; gestaltete
Tabellen, Balken-, Säulen-, Linien- und Ringdiagramme; Hinweisboxen. Die Zahlen kommen
unverändert aus `src/domain/*`. Bewusste Abweichungen, weil die Vorlage Angaben zeigt, die in
den Daten nicht stehen, oder Bedienelemente ohne Funktion:

- **Headcount, Teamstruktur:** Die Vorlage markiert Bereiche als „Kapazitätsfokus“. Die Markierung
  heißt jetzt „Engpass“ und kommt aus `TEAM.bottlenecks` (Engineering, Sales). Customer Success
  ist dort nicht als Engpass geführt und bleibt unmarkiert. „Geplant: +2,0 FTE“ entfällt.
- **Gesellschafterliste:** Die Vorlage nennt „Stammkapital 25.000 €“, die Daten 31.250,00 €. Die Pill
  zeigt den Datenwert.
- **Wachstumstreiber:** Unterzeilen je Hebel („Hebel 1: …“, „Basis: 411.840 €“) stehen nicht in
  `CHART_TREIBER` und entfallen.
- **Produkt-Performance:** Sparklines je Kennzahl und Auswahlmenüs (Quartalsansicht, Absolute Zahlen)
  haben keine Datengrundlage bzw. Funktion und entfallen. Zielstatus-Farbe aus „erreicht“/„verfehlt“.
- **Preismodell:** „Paket wählen“-Buttons ohne Funktion entfallen; „Bestseller“ aus `featured` und
  der Tarifbeschreibung.
- **Funktionen, Geschäftsidee, Roadmap, Preise:** 3D-Illustrationen der Vorlagen gibt es nicht als
  Asset; Icons aus `lucide-react` stehen an ihrer Stelle.
- **Steckbrief, Highlights, Scorecard:** Status-Chips ohne Datengrundlage („Erreicht“, „Fokus 2026“,
  „Steuerung“) entfallen.
- **Sidebar, Login:** Das Logo ist bereits die Wortmarke; der zusätzliche Text „LeadPilot“ entfällt,
  nur „Enterprise“ bleibt (Codex-Review PR #34). In v2.2.0 stand der Name doppelt.
- **Executive Dashboard:** nicht im Umfang (eigener Auftrag nach v2.3.1).
