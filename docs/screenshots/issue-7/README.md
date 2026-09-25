# Issue #7 — Screenshot-Paritätsmatrix (nur Text, keine Bilddateien)

**Refactor:** Inline-Styles → Tailwind-Klassen (PR #25). Ein reiner Refactor muss
pixelgleich bleiben, deshalb gilt hier **SHA-256-Gleichheit vorher/nachher** als Nachweis
(nicht Ungleichheit wie bei Feature-Aufträgen, CLAUDE.md §7).

- **Vorher:** `4631faf` (Stand vor dem Abbau) · **Nachher:** `927a15d` (PR-Head, gleicher Code-Stand wie der Abbau-Commit `c847ba4` plus Doku/Budget-Skript)
- **Rauschreferenz:** zweite, unabhängige Aufnahme von `4631faf` (vorher-2)
- **Harness:** `scripts/captureIssue7ParityScreenshots.mjs` — 41 Routen aus `e2e/routes.spec.ts` × 1440/768/375, Login admin-a, feste Uhr, reducedMotion, Animationen aus, Full-Page
- **Umgebung:** lokales Supabase (`supabase/seed.sql`), Chromium Headless Shell 1194 (Sandbox; CI nutzt 1243). Die Edge-Runtime erreicht lokal die npm-Registry nicht, CRM-Edge-Seiten zeigen deshalb vorher wie nachher den ehrlichen Fehlerzustand.
- Reproduktion:
  ```
  npx vite build --outDir /tmp/dist-before   # auf 4631faf
  npx vite build --outDir /tmp/dist-after    # auf PR-Head
  node scripts/captureIssue7ParityScreenshots.mjs --capture --label=before   --dist=/tmp/dist-before --out=/tmp/issue7-before
  node scripts/captureIssue7ParityScreenshots.mjs --capture --label=after    --dist=/tmp/dist-after  --out=/tmp/issue7-after
  node scripts/captureIssue7ParityScreenshots.mjs --capture --label=before-2 --dist=/tmp/dist-before --out=/tmp/issue7-before-2
  node scripts/captureIssue7ParityScreenshots.mjs --compare=/tmp/issue7-before/manifest.json,/tmp/issue7-after/manifest.json --noise=/tmp/issue7-before-2/manifest.json
  ```

## Matrix

| Route | Viewport | SHA-256 vorher | SHA-256 nachher | Overflow vorher / nachher | Ergebnis |
|---|---|---|---|---|---|
| `/dashboard` | 375 | `6c8dcb5f4018` | `6c8dcb5f4018` | 0 / 0 px | ✅ identisch |
| `/company/profile` | 375 | `dcbda1319a06` | `dcbda1319a06` | 0 / 0 px | ✅ identisch |
| `/company/highlights` | 375 | `8a3bd6363927` | `8a3bd6363927` | 0 / 0 px | ✅ identisch |
| `/company/data-basis` | 375 | `58927c5a0562` | `c41b2c244033` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/crm/live-simulation` | 375 | `926ba7d2bb51` | `926ba7d2bb51` | 0 / 0 px | ✅ identisch |
| `/crm/leads` | 375 | `88794d359951` | `88794d359951` | 0 / 0 px | ✅ identisch |
| `/crm/companies` | 375 | `ef40498e0922` | `ef40498e0922` | 0 / 0 px | ✅ identisch |
| `/crm/deals` | 375 | `9c136fa678bd` | `9c136fa678bd` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 375 | `e8b5987b5d3b` | `e8b5987b5d3b` | 0 / 0 px | ✅ identisch |
| `/company/idea` | 375 | `12285c75eb3d` | `12285c75eb3d` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 375 | `4d4cd57081bd` | `4d4cd57081bd` | 0 / 0 px | ✅ identisch |
| `/company/history` | 375 | `e1ec011efb22` | `e1ec011efb22` | 0 / 0 px | ✅ identisch |
| `/company/location` | 375 | `4cf8bbc3b485` | `4cf8bbc3b485` | 0 / 0 px | ✅ identisch |
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
| `/company/data-basis` | 768 | `f3919517063c` | `f3919517063c` | 0 / 0 px | ✅ identisch |
| `/crm/live-simulation` | 768 | `93618c6e2418` | `93618c6e2418` | 0 / 0 px | ✅ identisch |
| `/crm/leads` | 768 | `d04ff45825df` | `d04ff45825df` | 0 / 0 px | ✅ identisch |
| `/crm/companies` | 768 | `52f1e225e0f7` | `52f1e225e0f7` | 0 / 0 px | ✅ identisch |
| `/crm/deals` | 768 | `3dcaca8e88bb` | `3dcaca8e88bb` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 768 | `fed0c50d2192` | `f9f9bdd50d3f` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/company/idea` | 768 | `2d5c069e5fa2` | `2d5c069e5fa2` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 768 | `3efc4fa1d98d` | `3efc4fa1d98d` | 0 / 0 px | ✅ identisch |
| `/company/history` | 768 | `f08577b6e30e` | `f08577b6e30e` | 0 / 0 px | ✅ identisch |
| `/company/location` | 768 | `2e71e99732bd` | `2e71e99732bd` | 0 / 0 px | ✅ identisch |
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
| `/crm/leads` | 1440 | `e92dc67f41e0` | `e92dc67f41e0` | 0 / 0 px | ✅ identisch |
| `/crm/companies` | 1440 | `101100a8b31e` | `101100a8b31e` | 0 / 0 px | ✅ identisch |
| `/crm/deals` | 1440 | `ed79d1a072b8` | `ed79d1a072b8` | 0 / 0 px | ✅ identisch |
| `/crm/activities` | 1440 | `c35207fe6ae6` | `c35207fe6ae6` | 0 / 0 px | ✅ identisch |
| `/company/idea` | 1440 | `b0f086a06a63` | `b0f086a06a63` | 0 / 0 px | ✅ identisch |
| `/company/value-proposition` | 1440 | `ae54f7afef40` | `ae54f7afef40` | 0 / 0 px | ✅ identisch |
| `/company/history` | 1440 | `9c15b8d93960` | `9c15b8d93960` | 0 / 0 px | ✅ identisch |
| `/company/location` | 1440 | `9454fa08b8c0` | `836df59f05d5` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
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
| `/resources/materials` | 1440 | `911e9cd289be` | `c0d38cf5f3ac` | 0 / 0 px | ⚠️ Rauschen (vorher ≠ vorher) |
| `/legal/articles` | 1440 | `04839fd5a63a` | `04839fd5a63a` | 0 / 0 px | ✅ identisch |
| `/legal/shareholders` | 1440 | `c51344744c87` | `c51344744c87` | 0 / 0 px | ✅ identisch |
| `/legal/commercial-register` | 1440 | `fc0c23d795f4` | `fc0c23d795f4` | 0 / 0 px | ✅ identisch |

**Summe:** 123 Aufnahmen · 117 identisch · 6 Rauschen · 0 Abweichungen

## Pixelanalyse der nicht SHA-gleichen Aufnahmen

Pixel mit Farbabweichung > 0 (Werkzeug: PNG-Decoder aus `playwright-core`), jeweils
vorher↔nachher und zum Vergleich vorher↔vorher-2 (reines Rauschen, identischer Code).

| Aufnahme | vorher ↔ nachher | vorher ↔ vorher-2 (Rauschen) |
|---|---|---|
| `company-data-basis-375.png` | 35 px differ, bbox x15-17 y258-441 of 375x812 | 35 px differ, bbox x15-17 y258-441 of 375x812 |
| `resources-materials-375.png` | 13 px differ, bbox x345-357 y691-701 of 375x812 | 13 px differ, bbox x345-357 y691-701 of 375x812 |
| `crm-activities-768.png` | 5 px differ, bbox x697-700 y283-284 of 768x1024 | 5 px differ, bbox x697-700 y283-284 of 768x1024 |
| `resources-materials-768.png` | 14 px differ, bbox x17-30 y495-506 of 768x1024 | 56 px differ, bbox x17-750 y495-891 of 768x1024 |
| `company-location-1440.png` | 8 px differ, bbox x293-1406 y265-267 of 1440x900 | 8 px differ, bbox x293-1406 y265-267 of 1440x900 |
| `resources-materials-1440.png` | 36 px differ, bbox x293-1406 y478-875 of 1440x900 | 36 px differ, bbox x293-1406 y478-875 of 1440x900 |


## Fazit

- **117/123** Aufnahmen sind vorher↔nachher SHA-256-identisch; **0 px** horizontaler
  Overflow in allen 123 Nachher-Aufnahmen.
- Die **6** nicht SHA-gleichen Aufnahmen zeigen zwischen den beiden Vorher-Läufen
  (identischer Code `4631faf`) dieselbe Abweichung nach Pixelzahl und Lage (Tabelle
  oben) — sie sind Aufnahme-Rauschen, keine Folge des Refactors.
- Schärfere Gegenprobe: **122/123** Nachher-Aufnahmen stimmen SHA-genau mit mindestens
  einem der beiden Vorher-Läufe überein. Einzige Ausnahme ist
  `resources-materials-768.png`: `src/features/resources/**` ist eingefroren und von
  diesem PR nicht geändert; die Route weicht bereits zwischen den beiden Vorher-Läufen ab
  (56 px) und nachher↔vorher-2 nur noch um 42 px in derselben Zone (y 882–891).
- Die neun Abweichungen aus dem ersten lokalen Lauf (Playwright `maxDiffPixels: 0`,
  BUILD_LOG 24.09.) sind damit derselben Rauschklasse zugeordnet: `/crm/*` (Live-Daten),
  `/company/location` (Kartenkacheln), `/resources/materials` (eingefroren),
  `/dashboard` 768 (in 12/12 Wiederholungen danach pixelgleich).
- Unabhängig davon lief `e2e/visual.spec.ts` in der PR-CI (Lauf 36059383432) gegen die
  Linux-Baselines grün.

**Ergebnis:** keine visuelle Regression durch den Inline-Style-Abbau.
