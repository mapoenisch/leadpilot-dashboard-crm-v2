# ANTIGRAVITY_AUFTRAG_136 — Plan in Kraft setzen, falsche Aussagen entfernen

> **Builder:** OpenCode (frei wählbar nach `CLAUDE.md` §4.1) · **Prüfer:** ein anderer Agent, Standard Codex (GitHub-App) · **Merge und Release:** Marc
> Teil-Auftrag 1 aus dem verbindlichen Plan `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md` (Abschnitt „Teil-Auftrag 136"). Es gelten `CLAUDE.md` §3, §5, §6 und §7 sowie die globalen Grenzen aus Abschnitt 3 des Plans.

## Ziel

Der Folgeplan v3.1.0 wird im `BUILD_PLAN.md` sichtbar, und die v3.0.0-Release-Notes benennen ihre bekannten Einschränkungen. Der tote `AIInsightDrawer` mit der falschen Aussage „Powered by LeadPilot Gemini AI Engine" verschwindet vollständig aus `src/`.

## Dateien

- **Löschen:** `src/components/ai/AIInsightDrawer.tsx`, `src/components/ai/__tests__/AIInsightDrawer.ui.vitest.tsx`
- **Ändern:** `BUILD_PLAN.md`, `docs/releases/V3.0.0.md`, `docs/BUILD_LOG.md`

## Tasks

- [ ] `git grep AIInsightDrawer` zeigt außer den beiden Dateien nichts, dann löschen.
- [ ] `BUILD_PLAN.md`: „Nächster Auftrag" zeigt auf diesen Plan und 137.
- [ ] `docs/releases/V3.0.0.md`: Abschnitt „Bekannte Einschränkungen (Nachtrag 09.11.2026)" ans Ende: Phasenwechsel, BANT und Qualifizierungsstatus liegen nur im Browser; Engpass-Erkennung hat ohne Phasendatum keine Datenbasis; die Aktivitätshistorie existiert nicht. Bestehender Text bleibt unverändert.
- [ ] Verifikation §7, PR.

## Abnahme

- [ ] Kein Treffer für `Gemini AI Engine` in `src/`.
- [ ] Build grün.

## Grenzen

- Keine neuen npm-Pakete.
- Schutzbereiche nach §6 bleiben unberührt, Diff muss leer sein.
- Keine UI-Änderung im sichtbaren Bestand; Screenshot-Matrix entfällt.
- Ein PR, vom aktuellen `main`. Branch: `opencode/auftrag-136-falsch-ki-entfernen` (Präfix nennt den Builder).
