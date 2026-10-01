// CI-Auftrag Codex-Nacharbeit: Entscheidungslogik des Review-Zyklus und Workflow-Verträge.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CODEX_BOT,
  ESCALATION_MARKER,
  MAX_ROUNDS,
  REQUEST_DELAY_MS,
  codexResultFromComment,
  codexResultFromReview,
  commentSha,
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
const blob = (sha: string, file: string) =>
  `[${file}](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/blob/${sha}/${file}#L1-L5)`;

const pr = (overrides = {}) => ({
  number: 7,
  state: 'open',
  draft: false,
  head: { sha: SHA, ref: 'feat/x', repo: REPO },
  base: { repo: REPO },
  ...overrides,
});
const comment = (user: object, body: string, extra = {}) => ({ user, body, ...extra });
const review = (overrides = {}) => ({
  id: 11,
  user: codex,
  commit_id: SHA,
  body: 'Befunde',
  ...overrides,
});
const finding = { id: 21, path: 'src/a.ts', line: 3, body: 'P1: Fehler' };
// Aufbau wie das Codex-Ergebnis auf PR #42 (Aufgabenformat als PR-Kommentar).
const codexTaskBody = (sha: string) =>
  [
    '### Ergebnis',
    '**Keine Freigabe – Nacharbeit erforderlich.**',
    `* **P1, blockierend:** Logik aus dem PR-Checkout. ${blob(sha, '.github/workflows/a.yml')}`,
    `* **P2:** Typ \`Bot\` fehlt. ${blob(sha, '.github/workflows/b.yml')}`,
  ].join('\n');

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

describe('Codex-Ergebnisse', () => {
  it('liest den geprüften Stand eines Kommentars aus seinen Dateilinks', () => {
    expect(commentSha(codexTaskBody(SHA))).toBe(SHA);
    expect(commentSha('ohne Links')).toBeNull();
    expect(commentSha(`${blob(SHA, 'a')} ${blob(OLD_SHA, 'b')}`)).toBeNull();
  });

  it('zählt Befunde im Kommentar- und im Badge-Format', () => {
    expect(codexResultFromComment(comment(codex, codexTaskBody(SHA), { id: 5 }))).toEqual({
      source: 'comment-5',
      user: codex,
      sha: SHA,
      findingCount: 2,
    });
    const badge = `**<sub><sub>![P2 Badge](https://img.shields.io/x)</sub></sub> Titel** ${blob(SHA, 'x')}`;
    expect(codexResultFromComment(comment(codex, badge, { id: 6 })).findingCount).toBe(1);
    expect(
      codexResultFromComment(comment(codex, `Freigabe. ${blob(SHA, 'x')}`, { id: 7 })).findingCount,
    ).toBe(0);
  });

  it('übernimmt bei Reviews den Commit und die Zahl der Inline-Befunde', () => {
    expect(codexResultFromReview(review(), [finding, finding])).toEqual({
      source: 'review-11',
      user: codex,
      sha: SHA,
      findingCount: 2,
    });
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

  it('überspringt, wenn Codex den Head per Review oder Ergebnis-Kommentar geprüft hat', () => {
    expect(decideReviewRequest(requestInput({ reviews: [review()] })).action).toBe('skip');
    expect(
      decideReviewRequest(requestInput({ reviews: [review({ commit_id: OLD_SHA })] })).action,
    ).toBe('request');
    expect(
      decideReviewRequest(requestInput({ reviews: [review({ user: { ...codex, id: 2 } })] }))
        .action,
    ).toBe('request');
    expect(
      decideReviewRequest(requestInput({ comments: [comment(codex, codexTaskBody(SHA))] })).action,
    ).toBe('skip');
    expect(
      decideReviewRequest(requestInput({ comments: [comment(marc, codexTaskBody(SHA))] })).action,
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
  const fromReview = (overrides = {}, findings = [finding]) =>
    codexResultFromReview(review(overrides), findings);
  const input = (overrides = {}) => ({
    pr: pr(),
    result: fromReview(),
    comments: [],
    ...overrides,
  });
  const rounds = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      comment(
        workflowBot,
        reworkMarker({
          round: index + 1,
          sha: String(index).repeat(40),
          source: `review-${100 + index}`,
        }),
      ),
    );

  it('startet Runde 1 für ein aktuelles Codex-Ergebnis mit Befunden (Review oder Kommentar)', () => {
    expect(decideRework(input())).toMatchObject({ action: 'rework', round: 1 });
    const result = codexResultFromComment(comment(codex, codexTaskBody(SHA), { id: 5 }));
    expect(decideRework(input({ result }))).toMatchObject({ action: 'rework', round: 1 });
  });

  it('ignoriert Ergebnisse anderer Konten, auch mit gleichem Login', () => {
    expect(decideRework(input({ result: fromReview({ user: marc }) })).action).toBe('skip');
    expect(decideRework(input({ result: fromReview({ user: { ...codex, id: 5 } }) })).action).toBe(
      'skip',
    );
  });

  it('überspringt veraltete Ergebnisse zu einem älteren Head', () => {
    const decision = decideRework(input({ result: fromReview({ commit_id: OLD_SHA }) }));
    expect(decision.action).toBe('skip');
    expect(decision.reason).toContain('veraltet');
    const oldComment = codexResultFromComment(comment(codex, codexTaskBody(OLD_SHA), { id: 5 }));
    expect(decideRework(input({ result: oldComment })).action).toBe('skip');
  });

  it('überspringt Ergebnisse ohne Befunde oder ohne eindeutigen Stand', () => {
    expect(decideRework(input({ result: fromReview({}, []) })).action).toBe('skip');
    const noSha = codexResultFromComment(comment(codex, '**P1:** ohne Link', { id: 5 }));
    expect(decideRework(input({ result: noSha })).reason).toContain('nicht eindeutig');
  });

  it('startet für denselben Head-SHA oder dieselbe Quelle keine zweite Runde', () => {
    const sameSha = [
      comment(workflowBot, reworkMarker({ round: 1, sha: SHA, source: 'comment-99' })),
    ];
    const sameSource = [
      comment(workflowBot, reworkMarker({ round: 1, sha: OLD_SHA, source: 'review-11' })),
    ];
    expect(decideRework(input({ comments: sameSha })).action).toBe('skip');
    expect(decideRework(input({ comments: sameSource })).action).toBe('skip');
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
        reworkMarker({
          round: index + 1,
          sha: String(index).repeat(40),
          source: `review-${index}`,
        }),
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
  it('sammelt alle Reviews und Kommentare zum Head mit Datei und Zeile je Befund', () => {
    const text = formatFindings({
      pr: pr(),
      round: 2,
      reviews: [review(), review({ id: 12, body: 'Zweiter Review' })],
      commentsByReview: new Map([
        [11, [finding]],
        [12, [{ id: 22, path: 'docs/x.md', line: null, original_line: 8, body: 'P2: Hinweis' }]],
      ]),
      codexComments: [comment(codex, codexTaskBody(SHA), { id: 5, created_at: '2026-10-01' })],
    });
    expect(text).toContain(`Head ${SHA}, Runde 2 von 3`);
    expect(text).toContain('### Befund 21 — `src/a.ts` Zeile 3');
    expect(text).toContain('### Befund 22 — `docs/x.md` Zeile 8');
    expect(text).toContain('Zweiter Review');
    expect(text).toContain('## Kommentar 5');
    expect(text).toContain('**P1, blockierend:**');
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

  it('startet die Nacharbeit nur für ganze Ergebnisse des verifizierten Codex-Bots', () => {
    expect(rework).toMatch(/pull_request_review:\s*\n\s*types: \[submitted\]/);
    expect(rework).toMatch(/issue_comment:\s*\n\s*types: \[created\]/);
    expect(rework).not.toMatch(/pull_request_review_comment/);
    for (const actor of ['review', 'comment']) {
      expect(rework).toContain(`github.event.${actor}.user.login == '${CODEX_BOT.login}'`);
      expect(rework).toContain(`github.event.${actor}.user.id == ${CODEX_BOT.id}`);
      expect(rework).toContain(`github.event.${actor}.user.type == 'Bot'`);
    }
    expect(rework).toContain('allowed_bots: chatgpt-codex-connector\n');
  });

  it('serialisiert Läufe je PR ohne laufende Runden abzubrechen', () => {
    expect(rework).toMatch(
      /group: codex-rework-\$\{\{ github\.event\.pull_request\.number \|\| github\.event\.issue\.number \}\}\s*\n\s*cancel-in-progress: false/,
    );
    expect(request).toMatch(/cancel-in-progress: false/);
  });

  it('lädt die Entscheidungslogik in beiden Workflows vom Default-Branch, nie aus dem PR', () => {
    for (const workflow of [rework, request]) {
      expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
      expect(workflow).toContain('sparse-checkout: scripts/codexReviewCycle.mjs');
      const runs = workflow.match(/node \S*codexReviewCycle\.mjs|node "\$tool"/g) ?? [];
      expect(runs.length).toBeGreaterThan(0);
      expect(workflow).not.toMatch(/node scripts\/codexReviewCycle\.mjs/);
    }
    expect(request).toContain('tool=.cycle-tools/scripts/codexReviewCycle.mjs');
  });

  // Job-Abschnitte von codex-rework.yml (zwei Leerzeichen Einzug, Name mit Doppelpunkt).
  const job = (name: string) => {
    const start = rework.indexOf(`\n  ${name}:\n`);
    const next = rework.slice(start + 1).search(/\n  [a-z]+:\n/);
    return next === -1 ? rework.slice(start) : rework.slice(start, start + 1 + next);
  };

  it('gibt Claude keine Push-, Merge-, Freigabe- oder Kommentar-Werkzeuge', () => {
    const allowed = rework.match(/--allowedTools "([^"]+)"/)?.[1] ?? '';
    expect(allowed).not.toMatch(/git push|gh pr merge|gh pr review|gh pr comment|gh api|--force/);
    expect(rework).toMatch(
      /--disallowedTools "[^"]*Bash\(git push:\*\)[^"]*Bash\(gh pr merge:\*\)[^"]*Bash\(gh pr review:\*\)/,
    );
  });

  it('führt PR-Code nur im Job ohne Schreibrechte und ohne Zugangsdaten aus', () => {
    const reworkJob = job('rework');
    const permissions = reworkJob.slice(
      reworkJob.indexOf('permissions:'),
      reworkJob.indexOf('steps:'),
    );
    expect(permissions).not.toMatch(/: write/);
    expect(permissions).not.toMatch(/id-token/);
    expect(reworkJob).toContain('persist-credentials: false');
    expect(reworkJob).toContain('npm ci --ignore-scripts');
    expect(rework).not.toMatch(/npm ci\s*$/m);
    expect(reworkJob).toContain('github_token: ${{ github.token }}');
    expect(reworkJob).not.toMatch(/^\s*git push/m);
  });

  it('pusht nur im Job ohne PR-Code und erst nach Prüfung der Commits', () => {
    const publish = job('publish');
    expect(publish).not.toMatch(/\bnpm\b|\bnpx\b|\bnode\b|claude-code-action/);
    const guarded =
      'src/simulation src/types src/context src/services/data src/features/resources .github';
    expect(publish).toContain(guarded);
    expect(publish).toContain('git merge-base --is-ancestor "$START_SHA" codex-rework-result');
    expect(publish.indexOf('git diff --name-only')).toBeLessThan(
      publish.indexOf('git push origin'),
    );
    expect(publish).toMatch(/^\s*git push origin "codex-rework-result:refs\/heads\/\$HEAD_REF"$/m);
    expect(publish).not.toMatch(/git push[^\n]*(--force|\s-f\b|\+)/);
  });

  it('entschärft die von PR-Code beeinflusste Zusammenfassung vor dem Veröffentlichen', () => {
    const publish = job('publish');
    expect(publish).toContain('s/<!--/\\&lt;!--/g');
    expect(publish).toContain('s/@claude/claude/gI');
  });

  it('schreibt keine Kommentare, die den @claude-Workflow auslösen', () => {
    expect(read('scripts/codexReviewCycle.mjs')).not.toContain('@claude');
  });
});
