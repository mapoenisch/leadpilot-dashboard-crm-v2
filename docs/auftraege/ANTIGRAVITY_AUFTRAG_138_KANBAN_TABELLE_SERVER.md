# Auftrag 138 — Kanban und Tabelle speichern serverseitig

**Quelle:** `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`, Teil-Auftrag 138.
**Builder:** OpenCode · **Prüfer:** ein anderer Agent, Standard Codex (GitHub-App) · **Merge:** Marc.
**Voraussetzung:** Auftrag 137 ist gemergt (PR #158), `move_deal_stage` und `stageEnteredAt`/`stageRaw` stehen zur Verfügung.

## Ziel

Phasenwechsel aus Kanban und Tabelle laufen über die RPC `move_deal_stage` und sind damit für alle Nutzer eines Mandanten dauerhaft sichtbar. Der Browser-Speicher ist keine Datenquelle mehr für Fachzustand. Filter, Suche, Sortierung und Paginierung laufen ausschließlich serverseitig.

## Ziel-Dateien

**Neu:**

- `src/features/crm/services/dealStageService.ts`
- `src/features/crm/services/__tests__/dealStageService.unit.vitest.ts`
- `src/features/crm/hooks/useMoveDealStage.ts`
- `src/features/crm/hooks/__tests__/useMoveDealStage.ui.vitest.tsx`
- `src/features/crm/pages/__tests__/DealsPage.moves.ui.vitest.tsx`
- `e2e/crm-deals-persistence.spec.ts`

**Ändern:**

- `src/features/crm/pages/DealsPage.tsx`
- `src/features/crm/utils/crmStageHelper.ts`
- `src/features/crm/utils/dealsClientView.ts`
- `src/features/crm/utils/crmCsvHelper.ts` und `src/features/crm/__tests__/crmCsvHelper.vitest.ts`
- `src/features/crm/components/DealsKanbanBoard.tsx`
- `src/features/crm/components/DealKanbanCard.tsx`
- `src/features/crm/components/KanbanColumn.tsx` (Durchreichen der Sperr-/Rollenprops)
- `src/features/vertrieb/pages/FunnelPage.tsx`
- `.github/workflows/ci.yml` (Spec in den E2E-Lauf)
- `BUILD_PLAN.md` (Nächster Auftrag: 139)
- `docs/BUILD_LOG.md`

**Löschen:**

- `src/features/crm/pages/__tests__/DealsPage.identity.ui.vitest.tsx`
- `src/features/crm/pages/__tests__/DealsPage.fullbase.ui.vitest.tsx`
- Override-Fälle in `src/features/crm/pages/__tests__/DealsPage.findings.ui.vitest.tsx`
- Override-Fälle in `src/features/crm/__tests__/crmStageHelper.ui.vitest.tsx`
- `applyStageOverridesToCsv` und die zugehörigen Tests in `src/features/crm/utils/crmCsvHelper.ts` / `crmCsvHelper.vitest.ts`

## Schnittstelle

```ts
export type MoveDealStageErrorCode =
  'forbidden' | 'not_found' | 'conflict' | 'invalid_stage' | 'network';

export class MoveDealStageError extends Error {
  code: MoveDealStageErrorCode;
}

export function moveDealStage(input: {
  dealId: string;
  expectedStage: string;
  newStage: string;
}): Promise<{ dealId: string; stage: string; stageEnteredAt: string }>;

export function useMoveDealStage(
  organizationId: string | undefined,
): UseMutationResult<MoveDealStageResult, MoveDealStageError, MoveDealStageInput>;
```

## Entscheidungen

- `LP403` → `forbidden`, `LP404` → `not_found`, `LP409` → `conflict`, `LP422` → `invalid_stage`; alles andere (Netz, unerwartete Antwort) → `network`. Technische Rohmeldungen verlassen den Service nicht.
- `p_expected_stage` ist der gespeicherte Rohwert: `deal.stageRaw ?? deal.stage`. Das normalisierte Label allein würde bei Bestandsdeals wie `closedwon` dauerhaft `LP409` auslösen.
- Optimistisches Update im Cache über `crmKeys.listsOf('deals')`; bei Fehler Rücksprung auf den Schnappschuss. Immer `crmKeys.listsOf('deals')` und `crmKeys.pipelineOverview()` invalidieren.
- `useDealStageOverrides`, `readStageOverrides`, `writeStageOverrides`, `getDealStageOverridesStorageKey` entfallen ersatzlos. Alte Tab-Werte werden nicht migriert.
- Filter, Suche, Sortierung und Paginierung laufen wieder ausschließlich serverseitig; Client-Auswertung und Volldaten-Nachladen entfallen. Das kanban-eigene „Weitere Deals nachladen“ bleibt ein serverseitiger Seitenabruf.
- `viewer`: Karten nicht verschiebbar, kein Tastatur-Verschieben. Während einer laufenden Mutation ist die betroffene Karte gesperrt.
- Texte: Konflikt „Dieser Deal wurde inzwischen geändert. Die aktuelle Phase wird angezeigt.“; Netzfehler „Die Phase konnte nicht gespeichert werden.“; Erfolg per `aria-live="polite"`: „{Deal} nach {Phase} verschoben.“
- Der CSV-Export nutzt die Serverfilter; das nachträgliche Überschreiben von Phasen im Blob entfällt.

## Tests

**Vitest:** `moveDealStage` bildet `LP403/404/409/422` ab; `useMoveDealStage` aktualisiert optimistisch und rollt bei Fehler zurück; `DealsPage` ruft bei Viewer keine Mutation auf.
**E2E:** `phase_bleibt_nach_reload`, `phase_in_zweitem_kontext_sichtbar`, `viewer_kann_nicht_verschieben`, `konflikt_zeigt_serverstand`.

## Ablauf

- [x] Tests zuerst (rot), dann Service, Hook, UI-Umbau, dann Löschen. `git grep -E 'StageOverrides'` in `src/` ist leer.
- [x] Visuelle Baselines nur bei tatsächlicher Abweichung über `visual-baselines/**` erneuern (keine Abweichung).
- [x] Verifikation `CLAUDE.md` §7, Screenshot-Matrix 1440/768/375 px dark/light, 0 px Überlauf, PR.

## Ergänzung des Builders

- `KanbanColumn.tsx` und `crmCsvHelper.ts` standen nicht in der Dateiliste des Plans, sind aber direkte Folgen der entfernten Overrides (Props durchreichen, Export ohne Blob-Überschreibung). Beides bleibt ohne Verhaltensänderung außerhalb der Override-Logik.
- `BUILD_PLAN.md` wird nur in der Zeile „Nächster Auftrag“ auf 139 fortgeschrieben.
