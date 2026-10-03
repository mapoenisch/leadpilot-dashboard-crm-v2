# Separater CI-Auftrag: Befristete Audit-Ausnahme für braces (GHSA-vfj7-8cjw-p6xm)

**Stand:** 03.10.2026 · **Basis:** `main` (`faf97f4`, nach PR #49)

**Auftraggeber:** Marc Poenisch (Entscheidung vom 03.10.2026, Weg B). **Builder:** Claude Code.
**Prüfer:** Codex. **Merge:** nur Marc.

## Anlass

Seit 03.10.2026 meldet `npm audit` die Advisory GHSA-vfj7-8cjw-p6xm (`braces`, high,
Stack-Exhaustion bei tief verschachtelten Mustern). Betroffen bis `braces@3.0.3`, der neuesten
Version; eine reparierte Version gibt es nicht. Die Kette ist `tailwindcss@3.4.19` →
`chokidar`/`micromatch`/`fast-glob` → `braces`. Der CI-Schritt „Dependency Audit Check“ ist damit
auf allen Branches rot (PR #48, PR #50, `main`). Ein `overrides`-Eintrag wie bei `basic-ftp`
(PR #45) ist mangels reparierter Version nicht möglich; Tailwind 4 wäre ein eigener großer Umbau.

Risikobewertung: `braces` wird nur im Build über Tailwind mit festen Mustern aus dem Repository
verwendet, keine fremden Eingaben, nicht im ausgelieferten Bundle.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `scripts/auditAllowlist.mjs` | Neu: `npm audit --json` mit befristeter Ausnahmeliste, sonst gleiche Strenge. |
| `scripts/__tests__/auditAllowlist.vitest.ts` | Neu: Logik- und Vertragstests. |
| `.github/workflows/ci.yml` | Audit-Schritt ruft das Skript statt `npm audit` auf. |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_AUDIT_AUSNAHME_BRACES.md` | Diese Auftragsdatei. |
| `docs/BUILD_LOG.md` | Builder-Nachweis. |

## Anforderungen

- [x] Gleiche Schwellen wie vorher: Produktion ab `low`, alle Abhängigkeiten ab `high`.
- [x] Ausnahme nur per Advisory-ID **und** Paket; eine Schwachstelle gilt nur als zugelassen, wenn
  alle Advisories, auf die sie zurückgeht, zugelassen sind. Jede neue Advisory macht die CI wieder rot.
- [x] Befristet bis **02.11.2026**; danach greift die Ausnahme nicht mehr (fail-closed).
- [x] Keine neuen Abhängigkeiten. `verifyV23ReleaseReadiness.ts` bleibt unverändert (wertet die
  feste Baseline `docs/reviews/v2.3.0-npm-audit-baseline.json` aus, nicht das Live-Audit).

## Aufhebung

Sobald `braces` eine reparierte Version veröffentlicht: `overrides` in `package.json` setzen,
Eintrag aus `ALLOWLIST` entfernen. Läuft die Frist ab, ohne dass es eine Reparatur gibt,
entscheidet Marc über Verlängerung oder Tailwind 4.
