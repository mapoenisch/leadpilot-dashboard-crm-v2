# Auftrag 077 – Screenshot- und Ablaufnachweis (Kachel-Details, Integration unter /dashboard)

Erzeugt: 2026-10-05T21:14:12.927Z mit `scripts/captureAuftrag077Screenshots.mjs` gegen drei Builds mit lokalem Supabase: Nachher (Schalter an), Schalter aus, Vorher (Baseline `7a60dd8`). Bilder bleiben lokal.

## Ergebnis

- Vorher/Nachher-Paare unterschiedlich: ja
- Größter Seitenüberlauf: 0 px
- axe serious/critical gesamt: 0
- Größte Layoutverschiebung (CLS): 0.014
- Ansicht: 1440 px 24 Kacheln, 768 px 24 Kacheln, 375 px 24 Kacheln
- Bearbeiten, gesperrte „Details“: 1440 px 24, 768 px 24, 375 px 24
- Schalter aus: Überschriften wie vorher ja, keine persönliche Ansicht ja, Detailroute 404 ja
- Tastatur: Fokus auf Überschrift ja, Rückkehr auf „Details“ von `std_baseline_umsatz`

## Vorher/Nachher

| Breite | Seite | Vorher | Nachher | verschieden |
|---:|---|---|---|---|
| 1440 | `/dashboard` | 6360dd1f5ec3b1c1 | d516c8f0be587d05 | ja |
| 1440 | `/dashboard/tiles/std_baseline_umsatz` | 32760dbf07b8398c | a329d41250ffdf91 | ja |
| 768 | `/dashboard` | 56a8f6de578d7e95 | 37bdf735973c4bac | ja |
| 768 | `/dashboard/tiles/std_baseline_umsatz` | 4141a9ef85698ca2 | f29b5a6222f4c1fb | ja |
| 375 | `/dashboard` | 089ce0d46e13f9c6 | 8f1381967eed7cf9 | ja |
| 375 | `/dashboard/tiles/std_baseline_umsatz` | 1be8bbb2b604b9f4 | 9f3c9917d73cf54d | ja |

## Zustände (Nachher)

| Breite | Zustand | Überlauf | axe serious/critical | CLS | SHA-256 (gekürzt) |
|---:|---|---:|---|---:|---|
| 1440 | Ansicht 24 Kacheln | 0 px | keine | 0 | d516c8f0be587d05 |
| 1440 | Bearbeiten | 0 px | keine | 0 | 70fa59032bbf0149 |
| 1440 | Details Kennzahl | 0 px | keine | 0 | a329d41250ffdf91 |
| 1440 | Details Diagramm | 0 px | keine | 0 | 47088995d3982a3d |
| 1440 | Details Kombination | 0 px | keine | 0 | b30b5894bf486832 |
| 1440 | Details CRM | 0 px | keine | 0.014 | 92370410db199881 |
| 1440 | Details Übersicht | 0 px | keine | 0 | c52fc5ac0b906bb6 |
| 1440 | Details unbekannte Kachel | 0 px | keine | 0 | cd0b03e2f6f51f69 |
| 768 | Ansicht 24 Kacheln | 0 px | keine | 0 | 37bdf735973c4bac |
| 768 | Bearbeiten | 0 px | keine | 0 | 1e50359be331732f |
| 768 | Details Kennzahl | 0 px | keine | 0 | f29b5a6222f4c1fb |
| 768 | Details Diagramm | 0 px | keine | 0 | 593063d721215dbd |
| 768 | Details Kombination | 0 px | keine | 0 | 7e1df62634c9664f |
| 768 | Details CRM | 0 px | keine | 0 | 44eb045dd1d8e28f |
| 768 | Details Übersicht | 0 px | keine | 0 | c97ee820423431a3 |
| 768 | Details unbekannte Kachel | 0 px | keine | 0 | 65f691e927204cf8 |
| 375 | Ansicht 24 Kacheln | 0 px | keine | 0 | 8f1381967eed7cf9 |
| 375 | Bearbeiten | 0 px | keine | 0 | 7f0a8cf037157208 |
| 375 | Details Kennzahl | 0 px | keine | 0 | 9f3c9917d73cf54d |
| 375 | Details Diagramm | 0 px | keine | 0 | b060fb67a5e4f36c |
| 375 | Details Kombination | 0 px | keine | 0 | 6e2bc42cdb0f03d7 |
| 375 | Details CRM | 0 px | keine | 0 | d8ce792112125e76 |
| 375 | Details Übersicht | 0 px | keine | 0 | b2e270ee95a746bb |
| 375 | Details unbekannte Kachel | 0 px | keine | 0 | 0fec89785c8c30da |
