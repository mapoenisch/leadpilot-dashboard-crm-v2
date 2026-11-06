# Auftrag 129 – Visuelle Gate-Prüfung CRM Deals Pipeline (Vorher/Nachher)

Vorher: `d3fe131` (main), Nachher: Stand dieses Branches. Aufgenommen 2026-11-06, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).
Basis-URL: http://localhost:3000
Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).

| Szenario | Theme | Breite | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild (Diff) |
|---|---|---|---|---|---|---|
| `deals-tabelle` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`437cbb2ae1c8` / `f3f5111b3719`) |
| `deals-tabelle` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`d500e620ae29` / `6e26be92dd45`) |
| `deals-tabelle` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`7a9a550cc47b` / `9e4fc6a510a1`) |
| `deals-tabelle` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1175 px | verschieden (`e89a40b3344a` / `1a6c80e979ac`) |
| `deals-tabelle` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1626 px | verschieden (`200cdf5208b8` / `e507bdfe3773`) |
| `deals-tabelle` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 3193 px | verschieden (`5aff306f7486` / `245c0f02d128`) |
| `deals-kanban` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`08039c061bbc` / `a66976e5b2d8`) |
| `deals-kanban` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`d500e620ae29` / `a1173e7050eb`) |
| `deals-kanban` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`870f187f31bd` / `3d7f104cf8c4`) |
| `deals-kanban` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`e89a40b3344a` / `51104883928e`) |
| `deals-kanban` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`21b48ab9266c` / `f417460dd129`) |
| `deals-kanban` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`5aff306f7486` / `9bbe5c8273b8`) |
| `deals-kanban-menu` | `dark` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`08039c061bbc` / `86a0283e4fd5`) |
| `deals-kanban-menu` | `dark` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`b4a77a127653` / `522952d831d2`) |
| `deals-kanban-menu` | `dark` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`870f187f31bd` / `f13b58f7c098`) |
| `deals-kanban-menu` | `light` | 1440 px | 0/0 px | 0/0 px | 1150 → 1047 px | verschieden (`72669e65e036` / `bfa21759dec9`) |
| `deals-kanban-menu` | `light` | 768 px | 0/0 px | 0/0 px | 1600 → 1271 px | verschieden (`21b48ab9266c` / `e33da72fa94a`) |
| `deals-kanban-menu` | `light` | 375 px | 0/0 px | 0/0 px | 3168 → 2031 px | verschieden (`eb5f207da879` / `0716403b3955`) |

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
