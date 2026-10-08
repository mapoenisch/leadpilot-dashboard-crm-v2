# Auftrag 084 – Pipeline-Fehlerzustand (F12), Vorher/Nachher

Erzeugt mit `scripts/captureAuftrag084PipelineStates.mjs`. `crm-query-export` antwortet kontrolliert
mit 500 (`SERVER_ERROR`), Preflights passieren. Vorher = `main` vor Auftrag 084, Nachher = Branch
`claude/auftrag-084-pipeline-fehler`. Produktionsbuild gegen lokales Supabase, `admin-a@e2e.local`.
Bilder bleiben lokal (`.gitignore`). axe: serious/critical über die **ganze Seite**. Überlauf: Dokument/`<main>`.

## Fehlerzustand je Seite, Breite und Theme

| Aufnahme | Anzahl vorher | Anzahl nachher | Export | Erneut versuchen | axe | Überlauf | SHA vorher | SHA nachher | OK |
|---|---|---|---|---|---|---|---|---|---|
| deals-1440-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | d276ed350e54 | 765ef385826d | ✅ |
| companies-1440-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 3fcc9ddffff4 | 8c339d057436 | ✅ |
| leads-1440-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 755360a90341 | b37ef62f3d3d | ✅ |
| deals-1440-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 26043997c959 | 1e554632cb03 | ✅ |
| companies-1440-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 7e6f1385fbfd | 95e89bbf3133 | ✅ |
| leads-1440-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 40d3dc894aeb | 6a45926c1687 | ✅ |
| deals-768-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 1d25ed486c2a | 550b838b68bf | ✅ |
| companies-768-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5c2bd43a984f | 91615f28397c | ✅ |
| leads-768-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 9defca0e6d51 | 3dbb9e6bb02c | ✅ |
| deals-768-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 3b07a16e2614 | afb88be51908 | ✅ |
| companies-768-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5f5df798c59e | 50b86bd66a16 | ✅ |
| leads-768-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | c7e212a47fea | cecd371d3fa3 | ✅ |
| deals-375-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 7ab8e7ce14d1 | 93cffea52f67 | ✅ |
| companies-375-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5c6073d042cf | 4cbb609d33b8 | ✅ |
| leads-375-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | a86fa47041a7 | bed2d6656b0a | ✅ |
| deals-375-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 15c42ee80205 | dfdbf57a5da3 | ✅ |
| companies-375-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | e3f88075164b | 2be92fee6024 | ✅ |
| leads-375-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | af0e3b419507 | b5320858f907 | ✅ |

## Navigation im Fehlerzustand: Pipeline → Unternehmenssteckbrief

Kopfzeilen-Überschrift 3 s nach dem Wechsel (Adresse wechselt in beiden Ständen auf `/company/profile`).

| Breite | Vorher | Nachher | OK |
|---|---|---|---|
| 1440 | Deal Pipeline | Unternehmenssteckbrief | ✅ |
| 768 | Deal Pipeline | Unternehmenssteckbrief | ✅ |
| 375 | Deal Pipeline | Unternehmenssteckbrief | ✅ |

**Ergebnis:** 18/18 Aufnahmen und 3/3 Navigationsfälle bestanden.
