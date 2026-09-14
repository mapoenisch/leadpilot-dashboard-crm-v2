# AUFTRAG 067 / Gate G28 (Fortsetzung) — Code-Vorbereitung für Supabase-Live-Inbetriebnahme

**Baseline:** `9380ace` (V2.2.0 gemerged nach `main`, getaggt) · **Neuer Branch:**
`codex/g28-supabase-live-inbetriebnahme` (von `main` abzweigen) · **Status:** OFFEN

Erster Auftrag der Gate-G28-Fortsetzung, die laut `docs/BUILD_PLAN_V2.2.0.md` nach Abschluss der
V2.2.0-Härtung (G29–G43, jetzt vollständig) ansteht. G28 selbst (Design bereits von Marc
freigegeben, siehe unten) aktiviert eine **echte Cloud-Infrastruktur** (Supabase-Projekt,
n8n-Workflow, Datenbank-Credentials). Dieser Auftrag deckt **ausschließlich die Code-Seite** ab —
nach Marcs ausdrücklicher Entscheidung, weil das G28-Design selbst vorschreibt, dass Secrets/
Credentials **niemals** von einer KI oder in einem automatisierten Auftrag gesetzt werden dürfen
(„ausschließlich interaktiv über eine kontrollierte Datenbank-Admin-Sitzung"). Migrationen
anwenden, n8n-Credential setzen und der reale E2E-Nachweis bleiben Marcs eigene, manuelle
Schritte nach diesem Auftrag — dafür entsteht hier eine klare Checkliste.

## Design-Grundlage

`docs/superpowers/specs/2026-09-08-g28-supabase-live-operation-design.md` (bisher nur auf Branch
`codex/g28-supabase-live-operation-design`, Commit `a34360c` — wird in Block A in diesen Branch
geholt). Das Design ist von Marc freigegeben, aber **vor** der gesamten V2.2.0-Härtung entstanden
— dieser Auftrag verifiziert die relevanten Annahmen frisch, statt sie zu übernehmen.

## Ist-Stand (nachgemessen, Stand `9380ace`)

Alle im Design referenzierten Bausteine existieren unverändert:

| Datei | Status |
|---|---|
| `src/types/liveKpi.ts` | ✅ vorhanden |
| `src/services/liveKpi/liveKpiContract.ts` | ✅ vorhanden |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | ✅ vorhanden |
| `supabase/migrations/20260906_live_kpi_pipeline.sql` | ✅ vorhanden |
| `supabase/migrations/20260907_live_kpi_read_layer.sql` | ✅ vorhanden |
| `tools/n8n/live-kpi-ingest.workflow.json` | ✅ vorhanden |
| `scripts/runLiveKpiE2e.ts` | ✅ vorhanden |

**Env-Var-Umbenennung aus Design §4.3 ist noch NICHT umgesetzt.** Der Code verwendet aktuell
durchgängig noch `VITE_SUPABASE_ANON_KEY` statt der im Design vorgeschriebenen
`VITE_SUPABASE_PUBLISHABLE_KEY` — in genau diesen 7 lebenden Dateien (per `grep -rl` bestätigt,
historische Dokumente wie `docs/BUILD_LOG.md` und der abgeschlossene Auftrag 060 bleiben
unangetastet, siehe Grenzen):

| Datei | Fundstelle |
|---|---|
| `.env.example` | Platzhalter-Variable |
| `src/vite-env.d.ts` | Typ-Deklaration |
| `src/services/db/supabaseClient.ts` | tatsächliche Nutzung |
| `src/services/import/crmSeeder.ts` | Fehlermeldungstext |
| `scripts/runLiveKpiE2e.ts` | Env-Injection für den Build |
| `scripts/verifyLiveKpiE2e.ts` | Statische Assertion auf die Injection-Zeile |
| `tools/n8n/README.md` | Beschreibungstext |

**Supabase-Cloud-Projekt existiert bereits** (Marc bestätigt, leer/ohne Migrationen) —
Migrationen anwenden ist Teil von Marcs manuellen Schritten nach diesem Auftrag, nicht Teil
dieses Codes.

## Verbindliche Entscheidungen

1. **Reine Umbenennung, kein Kompatibilitäts-Shim.** `VITE_SUPABASE_ANON_KEY` →
   `VITE_SUPABASE_PUBLISHABLE_KEY`, direkt und vollständig in den 7 oben genannten Dateien. Das
   Design erlaubt eine Übergangsphase nur, „wenn technisch benötigt" — ist hier nicht der Fall,
   da noch keine reale Konfiguration existiert, die brechen könnte.
2. **Design-Dokument wird in den aktuellen Branch geholt**, nicht neu geschrieben. `git show
   codex/g28-supabase-live-operation-design:docs/superpowers/specs/2026-09-08-g28-supabase-live-operation-design.md`
   unverändert nach `docs/superpowers/specs/` in diesem Branch übernehmen (reiner Cherry-Pick des
   einen Dokuments, keine inhaltliche Änderung).
3. **Kein Merge, keine Migration, keine Credentials in diesem Auftrag.** `supabase/migrations/**`
   werden nicht verändert (sie sind bereits korrekt, laut Design nur noch auf das reale Projekt
   anzuwenden — das macht Marc manuell). `.env.local` wird nicht angelegt oder befüllt.
4. **Historische Dokumente bleiben unangetastet.** `docs/BUILD_LOG.md` und
   `docs/auftraege/ANTIGRAVITY_AUFTRAG_060_*.md` erwähnen die alte Variable im Kontext bereits
   abgeschlossener Gates — das ist korrekte Zeitgeschichte, wird nicht rückwirkend umgeschrieben.
5. **Vorbereitungscheckliste für Marc.** Neue, kurze Datei
   `docs/G28_MANUELLE_VORBEREITUNG.md`, die Design-Abschnitte 5.1–5.3 (Supabase/n8n/Frontend
   einmalig vorbereiten) als abhakbare Checkliste zusammenfasst — mit Verweis auf den
   vollständigen Design-Text für Details, keine Duplikation der Sicherheitsregeln.

## Grenzen und Schutzbereiche

`src/services/liveKpi/**` (Adapter-Logik, Contract) wird **nicht** verhaltensändernd angefasst —
nur `supabaseClient.ts` (Env-Var-Name) und die 6 weiteren Dateien aus der Tabelle oben.
`src/simulation/**`, `src/types/**` (außer `liveKpi.ts`, das nur den Namen einer bereits
bestehenden Konfigurationsvariable referenziert, keine Typänderung), `src/context/**`,
`src/services/data/**`, `src/features/resources/**` bleiben komplett unangetastet:
`git diff 9380ace -- src/simulation src/types src/context src/services/data
src/features/resources` muss leer sein (Ausnahme: falls `src/types/liveKpi.ts` selbst nicht
betroffen ist, was der Fall ist — keine Änderung dort nötig).

## Blöcke

### Block A — Design-Dokument übernehmen
`docs/superpowers/specs/2026-09-08-g28-supabase-live-operation-design.md` unverändert aus
`codex/g28-supabase-live-operation-design` in diesen Branch kopieren.

### Block B — Env-Var-Umbenennung
Alle 7 Dateien aus der Tabelle: `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`.

### Block C — Vorbereitungscheckliste
`docs/G28_MANUELLE_VORBEREITUNG.md` gemäß Entscheidung 5.

### Block D — Verifikation & Bericht
Standard-Verifikation, Builder-Bericht in `docs/BUILD_LOG.md`.

## Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
npx playwright test
npx tsx scripts/runLiveKpiE2e.ts        # muss weiterhin ehrlich SKIPPED_NOT_CONFIGURED melden
npx tsx scripts/verifyLiveKpiE2e.ts     # Assertion auf neue Variable angepasst, muss grün sein
grep -rln "VITE_SUPABASE_ANON_KEY" src/ scripts/ tools/ .env.example   # leer (nur historische docs/BUILD_LOG.md und Auftrag-060-Doc dürfen noch Treffer zeigen)
git diff 9380ace -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## Akzeptanzkriterien für die Prüfung

- Kein lebendiger Code-/Config-/Skript-Pfad verwendet noch `VITE_SUPABASE_ANON_KEY`.
- `isSupabaseConfigured` in `supabaseClient.ts` verhält sich identisch (weiterhin `false`/ehrlicher
  Empty-State ohne echte Konfiguration) — nur der Variablenname hat sich geändert.
- Design-Dokument ist unverändert im neuen Branch vorhanden.
- `docs/G28_MANUELLE_VORBEREITUNG.md` existiert und verweist korrekt auf die Design-Abschnitte.
- Keine Migration, kein Secret, keine `.env.local` wurde angelegt oder verändert.
