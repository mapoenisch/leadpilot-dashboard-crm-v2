# Separater CI-Auftrag: Claude-Code-Workflow für Issues und PRs

**Stand:** 01.10.2026

**Basis:** `main` nach PR #39 (`3f58868`)

**PR:** #40, Branch `add-claude-github-actions-1790844105003`

**Builder:** Claude Code (Rollenverteilung bis v2.3.0 und danach laut `CLAUDE.md` §4). Codex prüft Diff und CI.

**Entstehung:** Marc hat den Workflow am 01.10.2026 mit `/install-github-app` angelegt. Dabei
entstand PR #40 ohne Auftrag und ohne Gate-Nachweis. Dieser Auftrag wird nachträglich geschrieben.
Er grenzt den Umfang ein und dokumentiert die Nacharbeit zu den Befunden des Codex-Connectors.

**Abgrenzung:** Keine Produktionslogik, kein Deploy, keine Änderung an `ci.yml` und den sieben
Ruleset-Jobs. Kein Teil von 067Q–067S und nicht vom Executive-Dashboard-Plan.

## Ziel

Ein GitHub-Workflow startet Claude Code, wenn in einem Issue, einem Issue-Kommentar, einem
PR-Review oder einem PR-Review-Kommentar `@claude` steht. Der Workflow hält den G58-Vertrag ein
(alle `uses:` auf 40-stellige SHAs gepinnt, `ANTIGRAVITY_AUFTRAG_067L_FAILCLOSED_CI_RULESET.md`)
und löst keine unnötigen, kostenpflichtigen Läufe aus.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `.github/workflows/claude.yml` | Neuer Workflow; Actions per SHA gepinnt; `issues` nur bei `opened`. |
| `package-lock.json` | Nur die Lockfile-Auflösung von `brace-expansion` und `ip-address` (Audit-Gate). |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CLAUDE_WORKFLOW.md` | Diese Auftragsdatei. |
| `docs/BUILD_LOG.md` | Builder-Nachweis. |

Nicht ändern: `package.json`, `ci.yml`, UI-Tests, Vitest-Konfiguration, Schutzbereiche aus
`CLAUDE.md` §6.

## Umsetzung

- [x] Workflow `claude.yml` aus `/install-github-app` übernehmen (Commit `3f63267`). Das Secret
  `CLAUDE_CODE_OAUTH_TOKEN` liegt nur in den Repository-Secrets, nicht im Repo.
- [x] `actions/checkout` auf `11bd71901bbe5b1630ceea73d27597364c9af683` (`v4.2.2`) und
  `anthropics/claude-code-action` auf `12dd8d74c712f5f3669365b2369b558c495b1104` (`v1`) pinnen.
  Die SHAs vorher über die GitHub-API gegen die Tags prüfen; `v1` ist ein annotierter Tag
  (Tag-Objekt `94d3801`).
- [x] Trigger `issues` von `types: [opened, assigned]` auf `types: [opened]` beschränken. Sonst
  würde jede spätere Zuweisung eines Issues mit `@claude` einen zweiten Lauf auslösen, weil die
  Job-Bedingung weder `github.event.action` noch `github.event.assignee` prüft.
- [x] Audit-Gate wieder grün machen: `brace-expansion` 1.1.18 → 1.1.21 und 5.0.9 → 5.0.12,
  `ip-address` 10.7.0 → 10.7.2. Alles nur Dev-Abhängigkeiten, alle Versionen innerhalb der
  Semver-Bereiche der Elternpakete; kein `overrides`, kein `--force`, Audit-Schritt unverändert.
- [x] Lokal prüfen: Audit (`--omit=dev`, `--audit-level=high`), TypeScript, Lint, Format, Vitest,
  Integrity-Suiten, Build, Schutzbereichs-Diff, SHA-Pinning aller Workflows, YAML-Syntax. Keine
  UI-Änderung, daher keine Screenshot-Matrix.
- [ ] PR-CI auf dem finalen Head mit sieben grünen Pflichtjobs (Nachweis durch Codex).
- [ ] Codex-Prüfung von Diff und CI; Befund in `docs/BUILD_LOG.md`.
- [ ] Merge nur durch Marc nach Codex-Freigabe.

## Bekannte Grenzen

- `claude-code-action` läuft nur, wenn `claude.yml` identisch auf dem Default-Branch liegt. Vor dem
  Merge bricht die Action mit „Workflow validation failed“ ab (so geschehen in Lauf
  `36838469680`). Einen echten Funktionstest gibt es deshalb erst nach dem Merge: ein Issue
  oder Kommentar mit `@claude` anlegen und den Lauf prüfen.
- `v1` ist ein mitlaufender Tag. Updates der Action kommen durch das Pinning nicht mehr
  automatisch an; die SHA wird bei Bedarf von Hand angehoben.
- Der Job hat `id-token: write` und Lesezugriff auf `contents`, `pull-requests`, `issues` und
  `actions`. Wer `@claude` schreiben darf, entscheidet die Action (Schreibrechte im Repo).
