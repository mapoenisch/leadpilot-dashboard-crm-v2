# Auftrag 112 – Screenshot-Matrix (Paket H Teil 8)

Vorher = `origin/main` (49a0b0d), Nachher = Branch. Bilder lokal, nicht committet.

| Ansicht | Breite | Hash verschieden | Überlauf vorher/nachher |
| --- | --- | --- | --- |
| /crm-leads | 1440 px | ja | 0 / 0 px |
| /crm-deals | 1440 px | ja | 0 / 0 px |
| /crm-leads | 768 px | ja | 0 / 0 px |
| /crm-deals | 768 px | ja | 0 / 0 px |
| /crm-leads | 375 px | ja | 0 / 0 px |
| /crm-deals | 375 px | ja | 0 / 0 px |

Ergebnis: 6/6 Paare verschieden, 0 px Überlauf. Sichtprüfung CRM Leads 1440 px: neue Texte sichtbar; das Herkunfts-Badge „SUPABASE CRM“ stammt aus `sourceFreshness.ts` (Schutzbereich) und bleibt offen.
