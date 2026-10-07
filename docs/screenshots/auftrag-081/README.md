# Auftrag 081 – Ausgangslage Frontend (Arbeitspaket 0)

Produkt-Baseline: `7fd6e33` (Release v2.4.0), aufgenommen 2026-10-07 mit
`scripts/captureAuftrag081Inventory.mjs` (Harness SHA-256: `946cbf6a52a026ab`).
Testbenutzer: `admin-a@e2e.local` (Rolle admin, Organisation `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`), Identität vor dem Lauf gegen die Seed-Daten geprüft.
Dashboard-Konfiguration: Standardansicht (17 Kacheln, Quelle: `default_unpersisted`).
Keine Vorher/Nachher-Paare: Paket 0 ändert keinen Produktcode, diese Aufnahmen sind die
Vorher-Seite für die folgenden Pakete. Bilder nur lokal; Bewertung im
[Befundregister](../../reviews/2026-10-06-frontend-befundregister.md).

Aufnahmen: 256 von 256 erwartet, fehlgeschlagen: 0.
axe (serious/critical) läuft zweimal: nur `<main>` und die ganze Seite mit Kopfzeile, Sidebar
und Kontoaktionen. Der erste Tab-Fokus wird ab Dokumentanfang gemessen (Browser-Locale: `de-DE`).

| Ansicht | Breite | Theme | Höhe `<main>` | SHA-256 erster Bildschirm / ganz (16) | Überlauf Dokument / `<main>` px | axe `<main>` | axe ganze Seite | erster Tab-Fokus | Messung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard | 1440 | dark | 3423 | `678b8e69658dc607` / `e9c993d9305ada9e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard | 1440 | light | 3423 | `5268120431189ebb` / `93b05f063375cfac` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard | 768 | dark | 5781 | `37bdf735973c4bac` / `c84cc3bc71770cbd` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard | 768 | light | 5781 | `7027cf6a7e2c690f` / `a4ea7487824a217f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard | 375 | dark | 7997 | `8f1381967eed7cf9` / `49af2e9ad0ef912b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 375 | light | 7997 | `1ed3a8a4a72099f6` / `799e459c53a7f091` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 320 | dark | 8126 | `486fd423cc983375` / `4b9381103f0ac5f4` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 320 | light | 8126 | `34d6bc85a17b7a2a` / `bfbe09801dcfc753` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-edit | 1440 | dark | 4177 | `df42f3ef5af8cd3c` / `2b3fbfd523ce4b22` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard-edit | 1440 | light | 4177 | `ecace4b752d3dc0a` / `257abe0feb542336` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard-edit | 768 | dark | 6513 | `f35e509f1044e1be` / `b21b055b6bd14478` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard-edit | 768 | light | 6513 | `e06ba0ae67a10afc` / `bb9fdf75f82d0405` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard-edit | 375 | dark | 9593 | `c96c1c43876d31d6` / `e8e38cf8d0b65228` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-edit | 375 | light | 9593 | `46d8c2332afbd672` / `0465f61c25cabbc6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 1440 | dark | 893 | `e1e44db6d4bf165a` / `e1e44db6d4bf165a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 1440 | light | 893 | `484e386082ccde02` / `5337a3a3997e0f14` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 768 | dark | 885 | `6bad96d2bc2595ea` / `6bad96d2bc2595ea` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 768 | light | 885 | `42cc405bef23a744` / `9dde39fdf658edc6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 375 | dark | 788 | `af6702b4bb3e81ae` / `af6702b4bb3e81ae` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 375 | light | 788 | `7b096dd4e16e8cf4` / `75b218af7b17b353` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 1440 | dark | 893 | `d566f8ba8d86b006` / `d566f8ba8d86b006` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 1440 | light | 893 | `66c1c4addfc58f6a` / `a4269066680ceb85` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 768 | dark | 885 | `c77242c63c7cb724` / `c77242c63c7cb724` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 768 | light | 885 | `77e100c957e68b0b` / `77e100c957e68b0b` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 375 | dark | 721 | `1b8486d04706a467` / `57a98700f058ee79` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 375 | light | 721 | `0dd775ae180c0b39` / `15ea4f9666080bba` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 1440 | dark | 1765 | `9606868078e1a887` / `071071918dc39d50` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 1440 | light | 1765 | `4d2afc85ec42d649` / `b35ce575a5378d9a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 768 | dark | 1931 | `df83921baaef4d67` / `170a92072ee33e11` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 768 | light | 1931 | `883420ab529e795d` / `907da2bd61c87f50` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 375 | dark | 2575 | `c7ae1f7e6b383ef0` / `5e2e5212e168a779` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 375 | light | 2575 | `8998506ec32cac64` / `617f2f48afc1fc6a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 1440 | dark | 1261 | `d286ce597ec57703` / `5080c74eedbb31e8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 1440 | light | 1261 | `cceb1f354d9a4c34` / `4debd55fe453a0c8` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 768 | dark | 1565 | `82254c51dd98d5c5` / `4708ab102a52e223` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 768 | light | 1565 | `0aa7ba66a1e25d91` / `543f648d0d20a8c4` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 375 | dark | 2651 | `32cf47125d645b94` / `c736618cfafd271e` | 0 / 184 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 375 | light | 2651 | `e7b411c60514402d` / `b82f00539a5603ac` | 0 / 184 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 1440 | dark | 893 | `5f511b85b20b2ed7` / `37d4bd58ca72f1be` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 1440 | light | 893 | `6abe1494efcee833` / `5558db3349dbe4c7` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 768 | dark | 1135 | `8db773676b686194` / `cbe9b921362e7d1d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 768 | light | 1135 | `0a72b15b6cc82653` / `c006854a87a0786c` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 375 | dark | 1839 | `0e2d6e98d5ff8fff` / `8630993cdeaeca35` | 0 / 14 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 375 | light | 1839 | `c2d8cc6e5d1d90f5` / `24cd9a69d3cd21c5` | 0 / 14 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 1440 | dark | 893 | `0910bae604f8ef50` / `a56db4b5842c3988` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 1440 | light | 893 | `1e2481a98a2fd2a5` / `d6397d903cec8457` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 768 | dark | 1029 | `5c2bd43a984f431a` / `701b9fca21c3fbb2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 768 | light | 1029 | `61f9fa390147331b` / `4b0ce9e96e515d50` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 375 | dark | 1786 | `7cd642baefe67173` / `5c7726db9be4d6d9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 375 | light | 1786 | `b9bc36ed30b18452` / `59cec44a1bf3d13e` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 1440 | dark | 893 | `1aac4696aa9f6a61` / `1aac4696aa9f6a61` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 1440 | light | 893 | `e6f4cc27a3968b96` / `e0d6a34e0809a959` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 768 | dark | 1029 | `1d25ed486c2a5d04` / `0770ebc4f12c9120` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 768 | light | 1029 | `0957e8fdd9c7299c` / `7472e3b651cb3f8c` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 375 | dark | 1751 | `1194a49f8084d677` / `2d8a48c5a91b7d31` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 375 | light | 1751 | `5154c73342700076` / `0f9902f66a4f398d` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 1440 | dark | 893 | `d21c8c408f5e17b1` / `d6729047fee6db11` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 1440 | light | 893 | `4a4080a87d464a91` / `2446025912c1677e` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 768 | dark | 885 | `2382b01d589ddb0c` / `8374900df576254c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 768 | light | 885 | `952a1f4980b3eb91` / `5d2685f24012c601` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 375 | dark | 626 | `3693907e3f17d88e` / `3693907e3f17d88e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 375 | light | 626 | `5debd240de37f619` / `85a784dc02a71384` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-profil | 1440 | dark | 893 | `f765543eeeb1b6c0` / `f765543eeeb1b6c0` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-profil | 1440 | light | 893 | `f8a457b51d8d2e01` / `f8a457b51d8d2e01` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-profil | 768 | dark | 885 | `63dbca92e54c0216` / `63dbca92e54c0216` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-profil | 768 | light | 885 | `cdc86b3227848ea0` / `cdc86b3227848ea0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-profil | 375 | dark | 626 | `0c326e41b1b402e0` / `0c326e41b1b402e0` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-profil | 375 | light | 626 | `57e77dc9d73baaca` / `57e77dc9d73baaca` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-highlights | 1440 | dark | 893 | `2a5289fadba95d1f` / `2a5289fadba95d1f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.651 |
| s-highlights | 1440 | light | 893 | `c8c88ffa6d64600a` / `c8c88ffa6d64600a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.651 |
| s-highlights | 768 | dark | 885 | `5738091a1e46f9a7` / `5738091a1e46f9a7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.43 |
| s-highlights | 768 | light | 885 | `05964865c37329e0` / `05964865c37329e0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.43 |
| s-highlights | 375 | dark | 626 | `d79a9cf82d995ef1` / `d79a9cf82d995ef1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-highlights | 375 | light | 626 | `6cefa0f29b10be5d` / `6cefa0f29b10be5d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-idee | 1440 | dark | 893 | `c673c57ce784a562` / `c673c57ce784a562` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.626 |
| s-idee | 1440 | light | 893 | `ca29b9732c0f58ec` / `ca29b9732c0f58ec` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.626 |
| s-idee | 768 | dark | 885 | `0b955cea2813fbbe` / `0b955cea2813fbbe` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-idee | 768 | light | 885 | `29bb6fbc88a88717` / `29bb6fbc88a88717` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-idee | 375 | dark | 626 | `ebd08398a9e98640` / `ebd08398a9e98640` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.192 |
| s-idee | 375 | light | 626 | `21a58a3ee2826fb4` / `21a58a3ee2826fb4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.192 |
| s-value | 1440 | dark | 893 | `e5514fb60fc99cf0` / `e5514fb60fc99cf0` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.586 |
| s-value | 1440 | light | 893 | `3aa98cc23c434584` / `3e6c504a8bbc566d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.586 |
| s-value | 768 | dark | 885 | `0fe4b1768535af80` / `0fe4b1768535af80` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.387 |
| s-value | 768 | light | 885 | `1c615be5047e3508` / `1c615be5047e3508` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.387 |
| s-value | 375 | dark | 626 | `2a56541135c8f9dd` / `2a56541135c8f9dd` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.18 |
| s-value | 375 | light | 626 | `abcd00154f24b65e` / `abcd00154f24b65e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.18 |
| s-historie | 1440 | dark | 893 | `0a5e5d5163df4d75` / `0a5e5d5163df4d75` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.59 |
| s-historie | 1440 | light | 893 | `3abb9e7c58daef19` / `3abb9e7c58daef19` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.59 |
| s-historie | 768 | dark | 885 | `0227a96171779cda` / `0227a96171779cda` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.389 |
| s-historie | 768 | light | 885 | `fbde75b4f86385a5` / `abd302ad42ff996f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.389 |
| s-historie | 375 | dark | 626 | `44c8bcd28ab02a9b` / `44c8bcd28ab02a9b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.181 |
| s-historie | 375 | light | 626 | `cd8e6d2a6dbe2350` / `30ef27de1069923c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.181 |
| s-funktion | 1440 | dark | 893 | `6e8d9b6b54b5c20c` / `6e8d9b6b54b5c20c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.586 |
| s-funktion | 1440 | light | 893 | `f991eb47e242e1d4` / `49a47c887f81e3b8` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.586 |
| s-funktion | 768 | dark | 885 | `78cc98635e7faea4` / `78cc98635e7faea4` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.386 |
| s-funktion | 768 | light | 885 | `25b61695c202bdf3` / `8d5ae7c79d6c4e7a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.386 |
| s-funktion | 375 | dark | 626 | `f1dbbaa8bd78c2d5` / `f1dbbaa8bd78c2d5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.18 |
| s-funktion | 375 | light | 626 | `fe453eb71bfc9480` / `fe453eb71bfc9480` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.18 |
| s-pricing | 1440 | dark | 893 | `0597cc277dc8a869` / `0597cc277dc8a869` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.595 |
| s-pricing | 1440 | light | 893 | `82288cb5e8c8e69f` / `9c046631178e5897` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.595 |
| s-pricing | 768 | dark | 885 | `c222e927de14e1ce` / `c222e927de14e1ce` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.392 |
| s-pricing | 768 | light | 885 | `1d2f592c5c58b751` / `6e3ea6f54424d928` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.392 |
| s-pricing | 375 | dark | 626 | `004bd7813ad60b63` / `004bd7813ad60b63` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.183 |
| s-pricing | 375 | light | 626 | `5a0c9c5e6d266b3c` / `eb2eb1908a506c23` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.183 |
| s-perf | 1440 | dark | 893 | `6c6476e8b15730b8` / `6c6476e8b15730b8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.578 |
| s-perf | 1440 | light | 893 | `a69aa692df6fedee` / `082626cc2f6cbf07` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.578 |
| s-perf | 768 | dark | 885 | `b4e45425db67f414` / `b4e45425db67f414` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.381 |
| s-perf | 768 | light | 885 | `d35d9afd66c5438c` / `0c7418682b2ae1a0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.381 |
| s-perf | 375 | dark | 626 | `990fc8074ced8525` / `990fc8074ced8525` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.178 |
| s-perf | 375 | light | 626 | `a8e6b8e259f9ca2d` / `50104550e749a967` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.178 |
| s-roadmap | 1440 | dark | 893 | `e406484744ca23cd` / `e406484744ca23cd` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.701 |
| s-roadmap | 1440 | light | 893 | `ee9814cdf02d6286` / `fb73dfc2787797de` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.701 |
| s-roadmap | 768 | dark | 885 | `e908f20b8c033dad` / `e908f20b8c033dad` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.463 |
| s-roadmap | 768 | light | 885 | `2028f07e46dc9e09` / `522f8e9309442a5b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.463 |
| s-roadmap | 375 | dark | 626 | `15410d519b3f2d6c` / `15410d519b3f2d6c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.216 |
| s-roadmap | 375 | light | 626 | `32dfbdb9ca884c6b` / `32dfbdb9ca884c6b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.216 |
| s-markt | 1440 | dark | 893 | `faa49057546edbd3` / `faa49057546edbd3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-markt | 1440 | light | 893 | `33daf08f168f710c` / `86abfbcb8b5657e9` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-markt | 768 | dark | 885 | `37cae088dc24c3f9` / `37cae088dc24c3f9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-markt | 768 | light | 885 | `97dacd5169a52e9f` / `675b6d7cf54007c4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-markt | 375 | dark | 626 | `91e71fcd55ed52dc` / `91e71fcd55ed52dc` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-markt | 375 | light | 626 | `8e5d0a877a06ba4e` / `8e5d0a877a06ba4e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-wettbewerb | 1440 | dark | 893 | `bbca3a26ff3a3bf9` / `bbca3a26ff3a3bf9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-wettbewerb | 1440 | light | 893 | `76051f39d280cd41` / `0ac7bea03780acc2` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-wettbewerb | 768 | dark | 885 | `4586548ef85833de` / `4586548ef85833de` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-wettbewerb | 768 | light | 885 | `2fef9a8a5fd7d71d` / `9faafb5aeaa338f1` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-wettbewerb | 375 | dark | 626 | `b5e3662e9c254179` / `b5e3662e9c254179` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-wettbewerb | 375 | light | 626 | `dd3fcd7ac286994e` / `5eb9783bc2504ecc` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-swot | 1440 | dark | 893 | `6058de09097e05c9` / `6058de09097e05c9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-swot | 1440 | light | 893 | `8e87463ee858df07` / `0aeb73d5d7048748` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-swot | 768 | dark | 885 | `8db2e8f8072cfdd6` / `8db2e8f8072cfdd6` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-swot | 768 | light | 885 | `fcd752706ee5d38f` / `262b3315c8f7d7ee` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-swot | 375 | dark | 626 | `6be01de34a65f240` / `6be01de34a65f240` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-swot | 375 | light | 626 | `f3b06d2fb72bcb7e` / `f96bb04dbd4fc6ae` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-icp | 1440 | dark | 893 | `241fe472eae0b2c9` / `241fe472eae0b2c9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.633 |
| s-icp | 1440 | light | 893 | `e9e1e7d9d2c94866` / `e9e1e7d9d2c94866` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.633 |
| s-icp | 768 | dark | 885 | `6e160f1975ade553` / `6e160f1975ade553` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.417 |
| s-icp | 768 | light | 885 | `d94d7907b6056297` / `d94d7907b6056297` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.417 |
| s-icp | 375 | dark | 626 | `9e67bc47b6aac32b` / `9e67bc47b6aac32b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.194 |
| s-icp | 375 | light | 626 | `dd0e77f2c363967b` / `dd0e77f2c363967b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.194 |
| s-persona | 1440 | dark | 893 | `f435030874ef7f67` / `f435030874ef7f67` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.628 |
| s-persona | 1440 | light | 893 | `7cbe8e3d251a8a52` / `1f7b322dc60bea4a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.628 |
| s-persona | 768 | dark | 885 | `64549761d8a997df` / `64549761d8a997df` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.414 |
| s-persona | 768 | light | 885 | `9fa810925f6703d4` / `9fa810925f6703d4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.414 |
| s-persona | 375 | dark | 626 | `5f42de6af3de288b` / `5f42de6af3de288b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-persona | 375 | light | 626 | `409b19a7357699ed` / `409b19a7357699ed` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-segmente | 1440 | dark | 893 | `45978b74d7792ef8` / `45978b74d7792ef8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.627 |
| s-segmente | 1440 | light | 893 | `d6dfed0eb61c0146` / `d6dfed0eb61c0146` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.627 |
| s-segmente | 768 | dark | 885 | `ec019540fccdf792` / `ec019540fccdf792` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-segmente | 768 | light | 885 | `6b45d4461587ac88` / `6b45d4461587ac88` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-segmente | 375 | dark | 626 | `4acfa7fa5d80c1e1` / `4acfa7fa5d80c1e1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-segmente | 375 | light | 626 | `3d532fda9063d717` / `151eb32feac3c384` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-top10 | 1440 | dark | 893 | `a8270a245b2165f9` / `a8270a245b2165f9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.627 |
| s-top10 | 1440 | light | 893 | `e33b1ea8197d29f5` / `4205cc327774537d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.627 |
| s-top10 | 768 | dark | 885 | `293686375218b917` / `293686375218b917` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-top10 | 768 | light | 885 | `86e38c2a10e9bc70` / `86e38c2a10e9bc70` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-top10 | 375 | dark | 626 | `384d41b24ad6ca50` / `384d41b24ad6ca50` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-top10 | 375 | light | 626 | `9f0484a3c308aa7c` / `9f0484a3c308aa7c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-funnel | 1440 | dark | 893 | `3e22388b756ea0ef` / `3e22388b756ea0ef` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.662 |
| s-funnel | 1440 | light | 893 | `eb2a41db707d595d` / `039f283571195c4f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.662 |
| s-funnel | 768 | dark | 885 | `c0149d300d830740` / `c0149d300d830740` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.437 |
| s-funnel | 768 | light | 885 | `43df77e42a49c813` / `eabc5030174c821e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.437 |
| s-funnel | 375 | dark | 626 | `a2dfd660a9149d05` / `a2dfd660a9149d05` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.203 |
| s-funnel | 375 | light | 626 | `8876f1ee1f577a12` / `8876f1ee1f577a12` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.203 |
| s-funnel | 320 | dark | 454 | `3aa805a2b9df5843` / `3aa805a2b9df5843` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.171 |
| s-funnel | 320 | light | 454 | `a311c14aeef01a96` / `25ca4ca385a99a7b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.171 |
| s-sla | 1440 | dark | 893 | `26692e6271bb51ad` / `26692e6271bb51ad` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.648 |
| s-sla | 1440 | light | 893 | `a4e5885ca8c8b534` / `f4c85fdad3b2cc8d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.648 |
| s-sla | 768 | dark | 885 | `e4418259a0e985b1` / `e4418259a0e985b1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-sla | 768 | light | 885 | `d4899ed9cc4cb3a8` / `16e45b52f8ed4c24` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-sla | 375 | dark | 626 | `ea2a5104dc92a192` / `ea2a5104dc92a192` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.199 |
| s-sla | 375 | light | 626 | `f4698eb5b848036a` / `502c11020c40eb2c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.199 |
| s-kanaele | 1440 | dark | 893 | `806f82d6dd8193d7` / `806f82d6dd8193d7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.648 |
| s-kanaele | 1440 | light | 893 | `4d0536c266ad1d47` / `86cf8d5140152b02` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.648 |
| s-kanaele | 768 | dark | 885 | `7be37b8948876166` / `7be37b8948876166` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-kanaele | 768 | light | 885 | `5205288d6963ba78` / `771bb2854eefc0c7` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-kanaele | 375 | dark | 626 | `0289fdf6da878d59` / `0289fdf6da878d59` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.199 |
| s-kanaele | 375 | light | 626 | `7413551dc1f3fb17` / `7413551dc1f3fb17` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.199 |
| s-planung | 1440 | dark | 893 | `060e809f32d32ff3` / `060e809f32d32ff3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-planung | 1440 | light | 893 | `f49b25c97f055c32` / `3cf255847cc0fb2a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-planung | 768 | dark | 885 | `96f1fb9bdc07d249` / `96f1fb9bdc07d249` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-planung | 768 | light | 885 | `7306ba8b0648b38f` / `447d9f804c8d5904` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-planung | 375 | dark | 626 | `b1f19f2c40c9a562` / `b1f19f2c40c9a562` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-planung | 375 | light | 626 | `b6b34f00eb70bfe6` / `72591c4d98084f9e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-guv | 1440 | dark | 893 | `7bbfadd934d09543` / `7bbfadd934d09543` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-guv | 1440 | light | 893 | `eba995fb28eec4e6` / `faaef91ead290fcf` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-guv | 768 | dark | 885 | `121428ea5f0ebb37` / `121428ea5f0ebb37` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-guv | 768 | light | 885 | `a4435f2f82a55f1c` / `7797afbb131a6551` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-guv | 375 | dark | 603 | `d7e76b20e8739fad` / `d7e76b20e8739fad` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-guv | 375 | light | 603 | `a1f8b584265baafb` / `a1f8b584265baafb` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-bilanz | 1440 | dark | 893 | `b0a5f240ec00f8b3` / `b0a5f240ec00f8b3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.659 |
| s-bilanz | 1440 | light | 893 | `16e796772acb4739` / `e88e425ad14a1723` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.659 |
| s-bilanz | 768 | dark | 885 | `47e93e268fb9fa9c` / `47e93e268fb9fa9c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.435 |
| s-bilanz | 768 | light | 885 | `e02019c463eedaac` / `79474185d660959f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.435 |
| s-bilanz | 375 | dark | 626 | `eca9246eb9a15339` / `eca9246eb9a15339` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.203 |
| s-bilanz | 375 | light | 626 | `dcecdf8e1bd4323a` / `dcecdf8e1bd4323a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.203 |
| s-unit | 1440 | dark | 893 | `51e88a744d95b468` / `51e88a744d95b468` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.658 |
| s-unit | 1440 | light | 893 | `897b73c61e1f0984` / `897b73c61e1f0984` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.658 |
| s-unit | 768 | dark | 885 | `6a79ccfc7c49636a` / `6a79ccfc7c49636a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.434 |
| s-unit | 768 | light | 885 | `eedb90fa2212bb8d` / `eedb90fa2212bb8d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.434 |
| s-unit | 375 | dark | 626 | `b3945f815033e44d` / `b3945f815033e44d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.202 |
| s-unit | 375 | light | 626 | `076604b4253893dd` / `076604b4253893dd` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.202 |
| s-headcount | 1440 | dark | 893 | `d8041473fd1cdba7` / `d8041473fd1cdba7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-headcount | 1440 | light | 893 | `0ac69a8e2e6e55df` / `845b7212d26c8e68` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-headcount | 768 | dark | 885 | `48e22ea09b5315d3` / `48e22ea09b5315d3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-headcount | 768 | light | 885 | `e84c3b2d6560933c` / `e84c3b2d6560933c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-headcount | 375 | dark | 626 | `28cda9e0471b581f` / `28cda9e0471b581f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-headcount | 375 | light | 626 | `428a7c3a58f650a4` / `428a7c3a58f650a4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-hr | 1440 | dark | 893 | `1f1461d7031b3cc5` / `1f1461d7031b3cc5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-hr | 1440 | light | 893 | `b9db3f44892b04f7` / `3c59007e8b6d569b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-hr | 768 | dark | 885 | `eda46649aeec9fd1` / `eda46649aeec9fd1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.42 |
| s-hr | 768 | light | 885 | `b1bfc9b662358872` / `b1bfc9b662358872` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.42 |
| s-hr | 375 | dark | 626 | `5a76f8fcd7b6539c` / `5a76f8fcd7b6539c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.196 |
| s-hr | 375 | light | 626 | `165a2699f89b5458` / `165a2699f89b5458` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.196 |
| s-team | 1440 | dark | 893 | `a35b54d2d778c54b` / `a35b54d2d778c54b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.633 |
| s-team | 1440 | light | 893 | `5811df7e92393866` / `5811df7e92393866` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.633 |
| s-team | 768 | dark | 885 | `88139da700a3bb1a` / `88139da700a3bb1a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.418 |
| s-team | 768 | light | 885 | `6eeb129117b36a2b` / `6eeb129117b36a2b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.418 |
| s-team | 375 | dark | 626 | `c61103098e0ffba2` / `c61103098e0ffba2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-team | 375 | light | 626 | `21bf137fe42ff517` / `0a480d18136d301c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-okr | 1440 | dark | 893 | `298119426aae26db` / `298119426aae26db` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.634 |
| s-okr | 1440 | light | 893 | `0d8a23a5c77abef9` / `e74f3bb68149e040` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.634 |
| s-okr | 768 | dark | 885 | `d783addc822324d2` / `d783addc822324d2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.418 |
| s-okr | 768 | light | 885 | `511573318e66255f` / `13cc2227ffeff376` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.418 |
| s-okr | 375 | dark | 626 | `222cf797c3cab5e8` / `222cf797c3cab5e8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-okr | 375 | light | 626 | `78993cceb70ac5f4` / `78993cceb70ac5f4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-bsc | 1440 | dark | 893 | `5dbe5eb8516bf169` / `5dbe5eb8516bf169` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-bsc | 1440 | light | 893 | `36fe738ea4748f9e` / `371ca4e1b819769c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-bsc | 768 | dark | 885 | `a92fbe41ef459ed9` / `a92fbe41ef459ed9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-bsc | 768 | light | 885 | `4802ba368d285cd6` / `883c5362ecea34d6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-bsc | 375 | dark | 626 | `f787e1785cfa0da3` / `f787e1785cfa0da3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-bsc | 375 | light | 626 | `63018f5497699292` / `63018f5497699292` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-treiber | 1440 | dark | 893 | `d71ef79f4f910b84` / `d71ef79f4f910b84` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-treiber | 1440 | light | 893 | `b4649e92a323c185` / `2ce46239d7aaab24` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-treiber | 768 | dark | 885 | `5de909a580ca3a40` / `5de909a580ca3a40` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-treiber | 768 | light | 885 | `b7ae8f68bbe705e9` / `b7ae8f68bbe705e9` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-treiber | 375 | dark | 626 | `d3191557e80bf484` / `d3191557e80bf484` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-treiber | 375 | light | 626 | `328d1178b968b033` / `328d1178b968b033` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-satzung | 1440 | dark | 893 | `2e3a16a454190b2e` / `2e3a16a454190b2e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-satzung | 1440 | light | 893 | `890f285757c1176b` / `8e57aa57d0ea2456` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-satzung | 768 | dark | 885 | `e2e6a1787b8b2010` / `e2e6a1787b8b2010` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-satzung | 768 | light | 885 | `7d63b97f57a3b3cf` / `ea969340e10e4985` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-satzung | 375 | dark | 626 | `60e627b9f713fd94` / `60e627b9f713fd94` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-satzung | 375 | light | 626 | `7e33a84303249f45` / `7e33a84303249f45` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-gesellschafter | 1440 | dark | 893 | `d426abcc8cdcac7e` / `d426abcc8cdcac7e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-gesellschafter | 1440 | light | 893 | `d977ac81b4f687d7` / `7258fbaac38c1c15` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-gesellschafter | 768 | dark | 885 | `e315ad2107994bc8` / `e315ad2107994bc8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-gesellschafter | 768 | light | 885 | `5dcc2865dcf6bda6` / `4ffd1e16dfc6f693` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-gesellschafter | 375 | dark | 626 | `376c1a14543b634d` / `376c1a14543b634d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-gesellschafter | 375 | light | 626 | `4cd00acbf7fe7d77` / `4cd00acbf7fe7d77` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-handelsregister | 1440 | dark | 893 | `dd147c9b3cf904dc` / `dd147c9b3cf904dc` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-handelsregister | 1440 | light | 893 | `11f1da2ba332b576` / `11f1da2ba332b576` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-handelsregister | 768 | dark | 885 | `2d4913424bb57b2d` / `2d4913424bb57b2d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.42 |
| s-handelsregister | 768 | light | 885 | `d94254be6fd89500` / `d94254be6fd89500` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.42 |
| s-handelsregister | 375 | dark | 626 | `8557c148cf8fe227` / `8557c148cf8fe227` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.196 |
| s-handelsregister | 375 | light | 626 | `dffa92c3eba05973` / `13bceb3ecb857a93` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.196 |
