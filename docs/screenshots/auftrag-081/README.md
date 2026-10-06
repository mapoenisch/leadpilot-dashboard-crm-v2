# Auftrag 081 – Ausgangslage Frontend (Arbeitspaket 0)

Code-Stand `2a228c2`, aufgenommen 2026-10-06 mit
`scripts/captureAuftrag081Inventory.mjs`. Keine Vorher/Nachher-Paare: Paket 0 ändert nichts,
diese Aufnahmen sind die Vorher-Seite für die folgenden Pakete. Bilder nur lokal; Bewertung im
[Befundregister](../../reviews/2026-10-06-frontend-befundregister.md).

Aufnahmen: 256 von 256 erwartet, fehlgeschlagen: 0.
axe (serious/critical) läuft zweimal: nur `<main>` und die ganze Seite mit Kopfzeile, Sidebar
und Kontoaktionen. Der erste Tab-Fokus wird ab Dokumentanfang gemessen.

| Ansicht | Breite | Theme | Höhe `<main>` | SHA-256 erster Bildschirm / ganz (16) | Überlauf Dokument / `<main>` px | axe `<main>` | axe ganze Seite | erster Tab-Fokus | Messung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard | 1440 | dark | 3423 | `678b8e69658dc607` / `c727cbfcc60e0d0e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard | 1440 | light | 3423 | `5268120431189ebb` / `bfea251a48bee705` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard | 768 | dark | 5781 | `37bdf735973c4bac` / `e8313cd106788719` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard | 768 | light | 5781 | `7027cf6a7e2c690f` / `0bffca4118763f9a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard | 375 | dark | 7997 | `8f1381967eed7cf9` / `c13c784b5d1ec3fc` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 375 | light | 7997 | `1ed3a8a4a72099f6` / `a75f26857bc7c47f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 320 | dark | 8126 | `486fd423cc983375` / `619836ff867b5e08` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard | 320 | light | 8126 | `811de4277e9ff389` / `eec0e79a836284c8` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-edit | 1440 | dark | 4177 | `df42f3ef5af8cd3c` / `611ef4ff3aa39054` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard-edit | 1440 | light | 4177 | `639ece683a15c14f` / `fc1cad75b067601b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 4 |
| dashboard-edit | 768 | dark | 6513 | `f35e509f1044e1be` / `5142bf155c7fec3c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard-edit | 768 | light | 6513 | `e06ba0ae67a10afc` / `fca3067a7535c66f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 2 |
| dashboard-edit | 375 | dark | 9593 | `c96c1c43876d31d6` / `d3e94d4e2cb12346` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-edit | 375 | light | 9593 | `644f34cbb2158cf9` / `ffb4723328875e3f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 1440 | dark | 893 | `e1e44db6d4bf165a` / `f508df20da7fb42a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 1440 | light | 893 | `484e386082ccde02` / `0414967c3324a263` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 768 | dark | 885 | `6bad96d2bc2595ea` / `6bad96d2bc2595ea` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 768 | light | 885 | `9dde39fdf658edc6` / `9dde39fdf658edc6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 375 | dark | 788 | `af6702b4bb3e81ae` / `c1116284d632c5a4` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| dashboard-detail | 375 | light | 788 | `7b096dd4e16e8cf4` / `1c10a941809df4bb` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 1440 | dark | 893 | `d566f8ba8d86b006` / `04948af82e1d2875` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 1440 | light | 893 | `66c1c4addfc58f6a` / `6f0712e53d103a0e` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 768 | dark | 885 | `c77242c63c7cb724` / `c77242c63c7cb724` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 768 | light | 885 | `03329e4a416ddd74` / `03329e4a416ddd74` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 375 | dark | 721 | `1b8486d04706a467` / `cb3a263b477d707a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-daten | 375 | light | 721 | `0dd775ae180c0b39` / `17af7babef2d63b3` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 1440 | dark | 1765 | `c5c9a91b5783cc48` / `c6f897414d286d6e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 1440 | light | 1765 | `7667ac3ed5b1bf37` / `a59dd1f287792366` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 768 | dark | 1931 | `df83921baaef4d67` / `17f0f9098201abec` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 768 | light | 1931 | `a34be994d18ec741` / `bce921de934c2bfb` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 375 | dark | 2575 | `84e9d1c70086392c` / `67b9f9a414f890c7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-standort | 375 | light | 2575 | `8998506ec32cac64` / `d03702742ed6588a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 1440 | dark | 1261 | `d286ce597ec57703` / `b91a67bdd29cece7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 1440 | light | 1261 | `cceb1f354d9a4c34` / `fc0eb86caf575578` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 768 | dark | 1565 | `82254c51dd98d5c5` / `bcd26638ce092e42` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 768 | light | 1565 | `0aa7ba66a1e25d91` / `b496a89cac1c640b` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 375 | dark | 2651 | `32cf47125d645b94` / `48fcddf45ad8765d` | 0 / 184 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-live-simulation | 375 | light | 2651 | `6c4a03b3905d175e` / `6ac9cb2e70745256` | 0 / 184 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 1440 | dark | 893 | `37d4bd58ca72f1be` / `71100aca2b3f61e5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 1440 | light | 893 | `5558db3349dbe4c7` / `d34efb26a59c1f5d` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 768 | dark | 1135 | `9defca0e6d51e509` / `443d621e425324e1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 768 | light | 1135 | `b64759f19181945b` / `5017a8dfcd391c7b` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 375 | dark | 1839 | `62aad412414c8537` / `499065afdba63c7b` | 0 / 14 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-leads | 375 | light | 1839 | `c2d8cc6e5d1d90f5` / `ad0e4b6eb44cc55a` | 0 / 14 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 1440 | dark | 893 | `0910bae604f8ef50` / `b4d991029c90a3f5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 1440 | light | 893 | `d6397d903cec8457` / `49f98faf07f60fe1` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 768 | dark | 1029 | `5c2bd43a984f431a` / `d0588aebeb849660` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 768 | light | 1029 | `ea39fd08213a6553` / `f248132eb2344bbc` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 375 | dark | 1786 | `7cd642baefe67173` / `39895ce33f41a887` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-companies | 375 | light | 1786 | `b9bc36ed30b18452` / `b4040ca34b126690` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 1440 | dark | 893 | `1aac4696aa9f6a61` / `9a769d7bd13d238f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 1440 | light | 893 | `8ca216e95692eec4` / `bbe21cebdb691054` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 768 | dark | 1029 | `1d25ed486c2a5d04` / `5bb2b89b48693147` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 768 | light | 1029 | `d6c53ababf334eb1` / `cd2cc4cd1694705f` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 375 | dark | 1751 | `1194a49f8084d677` / `aa6b3f2b3514551e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-deals | 375 | light | 1751 | `196e06ef9d83ef44` / `36e1306843951f20` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 1440 | dark | 893 | `d21c8c408f5e17b1` / `b33f78de3b38d6b5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 1440 | light | 893 | `1fe2130e4c0cce3f` / `a7eaf793f28bccb4` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 768 | dark | 885 | `8374900df576254c` / `8374900df576254c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 768 | light | 885 | `5d2685f24012c601` / `5d2685f24012c601` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 375 | dark | 626 | `3693907e3f17d88e` / `3693907e3f17d88e` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-activities | 375 | light | 626 | `5debd240de37f619` / `5debd240de37f619` | 0 / 0 | color-contrast | color-contrast | a Zum Hauptinhalt springen | Werte im 1. Bildschirm: 0 |
| s-profil | 1440 | dark | 893 | `f765543eeeb1b6c0` / `949a4be2bd587307` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-profil | 1440 | light | 893 | `f8a457b51d8d2e01` / `3993dff9a2438d0f` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-profil | 768 | dark | 885 | `63dbca92e54c0216` / `63dbca92e54c0216` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-profil | 768 | light | 885 | `cdc86b3227848ea0` / `cdc86b3227848ea0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-profil | 375 | dark | 626 | `0c326e41b1b402e0` / `0c326e41b1b402e0` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-profil | 375 | light | 626 | `57e77dc9d73baaca` / `57e77dc9d73baaca` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-highlights | 1440 | dark | 893 | `2a5289fadba95d1f` / `2b5d409a459a2d48` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.651 |
| s-highlights | 1440 | light | 893 | `c8c88ffa6d64600a` / `beade62dde2a02d6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.651 |
| s-highlights | 768 | dark | 885 | `5738091a1e46f9a7` / `5738091a1e46f9a7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.43 |
| s-highlights | 768 | light | 885 | `05964865c37329e0` / `05964865c37329e0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.43 |
| s-highlights | 375 | dark | 626 | `d79a9cf82d995ef1` / `d79a9cf82d995ef1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-highlights | 375 | light | 626 | `6cefa0f29b10be5d` / `6cefa0f29b10be5d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-idee | 1440 | dark | 893 | `c673c57ce784a562` / `4938e00bb430c3fd` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.626 |
| s-idee | 1440 | light | 893 | `391a0b388f8c4de0` / `8ceaabcc42c3156d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.626 |
| s-idee | 768 | dark | 885 | `0b955cea2813fbbe` / `0b955cea2813fbbe` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-idee | 768 | light | 885 | `d7920575c244fbbd` / `d7920575c244fbbd` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-idee | 375 | dark | 626 | `ebd08398a9e98640` / `ebd08398a9e98640` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.192 |
| s-idee | 375 | light | 626 | `21a58a3ee2826fb4` / `21a58a3ee2826fb4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.192 |
| s-value | 1440 | dark | 893 | `e5514fb60fc99cf0` / `cfb6e2ac36a3c1d7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.586 |
| s-value | 1440 | light | 893 | `3aa98cc23c434584` / `24fe243c1d1a37f1` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.586 |
| s-value | 768 | dark | 885 | `0fe4b1768535af80` / `0fe4b1768535af80` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.387 |
| s-value | 768 | light | 885 | `4c365796bd611c10` / `4c365796bd611c10` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.387 |
| s-value | 375 | dark | 626 | `2a56541135c8f9dd` / `2a56541135c8f9dd` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.18 |
| s-value | 375 | light | 626 | `abcd00154f24b65e` / `abcd00154f24b65e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.18 |
| s-historie | 1440 | dark | 893 | `0a5e5d5163df4d75` / `f9259d713b5b1882` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.59 |
| s-historie | 1440 | light | 893 | `3abb9e7c58daef19` / `477e63a0b3e8ef17` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.59 |
| s-historie | 768 | dark | 885 | `0227a96171779cda` / `0227a96171779cda` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.389 |
| s-historie | 768 | light | 885 | `fbde75b4f86385a5` / `fbde75b4f86385a5` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.389 |
| s-historie | 375 | dark | 626 | `44c8bcd28ab02a9b` / `44c8bcd28ab02a9b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.181 |
| s-historie | 375 | light | 626 | `30ef27de1069923c` / `30ef27de1069923c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.181 |
| s-funktion | 1440 | dark | 893 | `6e8d9b6b54b5c20c` / `c89da1bc9568483b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.586 |
| s-funktion | 1440 | light | 893 | `f991eb47e242e1d4` / `9311f2cda5d95d00` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.586 |
| s-funktion | 768 | dark | 885 | `78cc98635e7faea4` / `78cc98635e7faea4` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.386 |
| s-funktion | 768 | light | 885 | `25b61695c202bdf3` / `25b61695c202bdf3` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.386 |
| s-funktion | 375 | dark | 626 | `f1dbbaa8bd78c2d5` / `f1dbbaa8bd78c2d5` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.18 |
| s-funktion | 375 | light | 626 | `fe453eb71bfc9480` / `fe453eb71bfc9480` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.18 |
| s-pricing | 1440 | dark | 893 | `0597cc277dc8a869` / `1e9327b52eee4c56` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.595 |
| s-pricing | 1440 | light | 893 | `9c046631178e5897` / `cd07fb1a53433b02` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.595 |
| s-pricing | 768 | dark | 885 | `c222e927de14e1ce` / `c222e927de14e1ce` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.392 |
| s-pricing | 768 | light | 885 | `1d2f592c5c58b751` / `1d2f592c5c58b751` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.392 |
| s-pricing | 375 | dark | 626 | `004bd7813ad60b63` / `004bd7813ad60b63` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.183 |
| s-pricing | 375 | light | 626 | `5a0c9c5e6d266b3c` / `5a0c9c5e6d266b3c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.183 |
| s-perf | 1440 | dark | 893 | `6c6476e8b15730b8` / `a07d9384447e9b52` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.578 |
| s-perf | 1440 | light | 893 | `a69aa692df6fedee` / `9c200a12a73b0601` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.578 |
| s-perf | 768 | dark | 885 | `b4e45425db67f414` / `b4e45425db67f414` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.381 |
| s-perf | 768 | light | 885 | `0c7418682b2ae1a0` / `0c7418682b2ae1a0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.381 |
| s-perf | 375 | dark | 626 | `990fc8074ced8525` / `990fc8074ced8525` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.178 |
| s-perf | 375 | light | 626 | `50104550e749a967` / `50104550e749a967` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.178 |
| s-roadmap | 1440 | dark | 893 | `e406484744ca23cd` / `4919484c0187c00f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.701 |
| s-roadmap | 1440 | light | 893 | `ee9814cdf02d6286` / `54435abbf869a2e0` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.701 |
| s-roadmap | 768 | dark | 885 | `e908f20b8c033dad` / `e908f20b8c033dad` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.463 |
| s-roadmap | 768 | light | 885 | `522f8e9309442a5b` / `522f8e9309442a5b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.463 |
| s-roadmap | 375 | dark | 626 | `15410d519b3f2d6c` / `15410d519b3f2d6c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.216 |
| s-roadmap | 375 | light | 626 | `32dfbdb9ca884c6b` / `32dfbdb9ca884c6b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.216 |
| s-markt | 1440 | dark | 893 | `faa49057546edbd3` / `1e79697ed4bdc18c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-markt | 1440 | light | 893 | `86abfbcb8b5657e9` / `ff81eb5dd10ce1b9` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-markt | 768 | dark | 885 | `37cae088dc24c3f9` / `37cae088dc24c3f9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-markt | 768 | light | 885 | `675b6d7cf54007c4` / `675b6d7cf54007c4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-markt | 375 | dark | 626 | `91e71fcd55ed52dc` / `91e71fcd55ed52dc` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-markt | 375 | light | 626 | `8e5d0a877a06ba4e` / `8e5d0a877a06ba4e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-wettbewerb | 1440 | dark | 893 | `bbca3a26ff3a3bf9` / `c4284b2a870e1b57` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-wettbewerb | 1440 | light | 893 | `0ac7bea03780acc2` / `ce058a6703d60e89` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-wettbewerb | 768 | dark | 885 | `4586548ef85833de` / `4586548ef85833de` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-wettbewerb | 768 | light | 885 | `9faafb5aeaa338f1` / `9faafb5aeaa338f1` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-wettbewerb | 375 | dark | 626 | `b5e3662e9c254179` / `b5e3662e9c254179` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-wettbewerb | 375 | light | 626 | `dd3fcd7ac286994e` / `dd3fcd7ac286994e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-swot | 1440 | dark | 893 | `6058de09097e05c9` / `1e11c9a8b36e6d0c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-swot | 1440 | light | 893 | `0aeb73d5d7048748` / `64ba4daaa3066b30` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-swot | 768 | dark | 885 | `8db2e8f8072cfdd6` / `8db2e8f8072cfdd6` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-swot | 768 | light | 885 | `262b3315c8f7d7ee` / `262b3315c8f7d7ee` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-swot | 375 | dark | 626 | `6be01de34a65f240` / `6be01de34a65f240` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-swot | 375 | light | 626 | `f96bb04dbd4fc6ae` / `f96bb04dbd4fc6ae` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-icp | 1440 | dark | 893 | `241fe472eae0b2c9` / `6d48b0bd25703e86` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.633 |
| s-icp | 1440 | light | 893 | `e9e1e7d9d2c94866` / `81af451317ced1b4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.633 |
| s-icp | 768 | dark | 885 | `6e160f1975ade553` / `6e160f1975ade553` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.417 |
| s-icp | 768 | light | 885 | `d94d7907b6056297` / `d94d7907b6056297` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.417 |
| s-icp | 375 | dark | 626 | `9e67bc47b6aac32b` / `9e67bc47b6aac32b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.194 |
| s-icp | 375 | light | 626 | `dd0e77f2c363967b` / `dd0e77f2c363967b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.194 |
| s-persona | 1440 | dark | 893 | `f435030874ef7f67` / `1f9e2b5a00b4017f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.628 |
| s-persona | 1440 | light | 893 | `1f7b322dc60bea4a` / `debe620ca459e624` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.628 |
| s-persona | 768 | dark | 885 | `64549761d8a997df` / `64549761d8a997df` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.414 |
| s-persona | 768 | light | 885 | `9fa810925f6703d4` / `9fa810925f6703d4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.414 |
| s-persona | 375 | dark | 626 | `5f42de6af3de288b` / `5f42de6af3de288b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-persona | 375 | light | 626 | `409b19a7357699ed` / `409b19a7357699ed` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-segmente | 1440 | dark | 893 | `45978b74d7792ef8` / `805f6ff20b2419c2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.627 |
| s-segmente | 1440 | light | 893 | `d6dfed0eb61c0146` / `2bd6caccb1b95df7` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.627 |
| s-segmente | 768 | dark | 885 | `ec019540fccdf792` / `ec019540fccdf792` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-segmente | 768 | light | 885 | `b1c5561e1b0dcc80` / `b1c5561e1b0dcc80` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-segmente | 375 | dark | 626 | `4acfa7fa5d80c1e1` / `4acfa7fa5d80c1e1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-segmente | 375 | light | 626 | `151eb32feac3c384` / `151eb32feac3c384` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-top10 | 1440 | dark | 893 | `a8270a245b2165f9` / `f5f9660d1ee13c49` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.627 |
| s-top10 | 1440 | light | 893 | `4205cc327774537d` / `e833b357c408d2a7` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.627 |
| s-top10 | 768 | dark | 885 | `293686375218b917` / `293686375218b917` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.413 |
| s-top10 | 768 | light | 885 | `86e38c2a10e9bc70` / `86e38c2a10e9bc70` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.413 |
| s-top10 | 375 | dark | 626 | `384d41b24ad6ca50` / `384d41b24ad6ca50` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.193 |
| s-top10 | 375 | light | 626 | `9f0484a3c308aa7c` / `9f0484a3c308aa7c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.193 |
| s-funnel | 1440 | dark | 893 | `3e22388b756ea0ef` / `1dca8a01d4706bb7` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.662 |
| s-funnel | 1440 | light | 893 | `039f283571195c4f` / `7f4c1efcede59dee` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.662 |
| s-funnel | 768 | dark | 885 | `c0149d300d830740` / `c0149d300d830740` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.437 |
| s-funnel | 768 | light | 885 | `eabc5030174c821e` / `eabc5030174c821e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.437 |
| s-funnel | 375 | dark | 626 | `a2dfd660a9149d05` / `a2dfd660a9149d05` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.203 |
| s-funnel | 375 | light | 626 | `8876f1ee1f577a12` / `8876f1ee1f577a12` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.203 |
| s-funnel | 320 | dark | 454 | `3aa805a2b9df5843` / `3aa805a2b9df5843` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.171 |
| s-funnel | 320 | light | 454 | `a311c14aeef01a96` / `a311c14aeef01a96` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.171 |
| s-sla | 1440 | dark | 893 | `26692e6271bb51ad` / `6ef3b86bb503ca2d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.648 |
| s-sla | 1440 | light | 893 | `f4c85fdad3b2cc8d` / `223109f9f9964caf` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.648 |
| s-sla | 768 | dark | 885 | `e4418259a0e985b1` / `e4418259a0e985b1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-sla | 768 | light | 885 | `16e45b52f8ed4c24` / `16e45b52f8ed4c24` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-sla | 375 | dark | 626 | `ea2a5104dc92a192` / `ea2a5104dc92a192` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.199 |
| s-sla | 375 | light | 626 | `502c11020c40eb2c` / `502c11020c40eb2c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.199 |
| s-kanaele | 1440 | dark | 893 | `806f82d6dd8193d7` / `bc7b65ff44500376` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.648 |
| s-kanaele | 1440 | light | 893 | `86cf8d5140152b02` / `56c3a985b68d23c8` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.648 |
| s-kanaele | 768 | dark | 885 | `7be37b8948876166` / `7be37b8948876166` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-kanaele | 768 | light | 885 | `771bb2854eefc0c7` / `771bb2854eefc0c7` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-kanaele | 375 | dark | 626 | `0289fdf6da878d59` / `0289fdf6da878d59` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.199 |
| s-kanaele | 375 | light | 626 | `7413551dc1f3fb17` / `7413551dc1f3fb17` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.199 |
| s-planung | 1440 | dark | 893 | `060e809f32d32ff3` / `e96c88c112ba4d14` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-planung | 1440 | light | 893 | `3cf255847cc0fb2a` / `b9ca2bd918b2193e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-planung | 768 | dark | 885 | `96f1fb9bdc07d249` / `96f1fb9bdc07d249` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-planung | 768 | light | 885 | `447d9f804c8d5904` / `447d9f804c8d5904` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-planung | 375 | dark | 626 | `b1f19f2c40c9a562` / `b1f19f2c40c9a562` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-planung | 375 | light | 626 | `72591c4d98084f9e` / `72591c4d98084f9e` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-guv | 1440 | dark | 893 | `7bbfadd934d09543` / `e7fc1c771754e13c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-guv | 1440 | light | 893 | `faaef91ead290fcf` / `a27645bb754c1ba7` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-guv | 768 | dark | 885 | `121428ea5f0ebb37` / `121428ea5f0ebb37` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.429 |
| s-guv | 768 | light | 885 | `7797afbb131a6551` / `7797afbb131a6551` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.429 |
| s-guv | 375 | dark | 603 | `d7e76b20e8739fad` / `d7e76b20e8739fad` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-guv | 375 | light | 603 | `a1f8b584265baafb` / `a1f8b584265baafb` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-bilanz | 1440 | dark | 893 | `b0a5f240ec00f8b3` / `8a53c904cef8677b` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.659 |
| s-bilanz | 1440 | light | 893 | `16e796772acb4739` / `863d447511ee35a6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.659 |
| s-bilanz | 768 | dark | 885 | `47e93e268fb9fa9c` / `47e93e268fb9fa9c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.435 |
| s-bilanz | 768 | light | 885 | `e02019c463eedaac` / `e02019c463eedaac` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.435 |
| s-bilanz | 375 | dark | 626 | `eca9246eb9a15339` / `eca9246eb9a15339` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.203 |
| s-bilanz | 375 | light | 626 | `dcecdf8e1bd4323a` / `dcecdf8e1bd4323a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.203 |
| s-unit | 1440 | dark | 893 | `51e88a744d95b468` / `3712ecff13adc104` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.658 |
| s-unit | 1440 | light | 893 | `05309a5dd946f054` / `16737370e59574d9` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.658 |
| s-unit | 768 | dark | 885 | `6a79ccfc7c49636a` / `6a79ccfc7c49636a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.434 |
| s-unit | 768 | light | 885 | `eedb90fa2212bb8d` / `eedb90fa2212bb8d` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.434 |
| s-unit | 375 | dark | 626 | `b3945f815033e44d` / `b3945f815033e44d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.202 |
| s-unit | 375 | light | 626 | `076604b4253893dd` / `076604b4253893dd` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.202 |
| s-headcount | 1440 | dark | 893 | `d8041473fd1cdba7` / `efb44695e1513c51` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.65 |
| s-headcount | 1440 | light | 893 | `845b7212d26c8e68` / `380bce4afb2e7b19` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.65 |
| s-headcount | 768 | dark | 885 | `48e22ea09b5315d3` / `48e22ea09b5315d3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.428 |
| s-headcount | 768 | light | 885 | `e84c3b2d6560933c` / `e84c3b2d6560933c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.428 |
| s-headcount | 375 | dark | 626 | `28cda9e0471b581f` / `28cda9e0471b581f` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.2 |
| s-headcount | 375 | light | 626 | `428a7c3a58f650a4` / `428a7c3a58f650a4` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.2 |
| s-hr | 1440 | dark | 893 | `1f1461d7031b3cc5` / `1bfd2d302a6873ef` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-hr | 1440 | light | 893 | `3c59007e8b6d569b` / `e45dde83e783d795` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-hr | 768 | dark | 885 | `eda46649aeec9fd1` / `eda46649aeec9fd1` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.42 |
| s-hr | 768 | light | 885 | `b1bfc9b662358872` / `b1bfc9b662358872` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.42 |
| s-hr | 375 | dark | 626 | `5a76f8fcd7b6539c` / `5a76f8fcd7b6539c` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.196 |
| s-hr | 375 | light | 626 | `165a2699f89b5458` / `165a2699f89b5458` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.196 |
| s-team | 1440 | dark | 893 | `a35b54d2d778c54b` / `a288f2c5afad9701` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.633 |
| s-team | 1440 | light | 893 | `5811df7e92393866` / `e8cf1b78069ec159` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.633 |
| s-team | 768 | dark | 885 | `88139da700a3bb1a` / `88139da700a3bb1a` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.418 |
| s-team | 768 | light | 885 | `6eeb129117b36a2b` / `6eeb129117b36a2b` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.418 |
| s-team | 375 | dark | 626 | `c61103098e0ffba2` / `c61103098e0ffba2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-team | 375 | light | 626 | `0a480d18136d301c` / `0a480d18136d301c` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-okr | 1440 | dark | 893 | `298119426aae26db` / `834f90ffdcde0fd6` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.634 |
| s-okr | 1440 | light | 893 | `0d8a23a5c77abef9` / `9b507283fb56e32a` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.634 |
| s-okr | 768 | dark | 885 | `d783addc822324d2` / `d783addc822324d2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.418 |
| s-okr | 768 | light | 885 | `13cc2227ffeff376` / `13cc2227ffeff376` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.418 |
| s-okr | 375 | dark | 626 | `222cf797c3cab5e8` / `222cf797c3cab5e8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-okr | 375 | light | 626 | `3ec00e3a7f264674` / `3ec00e3a7f264674` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-bsc | 1440 | dark | 893 | `5dbe5eb8516bf169` / `7cfec535c1321ae4` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-bsc | 1440 | light | 893 | `371ca4e1b819769c` / `d5f1e09ec44af048` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-bsc | 768 | dark | 885 | `a92fbe41ef459ed9` / `a92fbe41ef459ed9` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-bsc | 768 | light | 885 | `883c5362ecea34d6` / `883c5362ecea34d6` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-bsc | 375 | dark | 626 | `f787e1785cfa0da3` / `f787e1785cfa0da3` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-bsc | 375 | light | 626 | `63018f5497699292` / `63018f5497699292` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-treiber | 1440 | dark | 893 | `d71ef79f4f910b84` / `9b711d09a30854b6` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-treiber | 1440 | light | 893 | `2ce46239d7aaab24` / `303033bf4d33b1ad` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-treiber | 768 | dark | 885 | `5de909a580ca3a40` / `5de909a580ca3a40` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-treiber | 768 | light | 885 | `b7ae8f68bbe705e9` / `b7ae8f68bbe705e9` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-treiber | 375 | dark | 626 | `d3191557e80bf484` / `d3191557e80bf484` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-treiber | 375 | light | 626 | `328d1178b968b033` / `328d1178b968b033` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-satzung | 1440 | dark | 893 | `2e3a16a454190b2e` / `8f6790af965b17a6` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-satzung | 1440 | light | 893 | `8e57aa57d0ea2456` / `3e4bc31fc680c562` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-satzung | 768 | dark | 885 | `e2e6a1787b8b2010` / `e2e6a1787b8b2010` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-satzung | 768 | light | 885 | `ea969340e10e4985` / `ea969340e10e4985` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-satzung | 375 | dark | 626 | `60e627b9f713fd94` / `60e627b9f713fd94` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-satzung | 375 | light | 626 | `7e33a84303249f45` / `7e33a84303249f45` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-gesellschafter | 1440 | dark | 893 | `d426abcc8cdcac7e` / `9c3a1ecf647f6790` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-gesellschafter | 1440 | light | 893 | `d977ac81b4f687d7` / `2e9141d96d5980b3` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-gesellschafter | 768 | dark | 885 | `e315ad2107994bc8` / `e315ad2107994bc8` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.419 |
| s-gesellschafter | 768 | light | 885 | `4ffd1e16dfc6f693` / `4ffd1e16dfc6f693` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.419 |
| s-gesellschafter | 375 | dark | 626 | `376c1a14543b634d` / `376c1a14543b634d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.195 |
| s-gesellschafter | 375 | light | 626 | `4cd00acbf7fe7d77` / `4cd00acbf7fe7d77` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.195 |
| s-handelsregister | 1440 | dark | 893 | `dd147c9b3cf904dc` / `85b72e0d918240f2` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.636 |
| s-handelsregister | 1440 | light | 893 | `23edb99a557745b6` / `8053099ad990c0fd` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.636 |
| s-handelsregister | 768 | dark | 885 | `2d4913424bb57b2d` / `2d4913424bb57b2d` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.42 |
| s-handelsregister | 768 | light | 885 | `d94254be6fd89500` / `d94254be6fd89500` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.42 |
| s-handelsregister | 375 | dark | 626 | `8557c148cf8fe227` / `8557c148cf8fe227` | 0 / 0 | 0 | 0 | a Zum Hauptinhalt springen | Bild 0.196 |
| s-handelsregister | 375 | light | 626 | `13bceb3ecb857a93` / `13bceb3ecb857a93` | 0 / 0 | 0 | color-contrast | a Zum Hauptinhalt springen | Bild 0.196 |
