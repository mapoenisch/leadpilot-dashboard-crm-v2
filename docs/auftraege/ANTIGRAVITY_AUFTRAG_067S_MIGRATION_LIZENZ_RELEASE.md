# ANTIGRAVITY_AUFTRAG_067S — Migration, Lizenz und Release v2.3.0 (Gate G65)

> **Builder:** Claude Code (Rollenwechsel bis v2.3.0, `CLAUDE.md` §4) · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.

## Ziel

Letzter Teilauftrag des Masterplans (Task 19). Nach G65 ist v2.3.0 freigabefähig:

- Neuaufbau aus einer leeren Datenbank und Upgrade vom Stand v2.2.0 sind nachgewiesen und
  wiederholbar.
- Der Demo-Mandant lässt sich idempotent anlegen.
- Das Repository ist proprietär lizenziert (`All Rights Reserved`), README und Release
  Notes sagen dasselbe.
- Betrieb, Free-Tier-Grenzen, Rollout und ein getesteter Rollback sind dokumentiert.
- Die Paketversion ist `2.3.0`. Die G64-Abnahme ist aus einem sauberen Checkout wiederholt.

Den Tag `v2.3.0` setzt Marc nach seiner ausdrücklichen Freigabe (Masterplan Step 6/7).
Dieser Auftrag endet mit dem Release-Kandidaten auf `main`.

Quellen: Masterplan Task 19 (`docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md`),
Spec §17, §19, §21 und §22 (`docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`),
Finding `PR-LICENSE-19`, Issue #9.

## Baseline

- Branch `claude/067s-release` von `main` `06d7269` (Merge PR #29, Viewer strikt lesend).
- Schutzbereichs-Baseline: `06d7269`.

## Ausgangsbefund (roter Start, 25.09.2026)

| Prüfung                                | Ist                                        | Ursache                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PR-LICENSE-19`                        | rot (erwartet)                             | keine `LICENSE`-Datei                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Upgrade v2.2.0 → heutige Migrationen   | **rot**                                    | `20260101000000_base_schema.sql` ist für eine leere DB geschrieben. Im Stand v2.2.0 existieren `companies`, `contacts` und `imported_funnel_deals` ohne `organization_id`. `CREATE TABLE IF NOT EXISTS` greift nicht, und `ALTER TABLE companies ADD CONSTRAINT companies_org_id_unique UNIQUE (organization_id, id)` bricht mit `column "organization_id" named in key does not exist` ab. Das Upgrade der ausgelieferten v2.2.0-Datenbank wäre gescheitert. |
| Schema Neuaufbau = Schema nach Upgrade | **rot** (nach Behebung des ersten Befunds) | Nur beim Neuaufbau: `organization_id DEFAULT <Demo-Mandant>` auf den drei CRM-Tabellen (stille Demo-Zuordnung, verstößt gegen Spec §6). Außerdem ein zweiter, gleichwertiger Fremdschlüssel `imported_funnel_deals_organization_id_fkey` neben `deals_organization_id_fkey`.                                                                                                                                                                                  |
| Paketversion                           | `2.2.0`                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Globale Grenzen

- Schutzbereiche `src/simulation/**`, `src/types/**`, `src/context/**`,
  `src/services/data/**`, `src/features/resources/**`: **keine Änderung**.
- Keine neuen Abhängigkeiten. Der Third-Party-License-Check liest `package-lock.json`,
  ohne Netz und ohne Zusatzpaket.
- Migrationen nur vorwärts, versioniert, idempotent und nicht destruktiv. Angewendete
  Migrationen werden nicht geändert.
- Keine Secrets im Repo. `.env.example` bleibt die einzige Vorlage.
- Kein Tag und kein Release ohne Marcs ausdrückliche Freigabe.

## Ziel-Dateien

| Datei                                                                                                                            | Art                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_067S_MIGRATION_LIZENZ_RELEASE.md`                                                            | neu                                                                       |
| `supabase/migrations/20260100000000_v2_2_upgrade_prep.sql`                                                                       | neu (Upgrade-Vorbereitung für v2.2.0, auf leerer DB wirkungslos)          |
| `supabase/migrations/20261003_tenant_schema_convergence.sql`                                                                     | neu (Neuaufbau = Upgrade: Demo-Default und doppelter FK entfallen)        |
| `scripts/verifyMigrationUpgrade.mjs`, `scripts/fixtures/v2.2.0/*`                                                                | neu (wiederholbarer Migrationsnachweis, v2.2.0-Stand als Fixture)         |
| `scripts/checkThirdPartyLicenses.mjs`, `scripts/__tests__/checkThirdPartyLicenses.vitest.ts`                                     | neu                                                                       |
| `.github/workflows/ci.yml`                                                                                                       | ändern (Migrationsnachweis im e2e-Job, Lizenzcheck im lint-Job)           |
| `LICENSE`                                                                                                                        | neu (`All Rights Reserved`)                                               |
| `README.md`                                                                                                                      | ändern (Lizenzabschnitt, Stand v2.3.0)                                    |
| `docs/releases/V2.3.0.md`                                                                                                        | neu                                                                       |
| `docs/operations/v2.3.0-runbook.md`, `docs/operations/v2.3.0-rollback.md`                                                        | neu                                                                       |
| `package.json`, `package-lock.json`                                                                                              | ändern (Version `2.3.0`, Skripte `verify:licenses`, `verify:migrations`)  |
| `.env.example`                                                                                                                   | ändern (vollständige Liste der Pflicht- und optionalen Werte, ohne Werte) |
| `src/review/acceptance/findingContract.ts`, `docs/reviews/v2.3.0-known-findings.json`, `docs/reviews/v2.3.0-finding-register.md` | ändern (`PR-LICENSE-19` → `passing` seit G65)                             |
| `scripts/v23FindingReadiness.ts`, `scripts/__tests__/v23FindingReadiness.vitest.ts`                                              | ändern (keine G65-Ausnahme mehr nötig)                                    |
| `docs/reviews/v2.3.0-acceptance-matrix.md`                                                                                       | ändern (§19, §21, §22 auf Nachweis)                                       |
| `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                | ändern                                                                    |

## Tasks

- [ ] **1. Roter Start:** Upgrade-Befund und Schemaabweichung mit `verifyMigrationUpgrade.mjs`
      nachweisen (vor den beiden neuen Migrationen rot).
- [ ] **2. Migration:** Vorbereitungs- und Konvergenz-Migration. Nachweis: leere DB und
      v2.2.0-Stand laufen durch, v2.2.0-Bestand gehört dem Demo-Mandanten, Demo-Bootstrap
      zweimal idempotent, keine offene `USING(true)`-Policy (außer der öffentlichen
      Live-KPI-Anzeige), Schema beider Wege identisch, pgTAP gegen die hochgezogene DB grün.
      Der Nachweis läuft in der CI.
- [ ] **3. Lizenz:** `LICENSE` mit Urheberrechtsvermerk, Nutzungsbeschränkung und
      `All Rights Reserved`. README und Release Notes nennen denselben Status.
      `PR-LICENSE-19` wird grün, und das Register geht auf `passing` seit G65.
- [ ] **4. Third-Party-Lizenzen:** Die Produktionsabhängigkeiten aus `package-lock.json`
      werden gegen eine Allowlist permissiver Lizenzen geprüft. Unbekannt oder fehlend ist
      rot. Das läuft in der CI.
- [ ] **5. Betrieb:** Runbook (Konfiguration, Pflichtwerte, Free-Tier-Grenzen, Backup vor
      Migration, Rollout-Reihenfolge, Smoke-Test) und Rollback. Der Rollback ist getestet:
      Das vorherige Frontend v2.2.0 läuft gegen das Schema v2.3.0, ohne Absturz, ohne
      Mandantendaten und ohne Schreibzugriff.
- [ ] **6. Version und Abnahme:** `package.json` auf `2.3.0`. `npm ci` und
      `npm run accept:v23` aus einem sauberen Checkout.
- [ ] **7. Verifikation, BUILD_LOG, PR;** Übergabe an Codex (G65-Review). Danach
      Release-Freigabe durch Marc, dann Tag `v2.3.0`.

## Abnahme

- `node scripts/verifyMigrationUpgrade.mjs`: Exit 0 lokal und in der CI.
- `npm run verify:licenses`: Exit 0.
- `npm run verify:v23:baseline`: 20/20 `passing`.
- `npm run accept:v23` aus sauberem Checkout: alle lokal lauffähigen Gates grün. Die
  bekannte Edge-Grenze (G64) wird gesondert ausgewiesen, die CI ist maßgeblich.
- CI auf dem PR 7/7 grün. Schutzbereichs-Diff leer.
