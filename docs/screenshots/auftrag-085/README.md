# Auftrag 085 – Funnel-Werte (F08), Vorher/Nachher

Erzeugt mit `scripts/captureAuftrag085FunnelText.mjs` gegen den Produktionsbuild (lokales Supabase,
`admin-a@e2e.local`). Vorher = `main` vor Auftrag 085, Nachher = Branch `claude/auftrag-085-funnel-wahrheit`.
Bilder bleiben lokal (`.gitignore`).

Sichtbar ist weiterhin das Original-Bild (`PAGE_PRESENTATION = 'bild'`); die sichtbare Seite ändert sich
erst mit Welle G1. Deshalb ist **gleicher** Screenshot-Hash hier das erwartete Ergebnis. Geprüft wird die
Textschicht für Screenreader: nachher alle Sollwerte (29,1 % der Leads · 37,2 % der MQL · 56,3 % der SQL · Win Rate 43,5 % · 108 Angebote · 47 Neukunden), keiner der alten Werte.

| Aufnahme | Alte Werte vorher | Textschicht nachher | Screenshot | Überlauf Dokument/`<main>` | axe | OK |
|---|---|---|---|---|---|---|
| funnel-1440-dark | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (6494412bde22) | 0/0 px | 0 | ✅ |
| funnel-1440-light | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (6c2825257d54) | 0/0 px | 0 | ✅ |
| funnel-768-dark | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (c0149d300d83) | 0/0 px | 0 | ✅ |
| funnel-768-light | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (51c703b494d7) | 0/0 px | 0 | ✅ |
| funnel-375-dark | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (a2dfd660a914) | 0/0 px | 0 | ✅ |
| funnel-375-light | 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (ed008f99b6b0) | 0/0 px | 0 | ✅ |

**Ergebnis:** 6/6 Aufnahmen bestanden.
