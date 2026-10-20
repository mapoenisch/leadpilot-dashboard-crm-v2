// CI-Auftrag Review-Gate: Prüferlogik, Builder-Sperre, fail-closed und Workflow-Verträge.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import {
  appJwt,
  builderOf,
  changesRequestedBy,
  errorStatus,
  evaluateReviewed,
  reviewedBy,
  reviewedStatus,
  threadsStatus,
} from '../reviewGate.mjs';

const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.github/review-agents.json'), 'utf8'));
const { agents, builderBranches } = config;
const HEAD = 'head-sha';
const review = (login: string, commit_id = HEAD, state = 'COMMENTED') => ({
  user: { login },
  commit_id,
  state,
});
const builders = (branch: string) => builderOf(branch, builderBranches);

describe('reviewedBy', () => {
  it('zählt ein formales Review eines gelisteten Prüfers auf dem Head', () => {
    expect(
      reviewedBy(
        [review('chatgpt-codex-connector[bot]')],
        HEAD,
        agents,
        ['mapoenisch'],
        builders('claude/x'),
      ),
    ).toEqual(['Codex']);
  });

  it('zählt kein Review auf einem älteren Commit', () => {
    expect(
      reviewedBy(
        [review('chatgpt-codex-connector[bot]', 'alt')],
        HEAD,
        agents,
        ['mapoenisch'],
        builders('claude/x'),
      ),
    ).toEqual([]);
  });

  it('zählt keine ungelisteten Logins und keine ausstehenden Reviews', () => {
    expect(
      reviewedBy(
        [review('fremd'), review('devin-ai-integration', HEAD, 'PENDING')],
        HEAD,
        agents,
        ['mapoenisch'],
        [],
      ),
    ).toEqual([]);
  });

  it('zählt kein Review des PR-Autors oder eines Commit-Autors', () => {
    expect(
      reviewedBy([review('devin-ai-integration')], HEAD, agents, ['devin-ai-integration'], []),
    ).toEqual([]);
    expect(
      reviewedBy(
        [review('devin-ai-integration')],
        HEAD,
        agents,
        ['mapoenisch', 'devin-ai-integration[bot]'],
        [],
      ),
    ).toEqual([]);
  });

  it('zählt kein Review des per Branch-Präfix gebundenen Builders', () => {
    expect(
      reviewedBy(
        [review('chatgpt-codex-connector[bot]')],
        HEAD,
        agents,
        ['mapoenisch'],
        builders('codex/x'),
      ),
    ).toEqual([]);
    expect(
      reviewedBy(
        [review('marcs-pr-reviewer')],
        HEAD,
        agents,
        ['mapoenisch'],
        builders('antigravity/x'),
      ),
    ).toEqual([]);
    expect(
      reviewedBy(
        [review('marcs-pr-reviewer')],
        HEAD,
        agents,
        ['mapoenisch'],
        builders('opencode/x'),
      ),
    ).toEqual([]);
  });

  it('bricht ohne PR-Autor ab', () => {
    expect(() => reviewedBy([], HEAD, agents, [], [])).toThrow('PR-Autor unbekannt');
  });
});

describe('builderOf', () => {
  it('erkennt bekannte Präfixe und liefert für unbekannte nichts', () => {
    expect(builders('antigravity/auftrag-1')).toEqual(['Antigravity']);
    expect(builders('claude/review-gate')).toEqual(['Claude']);
    expect(builders('feature/x')).toEqual([]);
    expect(builders('')).toEqual([]);
  });
});

describe('evaluateReviewed (fail-closed)', () => {
  const base = { head: { sha: HEAD, ref: 'claude/x' }, user: { login: 'mapoenisch' }, commits: 1 };
  const commits = [{ author: { login: 'mapoenisch' }, committer: { login: 'web-flow' } }];

  it('meldet Erfolg bei gültigem Prüfer', () => {
    expect(
      evaluateReviewed({
        pull: base,
        commits,
        reviews: [review('chatgpt-codex-connector')],
        agents,
        builderBranches,
      }).state,
    ).toBe('success');
  });

  it('wirft bei unbekanntem Builder, unvollständigen Commits oder fehlendem Autor', () => {
    const args = { commits, reviews: [review('chatgpt-codex-connector')], agents, builderBranches };
    expect(() =>
      evaluateReviewed({ ...args, pull: { ...base, head: { sha: HEAD, ref: 'feature/x' } } }),
    ).toThrow('Builder unbekannt');
    expect(() => evaluateReviewed({ ...args, pull: { ...base, commits: 300 } })).toThrow(
      'unvollständig',
    );
    expect(() => evaluateReviewed({ ...args, pull: { ...base, user: null } })).toThrow(
      'PR-Autor unbekannt',
    );
  });

  it('setzt im Fehlerfall nie Erfolg', () => {
    expect(errorStatus(new Error('x')).state).toBe('pending');
  });
});

describe('Status-Texte', () => {
  it('reviewedStatus und threadsStatus', () => {
    expect(reviewedStatus([]).state).toBe('pending');
    expect(reviewedStatus(['Codex']).description).toBe('Reviewed von Codex');
    expect(threadsStatus([{ isResolved: false }, { isResolved: true }]).state).toBe('failure');
    expect(threadsStatus([{ isResolved: true }]).state).toBe('success');
  });
});

describe('appJwt', () => {
  it('erzeugt ein gültig signiertes RS256-JWT mit App-ID als Aussteller', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwt = appJwt(123, privateKey.export({ type: 'pkcs1', format: 'pem' }) as string, 1000);
    const [h, p, sig] = jwt.split('.');
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, sig, 'base64url')).toBe(
      true,
    );
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({
      iat: 940,
      exp: 1540,
      iss: '123',
    });
  });
});

describe('Workflow-Verträge', () => {
  const gate = fs.readFileSync(path.join(root, '.github/workflows/review-gate.yml'), 'utf8');
  const trigger = fs.readFileSync(
    path.join(root, '.github/workflows/review-gate-trigger.yml'),
    'utf8',
  );

  it('Gate nutzt die Umgebung review-gate, eine Concurrency-Gruppe und bewertet alle PRs', () => {
    expect(gate).toContain('environment: review-gate');
    expect(gate).toMatch(/group: review-gate\n/);
    expect(gate).toContain('--pr=all');
    expect(gate).not.toContain('statuses: write');
  });

  it('Trigger hat keine Rechte und keine Secrets', () => {
    expect(trigger).toContain('permissions: {}');
    expect(trigger).not.toContain('secrets.');
  });
});

describe('changesRequestedBy (Änderungen angefordert blockieren)', () => {
  const pull = { head: { sha: HEAD, ref: 'claude/x' }, user: { login: 'mapoenisch' }, commits: 1 };
  const commits = [{ author: { login: 'mapoenisch' }, committer: { login: 'web-flow' } }];
  const evaluate = (reviews: ReturnType<typeof review>[]) =>
    evaluateReviewed({ pull, commits, reviews, agents, builderBranches });

  it('blockiert ein CHANGES_REQUESTED auf dem Head ohne Inline-Thread', () => {
    const status = evaluate([review('chatgpt-codex-connector[bot]', HEAD, 'CHANGES_REQUESTED')]);
    expect(status.state).toBe('failure');
    expect(status.description).toBe('Änderungen angefordert von Codex');
  });

  it('blockiert weiter nach späterem COMMENTED und nach Anforderung auf älterem Commit', () => {
    expect(
      evaluate([
        review('chatgpt-codex-connector', HEAD),
        review('chatgpt-codex-connector', HEAD, 'CHANGES_REQUESTED'),
      ]).state,
    ).toBe('failure');
    expect(
      evaluate([
        review('chatgpt-codex-connector', 'alt', 'CHANGES_REQUESTED'),
        review('chatgpt-codex-connector', HEAD),
      ]).state,
    ).toBe('failure');
  });

  it('hebt die Blockade durch Freigabe oder Verwerfen desselben Prüfers auf', () => {
    expect(
      evaluate([
        review('chatgpt-codex-connector', 'alt', 'CHANGES_REQUESTED'),
        review('chatgpt-codex-connector', HEAD, 'APPROVED'),
      ]).state,
    ).toBe('success');
    expect(
      changesRequestedBy(
        [
          review('devin-ai-integration', HEAD, 'CHANGES_REQUESTED'),
          review('devin-ai-integration', HEAD, 'DISMISSED'),
        ],
        agents,
      ),
    ).toEqual([]);
  });

  it('ignoriert Anforderungen ungelisteter Logins', () => {
    expect(changesRequestedBy([review('fremd', HEAD, 'CHANGES_REQUESTED')], agents)).toEqual([]);
  });
});
