# Auftrag 077 – Screenshot- und Ablaufnachweis (Kachel-Details, Integration unter /dashboard)

Erzeugt: 2026-10-05T21:48:19.807Z mit `scripts/captureAuftrag077Screenshots.mjs` gegen drei Builds mit lokalem Supabase: Nachher (Schalter an), Schalter aus, Vorher (Baseline `7a60dd8`). Bilder bleiben lokal.

## Ergebnis

- Vorher/Nachher-Paare unterschiedlich: ja
- Größter Seitenüberlauf: 0 px
- axe serious/critical gesamt: 0
- Größte Layoutverschiebung (CLS): 0.019
- Ansicht: 1440 px 24 Kacheln, 768 px 24 Kacheln, 375 px 24 Kacheln
- Bearbeiten, gesperrte „Details“: 1440 px 24, 768 px 24, 375 px 24
- Schalter aus: Überschriften wie vorher ja, keine persönliche Ansicht ja, Detailroute 404 ja
- Tastatur: Fokus auf Überschrift ja, Rückkehr auf „Details“ von `std_baseline_umsatz`

## Vorher/Nachher

| Breite | Seite | Vorher | Nachher | verschieden |
|---:|---|---|---|---|
| 1440 | `/dashboard` | 8d89d6e2bfbb8eaa | d516c8f0be587d05 | ja |
| 1440 | `/dashboard/tiles/std_baseline_umsatz` | 32760dbf07b8398c | 84989db9aa0a2a0f | ja |
| 768 | `/dashboard` | 56a8f6de578d7e95 | 37bdf735973c4bac | ja |
| 768 | `/dashboard/tiles/std_baseline_umsatz` | 4141a9ef85698ca2 | c6b6f02a870a08b1 | ja |
| 375 | `/dashboard` | 089ce0d46e13f9c6 | 8f1381967eed7cf9 | ja |
| 375 | `/dashboard/tiles/std_baseline_umsatz` | 1be8bbb2b604b9f4 | 42d9da8d20b7bdb8 | ja |

## Zustände (Nachher)

| Breite | Zustand | Überlauf | axe serious/critical | CLS | SHA-256 (gekürzt) |
|---:|---|---:|---|---:|---|
| 1440 | Ansicht 24 Kacheln | 0 px | keine | 0 | d516c8f0be587d05 |
| 1440 | Bearbeiten | 0 px | keine | 0 | a0b45dff50fb044f |
| 1440 | Details Kennzahl | 0 px | keine | 0 | 84989db9aa0a2a0f |
| 1440 | Details Diagramm | 0 px | keine | 0 | a8c809acdef48e13 |
| 1440 | Details Kombination | 0 px | keine | 0 | 77073206559f6e3a |
| 1440 | Details CRM | 0 px | keine | 0.014 | d9276c9ab5684fd7 |
| 1440 | Details Übersicht | 0 px | keine | 0 | 4c687d6cb847c5f9 |
| 1440 | Details unbekannte Kachel | 0 px | keine | 0 | cd0b03e2f6f51f69 |
| 768 | Ansicht 24 Kacheln | 0 px | keine | 0 | 37bdf735973c4bac |
| 768 | Bearbeiten | 0 px | keine | 0 | 1e50359be331732f |
| 768 | Details Kennzahl | 0 px | keine | 0 | c6b6f02a870a08b1 |
| 768 | Details Diagramm | 0 px | keine | 0 | 412bcefa95e49c07 |
| 768 | Details Kombination | 0 px | keine | 0 | 87a478ea3f99ad8b |
| 768 | Details CRM | 0 px | keine | 0.019 | 73937055a2c00345 |
| 768 | Details Übersicht | 0 px | keine | 0 | f509affa14dc6c0b |
| 768 | Details unbekannte Kachel | 0 px | keine | 0 | 65f691e927204cf8 |
| 375 | Ansicht 24 Kacheln | 0 px | keine | 0 | 8f1381967eed7cf9 |
| 375 | Bearbeiten | 0 px | keine | 0 | 027c258cbfbb6a36 |
| 375 | Details Kennzahl | 0 px | keine | 0 | 42d9da8d20b7bdb8 |
| 375 | Details Diagramm | 0 px | keine | 0 | b7834bd22cab7a45 |
| 375 | Details Kombination | 0 px | keine | 0 | dafceed60d0d4a2c |
| 375 | Details CRM | 0 px | keine | 0 | 3920e37792341dc1 |
| 375 | Details Übersicht | 0 px | keine | 0 | eb929aaa6948afee |
| 375 | Details unbekannte Kachel | 0 px | keine | 0 | 0fec89785c8c30da |
