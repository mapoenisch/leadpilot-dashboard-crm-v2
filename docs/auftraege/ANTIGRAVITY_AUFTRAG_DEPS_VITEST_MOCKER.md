# Separater Auftrag: Advisory @vitest/mocker (GHSA-48jh-vj93-27v5 & GHSA-9w36-4wh2-jxvf) beheben

**Stand:** 08.11.2026

**Basis:** `main` nach PR #144 (`d2bfbd3`, Release v3.0.0)

**Freigabe Marc (08.11.2026):** Aktualisierung von `vitest` und `@vitest/coverage-v8` auf `4.1.12`.

**Builder:** Claude Code. **Prüfer:** Codex. **Merge:** nur Marc.

**Abgrenzung:** Nur Abhängigkeitsauflösung. Kein Anwendungscode, keine neuen Pakete, Schutzbereichs-Diff leer.

## Anlass

GitHub Dependabot meldet für `@vitest/mocker`:
- **Alert #1 (GHSA-48jh-vj93-27v5):** Windows backslash traversal bypasses the @vitest/mocker redirect allowlist fix.
- **Alert #2 (GHSA-9w36-4wh2-jxvf):** Code injection via unauthenticated manual mock registration.

Dependabot konnte das Update nicht selbst durchführen („Dependabot cannot update @vitest/mocker to a non-vulnerable version. The latest possible version that can be installed is 4.1.11...“), da `@vitest/mocker` eine transitive Abhängigkeit von `vitest` ist und `vitest` sowie `@vitest/coverage-v8` wechselseitige Peer-Dependencies besitzen.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `package.json` | `vitest` und `@vitest/coverage-v8` von `^4.1.11` auf `^4.1.12` |
| `package-lock.json` | Auflösung `vitest`, `@vitest/coverage-v8`, `@vitest/mocker` auf 4.1.12 |
| `supabase/functions/deno.lock` | Gespiegelte Root-Abhängigkeiten `vitest` und `@vitest/coverage-v8` auf `^4.1.12` nachziehen |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_DEPS_VITEST_MOCKER.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Builder-Nachweis |

## Verträglichkeit

- Patch-Release von Vitest 4.1.11 auf 4.1.12 schließt die Sicherheitslücke in `@vitest/mocker`.
- Keine Breaking Changes. Alle 368 Testdateien und 2.672 Vitest-Tests laufen 100 % grün durch.
- Deno Edge Functions typecheck und tests (`deno.lock`) laufen 100 % grün durch.

## Umsetzung & Verifikation

- [x] Versionen in `package.json` auf `^4.1.12` gesetzt.
- [x] Lockfile mit regulärer Auflösung (ohne --legacy-peer-deps) aktualisiert; alle Pakete inklusive `proxy-agent` erhalten (`npm ci --dry-run` erfolgreich).
- [x] `npm ls vitest @vitest/mocker @vitest/coverage-v8` bestätigt Version 4.1.12.
- [x] `supabase/functions/deno.lock` synchronisiert (`deno check` & `deno test` 67/67 grün).
- [x] Gates: `tsc --noEmit` (0 Fehler), `npm run lint` (0 Fehler), `npm run format:check` (Prettier-konform), `npm test` (368 Dateien, 2.672 Tests grün), `npm run verify` (25/25 Suiten grün), `npm run build` (erfolgreich).
- [x] Schutzbereichs-Diff gegen `origin/main` leer (0 Diff).
- [x] PR-CI 7/7 grün; Codex-Prüfung ohne Befunde freigegeben.
