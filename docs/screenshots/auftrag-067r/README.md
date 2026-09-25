# Auftrag 067R / G64 — Screenshot-Paritätsmatrix (nur Text, keine Bilddateien)

**Änderungen mit UI-Bezug:**
- `DataBasisPage`: Seitenhülle `div` → `section` mit `aria-labelledby`; das ist reines Markup.
- Die Repository-Lesepfade sind fail-closed. Das betrifft `/dashboard` (`PipelineSnapshot`), dessen Hook nach Codex-Review #28 aber wieder im Ausgangszustand ist.

Beides soll **pixelgleich** bleiben. Deshalb gilt, wie bei Issue #7, SHA-256-Gleichheit vorher/nachher als Nachweis.

- **Vorher:** `9877697` (Branch-Basis, PR-#27-Head) · **Nachher:** Arbeitsstand 067R (gleicher Code wie der 067R-Commit)
- **Rauschreferenz:** zweite, unabhängige Aufnahme von `9877697` (vorher-2)
- **Harness:** `scripts/captureIssue7ParityScreenshots.mjs` — 41 Routen × 1440/768/375, Login admin-a, feste Uhr, reducedMotion, Full-Page
- **Umgebung:** lokales Supabase (Seed), Chromium 1243. Die Edge-Runtime erreicht lokal die npm-Registry nicht, deshalb zeigen CRM-Edge-Seiten vorher wie nachher den ehrlichen Fehlerzustand.

## Ergebnis

- **Geänderte Routen:** `/dashboard` ist auf 1440/768/375 identisch. `/company/data-basis` ist auf 1440 und 375 identisch, auf 768 zeigt es Rauschen, weil sich vorher und vorher-2 schon unterscheiden (Live-Datenalter).
- **Overflow:** 0 px in allen 123 Aufnahmen, vorher wie nachher.
- **Abweichungen auf nicht berührten Routen:**
  - `/crm/leads` 1440: 17 px im Badge der Edge-Statuszeile.
  - `/company/location` 375: 258 px in einem Textfeld.
  - `/resources/materials` 1440 wechselt zwischen den Läufen, ebenso `/crm/deals` 1440 und `/sales/sla` 1440 im zweiten Nachher-Lauf.

  Ein zweiter Nachher-Lauf zeigt, dass das Timing-Rauschen des Harness ist: Der Vergleich nachher gegen nachher-2 ergibt 4 Abweichungen an genau diesen wechselnden Stellen. Keine dieser Routen importiert eine geänderte Datei.
- **Summe Lauf 1:** 123 Aufnahmen · 115 identisch · 5 Rauschen · 3 Abweichungen, alle auf nicht berührten Routen.
- **Summe Lauf 2:** 123 Aufnahmen · 115 identisch · 4 Rauschen · 4 Abweichungen, alle auf nicht berührten Routen.
- **Summe nachher gegen nachher-2:** 119 identisch · 4 Abweichungen. Das ist die Rauschbreite der Nachher-Seite.

## Matrix (Lauf 1)

| Route | Viewport | SHA-256 vorher | SHA-256 nachher | Overflow vorher / nachher | Ergebnis |
|---|---|---|---|---|---|
| `/dashboard` | 375 | `6c8dcb5f4018` | `6c8dcb5f4018` | 0 / 0 px | ✅ identisch |
| `/company/profile` | 375 | `dcbda1319a06` | `dcbda1319a06` | 0 / 0 px | ✅ identisch |
| `/company/highlights` | 375 | `8a3bd6363927` | `8a3bd6363927` | 0 / 0 px | ✅ identisch |
| `/company/data-basis` | 375 | `c41b2c244033` | `c41b2c244033` | 0 / 0 px | ✅ identisch |
| `/crm/live-simulation` | 375 | `926ba7d2bb51` | `926ba7d2bb51` | 0 / 0 px | ✅ identisch |
| `/crm/leads` | 375 | `e094e5dc4764` | `e094e5dc4764` | 0 / 0 px | ✅ identisch |
| `/crm/companies` | 375 | `044a326fcbdd` | `044a326fcbdd` | 0 / 0 px | ✅ identisch |
| `/crm/deals` | 375 | `969865837180` | `969865837180` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 375 | `e8b5987b5d3b` | `e8b5987b5d3b` | 0 / 0 px | ✅ identisch |
| `/company/idea` | 375 | `12285c75eb3d` | `12285c75eb3d` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 375 | `4d4cd57081bd` | `4d4cd57081bd` | 0 / 0 px | ✅ identisch |
| `/company/history` | 375 | `e1ec011efb22` | `e1ec011efb22` | 0 / 0 px | ✅ identisch |
| `/company/location` | 375 | `4cf8bbc3b485` | `fd3ef51cdb7e` | 0 / 0 px | ❌ Abweichung |
| `/product/features` | 375 | `d15dcfd03b59` | `d15dcfd03b59` | 0 / 0 px | ✅ identisch |
| `/product/pricing` | 375 | `cb34be743c2e` | `cb34be743c2e` | 0 / 0 px | ✅ identisch |
| `/product/performance` | 375 | `8054c4a95471` | `8054c4a95471` | 0 / 0 px | ✅ identisch |
| `/product/roadmap` | 375 | `ca78ab3d2432` | `ca78ab3d2432` | 0 / 0 px | ✅ identisch |
| `/market/overview` | 375 | `ea7d59574a5a` | `ea7d59574a5a` | 0 / 0 px | ✅ identisch |
| `/market/competition` | 375 | `69c13ee4ad23` | `69c13ee4ad23` | 0 / 0 px | ✅ identisch |
| `/market/swot` | 375 | `602141758405` | `602141758405` | 0 / 0 px | ✅ identisch |
| `/customers/icp` | 375 | `9ff31a90f8d8` | `9ff31a90f8d8` | 0 / 0 px | ✅ identisch |
| `/customers/persona` | 375 | `2915d51a1c0e` | `2915d51a1c0e` | 0 / 0 px | ✅ identisch |
| `/customers/segments` | 375 | `10773b5454fa` | `10773b5454fa` | 0 / 0 px | ✅ identisch |
| `/customers/top-customers` | 375 | `43083fb9dc5f` | `43083fb9dc5f` | 0 / 0 px | ✅ identisch |
| `/sales/funnel` | 375 | `f9844b44d635` | `f9844b44d635` | 0 / 0 px | ✅ identisch |
| `/sales/sla` | 375 | `de2929b7a61a` | `de2929b7a61a` | 0 / 0 px | ✅ identisch |
| `/sales/channels` | 375 | `8923e09e1656` | `8923e09e1656` | 0 / 0 px | ✅ identisch |
| `/sales/planning` | 375 | `399026bd89ac` | `399026bd89ac` | 0 / 0 px | ✅ identisch |
| `/finance/p-and-l` | 375 | `9091360bae80` | `9091360bae80` | 0 / 0 px | ✅ identisch |
| `/finance/balance-sheet` | 375 | `1afccbaf8cf1` | `1afccbaf8cf1` | 0 / 0 px | ✅ identisch |
| `/finance/unit-economics` | 375 | `478fc6c88c35` | `478fc6c88c35` | 0 / 0 px | ✅ identisch |
| `/organisation/headcount` | 375 | `70e315daf4a4` | `70e315daf4a4` | 0 / 0 px | ✅ identisch |
| `/organisation/hr` | 375 | `77049304d53d` | `77049304d53d` | 0 / 0 px | ✅ identisch |
| `/organisation/team` | 375 | `38fc208125e9` | `38fc208125e9` | 0 / 0 px | ✅ identisch |
| `/strategy/okrs` | 375 | `551a1cd2f0ed` | `551a1cd2f0ed` | 0 / 0 px | ✅ identisch |
| `/strategy/balanced-scorecard` | 375 | `01605ae52472` | `01605ae52472` | 0 / 0 px | ✅ identisch |
| `/strategy/growth-drivers` | 375 | `6e0828e479b1` | `6e0828e479b1` | 0 / 0 px | ✅ identisch |
| `/resources/materials` | 375 | `43a3a4d96d18` | `56009b3bad31` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/legal/articles` | 375 | `8e9d6b4dd3b6` | `8e9d6b4dd3b6` | 0 / 0 px | ✅ identisch |
| `/legal/shareholders` | 375 | `50c0c6deeffc` | `50c0c6deeffc` | 0 / 0 px | ✅ identisch |
| `/legal/commercial-register` | 375 | `5d736e073225` | `5d736e073225` | 0 / 0 px | ✅ identisch |
| `/dashboard` | 768 | `8b7d996d770e` | `8b7d996d770e` | 0 / 0 px | ✅ identisch |
| `/company/profile` | 768 | `e9316aa6711d` | `e9316aa6711d` | 0 / 0 px | ✅ identisch |
| `/company/highlights` | 768 | `1917a03a9d03` | `1917a03a9d03` | 0 / 0 px | ✅ identisch |
| `/company/data-basis` | 768 | `0af483995156` | `f3919517063c` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/crm/live-simulation` | 768 | `93618c6e2418` | `93618c6e2418` | 0 / 0 px | ✅ identisch |
| `/crm/leads` | 768 | `386f36a007ab` | `386f36a007ab` | 0 / 0 px | ✅ identisch |
| `/crm/companies` | 768 | `3c0ec9863f95` | `3c0ec9863f95` | 0 / 0 px | ✅ identisch |
| `/crm/deals` | 768 | `3c54b1fae352` | `3c54b1fae352` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 768 | `f9f9bdd50d3f` | `fed0c50d2192` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/company/idea` | 768 | `2d5c069e5fa2` | `2d5c069e5fa2` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 768 | `3efc4fa1d98d` | `3efc4fa1d98d` | 0 / 0 px | ✅ identisch |
| `/company/history` | 768 | `f08577b6e30e` | `f08577b6e30e` | 0 / 0 px | ✅ identisch |
| `/company/location` | 768 | `4461cbced68c` | `4461cbced68c` | 0 / 0 px | ✅ identisch |
| `/product/features` | 768 | `6868ab20c7b5` | `6868ab20c7b5` | 0 / 0 px | ✅ identisch |
| `/product/pricing` | 768 | `d4ad5206bc5a` | `d4ad5206bc5a` | 0 / 0 px | ✅ identisch |
| `/product/performance` | 768 | `f0b6d0213f5c` | `f0b6d0213f5c` | 0 / 0 px | ✅ identisch |
| `/product/roadmap` | 768 | `519f5f569f5a` | `519f5f569f5a` | 0 / 0 px | ✅ identisch |
| `/market/overview` | 768 | `8f1b6a64e074` | `8f1b6a64e074` | 0 / 0 px | ✅ identisch |
| `/market/competition` | 768 | `fe4dafe8c438` | `fe4dafe8c438` | 0 / 0 px | ✅ identisch |
| `/market/swot` | 768 | `71deff14cc85` | `71deff14cc85` | 0 / 0 px | ✅ identisch |
| `/customers/icp` | 768 | `28b83d05792e` | `28b83d05792e` | 0 / 0 px | ✅ identisch |
| `/customers/persona` | 768 | `5ed258986348` | `5ed258986348` | 0 / 0 px | ✅ identisch |
| `/customers/segments` | 768 | `581581f49c08` | `581581f49c08` | 0 / 0 px | ✅ identisch |
| `/customers/top-customers` | 768 | `0104906ee121` | `0104906ee121` | 0 / 0 px | ✅ identisch |
| `/sales/funnel` | 768 | `fdf0b34052a4` | `fdf0b34052a4` | 0 / 0 px | ✅ identisch |
| `/sales/sla` | 768 | `b7b58a64a21e` | `b7b58a64a21e` | 0 / 0 px | ✅ identisch |
| `/sales/channels` | 768 | `dd0fd84c9f92` | `dd0fd84c9f92` | 0 / 0 px | ✅ identisch |
| `/sales/planning` | 768 | `09cdcd68413e` | `09cdcd68413e` | 0 / 0 px | ✅ identisch |
| `/finance/p-and-l` | 768 | `b70eb84b0bba` | `b70eb84b0bba` | 0 / 0 px | ✅ identisch |
| `/finance/balance-sheet` | 768 | `e4a62b0ca288` | `e4a62b0ca288` | 0 / 0 px | ✅ identisch |
| `/finance/unit-economics` | 768 | `821d1c7250ed` | `821d1c7250ed` | 0 / 0 px | ✅ identisch |
| `/organisation/headcount` | 768 | `10633e8258f3` | `10633e8258f3` | 0 / 0 px | ✅ identisch |
| `/organisation/hr` | 768 | `92726a874f73` | `92726a874f73` | 0 / 0 px | ✅ identisch |
| `/organisation/team` | 768 | `a0f7395eed4e` | `a0f7395eed4e` | 0 / 0 px | ✅ identisch |
| `/strategy/okrs` | 768 | `d41e38b252c5` | `d41e38b252c5` | 0 / 0 px | ✅ identisch |
| `/strategy/balanced-scorecard` | 768 | `c9f27e005582` | `c9f27e005582` | 0 / 0 px | ✅ identisch |
| `/strategy/growth-drivers` | 768 | `2edf22d39a92` | `2edf22d39a92` | 0 / 0 px | ✅ identisch |
| `/resources/materials` | 768 | `d732df7097e0` | `d39dd915ef86` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/legal/articles` | 768 | `a4f0151f4f96` | `a4f0151f4f96` | 0 / 0 px | ✅ identisch |
| `/legal/shareholders` | 768 | `133a3a6f6056` | `133a3a6f6056` | 0 / 0 px | ✅ identisch |
| `/legal/commercial-register` | 768 | `4dd3350602e5` | `4dd3350602e5` | 0 / 0 px | ✅ identisch |
| `/dashboard` | 1440 | `871dd1fb7679` | `871dd1fb7679` | 0 / 0 px | ✅ identisch |
| `/company/profile` | 1440 | `d917a48f6a4e` | `d917a48f6a4e` | 0 / 0 px | ✅ identisch |
| `/company/highlights` | 1440 | `ee9f4aad3600` | `ee9f4aad3600` | 0 / 0 px | ✅ identisch |
| `/company/data-basis` | 1440 | `30356ddba5e8` | `30356ddba5e8` | 0 / 0 px | ✅ identisch |
| `/crm/live-simulation` | 1440 | `6a126d859388` | `6a126d859388` | 0 / 0 px | ✅ identisch |
| `/crm/leads` | 1440 | `e01b28785b74` | `ad37bf95f706` | 0 / 0 px | ❌ Abweichung |
| `/crm/companies` | 1440 | `9a45b71da815` | `fddf0f1660f5` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/crm/deals` | 1440 | `b37fadc0c9ac` | `b37fadc0c9ac` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 1440 | `c35207fe6ae6` | `c35207fe6ae6` | 0 / 0 px | ✅ identisch |
| `/company/idea` | 1440 | `b0f086a06a63` | `b0f086a06a63` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 1440 | `ae54f7afef40` | `ae54f7afef40` | 0 / 0 px | ✅ identisch |
| `/company/history` | 1440 | `9c15b8d93960` | `9c15b8d93960` | 0 / 0 px | ✅ identisch |
| `/company/location` | 1440 | `836df59f05d5` | `836df59f05d5` | 0 / 0 px | ✅ identisch |
| `/product/features` | 1440 | `14fb59ee02da` | `14fb59ee02da` | 0 / 0 px | ✅ identisch |
| `/product/pricing` | 1440 | `8ca2d3b332a3` | `8ca2d3b332a3` | 0 / 0 px | ✅ identisch |
| `/product/performance` | 1440 | `c28b9fd28241` | `c28b9fd28241` | 0 / 0 px | ✅ identisch |
| `/product/roadmap` | 1440 | `ac59672a8c45` | `ac59672a8c45` | 0 / 0 px | ✅ identisch |
| `/market/overview` | 1440 | `d88678e5a67b` | `d88678e5a67b` | 0 / 0 px | ✅ identisch |
| `/market/competition` | 1440 | `6c017fce73b5` | `6c017fce73b5` | 0 / 0 px | ✅ identisch |
| `/market/swot` | 1440 | `f08c5686b811` | `f08c5686b811` | 0 / 0 px | ✅ identisch |
| `/customers/icp` | 1440 | `fb8f331c1e22` | `fb8f331c1e22` | 0 / 0 px | ✅ identisch |
| `/customers/persona` | 1440 | `5d278d4b44f2` | `5d278d4b44f2` | 0 / 0 px | ✅ identisch |
| `/customers/segments` | 1440 | `0b64af22437b` | `0b64af22437b` | 0 / 0 px | ✅ identisch |
| `/customers/top-customers` | 1440 | `f84390c6f06a` | `f84390c6f06a` | 0 / 0 px | ✅ identisch |
| `/sales/funnel` | 1440 | `04556c54b4e5` | `04556c54b4e5` | 0 / 0 px | ✅ identisch |
| `/sales/sla` | 1440 | `5d3c57af893c` | `5d3c57af893c` | 0 / 0 px | ✅ identisch |
| `/sales/channels` | 1440 | `6df1775690e3` | `6df1775690e3` | 0 / 0 px | ✅ identisch |
| `/sales/planning` | 1440 | `c605d35a7cc5` | `c605d35a7cc5` | 0 / 0 px | ✅ identisch |
| `/finance/p-and-l` | 1440 | `44430bb10fef` | `44430bb10fef` | 0 / 0 px | ✅ identisch |
| `/finance/balance-sheet` | 1440 | `9eb76a6eab48` | `9eb76a6eab48` | 0 / 0 px | ✅ identisch |
| `/finance/unit-economics` | 1440 | `35ab66270abb` | `35ab66270abb` | 0 / 0 px | ✅ identisch |
| `/organisation/headcount` | 1440 | `700e4af81cb3` | `700e4af81cb3` | 0 / 0 px | ✅ identisch |
| `/organisation/hr` | 1440 | `8d42d9d30c3a` | `8d42d9d30c3a` | 0 / 0 px | ✅ identisch |
| `/organisation/team` | 1440 | `33b54d42262c` | `33b54d42262c` | 0 / 0 px | ✅ identisch |
| `/strategy/okrs` | 1440 | `75b4eb9eecde` | `75b4eb9eecde` | 0 / 0 px | ✅ identisch |
| `/strategy/balanced-scorecard` | 1440 | `90080a86d185` | `90080a86d185` | 0 / 0 px | ✅ identisch |
| `/strategy/growth-drivers` | 1440 | `200486514496` | `200486514496` | 0 / 0 px | ✅ identisch |
| `/resources/materials` | 1440 | `911e9cd289be` | `8494de6812a2` | 0 / 0 px | ❌ Abweichung |
| `/legal/articles` | 1440 | `04839fd5a63a` | `04839fd5a63a` | 0 / 0 px | ✅ identisch |
| `/legal/shareholders` | 1440 | `c51344744c87` | `c51344744c87` | 0 / 0 px | ✅ identisch |
| `/legal/commercial-register` | 1440 | `fc0c23d795f4` | `fc0c23d795f4` | 0 / 0 px | ✅ identisch |

**Summe:** 123 Aufnahmen · 115 identisch · 5 Rauschen · 3 Abweichungen
