# CI-Secrets für GitHub Actions

Diese Dokumentation beschreibt die für den Workflow `.github/workflows/ci.yml` (insbesondere den Job `e2e`) erforderlichen GitHub Actions Secrets im Repository `mapoenisch/leadpilot-dashboard-crm-v2`.

> [!SECURITY]
> Diese Datei dokumentiert ausschließlich die **Namen** und den **fachlichen Zweck** der Secrets.
> **Niemals echte Zugangsdaten, Schlüssel oder Passwörter in diese Datei oder das Repository einchecken!**

---

## Übersicht der erforderlichen Secrets

| Secret-Name | Verwendender CI-Schritt | Zweck & Verwendung im Code |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `Build für E2E und Lighthouse` | Supabase-Projekt-URL. Wird beim Frontend-Build (`npx vite build`) in das Client-Bundle kompiliert. |
| `VITE_SUPABASE_ANON_KEY` | `Build für E2E und Lighthouse` | Supabase Anon/Public Key. Wird beim Frontend-Build in das Client-Bundle kompiliert. |
| `E2E_AUTH_EMAIL` | `Playwright E2E ...`, `Lighthouse CI` | E-Mail-Adresse des primären Test-Accounts (Org A Admin) für Playwright (`e2e/global-setup.ts`, `e2e/auth.spec.ts`, `e2e/persistence-multisession.spec.ts`, `e2e/worker-responsiveness.spec.ts`) und für den authentifizierten Lighthouse-Crawl (`scripts/lighthouse-auth.cjs`). |
| `E2E_AUTH_PASSWORD` | `Playwright E2E ...`, `Lighthouse CI` | Passwort des primären Test-Accounts für Playwright und Lighthouse. |
| `E2E_AUTH_EMAIL_B` | `Playwright E2E ...` | E-Mail-Adresse eines zweiten Test-Accounts aus Organisation B für den Mandantentrennungs-Test (`e2e/tenant-isolation.spec.ts`). |
| `E2E_AUTH_PASSWORD_B` | `Playwright E2E ...` | Passwort des Test-Accounts für Organisation B (`e2e/tenant-isolation.spec.ts`). |
| `E2E_AUTH_EMAIL_NOMEMBER` | `Playwright E2E ...` | E-Mail-Adresse eines registrierten Test-Accounts ohne Organisationsmitgliedschaft für den Fail-Closed-Test nicht zugeordneter Sitzungen (`e2e/tenant-isolation.spec.ts`). |
| `E2E_SUPABASE_URL` | `Playwright E2E ...` | Supabase-Projekt-URL für direkte DB-Abfragen im Test (`e2e/persistence-multisession.spec.ts`). Identisch mit `VITE_SUPABASE_URL`. |
| `E2E_SUPABASE_ANON_KEY` | `Playwright E2E ...` | Supabase Anon Key für direkte DB-Abfragen im Test (`e2e/persistence-multisession.spec.ts`). Identisch mit `VITE_SUPABASE_ANON_KEY`. |

---

## Anleitung zum Anlegen der Secrets via GitHub CLI (`gh`)

Marc kann die Secrets über die GitHub CLI (`gh`) interaktiv oder per Pipe für das Repository setzen:

```bash
# 1. Supabase Verbindungsdaten für den Build
gh secret set VITE_SUPABASE_URL -R mapoenisch/leadpilot-dashboard-crm-v2
gh secret set VITE_SUPABASE_ANON_KEY -R mapoenisch/leadpilot-dashboard-crm-v2

# 2. Supabase Verbindungsdaten für E2E-Runner
gh secret set E2E_SUPABASE_URL -R mapoenisch/leadpilot-dashboard-crm-v2
gh secret set E2E_SUPABASE_ANON_KEY -R mapoenisch/leadpilot-dashboard-crm-v2

# 3. Anmeldedaten für E2E & Lighthouse (Org A - Hauptbenutzer)
gh secret set E2E_AUTH_EMAIL -R mapoenisch/leadpilot-dashboard-crm-v2
gh secret set E2E_AUTH_PASSWORD -R mapoenisch/leadpilot-dashboard-crm-v2

# 4. Anmeldedaten für Mandantentrennung (Org B & No-Member)
gh secret set E2E_AUTH_EMAIL_B -R mapoenisch/leadpilot-dashboard-crm-v2
gh secret set E2E_AUTH_PASSWORD_B -R mapoenisch/leadpilot-dashboard-crm-v2
gh secret set E2E_AUTH_EMAIL_NOMEMBER -R mapoenisch/leadpilot-dashboard-crm-v2
```

---

## Voraussetzungen im Testprojekt

- Alle Benutzer müssen in einem separaten Supabase-Testprojekt existieren.
- Das Testprojekt darf keine Produktivdaten enthalten.
- Organisation A und Organisation B müssen entsprechend vorkonfiguriert sein (`Firma A1` in Org A, `Firma B1` in Org B).
