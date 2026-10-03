# Review-Zyklus 2: Antigravity baut, Claude prüft, Antigravity arbeitet nach

Ausweichbetrieb für `REVIEW_WORKFLOW.md` (Claude baut, Codex prüft), wenn das Nutzungslimit von
Codex erreicht ist. Entscheidung Marc vom 03.10.2026. Workflow: `.github/workflows/claude-review.yml`, Logik:
`scripts/claudeReviewCycle.mjs`, Auftrag: `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CLAUDE_REVIEW_ANTIGRAVITY.md`.

## Wann umschalten

| Lage | Zyklus |
|---|---|
| Codex verfügbar | Zyklus 1: Claude baut auf `claude/*`, Codex prüft (`REVIEW_WORKFLOW.md`). |
| Codex-Nutzungslimit erreicht | Zyklus 2: Antigravity baut auf `antigravity/*`, Claude prüft (dieses Dokument). |
| Codex wieder verfügbar | Laufende `antigravity/*`-PRs in Zyklus 2 zu Ende bringen, neue Aufträge wieder in Zyklus 1. |

Umgeschaltet wird allein über den Branch-Namen; an den Workflows ist nichts zu ändern.

**Offene Claude-PRs während des Limits** (z. B. ein PR, der auf Codex wartet): nicht per Label
`claude-review` von Claude prüfen lassen. Claude hat sie gebaut, und ein Builder prüft nie seine
eigene Arbeit. Sie warten, bis Codex wieder verfügbar ist.

## Ablauf

1. **Antigravity baut** lokal auf einem Branch `antigravity/<auftrag>` (z. B.
   `antigravity/auftrag-071`), fährt die Gates, schreibt den Builder-Eintrag in
   `docs/BUILD_LOG.md`, pusht und öffnet den PR (Text nennt den Detailauftrag).
2. **Claude prüft automatisch** jeden neuen Head dieses PR (`opened`, `synchronize`, `reopened`,
   `ready_for_review`): Diff gegen die Basis, Auftrag, Gates, Schutzbereichs-Diff.
3. Der Workflow veröffentlicht den Befund als **PR-Kommentar** und setzt den Commit-Status
   **`claude-review`**: `failure` bei Befunden, `success` ohne Befunde, `error` bei unklarem
   Ergebnis, `pending` während des Reviews.
4. **Rückkanal zu Antigravity:** Marc startet Antigravity mit „weiter“. Antigravity liest den
   Befund **selbst über seinen GitHub-MCP** aus dem PR (Regeln in `AGENTS.md`, Abschnitt
   „Handoff-Protokoll“), arbeitet nach und pusht. Der Push startet Schritt 2 erneut.
   **Rückfallebene ohne MCP** (lokal auf Marcs Mac), danach ebenfalls „weiter“:
   ```bash
   git switch antigravity/<auftrag>
   npm run antigravity:inbox      # schreibt handoff/inbox.md
   ```
   GitHub kann Antigravity nicht selbst starten; das „weiter“ bleibt Marcs Schritt.
5. Wiederholung, bis Claude `KEINE BEFUNDE` meldet. **Freigabe und Merge entscheidet Marc.**

Voraussetzung für `antigravity:inbox`: `gh auth login` (oder `GH_TOKEN` gesetzt). Das Skript
findet den PR über den aktuellen Branch; mit `--pr=<Nummer>` lässt er sich festlegen
(`node scripts/claudeReviewCycle.mjs inbox --pr=52`). Liegt zum aktuellen Head noch kein Review
vor, meldet es das mit Exit-Code 2 und schreibt nichts.

## Schutzmechanismen

- **GitHub-MCP von Antigravity:** nur lesen und den eigenen PR öffnen. Mergen, Freigaben,
  Kommentare, Labels und Workflow-Änderungen sind Antigravity verboten (`AGENTS.md`). Empfehlung,
  damit das auch technisch gilt: dem MCP einen Fine-grained Token nur für dieses Repository geben
  mit `Contents: Read-only`, `Pull requests: Read and write`, `Metadata: Read-only`. Ohne
  Schreibrecht auf Contents kann der MCP nicht mergen und keine Dateien ändern; gepusht wird
  weiter über Git mit Marcs normalem Zugang.
- **Nur eigene Branches:** automatisch nur `antigravity/*` aus diesem Repository, keine Forks.
- **Je Head höchstens ein Review**, erkannt an der Markierung
  `<!-- claude-review-cycle:review round=N sha=… verdict=… -->` von `github-actions[bot]`.
  Markierungen von Menschen oder anderen Bots zählen nicht.
- **Höchstens 5 Runden pro PR**, danach ein einmaliger Hinweis an `@mapoenisch`.
- **Rechtetrennung:** Nur der Job `review` führt PR-Code aus (`npm ci --ignore-scripts`), mit
  Leserechten und ohne gespeicherte Zugangsdaten. Claude darf dort nur lesen, Gates fahren und nach
  `.claude-review/` schreiben; kein Commit, Push, Merge, Review oder Kommentar. `gate` und
  `publish` laden ihre Logik vom Default-Branch und führen keinen PR-Code aus.
- **Entschärfung:** Der Befund stammt aus dem Job mit PR-Code. Vor dem Veröffentlichen werden
  HTML-Kommentare und `@claude`/`@codex` entschärft, damit er keine Runde fälschen und keinen
  anderen Workflow auslösen kann.
- **Keine Kollision mit Zyklus 1:** Auf `antigravity/*` fordert `codex-review-request.yml` kein
  Review an und `codex-rework.yml` startet keine Nacharbeit durch Claude. Codex kann von sich aus
  weiter reviewen; das ist eine zusätzliche Meinung, kein Auslöser.

## Review anfordern

- **Anderen Team-PR von Claude prüfen lassen:** Label `claude-review` setzen.
- **Manuell:** Actions → „Claude Review“ → „Run workflow“, PR-Nummer eintragen.

Beides prüft auch Entwürfe, aber nie denselben Head zweimal.

## Inbetriebnahme

Der Workflow lädt `scripts/claudeReviewCycle.mjs` vom Default-Branch. **Bis dieser PR auf `main`
gemergt ist, überspringt er jeden Lauf** („noch nicht auf dem Default-Branch“). Erster echter
Test nach dem Merge: einen kleinen Auftrag auf einem Branch `antigravity/…` pushen und PR öffnen.

## Eingreifen

- **Zyklus für einen PR stoppen:** PR schließen oder den Workflow „Claude Review“ unter Actions
  deaktivieren.
- **Nach dem Rundenlimit:** Marc entscheidet über das weitere Vorgehen.
