# Auftrag 113 – Screenshot-Matrix (Paket H Teil 9)

Vorher = `origin/main` (Stand nach PR #104), Nachher = Branch. Bilder lokal, nicht committet. Lauf mit `SUPABASE_MOCK=1` (Ladezustand der CRM-Daten).

| Ansicht | Breite | Hash verschieden | Überlauf vorher/nachher |
| --- | --- | --- | --- |
| /crm/activities | 1440 px | ja | 0 / 0 px |
| /company/data-basis | 1440 px | ja | 0 / 0 px |
| /crm/activities | 768 px | ja | 0 / 0 px |
| /company/data-basis | 768 px | ja | 0 / 0 px |
| /crm/activities | 375 px | ja | 0 / 0 px |
| /company/data-basis | 375 px | ja | 0 / 0 px |

Ergebnis: 6/6 Paare verschieden, 0 px Überlauf. Sichtprüfung Aktivitäten 1440 px: neuer Ladetext „Aktivitäten werden aus den CRM-Daten geladen …“. Die Quellenbeschriftungen „Aus den CRM-Daten“ im Erfolgszustand und der Fehlerzustand sind mit der Attrappe nicht erreichbar und nur durch Komponententests belegt.
