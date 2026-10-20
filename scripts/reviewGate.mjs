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
import { createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const STATUS_REVIEWED = 'agent-review';
export const STATUS_THREADS = 'review-conversations';

/** Login-Vergleich ohne Groß-/Kleinschreibung und ohne das Bot-Suffix `[bot]`. */
const normalize = (login) => (login ?? '').toLowerCase().replace(/\[bot\]$/, '');

const agentsOf = (login, agents) =>
  agents.filter((a) => a.logins.some((l) => normalize(l) === normalize(login)));

/**
 * Ein Prüfer hat den Head geprüft, wenn sein formales PR-Review auf genau diesen Commit zeigt.
 * Kommentare zählen nicht (kein Commit-Bezug, nachträglich änderbar).
 */
export function reviewedBy(reviews, headSha, agents, prAuthors = [], builderAgents = []) {
  // prAuthors: PR-Öffner plus Autoren/Committer der PR-Commits.
  // builderAgents: per Branch-Präfix gebundene Builder-Rolle (baut z. B. unter Marcs Identität).
  const authors = [prAuthors].flat().filter(Boolean);
  if (authors.length === 0) throw new Error('PR-Autor unbekannt: Gate bleibt ohne Status');
  const names = new Set();
  // Der PR-Autor, jeder Agent mit seinem Login und der gebundene Builder können sich nicht selbst prüfen.
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

/** Builder-Agent laut Branch-Präfix (`builderBranches` in review-agents.json). */
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
    ? { state: 'failure', description: `${open} offene Konversation${open === 1 ? '' : 'en'} — erst lösen` }
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
    const args = ['api', 'graphql', '-f', `query=${THREADS_QUERY}`, '-F', `owner=${owner}`, '-F', `repo=${repo}`, '-F', `pr=${pr}`];
    if (after) args.push('-F', `after=${after}`);
    const page = JSON.parse(gh(args)).data.repository.pullRequest.reviewThreads;
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return nodes;
    after = page.pageInfo.endCursor;
  }
}

export const errorStatus = (err) => ({ state: 'pending', description: `Gate-Fehler: ${err.message}`.slice(0, 140) });
export const CHECKING = { state: 'pending', description: 'Wird geprüft …' };

/**
 * Bewertet `agent-review` für einen PR. Wirft bei unvollständigen Daten oder unbekanntem Builder;
 * der Aufrufer setzt dann `pending` (kein Erfolg ohne vollständige Prüfung).
 */
export function evaluateReviewed({ pull, commits, reviews, agents, builderBranches }) {
  if (!pull.user?.login) throw new Error('PR-Autor unbekannt');
  // Die Commit-Liste der API ist auf 250 Einträge begrenzt: bei Abweichung lieber kein Erfolg.
  if (pull.commits > commits.length) throw new Error('PR-Commits unvollständig');
  // Ohne bekanntes Branch-Präfix ist der Builder unbekannt: kein Erfolg, sonst ließe sich die
  // Selbst-Review-Sperre durch einen anders benannten Branch umgehen.
  const builders = builderOf(pull.head.ref, builderBranches);
  if (builders.length === 0) throw new Error('Builder unbekannt (Branch-Präfix fehlt)');
  const blockers = changesRequestedBy(reviews, agents);
  if (blockers.length > 0) return { state: 'failure', description: `Änderungen angefordert von ${blockers.join(', ')}` };
  const commitLogins = commits.flatMap((c) => [c.author?.login, c.committer?.login]);
  return reviewedStatus(reviewedBy(reviews, pull.head.sha, agents, [pull.user.login, ...commitLogins], builders));
}

function gatePr(pr, repoFull, { agents, builderBranches }, statusToken) {
  const [owner, repo] = repoFull.split('/');
  const pull = JSON.parse(gh(['api', `repos/${repoFull}/pulls/${pr}`]));
  const head = pull.head.sha;
  const post = (context, { state, description }) =>
    gh(['api', '-X', 'POST', `repos/${repoFull}/statuses/${head}`, '-f', `state=${state}`, '-f', `context=${context}`, '-f', `description=${description}`], undefined, statusToken);
  // Fail-closed: zuerst frühere Erfolge widerrufen, erst danach die fehlbaren Abfragen.
  post(STATUS_REVIEWED, CHECKING);
  post(STATUS_THREADS, CHECKING);
  const errors = [];
  let reviewed;
  try {
    const commits = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/commits`])).flat();
    const reviews = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/reviews`])).flat();
    reviewed = evaluateReviewed({ pull, commits, reviews, agents, builderBranches });
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
  console.log(`PR ${pr} @ ${head.slice(0, 7)}: ${STATUS_REVIEWED}=${reviewed.state}, ${STATUS_THREADS}=${threads.state}`);
  if (errors.length > 0) throw errors[0];
}

async function main() {
  const arg = (process.argv.find((a) => a.startsWith('--pr=')) ?? '').slice(5);
  const repoFull = process.env.GITHUB_REPOSITORY;
  const config = JSON.parse(readFileSync(new URL('../.github/review-agents.json', import.meta.url), 'utf8'));
  const statusToken = await appToken(repoFull);
  // --pr=all: alle offenen PRs neu bewerten (Standard im Workflow, damit kein Lauf einen anderen überholt).
  const prs =
    arg === 'all'
      ? JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls?state=open&per_page=100`]))
          .flat()
          .map((p) => p.number)
      : [Number(arg)];
  let failed = 0;
  for (const pr of prs) {
    try {
      if (!Number.isInteger(pr) || pr <= 0) throw new Error('--pr=<Nummer|all> fehlt');
      gatePr(pr, repoFull, config, statusToken);
    } catch (err) {
      failed += 1;
      console.error(`PR ${pr}: ${err.message}`);
    }
  }
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
