# ANTIGRAVITY_AUFTRAG_080 — Release v2.4.0 (Executive Dashboard)

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Release-Freigabe Marc Poenisch im Chat, 06.10.2026 („so wir releasen das ding jetzt“).

## Ziel

Die neue persönliche Ansicht unter `/dashboard` (Teilaufträge 0–8, Aufträge 070–079) wird als
`v2.4.0` veröffentlicht. Verbindliches Versionsziel laut Plan
`docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Abschnitt 12.

080 baut **keine Funktion**. Es macht Version, Release-Dokument, Plan und Tag konsistent.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert. Kein Produktcode außer der Versionsanzeige auf
  der Login-Seite.
- Keine neue Migration, keine neue Abhängigkeit.
- Tags `v2.3.0`, `v2.3.1`, `v2.3.2` bleiben unangetastet. Kein Force-Push.
- Tag `v2.4.0` und GitHub-Release erst nach Codex-Befund ohne Blocker, grüner CI und Merge durch Marc.

## Ziel-Dateien

| Datei                                                           | Änderung                            |
| --------------------------------------------------------------- | ----------------------------------- |
| `package.json`, `package-lock.json`                             | Version `2.4.0`                     |
| `src/features/auth/pages/LoginPage.tsx`                         | Anzeige `V2.4.0`                    |
| `docs/releases/V2.4.0.md`                                       | neu: Release Notes                  |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_080_RELEASE_V2_4_0.md`      | dieser Auftrag                      |
| `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md` | Status, Abschnitt 12                |
| `BUILD_PLAN.md`                                                 | aktueller Release, nächster Auftrag |
| `docs/BUILD_LOG.md`                                             | Builder-Eintrag                     |
| `scripts/captureAuftrag080LoginScreenshots.mjs`                 | neu: Vorher/Nachher Login-Seite     |
| `docs/screenshots/auftrag-080/README.md`                        | neu: Screenshot-Matrix              |

## Tasks

- [x] T1 Version auf `2.4.0` (`npm version 2.4.0 --no-git-tag-version`), Login-Anzeige angepasst.
- [x] T2 Release Notes `docs/releases/V2.4.0.md` mit Upgrade (Migration `20261004`), Rückweg und
      Behebungen.
- [x] T3 Plan und `BUILD_PLAN.md` auf den Release-Stand bringen.
- [x] T4 Pflichtgates lokal (`tsc`, `verify`, `build`, `lint`, `format:check`), Schutzbereichs-Diff.
- [x] T5 BUILD_LOG-Eintrag, PR.
- [x] T5a Screenshot-Gate Login-Seite (`CLAUDE.md` §7): Vorher/Nachher bei 1440/768/375 px.
- [x] T5b Status „veröffentlicht“ schon in diesem PR, damit der getaggte Stand ihn enthält
      (Lehre aus v2.3.2, dort nennt der Tag noch „Release-Kandidat“).
- [ ] T6 Nach Codex-Befund, grüner CI und Merge durch Marc: annotierter Tag `v2.4.0` auf dem
      Merge-Commit, GitHub-Release „LeadPilot v2.4.0“ mit den Release Notes. Kein
      Nachtrags-Commit für den Status.

## Gates

| Gate | Prüfung                                                                    |
| ---- | -------------------------------------------------------------------------- |
| R1   | `npx tsc --noEmit`, `npm run verify`, `npm run build` grün                 |
| R1a  | Login-Seite vorher/nachher je Breite verschieden, 0 px Überlauf            |
| R2   | CI auf dem PR grün, einschließlich `verify:migrations` und `verify:backup` |
| R3   | Schutzbereichs-Diff gegen `5c0deba` leer                                   |
| R4   | Codex-Befund ohne Blocker                                                  |
| R5   | Tag `v2.4.0` zeigt auf den Merge-Commit; ältere Tags unverändert           |
