# ANTIGRAVITY_AUFTRAG_134 — Release v3.0.0 (CRM-, Vertriebs- & Analytics-Evolution)

> **Builder:** Claude Code · **Prüfer:** Codex (GitHub App)
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` für die Kontinuität der Auftragsreihe.
> Roadmap gemäß `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md`.

## Ziel

Der Master-Plan *CRM-, Vertriebs- & Analytics-Evolution* (Pakete 1–5, Aufträge 129–133) wird als Major Release `v3.0.0` veröffentlicht.
Auftrag 134 baut **keine neue Geschäftslogik**. Er macht Version, Release-Dokumentation, Pläne, Login-Anzeige und Nachweise konsistent.

## Voraussetzungen (vor T1 prüfen, sonst stoppen)

- [x] PR #143 (Auftrag 133 – What-If Hebelrechner) ist gemergt; Auftrag 134 startet vom aktuellen `main` (`67c87fd`).
- [x] Alle 5 Pakete (Aufträge 129–133) sind vollständig in `main` integriert.
- [x] CI auf `main` ist am aktuellen Head `67c87fd` grün (alle 7 Pflicht-Jobs bestanden).
- [x] Marc hat das Go für den nächsten Schritt / Release im Chat gegeben ("next").

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben zu 100 % unberührt (Diff = 0).
- Kein Produktcode außer der Versionsanzeige auf der Login-Seite (`src/features/auth/pages/LoginPage.tsx`).
- Keine neue Datenbankmigration, keine neuen externen Abhängigkeiten (`package.json`).
- Tags `v2.3.0`–`v2.5.0` bleiben unangetastet. Kein Force-Push, kein `git reset --hard`.
- Tag `v3.0.0` und GitHub-Release erst nach Codex-Befund ohne offene Punkte, grüner CI und Freigabe/Merge durch Marc.

## Ziel-Dateien

| Datei | Änderung |
| --- | --- |
| `package.json`, `package-lock.json` | Version `3.0.0` |
| `src/features/auth/pages/LoginPage.tsx` | Versionsanzeige `LeadPilot Dashboard-CRM · V3.0.0` |
| `docs/releases/V3.0.0.md` | neu: Release Notes für Major Release `v3.0.0` |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_134_RELEASE_V3_0_0.md` | dieser Auftrag |
| `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md` | Status auf `v3.0.0` aktualisieren |
| `BUILD_PLAN.md` | aktueller Release `v3.0.0`, Status aktualisieren |
| `docs/BUILD_LOG.md` | Builder-Eintrag für Auftrag 134 |
| `scripts/captureAuftrag134LoginScreenshots.mjs` | neu: Vorher/Nachher Screenshot-Harness Login-Seite |
| `docs/screenshots/auftrag-134/README.md` | neu: Screenshot-Matrix (1440/768/375 px) |

## Tasks

- [ ] T1 Version auf `3.0.0` (`npm version 3.0.0 --no-git-tag-version`), Login-Anzeige in `LoginPage.tsx` anpassen.
- [ ] T2 Release Notes `docs/releases/V3.0.0.md` nach Vorbild `V2.5.0.md` verfassen: Neu/Behoben aus Paketen 1–5 (Deals Kanban, Lead Scoring & Konvertierung, Live-CRM Funnel vs. Plan & Bottlenecks, Executive Report Generator & Druck/PDF, What-If Hebelrechner & Sensitivitäts-Cockpit), Upgrade von `v2.5.0`, Rückweg, bekannte Grenzen.
- [ ] T3 `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md` und `BUILD_PLAN.md` auf Stand `v3.0.0` aktualisieren.
- [ ] T4 Screenshot-Gate Login-Seite (`CLAUDE.md` §7): `scripts/captureAuftrag134LoginScreenshots.mjs` ausführen (Vorher `V2.5.0` vs. Nachher `V3.0.0` bei 1440/768/375 px, Hashes verschieden, 0 px Überlauf); `docs/screenshots/auftrag-134/README.md` committen.
- [ ] T5 Pflichtgates lokal validieren: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run verify:quality-budget`, `npm test`, `npm run verify`, `npm run build`; Schutzbereichs-Diff gegen `origin/main` leer (0 Diff).
- [ ] T6 BUILD_LOG-Builder-Eintrag schreiben, committen und PR auf GitHub öffnen für Codex-Review.
- [ ] T7 Codex-Review abarbeiten, Nachtrag im `BUILD_LOG`.
- [ ] T8 Nach Gate-Freigabe und Merge durch Marc: annotierter Tag `v3.0.0` auf dem Merge-Commit (`git tag -a v3.0.0 -m "LeadPilot v3.0.0"`, `git push origin v3.0.0`), GitHub-Release „LeadPilot v3.0.0“ mit Release Notes.

## Gates

| Gate | Prüfung |
| --- | --- |
| R1 | `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm run lint`, `npm run format:check` grün |
| R1a | Login-Seite vorher/nachher je Breite verschieden (V2.5.0 vs. V3.0.0), 0 px Überlauf |
| R2 | CI auf dem PR grün (alle 7 Pflicht-Checks laut Ruleset `Main-protection`) |
| R3 | Schutzbereichs-Diff gegen den `main`-Head vor 134 leer (`git diff origin/main -- src/simulation src/types src/context src/services/data src/features/resources` = 0) |
| R4 | Codex meldet für den aktuellen Head keine offenen Befunde, Konversationen gelöst |
| R5 | Tag `v3.0.0` zeigt auf den Merge-Commit; ältere Tags unverändert |
