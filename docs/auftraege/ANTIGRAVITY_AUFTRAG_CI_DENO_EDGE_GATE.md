# Separater CI-Recovery-Auftrag: Deno-Gate für Edge Functions

**Stand:** 23.09.2026

**Basis:** `main` nach PR #23 (`66f85a8`), sieben Pflichtjobs im Lauf `35869178334` grün

**Builder-Ausnahme:** Marc hat Codex für genau diesen CI-PR ausdrücklich als Builder freigegeben.

**Abgrenzung:** Kein 067Q, keine Produktionslogik, kein Deploy.

## Ziel

Die vorhandenen Edge-Function-Tests und die drei Function-Entry-Points werden bei
jedem PR und `main`-Push als verpflichtende Schritte im bestehenden `test`-Job
geprüft. Die sieben Ruleset-Jobnamen bleiben unverändert.

## Ziel-Dateien

- `.github/workflows/ci.yml`: `setup-deno` per vollständigem Commit-SHA und
  Deno-Version exakt pinnen; `deno check` und `deno test` fail-closed ergänzen.
- `supabase/functions/deno.lock`: eigener eingefrorener Lock für den
  Edge-Function-Arbeitsbereich, damit Deno nicht vom npm-`node_modules`
  abhängt; Root-`deno.lock` nicht ändern.
- `BUILD_PLAN.md`: dieses zusätzliche Qualitätsgate vor 067Q sichtbar machen,
  ohne Issue #5 erneut zu öffnen oder 067Q mit der CI-Arbeit zu vermischen.
- `docs/BUILD_LOG.md`: lokale und GitHub-Gate-Nachweise eintragen.
- Diese Auftragsdatei: schriftliche Scope-Grenze und Übergabe.

## Umsetzung

- [x] Nur im bestehenden `test`-Job: `denoland/setup-deno` auf einen geprüften
  40-stelligen SHA und Deno auf `v2.9.6` pinnen.
- [x] `deno check` für alle `supabase/functions/*/index.ts` und `deno test`
  für `supabase/functions/` mit `--config supabase/functions/deno.json`,
  `--lock supabase/functions/deno.lock`, `--frozen-lockfile` und
  `--node-modules-dir=none` ausführen. Tests erhalten ausschließlich
  `--allow-env --allow-net --allow-read`.
- [x] Keine `continue-on-error`-Ausnahme; bestehende Coverage-, E2E- und
  Readiness-Schritte unverändert lassen.
- [x] Lokal unter Deno 2.9.6: drei Entry-Points und alle vorhandenen Deno-Tests
  prüfen. Zusätzlich TypeScript, Integrity, Vitest und Build sowie
  Schutzbereichs-Diff kontrollieren. Keine UI-Änderung: keine Screenshots.
- [ ] Genau einen PR-CI-Lauf auf dem finalen Head vollständig prüfen und erst
  nach Review und sieben grünen Pflichtjobs mergen. Anschließenden
  `main`-CI-Lauf ebenfalls vollständig prüfen. Kein Deploy.

## Bekannter Setup-Befund

Das Root-`deno.lock` löst Supabase derzeit anders auf als das npm-`node_modules`.
Der unisolierte lokale Deno-Lauf scheitert vor Testbeginn an einer fehlenden
transitiven NPM-Version. Ein eigener Edge-Lock plus
`--node-modules-dir=none` vermeidet diese Kopplung. Die fachlichen Tests selbst
werden nicht geändert.
