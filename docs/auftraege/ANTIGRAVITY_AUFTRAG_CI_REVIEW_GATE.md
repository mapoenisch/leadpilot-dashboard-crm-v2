# Auftrag CI – Review-Gate für alle PRs (Antigravity, OpenCode, Devin)

Stand: 19.10.2026 · Auftraggeber: Marc Poenisch · Builder: Claude Code · Prüfer: Codex

## Ziel

Reviews von Antigravity, OpenCode und Devin hinterlassen einen sichtbaren „Reviewed“-Status am Head-Commit. Ihre Inline-Befunde sind Review-Konversationen, die vor dem Merge gelöst sein müssen. Gilt für alle PRs im Repo, nicht nur für `antigravity/*`.

## Umsetzung

| Datei                                       | Zweck                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/review-gate.yml`         | Setzt Status (über die Review-Gate-App, Umgebung `review-gate`) bei PR-Öffnung/Push, nach `Review Gate Trigger` per `workflow_run`, bei Änderung von Skript/Prüferliste auf `main` (alle offenen PRs); manuell per `workflow_dispatch`; jeder Lauf bewertet alle offenen PRs (eine Concurrency-Gruppe). |
| `.github/workflows/review-gate-trigger.yml` | Reagiert auf Review und Review-Kommentar, ohne Secrets und Rechte; stößt nur `review-gate.yml` an.                                                                                                                                                                                                      |
| `scripts/reviewGate.mjs`                    | Setzt `agent-review` (success = formales PR-Review eines gelisteten Prüfers auf genau dem Head-Commit) und `review-conversations` (failure, solange Konversationen offen sind).                                                                                                                         |
| `.github/review-agents.json`                | Agenten mit `logins` (Prüfer-Konten, inkl. Codex), `builderBranches` (Branch-Präfix → Builder) und `accounts` (ID und Typ je Prüferkonto).                                                                                                                                                              |

## Regel (Marc 19.10.2026)

Ein Codex-Review ist nicht zwingend. Das Gate akzeptiert jeden Prüfer aus der Liste; Freigabe = `agent-review` grün und `review-conversations` grün. Verankert in `AGENTS.md` und `CLAUDE.md`.

## Grenzen und bekannte Einschränkungen

- **Nur formale PR-Reviews zählen** (Marc 19.10.2026), keine PR-Kommentare: Sie sind an den Head-Commit gebunden und nicht nachträglich manipulierbar. OpenCode muss deshalb so konfiguriert sein, dass es ein echtes PR-Review (mit Inline-Kommentaren) einreicht, nicht nur einen Kommentar.
- Der PR-Öffner sowie Autoren und Committer der PR-Commits zählen nie als Prüfer, ebenso kein Agent, zu dem deren Login gehört (kein Selbst-Review).
- Commit-Autoren stammen aus Git-Metadaten und sind fälschbar. Ein gefälschter Autor kann nur den eigenen PR blockieren (Prüfer fallen weg), nie eine Freigabe erschleichen; akzeptiert. Bei mehr als 250 Commits bricht das Gate ohne Status ab.
- Skript und Prüferliste kommen immer vom Default-Branch, PR-Code wird nie ausgeführt; der Job schreibt nur Status.
- **Das Lösen einer Konversation löst keinen Workflow aus** (`pull_request_review_thread` ist kein Actions-Ereignis). Nach dem Lösen: Actions → Review Gate → Run workflow. Marc hat am 19.10.2026 entschieden, dass manuelles Auslösen reicht.
- **Fork-PRs:** Review- und Kommentar-Ereignisse erhalten dort nur ein schreibgeschütztes Token; der Status wird per manuellem Lauf gesetzt. Das Repo nutzt keine Forks, ein privilegierter Folgelauf entfällt bewusst.
- Merge-Blockade entsteht erst durch Branch-Schutz auf `main` (Pflicht-Checks `agent-review`, `review-conversations`, Konversationen lösen). Er wird erst nach dem Merge dieses Auftrags und einem ersten Lauf auf `main` gesetzt.
- **Builder-Bindung (Marc 20.10.2026):** Agenten bauen unter Marcs Konto, es gibt keine eigenen Builder-Konten. Der Builder ergibt sich aus dem Branch-Präfix (`antigravity/`, `claude/`, `codex/`, `devin/`, `opencode/`) und kann den PR nicht selbst prüfen. PRs ohne bekanntes Präfix erhalten nie `agent-review=success`. **Restrisiko (bewusst akzeptiert):** Das Präfix ist frei wählbar; ein Agent könnte unter fremdem Präfix bauen und sich selbst prüfen (Befund P2 Codex). Marc prüft beim Merge, wer gebaut hat.
- **Änderungen angefordert:** Der wirksame Review-Zustand je Prüfer (letztes `APPROVED`/`CHANGES_REQUESTED`/`DISMISSED`) wird ausgewertet. `CHANGES_REQUESTED` setzt `agent-review` auf `failure`, bis derselbe Prüfer freigibt oder das Review verworfen wird.
- **Härtung Öffner/Forks (Sicherheitscheck 20.10.):** Erfolg nur für PRs aus diesem Repo, die ein verifiziertes Konto aus `trustedOpeners` geöffnet hat (derzeit nur `mapoenisch`, ID und Typ in `accounts`). Das verkleinert das Präfix-Restrisiko auf Agenten, die unter Marcs Konto arbeiten.
- **Konto-IDs (Befund P2 Codex, 20.10.):** Prüferkonten sind über `accounts` an ihre unveränderliche numerische GitHub-ID und den Typ gebunden. Ein umbenanntes und neu vergebenes Login zählt nicht. Ohne Eintrag zählt ein Review nie.
- **Keine Agenten-Freigaben (Befund P2 Codex):** `approve: false` (gesetzt für `marcs-pr-reviewer`, AGENTS.md) verwirft dessen `APPROVED`, das hebt auch keine eigene Änderungsanforderung auf.
- **Zielbranch-Wechsel (Befund P1 Codex):** `pull_request_target` reagiert auch auf `edited`. Reviews vor dem letzten `base_ref_changed` zählen nicht mehr, weder als Nachweis noch als Änderungsanforderung; es braucht ein neues Review.
- **Periodische Neubewertung (Befund P1 Codex):** `review-gate-trigger.yml` läuft mit dem Workflow-Stand aus dem PR und kann dort entschärft werden. Ein geplanter Lauf alle 15 Minuten vom Default-Branch korrigiert jeden Status, auch wenn ein Ereignis ausbleibt.
- **Fail-closed:** Vor den Abfragen gehen beide Status auf `pending`; ein Fehler lässt `agent-review` auf `pending` (Gate-Fehler), ein früheres `success` bleibt nie stehen. `review-conversations` wird unabhängig bewertet. Fehler bei einem PR brechen die übrigen nicht ab. Ausnahme: Fehlen die App-Secrets ganz, kann kein Status gesetzt werden; der Lauf schlägt dann sichtbar fehl.
- **Fälschungsschutz (Marc 20.10.2026):** Status nur über die eigene GitHub-App. Ein PR könnte mit geändertem Workflow und `GITHUB_TOKEN` Status gleichen Namens posten; der Branch-Schutz akzeptiert aber nur die an die App gehefteten Checks. Die App-Secrets liegen in der Umgebung `review-gate`, die nur vom Default-Branch genutzt werden darf; Review-Ereignisse (Workflow-Stand aus dem PR) erreichen sie deshalb nie.
- `marcs-pr-reviewer` steht bei OpenCode und Antigravity (Eintrag von Marc); ein Review dieses Kontos zählt für beide.

## Schutzbereiche

Unberührt (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).

## Review manuell auslösen (Marc 20.10.2026)

Codex prüft weiter automatisch. Ist das Codex-Limit erreicht, stößt Marc ein Review eines anderen Prüfers von Hand an; das Gate zählt es wie ein Codex-Review.

- **OpenCode:** lokal in OpenCode `/review-pr <PR-Nummer>` (`.opencode/command/review-pr.md`). Reicht ein formales Review mit Inline-Kommentaren über `marcs-pr-reviewer` ein.
- **Antigravity:** Antigravity mit demselben Auftrag starten („Prüfe PR <Nummer> und reiche ein formales Review über marcs-pr-reviewer ein“); Token per `export GH_TOKEN=$(node scripts/getReviewerToken.mjs)` (Schlüssel unter `.secrets/marcs-pr-reviewer.private-key.pem` oder `--key=<pfad>`; `*.pem` und `.secrets/` sind per `.gitignore` ausgeschlossen).
- **Devin:** im PR kommentieren `@devin review` (setzt Devin-Guthaben voraus).

Danach setzt das Gate den Status automatisch (Review-Ereignis, spätestens beim 15-Minuten-Lauf).

## Einrichtung durch Marc (einmalig)

1. **GitHub-App anlegen** (Settings → Developer settings → GitHub Apps → New): Name z. B. `leadpilot-review-gate`, Webhook aus, Rechte: _Commit statuses: Read and write_, _Metadata: Read_. Nur für dieses Konto installierbar.
2. **App im Repo installieren** (nur `leadpilot-dashboard-crm-v2`).
3. **Private Key erzeugen** (App-Seite → Generate a private key, `.pem`-Datei).
4. **Umgebung anlegen:** Repo → Settings → Environments → `review-gate`; _Deployment branches and tags_ → _Selected branches_ → nur `main`.
5. **Umgebungs-Secrets** in `review-gate`: `REVIEW_GATE_APP_ID` (App-ID) und `REVIEW_GATE_APP_KEY` (Inhalt der `.pem`-Datei). Nicht als Repo-Secret anlegen.
6. **Nach dem Merge:** Actions → Review Gate → Run workflow; dann Branch-Schutz auf `main`: Pflicht-Checks `agent-review` und `review-conversations` mit Quelle = Review-Gate-App, „Require conversation resolution“.
