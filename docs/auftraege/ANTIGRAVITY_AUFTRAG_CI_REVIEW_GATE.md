# Auftrag CI – Manuelle Agenten-Reviews über MarcReview

Stand: 21.10.2026 (ersetzt den Review-Gate-Stand vom 19./20.10.2026) · Auftraggeber: Marc Poenisch · Builder: Claude Code · Prüfer: unabhängig (Codex o. a.)

## Ziel

Antigravity, OpenCode, Devin, Proto und Perplexity prüfen PRs **nur auf Marcs Zuruf** – analog zu `@codex review`. Sie posten über das GitHub-Konto **MarcReview** ein formales Review; jeder Inline-Befund ist eine Konversation, die vor dem Merge gelöst sein muss.

## Bedienung

| Kommentar im PR (nur von `mapoenisch`) | Ablauf |
| --- | --- |
| `/opencode review` | CI: OpenCode-CLI prüft, Review wird gepostet |
| `/devin review` | CI: Devin-API-Session prüft (bis 45 min), Review wird gepostet |
| `/perplexity review` | CI: Perplexity-API (`sonar-pro`) prüft den Diff, Review wird gepostet |
| `/antigravity review` | Desktop-Agent: Workflow bestätigt und postet die Anleitung; lokal `npm run agent-review -- prompt --agent antigravity --pr <n>`, Antigravity arbeitet `handoff/review-<n>-antigravity.md` ab und postet mit `npm run agent-review -- post …` |
| `/proto review` | wie Antigravity, mit `--agent proto` (Proto/ERP.AI hat keinen CI-Betrieb) |

Ergebnis: immer ein `COMMENT`-Review; **jeder Befund ist eine lösbare Konversation** (Zeilenkommentar, Datei-Kommentar oder – bei Dateien außerhalb des Diffs – am ersten Diff-Abschnitt mit Verweis). Kein `APPROVE`/`REQUEST_CHANGES`: alle Agenten posten unter MarcReview, eine Freigabe würde sonst die Änderungsanforderung eines anderen Agenten aufheben. Gepostet wird nur auf den geprüften Head; wurde inzwischen gepusht, bricht der Lauf ab. Ein unvollständig gelieferter Diff wird als P1-Konversation gemeldet. Nach der Nacharbeit erneut `/<agent> review`.

## Umsetzung

| Datei | Zweck |
| --- | --- |
| `.github/workflows/agent-review.yml` | `issue_comment`-Trigger, nur Marc; läuft mit dem Stand von `main`, führt keinen PR-Code aus; Kommentartext nur über `env`. |
| `scripts/agentReview.mjs` | Befehlserkennung, Prompt, Agenten-Aufrufe, Befund-JSON, Review mit Inline-Kommentaren nur auf Diff-Zeilen; CLI `run`, `prompt`, `post`, `ack`. |
| `scripts/__tests__/agentReview.vitest.ts` | Tests für Befehlserkennung, Diff-Zeilen, JSON-Parsing, Review-Aufbau, Workflow-Vertrag. |

Entfernt: `review-gate.yml`, `review-gate-trigger.yml`, `reviewGate.mjs`, `review-agents.json`, `getReviewerToken.mjs`, `.opencode/`-Befehle. Merge-Sperre: Pflicht-Status `agent-review` (setzt erst ein geposteter unabhängiger Lauf auf dem aktuellen Head; `failure`, wenn ein Befund nicht als Konversation verankert werden konnte) plus „Require conversation resolution“ für die Befunde.

## Einrichtung durch Marc (einmalig)

1. **MarcReview** als Collaborator (Rolle Triage oder Write) einladen und annehmen.
2. Mit MarcReview einen Fine-grained PAT nur für dieses Repo anlegen: *Pull requests* Read & Write, *Issues* Read & Write, *Commit statuses* Read & Write, *Contents* Read. Als Secret `MARCREVIEW_TOKEN` speichern; lokal als Umgebungsvariable `MARCREVIEW_TOKEN` (nicht ins Repo).
3. Secrets: `PERPLEXITY_API_KEY`, `DEVIN_API_KEY`, `OPENCODE_ANTHROPIC_API_KEY`. Optional Variable `OPENCODE_MODEL`. Die OpenCode-Version ist im Workflow fest gepinnt; ein Update läuft als normaler PR.
4. Branch-Schutz für `main`: *Require a pull request* (0 Freigaben), *Require conversation resolution before merging*, Pflicht-Status-Checks `ci` und `agent-review`. Alten Pflicht-Check `review-conversations` entfernen.
5. **Automatische Reviews abschalten:** In den Codex-Einstellungen (chatgpt.com/codex → Settings → Code review) „Automatic reviews“ für dieses Repo aus – dann reagiert Codex nur noch auf `@codex review`. Antigravity/OpenCode lokal nicht mehr mit Marcs `gh`-Login posten lassen (dessen Reviews sind reine Textkommentare ohne Konversation).

## Restrisiken

- Alle Agenten posten unter **einem** Konto; welcher Agent geprüft hat, steht im Review-Titel.
- Devin-API und OpenCode-CLI-Aufrufe sind nach Doku gebaut, aber erst mit echten Keys live geprüft.
- Perplexity sieht nur den Diff, nicht das ganze Repo.
