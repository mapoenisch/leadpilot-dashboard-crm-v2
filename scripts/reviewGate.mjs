#!/usr/bin/env node
// Review-Gate für alle PRs im Repo (Antigravity, OpenCode, Devin, weitere Prüfer aus
// .github/review-agents.json). Setzt für den Head-SHA zwei Commit-Status:
//  - `agent-review`: success, sobald ein Prüfer aus der Liste den aktuellen Head geprüft hat
//    ("Reviewed"; nur formale PR-Reviews zählen, die auf genau den Head-Commit zeigen); pending, solange
//    keiner den aktuellen Stand geprüft hat.
//  - `review-conversations`: failure, solange Review-Konversationen offen sind; success, wenn alle
//    gelöst sind. Die Konversationen entstehen durch die Inline-Befunde der Prüfer.
// Als Pflicht-Check im Branch-Schutz (oder "Require conversation resolution") blockiert das den Merge.
// Das Skript läuft mit dem Stand vom Default-Branch, PR-Code wird nie ausgeführt.
// Status setzt ausschließlich die eigene GitHub-App (Secrets `REVIEW_GATE_APP_ID`/`_KEY` in der Umgebung
// `review-gate`, nur vom Default-Branch nutzbar). Ein PR kann sie mit `GITHUB_TOKEN` daher nicht fälschen,
// wenn der Branch-Schutz die Pflicht-Checks an diese App heftet. Fehler setzen `pending`, nie Erfolg.
// Prüfer sind an unveränderliche Konto-IDs gebunden (`accounts`); ein Zielbranch-Wechsel macht
// frühere Reviews ungültig. Ein geplanter Lauf bewertet regelmäßig neu, falls ein Ereignis ausbleibt.
import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const STATUS_REVIEWED = 'agent-review';
export const STATUS_THREADS = 'review-conversations';

/** Login-Vergleich ohne Groß-/Kleinschreibung und ohne das Bot-Suffix `[bot]`. */
const normalize = (login) => (login ?? '').toLowerCase().replace(/\[bot\]$/, '');

const has = (list, login) => (list ?? []).some((l) => normalize(l) === normalize(login));

/** Agenten, deren Prüfer-Konto (`logins`) dieser Login ist. */
const agentsOf = (login, agents) => agents.filter((a) => has(a.logins, login));

/**
 * Ein Konto ist verifiziert, wenn numerische ID und Typ zum Eintrag in `accounts` passen. Logins sind
 * nach einer Umbenennung wieder frei und dürfen allein nichts freigeben; ohne Eintrag zählt nichts.
 */
export function verifiedAccount(user, accounts = {}) {
  const entry = Object.entries(accounts).find(
    ([login]) => normalize(login) === normalize(user?.login),
  )?.[1];
  return Boolean(entry && user && entry.id === user.id && entry.type === user.type);
}

/**
 * Nur auswertbare Reviews: von einem verifizierten Konto und mit einem für dieses Konto erlaubten
 * Zustand. `approve: false` (z. B. `marcs-pr-reviewer`, AGENTS.md: keine Freigaben) verwirft APPROVED.
 */
export function usableReviews(reviews, accounts = {}) {
  return reviews.filter((review) => {
    if (!verifiedAccount(review.user, accounts)) return false;
    const entry = Object.entries(accounts).find(
      ([login]) => normalize(login) === normalize(review.user.login),
    )[1];
    return !(review.state === 'APPROVED' && entry.approve === false);
  });
}

/**
 * Zeitpunkt des letzten Zielbranch-Wechsels (`base_ref_changed`). Reviews davor beziehen sich auf einen
 * anderen Diff und zählen danach nicht mehr als Prüfnachweis.
 */
export const lastBaseChange = (events) =>
  events
    .filter((e) => e.event === 'base_ref_changed')
    .map((e) => e.created_at)
    .sort()
    .at(-1) ?? null;

/**
 * Ein Prüfer hat den Head geprüft, wenn sein formales PR-Review auf genau diesen Commit zeigt.
 * Kommentare zählen nicht (kein Commit-Bezug, nachträglich änderbar).
 */
export function reviewedBy(reviews, headSha, agents, prAuthors = [], builderAgents = []) {
  // prAuthors: PR-Öffner plus Autoren/Committer der PR-Commits.
  // builderAgents: per Branch-Präfix gebundene Builder-Rolle (baut unter Marcs Konto).
  const authors = [prAuthors].flat().filter(Boolean);
  if (authors.length === 0) throw new Error('PR-Autor unbekannt: Gate bleibt ohne Status');
  const names = new Set();
  // Kein Selbst-Review: weder diese Konten noch ein Agent mit einem dieser Logins noch der gebundene Builder.
  const authorLogins = new Set(authors.map(normalize));
  const authorAgents = new Set([
    ...authors.flatMap((a) => agentsOf(a, agents).map((x) => x.name)),
    ...builderAgents,
  ]);
  const own = (user) =>
    authorLogins.has(normalize(user?.login)) ||
    agentsOf(user?.login, agents).some((a) => authorAgents.has(a.name));
  for (const review of reviews) {
    if (own(review.user)) continue;
    if (review.commit_id !== headSha) continue;
    if (!['APPROVED', 'COMMENTED', 'CHANGES_REQUESTED'].includes(review.state)) continue;
    for (const agent of agentsOf(review.user?.login, agents)) names.add(agent.name);
  }
  return [...names];
}

/**
 * Prüfer, deren wirksamer Review-Zustand „Änderungen angefordert“ ist. Wie bei GitHub zählt je Login das
 * letzte APPROVED/CHANGES_REQUESTED/DISMISSED-Review über alle Commits; COMMENTED ändert ihn nicht.
 * Eine Anforderung blockiert also, bis derselbe Prüfer freigibt oder das Review verworfen wird.
 */
export function changesRequestedBy(reviews, agents) {
  const effective = new Map();
  for (const review of reviews) {
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
    effective.set(normalize(review.user?.login), review.state);
  }
  const names = new Set();
  for (const [login, state] of effective) {
    if (state !== 'CHANGES_REQUESTED') continue;
    for (const agent of agentsOf(login, agents)) names.add(agent.name);
  }
  return [...names];
}

/**
 * Builder laut Branch-Präfix (`builderBranches`; Marc 20.10.2026: Agenten bauen unter Marcs Konto, keine
 * eigenen Builder-Konten). Restrisiko: Das Präfix ist frei wählbar; ein Agent könnte unter einem fremden
 * Präfix bauen und sich selbst prüfen. Marc prüft beim Merge, wer gebaut hat.
 */
export const builderOf = (branch, builderBranches = {}) =>
  Object.entries(builderBranches)
    .filter(([prefix]) => (branch ?? '').startsWith(prefix))
    .map(([, name]) => name);

export const reviewedStatus = (names) =>
  names.length > 0
    ? { state: 'success', description: `Reviewed von ${names.join(', ')}` }
    : { state: 'pending', description: 'Noch kein Agent-Review für diesen Commit' };

export function threadsStatus(threads) {
  const open = threads.filter((t) => !t.isResolved).length;
  return open > 0
    ? {
        state: 'failure',
        description: `${open} offene Konversation${open === 1 ? '' : 'en'} — erst lösen`,
      }
    : { state: 'success', description: 'Alle Review-Konversationen gelöst' };
}

function gh(args, input, token = process.env.GH_TOKEN) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GH_TOKEN: token },
  });
}

/** JWT (RS256) der Review-Gate-App, mit Node-Bordmitteln ohne Abhängigkeit. */
export function appJwt(appId, key, now = Math.floor(Date.now() / 1000)) {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const body = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: now - 60, exp: now + 540, iss: String(appId) })}`;
  return `${body}.${createSign('RSA-SHA256').update(body).sign(key, 'base64url')}`;
}

/**
 * Installations-Token der Review-Gate-App. Die JWT-Aufrufe laufen per fetch mit `Bearer`:
 * `gh api` sendet ein Token als OAuth-Token, das GitHub für JWTs mit 401 ablehnt.
 */
async function appToken(repoFull) {
  const appId = process.env.REVIEW_GATE_APP_ID;
  const key = process.env.REVIEW_GATE_APP_KEY;
  if (!appId || !key) throw new Error('REVIEW_GATE_APP_ID/_KEY fehlen: Gate bleibt ohne Status');
  const headers = {
    Authorization: `Bearer ${appJwt(appId, key)}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const call = async (method, path) => {
    const res = await fetch(`https://api.github.com/${path}`, { method, headers });
    if (!res.ok) throw new Error(`App-Token: ${method} ${path} → ${res.status}`);
    return res.json();
  };
  const installation = await call('GET', `repos/${repoFull}/installation`);
  return (await call('POST', `app/installations/${installation.id}/access_tokens`)).token;
}

const THREADS_QUERY = `query($owner:String!,$repo:String!,$pr:Int!,$after:String){
  repository(owner:$owner,name:$repo){pullRequest(number:$pr){
    reviewThreads(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{isResolved}}
  }}}`;

function fetchThreads(owner, repo, pr) {
  const nodes = [];
  let after = null;
  for (;;) {
    const args = [
      'api',
      'graphql',
      '-f',
      `query=${THREADS_QUERY}`,
      '-F',
      `owner=${owner}`,
      '-F',
      `repo=${repo}`,
      '-F',
      `pr=${pr}`,
    ];
    if (after) args.push('-F', `after=${after}`);
    const page = JSON.parse(gh(args)).data.repository.pullRequest.reviewThreads;
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return nodes;
    after = page.pageInfo.endCursor;
  }
}

/** Head-SHAs, die mehrere offene PRs teilen (SHA → PR-Nummern). */
export function sharedHeads(pulls) {
  const bySha = new Map();
  for (const p of pulls) bySha.set(p.head.sha, [...(bySha.get(p.head.sha) ?? []), p.number]);
  return new Map([...bySha].filter(([, numbers]) => numbers.length > 1));
}

export const errorStatus = (err) => ({
  state: 'pending',
  description: `Gate-Fehler: ${err.message}`.slice(0, 140),
});
export const CHECKING = { state: 'pending', description: 'Wird geprüft …' };

/**
 * Bewertet `agent-review` für einen PR. Wirft bei unvollständigen Daten oder unbekanntem Builder;
 * der Aufrufer setzt dann `pending` (kein Erfolg ohne vollständige Prüfung).
 */
export function evaluateReviewed({
  pull,
  commits,
  reviews,
  agents,
  builderBranches,
  accounts = {},
  events = [],
  trustedOpeners = [],
  repoFull,
}) {
  if (!pull.user?.login) throw new Error('PR-Autor unbekannt');
  // Die Commit-Liste der API ist auf 250 Einträge begrenzt: bei Abweichung lieber kein Erfolg.
  if (pull.commits > commits.length) throw new Error('PR-Commits unvollständig');
  // Härtung zum frei wählbaren Präfix: nur PRs aus diesem Repo und nur von einem verifizierten,
  // vertrauenswürdigen Öffner-Konto (Marc) zählen.
  if (repoFull && pull.head.repo?.full_name !== repoFull)
    throw new Error('Fork-PR: Gate nur für PRs aus diesem Repo');
  if (!verifiedAccount(pull.user, accounts) || !has(trustedOpeners, pull.user.login))
    throw new Error(`PR-Öffner ${pull.user.login} nicht verifiziert`);
  // Ohne bekanntes Branch-Präfix ist der Builder unbekannt: kein Erfolg.
  const builders = builderOf(pull.head.ref, builderBranches);
  if (builders.length === 0) throw new Error('Builder unbekannt (Branch-Präfix fehlt)');
  const usable = usableReviews(reviews, accounts);
  // Nach einem Zielbranch-Wechsel zählen nur Reviews, die danach abgegeben wurden, für Nachweis und
  // Änderungsanforderungen gleichermaßen (alte Anforderungen beziehen sich auf einen anderen Diff).
  const since = lastBaseChange(events);
  const current = since ? usable.filter((r) => (r.submitted_at ?? '') > since) : usable;
  const blockers = changesRequestedBy(current, agents);
  if (blockers.length > 0)
    return { state: 'failure', description: `Änderungen angefordert von ${blockers.join(', ')}` };
  const commitLogins = commits.flatMap((c) => [c.author?.login, c.committer?.login]);
  return reviewedStatus(
    reviewedBy(current, pull.head.sha, agents, [pull.user.login, ...commitLogins], builders),
  );
}

function gatePr(
  pr,
  repoFull,
  { agents, builderBranches, accounts, trustedOpeners },
  statusToken,
  shared = new Map(),
) {
  const [owner, repo] = repoFull.split('/');
  const pull = JSON.parse(gh(['api', `repos/${repoFull}/pulls/${pr}`]));
  const head = pull.head.sha;
  // Geteilter Head: bereits in main blockiert, hier nichts überschreiben.
  if (shared.has(head)) return;
  const post = (context, { state, description }) =>
    gh(
      [
        'api',
        '-X',
        'POST',
        `repos/${repoFull}/statuses/${head}`,
        '-f',
        `state=${state}`,
        '-f',
        `context=${context}`,
        '-f',
        `description=${description}`,
      ],
      undefined,
      statusToken,
    );
  // Fail-closed: zuerst frühere Erfolge widerrufen, erst danach die fehlbaren Abfragen.
  post(STATUS_REVIEWED, CHECKING);
  post(STATUS_THREADS, CHECKING);
  const errors = [];
  let reviewed;
  try {
    const commits = JSON.parse(
      gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/commits`]),
    ).flat();
    const reviews = JSON.parse(
      gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/reviews`]),
    ).flat();
    const events = JSON.parse(
      gh(['api', '--paginate', '--slurp', `repos/${repoFull}/issues/${pr}/events`]),
    ).flat();
    reviewed = evaluateReviewed({
      pull,
      commits,
      reviews,
      agents,
      builderBranches,
      accounts,
      events,
      trustedOpeners,
      repoFull,
    });
  } catch (err) {
    errors.push(err);
    reviewed = errorStatus(err);
  }
  // Konversationen werden unabhängig bewertet: ein unbekannter Builder macht sie nicht rot.
  let threads;
  try {
    threads = threadsStatus(fetchThreads(owner, repo, pr));
  } catch (err) {
    errors.push(err);
    threads = errorStatus(err);
  }
  post(STATUS_REVIEWED, reviewed);
  post(STATUS_THREADS, threads);
  console.log(
    `PR ${pr} @ ${head.slice(0, 7)}: ${STATUS_REVIEWED}=${reviewed.state}, ${STATUS_THREADS}=${threads.state}`,
  );
  if (errors.length > 0) throw errors[0];
}

async function main() {
  const arg = (process.argv.find((a) => a.startsWith('--pr=')) ?? '').slice(5);
  const repoFull = process.env.GITHUB_REPOSITORY;
  const config = JSON.parse(
    readFileSync(new URL('../.github/review-agents.json', import.meta.url), 'utf8'),
  );
  const statusToken = await appToken(repoFull);
  const open = JSON.parse(
    gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls?state=open&per_page=100`]),
  ).flat();
  // Commit-Status hängen am SHA: Teilen sich PRs einen Head, blockieren beide (sonst überschreibt einer den anderen).
  const shared = sharedHeads(open);
  let failed = 0;
  for (const [sha, numbers] of shared) {
    const blocked = {
      state: 'pending',
      description: `Mehrdeutiger Head: PRs ${numbers.join(', ')} teilen diesen Commit`,
    };
    try {
      for (const context of [STATUS_REVIEWED, STATUS_THREADS]) {
        gh(
          [
            'api',
            '-X',
            'POST',
            `repos/${repoFull}/statuses/${sha}`,
            '-f',
            `state=${blocked.state}`,
            '-f',
            `context=${context}`,
            '-f',
            `description=${blocked.description}`,
          ],
          undefined,
          statusToken,
        );
      }
    } catch (err) {
      failed += 1;
      console.error(`Head ${sha.slice(0, 7)}: ${err.message}`);
      continue;
    }
    console.log(`Head ${sha.slice(0, 7)}: PRs ${numbers.join(', ')} – mehrdeutig, blockiert`);
  }
  // --pr=all: alle offenen PRs neu bewerten (Standard im Workflow, damit kein Lauf einen anderen überholt).
  const prs = arg === 'all' ? open.map((p) => p.number) : [Number(arg)];
  for (const pr of prs) {
    try {
      if (!Number.isInteger(pr) || pr <= 0) throw new Error('--pr=<Nummer|all> fehlt');
      gatePr(pr, repoFull, config, statusToken, shared);
    } catch (err) {
      failed += 1;
      console.error(`PR ${pr}: ${err.message}`);
    }
  }
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
