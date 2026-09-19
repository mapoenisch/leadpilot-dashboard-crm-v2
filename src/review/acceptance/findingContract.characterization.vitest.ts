// G44 (Auftrag 067A, Block A): Konsistenztest für das v2.3.0-Finding-Register.
// Grün — friert ein, dass TypeScript-, JSON- und Markdown-Register exakt
// dieselben 20 Finding-IDs mit genau einem Zielgate enthalten.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { V23_FINDINGS } from './findingContract';

const reviewsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/reviews');

interface FindingJsonEntry {
  id: string;
  title: string;
  targetGate: string;
  runner: string;
  expected: string;
}

function extractMarkdownIds(markdown: string): string[] {
  const matches = markdown.match(/PR-[A-Z0-9]+-\d{2}/g) ?? [];
  return [...new Set(matches)].sort();
}

describe('findingContract-Register', () => {
  it('enthält 20 eindeutige Findings mit genau einem Zielgate', () => {
    expect(V23_FINDINGS).toHaveLength(20);
    expect(new Set(V23_FINDINGS.map((finding) => finding.id)).size).toBe(20);
    expect(V23_FINDINGS.every((finding) => /^G(4[5-9]|5[0-8]|65)$/.test(finding.targetGate))).toBe(
      true,
    );
  });

  it('stimmt in TypeScript-, JSON- und Markdown-Register exakt überein', () => {
    const jsonRaw = readFileSync(resolve(reviewsDir, 'v2.3.0-known-findings.json'), 'utf-8');
    const jsonEntries = JSON.parse(jsonRaw) as FindingJsonEntry[];
    // Kein Zusammenfalten: Auch doppelte JSON-Zeilen müssen scheitern —
    // exakt 20 Einträge mit 20 eindeutigen IDs.
    expect(jsonEntries).toHaveLength(20);
    expect(new Set(jsonEntries.map((entry) => entry.id)).size).toBe(20);
    const tsIds = [...V23_FINDINGS.map((finding) => finding.id)].sort();
    const jsonIds = [...new Set(jsonEntries.map((entry) => entry.id))].sort();
    expect(jsonIds).toEqual(tsIds);

    const markdown = readFileSync(resolve(reviewsDir, 'v2.3.0-finding-register.md'), 'utf-8');
    expect(extractMarkdownIds(markdown)).toEqual(tsIds);

    for (const finding of V23_FINDINGS) {
      const entry = jsonEntries.find((candidate) => candidate.id === finding.id);
      expect(entry?.title).toBe(finding.title);
      expect(entry?.targetGate).toBe(finding.targetGate);
      expect(entry?.runner).toBe(finding.runner);
      expect(entry?.expected).toBe(finding.expected);
    }
  });
});
