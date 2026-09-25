# Auftrag 068 / Gate G66 — Design-Gate v2.3.1

Vorher = `v2.3.0` (`e63eec5`), Nachher = Branch `claude/fervent-cray-2snu5b`.
32 Inhaltsseiten plus Login, je 1440/768/375 px (Sidebar und Header sind auf jedem
Seiten-Screenshot bei 1440/768 px enthalten; bei 375 px ist die Sidebar ein geschlossener Drawer).
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
| Screenshots je Lauf | 99 (33 Routen × 3 Breiten) |
| SHA-256 Vorher = Nachher | 0 von 99 |
| Horizontaler Überlauf Vorher | 2 (/market/competition @375: 17 px, /company/profile @375: 33 px) |
| Horizontaler Überlauf Nachher | 0 |

## Matrix (SHA-256-Präfix Vorher → Nachher · Überlauf Vorher → Nachher)

| Route | Vorlage v2.2.0 (`public/assets/auftrag-…`) | 1440 | 768 | 375 |
|---|---|---|---|---|
| `/login` | — | `187d95df` → `573b53e4` ≠ · 0→0 px | `7c5c7aba` → `6f3f49c9` ≠ · 0→0 px | `4c7e1cf4` → `35cb46bd` ≠ · 0→0 px |
| `/finance/p-and-l` | 037e/05 | `adb571b7` → `3f86439e` ≠ · 0→0 px | `6e703e35` → `d38632c5` ≠ · 0→0 px | `6374bb8b` → `e82bdb60` ≠ · 0→0 px |
| `/finance/balance-sheet` | 037e/06 | `909a4a33` → `c00c55de` ≠ · 0→0 px | `6a508b3c` → `ac9c8a1b` ≠ · 0→0 px | `dc61d260` → `d28fbede` ≠ · 0→0 px |
| `/finance/unit-economics` | 037e/07 | `e1a420e2` → `0edfd4ec` ≠ · 0→0 px | `f6cd2c5f` → `20d11cbe` ≠ · 0→0 px | `b2101d98` → `6494c74b` ≠ · 0→0 px |
| `/legal/articles` | 037f/07 | `57bdb74e` → `5d51fe03` ≠ · 0→0 px | `4513bfcf` → `b58c43c4` ≠ · 0→0 px | `6777e12e` → `968918ea` ≠ · 0→0 px |
| `/legal/shareholders` | 037f/08 | `3bc56e4c` → `10b0f698` ≠ · 0→0 px | `8a683624` → `0710e48b` ≠ · 0→0 px | `0f51297e` → `e44985e2` ≠ · 0→0 px |
| `/legal/commercial-register` | 037f/09 | `f32cabae` → `bdcba797` ≠ · 0→0 px | `a53004c1` → `653d4038` ≠ · 0→0 px | `f53fbf2e` → `889700ef` ≠ · 0→0 px |
| `/strategy/okrs` | 037f/04 | `95135182` → `92b38887` ≠ · 0→0 px | `73418e07` → `4191b6c5` ≠ · 0→0 px | `ff158ceb` → `dde4d963` ≠ · 0→0 px |
| `/strategy/balanced-scorecard` | 037f/05 | `33d72e00` → `2840fb2b` ≠ · 0→0 px | `11e25c3c` → `dc0a61a6` ≠ · 0→0 px | `98ec2c98` → `8e053709` ≠ · 0→0 px |
| `/strategy/growth-drivers` | 037f/06 | `23c651e5` → `4fe896f6` ≠ · 0→0 px | `a0d62938` → `fb2124ce` ≠ · 0→0 px | `4814d3f4` → `25dc09e8` ≠ · 0→0 px |
| `/market/overview` | 037d/01 | `3e3f1197` → `533100fc` ≠ · 0→0 px | `7b33f444` → `0aefe359` ≠ · 0→0 px | `36ff903d` → `df62a31e` ≠ · 0→0 px |
| `/market/competition` | 037d/02 | `1489d0de` → `85c7f57f` ≠ · 0→0 px | `012e1401` → `2bcf0fbb` ≠ · 0→0 px | `db738fd1` → `e785cb74` ≠ · 17→0 px |
| `/market/swot` | 037d/03 | `ee206a88` → `110b7a4a` ≠ · 0→0 px | `1007afcb` → `efdfc87c` ≠ · 0→0 px | `94af8c88` → `d34ba53b` ≠ · 0→0 px |
| `/customers/icp` | 037d/04 | `5bb35b1e` → `c9ca5016` ≠ · 0→0 px | `119a8044` → `054352e7` ≠ · 0→0 px | `1e9752e9` → `fa668acd` ≠ · 0→0 px |
| `/customers/persona` | 037d/05 | `61ae98d6` → `56b01a79` ≠ · 0→0 px | `629d5401` → `3290b588` ≠ · 0→0 px | `aef3d266` → `2653430e` ≠ · 0→0 px |
| `/customers/segments` | 037d/06 | `4564e664` → `db781de5` ≠ · 0→0 px | `bdcd2935` → `cfae9120` ≠ · 0→0 px | `e2850dca` → `5e3145b8` ≠ · 0→0 px |
| `/customers/top-customers` | 037d/07 | `62f61903` → `b3b2f8ee` ≠ · 0→0 px | `63165368` → `9fe24d38` ≠ · 0→0 px | `f2944cea` → `8ba2ed69` ≠ · 0→0 px |
| `/sales/funnel` | 037e/01 | `8596e15c` → `db0d01af` ≠ · 0→0 px | `9e640a21` → `4632237d` ≠ · 0→0 px | `b4c54156` → `171154ee` ≠ · 0→0 px |
| `/sales/sla` | 037e/02 | `6d141039` → `ba87130a` ≠ · 0→0 px | `f159800a` → `e62c4645` ≠ · 0→0 px | `a2f99f74` → `db40f5f5` ≠ · 0→0 px |
| `/sales/channels` | 037e/03 | `9755cecf` → `31aa878a` ≠ · 0→0 px | `af6f98a4` → `620519c4` ≠ · 0→0 px | `ac4c72db` → `eccc2f9f` ≠ · 0→0 px |
| `/sales/planning` | 037e/04 | `5ba765d1` → `d58ce54f` ≠ · 0→0 px | `04c38c5a` → `5a1e6fe2` ≠ · 0→0 px | `5a06038c` → `e3af11be` ≠ · 0→0 px |
| `/company/profile` | 037g/01 | `5dd7b83d` → `dcab18a1` ≠ · 0→0 px | `791d2a39` → `de3792e7` ≠ · 0→0 px | `aa8224e6` → `e3850100` ≠ · 33→0 px |
| `/company/highlights` | 037g/02 | `b01043d4` → `3c056e71` ≠ · 0→0 px | `c5070b61` → `88a0803d` ≠ · 0→0 px | `d4762a45` → `b3affc9e` ≠ · 0→0 px |
| `/company/idea` | 037g/04 | `1f1055b2` → `3070265c` ≠ · 0→0 px | `46202f63` → `4c66c73b` ≠ · 0→0 px | `a9124bee` → `4beaf1fb` ≠ · 0→0 px |
| `/company/value-proposition` | 037g/05 | `0118f8a9` → `20098d49` ≠ · 0→0 px | `ee343a4e` → `4a669951` ≠ · 0→0 px | `24e4a4f2` → `92a8bb0e` ≠ · 0→0 px |
| `/company/history` | 037g/06 | `7f7e4791` → `9499e161` ≠ · 0→0 px | `a056ccdd` → `18dd70eb` ≠ · 0→0 px | `4a7b6d24` → `b07cfcd4` ≠ · 0→0 px |
| `/product/features` | 037g/07 | `5b4d79ec` → `b102c415` ≠ · 0→0 px | `5b8cdd84` → `9c3c21bb` ≠ · 0→0 px | `6c9b81b7` → `d9ecfc61` ≠ · 0→0 px |
| `/product/pricing` | 037g/08 | `d5d967d2` → `37af9696` ≠ · 0→0 px | `232d14cd` → `4d25b2ea` ≠ · 0→0 px | `c089e466` → `821027bc` ≠ · 0→0 px |
| `/product/performance` | 037g/09 | `ee21ce13` → `3f371349` ≠ · 0→0 px | `c4b4604d` → `6ad0ae53` ≠ · 0→0 px | `f9a954ce` → `6283fc6c` ≠ · 0→0 px |
| `/product/roadmap` | 037g/10 | `a1d9a2bd` → `8fafe5b9` ≠ · 0→0 px | `3d06b946` → `0396380b` ≠ · 0→0 px | `25c30de7` → `7760f002` ≠ · 0→0 px |
| `/organisation/headcount` | 037f/01 | `c7b5999d` → `819b8bc8` ≠ · 0→0 px | `121c040a` → `97f8cdeb` ≠ · 0→0 px | `e5b3c51b` → `30d0bf22` ≠ · 0→0 px |
| `/organisation/hr` | 037f/02 | `b39ad3fd` → `c50d62fb` ≠ · 0→0 px | `03e73a82` → `abdd1c20` ≠ · 0→0 px | `63e4e68c` → `86058d12` ≠ · 0→0 px |
| `/organisation/team` | 037f/03 | `14182f50` → `e1dd6a97` ≠ · 0→0 px | `369e269f` → `ad4aff4e` ≠ · 0→0 px | `0247f35c` → `4a747613` ≠ · 0→0 px |

## Sichtvergleich gegen die v2.2.0-Vorlagen

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
- **Executive Dashboard:** nicht im Umfang (eigener Auftrag nach v2.3.1).
