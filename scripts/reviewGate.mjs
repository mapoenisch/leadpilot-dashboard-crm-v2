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
export function reviewedBy(reviews, headSha, agents, prAuthors = []) {
  // prAuthors: PR-Öffner plus Autoren/Committer der PR-Commits.
  const authors = [prAuthors].flat().filter(Boolean);
  if (authors.length === 0) throw new Error('PR-Autor unbekannt: Gate bleibt ohne Status');
  const names = new Set();
  // Der PR-Autor und jeder Agent, dem sein Login gehört, kann sich nicht selbst prüfen.
  const authorLogins = new Set(authors.map(normalize));
  const authorAgents = new Set(authors.flatMap((a) => agentsOf(a, agents).map((x) => x.name)));
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

function gh(args, input) {
  return execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 });
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

function main() {
  const pr = Number((process.argv.find((a) => a.startsWith('--pr=')) ?? '').slice(5));
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('--pr=<Nummer> fehlt');
  const repoFull = process.env.GITHUB_REPOSITORY;
  const [owner, repo] = repoFull.split('/');
  const agents = JSON.parse(readFileSync(new URL('../.github/review-agents.json', import.meta.url), 'utf8')).agents;

  const pull = JSON.parse(gh(['api', `repos/${repoFull}/pulls/${pr}`]));
  const head = pull.head.sha;
  const commitLogins = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/commits`]))
    .flat()
    .flatMap((c) => [c.author?.login, c.committer?.login]);
  const reviews = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/reviews`])).flat();
  const post = (context, { state, description }) =>
    gh(['api', '-X', 'POST', `repos/${repoFull}/statuses/${head}`, '-f', `state=${state}`, '-f', `context=${context}`, '-f', `description=${description}`]);

  const reviewed = reviewedStatus(reviewedBy(reviews, head, agents, [pull.user?.login, ...commitLogins]));
  const threads = threadsStatus(fetchThreads(owner, repo, pr));
  post(STATUS_REVIEWED, reviewed);
  post(STATUS_THREADS, threads);
  console.log(`PR ${pr} @ ${head.slice(0, 7)}: ${STATUS_REVIEWED}=${reviewed.state}, ${STATUS_THREADS}=${threads.state}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
