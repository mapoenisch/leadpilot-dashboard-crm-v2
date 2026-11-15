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
| **Statusleiste verbunden (Live-Kachel)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `a27f8263d73c8c3f866356c582fd75f6aeae8d8fba17ce0b822dcee26bd24a5f` |
| **Statusleiste pausiert („Angehalten seit“)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `00a1a1c6706056b496946e457905e9423290875d4a66eca9b0cc58fb7e174edd` |
| **Statusleiste offline** | 1440 | dunkel | 1440 × 900 px | **0 px** | `fedfb842a836bf151d8524b20c9b5061d587e67cb4e0659442bad0d73e7cbaa4` |
| **Statusleiste nicht konfiguriert** | 1440 | dunkel | 1440 × 900 px | **0 px** | `435ddafc2378368e7d44d99a3442577b63ef5064c407246890a699a07d5b0021` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 1440 | dunkel | 1440 × 900 px | **0 px** | `21c8dfd50f570e5aab3f8e9f64462f1a5fcd2b138ee33fc5a5b992066ed3e9ce` |
| **Statusleiste verbunden (Live-Kachel)** | 1440 | hell | 1440 × 900 px | **0 px** | `a27f8263d73c8c3f866356c582fd75f6aeae8d8fba17ce0b822dcee26bd24a5f` |
| **Statusleiste pausiert („Angehalten seit“)** | 1440 | hell | 1440 × 900 px | **0 px** | `00a1a1c6706056b496946e457905e9423290875d4a66eca9b0cc58fb7e174edd` |
| **Statusleiste offline** | 1440 | hell | 1440 × 900 px | **0 px** | `fedfb842a836bf151d8524b20c9b5061d587e67cb4e0659442bad0d73e7cbaa4` |
| **Statusleiste nicht konfiguriert** | 1440 | hell | 1440 × 900 px | **0 px** | `435ddafc2378368e7d44d99a3442577b63ef5064c407246890a699a07d5b0021` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 1440 | hell | 1440 × 900 px | **0 px** | `21c8dfd50f570e5aab3f8e9f64462f1a5fcd2b138ee33fc5a5b992066ed3e9ce` |
| **Statusleiste verbunden (Live-Kachel)** | 768 | dunkel | 768 × 1024 px | **0 px** | `a1c60cc57d80b9e9757a956f56a24147e6b3141b5855089ad905abc26fdbb8f6` |
| **Statusleiste pausiert („Angehalten seit“)** | 768 | dunkel | 768 × 1024 px | **0 px** | `84202bea97b8ab24d086dd992e22451a9af6d1eaf592c774176ff517cd477e10` |
| **Statusleiste offline** | 768 | dunkel | 768 × 1024 px | **0 px** | `713c6f7b0c0e03520626c81a8e2d08cb9c809c06675b563c07eb86399ea7128b` |
| **Statusleiste nicht konfiguriert** | 768 | dunkel | 768 × 1024 px | **0 px** | `95467c9e2e771daa788f12afa84a09b8a5fd2bf33f884c3fd8c46b43042f7045` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 768 | dunkel | 768 × 1024 px | **0 px** | `caf2aa73e799d03b5f6c5c35c325f55eca361092874535906042d9351c19ecb1` |
| **Statusleiste verbunden (Live-Kachel)** | 768 | hell | 768 × 1024 px | **0 px** | `b375f8c94b135fd31b2a0d0dbb3b8b65bba15cf2ccfcc9de7e6bfda0feee9398` |
| **Statusleiste pausiert („Angehalten seit“)** | 768 | hell | 768 × 1024 px | **0 px** | `064add016bad69232d29a3b82f25c6eb130fa507388860a91c15dddbe0f4f206` |
| **Statusleiste offline** | 768 | hell | 768 × 1024 px | **0 px** | `9880c3e291776d0fc64c0337d640aaeca23caac615b10b9b79028e1c22c15833` |
| **Statusleiste nicht konfiguriert** | 768 | hell | 768 × 1024 px | **0 px** | `95467c9e2e771daa788f12afa84a09b8a5fd2bf33f884c3fd8c46b43042f7045` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 768 | hell | 768 × 1024 px | **0 px** | `caf2aa73e799d03b5f6c5c35c325f55eca361092874535906042d9351c19ecb1` |
| **Statusleiste verbunden (Live-Kachel)** | 375 | dunkel | 375 × 812 px | **0 px** | `c406603acb1a2d586ea983042f8c9555660bdade5a140fc7229b21ff875391e2` |
| **Statusleiste pausiert („Angehalten seit“)** | 375 | dunkel | 375 × 812 px | **0 px** | `bf8e80ef1001ce94dd622b548d58f7b040b74b3a39d3cf176e0d31cd23709f46` |
| **Statusleiste offline** | 375 | dunkel | 375 × 812 px | **0 px** | `89425ed30ef5835a694e6171f808b7947c097fbe8a84bf1db43b88babf684cad` |
| **Statusleiste nicht konfiguriert** | 375 | dunkel | 375 × 812 px | **0 px** | `1a86e087e5744ff3c81a829ce43a6bf3c58a01c39b588905eb0036fa63d39c4e` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 375 | dunkel | 375 × 812 px | **0 px** | `0ad570e275117ad5654b5a1330314bf33ee4d8f3c12e1a80ef4bdba714f39049` |
| **Statusleiste verbunden (Live-Kachel)** | 375 | hell | 375 × 812 px | **0 px** | `c406603acb1a2d586ea983042f8c9555660bdade5a140fc7229b21ff875391e2` |
| **Statusleiste pausiert („Angehalten seit“)** | 375 | hell | 375 × 812 px | **0 px** | `bf8e80ef1001ce94dd622b548d58f7b040b74b3a39d3cf176e0d31cd23709f46` |
| **Statusleiste offline** | 375 | hell | 375 × 812 px | **0 px** | `89425ed30ef5835a694e6171f808b7947c097fbe8a84bf1db43b88babf684cad` |
| **Statusleiste nicht konfiguriert** | 375 | hell | 375 × 812 px | **0 px** | `1a86e087e5744ff3c81a829ce43a6bf3c58a01c39b588905eb0036fa63d39c4e` |
| **Kachel nach Pausenbeginn geladen (Abweichungskennzeichnung)** | 375 | hell | 375 × 812 px | **0 px** | `0ad570e275117ad5654b5a1330314bf33ee4d8f3c12e1a80ef4bdba714f39049` |

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
