# Auftrag 083 – F15: Kontraste im hellen Modus (Nachweis)

Vorher: `main` `abc0191` (Merge PR #67). Nachher: Branch `claude/auftrag-083-f15-kontraste`.
Aufgenommen am 2026-10-08 mit `scripts/captureAuftrag083ContrastScan.mjs`, `vite build` + `vite preview`
gegen lokales Supabase, Testbenutzer `admin-a@e2e.local`, Chromium (Playwright), reduzierte Bewegung,
feste Browserzeit `2026-10-07T12:00:00.000Z`. Die 42 Ansichten stammen aus dem 081-Inventar
(`docs/reviews/2026-10-06-frontend-inventar.json`). axe serious/critical über die **ganze Seite**
(Kopfzeile, Sidebar, Simulationsleiste, `<main>`). Bilder liegen nur lokal (`.gitignore`).

## Ergebnis

| | Vorher | Nachher |
| --- | --- | --- |
| Aufnahmen | 252 | 252 |
| mit axe-Verstoß (serious/critical) | 126 (alle hell, `color-contrast`) | 0 |
| horizontaler Überlauf > 0 px | – | 0 |
| dunkel: Bild verändert (max. Kanalabweichung > 0) | – | 8 von 126, max. 15/255 |
| hell: Hash unverändert | – | 0 von 126 |

Dunkel: Abweichungen ≤ 1/255 sind Render-Rauschen (Kantenglättung); auch zwei identische
Nachher-Läufe zeigen solche Ein-Bit-Abweichungen. `s-standort` 1440/768 dunkel (13 bzw. 15/255) betrifft
4 bzw. 18 Pixel in den Fotos der Innenansichten. Ein vorheriger Nachher-Lauf mit **identischem Build**
war auf beiden Ansichten hashgleich mit Vorher (`a317b8d0636d7384`, `df83921baaef4d67`); die
Abweichung ist also Laufrauschen beim Bilddekodieren, keine Codeänderung. Die einzige dunkle Änderung im
Code (Label „FIKTIV“, `#A7B0BA` statt `var(--color-text-muted)` = `#A7B0BA`) ist wertgleich. Hell: Alle Aufnahmen haben sich sichtbar verändert
(Shell, Text und Markentöne).

Spalte „Max. Δ“ ist die größte Abweichung eines Farbkanals zwischen Vorher- und Nachher-Bild (0–255).

| Ansicht | Breite | Theme | axe vorher | axe nachher | SHA-256 vorher (16) | SHA-256 nachher (16) | Max. Δ | Überlauf px |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard | 1440 | dark | 0 | 0 | `c6a2de5e8463b2f4` | `c6a2de5e8463b2f4` | 0 | 0 |
| dashboard | 1440 | light | color-contrast | 0 | `a58e89721617bb97` | `5de6bc0dc28e3f63` | 243 | 0 |
| dashboard | 768 | dark | 0 | 0 | `37bdf735973c4bac` | `37bdf735973c4bac` | 0 | 0 |
| dashboard | 768 | light | color-contrast | 0 | `7027cf6a7e2c690f` | `e74131be7bdb72ff` | 243 | 0 |
| dashboard | 375 | dark | 0 | 0 | `8f1381967eed7cf9` | `8f1381967eed7cf9` | 0 | 0 |
| dashboard | 375 | light | color-contrast | 0 | `1ed3a8a4a72099f6` | `203f7543525319ea` | 243 | 0 |
| dashboard-edit | 1440 | dark | 0 | 0 | `bc85536227013348` | `486ec6b33df7811a` | 1 | 0 |
| dashboard-edit | 1440 | light | color-contrast | 0 | `a5a48cda349606fa` | `6dfc08fe191c27eb` | 243 | 0 |
| dashboard-edit | 768 | dark | 0 | 0 | `cbd1beb1fd968a8f` | `cbd1beb1fd968a8f` | 0 | 0 |
| dashboard-edit | 768 | light | color-contrast | 0 | `6851dd23e089028f` | `ca21a66a77fef737` | 243 | 0 |
| dashboard-edit | 375 | dark | 0 | 0 | `03c0b7c4903d0483` | `03c0b7c4903d0483` | 0 | 0 |
| dashboard-edit | 375 | light | color-contrast | 0 | `20f446707aefe9a1` | `5e87d1e87e9f8944` | 243 | 0 |
| dashboard-detail | 1440 | dark | 0 | 0 | `ff526b859cb3b9c0` | `ff526b859cb3b9c0` | 0 | 0 |
| dashboard-detail | 1440 | light | color-contrast | 0 | `59fd45e068ba2df1` | `44802d3925149d07` | 243 | 0 |
| dashboard-detail | 768 | dark | 0 | 0 | `6bad96d2bc2595ea` | `6bad96d2bc2595ea` | 0 | 0 |
| dashboard-detail | 768 | light | color-contrast | 0 | `9dde39fdf658edc6` | `98fc7044ab41c698` | 243 | 0 |
| dashboard-detail | 375 | dark | 0 | 0 | `af6702b4bb3e81ae` | `af6702b4bb3e81ae` | 0 | 0 |
| dashboard-detail | 375 | light | color-contrast | 0 | `75b218af7b17b353` | `3024bbf19d532da3` | 243 | 0 |
| s-daten | 1440 | dark | 0 | 0 | `c5a9c1c0a06775c2` | `c5a9c1c0a06775c2` | 0 | 0 |
| s-daten | 1440 | light | color-contrast | 0 | `d9dae2affab5bf04` | `c3884339b286cff3` | 215 | 0 |
| s-daten | 768 | dark | 0 | 0 | `c77242c63c7cb724` | `c77242c63c7cb724` | 0 | 0 |
| s-daten | 768 | light | color-contrast | 0 | `03329e4a416ddd74` | `c86b68081d512436` | 193 | 0 |
| s-daten | 375 | dark | 0 | 0 | `1b8486d04706a467` | `1b8486d04706a467` | 0 | 0 |
| s-daten | 375 | light | color-contrast | 0 | `0dd775ae180c0b39` | `e50e77c54733a65c` | 193 | 0 |
| s-standort | 1440 | dark | 0 | 0 | `a317b8d0636d7384` | `1ae83972c9b03997` | 13 | 0 |
| s-standort | 1440 | light | color-contrast | 0 | `8c2ebe36ec2f319a` | `5acc6897174ccbae` | 215 | 0 |
| s-standort | 768 | dark | 0 | 0 | `df83921baaef4d67` | `f1310097fcdbe020` | 15 | 0 |
| s-standort | 768 | light | color-contrast | 0 | `883420ab529e795d` | `a554b1cfccecc2c6` | 193 | 0 |
| s-standort | 375 | dark | 0 | 0 | `84e9d1c70086392c` | `84e9d1c70086392c` | 0 | 0 |
| s-standort | 375 | light | color-contrast | 0 | `8998506ec32cac64` | `2febe875768a608e` | 193 | 0 |
| s-live-simulation | 1440 | dark | 0 | 0 | `5f12122fd30f9a8a` | `5f12122fd30f9a8a` | 0 | 0 |
| s-live-simulation | 1440 | light | color-contrast | 0 | `bb2e38e88b3fe0b5` | `cc4f989f52bdb3d2` | 215 | 0 |
| s-live-simulation | 768 | dark | 0 | 0 | `82254c51dd98d5c5` | `82254c51dd98d5c5` | 0 | 0 |
| s-live-simulation | 768 | light | color-contrast | 0 | `0aa7ba66a1e25d91` | `076b776222bcd850` | 193 | 0 |
| s-live-simulation | 375 | dark | 0 | 0 | `32cf47125d645b94` | `32cf47125d645b94` | 0 | 0 |
| s-live-simulation | 375 | light | color-contrast | 0 | `6c4a03b3905d175e` | `5a6572cac9342074` | 193 | 0 |
| s-leads | 1440 | dark | 0 | 0 | `fd41af2253619113` | `fd41af2253619113` | 0 | 0 |
| s-leads | 1440 | light | color-contrast | 0 | `20275f3ef1219b18` | `b59e2d6273634d72` | 215 | 0 |
| s-leads | 768 | dark | 0 | 0 | `d219299b509b0d4b` | `0e6851381cf6e3af` | 1 | 0 |
| s-leads | 768 | light | color-contrast | 0 | `6078fa617216b3b3` | `c7e212a47feae13e` | 193 | 0 |
| s-leads | 375 | dark | 0 | 0 | `b66f9ee20b61f6de` | `368eab65efe64001` | 1 | 0 |
| s-leads | 375 | light | color-contrast | 0 | `663302501be8e49b` | `56f9b8d4cb3e2619` | 193 | 0 |
| s-companies | 1440 | dark | 0 | 0 | `b37b0b735e1ab19f` | `b37b0b735e1ab19f` | 0 | 0 |
| s-companies | 1440 | light | color-contrast | 0 | `02f0cf0b748be979` | `cb572eb741bbc81a` | 215 | 0 |
| s-companies | 768 | dark | 0 | 0 | `365d587a73adfd95` | `365d587a73adfd95` | 0 | 0 |
| s-companies | 768 | light | color-contrast | 0 | `61f9fa390147331b` | `e7053f4f46602aa9` | 193 | 0 |
| s-companies | 375 | dark | 0 | 0 | `2559e4562468a4da` | `2559e4562468a4da` | 0 | 0 |
| s-companies | 375 | light | color-contrast | 0 | `8953da1e7cb7f773` | `13caae1db868b139` | 193 | 0 |
| s-deals | 1440 | dark | 0 | 0 | `daa1482b15bfd637` | `daa1482b15bfd637` | 0 | 0 |
| s-deals | 1440 | light | color-contrast | 0 | `93a675b026cc2a7b` | `fcef23afa7888e00` | 215 | 0 |
| s-deals | 768 | dark | 0 | 0 | `5dbc2e4e238a0ab5` | `c7086bda258bd7b3` | 1 | 0 |
| s-deals | 768 | light | color-contrast | 0 | `0957e8fdd9c7299c` | `dafb5ca1a6738239` | 193 | 0 |
| s-deals | 375 | dark | 0 | 0 | `f4ef5936295c0762` | `f4ef5936295c0762` | 0 | 0 |
| s-deals | 375 | light | color-contrast | 0 | `57e59805f711805c` | `e9ab5de0f1e05f2d` | 193 | 0 |
| s-activities | 1440 | dark | 0 | 0 | `e4f722294e72aec9` | `4a7ab4695a7ca5ff` | 1 | 0 |
| s-activities | 1440 | light | color-contrast | 0 | `0673f90c00a8ef70` | `fe1c3da23333912d` | 215 | 0 |
| s-activities | 768 | dark | 0 | 0 | `2382b01d589ddb0c` | `2382b01d589ddb0c` | 0 | 0 |
| s-activities | 768 | light | color-contrast | 0 | `952a1f4980b3eb91` | `1905fbace3f93ca3` | 193 | 0 |
| s-activities | 375 | dark | 0 | 0 | `3693907e3f17d88e` | `3dded44e9d56f457` | 1 | 0 |
| s-activities | 375 | light | color-contrast | 0 | `85a784dc02a71384` | `fa6f11b74c2b26d8` | 193 | 0 |
| s-profil | 1440 | dark | 0 | 0 | `ce4c5e4f6a62c1d0` | `ce4c5e4f6a62c1d0` | 0 | 0 |
| s-profil | 1440 | light | color-contrast | 0 | `1133631ae1ecc967` | `3c9e7bff52f438ee` | 215 | 0 |
| s-profil | 768 | dark | 0 | 0 | `63dbca92e54c0216` | `63dbca92e54c0216` | 0 | 0 |
| s-profil | 768 | light | color-contrast | 0 | `cdc86b3227848ea0` | `98918f7708652aea` | 193 | 0 |
| s-profil | 375 | dark | 0 | 0 | `0c326e41b1b402e0` | `0c326e41b1b402e0` | 0 | 0 |
| s-profil | 375 | light | color-contrast | 0 | `57e77dc9d73baaca` | `454eb59d0d95b110` | 193 | 0 |
| s-highlights | 1440 | dark | 0 | 0 | `bb48e3aa6387dacf` | `bb48e3aa6387dacf` | 0 | 0 |
| s-highlights | 1440 | light | color-contrast | 0 | `b04b786f4803adbe` | `bc99cbaf03a88983` | 215 | 0 |
| s-highlights | 768 | dark | 0 | 0 | `5738091a1e46f9a7` | `5738091a1e46f9a7` | 0 | 0 |
| s-highlights | 768 | light | color-contrast | 0 | `05964865c37329e0` | `f495660228f2ddc8` | 193 | 0 |
| s-highlights | 375 | dark | 0 | 0 | `d79a9cf82d995ef1` | `d79a9cf82d995ef1` | 0 | 0 |
| s-highlights | 375 | light | color-contrast | 0 | `6cefa0f29b10be5d` | `db713be75b53494f` | 193 | 0 |
| s-idee | 1440 | dark | 0 | 0 | `f34875fd45954998` | `f34875fd45954998` | 0 | 0 |
| s-idee | 1440 | light | color-contrast | 0 | `80e11a77e6c72c5d` | `e48e9762f94a8afd` | 215 | 0 |
| s-idee | 768 | dark | 0 | 0 | `0b955cea2813fbbe` | `0b955cea2813fbbe` | 0 | 0 |
| s-idee | 768 | light | color-contrast | 0 | `d7920575c244fbbd` | `a8796b1049dcf163` | 193 | 0 |
| s-idee | 375 | dark | 0 | 0 | `ebd08398a9e98640` | `ebd08398a9e98640` | 0 | 0 |
| s-idee | 375 | light | color-contrast | 0 | `21a58a3ee2826fb4` | `185265d79a8fe097` | 193 | 0 |
| s-value | 1440 | dark | 0 | 0 | `a357802894d57b70` | `a357802894d57b70` | 0 | 0 |
| s-value | 1440 | light | color-contrast | 0 | `c8056864146d1121` | `40f7685d37c5b210` | 215 | 0 |
| s-value | 768 | dark | 0 | 0 | `0fe4b1768535af80` | `0fe4b1768535af80` | 0 | 0 |
| s-value | 768 | light | color-contrast | 0 | `4c365796bd611c10` | `ca9a394dd96af0ff` | 193 | 0 |
| s-value | 375 | dark | 0 | 0 | `2a56541135c8f9dd` | `2a56541135c8f9dd` | 0 | 0 |
| s-value | 375 | light | color-contrast | 0 | `abcd00154f24b65e` | `7be7970ba8b1f040` | 193 | 0 |
| s-historie | 1440 | dark | 0 | 0 | `dcd9787af19f02d1` | `dcd9787af19f02d1` | 0 | 0 |
| s-historie | 1440 | light | color-contrast | 0 | `16fd32c9908cf09f` | `a07e8968748102c0` | 215 | 0 |
| s-historie | 768 | dark | 0 | 0 | `0227a96171779cda` | `0227a96171779cda` | 0 | 0 |
| s-historie | 768 | light | color-contrast | 0 | `fbde75b4f86385a5` | `89edd013759d7a8a` | 193 | 0 |
| s-historie | 375 | dark | 0 | 0 | `44c8bcd28ab02a9b` | `44c8bcd28ab02a9b` | 0 | 0 |
| s-historie | 375 | light | color-contrast | 0 | `30ef27de1069923c` | `df0087426ae19c2a` | 193 | 0 |
| s-funktion | 1440 | dark | 0 | 0 | `629a54d082ddfe33` | `629a54d082ddfe33` | 0 | 0 |
| s-funktion | 1440 | light | color-contrast | 0 | `606ec7f1585a36f9` | `b8ce00e104144a95` | 215 | 0 |
| s-funktion | 768 | dark | 0 | 0 | `78cc98635e7faea4` | `78cc98635e7faea4` | 0 | 0 |
| s-funktion | 768 | light | color-contrast | 0 | `25b61695c202bdf3` | `fbd62c2426d3cfb3` | 193 | 0 |
| s-funktion | 375 | dark | 0 | 0 | `f1dbbaa8bd78c2d5` | `f1dbbaa8bd78c2d5` | 0 | 0 |
| s-funktion | 375 | light | color-contrast | 0 | `fe453eb71bfc9480` | `d3223c00179056d1` | 193 | 0 |
| s-pricing | 1440 | dark | 0 | 0 | `246357b1ab66e325` | `246357b1ab66e325` | 0 | 0 |
| s-pricing | 1440 | light | color-contrast | 0 | `567cf5af04ee5cef` | `82e1c0a712958703` | 215 | 0 |
| s-pricing | 768 | dark | 0 | 0 | `c222e927de14e1ce` | `c222e927de14e1ce` | 0 | 0 |
| s-pricing | 768 | light | color-contrast | 0 | `1d2f592c5c58b751` | `360a0fbadb0bd7a8` | 193 | 0 |
| s-pricing | 375 | dark | 0 | 0 | `004bd7813ad60b63` | `004bd7813ad60b63` | 0 | 0 |
| s-pricing | 375 | light | color-contrast | 0 | `eb2eb1908a506c23` | `08c8b18974f8a1fe` | 193 | 0 |
| s-perf | 1440 | dark | 0 | 0 | `eb5439592371f767` | `eb5439592371f767` | 0 | 0 |
| s-perf | 1440 | light | color-contrast | 0 | `85bf88f7a9848223` | `ebff29265df7c31d` | 215 | 0 |
| s-perf | 768 | dark | 0 | 0 | `b4e45425db67f414` | `b4e45425db67f414` | 0 | 0 |
| s-perf | 768 | light | color-contrast | 0 | `0c7418682b2ae1a0` | `1c8483c4f382a53f` | 193 | 0 |
| s-perf | 375 | dark | 0 | 0 | `990fc8074ced8525` | `990fc8074ced8525` | 0 | 0 |
| s-perf | 375 | light | color-contrast | 0 | `50104550e749a967` | `91927e1bedbe2b2a` | 193 | 0 |
| s-roadmap | 1440 | dark | 0 | 0 | `16fb5958637aec76` | `16fb5958637aec76` | 0 | 0 |
| s-roadmap | 1440 | light | color-contrast | 0 | `96d4d86c1e182d7a` | `4d359200f80c6a3f` | 215 | 0 |
| s-roadmap | 768 | dark | 0 | 0 | `e908f20b8c033dad` | `e908f20b8c033dad` | 0 | 0 |
| s-roadmap | 768 | light | color-contrast | 0 | `522f8e9309442a5b` | `264e8aadbc345ec3` | 193 | 0 |
| s-roadmap | 375 | dark | 0 | 0 | `15410d519b3f2d6c` | `15410d519b3f2d6c` | 0 | 0 |
| s-roadmap | 375 | light | color-contrast | 0 | `32dfbdb9ca884c6b` | `405e4895258826d0` | 193 | 0 |
| s-markt | 1440 | dark | 0 | 0 | `8da940701304951b` | `8da940701304951b` | 0 | 0 |
| s-markt | 1440 | light | color-contrast | 0 | `edb4518f5cf3ed57` | `780d05088a02ba60` | 215 | 0 |
| s-markt | 768 | dark | 0 | 0 | `37cae088dc24c3f9` | `37cae088dc24c3f9` | 0 | 0 |
| s-markt | 768 | light | color-contrast | 0 | `675b6d7cf54007c4` | `64fa7548956b5b17` | 193 | 0 |
| s-markt | 375 | dark | 0 | 0 | `91e71fcd55ed52dc` | `91e71fcd55ed52dc` | 0 | 0 |
| s-markt | 375 | light | color-contrast | 0 | `8e5d0a877a06ba4e` | `141cdc5492fd2a9d` | 193 | 0 |
| s-wettbewerb | 1440 | dark | 0 | 0 | `4e034ffa31164b3f` | `4e034ffa31164b3f` | 0 | 0 |
| s-wettbewerb | 1440 | light | color-contrast | 0 | `0675e1f7c814238b` | `cd3a21f12f9a293f` | 215 | 0 |
| s-wettbewerb | 768 | dark | 0 | 0 | `4586548ef85833de` | `4586548ef85833de` | 0 | 0 |
| s-wettbewerb | 768 | light | color-contrast | 0 | `9faafb5aeaa338f1` | `8cb3e4438944ff0a` | 193 | 0 |
| s-wettbewerb | 375 | dark | 0 | 0 | `b5e3662e9c254179` | `b5e3662e9c254179` | 0 | 0 |
| s-wettbewerb | 375 | light | color-contrast | 0 | `5eb9783bc2504ecc` | `7b928aa638879d56` | 193 | 0 |
| s-swot | 1440 | dark | 0 | 0 | `be5d13f64d567d51` | `be5d13f64d567d51` | 0 | 0 |
| s-swot | 1440 | light | color-contrast | 0 | `4cc701a30d469622` | `d4e1220b18f85485` | 215 | 0 |
| s-swot | 768 | dark | 0 | 0 | `8db2e8f8072cfdd6` | `8db2e8f8072cfdd6` | 0 | 0 |
| s-swot | 768 | light | color-contrast | 0 | `fcd752706ee5d38f` | `b94b32ec399d5657` | 193 | 0 |
| s-swot | 375 | dark | 0 | 0 | `6be01de34a65f240` | `6be01de34a65f240` | 0 | 0 |
| s-swot | 375 | light | color-contrast | 0 | `f96bb04dbd4fc6ae` | `218022b76b72d20c` | 193 | 0 |
| s-icp | 1440 | dark | 0 | 0 | `bf0c5516b5b0db37` | `bf0c5516b5b0db37` | 0 | 0 |
| s-icp | 1440 | light | color-contrast | 0 | `8993aec8a29b2c23` | `03be67cc62f2b1d2` | 215 | 0 |
| s-icp | 768 | dark | 0 | 0 | `6e160f1975ade553` | `6e160f1975ade553` | 0 | 0 |
| s-icp | 768 | light | color-contrast | 0 | `d94d7907b6056297` | `7804d867e4ae34e5` | 193 | 0 |
| s-icp | 375 | dark | 0 | 0 | `9e67bc47b6aac32b` | `9e67bc47b6aac32b` | 0 | 0 |
| s-icp | 375 | light | color-contrast | 0 | `dd0e77f2c363967b` | `e843199550e55bf8` | 193 | 0 |
| s-persona | 1440 | dark | 0 | 0 | `cff0cf8d485c4eeb` | `cff0cf8d485c4eeb` | 0 | 0 |
| s-persona | 1440 | light | color-contrast | 0 | `efaee9292c46e75e` | `3dcc918c59ac9892` | 215 | 0 |
| s-persona | 768 | dark | 0 | 0 | `64549761d8a997df` | `64549761d8a997df` | 0 | 0 |
| s-persona | 768 | light | color-contrast | 0 | `9fa810925f6703d4` | `d96332b69c41f7c5` | 193 | 0 |
| s-persona | 375 | dark | 0 | 0 | `5f42de6af3de288b` | `5f42de6af3de288b` | 0 | 0 |
| s-persona | 375 | light | color-contrast | 0 | `409b19a7357699ed` | `085e9f25f6a5303f` | 193 | 0 |
| s-segmente | 1440 | dark | 0 | 0 | `b151eaa006761967` | `b151eaa006761967` | 0 | 0 |
| s-segmente | 1440 | light | color-contrast | 0 | `f4385be966ae2005` | `7a34864884638946` | 215 | 0 |
| s-segmente | 768 | dark | 0 | 0 | `ec019540fccdf792` | `ec019540fccdf792` | 0 | 0 |
| s-segmente | 768 | light | color-contrast | 0 | `6b45d4461587ac88` | `45a174b653a20238` | 193 | 0 |
| s-segmente | 375 | dark | 0 | 0 | `4acfa7fa5d80c1e1` | `4acfa7fa5d80c1e1` | 0 | 0 |
| s-segmente | 375 | light | color-contrast | 0 | `3d532fda9063d717` | `0f3e5fb8caeecec1` | 193 | 0 |
| s-top10 | 1440 | dark | 0 | 0 | `f9f0f2c5e1a08890` | `f9f0f2c5e1a08890` | 0 | 0 |
| s-top10 | 1440 | light | color-contrast | 0 | `22ae81c5836aa2e9` | `d1d5bd2653db267d` | 215 | 0 |
| s-top10 | 768 | dark | 0 | 0 | `293686375218b917` | `293686375218b917` | 0 | 0 |
| s-top10 | 768 | light | color-contrast | 0 | `86e38c2a10e9bc70` | `9555506b0e66fdd5` | 193 | 0 |
| s-top10 | 375 | dark | 0 | 0 | `384d41b24ad6ca50` | `384d41b24ad6ca50` | 0 | 0 |
| s-top10 | 375 | light | color-contrast | 0 | `9f0484a3c308aa7c` | `31b4fee314affbcd` | 193 | 0 |
| s-funnel | 1440 | dark | 0 | 0 | `6494412bde221cda` | `6494412bde221cda` | 0 | 0 |
| s-funnel | 1440 | light | color-contrast | 0 | `16b8199b6bb598a2` | `6c2825257d54d0c6` | 215 | 0 |
| s-funnel | 768 | dark | 0 | 0 | `c0149d300d830740` | `c0149d300d830740` | 0 | 0 |
| s-funnel | 768 | light | color-contrast | 0 | `eabc5030174c821e` | `51c703b494d7c5ed` | 193 | 0 |
| s-funnel | 375 | dark | 0 | 0 | `a2dfd660a9149d05` | `a2dfd660a9149d05` | 0 | 0 |
| s-funnel | 375 | light | color-contrast | 0 | `8876f1ee1f577a12` | `ed008f99b6b0a253` | 193 | 0 |
| s-sla | 1440 | dark | 0 | 0 | `bfd54167e62601ba` | `bfd54167e62601ba` | 0 | 0 |
| s-sla | 1440 | light | color-contrast | 0 | `b64b4b61b1236ea7` | `e30e8003c18e3606` | 215 | 0 |
| s-sla | 768 | dark | 0 | 0 | `e4418259a0e985b1` | `e4418259a0e985b1` | 0 | 0 |
| s-sla | 768 | light | color-contrast | 0 | `16e45b52f8ed4c24` | `bdf44975a35604ed` | 193 | 0 |
| s-sla | 375 | dark | 0 | 0 | `ea2a5104dc92a192` | `ea2a5104dc92a192` | 0 | 0 |
| s-sla | 375 | light | color-contrast | 0 | `502c11020c40eb2c` | `9e1dd481aeb5353a` | 193 | 0 |
| s-kanaele | 1440 | dark | 0 | 0 | `cce363b4c70ab7e3` | `cce363b4c70ab7e3` | 0 | 0 |
| s-kanaele | 1440 | light | color-contrast | 0 | `c3872df9b341de5c` | `fe7ca250d2cff47e` | 215 | 0 |
| s-kanaele | 768 | dark | 0 | 0 | `7be37b8948876166` | `7be37b8948876166` | 0 | 0 |
| s-kanaele | 768 | light | color-contrast | 0 | `5205288d6963ba78` | `866d1e0d91c2f6c0` | 193 | 0 |
| s-kanaele | 375 | dark | 0 | 0 | `0289fdf6da878d59` | `0289fdf6da878d59` | 0 | 0 |
| s-kanaele | 375 | light | color-contrast | 0 | `7413551dc1f3fb17` | `4f121945b712bbac` | 193 | 0 |
| s-planung | 1440 | dark | 0 | 0 | `e8f02728c8b6d2b0` | `e8f02728c8b6d2b0` | 0 | 0 |
| s-planung | 1440 | light | color-contrast | 0 | `d7ef2fa671461107` | `a815c1efa9c35bab` | 215 | 0 |
| s-planung | 768 | dark | 0 | 0 | `96f1fb9bdc07d249` | `96f1fb9bdc07d249` | 0 | 0 |
| s-planung | 768 | light | color-contrast | 0 | `447d9f804c8d5904` | `5d5900a9262f2ec8` | 193 | 0 |
| s-planung | 375 | dark | 0 | 0 | `b1f19f2c40c9a562` | `b1f19f2c40c9a562` | 0 | 0 |
| s-planung | 375 | light | color-contrast | 0 | `72591c4d98084f9e` | `fc073d24f020406e` | 193 | 0 |
| s-guv | 1440 | dark | 0 | 0 | `e906d7605c7e5b91` | `e906d7605c7e5b91` | 0 | 0 |
| s-guv | 1440 | light | color-contrast | 0 | `cab0a9ea4112f181` | `d02b4d95f59454cf` | 215 | 0 |
| s-guv | 768 | dark | 0 | 0 | `121428ea5f0ebb37` | `121428ea5f0ebb37` | 0 | 0 |
| s-guv | 768 | light | color-contrast | 0 | `7797afbb131a6551` | `f13724f53ebf7956` | 193 | 0 |
| s-guv | 375 | dark | 0 | 0 | `d7e76b20e8739fad` | `d7e76b20e8739fad` | 0 | 0 |
| s-guv | 375 | light | color-contrast | 0 | `a1f8b584265baafb` | `701a59ea10a24400` | 193 | 0 |
| s-bilanz | 1440 | dark | 0 | 0 | `cd6772fc66e43811` | `cd6772fc66e43811` | 0 | 0 |
| s-bilanz | 1440 | light | color-contrast | 0 | `2deca854ab4b2abf` | `01853071288c2139` | 215 | 0 |
| s-bilanz | 768 | dark | 0 | 0 | `47e93e268fb9fa9c` | `47e93e268fb9fa9c` | 0 | 0 |
| s-bilanz | 768 | light | color-contrast | 0 | `e02019c463eedaac` | `6e8fca6ae4ae5bdf` | 193 | 0 |
| s-bilanz | 375 | dark | 0 | 0 | `eca9246eb9a15339` | `eca9246eb9a15339` | 0 | 0 |
| s-bilanz | 375 | light | color-contrast | 0 | `dcecdf8e1bd4323a` | `d919fdb7e9a31242` | 193 | 0 |
| s-unit | 1440 | dark | 0 | 0 | `5bc5786bf361b65d` | `5bc5786bf361b65d` | 0 | 0 |
| s-unit | 1440 | light | color-contrast | 0 | `c7e8af80afd8fd81` | `454d7b87dbf62654` | 215 | 0 |
| s-unit | 768 | dark | 0 | 0 | `6a79ccfc7c49636a` | `6a79ccfc7c49636a` | 0 | 0 |
| s-unit | 768 | light | color-contrast | 0 | `eedb90fa2212bb8d` | `a89ad83d1e2ae7d4` | 193 | 0 |
| s-unit | 375 | dark | 0 | 0 | `b3945f815033e44d` | `b3945f815033e44d` | 0 | 0 |
| s-unit | 375 | light | color-contrast | 0 | `076604b4253893dd` | `7a7aec81c397a9ab` | 193 | 0 |
| s-headcount | 1440 | dark | 0 | 0 | `465755e816833b9c` | `465755e816833b9c` | 0 | 0 |
| s-headcount | 1440 | light | color-contrast | 0 | `febcee69dda353fb` | `6c5677a955c8b379` | 215 | 0 |
| s-headcount | 768 | dark | 0 | 0 | `48e22ea09b5315d3` | `48e22ea09b5315d3` | 0 | 0 |
| s-headcount | 768 | light | color-contrast | 0 | `e84c3b2d6560933c` | `7fdc9a2a9094f371` | 193 | 0 |
| s-headcount | 375 | dark | 0 | 0 | `28cda9e0471b581f` | `28cda9e0471b581f` | 0 | 0 |
| s-headcount | 375 | light | color-contrast | 0 | `428a7c3a58f650a4` | `1d334255b2717d19` | 193 | 0 |
| s-hr | 1440 | dark | 0 | 0 | `78fdea1afafb93e5` | `78fdea1afafb93e5` | 0 | 0 |
| s-hr | 1440 | light | color-contrast | 0 | `51194dd56a7357a3` | `c1f55051a4ce38e2` | 215 | 0 |
| s-hr | 768 | dark | 0 | 0 | `eda46649aeec9fd1` | `eda46649aeec9fd1` | 0 | 0 |
| s-hr | 768 | light | color-contrast | 0 | `57704b9ed130b306` | `e7e1d512f468b248` | 193 | 0 |
| s-hr | 375 | dark | 0 | 0 | `5a76f8fcd7b6539c` | `5a76f8fcd7b6539c` | 0 | 0 |
| s-hr | 375 | light | color-contrast | 0 | `165a2699f89b5458` | `c1a22f4cf1e02902` | 193 | 0 |
| s-team | 1440 | dark | 0 | 0 | `1d7773a70e1067f4` | `1d7773a70e1067f4` | 0 | 0 |
| s-team | 1440 | light | color-contrast | 0 | `5dafbba959bf932b` | `ee43b569c8003538` | 215 | 0 |
| s-team | 768 | dark | 0 | 0 | `88139da700a3bb1a` | `88139da700a3bb1a` | 0 | 0 |
| s-team | 768 | light | color-contrast | 0 | `6eeb129117b36a2b` | `b8158047f13e7205` | 193 | 0 |
| s-team | 375 | dark | 0 | 0 | `c61103098e0ffba2` | `c61103098e0ffba2` | 0 | 0 |
| s-team | 375 | light | color-contrast | 0 | `0a480d18136d301c` | `b30013db606ba205` | 193 | 0 |
| s-okr | 1440 | dark | 0 | 0 | `5e959f052ca95fca` | `5e959f052ca95fca` | 0 | 0 |
| s-okr | 1440 | light | color-contrast | 0 | `12ee0d4d24dbe6ab` | `856114d1ebf28bef` | 215 | 0 |
| s-okr | 768 | dark | 0 | 0 | `d783addc822324d2` | `d783addc822324d2` | 0 | 0 |
| s-okr | 768 | light | color-contrast | 0 | `13cc2227ffeff376` | `609db90f60a79f0e` | 193 | 0 |
| s-okr | 375 | dark | 0 | 0 | `222cf797c3cab5e8` | `222cf797c3cab5e8` | 0 | 0 |
| s-okr | 375 | light | color-contrast | 0 | `78993cceb70ac5f4` | `fc300740615846b3` | 193 | 0 |
| s-bsc | 1440 | dark | 0 | 0 | `a7fdb6b7be799c52` | `a7fdb6b7be799c52` | 0 | 0 |
| s-bsc | 1440 | light | color-contrast | 0 | `e63157d80a2d5c9f` | `7a5acf2f0d4f2c6c` | 215 | 0 |
| s-bsc | 768 | dark | 0 | 0 | `a92fbe41ef459ed9` | `a92fbe41ef459ed9` | 0 | 0 |
| s-bsc | 768 | light | color-contrast | 0 | `4802ba368d285cd6` | `a048e674c3c91e56` | 193 | 0 |
| s-bsc | 375 | dark | 0 | 0 | `f787e1785cfa0da3` | `f787e1785cfa0da3` | 0 | 0 |
| s-bsc | 375 | light | color-contrast | 0 | `63018f5497699292` | `9422423a3e80da03` | 193 | 0 |
| s-treiber | 1440 | dark | 0 | 0 | `4043a6f14c100778` | `4043a6f14c100778` | 0 | 0 |
| s-treiber | 1440 | light | color-contrast | 0 | `593cd24dc3cd55ed` | `1df46b7aca697007` | 215 | 0 |
| s-treiber | 768 | dark | 0 | 0 | `5de909a580ca3a40` | `5de909a580ca3a40` | 0 | 0 |
| s-treiber | 768 | light | color-contrast | 0 | `b7ae8f68bbe705e9` | `89421d5ad0ad7ec1` | 193 | 0 |
| s-treiber | 375 | dark | 0 | 0 | `d3191557e80bf484` | `d3191557e80bf484` | 0 | 0 |
| s-treiber | 375 | light | color-contrast | 0 | `328d1178b968b033` | `5a4bd90c3ef36c87` | 193 | 0 |
| s-satzung | 1440 | dark | 0 | 0 | `4dc030c54eef1480` | `4dc030c54eef1480` | 0 | 0 |
| s-satzung | 1440 | light | color-contrast | 0 | `d87c558839f2c976` | `31f0ad97fea112f6` | 215 | 0 |
| s-satzung | 768 | dark | 0 | 0 | `e2e6a1787b8b2010` | `e2e6a1787b8b2010` | 0 | 0 |
| s-satzung | 768 | light | color-contrast | 0 | `7d63b97f57a3b3cf` | `b9828b1faa280637` | 193 | 0 |
| s-satzung | 375 | dark | 0 | 0 | `60e627b9f713fd94` | `60e627b9f713fd94` | 0 | 0 |
| s-satzung | 375 | light | color-contrast | 0 | `35bcdfced583db4e` | `8922d0009567943b` | 193 | 0 |
| s-gesellschafter | 1440 | dark | 0 | 0 | `799c8425ae329e7c` | `799c8425ae329e7c` | 0 | 0 |
| s-gesellschafter | 1440 | light | color-contrast | 0 | `29f2d9ca4d7faecb` | `3bc32b4bbfe7abaf` | 215 | 0 |
| s-gesellschafter | 768 | dark | 0 | 0 | `e315ad2107994bc8` | `e315ad2107994bc8` | 0 | 0 |
| s-gesellschafter | 768 | light | color-contrast | 0 | `5dcc2865dcf6bda6` | `a77f28a8ae5e76cc` | 193 | 0 |
| s-gesellschafter | 375 | dark | 0 | 0 | `376c1a14543b634d` | `376c1a14543b634d` | 0 | 0 |
| s-gesellschafter | 375 | light | color-contrast | 0 | `4cd00acbf7fe7d77` | `1f013b253e2de0d7` | 193 | 0 |
| s-handelsregister | 1440 | dark | 0 | 0 | `9aeabf03276b31a5` | `9aeabf03276b31a5` | 0 | 0 |
| s-handelsregister | 1440 | light | color-contrast | 0 | `b8dea0b33517232f` | `98f654592d4b399c` | 215 | 0 |
| s-handelsregister | 768 | dark | 0 | 0 | `2d4913424bb57b2d` | `2d4913424bb57b2d` | 0 | 0 |
| s-handelsregister | 768 | light | color-contrast | 0 | `fd993df2c818f1a4` | `3b4dd473cb59c133` | 193 | 0 |
| s-handelsregister | 375 | dark | 0 | 0 | `8557c148cf8fe227` | `8557c148cf8fe227` | 0 | 0 |
| s-handelsregister | 375 | light | color-contrast | 0 | `13bceb3ecb857a93` | `cf4d0cbcef2638f2` | 193 | 0 |
