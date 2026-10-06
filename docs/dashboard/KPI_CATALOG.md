# KPI-Katalog Executive Dashboard (Teilauftrag 1)

**Stand:** 02.10.2026 · **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_070_DASHBOARD_KPI_KATALOG.md` · **Basis:** `main` `d8805d9`

Dieses Dokument ist das Inventar zum maschinenlesbaren Katalog in `src/features/dashboard/model/`. Der Code enthält nur Metadaten. Die hier genannten Rohwerte prüft `src/features/dashboard/__tests__/dashboardCatalog.vitest.ts` direkt gegen die Quellmodule; weicht eine Quelle ab, schlägt der Test fehl.

## Statuswerte

| Status         | Bedeutung                                                                                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| aktiv          | Im ersten Umfang wählbar. Quelle, Zeitbasis, Einheit, Darstellungen und Fachseite sind belegt.                                                                                                                                                                                                                              |
| aufbereiten    | Fachlich geeignet, braucht aber strukturierte Werte, eine geroutete Fachseite, eine Prüfung oder eine Freigabe. Vorgemerkt für Teilauftrag 8, sofern nicht anders genannt. Im Code mit den belegten Metadaten (Einheit, Berechtigung, soweit belegt Zeitbasis und Fachseite); fehlt eine Angabe, nennt der Grund die Lücke. |
| nicht geeignet | Plan-, Ziel- oder Schätzwerte, Fließtext oder technische Register. Text- und Bildseiten sind keine Datenquelle.                                                                                                                                                                                                             |

## Regeln (maschinenprüfbar)

| Datenform                | Darstellungen                  |
| ------------------------ | ------------------------------ |
| Einzelwert, Verhältnis   | Zahl, Tabelle                  |
| Kategorien               | Tabelle, Säulen, Balken        |
| Anteile einer Gesamtheit | zusätzlich Kreis und Ring      |
| Zeitreihe                | Tabelle, Linie, Fläche, Säulen |
| Übersicht                | eigene Übersichtskachel        |

- Funnel-Stufen und Werte, die negativ sein können, nie als Kreis oder Ring.
- Mindestgröße: Zahl „Klein“, alle übrigen Darstellungen „Mittel“.
- Zeitbezug je Kachel: historische Werte bleiben auf ihrem festen Stand; CRM und Live folgen dem Dashboard. Einen eigenen Zeitraum gibt es erst, wenn eine Quelle ein fachlich belegtes Datumsfeld hat (Teilauftrag 2).
- Konfiguration Format 1: höchstens 24 Kacheln, eigene Kachel-ID, Titel bis 80 Zeichen, unbekannte Felder werden abgelehnt.

## Berechtigungen

| Ebene    | Quelle                                                     | Wer liest                                                                                                                    |
| -------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Baseline | Statische Stammdaten (Faktenblatt v1.1) in `src/domain/`   | Im App-Bundle. Sichtbar für jedes angemeldete aktive Organisationsmitglied hinter `ProtectedRoute`, organisationsunabhängig. |
| CRM      | Tabelle `imported_funnel_deals` über `getPipelineOverview` | RLS `tenant_select_deals`: nur aktive Mitglieder der aktuellen Organisation, alle Rollen einschließlich Viewer.              |
| Live     | Projektion `live_kpi_public_feed`                          | `SELECT` für `anon` und `authenticated`, **ohne Organisationsspalte**.                                                       |

**Befund Live-Feed:** Der Live-Feed ist nicht nach Mandanten getrennt. Jeder angemeldete Benutzer und sogar ein anonymer Aufruf liest dieselben Werte. Die bestehende Executive-Ansicht verhält sich bereits so; der Katalog ändert daran nichts. Plan §6 verlangt die Prüfung vor der Übernahme: Teilauftrag 2 muss entscheiden, ob Live-Kacheln so bleiben oder eine mandantengetrennte Quelle brauchen. Bis dahin sind die Live-Einträge aktiv mit diesem Hinweis.

## Aktive Einträge (43)

Erster Umfang (Auftrag 070) mit 31 Einträgen, dazu 12 aus dem Katalogausbau (Auftrag 078, Abschnitt am Ende). Die geführten Kombinationen stehen gesondert im Abschnitt „Kombinationen“.

### Baseline (10)

| ID                          | Name             | Rohwert                                                                       | Einheit                | Zeitbasis                        | Quelle                          | Fachseite      |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------- | ---------------------- | -------------------------------- | ------------------------------- | -------------- |
| `baseline.arr`              | ARR              | 411.840                                                                       | EUR                    | Stand 31.12.2025                 | `execData.EXEC_KPIS_1[0].value` | `s-highlights` |
| `baseline.umsatz`           | Umsatzerlöse     | 336.000                                                                       | EUR                    | GJ 2025                          | `EXEC_KPIS_1[1].value`          | `s-guv`        |
| `baseline.ebitda`           | EBITDA           | −309.000                                                                      | EUR                    | GJ 2025                          | `EXEC_KPIS_1[2].value`          | `s-guv`        |
| `baseline.kunden_aktiv`     | Aktive Kunden    | 66                                                                            | Kunden                 | Stand 31.12.2025                 | `EXEC_KPIS_1[3].value`          | `s-segmente`   |
| `baseline.arpa`             | ARPA             | 520                                                                           | EUR je Kunde und Monat | Stand 31.12.2025                 | `EXEC_KPIS_2[0].value`          | `s-highlights` |
| `baseline.marketing_cac`    | Marketing-CAC    | 862                                                                           | EUR je Neukunde        | GJ 2025                          | `EXEC_KPIS_2[1].value`          | `s-unit`       |
| `baseline.fully_loaded_cac` | Fully-Loaded CAC | 4.447                                                                         | EUR je Neukunde        | GJ 2025                          | `EXEC_KPIS_2[2].value`          | `s-unit`       |
| `baseline.headcount`        | Headcount        | 10                                                                            | FTE                    | Stand 31.12.2025                 | `EXEC_KPIS_2[3].value`          | `s-headcount`  |
| `baseline.arr_verlauf`      | ARR-Verlauf      | 120.000 · 145.000 · 170.000 · 207.792 · 248.472 · 294.588 · 348.840 · 411.840 | EUR                    | Quartalsende Q1 2024 bis Q4 2025 | `CHART_ARR.datasets[0].data`    | `s-highlights` |
| `baseline.mrr_paketmix`     | MRR nach Paket   | 10.045 · 19.580 · 4.695 (Summe 34.320)                                        | EUR                    | Stand 31.12.2025                 | `CHART_MRR.datasets[0].data`    | `s-pricing`    |

Definitionen und Nachrechnung:

- **ARR** = MRR × 12 = 34.320 × 12 = 411.840. Bestandswert, nie über die Zeit addieren. Als Einzelwert ohne Zeitreihe; den Verlauf liefert `baseline.arr_verlauf`.
- **Umsatz** = Abo 307.600 + Setup 23.000 + Sonstiges 5.400 = 336.000 (GuV FY 2025).
- **EBITDA** −309.000 laut GuV; negativ, daher nie Kreis oder Ring.
- **ARPA** 520 = blended MRR je Kunde über 66 Kunden (34.320 ÷ 66 = 520).
- **Marketing-CAC** = 40.500 ÷ 47 = 861,7 ≈ 862. **Fully-Loaded CAC** = 209.000 ÷ 47 = 4.446,8 ≈ 4.447.
- **MRR-Paketmix:** Summe 34.320 = Gesamt-MRR; Test prüft Summe × 12 = ARR. Die Paketbezeichnungen der Quelle enthalten Preise je Nutzer („Starter (49€)“); die Anzeige nimmt die Namen aus der Quelle.
- **ARR-Verlauf:** Q4 2024 = 207.792 und Q4 2025 = 411.840 stimmen mit den Jahres-Highlights (+98 %) überein.

### CRM (6)

Quelle `executiveCockpitData.getPipelineOverview` über die importierten CRM-Deals. Rohwerte hängen vom Datenbankstand ab; die Executive-Seite nennt „40 reale CRM-Deals“. Zeitbasis: aktueller Stand. Das Feld `closeDate` existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt, deshalb kein Zeitraumfilter. Das Feld `pipeline` existiert, daher ist ein Pipeline-Filter vorgesehen. Fachseite `s-deals`.

| ID                            | Name                                                    | Feld                                        | Einheit | Darstellungen                                      |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------- | ------- | -------------------------------------------------- |
| `crm.pipeline_deals`          | Deals in der Pipeline                                   | `totalDeals`                                | Deals   | Zahl, Tabelle                                      |
| `crm.pipeline_volumen`        | Pipeline-Volumen                                        | `totalVolume`                               | EUR     | Zahl, Tabelle                                      |
| `crm.pipeline_gewonnen`       | Gewonnenes Volumen (Fluss: Summe abgeschlossener Deals) | `wonVolume` (Stufe enthält „gewonnen“)      | EUR     | Zahl, Tabelle                                      |
| `crm.pipeline_offen`          | Offenes Volumen                                         | `openVolume` (weder gewonnen noch verloren) | EUR     | Zahl, Tabelle                                      |
| `crm.pipeline_stufen_volumen` | Pipeline-Volumen nach Stufe                             | `stages[].volume`                           | EUR     | Balken, Säulen, Tabelle; nie Kreis (Funnel-Stufen) |
| `crm.pipeline_stufen_anzahl`  | Deals nach Stufe                                        | `stages[].count`                            | Deals   | Balken, Säulen, Tabelle; nie Kreis (Funnel-Stufen) |

### Live (12)

Wertquelle `liveKpiStreamStore` (Messwert und Zeitstempel); `LIVE_KPI_DEFINITIONS` (12 IDs) liefert nur Metadaten. Zeitbasis: letzter Wert mit eigenem Zeitstempel. Beim Öffnen lädt der Store bis zu 30 Feed-Punkte der letzten 30 Minuten, danach wird der Verlauf als Sitzungshistorie fortgeschrieben (höchstens 30 Punkte); er ist keine Jahreszeitreihe, deshalb vorerst nur Zahl und Tabelle. Fachseite bis Teilauftrag 7: bestehende Executive-Ansicht (`s-exec`). Berechtigung siehe Befund oben.

| ID                                                                                                           | Einheit | Form       |
| ------------------------------------------------------------------------------------------------------------ | ------- | ---------- |
| `live.arr`, `live.mrr`                                                                                       | EUR     | Einzelwert |
| `live.pipeline_coverage`                                                                                     | x       | Verhältnis |
| `live.arr_direct`, `live.arr_partner`, `live.arr_outbound`, `live.arr_other`                                 | EUR     | Einzelwert |
| `live.pipeline_leads`, `live.pipeline_mql`, `live.pipeline_sql`, `live.pipeline_offers`, `live.pipeline_won` | Anzahl  | Einzelwert |

### Übersichten (3)

| ID                           | Quelle                                                                                | Zeitbasis                                                              | Fachseite   |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| `uebersicht.team_hr`         | `getTeamHrSnapshot` (Struktur aus `HEADCOUNT.rows`, `HR.metrics`, `TEAM.bottlenecks`) | Stand 31.12.2025                                                       | `s-team`    |
| `uebersicht.roadmap`         | `getRoadmapSnapshot` (`ROADMAP.releases`, 6 Releases)                                 | v1.2 (Feb 2025) bis v2.1 (geplant Q2 2026)                             | `s-roadmap` |
| `uebersicht.live_aktivitaet` | zentraler Live-Stream (`liveKpiStreamStore`), höchstens 10 Ereignisse                 | Feed-Punkte der letzten 30 Minuten beim Öffnen, danach fortgeschrieben | `s-exec`    |

## Inventar aller Kandidaten

### `execData.ts`

| Export                                                                                                      | Status         | Grund                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HERO`                                                                                                      | nicht geeignet | Seitentitel                                                                                                                                                                                                                                                              |
| `EXEC_KPIS_1`, `EXEC_KPIS_2`                                                                                | aktiv          | acht Executive-Zahlen, siehe oben                                                                                                                                                                                                                                        |
| `CHART_ARR`                                                                                                 | aktiv          | ARR-Verlauf                                                                                                                                                                                                                                                              |
| `CHART_MRR`                                                                                                 | aktiv          | MRR-Paketmix                                                                                                                                                                                                                                                             |
| `CHART_QUARTAL`                                                                                             | aufbereiten    | Neukunden (Anzahl) und Vertriebskosten (T€, Summe 209 = Sales & Marketing 2025) in einem Datensatz; auf keiner Fachseite verwendet. ID `baseline.quartal_neukunden_kosten` (bis Auftrag 078 `baseline.neukunden_quartal`); Neukunden je Quartal sind über `FUNNEL` aktiv |
| `CHART_TIER`                                                                                                | nicht geeignet | 36 + 27 + 21 + 15 = 99 %, keine Gesamtheit; auf keiner Seite verwendet                                                                                                                                                                                                   |
| `NOTE_EXEC`, `NOTE_PROFIL`, `NOTE_HIGHLIGHTS`, `NOTE_DATEN`, `PROFILE_ROWS`, `BRIDGES_ROWS`, `SOURCES_ROWS` | nicht geeignet | Fließtext und Stammdaten                                                                                                                                                                                                                                                 |
| `HIGHLIGHTS_GOOD_ROWS`, `HIGHLIGHTS_BAD_ROWS`                                                               | nicht geeignet | Aussagen im Text; Burn Rate 25.750 €/Monat, Runway 14 Monate und Trial-to-Paid 18 % haben keine strukturierte Istquelle                                                                                                                                                  |

### `executiveCockpitData.ts`

| Export                                    | Status      | Grund                                                               |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `getExecutiveCockpitKpis`                 | (Ableitung) | liest `EXEC_KPIS_1`; der Katalog verweist direkt auf die Stammdaten |
| `getArrTrendData`, `getMrrTierData`       | (Ableitung) | lesen `CHART_ARR` und `CHART_MRR`                                   |
| `getTeamHrSnapshot`, `getRoadmapSnapshot` | aktiv       | Übersichten                                                         |
| `getPipelineOverview`                     | aktiv       | fünf CRM-Einträge                                                   |

### `finanzenData.ts`

| Export                                         | Status              | Grund                                                                                                                                                                          |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CHART_ERLOESE`                                | aktiv (Auftrag 078) | `baseline.erloesmix`: 307.600 + 23.000 + 5.400 = 336.000 = Umsatz 2025; Fachseite `s-guv`                                                                                      |
| `BUDGET`                                       | aufbereiten         | Anteile 76 + 6 + 6 + 8 + 4 = 100 %, Beträge 645.000 = GuV-Aufwand 2025 (121 + 209 + 208 + 107 T€); Werte nur als Text, Fachseite `s-unit`                                      |
| `GUV`                                          | aufbereiten         | FY 2024, FY 2025 und Plan 2026 gemischt; Plan/Ist trennen, Werte nur als Text                                                                                                  |
| `CHART_KOSTEN`                                 | aufbereiten         | Vorzeichen uneinheitlich (Kosten positiv, EBITDA negativ)                                                                                                                      |
| `UNIT`                                         | aufbereiten         | LTV 11.893 €, LTV/CAC 2,7 (11.893 ÷ 4.447 = 2,67), CAC-Payback 13 Monate, Deckungsbeitrag 333 €, Bruttomarge 64,0 % (215 ÷ 336), NRR 101 %, GRR 88 % nur als Text mit Zusätzen |
| `BILANZ`                                       | aufbereiten         | Stichtagswerte nur als Text, z. B. Kassenbestand 363.000 €; Auswahl mit Fachfreigabe                                                                                           |
| `CHART_MRR26`, `CHART_CHURN26`, `CHART_BUDGET` | nicht geeignet      | Planwerte 2026                                                                                                                                                                 |

### `kundenData.ts`

| Export                      | Status              | Grund                                                                                                         |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `CHART_SEGMENT`             | aktiv (Auftrag 078) | `baseline.arr_nach_segment`: 178.560 + 112.320 + 78.960 + 42.000 = 411.840 = ARR; Fachseite `s-segmente`      |
| `REGIONEN`                  | aktiv (Auftrag 078) | `baseline.kunden_nach_region` aus `rows` (`region`, `kunden`): 61 + 3 + 2 = 66 Kunden; Fachseite `s-segmente` |
| `SEGMENTE`                  | aufbereiten         | Kundenzahlen 24/18/14/10 nur im Text, Prozentwerte ergeben 99 %                                               |
| `TOP10`                     | aufbereiten         | zehn Referenzkunden, ARR als Text; Fachseite `s-top10`                                                        |
| `CS`                        | aufbereiten         | NRR, GRR, Churn 2,8 %, NPS 34, Time-to-Value 11 Tage als Text; Seite Customer Success nicht geroutet          |
| `ICP`, `PERSONA`, `EMPATHY` | nicht geeignet      | qualitative Texte                                                                                             |

### `vertriebData.ts`

| Export                    | Status                                       | Grund                                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FUNNEL`                  | aufbereiten, zwei Reihen aktiv (Auftrag 078) | `baseline.leads_quartal` (Summe 1.776) und `baseline.neukunden_quartal` (Summe 47) stimmen mit der FY-Spalte; der Funnel über alle vier Reihen braucht eine Mehrreihen-Darstellung; Funnel-Stufen, nie Kreis; Fachseite `s-funnel` |
| `KANAELE.chartKanal`      | aktiv (Auftrag 078)                          | `baseline.kanal_mix`: 38 + 22 + 18 + 12 + 10 = 100 %; Fachseite `s-kanaele`                                                                                                                                                        |
| `KANAELE.chartRoi`        | aktiv (Auftrag 078)                          | `baseline.kanal_cac`: Marketing-CAC je Kanal, z. B. LinkedIn 17.712 ÷ 18 = 984 €; Verhältnis, Kategorienvergleich, nie Kreis                                                                                                       |
| `MBUDGET`                 | aufbereiten                                  | Budget und Ist je Kanal; Seite Marketingbudget nicht geroutet                                                                                                                                                                      |
| `BRAND`                   | aufbereiten                                  | drei Reichweitenreihen je Quartal; Seite Brand nicht geroutet                                                                                                                                                                      |
| `PLANUNG`, `KAMPAGNE`     | nicht geeignet                               | Plan- und Zielwerte, skalierte Einheiten; Kampagnenseite nicht geroutet                                                                                                                                                            |
| `SLA`, `CONTENT`, `TOOLS` | nicht geeignet                               | Text                                                                                                                                                                                                                               |

### `organisationData.ts`

| Export                   | Status                            | Grund                                                                                                                    |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `HEADCOUNT.chart`        | aktiv (Auftrag 078)               | `baseline.headcount_verlauf`: FTE je Quartal 4,0 bis 10,0, letzter Punkt = `baseline.headcount`; Fachseite `s-headcount` |
| `HEADCOUNT.rows`, `TEAM` | aktiv (über `uebersicht.team_hr`) |                                                                                                                          |
| `HR`                     | aufbereiten                       | Fluktuation 22 %, Personalaufwand 490.000 €, Remote 60 % nur als Text                                                    |

### `produktData.ts`

| Export                          | Status                            | Grund                                                                                                                                                                 |
| ------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHART_PRODUKT`                 | aktiv (Auftrag 078)               | `baseline.aktivierungsrate` (49 → 58 %) und `baseline.ki_scoring_nutzung` (38 → 47 %) je Quartal 2025, je eine Reihe; Quoten, nicht aufsummierbar; Fachseite `s-perf` |
| `CHART_CHURN`                   | aufbereiten                       | Kündigungsgründe 8 + 5 + 2 + 2 = 17; Zeitraum der Zählung fehlt in der Quelle (in Auftrag 078 nicht freigeschaltet)                                                   |
| `PERF`                          | aufbereiten                       | Uptime 99,7 % und weitere nur als Text                                                                                                                                |
| `ROADMAP`                       | aktiv (über `uebersicht.roadmap`) |                                                                                                                                                                       |
| `FUNKTION`, `PRICING`, `INTEGR` | nicht geeignet                    | Stammdaten und Text                                                                                                                                                   |

### `marktData.ts`

| Export                        | Status         | Grund                                                                                                                                                                |
| ----------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHART_WETTBEWERB`            | aufbereiten    | Summe 74,4 % (keine Gesamtheit, nie Kreis); LeadPilot „< 0,1 %“ als 0,1 gespeichert, also Obergrenze und kein belegter Istwert (in Auftrag 078 nicht freigeschaltet) |
| `MARKT`, `WETTBEWERB`, `SWOT` | nicht geeignet | Text; die Tabellenwerte von `WETTBEWERB` stecken in `CHART_WETTBEWERB`                                                                                               |

### `strategieData.ts`

| Export                                          | Status         | Grund                                                        |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------ |
| `CHART_OKR`                                     | nicht geeignet | Basis und Ziel in skalierten Mischeinheiten („T€/10“, „x10“) |
| `CHART_TREIBER`                                 | nicht geeignet | geschätzte ARR-Effekte                                       |
| `OKR`, `BSC`, `MASSNAHMEN`, `TREIBER`, `RISIKO` | nicht geeignet | Text                                                         |

### `unternehmenData.ts`

| Export                      | Status              | Grund                                                                                                                               |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `HISTORIE.events`           | aktiv (Auftrag 078) | `uebersicht.meilensteine`: Übersichtskachel mit 5 Ereignissen (21.07.2022 bis Dez 2025) in Quellreihenfolge; Fachseite `s-historie` |
| `IDEE`, `VALUE`, `STANDORT` | nicht geeignet      | Text; Mietkosten 39.800 € nur im Text                                                                                               |

### `rechtData.ts`

| Export                                                    | Status              | Grund                                                                                                                              |
| --------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GESELLSCHAFTER.rows`                                     | aktiv (Auftrag 078) | `baseline.gesellschafter` aus Spalte 0 und 2, Summenzeile „Gesamt“ ausgeschlossen; 40,0 + 40,0 + 12,5 + 5,0 + 2,5 = 100,0 % (Test) |
| `SATZUNG`, `HANDELSREGISTER`, `GF_VERTRAG`, `MIETVERTRAG` | nicht geeignet      | Text                                                                                                                               |

### Übrige Module

| Modul                                                                              | Status         | Grund                                                                                         |
| ---------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------- |
| `geschaeftsmodellData.ts`, `projektkontextData.ts`, `icpData.ts`, `personaData.ts` | nicht geeignet | Text                                                                                          |
| `navData.ts`, `resourceRegistry.ts`, `faceliftVisualData.ts`                       | nicht geeignet | technische Register                                                                           |
| Live-Mix (`arr_*`), Live-Funnel (`pipeline_*`)                                     | aufbereiten    | Zusammenstellung mehrerer Live-Werte braucht einen gemeinsamen bestätigten Snapshot (Plan §4) |
| Live-Verlauf (`liveKpiStreamHistory`)                                              | aufbereiten    | Sitzungshistorie ist keine vollständige Zeitreihe                                             |
| Simulation (`src/simulation/**`)                                                   | ausgeschlossen | Plan §1; nicht im Katalog, Test sichert das ab                                                |

## Hinweise für die nächsten Teilaufträge

- **Fachseiten:** Seit v2.3.2 zeigen 32 Inhaltsseiten wieder die Original-Bilder. Das Fachseitenziel bleibt die Route; Werte kommen nie aus dem Bild.
- **Nicht geroutete Seiten** (`BudgetPage`, `MarketingBudgetPage`, `BrandPage`, `CampaignPlanningPage`, `RiskRegisterPage`, `CustomerSuccessPage`): Ihre Daten bleiben „aufbereiten“, bis es ein Fachseitenziel gibt.
- **Teilauftrag 2:** Live-Mandantentrennung entscheiden; Bedeutung von `closeDate` klären, bevor ein Zeitraumfilter für CRM aktiv wird.
- **Teilauftrag 8:** Bereits strukturierte Kandidaten sind mit Auftrag 078 aktiv. Die übrigen „aufbereiten“-Einträge brauchen strukturierte Werte in den Quellen (eigener Auftrag; `src/domain/` bleibt auch in Auftrag 078 nur gelesen).

## Datenauflösung (Auftrag 071)

**Stand:** 03.10.2026 · **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_071_DASHBOARD_DATENAUFLOESUNG.md`

### Live-Geltungsbereich (Entscheidung Marc, 03.10.2026)

- Die Projektion `live_kpi_public_feed` besitzt keine Organisationsspalte und ist für `anon` und `authenticated` lesbar.
- Vorgabe bestätigt durch Marc („dann so lassen“): Live-Kacheln bleiben im ersten Umfang wählbar und werden in der Leseschicht mit `scope: 'organisationsuebergreifend'` markiert.
- Die Kachelkomponente (Teilauftrag 4) kennzeichnet diesen Umstand visuell. Eine spätere Mandantentrennung erfordert Schema- und RLS-Migrationen und kann als separater Folgeauftrag umgesetzt werden.

### Unterstützte Datumsfelder und Zeitfilter

- Für den aktuellen Katalog wirkt ein Zeitraumfilter auf **keine** der Quellen (`SUPPORTED_DATE_FIELDS = { baseline: [], crm: [], live: [] }`).
- **Baseline (Stammdaten):** Fester historischer Stand (`timeMode: 'fest'`). Keine Datumsfelder vorhanden; Begründung: _„Historischer Stand ist fest“_ bzw. _„Quelle hat kein belegtes Datumsfeld“_.
- **CRM:** `closeDate` ist in `imported_funnel_deals` zwar vorhanden, aber fachlich nicht als Zeitfilter belegt. Der Zeitraumfilter greift daher nicht und wird mit der Begründung _„Quelle hat kein belegtes Datumsfeld“_ abgewiesen.
- **Live:** Live-Stream (`timeMode: 'live'`) ohne historische Filterbarkeit; Begründung: _„Quelle ist ein Live-Feed ohne historischen Zeitraum“_.
- Der effektive Filter meldet diesen Umstand pro Kachel transparent über `periodReason`, statt den Filter stillschweigend zu ignorieren.

## Kombinationen (Auftrag 076)

Geführte Kombinationen zweier Stammdaten-Werte. Positivliste in `src/features/dashboard/model/catalog/combinationRules.ts`, Strukturprüfung und Rechnung in `model/dashboardCombinations.ts`, Katalogeinträge (`source.layer = 'kombination'`) in `model/catalog/combinationEntries.ts`. Fachliche Freigabe der Liste: Marc im Chat am 05.10.2026 (Antwort „2.“: Liste freigegeben, Auftrag sofort bauen). Kein freier Formeleditor; gleiche Einheit allein macht Kennzahlen nicht kombinierbar.

| Regel-ID                                            | Erste Kennzahl                  | Zweite Kennzahl                            | Berechnung                   | Anzeige         | Darstellungen                                  | Zeitbasis          | Begründung                                                                                                            |
| --------------------------------------------------- | ------------------------------- | ------------------------------------------ | ---------------------------- | --------------- | ---------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `kombination.ebitda_marge`                          | `baseline.ebitda`               | `baseline.umsatz`                          | Verhältnis `A ÷ B`           | Prozent (× 100) | Zahl, Tabelle                                  | Geschäftsjahr 2025 | Beide EUR, gleiches Geschäftsjahr, gleiche GuV-Quelle; EBITDA darf negativ sein (Marge dann negativ, nie Kreis/Ring). |
| `kombination.cac_aufschlag`                         | `baseline.fully_loaded_cac`     | `baseline.marketing_cac`                   | Verhältnis `A ÷ B`           | Faktor „x“      | Zahl, Tabelle                                  | Geschäftsjahr 2025 | Gleiche Einheit, gleiche Neukundenbasis (47), gleiches Geschäftsjahr.                                                 |
| `kombination.mrr_anteil_starter`, `_growth`, `_pro` | `baseline.mrr_paketmix` (Paket) | Summe `baseline.mrr_paketmix` (Gesamt-MRR) | Anteil `Teil ÷ Gesamt × 100` | Prozent         | Zahl, Tabelle, Ring (Teil und „Übrige Pakete“) | Stand 31.12.2025   | Belegte Teilmenge: Die Summe der Pakete ergibt den Gesamt-MRR (Katalogdefinition).                                    |

Werte mit den Stammdaten: EBITDA-Marge −309.000 ÷ 336.000 × 100 = −92,0 %; CAC-Aufschlag 4.447 ÷ 862 = 5,2x; MRR-Anteile Starter 29,3 %, Growth 57,1 %, Pro 13,7 % (Summe 100 %).

**Gesperrt (mit erklärtem Grund, getestet in `dashboardCombinations.vitest.ts`):**

- Umsatz (Geschäftsjahr) mit ARR oder Headcount (Stand): unterschiedliche Zeitbasis.
- Jede Paarung aus Stammdaten und Live: Historie und Live werden nicht verrechnet.
- Live-Funnel-Bestände (Leads, MQL, SQL, Angebote) als „Conversion“: keine gemeinsame Kohorte im gleichen Zeitraum belegt.
- Zwei Live-Werte: kein gemeinsamer Messzeitpunkt belegt.
- Stammdaten mit CRM: unterschiedliche Stände.
- Eine Kennzahl mit sich selbst; jede Paarung außerhalb der Liste („nicht freigegeben“, neue Regeln werden gezielt ergänzt).

Nicht berechenbar (Zustand `nicht_berechenbar`, Badge „Nicht berechenbar“, Grund statt Wert): fehlender Operand, Nenner 0, nicht positive Gesamtheit oder Teil außerhalb der Gesamtheit beim Anteil, unterschiedliche Zeitbasis, nicht endliches Ergebnis. ARPA und andere bereits berechnete Katalogwerte werden nicht doppelt als Kombination angeboten.

## Katalogausbau (Auftrag 078)

**Stand:** 06.10.2026 · **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_078_DASHBOARD_KATALOGAUSBAU.md` · **Basis:** `main` `90e530d`

Freigeschaltet wurden nur Kandidaten, die in `src/domain/` bereits als strukturierte Zahlen vorliegen. Werte kommen über denselben Datenweg wie jede Stammdaten-Kachel (`resolveBaseline` mit den Lesern in `data/baselineSources.ts`); `src/domain/` wurde nicht geändert. Die Summen- und Konsistenzprüfungen stehen in `src/features/dashboard/__tests__/dashboardCatalogExtended.vitest.ts`.

| ID                            | Name                     | Rohwert                                                  | Einheit         | Datenform               | Zeitbasis                          | Fachseite          |
| ----------------------------- | ------------------------ | -------------------------------------------------------- | --------------- | ----------------------- | ---------------------------------- | ------------------ |
| `baseline.erloesmix`          | Erlösmix 2025            | 307.600 · 23.000 · 5.400 (Summe 336.000 = Umsatz)        | EUR             | Anteile                 | GJ 2025                            | `s-guv`            |
| `baseline.arr_nach_segment`   | ARR nach Segment         | 178.560 · 112.320 · 78.960 · 42.000 (Summe = ARR)        | EUR             | Anteile                 | Stand 31.12.2025                   | `s-segmente`       |
| `baseline.kunden_nach_region` | Kunden nach Region       | 61 · 3 · 2 (Summe 66 = aktive Kunden)                    | Kunden          | Anteile                 | Stand 31.12.2025                   | `s-segmente`       |
| `baseline.kanal_mix`          | Neukunden nach Kanal     | 38 · 22 · 18 · 12 · 10 (100 %)                           | %               | Anteile                 | GJ 2025                            | `s-kanaele`        |
| `baseline.kanal_cac`          | Marketing-CAC nach Kanal | 492 · 656 · 820 · 984 · 1.476                            | EUR je Neukunde | Kategorien (Verhältnis) | GJ 2025                            | `s-kanaele`        |
| `baseline.leads_quartal`      | Leads je Quartal         | 384 · 432 · 456 · 504 (Summe 1.776)                      | Leads           | Zeitreihe (Fluss)       | Quartale 2025                      | `s-funnel`         |
| `baseline.neukunden_quartal`  | Neukunden je Quartal     | 10 · 11 · 12 · 14 (Summe 47)                             | Neukunden       | Zeitreihe (Fluss)       | Quartale 2025                      | `s-funnel`         |
| `baseline.headcount_verlauf`  | Headcount-Verlauf        | 4,0 · 5,0 · 6,0 · 8,0 · 8,5 · 9,0 · 9,5 · 10,0           | FTE             | Zeitreihe (Bestand)     | Quartalsende Q1 2024 bis Q4 2025   | `s-headcount`      |
| `baseline.aktivierungsrate`   | Aktivierungsrate         | 49 · 53 · 56 · 58                                        | %               | Zeitreihe (Quote)       | Quartale 2025                      | `s-perf`           |
| `baseline.ki_scoring_nutzung` | Nutzung KI-Scoring       | 38 · 41 · 44 · 47                                        | %               | Zeitreihe (Quote)       | Quartale 2025                      | `s-perf`           |
| `baseline.gesellschafter`     | Gesellschafter           | 40,0 · 40,0 · 12,5 · 5,0 · 2,5 (100 %, ohne Summenzeile) | %               | Anteile                 | Stand nach Kapitalerhöhung Q1 2024 | `s-gesellschafter` |
| `uebersicht.meilensteine`     | Meilensteine             | 5 Ereignisse                                             | Ereignisse      | Übersicht               | 21.07.2022 bis Dez 2025            | `s-historie`       |

**Leseregeln:** Datensatzpfade dürfen ein Präfix haben (`chart.datasets[0].data`). Zeilentabellen nennen Beschriftungs- und Wertfeld (`source.table`) und schließen Summenzeilen ausdrücklich aus. Prozentstrings („40,0 %“) werden wie die übrigen formatierten Zahlen gelesen. Weicht eine Quelle ab (ungleiche Längen, fehlende Beschriftung, keine endliche Zahl, unbekanntes Modul), zeigt die Kachel „Fehler“ mit Grund, nie 0.

**Kombinationen:** Reihen (Zeitreihe, Anteile, Kategorien) sind keine Kombinationspartner. Der Konfigurator zeigt sie deshalb auch nicht mehr als „gesperrt“ an; das betraf vorher schon den ARR-Verlauf bei den Umsatzerlösen.

**Bewusst nicht freigeschaltet:**

| ID                                                                                                                                                                                                     | Grund und nötige Aufbereitung                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseline.funnel_2025`                                                                                                                                                                                 | Vier Reihen in einer Quelle; Leads und Neukunden sind einzeln aktiv. Der Gesamtfunnel braucht eine Mehrreihen-Darstellung.                   |
| `baseline.kuendigungsgruende`                                                                                                                                                                          | Zeitraum der Zählung fehlt in der Quelle.                                                                                                    |
| `baseline.marktanteile`                                                                                                                                                                                | LeadPilot-Wert ist eine Obergrenze, kein Istwert.                                                                                            |
| `baseline.kostenstruktur`, `baseline.guv`, `baseline.unit_economics`, `baseline.bilanz`, `baseline.kunden_nach_branche`, `baseline.top_kunden`, `baseline.hr_kennzahlen`, `baseline.produkt_qualitaet` | Werte nur als Text; strukturierte Werte in den Quellmodulen brauchen einen eigenen Auftrag. Bei `GUV` zusätzlich Plan- und Istwerte trennen. |
| `baseline.kosten_vergleich`                                                                                                                                                                            | Vorzeichen uneinheitlich; vorher normalisieren.                                                                                              |
| `baseline.quartal_neukunden_kosten`                                                                                                                                                                    | Zwei Einheiten in einem Datensatz, keine Fachseite.                                                                                          |
| `baseline.customer_success`, `baseline.marketing_budget`, `baseline.reichweite`                                                                                                                        | Fachseite nicht geroutet.                                                                                                                    |
| `live.arr_mix`, `live.funnel`, `live.verlauf`                                                                                                                                                          | Kein gemeinsamer bestätigter Snapshot bzw. keine vollständige Zeitreihe (Plan §4).                                                           |
| Strategie (`CHART_OKR`, `CHART_TREIBER`) und Planwerte 2026                                                                                                                                            | Plan-, Ziel- oder Schätzwerte; werden nicht als Istwerte angeboten.                                                                          |
