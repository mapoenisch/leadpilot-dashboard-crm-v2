# Auftrag 118 – Paket H Teil 14: Datenebenen verständlich, Entwicklerbegriffe raus

**Plan:** Abschnitt 13, Punkt „Fachliche Ebenen nicht verschweigen“. Baseline `194972a` (main nach PR #109).

## Ziel-Dateien
| Datei | Änderung |
|---|---|
| `src/components/data/DataSourceStatus.tsx` | „Synthetisch/Real“ → „Simulierte Daten/Echte Daten“; „(degraded)“ und „Fail-Closed“ aus sichtbarem Text; Fehlercode in aufklappbaren Bereich „Technische Details“ |
| `src/features/overview/pages/DataBasisPage.tsx`, `src/features/crm/components/ActivitiesView.tsx` | „CRM-Quellenwahrheit (G47)“ → „CRM-Datenbasis“; Überschrift ohne „(degraded)“ |
| `src/components/data/__tests__/DataSourceStatus.ui.vitest.tsx` | Erwartungen an neue Texte |

## Globale Grenzen
Schutzbereiche unverändert. Der Text „Eingeschränkt (degraded)“ und die Quellennamen („Supabase CRM“) stammen aus `src/services/data/sourceFreshness.ts` (Schutzbereich) und bleiben; Folgeauftrag nur mit ausdrücklichem Auftrag dafür.

## Tasks
- [x] Begriffe ersetzen, Fehlercode ins Detail verschieben
- [x] Tests anpassen, Verifikation fahren
- [x] BUILD_LOG, Plan
