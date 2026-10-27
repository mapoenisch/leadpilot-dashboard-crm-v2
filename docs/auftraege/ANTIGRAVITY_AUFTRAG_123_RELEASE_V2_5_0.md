# ANTIGRAVITY_AUFTRAG_123 — Release v2.5.0 (Frontend-Qualität)

> **Builder:** Claude Code · **Prüfer:** Codex (Ausweichweg `/<agent> review`, falls Nutzungslimit)
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Versionsvorgabe Marc Poenisch, 07.10.2026 (Plan Frontend-Qualität, Abschnitt 15). **Start erst nach Marcs ausdrücklichem Go.**

## Ziel

Der Plan Frontend-Qualität (Arbeitspakete 0, A–I, Aufträge 081–122) wird als `v2.5.0` veröffentlicht.
Auftrag 123 baut **keine Funktion**. Er macht Version, Release-Dokument, Plan und Tag konsistent.

## Voraussetzungen (vor T1 prüfen, sonst stoppen)

- [ ] PR #115 (Doku Paket I) ist gemergt; Auftrag 123 startet vom aktuellen `main`.
- [ ] Abnahmematrix Paket I (`docs/reviews/`) hat kein offenes Gate mehr (Gestaltungsabnahme und fünf Aufgaben durch Marc sind protokolliert).
- [ ] CI auf `main` ist am aktuellen Head grün.
- [ ] Marc hat das Go für den Release im Chat gegeben.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert. Kein Produktcode außer der Versionsanzeige auf der Login-Seite.
- Keine neue Migration (seit `v2.4.0` keine hinzugekommen, Stand 27.10.2026), keine neue Abhängigkeit.
- Tags `v2.3.0`–`v2.4.0` bleiben unangetastet. Kein Force-Push, kein `git reset --hard`.
- Alte Dashboardansicht nicht entfernen (eigener Auftrag, Plan Abschnitt 15).
- Tag `v2.5.0` und GitHub-Release erst nach Codex-Befund ohne offene Punkte, grüner CI und Merge durch Marc.

## Ziel-Dateien

| Datei                                                          | Änderung                            |
| -------------------------------------------------------------- | ----------------------------------- |
| `package.json`, `package-lock.json`                            | Version `2.5.0`                     |
| `src/features/auth/pages/LoginPage.tsx`                        | Anzeige `V2.5.0`                    |
| `docs/releases/V2.5.0.md`                                      | neu: Release Notes                  |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_123_RELEASE_V2_5_0.md`     | dieser Auftrag                      |
| `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md` | Abschnitt 15: Release-Punkt, Status |
| `BUILD_PLAN.md`                                                | aktueller Release, nächster Auftrag |
| `docs/BUILD_LOG.md`                                            | Builder-Eintrag                     |
| `scripts/captureAuftrag123LoginScreenshots.mjs`                | neu: Vorher/Nachher Login-Seite     |
| `docs/screenshots/auftrag-123/README.md`                       | neu: Screenshot-Matrix              |

## Tasks

- [ ] T1 Version auf `2.5.0` (`npm version 2.5.0 --no-git-tag-version`), Login-Anzeige anpassen.
- [ ] T2 Release Notes `docs/releases/V2.5.0.md` nach Vorbild `V2.4.0.md`: Neu/Behoben aus Paket 0 und A–I
      (u. a. F12 Pipelinefehler, F15 helle Kontraste, F08 Funnel, ehrliche Filter, kompakte Kacheln, Editor/Konfigurator,
      32 Bildseiten als echte Seiten, Navigation/Abmelden/Sprache, Überlauf-Korrekturen), Upgrade (keine Migration,
      keine Secrets), Rückweg (`PAGE_PRESENTATION`, Schalter je Gruppe, keine DB-Änderung), bekannte Grenzen.
      Inhalte aus BUILD_LOG und Abnahmematrix belegen, nichts erfinden.
- [ ] T3 Plan (Abschnitt 15, Release-Punkt abhaken) und `BUILD_PLAN.md` (aktueller Release `v2.5.0`, nächster Auftrag) auf den Release-Stand bringen.
- [ ] T4 Pflichtgates lokal: `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm run lint`, `npm run format:check`; Schutzbereichs-Diff gegen den `main`-Head vor 123 leer.
- [ ] T5 Screenshot-Gate Login-Seite (`CLAUDE.md` §7): Vorher/Nachher bei 1440/768/375 px, Hashes verschieden, 0 px Überlauf; nur die README-Matrix committen.
- [ ] T6 Status „veröffentlicht“ schon in diesem PR (Lehre aus v2.3.2), BUILD_LOG-Builder-Eintrag, PR öffnen.
- [ ] T7 Codex-Review abarbeiten, Nachtrag im BUILD_LOG (reiner Doku-Commit).
- [ ] T8 Nach Gate-Freigabe und Merge durch Marc: annotierter Tag `v2.5.0` auf dem Merge-Commit
      (`git tag -a v2.5.0 -m "LeadPilot v2.5.0"`, `git push origin v2.5.0`), GitHub-Release „LeadPilot v2.5.0“ mit den Release Notes.
      Kein Nachtrags-Commit für den Status. Einmalige Funktionsprüfung nach Auslieferung.

## Gates

| Gate | Prüfung                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| R1   | `npx tsc --noEmit`, `npm run verify`, `npm run build` grün                       |
| R1a  | Login-Seite vorher/nachher je Breite verschieden, 0 px Überlauf                  |
| R2   | CI auf dem PR grün (alle Pflicht-Checks laut Ruleset `Main-protection`)          |
| R3   | Schutzbereichs-Diff gegen den `main`-Head vor 123 leer                           |
| R4   | Codex meldet für den aktuellen Head keine offenen Befunde, Konversationen gelöst |
| R5   | Tag `v2.5.0` zeigt auf den Merge-Commit; ältere Tags unverändert                 |
