# ANTIGRAVITY AUFTRAG 016 — Datenquellen-Abstraktion & n8n-Offline-Fabrik

**Basis:** `BUILD_PLAN.md` Phase 2 · Befund C4-1 · `ARCHITECTURE_DECISIONS.md` **B22** + Entscheidungen 1601–1625
**Voraussetzung:** AUFTRAG 015 abgenommen (Gate G1).
**Was die App ist:** firmeninternes **Echtzeit-Dashboard eines fiktiven Unternehmens**, gespeist aus **austauschbaren Datenquellen** — heute simuliertes CRM + n8n-generierte Baselines, später theoretisch **eine oder mehrere echte Quellen** (HubSpot, Salesforce, Postgres, API).
**Abnahme:** Gate **G2**

**Leitplanken:**
1. Die Dashboard-UI hängt an einem quellen-agnostischen **Read-Model**, nie an einer konkreten Quelle.
2. Eine `DataSource` wird **nie direkt** von einem Simulationslauf gelesen — immer über einen eingefrorenen, versionierten Snapshot (`RunManifest.baselineVersion`).
3. **n8n läuft immer offline gegenüber der App** — es schreibt versionierte Artefakte, wird zur Laufzeit nicht aufgerufen.
4. Jetzt wird **nur die Naht** gebaut (Interfaces + Registry + Snapshotting). Reale Konnektoren, `CompositeDataSource`, echte `LiveFeed` = je eigener Auftrag.

---

## Schritt 1 — Read-Model & Datenquellen-Interfaces (NEU)

`src/types/dataSource.ts`:
```ts
import { Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from './crm';

export interface HistoricalActivity {
  id: string;
  companyId: string;
  contactId?: string;
  dealId?: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
  channel: string;
  timestamp: string;            // ISO, innerhalb [periodStart, periodStart + 365d]
  description: string;
  performedBy: string;
  status: string;
}

/** Quellen-agnostisches Read-Model, an dem die Dashboard-UI hängt. */
export interface CrmReadModel {
  companies: Company[];
  contacts: Contact[];
  deals: ImportedFunnelDeal[];
  activities: HistoricalActivity[];
  audit: ImportAuditSummary;
}

export interface DataSourceInfo {
  id: string;                                   // 'simulated-crm' | 'baseline-file' | 'supabase' | später 'hubspot'
  kind: 'simulated' | 'file' | 'external';
  label: string;
  description: string;
  supportsLiveFeed: boolean;
}

/** Batch-/Snapshot-Quelle. Grundlage für eine eingefrorene Baseline. */
export interface DataSource {
  readonly info: DataSourceInfo;
  fetchSnapshot(): Promise<CrmReadModel>;       // ein konsistenter Point-in-Time-Pull
}

/** Optionaler Echtzeit-Feed (Ebene C). Heute nur simuliert. */
export interface LiveDelta {
  at: string;
  changes: Array<{ entity: 'company' | 'contact' | 'deal' | 'activity'; id: string; op: 'add' | 'update' | 'remove'; payload?: unknown }>;
}
export type Unsubscribe = () => void;
export interface LiveFeed {
  readonly sourceId: string;
  subscribe(onDelta: (d: LiveDelta) => void): Unsubscribe;
}

export class DataSourceError extends Error {
  constructor(public code: 'UNKNOWN_SOURCE' | 'FETCH_FAILED' | 'INTEGRITY', message: string) {
    super(message); this.name = 'DataSourceError';
  }
}
```

---

## Schritt 2 — `DataSourceRegistry` (NEU)

`src/services/data/dataSourceRegistry.ts`:
```ts
import { DataSource, DataSourceError, DataSourceInfo } from '../../types/dataSource';

class Registry {
  private sources = new Map<string, DataSource>();
  private activeId: string | null = null;

  register(source: DataSource): void {
    this.sources.set(source.info.id, source);
    if (this.activeId === null) this.activeId = source.info.id;
  }
  list(): DataSourceInfo[] { return [...this.sources.values()].map(s => s.info); }
  get(id: string): DataSource {
    const s = this.sources.get(id);
    if (!s) throw new DataSourceError('UNKNOWN_SOURCE', `Datenquelle "${id}" ist nicht registriert.`);
    return s;
  }
  getActive(): DataSource { return this.get(this.activeId!); }
  setActive(id: string): void { this.get(id); this.activeId = id; }

  /** Ausbaustufe (eigener Auftrag): mehrere Quellen mergen. Hier bewusst noch nicht implementiert. */
  // composite(ids: string[], strategy: 'by-entity' | 'namespaced'): DataSource { ... }
}

export const dataSourceRegistry = new Registry();
```

---

## Schritt 3 — Zwei Quellen-Implementierungen (NEU)

### 3a. `SimulatedCrmSource` — der heutige Ausgangsdatensatz als Quelle

`src/services/data/sources/simulatedCrmSource.ts`:
```ts
import { DataSource, CrmReadModel } from '../../../types/dataSource';
import { importCrmData } from '../../import/crmImporter';

export const simulatedCrmSource: DataSource = {
  info: { id: 'simulated-crm', kind: 'simulated', label: 'Simuliertes CRM',
          description: 'Der validierte V1.0-Ausgangsdatensatz.', supportsLiveFeed: true },
  async fetchSnapshot(): Promise<CrmReadModel> {
    const d = importCrmData();
    return {
      companies: d.companies, contacts: d.contacts,
      deals: d.importedFunnelDeals, activities: (d as any).activities ?? [],
      audit: d.audit,
    };
  },
};
```

### 3b. `BaselineFileSource` — liest die versionierten n8n-Artefakte

`src/services/data/sources/baselineFileSource.ts`:
```ts
import { DataSource, CrmReadModel, DataSourceError } from '../../../types/dataSource';

const FILES: Record<string, () => Promise<any>> = {
  '2026-08-31-v1': () => import('../../../features/crm/data/baselines/baseline-2026-08-31-v1.json'),
  // neue n8n-Baselines hier ergänzen:
  // '2026-09-15-v2': () => import('../../../features/crm/data/baselines/baseline-2026-09-15-v2.json'),
};

export function makeBaselineFileSource(version: string): DataSource {
  return {
    info: { id: `baseline-file:${version}`, kind: 'file', label: `Baseline-Datei ${version}`,
            description: 'n8n-generierter, eingefrorener Datensatz.', supportsLiveFeed: false },
    async fetchSnapshot(): Promise<CrmReadModel> {
      const loader = FILES[version];
      if (!loader) throw new DataSourceError('UNKNOWN_SOURCE', `Baseline-Datei "${version}" fehlt.`);
      const mod = await loader();
      const ds = mod.default ?? mod;
      return { companies: ds.companies, contacts: ds.contacts, deals: ds.importedFunnelDeals,
               activities: ds.activities ?? [], audit: ds.audit };
    },
  };
}

export function listBaselineFileVersions(): string[] { return Object.keys(FILES); }
```

### 3c. Registrierung

`src/services/data/index.ts`:
```ts
import { dataSourceRegistry } from './dataSourceRegistry';
import { simulatedCrmSource } from './sources/simulatedCrmSource';
import { makeBaselineFileSource, listBaselineFileVersions } from './sources/baselineFileSource';

dataSourceRegistry.register(simulatedCrmSource);
for (const v of listBaselineFileVersions()) dataSourceRegistry.register(makeBaselineFileSource(v));
// aktive Quelle default = simulated-crm (erste Registrierung)

export { dataSourceRegistry };
```
Einmal früh importieren (z. B. in `src/app/App.tsx` oder `SimulationProvider`).

> **Hinweis Konnektoren:** ein `HubSpotSource` / `SupabaseSource` / `RestApiSource` implementiert nur `DataSource` (`info` + `fetchSnapshot` mit Adapter-Mapping auf `CrmReadModel`) und ruft `dataSourceRegistry.register(...)`. Kein anderer Code ändert sich. **Wird in diesem Auftrag NICHT gebaut.**

---

## Schritt 4 — `BaselineSnapshotService` (NEU) — Quelle → eingefrorene Version

`src/services/data/baselineSnapshotService.ts`:
```ts
import { CrmReadModel, DataSourceError } from '../../types/dataSource';
import { dataSourceRegistry } from './dataSourceRegistry';

export interface BaselineDataset extends CrmReadModel {
  version: string;             // z. B. 'baseline-simulated-crm-2026-08-31-v1'
  sourceId: string;
  capturedAt: string;          // aus systemContext.now()
  periodStart: string;         // '2026-01-01' (BASELINE_PERIOD_START)
  counts: { companies: number; contacts: number; deals: number; activities: number };
}

export class BaselineSnapshotService {
  private static frozen = new Map<string, BaselineDataset>();

  /** Pull der Quelle, Integritätsprüfung, Einfrieren unter versionierter ID. */
  static async capture(sourceId: string, version: string, periodStart: string, now: string): Promise<BaselineDataset> {
    const model = await dataSourceRegistry.get(sourceId).fetchSnapshot();
    this.assertIntegrity(model, periodStart);
    const ds: BaselineDataset = {
      ...model, version, sourceId, capturedAt: now, periodStart,
      counts: { companies: model.companies.length, contacts: model.contacts.length,
                deals: model.deals.length, activities: model.activities.length },
    };
    this.frozen.set(version, Object.freeze(ds));
    return ds;
  }

  static get(version: string): BaselineDataset {
    const ds = this.frozen.get(version);
    if (!ds) throw new DataSourceError('UNKNOWN_SOURCE', `Baseline-Version "${version}" nicht eingefroren.`);
    return ds;
  }
  static listFrozen(): string[] { return [...this.frozen.keys()]; }

  private static assertIntegrity(m: CrmReadModel, periodStart: string): void {
    const companyIds = new Set(m.companies.map(c => c.id));
    for (const ct of m.contacts)
      if (!companyIds.has(ct.companyId))
        throw new DataSourceError('INTEGRITY', `Contact ${ct.id} → unbekannte Company ${ct.companyId}.`);
    for (const d of m.deals)
      if ((d as any).companyId && !companyIds.has((d as any).companyId))
        throw new DataSourceError('INTEGRITY', `Deal ${(d as any).id} → unbekannte Company.`);
    const start = Date.parse(periodStart), end = start + 365 * 864e5;
    for (const a of m.activities) {
      const t = Date.parse(a.timestamp);
      if (t < start || t > end) throw new DataSourceError('INTEGRITY', `Activity ${a.id} außerhalb der Periode.`);
    }
  }
}
```

---

## Schritt 5 — Runs binden an eingefrorene Baseline

`src/simulation/scenarioService.ts` (`runScenarioVersion`, hat aus AUFTRAG 015 bereits `opts`):
```ts
import { BaselineSnapshotService } from '../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../services/data';
import { systemContext } from './systemContext';
import { BASELINE_PERIOD_START } from './constants';

// innerhalb runScenarioVersion, vor Manifest-Aufbau:
const sourceId = opts?.dataSourceId ?? dataSourceRegistry.getActive().info.id;
const baselineVersion =
  opts?.baselineVersion ??
  (await BaselineSnapshotService.capture(
     sourceId,
     `baseline-${sourceId}-${systemContext.now().slice(0,10)}`,
     BASELINE_PERIOD_START,
     systemContext.now(),
   )).version;

// RunManifest.baselineVersion = baselineVersion;
// Sim-Initialzustand aus BaselineSnapshotService.get(baselineVersion) ableiten
```
`RunOptions` (aus AUFTRAG 015) um `dataSourceId?: string` erweitern.

`reproduce()` reicht `existingRun.manifest.baselineVersion` weiter → alter Run läuft **immer** gegen seine Original-Baseline. Falls die Version nicht mehr im Speicher ist: aus der Datei (`baseline-file:<version>`) rekonstruieren, sonst `DataSourceError`.

> **`runScenarioVersion` wird dadurch async** (wegen `capture`). Aufrufer in `SimulationContext.tsx` (`runVersion`/`reRun`/`reproduce`) auf `await` umstellen; die Callbacks sind bereits `useCallback`-gewrappt.

---

## Schritt 6 — CRM-Lesepfad auf Registry, Schreib-Stubs entfernen

`src/services/db/crmRepository.ts`:
- `getCompanies` / `getContacts` / `getImportedFunnelDeals` / `getAuditSummary`: Supabase-Zweig unverändert; **Fallback** →
  ```ts
  return (await dataSourceRegistry.getActive().fetchSnapshot()).companies;   // bzw. .contacts / .deals / .audit
  ```
  `importCrmData()` / `this.localData` entfällt, sobald `simulatedCrmSource` alle Fallbacks trägt.
- **Entfernen:** `getLeads()`, `getDeals()`, `getActivities()`, `addLead()`, `updateLeadStatus()` und den Kommentar `// --- Stubs for Phase 3+ compatibility ---`. Falls Aufrufer existieren, mitentfernen.
  Alternative (falls Aufrufer schwer zu entfernen): je Methode
  ```ts
  static getLeads(): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
  ```
- `grep -rn 'getLeads\|getDeals\|getActivities\|updateLeadStatus\|addLead' src` danach leer bzw. nur `throw`-Zeilen.
- **Supabase als weitere Quelle (optional, sauber):** die Supabase-Zweige in eine `supabaseCrmSource: DataSource` auslagern und registrieren, statt sie in `crmRepository` zu verdrahten. Dann ist `crmRepository` nur noch dünner Pass-Through auf `dataSourceRegistry.getActive()`.

---

## Schritt 7 — n8n-Offline-Fabrik (Docker, liegt bereits)

Verzeichnis `tools/n8n/`:
- `generate-baseline.workflow.json` — exportierter Workflow
- `mulberry32.js` — dieselbe PRNG wie `src/simulation/prng.ts` (reproduzierbare Generierung im Function-Node)
- `README.md`

### Workflow-Nodes

1. **Manual Trigger** — Input:
   ```json
   { "version": "2026-09-15-v2", "seed": 424242,
     "counts": { "companies": 20, "contacts": 100, "deals": 40, "activities": 200 },
     "periodStart": "2026-01-01" }
   ```
2. **Function „generate"** (mulberry32-seed, in Reihenfolge, FKs immer auflösbar):
   - `companies[]` `co-<n>` — name, domain, industry (feste Liste), city/postalCode (DE-PLZ), employeeCount (log-normal)
   - `contacts[]` `ct-<n>` — companyId ∈ companies, firstName/lastName/email/jobTitle
   - `importedFunnelDeals[]` `fd-<n>` — companyId, stage (Verteilung: viel LEAD/MQL, wenig WON), value, pipeline
   - `activities[]` `ac-<n>` — companyId (+ optional contactId/dealId), type/channel, timestamp gleichverteilt in Periode
   - `audit` — Zählwerte
3. **Function „validate"** — jede FK auflösbar, `counts` == Array-Längen, alle timestamps in Periode. Sonst `throw`.
4. **Set** — Envelope: `{ version, generatedAt: $now, generator: "n8n", generatorSeed: seed, periodStart, counts, companies, contacts, importedFunnelDeals, activities, audit }`
5. **Write Binary File** — `/data/baselines/baseline-{{$json.version}}.json`, `JSON.stringify(_, null, 2)`

### Docker-Start (n8n liegt bereits lokal)

```bash
docker run -it --rm -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -v "$PWD/src/features/crm/data/baselines:/data/baselines" \
  n8nio/n8n
```
Workflow importieren, Trigger ausführen → schreibt `baseline-<version>.json` direkt ins Repo-Verzeichnis. **Kein HTTP-Call in die App.**

### Neue Baseline aktivieren

1. `baseline-<version>.json` liegt in `src/features/crm/data/baselines/`
2. Eintrag in `baselineFileSource.ts` `FILES` ergänzen → wird beim Boot automatisch als Quelle registriert
3. `npm run verify` → `016 - Data Sources` prüft die neue Version mit
4. optional in der UI als aktive Quelle wählen

---

## Schritt 8 — Integrity-Test

NEU `src/simulation/__tests__/dataSourceIntegrity.test.ts` → `runDataSourceTest()`:
```ts
import { dataSourceRegistry } from '../../services/data';
import { BaselineSnapshotService } from '../../services/data/baselineSnapshotService';
import { DataSourceError } from '../../types/dataSource';

export async function runDataSourceTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = []; let ok = true;

  ok = a(log, 'simulated-crm registriert', dataSourceRegistry.list().some(s => s.id === 'simulated-crm')) && ok;

  const snap = await BaselineSnapshotService.capture('simulated-crm', 'test-v1', '2026-01-01', '2026-01-01T00:00:00.000Z');
  ok = a(log, 'counts', snap.counts.companies === 20 && snap.counts.contacts === 100 && snap.counts.deals === 40) && ok;

  const companyIds = new Set(snap.companies.map(c => c.id));
  ok = a(log, 'contact->company refs', snap.contacts.every(c => companyIds.has(c.companyId))) && ok;

  ok = a(log, 'frozen abrufbar', BaselineSnapshotService.get('test-v1').version === 'test-v1') && ok;

  let threw = false;
  try { dataSourceRegistry.get('does-not-exist'); }
  catch (e) { threw = e instanceof DataSourceError && e.code === 'UNKNOWN_SOURCE'; }
  ok = a(log, 'unknown source throws', threw) && ok;

  // Reproduzierbarkeit: capture derselben Quelle 2x -> gleiche Zählwerte & IDs
  const s2 = await BaselineSnapshotService.capture('simulated-crm', 'test-v2', '2026-01-01', '2026-01-01T00:00:00.000Z');
  ok = a(log, 'capture deterministisch', JSON.stringify(snap.companies) === JSON.stringify(s2.companies)) && ok;

  return { success: ok, log };
}
const a = (log: string[], n: string, c: boolean) => (log.push(`${c ? '✅' : '❌'} ${n}`), c);
```
In `scripts/verifyIntegrity.ts`: `{ name: '016 - Data Sources', res: await runDataSourceTest() }`.

Ergänzung in `reproducibilityIntegrity.test.ts` (aus AUFTRAG 015): assert, dass zwei Runs mit derselben `dataSourceId` identische `manifest.baselineVersion`-Struktur haben und ein `reproduce()` eines alten Runs dessen `baselineVersion` unverändert übernimmt.

---

## Schritt 9 — UI

- `src/features/simulation/components/RunActionModal.tsx` (und/oder `ScenarioManagerModal.tsx`):
  - Label vor „Run starten": `Datenquelle: Simuliertes CRM · Baseline: baseline-simulated-crm-2026-08-31` (Entscheidung 1616)
  - optionales Dropdown `dataSourceRegistry.list()` → Auswahl geht als `opts.dataSourceId`
- `src/features/simulation/components/AuditTierView.tsx` (RunManifest-Tab): `manifest.baselineVersion` + `sourceId` anzeigen
- optional: globale „Datenquelle"-Anzeige im Header (Ebene-C-Kennzeichnung), damit sichtbar ist, ob simuliert oder real

---

## Schritt 10 — Doku nachziehen

`ARCHITECTURE_DECISIONS.md`:
- Teil C.4-1 → **erledigt** (Datenquellen-Abstraktion + n8n-Fabrik)
- Entscheidungen **1601–1616** in Teil C → **IMPLEMENTIERT**
- **B22** ist bereits ergänzt; ggf. Dateipfade (`src/services/data/*`, `tools/n8n/`) nachtragen
- D1 Quellen: `tools/n8n/` als Baseline-/Integrations-Fabrik
- D4 Änderungsprotokoll + D5 MASTERSTATUS

---

## Gate G2 — Abnahme

- [ ] `npx tsc --noEmit` grün · `npm run verify` grün inkl. `016 - Data Sources`
- [ ] `DataSource` / `DataSourceRegistry` / `BaselineSnapshotService` existieren; `simulated-crm` + mind. eine `baseline-file:*` registriert
- [ ] `baseline-2026-08-31-v1.json` existiert, inhaltlich == V1.0 (20/100/40)
- [ ] eine zweite, per n8n erzeugte Baseline (`-v2`) wird beim Boot automatisch als Quelle registriert und lädt
- [ ] ein Run mit `simulated-crm` und ein Run mit `baseline-file:-v2`: beide Manifeste tragen die korrekte `baselineVersion`; `reproduce()` eines alten Runs bleibt an seine Original-Baseline gebunden
- [ ] `grep -rn 'getLeads\|getDeals\|getActivities\|updateLeadStatus\|addLead' src` → leer oder nur `throw`
- [ ] Run-Start-UI zeigt aktive Datenquelle + Baseline-Version
- [ ] ein `HubSpotSource`-Stub (nur `info` + `fetchSnapshot` mit `throw new DataSourceError('FETCH_FAILED','not implemented')`) lässt sich registrieren, ohne dass anderer Code bricht — als Beleg, dass die Naht trägt. **Danach wieder entfernen** oder als `// EXAMPLE, disabled` auskommentieren.
- [ ] eigener Commit `feat(auftrag-016): pluggable data sources + baseline snapshotting + n8n fabrik`
