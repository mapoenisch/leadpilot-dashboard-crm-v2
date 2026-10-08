# Auftrag 084 – Pipeline-Fehlerzustand (F12), Vorher/Nachher

Erzeugt mit `scripts/captureAuftrag084PipelineStates.mjs`. `crm-query-export` antwortet kontrolliert
mit 500 (`SERVER_ERROR`), Preflights passieren. Vorher = `main` vor Auftrag 084, Nachher = Branch
`claude/auftrag-084-pipeline-fehler`. Produktionsbuild gegen lokales Supabase, `admin-a@e2e.local`.
Bilder bleiben lokal (`.gitignore`). axe: serious/critical über die **ganze Seite**. Überlauf: Dokument/`<main>`.

## Fehlerzustand je Seite, Breite und Theme

| Aufnahme | Anzahl vorher | Anzahl nachher | Export | Erneut versuchen | axe | Überlauf | SHA vorher | SHA nachher | OK |
|---|---|---|---|---|---|---|---|---|---|
| deals-1440-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | d276ed350e54 | 6abf03b4fa7e | ✅ |
| companies-1440-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 3fcc9ddffff4 | e7e0879e640d | ✅ |
| leads-1440-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 755360a90341 | 0a600e13ad7d | ✅ |
| deals-1440-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 26043997c959 | 1bc3d539ba7d | ✅ |
| companies-1440-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 7e6f1385fbfd | 166dc39d7c0d | ✅ |
| leads-1440-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 40d3dc894aeb | cd125da99b5e | ✅ |
| deals-768-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 1d25ed486c2a | 8c598f44e8b4 | ✅ |
| companies-768-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5c2bd43a984f | 022ea9daf703 | ✅ |
| leads-768-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | 9defca0e6d51 | 9b7e2c0a9601 | ✅ |
| deals-768-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 3b07a16e2614 | 22f7cd8aa213 | ✅ |
| companies-768-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5f5df798c59e | a5e45c33eca5 | ✅ |
| leads-768-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/0 px | c7e212a47fea | 19cfdc9375fb | ✅ |
| deals-375-dark | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 7ab8e7ce14d1 | 530c435de14e | ✅ |
| companies-375-dark | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | 5c6073d042cf | 9856eb9712bc | ✅ |
| leads-375-dark | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/14 px | a86fa47041a7 | 863f8fcf3475 | ✅ |
| deals-375-light | 0 Funnel Deals | Nicht verfügbar Funnel Deals | aktiv → gesperrt | ja | 0 | 0/0 px | 15c42ee80205 | d96fb5f66222 | ✅ |
| companies-375-light | 0 B2B Accounts | Nicht verfügbar B2B Accounts | aktiv → gesperrt | ja | 0 | 0/0 px | e3f88075164b | fadca94e8f66 | ✅ |
| leads-375-light | 0 Einträge | Nicht verfügbar Einträge | aktiv → gesperrt | ja | 0 | 0/14 px | af0e3b419507 | 2c19fd8b0310 | ✅ |

## Navigation im Fehlerzustand: Pipeline → Unternehmenssteckbrief

Kopfzeilen-Überschrift 3 s nach dem Wechsel (Adresse wechselt in beiden Ständen auf `/company/profile`).

| Breite | Vorher | Nachher | OK |
|---|---|---|---|
| 1440 | Deal Pipeline | Unternehmenssteckbrief | ✅ |
| 768 | Deal Pipeline | Unternehmenssteckbrief | ✅ |
| 375 | Deal Pipeline | Unternehmenssteckbrief | ✅ |

**Ergebnis:** 18/18 Aufnahmen und 3/3 Navigationsfälle bestanden.
