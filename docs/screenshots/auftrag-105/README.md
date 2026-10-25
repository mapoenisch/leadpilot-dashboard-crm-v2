# Auftrag 105 – Screenshot-Matrix (Kopfzeile, Abmelden, aktiver Menüpunkt)

Aufnahme: Mock-Supabase (`SUPABASE_MOCK=1`), Route `/dashboard`, Vorher = `main`, Nachher = Branch. Bilder lokal (nicht committet).
Kopfzeile = Ansicht der Seite; Menü = Seitenleiste (ab 1024 px dauerhaft sichtbar, darunter geöffneter Drawer).

| Ansicht | Breite | Vorher (SHA-256, 12) | Nachher (SHA-256, 12) | Unterschied | Überlauf nachher |
|---|---|---|---|---|---|
| kopfzeile/dark | 1440 | bef63e57af74 | 3f324402df10 | ja | 0 px |
| menue/dark | 1440 | bef63e57af74 | 3f324402df10 | ja | 0 px |
| kopfzeile/light | 1440 | 56867d73cd85 | 2d10fa3fdd60 | ja | 0 px |
| menue/light | 1440 | 56867d73cd85 | 2d10fa3fdd60 | ja | 0 px |
| kopfzeile/dark | 768 | 808fbb1f2b7c | 68ee95d51c46 | ja | 0 px |
| menue/dark | 768 | ac1b8e5aed0a | a1fbda2c57aa | ja | 0 px |
| kopfzeile/light | 768 | 805e8614ddc7 | 3ffa76b68b5e | ja | 0 px |
| menue/light | 768 | a90246d04af2 | 1da15dae583e | ja | 0 px |
| kopfzeile/dark | 375 | f72e38c4fd9f | 128faf677a2c | ja | 0 px |
| menue/dark | 375 | 7c04cd574f71 | 0fa32e922879 | ja | 0 px |
| kopfzeile/light | 375 | 6d02c2030a01 | 0a5d426ebd10 | ja | 0 px |
| menue/light | 375 | 3d4ac8a03546 | 9bf9c4965ce3 | ja | 0 px |

Ergebnis: 12 von 12 Paaren unterscheiden sich, 0 px horizontaler Überlauf. Sichtprüfung der Bilder: Abmelden und E-Mail/Rolle in der Kopfzeile sichtbar (375 px: Symbol und Avatar, kein Umbruch), aktiver Menüpunkt mit Akzentbalken (hell und dunkel).
Reproduktion: `SUPABASE_MOCK=1 BASE_URL=… node scripts/captureAuftrag105Screenshots.mjs before|after` (Dev-Server mit `VITE_SUPABASE_URL=http://supabase.mock`).
