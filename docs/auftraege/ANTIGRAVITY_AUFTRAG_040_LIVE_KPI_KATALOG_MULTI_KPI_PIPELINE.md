# Auftrag 040: Live-KPI-Katalog und Multi-KPI-Eventpfad

> **Für Antigravity:** Dieser Auftrag wird seriell auf einem eigenen Arbeitsbranch auf Basis von `e1cedb6` bearbeitet. Lies vor dem ersten Edit `CLAUDE.md`, `ARCHITECTURE_DECISIONS.md`, `docs/BUILD_LOG.md` und diese Datei vollständig. Ändere ausschließlich die unten benannten Dateien. Nach Abschluss folgt der Builder-Bericht; Codex prüft anschließend unabhängig. Kein Merge, Tag oder Push.

**Version:** V2.1.0
**Phase:** Live Performance – Fundament
**Gate:** G24
**Status:** BEREIT ZUR PRÜFUNG
**Baseline:** `e1cedb6` (`docs(v2.1): specify live performance architecture`)
**Architekturquelle:** `docs/superpowers/specs/2026-09-08-v2-1-live-performance-design.md`

## 1. Ziel

Lege den verbindlichen Katalog der zwölf in V2.1 sichtbaren Ebene-C-KPIs an und erweitere den nachweisbaren n8n-Ereignispfad durch synthetische, reproduzierbare Multi-KPI-Fixtures und Operator-Dokumentation. Die bestehende Pipeline bleibt dabei absichtlich generisch: Sie akzeptiert weiterhin einen validen `live-kpi-event/v1`-Contract; die neue Oberfläche wird später ausschließlich den hier definierten Katalog rendern.

Dies ist ein Fundament-Auftrag ohne UI, Route, Hook, Realtime-Subscription, Datenbankmigration oder externe Integration. Es werden keine echten Live-Werte, Testzugänge oder externen Erfolge behauptet.

## 2. Verbindlicher Katalog

| Gruppe | ID | Label | Einheit | Format |
|---|---|---|---|---|
| `core` | `arr` | Live ARR | `EUR` | `currency` |
| `core` | `mrr` | Live MRR | `EUR` | `currency` |
| `core` | `pipeline_coverage` | Pipeline Coverage | `x` | `ratio` |
| `arr_mix` | `arr_direct` | ARR Direct | `EUR` | `currency` |
| `arr_mix` | `arr_partner` | ARR Partner | `EUR` | `currency` |
| `arr_mix` | `arr_outbound` | ARR Outbound | `EUR` | `currency` |
| `arr_mix` | `arr_other` | ARR Sonstige | `EUR` | `currency` |
| `funnel` | `pipeline_leads` | Pipeline Leads | `count` | `count` |
| `funnel` | `pipeline_mql` | Pipeline MQL | `count` | `count` |
| `funnel` | `pipeline_sql` | Pipeline SQL | `count` | `count` |
| `funnel` | `pipeline_offers` | Pipeline Angebote | `count` | `count` |
| `funnel` | `pipeline_won` | Pipeline Won | `count` | `count` |

Die Katalogdatei enthält ausschließlich diese sicher darstellbaren Felder: ID, Label, Einheit, Format und Gruppe. Sie enthält ausdrücklich keine Event-IDs, Korrelationen, Quellreferenzen, Rohkontexte, Credentials oder Werte.

## 3. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_040_LIVE_KPI_KATALOG_MULTI_KPI_PIPELINE.md` | Diese unveränderte Auftragsquelle; nur Status-Checkboxen nach Umsetzung pflegen. |
| `src/services/liveKpi/liveKpiDefinitions.ts` | Neuer, zentraler, UI-sicherer Katalog samt Lookup-API. |
| `scripts/verifyLiveKpiCatalog.ts` | Lokaler G24-Verifier für Katalog, Fixture-Parität, Contract und Geheimnisschutz. |
| `tools/n8n/live-kpi-replay.fixture.json` | Bestehende G18-Fixtures erhalten; ergänze alle zwölf synthetischen V2.1-Ereignisse. |
| `tools/n8n/README.md` | Dokumentiere Katalog, Einheiten, UI-Verbraucher und den ehrlichen Offline-/Operator-Status. |
| `docs/BUILD_LOG.md` | Neuer Builder-Bericht nach grünem Gate. |

Keine andere Datei ändern. Besonders unverändert bleiben:

- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/services/db/**`, `src/features/resources/**`
- `src/components/**`, `src/hooks/**`, `src/features/overview/**`, `src/styles/**`
- `supabase/**`, `package.json`, bestehender n8n-Ingest-Workflow und CRM-/Baseline-Pfade.

## 4. Verbindliche Umsetzung

### 4.1 Erst Test schreiben (rot)

Lege `scripts/verifyLiveKpiCatalog.ts` vor der Katalogdatei an. Der Verifier muss fehlschlagen, solange der neue Katalog fehlt. Er prüft danach strikt:

1. exakt zwölf eindeutige Katalogdefinitionen;
2. exakt die zwölf ID-/Einheitspaare aus Abschnitt 2, keine weitere ID;
3. jede Definition besitzt nur die erwarteten Gruppen und Formate;
4. `isSupportedLiveKpiId('arr') === true` und `isSupportedLiveKpiId('unknown_kpi') === false`;
5. `getLiveKpiDefinition('mrr')` liefert die MRR-Definition, unbekannte IDs liefern `undefined`;
6. `fixtures.v21_catalog_events` enthält exakt diese zwölf Keys;
7. jedes Fixture besteht `validateLiveKpiEvent()`, nutzt seine kanonische Einheit, eine endliche Zahl, ISO-8601 mit Zeitzone, `provenance: 'live'` und `context.isSyntheticTest === true`;
8. alle zwölf `eventId`-Werte sind eindeutig; jedes Fixture enthält ein eigenes `correlationId`;
9. weder Katalog, Fixtures noch README enthalten JWTs, Passwort-Connection-Strings, ein hart codiertes Passwort oder `service_role`.

Der Verifier ist ein reines lokales Node-/TypeScript-Skript, ohne Netzwerk und ohne Supabase-Client.

### 4.2 Katalog implementieren

Erstelle `src/services/liveKpi/liveKpiDefinitions.ts` mit dieser öffentlichen API:

```ts
export type LiveKpiFormat = 'currency' | 'ratio' | 'count';
export type LiveKpiGroup = 'core' | 'arr_mix' | 'funnel';

export interface LiveKpiDefinition {
  id: string;
  label: string;
  unit: 'EUR' | 'x' | 'count';
  format: LiveKpiFormat;
  group: LiveKpiGroup;
}

export const LIVE_KPI_DEFINITIONS: readonly LiveKpiDefinition[];
export type LiveKpiId = (typeof LIVE_KPI_DEFINITIONS)[number]['id'];
export const LIVE_KPI_IDS: ReadonlySet<string>;
export function isSupportedLiveKpiId(id: string): id is LiveKpiId;
export function getLiveKpiDefinition(id: string): LiveKpiDefinition | undefined;
```

Die Definitionen sind unveränderlich zu exportieren. `src/types/liveKpi.ts` und `liveKpiContract.ts` bleiben unangetastet: Der V1-Transportcontract ist bewusst allgemein genug für spätere, separat beauftragte KPIs.

### 4.3 Fixtures und n8n-Dokumentation

Ergänze im bestehenden `fixtures`-Objekt den Schlüssel `v21_catalog_events`. Sein Wert ist ein Objekt, dessen Keys exakt den zwölf IDs entsprechen. Die Werte sind klar als Testdaten markiert; verwende keine Begriffe wie „Produktion“, „echter Deal“ oder „verifizierter HubSpot-Wert“.

Jedes Event nutzt:

```json
{
  "contractVersion": "1.0",
  "eventId": "evt-v21-<kpi-id>-001",
  "kpiId": "<kpi-id>",
  "value": 1,
  "unit": "<canonical-unit>",
  "occurredAt": "2026-09-08T12:00:00.000Z",
  "sourceSystem": "fixture-v21-live",
  "qualityStatus": "valid",
  "correlationId": "corr-v21-<kpi-id>-001",
  "context": { "isSyntheticTest": true },
  "provenance": "live"
}
```

Ersetze die beispielhafte `value: 1` je Event durch eine passende endliche Testzahl. Keine der Zahlen darf als UI-Fallback oder Fachwert verwendet werden.

Ergänze `tools/n8n/README.md` um eine Tabelle mit ID, kanonischer Einheit, Kataloggruppe und späterem UI-Verbraucher. Dokumentiere: Der bestehende native PostgreSQL-Ingest-Workflow bleibt der einzige Schreibpfad, die App ruft n8n nicht zur Laufzeit auf, und ohne konfigurierte Betreiberumgebung existiert nur der lokale Fixture-/Contract-Nachweis.

## 5. Explizit nicht enthalten

- Kein Schema-, RLS-, RPC- oder Contract-Versionswechsel.
- Keine Allowlist in der Datenbank oder im generischen Ingest-Workflow.
- Keine Hook-, Adapter-, Subscription-, Store- oder UI-Änderung.
- Kein ARR-/MRR-Wert im UI, keine Bildschirmaufnahme, keine Screenshot-Matrix.
- Keine externen Zugangsdaten, keine echten n8n-/Supabase-/HubSpot-Aufrufe.

## 6. Verifikation und Gate G24

Vor dem Builder-Bericht vollständig und mit Exit 0 ausführen:

```bash
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLiveKpiContract.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check e1cedb6..HEAD
git diff --exit-code e1cedb6..HEAD -- src/simulation src/types src/context src/services/data src/services/db src/features/resources src/components src/hooks src/features/overview src/styles supabase package.json
```

Zusätzlich schriftlich nachweisen:

- Der Red-Test vor `liveKpiDefinitions.ts` ist gelaufen und fehlgeschlagen.
- Alle zwölf Fixtures sind rein synthetisch; kein echter externer E2E-Erfolg wird behauptet.
- Der generische G18-Contract akzeptiert den Katalog, bleibt aber selbst unverändert.
- Der Schutzbereichs-Diff ist exakt leer.

## 7. Builder-Abschlussbericht

Ergänze ans Ende von `docs/BUILD_LOG.md` einen Abschnitt **„Gate G24 – Auftrag 040: Live-KPI-Katalog und Multi-KPI-Eventpfad“** mit Ziel/Kontext, allen geänderten Dateien, den zwölf IDs, Rot-/Grün-Testnachweis, vollständiger Command-Matrix, Schutzbereichs-Diff, dem ehrlichen E2E-Status sowie dem Ergebnis `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

Erst danach einen einzelnen, fokussierten Commit erstellen. Weder `main` noch Release-Tag oder Remote verändern.
