# ANTIGRAVITY AUFTRAG 020 — HubSpot als erste reale Datenquelle (offline über n8n)

**Phase:** 4 (Post-V1.1) · **Gate:** G4
**Referenz:** `ARCHITECTURE_DECISIONS.md` B22 (Datenquellen-Abstraktion), Teil C.4-1 · `BUILD_PLAN.md` D1/D2/D3
**Voraussetzung:** V1.1.0 getaggt, `DataSource`/`DataSourceRegistry`/`BaselineSnapshotService` vorhanden (AUFTRAG 016).

---

## 1. Ziel

Eine **reale** Datenquelle an die bestehende `DataSource`-Abstraktion anschließen, ohne Reproduzierbarkeit oder Runtime-Verhalten der App zu ändern:

> HubSpot-CRM-Daten werden **offline per n8n** gezogen, als versionierte JSON-Baseline im Repo abgelegt, und über eine neue `HubSpotBaselineSource` (`kind: 'external'`) genauso konsumiert wie die simulierten Baselines. Die App ruft HubSpot **nie zur Laufzeit**.

Damit ist C4-1 endgültig belegt: die Architektur erlaubt „eine oder mehrere echte Quellen" als Drop-in.

### Was AUFTRAG 020 beweist

- `HubSpotBaselineSource implements DataSource` → in `DataSourceRegistry`, in der Audit-UI sichtbar
- n8n-Workflow `generate-baseline-hubspot` erzeugt eine valide `baseline-hubspot-<datum>.json` im **gleichen Envelope-Format** wie `generate-baseline` (AUFTRAG 016)
- Ein `SimulationRun` mit `dataSourceId: 'hubspot-baseline:<version>'` läuft durch die Engine und **reproduziert byte-gleich** (weil der eingefrorene Snapshot die Wahrheit ist, nicht der Live-Pull)
- Kein Secret im Repo, kein Netz-Call in App-Code oder Tests

---

## 2. Nicht-Ziel (bewusst ausgeschlossen, je eigener Auftrag)

- **Kein Live-/Runtime-Zugriff** auf die HubSpot-API. `supportsLiveFeed: false`.
- **Kein Schreibpfad** zurück nach HubSpot (bleibt bei den `throw`-Stubs aus AUFTRAG 016).
- **Kein `CompositeDataSource`** (Merge simuliert + HubSpot).
- **Kein Mapping von HubSpot-Engagements/Activities** in `HistoricalActivity` (siehe D9) — V1: `activities: []`.
- **Keine OAuth-App**, keine `@hubspot/api-client`-Abhängigkeit im Frontend-Bundle. Der API-Zugriff lebt ausschließlich im n8n-Workflow.

---

## 3. Entscheidungspunkte

### D9 — HubSpot-Engagements → `HistoricalActivity`?

| Option | Konsequenz |
|---|---|
| **A — Nein. `activities: []` in der HubSpot-Baseline.** ✅ *Empfehlung* | Braucht keinen weiteren Scope. Die aktivitätsbasierten KPIs zeigen für die HubSpot-Quelle schlicht „keine Historie". Ehrlich und klein. |
| B — Ja, `/crm/v3/objects/calls\|emails\|meetings` mitziehen | Zusätzliche Scopes (`sales-email-read` u. a.), komplexes Zeitfenster-Mapping in `[periodStart, +365d]`, Zuordnung Engagement→Company/Deal oft lückenhaft. Eigener Nachtrag (AUFTRAG 020a). |

### D10 — Eigene Source-Klasse oder `BaselineFileSource` wiederverwenden?

| Option | Konsequenz |
|---|---|
| **A — Dünne eigene Factory `makeHubSpotBaselineSource(version)`** ✅ *Empfehlung* | `kind: 'external'`, eigene `id`-Namespace `hubspot-baseline:<version>`, Provenienz-Metadaten (Portal-ID, Capture-Datum, Mapping-Report) in `info.description`. Lade-Logik wird mit `baselineFileSource` geteilt (gemeinsamer Helper `loadBaselineEnvelope`). |
| B — `makeBaselineFileSource` einfach mit HubSpot-Dateien füttern | Spart ~30 Zeilen, aber `kind` wäre fälschlich `'file'`, keine Provenienz, in der UI nicht als „extern" erkennbar. Widerspricht dem Ziel des Auftrags. |

### D11 — Ablageort der `baseline-hubspot-*.json`

| Option | Konsequenz |
|---|---|
| **A — `src/features/crm/data/baselines/baseline-hubspot-<YYYY-MM-DD>.json`, versioniert via Git** ✅ *Empfehlung* | Konsistent mit `baseline-2026-08-31-v1.json` etc. Diffbar, deterministisch per `import()` ladbar, keine Infrastruktur. |
| B — außerhalb des Repos (lokaler Ordner, nachgeladen) | Bricht `npm ci && npm run verify` auf frischem Clone. Abgelehnt. |

### D12 — HubSpot-`dealstage` → LeadPilot-Funnel-Stage

| Option | Konsequenz |
|---|---|
| **A — Mapping-Tabelle als eigene Datei `tools/n8n/hubspot-stage-map.json`** ✅ *Empfehlung* | Der n8n-Code-Node liest die Map, unmapped Stages → `LOST` **oder** in einen Zähler `unmappedStages` im Audit-Report. Ohne Code-Änderung anpassbar, wenn HubSpot-Pipeline sich ändert. |
| B — Map fest im n8n-`jsCode` | Schneller, aber jede Pipeline-Änderung = Workflow editieren. |

---

## 4. Bausteine, die schon existieren (nicht neu bauen)

| Datei | Rolle |
|---|---|
| `src/types/dataSource.ts` | `DataSource`, `DataSourceInfo`, `CrmReadModel`, `HistoricalActivity`, `DataSourceError` |
| `src/services/data/dataSourceRegistry.ts` | `dataSourceRegistry.register()/get()/list()/setActive()` |
| `src/services/data/baselineSnapshotService.ts` | `BaselineSnapshotService.capture(sourceId, version, periodStart, now)` — friert ein + `assertIntegrity` (referenzielle Integrität + Aktivitäts-Periodenfenster) |
| `src/services/data/sources/baselineFileSource.ts` | Vorlage: `makeBaselineFileSource(version)` + `FILES`-Loader-Map + Envelope→`CrmReadModel`-Mapping (`deals: ds.importedFunnelDeals`) |
| `src/services/data/index.ts` | Registrierungs-Ort beim App-Start |
| `tools/n8n/generate-baseline.workflow.json` | Vorlage für den n8n-Workflow (Trigger → Code-Node → Envelope) |
| `src/simulation/__tests__/dataSourceIntegrity.test.ts` | Suite 021, Vorlage für die neue Suite |

**Envelope-Format** (aus `generate-baseline.workflow.json`, unverändert übernehmen):
```json
{
  "version": "hubspot-2026-09-15",
  "generatedAt": "<ISO>",
  "generator": "n8n",
  "generatorSeed": null,
  "sourceSystem": "hubspot",
  "hubspotPortalId": "<id>",
  "periodStart": "2026-01-01",
  "counts": { "companies": N, "contacts": N, "deals": N, "activities": 0 },
  "companies": [...],
  "contacts": [...],
  "importedFunnelDeals": [...],
  "activities": [],
  "audit": { ...ImportAuditSummary..., "unmappedStages": {} }
}
```

---

## 5. Schritte

### Schritt 0 — Signaturen & Scopes verifizieren (kein Code)

1. `src/types/crm.ts` öffnen und die realen Felder von `Company`, `Contact`, `ImportedFunnelDeal`, `ImportAuditSummary` sowie das `stage`-Enum protokollieren. Die Mapping-Tabelle in Schritt 2 gegen diese Felder abgleichen — **nicht gegen die Beispieldaten in diesem Dokument**.
2. HubSpot **Service-Schlüssel** anlegen (Einstellungen → Integrationen → Service Keys): Scopes `crm.objects.companies.read`, `crm.objects.contacts.read`, `crm.objects.deals.read`. Optional `crm.schemas.deals.read` (Pipeline-/Stage-Labels), `crm.objects.owners.read`.
3. In n8n (`http://localhost:5678`) Credential **Header Auth** anlegen: Name `Authorization`, Value `Bearer <service-key-token>`, Credential-Name `HubSpot Service Key – LeadPilot`.
4. Portal-ID notieren (`https://app.hubspot.com/contacts/<PORTAL_ID>/...`) → geht als `hubspotPortalId` in den Envelope.

**Akzeptanz:** kurze Notiz in `docs/BUILD_LOG.md` mit den tatsächlichen `crm.ts`-Feldnamen + gewählten Scopes.

### Schritt 1 — Stage-Map `tools/n8n/hubspot-stage-map.json`

```json
{
  "_comment": "HubSpot dealstage-ID oder -Label  ->  LeadPilot-Funnel-Stage",
  "appointmentscheduled": "LEAD",
  "qualifiedtobuy": "QUALIFIED_LEAD",
  "presentationscheduled": "PITCH_DEMO",
  "decisionmakerboughtin": "PROPOSAL",
  "contractsent": "CLOSING",
  "closedwon": "WON",
  "closedlost": "LOST"
}
```
- Keys sind die tatsächlichen `dealstage`-Werte des Ziel-Portals (Schritt 0.2 mit `crm.schemas.deals.read` oder aus der HubSpot-UI ablesen).
- Der Ziel-Wert muss exakt einem Wert des `stage`-Enums aus `crm.ts` entsprechen (Schritt 0.1).

### Schritt 2 — n8n-Workflow `tools/n8n/generate-baseline-hubspot.workflow.json`

Nodes:
1. **Manual Trigger**
2. **HTTP Request — Companies**: `GET https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,industry,city,zip,numberofemployees`
   - Authentication: *Generic Credential Type* → *Header Auth* → `HubSpot Service Key – LeadPilot`
   - Paginierung: `paginate` über `body.paging.next.after` bis leer
3. **HTTP Request — Contacts**: `.../objects/contacts?limit=100&properties=firstname,lastname,email,jobtitle,associatedcompanyid` (+ Assoziations-Handling, s. u.)
4. **HTTP Request — Deals**: `.../objects/deals?limit=100&properties=dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id&associations=companies`
5. **Code — Map & Validate** (`jsCode`):
   - Company-Mapping → `{ id: hs_object_id, name, domain, industry, city, postalCode: zip, employeeCount: Number(numberofemployees)||0 }`
   - Contact-Mapping → `{ id, companyId: <erste zugeordnete Company-ID>, firstName, lastName, email, jobTitle }`; Contacts **ohne** Company → verwerfen und in `audit.contactsErrors` zählen
   - Deal-Mapping → `{ id, companyId: <assoziierte Company>, dealName, stage: STAGE_MAP[dealstage] ?? '<D12-Regel>', amount: Number(amount)||0, closeDate: closedate?.slice(0,10) ?? periodStart, pipeline }`; unmapped `dealstage` → `audit.unmappedStages[dealstage] = (…||0)+1`
   - Referenzielle Integrität: jeder `contact.companyId`/`deal.companyId` muss in `companies` existieren, sonst Datensatz raus + Fehlerzähler
   - `audit` als `ImportAuditSummary` füllen (loaded/valid/errors je Objekt) + `unmappedStages`
   - `activities: []` (D9-A)
   - Envelope bauen (Format aus Abschnitt 4), `version = 'hubspot-' + <YYYY-MM-DD>`, `periodStart = '2026-01-01'`, `hubspotPortalId` als Workflow-Konstante
6. **Code — Assert** (`jsCode`): wirft, wenn `counts.companies === 0`, wenn dangling refs übrig, wenn `unmappedStages` nicht leer **und** Politik = strict, wenn Pflichtfelder fehlen
7. **Write Binary File** → `/data/baseline-hubspot-<version>.json` (n8n-Container-Pfad; Datei danach von Hand nach `src/features/crm/data/baselines/` kopieren und committen — bewusst manueller Schritt, damit ein Mensch den Diff sieht)

**Determinismus-Hinweis im Workflow-Kommentar:** Der Pull ist nicht deterministisch (HubSpot-Daten ändern sich). Reproduzierbarkeit entsteht **nur** durch das Einfrieren des Snapshots im Repo + `RunManifest.baselineVersion`.

### Schritt 3 — `src/services/data/sources/hubSpotBaselineSource.ts`

```ts
import { DataSource, CrmReadModel, DataSourceError } from '../../../types/dataSource';

const FILES: Record<string, () => Promise<any>> = {
  '2026-09-15': () => import('../../../features/crm/data/baselines/baseline-hubspot-2026-09-15.json'),
};

export function makeHubSpotBaselineSource(version: string): DataSource {
  return {
    info: {
      id: `hubspot-baseline:${version}`,
      kind: 'external',
      label: `HubSpot-Baseline ${version}`,
      description: 'Offline per n8n gezogener, eingefrorener HubSpot-Snapshot. Kein Live-Zugriff.',
      supportsLiveFeed: false,
    },
    async fetchSnapshot(): Promise<CrmReadModel> {
      const loader = FILES[version];
      if (!loader) throw new DataSourceError('UNKNOWN_SOURCE', `HubSpot-Baseline "${version}" fehlt.`);
      const mod = await loader();
      const ds = mod.default ?? mod;
      if (ds.sourceSystem !== 'hubspot') {
        throw new DataSourceError('INTEGRITY', `Envelope ${version} ist keine HubSpot-Quelle.`);
      }
      return {
        companies: ds.companies,
        contacts: ds.contacts,
        deals: ds.importedFunnelDeals,
        activities: ds.activities ?? [],
        audit: ds.audit,
      };
    },
  };
}

export function listHubSpotBaselineVersions(): string[] {
  return Object.keys(FILES);
}
```

### Schritt 4 — Registrierung in `src/services/data/index.ts`

```ts
import { makeHubSpotBaselineSource, listHubSpotBaselineVersions } from './sources/hubSpotBaselineSource';
// …
for (const v of listHubSpotBaselineVersions()) {
  dataSourceRegistry.register(makeHubSpotBaselineSource(v));
}
export { makeHubSpotBaselineSource, listHubSpotBaselineVersions } from './sources/hubSpotBaselineSource';
```
`setActive` bleibt unverändert bei `simulated-crm` — die HubSpot-Quelle ist wählbar, nicht Default.

### Schritt 5 — Audit-UI

- Datenquellen-Umschalter (Audit-Tier) listet jetzt zusätzlich `HubSpot-Baseline <version>`.
- Bei aktiver HubSpot-Quelle Provenienz-Panel: `sourceSystem`, `hubspotPortalId`, `generatedAt`, `counts`, `audit.unmappedStages` (falls nicht leer als Warnung).
- Badge „Offline-Snapshot — kein Live-Zugriff".
- Keine neue Route, keine Domain-Berechnung im Renderpfad.

### Schritt 6 — Tests `src/simulation/__tests__/hubSpotSourceIntegrity.test.ts`

`export async function runHubSpotSourceTest(): Promise<{ success: boolean; log: string[] }>`

Fixture (kein Netz): `src/simulation/__tests__/fixtures/baseline-hubspot-fixture.json` — 5 Companies, 8 Contacts (davon 1 ohne Company → muss verworfen sein), 5 Deals, `activities: []`, Envelope mit `sourceSystem: 'hubspot'`.

Assertions:
1. `makeHubSpotBaselineSource('fixture').fetchSnapshot()` liefert ein `CrmReadModel`, `deals` aus `importedFunnelDeals` gemappt.
2. `info.kind === 'external'`, `supportsLiveFeed === false`.
3. Envelope ohne `sourceSystem: 'hubspot'` → `DataSourceError('INTEGRITY')`.
4. Referenzielle Integrität: jeder `contact.companyId` / `deal.companyId` existiert in `companies`.
5. Jede `deal.stage` ist ein gültiger Wert des `crm.ts`-Stage-Enums.
6. `BaselineSnapshotService.capture('hubspot-baseline:fixture', 'hubspot-fixture', '2026-01-01', '<fixe ISO>')` → `BaselineDataset` mit korrekten `counts`, `assertIntegrity` grün.
7. Zwei `capture()`-Läufe auf derselben Datei → tief-gleiche `BaselineDataset` (Determinismus).
8. `ScenarioService`-Run mit `RunOptions.dataSourceId = 'hubspot-baseline:fixture'` + gleichem Seed → identischer `RunManifest`-Hash über zwei Läufe (Reproduzierbarkeit mit externer Quelle).
9. Registry: nach `index.ts`-Import ist `hubspot-baseline:2026-09-15` gelistet, `getActive().info.id === 'simulated-crm'` (Default unverändert).

Registrieren in `scripts/verifyIntegrity.ts`:
```ts
const test24 = await runHubSpotSourceTest();
// …
{ name: '025 - HubSpot Baseline Source', res: test24 },
```
Banner-String `001 bis 024` → `001 bis 025`.

### Schritt 7 — Doku

- `ARCHITECTURE_DECISIONS.md`
  - B22 ergänzen: „Erste reale Quelle: HubSpot, ausschließlich offline über n8n eingefroren; `kind: 'external'`, `supportsLiveFeed: false`."
  - Teil C: neuer Abschnitt „AUFTRAG 020 — HubSpot Baseline Source", C4-1 endgültig als belegt markieren.
  - D4 Änderungsprotokoll: Zeile mit Datum.
  - D5 MASTERSTATUS: Suite-Zähler 025, „Build / Regression" aktualisieren.
- `BUILD_PLAN.md`: Abschnitt „Phase 4 — reale Datenquellen", AUFTRAG 020 = G4, D9–D12 aufnehmen.
- `docs/BUILD_LOG.md`: Gate-G4-Eintrag (tsc/verify/build, Mapping-Report, Fixture-Assertions).
- `tools/n8n/README.md` (neu): Workflow importieren, Header-Auth-Credential anlegen, Service-Key-Scopes, Stage-Map pflegen, Ausgabe-JSON nach `src/features/crm/data/baselines/` kopieren + committen.
- `.env.example` unverändert lassen — **kein** HubSpot-Token dort.

---

## 6. Gate G4 — Abnahmekriterien

- [ ] `npx tsc --noEmit` EXIT 0
- [ ] `npm run verify` grün inkl. **Suite 025**, Banner „001 bis 025"
- [ ] `npm run build` EXIT 0
- [ ] `hubSpotBaselineSource.ts` vorhanden, in `DataSourceRegistry` registriert, in der Audit-UI als eigene Quelle mit „extern/offline"-Kennzeichnung sichtbar
- [ ] `tools/n8n/generate-baseline-hubspot.workflow.json` importierbar; Lauf gegen das echte Portal erzeugt eine `baseline-hubspot-<datum>.json` im Envelope-Format; Assert-Node grün; referenzielle Integrität ohne dangling refs
- [ ] `tools/n8n/hubspot-stage-map.json` deckt alle `dealstage`-Werte des Portals ab **oder** `audit.unmappedStages` ist dokumentiert und bewusst akzeptiert
- [ ] Mapping-Tabelle HubSpot-Property → `crm.ts`-Feld je Objekt in `tools/n8n/README.md` vollständig
- [ ] `SimulationRun` mit `dataSourceId: 'hubspot-baseline:<version>'` läuft durch die Engine und reproduziert byte-/hash-gleich über zwei Läufe
- [ ] Grep als Akzeptanzbedingung: **kein** `api.hubapi.com`, `hubspot`, `Bearer`, Token-artiges in `src/**` (nur in `tools/n8n/**` als Doku/Workflow)
- [ ] Kein Secret im Repo; `git log -p` des Auftrags enthält keinen Token
- [ ] Default-Datenquelle bleibt `simulated-crm`; bestehende Suiten 001–024 unverändert grün

---

## 7. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| HubSpot-Property-Namen weichen vom Ziel-Portal ab (Custom Properties, andere `dealstage`-IDs) | Schritt 0.1/0.2 zuerst; Mapping-Tabelle + Stage-Map gegen das reale Portal, nicht gegen die Beispiele |
| n8n-`Write Binary File` schreibt in den Container, Datei landet nicht im Repo | Bewusst manueller Kopier-+Commit-Schritt (README); alternativ n8n-Volume auf ein Repo-Unterverzeichnis mounten (dann in `README.md` dokumentieren) |
| Fixture veraltet gegenüber echtem Envelope-Format | Fixture aus einem realen (anonymisierten) Mini-Pull erzeugen, nicht handschreiben |
| Contacts/Deals ohne Company-Assoziation | im Map-Node verwerfen + zählen; `assertIntegrity` in `BaselineSnapshotService` fängt den Rest |
| Token versehentlich in n8n-Workflow-JSON exportiert | Credential wird per Referenz genutzt, nie inline; vor dem Commit `grep -i bearer tools/n8n/*.json` |
| `import()` einer nicht existierenden Baseline-Datei bricht den Build | `FILES`-Map ist die einzige Wahrheit; neue Version = Eintrag + Datei im selben Commit |

---

## 8. Reihenfolge für den Coding-Agent

1. Schritt 0 (Notiz in BUILD_LOG) → 1 (Stage-Map) → 3 (Source-Klasse) → 4 (Registry) → 6 (Tests + Fixture) → `npm run verify`
2. Dann Schritt 2 (n8n-Workflow) + realer Pull → `baseline-hubspot-<datum>.json` → `FILES`-Eintrag → erneut `verify`
3. Schritt 5 (UI) → Schritt 7 (Doku) → Gate G4 Checkliste → Commit `feat(auftrag-020): hubspot baseline source (offline via n8n)`
