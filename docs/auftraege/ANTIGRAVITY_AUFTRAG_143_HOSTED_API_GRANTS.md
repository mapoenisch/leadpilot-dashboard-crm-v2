# Auftrag 143 — Hosted-API-Rollen-Grants reproduzierbar machen

**Kontext:** Beim ersten gehosteten Rollout (Netlify + Supabase `nfyiywfcnfjtjbdbptdg`, 11.11.2026) zeigte die App nach dem Login eine leere Seite. Ursache: `supabase db push` legt Tabellen als Rolle `postgres` an; deren Default-Privileges gewähren `anon`/`authenticated`/`service_role` kein `SELECT`/`INSERT`/`UPDATE` — alle PostgREST-Abfragen liefen auf 403. Der Grants-Fix wurde manuell auf der Instanz angewendet; diese Migration macht ihn reproduzierbar.

**Ziel-Dateien:**

- `supabase/migrations/20261112_hosted_api_role_grants.sql` (neu)
- `docs/BUILD_LOG.md` (Eintrag)

**Grenzen:** Kein Produktcode, keine Schema-Änderung, keine neuen Abhängigkeiten. `GRANT`/`ALTER DEFAULT PRIVILEGES` sind auf jeder Instanz (lokal, CI, gehostet) idempotent und ändern nichts an RLS.

**Verifikation:** `npm run verify:migrations` (lokales Supabase baut alle Migrationen neu), `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`, Schutzbereichs-Diff leer. Auf der Hosted-Instanz bereits angewendet und per Login-Smoke-Test verifiziert (App rendert vollständig, 0 Konsolenfehler).
