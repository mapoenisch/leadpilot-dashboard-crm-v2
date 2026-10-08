# ANTIGRAVITY_AUFTRAG_084 — Paket A: Pipelinefehler, Zustände und Navigation (F12)

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 6 (Arbeitspaket A).
> Befund F12 in `docs/reviews/2026-10-06-frontend-befundregister.md`, Reproduktion dort Abschnitt 5.
> Gestartet von Marc Poenisch im Chat am 08.10.2026 nach Merge von PR #68 (Auftrag 083).

## Ziel

Nach erfolgreicher, leerer und fehlgeschlagener CRM-Antwort funktioniert die Navigation ohne
Neuladen. Fehler erscheinen nicht als geschäftliche Nullwerte, „Erneut versuchen“ stellt die
Anzeige wieder her, der Export ist ohne Datenbasis gesperrt. Kein CRM-Cache eines vorherigen
Benutzers bleibt sichtbar.

## Baseline

- Branch `claude/auftrag-084-pipeline-fehler` von `main` `564e05a` (Merge PR #68).
- Schutzbereichs-Baseline: `564e05a`.

## Ursache (Diagnose)

`useCrmProvenance` abonniert den QueryCache und setzte bei **jedem** `crm`-Ereignis ein neues
State-Objekt. `useCrmListQuery` übergibt bei jedem Render neue Funktionen (`queryFn`,
`placeholderData`); TanStack Query meldet daraufhin `observerOptionsUpdated` an den Cache.
Ergebnis: Render → Ereignis → neuer State → Render, endlos, unabhängig vom Antwortzustand
(Erfolg, leer, Fehler). React Router 7 führt Navigationen als Transition aus; die Dauer-Updates
haben höhere Priorität und verdrängen sie. Deshalb wechselt die Adresse, der Inhalt aber nicht.
Im Produktionsbuild tritt keine „Maximum update depth“-Warnung auf, weil die Schleife über den
Benachrichtigungstakt von TanStack asynchron läuft. Belegt:

- Unit-Test ohne Fix: Vitest-Worker läuft in einen Speicherüberlauf; mit Render-Obergrenze in allen
  drei Antwortzuständen rot.
- E2E gegen den Produktionsbuild ohne Fix: Kopfzeile bleibt „Deal Pipeline“ nach dem Wechsel zu
  `/company/profile` (Erfolg, leer, Fehler). Die Produktion war damit betroffen.

Nebenbefund Benutzerwechsel: CRM-Query-Keys enthalten weder Benutzer noch Organisation,
`staleTime` beträgt 60 s, und bei Ab-/Ummeldung wurde der Cache nicht geleert. Ein neu
angemeldeter Benutzer hätte im selben Tab bis zu 60 s die Liste des vorherigen sehen können.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert, insbesondere `src/services/data/sourceFreshness.ts`
  (nur gelesen). Keine Migration, keine neue Abhängigkeit.
- Datenbank-/Edge-Function-Ausfälle werden nicht behoben; ein UI-Fix beweist keinen reparierten
  Server. Die Tests steuern `crm-query-export` kontrolliert.
- Fachtexte und Gestaltung der CRM-Seiten (z. B. „Datenbank Status: Supabase Verbunden“ auf Leads
  auch im Fehlerfall, Entwicklersprache) bleiben bei Paket C/E (F09).

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/crm/hooks/useCrmProvenance.ts` | State nur bei inhaltlicher Änderung setzen |
| `src/auth/AuthContext.tsx`, `src/app/App.tsx` | Queries bei Abmeldung/Benutzerwechsel vor dem Rendern zurücksetzen (`onUserChange` → `resetQueries`) |
| `src/components/ui/charts/ManagementChartState.tsx` | optionales `onRetry` → „Erneut versuchen“ |
| `src/features/crm/pages/{Deals,Companies,Leads}Page.tsx` | „Nicht verfügbar“/„…“ statt 0, Exportsperre mit sichtbarem Grund, Retry |
| `src/features/crm/hooks/__tests__/useCrmProvenance.renderLoop.ui.vitest.tsx` (neu) | Regressionstest Schleife |
| `src/auth/__tests__/queryCacheUserReset.ui.vitest.tsx` (neu) | Benutzerwechsel |
| `src/features/crm/pages/__tests__/crmPages.states.ui.vitest.tsx` (neu) | Zustände je Seite |
| `e2e/crm-query-export.spec.ts` | Navigation/Zurück/Vorwärts je Zustand, Retry |
| `scripts/captureAuftrag084PipelineStates.mjs` (neu), `docs/screenshots/auftrag-084/README.md` (neu) | Vorher/Nachher-Nachweis (Rohdaten lokal unter `artifacts/`) |
| Befundregister, Plan §6, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | Dokumentation |

## Tasks

- [x] SERVER_ERROR reproduzieren (E2E mit kontrolliertem 500): Adresse wechselt, Kopfzeile bleibt.
- [x] Erfolg und leer separat prüfen: gleiche Blockade; Ursache über QueryCache-Ereignisse und
      Hook-State nachverfolgt (siehe Ursache), nicht aus einem Stacktrace abgeleitet.
- [x] Minimaler Regressionstest, vor dem Fix rot (Unit und E2E).
- [x] Kleinster Eingriff: Vergleich vor `setState` in `useCrmProvenance`. Keine Wiederholungszahl
      erhöht, keine Warnung abgeschaltet.
- [x] Lade-, Leer-, Fehler- und Erfolgszustand getrennt: Fehler „Nicht verfügbar“, Laden „…“,
      bestätigt leer weiterhin 0.
- [x] „Erneut versuchen“ wiederholt nur die betroffene Abfrage (`refetch`, E2E: genau ein POST);
      Export ohne Datenbasis gesperrt mit Hinweis im Titel.
- [x] Navigation, Zurück/Vorwärts, Wiederholen und Benutzerwechsel unter Fehlerbedingungen getestet.

## Abnahme

- Pflicht-Verifikation (`tsc`, `verify`, `test`, `build`, `lint`, `format:check`) grün.
- E2E `crm-query-export.spec.ts` (Auftrag 084) 12/12 auf 1440/768/375.
- `docs/screenshots/auftrag-084/README.md`: 18/18 Aufnahmen (3 Seiten × 3 Breiten × 2 Themes)
  ohne serious/critical axe über die ganze Seite, ohne neuen Überlauf; 3/3 Navigationsfälle.
- Schutzbereichs-Diff gegen `564e05a` leer.
