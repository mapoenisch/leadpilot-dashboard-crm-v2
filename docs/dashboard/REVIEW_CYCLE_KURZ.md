# Review-Zyklus in Kürze

Stand: 01.10.2026. Ausführlich: `docs/dashboard/REVIEW_WORKFLOW.md`.

1. Claude baut auf einem PR-Branch und pusht.
2. Codex prüft den Head-Commit. Liegt 20 Minuten nach dem Head-Commit weder ein Review noch
   eine Reaktion von Codex vor, fordert der Workflow `codex-review-request.yml` den Review mit
   `@codex review` an, je Head-SHA höchstens einmal. Reagiert Codex nur, liefert aber kein
   Ergebnis, löst das nichts aus. Dann schreibt Marc nach 30 Minuten ohne Ergebnis selbst
   `@codex review` in den PR (verbindlicher Rückfall).
3. Meldet der Codex-Bot Befunde, arbeitet Claude sie gesammelt nach. Der Job `rework` hat nur
   Leserechte und erzeugt lokale Commits. Erst der getrennte Job `publish` prüft Bundle,
   Fast-Forward und Schutzpfade und pusht dann auf den PR-Branch.
4. Pro PR laufen höchstens drei automatische Nacharbeitsrunden. Danach wird Marc im PR
   informiert.
5. Merge und Freigabe bleiben bei Marc.
