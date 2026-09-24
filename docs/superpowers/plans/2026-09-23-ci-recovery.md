# CI-Recovery Implementation Plan

> **For agentic workers:** Execute the tasks in order in this session. Each
> task has a checkable result; the repository's serial workflow applies.

**Goal:** Make the required CI checks reliable and singular, then align the
Ruleset evidence and project plan with `main`.

**Architecture:** `test` remains the sole Coverage producer. `e2e` waits for
`test`, downloads its artifact from the same run and feeds it to the unchanged
fail-closed Readiness script. Existing seven job identities stay stable.

**Tech Stack:** GitHub Actions YAML, Vitest, Node 22, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-23-ci-recovery-design.md`.

## Global Constraints

- Baseline `11dae9b`; no changes in `src/` except the approved
  `src/review/acceptance/findingContract.ts` status correction. No changes in
  Supabase, E2E specs or other product code.
- No new npm dependency. All external Actions use a full 40-character SHA.
- Merge only after independent review, a green final-HEAD PR-CI run and
  separate authorization. No deploy or 067Q implementation during recovery;
  close Issue #5 only after green post-merge `main` CI.

---

### Task 1: CI contract and workflow

**Files:** `scripts/__tests__/ciSecurityConfig.vitest.ts`, `.github/workflows/ci.yml`.

- [x] Add tests for the `main`-only push trigger, the one Coverage invocation,
      `e2e` dependency on `test`, and the named `coverage` download to
      `coverage/` before Readiness.
- [x] Run `npm test -- scripts/__tests__/ciSecurityConfig.vitest.ts`; verify
      the new assertions fail against the original workflow.
- [x] Add the trigger filter, `needs: test`, SHA-pinned download step and
      `test -s coverage/coverage-summary.json`. Remove the second Coverage step.
- [x] Run the focused test again; verify it passes. Review the workflow with
      `git diff --check` and a YAML parser.

### Task 2: Ruleset and roadmap evidence

**Files:** `docs/operations/github-main-ruleset.md`,
`docs/reviews/v2.3.0-github-ruleset-baseline.json`,
`docs/reviews/v2.3.0-finding-register.md`,
`docs/reviews/v2.3.0-known-findings.json`,
`src/review/acceptance/findingContract.ts`, `BUILD_PLAN.md`.

- [x] Capture the active `main-protection` API response and seven required
      contexts; preserve the earlier no-Ruleset claim as historical data.
- [x] Replace the obsolete Ruleset setup instructions with the current
      configuration, API verification and maintenance rules.
- [x] Flip only the expected status of `PR-BRANCH-20` to `passing` in the
      contract and both registers; run the characterization test.
- [x] Record G44–G62 in `BUILD_PLAN.md` using the BUILD_LOG approvals and the
      commits on `main`; show 067Q/G63 → 067R/G64 → 067S/G65.

### Task 3: Verification and handoff

**Files:** `docs/BUILD_LOG.md`.

- [x] Run TypeScript, Lint, Format, Integrity, Coverage, Build and workflow
      contract checks on a Node 22 runtime; record exact outcomes.
- [x] Check the diff since `11dae9b`, including protected paths and secrets.
- [x] Append a BUILD_LOG entry with changed paths, tests, GitHub Ruleset
      evidence and PR-CI status.
- [x] Commit and open recovery PR #22; observe one complete seven-job PR-CI run
      on its original HEAD `c43dbd6` (run `35829075503`, green).
- [ ] Complete independent review, obtain seven green PR checks on the final
      HEAD, merge, then verify all seven jobs in the resulting `main` CI run.
      Keep Issue #5 open until that `main` run is green.
