# Antigravity-Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein zsh-Host-Skript automatisiert die serielle „Antigravity baut → Codex prüft → Befund zurück"-Schleife über einen Datei-Nachrichtenbus, bis Codex `ALLE AUFTRÄGE FERTIG` meldet.

**Architecture:** Ein Nachrichtenbus-Ordner `handoff/` im Repo trägt die Nachrichten zwischen den beiden Agenten. `scripts/orchestrator.zsh` (Entrypoint) fährt eine `while`-Schleife und ruft Funktionen aus `scripts/lib/orchestrator-lib.zsh`; alle Tunables stehen in `scripts/orchestrator.config.zsh`. Codex wird per `codex exec` als nicht-interaktiver Prüfer aufgerufen (fährt die Gates selbst). Antigravity wird in drei Ausbaustufen angetriggert: Stufe 1 nur Notification (Marc tippt „weiter"), Stufe 2 AppleScript tippt „weiter", Stufe 3 zusätzlich Auto-Approve der Antigravity-Popups. Der Rückkanal ist immer `handoff/outbox.md`.

**Tech Stack:** zsh, macOS-Bordmittel (`osascript`, `pbcopy`/`pbpaste`, `plutil`, `jq` unter `/usr/bin/jq`), `codex` CLI v0.149.1 (`~/.local/bin/codex`). Tests: reines zsh mit PATH-Stubs, kein `bats`.

**Spec:** `docs/superpowers/specs/2026-09-04-antigravity-orchestrator-design.md`

## Global Constraints

- **Zielrepo:** `/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM` (Pfad enthält ein Leerzeichen — in jedem Skript konsequent quoten).
- **Serieller Betrieb:** nie zwei Runden oder zwei Sessions gleichzeitig; `handoff/.lock` erzwingt das.
- **Nachrichtenbus `handoff/` steht in `.gitignore`** — reiner Laufzeitzustand, wird nie committet.
- **`handoff/outbox.md` gilt erst als fertig**, wenn die letzte nicht-leere Zeile exakt `--- ENDE BERICHT ---` lautet.
- **Codex-Abschlusssignal:** getrimmte Codex-Ausgabe exakt gleich `ALLE AUFTRÄGE FERTIG`.
- **`MAX_ITER = 80`** harte Obergrenze für Runden.
- **`jq`** ist `/usr/bin/jq` (vorhanden) und wird für `state.json` genutzt.
- **`codex exec`-Aufruf:** `codex exec --cd "$ORCH_REPO" --sandbox workspace-write --ask-for-approval never -` (Prompt über stdin). Fallback falls die CLI-Version die Flags anders benennt: `--full-auto`.
- **`scripts/lib/orchestrator-lib.zsh` muss source-bar sein, ohne etwas auszuführen** (nur Funktionsdefinitionen), damit die Tests es einbinden können. Ausführungslogik lebt ausschließlich im Entrypoint.
- **Kommunikation in allen erzeugten Texten/Notifications:** Deutsch, knapp.
- **Commits:** pro Task ein Commit, Message auf Deutsch, abschließend
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `scripts/orchestrator.config.zsh` | alle Tunables (Pfade, Stufe, Timeouts, Codex-Flags, Preamble-Text, Stufe-2-Keystroke) als `ORCH_*`-Variablen |
| `scripts/lib/orchestrator-lib.zsh` | reine Funktionsbibliothek: State-I/O, Prompt-Bau, Codex-Aufruf, Transcript, Abschluss-Erkennung, Dispatch (alle Stufen), Warten auf Outbox, Lock-Handling |
| `scripts/orchestrator.zsh` | Entrypoint: Config + Lib sourcen, Lock, Traps, `while`-Hauptschleife, `MAX_ITER` |
| `scripts/test/stubs/codex` | Test-Stub: gibt Fixture-Text aus, Exit-Code über Env steuerbar |
| `scripts/test/stubs/osascript` | Test-Stub: protokolliert Aufrufe in Datei, tut sonst nichts |
| `scripts/test/run.zsh` | Test-Runner: sourced Lib mit Test-Config, prependet Stubs an PATH, führt alle `test_*`-Funktionen aus, zählt Pass/Fail |
| `scripts/test/cases.zsh` | die `test_*`-Funktionen |
| `scripts/README-orchestrator.md` | Bedienung: Start/Stop, Stufen, Discovery-Checklisten |
| `com.marc.antigravity-orchestrator.plist` | optionaler LaunchAgent (Repo-Kopie; Installziel `~/Library/LaunchAgents/`) |
| `AGENTS.md` | Abschnitt „Handoff-Protokoll" anhängen |
| `.gitignore` | Zeile `handoff/` ergänzen |

Bus-Dateien zur Laufzeit (vom Skript angelegt, nicht im Repo): `handoff/inbox.md`, `handoff/outbox.md`, `handoff/transcript.md`, `handoff/state.json`, `handoff/codex_prompt.md`, `handoff/PAUSE` (von Marc), `handoff/.lock`.

---

## Task 1: Projektgerüst — Config, `.gitignore`, `AGENTS.md`, Test-Runner-Skelett

**Files:**
- Create: `scripts/orchestrator.config.zsh`
- Create: `scripts/test/run.zsh`
- Create: `scripts/test/cases.zsh`
- Modify: `.gitignore` (Zeile anhängen)
- Modify: `AGENTS.md` (Abschnitt anhängen)

**Interfaces:**
- Consumes: nichts.
- Produces: Env-Variablen `ORCH_REPO`, `ORCH_HANDOFF`, `ORCH_STAGE`, `ORCH_MAX_ITER`, `ORCH_POLL_SECS`, `ORCH_TIMEOUT_SECS`, `ORCH_CODEX_BIN`, `ORCH_CODEX_ARGS` (Array), `ORCH_END_MARKER`, `ORCH_DONE_SIGNAL`, `ORCH_PREAMBLE`, `ORCH_AG_FOCUS_KEYSTROKE`. Test-Runner-Konvention: `scripts/test/run.zsh` sourced `cases.zsh` und ruft jede Funktion mit Präfix `test_` auf; Helfer `assert_eq "$got" "$want" "label"` und `assert_file_contains "$path" "$needle" "label"`.

- [ ] **Step 1: Config-Datei schreiben**

Create `scripts/orchestrator.config.zsh`:

```zsh
# Tunables für den Antigravity-Orchestrator. Wird von lib + entrypoint gesourced.
# Per Umgebungsvariable überschreibbar (Tests nutzen das).

: "${ORCH_REPO:=/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM}"
: "${ORCH_HANDOFF:=${ORCH_REPO}/handoff}"
: "${ORCH_STAGE:=1}"                     # 1 = Notification, 2 = AppleScript-Trigger, 3 = + Auto-Approve
: "${ORCH_MAX_ITER:=80}"
: "${ORCH_POLL_SECS:=5}"
: "${ORCH_TIMEOUT_SECS:=1800}"          # 30 min: einmalige "hängt"-Notification, danach weiter pollen
: "${ORCH_CODEX_BIN:=${HOME}/.local/bin/codex}"
: "${ORCH_END_MARKER:=--- ENDE BERICHT ---}"
: "${ORCH_DONE_SIGNAL:=ALLE AUFTRÄGE FERTIG}"
: "${ORCH_AG_FOCUS_KEYSTROKE:=l using {command down}}"  # Stufe 2: Kandidat, in Discovery bestätigen

# codex-exec-Argumente als Array (Pfad mit Leerzeichen -> Array, nicht String)
ORCH_CODEX_ARGS=(exec --cd "${ORCH_REPO}" --sandbox workspace-write --ask-for-approval never -)

# Preamble, die jedem Codex-Prompt vorangestellt wird.
read -r -d '' ORCH_PREAMBLE <<'PREAMBLE'
Du bist der Prüfer der seriellen LeadPilot-Schleife (siehe AGENTS.md, Abschnitt "Ablauf").
Die Aufträge stehen in docs/superpowers/plans/2026-09-03-facelift-antigravity-auftraege.md (Auftrag 1-12).
Unten folgt der bisherige Verlauf, danach der neueste Bericht von Antigravity (dem ausführenden Builder).

Deine Aufgabe: Antigravitys letztes Ergebnis prüfen. Fahre die Gates
(npm run verify, TypeScript-Check, Screenshot-Diffs soweit möglich, Schutzbereichs-Diff für src/simulation/).

Antworte mit GENAU EINEM von beidem:
- Korrekturen: konkrete, umsetzbare Änderungswünsche an Antigravitys letztem Ergebnis (nummeriert, mit Datei-/Stellenbezug).
- Abnahme + nächster Auftrag: "ABGENOMMEN - weiter mit Auftrag N: <knappe Beschreibung des nächsten Auftrags für Antigravity>".

Ist der letzte Auftrag (12) abgenommen, antworte ausschliesslich mit dem Wortlaut: ALLE AUFTRÄGE FERTIG

Trage deinen Befund pro Runde zusätzlich in docs/BUILD_LOG.md ein, wie in AGENTS.md ("Ledger") vorgesehen.

Adressiere alle Ausgaben an Antigravity. Keine Meta-Kommentare an mich, keine Rückfragen - triff die Entscheidung.
PREAMBLE
```

- [ ] **Step 2: `.gitignore` ergänzen**

Prüfen, ob `handoff/` schon drin ist; falls nicht, ans Dateiende anhängen:

```bash
cd "$ORCH_REPO"
grep -qxF 'handoff/' .gitignore || printf '\n# Orchestrator-Laufzeitzustand\nhandoff/\n' >> .gitignore
```

- [ ] **Step 3: `AGENTS.md`-Abschnitt anhängen**

Ans Ende von `AGENTS.md` anfügen:

```markdown

## Handoff-Protokoll (automatisierte Schleife)

Wenn du mit dem Wort „weiter" oder „next" getriggert wirst:

1. Lies `handoff/inbox.md` — dort steht dein aktueller Auftrag bzw. die Korrekturen des Prüfers.
2. Arbeite ihn vollständig ab, inklusive der in dieser Datei vorgeschriebenen eigenen Gate-Läufe.
3. Schreibe deinen Bericht nach `handoff/outbox.md` (überschreiben, nicht anhängen). Die allerletzte Zeile muss exakt `--- ENDE BERICHT ---` lauten.
4. Schreibe `handoff/outbox.md` erst, wenn du komplett fertig bist — die Datei ist das Fertig-Signal für den Orchestrator.
```

- [ ] **Step 4: Test-Runner schreiben**

Create `scripts/test/run.zsh`:

```zsh
#!/usr/bin/env zsh
set -u
HERE="${0:A:h}"
export ORCH_TEST_TMP="$(mktemp -d)"
export ORCH_REPO="$ORCH_TEST_TMP/repo"
export ORCH_HANDOFF="$ORCH_TEST_TMP/repo/handoff"
export ORCH_POLL_SECS=1
export ORCH_TIMEOUT_SECS=3
mkdir -p "$ORCH_REPO/docs" "$ORCH_HANDOFF"
export PATH="$HERE/stubs:$PATH"

PASS=0; FAIL=0
assert_eq() {  # got want label
  if [[ "$1" == "$2" ]]; then ((PASS++)); print -- "  ok   $3"
  else ((FAIL++)); print -- "  FAIL $3"; print -- "    got : $1"; print -- "    want: $2"; fi
}
assert_file_contains() {  # path needle label
  if [[ -f "$1" ]] && grep -qF -- "$2" "$1"; then ((PASS++)); print -- "  ok   $3"
  else ((FAIL++)); print -- "  FAIL $3 (in $1)"; fi
}

source "$HERE/../orchestrator.config.zsh"
source "$HERE/../lib/orchestrator-lib.zsh"
source "$HERE/cases.zsh"

for fn in ${(k)functions}; do
  [[ "$fn" == test_* ]] || continue
  print -- "• $fn"
  "$fn"
done

print -- "\n$PASS passed, $FAIL failed"
rm -rf "$ORCH_TEST_TMP"
[[ $FAIL -eq 0 ]]
```

Create `scripts/test/cases.zsh` mit Platzhalter-Inhalt, der noch nichts prüft:

```zsh
# Testfälle. Jede Funktion test_* wird vom Runner aufgerufen.
test_config_loads() {
  assert_eq "$ORCH_MAX_ITER" "80" "MAX_ITER aus Config"
  assert_eq "$ORCH_DONE_SIGNAL" "ALLE AUFTRÄGE FERTIG" "DONE_SIGNAL aus Config"
}
```

Create `scripts/test/stubs/codex` (ausführbar, `chmod +x`):

```zsh
#!/usr/bin/env zsh
# Test-Stub für die codex-CLI. Gibt $ORCH_STUB_CODEX_OUT aus (Default: Abnahme-Text).
# Exit-Code über $ORCH_STUB_CODEX_RC (Default 0). stdin wird verworfen.
cat > /dev/null
print -r -- "${ORCH_STUB_CODEX_OUT:-ABGENOMMEN - weiter mit Auftrag 2: Testauftrag}"
exit "${ORCH_STUB_CODEX_RC:-0}"
```

Create `scripts/test/stubs/osascript` (ausführbar):

```zsh
#!/usr/bin/env zsh
# Test-Stub für osascript. Hängt die Argumente an $ORCH_STUB_OSA_LOG an.
print -r -- "osascript $*" >> "${ORCH_STUB_OSA_LOG:-/dev/null}"
exit 0
```

- [ ] **Step 5: leere Lib anlegen, damit der Runner sourcen kann**

Create `scripts/lib/orchestrator-lib.zsh`:

```zsh
# Funktionsbibliothek des Antigravity-Orchestrators. Nur Definitionen, kein Top-Level-Code.
```

- [ ] **Step 6: Test ausführen**

Run: `chmod +x scripts/test/stubs/* scripts/test/run.zsh && zsh scripts/test/run.zsh`
Expected: `1 passed, 0 failed` … tatsächlich `test_config_loads` → `2 passed, 0 failed`. PASS.

- [ ] **Step 7: Commit**

```bash
cd "$ORCH_REPO"
git add scripts/orchestrator.config.zsh scripts/lib/orchestrator-lib.zsh scripts/test .gitignore AGENTS.md
git commit -m "$(printf 'feat(orchestrator): Projektgerüst, Config und Test-Runner\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 2: State-Modul (`handoff/state.json`)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (Funktionen `state_init`, `state_get`, `state_set`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_HANDOFF` aus Config; `jq` unter `/usr/bin/jq`.
- Produces:
  - `state_init` → erstellt `${ORCH_HANDOFF}/state.json` mit `{iteration:0,status:"running",last_outbox_mtime:0,started_at:<iso>,updated_at:<iso>}`, überschreibt eine vorhandene Datei **nicht**.
  - `state_get <key>` → gibt den Rohwert (String/Zahl) auf stdout aus.
  - `state_set <key> <value>` → setzt Schlüssel (Zahlen als JSON-Number, sonst String), aktualisiert `updated_at`.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_state_init_creates_defaults() {
  rm -f "$ORCH_HANDOFF/state.json"
  state_init
  assert_eq "$(state_get iteration)" "0" "state_init: iteration=0"
  assert_eq "$(state_get status)" "running" "state_init: status=running"
  assert_eq "$(state_get last_outbox_mtime)" "0" "state_init: mtime=0"
}
test_state_init_is_idempotent() {
  rm -f "$ORCH_HANDOFF/state.json"
  state_init
  state_set status "paused"
  state_init                       # darf nicht überschreiben
  assert_eq "$(state_get status)" "paused" "state_init überschreibt nicht"
}
test_state_set_number_and_string() {
  rm -f "$ORCH_HANDOFF/state.json"; state_init
  state_set iteration 7
  state_set status "done"
  assert_eq "$(state_get iteration)" "7" "state_set Zahl"
  assert_eq "$(state_get status)" "done" "state_set String"
}
```

- [ ] **Step 2: Tests laufen lassen — müssen scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL für die drei neuen Fälle (`state_init: command not found` bzw. leere Ausgabe).

- [ ] **Step 3: Implementierung in die Lib**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
_state_file() { print -r -- "${ORCH_HANDOFF}/state.json" }

state_init() {
  local f; f="$(_state_file)"
  [[ -f "$f" ]] && return 0
  mkdir -p "${ORCH_HANDOFF}"
  local now; now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  /usr/bin/jq -n --arg now "$now" \
    '{iteration:0, status:"running", last_outbox_mtime:0, started_at:$now, updated_at:$now}' \
    > "$f"
}

state_get() {  # key
  /usr/bin/jq -r --arg k "$1" '.[$k]' "$(_state_file)"
}

state_set() {  # key value
  local f tmp now; f="$(_state_file)"; tmp="${f}.tmp"; now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [[ "$2" == <-> ]]; then          # reine Ganzzahl -> JSON-Number
    /usr/bin/jq --arg k "$1" --argjson v "$2" --arg now "$now" \
      '.[$k]=$v | .updated_at=$now' "$f" > "$tmp"
  else
    /usr/bin/jq --arg k "$1" --arg v "$2" --arg now "$now" \
      '.[$k]=$v | .updated_at=$now' "$f" > "$tmp"
  fi
  mv "$tmp" "$f"
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: alle `test_state_*` PASS, Gesamt `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): State-Modul auf Basis von state.json\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 3: Prompt-Bau (`build_prompt`)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (Funktion `build_prompt`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_PREAMBLE`, `ORCH_HANDOFF`; Dateien `${ORCH_HANDOFF}/transcript.md` und `${ORCH_HANDOFF}/outbox.md` (beide müssen existieren, dürfen leer sein).
- Produces: `build_prompt` → schreibt `${ORCH_HANDOFF}/codex_prompt.md` mit exakt dieser Struktur und gibt den Pfad auf stdout aus:
  ```
  <ORCH_PREAMBLE>

  ===== BISHERIGER VERLAUF =====
  <Inhalt transcript.md>

  ===== NEUESTER BERICHT VON ANTIGRAVITY =====
  <Inhalt outbox.md>
  ```

- [ ] **Step 1: Failing Test schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_build_prompt_structure() {
  print -r -- "Runde 1 Verlauf" > "$ORCH_HANDOFF/transcript.md"
  print -r -- "Bericht-Text\n--- ENDE BERICHT ---" > "$ORCH_HANDOFF/outbox.md"
  local out; out="$(build_prompt)"
  assert_eq "$out" "$ORCH_HANDOFF/codex_prompt.md" "build_prompt gibt Pfad zurück"
  assert_file_contains "$out" "Du bist der Prüfer der seriellen LeadPilot-Schleife" "Prompt enthält Preamble"
  assert_file_contains "$out" "===== BISHERIGER VERLAUF =====" "Prompt hat Verlauf-Trenner"
  assert_file_contains "$out" "Runde 1 Verlauf" "Prompt enthält Transcript"
  assert_file_contains "$out" "===== NEUESTER BERICHT VON ANTIGRAVITY =====" "Prompt hat Bericht-Trenner"
  assert_file_contains "$out" "Bericht-Text" "Prompt enthält Outbox"
}
```

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`build_prompt: command not found`).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
build_prompt() {
  local out="${ORCH_HANDOFF}/codex_prompt.md"
  {
    print -r -- "$ORCH_PREAMBLE"
    print -r -- ""
    print -r -- "===== BISHERIGER VERLAUF ====="
    cat "${ORCH_HANDOFF}/transcript.md"
    print -r -- ""
    print -r -- "===== NEUESTER BERICHT VON ANTIGRAVITY ====="
    cat "${ORCH_HANDOFF}/outbox.md"
  } > "$out"
  print -r -- "$out"
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: alle `test_build_prompt_*` PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): Prompt-Bau aus Preamble, Transcript und Outbox\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 4: Codex-Aufruf (`call_codex`)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (Funktion `call_codex`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_CODEX_BIN`, `ORCH_CODEX_ARGS` (Array), `${ORCH_HANDOFF}/codex_prompt.md` (von `build_prompt`). In Tests liegt der Stub `codex` im PATH; damit der Stub statt `$ORCH_CODEX_BIN` greift, ruft `call_codex` `codex` über den Namen auf, wenn `ORCH_CODEX_BIN` nicht existiert, sonst den absoluten Pfad.
- Produces: `call_codex` → schreibt Codex-stdout nach `${ORCH_HANDOFF}/.codex_out` **und** gibt es auf stdout aus; Rückgabewert = Exit-Code der CLI.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_call_codex_returns_output() {
  print -r -- "egal" > "$ORCH_HANDOFF/codex_prompt.md"
  ORCH_STUB_CODEX_OUT="ABGENOMMEN - weiter mit Auftrag 3: Foo" \
  ORCH_STUB_CODEX_RC=0 \
    call_codex >/dev/null
  assert_file_contains "$ORCH_HANDOFF/.codex_out" "Auftrag 3: Foo" "call_codex speichert Ausgabe"
}
test_call_codex_propagates_failure() {
  print -r -- "egal" > "$ORCH_HANDOFF/codex_prompt.md"
  local rc
  ORCH_STUB_CODEX_RC=1 call_codex >/dev/null; rc=$?
  assert_eq "$rc" "1" "call_codex reicht Exit-Code 1 durch"
}
```

- [ ] **Step 2: Tests laufen lassen — müssen scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`call_codex: command not found`).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
call_codex() {
  local bin rc
  if [[ -x "$ORCH_CODEX_BIN" ]]; then bin="$ORCH_CODEX_BIN"; else bin="codex"; fi
  "$bin" "${ORCH_CODEX_ARGS[@]}" < "${ORCH_HANDOFF}/codex_prompt.md" \
    | tee "${ORCH_HANDOFF}/.codex_out"
  rc=${pipestatus[1]}
  return $rc
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_call_codex_*` PASS.

- [ ] **Step 5: Realer Rauchtest gegen die echte CLI (einmalig, manuell)**

Run:
```bash
cd "/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM"
printf 'Antworte nur mit dem Wort: PONG\n' | ~/.local/bin/codex exec --cd "$PWD" --sandbox workspace-write --ask-for-approval never -
```
Expected: Ausgabe enthält `PONG`. Falls die CLI die Flags nicht kennt: mit `--full-auto` wiederholen und in `orchestrator.config.zsh` `ORCH_CODEX_ARGS` entsprechend anpassen (Step separat committen).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): call_codex mit Exit-Code-Durchreichung\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 5: Transcript-Anhängen und Abschluss-Erkennung

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (`append_transcript`, `is_done`, `outbox_complete`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_HANDOFF`, `ORCH_DONE_SIGNAL`, `ORCH_END_MARKER`.
- Produces:
  - `append_transcript <rolle> <runde> <pfad>` → hängt an `transcript.md` an: Leerzeile, `## Runde <runde> — <rolle>`, Leerzeile, Inhalt von `<pfad>`.
  - `is_done <text>` → Exit 0, wenn `<text>` getrimmt exakt `ORCH_DONE_SIGNAL` ist, sonst Exit 1.
  - `outbox_complete` → Exit 0, wenn die letzte nicht-leere Zeile von `${ORCH_HANDOFF}/outbox.md` exakt `ORCH_END_MARKER` ist, sonst Exit 1.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_append_transcript_adds_block() {
  : > "$ORCH_HANDOFF/transcript.md"
  print -r -- "Codex-Text hier" > "$ORCH_HANDOFF/.codex_out"
  append_transcript "Codex" 4 "$ORCH_HANDOFF/.codex_out"
  assert_file_contains "$ORCH_HANDOFF/transcript.md" "## Runde 4 — Codex" "Transcript-Überschrift"
  assert_file_contains "$ORCH_HANDOFF/transcript.md" "Codex-Text hier" "Transcript-Inhalt"
}
test_is_done_exact_match() {
  if is_done "  ALLE AUFTRÄGE FERTIG  "; then assert_eq "ja" "ja" "is_done erkennt Signal mit Rand-Whitespace"
  else assert_eq "nein" "ja" "is_done erkennt Signal mit Rand-Whitespace"; fi
}
test_is_done_rejects_other() {
  if is_done "ABGENOMMEN - weiter mit Auftrag 5"; then assert_eq "ja" "nein" "is_done lehnt normalen Text ab"
  else assert_eq "nein" "nein" "is_done lehnt normalen Text ab"; fi
}
test_outbox_complete_detects_marker() {
  printf 'Bericht\n\n--- ENDE BERICHT ---\n' > "$ORCH_HANDOFF/outbox.md"
  if outbox_complete; then assert_eq "ja" "ja" "outbox_complete erkennt Endmarker"
  else assert_eq "nein" "ja" "outbox_complete erkennt Endmarker"; fi
}
test_outbox_complete_rejects_partial() {
  printf 'Bericht ohne Ende\n' > "$ORCH_HANDOFF/outbox.md"
  if outbox_complete; then assert_eq "ja" "nein" "outbox_complete lehnt Teil-Bericht ab"
  else assert_eq "nein" "nein" "outbox_complete lehnt Teil-Bericht ab"; fi
}
```

- [ ] **Step 2: Tests laufen lassen — müssen scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (Funktionen unbekannt).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
append_transcript() {  # rolle runde pfad
  {
    print -r -- ""
    print -r -- "## Runde $2 — $1"
    print -r -- ""
    cat "$3"
  } >> "${ORCH_HANDOFF}/transcript.md"
}

is_done() {  # text
  local t="${1##[[:space:]]#}"; t="${t%%[[:space:]]#}"
  [[ "$t" == "$ORCH_DONE_SIGNAL" ]]
}

outbox_complete() {
  local last
  last="$(grep -v '^[[:space:]]*$' "${ORCH_HANDOFF}/outbox.md" 2>/dev/null | tail -n 1)"
  [[ "$last" == "$ORCH_END_MARKER" ]]
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: alle neuen PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): Transcript-Anhang, Abschluss- und Outbox-Erkennung\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 6: Dispatch an Antigravity — Stufe 1 (Inbox + Zwischenablage + Notification)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (`write_inbox`, `notify`, `dispatch_to_antigravity`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_HANDOFF`, `ORCH_STAGE`, `${ORCH_HANDOFF}/.codex_out`; Kommandos `pbcopy`, `osascript` (in Tests gestubbt bzw. real harmlos).
- Produces:
  - `write_inbox <pfad>` → kopiert `<pfad>` nach `${ORCH_HANDOFF}/inbox.md` (überschreiben).
  - `notify <titel> <text>` → `osascript -e 'display notification ...'`.
  - `dispatch_to_antigravity <runde>` → ruft `write_inbox "${ORCH_HANDOFF}/.codex_out"`, `pbcopy < inbox.md`, und **bei `ORCH_STAGE=1`** `notify "Antigravity ist dran" "Runde <runde>: in Antigravity »weiter« + Enter"`. Rückgabe 0.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_dispatch_stage1_writes_inbox_and_notifies() {
  export ORCH_STAGE=1
  export ORCH_STUB_OSA_LOG="$ORCH_HANDOFF/.osa.log"; : > "$ORCH_STUB_OSA_LOG"
  print -r -- "ABGENOMMEN - weiter mit Auftrag 2: Baue X" > "$ORCH_HANDOFF/.codex_out"
  dispatch_to_antigravity 2
  assert_file_contains "$ORCH_HANDOFF/inbox.md" "Auftrag 2: Baue X" "inbox.md geschrieben"
  assert_file_contains "$ORCH_STUB_OSA_LOG" "display notification" "Stufe 1 schickt Notification"
}
```

*(Zwischenablage wird im Test nicht geprüft — `pbcopy` ist auf dem CI-losen Mac real und harmlos.)*

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`dispatch_to_antigravity: command not found`).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
write_inbox() {  # pfad
  cat "$1" > "${ORCH_HANDOFF}/inbox.md"
}

notify() {  # titel text
  local t="${1//\"/}" m="${2//\"/}"
  osascript -e "display notification \"${m}\" with title \"${t}\" sound name \"Ping\"" >/dev/null 2>&1 || true
}

dispatch_to_antigravity() {  # runde
  local runde="$1"
  write_inbox "${ORCH_HANDOFF}/.codex_out"
  pbcopy < "${ORCH_HANDOFF}/inbox.md" 2>/dev/null || true
  case "$ORCH_STAGE" in
    1) notify "Antigravity ist dran" "Runde ${runde}: in Antigravity »weiter« + Enter" ;;
    2|3) dispatch_stage2 "$runde" ;;
  esac
  return 0
}
```

*(`dispatch_stage2` kommt in Task 10; bis dahin ist `ORCH_STAGE=1` der einzige getestete Pfad.)*

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_dispatch_stage1_*` PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): Dispatch Stufe 1 (Inbox, Zwischenablage, Notification)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 7: Warten auf den Antigravity-Bericht (`wait_for_outbox`)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (`file_mtime`, `wait_for_outbox`)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_HANDOFF`, `ORCH_POLL_SECS`, `ORCH_TIMEOUT_SECS`, `outbox_complete` (Task 5), `notify` (Task 6).
- Produces:
  - `file_mtime <pfad>` → gibt mtime in Sekunden (Epoch) aus, `0` wenn nicht vorhanden. Nutzt `stat -f %m`.
  - `wait_for_outbox <last_mtime> <runde>` → pollt alle `ORCH_POLL_SECS` s: erfüllt, wenn `file_mtime(outbox.md) > last_mtime` **und** `outbox_complete`. Nach `ORCH_TIMEOUT_SECS` s einmalig `notify "Runde <runde> hängt" ...`, danach weiter pollen. Gibt bei Erfüllung die neue mtime auf stdout aus, Rückgabe 0. Für Testbarkeit: bricht nach `ORCH_WAIT_MAX_LOOPS` (Default 100000; Tests setzen es klein) mit Rückgabe 2 ab.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_wait_for_outbox_returns_when_complete() {
  printf 'Bericht\n--- ENDE BERICHT ---\n' > "$ORCH_HANDOFF/outbox.md"
  # mtime in die Zukunft schieben, damit > last_mtime sicher gilt
  touch -t 203001010000 "$ORCH_HANDOFF/outbox.md"
  local newm
  newm="$(wait_for_outbox 0 9)"
  assert_eq "$?" "0" "wait_for_outbox: Rückgabe 0 bei fertigem Bericht"
  [[ "$newm" -gt 0 ]] && assert_eq "ja" "ja" "wait_for_outbox gibt mtime aus" \
    || assert_eq "nein" "ja" "wait_for_outbox gibt mtime aus"
}
test_wait_for_outbox_ignores_incomplete() {
  printf 'nur Anfang\n' > "$ORCH_HANDOFF/outbox.md"
  touch -t 203001010000 "$ORCH_HANDOFF/outbox.md"
  export ORCH_WAIT_MAX_LOOPS=2
  wait_for_outbox 0 9 >/dev/null
  assert_eq "$?" "2" "wait_for_outbox bricht bei dauerhaft unvollständigem Bericht ab (Testlimit)"
  unset ORCH_WAIT_MAX_LOOPS
}
```

- [ ] **Step 2: Tests laufen lassen — müssen scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`wait_for_outbox: command not found`).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
file_mtime() {  # pfad
  [[ -f "$1" ]] && stat -f %m "$1" || print -- 0
}

wait_for_outbox() {  # last_mtime runde
  local last="$1" runde="$2"
  local waited=0 warned=0 loops=0
  local max_loops="${ORCH_WAIT_MAX_LOOPS:-100000}"
  while (( loops < max_loops )); do
    local m; m="$(file_mtime "${ORCH_HANDOFF}/outbox.md")"
    if (( m > last )) && outbox_complete; then
      print -- "$m"
      return 0
    fi
    if (( warned == 0 && waited >= ORCH_TIMEOUT_SECS )); then
      notify "Runde ${runde} hängt" "Antigravity hat seit ${ORCH_TIMEOUT_SECS}s nicht geliefert."
      warned=1
    fi
    sleep "$ORCH_POLL_SECS"
    (( waited += ORCH_POLL_SECS ))
    (( loops += 1 ))
  done
  return 2
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_wait_for_outbox_*` PASS. (Der zweite Test dauert ~2 s wegen `sleep 1`.)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): wait_for_outbox mit Poll, Timeout-Notification und Testlimit\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 8: Lock-Handling (`acquire_lock`, `release_lock`)

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh`
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_HANDOFF`.
- Produces:
  - `acquire_lock` → legt `${ORCH_HANDOFF}/.lock` mit `pid=$$` und `since=<iso>` an. Existiert die Datei mit noch lebender PID (`kill -0`), Rückgabe 1 und Fehlermeldung auf stderr. Stale Lock (PID tot) wird überschrieben, Rückgabe 0.
  - `release_lock` → entfernt `${ORCH_HANDOFF}/.lock`, aber nur, wenn `pid=$$` darin steht.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_acquire_lock_first_time() {
  rm -f "$ORCH_HANDOFF/.lock"
  acquire_lock; assert_eq "$?" "0" "acquire_lock frisch -> 0"
  assert_file_contains "$ORCH_HANDOFF/.lock" "pid=$$" "Lock enthält eigene PID"
  release_lock
  [[ -f "$ORCH_HANDOFF/.lock" ]] && assert_eq "da" "weg" "release_lock entfernt Lock" \
    || assert_eq "weg" "weg" "release_lock entfernt Lock"
}
test_acquire_lock_blocks_when_alive() {
  rm -f "$ORCH_HANDOFF/.lock"
  printf 'pid=%s\nsince=x\n' "$$" > "$ORCH_HANDOFF/.lock"   # lebende PID (wir selbst)
  acquire_lock 2>/dev/null; assert_eq "$?" "1" "acquire_lock blockiert bei lebendem Lock"
  rm -f "$ORCH_HANDOFF/.lock"
}
test_acquire_lock_overrides_stale() {
  rm -f "$ORCH_HANDOFF/.lock"
  printf 'pid=999999\nsince=x\n' > "$ORCH_HANDOFF/.lock"    # PID existiert nicht
  acquire_lock; assert_eq "$?" "0" "acquire_lock überschreibt stale Lock"
  assert_file_contains "$ORCH_HANDOFF/.lock" "pid=$$" "Lock jetzt mit eigener PID"
  release_lock
}
```

- [ ] **Step 2: Tests laufen lassen — müssen scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL.

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
acquire_lock() {
  local f="${ORCH_HANDOFF}/.lock"
  if [[ -f "$f" ]]; then
    local oldpid; oldpid="$(sed -n 's/^pid=//p' "$f")"
    if [[ -n "$oldpid" ]] && kill -0 "$oldpid" 2>/dev/null; then
      print -u2 -- "Orchestrator läuft bereits (pid=$oldpid). Abbruch."
      return 1
    fi
  fi
  printf 'pid=%s\nsince=%s\n' "$$" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$f"
  return 0
}

release_lock() {
  local f="${ORCH_HANDOFF}/.lock"
  [[ -f "$f" ]] || return 0
  [[ "$(sed -n 's/^pid=//p' "$f")" == "$$" ]] && rm -f "$f"
}
```

- [ ] **Step 4: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_acquire_lock_*` PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh
git commit -m "$(printf 'feat(orchestrator): Lock-Handling mit Stale-Erkennung\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 9: Entrypoint — Hauptschleife (`scripts/orchestrator.zsh`)

**Files:**
- Create: `scripts/orchestrator.zsh`
- Create: `scripts/test/stubs/antigravity-sim.zsh` (Test-Helfer, simuliert Antigravity)
- Modify: `scripts/test/cases.zsh` (Integrationstest)

**Interfaces:**
- Consumes: alle Lib-Funktionen aus Task 2–8, `ORCH_MAX_ITER`.
- Produces: ausführbares `scripts/orchestrator.zsh`, das die komplette Schleife fährt. Beendet mit Exit 0 bei `status=done` oder `status=paused`, Exit 1 bei `status=error`.
- Schleifenlogik (eine Runde `N`, beginnend bei `N=$(state_get iteration)+1`):
  1. `handoff/PAUSE` vorhanden → `state_set status paused`; `notify`; `release_lock`; Exit 0.
  2. `build_prompt`.
  3. `call_codex`; Exit-Code ≠ 0 → `state_set status error`; `notify`; `release_lock`; Exit 1.
  4. `append_transcript Codex $N "${ORCH_HANDOFF}/.codex_out"`.
  5. `is_done "$(cat ${ORCH_HANDOFF}/.codex_out)"` → `state_set status done`; `notify "LeadPilot fertig" ...`; `release_lock`; Exit 0.
  6. `dispatch_to_antigravity $N`.
  7. `local nm=$(wait_for_outbox "$(state_get last_outbox_mtime)" $N)`; Rückgabe 2 (nur im Test) → `release_lock`; Exit 1.
  8. `append_transcript Antigravity $N "${ORCH_HANDOFF}/outbox.md"`.
  9. `state_set last_outbox_mtime $nm`; `state_set iteration $N`.
  10. `N` ≥ `ORCH_MAX_ITER` → `state_set status error`; `notify "MAX_ITER erreicht" ...`; `release_lock`; Exit 1. Sonst nächste Runde.

- [ ] **Step 1: Integrationstest + Antigravity-Simulator schreiben**

Create `scripts/test/stubs/antigravity-sim.zsh`:

```zsh
#!/usr/bin/env zsh
# Simuliert Antigravity: wartet kurz, schreibt dann einen fertigen Bericht nach outbox.md.
# Aufruf: antigravity-sim.zsh <handoff-dir> <sekunden-verzoegerung>
sleep "${2:-1}"
printf 'Auftrag erledigt (simuliert).\n--- ENDE BERICHT ---\n' > "$1/outbox.md"
touch "$1/outbox.md"
```

In `scripts/test/cases.zsh` anhängen:

```zsh
test_mainloop_two_rounds_then_done() {
  # frischer Bus
  rm -f "$ORCH_HANDOFF"/{state.json,inbox.md,outbox.md,transcript.md,codex_prompt.md,.codex_out,.lock}
  : > "$ORCH_HANDOFF/transcript.md"
  printf 'Session-Start.\n--- ENDE BERICHT ---\n' > "$ORCH_HANDOFF/outbox.md"
  export ORCH_STAGE=1
  export ORCH_STUB_OSA_LOG="$ORCH_HANDOFF/.osa.log"; : > "$ORCH_STUB_OSA_LOG"

  # Codex: Runde 1 -> Abnahme+nächster Auftrag; Runde 2 -> Fertig-Signal.
  # Wir steuern das über eine Zählerdatei im Stub.
  export ORCH_STUB_CODEX_SCRIPT="$ORCH_HANDOFF/.codex_script"
  cat > "$ORCH_STUB_CODEX_SCRIPT" <<'SCRIPT'
1|ABGENOMMEN - weiter mit Auftrag 2: mach weiter
2|ALLE AUFTRÄGE FERTIG
SCRIPT

  # Antigravity-Simulator läuft parallel: nach jeder inbox.md-Änderung neuen Bericht schreiben.
  ( for i in 1 2; do
      while [[ ! -f "$ORCH_HANDOFF/.round_$i" ]]; do sleep 0.3; done
      sleep 0.5
      printf 'Runde %s erledigt (sim).\n--- ENDE BERICHT ---\n' "$i" > "$ORCH_HANDOFF/outbox.md"
      touch "$ORCH_HANDOFF/outbox.md"
    done ) &
  local simpid=$!

  ORCH_POLL_SECS=1 ORCH_MAX_ITER=10 \
    zsh "${0:A:h}/../orchestrator.zsh"
  local rc=$?
  kill "$simpid" 2>/dev/null

  assert_eq "$rc" "0" "Hauptschleife endet mit 0"
  assert_eq "$(state_get status)" "done" "Status am Ende: done"
  assert_file_contains "$ORCH_HANDOFF/transcript.md" "## Runde 1 — Codex" "Transcript Runde 1 Codex"
  assert_file_contains "$ORCH_HANDOFF/transcript.md" "## Runde 1 — Antigravity" "Transcript Runde 1 Antigravity"
  assert_file_contains "$ORCH_HANDOFF/transcript.md" "## Runde 2 — Codex" "Transcript Runde 2 Codex"
}
```

Der `codex`-Stub braucht dafür eine Skript-Fähigkeit — `scripts/test/stubs/codex` ersetzen durch:

```zsh
#!/usr/bin/env zsh
cat > /dev/null
if [[ -n "${ORCH_STUB_CODEX_SCRIPT:-}" && -f "$ORCH_STUB_CODEX_SCRIPT" ]]; then
  local cnt="${ORCH_STUB_CODEX_SCRIPT}.cnt"
  local n; n=$(( $(cat "$cnt" 2>/dev/null || print 0) + 1 )); print -- "$n" > "$cnt"
  local line; line="$(sed -n "${n}p" "$ORCH_STUB_CODEX_SCRIPT")"
  print -r -- "${line#*|}"
  # Signal an den Test, dass Runde n dispatcht wurde:
  [[ -n "${ORCH_HANDOFF:-}" ]] && touch "${ORCH_HANDOFF}/.round_${n}"
  exit 0
fi
print -r -- "${ORCH_STUB_CODEX_OUT:-ABGENOMMEN - weiter mit Auftrag 2: Testauftrag}"
exit "${ORCH_STUB_CODEX_RC:-0}"
```

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`orchestrator.zsh` existiert nicht / kein sauberer Ablauf).

- [ ] **Step 3: Entrypoint schreiben**

Create `scripts/orchestrator.zsh`:

```zsh
#!/usr/bin/env zsh
set -u
HERE="${0:A:h}"
source "${HERE}/orchestrator.config.zsh"
source "${HERE}/lib/orchestrator-lib.zsh"

mkdir -p "${ORCH_HANDOFF}"
[[ -f "${ORCH_HANDOFF}/transcript.md" ]] || : > "${ORCH_HANDOFF}/transcript.md"
[[ -f "${ORCH_HANDOFF}/outbox.md" ]] || printf 'Session-Start, noch kein Bericht.\n%s\n' "$ORCH_END_MARKER" > "${ORCH_HANDOFF}/outbox.md"

acquire_lock || exit 1
state_init

cleanup() { release_lock; }
trap 'cleanup; print -u2 -- "abgebrochen"; exit 130' INT TERM
trap 'cleanup' EXIT

finish() {  # status exitcode [notify-titel] [notify-text]
  state_set status "$1"
  [[ -n "${3:-}" ]] && notify "$3" "${4:-}"
  release_lock
  exit "$2"
}

N=$(( $(state_get iteration) + 1 ))
while :; do
  [[ -f "${ORCH_HANDOFF}/PAUSE" ]] && finish paused 0 "Orchestrator pausiert" "PAUSE-Datei erkannt (vor Runde ${N})."

  build_prompt >/dev/null
  if ! call_codex >/dev/null; then
    finish error 1 "Codex-Fehler" "codex exec ist in Runde ${N} fehlgeschlagen."
  fi
  append_transcript "Codex" "$N" "${ORCH_HANDOFF}/.codex_out"

  if is_done "$(cat "${ORCH_HANDOFF}/.codex_out")"; then
    finish done 0 "LeadPilot: alle Aufträge fertig" "Codex hat in Runde ${N} das Abschlusssignal gegeben."
  fi

  dispatch_to_antigravity "$N"

  local nm
  if ! nm=$(wait_for_outbox "$(state_get last_outbox_mtime)" "$N"); then
    finish error 1 "Orchestrator abgebrochen" "wait_for_outbox in Runde ${N} ohne Ergebnis."
  fi
  append_transcript "Antigravity" "$N" "${ORCH_HANDOFF}/outbox.md"
  state_set last_outbox_mtime "$nm"
  state_set iteration "$N"

  if (( N >= ORCH_MAX_ITER )); then
    finish error 1 "MAX_ITER erreicht" "Nach ${N} Runden kein Abschluss — Schleife gestoppt."
  fi
  (( N += 1 ))
done
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `chmod +x scripts/orchestrator.zsh scripts/test/stubs/* && zsh scripts/test/run.zsh`
Expected: `test_mainloop_two_rounds_then_done` PASS, Gesamt `0 failed`.

- [ ] **Step 5: Manueller Trockenlauf gegen echtes Repo, aber Codex gestubbt**

Run:
```bash
cd "/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM"
mkdir -p /tmp/ag-dry && PATH="$PWD/scripts/test/stubs:$PATH" \
  ORCH_HANDOFF=/tmp/ag-dry ORCH_STAGE=1 ORCH_POLL_SECS=1 \
  ORCH_STUB_CODEX_OUT="ALLE AUFTRÄGE FERTIG" \
  zsh scripts/orchestrator.zsh; echo "rc=$?"
```
Expected: `rc=0`, `/tmp/ag-dry/state.json` zeigt `status:"done"`, Notification ist erschienen.

- [ ] **Step 6: Commit**

```bash
git add scripts/orchestrator.zsh scripts/test
git commit -m "$(printf 'feat(orchestrator): Entrypoint mit Hauptschleife, Traps und finish-Helfer\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 10: Stufe 2 — AppleScript tippt „weiter"

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (`dispatch_stage2`)
- Create: `scripts/README-orchestrator.md`
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_AG_FOCUS_KEYSTROKE`, `ORCH_STAGE`; `osascript` (real bzw. gestubbt).
- Produces: `dispatch_stage2 <runde>` → führt ein AppleScript aus, das (1) `Antigravity` aktiviert, (2) die Chat-Eingabe per `keystroke ... ` fokussiert, (3) `weiter` tippt, (4) Return sendet. Schlägt `osascript` fehl, `notify` als Fallback + Rückgabe 1; sonst Rückgabe 0. Wird von `dispatch_to_antigravity` bei Stufe 2/3 aufgerufen (Verdrahtung existiert seit Task 6).

- [ ] **Step 1: Failing Test schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_dispatch_stage2_invokes_osascript_with_keystroke() {
  export ORCH_STAGE=2
  export ORCH_STUB_OSA_LOG="$ORCH_HANDOFF/.osa2.log"; : > "$ORCH_STUB_OSA_LOG"
  print -r -- "irgendein Auftrag" > "$ORCH_HANDOFF/.codex_out"
  dispatch_to_antigravity 5
  assert_file_contains "$ORCH_STUB_OSA_LOG" "Antigravity" "Stufe 2: AppleScript spricht Antigravity an"
  assert_file_contains "$ORCH_STUB_OSA_LOG" "weiter" "Stufe 2: AppleScript tippt »weiter«"
}
```

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL (`dispatch_stage2: command not found`).

- [ ] **Step 3: Implementierung**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
dispatch_stage2() {  # runde
  local runde="$1"
  osascript \
    -e 'tell application "Antigravity" to activate' \
    -e 'delay 0.4' \
    -e "tell application \"System Events\" to keystroke ${ORCH_AG_FOCUS_KEYSTROKE}" \
    -e 'delay 0.2' \
    -e 'tell application "System Events" to keystroke "weiter"' \
    -e 'tell application "System Events" to key code 36' \
    >/dev/null 2>&1
  if [[ $? -ne 0 ]]; then
    notify "Antigravity-Trigger fehlgeschlagen" "Runde ${runde}: bitte »weiter« von Hand senden."
    return 1
  fi
  return 0
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_dispatch_stage2_*` PASS.

- [ ] **Step 5: Discovery-Checkliste + Bedienungsdoku schreiben**

Create `scripts/README-orchestrator.md`:

```markdown
# Antigravity-Orchestrator — Bedienung

## Start
    cd "/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM"
    zsh scripts/orchestrator.zsh        # Live-Log im Terminal

## Stop
- Geplant:  `touch handoff/PAUSE`  → endet sauber nach der laufenden Runde. Danach `rm handoff/PAUSE` und neu starten setzt fort.
- Sofort:   Ctrl-C.

## Stufe wählen
`scripts/orchestrator.config.zsh` → `ORCH_STAGE`:
- 1 = nur Notification, du tippst »weiter« + Enter in Antigravity.
- 2 = AppleScript tippt »weiter« selbst.
- 3 = wie 2, plus Auto-Approve der Antigravity-Popups (Task 11).

Vor Stufe 2/3 einmalig in den macOS-Einstellungen unter
Datenschutz & Sicherheit → Bedienungshilfen dem Terminal (bzw. dem
LaunchAgent-Prozess) Zugriff geben.

## Discovery: Chat-Fokus-Shortcut für Stufe 2
`ORCH_AG_FOCUS_KEYSTROKE` in der Config muss Antigravitys Tastenkürzel
„Eingabefeld des Chats fokussieren" treffen. Vorgehen:
1. Antigravity öffnen, Projekt laden, in einen anderen Bereich klicken (Editor).
2. Kandidaten testen: ⌘L, ⌘I, ⌘⇧L, ⌘⇧I — welcher setzt den Cursor ins Chat-Eingabefeld?
3. Treffer in AppleScript-Schreibweise eintragen, z. B. `l using {command down}`
   oder `i using {command down, shift down}`.
4. Trockentest:
       ORCH_STAGE=2 zsh -c 'source scripts/orchestrator.config.zsh; source scripts/lib/orchestrator-lib.zsh; dispatch_stage2 0'
   Erwartung: Antigravity kommt nach vorn, „weiter" landet im Chatfeld, Enter schickt es ab.
5. Kein verlässlicher Shortcut? `brew install cliclick`, feste Fensterkoordinate
   des Eingabefelds bestimmen (`cliclick p` zeigt die Mausposition) und in
   `dispatch_stage2` die `keystroke`-Fokuszeile durch `do shell script "cliclick c:<x>,<y>"` ersetzen.
```

- [ ] **Step 6: Manuelle Stufe-2-Verifikation (dokumentiert, nicht automatisiert)**

Antigravity mit dem Projekt offen halten, dann Step-4-Trockentest aus der
Checkliste ausführen. Erst wenn „weiter" zuverlässig im Chat landet, `ORCH_STAGE=2`
in der Config setzen und committen.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/test/cases.zsh scripts/README-orchestrator.md
git commit -m "$(printf 'feat(orchestrator): Stufe 2 – AppleScript-Trigger fuer Antigravity\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 11: Stufe 3 — Auto-Approve der Antigravity-Popups

**Files:**
- Modify: `scripts/lib/orchestrator-lib.zsh` (`approve_watcher_start`, `approve_watcher_stop`)
- Modify: `scripts/orchestrator.zsh` (Watcher um `wait_for_outbox` legen, wenn `ORCH_STAGE=3`)
- Modify: `scripts/README-orchestrator.md` (Stufe-3-Abschnitt)
- Modify: `scripts/test/cases.zsh`

**Interfaces:**
- Consumes: `ORCH_STAGE`, `ORCH_HANDOFF`; `osascript` (real bzw. gestubbt).
- Produces:
  - `approve_watcher_start` → startet im Hintergrund eine Schleife, die alle 2 s per System-Events-AppleScript nach einem Button mit Titel `Allow`/`Run`/`Zulassen`/`Ausführen` in einem Antigravity-Fenster sucht und ihn klickt. Schreibt die Background-PID nach `${ORCH_HANDOFF}/.approve.pid`.
  - `approve_watcher_stop` → killt die PID aus `${ORCH_HANDOFF}/.approve.pid` und löscht die Datei.
- Entrypoint: bei `ORCH_STAGE=3` `approve_watcher_start` vor `wait_for_outbox`, `approve_watcher_stop` danach; `approve_watcher_stop` auch im `cleanup`-Trap.

- [ ] **Step 1: Failing Tests schreiben**

In `scripts/test/cases.zsh` anhängen:

```zsh
test_approve_watcher_start_stop() {
  rm -f "$ORCH_HANDOFF/.approve.pid"
  export ORCH_POLL_SECS=1
  approve_watcher_start
  assert_file_contains "$ORCH_HANDOFF/.approve.pid" "" "Watcher schreibt PID-Datei"
  local pid; pid="$(cat "$ORCH_HANDOFF/.approve.pid")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null \
    && assert_eq "läuft" "läuft" "Watcher-Prozess läuft" \
    || assert_eq "tot" "läuft" "Watcher-Prozess läuft"
  approve_watcher_stop
  [[ -f "$ORCH_HANDOFF/.approve.pid" ]] && assert_eq "da" "weg" "PID-Datei nach stop weg" \
    || assert_eq "weg" "weg" "PID-Datei nach stop weg"
}
```

- [ ] **Step 2: Test laufen lassen — muss scheitern**

Run: `zsh scripts/test/run.zsh`
Expected: FAIL.

- [ ] **Step 3: Implementierung in die Lib**

In `scripts/lib/orchestrator-lib.zsh` anhängen:

```zsh
_approve_applescript() {
  cat <<'OSA'
tell application "System Events"
  repeat with p in (every process whose name is "Antigravity")
    repeat with w in (every window of p)
      repeat with b in (every button of w)
        try
          if (title of b) is in {"Allow", "Run", "Zulassen", "Ausführen", "Accept"} then
            click b
          end if
        end try
      end repeat
    end repeat
  end repeat
end tell
OSA
}

approve_watcher_start() {
  local script; script="$(_approve_applescript)"
  ( while :; do
      osascript -e "$script" >/dev/null 2>&1 || true
      sleep "${ORCH_POLL_SECS:-2}"
    done ) &
  print -- "$!" > "${ORCH_HANDOFF}/.approve.pid"
}

approve_watcher_stop() {
  local f="${ORCH_HANDOFF}/.approve.pid"
  [[ -f "$f" ]] || return 0
  kill "$(cat "$f")" 2>/dev/null || true
  rm -f "$f"
}
```

- [ ] **Step 4: Entrypoint verdrahten**

In `scripts/orchestrator.zsh`:

- `cleanup()` erweitern zu:

```zsh
cleanup() { approve_watcher_stop 2>/dev/null; release_lock; }
```

- Den `wait_for_outbox`-Block ersetzen durch:

```zsh
  [[ "$ORCH_STAGE" == 3 ]] && approve_watcher_start
  local nm
  if ! nm=$(wait_for_outbox "$(state_get last_outbox_mtime)" "$N"); then
    approve_watcher_stop
    finish error 1 "Orchestrator abgebrochen" "wait_for_outbox in Runde ${N} ohne Ergebnis."
  fi
  [[ "$ORCH_STAGE" == 3 ]] && approve_watcher_stop
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `zsh scripts/test/run.zsh`
Expected: `test_approve_watcher_*` PASS; `test_mainloop_two_rounds_then_done` weiterhin PASS (läuft mit `ORCH_STAGE=1`, Watcher inaktiv).

- [ ] **Step 6: Stufe-3-Doku ergänzen**

An `scripts/README-orchestrator.md` anhängen:

```markdown
## Stufe 3 — Popups automatisch bestätigen

Zwei Wege, in dieser Reihenfolge probieren:

1. **Antigravity-Einstellung (bevorzugt):** In Antigravity nach einer Option wie
   „Auto-run commands" / „Allow all commands in this workspace" / „YOLO mode"
   suchen und für dieses Projekt aktivieren. Dann entfällt der Watcher — `ORCH_STAGE=2`
   genügt.
2. **Watcher (Fallback):** Gibt es keine solche Einstellung, `ORCH_STAGE=3` setzen.
   Der Orchestrator klickt dann während des Wartens per Bedienungshilfen-Zugriff
   selbständig „Allow"/„Run"/„Zulassen"-Buttons in Antigravity-Fenstern.
   Voraussetzung: Terminal-Prozess hat Bedienungshilfen-Zugriff (siehe Stufe 2).
   Prüfen, welche Button-Titel Antigravity real verwendet, und die Liste in
   `_approve_applescript` in `scripts/lib/orchestrator-lib.zsh` anpassen.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/orchestrator-lib.zsh scripts/orchestrator.zsh scripts/test/cases.zsh scripts/README-orchestrator.md
git commit -m "$(printf 'feat(orchestrator): Stufe 3 – Auto-Approve-Watcher fuer Antigravity-Popups\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 12: Optionaler LaunchAgent

**Files:**
- Create: `com.marc.antigravity-orchestrator.plist`
- Modify: `scripts/README-orchestrator.md`

**Interfaces:**
- Consumes: nichts (eigenständige plist).
- Produces: `com.marc.antigravity-orchestrator.plist` im Repo-Root als Vorlage; Installziel `~/Library/LaunchAgents/`. `RunAtLoad=false`, **kein** `KeepAlive` — nur per `launchctl kickstart` on demand.

- [ ] **Step 1: plist schreiben**

Create `com.marc.antigravity-orchestrator.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.marc.antigravity-orchestrator</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM/scripts/orchestrator.zsh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM</string>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/antigravity-orchestrator.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/antigravity-orchestrator.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
```

- [ ] **Step 2: plist validieren**

Run: `plutil -lint com.marc.antigravity-orchestrator.plist`
Expected: `OK`.

- [ ] **Step 3: Doku ergänzen**

An `scripts/README-orchestrator.md` anhängen:

```markdown
## Optional: als LaunchAgent (fire and forget)

    cp "com.marc.antigravity-orchestrator.plist" ~/Library/LaunchAgents/
    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.marc.antigravity-orchestrator.plist
    launchctl kickstart -k gui/$(id -u)/com.marc.antigravity-orchestrator   # Session starten
    tail -f /tmp/antigravity-orchestrator.out.log                           # zusehen

Stoppen: `touch handoff/PAUSE` (sauber) oder
`launchctl kill TERM gui/$(id -u)/com.marc.antigravity-orchestrator`.
Kein KeepAlive — der Agent endet bei done/error und startet nicht neu.
```

- [ ] **Step 4: Commit**

```bash
git add com.marc.antigravity-orchestrator.plist scripts/README-orchestrator.md
git commit -m "$(printf 'feat(orchestrator): optionaler LaunchAgent als Vorlage\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-Review

**1. Spec-Abdeckung**

| Spec-Abschnitt | abgedeckt durch |
|---|---|
| Nachrichtenbus `handoff/` (Tabelle) | Task 1 (Struktur/`.gitignore`), Task 2 (`state.json`), Task 3 (`codex_prompt.md`), Task 6 (`inbox.md`), Task 9 (Bootstrap `transcript.md`/`outbox.md`, `PAUSE`), Task 8 (`.lock`) |
| Schleife Schritt 1 (PAUSE) | Task 9, Schleifenlogik 1 + Integrationstest deckt Happy Path; PAUSE-Zweig per Code-Review |
| Schleife Schritt 2 (Prompt) | Task 3 |
| Schleife Schritt 3 (`codex exec` + Gates + Fehler) | Task 4 (Aufruf/Exit-Code), Task 1 (Flags in Config), Task 9 (Fehler→`finish error`) |
| Schleife Schritt 4 (Transcript Codex) | Task 5 + Task 9 |
| Schleife Schritt 5 (Abschlusssignal) | Task 5 (`is_done`) + Task 9 |
| Schleife Schritt 6 (inbox + pbcopy) | Task 6 |
| Schleife Schritt 7 (Trigger, 3 Stufen) | Task 6 (Stufe 1 + Verdrahtung), Task 10 (Stufe 2), Task 11 (Stufe 3) |
| Schleife Schritt 8 (warten auf outbox) | Task 7 |
| Schleife Schritt 9 (Transcript Antigravity) | Task 5 + Task 9 |
| Schleife Schritt 10 (State-Update) | Task 2 + Task 9 |
| `MAX_ITER` | Task 1 (Wert), Task 9 (Prüfung) |
| Codex-Preamble (inkl. BUILD_LOG-Satz) | Task 1 (`ORCH_PREAMBLE`) |
| `AGENTS.md` Handoff-Protokoll | Task 1, Step 3 |
| Ausbaustufen-Tabelle | Task 6/10/11 + `README-orchestrator.md` |
| Start/Stop (Terminal + LaunchAgent, PAUSE) | Task 9 (PAUSE/Traps), Task 12 (plist), `README-orchestrator.md` |
| Fehlerfälle (codex-Fehler, Timeout, Pingpong, Zweitstart, Teil-Bericht, manuelle Korrektur) | Task 4/9 (codex), Task 7 (Timeout-Notification + Teil-Bericht), Task 9 (`MAX_ITER`), Task 8 (`.lock`), `README-orchestrator.md` (manuelle Korrektur) |
| „Nicht im Scope" | nichts zu bauen |
| Offene Punkte Stufe 2/3 | Task 10 Step 5 (Fokus-Shortcut-Discovery), Task 11 Step 6 (Auto-Approve-Setting) |

Keine offene Spec-Anforderung ohne Task.

**2. Platzhalter-Scan**

Kein „TBD/TODO/später". Die einzige bewusst offene Stelle — der exakte
`codex exec`-Flag-Satz — ist mit konkretem Default **und** benanntem Fallback
(`--full-auto`) plus Verifikationsschritt (Task 4, Step 5) versehen, kein
Platzhalter. Alle Code-Schritte enthalten realen Code, kein „analog zu Task N".

**3. Typ-/Namenskonsistenz**

Funktionsnamen über alle Tasks geprüft: `state_init/state_get/state_set`,
`build_prompt`, `call_codex`, `append_transcript`, `is_done`, `outbox_complete`,
`file_mtime`, `wait_for_outbox`, `write_inbox`, `notify`,
`dispatch_to_antigravity`, `dispatch_stage2`, `acquire_lock`, `release_lock`,
`approve_watcher_start/stop`, `_approve_applescript`, `finish`, `cleanup` —
jeweils dort definiert, wo zuerst benutzt, und mit gleicher Signatur
weiterverwendet. `dispatch_stage2` wird in Task 6 verdrahtet und in Task 10
definiert; das ist ein bewusster Vorgriff und im Task-6-Text vermerkt.
Bus-Dateinamen (`inbox.md`, `outbox.md`, `transcript.md`, `state.json`,
`codex_prompt.md`, `.codex_out`, `.lock`, `PAUSE`, `.approve.pid`) über alle
Tasks identisch. Config-Variablen (`ORCH_*`) einmal in Task 1 definiert, überall
gleich geschrieben.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-04-antigravity-orchestrator.md`. Two execution options:**

**1. Subagent-Driven (recommended)** – I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** – Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
