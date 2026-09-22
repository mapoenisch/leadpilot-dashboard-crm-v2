# ANTIGRAVITY_AUFTRAG_067P — Audit-Log & Systemdiagnose (Gate G62)

## Ziel

Append-only Audit-Log-Tabelle (RLS, Immutabilität), `auditService`, `systemHealthService` (ohne
Secrets/PII) sowie zwei Admin-UI-Seiten (`AuditPage`, `SystemHealthPage`) mit Routing und
Sidebar-Links. Vollständige Unit- und UI-Tests. E2E-Playwright für Admin/Viewer/Manager.

## Baseline

- Branch `main`, Commit `60ad64c` (G61 gemerged)
- Schutzbereichs-Baseline: `60ad64c`

## Ziel-Dateien

| Datei | Aktion |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_067P_AUDIT_DIAGNOSE.md` | NEU (diese Datei) |
| `supabase/migrations/20260929_audit_log.sql` | NEU |
| `supabase/tests/audit_log.sql` | NEU |
| `src/services/audit/auditService.ts` | NEU |
| `src/services/audit/__tests__/auditService.vitest.ts` | NEU |
| `src/services/health/systemHealthService.ts` | NEU |
| `src/services/health/__tests__/systemHealthService.vitest.ts` | NEU |
| `src/features/admin/pages/AuditPage.tsx` | NEU |
| `src/features/admin/pages/__tests__/AuditPage.ui.vitest.tsx` | NEU |
| `src/features/admin/pages/SystemHealthPage.tsx` | NEU |
| `src/features/admin/pages/__tests__/SystemHealthPage.ui.vitest.tsx` | NEU |
| `src/app/routes.tsx` | MODIFY |
| `src/app/routePages.tsx` | MODIFY |
| `src/components/layout/Sidebar.tsx` | MODIFY |
| `e2e/audit-health.spec.ts` | NEU |

## Globale Grenzen

- `src/simulation/**`, `src/types/**`, `src/context/**`, `src/features/resources/**`,
  `src/services/db/crmRepository.ts`, `src/auth/**`, `src/features/auth/**` — NULLDIFF
- Typen `AuditEntry`, `AuditAction`, `SystemHealthSnapshot` NUR in den jeweiligen Service-Dateien definieren
- Keine neuen npm-Pakete
- Jede Datei < 400 Zeilen
- Keine Secrets, Keys, JWTs, E-Mails in Logs oder Schnappschüssen

## Verifikation

```
npx tsc --noEmit
npm run lint && npm run format:check
npm run verify  (25/25 Suiten)
npm test
npm run build
deno test --allow-env --allow-net --allow-read supabase/functions/
npx supabase test db
E2E_AUTH_EMAIL="admin-a@e2e.local" E2E_AUTH_PASSWORD="TestPassword123!" npx playwright test e2e/audit-health.spec.ts
```
