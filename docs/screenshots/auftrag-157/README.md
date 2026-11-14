# Screenshot-Nachweis: Auftrag 157 (P09a) — Dashboard-Editor: Sektionen und einklappbare Gruppen

Dokumentiert die optische und strukturelle Prüfung des Dashboard-Editors V2 mit Sektionen gemäß Auftrag 157 §5 T9 und `CLAUDE.md` §9.
Bilder verbleiben lokal in `docs/screenshots/auftrag-157/` (.gitignore).

---

## 1. Prüfmatrix

| Szenario | Viewport | Dimensionen | Horizontaler Überlauf | SHA-256 Hash |
|---|---|---|---|---|
| **Editor ohne Sektionen (Vorher-Zustand)** | 1440 | 1440 × 900 px | **0 px** | `be77a4f03cb010b5989e18b75d952e88438297aaaacea0d1bf6dcd317dfbcb22` |
| **Editor mit zwei Sektionen (eine eingeklappt)** | 1440 | 1440 × 900 px | **0 px** | `f463c471e569c23ffddf248c0f41418055889984abebf3070aaa7cc9428f4c6d` |
| **Entfernen-Bestätigungsdialog geöffnet** | 1440 | 1440 × 900 px | **0 px** | `d48c6aae5d9ec69b7e0633b18924a18a9988d6af8a454b382354c1f824c01902` |
| **Editor ohne Sektionen (Vorher-Zustand)** | 768 | 768 × 1024 px | **0 px** | `63cb637c9e491e2b5785867a54566e81075b10fb13db1c125ab4bcae0a56c720` |
| **Editor mit zwei Sektionen (eine eingeklappt)** | 768 | 768 × 1024 px | **0 px** | `b818882b9329287eb401c3b5506938c8afe2415bbb3b247ff660992d87f238b0` |
| **Entfernen-Bestätigungsdialog geöffnet** | 768 | 768 × 1024 px | **0 px** | `fb4a0e6bd2cffdb1625360d8fe20b4b2266ad442a758d5c15a5a4aab2667c185` |
| **Editor ohne Sektionen (Vorher-Zustand)** | 375 | 375 × 812 px | **0 px** | `e63babe4cd8c300ab1c418ddc157b727d67e57c2d184996753631b7f0c68993f` |
| **Editor mit zwei Sektionen (eine eingeklappt)** | 375 | 375 × 812 px | **0 px** | `6e450bf5e0d45fd3303902a1d2e2b93ff196281368383c12a368f8dc4bb77085` |
| **Entfernen-Bestätigungsdialog geöffnet** | 375 | 375 × 812 px | **0 px** | `e3761e77a7e5ec3d98ca1256534f123747a68ede82f6ae23ea5f4a68d3a26e8d` |

---

## 2. Abnahmekriterien & Nachweise

1. **Horizontaler Überlauf:** Alle 9 Konfigurationen (3 Szenarien × 3 Breiten) weisen strikt **0 px** horizontalen Überlauf auf.
2. **Hash-Differenzierung:**
   - In jedem Viewport unterscheiden sich die Hashes von Zustand 1 (ohne Sektionen), Zustand 2 (zwei Sektionen, eine eingeklappt) und Zustand 3 (Entfernen-Bestätigungsdialog) eindeutig.
   - Eingeklappte Sektionen blenden ihre Kacheln vollständig aus.
3. **Barrierefreiheit & Responsivität:**
   - Touch-Ziele auf Mobile (375 px) halten die Mindestgröße von 44 × 44 px ein.
   - Der Bestätigungsdialog zentriert auf allen Viewports ohne Abschneiden von Text oder Buttons.
