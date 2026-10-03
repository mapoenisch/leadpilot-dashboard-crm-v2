# Separater CI-Auftrag: Zweite Automatisierung – Antigravity baut, Claude prüft

**Stand:** 03.10.2026

**Basis:** `main` (`d8805d9`, nach PR #47)

**Auftraggeber:** Marc Poenisch (Entscheidung vom 03.10.2026: „zweite Automatisierung, bei der
Claude die Reviews macht und Antigravity den Code schreibt“, als Ausweichbetrieb, wenn das
Nutzungslimit von Codex erreicht ist). **Builder dieses Auftrags:** Claude
Code. **Prüfer:** Codex (Diff und CI). **Merge:** nur Marc.

**Abgrenzung:** Kein Dashboard-Umbau, keine Produktionslogik. Keine Änderung an `ci.yml`, an
`claude.yml`, an der Vitest-Konfiguration oder an den Schutzbereichen aus `CLAUDE.md` §6. Der
bestehende Zyklus 1 (Claude baut, Codex prüft) bleibt unverändert, außer der Abgrenzung für
`antigravity/*`.

## Ziel

Ein zweiter, eigenständiger Kreislauf als Ausweichbetrieb für Zyklus 1, solange Codex wegen
seines Nutzungslimits nicht prüfen kann:

1. Antigravity baut lokal auf einem Branch `antigravity/*` und pusht.
2. Claude prüft jeden neuen Head automatisch in GitHub Actions (Gates, Auftrag, Schutzbereiche).
3. Der Befund steht als PR-Kommentar und als Commit-Status `claude-review` im PR.
4. Marc holt den Befund lokal mit `npm run antigravity:inbox` nach `handoff/inbox.md` und startet
   Antigravity mit „weiter“. Antigravity arbeitet nach und pusht, weiter mit Schritt 2.

Antigravity läuft lokal und ist aus GitHub nicht startbar; deshalb ist der Rückkanal ein lokales
Abholskript (Entscheidung Marc). Höchstens fünf Runden pro PR. Claude merged nie und gibt nie frei.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `.github/workflows/claude-review.yml` | Neu: Gate, Review durch Claude, Veröffentlichung. |
| `scripts/claudeReviewCycle.mjs` | Neu: Entscheidungslogik, Veröffentlichung, lokales Abholen. |
| `scripts/__tests__/claudeReviewCycle.vitest.ts` | Neu: Tests der Logik und der Workflow-Verträge. |
| `scripts/codexReviewCycle.mjs` | Abgrenzung: kein Codex-Request, keine Claude-Nacharbeit auf `antigravity/*`. |
| `scripts/__tests__/codexReviewCycle.vitest.ts` | Tests der Abgrenzung. |
| `package.json` | Skript `antigravity:inbox`. |
| `.gitignore` | `handoff/`, `.claude-review/`. |
| `AGENTS.md` | Abschnitt „Handoff-Protokoll“ für Antigravity, Hinweis auf Zyklus 2. |
| `CLAUDE.md` | §4: Entscheidung Marc vom 03.10.2026. |
| `docs/dashboard/REVIEW_WORKFLOW_ANTIGRAVITY.md` | Neu: Ablauf, Grenzen, Bedienung. |
| `docs/dashboard/REVIEW_WORKFLOW.md` | Verweis auf Zyklus 2. |
| `docs/dashboard/AGENT_SETUP.md` | Rechte und Secret-Nutzung von `claude-review.yml`. |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CLAUDE_REVIEW_ANTIGRAVITY.md` | Diese Auftragsdatei. |
| `docs/BUILD_LOG.md` | Builder-Nachweis. |

## Anforderungen und Umsetzung

- [x] **Auslöser:** `pull_request` (`opened`, `synchronize`, `reopened`, `ready_for_review`) nur für
  Branches `antigravity/*` aus diesem Repository; Label `claude-review` und `workflow_dispatch`
  prüfen auch andere Team-PRs und Entwürfe. Kein `pull_request_target`.
- [x] **Keine Doppelprüfung:** je Head-SHA höchstens ein Review (Markierung von
  `github-actions[bot]`), `concurrency` je PR ohne Abbruch laufender Läufe.
- [x] **Rundenlimit:** fünf Runden pro PR, danach einmaliger Hinweis an `@mapoenisch`.
- [x] **Rechtetrennung:** PR-Code nur im Job `review` mit Leserechten, `persist-credentials: false`,
  `npm ci --ignore-scripts`, Lese-Token für die Claude-Action. Claude darf nur lesen, Gates fahren
  und nach `.claude-review/` schreiben. `gate` und `publish` laden die Logik vom Default-Branch.
- [x] **Eindeutiges Ergebnis:** Claude endet mit genau einer Zeile `ERGEBNIS: BEFUNDE` oder
  `ERGEBNIS: KEINE BEFUNDE`. Fehlt sie oder ist sie mehrdeutig, Status `error`, nie `success`.
- [x] **Entschärfung:** HTML-Kommentare und `@claude`/`@codex` im Befund werden vor dem
  Veröffentlichen neutralisiert.
- [x] **Rückkanal:** `npm run antigravity:inbox` liest den jüngsten Review zum aktuellen Head und
  schreibt `handoff/inbox.md`; liegt zum Head noch keiner vor, schreibt es nichts (Exit 2).
- [x] **GitHub-MCP (Nachtrag 03.10.2026, Entscheidung Marc):** Antigravity liest den Befund
  selbst über seinen GitHub-MCP (jüngster Markierungskommentar von `github-actions[bot]` zum
  aktuellen Head) und öffnet seinen PR selbst; `antigravity:inbox` bleibt Rückfallebene. Verbote
  für den MCP stehen in `AGENTS.md`.
- [x] **Keine Kollision mit Zyklus 1:** `codexReviewCycle.mjs` überspringt `antigravity/*` bei
  Review-Anforderung und Nacharbeit.
- [x] **Tests:** im vorhandenen Include-Muster `scripts/__tests__/**/*.vitest.ts`.

## Offene Punkte (nicht Teil dieses Auftrags)

- Umschalten geschieht über den Branch-Namen (`antigravity/*`), nicht automatisch. Eine
  automatische Erkennung des Codex-Limits ist nicht Teil dieses Auftrags.
- Funktionsnachweis Ende-zu-Ende erst nach dem Merge möglich, weil der Workflow seine Logik vom
  Default-Branch lädt.
