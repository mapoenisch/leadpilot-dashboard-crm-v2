# Auftrag 106 – Screenshot-Matrix (Vertriebsphase, Teamgröße)

Aufnahme: Mock-Supabase (`SUPABASE_MOCK=1`), Vorher = Branch von Auftrag 105 (PR #96), Nachher = Branch 106. Bilder lokal, nicht committet. Jede Aufnahme zeigt die geänderte Beschriftung (Filter bzw. Eingabefelder in den Bildausschnitt gescrollt).

| Ansicht | Breite | Vorher (SHA-256, 12) | Nachher (SHA-256, 12) | Unterschied | Überlauf vorher → nachher |
|---|---|---|---|---|---|
| deals | 1440 | ff92db776ccd | b5f15a774113 | ja | 0 → 0 px |
| leads-funnel-deals | 1440 | 5944609ad072 | 269fdd09890f | ja | 0 → 0 px |
| szenarien | 1440 | 16cf908489da | a22113156430 | ja | 0 → 0 px |
| deals | 768 | d21faa4e69f9 | 163f3298be02 | ja | 0 → 0 px |
| leads-funnel-deals | 768 | 8e71bff7736b | e7c9881a56cf | ja | 0 → 0 px |
| szenarien | 768 | 97cf38a7e5b8 | aba2d7ff3367 | ja | 0 → 0 px |
| deals | 375 | d65a61d09521 | 1435b1fde978 | ja | 0 → 0 px |
| leads-funnel-deals | 375 | ddd9cb660b01 | 1e521c032c0e | ja | 0 → 0 px |
| szenarien | 375 | 4ef19cff98f4 | e09c92210fa5 | ja | 184 → 184 px |

Ergebnis: 9 von 9 Paaren unterscheiden sich. Neuer horizontaler Überlauf: 0 px. Ein Überlauf besteht schon vorher und ist unverändert: `szenarien` bei 375 px (184 px, Aktionszeile „Abbrechen / Version anlegen“ im Dialog „Szenarien & Parameter“ ragt über den Rand). Er stammt nicht aus diesem Auftrag und bleibt als Befund für einen eigenen Auftrag offen.
Sichtprüfung: „Alle Vertriebsphasen“, „Vertriebsphase:“, „Vertriebsmitarbeitende (Teamgröße)“, „Kundenbetreuende (Teamgröße)“ vollständig sichtbar, keine Textkürzung.
Reproduktion: `SUPABASE_MOCK=1 BASE_URL=… node scripts/captureAuftrag106Screenshots.mjs before|after`.
