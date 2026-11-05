# LeadPilot – Paket 5: Interaktiver „What-If“-Hebelrechner (Finanzen & Vertrieb)

> **Kontext:** Teil 5 des Master-Plans `2026-11-05-crm-analytics-master-plan.md`.  
> **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_133_WHAT_IF_HEBELRECHNER.md`  
> **Branch:** `claude/auftrag-133-what-if-hebelrechner`  
> **Ziel-Routen:** `/finance/unit-economics`, `/finance/pnl` (sowie als optionale Dashboard-Kachel)

---

## 1. Motivation & Ausgangslage

Für strategische Management- und Investorenentscheidungen ist die Beantwortung von Kernfragen essenziell:
- *„Was passiert mit unserem ARR in 12 Monaten, wenn wir den Churn von 2,8 % auf 1,8 % senken?“*
- *„Lohnt es sich, 20.000 € mehr in Marketing zu investieren, wenn der Sales Cycle gleichzeitig um 5 Tage sinkt?“*
- *„Welcher Hebel hat den größten Einfluss auf unseren Break-Even?“*

Die bestehende Simulations-Engine auf `/crm/live-simulation` benötigt hierfür einen sequentiellen 50-Tick-Lauf. Paket 5 stellt einen leichtgewichtigen, sofort reagierenden Sensitivitäts-Rechner bereit, der Schieberegler in Echtzeit mit den mathematischen Formeln des Finanzmodells verrechnet.

> **Wichtiger Hinweis zum Schutzbereich:**  
> Die Berechnungslogik läuft vollständig im Feature-Modul `src/features/finanzen/services/whatIfModel.ts`.  
> Der geschützte Bereich `src/simulation/**` bleibt zu **100 % unberührt (Diff = 0)**.

---

## 2. Fachliche & Technische Spezifikation

### 2.1 Das mathematische Modell (`whatIfModel.ts`)
Das Modell basiert auf den verbindlichen Faktenblatt- und Finanzformeln:
- **Baseline-Werte:**
  - Ausgangs-ARR: 411.840 €
  - Kundenbestand: 66 Kunden
  - ACV (Ø Auftragswert): 6.240 €/Jahr
  - Monatlicher Churn: 2,8 %
  - Sales Cycle: 38 Tage
  - Marketing-Budget: 65.000 €/Jahr
  - Lead-to-Deal Konversionsrate: 12 %

- **Die 4 interaktiven Stellhebel:**
  1. **Churn-Rate:** Baseline 2,8 % · Reglerbereich: 1,0 % bis 4,5 % (Schrittweite: 0,1 %)
  2. **Sales Cycle (Tage):** Baseline 38 Tage · Reglerbereich: 20 bis 60 Tage (Schrittweite: 1 Tag)
  3. **Marketing-Budget:** Baseline 65.000 € · Reglerbereich: 30.000 € bis 150.000 € (Schrittweite: 5.000 €)
  4. **Win-Rate (Konversion):** Baseline 12,0 % · Reglerbereich: 6 % bis 24 % (Schrittweite: 0,5 %)

- **Ausgabewerte (Projektion 12 Monate):**
  - **Ziel-ARR:** Neuer ARR nach 12 Monaten inklusive absolutem und prozentualem Delta (`+128.400 € / +31,2 %`)
  - **Net New ARR:** Aufgeschlüsselt in Neu-ARR minus Churn-Verlust
  - **Neukunden-Zuwachs:** Erwartete Kundenanzahl in 12 Monaten
  - **CAC-Payback:** Amortisationszeit der Kundenakquisitionskosten in Monaten

### 2.2 Schnell-Szenarien (Presets)
Buttons für Sofort-Konfigurationen:
- 🚀 **„Wachstums-Offensive“:** Marketing-Budget +40.000 €, Win-Rate +3 %, Churn 2,8 %
- 🛡️ **„Effizienz & Retention“:** Churn 1,5 %, Sales Cycle 28 Tage, Budget unverändert
- 🌧️ **„Stresstest / Marktkrise“:** Churn 3,8 %, Sales Cycle 50 Tage, Win-Rate 8 %
- ↩️ **„Zurück auf Baseline“:** Setzt alle Hebel auf die Ausgangswerte zurück

### 2.3 Visualisierung (`WhatIfCockpit.tsx`)
- **Tornado-Diagramm (Sensitivitäts-Analyse):**
  - Zeigt horizontal an, welcher Hebel den stärksten Hebeleffekt auf den ARR ausübt (Churn vs. Budget vs. Cycle vs. Win-Rate).
- **12-Monats-Verlaufskurve:**
  - Recharts-Liniendiagramm: Baseline-Kurve (gestrichelt) vs. What-If-Kurve (durchgezogen, grün leuchtend).
- **Ergebnis-Kacheln:**
  - 4 kompakte KPI-Blöcke mit Vorher/Nachher-Zahlen und farblichen Differenz-Pills.

---

## 3. Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/finanzen/services/whatIfModel.ts` | Neu | Deterministische Finanz- und Hebelmathematik |
| `src/features/finanzen/components/WhatIfCockpit.tsx` | Neu | Hauptkomponente mit Schiebereglern und Presets |
| `src/features/finanzen/components/WhatIfTornadoChart.tsx` | Neu | Sensitivitätsdiagramm der Hebelwirkungen |
| `src/features/finanzen/components/WhatIfProjectionChart.tsx` | Neu | 12-Monats-Vergleichs-Chart Baseline vs. Projektion |
| `src/features/finanzen/pages/UnitEconomicsPage.tsx` | Änderung | Einbindung des Cockpits als interaktiver Analyseabschnitt |
| `src/features/finanzen/__tests__/whatIfModel.unit.vitest.ts` | Neu | Mathematische Verifikation aller Hebelformeln |
| `src/features/finanzen/__tests__/WhatIfCockpit.ui.vitest.tsx` | Neu | UI-Tests für Schieberegler, Presets und Diagramme |
| `scripts/captureAuftrag133Gate.mjs` | Neu | Screenshot-Gate-Harness |
| `docs/screenshots/auftrag-133/README.md` | Neu | Ergebnis-Matrix |
| `docs/BUILD_LOG.md` | Änderung | Nachweis aller Gates |

---

## 4. Definition of Done & Verifikation

- [ ] Schieberegler berechnen ARR, Kundenanzahl und CAC-Payback verzögerungsfrei in Echtzeit.
- [ ] Presets (Wachstum, Retention, Stresstest) schalten alle 4 Hebel konsistent um.
- [ ] Tornado-Diagramm visualisiert die Hebelstärken korrekt und barrierefrei.
- [ ] `src/simulation/**` und alle Schutzbereiche bleiben zu 100 % unverändert.
- [ ] Alle Tests, `tsc`, `lint`, `verify` und `build` grün.
