# Auftrag 085 – Funnel-Werte (F08), Vorher/Nachher

Erzeugt mit `scripts/captureAuftrag085FunnelText.mjs` gegen den Produktionsbuild (lokales Supabase,
`admin-a@e2e.local`). Vorher = `main` vor Auftrag 085, Nachher = Branch `claude/auftrag-085-funnel-wahrheit`.
Bilder bleiben lokal (`.gitignore`).

Sichtbar ist weiterhin das Original-Bild (`PAGE_PRESENTATION = 'bild'`); die sichtbare Seite ändert sich
erst mit Welle G1. Deshalb ist ein **gleicher** Hash des sichtbaren Funnel-Inhalts (Bildelement) Teil des
Gates. Der Ganzseiten-Hash wird nur berichtet: Er schwankt von Lauf zu Lauf durch Kantenglättung der
Shell-Schrift (Seitenleiste, Simulationsleiste) auch bei unverändertem Stand. Geprüft wird außerdem die
Textschicht für Screenreader: nachher alle Sollwerte (29,1 % der Leads · 37,2 % der MQL · 56,3 % der SQL · Win Rate 43,5 % · 108 Angebote · 47 Neukunden), keiner der alten Werte.

| Aufnahme | Alte Werte vorher | Textschicht nachher | Funnel-Inhalt (Gate) | Ganze Seite (Info) | Überlauf Dokument/`<main>` | axe | OK |
|---|---|---|---|---|---|---|---|
| funnel-1440-dark | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (ab3cf1410ad3) | gleich | 0/0 px | 0 | ✅ |
| funnel-1440-light | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (ab3cf1410ad3) | verschieden | 0/0 px | 0 | ✅ |
| funnel-768-dark | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (660ee44f0c84) | gleich | 0/0 px | 0 | ✅ |
| funnel-768-light | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (cba0ef72315b) | verschieden | 0/0 px | 0 | ✅ |
| funnel-375-dark | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (f4ffbd24c031) | verschieden | 0/0 px | 0 | ✅ |
| funnel-375-light | 29 % der Leads, 38 % der MQL, 56 % der SQL, Win Rate 43 %, 108 Leads, 47 Leads | 6/6, verboten 0 | gleich (07cd3d5c296f) | gleich | 0/0 px | 0 | ✅ |

**Ergebnis:** 6/6 Aufnahmen bestanden.
