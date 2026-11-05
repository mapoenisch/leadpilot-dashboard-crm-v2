# Auftrag 128 – Vorher/Nachher Dashboard-Editor & Vorschauseite

Vorher: `413e55f` (main), Nachher: Stand dieses Branches. Aufgenommen 2026-11-05, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Überlauf = Dokument/<main> in px; Hash = SHA-256 (12 Zeichen) des Ganzseitenbilds.

| Szenario | Breite | Theme | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild |
|---|---|---|---|---|---|---|
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 1440 | dark | 0/0 | 0/0 | 11286 → 11357 | verschieden (56b8b83ed2fa / 9f1dfa63a438) |
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 768 | dark | 0/0 | 0/0 | 17368 → 17435 | verschieden (6c9f4d21376c / 16e473262477) |
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 375 | dark | 0/0 | 0/0 | 19501 → 19669 | verschieden (4d3b52bf26f4 / 69e6dc012cb9) |
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 1440 | light | 0/0 | 0/0 | 11286 → 11357 | verschieden (2908f872f84a / 9f1dfa63a438) |
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 768 | light | 0/0 | 0/0 | 17368 → 17435 | verschieden (6c9f4d21376c / 68445275c34c) |
| `/dashboard-vorschau.html (Vorschauseite & Schnellnavigation)` | 375 | light | 0/0 | 0/0 | 19501 → 19669 | verschieden (4d3b52bf26f4 / 69e6dc012cb9) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 1440 | dark | 0/0 | 0/0 | 3605 → 3732 | verschieden (627ed06de89b / cc0cb0cf8260) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 768 | dark | 0/0 | 0/0 | 5825 → 6108 | verschieden (0ebb8d49ffac / 1e3a2665188b) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 375 | dark | 0/0 | 0/0 | 7360 → 8074 | verschieden (4d4823dfe072 / ca2f5101580a) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 1440 | light | 0/0 | 0/0 | 3605 → 3732 | verschieden (627ed06de89b / cc0cb0cf8260) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 768 | light | 0/0 | 0/0 | 5825 → 6108 | verschieden (0ebb8d49ffac / 38ee4ce7f894) |
| `/dashboard-vorschau.html?bereich=editor (Bearbeitungsmodus & Spaltenwahl)` | 375 | light | 0/0 | 0/0 | 7360 → 8074 | verschieden (4d4823dfe072 / ca2f5101580a) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 1440 | dark | 0/0 | 0/0 | 3605 → 3732 | verschieden (627ed06de89b / cc0cb0cf8260) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 768 | dark | 0/0 | 0/0 | 5825 → 6108 | verschieden (0ebb8d49ffac / 38ee4ce7f894) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 375 | dark | 0/0 | 0/0 | 7360 → 8074 | verschieden (4d4823dfe072 / ca2f5101580a) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 1440 | light | 0/0 | 0/0 | 3605 → 3732 | verschieden (fcb23300440e / cc0cb0cf8260) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 768 | light | 0/0 | 0/0 | 5825 → 6108 | verschieden (0ebb8d49ffac / 38ee4ce7f894) |
| `/dashboard-vorschau.html?bereich=editor (Konfigurator-Drawer 420px)` | 375 | light | 0/0 | 0/0 | 7360 → 8074 | verschieden (4d4823dfe072 / 8be0600996d7) |

Ergebnis: 0 px Überlauf in allen Nachher-Aufnahmen.
Verschiedene Aufnahmen: 18 von 18 Paaren (100 %).
Änderungen gegenüber Baseline 413e55f:
- Direkte 1-Klick-Spaltenbuttons (`3 Sp.`, `6 Sp.`, `9 Sp.`, `12 Sp.`) an jeder Kachel im Bearbeitungsmodus
- Inhaltsabhängige Mindestgrößensperre (`minSizeFor`) für Diagrammkacheln
- Verschlankter Konfigurator-Drawer (420 px statt 640 px) mit sichtbarem Dashboard links daneben
- Kontrast-Tokens für Vorlagenmenü und Drag-Ghost (`text-[var(--color-text-inverse)]`)
- Schnelle Navigationsleiste auf der Vorschauseite
