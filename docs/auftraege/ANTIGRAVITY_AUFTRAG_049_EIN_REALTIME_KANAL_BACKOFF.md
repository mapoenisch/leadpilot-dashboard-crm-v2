# AUFTRAG 049 / Gate G34 — Ein Realtime-Kanal statt zwölf + Reconnect-Backoff

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** Freigabe-Commit aus G33 (`78ae9d4`)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md` (Phase 1)

## Ziel

Heute öffnet die App **einen Supabase-Realtime-Kanal pro abonnierter KPI-ID**
(`subscribeToLiveKpi(kpiId, …)`, serverseitiger Filter `kpi_id=eq.<id>`). Die
Live-Fläche nutzt bis zu 12 KPIs gleichzeitig → bis zu 12 gleichzeitige
WebSocket-Kanäle **pro geöffnetem Tab**.

G34 macht daraus **einen** Kanal auf `public.live_kpi_public_feed` (ohne
`kpi_id`-Filter). Der Store verteilt jedes eintreffende Event anhand von
`snapshot.kpiId` an den passenden Entry. Dazu kommt ein **exponentielles
Reconnect-Backoff** mit Jitter und 30-s-Deckel.

**Die sichtbare Oberfläche ändert sich nicht.** Genau wie G33 ist das ein
Klempner-Umbau — Nutzer sehen exakt dasselbe. Beweis: Playwright-Screenshots
gegen die **bestehenden** Baselines (kein `--update-snapshots`).

## Verbindliche Entscheidungen

1. **Bearbeitet werden nur:** `src/services/liveKpi/liveKpiReadAdapter.ts`,
   `src/services/liveKpi/liveKpiStreamStore.ts` und die zugehörigen Testdateien.
   **Nichts sonst unter `src/`** — keine Komponente, kein Feature, kein Hook
   (die Hooks gehen über den Store; falls doch ein Hook `subscribeToLiveKpi`
   direkt importiert → im Bericht begründen, minimal halten).
2. **`LiveKpiReadStatus` bleibt bytegleich:** `'unconfigured' | 'loading' |
   'live' | 'offline' | 'error'`. **Keine** neuen Statuswerte für Komponenten.
   Der feinere Verbindungszustand (`connecting` / `live` / `reconnecting` /
   `offline`) wird über eine **separate** Store-Methode
   `getFeedConnectionState()` bereitgestellt — für spätere Nutzung (G28-Ops),
   **nicht** an die UI verdrahtet. Mapping auf die bestehenden Statuswerte:
   - `connecting` / `reconnecting` → für acquired Entries als `'loading'`
     (solange noch kein Snapshot/History-Daten da), sonst Status unverändert lassen
   - `live` (Kanal `subscribed`) → wie bisher `'live'`
   - `offline` → `'offline'`
   - Backoff erschöpft / harter Fehler → `'error'`
3. **Keine neue npm-Abhängigkeit.** Backoff mit `setTimeout` + `Math.random`.
   Die Delay-Berechnung als **reine, exportierte Funktion** `computeBackoffDelay(attempt)`
   (direkt unit-testbar).
4. **Ein Kanal, Lebensdauer an „irgendein Entry mit `refCount > 0`" gekoppelt.**
   Erster acquire (egal welche KPI) → Feed-Kanal auf; wenn kein Entry mehr
   `refCount > 0` hat → Feed-Kanal zu. Entries im 60-s-Aufbewahrungsfenster
   (G33) zählen **nicht** — ihr Kanal war ohnehin schon getrennt.
5. **Kein `--update-snapshots`.** Ändert sich eine Playwright-Baseline, hat G34
   etwas Sichtbares verändert → **Blocker**.
6. **Event-Semantik-Tradeoff dokumentieren:** Der ungefilterte Kanal empfängt
   Inserts **aller** KPIs; Events für nicht beobachtete KPIs werden client-seitig
   verworfen (`entries.get(kpiId)` leer → ignorieren). Das ist der Zweck (1 statt
   12 Verbindungen), kein Bug.

## Grenzen und Schutzbereiche

- Unverändert (Diff muss leer sein): `src/components/**`, `src/features/**`,
  `src/app/**`, `src/hooks/**` (siehe Entscheidung 1), `src/services/**` außer
  den zwei genannten liveKpi-Dateien, `supabase/**`, `tools/n8n/**`, `public/**`,
  `scripts/**`, `.github/**`, `e2e/**` (inkl. `*-snapshots/`), `vitest.config.ts`,
  `package.json`, `package-lock.json`.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | `subscribeToLiveKpi` → `subscribeToLiveKpiFeed`; ein ungefilterter Kanal; `computeBackoffDelay`; Backoff-Scheduler |
| `src/services/liveKpi/liveKpiStreamStore.ts` | `LiveKpiStreamAdapter`-Interface anpassen; ein Feed-Abo, Event-Routing per `kpiId`, Status-Propagation an alle acquired Entries; `getFeedConnectionState()` |
| `src/services/liveKpi/__tests__/**` | Fakes an das neue Interface; „genau 1 Kanal bei 12 KPIs"-Test; Backoff-Tests (`computeBackoffDelay` + simulierter Abbruch) |
| `src/hooks/__tests__/**` | **Nur** falls Hook-Tests das alte Interface mocken — an das neue anpassen |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_049_EIN_REALTIME_KANAL_BACKOFF.md` | Diese Quelle; nach Umsetzung nur Status pflegen |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Read Adapter — ein Feed-Kanal + Backoff

- [ ] `subscribeToLiveKpiFeed(onEvent, onStatus)` ersetzt `subscribeToLiveKpi`:
      - **ein** `supabase.channel('live-kpi-feed')` auf `postgres_changes` /
        `INSERT` / `public.live_kpi_public_feed` **ohne** `filter`
      - jede Insert-Zeile via `mapRowToSnapshot` → `onEvent(snapshot)` (Snapshot
        trägt seine `kpiId`)
      - `onStatus`-Meldungen: `'connecting'` (beim `channel.subscribe()`-Start),
        `'live'` (`SUBSCRIBED`), `'reconnecting'` (nach Abbruch, während Backoff
        wartet), `'offline'` (unkonfiguriert / bewusst getrennt)
- [ ] Unkonfiguriert (`isLiveKpiReadConfigured()` false): `onStatus('offline')`,
      `unsubscribe` = No-op — genau wie das heutige Verhalten.
- [ ] **Backoff:** bei `CHANNEL_ERROR` / `TIMED_OUT` / unerwartetem `CLOSED`
      (nicht user-initiiert): Kanal abbauen, `onStatus('reconnecting')`,
      nach `computeBackoffDelay(attempt)` einen frischen `channel.subscribe()`
      versuchen. Bei `SUBSCRIBED`: `attempt = 0` zurücksetzen, `onStatus('live')`.
- [ ] `computeBackoffDelay(attempt: number): number` — rein, exportiert:
      Basis `1000`, Faktor `2`, Deckel `30000`; **Jitter** (equal jitter:
      `half + random*half`, mit `half = min(cap, base*2**attempt)/2`). Genaues
      Schema im Bericht.
- [ ] `unsubscribe()` bricht einen laufenden Backoff-Timer ab und entfernt den Kanal.

### 2. Store — ein Abo, Routing, Status

- [ ] `LiveKpiStreamAdapter`-Interface: `subscribeToLiveKpi(kpiId, …)` →
      `subscribeToLiveKpiFeed(onEvent: (s: LiveKpiSnapshot) => void, onStatus: (s: FeedConnectionState) => void): LiveKpiSubscription`.
- [ ] Ein modul-lokales `feedSubscription: LiveKpiSubscription | null` +
      `feedRefCount` (Anzahl Entries mit `refCount > 0`).
- [ ] `ensureFeedSubscription()`: wenn `feedRefCount` von 0 auf 1 geht →
      `adapter.subscribeToLiveKpiFeed(routeEvent, propagateStatus)`.
      `maybeReleaseFeedSubscription()`: wenn `feedRefCount` auf 0 fällt →
      `feedSubscription.unsubscribe()`, `feedSubscription = null`.
      In `acquire` (auch im Re-acquire-Zweig aus G33) und `makeRelease`
      entsprechend aufrufen. Das bisherige `attachSubscription`/`detachSubscription`
      pro Entry entfällt.
- [ ] `routeEvent(snapshot)`: `const entry = entries.get(snapshot.kpiId)` — wenn
      vorhanden **und** `refCount > 0`: dieselbe Tie-Breaking-/Merge-Logik wie der
      heutige per-KPI-`onEvent` (neuer → `snapshot` + `history` + `status:'live'`;
      sonst nur `history`-Merge). Kein Entry → verwerfen.
- [ ] `propagateStatus(feedState)`: `feedConnectionState = feedState` merken
      (für `getFeedConnectionState()`), dann auf **alle** Entries mit
      `refCount > 0` das Mapping aus Entscheidung 2 anwenden (via `commit`, damit
      `version`/`cachedSnapshot` konsistent bleiben).
- [ ] Der `subscribed`→`fetchLatestLiveKpi`-Nachzug aus G33 bleibt: bei
      `feedState === 'live'` einmal `fetchLatestLiveKpi` je acquired KPI
      nachladen (oder gebündelt — im Bericht begründen).
- [ ] `getFeedConnectionState(): 'connecting' | 'live' | 'reconnecting' | 'offline'`
      neu im Interface + Implementierung. Default ohne Abo: `'offline'`.

### 3. Tests

- [ ] **Genau 1 Kanal bei 12 KPIs:** 12 verschiedene unterstützte kpiIds
      `acquire` → `fakeAdapter.subscribeToLiveKpiFeed` **genau 1×** aufgerufen,
      `unsubscribe` 0×. Nach `release` **aller** 12 → `unsubscribe` **genau 1×**.
- [ ] **Routing:** Feed emittiert ein Event für KPI „mrr" → nur der „mrr"-Entry
      ändert sich, „arr" unberührt. Event für nicht-acquired KPI → nichts passiert,
      kein Fehler.
- [ ] **Status-Propagation:** Feed meldet `reconnecting` → alle acquired Entries
      spiegeln das gemäß Mapping; `getFeedConnectionState()` liefert `'reconnecting'`.
- [ ] **`computeBackoffDelay`:** Sequenz für `attempt = 0..7` — Untergrenzen
      `500, 1000, 2000, 4000, 8000, 15000, 15000, 15000`, Obergrenzen
      `1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000` (equal jitter),
      nie über 30000, monoton bis zum Deckel.
- [ ] **Backoff-Ablauf (fake timers):** simulierter `CHANNEL_ERROR` → nach
      `computeBackoffDelay(0)` neuer `subscribe`-Versuch; erneuter Fehler → Delay
      steigt; `SUBSCRIBED` → `attempt` zurück auf 0, nächster Fehler startet
      wieder klein.
- [ ] G32/G33-Charakterisierungstests, die das alte `subscribeToLiveKpi` mockten,
      auf `subscribeToLiveKpiFeed` umstellen — Verhaltensaussagen bleiben gleich.

## Pflicht-Verifikation

```bash
npm run test                 # grün, inkl. 1-Kanal- + Backoff-Tests
npm run test:coverage        # liveKpi/** + hooks/** ≥ Schwelle (perFile), EXIT 0
npm run verify               # 24/24 grün
npm run build                # Exit 0
npx tsx scripts/verifyLivePerformanceSurface.ts   # grün, unverändert
npx playwright test          # grün gegen die BESTEHENDEN Baselines (kein --update-snapshots)
npx tsc --noEmit             # ≤ 765
npm run lint                 # ≤ 327
grep -rn "subscribeToLiveKpi\b" src            # 0 — nur noch subscribeToLiveKpiFeed
git diff --exit-code -- src/components src/features src/app src/hooks src/services/data src/services/db src/services/import supabase tools/n8n public scripts .github e2e vitest.config.ts package.json package-lock.json
```

`git diff --exit-code` muss **leer** sein. `grep subscribeToLiveKpi\b` (Wortgrenze,
ohne `Feed`) muss **0** ergeben. Keine `*-snapshots/`-Datei im Diff.

## Builder-Bericht und Commit

Abschnitt **„Gate G34 – Auftrag 049: Ein Realtime-Kanal + Reconnect-Backoff"** an
den Anfang von `docs/BUILD_LOG.md` mit:

- Baseline und Arbeits-Commit
- Vorher/Nachher: Kanäle pro 12-KPI-Fläche (12 → 1), Nachweis per Test
- `computeBackoffDelay`-Schema (Basis/Faktor/Deckel/Jitter) + die getestete Sequenz
- Feed-Lebensdauer-Regel (`feedRefCount`), Status-Mapping-Tabelle
- Event-Semantik-Tradeoff (ungefilterter Kanal, client-seitiges Verwerfen)
- Nachweis „keine optische Änderung": Surface-Verifier grün + Playwright gegen
  unveränderte Baselines grün
- Command-Matrix mit Exit-Codes; `git diff` leer außerhalb der erlaubten Dateien

Ein fokussierter Commit, z. B.:

```bash
git commit -m "fix(g34): single realtime feed channel + exponential reconnect backoff"
```

## Akzeptanzkriterien für die Prüfung

- Ein Test beweist: **genau 1** `subscribeToLiveKpiFeed`-Aufruf bei 12 acquired
  KPIs, `unsubscribe` erst nach dem letzten `release`.
- `computeBackoffDelay` ist rein, exportiert und deckt die Sequenz inkl.
  30-s-Deckel + Jitter-Grenzen ab; ein Backoff-Ablauf-Test mit fake timers zeigt
  wachsende Delays und Reset bei `SUBSCRIBED`.
- `LiveKpiReadStatus` unverändert; `src/components/**`, `src/hooks/**` unverändert;
  Playwright-Baselines unverändert (kein `e2e/`-Diff); Surface-Verifier grün.
- `getFeedConnectionState()` liefert `connecting|live|reconnecting|offline`
  (nicht an die UI verdrahtet).
- `grep subscribeToLiveKpi\b src` = 0. `npm run verify` 24, `build` 0,
  tsc ≤ 765, lint ≤ 327, Coverage ≥ Schwelle.
- Prüfer-Spot-Check: 12 KPIs acquiren, Kanalzahl zählen (== 1); oder den
  1-Kanal-Test gezielt sabotieren (z. B. Feed pro KPI abonnieren) → Test wird rot.

**Abnahme:** Erst nach unabhängigem Review ist Gate G34 freigegeben.
Kein Merge, Tag oder Push.
