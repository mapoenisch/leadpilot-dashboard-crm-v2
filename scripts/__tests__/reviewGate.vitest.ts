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
  lastBaseChange,
  usableReviews,
  verifiedAccount,
  reviewedBy,
  reviewedStatus,
  threadsStatus,
} from '../reviewGate.mjs';

const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.github/review-agents.json'), 'utf8'));
const { agents, builderBranches } = config;
const HEAD = 'head-sha';
const IDS: Record<string, number> = {
  'chatgpt-codex-connector': 1,
  'devin-ai-integration': 2,
  'opencode-agent': 3,
  'marcs-pr-reviewer': 4,
};
const accounts = {
  ...Object.fromEntries(Object.entries(IDS).map(([login, id]) => [login, { id, type: 'Bot' }])),
  'marcs-pr-reviewer': { id: 4, type: 'Bot', approve: false },
};
const userOf = (login: string) => ({
  login,
  id: IDS[login.replace(/\[bot\]$/, '')] ?? 999,
  type: 'Bot',
});
const review = (
  login: string,
  commit_id = HEAD,
  state = 'COMMENTED',
  submitted_at = '2026-10-20T10:00:00Z',
) => ({
  user: userOf(login),
  commit_id,
  state,
  submitted_at,
});
// Agenten bauen unter Marcs Konto; der Builder ergibt sich aus dem Branch-Präfix.
const pullOn = (ref: string, extra = {}) => ({
  head: { sha: HEAD, ref },
  user: { login: 'mapoenisch', id: 55349298, type: 'User' },
  commits: 1,
  ...extra,
});
const commits = [{ author: { login: 'mapoenisch' }, committer: { login: 'web-flow' } }];
const evaluate = (ref: string, reviews: ReturnType<typeof review>[], extra = {}) =>
  evaluateReviewed({
    pull: pullOn(ref),
    commits,
    reviews,
    agents,
    builderBranches,
    accounts,
    ...extra,
  });
const builders = (branch: string) => builderOf(branch, builderBranches);

describe('Konfiguration', () => {
  it('Builder per Branch-Präfix, keine eigenen Builder-Konten', () => {
    expect(builderBranches).toMatchObject({ 'antigravity/': 'Antigravity', 'claude/': 'Claude' });
    for (const agent of agents) expect(agent.builderLogins).toBeUndefined();
  });
});

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
        [review('chatgpt-codex-connector', 'alt')],
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
        [review('chatgpt-codex-connector')],
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
  it('meldet Erfolg bei gültigem Prüfer auf einem claude/-Branch', () => {
    expect(evaluate('claude/x', [review('chatgpt-codex-connector')]).state).toBe('success');
  });

  it('wirft bei unbekanntem Präfix, unvollständigen Commits oder fehlendem Autor', () => {
    const ok = [review('chatgpt-codex-connector')];
    expect(() => evaluate('feature/x', ok)).toThrow('Builder unbekannt');
    expect(() => evaluate('claude/x', ok, { pull: pullOn('claude/x', { commits: 300 }) })).toThrow(
      'unvollständig',
    );
    expect(() => evaluate('claude/x', ok, { pull: pullOn('claude/x', { user: null }) })).toThrow(
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
  const evaluateClaude = (reviews: ReturnType<typeof review>[]) => evaluate('claude/x', reviews);

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

describe('Konto-IDs, verbotene Freigaben, Zielbranch-Wechsel', () => {
  it('verifiziert Konten nur mit passender ID und passendem Typ', () => {
    expect(
      verifiedAccount({ login: 'chatgpt-codex-connector[bot]', id: 1, type: 'Bot' }, accounts),
    ).toBe(true);
    expect(
      verifiedAccount({ login: 'chatgpt-codex-connector', id: 77, type: 'Bot' }, accounts),
    ).toBe(false);
    expect(
      verifiedAccount({ login: 'chatgpt-codex-connector', id: 1, type: 'User' }, accounts),
    ).toBe(false);
    expect(verifiedAccount({ login: 'unbekannt', id: 1, type: 'Bot' }, accounts)).toBe(false);
  });

  it('übernommener Login (andere ID) zählt nicht als Prüfer', () => {
    const fake = {
      ...review('chatgpt-codex-connector'),
      user: { login: 'chatgpt-codex-connector', id: 4242, type: 'User' },
    };
    expect(evaluate('claude/x', [fake]).state).toBe('pending');
  });

  it('ignoriert APPROVED von marcs-pr-reviewer (approve: false)', () => {
    expect(usableReviews([review('marcs-pr-reviewer', HEAD, 'APPROVED')], accounts)).toEqual([]);
    expect(evaluate('claude/x', [review('marcs-pr-reviewer', HEAD, 'APPROVED')]).state).toBe(
      'pending',
    );
    expect(evaluate('claude/x', [review('marcs-pr-reviewer', HEAD, 'COMMENTED')]).state).toBe(
      'success',
    );
  });

  it('verbotenes APPROVED hebt eine eigene Änderungsanforderung nicht auf', () => {
    const status = evaluate('claude/x', [
      review('marcs-pr-reviewer', HEAD, 'CHANGES_REQUESTED'),
      review('marcs-pr-reviewer', HEAD, 'APPROVED'),
    ]);
    expect(status.state).toBe('failure');
  });

  it('Reviews vor einem Zielbranch-Wechsel zählen nicht mehr', () => {
    const events = [
      { event: 'labeled', created_at: '2026-10-20T12:00:00Z' },
      { event: 'base_ref_changed', created_at: '2026-10-20T11:00:00Z' },
    ];
    expect(lastBaseChange(events)).toBe('2026-10-20T11:00:00Z');
    const args = { pull: pullOn('claude/x'), commits, agents, builderBranches, accounts, events };
    expect(
      evaluateReviewed({
        ...args,
        reviews: [review('chatgpt-codex-connector', HEAD, 'COMMENTED', '2026-10-20T10:00:00Z')],
      }).state,
    ).toBe('pending');
    expect(
      evaluateReviewed({
        ...args,
        reviews: [review('chatgpt-codex-connector', HEAD, 'COMMENTED', '2026-10-20T11:30:00Z')],
      }).state,
    ).toBe('success');
  });

  it('echte Konfiguration bindet jedes Prüferkonto an ID und Typ', () => {
    for (const agent of config.agents) {
      for (const login of agent.logins) {
        expect(config.accounts[login], login).toMatchObject({
          id: expect.any(Number),
          type: expect.any(String),
        });
      }
    }
    expect(config.accounts['marcs-pr-reviewer'].approve).toBe(false);
  });

  it('Gate läuft periodisch und bei Zielbranch-Wechsel', () => {
    const gate = fs.readFileSync(path.join(root, '.github/workflows/review-gate.yml'), 'utf8');
    expect(gate).toMatch(/schedule:\n\s+- cron:/);
    expect(gate).toMatch(/types: \[[^\]]*edited[^\]]*\]/);
  });
});
