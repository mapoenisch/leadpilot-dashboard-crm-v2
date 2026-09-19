# Lokales E2E-Backend für GitHub Actions und Entwickler

Diese Dokumentation beschreibt die Backend-Architektur für den E2E- und Lighthouse-Testlauf im Workflow `.github/workflows/ci.yml` (Job `e2e`) sowie für die lokale Ausführung.

---

## 1. Architektur und Funktionsweise

Für automatisierte E2E-Tests wird **kein gehostetes Supabase-Projekt** verwendet. Stattdessen startet der CI-Runner (und der Entwickler lokal) eine flüchtige, temporäre PostgreSQL-/Supabase-Instanz via Supabase CLI und Docker:

1. **Flüchtige Instanz:** Der Job `e2e` startet per `supabase start` die minimale Dienstarchitektur (`db`, `auth`, `rest`, `kong`). Ressourcenintensive, für E2E irrelevante Dienste (`studio`, `imgproxy`, `storage-api`, `edge-runtime`, `logflare`, `vector`, `supavisor`, `mailpit`, `postgres-meta`) werden per `-x` explizit deaktiviert.
2. **Schema & Migrationen:** Das Schema (`supabase/schema.sql`) und alle Migrationen (`supabase/migrations/`) werden auf die lokale Datenbank angewendet.
3. **Deterministischer Seed:** `supabase/seed.sql` richtet Test-Organisationen, loginfähige Testbenutzer und CRM-Testdaten ein.
4. **Keine Secrets:** URL und Anon-Key werden zur Laufzeit dynamisch aus `supabase status -o env` bezogen und an den Vite-Build sowie die Testwerkzeuge übergeben. Im gesamten Repository existieren keine GitHub Actions Secrets für das Testbackend.
5. **Automatischer Teardown:** Am Ende des CI-Laufs beendet `supabase stop` die Container via `if: always()`.

---

## 2. Testbenutzer und Zugangsdaten (Seed)

Die Testnutzer sind ausschließlich in `supabase/seed.sql` für flüchtige lokale und CI-Container definiert. Sie existieren in keinem Produktiv- oder Hostsystem.

- **Organisation A Admin (Haupt-Testnutzer für Suite & Lighthouse):**
  - E-Mail: `admin-a@e2e.local`
  - Passwort: `TestPassword123!`
  - Rolle: `admin` in Organisation A (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- **Organisation B Admin (Mandantentrennung):**
  - E-Mail: `admin-b@e2e.local`
  - Passwort: `TestPassword123!`
  - Rolle: `admin` in Organisation B (`bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`)
- **No-Member (Nicht zugeordnete Sitzung):**
  - E-Mail: `nomember@e2e.local`
  - Passwort: `TestPassword123!`
  - Keine Organisationsmitgliedschaft (beweist Fail-Closed-Verhalten)

---

## 3. Lokale Reproduktion

Entwickler können die vollständige E2E-Testkette lokal wie folgt ausführen:

### Schritt 1: Supabase starten und befüllen
```bash
# 1. Supabase starten (minimale Dienste)
npx supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,mailpit,postgres-meta

# 2. Schema und Seed einspielen (falls nicht automatisch geladen)
docker exec -i supabase_db_LeadPilot_Dashboard-CRM psql -U postgres -d postgres < supabase/schema.sql
docker exec -i supabase_db_LeadPilot_Dashboard-CRM psql -U postgres -d postgres < supabase/seed.sql
```

### Schritt 2: Umgebungsvariablen ermitteln und Frontend bauen
```bash
# Anon-Key und URL auslesen
export VITE_SUPABASE_URL="http://127.0.0.1:54321"
export VITE_SUPABASE_ANON_KEY=$(npx supabase status -o env | grep ANON_KEY | cut -d'"' -f2)

# Frontend für E2E bauen
npm run build
```

### Schritt 3: Playwright E2E ausführen
```bash
export E2E_AUTH_EMAIL="admin-a@e2e.local"
export E2E_AUTH_PASSWORD="TestPassword123!"
export E2E_AUTH_EMAIL_B="admin-b@e2e.local"
export E2E_AUTH_PASSWORD_B="TestPassword123!"
export E2E_AUTH_EMAIL_NOMEMBER="nomember@e2e.local"
export E2E_SUPABASE_URL="http://127.0.0.1:54321"
export E2E_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"

npx playwright test
```

### Schritt 4: Lighthouse CI ausführen
```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lhci autorun
```

### Schritt 5: Lokales Backend stoppen
```bash
npx supabase stop
```
