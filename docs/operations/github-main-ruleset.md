# GitHub Main Branch Ruleset Spezifikation

**Dokument-ID:** OPS-RULESET-01  
**Repository:** `mapoenisch/leadpilot-dashboard-crm-v2` (öffentlich)  
**Ziel-Branch:** `refs/heads/main`  
**Status:** VORBEREITET (Wartet auf Freigabe durch Marc gemäß Stopp-Punkt G58)

---

## 1. Zweck und Architektur

Gemäß Gate G58 (Auftrag 067L) und Sollvertrag `PR-BRANCH-20` wird der Branch `main` über ein GitHub-Repository-Ruleset geschützt.
Das Ruleset stellt sicher:
1. **Kein direkter Push auf `main`:** Änderungen dürfen ausschließlich über Pull Requests eingebracht werden.
2. **Pflicht-Checks (Required Status Checks):** Alle sieben Jobs der CI-Pipeline müssen erfolgreich durchlaufen sein:
   - `lint`
   - `typecheck`
   - `test`
   - `build`
   - `livekpi-verifiers`
   - `size-limit`
   - `e2e`
3. **Kein administrativer Bypass:** Weder Repository-Administratoren noch Bots können die Schutzregeln ohne Prüfung übersteuern (`allowsBypass: false`).
4. **Schutz vor Destruktion:** Force-Pushes und das Löschen des `main`-Branches sind unterbunden.

---

## 2. Ruleset Konfiguration (JSON-Definition)

```json
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": [
        "~DEFAULT_BRANCH",
        "refs/heads/main"
      ],
      "exclude": []
    }
  },
  "bypass_actors": [],
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "lint" },
          { "context": "typecheck" },
          { "context": "test" },
          { "context": "build" },
          { "context": "livekpi-verifiers" },
          { "context": "size-limit" },
          { "context": "e2e" }
        ]
      }
    }
  ]
}
```

---

## 3. Ausführung nach Freigabe durch Marc (Stopp-Punkt)

> [!CAUTION]
> **Harter Stopp-Punkt:** Die folgenden Befehle greifen direkt auf das GitHub-Remote-Repository zu und dürfen **erst nach ausdrücklicher Freigabe durch Marc** ausgeführt werden!

### 3.1 Anlegen des Rulesets via GitHub CLI

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  repos/mapoenisch/leadpilot-dashboard-crm-v2/rulesets \
  --input - << 'EOF'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": [
        "~DEFAULT_BRANCH",
        "refs/heads/main"
      ],
      "exclude": []
    }
  },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "lint" },
          { "context": "typecheck" },
          { "context": "test" },
          { "context": "build" },
          { "context": "livekpi-verifiers" },
          { "context": "size-limit" },
          { "context": "e2e" }
        ]
      }
    }
  ]
}
EOF
```

---

## 4. Verifikationsbefehle (Step 6)

Nach der Erstellung wird der aktive Status über die GitHub API abgefragt:

```bash
# 1. Abfrage aller Rulesets
gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/rulesets

# 2. Detailabfrage des Branch-Schutzes für main
gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/branches/main/protection
```

---

## 5. Soll-Baseline für `v2.3.0-github-ruleset-baseline.json`

Sobald das Ruleset auf GitHub aktiv ist, wird `docs/reviews/v2.3.0-github-ruleset-baseline.json` mit folgendem Stand aktualisiert:

```json
{
  "capturedAt": "2026-09-19T10:00:00.000Z",
  "repository": "mapoenisch/leadpilot-dashboard-crm-v2",
  "activeRulesets": [
    {
      "name": "main-protection",
      "enforcement": "active",
      "target": "branch",
      "appliesToMain": true,
      "allowsBypass": false,
      "requiredChecks": [
        "lint",
        "typecheck",
        "test",
        "build",
        "livekpi-verifiers",
        "size-limit",
        "e2e"
      ],
      "allowsDirectPush": false
    }
  ],
  "captureNote": "main-Ruleset auf mapoenisch/leadpilot-dashboard-crm-v2 aktiv konfiguriert und verifiziert"
}
```
Damit ist der Sollvertrag `[PR-BRANCH-20]` nachweisbar erfüllt.
