# KPI-Katalog Executive Dashboard (Teilauftrag 1)

**Stand:** 02.10.2026 · **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_070_DASHBOARD_KPI_KATALOG.md` · **Basis:** `main` `d8805d9`

Dieses Dokument ist das Inventar zum maschinenlesbaren Katalog in `src/features/dashboard/model/`. Der Code enthält nur Metadaten. Die hier genannten Rohwerte prüft `src/features/dashboard/__tests__/dashboardCatalog.vitest.ts` direkt gegen die Quellmodule; weicht eine Quelle ab, schlägt der Test fehl.

## Statuswerte

| Status | Bedeutung |
|---|---|
| aktiv | Im ersten Umfang wählbar. Quelle, Zeitbasis, Einheit, Darstellungen und Fachseite sind belegt. |
| aufbereiten | Fachlich geeignet, braucht aber strukturierte Werte, eine geroutete Fachseite, eine Prüfung oder eine Freigabe. Vorgemerkt für Teilauftrag 8, sofern nicht anders genannt. |
| nicht geeignet | Plan-, Ziel- oder Schätzwerte, Fließtext oder technische Register. Text- und Bildseiten sind keine Datenquelle. |

## Regeln (maschinenprüfbar)

| Datenform | Darstellungen |
|---|---|
| Einzelwert, Verhältnis | Zahl, Tabelle |
| Kategorien | Tabelle, Säulen, Balken |
| Anteile einer Gesamtheit | zusätzlich Kreis und Ring |
| Zeitreihe | Tabelle, Linie, Fläche, Säulen |
| Übersicht | eigene Übersichtskachel |

- Funnel-Stufen und Werte, die negativ sein können, nie als Kreis oder Ring.
- Mindestgröße: Zahl „Klein“, alle übrigen Darstellungen „Mittel“.
- Zeitbezug je Kachel: historische Werte bleiben auf ihrem festen Stand; CRM und Live folgen dem Dashboard. Einen eigenen Zeitraum gibt es erst, wenn eine Quelle ein fachlich belegtes Datumsfeld hat (Teilauftrag 2).
- Konfiguration Format 1: höchstens 24 Kacheln, eigene Kachel-ID, Titel bis 80 Zeichen, unbekannte Felder werden abgelehnt.

## Berechtigungen

| Ebene | Quelle | Wer liest |
|---|---|---|
| Baseline | Statische Stammdaten (Faktenblatt v1.1) in `src/domain/` | Im App-Bundle. Sichtbar für jedes angemeldete aktive Organisationsmitglied hinter `ProtectedRoute`, organisationsunabhängig. |
| CRM | Tabelle `imported_funnel_deals` über `getPipelineOverview` | RLS `tenant_select_deals`: nur aktive Mitglieder der aktuellen Organisation, alle Rollen einschließlich Viewer. |
| Live | Projektion `live_kpi_public_feed` | `SELECT` für `anon` und `authenticated`, **ohne Organisationsspalte**. |

**Befund Live-Feed:** Der Live-Feed ist nicht nach Mandanten getrennt. Jeder angemeldete Benutzer und sogar ein anonymer Aufruf liest dieselben Werte. Die bestehende Executive-Ansicht verhält sich bereits so; der Katalog ändert daran nichts. Plan §6 verlangt die Prüfung vor der Übernahme: Teilauftrag 2 muss entscheiden, ob Live-Kacheln so bleiben oder eine mandantengetrennte Quelle brauchen. Bis dahin sind die Live-Einträge aktiv mit diesem Hinweis.

## Aktive Einträge (30)

### Baseline (10)

| ID | Name | Rohwert | Einheit | Zeitbasis | Quelle | Fachseite |
|---|---|---|---|---|---|---|
| `baseline.arr` | ARR | 411.840 | EUR | Stand 31.12.2025 | `execData.EXEC_KPIS_1[0].value` | `s-highlights` |
| `baseline.umsatz` | Umsatzerlöse | 336.000 | EUR | GJ 2025 | `EXEC_KPIS_1[1].value` | `s-guv` |
| `baseline.ebitda` | EBITDA | −309.000 | EUR | GJ 2025 | `EXEC_KPIS_1[2].value` | `s-guv` |
| `baseline.kunden_aktiv` | Aktive Kunden | 66 | Kunden | Stand 31.12.2025 | `EXEC_KPIS_1[3].value` | `s-segmente` |
| `baseline.arpa` | ARPA | 520 | EUR je Kunde und Monat | Stand 31.12.2025 | `EXEC_KPIS_2[0].value` | `s-highlights` |
| `baseline.marketing_cac` | Marketing-CAC | 862 | EUR je Neukunde | GJ 2025 | `EXEC_KPIS_2[1].value` | `s-unit` |
| `baseline.fully_loaded_cac` | Fully-Loaded CAC | 4.447 | EUR je Neukunde | GJ 2025 | `EXEC_KPIS_2[2].value` | `s-unit` |
| `baseline.headcount` | Headcount | 10 | FTE | Stand 31.12.2025 | `EXEC_KPIS_2[3].value` | `s-headcount` |
| `baseline.arr_verlauf` | ARR-Verlauf | 120.000 · 145.000 · 170.000 · 207.792 · 248.472 · 294.588 · 348.840 · 411.840 | EUR | Quartalsende Q1 2024 bis Q4 2025 | `CHART_ARR.datasets[0].data` | `s-highlights` |
| `baseline.mrr_paketmix` | MRR nach Paket | 10.045 · 19.580 · 4.695 (Summe 34.320) | EUR | Stand 31.12.2025 | `CHART_MRR.datasets[0].data` | `s-pricing` |

Definitionen und Nachrechnung:

- **ARR** = MRR × 12 = 34.320 × 12 = 411.840. Bestandswert, nie über die Zeit addieren. Als Einzelwert ohne Zeitreihe; den Verlauf liefert `baseline.arr_verlauf`.
- **Umsatz** = Abo 307.600 + Setup 23.000 + Sonstiges 5.400 = 336.000 (GuV FY 2025).
- **EBITDA** −309.000 laut GuV; negativ, daher nie Kreis oder Ring.
- **ARPA** 520 = blended MRR je Kunde über 66 Kunden (34.320 ÷ 66 = 520).
- **Marketing-CAC** = 40.500 ÷ 47 = 861,7 ≈ 862. **Fully-Loaded CAC** = 209.000 ÷ 47 = 4.446,8 ≈ 4.447.
- **MRR-Paketmix:** Summe 34.320 = Gesamt-MRR; Test prüft Summe × 12 = ARR. Die Paketbezeichnungen der Quelle enthalten Preise je Nutzer („Starter (49€)“); die Anzeige nimmt die Namen aus der Quelle.
- **ARR-Verlauf:** Q4 2024 = 207.792 und Q4 2025 = 411.840 stimmen mit den Jahres-Highlights (+98 %) überein.

### CRM (5)

Quelle `executiveCockpitData.getPipelineOverview` über die importierten CRM-Deals. Rohwerte hängen vom Datenbankstand ab; die Executive-Seite nennt „40 reale CRM-Deals“. Zeitbasis: aktueller Stand. Das Feld `closeDate` existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt, deshalb kein Zeitraumfilter. Das Feld `pipeline` existiert, daher ist ein Pipeline-Filter vorgesehen. Fachseite `s-deals`.

| ID | Name | Feld | Einheit | Darstellungen |
|---|---|---|---|---|
| `crm.pipeline_deals` | Deals in der Pipeline | `totalDeals` | Deals | Zahl, Tabelle |
| `crm.pipeline_volumen` | Pipeline-Volumen | `totalVolume` | EUR | Zahl, Tabelle |
| `crm.pipeline_gewonnen` | Gewonnenes Volumen | `wonVolume` (Stufe enthält „gewonnen“) | EUR | Zahl, Tabelle |
| `crm.pipeline_offen` | Offenes Volumen | `openVolume` (weder gewonnen noch verloren) | EUR | Zahl, Tabelle |
| `crm.pipeline_stufen` | Pipeline nach Stufe | `stages` | EUR | Balken, Säulen, Tabelle; nie Kreis (Funnel-Stufen) |

### Live (12)

Wertquelle `liveKpiStreamStore` (Messwert und Zeitstempel); `LIVE_KPI_DEFINITIONS` (12 IDs) liefert nur Metadaten. Zeitbasis: letzter Wert mit eigenem Zeitstempel. Beim Öffnen lädt der Store bis zu 30 Feed-Punkte der letzten 30 Minuten, danach wird der Verlauf als Sitzungshistorie fortgeschrieben (höchstens 30 Punkte); er ist keine Jahreszeitreihe, deshalb vorerst nur Zahl und Tabelle. Fachseite bis Teilauftrag 7: bestehende Executive-Ansicht (`s-exec`). Berechtigung siehe Befund oben.

| ID | Einheit | Form |
|---|---|---|
| `live.arr`, `live.mrr` | EUR | Einzelwert |
| `live.pipeline_coverage` | x | Verhältnis |
| `live.arr_direct`, `live.arr_partner`, `live.arr_outbound`, `live.arr_other` | EUR | Einzelwert |
| `live.pipeline_leads`, `live.pipeline_mql`, `live.pipeline_sql`, `live.pipeline_offers`, `live.pipeline_won` | Anzahl | Einzelwert |

### Übersichten (3)

| ID | Quelle | Zeitbasis | Fachseite |
|---|---|---|---|
| `uebersicht.team_hr` | `getTeamHrSnapshot` (Struktur aus `HEADCOUNT.rows`, `HR.metrics`, `TEAM.bottlenecks`) | Stand 31.12.2025 | `s-team` |
| `uebersicht.roadmap` | `getRoadmapSnapshot` (`ROADMAP.releases`, 6 Releases) | v1.2 (Feb 2025) bis v2.1 (geplant Q2 2026) | `s-roadmap` |
| `uebersicht.live_aktivitaet` | zentraler Live-Stream (`liveKpiStreamStore`), höchstens 10 Ereignisse | Feed-Punkte der letzten 30 Minuten beim Öffnen, danach fortgeschrieben | `s-exec` |

## Inventar aller Kandidaten

### `execData.ts`

| Export | Status | Grund |
|---|---|---|
| `HERO` | nicht geeignet | Seitentitel |
| `EXEC_KPIS_1`, `EXEC_KPIS_2` | aktiv | acht Executive-Zahlen, siehe oben |
| `CHART_ARR` | aktiv | ARR-Verlauf |
| `CHART_MRR` | aktiv | MRR-Paketmix |
| `CHART_QUARTAL` | aufbereiten | Neukunden (Anzahl) und Vertriebskosten (T€, Summe 209 = Sales & Marketing 2025) in einem Datensatz; auf keiner Fachseite verwendet; Neukunden je Quartal stehen gleichwertig in `FUNNEL` |
| `CHART_TIER` | nicht geeignet | 36 + 27 + 21 + 15 = 99 %, keine Gesamtheit; auf keiner Seite verwendet |
| `NOTE_EXEC`, `NOTE_PROFIL`, `NOTE_HIGHLIGHTS`, `NOTE_DATEN`, `PROFILE_ROWS`, `BRIDGES_ROWS`, `SOURCES_ROWS` | nicht geeignet | Fließtext und Stammdaten |
| `HIGHLIGHTS_GOOD_ROWS`, `HIGHLIGHTS_BAD_ROWS` | nicht geeignet | Aussagen im Text; Burn Rate 25.750 €/Monat, Runway 14 Monate und Trial-to-Paid 18 % haben keine strukturierte Istquelle |

### `executiveCockpitData.ts`

| Export | Status | Grund |
|---|---|---|
| `getExecutiveCockpitKpis` | (Ableitung) | liest `EXEC_KPIS_1`; der Katalog verweist direkt auf die Stammdaten |
| `getArrTrendData`, `getMrrTierData` | (Ableitung) | lesen `CHART_ARR` und `CHART_MRR` |
| `getTeamHrSnapshot`, `getRoadmapSnapshot` | aktiv | Übersichten |
| `getPipelineOverview` | aktiv | fünf CRM-Einträge |

### `finanzenData.ts`

| Export | Status | Grund |
|---|---|---|
| `CHART_ERLOESE` | aufbereiten | 307.600 + 23.000 + 5.400 = 336.000 = Umsatz 2025; geeignete Aufteilung, Fachseite `s-guv` |
| `BUDGET` | aufbereiten | Anteile 76 + 6 + 6 + 8 + 4 = 100 %, Beträge 645.000 = GuV-Aufwand 2025 (121 + 209 + 208 + 107 T€); Werte nur als Text, Fachseite `s-unit` |
| `GUV` | aufbereiten | FY 2024, FY 2025 und Plan 2026 gemischt; Plan/Ist trennen, Werte nur als Text |
| `CHART_KOSTEN` | aufbereiten | Vorzeichen uneinheitlich (Kosten positiv, EBITDA negativ) |
| `UNIT` | aufbereiten | LTV 11.893 €, LTV/CAC 2,7 (11.893 ÷ 4.447 = 2,67), CAC-Payback 13 Monate, Deckungsbeitrag 333 €, Bruttomarge 64,0 % (215 ÷ 336), NRR 101 %, GRR 88 % nur als Text mit Zusätzen |
| `BILANZ` | aufbereiten | Stichtagswerte nur als Text, z. B. Kassenbestand 363.000 €; Auswahl mit Fachfreigabe |
| `CHART_MRR26`, `CHART_CHURN26`, `CHART_BUDGET` | nicht geeignet | Planwerte 2026 |

### `kundenData.ts`

| Export | Status | Grund |
|---|---|---|
| `CHART_SEGMENT` | aufbereiten | 178.560 + 112.320 + 78.960 + 42.000 = 411.840 = ARR; Fachseite `s-segmente` |
| `REGIONEN` | aufbereiten | 61 + 3 + 2 = 66 Kunden; Fachseite `s-segmente` |
| `SEGMENTE` | aufbereiten | Kundenzahlen 24/18/14/10 nur im Text, Prozentwerte ergeben 99 % |
| `TOP10` | aufbereiten | zehn Referenzkunden, ARR als Text; Fachseite `s-top10` |
| `CS` | aufbereiten | NRR, GRR, Churn 2,8 %, NPS 34, Time-to-Value 11 Tage als Text; Seite Customer Success nicht geroutet |
| `ICP`, `PERSONA`, `EMPATHY` | nicht geeignet | qualitative Texte |

### `vertriebData.ts`

| Export | Status | Grund |
|---|---|---|
| `FUNNEL` | aufbereiten | Leads 1.776, MQL 516, SQL 192, Neukunden 47 (Quartalssummen stimmen); Funnel-Stufen, nie Kreis; Fachseite `s-funnel` |
| `KANAELE.chartKanal` | aufbereiten | 38 + 22 + 18 + 12 + 10 = 100 %; Fachseite `s-kanaele` |
| `KANAELE.chartRoi` | aufbereiten | Marketing-CAC je Kanal, z. B. LinkedIn 17.712 ÷ 18 = 984 € |
| `MBUDGET` | aufbereiten | Budget und Ist je Kanal; Seite Marketingbudget nicht geroutet |
| `BRAND` | aufbereiten | drei Reichweitenreihen je Quartal; Seite Brand nicht geroutet |
| `PLANUNG`, `KAMPAGNE` | nicht geeignet | Plan- und Zielwerte, skalierte Einheiten; Kampagnenseite nicht geroutet |
| `SLA`, `CONTENT`, `TOOLS` | nicht geeignet | Text |

### `organisationData.ts`

| Export | Status | Grund |
|---|---|---|
| `HEADCOUNT.chart` | aufbereiten | FTE je Quartal 4,0 bis 10,0; Fachseite `s-headcount` |
| `HEADCOUNT.rows`, `TEAM` | aktiv (über `uebersicht.team_hr`) | |
| `HR` | aufbereiten | Fluktuation 22 %, Personalaufwand 490.000 €, Remote 60 % nur als Text |

### `produktData.ts`

| Export | Status | Grund |
|---|---|---|
| `CHART_PRODUKT` | aufbereiten | Aktivierung 49 → 58 %, KI-Scoring 38 → 47 % je Quartal 2025; im Plan für Teilauftrag 8 vorgemerkt |
| `CHART_CHURN` | aufbereiten | Kündigungsgründe 8 + 5 + 2 + 2 = 17; Zeitraum der Zählung fehlt in der Quelle |
| `PERF` | aufbereiten | Uptime 99,7 % und weitere nur als Text |
| `ROADMAP` | aktiv (über `uebersicht.roadmap`) | |
| `FUNKTION`, `PRICING`, `INTEGR` | nicht geeignet | Stammdaten und Text |

### `marktData.ts`

| Export | Status | Grund |
|---|---|---|
| `CHART_WETTBEWERB` | aufbereiten | Summe 74,4 % (keine Gesamtheit, nie Kreis); LeadPilot „< 0,1 %“ als 0,1 gespeichert, also Obergrenze |
| `MARKT`, `WETTBEWERB`, `SWOT` | nicht geeignet | Text; die Tabellenwerte von `WETTBEWERB` stecken in `CHART_WETTBEWERB` |

### `strategieData.ts`

| Export | Status | Grund |
|---|---|---|
| `CHART_OKR` | nicht geeignet | Basis und Ziel in skalierten Mischeinheiten („T€/10“, „x10“) |
| `CHART_TREIBER` | nicht geeignet | geschätzte ARR-Effekte |
| `OKR`, `BSC`, `MASSNAHMEN`, `TREIBER`, `RISIKO` | nicht geeignet | Text |

### `unternehmenData.ts`

| Export | Status | Grund |
|---|---|---|
| `HISTORIE.events` | aufbereiten | Meilensteinübersicht (5 Ereignisse, 21.07.2022 bis Dez 2025); Fachseite `s-historie` |
| `IDEE`, `VALUE`, `STANDORT` | nicht geeignet | Text; Mietkosten 39.800 € nur im Text |

### `rechtData.ts`

| Export | Status | Grund |
|---|---|---|
| `GESELLSCHAFTER.rows` | aufbereiten | Summenzeile „Gesamt“ ausgeschlossen; 40,0 + 40,0 + 12,5 + 5,0 + 2,5 = 100,0 % (Test); Nennbeträge 31.250 € |
| `SATZUNG`, `HANDELSREGISTER`, `GF_VERTRAG`, `MIETVERTRAG` | nicht geeignet | Text |

### Übrige Module

| Modul | Status | Grund |
|---|---|---|
| `geschaeftsmodellData.ts`, `projektkontextData.ts`, `icpData.ts`, `personaData.ts` | nicht geeignet | Text |
| `navData.ts`, `resourceRegistry.ts`, `faceliftVisualData.ts` | nicht geeignet | technische Register |
| Live-Mix (`arr_*`), Live-Funnel (`pipeline_*`) | aufbereiten | Zusammenstellung mehrerer Live-Werte braucht einen gemeinsamen bestätigten Snapshot (Plan §4) |
| Live-Verlauf (`liveKpiStreamHistory`) | aufbereiten | Sitzungshistorie ist keine vollständige Zeitreihe |
| Simulation (`src/simulation/**`) | ausgeschlossen | Plan §1; nicht im Katalog, Test sichert das ab |

## Hinweise für die nächsten Teilaufträge

- **Fachseiten:** Seit v2.3.2 zeigen 32 Inhaltsseiten wieder die Original-Bilder. Das Fachseitenziel bleibt die Route; Werte kommen nie aus dem Bild.
- **Nicht geroutete Seiten** (`BudgetPage`, `MarketingBudgetPage`, `BrandPage`, `CampaignPlanningPage`, `RiskRegisterPage`, `CustomerSuccessPage`): Ihre Daten bleiben „aufbereiten“, bis es ein Fachseitenziel gibt.
- **Teilauftrag 2:** Live-Mandantentrennung entscheiden; Bedeutung von `closeDate` klären, bevor ein Zeitraumfilter für CRM aktiv wird.
- **Teilauftrag 8:** „aufbereiten“-Einträge mit strukturierten Werten in die Quellen bringen (eigener Auftrag, Quellmodule sind in Teilauftrag 1 nur gelesen).
