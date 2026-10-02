# Claude Code und Codex über GitHub verbinden

Stand: 01.10.2026. Einrichtungshilfe für den Dashboard-Umbau mit Versionsziel v2.4.0. Keine GitHub-App oder Automation wurde durch dieses Dokument aktiviert.

> **Nachtrag 01.10.2026 (abends):** Ein Teil des folgenden Befunds ist überholt. Die GitHub-Anmeldung (`gh`) ist gültig. Die Claude-GitHub-App ist eingerichtet (PR #40, Funktionstest Issue #41). Die automatische Nacharbeit von Codex-Befunden läuft seit PR #42 und ist auf PR #43 Ende-zu-Ende getestet. Der aktuelle Ablauf steht in `docs/dashboard/REVIEW_WORKFLOW.md`. Der Text unten bleibt als Einrichtungsverlauf erhalten.

## Befund Zugänge und Vorschauhosting (02.10.2026)

Festgestellt aus dem Repository (`.github/workflows/`), ohne Zugriff auf Kontoeinstellungen:

- **Secrets in Workflows:** nur `CLAUDE_CODE_OAUTH_TOKEN` (in `claude.yml` und `codex-rework.yml`). Weitere Zugänge nutzen den Job-Token `github.token`. Kein Deployment-, Hosting- oder Datenbank-Secret in den Workflows.
- **Token-Rechte:** `ci.yml` nur `contents: read`; `codex-review-request.yml` zusätzlich `pull-requests: write`; `codex-rework.yml` im Job mit PR-Code nur Leserechte, im Job `publish` ohne PR-Code Schreibrechte; `codex-status.yml` nur `statuses: write` plus Leserechte.
- **Codex:** Bot `chatgpt-codex-connector[bot]` (ID 199175422) prüft neue PRs von selbst. Pushes des Workflow-Tokens und Kommentare von `github-actions[bot]` löst er nicht aus (Test PR #43).
- **Vorschauhosting:** keines. Es gibt keine `netlify.toml`, `vercel.json` oder einen Deployment-Workflow. Entscheidung Marc: Vorschau als CI-Artefakt `dashboard-preview` (Anleitung in `docs/dashboard/REVIEW_WORKFLOW.md`).
- **Nicht prüfbar aus dem Repository:** Einstellungen der Codex- und Claude-Konten sowie der Branch-Schutz. Beides liegt bei Marc.

## Lokaler Befund

- Zielrepository aus `origin`: `mapoenisch/leadpilot-dashboard-crm-v2`.
- GitHub CLI, Claude Code CLI und Codex CLI sind lokal auffindbar.
- `gh auth status` meldet die Anmeldung von `mapoenisch` aktuell als ungültig. Eine erneute interaktive Anmeldung ist der erste Schritt.
- Die vorhandene CI prüft PRs. Im Repo ist noch kein eigener Claude-/Codex-Nacharbeitsworkflow vorhanden.
- Ob GitHub-Apps und automatische Codex-Reviews im Account bereits freigeschaltet sind, wurde nicht über die Accountoberfläche geprüft.

## 1. GitHub-Anmeldung herstellen

Im Terminal im Repository:

```sh
cd '/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM'
gh auth login --hostname github.com --web
gh auth status
```

Erfolg: `gh auth status` bestätigt die Anmeldung. Danach Admin-/Push-Zugriff auf das genannte Repository prüfen. Zugangsdaten werden in den jeweiligen Anmeldedialogen hinterlegt, nicht in Chat oder Repository.

## 2. Codex-Code-Reviews aktivieren

In den Codex-Code-Review-Einstellungen das Repository verbinden/auswählen, automatische Reviews aktivieren und den Auslöser auf neue PRs und neue Pushes setzen, soweit in der Oberfläche angeboten. Repository-Einstellung und persönliche Review-Einstellung prüfen. Ein Test-PR mit `@codex review` prüft den grundlegenden Zugang.

Die Standardintegration ist die schnelle Einstiegslösung. Ein erfolgreich geposteter Review ist noch kein vollständiger Nachweis der Projektgates. Für eine explizite automatisierte Freigabe pro Commit muss zusätzlich ein eigener überprüfbarer Reviewstatus definiert werden. Ohne diesen Status bleibt die Gate-Freigabe ein unabhängiger Codex-Prüfschritt.

## 3. Claude-GitHub-Anbindung einrichten

Claude Code im Repository starten und in seiner Sitzung den Installationsbefehl aufrufen:

```sh
claude
```

In Claude Code:

```text
/install-github-app
```

Der Assistent richtet die App, den passenden Authentifizierungs-Secret und einen Workflow-PR ein. Für diesen Abschnitt wird Claude als Builder eingerichtet; kein zweiter Claude-Code-Reviewer für die eigene Implementierung benötigt. Den erzeugten Workflow vor dem Merge auf die geltenden Projektregeln prüfen, insbesondere gepinnte Action-Versionen.

Nach Merge des Einrichtungs-PRs zunächst einen ausdrücklich begrenzten Auftrag in einem Test-PR über `@claude` auslösen. Authentifizierung wahlweise über unterstütztes Claude-Abonnement oder API; Auswahl und tatsächliche Kontoverfügbarkeit erfolgen im Installationsassistenten. Niemals Token in den Chat kopieren.

## 4. Automatischen Rückkanal ergänzen

Die Installation aktiviert nicht automatisch jede Codex-Befundnacharbeit. Dafür schreibt Claude Code einen eigenen Infrastrukturauftrag und einen Workflow, Codex prüft ihn unabhängig.

Verbindliche Übergaben:

1. Neuer Head-Commit eines Dashboard-PRs → CI und Codex-Review.
2. Abgeschlossener Codex-Review → Befunde gegen den aktuellen Head abgleichen und Claude-Code-Nacharbeit starten.
3. Claude verarbeitet nur neue, relevante Befunde, erläutert Behebung oder Widerspruch und pusht auf denselben Arbeitsbranch.
4. Neue Commits → neue CI/Review-Prüfung; die alte Freigabe gilt nicht für den neuen Stand.
5. Nach maximal drei erfolglosen Runden stoppt die automatische Schleife und meldet den Konflikt an Marc.

Der Adapter verarbeitet PR-Reviews, Inline-Kommentare und normale PR-Kommentare, ohne jedes einzelne Kommentarereignis sofort als vollständigen Review zu behandeln. Er prüft vertrauenswürdige Bot-Identität, Auftragszuordnung, Head-SHA und bereits bearbeitete Befund-IDs. Ein neuer Head verwirft veraltete Ergebnisse. Die Claude-Action muss den tatsächlich eingesetzten Codex-Bot explizit zulassen oder durch einen entsprechend abgesicherten Adapter ausgelöst werden; ein allgemeines Zulassen aller Bots ist nicht nötig.

Builder-Pushes verwenden die passende GitHub-App-Identität, damit die nächste CI zuverlässig ausgelöst wird. Der Standard-`GITHUB_TOKEN` kann Folgeworkflows unterdrücken. Pro Branch wird höchstens ein schreibender Builder ausgeführt; unabhängige Branches dürfen parallel bearbeitet werden. Eine GitHub-Cloud-Ausführung setzt keine laufende lokale Claude-Sitzung fort.

Für nachvollziehbare Freigaben ist zusätzlich zur komfortablen Codex-Standardintegration ein eigener Codex-Reviewjob mit strukturiertem Ergebnis möglich. Die offizielle Codex-Action verwendet einen OpenAI-API-Zugang. Diese zusätzliche Variante wird nur bei Bedarf eingerichtet; sie ist keine Voraussetzung für den ersten Standardreview-Test.

## 5. An der Testkachel nachweisen

- Claude baut die isolierte Testkachel auf einem PR-Branch.
- CI und Codex prüfen den konkreten Commit.
- Ein klar begrenzter Testbefund demonstriert genau eine Nacharbeitsrunde, ohne einen absichtlichen Fehler in Produktivcode zu mergen.
- Claude liefert einen neuen Commit; neue CI und Review erscheinen.
- Marc prüft die Vorschau und gibt das Design ausdrücklich frei.
- Erst anschließend beginnt der Dashboard-Umbau. Kein automatisches Produktionsdeployment, Merge oder Release durch den bloßen Testablauf.

## Versionsentscheidung

Verbindliches Releaseziel ist v2.4.0. Der aktuelle veröffentlichte Stand bleibt v2.3.2. Paketversion, Lockfile und Release-Tag werden im geplanten Releaseauftrag aktualisiert, wenn der Umbau und seine Abnahme abgeschlossen sind.

## Offizielle Anleitungen

- [Codex-GitHub-Reviews](https://learn.chatgpt.com/docs/third-party/github)
- [Codex-GitHub-Action](https://learn.chatgpt.com/docs/github-action)
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions)

Der beschriebene Rückkanal und seine Freigaberegeln sind die projektspezifische Gestaltung; sie werden nicht als sofort verfügbare Standardfunktion der beiden Apps ausgegeben.
