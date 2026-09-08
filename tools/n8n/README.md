# LeadPilot n8n Baseline Generators (Offline-Fabriken)

Dieses Verzeichnis enthält die Konfiguration und Vorlagen für die n8n-Offline-Fabriken zur Erzeugung versionierter, deterministischer Baseline-Datensätze (`baseline-<version>.json` und `baseline-hubspot-<datum>.json`).

## Architektur-Prinzip (Entscheidung 1601–1625 / B22 / AUFTRAG 020)

- **Offline-Ausführung**: n8n wird ausschließlich offline (lokal via Docker / `http://localhost:5678`) betrieben.
- **Keine Laufzeit-Kopplung**: Die Webanwendung führt zur Laufzeit **keine** HTTP-Calls gegen n8n oder externe APIs (wie HubSpot) aus, sondern lädt gepinnte, versionierte JSON-Dateien aus `src/features/crm/data/baselines/`.
- **Kein Secret im Repo**: API-Keys und Tokens (z. B. HubSpot Service-Key) leben ausschließlich in n8n-Credentials (`Header Auth`), niemals im Git-Repository oder im Frontend-Bundle.

---

## 1. Simulierter Baseline-Generator (`generate-baseline.workflow.json`)

- **Deterministische PRNG**: Generierte Datensätze nutzen den Mulberry32-Algorithmus (`mulberry32.js`), um bei identischem Seed bitgleiche Ergebnisse zu garantieren.
- Workflow `generate-baseline.workflow.json` in n8n importieren, manuell ausführen, Ausgabe-Datei nach `src/features/crm/data/baselines/baseline-<version>.json` übernehmen.

---

## 2. HubSpot Baseline-Pull (`generate-baseline-hubspot.workflow.json`)

### A. Credential in n8n anlegen (`http://localhost:5678`)
- **Credential-Typ:** *Generic Credential Type* → *Header Auth* (`httpHeaderAuth`)
- **Credential Name:** `HubSpot Service Key – LeadPilot`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer <hubspot_service_key>`

### B. Erforderliche Scopes
- `crm.objects.companies.read`
- `crm.objects.contacts.read`
- `crm.objects.deals.read`
- Optional: `crm.schemas.deals.read`, `crm.objects.owners.read`

### C. Feldmapping HubSpot → LeadPilot (`src/types/crm.ts`)

| Ziel-Entität (`src/types/crm.ts`) | LeadPilot-Feld | HubSpot Property | Bemerkung |
|---|---|---|---|
| **Company** | `id` | `hs_object_id` / `id` | Eindeutige ID |
| | `name` | `properties.name` | Pflichtfeld |
| | `domain` | `properties.domain` | Optional |
| | `industry` | `properties.industry` | Fallback 'Allgemein' |
| | `city` | `properties.city` | Fallback 'Unbekannt' |
| | `postalCode` | `properties.zip` | Optional |
| | `employeeCount` | `properties.numberofemployees` | Fallback 1 |
| | `createdAt` | `properties.createdate` | ISO-Datum |
| **Contact** | `id` | `hs_object_id` / `id` | Eindeutige ID |
| | `companyId` | `associatedcompanyid` / Assoziation | FK auf `Company.id` (Dangling verworfen) |
| | `email` | `properties.email` | Fallback `contact-<id>@leadpilot.internal` |
| | `firstName` | `properties.firstname` | Optional |
| | `lastName` | `properties.lastname` | Optional |
| | `jobTitle` | `properties.jobtitle` | Optional |
| | `name` | `${firstname} ${lastname}` | Berechnet |
| **ImportedFunnelDeal** | `id` | `hs_object_id` / `id` | Eindeutige ID |
| | `companyId` | Assoziation `companies` | Optionaler FK |
| | `dealName` | `properties.dealname` | Fallback `Deal <id>` |
| | `stage` | `STAGE_MAP[dealstage]` | Siehe `hubspot-stage-map.json` |
| | `amount` | `properties.amount` | Numerischer Wert (€) |
| | `closeDate` | `properties.closedate` | YYYY-MM-DD |
| | `pipeline` | `properties.pipeline` | Pipeline-Identifier |

### D. Stage-Mapping (`tools/n8n/hubspot-stage-map.json`)

```json
{
  "appointmentscheduled": "LEAD",
  "qualifiedtobuy": "QUALIFIED_LEAD",
  "presentationscheduled": "PITCH_DEMO",
  "decisionmakerboughtin": "PROPOSAL",
  "contractsent": "CLOSING",
  "closedwon": "WON",
  "closedlost": "LOST"
}
```

### E. Durchführung & Übernahme
1. Workflow `tools/n8n/generate-baseline-hubspot.workflow.json` in n8n importieren.
2. Credential `HubSpot Service Key – LeadPilot` zuweisen.
3. Workflow ausführen (`Test workflow`).
4. Output-Envelope validieren und als `src/features/crm/data/baselines/baseline-hubspot-<datum>.json` speichern.
5. In `src/services/data/sources/hubSpotBaselineSource.ts` in der `FILES`-Map registrieren.

---

## 3. Live-KPI Ingest Pipeline (Gate G18 — Ebene C)

Die Live-KPI-Pipeline verarbeitet Live-Ist-Ereignisse nach dem standardisierten Contract `live-kpi-event/v1` (`src/types/liveKpi.ts`) und schreibt sie idempotent über die Ingest-RPC `public.ingest_live_kpi_event` in Supabase.

### A. Architektur & Sicherheitsprinzip
- **Keine Laufzeit-Kopplung der Webanwendung**: Die App ruft n8n niemals zur Laufzeit auf. n8n ist eine reine Offline-/Batch-Integrationsschicht.
- **Minimal privilegierte Datenbankrolle**: Der Workflow verbindet sich über einen nativen PostgreSQL-Node (`n8n-nodes-base.postgres`) mit der dedizierten Datenbankrolle `n8n_ingest`.
- **Kein administrativer Service-Role-Schlüssel**: Der Workflow verwendet niemals überprivilegierte Admin- oder Superuser-Keys.
- **Keine Tabellengrants**: Die Rolle `n8n_ingest` besitzt keinerlei direkte Tabellenberechtigungen (`REVOKE ALL`), sondern ausschließlich `GRANT USAGE ON SCHEMA public` und `GRANT EXECUTE ON FUNCTION public.ingest_live_kpi_event`.
- **Search-Path-Härtung**: Die `SECURITY DEFINER`-Funktion nutzt `SET search_path = pg_catalog;` und greift nur über vollqualifizierte Tabellennamen zu.
- **Kanonische Idempotenz**: `${sourceSystem}:${eventId}` nach strikter Validierung (`^[a-zA-Z0-9._-]{1,128}$`).
- **Deterministischer Rejection-Schutz (Kein Kontext-Logging)**: Bei Ablehnungen (`rejected`) wird der `context` bewusst nicht persistiert, sondern deterministisch als `'{}'::jsonb` in `public.live_kpi_rejections.sanitized_context` abgelegt. Dadurch wird jedes Risiko ausgeschlossen, dass unbereinigte, beliebig benannte oder verschachtelte Secrets (z. B. `Authorization`, Tokens, Passwörter, API-Keys) in Rejection-Logs gelangen. Eine unvollständige Blacklist-Redaktion existiert nicht mehr.

### B. Sichere Credential-Einrichtung in n8n (`http://localhost:5678`)
- **Credential-Typ:** *Postgres*
- **Credential-Name:** `LeadPilot PostgreSQL (n8n_ingest role)`
- **Host / Port / Database:** Entsprechend der lokalen oder Staging-Supabase-Instanz.
- **User:** `n8n_ingest`
- **Passwort:** Der Operator setzt das Passwort außerhalb des Repositories über die Supabase-/PostgreSQL-Administration und speichert es anschließend ausschließlich als n8n-Credential.
- **SSL:** `require` (oder `disable` für rein lokale Docker-Umgebungen).

### C. Import & Ausführung des Ingest-Workflows
1. Workflow `tools/n8n/live-kpi-ingest.workflow.json` in n8n importieren.
2. Dem PostgreSQL-Node das Credential `LeadPilot PostgreSQL (n8n_ingest role)` zuweisen.
3. Der Workflow nimmt Events via Webhook (`POST /webhook/live-kpi-ingest`) oder Manual Trigger entgegen, leitet das Rohpayload ohne Defaults oder Typ-Coercion weiter, ruft parametrisiert `SELECT public.ingest_live_kpi_event($1::jsonb)` auf und verzweigt strikt nach:
   - **Accepted (201):** Event neu angelegt.
   - **Duplicate (200):** Idempotent erkannt, kein zweiter Eintrag erzeugt.
   - **Rejected (422):** Validierungsfehler, sicher in `public.live_kpi_rejections` protokolliert (Kontextdaten werden deterministisch auf `'{}'::jsonb` gesetzt und nicht gespeichert).

### D. Lokaler Replay- & Staging-Ablauf mit Test-Fixtures
In `tools/n8n/live-kpi-replay.fixture.json` sind deterministische, rein synthetische Testfälle hinterlegt:
- `valid_event_1` & `valid_event_2`: Gültige synthetische Test-Payloads.
- `duplicate_event`: Duplikat zur Verifikation der Idempotenz.
- `invalid_*`: Systematische Negativtests (falsche Version, ungültige Zeitstempel wie `"tomorrow"` oder `"invalid-date"`, ungültige Typen, falsche Herkunft).

**Ehrlicher Statusnachweis:**
Wenn lokal keine aktive PostgreSQL-/Supabase-Instanz mit konfigurierter `n8n_ingest`-Rolle läuft, wird kein vorgetäuschter End-to-End-Erfolg dokumentiert. Die vollständige funktionale Validierung, Idempotenzlogik, Fehlercode-Parität und der statische Sicherheits-Audit werden offline und reproduzierbar über das Verifikationsskript `scripts/verifyLiveKpiContract.ts` nachgewiesen.

---

## 4. End-to-End Realtime-Härtung & Runner (Gate G20)

Für die Überprüfung des vollständigen Datenflusses von n8n über Supabase bis zum öffentlichen Projektions-Feed existiert der dedizierte E2E-Runner `scripts/runLiveKpiE2e.ts`.

### A. Funktionsweise & Schutz gegen Scheinerfolg

- **Kein Scheinerfolg:** Ohne gesetzte Umgebungsvariablen beendet sich der Runner mit dem klaren Status `SKIPPED_NOT_CONFIGURED`.
- **Lokaler Preflight:** Die deterministische Verifikation aller Logikpfade, Tie-Breaks, Race-Condition-Schutzmechanismen und Rejections erfolgt offline über `npx tsx scripts/verifyLiveKpiE2e.ts`.

### B. Operator-Anleitung für den realen E2E-Lauf

Um einen echten Test gegen eine bereitgestellte Staging- oder Testumgebung auszuführen:

1. In n8n sicherstellen, dass der Workflow `tools/n8n/live-kpi-ingest.workflow.json` aktiv ist und der Webhook-Pfad bereitsteht.
2. In der lokalen Shell folgende Umgebungsvariablen setzen (KEINESFALLS in `.env` oder ins Repository committen):

```bash
export LIVE_KPI_E2E_ENABLE=true
export LIVE_KPI_E2E_N8N_WEBHOOK_URL="https://<deine-n8n-instanz>/webhook/live-kpi-ingest"
export LIVE_KPI_E2E_SUPABASE_URL="https://<deine-supabase-instanz>.supabase.co"
export LIVE_KPI_E2E_SUPABASE_ANON_KEY="<dein-öffentlicher-anon-key>"
```

3. Den kontrollierten Runner ausführen:

```bash
npx tsx scripts/runLiveKpiE2e.ts
```

Der Runner prüft in zwei Phasen:
- **Phase 1 (Ingest & Datenbank-Projektion):**
  - Erreichbarkeit des öffentlichen Supabase-Feeds (`public.live_kpi_public_feed`).
  - Vorab-Vertragsprüfung (G18) jedes Payloads inklusive `correlationId`.
  - Erfolgreichen Ingest eines validen Events via HTTP POST an n8n.
  - Automatische Trigger-Projektion in den öffentlichen Feed innerhalb von 5 Sekunden.
  - Idempotentes Duplikat-Handling (Feed-Zeilenanzahl bleibt unverändert).
  - Sichere Rejection bei ungültigen Payloads (Feed-Zeilenanzahl bleibt unverändert, leere `{}`-Metadaten).
  - High-Frequency Zweier-Burst mit identischem `occurred_at` (deterministischer Tie-Break nach `ingested_at DESC` auf 5.30).
  - Client-Snapshot-Kompatibilität für `useLiveKpi`.
- **Phase 2 (Browser-E2E-Runner mit Headless Chrome & CDP):**
  - Automatischer Vite-Build mit Test-Supabase-Konfiguration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) und Start des Preview-Servers.
  - Start von Headless Chrome und Verbindungsaufbau via Chrome DevTools Protocol (CDP).
  - Navigation zu `/dashboard` und Prüfung des initialen Zustands im realen DOM (`[data-testid="live-kpi-card"]`).
  - Event-Versand via n8n-Webhook und Abwarten des neuen Werts im realen DOM der `LiveKpiCard` (Beweis: n8n → Supabase → WebSocket → useLiveKpi → DOM-Reaktivität).
  - Kontrollierte Netzwerkunterbrechung via CDP (`Network.emulateNetworkConditions({ offline: true })`), Nachweis des Fehlerstatus im DOM (ohne rohe `error.message`), anschließende Wiederherstellung und Nachweis des Snapshot-Reloads.
  - Wegnavigation zu `/crm` (Unmount-Verifikation) und Zurücknavigation zu `/dashboard` (Remount-Verifikation) mit nachfolgendem Event zum Ausschluss von Subscription-Leaks.

Nach Abschluss die exportierten Variablen mit `unset LIVE_KPI_E2E_ENABLE` wieder zurücksetzen.

---

## 5. V2.1 Multi-KPI-Katalog & Operator-Zuordnung (Gate G24)

Für V2.1 definiert `src/services/liveKpi/liveKpiDefinitions.ts` einen verbindlichen, display-sicheren Katalog von zwölf Ebene-C-KPIs.

### A. Katalog-Übersicht & spätere UI-Verbraucher

| KPI-ID | Kanonische Einheit | Format | Gruppe | Späterer UI-Verbraucher |
|---|---|---|---|---|
| `arr` | `EUR` | `currency` | `core` | Executive Dashboard (`/dashboard`) – Core KPI Cards |
| `mrr` | `EUR` | `currency` | `core` | Executive Dashboard (`/dashboard`) – Core KPI Cards |
| `pipeline_coverage` | `x` | `ratio` | `core` | Executive Dashboard (`/dashboard`) – Core KPI Cards |
| `arr_direct` | `EUR` | `currency` | `arr_mix` | ARR Mix Breakdown – Stacked Bar / Area Chart |
| `arr_partner` | `EUR` | `currency` | `arr_mix` | ARR Mix Breakdown – Stacked Bar / Area Chart |
| `arr_outbound` | `EUR` | `currency` | `arr_mix` | ARR Mix Breakdown – Stacked Bar / Area Chart |
| `arr_other` | `EUR` | `currency` | `arr_mix` | ARR Mix Breakdown – Stacked Bar / Area Chart |
| `pipeline_leads` | `count` | `count` | `funnel` | Funnel Distribution – Stage KPI & Trend |
| `pipeline_mql` | `count` | `count` | `funnel` | Funnel Distribution – Stage KPI & Trend |
| `pipeline_sql` | `count` | `count` | `funnel` | Funnel Distribution – Stage KPI & Trend |
| `pipeline_offers` | `count` | `count` | `funnel` | Funnel Distribution – Stage KPI & Trend |
| `pipeline_won` | `count` | `count` | `funnel` | Funnel Distribution – Stage KPI & Trend |

### B. Pipeline-Prinzip & Generischer Contract
- **Generischer Ingest-Contract (`live-kpi-event/v1`)**: Der bestehende native PostgreSQL-Ingest-Workflow (`tools/n8n/live-kpi-ingest.workflow.json`) bleibt bewusst generisch und fungiert als alleiniger Schreibpfad in die Datenbank. Er erzwingt keine statische Allowlist in der Datenbank, sondern validiert den V1-Transportvertrag.
- **Upstream-Emittenten**: n8n-Workflows oder Upstream-Systeme können Events für alle zwölf definierten KPI-IDs emittieren.
- **Clientseitige Darstellungsgrenze**: Das Frontend rendert zur Anzeige ausschließlich Events, deren `kpiId` im Katalog `LIVE_KPI_DEFINITIONS` registriert ist (`isSupportedLiveKpiId`). Unbekannte KPI-IDs werden im UI ignoriert.
- **Keine Laufzeit-Kopplung**: Die Webanwendung ruft n8n niemals zur Laufzeit auf.

### C. Ehrlicher Offline- & Operator-Status
Die in `tools/n8n/live-kpi-replay.fixture.json` unter `v21_catalog_events` hinterlegten Datensätze sind rein synthetische Offline-Testdaten. Sie stellen keine Produktionsdaten, keine echten CRM-/HubSpot-Werte und keinen Nachweis eines externen Live-Laufs dar. Ohne eine vom Operator konfigurierte Staging- oder Produktivumgebung mit aktiven Zugangsdaten verbleibt die Validierung auf der Ebene der lokalen Contract-, Schema- und Fixture-Prüfungen (`scripts/verifyLiveKpiCatalog.ts`, `scripts/verifyLiveKpiContract.ts`).
