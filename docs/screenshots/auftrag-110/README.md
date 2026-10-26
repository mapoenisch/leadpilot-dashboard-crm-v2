# Auftrag 110 – Screenshot-Matrix (Paket H Teil 6)

Skript: `scripts/captureAuftrag110Screenshots.mjs` (SUPABASE_MOCK=1). Vorher = `main` (ad0d433), Nachher = Branch `claude/auftrag-110-paket-h-teil6`. Bilder lokal, nicht committet.

| Ansicht | Breite | SHA vorher | SHA nachher | verschieden | Überlauf px vorher / nachher |
| --- | --- | --- | --- | --- | --- |
| /crm/live-simulation (Detail-Ebene) | 1440 | 97bfef58e5aa | 28705eaec4f3 | ja | 0 / 0 |
| /crm/live-simulation (Detail-Ebene) | 768 | f7ce904f1d7f | d1b169f1075d | ja | 0 / 0 |
| /crm/live-simulation (Detail-Ebene) | 375 | 5135ff5cd64b | 5a16b180f2f8 | ja | 181 / 181 |

**Überlauf 375 px:** 181 px vorher wie nachher, bestand schon auf `main`, durch diesen Auftrag unverändert. Ursache hier nicht untersucht, bleibt für Paket I offen.
