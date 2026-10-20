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
// Test-Agenten mit eigenen Builder-Konten (die echte Konfiguration füllt Marc, sobald die Konten existieren).
const agents = [
  { name: 'Claude', logins: [], builderLogins: ['claude-builder'] },
  { name: 'Codex', logins: ['chatgpt-codex-connector'], builderLogins: ['codex-builder'] },
  { name: 'Devin', logins: ['devin-ai-integration'], builderLogins: [] },
  {
    name: 'OpenCode',
    logins: ['opencode-agent', 'marcs-pr-reviewer'],
    builderLogins: ['opencode-builder'],
  },
  { name: 'Antigravity', logins: ['marcs-pr-reviewer'], builderLogins: ['antigravity-builder'] },
];
const HEAD = 'head-sha';
const review = (login: string, commit_id = HEAD, state = 'COMMENTED') => ({
  user: { login },
  commit_id,
  state,
});
const pullBy = (opener: string, extra = {}) => ({
  head: { sha: HEAD, ref: 'beliebiger/branch' },
  user: { login: opener },
  commits: 1,
  ...extra,
});
const commitsBy = (login: string) => [{ author: { login }, committer: { login: 'web-flow' } }];
const evaluate = (
  opener: string,
  reviews: ReturnType<typeof review>[],
  commits = commitsBy(opener),
) => evaluateReviewed({ pull: pullBy(opener), commits, reviews, agents });

describe('Konfiguration', () => {
  it('jeder Agent hat logins und builderLogins, kein Branch-Präfix mehr', () => {
    for (const agent of config.agents) {
      expect(Array.isArray(agent.logins)).toBe(true);
      expect(Array.isArray(agent.builderLogins)).toBe(true);
    }
    expect(config.builderBranches).toBeUndefined();
  });
});

describe('reviewedBy', () => {
  it('zählt ein formales Review eines gelisteten Prüfers auf dem Head', () => {
    expect(
      reviewedBy([review('chatgpt-codex-connector[bot]')], HEAD, agents, ['claude-builder']),
    ).toEqual(['Codex']);
  });

  it('zählt kein Review auf einem älteren Commit', () => {
    expect(
      reviewedBy([review('chatgpt-codex-connector', 'alt')], HEAD, agents, ['claude-builder']),
    ).toEqual([]);
  });

  it('zählt keine ungelisteten Logins und keine ausstehenden Reviews', () => {
    expect(
      reviewedBy([review('fremd'), review('devin-ai-integration', HEAD, 'PENDING')], HEAD, agents, [
        'claude-builder',
      ]),
    ).toEqual([]);
  });

  it('zählt kein Review des Agenten, dem PR-Öffner oder Commit-Konto gehört', () => {
    expect(
      reviewedBy([review('chatgpt-codex-connector')], HEAD, agents, ['codex-builder']),
    ).toEqual([]);
    expect(
      reviewedBy([review('marcs-pr-reviewer')], HEAD, agents, ['antigravity-builder']),
    ).toEqual([]);
    expect(
      reviewedBy([review('marcs-pr-reviewer')], HEAD, agents, [
        'claude-builder',
        'opencode-builder',
      ]),
    ).toEqual([]);
    expect(
      reviewedBy([review('devin-ai-integration')], HEAD, agents, ['devin-ai-integration[bot]']),
    ).toEqual([]);
  });

  it('bricht ohne PR-Autor ab', () => {
    expect(() => reviewedBy([], HEAD, agents, [])).toThrow('PR-Autor unbekannt');
  });
});

describe('builderOf', () => {
  it('erkennt den Builder nur am PR-Öffner', () => {
    expect(builderOf('antigravity-builder', agents)).toEqual(['Antigravity']);
    expect(builderOf('Claude-Builder[bot]', agents)).toEqual(['Claude']);
    expect(builderOf('mapoenisch', agents)).toEqual([]);
    expect(builderOf('marcs-pr-reviewer', agents)).toEqual([]);
  });
});

describe('evaluateReviewed (fail-closed)', () => {
  it('meldet Erfolg bei gültigem Prüfer unabhängig vom Branch-Namen', () => {
    expect(evaluate('claude-builder', [review('chatgpt-codex-connector')]).state).toBe('success');
  });

  it('Branch-Name täuscht keine Rolle vor: Antigravity-Konto auf opencode/-Branch prüft sich nicht selbst', () => {
    const status = evaluateReviewed({
      pull: pullBy('antigravity-builder', { head: { sha: HEAD, ref: 'opencode/x' } }),
      commits: commitsBy('antigravity-builder'),
      reviews: [review('marcs-pr-reviewer')],
      agents,
    });
    expect(status.state).toBe('pending');
  });

  it('wirft bei PR-Öffner ohne Agent-Builder-Konto, unvollständigen Commits oder fehlendem Autor', () => {
    const args = {
      commits: commitsBy('mapoenisch'),
      reviews: [review('chatgpt-codex-connector')],
      agents,
    };
    expect(() => evaluateReviewed({ ...args, pull: pullBy('mapoenisch') })).toThrow(
      'Builder unbekannt',
    );
    expect(() =>
      evaluateReviewed({ ...args, pull: pullBy('claude-builder', { commits: 300 }) }),
    ).toThrow('unvollständig');
    expect(() =>
      evaluateReviewed({ ...args, pull: pullBy('claude-builder', { user: null }) }),
    ).toThrow('PR-Autor unbekannt');
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
  const evaluateClaude = (reviews: ReturnType<typeof review>[]) =>
    evaluate('claude-builder', reviews);

  it('blockiert ein CHANGES_REQUESTED auf dem Head ohne Inline-Thread', () => {
    const status = evaluateClaude([
      review('chatgpt-codex-connector[bot]', HEAD, 'CHANGES_REQUESTED'),
    ]);
    expect(status.state).toBe('failure');
    expect(status.description).toBe('Änderungen angefordert von Codex');
  });

  it('blockiert weiter nach späterem COMMENTED und nach Anforderung auf älterem Commit', () => {
    expect(
      evaluateClaude([
        review('chatgpt-codex-connector', HEAD),
        review('chatgpt-codex-connector', HEAD, 'CHANGES_REQUESTED'),
      ]).state,
    ).toBe('failure');
    expect(
      evaluateClaude([
        review('chatgpt-codex-connector', 'alt', 'CHANGES_REQUESTED'),
        review('chatgpt-codex-connector', HEAD),
      ]).state,
    ).toBe('failure');
  });

  it('hebt die Blockade durch Freigabe oder Verwerfen desselben Prüfers auf', () => {
    expect(
      evaluateClaude([
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
