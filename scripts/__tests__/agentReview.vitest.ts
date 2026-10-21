// CI-Auftrag Agenten-Reviews: Befehlserkennung, Diff-Zeilen, Befund-JSON, Review-Aufbau, Workflow-Vertrag.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AGENTS,
  buildReview,
  commentableLines,
  isSameRepo,
  mayCommand,
  OPENCODE_READ_ONLY,
  parseCommand,
  parseFindings,
  truncation,
} from '../agentReview.mjs';

const root = path.resolve(__dirname, '../..');
const PATCH = '@@ -1,3 +1,4 @@\n a\n-b\n+c\n+d\n e';
const FILES = [{ filename: 'src/x.ts', patch: PATCH }];

describe('parseCommand', () => {
  it('erkennt alle fünf Agenten', () => {
    for (const agent of ['antigravity', 'opencode', 'devin', 'proto', 'perplexity']) {
      expect(parseCommand(`/${agent} review`)).toBe(agent);
    }
  });
  it('ignoriert Erwähnungen, Fließtext und fremde Agenten', () => {
    expect(parseCommand('@devin review')).toBeNull();
    expect(parseCommand('bitte mal /devin review machen')).toBeNull();
    expect(parseCommand('/codex review')).toBeNull();
    expect(parseCommand('/devin reviewer')).toBeNull();
  });
  it('erkennt den Befehl am Zeilenanfang einer späteren Zeile', () => {
    expect(parseCommand('Danke!\n/Proto review')).toBe('proto');
  });
});

describe('mayCommand', () => {
  it('nur Marc darf auslösen', () => {
    expect(mayCommand('mapoenisch')).toBe(true);
    expect(mayCommand('MarcReview')).toBe(false);
    expect(mayCommand(undefined)).toBe(false);
  });
});

describe('Absicherung', () => {
  it('lehnt Fork-PRs ab', () => {
    expect(isSameRepo({ head: { repo: { full_name: 'a/b' } } }, 'A/B')).toBe(true);
    expect(isSameRepo({ head: { repo: { full_name: 'x/b' } } }, 'a/b')).toBe(false);
    expect(isSameRepo({ head: { repo: null } }, 'a/b')).toBe(false);
  });
  it('OpenCode läuft ohne Schreib-, Shell- und Webrechte', () => {
    expect(OPENCODE_READ_ONLY.permission).toEqual({ edit: 'deny', bash: 'deny', webfetch: 'deny' });
  });
});

describe('commentableLines', () => {
  it('liefert Kontext- und neue Zeilen der rechten Seite', () => {
    expect([...commentableLines(FILES).get('src/x.ts')!]).toEqual([1, 2, 3, 4]);
  });
});

describe('parseFindings', () => {
  it('liest JSON aus einem Codeblock mit Fließtext', () => {
    const r = parseFindings('Hier:\n```json\n{"summary":"ok","findings":[{"path":"a","line":"3","title":"t","body":"b"}]}\n```');
    expect(r.findings[0]).toMatchObject({ path: 'a', line: 3, severity: 'P2' });
  });
  it('bricht ohne Befund-JSON ab', () => {
    expect(() => parseFindings('keine Ahnung')).toThrow();
  });
});

describe('buildReview', () => {
  const finding = (path: string, line: number) => ({ path, line, severity: 'P1', title: 'T', body: 'B' });
  const build = (findings: ReturnType<typeof finding>[], missing: string[] = []) =>
    buildReview({ agent: 'devin', headSha: 'sha', result: { summary: 's', findings }, files: FILES, missing });

  it('postet immer COMMENT, nie APPROVE oder REQUEST_CHANGES', () => {
    expect(build([]).event).toBe('COMMENT');
    expect(build([finding('src/x.ts', 3)]).event).toBe('COMMENT');
  });
  it('jeder Befund wird eine Konversation', () => {
    const r = build([finding('src/x.ts', 3), finding('src/x.ts', 99), finding('README.md', 5)]);
    expect(r.commit_id).toBe('sha');
    expect(r.comments).toHaveLength(3);
    expect(r.comments[0]).toMatchObject({ path: 'src/x.ts', line: 3, side: 'RIGHT' });
    expect(r.comments[1]).toMatchObject({ path: 'src/x.ts', subject_type: 'file' });
    expect(r.comments[2]).toMatchObject({ path: 'src/x.ts', line: 1 });
    expect(r.comments[2].body).toContain('README.md:5');
  });
  it('unvollständiger Diff erzeugt eine blockierende Konversation', () => {
    const r = build([], ['big.json']);
    expect(r.comments).toHaveLength(1);
    expect(r.comments[0].body).toContain('Diff unvollständig');
  });
});

describe('truncation', () => {
  it('erkennt fehlende Patches und fehlende Dateien', () => {
    expect(truncation({ changed_files: 1 }, FILES)).toEqual([]);
    expect(truncation({ changed_files: 3 }, [...FILES, { filename: 'big.json', status: 'modified', changes: 5 }])).toEqual([
      'big.json',
      '1 weitere Datei(en)',
    ]);
  });
});

describe('Workflow-Vertrag', () => {
  const wf = fs.readFileSync(path.join(root, '.github/workflows/agent-review.yml'), 'utf8');
  it('reagiert nur auf Kommentare von Marc in PRs', () => {
    expect(wf).toContain('issue_comment');
    expect(wf).toContain("github.event.comment.user.login == 'mapoenisch'");
    expect(wf).toContain('github.event.issue.pull_request');
  });
  it('setzt den Kommentartext nie direkt in run-Befehle ein', () => {
    const runs = wf.split('\n').filter((l) => /run:/.test(l) || /^\s{10,}\S/.test(l));
    expect(runs.join('\n')).not.toContain('github.event.comment.body');
  });
  it('Agenten-Schritt bekommt den Posting-Token nicht', () => {
    const job = wf.slice(wf.indexOf('\n  review:'), wf.indexOf('\n  post:'));
    expect(job).toContain('Review ausführen');
    expect(job).not.toContain('MARCREVIEW_TOKEN');
    expect(wf.slice(wf.indexOf('\n  post:'))).toContain('needs: [ack, review]');
  });
  it('checkt main aus, nicht den PR-Head', () => {
    expect(wf).toContain('ref: ${{ github.event.repository.default_branch }}');
  });
  it('CI-Agenten und lokale Agenten sind getrennt', () => {
    expect(Object.entries(AGENTS).filter(([, a]) => a.mode === 'local').map(([k]) => k)).toEqual(['antigravity', 'proto']);
  });
});
