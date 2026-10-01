# Review-Zyklus in Kürze

Stand: 01.10.2026. Ausführlich: `docs/dashboard/REVIEW_WORKFLOW.md`.

1. Claude baut auf einem PR-Branch und pusht.
2. Codex prüft den Head-Commit. Kommt nach 20 Minuten kein Ergebnis, fordert der Workflow
   `codex-review-request.yml` den Review mit `@codex review` an, je Head-SHA höchstens einmal.
3. Meldet der Codex-Bot Befunde, arbeitet Claude sie gesammelt nach. Claude pusht die
   Korrektur direkt aus dem Nacharbeitsjob auf den PR-Branch.
4. Pro PR laufen höchstens fünf automatische Nacharbeitsrunden. Danach wird Marc im PR
   informiert.
5. Merge und Freigabe bleiben bei Marc.
