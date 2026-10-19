#!/usr/bin/env node
// Review-Gate für alle PRs im Repo (Antigravity, OpenCode, Devin, weitere Prüfer aus
// .github/review-agents.json). Setzt für den Head-SHA zwei Commit-Status:
//  - `agent-review`: success, sobald ein Prüfer aus der Liste den aktuellen Head geprüft hat
//    ("Reviewed"); pending, solange keiner den aktuellen Stand geprüft hat.
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

export function isListedReviewer(login, agents) {
  const name = normalize(login);
  return agents.some((agent) => agent.logins.some((l) => normalize(l) === name));
}

/** Ein Prüfer hat den Head geprüft, wenn sein Review auf genau diesen Commit zeigt. */
export function reviewedBy(reviews, headSha, agents) {
  const names = new Set();
  for (const review of reviews) {
    if (review.commit_id !== headSha) continue;
    if (!['APPROVED', 'COMMENTED', 'CHANGES_REQUESTED'].includes(review.state)) continue;
    if (!isListedReviewer(review.user?.login, agents)) continue;
    const agent = agents.find((a) => a.logins.some((l) => normalize(l) === normalize(review.user.login)));
    names.add(agent.name);
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

  const head = JSON.parse(gh(['api', `repos/${repoFull}/pulls/${pr}`])).head.sha;
  const reviews = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/reviews`])).flat();
  const post = (context, { state, description }) =>
    gh(['api', '-X', 'POST', `repos/${repoFull}/statuses/${head}`, '-f', `state=${state}`, '-f', `context=${context}`, '-f', `description=${description}`]);

  const reviewed = reviewedStatus(reviewedBy(reviews, head, agents));
  const threads = threadsStatus(fetchThreads(owner, repo, pr));
  post(STATUS_REVIEWED, reviewed);
  post(STATUS_THREADS, threads);
  console.log(`PR ${pr} @ ${head.slice(0, 7)}: ${STATUS_REVIEWED}=${reviewed.state}, ${STATUS_THREADS}=${threads.state}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
