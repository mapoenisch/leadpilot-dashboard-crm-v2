# Auftrag 108 – Screenshot-Matrix (Paket H Teil 4)

Skript: `scripts/captureAuftrag108Screenshots.mjs` (SUPABASE_MOCK=1). Vorher = `main` (720caf5), Nachher = Branch `claude/auftrag-108-paket-h-teil4`. Bilder lokal, nicht committet. Headcount: Menü unter 1024 px geöffnet und zum Eintrag gescrollt.

## Lauf A – Standard (persönliches Dashboard)

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /dashboard | 1440 | b7d9531e04de | b7d9531e04de | nein | 0 / 0 |
| /highlights | 1440 | 8e4c9164da64 | 8fd60e8d893f | ja | 0 / 0 |
| /unit-economics | 1440 | efd2106db446 | b7232c355f36 | ja | 0 / 0 |
| /balanced-scorecard | 1440 | ee030181219f | 99f4da637bf8 | ja | 0 / 0 |
| /headcount | 1440 | 59889a018191 | 278f7a5a155b | ja | 0 / 0 |
| /dashboard | 768 | 05532618c771 | 05532618c771 | nein | 0 / 0 |
| /highlights | 768 | 8acbb9f886f5 | 6c2fa0e81075 | ja | 0 / 0 |
| /unit-economics | 768 | e271abf6d655 | a5ee21399302 | ja | 0 / 0 |
| /balanced-scorecard | 768 | 544d37dc5ecd | 0115e5d15fb7 | ja | 0 / 0 |
| /headcount | 768 | ffdfab8e56af | 9539984e2490 | ja | 0 / 0 |
| /dashboard | 375 | 775c02212746 | 775c02212746 | nein | 0 / 0 |
| /highlights | 375 | dd229a1aff38 | e55b4c18db9e | ja | 0 / 0 |
| /unit-economics | 375 | 17a0394b49d2 | 9f210674b902 | ja | 0 / 0 |
| /balanced-scorecard | 375 | 8441c5150e9b | 7b86a087255e | ja | 0 / 0 |
| /headcount | 375 | 2b8fb36e8a8c | 06e4346cbe6c | ja | 86 / 86 |

**Begründete Gleichstände:** `/dashboard` (3×) zeigt im Standard das persönliche Dashboard; die geänderte Seitenbeschreibung gehört zur klassischen Ansicht (Lauf B).

## Lauf B – klassische Ansicht (`VITE_EXECUTIVE_DASHBOARD_V2=false`, Rückweg)

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /dashboard | 1440 | bf87d3acd914 | 703d1074848e | ja | 0 / 0 |
| /highlights | 1440 | 8e4c9164da64 | 8fd60e8d893f | ja | 0 / 0 |
| /unit-economics | 1440 | efd2106db446 | b7232c355f36 | ja | 0 / 0 |
| /balanced-scorecard | 1440 | ee030181219f | 99f4da637bf8 | ja | 0 / 0 |
| /headcount | 1440 | 59889a018191 | 278f7a5a155b | ja | 0 / 0 |
| /dashboard | 768 | 970c8392752e | 79e0a3e14c1b | ja | 0 / 0 |
| /highlights | 768 | 8acbb9f886f5 | 6c2fa0e81075 | ja | 0 / 0 |
| /unit-economics | 768 | e271abf6d655 | a5ee21399302 | ja | 0 / 0 |
| /balanced-scorecard | 768 | 544d37dc5ecd | 0115e5d15fb7 | ja | 0 / 0 |
| /headcount | 768 | ffdfab8e56af | 9539984e2490 | ja | 0 / 0 |
| /dashboard | 375 | 53cfc9c3d30b | a85936822051 | ja | 0 / 0 |
| /highlights | 375 | dd229a1aff38 | e55b4c18db9e | ja | 0 / 0 |
| /unit-economics | 375 | 17a0394b49d2 | 9f210674b902 | ja | 0 / 0 |
| /balanced-scorecard | 375 | 8441c5150e9b | 7b86a087255e | ja | 0 / 0 |
| /headcount | 375 | 2b8fb36e8a8c | 06e4346cbe6c | ja | 86 / 86 |

**Überlauf:** `/headcount @375` (86 px) besteht unverändert schon auf `main` (identisch in Auftrag 107); eigener Befund, nicht durch diesen Auftrag verursacht.

**Sichtprüfung:** Unit Economics zeigt „Gesamtkosten pro Neukunde“ und „CAC-Payback (Gesamtkosten)“, Werte unverändert; Menü zeigt „Entwicklung der Teamgröße“ als aktiven Eintrag; Umbrüche sauber.
