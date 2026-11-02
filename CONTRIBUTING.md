# Beitragen

LeadPilot Dashboard-CRM ist proprietär (**All Rights Reserved**, siehe [LICENSE](LICENSE)). Beiträge sind nur nach Absprache mit dem Projektinhaber möglich.

## Ablauf

Verbindlich ist [CLAUDE.md](CLAUDE.md), Abschnitt 4. Kurzfassung:

1. Arbeit läuft über einen **Auftrag** unter `docs/auftraege/`. Ein Auftrag je PR, Aufträge nacheinander.
2. Nur die im Auftrag genannten Ziel-Dateien ändern. Schutzbereiche (`src/simulation/`, `src/types/`, `src/context/`, `src/services/data/`, `src/features/resources/`) nur mit ausdrücklichem Auftrag.
3. Keine neuen Abhängigkeiten ohne Freigabe im Auftrag.
4. Pflicht-Verifikation lokal:
   ```bash
   npx tsc --noEmit
   npm run verify
   npm run build
   ```
5. Eintrag in `docs/BUILD_LOG.md` schreiben, dann PR öffnen.
6. Ein unabhängiger Prüfer reviewt (Codex auf GitHub, ersatzweise `/<agent> review`). Befunde werden behoben oder begründet abgelehnt.
7. Merge und Release macht der Projektinhaber.

## Voraussetzungen

Siehe [README.md](README.md): Node.js 22.18 bis < 23, npm 10+, Docker und Supabase CLI für Datenbank- und E2E-Tests.

## Nie committen

`.env`, Secrets, Schlüssel, `node_modules/`, `dist/`. Vorlage für Konfiguration ist `.env.example`.

## Verhalten

Es gilt der [Verhaltenskodex](CODE_OF_CONDUCT.md). Sicherheitslücken bitte nicht öffentlich melden, sondern gemäß [SECURITY.md](SECURITY.md).
