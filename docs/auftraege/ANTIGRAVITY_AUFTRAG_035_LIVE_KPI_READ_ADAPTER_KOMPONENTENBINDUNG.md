# Auftrag 035: Isolierter Live-KPI-Client, sichere Realtime-Projektion und Komponentenbindung

> **Für ausführende Agenten:** Dieser Auftrag wird seriell bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Builder-Bericht wird in `docs/BUILD_LOG.md` festgehalten; erst danach erfolgt der unabhängige Codex-Review.

**Phase:** Phase 4 – Reale Integrationen & Live-Datenfluss
**Gate:** G19
**Status:** BEREIT ZUR AUSFÜHRUNG
**Baseline:** `63e0c8b` (`docs(build-log): set Gate G18 top status to approved (4336d9c)`)
**Planquelle:** `docs/BUILD_PLAN_V2.0.0.md`, Phase 4, Auftrag 035 / Gate G19
**Architektur:** `ARCHITECTURE_DECISIONS.md` (Ebene A: historisch, read-only; Ebene B: Simulation, deterministisch; Ebene C: Live-Ist, getrennt)

---

## 1. Ziel & Kontext

Baue einen isolierten Live-KPI-Read-Adapter, `useLiveKpi(kpiId)` und eine V2-konforme `LiveKpiCard` auf `/dashboard`.

Die Live-Karte zeigt ausschließlich Ebene C und ersetzt keine historische Kennzahl. Ohne konfiguriertes Supabase oder ohne Live-Wert zeigt sie einen ehrlichen, nicht alarmistischen Status — niemals einen erfundenen Wert.

Der Browser darf niemals direkt `public.live_kpi_events` lesen oder abonnieren: Diese Tabelle enthält den optionalen Rohkontext eines akzeptierten Events. Stattdessen wird eine strikt minimierte, sichere Projektionstabelle `public.live_kpi_public_feed` bereitgestellt.

---

## 2. Sicherheitsarchitektur der Datenbank

1. **Projektionstabelle `public.live_kpi_public_feed`:**
   - Spalten:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `kpi_id TEXT NOT NULL`
     - `value NUMERIC NOT NULL`
     - `unit TEXT NOT NULL`
     - `occurred_at TIMESTAMPTZ NOT NULL`
     - `quality_status TEXT NOT NULL`
     - `source_system TEXT NOT NULL`
     - `ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()`
   - Explizit: Kein `context`, kein `event_id`, kein `correlation_id`, keine Rejection-Daten, keine Secrets.
   - Index auf `(kpi_id, occurred_at DESC)`.

2. **Triggerfunktion & Trigger auf `public.live_kpi_events`:**
   - Trigger `AFTER INSERT ON public.live_kpi_events FOR EACH ROW EXECUTE FUNCTION public.project_live_kpi_to_public_feed();`.
   - Die Triggerfunktion läuft als gehärtete `SECURITY DEFINER`-Funktion mit `SET search_path = pg_catalog;` und verwendet vollqualifizierte Tabellennamen (`public.live_kpi_public_feed`).
   - Zwingender Rechteentzug:
     `REVOKE EXECUTE ON FUNCTION public.project_live_kpi_to_public_feed() FROM PUBLIC, anon, authenticated, n8n_ingest;`

3. **Row Level Security (RLS) & Berechtigungen:**
   - `ALTER TABLE public.live_kpi_public_feed ENABLE ROW LEVEL SECURITY;`
   - Ausschließlich `SELECT` für `anon` und `authenticated`:
     `CREATE POLICY "allow_anon_authenticated_read" ON public.live_kpi_public_feed FOR SELECT TO anon, authenticated USING (true);`
   - Keine `INSERT`-, `UPDATE`- oder `DELETE`-Rechte für Browserrollen (`REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_kpi_public_feed FROM anon, authenticated, PUBLIC, n8n_ingest;`).
   - Keine Rechte für `n8n_ingest` auf `public.live_kpi_public_feed`.
   - `public.live_kpi_rejections` und `public.live_kpi_events` bleiben für Browserrollen vollständig unzugänglich.

4. **Realtime-Publication:**
   - Idempotentes Hinzufügen zu `supabase_realtime`:
     ```sql
     DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_kpi_public_feed'
       ) THEN
         ALTER PUBLICATION supabase_realtime ADD TABLE public.live_kpi_public_feed;
       END IF;
     END;
     $$;
     ```

5. **Schema-Synchronisation:**
   - Migration `supabase/migrations/20260907_live_kpi_read_layer.sql` und `supabase/schema.sql` müssen funktional identisch sein.

---

## 3. Frontend Live-Read-Adapter & Hook

1. **`src/services/liveKpi/liveKpiReadAdapter.ts`:**
   - Einzige Datei unter allen neu angelegten oder im Rahmen von G19 geänderten Dateien, die `supabase` importiert (bestehende Imports wie CRM-Seeder bleiben unberührt).
   - Exportiert mindestens:
     ```ts
     export type LiveKpiReadStatus = 'unconfigured' | 'loading' | 'live' | 'offline' | 'error';

     export interface LiveKpiSnapshot {
       id: string;
       kpiId: string;
       value: number;
       unit: string;
       occurredAt: string;
       qualityStatus: 'valid' | 'degraded';
       sourceSystem: string;
       ingestedAt: string;
     }

     export interface LiveKpiSubscription {
       unsubscribe(): void;
     }

     export async function fetchLatestLiveKpi(
       kpiId: string,
     ): Promise<LiveKpiSnapshot | null>;

     export function subscribeToLiveKpi(
       kpiId: string,
       onEvent: (snapshot: LiveKpiSnapshot) => void,
       onConnectionStatus: (status: 'subscribed' | 'offline' | 'error') => void,
     ): LiveKpiSubscription;
     ```

2. **`src/hooks/useLiveKpi.ts`:**
   - Initialer Snapshot beim Mount / bei `kpiId`-Wechsel.
   - Statusmodell: `'unconfigured' | 'loading' | 'live' | 'offline' | 'error'`.
   - Behandelt Channel-Status explizit:
     - `SUBSCRIBED`: aktuellen Snapshot erneut laden und Status `live` setzen.
     - `CHANNEL_ERROR` oder `TIMED_OUT`: Status `error`.
     - `CLOSED`: Status `offline`.
     - Unmount oder KPI-Wechsel: exakt einmal `unsubscribe()` ausführen (keine Leaks).

3. **`src/components/liveKpi/LiveKpiCard.tsx`:**
   - Isolierte V2-Karte für Ebene C (`Card variant="glass"`).
   - Re-rendert isoliert bei Events, ohne umliegende Komponenten zu triggern (`React.memo`).
   - Statusdarstellung:
     - `unconfigured`: Ehrlicher, ruhiger Status ("Supabase nicht konfiguriert – Ebene C inaktiv").
     - `loading`: Subtiler Ladezustand.
     - `live`: Live-Wert, Einheit, Zeitstempel, Datenquelle, optional Degraded-Warnung.
     - `offline`: "Warte auf Live-Events (Ebene C)".
     - `error`: Subtile Fehlermeldung.

4. **`src/features/overview/pages/ExecutiveDashboardPage.tsx`:**
   - Eine `LiveKpiCard` ergänzen.
   - Historische Karten (Ebene A: EXEC_KPIS_1, EXEC_KPIS_2, Charts, Summary) bleiben unverändert.

---

## 4. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_035_LIVE_KPI_READ_ADAPTER_KOMPONENTENBINDUNG.md` | Diese Auftragsspezifikation. |
| `supabase/migrations/20260907_live_kpi_read_layer.sql` | Sichere Projektion, Trigger, RLS, Grants, Realtime-Publication. |
| `supabase/schema.sql` | G19-Struktur synchron ergänzen. |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | Einziger Browser-Zugriff auf die sichere Projektion. |
| `src/hooks/useLiveKpi.ts` | Initialer Snapshot, Subscription, Cleanup, Statusmodell. |
| `src/components/liveKpi/LiveKpiCard.tsx` | Isolierte V2-Karte für Ebene C. |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | Eine LiveKpiCard ergänzen, historische Karten unverändert lassen. |
| `src/styles/global.css` | Nur falls nötig, ausschließlich Klassen mit Präfix `live-kpi-`. |
| `scripts/verifyLiveKpiReadLayer.ts` | Statischer und lokaler G19-Audit. |
| `scripts/captureAuftrag035GateScreenshots.mjs` | Screenshot- und Deep-Link-Harness für `/dashboard`. |
| `scripts/generateAuftrag035ScreenshotMatrix.mjs` | SHA-256-Matrix. |
| `docs/screenshots/auftrag-035/README.md` | Matrix und Nachweise. |
| `docs/BUILD_LOG.md` | Builder-Bericht. |

Keine anderen Dateien ändern. Insbesondere unverändert:
- `src/simulation/**`
- `src/types/**`
- `src/context/**`
- `src/services/data/**`
- `src/services/db/supabaseClient.ts`
- `src/features/resources/**`
- bestehende CRM-Baselines, Seed- und Repository-Pfade
- G18-Migration und G18-Vertrag

---

## 5. Verifikation & Gates

Vor Abschluss müssen folgende Gates fehlerfrei durchlaufen:
1. `npx tsx scripts/verifyLiveKpiReadLayer.ts` (G19-spezifischer Audit)
2. `npx tsx scripts/verifyLiveKpiContract.ts` (G18-Pipeline bleibt grün)
3. `npx tsc --noEmit` (0 TypeScript-Fehler)
4. `npm run verify` (25/25 Integritätssuiten bestanden)
5. `npx tsx scripts/testButtonLoading.ts` (12/12 Tests)
6. `npx tsx scripts/verifyNoModuleViewCascades.ts` (13/13 Views rein delegierend)
7. `npm run build` (Produktions-Build erfolgreich)
8. `git diff --check 63e0c8b` (0 Whitespace-Fehler)
9. `git diff --exit-code 63e0c8b -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources` (Exakt 0 Zeilen Schutzbereichs-Diff)
10. Screenshots vorher/nachher auf 1440px, 768px, 375px und 0px horizontaler Overflow.
