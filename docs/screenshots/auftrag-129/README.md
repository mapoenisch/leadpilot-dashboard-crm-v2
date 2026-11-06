# Auftrag 129 – Visuelle Gate-Prüfung CRM Deals Pipeline (Vorher/Nachher)

Vorher: `d3fe131` (main), Nachher: Stand dieses Branches. Aufgenommen 2026-11-06, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Basis-URL: http://localhost:3000
Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).

| Szenario | Theme | Breite | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild (Diff) |
|---|---|---|---|---|---|---|
| `deals-tabelle` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`754d8e1dabf8` / `5304161277e2`) |
| `deals-tabelle` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`b0a8eb96fa53` / `a6046fc9f936`) |
| `deals-tabelle` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`4e9455fefde2` / `575786f40606`) |
| `deals-tabelle` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`9d56dcfa8c2b` / `5793af0c963d`) |
| `deals-tabelle` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`7660ed84c3d6` / `c1ba5c9f25be`) |
| `deals-tabelle` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`8484efe582ac` / `364efbdd166d`) |
| `deals-kanban` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`3c6b09cf65eb` / `186121ecdb78`) |
| `deals-kanban` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`f55ee5616478` / `529270577e5b`) |
| `deals-kanban` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`b56aec9625f7` / `1f130a8b4539`) |
| `deals-kanban` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`6ad4dd852a96` / `0d9be86ab373`) |
| `deals-kanban` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`cc2c2950330e` / `2077aa21a76f`) |
| `deals-kanban` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`d5be675cf967` / `c653a0d2b2ab`) |
| `deals-kanban-menu` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`3c6b09cf65eb` / `d464c37d1e52`) |
| `deals-kanban-menu` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`f17dfeded345` / `522952d831d2`) |
| `deals-kanban-menu` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`b56aec9625f7` / `f13b58f7c098`) |
| `deals-kanban-menu` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`6bda5a17671b` / `0a5b04488285`) |
| `deals-kanban-menu` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`cc2c2950330e` / `e33da72fa94a`) |
| `deals-kanban-menu` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`586d5c8302f8` / `0716403b3955`) |

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
