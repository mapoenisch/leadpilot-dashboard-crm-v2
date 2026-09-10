# Charakterisierung G32 — Live-KPI-Store & Hooks (Ist-Stand für G33/G34)

**Stand:** 2026-09-10 · **Branch:** `codex/v2.2.0-haertung` · **Test-only, null Produktänderung**
(verifiziert: `git diff --exit-code` über alle Nicht-Test-Produktdateien leer).

## 1. Seam (gelesen, nicht geändert)

- `src/services/liveKpi/liveKpiStreamStore.ts`
  - `createLiveKpiStreamStore(customAdapter?: LiveKpiStreamAdapter)` (Z. 97),
    `LiveKpiStreamAdapter`-Interface (Z. 36–45: `isLiveKpiReadConfigured`,
    `fetchLatestLiveKpi`, `fetchLiveKpiHistory`, `subscribeToLiveKpi`).
    Alle Tests nutzen die Injektion — nie den Singleton (Z. 390), nie `vi.mock`
    auf den Store.
  - `status: 'live'` nur im Kanal-`subscribed`-Pfad (Z. 222–228) und bei neuerem
    Realtime-Event (Z. 202–210) — **nicht** im History-`.then()` (Z. 162–179) → A.
  - `release` löscht den Entry bei `refCount <= 0` sofort (Z. 290–296) → B.
  - Interface (Z. 29–34) kennt **kein** `getSnapshot`; `getState` (Z. 301–320)
    liefert `entry.state` → C.
- `src/hooks/useLiveKpi.ts` (61 Z.), `useLiveKpiHistory.ts` (42 Z.),
  `useLiveKpiActivity.ts` (136 Z.), `useReducedMotion.ts` (40 Z.) — alle binden an
  den Singleton; Tests mocken nur `./liveKpiReadAdapter` (`vi.mock`, erlaubt).
- Status-Priorität in `useLiveKpiActivity` (Z. 91–99): live > loading > error >
  offline (else-if-Kette — `loading` dominiert `error`, solange ein Stream lädt).

## 2. Grüne Charakterisierungstests (Ist-Verhalten)

| Datei | Tests | Abgedeckt (u. a.) |
|---|---|---|
| `src/services/liveKpi/__tests__/liveKpiStreamStore.vitest.ts` | 20 + A/B/C | acquire/History/Kanal/Events/RefCount/refresh-Grundpfade |
| `src/services/liveKpi/__tests__/liveKpiStreamStoreLifecycle.vitest.ts` | 12 | Race-Guards, non-Error-Normalisierung, Tiebreaks, Listener-Isolation, Entry-lose Pfade (max-lines-Teilung) |
| `src/services/liveKpi/__tests__/liveKpiReadAdapter.vitest.ts` | 20 | echter Adapter, nur Supabase-Client gemockt: configured-An/aus; Latest (Zeile/null/Fehler/Müll); History (Limit-Clamp 1..30, Sortierung, Müllfilter, Fehler, null); Subscribe (offline-Noop, INSERT-Mapping, Status-Übersetzung, Unsubscribe-Einmaligkeit + Warnung) |
| `src/services/liveKpi/__tests__/liveKpiContract.vitest.ts` | 11 | Idempotenzschlüssel + alle 11 Validierungszweige |
| `src/services/liveKpi/__tests__/liveKpiDefinitions.vitest.ts` | 3 | Katalog-12, Support-Check, Definitions-Lookup |
| `src/hooks/__tests__/useLiveKpi.ui.vitest.ts` | 7 | Mount/loading→live, Re-Render, Unmount-Release, refresh, Kanalfehler, History-Pfad, Remount-Beobachtung (grün, siehe B) |
| `src/hooks/__tests__/useLiveKpiActivity.ui.vitest.ts` | 8 | leere IDs, Dedup, 5-Felder-Mapping + Sortierung, Limit-Clamp 1/10, Status-Priorität, unconfigured-Endzustand, ingestedAt-Tiebreak, Unmount |
| `src/hooks/__tests__/useReducedMotion.ui.vitest.ts` | 4 | Initial true/false, Change-Update, Legacy-addListener-Pfad, Cleanup |

## 3. Rot-Nachweise (`it.fails`, alle in node-env, kein DOM nötig)

| # | Bug | Testdatei | Erwartung nach Fix | Zielgate |
|---|---|---|---|---|
| A | Status bleibt `loading`, bis der Kanal `subscribed` meldet — History allein genügt nicht | `liveKpiStreamStore.vitest.ts` (`it.fails`, `// G33`) | `status` ist `live` (o. mind. nicht `loading`), sobald Daten da sind | G33 |
| B | Release löscht Entry sofort — kein Aufbewahrungsfenster, Remount fetzt neu | `liveKpiStreamStore.vitest.ts` (`it.fails`, `// G33`) | `history` nach Re-acquire ohne Refetch vorhanden | G33 |
| C | Kein `getSnapshot` — nicht `useSyncExternalStore`-fähig | `liveKpiStreamStore.vitest.ts` (`it.fails`, `// G33`) | `getSnapshot(kpiId)` mit stabiler Referenz | G33 |

**Bug-Bindung nachgewiesen (A, 10.09., danach revertiert):** temporär `status: 'live'`
im History-`.then()` gesetzt → `it.fails(A)` wurde **rot** (Assertion besteht
plötzlich). Dabei wurde zusätzlich ein grüner Test rot (`status loading` nach
History-Resolve) — **G33 muss beide Stellen umstellen** (A→`it` + grüne Erwartung
auf `live`). Revert verifiziert (Diff leer, Tests wieder grün).

Hinweis B-Lage: B liegt als `it.fails` in den Store-Tests (Store-Verhalten, kein
DOM). Die ui-Datei dokumentiert das Remount-Verhalten zusätzlich grün
(beobachtend, ohne Wertung).

## 4. Coverage (scharf nur liveKpi + hooks, global 0)

`vitest.config.ts`: `perFile: true`, global 0/0/0/0, Glob-Keys
`src/services/liveKpi/**` + `src/hooks/**` je `{ lines: 90, branches: 80,
functions: 80, statements: 80 }`. Stand: alle 8 Dateien erfüllen die Schwelle
(`liveKpiStreamStore.ts` ≥ 90 % Zeilen). Rest (`data`, `db`, `import`) → G36/G43.

## 5. Werkzeug-Entscheidungen

- **Vitest 4 kennt kein `environmentMatchGlobs`** (aus G31-Config entfernt) →
  `test.projects`: `unit` (node) + `ui` (jsdom), Alias `@` pro Projekt gesetzt
  (wird nicht vererbt).
- **jsdom `^27` → `^25` gepinnt** (Marc-Entscheid): 27 zieht kaputte CSS-Kette
  (`@asamuzakjp/css-color` CJS requirt `@csstools/css-calc` ESM-only) —
  Worker-Crash, ohne Dep-Eingriff unlösbar. Nur dieser Pin, keine neue Dep.
- **`vitest.setup.ts`**: `@testing-library/jest-dom` nur unter jsdom (braucht
  globales `expect`, im Setup explizit bereitgestellt) + `matchMedia`-Polyfill.
- **Kein `vi.mock` auf den Store** (verboten, eingehalten); erlaubt und genutzt:
  Adapter-Injektion (Store-Tests), `vi.mock` auf `liveKpiReadAdapter`
  (Hook-Tests) bzw. `supabaseClient` (Adapter-Tests).
