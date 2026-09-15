# Issue tracker: GitHub

Issues und PRDs für dieses Repo leben als **GitHub Issues** in
`mapoenisch/leadpilot-dashboard-crm-v2`. Alle Operationen über die `gh`-CLI.

Das Repo wird aus `git remote -v` abgeleitet — `gh` erkennt es automatisch,
wenn es innerhalb des Clones läuft.

---

## Abgrenzung zum Auftragssystem

**Wichtig, bevor irgendein Agent hier schreibt.** Dieses Repo hat zwei
Arbeitsflächen. Sie sind nicht austauschbar:

| Fläche | Wofür | Maßgeblich |
|---|---|---|
| **GitHub Issues** | Tickets der Engineering-Skills: `to-tickets`, `to-spec`, `implement`, `wayfinder`. Eingehende Bugs und Ideen. | diese Datei |
| **`docs/auftraege/`** | Die Gate-gebundene Bauarbeit. 65 gewachsene Aufträge `ANTIGRAVITY_AUFTRAG_XXX_*.md`, Ledger `docs/BUILD_LOG.md`. | `CLAUDE.md` §3–§7 |

Die Wahl für GitHub Issues gilt für die Skills. Sie hebt den Auftragsprozess
**nicht** auf:

- Ein Issue ersetzt keinen Auftrag. Wer Code in einem Schutzbereich
  (`CLAUDE.md` §6) ändern will, braucht weiterhin eine Auftragsdatei.
- Die Pflicht-Verifikation aus `CLAUDE.md` §7 (`tsc --noEmit`, `npm run verify`,
  `npm run build`, bei UI zusätzlich Screenshots) gilt unabhängig davon, ob die
  Arbeit aus einem Issue oder einem Auftrag kommt.
- Der Gate-Abschlussbericht gehört nach `docs/BUILD_LOG.md`, auch wenn das
  Ticket ein GitHub Issue war.

Im Zweifel gilt `CLAUDE.md`, nicht diese Datei.

---

## Konventionen

- **Issue anlegen**: `gh issue create --title "..." --body "..."`.
  Für mehrzeilige Bodies ein Heredoc verwenden.
- **Issue lesen**: `gh issue view <nummer> --comments`
- **Issues auflisten**:
  ```
  gh issue list --state open --json number,title,body,labels,comments \
    --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
  ```
  mit passenden `--label`- und `--state`-Filtern.
- **Kommentieren**: `gh issue comment <nummer> --body "..."`
- **Labels setzen / entfernen**: `gh issue edit <nummer> --add-label "..."` /
  `--remove-label "..."`
- **Schließen**: `gh issue close <nummer> --comment "..."`

### Sprache

Deutsch, Du-Form, Ergebnis zuerst (`CLAUDE.md` §10). Technische Bezeichner —
Dateinamen, Befehle, Symbolnamen — bleiben im Original.

### Bezug zum Auftrag herstellen

Gehört ein Issue zu einem Auftrag, im Body die Auftragsdatei nennen:

```
Auftrag: docs/auftraege/ANTIGRAVITY_AUFTRAG_067_BEISPIEL.md
```

Umgekehrt gehört die Issue-Nummer in den Gate-Abschlussbericht in
`docs/BUILD_LOG.md`, damit das Ledger vollständig bleibt.

---

## Pull Requests als Triage-Fläche

**PRs als Request-Fläche: nein.** _(Auf `ja` setzen, wenn externe PRs in diesem
Repo als Feature-Requests behandelt werden sollen; `/triage` liest dieses Flag.
`/triage` ist derzeit nicht installiert.)_

Bei `ja` laufen PRs durch dieselben Labels und Zustände wie Issues, mit den
`gh pr`-Entsprechungen:

- **PR lesen**: `gh pr view <nummer> --comments`, Diff über `gh pr diff <nummer>`
- **Externe PRs auflisten**:
  `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`,
  dann nur `authorAssociation` `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` oder
  `NONE` behalten (`OWNER`/`MEMBER`/`COLLABORATOR` verwerfen)
- **Kommentieren / labeln / schließen**: `gh pr comment`,
  `gh pr edit --add-label`/`--remove-label`, `gh pr close`

GitHub teilt einen Nummernraum zwischen Issues und PRs — ein bloßes `#42` kann
beides sein. Auflösen über `gh pr view 42`, mit Rückfall auf `gh issue view 42`.

---

## Wenn ein Skill sagt „publish to the issue tracker"

Ein GitHub Issue anlegen.

## Wenn ein Skill sagt „fetch the relevant ticket"

`gh issue view <nummer> --comments` ausführen.

---

## Wayfinding

Genutzt von `/wayfinder`. Die **Map** ist ein Issue, die **Kinder** sind Issues.

- **Map**: ein Issue mit Label `wayfinder:map`, Body trägt
  Notes / Decisions-so-far / Fog. Anlegen über
  `gh issue create --label wayfinder:map`.
- **Kind-Ticket**: ein Issue, als GitHub-Sub-Issue an die Map gehängt (`gh api`
  auf den Sub-Issues-Endpunkt). Wo Sub-Issues nicht aktiviert sind: Kind in eine
  Task-Liste im Map-Body eintragen und `Part of #<map>` an den Anfang des
  Kind-Bodys setzen. Labels: `wayfinder:<typ>` mit
  `research` / `prototype` / `grilling` / `task`. Nach dem Claim ist das Ticket
  der treibenden Person zugewiesen.
- **Blocking**: GitHub-**Issue-Dependencies**, die in der UI sichtbare
  kanonische Form. Kante setzen mit
  `gh api --method POST repos/mapoenisch/leadpilot-dashboard-crm-v2/issues/<kind>/dependencies/blocked_by -F issue_id=<blocker-db-id>`,
  wobei `<blocker-db-id>` die numerische **Datenbank-Id** des Blockers ist
  (`gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/issues/<n> --jq .id`,
  **nicht** die `#nummer` und nicht die `node_id`). GitHub meldet
  `issue_dependencies_summary.blocked_by` — offene Blocker, das lebende Gate.
  Wo Dependencies nicht verfügbar sind: Rückfall auf eine Zeile
  `Blocked by: #<n>, #<n>` am Anfang des Kind-Bodys. Ein Ticket ist frei, wenn
  jeder Blocker geschlossen ist.
- **Frontier-Abfrage**: offene Kinder der Map listen (`gh issue list --state open`,
  auf Sub-Issues / Task-Liste der Map eingegrenzt), alle mit offenem Blocker
  (`issue_dependencies_summary.blocked_by > 0` oder offenes Issue in der
  `Blocked by`-Zeile) oder mit Assignee verwerfen; das erste in Map-Reihenfolge
  gewinnt.
- **Claim**: `gh issue edit <n> --add-assignee @me` — der erste Schreibvorgang
  der Sitzung.
- **Resolve**: `gh issue comment <n> --body "<antwort>"`, dann
  `gh issue close <n>`, dann einen Kontext-Zeiger (Kurzfassung + Link) an
  Decisions-so-far in der Map anhängen.

---

## Stand

GitHub Issues sind in diesem Repo bisher **ungenutzt** (0 Issues zum Zeitpunkt
der Einrichtung). Die Skills legen die ersten an.
