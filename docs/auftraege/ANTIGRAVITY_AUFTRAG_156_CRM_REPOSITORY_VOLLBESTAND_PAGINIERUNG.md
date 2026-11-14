# Auftrag 156 – CRM-Repository & Workspace: Vollbestandsabruf und Paginierung jenseits 1.000 Zeilen

**Ziel:** Vollständige Behebung der stillen 1.000-Zeilen-Abschneidung (`max_rows = 1000`) im gesamten CRM- und Workspace-Datenzugriff. Alle Methoden in `CRMRepository` (`getCompanies`, `getContacts`, `getContactsByCompanyId`, `getImportedFunnelDeals`) sowie die Hydrierung des Workspace in `runRepository` (`selectByOrg`) laden nachweislich den vollständigen Datenbestand über seitenweises Chunking (`.range(...)`) mit stabiler Sortierung.

**Kontext:** Befund aus der P08-Planung (Auftrag 154 §8). Supabase begrenzt REST-/PostgREST-Antworten standardmäßig auf höchstens 1.000 Zeilen (`max_rows = 1000` in `supabase/config.toml:18`). Während Auftrag 154 für V2-Dashboard-Kacheln eine serverseitige Aggregat-RPC bereitstellt, blieben die Basis-Repositories von dieser Begrenzung betroffen.
**Vorgelagert:** Auftrag 154 (P08a, Abfragevertrag) und Auftrag 155 (P08b, Panel-Editor).
**Baseline:** Nach Merge von Auftrag 155.
**Branch:** `auftrag-156-crm-repository-vollbestand`.
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub. **Merge:** Marc.
**Status:** GEPLANT.

---

## 1. Ist-Stand & Schwachstellen

| Fundstelle                                                            | Ist-Zustand                                                                               | Problem                                                                                                                                            |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/db/crmRepository.ts:76–93` (`readSupabaseTable`)        | `supabase.from(table).select('*').order(orderColumn, { ascending })` ohne `.range(...)`   | Liefert bei >1.000 Zeilen stillschweigend nur die ersten 1.000 Zeilen.                                                                             |
| `src/services/db/crmRepository.ts:99–111` (`getCompanies`)            | Ruft `readSupabaseTable('Companies', 'companies', ...)`                                   | Ab der 1.001. Company fehlen Firmen im CRM.                                                                                                        |
| `src/services/db/crmRepository.ts:124–135` (`getContacts`)            | Ruft `readSupabaseTable('Contacts', 'contacts', ...)`                                     | Ab dem 1.001. Kontakt fehlen Kontakte im CRM.                                                                                                      |
| `src/services/db/crmRepository.ts:140–143` (`getContactsByCompanyId`) | Ruft `getContacts()` und filtert in JS-Speicher (`filter(c => c.companyId === id)`)       | Liegt ein Kontakt alphabetisch nach Nachname hinter Zeile 1.000, wird er der Firma nicht zugeordnet.                                               |
| `src/services/db/crmRepository.ts:148–164` (`getImportedFunnelDeals`) | Ruft `readSupabaseTable('Imported Funnel Deals', 'imported_funnel_deals', ...)`           | Ab dem 1.001. Deal fehlen Deals für alle Aufrufer jenseits der neuen V2-RPC (z. B. Simulation-Baselines, Fallback).                                |
| `src/hooks/queries/usePipelineOverview.ts:9–14`                       | Ruft `getPipelineOverview(CRMRepository)`                                                 | Rechnet ohne RPC nur auf den ersten 1.000 Deals.                                                                                                   |
| `src/services/runs/runRepository.ts:250–257` (`selectByOrg`)          | `client.from(table).select('*').eq('organization_id', organizationId)` ohne `.range(...)` | Betrifft `simulation_timeseries`, `simulation_events`, `simulation_snapshots`. Große Simulationsläufe werden beim Neuladen unvollständig hydriert. |
| `src/services/scenarios/scenarioRepository.ts:10–33`                  | `loadScenarios` und `loadVersions` ohne `.range(...)`                                     | Begrenzt Szenarien/Versionen auf 1.000.                                                                                                            |

Bereits behoben als Referenzmuster:

- `src/features/crm/services/leadQualificationService.ts:76–97` (`fetchQualifiedContactIds`): Nutzt eine Schleife `const PAGE = 1000; .range(from, from + PAGE - 1); if (rows.length < PAGE) break;`.
- `supabase/functions/crm-query-export/index.ts:318–348` (`execCrmQuery`): Paginierter Chunk-Abruf mit `STAGE_SORT_CHUNK = 1000`.

---

## 2. Soll

### 2.1 Paginierter Vollbestandsabruf in `crmRepository.ts`

1. `readSupabaseTable<Row>` wird auf eine iterative Chunk-Schleife umgestellt:
   - Chunk-Größe: `PAGE_SIZE = 1000`.
   - `.range(from, from + PAGE_SIZE - 1)`.
   - Stabile Primärschlüssel-/Spalten-Sortierung (`orderColumn`, `{ ascending }`, Tie-Break mit `id` aufsteigend falls vorhanden), um doppelte oder übersprungene Zeilen zwischen Chunks zu verhindern.
   - Abbruchbedingung: Wenn ein Chunk weniger als `PAGE_SIZE` Zeilen liefert (`chunk.length < PAGE_SIZE`), ist der Datenbestand vollständig geladen.
2. `getContactsByCompanyId(companyId: string)`:
   - Wenn Supabase konfiguriert ist, gezielte Abfrage mit `.eq('company_id', companyId)` direkt an die Datenbank senden, statt alle Kontakte der Organisation in den Browser-Speicher zu laden und danach zu filtern.
   - Fallback auf unkonfigurierte Datenquelle (`activeSnapshot()`) bleibt erhalten.
3. Unkonfigurierter Betrieb (Demo/Offline-Snapshot):
   - Bleibt unverändert deterministisch über `activeSnapshot()`.

### 2.2 Paginierter Vollbestandsabruf in `runRepository.ts` & `scenarioRepository.ts`

4. `selectByOrg<T>` in `src/services/runs/runRepository.ts`:
   - Umstellung auf Chunk-Abruf mit `.range(from, from + PAGE_SIZE - 1)` und stabiler Sortierung (`id` oder `created_at`).
   - Verhindert stille Datenverluste bei `simulation_timeseries`, `simulation_events` und `simulation_snapshots` bei umfangreichen Simulationsläufen.
5. `loadScenarios` und `loadVersions` in `src/services/scenarios/scenarioRepository.ts`:
   - Analog gegen 1.000er-Grenze absichern.

### 2.3 `usePipelineOverview.ts`

6. Prüfen, ob `usePipelineOverview` auf die in Auftrag 154 erstellte RPC `dashboard_crm_pipeline_overview` umschalten kann, wenn Supabase aktiv ist, mit transparentem Fallback auf `CRMRepository`.

---

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**` darf nicht verändert werden (außer Tests unter `src/simulation/__tests__/` laufen unverändert grün). `crmRepository.ts` Lese-Pfad wird erweitert, Schreib-Stubs bleiben unberührt.
2. **Keine neuen Laufzeitabhängigkeiten:** Reines PostgREST `.range()` des vorhandenen Supabase-Clients.
3. **Dateilängen:** Jede modifizierte Datei bleibt unter 400 Zeilen. Bei Bedarf Hilfsfunktion `fetchChunkedSupabaseTable` in separate Hilfsdatei auslagern.
4. **TDD:** Rot-Nachweis vor Implementierung: Ein Mock-Supabase-Client, der bei `select('*')` ohne Range maximal 1.000 Zeilen liefert, muss mit 1.500 Datensätzen vor dem Fix fehlschlagen und nach dem Fix 1.500 Zeilen vollständig liefern.

---

## 4. Ziel-Dateien

| Pfad                                                                               | Änderung                                                                                      |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_156_CRM_REPOSITORY_VOLLBESTAND_PAGINIERUNG.md` | Dieser Auftrag                                                                                |
| `src/services/db/crmRepository.ts`                                                 | Paginierter Abruf in `readSupabaseTable`, gezielte Firmen-Abfrage in `getContactsByCompanyId` |
| `src/services/db/supabasePagingHelper.ts`                                          | Neu (optional): generische Chunking-Schleife `fetchChunkedTable<T>`                           |
| `src/services/runs/runRepository.ts`                                               | Paginierter Abruf in `selectByOrg`                                                            |
| `src/services/scenarios/scenarioRepository.ts`                                     | Paginierter Abruf                                                                             |
| `src/hooks/queries/usePipelineOverview.ts`                                         | Vollbestands- bzw. RPC-Anbindung                                                              |
| `src/services/db/__tests__/crmRepository.paged.vitest.ts`                          | Neu: Tests für 1.500 Datensätze über mehrere Pages                                            |
| `src/services/runs/__tests__/runRepository.paged.vitest.ts`                        | Neu: Tests für Workspace-Hydrierung mit >1.000 Zeilen                                         |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                               | Plan- und Log-Aktualisierung                                                                  |

---

## 5. Tasks

- [ ] **T0 Vorbereitung:** Baseline und Schutzbereiche prüfen.
- [ ] **T1 Rot-Nachweise:** Vitest-Test mit Mock-Supabase (Liefergrenze 1.000 Rows, Testbestand 1.500 Rows). Zeigen, dass `getCompanies`, `getContacts` und `getImportedFunnelDeals` heute bei 1.000 abschneiden.
- [ ] **T2 CRM-Repository Umstellung:** Paginierung in `readSupabaseTable` einbauen (`PAGE_SIZE = 1000`, `range`, stabiler Tie-Break). `getContactsByCompanyId` gezielt per Query auflösen.
- [ ] **T3 Workspace-Repository Umstellung:** `selectByOrg` in `runRepository.ts` paginieren.
- [ ] **T4 Pipeline-Overview Hook:** Prüfung & Anpassung an RPC/Vollbestand.
- [ ] **T5 Verifikation & Tests:** `npx tsc --noEmit`, `npm test`, `npm run verify`, `npm run build`.
- [ ] **T6 Dokumentation & PR:** Builder-Eintrag in `docs/BUILD_LOG.md`, PR öffnen.
