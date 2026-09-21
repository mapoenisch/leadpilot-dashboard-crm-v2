# AUFTRAG 067O / Gate G61 — Datenquellen-, Frische- und Degraded-Anzeigen

**Baseline:** `3d44ef8` (G60 in `feat/auftrag-067n-crm-query-export` freigegeben)
**Branch:** `feat/auftrag-067o-source-freshness` (von `3d44ef8` abgezweigt)
**Status:** BEREIT ZUR PRÜFUNG

Teilauftrag 067O des Master-Auftrags 067
(`ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md`). Er konkretisiert
Task 15 des Master-Implementierungsplans (`docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md`)
und Abschnitt 13.3 der Produktionsreife-Spezifikation (`docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`).

## Maßgebliche Dokumente (Lesereihenfolge)

1. `CLAUDE.md`
2. `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md` — Abschnitt „067O / G61“
3. `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md` — Abschnitte 6, 13.3, 14
4. `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md` — Task 15
5. `docs/BUILD_LOG.md` — letzter G60-Freigabeeintrag

## Ziel

Die datenführenden Kernseiten (**Executive Dashboard**, **Datenbasis**, **CRM-Ansicht** und **Live-Simulation**)
erhalten eine transparente, barrierefreie Anzeige von Datenquelle, Modus (real vs. synthetisch), letztem
erfolgreichen Abruf, Datenalter und Gesundheitsstatus.

Zustände wie `degraded` oder `unavailable` dürfen textlich und visuell keinesfalls wie ein erfolgreicher
Live-Zustand wirken. Die Vermittlung von Statusinformationen darf niemals ausschließlich über Farbwerte
erfolgen (WCAG 2.1 AA).

## Fachliche und Barrierefreiheits-Regeln

| Regel | Verbindliches Verhalten |
|---|---|
| **Frische-Klassifikation** | `fresh`: $\le$ 15 Minuten alt. `stale`: > 15 Minuten und $\le$ 24 Stunden alt. `expired`: > 24 Stunden alt oder ungültiger Zeitstempel. |
| **Keine reine Farbcodierung** | Statusinformationen werden immer von semantischen Icons und eindeutigen Textbezeichnungen begleitet (`aria-label`, Text-Labels). |
| **Degraded & Unavailable** | `degraded` kennzeichnet vorhandene Daten mit Warnungen/Integritätsmeldungen. `unavailable` kennzeichnet vollständige Unerreichbarkeit. Keinesfalls grüne Punkte, Erfolgs-Animationen oder unkritische „Live“-Indikatoren. |
| **Konsistente Provenienz** | Quelle (`supabase`, `hubspot`, `synthetic`), Modus (`real` vs. `synthetisch`), Abrufzeit (`fetchedAt`) und Alter werden zentral aus `CrmReadModelEnvelope` abgeleitet. |
| **Schutzbereiche** | Ausschließlich `src/services/data/**` ist für Änderungen freigegeben. `src/simulation/**`, `src/types/**`, `src/context/**`, `src/features/resources/**`, `src/services/db/crmRepository.ts`, `src/auth/**` und `src/features/auth/**` verbleiben strikt bei 0 Diff. |

## Vorgesehene Architektur

1. **`src/services/data/sourceFreshness.ts`**:
   Kanonische Hilfsfunktionen zur Frischeklassifikation (`classifyFreshness`), Formatierung des Alters (`formatDataAge`), Aufbereitung von Quellenlabels (`formatSourceLabel`) und Ableitung des Provenienz-Zustands (`deriveProvenanceState`).
2. **`src/components/data/DataSourceStatus.tsx`**:
   Wiederverwendbare, zugängliche UI-Komponente mit den Varianten `compact` (Header-Badges) und `banner` (ausführlicher Meldekasten).
3. **Integration in Kernseiten**:
   - `ExecutiveDashboardPage.tsx`: Integriert in Page-Header / Live-Performance-Bereich.
   - `DataBasisPage.tsx`: Umstellung von Ad-hoc-Formatierung auf zentrale Helfer und `DataSourceStatus`.
   - `CRMView.tsx`: Übergeordnete Provenienz- und Frische-Kopfzeile für CRM-Seiten.
   - `LiveDashboardView.tsx`: Frische- und Quellenanzeige in der Simulationsleiste.

## Zieldateien

| Art | Dateien |
|---|---|
| Create | `docs/auftraege/ANTIGRAVITY_AUFTRAG_067O_QUELLE_FRISCHE.md`, `src/services/data/sourceFreshness.ts`, `src/services/data/__tests__/sourceFreshness.vitest.ts`, `src/components/data/DataSourceStatus.tsx`, `src/components/data/__tests__/DataSourceStatus.ui.vitest.tsx`, `src/features/overview/pages/__tests__/ExecutiveDashboardPage.ui.vitest.tsx`, `src/features/crm/__tests__/CRMView.ui.vitest.tsx`, `docs/screenshots/auftrag-067o-g61/README.md` |
| Modify | `src/services/data/index.ts`, `src/features/overview/pages/ExecutiveDashboardPage.tsx`, `src/features/overview/pages/DataBasisPage.tsx`, `src/features/crm/CRMView.tsx`, `src/features/simulation/LiveDashboardView.tsx`, `docs/BUILD_LOG.md` |

## Tasks

- [x] **Step 1 — Rote Grenzwert- und Zustandstests:**
  Unit-Tests in `sourceFreshness.vitest.ts` für Frische-Grenzwerte (`fresh`, `stale`, `expired`), ungültige/zukünftige Zeitstempel und Statusableitungen.
- [x] **Step 2 — Implementierung `sourceFreshness.ts`:**
  Kanonische Logik schreiben, Tests auf grün bringen.
- [x] **Step 3 — Komponente `DataSourceStatus.tsx` & UI-Tests:**
  Barrierefreie Statuskomponente erstellen, Tests für Farb-Unabhängigkeit und Textauszeichnung in `DataSourceStatus.ui.vitest.tsx`.
- [x] **Step 4 — Integration der 4 Kernseiten:**
  `ExecutiveDashboardPage`, `DataBasisPage`, `CRMView` und `LiveDashboardView` anbinden.
- [x] **Step 5 — Vollständige Verifikation & Schutzbereichs-Check:**
  `tsc`, `lint`, `format:check`, `verify`, `test`, `build`, Schutzbereichs-Diff prüfen.
- [x] **Step 6 — BUILD_LOG-Eintrag & Übergabe:**
  Dokumentation in `docs/BUILD_LOG.md`.
