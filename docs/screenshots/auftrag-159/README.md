# Screenshot-Nachweis: Auftrag 159 (P10a) — Zeitsteuerung und Live-Status

Dokumentiert die optische Prüfung der gemeinsamen Zeitsteuerung und des ehrlichen Live-Status
gemäß Auftrag 159 §5 T8 und `CLAUDE.md` §9.
Bilder verbleiben lokal in `docs/screenshots/auftrag-159/` (.gitignore).

---

## 1. Prüfmatrix

30 Aufnahmen (5 Zustände × 3 Viewports × 2 Themes). Pflicht: 0 px horizontaler Überlauf,
eindeutige SHA-256-Hashes je Zustand.

| Szenario | Viewport | Theme | Dimensionen | Horizontaler Überlauf | SHA-256 Hash |
|---|---|---|---|---|---|
| **Statusleiste verbunden (Live-Kachel)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `458ac37751f6add9fc9a488ca0c6128be77271c19255da4f2b5f30f59a9acb0e` |
| **Statusleiste pausiert („Angehalten seit“)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `e8ce6f775266dfeede845e580ad981f6b44e8d05ad8d0a47ef3d13a302c6d369` |
| **Statusleiste offline** | 1440 | dunkel | 1440 × 900 px | **0 px** | `b89ea00d961675a48086d92c80afb0b7808e12f0a4721a9681ac1978d5c815f5` |
| **Statusleiste nicht konfiguriert** | 1440 | dunkel | 1440 × 900 px | **0 px** | `435ddafc2378368e7d44d99a3442577b63ef5064c407246890a699a07d5b0021` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `8da2b73988b2a5b66ec246e2691abcdd64968736d14c959fb6fcb599127d136e` |
| **Statusleiste verbunden (Live-Kachel)** | 1440 | hell | 1440 × 900 px | **0 px** | `09daf64ed2e45379089ac9a5c66e56988c5ffe545711b32a421d87d3f3ff999e` |
| **Statusleiste pausiert („Angehalten seit“)** | 1440 | hell | 1440 × 900 px | **0 px** | `8cc0324e942faeec37e0f54f5b297dc3f0ff67e89417e929056c1820b9faf1fd` |
| **Statusleiste offline** | 1440 | hell | 1440 × 900 px | **0 px** | `f9e39989690cbadb08e687d3dc016c3db63a0caf9494fa89779061940aab2345` |
| **Statusleiste nicht konfiguriert** | 1440 | hell | 1440 × 900 px | **0 px** | `435ddafc2378368e7d44d99a3442577b63ef5064c407246890a699a07d5b0021` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 1440 | hell | 1440 × 900 px | **0 px** | `3afe70be37b8106590a64e03b5f7ca628c9b87033e2c72cae35801dd5e98bcf4` |
| **Statusleiste verbunden (Live-Kachel)** | 768 | dunkel | 768 × 1024 px | **0 px** | `e237ea5fd515d4fb6165344fe7cd581e8530b7ce8ebb10d2c854cb82b3a1c74f` |
| **Statusleiste pausiert („Angehalten seit“)** | 768 | dunkel | 768 × 1024 px | **0 px** | `6838af1ca5dc5f456ad09d0bca8cc72c6a8f3ed081e8338e0eb2505ed3af4386` |
| **Statusleiste offline** | 768 | dunkel | 768 × 1024 px | **0 px** | `8fe990bd8ea035e71b394d59bf433bd0a5323c320592ae7f509817b20ef95fee` |
| **Statusleiste nicht konfiguriert** | 768 | dunkel | 768 × 1024 px | **0 px** | `95467c9e2e771daa788f12afa84a09b8a5fd2bf33f884c3fd8c46b43042f7045` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 768 | dunkel | 768 × 1024 px | **0 px** | `dcb45f2dfef397cef373f2e0336544ebcbf02d0deac4f4cab00042a06e501623` |
| **Statusleiste verbunden (Live-Kachel)** | 768 | hell | 768 × 1024 px | **0 px** | `e237ea5fd515d4fb6165344fe7cd581e8530b7ce8ebb10d2c854cb82b3a1c74f` |
| **Statusleiste pausiert („Angehalten seit“)** | 768 | hell | 768 × 1024 px | **0 px** | `6838af1ca5dc5f456ad09d0bca8cc72c6a8f3ed081e8338e0eb2505ed3af4386` |
| **Statusleiste offline** | 768 | hell | 768 × 1024 px | **0 px** | `8fe990bd8ea035e71b394d59bf433bd0a5323c320592ae7f509817b20ef95fee` |
| **Statusleiste nicht konfiguriert** | 768 | hell | 768 × 1024 px | **0 px** | `95467c9e2e771daa788f12afa84a09b8a5fd2bf33f884c3fd8c46b43042f7045` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 768 | hell | 768 × 1024 px | **0 px** | `dcb45f2dfef397cef373f2e0336544ebcbf02d0deac4f4cab00042a06e501623` |
| **Statusleiste verbunden (Live-Kachel)** | 375 | dunkel | 375 × 812 px | **0 px** | `e2b64fef129623904fafbed8eb4d503d20f1d97a87318c3b8e6124d50da39f0a` |
| **Statusleiste pausiert („Angehalten seit“)** | 375 | dunkel | 375 × 812 px | **0 px** | `9a56ee6aac9dbee615968880eedbfa36f0189449ca52adcb6a3af6e229810259` |
| **Statusleiste offline** | 375 | dunkel | 375 × 812 px | **0 px** | `a3a69dd3f9d5671cd1c4795ea51ef8a870b29910db076c3b9bbb3ba3a017b0b3` |
| **Statusleiste nicht konfiguriert** | 375 | dunkel | 375 × 812 px | **0 px** | `1a86e087e5744ff3c81a829ce43a6bf3c58a01c39b588905eb0036fa63d39c4e` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 375 | dunkel | 375 × 812 px | **0 px** | `eb9902ac079f1ae1b228ef53d02638d8513d010d39b920d841dfb09662c95234` |
| **Statusleiste verbunden (Live-Kachel)** | 375 | hell | 375 × 812 px | **0 px** | `e2b64fef129623904fafbed8eb4d503d20f1d97a87318c3b8e6124d50da39f0a` |
| **Statusleiste pausiert („Angehalten seit“)** | 375 | hell | 375 × 812 px | **0 px** | `9a56ee6aac9dbee615968880eedbfa36f0189449ca52adcb6a3af6e229810259` |
| **Statusleiste offline** | 375 | hell | 375 × 812 px | **0 px** | `a3a69dd3f9d5671cd1c4795ea51ef8a870b29910db076c3b9bbb3ba3a017b0b3` |
| **Statusleiste nicht konfiguriert** | 375 | hell | 375 × 812 px | **0 px** | `1a86e087e5744ff3c81a829ce43a6bf3c58a01c39b588905eb0036fa63d39c4e` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 375 | hell | 375 × 812 px | **0 px** | `eb9902ac079f1ae1b228ef53d02638d8513d010d39b920d841dfb09662c95234` |

---

## 2. Vorher/Nachher

**Vorher (Baseline, Merge von 158):** Die Statusleiste zeigte fest verdrahtet „Live“
(`connectionStatus = 'connected'`), auch ohne Supabase, Feed und Live-Kachel. Der Pause-Knopf war
ein lokaler `useState` ohne Wirkung auf den Datenpfad. Ein Screenshot des alten Stands wird hier
nicht dupliziert; die Fundstellen stehen in der Ist-Tabelle des Auftrags (§1).

**Nachher (diese Aufnahmen):**

1. **verbunden:** Statusleiste zeigt „Verbunden“ nur, wenn eine Live-Kachel sichtbar ist und der
   Feed-Zustand `live` meldet.
2. **pausiert:** „Angehalten seit HH:MM“, Pause-Knopf trägt `aria-pressed="true"` und den Text
   „Fortsetzen“.
3. **offline:** „Getrennt“ mit Warnsymbol, letzte neue Daten und Datenstand bleiben getrennt.
4. **nicht konfiguriert:** „Nicht konfiguriert“; die Statusleiste enthält nirgends das Wort „Live“.
5. **Abweichung:** Eine während der Pause hinzugefügte Kachel zeigt
   „Stand HH:MM (nach Pausenbeginn geladen)“ statt einer stillen Mischung.

---

## 3. Abnahmekriterien

1. **Horizontaler Überlauf:** alle 30 Konfigurationen weisen strikt **0 px** auf.
2. **Hash-Differenzierung:** die fünf Zustände unterscheiden sich je Viewport und Theme sichtbar.
3. **Responsivität:** Pause-Knopf und Statusleiste bleiben bei 375 px ohne Abschneiden bedienbar;
   die Bibliothek wird auf schmalen Viewports über den Panel-Schalter geöffnet.
