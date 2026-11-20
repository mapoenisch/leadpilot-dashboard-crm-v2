# Abnahme-Screenshots Auftrag 170 (P14b Vergleich, Verknüpfung, Heatmap, Erwartungsband)

**Erzeugt am:** 2026-11-20T10:40:16.041Z  
**Auftrag:** 170 – Dashboard-Editor: Vergleichszeitraum, zeitbezogene Verknüpfung, Heatmap, Erwartungsbänder (P14b)  
**Szenario:** `/dashboard-vorschau.html?bereich=editor_v2&vergleich=1` (Testdaten)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash. Kachel- und Inspector-Szenarien werden als Ausschnitt des jeweiligen Elements aufgenommen.

## Szenarien (§2.3 Nr. 15)

1. **Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps** (`editor-uebersicht-vergleich`)
2. **Kachel: Vorperiode als gestrichelte Linie** (`kachel-vergleich-vorperiode`)
3. **Kachel: Vorjahr mit Hinweis auf Teilhistorie** (`kachel-vergleich-teilhistorie`)
4. **Kachel: zweite Reihe mit eigener Achse** (`kachel-zweite-reihe`)
5. **Kachel: Erwartungsband 10.–90. Perzentil** (`kachel-erwartungsband`)
6. **Kachel: Heatmap Phase × Woche** (`kachel-heatmap-phasen`)
7. **Kachel: Heatmap Woche × Wochentag** (`kachel-heatmap-wochentage`)
8. **Inspector: Abschnitt Vergleichen** (`inspector-vergleichen`)
9. **Inspector: Sperrgrund bei Heatmap** (`inspector-sperrgrund-heatmap`)

## Nachweismatrix

| Szenario | Viewport | Thema | Abmessungen | Horizontaler Überlauf | SHA-256-Prüfsumme | Datei |
|---|---|---|---|---|---|---|
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 1440 | dunkel | 1440 × 900 px | 0 px | `094faeddfec15ef2d803b05ec128507cfc810b148389a5ade0e1f2918ade6821` | `editor-uebersicht-vergleich-1440-dunkel.png` |
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 1440 | hell | 1440 × 900 px | 0 px | `589e4ffc0bcf6fc2bec4837a84165aae9a9f3d0886390b143778e053ca316734` | `editor-uebersicht-vergleich-1440-hell.png` |
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 768 | dunkel | 768 × 1024 px | 0 px | `16ac0e62f1a17181d12065a66f946cbfbcf5058051935df28303625950a36e83` | `editor-uebersicht-vergleich-768-dunkel.png` |
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 768 | hell | 768 × 1024 px | 0 px | `16df5d5c8fcb4879d51b0ddce0473f58baaee2e38bec86a4463c0e41aadf1404` | `editor-uebersicht-vergleich-768-hell.png` |
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 375 | dunkel | 375 × 812 px | 0 px | `a48a94763a409e2062b574eb861120d6de4cd64656d5aeffc9f69256259061b5` | `editor-uebersicht-vergleich-375-dunkel.png` |
| Editor-Übersicht: Vergleich, zweite Reihe, Band und Heatmaps | 375 | hell | 375 × 812 px | 0 px | `5f5a3e4f90883caf3f3c1b3dec0f05351220ef7aa85d96b05bef67fb7382a2b2` | `editor-uebersicht-vergleich-375-hell.png` |
| Kachel: Vorperiode als gestrichelte Linie | 1440 | dunkel | 1440 × 900 px | 0 px | `ea17e76b6b6dc1a2874f9cde28b6b16cf4c32707bd134b37aa9012fd2caba948` | `kachel-vergleich-vorperiode-1440-dunkel.png` |
| Kachel: Vorperiode als gestrichelte Linie | 1440 | hell | 1440 × 900 px | 0 px | `ba317a0051ff27299af4f9ad2e495383693672f2ec394cdce28c90ea4d8e2562` | `kachel-vergleich-vorperiode-1440-hell.png` |
| Kachel: Vorperiode als gestrichelte Linie | 768 | dunkel | 768 × 1024 px | 0 px | `65541d1ca5282f3834cae54518e671e44025315a626325d407506714fda5e50b` | `kachel-vergleich-vorperiode-768-dunkel.png` |
| Kachel: Vorperiode als gestrichelte Linie | 768 | hell | 768 × 1024 px | 0 px | `9e72dff4d9815a551f581d2eea1852f1d6b70f02ef80755c37c70b49f30444cd` | `kachel-vergleich-vorperiode-768-hell.png` |
| Kachel: Vorperiode als gestrichelte Linie | 375 | dunkel | 375 × 812 px | 0 px | `bdc34748908945c9d70adb696fa3fa8ce1831418ac43c52b497a00eefed91fc0` | `kachel-vergleich-vorperiode-375-dunkel.png` |
| Kachel: Vorperiode als gestrichelte Linie | 375 | hell | 375 × 812 px | 0 px | `71dfc29e5dabe571e740ed72f7c184bb2b19e2de2c45e16c0f19ed916eb33640` | `kachel-vergleich-vorperiode-375-hell.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 1440 | dunkel | 1440 × 900 px | 0 px | `44149ddc54ea7a9203e27f7b1d518265b23099cf2b3cde7a65a46a7605ad9b5e` | `kachel-vergleich-teilhistorie-1440-dunkel.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 1440 | hell | 1440 × 900 px | 0 px | `c49bd11a601b4423e49060694e31e9901a9088137b2e81a76ae1fffaea313d73` | `kachel-vergleich-teilhistorie-1440-hell.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 768 | dunkel | 768 × 1024 px | 0 px | `64ae1d27a9c0f26314e0ca6e6effc222cd3c7002ec1290227583d7a4f593a17a` | `kachel-vergleich-teilhistorie-768-dunkel.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 768 | hell | 768 × 1024 px | 0 px | `7218a9e344704773187473ce827e9ba23c82a0c7b2c0fb0231e91e9510964a52` | `kachel-vergleich-teilhistorie-768-hell.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 375 | dunkel | 375 × 812 px | 0 px | `265369370722804054c28a59e73dda603b64278e4811b1501abd599614bc9276` | `kachel-vergleich-teilhistorie-375-dunkel.png` |
| Kachel: Vorjahr mit Hinweis auf Teilhistorie | 375 | hell | 375 × 812 px | 0 px | `51e5fab1cd73f746159f228aed7019e9c79a6f157bdb0e8f01479eb9f8e5deb9` | `kachel-vergleich-teilhistorie-375-hell.png` |
| Kachel: zweite Reihe mit eigener Achse | 1440 | dunkel | 1440 × 900 px | 0 px | `872ff64a675b1f49db8f24d2f5f8501e9080198e9365a20b2f9708751085f4a8` | `kachel-zweite-reihe-1440-dunkel.png` |
| Kachel: zweite Reihe mit eigener Achse | 1440 | hell | 1440 × 900 px | 0 px | `2b3c19ba8267b8a7d255857881dc5810686c439f66c776ff9d1efabf4fce5824` | `kachel-zweite-reihe-1440-hell.png` |
| Kachel: zweite Reihe mit eigener Achse | 768 | dunkel | 768 × 1024 px | 0 px | `d813136a7d847bec20549e334c0a4d2ee06c91d0a680173529cf505f58ad83c2` | `kachel-zweite-reihe-768-dunkel.png` |
| Kachel: zweite Reihe mit eigener Achse | 768 | hell | 768 × 1024 px | 0 px | `9ac2d40af9c89fb5aba3d034c54df79922f20c69f9a864fe427f816354d7ea8b` | `kachel-zweite-reihe-768-hell.png` |
| Kachel: zweite Reihe mit eigener Achse | 375 | dunkel | 375 × 812 px | 0 px | `95dfb7f85d8117675d76a92c3934a3c4a476011bf7b8f9251f00b09319fe6040` | `kachel-zweite-reihe-375-dunkel.png` |
| Kachel: zweite Reihe mit eigener Achse | 375 | hell | 375 × 812 px | 0 px | `22e9d2d489dbd96de732f4f5369e06797e8186d82cdb0beb500ee402221c1847` | `kachel-zweite-reihe-375-hell.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 1440 | dunkel | 1440 × 900 px | 0 px | `9884a55a3d86698f1f073787fa31de1d54426f5a8a5ad99ef99298e834d96717` | `kachel-erwartungsband-1440-dunkel.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 1440 | hell | 1440 × 900 px | 0 px | `db34d4a3905df486c8586ee66060922aed125b0f99cee77d476681a83da216c3` | `kachel-erwartungsband-1440-hell.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 768 | dunkel | 768 × 1024 px | 0 px | `2dce8be1c5122b27b92ecba77f340c988997d76fbbb7f99a0312f3fd30223316` | `kachel-erwartungsband-768-dunkel.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 768 | hell | 768 × 1024 px | 0 px | `08f8a0c2e212f050892e989bf1a17969634b329d24f417e40fd8acc6940d1d2f` | `kachel-erwartungsband-768-hell.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 375 | dunkel | 375 × 812 px | 0 px | `3323bd78ae6f7901d277ae4b005b7bfeefd1fe0311aa7267799a7c6eba7fefb4` | `kachel-erwartungsband-375-dunkel.png` |
| Kachel: Erwartungsband 10.–90. Perzentil | 375 | hell | 375 × 812 px | 0 px | `850106de9d0a4f25e976e4f612c6d4b720b113e1d14896494f8eaa8c7ea99c1d` | `kachel-erwartungsband-375-hell.png` |
| Kachel: Heatmap Phase × Woche | 1440 | dunkel | 1440 × 900 px | 0 px | `bdec5dfa269a903fc52abd7e85e9f2f79c95c8dadb774cf2acce161c7d6c5e86` | `kachel-heatmap-phasen-1440-dunkel.png` |
| Kachel: Heatmap Phase × Woche | 1440 | hell | 1440 × 900 px | 0 px | `f5533e17f753745be67bb752bc26fc1cf6d481056061790bfe4820654fb8902b` | `kachel-heatmap-phasen-1440-hell.png` |
| Kachel: Heatmap Phase × Woche | 768 | dunkel | 768 × 1024 px | 0 px | `850d3c060e6929490f2c054b6d8b5138753ce78889c30d9f30c242289f0495c8` | `kachel-heatmap-phasen-768-dunkel.png` |
| Kachel: Heatmap Phase × Woche | 768 | hell | 768 × 1024 px | 0 px | `4b8117a7a34080093d322cd252360d30e5b7fc0580656e05765baadacc4db2c2` | `kachel-heatmap-phasen-768-hell.png` |
| Kachel: Heatmap Phase × Woche | 375 | dunkel | 375 × 812 px | 0 px | `c05a831814750de64057999336c05413715c2b7e626808eec75d6a2c5c1f0675` | `kachel-heatmap-phasen-375-dunkel.png` |
| Kachel: Heatmap Phase × Woche | 375 | hell | 375 × 812 px | 0 px | `cdbf6132831265ff20db87c07b8ccf82ac4b00631f00e7b04fc75d8009cab149` | `kachel-heatmap-phasen-375-hell.png` |
| Kachel: Heatmap Woche × Wochentag | 1440 | dunkel | 1440 × 900 px | 0 px | `384d6b5d50eac29d33320bc1c6869de497d02fb98581fecbc149b02f69c63bea` | `kachel-heatmap-wochentage-1440-dunkel.png` |
| Kachel: Heatmap Woche × Wochentag | 1440 | hell | 1440 × 900 px | 0 px | `885c434478bb99d72e2b729a9f9fe8df707b7b7022c09684808e84fe432a2ed4` | `kachel-heatmap-wochentage-1440-hell.png` |
| Kachel: Heatmap Woche × Wochentag | 768 | dunkel | 768 × 1024 px | 0 px | `d54d380355149ea7a0735f4552c7c15ae197e2ad914d783467a33e286dd0bace` | `kachel-heatmap-wochentage-768-dunkel.png` |
| Kachel: Heatmap Woche × Wochentag | 768 | hell | 768 × 1024 px | 0 px | `95438f36a3d20fe757f5b1534d2f6e9bb5c2c5d11c98d79f65d2c1b228e5f8fd` | `kachel-heatmap-wochentage-768-hell.png` |
| Kachel: Heatmap Woche × Wochentag | 375 | dunkel | 375 × 812 px | 0 px | `7defcd17888ecabe6793625c7cd40be4de4a14c61ca5b40ba56fd771e2ef7482` | `kachel-heatmap-wochentage-375-dunkel.png` |
| Kachel: Heatmap Woche × Wochentag | 375 | hell | 375 × 812 px | 0 px | `30c48a90c9cad0addece1bb364d2bc32440c9752086512b9fd83a0bccc37e868` | `kachel-heatmap-wochentage-375-hell.png` |
| Inspector: Abschnitt Vergleichen | 1440 | dunkel | 1440 × 900 px | 0 px | `a0eb9919bb94f8632229e3b50d8da8bfacd90014e5397d6ca1b82ef48b09ea36` | `inspector-vergleichen-1440-dunkel.png` |
| Inspector: Abschnitt Vergleichen | 1440 | hell | 1440 × 900 px | 0 px | `5bd34fb957bb228be19e330fbd23d3df9cd6da31a905dea6a05a618226176c4a` | `inspector-vergleichen-1440-hell.png` |
| Inspector: Abschnitt Vergleichen | 768 | dunkel | 768 × 1024 px | 0 px | `a0eb9919bb94f8632229e3b50d8da8bfacd90014e5397d6ca1b82ef48b09ea36` | `inspector-vergleichen-768-dunkel.png` |
| Inspector: Abschnitt Vergleichen | 768 | hell | 768 × 1024 px | 0 px | `5bd34fb957bb228be19e330fbd23d3df9cd6da31a905dea6a05a618226176c4a` | `inspector-vergleichen-768-hell.png` |
| Inspector: Abschnitt Vergleichen | 375 | dunkel | 375 × 812 px | 0 px | `1001db1a6bf48ea2f4b030593a770662b5e120c65d9f8f67bb6119b2ffb08b16` | `inspector-vergleichen-375-dunkel.png` |
| Inspector: Abschnitt Vergleichen | 375 | hell | 375 × 812 px | 0 px | `6a885c1e4b7b58e4905f09974350c1bee095ae5a21ad92669aa7489cff66e828` | `inspector-vergleichen-375-hell.png` |
| Inspector: Sperrgrund bei Heatmap | 1440 | dunkel | 1440 × 900 px | 0 px | `6eb2c5b59f3e25917aa6957e6e969396fb672e8eaf3aa579999fb484ba31df78` | `inspector-sperrgrund-heatmap-1440-dunkel.png` |
| Inspector: Sperrgrund bei Heatmap | 1440 | hell | 1440 × 900 px | 0 px | `6e9b4bf3575088f41e6e5170bfbc51cd15d582b154d92a25555e0cec85ce89d3` | `inspector-sperrgrund-heatmap-1440-hell.png` |
| Inspector: Sperrgrund bei Heatmap | 768 | dunkel | 768 × 1024 px | 0 px | `6eb2c5b59f3e25917aa6957e6e969396fb672e8eaf3aa579999fb484ba31df78` | `inspector-sperrgrund-heatmap-768-dunkel.png` |
| Inspector: Sperrgrund bei Heatmap | 768 | hell | 768 × 1024 px | 0 px | `6e9b4bf3575088f41e6e5170bfbc51cd15d582b154d92a25555e0cec85ce89d3` | `inspector-sperrgrund-heatmap-768-hell.png` |
| Inspector: Sperrgrund bei Heatmap | 375 | dunkel | 375 × 812 px | 0 px | `2982079bc72156f09d4416e89787153a5ac76839914d0ff45987d9c6147bd7b7` | `inspector-sperrgrund-heatmap-375-dunkel.png` |
| Inspector: Sperrgrund bei Heatmap | 375 | hell | 375 × 812 px | 0 px | `bd0f24efe7e01e96b60454db63ba7c29b7b0ea5c99e1db803c0d0394c03b7c17` | `inspector-sperrgrund-heatmap-375-hell.png` |

## Zusammenfassung
- Gesamt-Screenshots: 54 (9 Szenarien × 3 Viewports × 2 Farbschemata)
- Horizontaler Überlauf: **0 px** über alle Durchläufe (Kriterium 0 px: eingehalten).
- Prüfsummen-Eindeutigkeit: je Viewport und Thema 9 distinkte Hashes.
