# AUFTRAG 067N / Gate G60 — Serverseitige CRM-Abfragen und CSV-Export

**Baseline:** `146de7f` (G59 in `main` integriert)
**Branch:** `feat/auftrag-067n-crm-query-export` (von aktuellem `main` abzweigen)
**Status:** BEREIT ZUR PRÜFUNG

Teilauftrag 067N des Master-Auftrags 067
(`ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md`). Er konkretisiert
Task 14 des Master-Implementierungsplans. Diese Datei ist die verbindliche
Arbeitsanweisung für G60.

## Maßgebliche Dokumente (Lesereihenfolge)

1. `CLAUDE.md`
2. `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md` — Abschnitt „067N / G60“
3. `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md` — Abschnitte 3.2, 3.3, 13.2 und 16
4. `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md` — Task 14
5. `docs/BUILD_LOG.md` — letzter G59-Eintrag
6. `supabase/migrations/20260916_identity_and_tenant_rls.sql`, `supabase/tests/tenant_isolation.sql` und `e2e/tenant-isolation.spec.ts`

Bei Widerspruch gilt diese Reihenfolge.

## Ziel

Die CRM-Listen für **Unternehmen**, **Kontakte** und **Funnel Deals** werden ausschließlich
serverseitig, paginiert und an die verifizierte Organisation der angemeldeten Person gebunden
geladen. Suchbegriff, Filter, Sortierung, Seite und Seitengröße sind URL-synchron und nach
Reload oder Deep-Link exakt wiederherstellbar. Ein CSV-Export verwendet genau dieselbe
serverseitige Query wie die sichtbare Liste, kann daher weder Filter noch Mandanten- oder
Rollenprüfung umgehen und neutralisiert Tabellenformeln.

Die in G58 zurückgestellten Tests 1 und 2 aus `e2e/tenant-isolation.spec.ts` werden ohne
Änderung ihres Testkörpers reaktiviert und grün. Das ist ein zwingendes G60-Akzeptanzkriterium.
Der lokale E2E-Seed ordnet `admin-a@e2e.local` dafür wieder Organisation A zu, weil dessen
unveränderter Testkörper `Firma A1` erwartet. Der synthetische Demo-Mandant bleibt bestehen;
die bisherige Sonderzuordnung aus G58 wird mit dem jetzt vorhandenen serverseitigen
Mandantenpfad bewusst abgelöst und in der Betriebsdokumentation aktualisiert.

`ActivitiesPage` bleibt in diesem Auftrag unverändert: Für Aktivitäten existiert aktuell keine
mandantengebundene relationale CRM-Tabelle. Es darf keine scheinbar serverseitige Aktivitätsliste
aus statischen oder synthetischen Browserdaten erfunden werden.

## Fachliche und Sicherheitsregeln

| Regel | Verbindliches Verhalten |
|---|---|
| Mandant | `organization_id` stammt ausschließlich aus der serverseitig verifizierten aktiven Mitgliedschaft; eine Body-, Query- oder URL-`organizationId` wird ignoriert bzw. abgewiesen. |
| Rollen | `admin`, `manager` und `viewer` dürfen CRM lesen. CSV-Export ist nur `admin` und `manager` erlaubt; `viewer` erhält serverseitig `403 FORBIDDEN`. |
| Ressourcen | Zulässig sind nur `companies`, `contacts` und `deals` (`imported_funnel_deals`). Unbekannte Ressourcen werden mit `400 INVALID_QUERY` abgewiesen. |
| Suche und Filter | Volltext-/Teilstringsuche und nur pro Ressource explizit erlaubte Filterfelder. Kein frei übergebener SQL-, PostgREST- oder Spaltenausdruck. |
| Sortierung | Nur Whitelist-Felder und `asc`/`desc`. Bei Gleichstand sorgt `id` als sekundäre Sortierung für stabile Seiten. |
| Pagination | `page` beginnt bei 1; `pageSize` liegt zwischen 1 und 100. Ungültige Werte werden mit `400 INVALID_QUERY` abgewiesen; große Datenmengen werden nie vollständig in den Browser geladen. |
| CSV | UTF-8, Header und Zeilen in stabilem Whitelist-Feldschema. Zellen, die nach optionalen Leerzeichen mit `=`, `+`, `-` oder `@` beginnen, erhalten ein führendes Apostroph. CSV enthält nur gefilterte Daten der eigenen Organisation. |
| Fehler | Keine Tokens, Service-Role-Details, SQL-Fehler oder Daten fremder Organisationen. Zulässige Codes: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_QUERY`, `NOT_FOUND`, `SERVER_ERROR`. |
| Browser | Browser erhält nur den Anon-Key und ruft ausschließlich die neue Edge Function auf; Service-Role bleibt ausschließlich in der Function. |

## Vorgesehene Architektur

1. Eine neue Migration ergänzt ausschließlich die für die drei Ressourcen notwendigen
   organisationsbezogenen Composite-/Sortierindizes. Bestehende RLS-Policies bleiben
   unverändert, sofern kein reproduzierbar notwendiger, in diesem Auftrag dokumentierter
   Konflikt vorliegt.
2. Die Edge Function `crm-query-export` prüft Bearer-Token, aktive Mitgliedschaft und Rolle
   serverseitig. Sie ermittelt die Organisation ausschließlich aus der Mitgliedschaft und
   führt die Query mit einer statischen Ressourcen-/Spalten-Whitelist aus.
3. Action `list` liefert ein einheitliches Seitenobjekt
   `{ items, total, page, pageSize, resource }`. Action `export` benutzt exakt dieselbe
   kanonische Query-Validierung und gibt `text/csv; charset=utf-8` mit
   `Content-Disposition: attachment` zurück.
4. `crmListService.ts` und `useCrmListQuery.ts` übersetzen URL-Parameter in den typisierten
   Query-Vertrag und TanStack-Query-Keys. Die Seiten rendern nur `items` der aktuellen Seite;
   Filter-, Sortier- und Pager-Aktionen schreiben den URL-Zustand.
5. `crmExportService.ts` löst den Export über die Function aus; weder Link noch Exportdaten
   werden in `localStorage`, Logs oder Screenshots abgelegt.

## Zieldateien

| Art | Dateien |
|---|---|
| Create | `supabase/migrations/20260928_crm_query_indexes.sql`, `supabase/functions/crm-query-export/index.ts`, `supabase/functions/__tests__/crmQueryExport.test.ts`, `supabase/tests/crm_query_export.sql`, `src/services/crm/crmListService.ts`, `src/services/crm/crmExportService.ts`, `src/services/crm/__tests__/crmListService.vitest.ts`, `src/services/crm/__tests__/crmExportService.vitest.ts`, `src/hooks/queries/useCrmListQuery.ts`, `src/hooks/queries/__tests__/useCrmListQuery.vitest.tsx`, `e2e/crm-query-export.spec.ts`, `docs/screenshots/auftrag-067n-g60/README.md` |
| Modify | `supabase/seed.sql`, `docs/operations/ci-e2e-backend.md`, `src/features/crm/pages/LeadsPage.tsx`, `src/features/crm/pages/CompaniesPage.tsx`, `src/features/crm/pages/DealsPage.tsx`, `src/features/crm/components/CrmResponsiveList.tsx`, `src/services/query/queryKeys.ts`, `e2e/tenant-isolation.spec.ts`, `docs/BUILD_LOG.md` |

Jede weitere Datei ist ein Stopp-Punkt. Besonders unverändert bleiben
`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`,
`src/features/resources/**`, `src/services/db/crmRepository.ts`, sämtliche
Auth-/Einladungsdateien aus G59 und alle bestehenden RLS-Policies außerhalb der neuen,
ausdrücklich erforderlichen G60-Migration.

## Tasks (Reihenfolge verbindlich, rot vor grün)

- [ ] **Step 1 — Rote Vertrags-, SQL- und UI-Tests:**
  Schreibe zuerst Tests für Query-Parameter, URL-Roundtrip, Whitelist-Sortierung,
  Seitengrenzen, leere Treffer, Filterkombinationen und stabile Pagination. Ergänze
  negative Tests für manipulierte `organizationId`, fremde IDs, unbekannte Ressourcen,
  ungültige Seitenwerte und CSV-Formelinjection. Reaktiviere in diesem Schritt die zwei
  vorhandenen `test.fixme`-Tests in `e2e/tenant-isolation.spec.ts`, ohne ihre Testkörper zu
  verändern.

- [ ] **Step 1a — Reproduzierbare E2E-Organisationen:**
  Stelle ausschließlich im lokalen Seed und seiner Betriebsdokumentation wieder her, dass
  `admin-a@e2e.local` aktive:r Admin von Organisation A und `admin-b@e2e.local` aktive:r
  Admin von Organisation B ist. Der Testkörper von `tenant-isolation.spec.ts` bleibt
  unverändert. Prüfe vor der Implementierung rot, dass beide Benutzer jeweils nur die
  erwartete Firma ihres Mandanten erhalten.

- [ ] **Step 2 — Migration und serverseitiger Query-Vertrag:**
  Ergänze die minimalen Indizes und den serverseitigen Query-/Exportpfad. Die Ressourcen-,
  Filter- und Sortier-Whitelist ist als geschlossener Vertrag implementiert; dynamische
  Spaltennamen, frei durchgereichte Query-Ausdrücke, Browser-`organizationId` und
  service-role-Daten im Client sind verboten. Für jede neue Funktion gilt Default-Deny für
  `anon` und `authenticated`, sofern sie nicht ausschließlich über die Edge Function
  erreichbar ist.

- [ ] **Step 3 — Listen- und Export-Services:**
  Implementiere den gemeinsamen, typisierten `CrmListQuery`-Vertrag für `list` und
  `export`. Der Export darf keine eigene Abfrage oder clientseitig zusammengesetzte CSV
  besitzen. Jeder Fehlercode wird für die UI übersetzt, ohne Serverdetails zu übernehmen.

- [ ] **Step 4 — URL-synchrone CRM-Oberflächen:**
  Stelle Leads/Kontakte, Unternehmen und Deals auf die paginierten Ergebnisse um. Suche,
  erlaubte Filter, Sortierung, Seite und Seitengröße sind sichtbar und tastaturbedienbar.
  Filteränderungen setzen die Seite auf 1 zurück. Die URL ist die Quelle des Listenzustands;
  Reload und Deep-Link reproduzieren exakt dieselbe Abfrage. Der Export-Button zeigt bei
  `viewer` keinen freigeschalteten Pfad und behandelt 403 verständlich.

- [ ] **Step 5 — E2E-, Sicherheits- und Screenshot-Nachweis:**
  Führe den echten Nutzerfluss für Admin, Manager und Viewer durch: gefilterte Query,
  URL-Roundtrip, zweite Seite, CSV-Export, Formel-Injection und Fremdmandant. Die beiden
  reaktivierten Tenant-E2E-Tests müssen unverändert grün sein. Prüfe alle geänderten Listen
  bei 1440, 768 und 375 px auf 0 px horizontalen Overflow. Committe nur die textuelle
  Hash-/Overflow-Matrix.

- [ ] **Step 6 — Gate-Abschluss:**
  Prüfe exakten Scope und Schutzbereiche gegen die Baseline, ergänze den vollständigen
  Builder-Eintrag in `docs/BUILD_LOG.md`, committe lokal und übergib an den unabhängigen
  Prüfer. Kein Push, PR, Merge oder Deploy.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
deno test --no-lock --allow-read supabase/functions/__tests__/
supabase test db
npx playwright test e2e/crm-query-export.spec.ts e2e/tenant-isolation.spec.ts
git diff --check 146de7f
git diff 146de7f -- src/simulation src/types src/context src/services/data src/features/resources
```

Zusätzlich muss ein Secret-/Token-Scan der neuen Function, Services, E2E-Logs und
Screenshot-Matrix leer bleiben. Der letzte Diff-Befehl muss leer sein.

## Akzeptanzkriterien für die Prüfung

- Eine Query für Unternehmen, Kontakte oder Deals liefert ausschließlich Daten der aktiven
  Organisation; manipulierte Organisations- oder Ressourcenparameter erweitern keinen Zugriff.
- Suche, Filter, Sortierung, Pagination und Gesamtzahl stammen vom Server und sind über
  Reload/Deep-Link URL-identisch; es wird nie der volle Bestand als Browserliste geladen.
- Admin und Manager exportieren exakt die gefilterte serverseitige Ergebnismenge; Viewer
  scheitert serverseitig mit 403.
- CSV ist UTF-8, feldstabil und neutralisiert alle formelanfälligen Zellen.
- `tenant-isolation.spec.ts` Tests 1 und 2 sind nicht mehr `fixme` und unverändert grün.
- Der lokale Seed belegt `admin-a@e2e.local` in Organisation A und
  `admin-b@e2e.local` in Organisation B; die Betriebsdokumentation beschreibt dieselbe
  Zuordnung ohne Zugangsdaten oder Secrets.
- Alle drei Rollen, zwei Organisationen, ungültige Query-Parameter und Formel-Injection sind
  mindestens SQL-/Function- und E2E-seitig negativ geprüft.
- Keine Service-Role, kein Token, keine E-Mail-Inhalte und keine fremden Mandantendaten erscheinen
  im Browser-Bundle, in Logs, Screenshots oder CSV außerhalb der berechtigten Organisation.
- Scope und Schutzbereichs-Diff sind leer; alle Pflicht-Gates sind grün.

## Stopp-Punkte

- Kein Push, kein Merge, kein Deploy und kein Versand an externe Dienste ohne ausdrückliche
  Freigabe von Marc.
- Keine neue npm-, Deno- oder Browserbibliothek ohne schriftliche Erweiterung.
- Keine Änderung an Datenquellenvertrag, Auth, Mitgliedschaften, Einladungen, RLS-Bestand oder
  CRM-Schreibfunktionen außerhalb der Zieldateien.
- Fehlt eine echte mandantengebundene Datenquelle für die reaktivierten E2E-Tests, stoppen und
  den konkreten Konflikt mit Datei und Zeile dokumentieren; keine Demo- oder Browser-Umgehung.
- Ein Builder-Bericht, ein lokaler Commit oder ein grüner Einzeltest ersetzt weder die
  unabhängige Gate-Prüfung noch die erforderlichen GitHub-Actions.

## Abschluss

Der Builder-Eintrag in `docs/BUILD_LOG.md` enthält Ziel und Baseline, Zieldateien,
Rollen-/Mandantennachweise, Query-/CSV-Vertrag, reaktivierte Tenant-E2E-Tests,
Screenshot-Matrix, Schutzbereichs-Diff, alle Gate-Ausgaben und Freigabestatus.
Commit-Message: `feat: add tenant-safe CRM querying and export`.
Danach lokal stoppen und an den unabhängigen Prüfer übergeben.
