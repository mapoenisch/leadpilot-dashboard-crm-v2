# ANTIGRAVITY_AUFTRAG_135 — Repo-Konsolidierung (Branches, Worktrees, offene PRs)

> **Builder:** Antigravity (Auftrag von Marc, 09.11.2026) · **Prüfer:** Codex (GitHub-App) · **Merge und Release:** Marc
> Bestandsaufnahme vom 09.11.2026 gegen `origin/main` = `9c87838` (`package.json` 3.0.0). Es gelten `CLAUDE.md` §4.1, §6, §7 und §9.

## Ziel

Am Ende gibt es lokal und auf GitHub nur noch `main` plus die Branches laufender PRs. Lokales `main` entspricht `origin/main`. Die vier offenen Dependabot-PRs sind in der festgelegten Reihenfolge mergebereit gemacht und von Marc gemergt. Die einzige noch nicht gesicherte Arbeit (HubSpot-Import) liegt in einem eigenen PR.

## Globale Grenzen

- **Merge, Tag und GitHub-Release macht nur Marc.** Du meldest „PR #X ist mergebereit" und wartest.
- Kein Force-Push, kein `git reset --hard`, kein `git clean`. Keine Commits auf `dependabot/*`-Branches.
- `.env` und andere ignorierte Dateien nicht anfassen (`git stash` deshalb nur mit `-u`, nie mit `-a`).
- Kein Produktcode, keine neuen Abhängigkeiten. Schutzbereichs-Diff gegen `9c87838` muss leer sein (§6).
- Marcs Übergabe dieses Auftrags gibt das Löschen **genau der in T3 und T4 gelisteten** Branches und Worktrees frei, nichts darüber hinaus.
- **Ausdrückliche Ausnahme von den „Lokalen Git-Befehlen" in `AGENTS.md`, nur für diesen Auftrag und nur in den hier abgedruckten Formen:** `git stash push -u` (T1), `git branch -D` mit SHA-Prüfung (T3), `git worktree remove --force` für `start_react_app` (T3), `git checkout 'stash@{0}…' -- <Pfad>` (T5, T7). Alle übrigen Verbote dort gelten weiter, insbesondere `git stash drop`, `git clean`, `git reset --hard` und `git checkout .`. Der Arbeitsbaum im Repo-Root ist erwartbar nicht sauber; das ist hier kein Stoppgrund, solange er der Ausgangslage entspricht.

**Stoppen und Marc fragen, wenn:**

- ein Branch oder Worktree einen anderen SHA oder anderen Dirty-Stand als hier dokumentiert hat,
- ein PR neue Commits von Menschen hat,
- Codex einen Befund meldet, der mehr als die Workflow-Pins betrifft,
- `git worktree remove` scheitert,
- du selbst gerade in einem der zu entfernenden Worktrees arbeitest (alle Befehle aus dem Repo-Root ausführen).

## Ziel-Dateien

| Datei | Änderung | PR |
| --- | --- | --- |
| `scripts/importHubSpotCaseStudy.mjs`, `scripts/importHubSpotCaseStudy.node-test.mjs` | unverändert aus lokalem Stand übernehmen | HubSpot-PR |
| `docs/auftraege/CODEX_AUFTRAG_2026-10-29_HUBSPOT_SET4_IMPORT.md` | unverändert übernehmen | HubSpot-PR |
| `docs/BUILD_LOG.md` | HubSpot-Abschnitt vom 29.10.2026 anhängen | HubSpot-PR |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_135_REPO_KONSOLIDIERUNG.md` | dieser Auftrag, Checkboxen abgehakt | Abschluss-PR |
| `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md` | verbindlicher Folgeplan, unverändert übernehmen; zählt nicht als Abweichung in T1 | Abschluss-PR |
| `docs/BUILD_LOG.md` | Builder-Eintrag Auftrag 135 | Abschluss-PR |
| `CLAUDE.md`, `AGENTS.md` | Grundregel vom 09.11.2026 (Builder frei, anderer Agent reviewt), unverändert aus lokalem Stand übernehmen | Abschluss-PR |

## Ausgangslage

### Welche Branches noch gebraucht werden

| Branch | Ort | Urteil |
| --- | --- | --- |
| `main` | lokal + origin | **behalten**; lokal 51 Commits hinter `origin/main` |
| `dependabot/github_actions/*` (4 Stück, PRs #146–#149) | origin | **behalten bis Merge**; verschwinden danach automatisch (`delete_branch_on_merge`) |
| alle übrigen (siehe T3, T4) | lokal/origin | **nicht mehr gebraucht** |

Hinweis zu T3: `git branch --merged` hilft hier nicht. Die PRs wurden per Squash gemergt, deshalb zeigen viele Branches „ahead". Der Inhalt ist trotzdem auf `main`; das wurde je Branch über den PR-Head geprüft.

### Lokaler Arbeitsstand im Repo-Root (Branch `codex/leadpilot-live-demo`)

| Änderung | Befund | Aktion |
| --- | --- | --- |
| `scripts/importHubSpotCaseStudy*.mjs`, `docs/auftraege/CODEX_AUFTRAG_2026-10-29_HUBSPOT_SET4_IMPORT.md` | **nur lokal, nicht auf `main`** | sichern, HubSpot-PR |
| `docs/BUILD_LOG.md` (HubSpot-Abschnitt, 12 Zeilen) | **nur lokal** | sichern, HubSpot-PR |
| `README.md` | identisch mit `origin/main` | verwerfen (kommt mit `main`) |
| `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`, `ACCESSIBILITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` | identisch mit `origin/main` | verwerfen (kommt mit `main`) |
| Löschung `docs/LeadPilot_Faktenblatt_v1.1.md` | **nicht übernehmen**: die Datei ist auf `main` als historisch geführt, u. a. `src/simulation/preflightValidator.ts` verweist auf sie | verwerfen |
| Commit `5f20c7c` (Operating Margin) | Inhalt bereits auf `main` | Branch löschen |
| `CLAUDE.md`, `AGENTS.md`, `docs/auftraege/ANTIGRAVITY_AUFTRAG_135_*`, `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md` | **nur lokal**, neu vom 09.11.2026 | sichern, Abschluss-PR (T7) |

## Tasks

### T1 — Sichern (vor jeder Änderung)

- [x] `git fetch --all --prune` und Abgleich mit dieser Datei; bei Abweichung stoppen.
- [x] Alles parken und bündeln:

```bash
BACKUP="$HOME/Backups/leadpilot-vor-auftrag-135"; mkdir -p "$BACKUP"
cp docs/auftraege/ANTIGRAVITY_AUFTRAG_135_REPO_KONSOLIDIERUNG.md docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md "$BACKUP/"
git status --porcelain > "$BACKUP/status.txt"
git stash push -u -m "auftrag-135: lokaler Stand codex/leadpilot-live-demo"
git bundle create "$BACKUP/alle-refs.bundle" --all
git bundle verify "$BACKUP/alle-refs.bundle"
git bundle list-heads "$BACKUP/alle-refs.bundle" | grep refs/stash
```

Das Bundle muss `refs/stash` enthalten. Den Stash erst löschen, wenn Marc es sagt.

### T2 — Lokales `main` aktualisieren

- [x] `git switch main && git merge --ff-only origin/main`
- [x] `git rev-parse HEAD` entspricht `origin/main`; `npm ci`
- [x] `git status` ist sauber.

### T3 — Lokale Worktrees und Branches entfernen

Worktrees (aus dem Repo-Root):

| Pfad | Erwartet | Befehl |
| --- | --- | --- |
| `~/.gemini/antigravity/worktrees/LeadPilot Dashboard-CRM/fix_dashboard_bugs_and_ui` | sauber, auf `claude/deps-vitest-4-1-12` | `git worktree remove` |
| `~/.gemini/antigravity/worktrees/LeadPilot Dashboard-CRM/start_react_app` | **nur** zwei Löschungen: `docs/LeadPilot_Faktenblatt_v1.1.md`, `docs/LeadPilot_Faktenblatt_v1.2.md` (beide auf `main` vorhanden) | erst Status prüfen, dann `git worktree remove --force` |
| `~/copilot-worktrees/LeadPilot Dashboard-CRM/copilot-prewarm-bookish-guacamole` | sauber, detached `88b4981` | `git worktree remove` |
| `~/copilot-worktrees/LeadPilot Dashboard-CRM/marcreview-friendly-goggles` | sauber, `c11d53f` | `git worktree remove` |

- [x] Worktrees entfernt, danach `git worktree prune`; `git worktree list` zeigt nur den Repo-Root.
- [x] Lokale Branches löschen, jeweils mit SHA-Prüfung:

```bash
while read -r b sha; do
  cur=$(git rev-parse "refs/heads/$b") || exit 1
  case "$cur" in "$sha"*) git branch -D "$b" ;; *) echo "STOPP: $b ist $cur"; exit 1 ;; esac
done <<'LISTE'
claude/auftrag-126-a11y-knotenausgabe fdb0824
claude/auftrag-128-dashboard-editor-reparatur 9c824c7
claude/auftrag-128-screenreader-fachseiten 413e55f
claude/auftrag-129-crm-deals-kanban f12ebc2
claude/auftrag-130-crm-lead-scoring 8234600
claude/auftrag-131-vertrieb-funnel-live 5939d0d
claude/auftrag-132-dashboard-report-export 67430e7
claude/auftrag-133-what-if-hebelrechner ec9be8d
claude/auftrag-134-release-v3-0-0 83e20af
claude/dashboard-editor-rework-repairs 413e55f
claude/deps-vitest-4-1-12 b2ab6c3
codex/leadpilot-live-demo 5f20c7c
fix_dashboard_bugs_and_ui 95d8d04
start_react_app 95d8d04
marcreview-friendly-goggles c11d53f
LISTE
```

Herkunft: 126/130 sind Vorfahren der gemergten PR-Heads #135/#140; 128-Reparatur, 129, 131–134, `deps-vitest` und `start_react_app` sind identisch mit den Heads der gemergten PRs #138, #139, #141–#145, #137; `fix_dashboard_bugs_and_ui` zeigt auf denselben Commit wie `start_react_app`; 128-Screenreader, `dashboard-editor-rework-repairs` und `marcreview-friendly-goggles` haben 0 eigene Commits.

### T4 — Verwaiste Remote-Branches und Label

- [x] `git push origin --delete dependabot/npm_and_yarn/multi-75c0a8599d` (zugehöriger PR #132 ist geschlossen, React-Major bewusst verworfen)
- [x] `git push origin --delete marcreview-friendly-goggles` (keine eigenen Commits, kein PR)
- [x] `gh label create ci --color 0366d6 --description "CI und GitHub Actions"` (Dependabot beschwert sich in #146–#149 über das fehlende Label)

### T5 — HubSpot-Arbeit retten

- [x] Branch von aktuellem `main` und Dateien aus dem Stash holen:

```bash
git switch -c chore/hubspot-set4-import origin/main
git checkout 'stash@{0}^3' -- scripts/importHubSpotCaseStudy.mjs scripts/importHubSpotCaseStudy.node-test.mjs docs/auftraege/CODEX_AUFTRAG_2026-10-29_HUBSPOT_SET4_IMPORT.md
{ printf '\n'; git show 'stash@{0}:docs/BUILD_LOG.md' | sed -n '/^## 29.10.2026 — Lokaler HubSpot-Import Set 4/,$p'; } >> docs/BUILD_LOG.md
```

- [x] `git diff --cached --stat` und `git diff docs/BUILD_LOG.md` prüfen: nur diese vier Dateien, keine Personendaten außer den synthetischen `.example.com`-Testdaten, keine Secrets.
- [x] `node --test scripts/importHubSpotCaseStudy.node-test.mjs`, dann Pflicht-Verifikation (§7) und `npx prettier --check` auf die neuen Dateien.
- [x] Committen, pushen, PR als **Draft** öffnen, bis die Warteschlange ihn erreicht (T6, Platz 5). Inhalt des PRs: unveränderte Übernahme, Builder war Codex am 29.10.2026.

### T6 — PR-Warteschlange (streng nacheinander)

| Platz | PR | Änderung | Betrifft | Warum an dieser Stelle |
| --- | --- | --- | --- | --- |
| 1 | **#148** | `claude-code-action` 1.0.266 → 1.0.268 | nur abgeschaltete Workflows | kein Risiko für den aktiven Ablauf; läuft zuerst durch |
| 2 | **#149** | `supabase/setup-cli` 3.1.0 → 3.2.0 | `ci.yml`, `update-visual-baselines.yml` | Minor, testet die `e2e`-Pipeline einzeln |
| 3 | **#146** | `actions/checkout` 4 → 7 | 8 Workflows | Major; vor #147, weil beide in direkt benachbarten Zeilen ändern |
| 4 | **#147** | `actions/setup-node` 4 → 7 | 7 Workflows | Major; bekommt nach #146 einen Merge-Konflikt und braucht zwingend einen Rebase |
| 5 | HubSpot-PR | aus T5 | `scripts/`, Doku | eigene Prüfung nötig, siehe unten; `BUILD_LOG.md` vor dem Abschluss-PR |
| 6 | Abschluss-PR | aus T7 | Doku | hält den Endstand fest, daher zuletzt |

Für jeden PR dieselbe Schleife:

1. Ist der PR `BEHIND` oder hat Konflikte (ab Platz 2 durch die Pflicht „Strict Status Checks" der Normalfall): Bei Dependabot-PRs `@dependabot rebase` kommentieren. Der „Update branch"-Knopf ist im Repo deaktiviert.
2. Warten, bis alle Pflicht-Checks grün sind: `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e`.
3. `@codex review` kommentieren. **Bisher hat keiner der PRs #146–#149 ein Codex-Review.** Die Freigabe muss für den aktuellen Head gelten, daher erst nach dem Rebase anfordern.
4. Befunde beheben oder begründet ablehnen. Bei Dependabot-PRs nur begründen, nicht committen. Danach Konversationen lösen.
5. Marc melden: „PR #X mergebereit, Head `<SHA>`, Checks grün, Codex ohne Befunde." **Auf Marcs Merge warten**, dann erst der nächste Platz.

Prüfpunkte für die Major-Bumps (Release Notes wurden gesichtet, keine Blocker):

- **`checkout` v7** verweigert das Auschecken von Fork-PRs bei `pull_request_target` und `workflow_run`. Die aktiven Workflows sind nicht betroffen: `agent-review.yml` checkt bei `issue_comment` den Default-Branch aus, `ci.yml` läuft auf `pull_request`. Seit v6 liegen persistierte Credentials in einer separaten Datei; relevant nur für `codex-rework.yml` (abgeschaltet).
- **`setup-node` v7** läuft auf Node 24 als Action-Runtime und ist ESM; `cache: npm` ist explizit gesetzt, ein `packageManager`-Feld gibt es nicht, die Auto-Cache-Logik greift also nicht. Die verwendete Node-Version (22.18.0 bzw. 20) bleibt unverändert.
- **`agent-review.yml` läuft nicht im PR-CI** (Trigger `issue_comment`, vom Default-Branch). Nach #146 und #147 kannst du den Workflow nicht automatisch prüfen; im Abschlussbericht als „beim nächsten `/<agent> review` beobachten" vermerken.

**Sonderregel HubSpot-PR:** Builder war Codex, also darf Codex ihn nicht prüfen (§4.1 Grundsatz). Auch Antigravity prüft nicht, weil es die Dateien übernimmt. Marc fordert das Review per `/<agent> review` an (OpenCode, Devin, Proto oder Perplexity). Du meldest ihm, wann der PR so weit ist, und setzt ihn dann auf „Ready".

### T7 — Abschluss

- [x] Nach dem Merge von Platz 5: `git switch main && git merge --ff-only origin/main`, Branch `chore/hubspot-set4-import` lokal löschen.
- [x] `git switch -c chore/auftrag-135-repo-konsolidierung origin/main`; diesen Auftrag und den Folgeplan aus dem Stash holen (`git checkout 'stash@{0}^3' -- docs/auftraege/ANTIGRAVITY_AUFTRAG_135_REPO_KONSOLIDIERUNG.md docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`), dazu die Regeldateien (`git checkout 'stash@{0}' -- CLAUDE.md AGENTS.md`), Checkboxen abhaken.
- [ ] Pflicht-Verifikation (§7) und Builder-Eintrag in `docs/BUILD_LOG.md`: entfernte Branches/Worktrees mit SHAs, PR-Reihenfolge mit Merge-Commits, Schutzbereichs-Diff leer, Pfad des Bundles.
- [ ] PR öffnen, Schleife aus T6, Codex-Ergebnis als Nachtrag in den `BUILD_LOG` (§4.1 Punkt 5).

## Abnahme

- [x] `git worktree list` zeigt nur den Repo-Root.
- [x] `git branch` zeigt nur `main` (plus ggf. den Branch des gerade offenen Abschluss-PRs).
- [x] `git ls-remote --heads origin` zeigt nur `main` und Branches offener PRs.
- [x] Lokales `main` = `origin/main`; `git status` sauber.
- [x] `gh pr list --state open` ist leer (nach Marcs letztem Merge).
- [ ] Die CI auf `main` ist nach dem letzten Merge grün.
- [x] Die vier HubSpot-Dateien sind auf `main`; `docs/LeadPilot_Faktenblatt_v1.1.md` und `v1.2.md` sind weiterhin vorhanden.

## Nur melden, nicht anfassen

- **Tag und GitHub-Release `v3.0.0` fehlen.** `main` steht auf 3.0.0, der neueste Tag ist `v2.5.0`. Das ist Marcs Schritt (Release-Commit `d2bfbd3`, Notes `docs/releases/V3.0.0.md`).
- `gh workflow list` zeigt „Review Gate Trigger" und `.github/workflows/review-gate.yml` als aktiv, die Datei liegt aber nicht auf `main`. Vermutlich eine Karteileiche.
- `CLAUDE.md` §4.2 nennt den automatischen Antigravity-Zyklus als ruhend. Das betrifft nur die Workflows; bauen darf Antigravity nach §4.1 trotzdem.
- `.github/dependabot.yml` enthält keine `ignore`-Regel für die verworfenen Major-Sprünge (React 19, TypeScript 7). Dependabot kann sie erneut vorschlagen.
