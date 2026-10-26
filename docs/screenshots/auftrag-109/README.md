# Auftrag 109 – Screenshot-Matrix (Paket H Teil 5)

Skript: `scripts/captureAuftrag109Screenshots.mjs` (SUPABASE_MOCK=1). Vorher = `main` (34b3824), Nachher = Branch `claude/auftrag-109-paket-h-teil5`. Bilder lokal, nicht committet.

## Lauf A – Standard (persönliches Dashboard)

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /dashboard | 1440 | b7d9531e04de | cb15653178dc | ja | 0 / 0 |
| /okrs | 1440 | c16e906bcd5a | 5cee3b9edb78 | ja | 0 / 0 |
| /balanced-scorecard | 1440 | 99f4da637bf8 | e1424421ec73 | ja | 0 / 0 |
| /hr | 1440 | 4c0389d44305 | 4db39a9aa8c3 | ja | 0 / 0 |
| /headcount | 1440 | e7ac29bac50c | 6843f3c54996 | ja | 0 / 0 |
| /dashboard | 768 | b3919c14e670 | b3919c14e670 | nein | 0 / 0 |
| /okrs | 768 | f95be80661fb | 7294d0614ecc | ja | 0 / 0 |
| /balanced-scorecard | 768 | 0115e5d15fb7 | 520260a62911 | ja | 0 / 0 |
| /hr | 768 | c66622bb1f50 | 6ff5293bfae4 | ja | 0 / 0 |
| /headcount | 768 | c6227cbe31d9 | 6309e67d89d5 | ja | 0 / 0 |
| /dashboard | 375 | 128faf677a2c | 128faf677a2c | nein | 0 / 0 |
| /okrs | 375 | 24cb292049bf | 24cb292049bf | nein | 0 / 0 |
| /balanced-scorecard | 375 | a4efd6808c8c | f7feb5bd929f | ja | 0 / 0 |
| /hr | 375 | ab177f89afc0 | 23ebadf396f7 | ja | 0 / 0 |
| /headcount | 375 | 05eff2d73320 | 5f1e9d66bfe8 | ja | 86 / 86 |

**Begründete Gleichstände:** `/dashboard` 768/375 – die Kachel „Teamgröße“ liegt außerhalb des sichtbaren Bereichs (1440 verschieden). `/okrs` 375 – das Säulendiagramm scrollt waagerecht, das Label „Teamgröße“ liegt rechts außerhalb des Bildes (768/1440 verschieden).

## Lauf B – klassische Ansicht (`VITE_EXECUTIVE_DASHBOARD_V2=false`, Rückweg)

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /dashboard | 1440 | 703d1074848e | 703d1074848e | nein | 0 / 0 |
| /okrs | 1440 | c16e906bcd5a | 5cee3b9edb78 | ja | 0 / 0 |
| /balanced-scorecard | 1440 | 99f4da637bf8 | e1424421ec73 | ja | 0 / 0 |
| /hr | 1440 | 4c0389d44305 | 4db39a9aa8c3 | ja | 0 / 0 |
| /headcount | 1440 | e7ac29bac50c | 6843f3c54996 | ja | 0 / 0 |
| /dashboard | 768 | 79e0a3e14c1b | a0f2c12028f2 | ja | 0 / 0 |
| /okrs | 768 | f95be80661fb | 7294d0614ecc | ja | 0 / 0 |
| /balanced-scorecard | 768 | 0115e5d15fb7 | 520260a62911 | ja | 0 / 0 |
| /hr | 768 | c66622bb1f50 | 6ff5293bfae4 | ja | 0 / 0 |
| /headcount | 768 | c6227cbe31d9 | 6309e67d89d5 | ja | 0 / 0 |
| /dashboard | 375 | a85936822051 | a85936822051 | nein | 0 / 0 |
| /okrs | 375 | 24cb292049bf | 24cb292049bf | nein | 0 / 0 |
| /balanced-scorecard | 375 | a4efd6808c8c | f7feb5bd929f | ja | 0 / 0 |
| /hr | 375 | ab177f89afc0 | 23ebadf396f7 | ja | 0 / 0 |
| /headcount | 375 | 05eff2d73320 | 5f1e9d66bfe8 | ja | 86 / 86 |

**Begründete Gleichstände:** `/dashboard` 1440/375 – die KPI-Zeile mit „Teamgröße“ liegt unterhalb des sichtbaren Bereichs (768 verschieden). `/okrs` 375 wie Lauf A.

Überlauf `/headcount @375` (86 px) unverändert vorbestehend (seit Auftrag 107 bekannt).
