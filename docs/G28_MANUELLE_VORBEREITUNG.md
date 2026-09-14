# G28 — Manuelle Vorbereitungs-Checkliste (Supabase & n8n Live-Inbetriebnahme)

Diese Checkliste fasst die manuellen Schritte für Marc zusammen, um das vorbereitete Supabase-Cloud-Projekt und die n8n-Pipeline in Betrieb zu nehmen.

**Verbindliche Design-Referenz:**  
`docs/superpowers/specs/2026-09-08-g28-supabase-live-operation-design.md` (insbesondere Abschnitte 5.1–5.3 sowie Abschnitt 6).

> **Sicherheitsregel (aus Design §4.2 & §5.1):**  
> Secrets, Datenbank-Passwörter und Service-Keys dürfen **niemals** in Git, Quellcode, Build-Logs, Tickets oder n8n-Workflow-JSONs hinterlegt werden. Das Setzen von Credentials erfolgt ausschließlich interaktiv über eine kontrollierte Datenbanksitzung bzw. den gesicherten n8n-Credential-Speicher.

---

## 1. Supabase-Projekt vorbereiten (Design §5.1)

- [ ] **1.1 Projekt-URL und Publishable Key ermitteln**
  - Im Supabase-Dashboard unter *Project Settings > API* die `Project URL` und den `Publishable Key` (bzw. Anon/Public Key) ablesen.
  - *Wichtig:* Keine Service-Role- oder Admin-Keys kopieren.

- [ ] **1.2 SQL-Migrationen anwenden**
  Die beiden versionierten Migrationen in exakter Reihenfolge auf das Cloud-Projekt anwenden (bevorzugt über Supabase CLI via `supabase db push` / `supabase link`, alternativ über den SQL-Editor im Supabase-Dashboard):
  1. `supabase/migrations/20260906_live_kpi_pipeline.sql`
  2. `supabase/migrations/20260907_live_kpi_read_layer.sql`

- [ ] **1.3 Datenbank-Objekte verifizieren**
  Prüfen, dass folgende Komponenten existieren und aktiv sind:
  - Tabellen: `live_kpi_events`, `live_kpi_rejections`, `live_kpi_public_feed`
  - Ingest-RPC: `public.ingest_live_kpi_event(jsonb)`
  - Trigger: Projektionstrigger von `live_kpi_events` auf `live_kpi_public_feed`
  - RLS-Policies: RLS aktiviert auf `live_kpi_public_feed` (ausschließlich `SELECT` für `anon`/`authenticated`)
  - Realtime: `live_kpi_public_feed` ist in der Supabase-Realtime-Publikation (`supabase_realtime`) enthalten

- [ ] **1.4 Rolle `n8n_ingest` mit sicherem Passwort versehen**
  - In einer interaktiven SQL-Admin-Sitzung (z. B. SQL Editor im Dashboard) ein individuelles Passwort aus dem Passwortmanager setzen:
    ```sql
    ALTER ROLE n8n_ingest WITH PASSWORD 'DEIN_SICHERES_PASSWORT_AUS_DEM_PASSWORTMANAGER';
    ```
  - *Wichtig:* Das Passwort nicht in einer Migrationsdatei oder im Terminal-Verlauf speichern.

---

## 2. n8n Live-KPI-Ingest vorbereiten (Design §5.2)

- [ ] **2.1 Workflow importieren**
  - In der n8n-Instanz die Workflow-Definition aus `tools/n8n/live-kpi-ingest.workflow.json` importieren.
  - Hinweis: Der existierende HubSpot-Baseline-Workflow bleibt unberührt.

- [ ] **2.2 PostgreSQL-Credential anlegen**
  - In n8n ein neues PostgreSQL-Credential mit dem Namen `LeadPilot PostgreSQL (n8n_ingest role)` erstellen.
  - Host, Port (meist Pooler-Port z. B. 6543 / 5432), Database, User (`n8n_ingest`), Passwort und SSL (`require`) konfigurieren.

- [ ] **2.3 Credential dem Workflow zuweisen**
  - Im importierten Live-KPI-Workflow das neu angelegte Credential ausschließlich dem PostgreSQL-Node zuweisen.

- [ ] **2.4 Workflow testen und aktivieren**
  - Workflow im Testmodus ausführen und ein Test-Event senden.
  - Prüfen, dass `public.ingest_live_kpi_event(jsonb)` erfolgreich ausgeführt wird und Datensätze in `live_kpi_events` sowie `live_kpi_public_feed` landen.
  - Webhook-Node kontrolliert aktivieren.

---

## 3. Frontend lokal konfigurieren (Design §5.3)

- [ ] **3.1 Lokale Umgebungsvariablen bereitstellen**
  - Lokale Datei `.env` (bereits durch `.gitignore` geschützt) oder `.env.local` im Projekt-Root anlegen:
    ```env
    VITE_SUPABASE_URL=https://<deine-projekt-id>.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=<dein-publishable-key>
    ```
  - *Sicherheits-Check:* Per `git status` sicherstellen, dass die Datei nicht versehentlich gestaged wird.

- [ ] **3.2 UI und Stream-Verhalten prüfen**
  - Dev-Server starten (`npm run dev`) und Dashboard (`/dashboard`) öffnen.
  - Prüfen, dass der Live-KPI-Stream die Daten aus `live_kpi_public_feed` lädt und bei neuen Events Realtime-Updates empfängt.
  - Prüfen, dass bei unkonfiguriertem Zustand weiterhin der ehrliche Empty-State gezeigt wird (kein `0 €`-Fake).

---

## 4. Kontrollierten E2E-Nachweis führen (Design §6)

- [ ] **4.1 Test-Runner mit temporären Umgebungsvariablen ausführen**
  - Der Runner liest eigene `LIVE_KPI_E2E_*`-Variablen (nicht die `VITE_SUPABASE_*`-Namen des
    Frontends) und setzt daraus intern die App-Konfiguration für den Test-Build:
    ```bash
    export LIVE_KPI_E2E_ENABLE=true
    export LIVE_KPI_E2E_N8N_WEBHOOK_URL="https://<deine-n8n-instanz>/webhook/live-kpi-ingest"
    export LIVE_KPI_E2E_SUPABASE_URL="https://<deine-projekt-id>.supabase.co"
    export LIVE_KPI_E2E_SUPABASE_ANON_KEY="<dein-publishable-key>"
    npx tsx scripts/runLiveKpiE2e.ts
    ```
    (Siehe auch `tools/n8n/README.md` Abschnitt 4 für das vollständige Beispiel.)
  - Nach dem Lauf die Variablen wieder zurücksetzen: `unset LIVE_KPI_E2E_ENABLE
    LIVE_KPI_E2E_N8N_WEBHOOK_URL LIVE_KPI_E2E_SUPABASE_URL LIVE_KPI_E2E_SUPABASE_ANON_KEY`.
  - Prüfen, dass die Schritte erfolgreich durchlaufen:
    1. Valides Event (HTTP 201, genau eine interne & eine Feed-Zeile)
    2. Idempotenz (HTTP 200 bei Re-Delivery, keine Duplikate)
    3. Ungültiges Event (HTTP 422 Rejection, kein Feed-Eintrag)
    4. Deterministic Tie-Break bei gleichem Zeitstempel
    5. Snapshot- und Realtime-Subscription im Browser
    6. Graceful Recovery bei simulierter Offline-Unterbrechung
