// CI-Auftrag Agenten-Reviews: Befehlserkennung, Diff-Zeilen, Befund-JSON, Review-Aufbau, Workflow-Vertrag.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AGENTS,
  buildReview,
  commentableLines,
  mayCommand,
  parseCommand,
  parseFindings,
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
  const finding = (line: number) => ({ path: 'src/x.ts', line, severity: 'P1', title: 'T', body: 'B' });
  it('Befunde → REQUEST_CHANGES, inline nur auf Diff-Zeilen', () => {
    const r = buildReview({
      agent: 'devin',
      headSha: 'sha',
      result: { summary: 's', findings: [finding(3), finding(99)] },
      files: FILES,
    });
    expect(r.event).toBe('REQUEST_CHANGES');
    expect(r.commit_id).toBe('sha');
    expect(r.comments).toEqual([expect.objectContaining({ path: 'src/x.ts', line: 3, side: 'RIGHT' })]);
    expect(r.body).toContain('src/x.ts:99');
    expect(r.body).toContain('Devin-Review');
  });
  it('keine Befunde → APPROVE', () => {
    const r = buildReview({ agent: 'proto', headSha: 'sha', result: { summary: '', findings: [] }, files: FILES });
    expect(r.event).toBe('APPROVE');
    expect(r.comments).toEqual([]);
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
  it('checkt main aus, nicht den PR-Head', () => {
    expect(wf).toContain('ref: ${{ github.event.repository.default_branch }}');
  });
  it('CI-Agenten und lokale Agenten sind getrennt', () => {
    expect(Object.entries(AGENTS).filter(([, a]) => a.mode === 'local').map(([k]) => k)).toEqual(['antigravity', 'proto']);
  });
});
