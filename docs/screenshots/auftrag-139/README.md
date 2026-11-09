# Auftrag 139 – Visuelle Gate-Prüfung Lead-Qualifizierung (1440/768/375 px, dark/light)

Aufgenommen 2026-11-09, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Vorher: http://127.0.0.1:4322 (Basis 8247f1e, origin/main nach Auftrag 138); Nachher: http://127.0.0.1:4321.
Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.

| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |
|---|---|---|---|---|---|---|---|
| `leads-kontakte` | `dark` | 1440 px | 0/0 px | 1008 px | `ffb9e62dc0d7e66255cf3fbdaa81dd246ef32176244a9def58ae006cf8a6e7f7` / `5c9fe4b0aa726f1a4fda32b9c50fcc84a14a6cf39b0250c922712b506feb4bf8` | 12107 | ✅ Geprüft: Badge „Qualifiziert“ erscheint jetzt aus serverseitigem lead_qualifications-Stand (vorher nur Session-Speicher) |
| `leads-kontakte` | `dark` | 768 px | 0/0 px | 1375 px | `e323d8a9c11e9cd9606d282f7d36893511c1b9be017468dd503d640a04138c3b` / `e323d8a9c11e9cd9606d282f7d36893511c1b9be017468dd503d640a04138c3b` | 0 | ✅ Vergleich bestanden |
| `leads-kontakte` | `dark` | 375 px | 0/0 px | 2731 px | `c8970592fd68decd77fa58dc3bb6b44c4de45617bed65b9a95a48d0043e7a1db` / `c8970592fd68decd77fa58dc3bb6b44c4de45617bed65b9a95a48d0043e7a1db` | 0 | ✅ Vergleich bestanden |
| `leads-kontakte` | `light` | 1440 px | 0/0 px | 1008 px | `c6fbfedcdeb7b774119b7c583d9984f0e933ef6b2e6088746e29711f3025e7d3` / `a9a40696857dfd2ba4b9bf6305654810ec765aeb80c00c8c943e3f229dc2af81` | 12117 | ✅ Geprüft: Badge „Qualifiziert“ erscheint jetzt aus serverseitigem lead_qualifications-Stand (vorher nur Session-Speicher) |
| `leads-kontakte` | `light` | 768 px | 0/0 px | 1375 px | `a8ebc780aa3bae5309dc5c2dd9eed17054dc3d41915e3fd6450c9b95cacdae7b` / `a8ebc780aa3bae5309dc5c2dd9eed17054dc3d41915e3fd6450c9b95cacdae7b` | 0 | ✅ Vergleich bestanden |
| `leads-kontakte` | `light` | 375 px | 0/0 px | 2731 px | `2acb61c9ea5b75079fb16acba90ea23cf70b8c93b020dc752485d65eb0f7209e` / `2acb61c9ea5b75079fb16acba90ea23cf70b8c93b020dc752485d65eb0f7209e` | 0 | ✅ Vergleich bestanden |
| `qualifizierung-drawer` | `dark` | 1440 px | 0/0 px | 1008 px | `3d4b06e89feaec9795cf827666018128d785f11472de2f420d81f80564e2ca9a` / `6311798031b99b870bafd899c94836b11c28697d4968d016db9223b2d29bbf52` | 9267 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer` | `dark` | 768 px | 0/0 px | 1375 px | `fcb21a67cc2989cd9cba2b0d76310ddd5132caa11d391d7e2825525657c60c94` / `04a1ff81fe9cce528868d190daca14aeb8dc7ecddece6d09b0b88c7b7b758fbf` | 9267 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer` | `dark` | 375 px | 0/0 px | 2731 px | `faffac5a192f842b5cc44ac9eec3d10cfee0f43f58cc2dbfe6df7c47fc746174` / `679d9c43f9b64c03946285723f034a25353e45a37ef2e56ba04920879cac0363` | 8297 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer` | `light` | 1440 px | 0/0 px | 1008 px | `565471b978393d9fc7fd6c3d26ff8a3bbc98cc13f5f4709905344d393f0c4a0c` / `9aaa99bf18eb624cc9cc66fab39bda4922b527ba55b636406a4e13e5287a6d39` | 9306 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer` | `light` | 768 px | 0/0 px | 1375 px | `ec97b318054b64ad090972aa731df27bf63832210b3e82af56dcddbda6b2e6d9` / `ae018360c828f324bee87d4aa3b7cb0ec2d21e5eb7877c5b32417f7a32b3850c` | 9306 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer` | `light` | 375 px | 0/0 px | 2731 px | `393d5edbf559fe2443b2f5bb6d501e649b5a8554ba08e3fc1d86ea544fa589cc` / `3c614f67894d02c4c8e659c514bae4d956d1c60a91ab653ff5fc35ff197a228b` | 8287 | ✅ Geprüft: Drawer umgebaut: Serverwerte laden, Score-Vorschläge nur ohne gespeicherte Zeile, expliziter Speichern-Button statt Autosave |
| `qualifizierung-drawer-viewer` | `dark` | 1440 px | 0/0 px | 1008 px | `3d4b06e89feaec9795cf827666018128d785f11472de2f420d81f80564e2ca9a` / `e5c7284c7fac8f4bd8546e517efbc43e0b3201555e3045b23f5716efd6b5e1b9` | 141723 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `qualifizierung-drawer-viewer` | `dark` | 768 px | 0/0 px | 1375 px | `fcb21a67cc2989cd9cba2b0d76310ddd5132caa11d391d7e2825525657c60c94` / `3425089fc97c98d3cd54c377086af9d5cab900bd034dca5ed2add499fc0da77a` | 141723 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `qualifizierung-drawer-viewer` | `dark` | 375 px | 0/0 px | 2731 px | `faffac5a192f842b5cc44ac9eec3d10cfee0f43f58cc2dbfe6df7c47fc746174` / `d52219b0848822a98152015d475f9216b9b3c011985478bb49b68cf34271a45e` | 92272 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `qualifizierung-drawer-viewer` | `light` | 1440 px | 0/0 px | 1008 px | `565471b978393d9fc7fd6c3d26ff8a3bbc98cc13f5f4709905344d393f0c4a0c` / `d9cbd181f3a4f9419ead449bed2f7cc5aea677b27e340d2b162da9f87e57eb61` | 141463 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `qualifizierung-drawer-viewer` | `light` | 768 px | 0/0 px | 1375 px | `ec97b318054b64ad090972aa731df27bf63832210b3e82af56dcddbda6b2e6d9` / `5c6f7f20cee5cc841b1618a9e39948c5fc58cd0f6f0027b23bb8221f5192bcb0` | 141463 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `qualifizierung-drawer-viewer` | `light` | 375 px | 0/0 px | 2731 px | `393d5edbf559fe2443b2f5bb6d501e649b5a8554ba08e3fc1d86ea544fa589cc` / `ac567d6056b075dc6bab784b4a4478568aeb83add0836c137df54264be5993d3` | 92088 | ✅ Geprüft: Viewer-Drawer jetzt strikt lesend: Speichern- und Konvertierungs-Aktionen entfallen (vorher sichtbar) |
| `funnel` | `dark` | 1440 px | 0/0 px | 1671 px | `e73d1bc13f555bdd5522c3d46481236c40e4f7e31cc8f04740923b70c55ca221` / `e73d1bc13f555bdd5522c3d46481236c40e4f7e31cc8f04740923b70c55ca221` | 0 | ✅ Vergleich bestanden |
| `funnel` | `dark` | 768 px | 0/0 px | 1636 px | `86d544f9dda9215ef7fc669a6606a1a91639459fd8dd0f188f729ec82e5f4449` / `86d544f9dda9215ef7fc669a6606a1a91639459fd8dd0f188f729ec82e5f4449` | 0 | ✅ Vergleich bestanden |
| `funnel` | `dark` | 375 px | 0/0 px | 2145 px | `c185db9f295e392f1dcc46ad83fb51ca0f7013b510771d1cd3b69f53938d1ab7` / `c185db9f295e392f1dcc46ad83fb51ca0f7013b510771d1cd3b69f53938d1ab7` | 0 | ✅ Vergleich bestanden |
| `funnel` | `light` | 1440 px | 0/0 px | 1671 px | `59307ccd861f6912d770b829ffeae86faba80704177376398be94426c94725fd` / `59307ccd861f6912d770b829ffeae86faba80704177376398be94426c94725fd` | 0 | ✅ Vergleich bestanden |
| `funnel` | `light` | 768 px | 0/0 px | 1636 px | `762ba5ca183ca7607ac12dccde36e5f6951860d4e584b76f1272a2961fed98f8` / `762ba5ca183ca7607ac12dccde36e5f6951860d4e584b76f1272a2961fed98f8` | 0 | ✅ Vergleich bestanden |
| `funnel` | `light` | 375 px | 0/0 px | 2145 px | `c3047deba0a28dbb61ab234fc273e936a6771baea19fdc2b3f36381e21721cc1` / `c3047deba0a28dbb61ab234fc273e936a6771baea19fdc2b3f36381e21721cc1` | 0 | ✅ Vergleich bestanden |

## Zusammenfassung

- **Gesamtanzahl Aufnahmen:** 48
- **Überlauf-Status:** 0 px Überlauf in allen Nachher-Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Verifizierte Eigenschaften (Auftrag 139):
- Kontakte-Liste (`/crm/leads?tab=contacts`) zeigt den Qualifizierungsstatus (Badge „Qualifiziert“) aus `lead_qualifications`
- BANT-Drawer lädt gespeicherte Serverwerte, Score-Vorschläge nur ohne gespeicherte Zeile, Speichern explizit per Button
- Viewer-Rolle sieht den Drawer lesend (keine Speicher-/Konvertierungs-Aktionen)
- Funnel (`/sales/funnel`) bezieht Qualifizierungsdaten serverseitig
- Bildvergleich: höchstens 0,1 % Pixelabweichung oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.
