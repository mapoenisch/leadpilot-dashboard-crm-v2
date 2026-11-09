# Auftrag 141 – Visuelle Gate-Prüfung Legacy-Dashboard entfernt (1440/768/375 px, dark/light)

Aufgenommen 2026-11-09, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Vorher: http://127.0.0.1:4322 (Basis origin/main nach Auftrag 140, Merge 05c4f35); Nachher: http://127.0.0.1:4321.
Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.
Der Ausgangsstand zeigt unter `/dashboard` bereits die persönliche Ansicht (Rollout-Standard seit Auftrag 079) — erwartet sind identische Bilder.

| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |
|---|---|---|---|---|---|---|---|
| `dashboard-uebersicht` | `dark` | 1440 px | 0/0 px | 893 px | `2399241e33a99ac43250bb8ca4e14e49517417d1c94553f6cd36f8b5b93f827b` / `2399241e33a99ac43250bb8ca4e14e49517417d1c94553f6cd36f8b5b93f827b` | 0 | ✅ Vergleich bestanden |
| `dashboard-uebersicht` | `dark` | 768 px | 0/0 px | 861 px | `91b324a88366091ac3d73e43ab1a84dcf6aaa64b548eb7161c141f160ebccc60` / `91b324a88366091ac3d73e43ab1a84dcf6aaa64b548eb7161c141f160ebccc60` | 0 | ✅ Vergleich bestanden |
| `dashboard-uebersicht` | `dark` | 375 px | 0/0 px | 851 px | `ff1c15dc15b5082eb1e8df741a75dd7cd002d313fc68635dd1cf41abed6ab728` / `49dbbb5e80877f23a11ad4f542603d13ee598c41622f4badfed5fd5099c72420` | 16 | ✅ Vergleich bestanden |
| `dashboard-uebersicht` | `light` | 1440 px | 0/0 px | 893 px | `c09033f31a4ce5d95b42e7bc24b676a6eb1610e601b1aa59fb8e32b8f67052da` / `c09033f31a4ce5d95b42e7bc24b676a6eb1610e601b1aa59fb8e32b8f67052da` | 0 | ✅ Vergleich bestanden |
| `dashboard-uebersicht` | `light` | 768 px | 0/0 px | 861 px | `7c5c5fbc190d0102ef19efa19a8c0d59bd0bf9ed12e8f551d5a0b57501102b1b` / `7c5c5fbc190d0102ef19efa19a8c0d59bd0bf9ed12e8f551d5a0b57501102b1b` | 0 | ✅ Vergleich bestanden |
| `dashboard-uebersicht` | `light` | 375 px | 0/0 px | 851 px | `a3df2ce0cbace94c8c5411554892f8a3d7bbc2f8921f7aa63cfc31419adaa181` / `a3df2ce0cbace94c8c5411554892f8a3d7bbc2f8921f7aa63cfc31419adaa181` | 0 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `dark` | 1440 px | 0/0 px | 893 px | `b122bf5260f3e83f642e84e40bafa36fb285f9247911c8d51f57f04ec091d999` / `b122bf5260f3e83f642e84e40bafa36fb285f9247911c8d51f57f04ec091d999` | 0 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `dark` | 768 px | 0/0 px | 861 px | `796b74a9acc8bf7f3fdfb93d696ef8fc4d1b1f66720ee065171c1773c95dda41` / `3d6b20868320ae116d3322d16cabd31b5fff025e0f3b2b64748e010a43de572f` | 41 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `dark` | 375 px | 0/0 px | 851 px | `f0cc8eed8aa26595f7e4692e666b8472baddb8f730af2f2e497e90f48c444f38` / `f0cc8eed8aa26595f7e4692e666b8472baddb8f730af2f2e497e90f48c444f38` | 0 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `light` | 1440 px | 0/0 px | 893 px | `b4a3a6edd597b377e0c8a49cff39202c8107a48719985b94409012dac350eaeb` / `b4a3a6edd597b377e0c8a49cff39202c8107a48719985b94409012dac350eaeb` | 0 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `light` | 768 px | 0/0 px | 861 px | `884311bc5d67e6a1457c356566827b7557f88fb6b0e2fb996e6c1ed0c3f0d13c` / `884311bc5d67e6a1457c356566827b7557f88fb6b0e2fb996e6c1ed0c3f0d13c` | 0 | ✅ Vergleich bestanden |
| `dashboard-kachel-details` | `light` | 375 px | 0/0 px | 851 px | `e3efd2213d29689c64be12884a604349c89f0e046abc962442b35a9f33369e53` / `e3efd2213d29689c64be12884a604349c89f0e046abc962442b35a9f33369e53` | 0 | ✅ Vergleich bestanden |

## Zusammenfassung

- **Gesamtanzahl Aufnahmen:** 24
- **Überlauf-Status:** 0 px Überlauf in allen Nachher-Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Verifizierte Eigenschaften (Auftrag 141):
- `/dashboard` zeigt die persönliche Ansicht; der Rollout-Schalter und die bisherige Ansicht sind entfernt
- `/dashboard/tiles/:tileId` bleibt erreichbar und zeigt Kachel-Details
- Kein horizontaler Überlauf in allen Aufnahmen
- Bildvergleich: höchstens 0,1 % Pixelabweichung oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.
