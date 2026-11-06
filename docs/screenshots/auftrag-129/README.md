# Auftrag 129 – Visuelle Gate-Prüfung CRM Deals Pipeline (Vorher/Nachher)

Vorher: `d3fe131` (main), Nachher: Stand dieses Branches. Aufgenommen 2026-11-06, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Basis-URL: http://localhost:3000
Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).

| Szenario | Theme | Breite | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild (Diff) |
|---|---|---|---|---|---|---|
| `deals-tabelle` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`b2c415c17d06` / `743f131ef1ad`) |
| `deals-tabelle` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`cbc08e29cb98` / `8d2124aacce8`) |
| `deals-tabelle` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`90cfc93075d9` / `bdf3e054d0c1`) |
| `deals-tabelle` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`37763450310f` / `fc2e3138e94d`) |
| `deals-tabelle` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`bae9ccd004d1` / `96448e50df07`) |
| `deals-tabelle` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`34593cf7a363` / `c0eedc979e7d`) |
| `deals-kanban` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`3061a1b9f81c` / `ec01905d8761`) |
| `deals-kanban` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`98983a21e8c2` / `07bbe02470a3`) |
| `deals-kanban` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`f85e76cee0de` / `b81d835ed84c`) |
| `deals-kanban` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`00530bad2fd4` / `344a742a4a3a`) |
| `deals-kanban` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`7b8c32e32e42` / `37ff95288852`) |
| `deals-kanban` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`34593cf7a363` / `75ffb557b85c`) |
| `deals-kanban-menu` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`a9a844646cc0` / `1c6d199ebb7e`) |
| `deals-kanban-menu` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`037d04154149` / `759229150121`) |
| `deals-kanban-menu` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`cfca9f9f18c0` / `f18f1f0587b2`) |
| `deals-kanban-menu` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`c41186b1be3f` / `3c41b58585b1`) |
| `deals-kanban-menu` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`7b8c32e32e42` / `e33da72fa94a`) |
| `deals-kanban-menu` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`4462eeebf797` / `0716403b3955`) |

## Zusammenfassung

- **Gesamtanzahl Vorher/Nachher-Paare:** 18
- **Verschiedene Aufnahmen:** 18 / 18 (100 %)
- **Überlauf-Status:** 0 px Überlauf in allen Nachher-Aufnahmen
- **Status:** ✅ ALLE GATES BESTANDEN

### Änderungen gegenüber Baseline d3fe131:
- Barrierefreier Ansichten-Umschalter (Tabelle ⟷ Kanban) in der Deal-Pipeline-Toolbar mit `aria-label` auf allen Breakpoints
- Interaktives Deals-Kanban-Board mit den 7 Vertriebsphasen, Phasen-Dealzählern und kumulierten Summen in Euro
- Drag & Drop und tastaturbedienbares Portal-Phasenmenü außerhalb des Karten-Stacking-Contexts
- Erhalt von Phasenwechseln über Ansichtswechsel hinaus mit Session-Persistenz und CSV-Export-Synchronisation
- Unterstützung für Nachladen weiterer Deals-Seiten mit expliziter Teilsummenkennzeichnung im Kanban-Modus
- Korrekte Fälligkeitsprüfung auf Kalendertag-Ebene
