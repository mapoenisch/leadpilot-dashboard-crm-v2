# Auftrag 140 – Visuelle Gate-Prüfung Funnel-Verweildauer (1440/768/375 px, dark/light)

Aufgenommen 2026-11-09, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Vorher: http://127.0.0.1:4322 (Basis 9c70f8b, origin/main nach Auftrag 139); Nachher: http://127.0.0.1:4321.
Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.

| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |
|---|---|---|---|---|---|---|---|
| `funnel-live-gemischt` | `dark` | 1440 px | 0/0 px | 1828 px | `bcb2dd7c805ec3ae76a7abc8b762f368260a5e62588bd4b9a08e87cf98fbb656` / `c780f0b860b92933ad1647dfd0ff1506d812a24acb1a596325fc60add8e3d29e` | 447251 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-gemischt` | `dark` | 768 px | 0/0 px | 1840 px | `e7a257987e4c4800654332b7c07974ed9b38ca9dae4e41d992fa9f5595dd9e28` / `3362553a3256c438210922495205f9c8336c1324959e907d40dfefa82217d3ee` | 274413 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-gemischt` | `dark` | 375 px | 0/0 px | 2481 px | `16bec92a356c35a0a86b83d83dd253c6e9caee549408ab913fca0d4db5a55790` / `6df442801c7959c720eed17e778e1879cf907f4d0b33944eba9e3bff7bbcb6a6` | 81426 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-gemischt` | `light` | 1440 px | 0/0 px | 1828 px | `d11b0f4fc06e1787f98ed066c496682d98cdb4b78c58fe4c5d80b8bfe805f95c` / `94c9c8a238512b944c9cd097b2fdc49e7a8b711a09bcb470c46fe6fb399c843a` | 445891 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-gemischt` | `light` | 768 px | 0/0 px | 1840 px | `7762183cc01ac4b0a3f355a9050250f0db47ff4d04eb10292c8d189ab07f1021` / `9c5fa65f82bb5405df098818d75216852c3e851dd090efab171aa68930da2247` | 274658 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-gemischt` | `light` | 375 px | 0/0 px | 2481 px | `b8bef45b7e6799eff23efba7b87c5a1517117f54aa6d95f4ea2d9fbc7319562c` / `39f40b194973cbb3dc43c9e5a6e54a3a94f12a6952c9a38f69b5c05d543ffbe3` | 82036 | ✅ Geprüft: Geprüft: Alert zeigt jetzt den echten Engpass aus stageEnteredAt (Grenzwert 30 Tage — die Verhandlung-Phase mit Schnitt 28 Tagen ist nicht mehr Engpass) plus die neue Zeile „2 Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ |
| `funnel-live-unbekannt` | `dark` | 1440 px | 0/0 px | 1765 px | `4391d3ddbe2c77d8349fca772a99eec50cad737ef45263f6397b3fa51e19e995` / `92888588896f10d06b8219e8eabc2aa27284a95a78e8f4779595657d36c90fc9` | 545288 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |
| `funnel-live-unbekannt` | `dark` | 768 px | 0/0 px | 1730 px | `bbd0aa2ea503449360c838585c94091c7be3e21ab70b35a9afab4d5ecb0a28da` / `7ecd97a2712ba62e60936251de62cbdc4da9cfefc90c8b4a60ef6ea8073982aa` | 368796 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |
| `funnel-live-unbekannt` | `dark` | 375 px | 0/0 px | 2322 px | `47178a4b1bb81dc42daeba9f1986ebc64c43ccc95d9541d95ccfcf429d79b053` / `187dc9d555a87082132532964326fc36d30b66c86098daad495fcfff1264f6ed` | 166056 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |
| `funnel-live-unbekannt` | `light` | 1440 px | 0/0 px | 1765 px | `1f839aefdf9c45f9799c776034bc4006fdc4d313ee41fb23570c307ce7c1abcf` / `71877771660de079837b54d07365d06f7f7a9148ee57e95017701ce17cf9e849` | 547713 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |
| `funnel-live-unbekannt` | `light` | 768 px | 0/0 px | 1730 px | `e1d5d24bb3b477b4e4092423908e85853985ea3096fa3c4a09bc2a989ed0a2a0` / `0fbe1a0778b9667d847eb9858cbbe359a1d0f581cc62bb61772a7e0fe676451e` | 370119 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |
| `funnel-live-unbekannt` | `light` | 375 px | 0/0 px | 2322 px | `b85aa5cae493b57a3abe86c280d1c32cdb4e6caf093a43308729c58e75992a1e` / `e811ff351f6922d9185c7d721e77a6f4cd3cfd90574b0018a3ddea116ad58bdb` | 166436 | ✅ Geprüft: Geprüft: Bei komplett unbekannten Verweildauern erscheint jetzt der neutrale Hinweis mit Anzahl statt bisher gar keinem Alert (keine falsche Entwarnung). |

## Zusammenfassung

- **Gesamtanzahl Aufnahmen:** 24
- **Überlauf-Status:** 0 px Überlauf in allen Nachher-Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Verifizierte Eigenschaften (Auftrag 140):
- Funnel (`/sales/funnel`, Live-Pipeline) berechnet Verweildauern ausschließlich aus `stageEnteredAt` (Grenzwert 30 Tage, Überschreitung = Engpass)
- Der Alert nennt offen: „{n} Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ — bei 0 keine Zeile
- Sind alle Verweildauern unbekannt, erscheint weder Engpass- noch All-Clear-Meldung, sondern ein neutraler Hinweis
- Bildvergleich: höchstens 0,1 % Pixelabweichung oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.
