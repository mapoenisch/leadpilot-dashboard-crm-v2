# Auftrag 071 – Dashboard Teilauftrag 2: Datenauflösung und Filter

**Stand:** 03.10.2026

**Basis:** `main` `a41b864` (nach PR #49, #50, #51). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 2 sowie §4 (Daten und Eignung) und §5 (Lazy Loading und Ladeverhalten). Katalog und Datenvertrag: Auftrag 070, `docs/dashboard/KPI_CATALOG.md`.

**Voraussetzung:** Teilauftrag 1 (Auftrag 070) ist gemergt. Seine Gate-Freigabe durch Codex steht noch aus (BUILD_LOG, „Abweichung: PR #49 … vor der letzten Codex-Prüfung gemergt“). Befunde daraus gehen in einen eigenen Folge-PR, nicht in diesen Auftrag.

**Builder:** Antigravity (Zyklus 2, Entscheidung Marc vom 03.10.2026, `CLAUDE.md` §4). **Prüfer:** Claude, automatisch über `claude-review.yml`. **Merge:** nur Marc.

**Branch:** `antigravity/auftrag-071` ab aktuellem `main`. Nur dieser Name startet die automatische Prüfung (`docs/dashboard/REVIEW_WORKFLOW_ANTIGRAVITY.md`).

## Ziel

Eine einheitliche Leseschicht, die für jede Kachel aus Katalog-ID und effektivem Filter den Wert bzw. die Reihe, die Herkunft, die tatsächliche Zeitbasis und den Datenzustand liefert. Kachel, Vorschau im Konfigurator und Detailseite verwenden später dieselbe Schicht. **Keine Oberfläche** (Teilaufträge 4 und 5), **keine Speicherung** (Teilauftrag 3), **keine Kombinationen** (Teilauftrag 6).

## Globale Grenzen

- Schutzbereiche unverändert (`CLAUDE.md` §6): `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Der Diff gegen die Basis muss leer sein und gehört in den BUILD_LOG-Eintrag.
- Quellmodule werden **nur gelesen und aufgerufen**, nicht geändert: `src/domain/**`, `src/services/liveKpi/**`, `src/services/db/**`, `src/services/query/**`, `src/hooks/**`, `src/auth/**`, `src/app/**`.
- Der Katalog aus Auftrag 070 (`src/features/dashboard/model/**` außer der neuen Datei `dashboardFilters.ts`) bleibt unverändert. Fehlt dort etwas, stoppen und Rückfrage im BUILD_LOG dokumentieren.
- Keine neue Abhängigkeit (`CLAUDE.md` §8). Vorhanden und zu nutzen: React Query (`@tanstack/react-query`), `liveKpiStreamStore`.
- Keine Kopien von Kennzahlenwerten im Produktivcode. Werte kommen zur Laufzeit aus den Quellen.
- Keine neuen Supabase-Kanäle, Tabellen, Policies oder Migrationen.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/dashboard/model/dashboardFilters.ts` | Neu: effektiven Filter je Kachel auflösen (reine Funktionen) |
| `src/features/dashboard/data/dashboardData.ts` | Neu: Typen der Leseschicht (`TileData`, `TileDataState`) und Zuordnung Katalog-ID → Auflöser |
| `src/features/dashboard/data/resolveBaseline.ts` | Neu: Werte und Reihen aus den Stammdaten-Quellen (synchron) |
| `src/features/dashboard/data/resolveCrm.ts` | Neu: Pipeline-Werte aus `getPipelineOverview`, mit Pipeline-Filter |
| `src/features/dashboard/data/resolveLive.ts` | Neu: Live-Werte aus dem bestehenden `liveKpiStreamStore` |
| `src/features/dashboard/data/dashboardQueryKeys.ts` | Neu: Query-Schlüssel des Dashboards mit Organisation |
| `src/features/dashboard/hooks/useDashboardData.ts` | Neu: Hook je Kachel, gesteuert über `enabled` |
| `src/features/dashboard/__tests__/dashboardFilters.vitest.ts` | Neu |
| `src/features/dashboard/__tests__/dashboardData.vitest.ts` | Neu: Auflöser und Zustände |
| `src/features/dashboard/__tests__/useDashboardData.ui.vitest.tsx` | Neu: Hook mit Abfrageteilung, Aktivierung, Live-Abos |
| `docs/dashboard/KPI_CATALOG.md` | Nur ergänzen: Abschnitt „Datenauflösung (Auftrag 071)“ mit Live-Geltungsbereich und Datumsfeldern |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_071_DASHBOARD_DATENAUFLOESUNG.md` | Checkboxen abhaken |
| `docs/BUILD_LOG.md` | Builder-Eintrag ans Ende |

Jede Datei bleibt unter 400 Zeilen (Lint `max-lines`). Weitere Dateien nur nach Rückfrage (`CLAUDE.md` §5.3).

## Belegte Quellen (vor Beginn gelesen, nicht raten)

- **Stammdaten:** `CatalogSource.module`, `exportName`, `path` je aktivem Eintrag (`model/catalog/activeEntries.ts`). Zeitmodus `fest`. Die Reihen `baseline.arr_verlauf` und `baseline.mrr_paketmix` zeigen mit `path: ['datasets', 0, 'data']` nur auf ein Zahlenarray; die Beschriftungen stehen parallel in `CHART_ARR.labels` bzw. `CHART_MRR.labels` (`src/domain/execData.ts`). Regel: Bei `path` mit Endung `['datasets', n, 'data']` ist die Beschriftung `labels[i]` des Exports zum Wert `data[i]`; ungleiche Längen ergeben `fehler`.
- **Formatierte Einzelwerte:** Die acht Einzelwerte aus `EXEC_KPIS_1`/`EXEC_KPIS_2` (`path: [i, 'value']`) sind Strings wie `411.840 €`, `−309.000 €` (Unicode-Minus U+2212), `4.447 €`, `66`, `10 FTE`. Regel: Einheit und Leerzeichen entfernen, `.` ist Tausendertrenner, `,` Dezimaltrenner, `−` (U+2212) und `-` am Anfang bedeuten negativ. Ein String, der danach keine endliche Zahl ergibt, ist `fehler`, nie 0 und nie ein Teilwert. Erwartete Zahlen (Test, exakt): `baseline.arr` 411840, `baseline.umsatz` 336000, `baseline.ebitda` −309000, `baseline.kunden_aktiv` 66, `baseline.arpa` 520, `baseline.marketing_cac` 862, `baseline.fully_loaded_cac` 4447, `baseline.headcount` 10.
- **Übersichten (Stammdaten):** `getTeamHrSnapshot()` und `getRoadmapSnapshot()` aus `src/domain/executiveCockpitData.ts`. Sie liefern verschachtelte Strukturen (Organisationseinheiten, HR-Metriken, Engpässe als Text; Releases mit Status und Datum), keine Zahl und keine Zahlenreihe.
- **Übersicht Live-Aktivität:** `uebersicht.live_aktivitaet` hat weder `liveKpiId` noch `liveKpiIds`. Sie aggregiert alle zwölf Live-IDs (`LIVE_KPI_DEFINITIONS` in `src/services/liveKpi/liveKpiDefinitions.ts`; dieselben zwölf wie `ACTIVITY_IDS` in `src/components/liveKpi/LiveActivityFeed.tsx`) nach derselben Regel wie `useLiveKpiActivity` (`src/hooks/useLiveKpiActivity.ts`, nur lesen): Gesamtstatus `live`, wenn mindestens ein Stream `live` ist, sonst in dieser Reihenfolge `loading`, `error`, `offline`, `unconfigured`; vorhandene Snapshots absteigend nach `occurredAt`, bei Gleichstand nach `ingestedAt`; höchstens zehn Einträge mit genau den fünf Feldern `{ kpiId, value, unit, occurredAt, qualityStatus }`. Weil der Hook fest den Singleton-Store liest und `src/hooks/**` nicht geändert werden darf, wird diese Regel in `resolveLive.ts` als reine Funktion über den **übergebenen** Store umgesetzt (`aggregateLiveActivity(store, ids, limit)`); der Typ `LiveKpiActivityItem` wird aus dem Hook-Modul importiert.
- **CRM:** `getPipelineOverview(source: FunnelDealSource)` in `src/domain/executiveCockpitData.ts` liefert `totalDeals`, `totalVolume`, `wonVolume`, `openVolume`, `stages[]` (`stage`, `count`, `volume`, `sharePercent`). `FunnelDealSource` hat genau eine Methode `getImportedFunnelDeals()`; der bestehende Hook `src/hooks/queries/usePipelineOverview.ts` übergibt `CRMRepository`. `ImportedFunnelDeal` hat die Felder `stage`, `amount`, `closeDate`, `pipeline` (`src/types/crm.ts`, nur lesen). Einträge mit `source.measure` lesen je Stufe `volume` bzw. `count`. Zeitmodus `aktuell`.
- **Live:** `liveKpiStreamStore` (`src/services/liveKpi/liveKpiStreamStore.ts`) mit `acquire`, `subscribe`, `getSnapshot`; Muster in `src/hooks/useLiveKpi.ts`. Ein Feed-Kanal für alle KPIs (G34), Referenzzählung und 60 s Aufbewahrung (`RETENTION_MS`). Status `unconfigured | loading | live | offline | error`, Snapshot mit `value`, `unit`, `occurredAt`, `qualityStatus`. Zeitmodus `live`.
- **Organisation:** `useOrganization()` aus `src/auth/organizationContext` (Muster in `src/hooks/queries/useCrmQueries.ts`, `session?.organizationId`).

## Vorgaben

### Leseschicht

```ts
type TileDataState =
  | 'laden' | 'bereit' | 'keine_daten' | 'fehler' | 'offline' | 'veraltet'
  | 'nicht_konfiguriert' | 'nicht_verfuegbar';

type TileOverview =
  | { kind: 'team_hr'; data: ReturnType<typeof getTeamHrSnapshot> }
  | { kind: 'roadmap'; data: ReturnType<typeof getRoadmapSnapshot> }
  | { kind: 'live_aktivitaet'; data: readonly LiveKpiActivityItem[] };

/** Kachel ohne aktiven Katalogeintrag: keine Metadaten erfinden. */
interface UnavailableTileData {
  catalogId: string;
  state: 'nicht_verfuegbar';
  reason: 'katalog_unbekannt' | 'katalog_inaktiv';
  message: string;
}

type TileData = ResolvedTileData | UnavailableTileData;

interface ResolvedTileData {
  catalogId: string;
  state: Exclude<TileDataState, 'nicht_verfuegbar'>;
  value: number | null;                 // Einzelwert/Verhältnis; null, wenn nicht vorhanden
  series: readonly { label: string; value: number }[] | null; // Kategorien, Anteile, Zeitreihe
  overview: TileOverview | null;        // nur Übersichtskacheln (kind 'uebersicht')
  unit: string;                         // aus dem Katalog
  timeBasis: string;                    // aus dem Katalog; bei Live zusätzlich asOf
  asOf: string | null;                  // ISO-Zeitpunkt der Messung (Live: occurredAt), sonst null
  origin: { layer: SourceLayer; module: string; exportName: string; liveKpiId?: string };
  scope: 'stammdaten' | 'organisation' | 'organisationsuebergreifend';
  effectiveFilter: EffectiveTileFilter;
  quality?: 'degradiert';               // Live-Snapshot mit qualityStatus 'degraded'
  message?: string;                     // verständlicher Hinweis, keine technische Fehlermeldung
}
```

- Fehlende Werte ergeben `keine_daten`, **nicht 0**. Eine echte 0 aus der Quelle bleibt `bereit` mit `value: 0`.
- CRM ohne importierte Deals (leere Liste) ergibt `keine_daten` für alle CRM-Einträge, weil `getPipelineOverview` dann Nullen liefert, die nicht von einer echten Null unterscheidbar sind.
- `veraltet`: Ein letzter Live-Wert existiert, der Stream ist aber `offline` oder `error`. Wert und `asOf` bleiben sichtbar. **Keine Altersschwelle erfinden.** Wenn eine Schwelle nötig erscheint, Rückfrage an Marc im BUILD_LOG.
- `offline` bzw. `fehler` ohne letzten Wert: kein Wert. `unconfigured` wird zu `nicht_konfiguriert`.
- `nicht_verfuegbar`: Katalog-ID unbekannt oder nicht `aktiv` (deckt `validateDashboardConfig().unavailable` aus Auftrag 070 ab). Rückgabe ist `UnavailableTileData` **ohne** Einheit, Zeitbasis und Herkunft; nichts wird erfunden. Die Kachel bleibt erhalten.
- Übersichtskacheln liefern `overview` mit dem unveränderten Ergebnis ihrer Quelle; `value` und `series` sind dort `null`. Team/HR und Roadmap sind `bereit`, sobald die Quelle ein Ergebnis liefert. Live-Aktivität: keine Einträge ergibt `keine_daten`, der Status folgt dem Gesamtstatus von `useLiveKpiActivity`.
- Fehler aus Quellen (z. B. ungültiger Betrag in einem Deal, den `getPipelineOverview` als Exception meldet) werden zu `fehler` mit verständlichem `message`, ohne Absturz der übrigen Kacheln.
- `funnelStages` und `mayBeNegative` aus dem Katalog bleiben in den Daten erkennbar über die Katalog-ID; die Leseschicht sortiert oder kürzt keine Stufen und entfernt keine negativen Werte.

### Effektiver Filter (`dashboardFilters.ts`)

- Eingang: zentrale Filter (`DashboardFilters`), Kachelkonfiguration (`DashboardTileConfig`), Katalogeintrag. Ausgang `EffectiveTileFilter` mit `mode` (`dashboard` | `eigener_zeitraum` | `fester_stand`), `period` (oder `null`), `pipeline` (oder `null`) und je Filter einer Begründung, falls er nicht wirkt (z. B. „Quelle hat kein belegtes Datumsfeld“, „Historischer Stand ist fest“).
- Kachelausnahme vor zentralem Filter. Ein Filter wirkt nur, wenn der Katalogeintrag ihn in `filters` führt.
- **Zeitraum:** Für den heutigen Katalog wirkt ein Zeitraum auf **keine** Quelle. Stammdaten sind `fest`, CRM hat mit `closeDate` zwar ein Feld, dessen fachliche Bedeutung ist aber nicht belegt (`KPI_CATALOG.md`), Live ist `live`. Der Auflöser meldet das ausdrücklich, statt den Zeitraum still zu ignorieren. Historische Jahreswerte werden weder auf Monate verteilt noch umetikettiert.
- Unterstützte Datumsfelder je Quelle als Konstante hinterlegen (heute: keine wirksamen). Bestand/Fluss kommt aus `aggregation` im Katalog und wird nicht neu bestimmt.
- **Pipeline:** Nur CRM-Einträge. Umsetzung durch eine filternde `FunnelDealSource`, die `getImportedFunnelDeals()` von `CRMRepository` aufruft und nach `deal.pipeline` filtert, bevor `getPipelineOverview` aggregiert. Kein Eingriff in `src/domain` oder `crmRepository.ts`.

### Abfragen, Teilung, Aktivierung (`useDashboardData.ts`)

- Signatur sinngemäß `useDashboardData(tile: DashboardTileConfig, filters: DashboardFilters | undefined, options: { enabled: boolean }): TileData`.
- **CRM:** React Query mit Schlüssel aus `dashboardQueryKeys.ts`: `['dashboard', organizationId, 'crm', 'pipelineOverview', pipeline ?? null]`. Mehrere CRM-Kacheln mit gleichem Pipeline-Filter teilen **eine** Abfrage; die Werte je Eintrag werden per `select` bzw. reiner Funktion aus demselben Ergebnis gelesen. Ohne `organizationId` keine Abfrage. Der bestehende Schlüssel `crmKeys.pipelineOverview()` hat keine Organisation und wird deshalb nicht verwendet.
- **Live:** je Kachel `acquire` + `subscribe` auf den bestehenden Store, wie `useLiveKpi`. Kein neuer Kanal. Mehrere Kacheln mit derselben Live-ID halten denselben Store-Eintrag (Referenzzählung). Kombinationskacheln mit `liveKpiIds` sind nicht aktiv und werden nicht aufgelöst. Der Store wird als optionaler Parameter übergeben (Vorgabe `liveKpiStreamStore`), damit Tests eine Instanz aus `createLiveKpiStreamStore(createFakeAdapter().adapter)` nutzen können.
- **Stammdaten:** synchron, ohne Abfrage.
- **Live-Aktivität:** `acquire` + `subscribe` auf die zwölf IDs im übergebenen Store, Werte über `aggregateLiveActivity`; derselbe Store, kein neuer Kanal. `enabled: false` abonniert nichts.
- `enabled: false` startet keine Abfrage und kein Live-Abo und liefert `laden` ohne Wert. Wechsel auf `true` startet genau einmal. Filterwechsel zeigt nie das alte Ergebnis als neues an: solange die Abfrage zum neuen Filter läuft, `laden` (oder vorheriger Wert ausdrücklich als alt gekennzeichnet, nicht beides vermischt).
- Beim Unmount werden Live-Abos freigegeben (`release`), React Query räumt nach Standard auf.

### Live-Geltungsbereich (Rückfrage aus Auftrag 070)

`live_kpi_public_feed` hat keine Organisationsspalte und ist für `anon` und `authenticated` lesbar. Eine mandantengetrennte Quelle bräuchte Schema- und Policy-Änderungen und ist **nicht** Teil dieses Auftrags. Vorgabe: Live-Kacheln bleiben verfügbar, `scope: 'organisationsuebergreifend'`. Der Abschnitt in `KPI_CATALOG.md` hält das fest. Die spätere Kachel zeigt den Hinweis (Teilauftrag 4). **Bestätigt durch Marc am 03.10.2026** („dann so lassen“): Live-Kacheln bleiben mit Hinweis; eine mandantengetrennte Live-Quelle kann später als eigener Auftrag folgen, indem Quelle und `scope` ausgetauscht werden.

## Umsetzung

- [ ] Tests zuerst: `dashboardFilters.vitest.ts` (Vorrang Kachelausnahme, Pipeline nur bei CRM, Zeitraum wirkt nirgends mit Begründung, `fester_stand` bleibt fest).
- [ ] `dashboardFilters.ts` implementieren.
- [ ] Tests zuerst: `dashboardData.vitest.ts` mit Fake-`FunnelDealSource` und Fake-Store-Adapter (`src/services/liveKpi/__tests__/fakes.ts` nur lesen bzw. importieren). Fälle: echte 0, leere Deal-Liste, Exception aus der Quelle, Pipeline-Filter, jede Live-Statuslage, veralteter Wert, degradiert, unbekannte und inaktive ID (Rückgabe ohne Metadaten), jeder aktive Stammdaten-Eintrag löst sich zu `bereit` auf und liefert **inhaltlich** das Erwartete: die acht Einzelwerte exakt wie oben, ein nicht lesbarer Wertstring ergibt `fehler`, ARR-Verlauf mit acht Paaren `Q1 24`…`Q4 25` und den Werten aus `CHART_ARR`, MRR-Paketmix mit drei Paaren aus `CHART_MRR.labels`, Team/HR und Roadmap als `overview` gleich dem Quellergebnis. Ungleiche Längen von `labels` und `data` ergeben `fehler`.
- [ ] `dashboardData.ts`, `resolveBaseline.ts`, `resolveCrm.ts`, `resolveLive.ts`, `dashboardQueryKeys.ts` implementieren.
- [ ] Tests zuerst: `useDashboardData.ui.vitest.tsx`. Drei CRM-Kacheln mit gleichem Filter → eine Abfrage; andere Pipeline → zweite Abfrage. Drei Live-Kacheln derselben ID → ein Store-Eintrag, nach Unmount aller Kacheln Referenzzahl 0. Live-Aktivität abonniert genau die zwölf IDs und liefert höchstens zehn Einträge, neueste zuerst; inaktiv kein Abo. Paritätstest: Für denselben Store-Zustand liefern `aggregateLiveActivity` und die Regel des Hooks dieselben Einträge und denselben Status (Fälle: ein Stream live, alle offline, Gleichstand bei `occurredAt`, mehr als zehn Snapshots). `enabled: false` → keine Abfrage, kein `acquire`. Filterwechsel zeigt keinen alten Wert als neuen. Ohne Organisation keine CRM-Abfrage.
- [ ] `useDashboardData.ts` implementieren.
- [ ] Abschnitt „Datenauflösung (Auftrag 071)“ in `KPI_CATALOG.md` ergänzen.
- [ ] Pflicht-Verifikation (`CLAUDE.md` §7): `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build`, jeweils Exit-Code 0 prüfen, nicht nur die letzte Zeile. Schutzbereichs-Diff gegen die Basis leer.
- [ ] Builder-Eintrag in `docs/BUILD_LOG.md`: Ziel & Kontext, geänderte Dateien, funktionale Prüfungen, Schutzbereichs-Diff, Gates mit Exit-Codes, Ergebnis. Keine Screenshots (keine Oberfläche).
- [ ] Push auf `antigravity/auftrag-071`, PR gegen `main` öffnen. Der PR-Text nennt diesen Auftrag.

## Abnahme

Vorschau, Kachel und Detailseite können denselben effektiven Kontext lesen (eine Funktion, ein Hook). Eine historisch gebundene KPI verändert sich nicht durch einen Zeitraumfilter. Gleiche Quellen werden zwischen Kacheln geteilt, nachgewiesen durch Tests. Claude meldet `KEINE BEFUNDE`; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Kacheln, Diagramme, Platzhalter und `IntersectionObserver` (Teilauftrag 4/5), Speicherung (Teilauftrag 3), Kombinationen und Live-Kombinationen (Teilauftrag 6), mandantengetrennter Live-Feed, Zeitraumfilter für CRM vor Klärung von `closeDate`.
