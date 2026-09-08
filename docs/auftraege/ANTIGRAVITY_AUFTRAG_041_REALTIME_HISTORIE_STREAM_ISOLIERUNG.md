# Auftrag 041: Realtime-Historie und Stream-Isolierung

> **Für Antigravity:** Dieser Auftrag wird seriell auf einem eigenen Arbeitsbranch auf Basis von `2cba81b` bearbeitet. Lies vor dem ersten Edit `CLAUDE.md`, `ARCHITECTURE_DECISIONS.md`, `docs/BUILD_LOG.md`, `docs/auftraege/ANTIGRAVITY_AUFTRAG_040_LIVE_KPI_KATALOG_MULTI_KPI_PIPELINE.md` und diese Datei vollständig. Ändere ausschließlich die unten benannten Dateien. Nach Abschluss folgt der Builder-Bericht; Codex prüft anschließend unabhängig. Kein Merge, Tag oder Push.

**Version:** V2.1.0
**Phase:** Live Performance – Datenfluss
**Gate:** G25
**Status:** BEREIT ZUR PRÜFUNG
**Baseline:** `2cba81b` (`docs(g24): align local status and fix arr_mix group in build log`)
**Architekturquelle:** `docs/superpowers/specs/2026-09-08-v2-1-live-performance-design.md`
**Vorgänger:** G24 auf `2cba81b` ist freigegeben.

## 1. Ziel

Schaffe den isolierten, wiederverwendbaren Datenfluss für die spätere V2.1-Live-Oberfläche: Je KPI-ID gibt es genau einen referenzgezählten Realtime-Stream, einen aktuellen sicheren Snapshot und höchstens 30 chronologisch geordnete sichere Historienpunkte. Daraus entstehen schlanke React-Selector-Hooks für Historie und Aktivität. Bestehende Verbraucher von `useLiveKpi()` bleiben kompatibel.

Dies ist ein Datenfluss-Auftrag ohne neue sichtbare Dashboard-Oberfläche, Chart, Animation, Route, Datenbankmigration, RLS-Änderung oder externe Integration. Es werden keine Live-Werte erfunden und keine externen Testzugänge vorausgesetzt.

## 2. Verbindliche Architektur

### 2.1 Vertrauens- und Daten-Grenze

- Der Browser liest weiterhin ausschließlich `public.live_kpi_public_feed` über `liveKpiReadAdapter.ts`.
- Der Adapter selektiert ausschließlich `id`, `kpi_id`, `value`, `unit`, `occurred_at`, `quality_status`, `source_system`, `ingested_at`.
- Niemals in den Browser, Store, Hooks oder Verifier übernehmen: `context`, `event_id`, `correlation_id`, `source_reference`, Rejection-Daten, Credentials oder Roh-Event-Payloads.
- Der generische Contract `live-kpi-event/v1`, der n8n-Ingest-Workflow, `src/types/liveKpi.ts`, Schema, RLS und Supabase-Client bleiben unverändert.
- Nur IDs aus `isSupportedLiveKpiId()` dürfen eine Read-/Subscription-Layer erhalten. Unbekannte IDs erzeugen keinen Query und keinen Kanal; die Hooks melden dafür einen sicheren leeren/`unconfigured`-Zustand.

### 2.2 Zeitordnung und Kapazität

Ein Snapshot ist neuer als ein anderer, wenn sein Paar `(occurredAt, ingestedAt)` lexikografisch größer ist. Beide Werte sind ISO-8601-Zeitstempel mit Zeitzone; bei gleichem `occurredAt` entscheidet also deterministisch `ingestedAt`. Ältere oder exakt gleiche Events dürfen weder den aktuellen Snapshot überschreiben noch als neuer Punkt in der Historie erscheinen.

Historie bedeutet pro KPI ausschließlich die letzten **maximal 30** eindeutigen Snapshots, aufsteigend nach `(occurredAt, ingestedAt)` sortiert. Bei Überlauf wird der älteste Punkt entfernt. Der Initial-Read darf höchstens 30 Punkte liefern; der Store darf diese Grenze zu keinem Zeitpunkt überschreiten.

### 2.3 Stream-Eigentümerschaft und React-Isolierung

- `liveKpiStreamStore.ts` besitzt als einzige neue Schicht pro KPI den Initial-Read, die Realtime-Subscription, Snapshot, Historie, Status und Ref-Count.
- Zwei oder mehr Abonnenten derselben KPI-ID teilen denselben Adapter-Stream. Erst der Übergang von Ref-Count `1` auf `0` beendet diesen Stream genau einmal.
- Verschiedene KPI-IDs bleiben vollständig getrennt: kein globaler Event-Bus, kein globaler Context/Redux-Store, keine seitenweite Subscription und kein Polling (`setInterval`/`setTimeout`).
- Der Store exportiert nur sichere selektierbare Daten und eine Test-fähige Factory mit Adapter-Abhängigkeit. Hooks importieren nie den Supabase-Client und erzeugen keine eigene Supabase-Subscription.
- `useLiveKpi()` wird ein Kompatibilitäts-Wrapper für den Snapshot-/Status-Selector. Seine bestehende öffentliche Rückgabe (`snapshot`, `status`, `error`, `refresh`) bleibt erhalten.

### 2.4 Öffentliche G25-Schnittstellen

```ts
// src/services/liveKpi/liveKpiReadAdapter.ts
export async function fetchLiveKpiHistory(
  kpiId: string,
  sinceIso: string,
  limit: number,
): Promise<LiveKpiSnapshot[]>;

// src/services/liveKpi/liveKpiStreamStore.ts
export interface LiveKpiStreamState {
  snapshot: LiveKpiSnapshot | null;
  history: readonly LiveKpiSnapshot[];
  status: LiveKpiReadStatus;
  error: Error | null;
}

export interface LiveKpiStreamStore {
  acquire(kpiId: string): () => void;
  getState(kpiId: string): LiveKpiStreamState;
  subscribe(kpiId: string, listener: () => void): () => void;
  refresh(kpiId: string): Promise<void>;
}

export function createLiveKpiStreamStore(adapter?: LiveKpiStreamAdapter): LiveKpiStreamStore;
export const liveKpiStreamStore: LiveKpiStreamStore;

// src/hooks/useLiveKpiHistory.ts
export function useLiveKpiHistory(kpiId: string): {
  history: readonly LiveKpiSnapshot[];
  status: LiveKpiReadStatus;
  error: Error | null;
};

// src/hooks/useLiveKpiActivity.ts
export interface LiveKpiActivityItem {
  kpiId: string;
  value: number;
  unit: string;
  occurredAt: string;
  qualityStatus: 'valid' | 'degraded';
}
export function useLiveKpiActivity(kpiIds: readonly string[], limit?: number): {
  items: readonly LiveKpiActivityItem[];
  status: LiveKpiReadStatus;
};
```

`LiveKpiActivityItem` darf nur die fünf oben aufgeführten Felder enthalten. Insbesondere `id`, `sourceSystem`, `ingestedAt`, Fehlertexte und jede Roh-Metadatenstruktur bleiben außerhalb des Activity-Selectors.

## 3. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_041_REALTIME_HISTORIE_STREAM_ISOLIERUNG.md` | Diese Auftragsquelle; nach Umsetzung nur Status-Checkboxen pflegen. |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | Sichere, begrenzte Historien-Abfrage ergänzen; bestehende Query-/Subscription-Grenze wahren. |
| `src/services/liveKpi/liveKpiStreamStore.ts` | Neuer referenzgezählter Store mit safe Snapshot, Historie und Lifecycle. |
| `src/hooks/useLiveKpi.ts` | Bestehende API als Kompatibilitäts-Wrapper auf den Store umstellen. |
| `src/hooks/useLiveKpiHistory.ts` | Neuer, nur Historie/Status/Error selektierender Hook. |
| `src/hooks/useLiveKpiActivity.ts` | Neuer, sicherer Aktivitäts-Selector über explizit übergebene Katalog-IDs. |
| `scripts/verifyLiveKpiStream.ts` | Deterministischer lokaler G25-Verifier mit Fake-Adapter; kein Netzwerk. |
| `docs/BUILD_LOG.md` | Neuer Builder-Bericht nach grünem Gate. |

Keine andere Datei ändern. Besonders unverändert bleiben:

- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/**`, `src/features/resources/**`
- `src/components/**`, `src/features/overview/**`, `src/styles/**`, `supabase/**`, `package.json`
- `tools/n8n/**`, der generische Ingest-Workflow, CRM-/Baseline-Pfade und alle G24-Dateien außer ihrer Nutzung per Import.

## 4. Verbindliche Umsetzung

### 4.1 Erst den Verifier schreiben (rot)

Lege `scripts/verifyLiveKpiStream.ts` **vor** Store und neuen Hooks an. Der Verifier muss die Store-Factory mit einem reinen Fake-Adapter ausführen können; der Fake zeichnet `fetchHistory`-, `subscribe`- und `unsubscribe`-Aufrufe auf und kann Events sowie Kanalzustände kontrolliert auslösen. Keine echte Supabase-Instanz, kein Netzwerk und keine Zeitabhängigkeit.

Der Rot-Test muss vor `liveKpiStreamStore.ts` mit einem Modulauflösungsfehler enden. Nach der Implementierung prüft der Verifier hart:

1. **Katalog-Grenze:** `arr` kann erworben werden; `unknown_kpi` erzeugt keine History-Abfrage und keine Subscription.
2. **Shared Stream:** Zwei `acquire('arr')`-Aufrufe führen exakt zu einem Initial-Read und einer Subscription für `arr`; der Ref-Count wird erst nach beiden Releases null.
3. **Deterministischer Cleanup:** Das erste Release entfernt keinen Kanal. Das zweite Release ruft exakt einmal `unsubscribe()` auf. Ein weiteres Release bleibt ohne Wirkung.
4. **KPI-Isolierung:** `arr` und `mrr` erhalten je einen eigenen Stream; ein ARR-Event ändert niemals MRR-Snapshot oder -Historie.
5. **Tie-Breaking:** Ein Event mit älterem `occurredAt` darf den aktuellen Snapshot nicht ersetzen. Bei gleichem `occurredAt` darf nur größerer `ingestedAt` ersetzen. Exakt gleiche Paare sind Duplikate.
6. **Historie:** Initiale und eingehende Punkte sind aufsteigend nach `(occurredAt, ingestedAt)` sortiert, dedupliziert und stets höchstens 30 lang. Nach 31 gültigen neuen Punkten ist der älteste entfernt.
7. **Status/Fehler:** `subscribed` führt zu `live`; `offline` und `error` bleiben pro KPI lokal. Ein Read-Fehler setzt `error` und macht weder eine zweite KPI noch andere Listener kaputt.
8. **Activity-Form:** Der abgeleitete Activity-Eintrag hat exakt `kpiId`, `value`, `unit`, `occurredAt`, `qualityStatus`; `id`, `sourceSystem`, `ingestedAt`, `error`, `context`, `eventId` und `correlationId` dürfen nicht enthalten sein.
9. **Statische Isolation:** Nur `liveKpiReadAdapter.ts` importiert `@/services/db/supabaseClient`; Store und alle drei Hooks enthalten keine direkte oder relative Supabase-Client-Referenz. Store/Hooks enthalten kein Polling.

Führe den Rot-Test aus und halte den tatsächlichen Modulfehler im Builder-Bericht fest:

```bash
npx tsx scripts/verifyLiveKpiStream.ts
```

### 4.2 Sichere Historienabfrage im Adapter

Ergänze ausschließlich `fetchLiveKpiHistory(kpiId, sinceIso, limit)` in `liveKpiReadAdapter.ts`.

- Leite den effektiven Wert aus `Math.min(30, Math.max(1, Math.floor(limit)))` ab. Ein ungültiger oder nicht-endlicher Limit-Wert ist ein Fehler und darf nicht zu einer ungebundenen Abfrage führen.
- Ist Supabase nicht konfiguriert, liefert die Funktion ein leeres Array.
- Query nur gegen `live_kpi_public_feed`, mit der bestehenden sicheren Spaltenliste, `.eq('kpi_id', kpiId)`, `.gte('occurred_at', sinceIso)`, `.order('occurred_at', { ascending: true })`, `.order('ingested_at', { ascending: true })` und `.limit(effectiveLimit)`.
- Mappe jede Zeile mit dem bestehenden internen `mapRowToSnapshot`; verwirf ungültige Zeilen. Gib nur gültige `LiveKpiSnapshot[]` zurück.
- Bei Query-/Netzwerkfehlern `throw new Error(...)`, analog zu `fetchLatestLiveKpi()`; nie stillschweigend `[]` als Fehlerersatz zurückgeben.
- Weder `fetchLatestLiveKpi()` noch `subscribeToLiveKpi()` funktional verschlechtern oder die bestehende sichere Select-Liste aufweiten.

### 4.3 Referenzgezählten Store implementieren

Erstelle `src/services/liveKpi/liveKpiStreamStore.ts`. Die Factory akzeptiert einen optionalen `LiveKpiStreamAdapter`, dessen Default-Implementierung nur die vier Adapter-Funktionen `isLiveKpiReadConfigured`, `fetchLatestLiveKpi`, `fetchLiveKpiHistory` und `subscribeToLiveKpi` delegiert. So bleibt der Verifier frei von Supabase und kann Lifecycle-Verhalten direkt beweisen.

Für jede unterstützte KPI-ID hält der Store privat genau einen Eintrag aus State, Listener-Set, Ref-Count und Subscription. Beim ersten `acquire()`:

1. unkonfiguriert: State auf `unconfigured`, ohne Query/Kanal;
2. konfiguriert: State auf `loading`, dann eine begrenzte Historienabfrage für die letzten 30 Minuten bis jetzt mit Limit 30 und genau eine Subscription;
3. wenn History fertig ist: nach Zeitordnung in State übernehmen; der neueste History-Punkt darf als initialer Snapshot dienen;
4. eingehende Events nur nach der in Abschnitt 2.2 definierten Ordnung übernehmen und Listener benachrichtigen;
5. sobald der Kanal `subscribed` meldet: neuesten Snapshot kontrolliert nachladen, aber niemals einen neueren Stream-Punkt durch einen älteren Read ersetzen;
6. bei `error` und `offline`: nur State dieser KPI aktualisieren; der Fehlertext bleibt Store-intern bzw. im Snapshot-Hook, nicht im Activity-Selector.

`refresh(kpiId)` nutzt ausschließlich den sicheren Latest-Read, wahrt Tie-Breaking und ist für unbekannte IDs ein sicherer No-op. Jeder State-Übergang benachrichtigt nur Listener dieser KPI. Nach dem letzten Release: Subscription lösen, Listener-Referenzen des Eintrags leeren und den Eintrag aus der Map entfernen, damit ein späterer erster Erwerb sauber neu initialisiert.

### 4.4 Hook-Selektoren und Rückwärtskompatibilität

- Stelle `useLiveKpi(kpiId)` auf `liveKpiStreamStore.acquire()`, `subscribe()` und `getState()` um. Behalte die öffentliche `UseLiveKpiResult`-Form inklusive `refresh()` bei. Keine eigene Subscription, keine lokale Doppelhaltung von Snapshot/Status und keine direkte Adapter- oder Supabase-Nutzung.
- Implementiere `useLiveKpiHistory(kpiId)` mit einem einzelnen Store-Acquire und Store-Subscribe. Rückgabe ausschließlich `history`, `status`, `error`; keine Kopie oder Sortierung im Hook.
- Implementiere `useLiveKpiActivity(kpiIds, limit = 10)` als selektierenden Hook. Filtere zuerst mit `isSupportedLiveKpiId`, dedupliziere IDs in Eingabereihenfolge, erwerbe nur diese Streams und vereinige ihre aktuellen Snapshots. Sortiere absteigend nach `(occurredAt, ingestedAt)`, begrenze auf `Math.min(10, Math.max(1, Math.floor(limit)))` und mappe anschließend in exakt `LiveKpiActivityItem`.
- Für leere oder ausschließlich unbekannte IDs sind `items: []` und `status: 'unconfigured'` verpflichtend. Ein einzelner Fehler darf nicht den Inhalt anderer gültiger KPI-Streams verdecken; der Activity-Status ist `live`, wenn mindestens ein gewählter Stream live ist, sonst `loading`, `offline`, `error` oder `unconfigured` nach seinem tatsächlichen Gesamtzustand.
- React Strict Mode darf keinen doppelten dauerhaften Kanal hinterlassen: Cleanup muss jedes Acquire genau einmal releasen.

### 4.5 Keine UI vorziehen

In diesem Gate weder `LiveKpiCard.tsx` noch das Dashboard, Styles oder Chart-Komponenten ändern. Data Pulse, Count-up, Ring-, Balken- und Streaming-Chart gehören ausschließlich in Auftrag 042 / G26, sobald diese geprüften Selector-Hooks vorliegen.

## 5. Explizit nicht enthalten

- Keine Supabase-Migration, Schema-/RLS-/RPC-/Realtime-Publication-Änderung.
- Kein Browser-Schreibzugriff, keine Live-Event-Injektion und kein externer E2E-Lauf.
- Kein Context/Redux/Zustand auf Seitenebene und kein Polling.
- Kein UI-Fallback mit Fixture-Werten, keine Route, keine Screenshot-Matrix und keine Animation.
- Keine Änderung am Katalog, an den G24-Fixtures oder an `src/types/liveKpi.ts`.
- Kein Tag, Push, Merge nach `main` oder Versionswechsel.

## 6. Verifikation und Gate G25

Vor dem Builder-Bericht vollständig und mit Exit 0 ausführen:

```bash
npx tsx scripts/verifyLiveKpiStream.ts
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLiveKpiContract.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 2cba81b..HEAD
git diff --exit-code 2cba81b..HEAD -- src/simulation src/types src/context src/services/data src/services/db src/features/resources src/components src/features/overview src/styles supabase package.json tools/n8n
```

Zusätzlich schriftlich nachweisen:

- Der Rot-Test vor `liveKpiStreamStore.ts` ist ausgeführt und fehlgeschlagen.
- Der Verifier beweist zwei Abonnenten → genau einen Kanal und Ref-Count-Cleanup.
- Der Verifier beweist Zeitordnung/Tie-Breaking sowie die feste 30-Punkte-Grenze.
- Der Adapter liest ausschließlich die sichere Projektion und die Activity-Rückgabe enthält nur ihre fünf erlaubten Felder.
- Keine UI-Datei und kein Schutzbereich wurden geändert; es wird kein externer Test-Erfolg behauptet.
- Der Schutzbereichs-Diff ist exakt leer.

## 7. Builder-Abschlussbericht

Ergänze ans Ende von `docs/BUILD_LOG.md` einen Abschnitt **„Gate G25 – Auftrag 041: Realtime-Historie und Stream-Isolierung“** mit Ziel/Kontext, allen geänderten Dateien, dem öffentlichen Store-/Hook-Vertrag, Rot-/Grün-Testnachweis, Shared-Stream-/Lifecycle-Beweis, Zeitordnungs-/30-Punkte-Beweis, vollständiger Command-Matrix, Schutzbereichs-Diff und dem Ergebnis `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

Erst danach einen einzelnen, fokussierten Commit erstellen, zum Beispiel:

```bash
git commit -m "feat(live-kpi): add isolated realtime history stream store for Gate G25"
```

Weder `main`, Release-Tag noch Remote verändern.
