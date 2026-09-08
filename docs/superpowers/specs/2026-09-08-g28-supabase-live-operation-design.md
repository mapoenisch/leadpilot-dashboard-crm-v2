# G28 — Supabase-Live-Inbetriebnahme

**Status:** Von Marc freigegebenes Architekturdesign — noch kein Implementierungsauftrag

**Datum:** 08.09.2026
**Ausgangsbasis:** LeadPilot v2.1.0 (`v2.1.0`, `main` bei `ea5859a`)
**Folgeauftrag:** `ANTIGRAVITY_AUFTRAG_044_SUPABASE_LIVE_INBETRIEBNAHME.md` (erst nach dem Umsetzungsplan erstellen)

## 1. Ziel

Das bereits angelegte, leere Supabase-Cloud-Projekt wird zur echten Ebene-C-Live-Datenbank
für LeadPilot in Betrieb genommen. Der komplette Pfad muss mit kontrollierten echten
Testereignissen funktionieren:

```text
n8n Webhook → sichere PostgreSQL-Ingest-RPC → interne Ereignistabelle
            → minimale öffentliche Feed-Projektion → Supabase Realtime
            → isolierter React-Live-KPI-Stream → Dashboard
```

Das Dashboard erhält dadurch echte, persistierte KPI-Historien und Realtime-Aktualisierungen.
Es wird weder eine zufällige Frontend-Simulation noch ein zweiter Datenpfad eingeführt.

## 2. Ausdrückliche Abgrenzung

### In G28 enthalten

- Supabase-Cloud-Projekt mit den vorhandenen versionierten SQL-Migrationen aktivieren.
- Den existierenden, generischen n8n-Live-KPI-Ingest-Workflow einrichten.
- Frontend-Konfiguration auf die aktuelle Supabase-Publishable-Key-Konvention umstellen.
- Einen kontrollierten, echten E2E-Nachweis über n8n, Datenbank, Realtime und Browser führen.
- Bedien- und Recovery-Anleitung ohne Secrets dokumentieren.

### Nicht in G28 enthalten

- Kein HubSpot-Live-Sync und keine Änderungen am funktionierenden HubSpot-Baseline-Workflow.
- Kein Salesforce- oder sonstiger CRM-Connector.
- Keine neue Dashboard-Oberfläche, keine Design- oder Chart-Änderung.
- Keine neuen Demo-, Zufalls- oder Fake-Werte im Browser.
- Keine Änderung an `src/simulation/**`, historischen Baselines oder dem CRM-Schreibmodell.

Der vorhandene HubSpot-Workflow bleibt der getrennte Weg für versionierte historische
Baselines. Der G28-Ingest ist absichtlich CRM-neutral: Jedes Quellsystem kann künftig
den bestehenden `live-kpi-event/v1`-Contract per n8n-Webhook senden.

## 3. Vorhandene Grundlage

Die Anwendung enthält bereits die Bausteine; G28 aktiviert und verifiziert sie in einer
realen Cloud-Umgebung:

| Baustein | Bereits vorhanden | Aufgabe in G28 |
|---|---|---|
| Contract | `src/types/liveKpi.ts`, `liveKpiContract.ts` | unverändert verwenden |
| Ingest-Schema | `20260906_live_kpi_pipeline.sql` | in Supabase anwenden |
| Browser-Feed/RLS/Realtime | `20260907_live_kpi_read_layer.sql` | in Supabase anwenden und prüfen |
| Browser-Leser | `liveKpiReadAdapter.ts`, Stream-Store, Hooks | mit echtem Projekt konfigurieren |
| n8n-Ingest | `tools/n8n/live-kpi-ingest.workflow.json` | importieren und Credential zuweisen |
| E2E-Nachweis | `scripts/runLiveKpiE2e.ts` | gegen die echte Testumgebung ausführen |

## 4. Zielarchitektur und Sicherheitsgrenzen

### 4.1 Datenfluss

1. Ein beliebiges Upstream-System sendet ein Event an den n8n-Webhook.
2. n8n reicht den Rohpayload ohne Defaults oder Typumwandlung an
   `public.ingest_live_kpi_event(jsonb)` weiter.
3. Die RPC validiert den Contract, schreibt idempotent nach `live_kpi_events` oder
   protokolliert eine datensparsame Rejection ohne unstrukturierten Kontext.
4. Ein Datenbank-Trigger schreibt nur die browserfähigen Felder nach
   `live_kpi_public_feed`.
5. Der Browser darf ausschließlich den öffentlichen Feed lesen und ausschließlich
   dessen `INSERT`-Ereignisse abonnieren.

Der Browser hat niemals Zugriff auf `live_kpi_events`, `live_kpi_rejections`, die
Ingest-RPC oder ein n8n-Credential.

### 4.2 Rollen und Schlüssel

| Ort | Zugang | Zulässige Berechtigung |
|---|---|---|
| React-Browser | Supabase URL + Publishable Key | nur RLS-erlaubtes `SELECT` auf `live_kpi_public_feed` und dessen Realtime-Events |
| n8n | eigene PostgreSQL-Rolle `n8n_ingest` | `USAGE` auf Schema `public`, `EXECUTE` nur auf `ingest_live_kpi_event(jsonb)` |
| Supabase-Administration | `postgres`/Dashboard | ausschließlich Migration, Rollenverwaltung und Incident-Recovery |

Ein Secret Key beziehungsweise das alte `service_role`-Äquivalent gehört weder in den
Browser, noch in `.env.example`, noch in Git, n8n-Workflow-JSON oder Chat-Nachrichten.
Der Publishable Key ist dagegen ein Browser-Schlüssel; seine Sicherheit entsteht durch
RLS und die minimale öffentliche Projektion.

### 4.3 Konfigurationsstandard

Das Frontend verwendet künftig:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Die Datei `.env.example` dokumentiert ausschließlich Platzhalter dafür. Die konkrete
`.env.local` bleibt lokal und ignoriert. Der bisherige Name `VITE_SUPABASE_ANON_KEY`
wird nicht als neue Konfiguration dokumentiert; eine eng begrenzte Kompatibilitätsphase
ist nur zulässig, wenn sie für einen unterbrechungsfreien lokalen Übergang technisch
benötigt wird und anschließend testbar entfernt werden kann.

## 5. Betriebsablauf

### 5.1 Supabase einmalig vorbereiten

1. Projektreferenz und Cloud-URL aus dem Supabase-Dashboard bestimmen; keine Schlüssel
   in Tickets, Quellcode oder Build-Log eintragen.
2. Die beiden vorhandenen Migrationen in Reihenfolge anwenden. Bevorzugt über die
   Supabase-CLI mit verknüpftem Projekt und versionskontrollierten Migrationsdateien.
3. Prüfen, dass beide Tabellen, die Ingest-RPC, der Projektionstrigger, RLS-Policies und
   die Realtime-Publikation tatsächlich vorhanden sind.
4. Für `n8n_ingest` ein individuelles Passwort ausschließlich interaktiv über eine
   kontrollierte Datenbank-Admin-Sitzung setzen. Das Passwort wird aus einem
   Passwortmanager übernommen und weder als SQL-Datei noch in Terminal- oder Git-Logs
   hinterlegt.

### 5.2 n8n einmalig vorbereiten

1. Den bestehenden `live-kpi-ingest.workflow.json` in die laufende lokale n8n-Instanz
   importieren. Der HubSpot-Baseline-Workflow wird nicht umgebaut.
2. Ein Postgres-Credential `LeadPilot PostgreSQL (n8n_ingest role)` mit Pooler/SSL der
   Supabase-Instanz anlegen. Werte leben ausschließlich im n8n-Credential-Speicher.
3. Credential nur dem PostgreSQL-Node des Live-Ingest-Workflows zuweisen.
4. Workflow zuerst manuell testen, dann den Webhook kontrolliert aktivieren. Er bleibt
   kein öffentlich ungeschützter Produktionsendpunkt: URL und vorgeschaltete
   Quellabsicherung werden vor einem externen Sender gesondert entschieden.

### 5.3 Frontend einmalig vorbereiten

1. Lokale `.env.local` mit URL und Publishable Key setzen.
2. Client, Typen, `.env.example` und E2E-Runner konsistent auf den Publishable Key
   umstellen.
3. Bei fehlender Konfiguration bleibt der bestehende ehrliche Empty-State erhalten.
   Der Zustand darf weder `0 €` vortäuschen noch Testdaten als Live-Daten ausgeben.

## 6. Kontrollierter E2E-Nachweis

Der E2E-Test benutzt ausschließlich eindeutige Test-IDs, Test-Quellsysteme und
temporäre, nicht geschäftliche Werte. Er beweist nicht HubSpot-Datenqualität, sondern
den technischen Live-Pfad.

1. Valides Event → HTTP 201, genau eine neue interne Ereigniszeile und genau eine
   öffentliche Feed-Zeile.
2. Gleiches Event → HTTP 200, keine zweite Feed-Zeile (Idempotenz).
3. Ungültiges Event → HTTP 422, keine Feed-Zeile, Rejection ohne Kontext-Leak.
4. Zwei Ereignisse mit gleichem `occurred_at` → deterministischer Tie-Break über
   `ingested_at`.
5. Browser auf `/dashboard` → Feed-Snapshot sichtbar, Realtime-Update aktualisiert nur
   die betroffene KPI-Fläche, Navigation/Unmount erzeugt keine Subscription-Leaks.
6. Kontrollierter Netzwerkausfall → verständlicher Offline-/Fehlerstatus ohne rohe
   Remote-Fehlermeldung; nach Wiederherstellung erneuter Snapshot.

Der vorhandene Runner wird dafür mit nur temporär exportierten Variablen ausgeführt.
Nach dem Lauf werden sie wieder entfernt. Erfolg wird nur dokumentiert, wenn dieser
Live-Lauf vollständig durchläuft; ein fehlendes Setup heißt weiterhin ehrlich
`SKIPPED_NOT_CONFIGURED`.

## 7. Fehlerbehandlung und Recovery

| Fehlerbild | Erwartetes Verhalten | Recovery |
|---|---|---|
| Supabase nicht konfiguriert | ehrlicher Empty-State | lokale `.env.local` prüfen, kein UI-Fallbackwert |
| Browser verliert Realtime | isolierter Offline-/Fehlerstatus | Verbindung wiederherstellen, Snapshot neu lesen |
| Contract ungültig | Rejection, keine Feed-Projektion | Payload am Sender korrigieren; keine Rohdaten aus Rejection übernehmen |
| n8n-Credential defekt | Ingest schlägt kontrolliert fehl | Credential in n8n erneuern; nie im Workflow exportieren |
| Migration unvollständig | G28 blockiert | Zustand per Schema-/RLS-/Publication-Checks korrigieren, erst danach E2E erneut fahren |

Migrationsdateien werden nicht rückwirkend überschrieben. Jede echte Schema-Korrektur
entsteht als neue, vorwärts gerichtete Migration mit eigenem Testnachweis.

## 8. Abnahmekriterien für Gate G28

- Das reale Supabase-Projekt enthält die versionierten Tabellen, Funktionen, Trigger,
  Indizes, RLS-Policies und Realtime-Publication.
- Der Browser kann nur den minimalen öffentlichen Feed lesen; direkte Zugriffe auf
  interne Tabellen und Ingest-RPC sind für Browserrollen ausgeschlossen.
- n8n kann ausschließlich die Ingest-RPC ausführen, aber keine Tabellen direkt lesen
  oder schreiben.
- Der vollständige kontrollierte E2E-Runner läuft gegen die reale Instanz grün.
- TypeScript, `npm run verify`, Build, Live-KPI-Verifier und Schutzbereichs-Diff
  bleiben grün.
- Es gibt keinen Secret-, URL- oder Passwort-Leak in Git, Quellcode, Screenshot,
  Workflow-Export oder BUILD_LOG.
- HubSpot-Baseline-Import bleibt funktional unverändert.

## 9. Bewusste Folgearbeit

Nach G28 kann ein separater Auftrag einen ersten echten Sender anschließen, etwa
HubSpot oder Salesforce. Der Auftrag definiert dann Datenherkunft, KPI-Berechnung,
Event-Frequenz, Senderauthentifizierung und fachliche Datenqualität. G28 selbst
etabliert dafür nur den sicheren, CRM-neutralen Empfangsweg.
