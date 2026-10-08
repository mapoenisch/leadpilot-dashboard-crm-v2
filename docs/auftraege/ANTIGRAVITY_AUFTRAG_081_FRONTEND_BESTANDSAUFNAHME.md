# ANTIGRAVITY_AUFTRAG_081 — Frontend-Qualität, Arbeitspaket 0: Bestandsaufnahme

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md` (Abschnitt 5), Entwurf
> `docs/superpowers/specs/2026-10-06-frontend-qualitaet-design.md`. Plan freigegeben und Builder
> festgelegt durch Marc Poenisch im Chat, 06.10.2026.

## Ziel

Eine überprüfbare Ausgangslage vor jeder Änderung. Jeder Befund F01–F14 aus dem Entwurf wird
als bestätigt, begrenzt bestätigt oder noch zu prüfen eingestuft, mit reproduzierbaren Schritten.
Das Register deckt alle 32 Bildseiten und die interaktiven Abläufe ab.

081 ändert **keinen Produktcode**.

## Baseline

- Branch `claude/frontend-paket-0` von `main` `7fd6e33` (Merge PR #66, Release v2.4.0).
- Schutzbereichs-Baseline: `7fd6e33`.
- Messumgebung: Produktionsbuild (`vite build`) gegen lokales Supabase, CI-Testbenutzer
  `admin-a`, `vite preview`, Chromium über Playwright, reduzierte Bewegung, Browserzoom 100 %.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert. Kein Produktcode, keine Migration, keine neue Abhängigkeit.
- Bilder bleiben lokal (`.gitignore`); committet werden Register, Messwerte (JSON) und README-Matrix.
- Keine Secrets in Register oder JSON (Passwörter nur aus der Umgebung, nie protokolliert).
- Frühere Freigaben (Auftrag 069 Bildseiten, Auftrag 079 Dashboard) bleiben dokumentiert und
  werden durch das Register nicht zurückgenommen.

## Ziel-Dateien

| Datei                                                                 | Änderung                     |
| --------------------------------------------------------------------- | ---------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_081_FRONTEND_BESTANDSAUFNAHME.md` | dieser Auftrag               |
| `docs/reviews/2026-10-06-frontend-befundregister.md`                  | neu: Befundregister          |
| `docs/reviews/2026-10-06-frontend-inventar.json`                      | neu: Messwerte je Aufnahme   |
| `docs/screenshots/auftrag-081/README.md`                              | neu: Ergebnismatrix          |
| `scripts/captureAuftrag081Inventory.mjs`                              | neu: Mess- und Bild-Harness  |
| `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`        | Freigabevermerk, Haken Pkt 0 |
| `docs/superpowers/specs/2026-10-06-frontend-qualitaet-design.md`      | Freigabevermerk              |
| `CLAUDE.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                     | Rolle, Stand, Eintrag        |

## Tasks

- [x] T1 Branch, Commit, Versionsanzeige, Startmodus, Zoom und CSS-Viewport erfassen.
- [x] T2 Dashboard, Bearbeiten, Details, CRM-Seiten, Datenbasis, Standort und alle 32 Bildseiten
      inventarisieren (Route, Komponente, Datenquelle, Diagramme, Schutzbereich, Umfang).
- [x] T3 Dunkel und hell getrennt aufnehmen; 1440/768/375 px, Dashboard und Funnel zusätzlich 320 px;
      Lazy-Inhalte vorher durch Scrollen laden. Fehlerfall Pipeline getrennt.
- [x] T4 Inhaltshöhe, Kachelhöhen, Kennzahlen im ersten Bildschirm, Überlauf, axe, erster Fokus,
      Bildmaßstab messen.
- [x] T5 F01–F14 einstufen; Produktionsbetroffenheit der Pipeline ausdrücklich offen lassen.
- [x] T6 Register, README-Matrix, BUILD_LOG, PR.

## Gates

| Gate | Prüfung                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| P0-1 | Register nennt alle 32 Bildseiten und die interaktiven Abläufe                                                 |
| P0-2 | Jeder Befund F01–F14 hat Einstufung, Beleg und reproduzierbaren Schritt                                        |
| P0-3 | `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`, `npm run format:check` grün |
| P0-4 | Schutzbereichs-Diff gegen `7fd6e33` leer; keine Datei unter `src/` geändert                                    |
| P0-5 | Codex-Befund ohne Blocker; Merge durch Marc                                                                    |
