# ANTIGRAVITY_AUFTRAG_112 — Paket H Teil 8: Entwicklerbegriffe „Supabase“ in Nutzertexten

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13, Punkte „Sprachliste“ und „Entwicklerbegriffe aus der Nutzeroberfläche“. Baseline `49a0b0d` (main nach PR #103).

## Sprachliste (Fortsetzung von Auftrag 110)

| Bisher                                         | Neu                                           |
| ---------------------------------------------- | --------------------------------------------- |
| Tab „Supabase & Import Audit“                  | „Datenbank- und Import-Prüfung“               |
| „⚡ Supabase Verbunden“                        | „⚡ Datenbank verbunden“                      |
| „📦 Lokaler Fallback“                          | „📦 Lokale Beispieldaten“                     |
| „Supabase nicht konfiguriert“ (3 Live-Kacheln) | „Live-Verbindung nicht eingerichtet“          |
| „Funnel Deals … Volumen, Stage …“ (DealsView)  | „Deals im Funnel … Volumen, Vertriebsphase …“ |

## Ziel-Dateien

| Datei                                                                          | Änderung               |
| ------------------------------------------------------------------------------ | ---------------------- |
| `src/features/crm/pages/LeadsPage.tsx`                                         | Tab- und Statuslabel   |
| `src/features/crm/components/DealsView.tsx`                                    | Beschreibung           |
| `src/components/liveKpi/{LiveActivityFeed,StreamingAreaChart,LiveKpiCard}.tsx` | Statustexte            |
| `src/styles/global.css`                                                        | Kommentar nachgezogen  |
| zugehörige `*.vitest.tsx`                                                      | Erwartungen nachziehen |

## Tasks

- [x] Nutzertexte mit „Supabase“ im Nutzerbereich auf Klartext umstellen.
- [x] Test-Erwartungen anpassen.
- [ ] Offen, eigene Aufträge: Leer-/Fehlertexte, Fokusprüfung Menü, Ebenen-Unterscheidung, Herkunftslabel in `sourceFreshness.ts` (Schutzbereich), technische Texte in `systemHealthService.ts` und Auth-Fehlermeldung (technischer Detailbereich bzw. Admin).

## Grenzen

Nur Beschriftungen. Schutzbereiche, Feldnamen, Tab-IDs (`audit`) unverändert. Keine neue Abhängigkeit.

## Rückweg

`git revert`; keine Datenbankänderung.
