# ANTIGRAVITY_AUFTRAG — Viewer strikt lesend: keine Simulationsläufe (Nachtrag zu G49/G63)

> **Builder:** Claude Code (Rollenwechsel bis v2.3.0, `CLAUDE.md` §4) · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.

## Anlass und Entscheidung

Die manuelle G64-Gegenprüfung (067R, BUILD_LOG 25.09.2026) hat gezeigt: Viewer sehen
„Run / Re-Run“ und können Simulationsläufe starten, wiederholen und reproduzieren. Jeder
solche Lauf wird serverseitig gespeichert (`persist_completed_run`: Run, Events, Zeitreihe,
Snapshots). Das ist eine Schreibaktion im Datenbestand der Organisation. Steuerbefehle
(Pause/Abbruch/Retry) sind für Viewer bereits gesperrt (G63).

- **G49:** Die Persistenz folgte bewusst der Run-Berechtigung, rollenunabhängig.
- **Rollenmodell:** Es sieht `simulation:run` bereits nur für Admin und Manager vor
  (`src/auth/permissions.ts`). UI und Datenbank setzen das aber nicht durch.

**Entscheidung Marc Poenisch (25.09.2026):**
- Viewer bleiben strikt lesend.
- Sie sehen alle Runs, Ergebnisse, Charts und pausierten Läufe.
- Sie starten, wiederholen und reproduzieren keine Läufe.

Das revidiert die G49-Festlegung „rollenunabhängig“ für Schreibpfade von Läufen.

## Baseline

- **Start:** nach der G64-Freigabe und dem Merge von #25/#27/#28. Branch
  `claude/viewer-read-only-runs`, bis dahin gestapelt auf `claude/067r-acceptance`.
- **Schutzbereiche:** `src/simulation/**` und `src/types/**` bleiben unverändert.
  Die Rollenprüfung sitzt in Store, UI und Datenbank.

## Fachliche Regeln

| Aktion | Admin | Manager | Viewer |
|---|---|---|---|
| Runs, Ergebnisse und Pausen ansehen | ✅ | ✅ | ✅ |
| Neuen Run starten, Re-Run, Reproduce (persistierend) | ✅ | ✅ | ❌ |
| Pause/Fortsetzen/Abbruch/Retry | ✅ | ✅ | ❌ (seit G63) |

- **Server (verbindlich):** `persist_completed_run` verlangt Admin oder Manager der
  eigenen Organisation. Viewer erhalten 42501, und es bleiben keine Teilreste. Die neue
  Migration ist idempotent und ändert die Signatur nicht.
- **Client (fail-closed):** `runVersion`, `reRun` und `reproduce` im Store prüfen
  `simulation:run` vor dem Start und werfen für Viewer `FORBIDDEN`, ohne Worker-Start.
- **UI:** „Run / Re-Run“, „Neuen Run Starten“ und die Re-Run-/Reproduce-Knöpfe in der
  Audit-Ansicht werden für Viewer nicht angeboten. Stattdessen steht ein Hinweis
  „nur Lesezugriff“ da, wie im Pausen-Panel.
- **Kein stiller Ersatz:** Kein nicht-persistierter „Schatten-Run“ für Viewer.
- **Offene Frage für die Umsetzung:** Szenario-Vorschau und -Vergleich
  (`previewMeasures`, Vergleichs-Modals) sind nicht persistierend. Sie werden im Build
  geprüft; persistieren sie nicht, bleiben sie für Viewer erlaubt.

## Ziel-Dateien

| Datei | Art |
|---|---|
| `supabase/migrations/2026XXXX_run_write_roles.sql` | neu (Rollenprüfung in `persist_completed_run`) |
| `supabase/tests/scenario_run_persistence.sql` | ändern (Viewer 42501, keine Reste; Admin/Manager weiter ok) |
| `src/store/slices/runSlice.ts`, `src/store/__tests__/runControlSlice.vitest.ts` | ändern (Rollenprüfung vor Start) |
| `src/store/hooks.ts` | ggf. ändern (Rolle an `useRunActions`) |
| `src/features/simulation/components/ManagementTierView.tsx`, `RunActionModal.tsx`, `AuditTierView.tsx` (+ UI-Tests) | ändern |
| `e2e/run-control.spec.ts` | ändern (Viewer ohne Start-Knöpfe, Server-Ablehnung) |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md`, `ARCHITECTURE_DECISIONS.md` (Revision zu G49, nur ergänzen) | ändern |

## Tasks

- [ ] 1. Roter Start: pgTAP „Viewer darf `persist_completed_run` nicht aufrufen“ und
  Slice-Test „Viewer-Start wirft `FORBIDDEN`“ laufen rot.
- [ ] 2. Migration und pgTAP grün.
- [ ] 3. Store-Prüfung und UI-Ausblendung; UI-Tests je Rolle.
- [ ] 4. E2E: Viewer sieht keine Start-Knöpfe, ein direkter RPC-Aufruf wird abgewiesen.
  Admin und Manager laufen unverändert.
- [ ] 5. Verifikation (tsc, lint, format, quality-budget, `npm test`, `npm run verify`,
  build, `supabase test db`, E2E), Screenshot-Matrix für die geänderten Ansichten
  (Viewer mit Hinweis statt Knopf, Admin/Manager pixelgleich), BUILD_LOG.
