#!/usr/bin/env node
// CI-Auftrag Codex-Nacharbeit (docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md):
// Entscheidet, ob für einen PR ein Codex-Review angefordert wird (`request`) und ob ein
// eingegangenes Codex-Ergebnis eine Nacharbeitsrunde startet (`rework-gate`). Codex liefert
// Ergebnisse als Review (mit Inline-Befunden) oder als PR-Kommentar (Aufgabenformat).
// Dritter Befehl `status`: setzt den Commit-Status `codex-review` für den Head (siehe codex-status.yml).
// Die Entscheidungen sind reine Funktionen; die CLI liest den Zustand über die GitHub-API
// und schreibt Markierungskommentare, an denen spätere Läufe Dopplungen erkennen.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CODEX_BOT = { login: 'chatgpt-codex-connector[bot]', id: 199175422 };
export const MARKER_AUTHOR = 'github-actions[bot]';
export const MAX_ROUNDS = 3;
export const REQUEST_DELAY_MS = 20 * 60 * 1000;
export const ESCALATION_MARKER = '<!-- codex-review-cycle:escalated -->';

export const requestMarker = (sha) => `<!-- codex-review-cycle:request sha=${sha} -->`;
export const reworkMarker = ({ round, sha, source }) =>
  `<!-- codex-review-cycle:rework round=${round} sha=${sha} source=${source} -->`;

const REWORK_PATTERN =
  /<!-- codex-review-cycle:rework round=(\d+) sha=([0-9a-f]{40}) source=((?:review|comment)-\d+) -->/g;
const BLOB_SHA_PATTERN = /\/blob\/([0-9a-f]{40})\//g;
const PRIORITY_PATTERN = /\*\*P[0-3]\b|!\[P[0-3] Badge\]/g;

/** Ein Review/Kommentar/Reaktion stammt nur dann von Codex, wenn Login, Typ und ID passen. */
export function isVerifiedCodex(user) {
  return (
    Boolean(user) &&
    user.login === CODEX_BOT.login &&
    user.type === 'Bot' &&
    user.id === CODEX_BOT.id
  );
}

/** Markierungen zählen nur aus Kommentaren des Workflows selbst, nicht von Menschen oder anderen Bots. */
function markerComments(comments) {
  return comments.filter(
    (comment) => comment.user?.login === MARKER_AUTHOR && comment.user?.type === 'Bot',
  );
}

export function parseReworkMarkers(comments) {
  const rounds = [];
  for (const comment of markerComments(comments)) {
    for (const match of (comment.body ?? '').matchAll(REWORK_PATTERN)) {
      rounds.push({ round: Number(match[1]), sha: match[2], source: match[3] });
    }
  }
  return rounds;
}

/** Der geprüfte Stand eines Codex-Kommentars: der eine SHA, auf den seine Dateilinks zeigen. */
export function commentSha(body) {
  const shas = new Set([...(body ?? '').matchAll(BLOB_SHA_PATTERN)].map((match) => match[1]));
  return shas.size === 1 ? [...shas][0] : null;
}

/** Vereinheitlicht Codex-Reviews und -Kommentare zu Ergebnissen mit geprüftem SHA und Befundzahl. */
export function codexResultFromReview(review, reviewComments) {
  return {
    source: `review-${review.id}`,
    user: review.user,
    sha: review.commit_id,
    findingCount: reviewComments.length,
  };
}

export function codexResultFromComment(comment) {
  return {
    source: `comment-${comment.id}`,
    user: comment.user,
    sha: commentSha(comment.body),
    findingCount: (comment.body ?? '').match(PRIORITY_PATTERN)?.length ?? 0,
  };
}

export function hasRequestMarker(comments, sha) {
  return markerComments(comments).some((comment) =>
    (comment.body ?? '').includes(requestMarker(sha)),
  );
}

export function hasEscalationMarker(comments) {
  return markerComments(comments).some((comment) =>
    (comment.body ?? '').includes(ESCALATION_MARKER),
  );
}

export const STATUS_CONTEXT = 'codex-review';
const REVIEWED_COMMIT_PATTERN = /Reviewed commit:\*\*\s*`([0-9a-f]{7,40})`/;
const CLEAN_RESULT_PATTERN = /Didn't find any major issues/;

/** Codex nennt den geprüften Stand im Ergebnis-Kommentar gekürzt; er zählt nur als Präfix des Head-SHA. */
export function reviewedCommitMatches(body, headSha) {
  const match = (body ?? '').match(REVIEWED_COMMIT_PATTERN);
  return Boolean(match) && headSha.startsWith(match[1]);
}

/**
 * Serverseitig prüfbarer Status des Codex-Reviews für den aktuellen Head (Commit-Status `codex-review`).
 * `failure`: Befunde zum Head. `success`: Codex meldet für genau diesen Head keine Befunde.
 * `pending`: kein verwertbares Ergebnis zum Head. Der Status ersetzt keine Freigabe durch Marc.
 * Ergebnisse zu anderen Ständen zählen nie; `reviewCommentCounts` bildet Review-ID auf Inline-Befunde ab.
 */
export function decideCodexStatus({ pr, reviews, reviewCommentCounts, comments }) {
  const sha = pr.head.sha;
  if (pr.state !== 'open') return { action: 'skip', reason: 'PR ist nicht offen' };
  if (pr.head.repo?.full_name !== pr.base.repo?.full_name)
    return { action: 'skip', reason: 'PR aus einem Fork' };

  const reviewFindings = reviews
    .filter((review) => isVerifiedCodex(review.user) && review.commit_id === sha)
    .reduce((sum, review) => sum + (reviewCommentCounts[review.id] ?? 0), 0);
  const verified = comments.filter((comment) => isVerifiedCodex(comment.user));
  const commentFindings = verified
    .filter((comment) => commentSha(comment.body) === sha)
    .reduce((sum, comment) => sum + codexResultFromComment(comment).findingCount, 0);
  const cleanComment = verified.some(
    (comment) =>
      CLEAN_RESULT_PATTERN.test(comment.body ?? '') && reviewedCommitMatches(comment.body, sha),
  );
  // Codex reicht das befundfreie Ergebnis teils als Review ein; maßgeblich ist dessen `commit_id`.
  const cleanReview = reviews.some(
    (review) =>
      isVerifiedCodex(review.user) &&
      review.commit_id === sha &&
      CLEAN_RESULT_PATTERN.test(review.body ?? ''),
  );
  const clean = cleanComment || cleanReview;

  if (reviewFindings + commentFindings > 0) {
    return {
      action: 'set',
      state: 'failure',
      description: `Codex: ${reviewFindings + commentFindings} Befund(e) zu ${sha.slice(0, 10)}`,
    };
  }
  if (clean) {
    return {
      action: 'set',
      state: 'success',
      description: `Codex: keine Befunde zu ${sha.slice(0, 10)}`,
    };
  }
  return {
    action: 'set',
    state: 'pending',
    description: `Codex-Review zu ${sha.slice(0, 10)} ausstehend`,
  };
}

/**
 * Soll für den aktuellen Head ein `@codex review` geschrieben werden?
 * Ohne `force` erst nach REQUEST_DELAY_MS, weil Codex bei jedem Push von sich aus prüfen soll.
 */
export function decideReviewRequest({
  pr,
  headCommittedAt,
  comments,
  reviews,
  reactions,
  now,
  force = false,
}) {
  const sha = pr.head.sha;
  if (pr.state !== 'open') return { action: 'skip', reason: 'PR ist nicht offen' };
  if (pr.head.repo?.full_name !== pr.base.repo?.full_name)
    return { action: 'skip', reason: 'PR aus einem Fork' };
  if (pr.draft && !force) return { action: 'skip', reason: 'Entwurf' };
  if (hasRequestMarker(comments, sha))
    return { action: 'skip', reason: `für ${sha} bereits angefordert` };
  if (reviews.some((review) => isVerifiedCodex(review.user) && review.commit_id === sha)) {
    return { action: 'skip', reason: `Codex-Review zu ${sha} liegt vor` };
  }
  if (
    comments.some((comment) => isVerifiedCodex(comment.user) && commentSha(comment.body) === sha)
  ) {
    return { action: 'skip', reason: `Codex-Ergebnis zu ${sha} liegt als Kommentar vor` };
  }
  const since = Date.parse(headCommittedAt);
  if (
    reactions.some(
      (reaction) => isVerifiedCodex(reaction.user) && Date.parse(reaction.created_at) >= since,
    )
  ) {
    return { action: 'skip', reason: 'Codex hat seit dem Head-Commit reagiert' };
  }
  if (!force && now - since < REQUEST_DELAY_MS)
    return { action: 'skip', reason: 'Wartezeit für den automatischen Review läuft' };
  return {
    action: 'request',
    reason: force ? 'Label codex-review gesetzt' : 'kein Codex-Review nach Wartezeit',
  };
}

/** Startet ein eingegangenes Codex-Ergebnis eine Nacharbeitsrunde, wird übersprungen oder an Marc eskaliert? */
export function decideRework({ pr, result, comments }) {
  const sha = pr.head.sha;
  if (!isVerifiedCodex(result.user))
    return { action: 'skip', reason: 'Ergebnis stammt nicht vom verifizierten Codex-Bot' };
  if (pr.state !== 'open') return { action: 'skip', reason: 'PR ist nicht offen' };
  if (pr.head.repo?.full_name !== pr.base.repo?.full_name)
    return { action: 'skip', reason: 'PR aus einem Fork' };
  if (!result.sha) return { action: 'skip', reason: 'geprüfter Stand nicht eindeutig bestimmbar' };
  if (result.sha !== sha)
    return { action: 'skip', reason: `veraltetes Ergebnis (${result.sha} statt Head ${sha})` };
  if (result.findingCount === 0) return { action: 'skip', reason: 'Ergebnis ohne Befunde' };
  const rounds = parseReworkMarkers(comments);
  if (rounds.some((entry) => entry.sha === sha || entry.source === result.source)) {
    return { action: 'skip', reason: `Nacharbeit für ${sha} läuft bereits oder ist erledigt` };
  }
  if (rounds.length >= MAX_ROUNDS) {
    if (hasEscalationMarker(comments))
      return { action: 'skip', reason: 'Rundenlimit erreicht, Marc ist informiert' };
    return { action: 'escalate', reason: `${MAX_ROUNDS} Nacharbeitsrunden erreicht` };
  }
  return {
    action: 'rework',
    round: rounds.length + 1,
    reason: `Runde ${rounds.length + 1} von ${MAX_ROUNDS}`,
  };
}

/** Fasst alle verifizierten Codex-Ergebnisse zum Head-SHA (Reviews samt Inline-Befunden, Kommentare) zusammen. */
export function formatFindings({ pr, round, reviews, commentsByReview, codexComments = [] }) {
  const lines = [
    `# Codex-Befunde für PR #${pr.number}, Head ${pr.head.sha}, Runde ${round} von ${MAX_ROUNDS}`,
    '',
    'Quelle: ausschließlich Ergebnisse von chatgpt-codex-connector[bot] zu genau diesem Head-SHA.',
  ];
  for (const comment of codexComments) {
    lines.push('', `## Kommentar ${comment.id} (${comment.created_at})`, '', comment.body.trim());
  }
  for (const review of reviews) {
    lines.push(
      '',
      `## Review ${review.id} (${review.submitted_at})`,
      '',
      (review.body ?? '').trim() || '(ohne Text)',
    );
    for (const comment of commentsByReview.get(review.id) ?? []) {
      const where = comment.line ?? comment.original_line ?? '?';
      lines.push(
        '',
        `### Befund ${comment.id} — \`${comment.path}\` Zeile ${where}`,
        '',
        comment.body.trim(),
      );
    }
  }
  return `${lines.join('\n')}\n`;
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
    openPrs: () => all('/pulls?state=open'),
    comments: (number) => all(`/issues/${number}/comments`),
    reviews: (number) => all(`/pulls/${number}/reviews`),
    review: (number, id) => call('GET', `/pulls/${number}/reviews/${id}`),
    reviewComments: (number, id) => all(`/pulls/${number}/reviews/${id}/comments`),
    issueReactions: (number) => all(`/issues/${number}/reactions`),
    commentReactions: (id) => all(`/issues/comments/${id}/reactions`),
    commit: (sha) => call('GET', `/commits/${sha}`),
    issueComment: (id) => call('GET', `/issues/comments/${id}`),
    comment: (number, body) => call('POST', `/issues/${number}/comments`, { body }),
    setStatus: (sha, body) => call('POST', `/statuses/${sha}`, body),
  };
}

function setOutputs(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

async function runRequest(gh, { prNumber, force }) {
  const prs = prNumber ? [await gh.pr(prNumber)] : await gh.openPrs();
  for (const pr of prs) {
    const comments = await gh.comments(pr.number);
    const requestComments = markerComments(comments).filter((comment) =>
      comment.body?.includes('codex-review-cycle:request'),
    );
    const reactions = [
      ...(await gh.issueReactions(pr.number)),
      ...(
        await Promise.all(requestComments.map((comment) => gh.commentReactions(comment.id)))
      ).flat(),
    ];
    const decision = decideReviewRequest({
      pr,
      headCommittedAt: (await gh.commit(pr.head.sha)).commit.committer.date,
      comments,
      reviews: await gh.reviews(pr.number),
      reactions,
      now: Date.now(),
      force,
    });
    console.log(`PR #${pr.number} (${pr.head.sha}): ${decision.action} — ${decision.reason}`);
    if (decision.action === 'request') {
      await gh.comment(
        pr.number,
        `@codex review\n\nAngefordert für Head \`${pr.head.sha}\` (${decision.reason}).\n\n${requestMarker(pr.head.sha)}`,
      );
    }
  }
}

async function runStatus(gh, { prNumber }) {
  const pr = await gh.pr(prNumber);
  const reviews = await gh.reviews(prNumber);
  const reviewCommentCounts = {};
  for (const review of reviews.filter(
    (entry) => isVerifiedCodex(entry.user) && entry.commit_id === pr.head.sha,
  )) {
    reviewCommentCounts[review.id] = (await gh.reviewComments(prNumber, review.id)).length;
  }
  const decision = decideCodexStatus({
    pr,
    reviews,
    reviewCommentCounts,
    comments: await gh.comments(prNumber),
  });
  if (decision.action === 'skip') {
    console.log(`PR #${prNumber} (${pr.head.sha}): skip — ${decision.reason}`);
    return;
  }
  console.log(`PR #${prNumber} (${pr.head.sha}): ${decision.state} — ${decision.description}`);
  await gh.setStatus(pr.head.sha, {
    state: decision.state,
    context: STATUS_CONTEXT,
    description: decision.description.slice(0, 140),
    target_url: `https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${prNumber}`,
  });
}

async function runReworkGate(gh, { prNumber, reviewId, commentId, findingsFile }) {
  const pr = await gh.pr(prNumber);
  const comments = await gh.comments(prNumber);
  const result = reviewId
    ? codexResultFromReview(
        await gh.review(prNumber, reviewId),
        await gh.reviewComments(prNumber, reviewId),
      )
    : codexResultFromComment(await gh.issueComment(commentId));
  const decision = decideRework({ pr, result, comments });
  console.log(`PR #${prNumber}, ${result.source}: ${decision.action} — ${decision.reason}`);

  if (decision.action === 'escalate') {
    await gh.comment(
      prNumber,
      `@mapoenisch Die automatische Nacharbeit ist gestoppt: ${decision.reason}. ` +
        `Das neue Codex-Ergebnis (${result.source}) zu \`${pr.head.sha}\` wird nicht mehr automatisch bearbeitet. ` +
        `Bitte entscheide über das weitere Vorgehen.\n\n${ESCALATION_MARKER}`,
    );
  }
  if (decision.action === 'rework') {
    const headReviews = (await gh.reviews(prNumber)).filter(
      (entry) => isVerifiedCodex(entry.user) && entry.commit_id === pr.head.sha,
    );
    const commentsByReview = new Map();
    for (const entry of headReviews)
      commentsByReview.set(entry.id, await gh.reviewComments(prNumber, entry.id));
    const codexComments = comments.filter(
      (entry) => isVerifiedCodex(entry.user) && commentSha(entry.body) === pr.head.sha,
    );
    mkdirSync(dirname(findingsFile), { recursive: true });
    writeFileSync(
      findingsFile,
      formatFindings({
        pr,
        round: decision.round,
        reviews: headReviews,
        commentsByReview,
        codexComments,
      }),
    );
    // Die Markierung beansprucht die Runde vor dem Start, damit kein zweiter Lauf denselben Stand bearbeitet.
    await gh.comment(
      prNumber,
      `Automatische Nacharbeit gestartet: Runde ${decision.round} von ${MAX_ROUNDS} für Head \`${pr.head.sha}\` ` +
        `(${headReviews.length} Review(s), ${codexComments.length} Kommentar(e) von Codex). ` +
        `Kein Merge und keine Freigabe durch Claude.\n\n` +
        reworkMarker({ round: decision.round, sha: pr.head.sha, source: result.source }),
    );
  }
  setOutputs({
    action: decision.action,
    round: decision.round ?? 0,
    head_sha: pr.head.sha,
    head_ref: pr.head.ref,
  });
}

async function main(argv) {
  const [command, ...rest] = argv;
  const args = Object.fromEntries(
    rest
      .map((arg) => arg.replace(/^--/, '').split('='))
      .map(([key, value]) => [key, value ?? 'true']),
  );
  const token = process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GH_TOKEN und GITHUB_REPOSITORY müssen gesetzt sein.');
  const gh = createGitHub({ token, repo });
  if (command === 'request')
    return runRequest(gh, {
      prNumber: args.pr ? Number(args.pr) : undefined,
      force: args.force === 'true',
    });
  if (command === 'status') {
    if (!args.pr) throw new Error('status braucht --pr=<Nummer>.');
    return runStatus(gh, { prNumber: Number(args.pr) });
  }
  if (command === 'rework-gate') {
    if (Boolean(args.review) === Boolean(args.comment))
      throw new Error('rework-gate braucht genau eines von --review oder --comment.');
    if (!args.findings) throw new Error('rework-gate braucht --findings=<Datei>.');
    return runReworkGate(gh, {
      prNumber: Number(args.pr),
      reviewId: args.review ? Number(args.review) : undefined,
      commentId: args.comment ? Number(args.comment) : undefined,
      findingsFile: args.findings,
    });
  }
  throw new Error(
    `Unbekannter Befehl: ${command ?? '(leer)'} — erlaubt: request, rework-gate, status`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
