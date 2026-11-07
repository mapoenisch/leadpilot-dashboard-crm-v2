# Auftrag 133 – Interaktiver „What-If“-Hebelrechner (Finanzen & Vertrieb)

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `1592fcd` (`main` nach PR #142) · **Branch:** `claude/auftrag-133-what-if-hebelrechner`

## Anlass & Motivation

Im Rahmen der Plattform-Evolution (Paket 5 von 5 auf dem Weg zum Major-Release v3.0.0, spezifiziert in `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md` und `docs/superpowers/plans/2026-11-05-paket-5-what-if-hebelrechner-plan.md`) wird das Finanz- und Vertriebs-Reporting um einen interaktiven Sensitivitäts- und Hebelrechner erweitert.

Für strategische Management- und Investorenentscheidungen müssen Kernfragen in Echtzeit quantifiziert werden:
- *„Was passiert mit unserem ARR in 12 Monaten, wenn wir den monatlichen Churn von 2,8 % auf 1,8 % senken?“*
- *„Lohnt sich eine Budgeterhöhung im Marketing um 35.000 €, wenn die Win-Rate gleichzeitig von 12 % auf 15 % steigt?“*
- *„Welcher Hebel (Churn, Sales Cycle, Marketing oder Win-Rate) hat die stärkste Hebelwirkung auf unsere Unit Economics?“*

Die bisherige Simulations-Engine unter `/crm/live-simulation` benötigt für Szenarien einen sequentiellen 50-Tick-Lauf. Auftrag 133 stellt ein leichtgewichtiges, verzögerungsfreies Sensitivitäts-Cockpit unter `/finance/unit-economics` bereit, das Eingaben über Schieberegler in Echtzeit mit den mathematischen Formeln des Finanzmodells verrechnet.

> **Wichtiger Schutzbereichs-Hinweis:**
> Sämtliche Berechnungen laufen isoliert im Feature-Modul `src/features/finanzen/services/whatIfModel.ts`.
> Der Schutzbereich `src/simulation/**` bleibt zu **100 % unberührt (Diff = 0)**.

---

## Ziel & Spezifikation

1. **Mathematisches Modell (`src/features/finanzen/services/whatIfModel.ts`):**
   - Deterministische Formeln basierend auf Faktenblatt und Finanzkennzahlen:
     - Baseline-Werte: ARR 411.840 €, 66 Kunden, ACV 6.240 €/Jahr (520 €/Monat), Churn 2,8 % mtl., Sales Cycle 38 Tage, Marketing-Budget 65.000 €/Jahr, Win-Rate 12,0 %.
     - 4 Stellhebel mit klar definierten Grenzen:
       - **Churn-Rate:** 1,0 % bis 4,5 % (Schrittweite 0,1 %, Baseline 2,8 %)
       - **Sales Cycle:** 20 bis 60 Tage (Schrittweite 1 Tag, Baseline 38 Tage)
       - **Marketing-Budget:** 30.000 € bis 150.000 € (Schrittweite 5.000 €, Baseline 65.000 €)
       - **Win-Rate:** 6,0 % bis 24,0 % (Schrittweite 0,5 %, Baseline 12,0 %)
     - Berechnung von:
       - 12-Monats-Projektionskurve (Baseline vs. What-If je Monat M1 bis M12)
       - Ziel-ARR nach 12 Monaten inkl. absolutem und prozentualem Delta
       - Net New ARR (Neu-ARR abzüglich Churn)
       - Neukunden-Zuwachs und Gesamt-Kundenbestand nach 12 Monaten
       - CAC-Payback-Dauer in Monaten
       - Tornado-Sensitivitätsanalyse (normalisierter relativer Einfluss jedes Hebels bei $\pm 20$ % Abweichung auf das ARR-Delta)

2. **Schnell-Szenarien / Presets:**
   - 🚀 **„Wachstums-Offensive“:** Marketing-Budget 105.000 € (+40.000 €), Win-Rate 15,0 % (+3 %), Churn 2,8 %
   - 🛡️ **„Effizienz & Retention“:** Churn 1,5 %, Sales Cycle 28 Tage, Budget 65.000 €
   - 🌧️ **„Stresstest / Marktkrise“:** Churn 3,8 %, Sales Cycle 50 Tage, Win-Rate 8,0 %
   - ↩️ **„Zurück auf Baseline“:** Setzt alle 4 Hebel exakt auf die Ausgangswerte zurück

3. **Interaktive UI-Komponenten:**
   - `WhatIfCockpit.tsx`: Hauptcontainer mit Schiebereglern, Kennzahlenkarten, Preset-Buttons und Reset.
   - `WhatIfTornadoChart.tsx`: Sensitivitätsdiagramm mit horizontalen Balken, barrierefreier Beschriftung und Screenreader-Tabelle.
   - `WhatIfProjectionChart.tsx`: 12-Monats-Liniendiagramm (Baseline gestrichelt vs. What-If-Projektion) mit Recharts.
   - Einbindung in `UnitEconomicsPage.tsx` als eigenständiger interaktiver Analyse-Abschnitt unterhalb der statischen Basiskennzahlen.

4. **Qualität, Budgets & Schutzbereiche:**
   - Alle Dateien strikt $\le 400$ Zeilen.
   - Keine neuen Abhängigkeiten (ausschließlich Recharts, Lucide und existierende UI-Primitives).
   - Schutzbereichs-Diff zu `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` exakt 0.
   - Alle Gates grün: TypeScript 0 Fehler, ESLint 0 Fehler, Prettier, Quality Budget 100 %, Tests grün, Screenshot-Harness 18/18 Diffs mit 0 px Überlauf, Build erfolgreich.

---

## Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/finanzen/services/whatIfModel.ts` | Neu | Deterministische Hebelmathematik, 12-Monats-Projektion, Sensitivität |
| `src/features/finanzen/components/WhatIfCockpit.tsx` | Neu | Hauptcontainer mit Schiebereglern, Presets und Ergebnis-Cards |
| `src/features/finanzen/components/WhatIfTornadoChart.tsx` | Neu | Horizontales Tornado-Sensitivitätsdiagramm mit Wertetabelle |
| `src/features/finanzen/components/WhatIfProjectionChart.tsx` | Neu | 12-Monats-Vergleichskurve (Baseline vs. Projektion) |
| `src/features/finanzen/pages/UnitEconomicsPage.tsx` | Änderung | Einbindung des Cockpits in die Unit-Economics-Seite |
| `src/features/finanzen/services/__tests__/whatIfModel.unit.vitest.ts` | Neu | Mathematische Unit-Tests für alle Formeln und Presets |
| `src/features/finanzen/components/__tests__/WhatIfCockpit.ui.vitest.tsx` | Neu | UI- und Interaktionstests für Schieberegler, Presets und Charts |
| `scripts/captureAuftrag133Gate.mjs` | Neu | Screenshot-Gate-Harness für Unit Economics & Cockpit |
| `docs/screenshots/auftrag-133/README.md` | Neu | Screenshot-Ergebnis-Matrix |
| `docs/BUILD_LOG.md`, dieser Auftrag | Doku | Nachweis aller Gates |
