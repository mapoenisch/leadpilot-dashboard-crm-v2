# ANTIGRAVITY_AUFTRAG_142 — Release v3.1.0 (CRM-Verbindlichkeit)

> **Builder:** Devin (frei wählbar nach `CLAUDE.md` §4.1) · **Prüfer:** Codex (GitHub App)
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` für die Kontinuität der Auftragsreihe.
> Plan: `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`, Teil-Auftrag 142.

## Ziel

Der Plan *CRM-Verbindlichkeit* (Aufträge 136–141) wird als Minor Release `v3.1.0` vorbereitet.
Auftrag 142 baut **keine neue Geschäftslogik**. Er macht Version, Release-Dokumentation, Pläne,
Login-Anzeige und Nachweise konsistent — nach Muster von Auftrag 134.

## Voraussetzungen (vor T1 prüfen, sonst stoppen)

- [x] PR #162 (Auftrag 141 – Legacy-Dashboard entfernen) ist gemergt (`2eac329`).
- [x] Alle Teil-Aufträge 136–141 sind vollständig in `main` integriert.
- [x] CI auf `main` ist am aktuellen Head grün.
- [x] Marc hat das Go für den nächsten Schritt gegeben („next").

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation/**`, `src/types/**`,
  `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben zu 100 % unberührt.
- Kein Produktcode außer der Versionsanzeige auf der Login-Seite (`src/features/auth/pages/LoginPage.tsx`).
- Keine neue Datenbankmigration, keine neuen externen Abhängigkeiten.
- Tag `v3.0.0` bleibt unangetastet. Kein Force-Push, kein `git reset --hard`.
- Tag `v3.1.0` und GitHub-Release erst nach Review ohne offene Punkte, grüner CI und Merge durch Marc.

## Ziel-Dateien

| Datei | Änderung |
| --- | --- |
| `package.json`, `package-lock.json` | Version `3.1.0` |
| `src/features/auth/pages/LoginPage.tsx` | Versionsanzeige `LeadPilot Dashboard-CRM · V3.1.0` |
| `docs/releases/V3.1.0.md` | neu: Release Notes für `v3.1.0` |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_142_RELEASE_V3_1_0.md` | dieser Auftrag |
| `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md` | Status auf `v3.1.0` aktualisieren |
| `BUILD_PLAN.md` | aktueller Release `v3.1.0`, Status aktualisieren |
| `README.md` | Versionszeile auf `v3.1.0` |
| `ACCESSIBILITY.md` | Stand auf `v3.1.0` |
| `docs/BUILD_LOG.md` | Builder-Eintrag für Auftrag 142 |
| `scripts/captureAuftrag142LoginScreenshots.mjs` | neu: Vorher/Nachher Screenshot-Harness Login-Seite |
| `docs/screenshots/auftrag-142/README.md` | neu: Screenshot-Matrix (1440/768/375 px) |

## Tasks

- [ ] T1 Version auf `3.1.0` (`npm version 3.1.0 --no-git-tag-version`), Login-Anzeige anpassen.
- [ ] T2 Release Notes `docs/releases/V3.1.0.md` nach Vorbild `V3.0.0.md`/`V2.5.0.md`:
  Neu/Behoben aus Aufträgen 136–141 (serverseitige Phasenpersistenz inkl. Verweildauer und
  Historie, serverseitige BANT-Qualifizierung und Deal-Konvertierung mit Rollenkontrolle,
  Funnel mit echten Verweildauern, entferntes Legacy-Dashboard), Upgrade von `v3.0.0`,
  bekannte Grenzen.
  Pflichtinhalt laut Plan: Migrationen `20261110`/`20261111` **vor** dem neuen Frontend auf
  gehostete Instanzen anwenden; Bestandsdeals ohne Verweildauer, Browser-Speicher-Werte werden
  nicht übernommen; Manager dürfen jetzt verschieben und konvertieren; altes Dashboard entfernt,
  Rückweg Tag `v3.0.0`; die vier Einschränkungen des v3.0.0-Nachtrags sind behoben.
- [ ] T3 Plan-Datei, `BUILD_PLAN.md`, `README.md`, `ACCESSIBILITY.md` auf Stand `v3.1.0` aktualisieren.
- [ ] T4 Screenshot-Gate Login-Seite (`CLAUDE.md` §7): `scripts/captureAuftrag142LoginScreenshots.mjs`
  (Vorher `V3.0.0` vs. Nachher `V3.1.0`, 1440/768/375 px, dark/light, SHA-256-Paare verschieden,
  0 px Überlauf); `docs/screenshots/auftrag-142/README.md` committen.
- [ ] T5 Pflichtgates lokal: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`,
  `npm run verify:quality-budget`, `npm test`, `npm run verify`, `npm run build`, `npx size-limit`;
  Schutzbereichs-Diff gegen `origin/main` leer.
- [ ] T6 BUILD_LOG-Builder-Eintrag, committen, PR öffnen für Codex-Review.
- [ ] T7 Codex-Review abarbeiten, Nachtrag im `BUILD_LOG`.
- [ ] T8 Nach Gate-Freigabe und Merge durch Marc: Tag `v3.1.0` auf dem Merge-Commit,
  GitHub-Release „LeadPilot v3.1.0" mit Release Notes — macht Marc.

## Gates

| Gate | Prüfung |
| --- | --- |
| R1 | `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm run lint`, `npm run format:check` grün |
| R1a | Login-Seite vorher/nachher je Breite verschieden (V3.0.0 vs. V3.1.0), 0 px Überlauf |
| R2 | CI auf dem PR grün (alle 7 Pflicht-Checks laut Ruleset `Main-protection`) |
| R3 | Schutzbereichs-Diff gegen den `main`-Head vor 142 leer |
| R4 | Codex meldet für den aktuellen Head keine offenen Befunde, Konversationen gelöst |
| R5 | Tag `v3.1.0` zeigt auf den Merge-Commit; ältere Tags unverändert |
