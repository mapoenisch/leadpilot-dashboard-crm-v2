# Auftrag 034: Datenvertrag, Schema und sichere Live-KPI-Schreibpipeline

> **Für ausführende Agenten:** Dieser Auftrag wird seriell bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Builder-Bericht wird in `docs/BUILD_LOG.md` festgehalten; erst danach erfolgt der unabhängige Codex-Review.

**Phase:** Phase 4 – Reale Integrationen & Live-Datenfluss
**Gate:** G18
**Status:** BEREIT ZUR AUSFÜHRUNG
**Baseline:** `1cd0539` (`docs(build-log): approve Gate G17 after independent review`)
**Planquelle:** `docs/BUILD_PLAN_V2.0.0.md`, Phase 4, Auftrag 034 / Gate G18
**Architektur:** `ARCHITECTURE_DECISIONS.md` (Ebene A: historisch, read-only; Ebene B: Simulation, deterministisch; Ebene C: Live-Ist, getrennt)

---

## 1. Ziel & Kontext

Baue die serverseitige Grundlage für überprüfbare, idempotente Live-KPI-Events aus n8n nach Supabase – ohne eine UI, ohne Live-Read-Hook und ohne Änderungen an historischen Daten oder der Simulation.

Ein gültiges Testevent muss über den dokumentierten n8n-Workflow sicher in die neue Supabase-Struktur geschrieben werden können. Ohne konfigurierte externe Credentials darf nichts vorgetäuscht werden: Lokale Contract-/Replay-Tests müssen dennoch vollständig ausführbar sein.

n8n bleibt für die Web-App eine Offline-Integrationsschicht. Die App ruft n8n niemals zur Laufzeit auf. Ein späterer Live-Read-Adapter gehört ausschließlich zu Auftrag 035 / Gate G19.

---

## 2. Verbindlicher Datenvertrag V1 (`live-kpi-event/v1`)

Definiere einen versionierten Contract `live-kpi-event/v1` mit mindestens:

- `contractVersion`: exakt `"1.0"`
- `eventId`: nicht leer, pro `sourceSystem` eindeutig
- `kpiId`: stabiler technischer Bezeichner
- `value`: endlicher numerischer Wert
- `unit`: nicht leer
- `occurredAt`: valider ISO-8601-Zeitstempel mit verpflichtender Zeitzone (`Z` oder Offset wie `+02:00`)
- `sourceSystem`: nicht leer
- `sourceReference`: optional
- `qualityStatus`: `"valid"` oder `"degraded"`
- `correlationId`: nicht leer
- `context`: optionales JSON-Objekt
- `provenance`: exakt `"live"`

Zusätzlich wird ein deterministischer `idempotencyKey` aus `sourceSystem` und `eventId` gebildet (z. B. `${sourceSystem}:${eventId}`). Dasselbe Event darf niemals einen zweiten Live-Wert erzeugen.

Ungültige Events werden nicht still verworfen: Sie erhalten einen nachvollziehbaren Ablehnungsgrund in einer separaten Audit-/Rejection-Struktur. Keine sensiblen Rohdaten oder Secrets speichern.

---

## 3. Datenebenen

- `historisch`: bestehende, eingefrorene Baselines. Niemals ändern.
- `simulation`: bestehende Engine, Runs, Snapshots und RNG. Niemals ändern.
- `live`: ausschließlich neue Live-KPI-Ereignisse aus diesem Auftrag.
- Ein Live-Event darf weder historische Baselines noch `SimulationRun`, Snapshots, Events oder Parameter verändern.

---

## 4. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_034_DATENVERTRAG_SCHEMA_SCHREIBPIPELINE.md` | Diesen Auftrag als versionierte Spezifikation ablegen. |
| `src/types/liveKpi.ts` | Typen und Contract-Konstanten für `live-kpi-event/v1`. |
| `src/services/liveKpi/liveKpiContract.ts` | Reine, testbare Validierung und deterministische Bildung des `idempotencyKey`; keine Browser- oder Supabase-Abhängigkeit. |
| `supabase/migrations/20260906_live_kpi_pipeline.sql` | Neue Tabellen, Indizes, RLS, minimal privilegierte Rollen/Grants und sichere Ingest-RPC. |
| `supabase/schema.sql` | Bestehendes Schema um dieselbe Live-KPI-Struktur ergänzen, ohne bisherige CRM-Tabellen oder Policies umzuschreiben. |
| `tools/n8n/live-kpi-ingest.workflow.json` | Importierbarer n8n-Workflow: Contract validieren, Ingest-RPC aufrufen, Fehlerpfad dokumentieren. |
| `tools/n8n/live-kpi-replay.fixture.json` | Deterministische, ausschließlich als Testdaten markierte Beispiele: gültig, Duplikat, ungültig. |
| `tools/n8n/README.md` | Sichere Einrichtung, Credential-Hinweise, lokaler Replay-/Staging-Ablauf, keine Secrets. |
| `scripts/verifyLiveKpiContract.ts` | Lokaler Contract-, Idempotenz- und Negativtest ohne externe Credentials. |
| `docs/BUILD_LOG.md` | Builder-Bericht nach Abschluss. |

Keine weiteren Dateien ändern. Falls eine zusätzliche Datei zwingend nötig erscheint: stoppen und begründen.

---

## 5. Supabase-Anforderungen

1. **Neue Tabelle für akzeptierte Live-KPI-Events (`live_kpi_events`):**
   - Isoliert von bestehenden CRM-, Baseline- und Simulations-Tabellen;
   - Zeitstempel (`occurred_at`, `ingested_at`), Datenherkunft (`source_system`, `source_reference`), Qualitätsstatus (`quality_status`), Korrelation (`correlation_id`) und Kontext (`context`);
   - Unique Constraint für `idempotency_key`;
   - Indizes mindestens für `kpi_id + occurred_at DESC`, `correlation_id` und `idempotency_key`.

2. **Neue Tabelle für abgelehnte Ingest-Versuche (`live_kpi_rejections`):**
   - Ablehnungszeitpunkt (`rejected_at`), technischer Fehlercode (`error_code`), Fehlermeldung (`error_message`), Korrelation (`correlation_id`), sichere Ereignisidentität (`source_system`, `event_id`);
   - keine Secrets und keine unredigierten sensitiven Payloads.

3. **RLS und Rechte:**
   - RLS für beide neuen Tabellen aktivieren.
   - Browserrollen erhalten keine Schreibrechte.
   - Es gibt keine INSERT-, UPDATE- oder DELETE-Policy für `anon` oder `authenticated`.
   - n8n erhält ausschließlich das Recht, die dedizierte Ingest-RPC auszuführen; kein direkter Tabellen-Schreibzugriff.
   - Credentials beziehungsweise Passwörter werden nie in SQL, Workflow-JSON, Dokumentation, `.env.example` oder Frontend-Code abgelegt.
   - Falls eine Datenbankrolle manuell provisioniert werden muss, dokumentiere nur Rollenname, benötigte Grants und den sicheren Operator-Schritt – nie ein Passwort.

4. **Ingest-RPC (`ingest_live_kpi_event`):**
   - nimmt ausschließlich Contract-V1-Felder entgegen;
   - validiert Pflichtfelder, Version, Herkunft, Zeitstempel und Qualitätsstatus;
   - schreibt gültige Events idempotent;
   - liefert für ein Duplikat einen eindeutigen, erfolgreichen Duplikatstatus ohne zweiten Datensatz (`status: "duplicate"`);
   - protokolliert ungültige Events sicher als Rejection und liefert einen maschinenlesbaren Fehlercode (`status: "rejected"`);
   - darf keine Tabelle außerhalb der neuen Live-KPI-Struktur verändern.

---

## 6. n8n-Anforderungen

- Workflow ist importierbar und enthält keine Zugangsdaten.
- Credentials werden ausschließlich über n8n-Credentials konfiguriert.
- Der Workflow verarbeitet den Contract, bildet oder prüft den Idempotenzschlüssel und ruft ausschließlich die Supabase-Ingest-RPC auf.
- Erfolgs-, Duplikat- und Fehlerpfad müssen sichtbar getrennt sein.
- Die App erhält keine n8n-URL, keine n8n-Credentials und keinen Laufzeit-HTTP-Aufruf.
- Dokumentiere einen sicheren lokalen/stagingfähigen Testevent-Ablauf. Falls Supabase/n8n lokal nicht konfiguriert ist, darf kein angeblicher End-to-End-Erfolg dokumentiert werden.

---

## 7. Explizit nicht Bestandteil von G18

- Keine UI, Route, Karte, Hook, Realtime-Subscription oder Supabase-Leseabfrage im Browser.
- Keine Änderung an `src/services/db/supabaseClient.ts`; der isolierte Read-Adapter folgt erst in G19.
- Keine Änderung an historischen Baselines, CRM-Datenquellen, Simulation, RNG, Runs oder Snapshots.
- Keine neuen npm-Abhängigkeiten.
- Keine echte HubSpot- oder andere Fremdsystem-Anbindung.
- Keine Secrets, Keys, Passwörter oder vollständigen Connection-Strings im Repository.

---

## 8. Schutzbereiche

Folgende Bereiche müssen exakt unverändert bleiben:

- `src/simulation/**`
- `src/context/**`
- `src/services/data/**`
- `src/features/resources/**`
- bestehende CRM-Baseline-Dateien
- bestehende n8n-Generator-Workflows für Baselines

Explizite Ausnahme: `src/types/liveKpi.ts` ist als neue, isolierte Live-Contract-Datei erlaubt.

---

## 9. Verifikation

```bash
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npx tsx scripts/verifyLiveKpiContract.ts
npm run build
git diff --check 1cd0539..HEAD
git diff --exit-code 1cd0539..HEAD -- src/simulation src/context src/services/data src/features/resources
```

Zusätzlich prüfen und im Build-Log dokumentieren:

- Contract-Test: gültiges V1-Event akzeptiert.
- Idempotenz-Test: gleiches `sourceSystem + eventId` ergibt keinen zweiten Event.
- Negativtests: ungültige Version, fehlende Pflichtfelder, ungültiger Zeitstempel, falsche Herkunft, ungültiger Qualitätsstatus.
- Statischer Secret-Check für neue Workflow-, SQL- und Dokumentationsdateien.
- SQL-Review: keine Browser-Schreibrechte, keine Service-Role-Keys im Frontend, keine direkten Tabellenrechte für n8n.
- Lokaler Replay-Weg mit Fixture dokumentiert.
- Keine Screenshots erforderlich: G18 verändert keine sichtbare Oberfläche.
