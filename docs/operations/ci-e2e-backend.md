# Lokales E2E-Backend für GitHub Actions und Entwickler

Diese Dokumentation beschreibt die Backend-Architektur für den E2E- und Lighthouse-Testlauf im Workflow `.github/workflows/ci.yml` (Job `e2e`) sowie für die lokale Ausführung.

---

## 1. Architektur und Funktionsweise

Für automatisierte E2E-Tests wird **kein gehostetes Supabase-Projekt** verwendet. Stattdessen startet der CI-Runner (und der Entwickler lokal) eine flüchtige, temporäre PostgreSQL-/Supabase-Instanz via Supabase CLI und Docker:

1. **Flüchtige Instanz:** Der Job `e2e` startet per `supabase start` die minimale Dienstarchitektur (`db`, `auth`, `rest`, `kong`, `edge-runtime`). Ressourcenintensive, für E2E irrelevante Dienste (`studio`, `imgproxy`, `storage-api`, `logflare`, `vector`, `supavisor`, `mailpit`, `postgres-meta`) werden per `-x` explizit deaktiviert.
2. **Schema & Migrationen:** Das Schema (`supabase/schema.sql`) und alle Migrationen (`supabase/migrations/`) werden auf die lokale Datenbank angewendet.
3. **Deterministischer Seed:** `supabase/seed.sql` richtet Test-Organisationen, loginfähige Testbenutzer und CRM-Testdaten ein.
4. **Keine Secrets:** URL und Anon-Key werden zur Laufzeit dynamisch aus `supabase status -o env` bezogen und an den Vite-Build sowie die Testwerkzeuge übergeben. Im gesamten Repository existieren keine GitHub Actions Secrets für das Testbackend.
5. **Automatischer Teardown:** Am Ende des CI-Laufs beendet `supabase stop` die Container via `if: always()`.

---

## 2. Testbenutzer und Rollen- / Organisationszuordnung

Die Testnutzer werden flüchtig über `supabase/seed.sql` für lokale und CI-Testcontainer bereitgestellt. Konkrete Zugangsdaten sind nicht in der Dokumentation hinterlegt, sondern werden als Umgebungsvariablen übergeben bzw. aus der Seed-Konfiguration bezogen:

| Rolle / Kontext | Organisation | Relevante Umgebungsvariablen | Zweck |
|---|---|---|---|
| Admin | Organisation A (`aaaaaaaa-...`) | `E2E_AUTH_EMAIL`, `E2E_AUTH_PASSWORD` | Haupt-Testnutzer für Suite, CRM-Management & Export |
| Manager | Organisation A (`aaaaaaaa-...`) | `E2E_AUTH_EMAIL_MANAGER`, `E2E_AUTH_PASSWORD` | Operativer Nutzer mit Export-Berechtigung |
| Viewer | Organisation A (`aaaaaaaa-...`) | `E2E_AUTH_EMAIL_VIEWER`, `E2E_AUTH_PASSWORD` | Lesezugriff, Export deaktiviert & 403-Schutz |
| Admin | Organisation B (`bbbbbbbb-...`) | `E2E_AUTH_EMAIL_B`, `E2E_AUTH_PASSWORD_B` | Mandantentrennung (Cross-Tenant-Isolation) |
| Nicht zugeordnet (No-Member) | Keine Organisation | `E2E_AUTH_EMAIL_NOMEMBER`, `E2E_AUTH_PASSWORD` | Nachweis von Fail-Closed-Verhalten ohne Organisationsbindung |

---

## 3. Lokale Reproduktion

Entwickler können die vollständige E2E-Testkette lokal wie folgt ausführen:

### Schritt 1: Supabase starten und befüllen (auf leerem Stack)

```bash
# 1. Bestehende Container verwerfen (frischer Stack ohne alte Volumes)
npx supabase stop --no-backup

# 2. Schema temporär als früheste Migration bereitstellen (wird NICHT committet)
cp supabase/schema.sql supabase/migrations/20260101000000_base_schema.sql

# 3. Supabase starten (minimale Dienste inkl. edge-runtime; wendet alle Migrationen und seed.sql automatisch an)
npx supabase start -x studio,imgproxy,storage-api,logflare,vector,supavisor,mailpit,postgres-meta

# 4. Temporäre Migrationsdatei sofort wieder entfernen
rm supabase/migrations/20260101000000_base_schema.sql
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
# E2E-Authentifizierungsvariablen setzen (Werte aus seed.sql bzw. lokaler Testumgebung)
export E2E_AUTH_EMAIL="<in seed.sql definierte Admin-A-Adresse>"
export E2E_AUTH_PASSWORD="<in seed.sql definiertes Testpasswort>"
export E2E_AUTH_EMAIL_MANAGER="<in seed.sql definierte Manager-A-Adresse>"
export E2E_AUTH_EMAIL_VIEWER="<in seed.sql definierte Viewer-A-Adresse>"
export E2E_AUTH_EMAIL_B="<in seed.sql definierte Admin-B-Adresse>"
export E2E_AUTH_PASSWORD_B="<in seed.sql definiertes Testpasswort>"
export E2E_AUTH_EMAIL_NOMEMBER="<in seed.sql definierte No-Member-Adresse>"
export E2E_SUPABASE_URL="http://127.0.0.1:54321"
export E2E_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"

npx playwright test
```

### Schritt 4: Lighthouse CI ausführen

> **Hinweis:** Erfordert Node.js >= 22.12 (oder das in `.nvmrc` gepinnte 22.18.0) wegen `require(esm)`.

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lhci autorun
```

### Schritt 5: Lokales Backend stoppen

```bash
npx supabase stop --no-backup
```

---

## 4. Ablauf: Aktualisierung der visuellen Baselines (Linux-Runner)

Die Playwright-Visual-Regression-Tests (`e2e/visual.spec.ts`) vergleichen Screenshots mit Linux-Referenzbildern (`*-linux.png`). Da Entwickler-Workstations (z. B. macOS) Schriftarten und Rasterung anders rendern, dürfen Baselines niemals lokal unter macOS überschrieben werden.

Stattdessen existiert der dedizierte Workflow `.github/workflows/update-visual-baselines.yml`, der exakt in der GitHub-Actions-Umgebung (`ubuntu-latest`) läuft:

1. **Voraussetzung:** Feature-Stand ist committet und der Push wurde von Marc freigegeben (Stopp-Punkt).
2. **Neuen Baselines-Branch anlegen und pushen:**
   ```bash
   git checkout -b visual-baselines/regen-v23
   git push origin visual-baselines/regen-v23
   ```
3. **Workflow abwarten:** Der Workflow `Update Visual Baselines` startet automatisch bei Branches unter `visual-baselines/**`. Er initialisiert das flüchtige Supabase-Backend mit Seed, baut die App und führt `npx playwright test e2e/visual.spec.ts --update-snapshots` aus.
4. **Artefakt herunterladen & sichtprüfen:**
   - Im GitHub-Actions-Run das Artefakt `visual-baselines` herunterladen.
   - Die erzeugten PNG-Snapshots entpacken und einer manuellen Sichtprüfung unterziehen (keine ungewollten Layout-Brüche oder Artefakte).
5. **Baselines in den Arbeitsbranch übernehmen:**
   ```bash
   git checkout feat/auftrag-067l-ci-ruleset
   # Neue Snapshots nach e2e/visual.spec.ts-snapshots/ kopieren
   cp -r /pfad/zu/entpackten/visual-baselines/* e2e/visual.spec.ts-snapshots/
   git add e2e/visual.spec.ts-snapshots/
   git commit -m "test(visual): Linux-Baselines via Actions-Runner aktualisiert"
   ```
6. **Temporären Branch löschen:**
   ```bash
   git push origin --delete visual-baselines/regen-v23
   git branch -D visual-baselines/regen-v23
   ```
