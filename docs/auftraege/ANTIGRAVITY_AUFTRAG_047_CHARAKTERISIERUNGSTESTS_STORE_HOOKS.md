# AUFTRAG 047 / Gate G32 — Charakterisierungstests für Store & Hooks

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** Freigabe-Commit aus G31 (`bdb5102`)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md` (Phase 1)

## Ziel

Ein Sicherheitsnetz für G33 und G34 spannen. Der Realtime-KPI-Stream-Store
(`src/services/liveKpi/liveKpiStreamStore.ts`) und die Hooks
(`src/hooks/useLiveKpi*.ts`, `useReducedMotion.ts`) werden in G33/G34 substanziell
umgebaut (`useSyncExternalStore`, ein Kanal statt zwölf, Bugfixes). Vorher muss
**maschinell festgehalten sein, wie sie sich heute verhalten** — inklusive der drei
bekannten Fehler.

## Verbindliche Entscheidungen

1. **Test-only. Null Produktänderung.** Keine Nicht-Test-Datei unter
   `src/services/liveKpi/` und `src/hooks/` wird geändert — auch keine Zeile, auch
   nicht „nur zum Testbarmachen". Der Store hat bereits eine Injektions-Schnittstelle
   (`createLiveKpiStreamStore(customAdapter?: LiveKpiStreamAdapter)`, ca. Zeile 97) —
   die wird benutzt. **Kein `vi.mock` auf den Store selbst.**
2. **Charakterisierung heißt: beschreiben, was ist — nicht, was sein soll.** Die
   grünen Tests dokumentieren das aktuelle Verhalten samt Eigenheiten. Ausnahme:
   die drei Rot-Nachweise (Punkt 3).
3. **Die drei bekannten Fehler werden als `it.fails()` festgehalten.** Vitest kehrt
   `it.fails(name, fn)` um: grün, solange die Assertion **fehlschlägt** (= der Bug
   existiert). Sobald G33/G34 den Bug behebt, wird `it.fails` **rot** und zwingt
   den Builder, es auf ein normales `it()` umzustellen. So wird der Rot-Nachweis
   automatisch zum Regressionswächter. Jeder der drei bekommt einen Kommentar
   `// G33: nach Fix zu it() umstellen` (bzw. G34).
4. **Coverage-Schwellen nur für die zwei abgedeckten Verzeichnisse scharf.**
   `src/services/liveKpi/**` und `src/hooks/**` auf `perFile: true`, Zeilen ≥ 90 %.
   Der Rest von `src/services/**` (data, db, import) bleibt in diesem Gate auf
   Schwelle 0 — er wird in G36 (TanStack Query) und einem späteren Pass Richtung
   G43-Abnahme abgedeckt, **nicht hier**. Das Plan-DoD „services/ + hooks/ ≥ 90 %"
   ist ein V2.2.0-Endzustand, kein G32-Auftrag.
5. **`npm run verify` bleibt unberührt** (Legacy-Harness, Parallelbetrieb).

## Grenzen und Schutzbereiche

- Unverändert (Diff muss leer sein): `src/services/liveKpi/*.ts` (Nicht-Test),
  `src/hooks/*.ts`, `src/**` außerhalb der neuen Testordner, `supabase/**`,
  `tools/n8n/**`, `public/**`, `scripts/**`, `.github/**`, `e2e/**`.
- Keine neue npm-Abhängigkeit (Testing-Library ist seit G31 installiert).
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `src/services/liveKpi/__tests__/**` | Neu: Store-Charakterisierung + 2 Rot-Nachweise (A, C) |
| `src/hooks/__tests__/**` | Neu: Hook-Charakterisierung + 1 Rot-Nachweis (B) bzw. dort wo er hingehört |
| `vitest.config.ts` | `coverage.thresholds` für die zwei Verzeichnisse scharf (`perFile`, ≥ 90 %) |
| `vitest.setup.ts` | jsdom-Setup: `@testing-library/jest-dom` (nur jsdom), `matchMedia`-Polyfill |
| `docs/CHARACTERIZATION_G32.md` | Neu: die drei Rot-Nachweise dokumentiert (Bug, Testdatei, erwartetes Verhalten nach Fix, Zielgate) |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_047_CHARAKTERISIERUNGSTESTS_STORE_HOOKS.md` | Diese Quelle; nach Umsetzung nur Status pflegen |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Seam prüfen (kein Code ändern)

- [ ] `src/services/liveKpi/liveKpiStreamStore.ts` lesen. Bestätigen:
      `createLiveKpiStreamStore(customAdapter?: LiveKpiStreamAdapter)` existiert und
      `interface LiveKpiStreamAdapter` definiert die Methoden, über die der Store
      Historie lädt und den Realtime-Kanal abonniert.
- [ ] Die Stellen lokalisieren (Zeilennummern in `CHARACTERIZATION_G32.md` notieren):
      - wo `status: 'live'` gesetzt wird (nur im Kanal-`subscribed`-Pfad, **nicht**
        im History-`.then()`) → Rot-Nachweis A
      - die `release`-Logik bei `refCount === 0` (löscht den Entry sofort) → Rot-Nachweis B
      - `getState(kpiId)` (gibt bei jedem Aufruf ein **frisches** Objekt zurück,
        kein `getSnapshot`) → Rot-Nachweis C

### 2. Test-Adapter

- [ ] Einen `FakeLiveKpiStreamAdapter` bauen, der die `LiveKpiStreamAdapter`-Schnittstelle
      erfüllt und dem Test volle Kontrolle gibt:
      - `fetchHistory`: Promise, das der Test manuell auflöst (`resolveHistory(points)`)
      - `subscribe`: gibt dem Test Handles auf die `onEvent`- und
        `onConnectionStatus`-Callbacks, damit der Test „Kanal meldet `subscribed`"
        bzw. „Snapshot trifft ein" gezielt auslöst
      - deterministisch, keine echten Timer/Netzwerk
- [ ] Jeder Test nutzt `createLiveKpiStreamStore(fakeAdapter)` — **nicht** den
      Singleton `liveKpiStreamStore`.

### 3. Grüne Charakterisierungstests (Store)

Beschreiben den Ist-Zustand. Mindestens:
- [ ] `acquire` → `getState` liefert `status: 'unconfigured'` bzw. `'loading'` initial
- [ ] History-Promise löst auf → `getState().history` enthält die Punkte (≤ 30, Reihenfolge)
- [ ] Kanal meldet `subscribed` → `status` wird `'live'`, `fetchLatest` wird nachgeladen
- [ ] `onEvent(snapshot)` → `getState().snapshot` aktualisiert, Listener werden benachrichtigt
- [ ] Kanal meldet `error` / `offline` → `status`/`error` entsprechend
- [ ] `refCount`: zwei `acquire` auf dieselbe ID teilen einen Entry; erst das zweite
      `release` räumt auf (`subscription.unsubscribe()` wird aufgerufen)
- [ ] Nicht unterstützte `kpiId` → dokumentiertes Verhalten

### 4. Die drei Rot-Nachweise (`it.fails()`)

- [ ] **A — Status bleibt auf `loading` hängen.** Adapter: History löst mit Punkten
      auf, Kanal meldet **nie** `subscribed`. Erwartung (korrekt): `getState().status`
      ist `'live'` (oder mindestens nicht `'loading'`), sobald Daten da sind.
      `it.fails('...(BUG: bleibt loading bis Kanal subscribed) // G33: nach Fix zu it()')`
- [ ] **B — Historie geht bei kurzem Unmount verloren.** `acquire` → History laden →
      `release` (refCount 0) → **sofort** wieder `acquire`. Erwartung (korrekt):
      `getState().history.length > 0` ohne erneuten Fetch (Aufbewahrungsfenster).
      `it.fails('...(BUG: Entry sofort gelöscht, history leer) // G33: nach Fix zu it()')`
- [ ] **C — Kein stabiler Snapshot / nicht `useSyncExternalStore`-fähig.** Erwartung
      (korrekt): der Store bietet ein `getSnapshot(kpiId)`, das bei unveränderter
      State **dieselbe Referenz** liefert und bei Änderung eine neue.
      `it.fails('...(BUG: getSnapshot fehlt; getState liefert jedes Mal frisches Objekt) // G33: nach Fix zu it()')`
      Konkret: `expect(store.getSnapshot).toBeTypeOf('function')` **oder**
      `expect(store.getState(id)).toBe(store.getState(id))` — beides schlägt heute fehl.

### 5. Hook-Tests (`@testing-library/react`, jsdom)

Dateien als `*.ui.vitest.ts` (die `environmentMatchGlobs`-Regel in `vitest.config.ts`
weist `src/**/*.ui.vitest.ts` → jsdom zu).

- [ ] `useLiveKpi` / `useLiveKpiHistory` / `useLiveKpiActivity` mit `renderHook`:
      Mount → Initialwert; Store-Update → Hook re-rendert mit neuem Wert; Unmount →
      `release` wird aufgerufen (kein Leak).
      *(Diese Hooks binden an den Singleton. Für die Hook-Tests entweder den
      Singleton über die vorhandene Adapter-Injektion beim Modul-Setup ersetzen —
      falls ein sauberer Weg ohne Produktänderung existiert — oder den realen
      Singleton gegen einen Fake-Adapter laufen lassen, den ein `vi.mock` auf
      `./liveKpiReadAdapter` liefert. `vi.mock` auf den **ReadAdapter** ist erlaubt,
      auf den **Store** nicht.)*
- [ ] `useReducedMotion`: `matchMedia` mocken → `true`/`false`, Media-Query-Change
      → Hook aktualisiert.

### 6. Coverage scharf schalten

- [ ] In `vitest.config.ts` `coverage.thresholds` so setzen, dass **nur**
      `src/services/liveKpi/**` und `src/hooks/**` mit `perFile: true` und
      `lines: 90` (branches/functions nach Machbarkeit, mind. 80) geprüft werden.
      Der globale Threshold bleibt 0. (Vitest: `thresholds['src/services/liveKpi/**']`
      und `thresholds['src/hooks/**']` als Glob-Keys.)
- [ ] `npm run test:coverage` muss die Schwelle für diese Dateien erreichen.
      `liveKpiStreamStore.ts` ≥ 90 % Zeilen ist das harte Kriterium.

## Pflicht-Verifikation

```bash
npm run test                # grün — die 3 it.fails() sind grün (Bugs vorhanden)
npm run test:coverage       # liveKpi/** + hooks/** ≥ 90 % Zeilen (perFile)
npm run verify              # 24/24 grün
npm run build               # Exit 0
npx tsc --noEmit            # ≤ 765
npm run lint                # ≤ 327
git diff --exit-code -- src/services/liveKpi/liveKpiStreamStore.ts src/services/liveKpi/liveKpiReadAdapter.ts src/services/liveKpi/liveKpiContract.ts src/services/liveKpi/liveKpiDefinitions.ts src/hooks supabase tools/n8n public scripts .github e2e
```

Der letzte Befehl muss **leeren Diff** liefern — alle Nicht-Test-Produktdateien unverändert.

## Builder-Bericht und Commit

Abschnitt **„Gate G32 – Auftrag 047: Charakterisierungstests Store & Hooks"** an den
Anfang von `docs/BUILD_LOG.md` mit:

- Baseline und Arbeits-Commit
- Anzahl grüner Charakterisierungstests + Coverage-Zahl je Datei
- Die drei Rot-Nachweise: Bug, Testname, `it.fails`-Status grün, Zielgate
- Nachweis, dass alle genannten Nicht-Test-Dateien unverändert sind (leerer Diff)
- Command-Matrix mit Exit-Codes

Ein fokussierter Commit, z. B.:

```bash
git commit -m "test(g32): characterization tests for live-kpi store and hooks + 3 red-proofs"
```

## Akzeptanzkriterien für die Prüfung

- Kein Nicht-Test-Diff in `src/services/liveKpi/`, `src/hooks/`, `scripts/`, `.github/`, `e2e/`.
- `liveKpiStreamStore.ts` Zeilen-Coverage ≥ 90 %; jede Hook-Datei ≥ 90 %.
- Genau drei `it.fails()`-Rot-Nachweise (A, B, C), jeweils mit `// G33`-Kommentar und
  in `CHARACTERIZATION_G32.md` beschrieben. Prüfer verifiziert stichprobenartig,
  dass mindestens einer davon nach einem manuellen, danach revertierten Fix
  **rot** wird (also echt an den Bug gebunden ist).
- `npm run test`, `npm run verify`, `npm run build` grün; tsc ≤ 765; lint ≤ 327.
- Coverage-Schwelle greift nur für die zwei Verzeichnisse, global bleibt 0.

**Abnahme:** Erst nach unabhängigem Review ist Gate G32 freigegeben.
Kein Merge, Tag oder Push.

---

## Nachtrag (2026-09-10) — jsdom-Blocker

**Befund (OpenCode):** jsdom 27 (in G31 installiert) zieht eine kaputte CSS-Kette
(`@asamuzakjp/css-color` CJS ↔ `@csstools/css-calc` ESM-only) — Upstream-Regression,
lässt die jsdom-Tests nicht starten. Zusätzlich ist `environmentMatchGlobs` in
Vitest 4 entfernt → `test.projects`-Workspace ist ohnehin nötig.

**Entscheidung (Marc):**

1. **jsdom auf `^25` pinnen.** In `package.json` nur den `jsdom`-Versionswert von
   `^27.x` auf `^25.x` ändern, `npm install` für den Lockfile. **Keine weitere
   Dependency-Änderung, kein happy-dom.** jsdom 25 ist mit Vitest 4 + Testing-Library 16
   + React 18 erprobt; kein G31-Feature nutzt jsdom-26/27-spezifisches.
   → `package.json`, `package-lock.json` sind hiermit **erlaubte Dateien** für
   diesen einen Pin.
2. **`vitest.config.ts` von `environmentMatchGlobs` auf `test.projects` umstellen**
   (Vitest-4-Pflicht) — innerhalb der ohnehin erlaubten Datei.
3. **Die drei Rot-Nachweise A/B/C laufen in der node-Umgebung**, nicht in jsdom.
   Alle drei sind Store-Verhalten (`createLiveKpiStreamStore(fake)` +
   `acquire`/`release`/`getState`/`getSnapshot`), kein DOM nötig. Sie liegen in
   `src/services/liveKpi/__tests__/` (node). jsdom braucht es **nur** für die
   Happy-Path-Charakterisierung von `useLiveKpi*` / `useReducedMotion`.
   → Der jsdom-Blocker darf die Rot-Nachweise nie aufhalten.
