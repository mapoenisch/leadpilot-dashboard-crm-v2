# AUFTRAG 048 / Gate G33 — useSyncExternalStore und Store-Bugfixes

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** Freigabe-Commit aus G32 (`dcdbcb8`)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md` (Phase 1)

## Ziel

Den Realtime-KPI-Zugriff **tearing-sicher** machen und die drei in G32 als
`it.fails` festgehaltenen Store-Fehler beheben. Das Netz dafür (108 grüne Tests +
3 Rot-Nachweise A/B/C) liegt seit G32. Der `it.fails`-Mechanismus zwingt die
Umstellung: sobald ein Bug behoben ist, wird sein `it.fails` **rot** und muss auf
`it()` umgestellt werden.

**Die sichtbare Oberfläche ändert sich nicht.** G33 ist ein Klempner-Umbau —
Nutzer sehen exakt dasselbe. Das wird per Playwright-Screenshot-Vergleich gegen
die **bestehenden** Baselines bewiesen (kein `--update-snapshots`).

## Verbindliche Entscheidungen

1. **Bearbeitet werden nur:** `src/services/liveKpi/liveKpiStreamStore.ts`, die drei
   Hooks `src/hooks/useLiveKpi.ts` / `useLiveKpiHistory.ts` / `useLiveKpiActivity.ts`,
   und die zugehörigen Testdateien. **Nichts sonst unter `src/`** — insbesondere
   **keine** Komponente unter `src/components/liveKpi/**` (Konsumenten: `LiveKpiCard`,
   `StreamingAreaChart`, `LiveArrMixDonut`, `LiveFunnelBarChart`, `LiveActivityFeed`).
2. **Öffentliche Hook-Signaturen bleiben bytegleich.** `useLiveKpi(kpiId)` gibt
   weiter `{ snapshot, status, error, refresh }` zurück, `useLiveKpiHistory(kpiId)`
   `{ history, status, error }`, `useLiveKpiActivity(kpiIds, limit?)`
   `{ items, status }`. Nur die Interna wechseln. Kein Komponenten-Diff nötig.
3. **`useReducedMotion.ts` wird nicht angefasst** (kein Store-Hook, kein Tearing).
4. **Keine neue npm-Abhängigkeit.** `useSyncExternalStore` ist ein React-18-Hook
   (aus `react`). Falls für `useLiveKpiActivity` ein Selector-Mechanismus gebraucht
   wird: entweder eine store-seitige stabile Aggregat-/Versions-Schnittstelle
   (bevorzugt) oder `useSyncExternalStoreWithSelector` aus
   `use-sync-external-store/shim/with-selector` (transitiv über react-dom vorhanden).
   Ein **direkter** neuer Dependency-Eintrag → stoppen und Rückfrage.
5. **Kein `--update-snapshots`.** Ändert sich eine Playwright-Baseline, hat G33
   etwas Sichtbares verändert — das ist ein **Blocker**, kein „neu aufnehmen".

## Grenzen und Schutzbereiche

- Unverändert (Diff muss leer sein): `src/components/**`, `src/features/**`,
  `src/app/**`, `src/services/**` außer `liveKpiStreamStore.ts`, `src/hooks/useReducedMotion.ts`,
  `supabase/**`, `tools/n8n/**`, `public/**`, `scripts/**`, `.github/**`, `e2e/**`
  (inkl. aller `*-snapshots/`), `vitest.config.ts`, `package.json`, `package-lock.json`.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `src/services/liveKpi/liveKpiStreamStore.ts` | `getSnapshot` + Bugfixes A/B, `setTick`-losraum schaffen, `historyPromise` entfernen |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | **Nur** falls das `LiveKpiStreamAdapter`-Interface zwingend erweitert werden muss — mit Begründung im Bericht. Sonst unberührt. |
| `src/hooks/useLiveKpi.ts` · `useLiveKpiHistory.ts` · `useLiveKpiActivity.ts` | Umstellung auf `useSyncExternalStore`, `setTick` raus |
| `src/services/liveKpi/__tests__/**` | A/B/C-`it.fails` → `it()`; markierten grünen Test anpassen; Tests für Aufbewahrungsfenster + `getSnapshot`-Stabilität + neues Status-Verhalten |
| `src/hooks/__tests__/**` | Hook-Tests an `useSyncExternalStore` anpassen; kein `setTick` mehr |
| `docs/CHARACTERIZATION_G32.md` | Abschnitt „Stand nach G33": A/B/C jetzt grün als Regressionswächter |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_048_USESYNCEXTERNALSTORE_STORE_BUGFIXES.md` | Diese Quelle; nach Umsetzung nur Status pflegen |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Bugfix C — `getSnapshot` am Store

- [ ] `getSnapshot(kpiId: string): LiveKpiStreamState` ergänzen (im
      `LiveKpiStreamStore`-Interface Z. ~29–34 **und** der Implementierung).
      Rückgabe muss **referenzstabil** sein: solange sich `snapshot`, `history`,
      `status`, `error` eines Entrys nicht ändern, liefert `getSnapshot` bei
      jedem Aufruf **dieselbe Objektreferenz** (`Object.is` true). Bei echter
      Änderung eine **neue** Referenz.
      → Pro Entry einen `stateCache` halten, der nur bei tatsächlicher Änderung
      neu gebaut wird (nicht bei jedem `getState`/`getSnapshot`-Aufruf).
- [ ] `getServerSnapshot` bereitstellen (SPA ohne SSR — ein stabiler „leerer"
      State genügt, oder `= getSnapshot`). Ohne diesen wirft `useSyncExternalStore`
      in manchen Pfaden.
- [ ] Für einen **nicht acquired** `kpiId` einen stabilen Default-State liefern
      (nicht bei jedem Aufruf ein frisches Objekt) — sonst Endlosschleife im Hook.
- [ ] `it.fails('C: getSnapshot fehlt …')` → `it('C: getSnapshot referenzstabil …')`.
      Neue Assertions: `store.getSnapshot(id) === store.getSnapshot(id)` bei
      unveränderter State; **neue** Referenz nach `onEvent`/History-Resolve.

### 2. Bugfix A — Status nach History-Fetch

- [ ] Im History-`.then()` (CHARACTERIZATION_G32 Z. 162–179): nach dem Setzen von
      `history` **auch `status` auf `'live'`** setzen — **aber nur**, wenn die
      History **mindestens einen Punkt** enthält. Leere History → Status bleibt
      wie bisher (`'loading'` bis Kanal). Diese Regel im Bericht festhalten.
- [ ] Den in G32 markierten **grünen** Charakterisierungstest umstellen (er
      erwartet aktuell `status === 'loading'` nach History-Resolve → jetzt
      `'live'` bei nichtleerer History).
- [ ] `it.fails('A: … bleibt loading (BUG)')` → `it('A: History da → status live …')`.
- [ ] Verhalten prüfen: Kanal meldet danach `error`/`offline` → `status`/`error`
      werden weiterhin korrekt überschrieben (kein „live" klebt fest).

### 3. Bugfix B — Aufbewahrungsfenster bei `refCount === 0`

- [ ] `release` (CHARACTERIZATION_G32 Z. 290–296): bei `refCount <= 0` den Entry
      **nicht sofort löschen**. Stattdessen:
      - den Realtime-Kanal **sofort** abbestellen (`subscription.unsubscribe()`) —
        kein WebSocket für unmontierte Komponenten;
      - `state` (history, snapshot) **behalten**;
      - einen Lösch-Timer über **60 s** (`RETENTION_MS`) starten.
- [ ] `acquire` innerhalb der 60 s für dieselbe `kpiId`:
      - Lösch-Timer abbrechen;
      - Entry + `state` wiederverwenden (history/snapshot bleiben);
      - Realtime-Kanal neu abonnieren;
      - History im Hintergrund auffrischen (optional, aber `history` darf nicht
        leer werden, bevor die Auffrischung da ist).
- [ ] Timer nach 60 s: Entry löschen, alles aufräumen. Kein Leak — der Timer wird
      bei erneutem `release`/`acquire` sauber verwaltet.
- [ ] Testbarkeit: `RETENTION_MS` als Konstante; Tests mit `vi.useFakeTimers()`.
- [ ] `it.fails('B: … history leer (BUG)')` → `it('B: Re-acquire < 60 s → history ohne Refetch da')`.
      Zusätzlicher Test: nach `> 60 s` **wird** neu gefetcht (Fenster abgelaufen).

### 4. `setTick`-Hack raus, Hooks auf `useSyncExternalStore`

Für `useLiveKpi`, `useLiveKpiHistory`:

- [ ] `subscribe` = `useCallback((onStoreChange) => { const release = store.acquire(kpiId); const unsub = store.subscribe(kpiId, onStoreChange); return () => { unsub(); release(); }; }, [kpiId])`
- [ ] `getSnapshot` = `useCallback(() => store.getSnapshot(kpiId), [kpiId])`
- [ ] `const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
- [ ] Rückgabe daraus ableiten — Signatur exakt wie bisher. `refresh` bei
      `useLiveKpi` bleibt (`useCallback(() => store.refresh(kpiId), [kpiId])`).
- [ ] `const [, setTick] = useState(0)` und die `setTick`-Aufrufe **entfernen**.

Für `useLiveKpiActivity(kpiIds, limit)`:

- [ ] Mehrere IDs: `subscribe` acquired/subscribed **alle** gültigen IDs, Cleanup
      löst alle. `getSnapshot` muss referenzstabil sein.
- [ ] **Tearing/Endlosschleife vermeiden:** Die Aggregation (Filter, Dedup,
      5-Felder-Mapping, Sortierung, Limit-Clamp) erzeugt bei jedem Aufruf ein
      neues Array. Lösung — **eine** davon, im Bericht begründen:
      - (bevorzugt) store-seitige stabile Aggregat- oder Versions-Schnittstelle:
        `getSnapshot` liefert einen billigen stabilen Wert (z. B. eine
        monoton steigende `version`), die `items` werden im Hook per `useMemo`
        über `[version, ...validKpiIds, limit]` berechnet;
      - oder `useSyncExternalStoreWithSelector` mit eigenem `isEqual` auf die
        `items`.
- [ ] Status-Priorität `live > loading > error > offline` (G32-Befund) unverändert.

### 5. `historyPromise` entfernen

- [ ] `historyPromise` ist toter Zustand (gesetzt, nie gelesen/erwartet). Zuerst
      per Grep bestätigen, dass es nirgends konsumiert wird, dann Feld + alle
      Zuweisungen entfernen.

## Pflicht-Verifikation

```bash
npm run test                 # grün — A/B/C jetzt als it() grün, kein it.fails mehr für diese drei
npm run test:coverage        # liveKpi/** + hooks/** weiter ≥ Schwelle (perFile), EXIT 0
npm run verify               # 24/24 grün
npm run build                # Exit 0
npx tsx scripts/verifyLivePerformanceSurface.ts   # grün, unverändert
npx playwright test          # grün gegen die BESTEHENDEN Baselines (kein --update-snapshots)
npx tsc --noEmit             # ≤ 765
npm run lint                 # ≤ 327
git diff --exit-code -- src/components src/features src/app src/services/data src/services/db src/services/import src/hooks/useReducedMotion.ts supabase tools/n8n public scripts .github e2e vitest.config.ts package.json package-lock.json
grep -rn "setTick\|historyPromise" src/services/liveKpi src/hooks   # muss leer sein
grep -rln "useSyncExternalStore" src/hooks                          # 3 Treffer
```

Der `git diff --exit-code` muss **leer** sein — außerhalb Store/Hooks/Tests/Docs
wurde nichts angefasst. `grep setTick|historyPromise` leer. `grep useSyncExternalStore`
= 3.

## Builder-Bericht und Commit

Abschnitt **„Gate G33 – Auftrag 048: useSyncExternalStore & Store-Bugfixes"** an den
Anfang von `docs/BUILD_LOG.md` mit:

- Baseline und Arbeits-Commit
- A/B/C: je Bug die konkrete Codeänderung, das umgestellte `it()` und ggf. der
  mitgeänderte grüne Test
- Regel-Entscheidungen: Status nur bei nichtleerer History `live`; `RETENTION_MS = 60000`;
  gewählter Aggregations-Mechanismus für `useLiveKpiActivity` mit Begründung
- Nachweis „keine optische Änderung": `verifyLivePerformanceSurface.ts` grün +
  Playwright gegen unveränderte Baselines grün
- Command-Matrix mit Exit-Codes; `git diff` leer außerhalb der erlaubten Dateien

Ein fokussierter Commit, z. B.:

```bash
git commit -m "fix(g33): useSyncExternalStore in live hooks + fix status/retention/getSnapshot"
```

## Akzeptanzkriterien für die Prüfung

- Die drei G32-Rot-Nachweise (A/B/C) sind jetzt `it()` **und grün**. Prüfer
  verifiziert stichprobenartig: Bug A oder B **wieder einbauen** → der jetzt grüne
  Test wird **rot** → revert.
- `npx playwright test` grün gegen die **committeten** Baselines — keine
  `*-snapshots/`-Datei im Diff. Beweist: keine sichtbare Änderung.
- `verifyLivePerformanceSurface.ts` grün, unverändert.
- Öffentliche Hook-Rückgaben bytegleich; `src/components/liveKpi/**` unverändert.
- Kein `setTick`, kein `historyPromise` mehr; `useSyncExternalStore` in allen drei Hooks.
- `npm run verify` 24, `npm run build` 0, tsc ≤ 765, lint ≤ 327, Coverage ≥ Schwelle.
- `git diff --exit-code` leer für alle Nicht-(Store/Hooks/Tests/Docs)-Dateien.

**Abnahme:** Erst nach unabhängigem Review ist Gate G33 freigegeben.
Kein Merge, Tag oder Push.
