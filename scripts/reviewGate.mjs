#!/usr/bin/env node
// Review-Gate für alle PRs im Repo (Antigravity, OpenCode, Devin, weitere Prüfer aus
// .github/review-agents.json). Setzt für den Head-SHA zwei Commit-Status:
//  - `agent-review`: success, sobald ein Prüfer aus der Liste den aktuellen Head geprüft hat
//    ("Reviewed", als Review auf dem Head oder als PR-Kommentar nach Eintreffen des Heads); pending, solange keiner den aktuellen Stand geprüft hat.
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
 * Ein Prüfer hat den Head geprüft, wenn sein Review auf genau diesen Commit zeigt. Prüfer wie OpenCode
 * veröffentlichen ihr Ergebnis als normalen PR-Kommentar ohne Commit-Bezug; er zählt, wenn er nach
 * dem Eintreffen des Heads auf GitHub (`headDate`, Serverzeit des frühesten Status) erstellt oder aktualisiert wurde.
 */
export function reviewedBy(reviews, headSha, agents, comments = [], headDate = null, prAuthor = null) {
  const names = new Set();
  // Der PR-Autor kann sich nicht selbst prüfen.
  const own = (user) => Boolean(prAuthor) && normalize(user?.login) === normalize(prAuthor);
  for (const review of reviews) {
    if (own(review.user)) continue;
    if (review.commit_id !== headSha) continue;
    if (!['APPROVED', 'COMMENTED', 'CHANGES_REQUESTED'].includes(review.state)) continue;
    for (const agent of agentsOf(review.user?.login, agents)) names.add(agent.name);
  }
  if (headDate) {
    for (const comment of comments) {
      if (own(comment.user)) continue;
      if (new Date(comment.updated_at ?? comment.created_at) < new Date(headDate)) continue;
      for (const agent of agentsOf(comment.user?.login, agents)) names.add(agent.name);
    }
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
  // Serverzeit statt Commit-Datum: `committer.date` setzt der PR-Autor selbst. Der früheste Status am
  // Head (u. a. der Pending-Status dieses Gates) entsteht erst, wenn der Head auf GitHub angekommen ist.
  const earliest = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/commits/${head}/statuses`]))
    .flat()
    .map((s) => s.created_at)
    .sort()[0];
  const headDate = earliest ?? null;
  const comments = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/issues/${pr}/comments`])).flat();
  const reviews = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repoFull}/pulls/${pr}/reviews`])).flat();
  const post = (context, { state, description }) =>
    gh(['api', '-X', 'POST', `repos/${repoFull}/statuses/${head}`, '-f', `state=${state}`, '-f', `context=${context}`, '-f', `description=${description}`]);

  const reviewed = reviewedStatus(reviewedBy(reviews, head, agents, comments, headDate, pull.user?.login));
  const threads = threadsStatus(fetchThreads(owner, repo, pr));
  post(STATUS_REVIEWED, reviewed);
  post(STATUS_THREADS, threads);
  console.log(`PR ${pr} @ ${head.slice(0, 7)}: ${STATUS_REVIEWED}=${reviewed.state}, ${STATUS_THREADS}=${threads.state}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
