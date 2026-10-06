# Auftrag 079 – Gesamtabnahme Executive Dashboard (Bildmatrix und Abläufe)

Erzeugt: 2026-10-06T13:09:30.028Z mit `scripts/captureAuftrag079Screenshots.mjs` gegen zwei Builds desselben Codes mit lokalem Supabase: Nachher (Schalter an) und Vorher (Schalter aus, bisherige Ansicht). 48 aktive Katalogeinträge in 4 Durchgängen (Katalog 1: 24, Katalog 2: 24, Darstellungen 1: 22, Darstellungen 2: 6). Reduzierte Bewegung emuliert. Bilder bleiben lokal.

## Ergebnis

- Vorher/Nachher verschieden: ja
- Überlauf 0 px: ja
- axe serious/critical 0: ja
- CLS < 0,1: ja
- alle Kacheln da und aktiv: ja
- Datentabelle je Diagramm: ja
- reduzierte Bewegung ≤ 0,01 ms: ja
- Schalter aus: alte Ansicht, Detailroute 404: ja
- Tastatur: verschieben, Dialog, Fokus, speichern: ja
- Touch: Legende, Details, zurück: ja

Tastatur: verschoben ja, Konfigurator geöffnet ja, Fokus zurück auf „Bearbeiten“ ja, gespeichert ja. Touch: Legende ja, Details ja, zurück ja.

## Vorher/Nachher (`/dashboard`)

| Breite | Vorher (Schalter aus) | Nachher (Schalter an) | verschieden |
|---:|---|---|---|
| 1440 | a54840d9347f8694 | 1788377124be1ce4 | ja |
| 768 | d3760b0d09814fc2 | c84cc3bc71770cbd | ja |
| 375 | d53551b571f3b60d | 49af2e9ad0ef912b | ja |

## Durchgänge (Nachher)

| Breite | Durchgang | Kacheln (aktiv) | Diagramme mit Tabelle | Überlauf | axe serious/critical | CLS | Übergang max. | SHA-256 (gekürzt) |
|---:|---|---|---|---:|---|---:|---:|---|
| 1440 | Katalog 1 | 24/24 (24) | 4/4 | 0 px | keine | 0.001 | 0.01 ms | 1788377124be1ce4 |
| 1440 | Katalog 1 Bearbeiten | – | – | 0 px | keine | 0.001 | – | 8b554f7775c9d52a |
| 768 | Katalog 1 | 24/24 (24) | 4/4 | 0 px | keine | 0.001 | 0.01 ms | c84cc3bc71770cbd |
| 768 | Katalog 1 Bearbeiten | – | – | 0 px | keine | 0.001 | – | 4a7c95094efcbc12 |
| 375 | Katalog 1 | 24/24 (24) | 4/4 | 0 px | keine | 0 | 0.01 ms | 49af2e9ad0ef912b |
| 375 | Katalog 1 Bearbeiten | – | – | 0 px | keine | 0 | – | f7a5b454e50aa87e |
| 1440 | Katalog 2 | 24/24 (24) | 11/11 | 0 px | keine | 0.004 | 0.01 ms | 84b0d81fe4323f2f |
| 768 | Katalog 2 | 24/24 (24) | 11/11 | 0 px | keine | 0.007 | 0.01 ms | 718996e099445a16 |
| 375 | Katalog 2 | 24/24 (24) | 11/11 | 0 px | keine | 0.014 | 0.01 ms | 410208bbc36e9064 |
| 1440 | Darstellungen 1 | 22/22 (22) | 15/15 | 0 px | keine | 0.001 | 0.01 ms | 2ae11170c595bacd |
| 768 | Darstellungen 1 | 22/22 (22) | 15/15 | 0 px | keine | 0.001 | 0.01 ms | 01c126bffa34ded0 |
| 375 | Darstellungen 1 | 22/22 (22) | 15/15 | 0 px | keine | 0.013 | 0.01 ms | 752cf7cc117bddf6 |
| 1440 | Darstellungen 2 | 6/6 (6) | 3/3 | 0 px | keine | 0.001 | 0.01 ms | 279c1510c06f793e |
| 768 | Darstellungen 2 | 6/6 (6) | 3/3 | 0 px | keine | 0.001 | 0.01 ms | 4735913cda03c603 |
| 375 | Darstellungen 2 | 6/6 (6) | 3/3 | 0 px | keine | 0.013 | 0.01 ms | 1f8138b468b1e183 |
