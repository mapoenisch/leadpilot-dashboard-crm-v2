#!/usr/bin/env node
// CI-Auftrag Claude-Review für Antigravity (docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CLAUDE_REVIEW_ANTIGRAVITY.md):
// Zweite Automatisierung neben dem Codex-Zyklus. Antigravity baut auf Branches `antigravity/*`,
// Claude prüft jeden neuen Head automatisch (claude-review.yml) und veröffentlicht den Befund als
// PR-Kommentar samt Commit-Status `claude-review`. Antigravity läuft lokal und holt den Befund mit
// `npm run antigravity:inbox` nach `handoff/inbox.md`.
// Befehle: `gate` (soll geprüft werden?), `publish` (Befund veröffentlichen), `inbox` (lokal abholen).
// Die Entscheidungen sind reine Funktionen; die CLI liest den Zustand über die GitHub-API und
// schreibt Markierungskommentare, an denen spätere Läufe Dopplungen und Runden erkennen.
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BRANCH_PREFIX = 'antigravity/';
export const REVIEW_LABEL = 'claude-review';
export const MARKER_AUTHOR = 'github-actions[bot]';
export const MAX_ROUNDS = 5;
export const STATUS_CONTEXT = 'claude-review';
export const ESCALATION_MARKER = '<!-- claude-review-cycle:escalated -->';
export const BODY_START = '<!-- claude-review-cycle:body-start -->';
export const BODY_END = '<!-- claude-review-cycle:body-end -->';
export const MAX_BODY_CHARS = 60000;

export const reviewMarker = ({ round, sha, verdict }) =>
  `<!-- claude-review-cycle:review round=${round} sha=${sha} verdict=${verdict} -->`;

const REVIEW_PATTERN =
  /<!-- claude-review-cycle:review round=(\d+) sha=([0-9a-f]{40}) verdict=(findings|clean|unclear) -->/g;
const VERDICT_PATTERN = /^ERGEBNIS:\s*(BEFUNDE|KEINE BEFUNDE)\s*$/gm;

export const isAntigravityPr = (pr) => Boolean(pr?.head?.ref?.startsWith(BRANCH_PREFIX));

/** Markierungen zählen nur aus Kommentaren des Workflows selbst, nicht von Menschen oder anderen Bots. */
function markerComments(comments) {
  return comments.filter(
    (comment) => comment.user?.login === MARKER_AUTHOR && comment.user?.type === 'Bot',
  );
}

export function parseReviewMarkers(comments) {
  const rounds = [];
  for (const comment of markerComments(comments)) {
    for (const match of (comment.body ?? '').matchAll(REVIEW_PATTERN)) {
      rounds.push({ round: Number(match[1]), sha: match[2], verdict: match[3], comment });
    }
  }
  return rounds;
}

export function hasEscalationMarker(comments) {
  return markerComments(comments).some((comment) =>
    (comment.body ?? '').includes(ESCALATION_MARKER),
  );
}

/**
 * Soll Claude den aktuellen Head prüfen? Automatisch nur für Branches `antigravity/*`;
 * `force` (Label `claude-review` oder manueller Start) prüft auch andere Team-PRs und Entwürfe.
 * Je Head-SHA höchstens ein Review, höchstens MAX_ROUNDS Runden pro PR, danach Hinweis an Marc.
 */
export function decideClaudeReview({ pr, comments, force = false }) {
  const sha = pr.head.sha;
  if (pr.state !== 'open') return { action: 'skip', reason: 'PR ist nicht offen' };
  if (pr.head.repo?.full_name !== pr.base.repo?.full_name)
    return { action: 'skip', reason: 'PR aus einem Fork' };
  if (!force && !isAntigravityPr(pr))
    return { action: 'skip', reason: `Branch ohne Präfix ${BRANCH_PREFIX}` };
  if (pr.draft && !force) return { action: 'skip', reason: 'Entwurf' };
  const rounds = parseReviewMarkers(comments);
  if (rounds.some((entry) => entry.sha === sha))
    return { action: 'skip', reason: `Claude-Review zu ${sha} liegt vor` };
  if (rounds.length >= MAX_ROUNDS) {
    if (hasEscalationMarker(comments))
      return { action: 'skip', reason: 'Rundenlimit erreicht, Marc ist informiert' };
    return { action: 'escalate', reason: `${MAX_ROUNDS} Review-Runden erreicht` };
  }
  return {
    action: 'review',
    round: rounds.length + 1,
    reason: `Runde ${rounds.length + 1} von ${MAX_ROUNDS}`,
  };
}

/** Claude schließt den Befund mit genau einer Zeile `ERGEBNIS: BEFUNDE` oder `ERGEBNIS: KEINE BEFUNDE`. */
export function parseVerdict(text) {
  const matches = [...(text ?? '').matchAll(VERDICT_PATTERN)].map((match) => match[1]);
  if (matches.length !== 1) return 'unclear';
  return matches[0] === 'BEFUNDE' ? 'findings' : 'clean';
}

/**
 * Der Befund stammt aus einem Job, der PR-Code ausgeführt hat: Markierungen und Erwähnungen
 * entschärfen, damit er weder Runden fälschen noch Claude/Codex-Workflows auslösen kann.
 */
export function sanitizeReview(text) {
  const cleaned = (text ?? '')
    .replace(/<!--/g, '&lt;!--')
    .replace(/@(claude|codex)\b/gi, '$1')
    .trim();
  return cleaned.length > MAX_BODY_CHARS
    ? `${cleaned.slice(0, MAX_BODY_CHARS)}\n\n_(gekürzt)_`
    : cleaned;
}

export function commitStatus(verdict, sha) {
  const short = sha.slice(0, 10);
  if (verdict === 'clean')
    return { state: 'success', description: `Claude: keine Befunde zu ${short}` };
  if (verdict === 'findings')
    return { state: 'failure', description: `Claude: Befunde zu ${short}` };
  return { state: 'error', description: `Claude: Ergebnis zu ${short} nicht eindeutig` };
}

export function formatReviewComment({ round, sha, verdict, review, headMoved = false }) {
  const headline = {
    findings: 'Befunde, Nacharbeit durch Antigravity erforderlich',
    clean: 'keine Befunde; Freigabe und Merge entscheidet Marc',
    unclear: 'Ergebnis nicht eindeutig; Marc prüft den Lauf',
  }[verdict];
  const lines = [
    `**Claude-Review Runde ${round} von ${MAX_ROUNDS}** für Head \`${sha}\`: ${headline}.`,
  ];
  if (headMoved)
    lines.push(
      '',
      '_Der Branch hat sich während des Reviews bewegt; der nächste Push wird neu geprüft._',
    );
  lines.push('', BODY_START, '', sanitizeReview(review), '', BODY_END);
  if (verdict === 'findings') {
    lines.push(
      '',
      '---',
      '',
      'Antigravity: lokal `npm run antigravity:inbox` ausführen, dann Antigravity mit „weiter“ starten. ' +
        'Der nächste Push auf diesen Branch startet die nächste Review-Runde automatisch.',
    );
  }
  lines.push('', reviewMarker({ round, sha, verdict }));
  return lines.join('\n');
}

/** Schneidet den veröffentlichten Befund wieder aus dem Markierungskommentar. */
export function extractReviewBody(body) {
  const start = (body ?? '').indexOf(BODY_START);
  const end = (body ?? '').indexOf(BODY_END);
  if (start === -1 || end === -1 || end < start) return '';
  return body.slice(start + BODY_START.length, end).trim();
}

/** Baut `handoff/inbox.md` für Antigravity aus dem jüngsten Claude-Review des PR. */
export function formatInbox({ pr, comments }) {
  const rounds = parseReviewMarkers(comments);
  const latest = rounds.at(-1);
  if (!latest)
    return { ready: false, reason: `Zu PR #${pr.number} liegt noch kein Claude-Review vor.` };
  if (latest.sha !== pr.head.sha)
    return {
      ready: false,
      reason: `Der jüngste Claude-Review gilt ${latest.sha.slice(0, 10)}, der Head ist ${pr.head.sha.slice(0, 10)}. Review läuft noch oder steht aus.`,
    };
  const header = [
    `# Auftrag an Antigravity: Claude-Review PR #${pr.number}, Runde ${latest.round} von ${MAX_ROUNDS}`,
    '',
    `Branch: \`${pr.head.ref}\` · geprüfter Head: \`${latest.sha}\``,
    '',
  ];
  if (latest.verdict === 'clean') {
    header.push(
      'Claude meldet keine Befunde. Nichts zu tun; Marc entscheidet über Freigabe und Merge.',
    );
    return { ready: true, verdict: latest.verdict, text: `${header.join('\n')}\n` };
  }
  header.push(
    'So arbeitest du die Runde ab (Regeln: CLAUDE.md, AGENTS.md, Abschnitt „Handoff-Protokoll“):',
    '',
    '1. Jeden Befund gegen Auftrag und Code prüfen. Berechtigte Befunde beheben, unberechtigte begründen.',
    '2. Nur die Ziel-Dateien des Auftrags ändern; Schutzbereiche nie ohne ausdrücklichen Auftrag.',
    '3. Gates grün fahren: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`.',
    '4. In `docs/BUILD_LOG.md` den Abschnitt „Nacharbeit Claude-Review Runde N“ ergänzen.',
    '5. Committen und auf denselben Branch pushen. Der Push startet die nächste Review-Runde.',
    '',
    '## Befund von Claude',
    '',
    extractReviewBody(latest.comment.body) || '(Befundtext fehlt, siehe PR-Kommentar)',
  );
  return { ready: true, verdict: latest.verdict, text: `${header.join('\n')}\n` };
}

// ---------------------------------------------------------------- GitHub-Zugriff (CLI)

function createGitHub({ token, repo }) {
  const call = async (method, path, body) => {
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok)
      throw new Error(`${method} ${path}: HTTP ${response.status} ${await response.text()}`);
    return response.status === 204 ? null : response.json();
  };
  const all = async (path) => {
    const items = [];
    for (let page = 1; ; page += 1) {
      const separator = path.includes('?') ? '&' : '?';
      const batch = await call('GET', `${path}${separator}per_page=100&page=${page}`);
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  };
  return {
    pr: (number) => call('GET', `/pulls/${number}`),
    prsForBranch: (owner, branch) =>
      call('GET', `/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`),
    comments: (number) => all(`/issues/${number}/comments`),
    comment: (number, body) => call('POST', `/issues/${number}/comments`, { body }),
    setStatus: (sha, body) => call('POST', `/statuses/${sha}`, body),
  };
}

function setOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

const prUrl = (prNumber) => `https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${prNumber}`;

async function runGate(gh, { prNumber, force }) {
  const pr = await gh.pr(prNumber);
  const comments = await gh.comments(prNumber);
  const decision = decideClaudeReview({ pr, comments, force });
  console.log(`PR #${prNumber} (${pr.head.sha}): ${decision.action} — ${decision.reason}`);
  if (decision.action === 'escalate') {
    await gh.comment(
      prNumber,
      `@mapoenisch Der automatische Claude-Review ist gestoppt: ${decision.reason}. ` +
        `Head \`${pr.head.sha}\` wird nicht mehr automatisch geprüft. ` +
        `Bitte entscheide über das weitere Vorgehen.\n\n${ESCALATION_MARKER}`,
    );
  }
  if (decision.action === 'review') {
    await gh.setStatus(pr.head.sha, {
      state: 'pending',
      context: STATUS_CONTEXT,
      description: `Claude-Review Runde ${decision.round} läuft`,
      target_url: prUrl(prNumber),
    });
  }
  setOutputs({
    action: decision.action,
    round: decision.round ?? 0,
    head_sha: pr.head.sha,
    base_ref: pr.base.ref,
  });
}

async function runPublish(gh, { prNumber, sha, round, reviewFile }) {
  let review = '';
  try {
    review = readFileSync(reviewFile, 'utf8');
  } catch {
    review = 'Claude hat keinen Befund geschrieben.';
  }
  const verdict = parseVerdict(review);
  const pr = await gh.pr(prNumber);
  const comments = await gh.comments(prNumber);
  if (parseReviewMarkers(comments).some((entry) => entry.sha === sha)) {
    console.log(`Review zu ${sha} ist bereits veröffentlicht: übersprungen.`);
    return;
  }
  await gh.comment(
    prNumber,
    formatReviewComment({ round, sha, verdict, review, headMoved: pr.head.sha !== sha }),
  );
  const status = commitStatus(verdict, sha);
  await gh.setStatus(sha, {
    ...status,
    context: STATUS_CONTEXT,
    target_url: prUrl(prNumber),
  });
  console.log(`PR #${prNumber} (${sha}): ${verdict} — ${status.description}`);
}

// ---------------------------------------------------------------- lokal (Antigravity-Rechner)

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function localRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = git('remote', 'get-url', 'origin');
  const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`GitHub-Repo aus origin nicht ableitbar: ${url}`);
  return match[1];
}

function localToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Kein Token: GH_TOKEN setzen oder `gh auth login` ausführen.');
  }
}

async function runInbox({ prNumber, out }) {
  const repo = localRepo();
  const gh = createGitHub({ token: localToken(), repo });
  let number = prNumber;
  if (!number) {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    const [match] = await gh.prsForBranch(repo.split('/')[0], branch);
    if (!match) throw new Error(`Kein offener PR für Branch ${branch}.`);
    number = match.number;
  }
  const inbox = formatInbox({ pr: await gh.pr(number), comments: await gh.comments(number) });
  if (!inbox.ready) {
    console.log(inbox.reason);
    process.exitCode = 2;
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, inbox.text);
  console.log(
    inbox.verdict === 'clean'
      ? `PR #${number}: keine Befunde. ${out} aktualisiert.`
      : `PR #${number}: Befund nach ${out} geschrieben. Antigravity jetzt mit „weiter“ starten.`,
  );
}

async function main(argv) {
  const [command, ...rest] = argv;
  const args = Object.fromEntries(
    rest
      .map((arg) => arg.replace(/^--/, '').split('='))
      .map(([key, ...value]) => [key, value.length ? value.join('=') : 'true']),
  );
  const prNumber = args.pr ? Number(args.pr) : undefined;
  if (args.pr && !Number.isInteger(prNumber)) throw new Error('--pr muss numerisch sein.');
  if (command === 'inbox') return runInbox({ prNumber, out: args.out ?? 'handoff/inbox.md' });

  const token = process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GH_TOKEN und GITHUB_REPOSITORY müssen gesetzt sein.');
  if (!prNumber) throw new Error(`${command} braucht --pr=<Nummer>.`);
  const gh = createGitHub({ token, repo });
  if (command === 'gate') return runGate(gh, { prNumber, force: args.force === 'true' });
  if (command === 'publish') {
    if (!/^[0-9a-f]{40}$/.test(args.sha ?? ''))
      throw new Error('publish braucht --sha=<Head-SHA>.');
    if (!args.review) throw new Error('publish braucht --review=<Datei>.');
    return runPublish(gh, {
      prNumber,
      sha: args.sha,
      round: Number(args.round),
      reviewFile: args.review,
    });
  }
  throw new Error(`Unbekannter Befehl: ${command ?? '(leer)'} — erlaubt: gate, publish, inbox`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
