// CI-Auftrag Codex-Nacharbeit: Entscheidungslogik des Review-Zyklus und Workflow-Verträge.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CODEX_BOT,
  ESCALATION_MARKER,
  MAX_ROUNDS,
  REQUEST_DELAY_MS,
  decideReviewRequest,
  decideRework,
  formatFindings,
  isVerifiedCodex,
  parseReworkMarkers,
  requestMarker,
  reworkMarker,
} from '../codexReviewCycle.mjs';

const REPO = { full_name: 'mapoenisch/leadpilot-dashboard-crm-v2' };
const SHA = 'a'.repeat(40);
const OLD_SHA = 'b'.repeat(40);
const codex = { login: CODEX_BOT.login, id: CODEX_BOT.id, type: 'Bot' };
const workflowBot = { login: 'github-actions[bot]', type: 'Bot' };
const marc = { login: 'mapoenisch', type: 'User' };

const pr = (overrides = {}) => ({
  number: 7,
  state: 'open',
  draft: false,
  head: { sha: SHA, ref: 'feat/x', repo: REPO },
  base: { repo: REPO },
  ...overrides,
});
const comment = (user: object, body: string) => ({ user, body });
const review = (overrides = {}) => ({
  id: 11,
  user: codex,
  commit_id: SHA,
  body: 'Befunde',
  ...overrides,
});
const finding = { id: 21, path: 'src/a.ts', line: 3, body: 'P1: Fehler' };

const committedAt = '2026-10-01T10:00:00Z';
const afterDelay = Date.parse(committedAt) + REQUEST_DELAY_MS;
const requestInput = (overrides = {}) => ({
  pr: pr(),
  headCommittedAt: committedAt,
  comments: [],
  reviews: [],
  reactions: [],
  now: afterDelay,
  ...overrides,
});

describe('isVerifiedCodex', () => {
  it('akzeptiert nur Login, Typ und ID des Codex-Bots zusammen', () => {
    expect(isVerifiedCodex(codex)).toBe(true);
    expect(isVerifiedCodex({ ...codex, id: 1 })).toBe(false);
    expect(isVerifiedCodex({ ...codex, type: 'User' })).toBe(false);
    expect(isVerifiedCodex({ ...codex, login: 'chatgpt-codex-connector' })).toBe(false);
    expect(isVerifiedCodex(undefined)).toBe(false);
  });
});

describe('decideReviewRequest', () => {
  it('fordert nach Ablauf der Wartezeit an, wenn Codex nichts zum Head hat', () => {
    expect(decideReviewRequest(requestInput()).action).toBe('request');
  });

  it('wartet innerhalb der Frist auf den automatischen Codex-Review', () => {
    expect(decideReviewRequest(requestInput({ now: afterDelay - 1 })).action).toBe('skip');
  });

  it('fordert mit Label sofort an, auch bei Entwürfen', () => {
    expect(
      decideReviewRequest(requestInput({ now: Date.parse(committedAt), force: true })).action,
    ).toBe('request');
    expect(decideReviewRequest(requestInput({ pr: pr({ draft: true }), force: true })).action).toBe(
      'request',
    );
  });

  it('fordert für denselben Head-SHA nie doppelt an, auch nicht mit Label', () => {
    const comments = [comment(workflowBot, `@codex review\n\n${requestMarker(SHA)}`)];
    expect(decideReviewRequest(requestInput({ comments })).action).toBe('skip');
    expect(decideReviewRequest(requestInput({ comments, force: true })).action).toBe('skip');
  });

  it('ignoriert Markierungen, die nicht vom Workflow stammen', () => {
    const comments = [comment(marc, requestMarker(SHA))];
    expect(decideReviewRequest(requestInput({ comments })).action).toBe('request');
  });

  it('fordert einen neuen Head trotz Markierung für den alten an', () => {
    const comments = [comment(workflowBot, requestMarker(OLD_SHA))];
    expect(decideReviewRequest(requestInput({ comments })).action).toBe('request');
  });

  it('überspringt, wenn Codex den Head schon geprüft hat', () => {
    expect(decideReviewRequest(requestInput({ reviews: [review()] })).action).toBe('skip');
    expect(
      decideReviewRequest(requestInput({ reviews: [review({ commit_id: OLD_SHA })] })).action,
    ).toBe('request');
    expect(
      decideReviewRequest(requestInput({ reviews: [review({ user: { ...codex, id: 2 } })] }))
        .action,
    ).toBe('request');
  });

  it('überspringt bei Codex-Reaktion nach dem Head-Commit, nicht bei älteren', () => {
    const fresh = { user: codex, content: '+1', created_at: '2026-10-01T10:05:00Z' };
    const old = { user: codex, content: '+1', created_at: '2026-10-01T09:00:00Z' };
    expect(decideReviewRequest(requestInput({ reactions: [fresh] })).action).toBe('skip');
    expect(decideReviewRequest(requestInput({ reactions: [old] })).action).toBe('request');
  });

  it('überspringt geschlossene PRs, Forks und Entwürfe ohne Label', () => {
    expect(decideReviewRequest(requestInput({ pr: pr({ state: 'closed' }) })).action).toBe('skip');
    expect(
      decideReviewRequest(
        requestInput({ pr: pr({ head: { sha: SHA, repo: { full_name: 'x/y' } } }) }),
      ).action,
    ).toBe('skip');
    expect(decideReviewRequest(requestInput({ pr: pr({ draft: true }) })).action).toBe('skip');
  });
});

describe('decideRework', () => {
  const input = (overrides = {}) => ({
    pr: pr(),
    review: review(),
    reviewComments: [finding],
    comments: [],
    ...overrides,
  });
  const rounds = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      comment(
        workflowBot,
        reworkMarker({ round: index + 1, sha: String(index).repeat(40), reviewId: 100 + index }),
      ),
    );

  it('startet Runde 1 für einen aktuellen Codex-Review mit Befunden', () => {
    expect(decideRework(input())).toMatchObject({ action: 'rework', round: 1 });
  });

  it('ignoriert Reviews anderer Konten, auch mit gleichem Login', () => {
    expect(decideRework(input({ review: review({ user: marc }) })).action).toBe('skip');
    expect(decideRework(input({ review: review({ user: { ...codex, id: 5 } }) })).action).toBe(
      'skip',
    );
  });

  it('überspringt veraltete Reviews zu einem älteren Head', () => {
    const decision = decideRework(input({ review: review({ commit_id: OLD_SHA }) }));
    expect(decision.action).toBe('skip');
    expect(decision.reason).toContain('veraltet');
  });

  it('überspringt Reviews ohne Inline-Befunde', () => {
    expect(decideRework(input({ reviewComments: [] })).action).toBe('skip');
  });

  it('startet für denselben Head-SHA oder Review keine zweite Runde', () => {
    const sameSha = [comment(workflowBot, reworkMarker({ round: 1, sha: SHA, reviewId: 99 }))];
    const sameReview = [
      comment(workflowBot, reworkMarker({ round: 1, sha: OLD_SHA, reviewId: 11 })),
    ];
    expect(decideRework(input({ comments: sameSha })).action).toBe('skip');
    expect(decideRework(input({ comments: sameReview })).action).toBe('skip');
  });

  it('zählt Runden und eskaliert nach drei Runden genau einmal', () => {
    expect(decideRework(input({ comments: rounds(2) }))).toMatchObject({
      action: 'rework',
      round: 3,
    });
    expect(decideRework(input({ comments: rounds(MAX_ROUNDS) })).action).toBe('escalate');
    const escalated = [...rounds(MAX_ROUNDS), comment(workflowBot, ESCALATION_MARKER)];
    expect(decideRework(input({ comments: escalated })).action).toBe('skip');
  });

  it('zählt keine Rundenmarkierungen, die Menschen gesetzt haben', () => {
    const fake = Array.from({ length: 3 }, (_, index) =>
      comment(
        marc,
        reworkMarker({ round: index + 1, sha: String(index).repeat(40), reviewId: index }),
      ),
    );
    expect(parseReworkMarkers(fake)).toEqual([]);
    expect(decideRework(input({ comments: fake }))).toMatchObject({ action: 'rework', round: 1 });
  });

  it('überspringt geschlossene PRs und Forks', () => {
    expect(decideRework(input({ pr: pr({ state: 'closed' }) })).action).toBe('skip');
    expect(
      decideRework(input({ pr: pr({ head: { sha: SHA, repo: { full_name: 'x/y' } } }) })).action,
    ).toBe('skip');
  });
});

describe('formatFindings', () => {
  it('sammelt alle Reviews zum Head mit Datei und Zeile je Befund', () => {
    const text = formatFindings({
      pr: pr(),
      round: 2,
      reviews: [review(), review({ id: 12, body: 'Zweiter Review' })],
      commentsByReview: new Map([
        [11, [finding]],
        [12, [{ id: 22, path: 'docs/x.md', line: null, original_line: 8, body: 'P2: Hinweis' }]],
      ]),
    });
    expect(text).toContain(`Head ${SHA}, Runde 2 von 3`);
    expect(text).toContain('### Befund 21 — `src/a.ts` Zeile 3');
    expect(text).toContain('### Befund 22 — `docs/x.md` Zeile 8');
    expect(text).toContain('Zweiter Review');
  });
});

describe('Workflow-Verträge', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf-8');
  const rework = read('.github/workflows/codex-rework.yml');
  const request = read('.github/workflows/codex-review-request.yml');

  it('pinnt alle externen Actions auf vollständige Commit-SHAs', () => {
    for (const workflow of [rework, request]) {
      const uses = workflow.match(/uses:\s*\S+/g) ?? [];
      expect(uses.length).toBeGreaterThan(0);
      for (const entry of uses) expect(entry).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it('startet die Nacharbeit nur für ganze Reviews des verifizierten Codex-Bots', () => {
    expect(rework).toMatch(/pull_request_review:\s*\n\s*types: \[submitted\]/);
    expect(rework).not.toMatch(/pull_request_review_comment/);
    expect(rework).toContain(`github.event.review.user.login == '${CODEX_BOT.login}'`);
    expect(rework).toContain(`github.event.review.user.id == ${CODEX_BOT.id}`);
    expect(rework).toContain('allowed_bots: chatgpt-codex-connector\n');
  });

  it('serialisiert Läufe je PR ohne laufende Runden abzubrechen', () => {
    expect(rework).toMatch(
      /group: codex-rework-\$\{\{ github\.event\.pull_request\.number \}\}\s*\n\s*cancel-in-progress: false/,
    );
    expect(request).toMatch(/cancel-in-progress: false/);
  });

  it('lädt die Entscheidungslogik vom Default-Branch, nicht aus dem PR', () => {
    expect(rework).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(rework).toContain('node .cycle-tools/scripts/codexReviewCycle.mjs rework-gate');
  });

  it('gibt Claude keine Merge-, Freigabe- oder Force-Push-Werkzeuge', () => {
    const allowed = rework.match(/--allowedTools "([^"]+)"/)?.[1] ?? '';
    expect(allowed).not.toMatch(/gh pr merge|gh pr review|gh api|--force|git push:\*/);
    expect(rework).toMatch(
      /--disallowedTools "[^"]*Bash\(gh pr merge:\*\)[^"]*Bash\(gh pr review:\*\)/,
    );
  });

  it('sperrt Schutzbereiche und Workflows vor und nach dem Push', () => {
    const guarded =
      'src/simulation src/types src/context src/services/data src/features/resources .github';
    expect(rework.split(guarded).length - 1).toBe(2);
  });

  it('schreibt keine Kommentare, die den @claude-Workflow auslösen', () => {
    expect(read('scripts/codexReviewCycle.mjs')).not.toContain('@claude');
  });
});
