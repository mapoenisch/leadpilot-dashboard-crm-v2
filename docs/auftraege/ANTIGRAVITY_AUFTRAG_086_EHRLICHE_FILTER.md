# ANTIGRAVITY_AUFTRAG_086 — Paket C: Ehrliche und einfache Filter

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 8 (Arbeitspaket C).
> Gestartet von Marc Poenisch im Chat am 09.10.2026 nach Merge von PR #71 (Auftrag 085).

## Ziel

Jede sichtbare Filtereinstellung hat eine nachweisbare Wirkung. Felder ohne Wirkung verschwinden aus
der normalen Ansicht, gespeicherte Werte bleiben unverändert erhalten. Mobil ist der Filterbereich
zunächst geschlossen.

## Baseline

- Branch `claude/auftrag-086-ehrliche-filter` von `main` `0fe9db5` (Merge PR #71).
- Schutzbereichs-Baseline: `0fe9db5`.

## Bestandsaufnahme

- **Zeitraum:** `SUPPORTED_DATE_FIELDS` in `model/dashboardFilters.ts` ist für alle Quellen leer;
  `resolveEffectiveFilter` liefert `period: null` immer. Die Von-/Bis-Felder hatten also nie Wirkung.
- **Pipeline-Liste:** Es gibt keine vollständige organisationsbezogene Pipeline-Liste (kein Endpunkt,
  keine Tabelle; `supabase/schema.sql` kennt nur die Spalte `pipeline TEXT` an Deals). Eine Auswahl
  aus der aktuellen Ergebnisseite wäre nicht vollständig → **Textfeld bleibt**.
- **Pipeline-Verhalten:** `FilteredFunnelDealSource` vergleicht exakt (`deal.pipeline === pipeline`),
  Eingabe wird vorher getrimmt. Gilt nur für Kacheln, deren Katalogeintrag `pipeline` unterstützt.
- **Kachelfähigkeit:** bereits vorhanden – `pipelineSupported` blendet das Feld aus, `TimeReference`
  und Detailseite nennen gewählte, aber nicht wirksame Filter mit Grund. Unverändert übernommen.

## Ziel-Dateien

| Datei                                                             | Änderung                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/features/dashboard/components/DashboardFilters.tsx`          | Von/Bis entfernt, Hinweise, gespeicherter Zeitraum, Mobil-Knopf |
| `src/features/dashboard/__tests__/DashboardFilters.ui.vitest.tsx` | Zeitraum- und Mobil-Tests angepasst/ergänzt                     |
| `e2e/personal-dashboard.spec.ts`                                  | Filter mobil aufklappen; Knopfzustand nach Rückkehr aus Details |
| `e2e/personal-dashboard-acceptance.spec.ts`                       | Filter mobil aufklappen                                         |
| `scripts/captureAuftrag086Filters.mjs` (neu)                      | Screenshot-/Messnachweis                                        |
| `docs/screenshots/auftrag-086/README.md` (neu)                    | Ergebnis-Matrix                                                 |
| Plan Abschnitt 8, `docs/BUILD_LOG.md`, diese Datei                | Dokumentation                                                   |

`DashboardWorkspace.tsx`, `ConfiguratorFields.tsx`, `model/dashboardFilters.ts`, `data/resolveCrm.ts`
brauchten keine Änderung (Kachelfähigkeit und Auflösung waren schon korrekt).

## Tasks

- [x] Von-/Bis-Felder aus der Filterleiste entfernt; Hinweis „Zeitraumfilter für diese Daten derzeit
      nicht verfügbar.“ Ein Hinweis in der Filterleiste statt auf jeder Kachel: Er gilt für alle
      heutigen Quellen gleich; Kacheln mit gewähltem Zeitraum nennen den Grund wie bisher selbst.
- [x] Gespeicherter Zeitraum (Sitzung oder Startfilter) bleibt im Zustand, fährt beim Anwenden der
      Pipeline mit und wird angezeigt („Gespeicherter Zeitraum … bleibt erhalten, wirkt aber nicht.“).
      Keine Konfigurationsversion geändert. Entfernen nur über „Filter zurücksetzen“ /
      „Startfilter entfernen“.
- [x] Pipeline-Fähigkeit pro Kachel: unverändert (Feld nur bei unterstützender Kachel, Gründe je Kachel).
- [x] Pipeline-Liste geprüft: keine vollständige Quelle → Textfeld behalten, Verhalten erklärt
      („CRM-Kacheln zeigen nur Deals, deren Pipeline genau so heißt (Groß-/Kleinschreibung zählt);
      andere Kacheln bleiben ungefiltert.“).
- [x] Mobil (< 768 px): Bereich zunächst zu, Knopf „Filter“ bzw. „Filter: 1 aktiv“ (zählt nur
      angewendete, wirksame Filter). Auf-/Zuklappen ändert weder Entwurf noch angewandten Filter.
- [x] Tests: keine Datumsfelder; gespeicherter Zeitraum verlustfrei beim Anwenden; Startzeitraum
      sichtbar und entfernbar; Mobil-Knopf zu/auf ohne Anwenden, Entwurf bleibt; Zähler nur für
      wirksame Filter (nicht für Zeitraum, nicht ohne Pipeline-Kachel). Bestehend und weiter grün:
      Ansicht ohne CRM-Kachel, angewendete Pipeline, verwaister Startfilter, Rückkehr aus Details
      (E2E, jetzt mit Knopfzustand auf 375 px). „Defekter Optionsabruf“ entfällt: es gibt keinen.

## Abnahme

Jede sichtbare Einstellung wirkt; der Zeitraum ist als unwirksam benannt statt angeboten. Alte
Präferenzen und Sitzungsfilter funktionieren unverändert. Pflichtgates und Screenshot-Matrix grün.
