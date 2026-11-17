# Separater Auftrag: Sicherheitskorrektur `get_dashboard_v2_revisions` (Team-Revisionen nur für Berechtigte)

**Stand:** 17.11.2026
**Basis:** `main` `6dbbc593` (Merge von PR #196, Auftrag 161).
**Branch:** `fix-dashboard-revisions-team-guard`.
**Auftrag Marc (17.11.2026):** Die beim Schreiben von Auftrag 162 gefundene Lücke vorab schließen.
**Builder:** Claude Code. **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge und Hosted-Deployment der Migration:** Marc.
**Status:** GEBAUT, Review offen.

---

## 1. Befund

`public.get_dashboard_v2_revisions` (Migration `20261113_dashboard_v2_storage_and_revisions.sql:725–760`) prüft nur

```sql
AND (d.scope = 'team' OR d.user_id = v_user)
```

Damit erhält **jedes aktive Mitglied der Organisation** Titel, Autor-ID, Zeitpunkt und Änderungsnotiz aller Revisionen jedes Team-Dashboards, auch ohne Teammitgliedschaft. Die Funktion ist `SECURITY DEFINER` und umgeht damit RLS.

**Schwere:** latent. Team-Dashboards lassen sich bis P11 über keine RPC anlegen (`LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11`). Sie entstehen nur durch direkte Schreibzugriffe mit Service-Rolle. Mit Auftrag 162 (Aufhebung der Sperre) wäre die Lücke offen gewesen.

**Nicht betroffen:** `save_dashboard_v2` und `restore_dashboard_revision_v2` brechen bei `scope = 'team'` vorher mit `LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11` ab; die gleichlautende Bedingung im `UPDATE` von `save_dashboard_v2` ist dadurch nicht erreichbar. Fremde Organisationen waren nie betroffen (`organization_id = v_org`).

## 2. Soll

1. Bis P11 liefert `get_dashboard_v2_revisions` ausschließlich Revisionen **eigener persönlicher** Dashboards. Alles andere: `LP_DASHBOARD_NOT_FOUND` (`P0002`).
2. Auftrag 162 ersetzt diese Prüfung durch die vollständige Team-Rechteprüfung (dort §2.2 Nr. 14).

## 3. Grenzen

- Genau eine neue Migration `supabase/migrations/20261121_dashboard_revisions_scope_guard.sql`, nur `get_dashboard_v2_revisions`; Signatur, Rückgabe, Grants unverändert.
- Keine Änderung an TypeScript, Tabellen, Policies oder anderen Funktionen. Schutzbereiche unverändert.

## 4. Ziel-Dateien

| Pfad                                                                  | Änderung             |
| --------------------------------------------------------------------- | -------------------- |
| `supabase/migrations/20261121_dashboard_revisions_scope_guard.sql`    | neu                  |
| `supabase/tests/dashboard_revisions_scope_guard.sql`                  | neu (pgTAP, 6 Tests) |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_FIX_DASHBOARD_REVISIONS_SCOPE.md` | dieser Auftrag       |
| `docs/BUILD_LOG.md`                                                   | Builder-Eintrag      |

## 5. Tasks

- [x] **T1 Rot-Nachweis:** pgTAP vor der Migration – Tests 1 und 2 rot („caught: no exception“).
- [x] **T2 Migration** schreiben und lokal anwenden.
- [x] **T3 Grün-Nachweis:** alle pgTAP-Dateien grün.
- [x] **T4 Pflicht-Verifikation** (`tsc`, `verify`, `build`), Schutzbereichs-Diff.
- [ ] **T5 Review** durch unabhängigen Prüfer, danach Prüfnachweis im BUILD_LOG.

## 6. Deployment (Marc)

Migration `20261121_dashboard_revisions_scope_guard.sql` auf Hosted anwenden. Kein App-Deploy nötig. Smoke: Als angemeldeter Nutzer `get_dashboard_v2_revisions` für ein eigenes Dashboard aufrufen → Revisionen kommen wie bisher.
