# LEADPILOT -- CONTENT & VISUAL REINTEGRATION PLAN

**Status:** Planungsgrundlage nach V1.0.0

## Zweck

Dieses Dokument bündelt die 250 im Planungsprozess festgelegten
Entscheidungen zur vollständigen Rückführung fehlender fachlicher
Inhalte, Visualisierungen und Internal Resources aus der historischen
Dashboard-Referenz in die aktuelle LeadPilot-Anwendung.

## Verbindliche Ausgangslage

-   `v1.0.0` bleibt der technisch abgenommene Referenzstand und wird
    nicht rückwirkend verändert.
-   Historische Referenz:
    `reference/LeadPilot_Dashboard_LEGACY_REFERENCE.html`.
-   Die Legacy-Datei bleibt unverändert und dient als
    Content-/Visual-Vergleichsquelle.
-   Die aktuelle V1.0-Architektur und das bestehende Designsystem
    bestimmen die technische Umsetzung.
-   Es gilt: **inhaltliche Vollständigkeit aus der Legacy-Referenz +
    technische Integration nach der aktuellen Architektur**.

## Audit-Grundlage

Der durch Antigravity durchgeführte Reconciliation-Audit identifizierte:

-   53 fachliche Legacy-Sektionen
-   24 Legacy-Canvas-/Chart.js-Diagramme
-   15 in V1.0 fehlende fachliche Diagramme
-   8 fehlende Internal-Resource-/Marketing-Ressourcen einschließlich
    SLA-Matrix
-   mehrere Inhalte, die im Code vorhanden, aber nicht navigierbar sind

Die vollständige Audit-Auswertung ist die operative Grundlage für die
folgenden Umsetzungsaufträge.

## Entscheidungen 1--250

### Entscheidungen 1--25 -- Content-/Visual-Grundsätze

1.  Legacy-Referenz als unveränderliche Content-Referenz verwenden.
2.  Alle fachlichen Inhalte der Referenz erhalten.
3.  Alle 15 identifizierten fehlenden Diagramme reintegrieren.
4.  Fachliche Daten und Aussagen der Legacy-Referenz erhalten.
5.  Legacy-Canvas/Chart.js nicht 1:1 übernehmen.
6.  Bestehendes V1.0-Designsystem verwenden.
7.  Tabellen ersetzen fehlende Visuals nicht.
8.  Auch nicht-chartbasierte visuelle Elemente berücksichtigen.
9.  SLA-Matrix, Scoring-Grafiken, Roadmaps und Infografiken
    berücksichtigen.
10. Legacy-HTML nicht als komplette alte Anwendung einbetten.
11. Benötigte Elemente in die aktuelle Anwendung integrieren.
12. Bestehende V1.0-Komponenten möglichst wiederverwenden.
13. Bestehende Schichtentrennung einhalten.
14. Diagrammdaten und Präsentationsschicht trennen.
15. Jedes Visual erhält eine eindeutige fachliche Datenquelle.
16. Historische Werte nicht stillschweigend modernisieren.
17. Einheiten und Rundungen soweit fachlich sinnvoll erhalten.
18. Finanzcharts vollständig ergänzen.
19. Strategiecharts vollständig ergänzen.
20. Produkt-, Markt-, Kunden- und Marketingcharts vollständig ergänzen.
21. Internal Resources als eigenen Bereich zurückbringen.
22. Originaldokumente visuell und nicht nur als Text bereitstellen.
23. Interaktive Landingpage erhalten.
24. Alle identifizierten Internal-Resource-Dokumente und die SLA-Grafik
    berücksichtigen.
25. Vor Implementierung ein vollständiges Inventar erstellen.

### Entscheidungen 26--50 -- Internal Resources & Visual Assets

26. Internal Resources erhält einen eigenen Navigations-/Bereichspunkt.
27. Optische Trennung von CRM-/Simulationsfunktionen.
28. Originalmaterialien direkt in der Anwendung ansehen können.
29. Möglichst kein externer Viewer.
30. Originalseiten visuell darstellen.
31. Navigation innerhalb mehrseitiger Dokumente.
32. Foliennavigation für Präsentationen.
33. Thumbnail-Übersicht.
34. Aktuelle Seite/Folie hervorheben.
35. Zoom unterstützen.
36. Auch kleinere Fenstergrößen sinnvoll unterstützen.
37. Originalproportionen bewahren.
38. Original-Assets nicht durch vereinfachte Grafiken ersetzen.
39. Historische Darstellung als Referenz, technische Umsetzung modern.
40. Landingpage als interaktiven Inhalt behandeln.
41. Landingpage-Interaktivität möglichst erhalten.
42. Externe Abhängigkeiten der Landingpage prüfen.
43. Historische Interaktivität lokal/sicher reproduzierbar prüfen.
44. Dokumente, Präsentationen, Bilder und HTML unterscheiden.
45. Jede Resource eindeutig benennen.
46. Herkunft der Resource nachvollziehbar machen.
47. AUTEC- und Deubner-Pitch vollständig integrieren.
48. SLA-Matrix visuell erhalten.
49. Alle 15 fehlenden Charts als eigene React-Visualisierungen umsetzen.
50. Vor Umsetzung jedes Charts Daten, Typ und Aussage dokumentieren.

### Entscheidungen 51--75 -- Die 15 fehlenden Diagramme

51. `c-produkt`: Produkt-Performance; DAU-Aktivierung und KI-Scoring
    Q1--Q4 2025.
52. `c-churn`: Churn-Ursachen-Donut.
53. `c-wettbewerb`: horizontale DACH-Marktanteile.
54. `c-segment`: ARR nach Zielbranche.
55. `c-brand`: Website, LinkedIn und Newsletter als Zeitreihe.
56. `c-planbudget`: H2-2026 Marketingbudget Aug. 2026--Jan. 2027.
57. `c-plankpi`: Basis 2025 vs. Ziel Jan. 2027.
58. `c-kampbudget`: Budgetaufteilung LeadPilot Connect.
59. `c-erloese`: Erlösstruktur 2025.
60. `c-kosten`: FY24/FY25 Kostenstruktur.
61. `c-mrr26`: MRR-Projektion 2026.
62. `c-churn26`: Churn-/Trial-to-Paid-Projektion 2026.
63. `c-budget`: Budgetallokation 2026.
64. `c-okr`: OKR Gap Basis 2025 vs. Ziel 2026.
65. `c-treiber`: ARR-Effektbaum der Wachstumstreiber.
66. Fachliche Aussage aller 15 Charts unverändert erhalten.
67. Historische Datenbasis zunächst exakt aus der Referenz übernehmen.
68. Jedes Chart erhält eine definierte Datenquelle.
69. Neue Charts folgen dem V1.0-Designsystem.
70. Wiederverwendbare Chart-Komponenten bevorzugen.
71. Nach Umsetzung jedes Charts gegen das Legacy-Gegenstück prüfen.
72. Daten + Aussage + Visualisierung gemeinsam prüfen.
73. Alle 15 Charts einzeln abnehmen.
74. Kein Legacy-Chart darf übersehen werden.
75. Legacy-Chart-Inventar als Abnahmereferenz verwenden.

### Entscheidungen 76--100 -- Inhaltsstruktur & Navigation

76. Alle 53 Legacy-Sektionen auf Erreichbarkeit prüfen.
77. Nur im Code vorhandene, aber nicht navigierbare Sektionen zählen
    nicht als vollständig.
78. Bereits vorhandene, aber nicht navigierbare Bereiche wieder
    zugänglich machen.
79. Integrationen & Compliance wieder erreichbar.
80. Empathy Map wieder erreichbar.
81. Customer Success & Retention wieder erreichbar.
82. Business Model Canvas wieder erreichbar.
83. Geschäftliche Logik wieder erreichbar.
84. Marketing-Budget 2025 wieder erreichbar.
85. Brand & Digital Presence wieder erreichbar.
86. Content-Strategie wieder erreichbar.
87. Vertriebs-Tools wieder erreichbar.
88. LeadPilot Connect wieder erreichbar.
89. Budget- & Kostenplan 2026 wieder erreichbar.
90. Maßnahmenportfolio 2026 wieder erreichbar.
91. Risikoregister wieder erreichbar.
92. Geschäftsführeranstellungsvertrag wieder erreichbar.
93. Mietvertrag wieder erreichbar.
94. Projektkontext & Task Sheets wieder erreichbar.
95. Quellen & Methodik wieder erreichbar.
96. Fachliche Gliederung statt unnötiger neuer Hauptmenüpunkte.
97. Logische Einordnung als Unterpunkte prüfen.
98. Navigation nach Ergänzung gegen alle 53 Sektionen prüfen.
99. Bestehende V1.0-Navigation und Simulation nicht unbeabsichtigt
    verändern.
100. Coverage-Matrix Legacy-Sektion → Route/View → erreichbar erstellen.

### Entscheidungen 101--125 -- Technische Umsetzung der Visualisierungen

101. Gemeinsame wiederverwendbare Chart-Infrastruktur.
102. Daten über definierte Props/View-Models statt JSX-Hardcoding.
103. Fachliche Datenlogik außerhalb reiner Präsentationskomponenten.
104. Gemeinsame Komponenten für gleiche Chart-Typen.
105. Bestehende V1.0-Chart-Infrastruktur zuerst untersuchen/erweitern.
106. Legacy-Canvas/Chart.js nicht direkt übernehmen.
107. Native React-Komponenten verwenden.
108. SVG für komplexe skalierbare/interaktive Visuals bevorzugen.
109. Canvas nur bei konkretem technischem Vorteil.
110. Responsive Desktop-/kleinere Fensterdarstellung.
111. Lesbarkeit vor Pixelkopie.
112. Fachliche Aussage und Datenstruktur erhalten.
113. V1.0-Designsystem verwenden.
114. Einheitliche Titel-/Legenden-/Achsen-/Tooltip-Behandlung.
115. Semantisch verständliche Diagrammtitel.
116. Zentrale Formatierung für Euro, Prozent, FTE etc.
117. Historische Daten in geeigneter Data-/Domain-Schicht.
118. Historische und Simulationsdaten nicht vermischen.
119. Historische Referenz-, CRM-Baseline- und Simulationsdaten technisch
     trennen.
120. Neue Charts mit Referenzwerten testen.
121. Tests sollen auch zentrale Daten-/Konfigurationswerte prüfen.
122. Komplexe Visuals zusätzlich manuell abnehmen.
123. Simulationen durch Reintegration nicht beeinflussen.
124. Nach größeren Blöcken tsc, Build und Integrity ausführen.
125. Neuer Release erst nach technischer und visueller Prüfung.

### Entscheidungen 126--150 -- Technische Integration der Originalressourcen

126. Originalmaterialien dauerhaft als Projektbestandteil integrieren.
127. Eigene Resource-/Asset-Struktur verwenden.
128. `reference/` bleibt unveränderte historische Vergleichsquelle.
129. Produktive Anwendung lädt nicht aus `reference/`.
130. Stabile technische Resource-Identifier.
131. Lesbarer Titel und Beschreibung.
132. Zentrale Resource-Metadaten.
133. Dokumente, Präsentationen, Bilder und interaktive HTML-Ressourcen
     unterscheiden.
134. Mehrseitige Inhalte als einzelne visuelle Seiten.
135. Seitenreihenfolge exakt erhalten.
136. Originalauflösung soweit praktikabel erhalten.
137. Seitenverhältnis beim Skalieren bewahren.
138. Zoom-In/Zoom-Out.
139. Vor-/Zurück-Navigation.
140. Thumbnail-Übersicht.
141. Standardmäßig erste Seite öffnen.
142. Seitenstand innerhalb eines Dokuments erhalten.
143. Dokumentkopf mit Titel und Typ.
144. Saubere Rückkehr zum Internal-Resources-Bereich.
145. Landingpage technisch separat behandeln.
146. Landingpage-Abhängigkeiten und sichere lokale Einbindung prüfen.
147. Nicht stillschweigend Screenshot als gleichwertigen interaktiven
     Ersatz verwenden.
148. Resource-Coverage-Test für alle identifizierten Ressourcen.
149. Fehlende Resource muss erkennbar sein.
150. Viewer generisch für neue Ressourcen erweiterbar.

### Entscheidungen 151--175 -- Qualitätssicherung & Abnahme

151. V1.0.0 bleibt Regression-Referenz.
152. Reproduzierbaren Git-Ausgangspunkt dokumentieren.
153. `npx tsc --noEmit` nach größeren Blöcken.
154. `npm run build` nach größeren Blöcken.
155. `npx tsx scripts/verifyIntegrity.ts` nach größeren Blöcken.
156. Bestehende 14/14 Suites und 262/262 Assertions grün halten, sofern
     keine bewusst neuen Tests.
157. Neue Visualisierungen mit sinnvollen Integritätsprüfungen.
158. Erwartete Chart-Datenwerte prüfen.
159. Richtigen Chart-Typ prüfen.
160. Mehrere Datenreihen auf Vollständigkeit prüfen.
161. Seiten-/Folienanzahl automatisch prüfen.
162. Stable Resource-Identifier testen.
163. Fehlende Assets als Fehler erkennen.
164. Kaputte/nicht ladbare Assets erkennen.
165. Landingpage-Resource separat prüfen.
166. Systematischen Legacy→aktuell Coverage-Check.
167. Maschinenlesbare Coverage-Liste.
168. Statuswerte `IMPLEMENTED`, `PARTIAL`, `MISSING`, `NOT_APPLICABLE`.
169. `NOT_APPLICABLE` nur mit fachlicher/architektonischer Begründung.
170. Finales Inventar erneut gegen Referenz prüfen.
171. Manueller Browser-Test.
172. Insbesondere Internal Resources, Charts und Navigation prüfen.
173. Kaltstart weiterhin fehlerfrei.
174. Vor Release Git-Status/Commit/Tag/Remote kontrollieren.
175. Release erst bei vollständiger technischer, Content- und visueller
     Abnahme.

### Entscheidungen 176--200 -- Architektur, Datenhoheit & Versionsstrategie

176. `ARCHITECTURE_DECISIONS.md` bleibt kanonische Architekturquelle.
177. Entscheidungen 176--200 nach Freigabe dokumentieren.
178. Separates Content-/Visual-Coverage-Dokument führen.
179. Coverage-Dokument enthält alle 24 Legacy-Charts und Internal
     Resources.
180. Legacy-Referenz unverändert erhalten.
181. Referenz-Hash/eindeutige Identifikation dokumentieren.
182. Unbemerkte Referenzänderungen verhindern.
183. Änderungen der Referenz bewusst dokumentieren.
184. Historische Daten als historische Daten kennzeichnen.
185. Historische Daten nicht als aktuelle Live-Daten darstellen.
186. Ebene-A-Baseline von historischen Marketing-/Unternehmensdaten
     trennen.
187. Ebene-B-Simulation nur mit Simulationsdaten.
188. Legacy-Charts nicht ungeprüft an Simulation anschließen.
189. Chart zunächst als statisch/historisch oder dynamisch
     klassifizieren.
190. Historische Charts zunächst historisch integrieren, sofern keine
     Dynamik gefordert.
191. Spätere Dynamisierung als eigene fachliche Entscheidung.
192. Internal Resources klar als internes Originalmaterial kennzeichnen.
193. Internal Resources nicht als KPI-Berechnungsquelle darstellen.
194. Resource-Struktur für spätere Erweiterungen auslegen.
195. Metadatenstruktur für neue Dokumenttypen/Versionen.
196. Dokumentversionen eindeutig identifizieren.
197. Legacy-Referenz nicht unnötig in Production-Build aufnehmen.
198. `reference/` als Entwicklungs-/Auditmaterial behandeln.
199. Content-/Resource-Stand des Releases nachvollziehbar machen.
200. Gesamte Reintegration als Post-V1.0-Entwicklungsabschnitt
     behandeln.

### Entscheidungen 201--225 -- Datei-/Komponentenstruktur & Umsetzungsstrategie

201. Bestehende `src/features/...`-Struktur beibehalten.
202. Visualisierungen dem fachlich passenden Feature zuordnen.
203. Produkt-Charts in `ProduktView`.
204. Wettbewerbschart in `MarktView`.
205. Segment-ARR in `KundenView`.
206. Marketing-/Vertriebscharts in `VertriebView`.
207. Finanzcharts in `FinanzenView`.
208. OKR-/Treibercharts in `StrategieView`.
209. SLA-Matrix im Vertriebs-/SLA-Bereich.
210. Internal Resources als eigenes Feature.
211. Resource-Viewer von Dokumentdaten trennen.
212. Zentrale Resource-Registry.
213. Generischer Viewer statt individueller Viewerlogik.
214. Neue Dokumente über Registry-Eintrag integrierbar.
215. Asset-Dateien unabhängig von Viewer-Darstellung speichern.
216. Assets und Metadaten trennen.
217. Einzelbilder und mehrseitige Inhalte unterstützen.
218. Landingpage eigener Darstellungsstrategie.
219. Navigation nur soweit erweitern wie fachlich nötig.
220. Doppelte Views/Datenquellen vermeiden.
221. Vor neuer Datei bestehende Erweiterungsmöglichkeit prüfen.
222. Jede neue Komponente hat einen eindeutigen Zweck.
223. Umsetzung in kontrollierten Teilaufträgen.
224. Jeder Teilauftrag separat testen und dokumentieren.
225. Finaler End-to-End-Coverage-Audit nach allen Teilaufträgen.

### Entscheidungen 226--250 -- Abschluss der Planungsgrundlage

226. Vor Auftrag 015 prüfen, ob alle Original-Assets verfügbar sind.
227. Eingebettete Bilder/Slides für produktive Nutzung verfügbar machen.
228. Legacy-Datei unverändert lassen.
229. Herkunft jedes übernommenen Assets dokumentieren.
230. Nutzungs-/Urheberrechtslage projektspezifisch prüfen.
231. Keine unnötigen externen Ressourcen laden.
232. Externe Abhängigkeiten möglichst lokal lösen.
233. Landingpage nur bei zuverlässiger/sicherer technischer Möglichkeit
     interaktiv einbinden.
234. Technische Einschränkungen dokumentieren.
235. Statische Darstellung nur als gekennzeichneter Fallback.
236. Performance der hochauflösenden Assets berücksichtigen.
237. Resources nach Bedarf/lazy laden.
238. Große Originaldokumente nicht unnötig mehrfach im Speicher halten.
239. Dateigrößen und Browser-Performance berücksichtigen.
240. Desktop zuerst optimieren, da Business-Dokumente intern.
241. Kleinere Bildschirmdarstellung dennoch brauchbar.
242. Statische Legacy-Visuals von Simulation vollständig trennen.
243. Reintegration soll Simulationslogik nicht ändern, sofern nicht
     fachlich notwendig.
244. Jeder Auftrag definiert erlaubte Dateien/Bereiche und Scope.
245. Antigravity analysiert bestehenden Code vor Änderungen.
246. Bei Architekturkonflikten stoppen und berichten.
247. Abweichungen von Legacy-Referenz begründen und dokumentieren.
248. Aktualisiertes Coverage-/Abnahme-Dokument ins Repository.
249. Neuer Release erst nach finalem Coverage-Audit.
250. Alle 250 Entscheidungen als verbindliche Grundlage dokumentieren.

## Zielstruktur

``` text
Historische Referenz
        │
        ├── Fachinhalte ───────────────► aktuelle React-Features
        ├── fehlende Charts ───────────► native V1-Visualisierungen
        ├── SLA-/Infografiken ─────────► fachlich passende Views
        └── Internal Resources ────────► eigener Resource-Bereich
                                           │
                                           ├── Roadmap
                                           ├── Präsentation
                                           ├── Kampagnenbrief
                                           ├── Leitfaden
                                           ├── Landingpage
                                           ├── AUTEC Pitch
                                           ├── Deubner Pitch
                                           └── SLA-Matrix
```

## Vorgesehene Umsetzungsreihenfolge

1.  **Auftrag 015 -- Internal Resources:** Resource-Struktur, Registry,
    Viewer und Originalmaterialien.
2.  **Auftrag 016 -- Produkt / Markt / Kunden:** fehlende fachliche
    Visualisierungen.
3.  **Auftrag 017 -- Vertrieb & Marketing:** fehlende
    Marketing-/Vertriebsvisualisierungen.
4.  **Auftrag 018 -- Finanzen:** fehlende Finanzvisualisierungen.
5.  **Auftrag 019 -- Strategie:** OKR- und
    Wachstumstreiber-Visualisierung.
6.  **Auftrag 020 -- Navigation & Coverage:** fehlende Erreichbarkeit
    und Coverage-Prüfung.
7.  **Auftrag 021 -- Gesamt-Audit:** vollständiger End-to-End-Abgleich
    gegen die Legacy-Referenz.

**Hinweis:** Diese Auftragnummern sind eine vorgeschlagene zukünftige
Umsetzungsstruktur und keine bereits abgeschlossene Auftragshistorie.

## Datenhoheit

``` text
Historische Referenzdaten ──► historische Content-/Visual-Darstellung
Ebene-A-CRM-Baseline ──────► aktuelles Unternehmens-/CRM-Dashboard
Ebene-B-Simulation ────────► Simulations-Dashboard
```

Diese Datenwelten dürfen bei der Reintegration nicht ungeprüft vermischt
werden.

## Abnahmekriterium

Die Reintegration ist erst abgeschlossen, wenn:

-   alle 53 relevanten Legacy-Sektionen bewertet sind,
-   alle 24 Legacy-Charts einen Coverage-Status besitzen,
-   die 15 fehlenden Charts integriert und geprüft sind,
-   alle identifizierten Internal Resources verfügbar sind,
-   die nicht navigierbaren vorhandenen Inhalte erreichbar sind,
-   TypeScript, Build und Integrity-Prüfungen erfolgreich sind,
-   die wichtigsten Bereiche manuell im Browser geprüft wurden,
-   und der finale Coverage-Audit keinen unbegründeten `MISSING`-Status
    mehr enthält.

## Schutz des V1.0.0-Referenzstands

`v1.0.0` bleibt der technische Ausgangspunkt. Die
Content-/Visual-Reintegration ist eine neue Entwicklungsphase nach
V1.0.0. Änderungen werden nicht rückwirkend dem bestehenden Release
zugeschrieben.

## Arbeitsregel für Antigravity

> **Kein eigenmächtiges Ergänzen, Vereinfachen oder Ersetzen von
> Inhalten. Die Legacy-Referenz definiert, WAS erhalten werden muss; die
> aktuelle Architektur definiert, WIE es integriert wird. Bei einem
> Konflikt oder einer nicht eindeutig dokumentierten Architekturfrage
> wird gestoppt und berichtet, statt eine neue Entscheidung zu
> erfinden.**

## Status

**PLANUNG ABGESCHLOSSEN -- 250 ENTSCHEIDUNGEN DOKUMENTIERT -- NOCH KEINE
IMPLEMENTIERUNG DIESER POST-V1.0-REINTEGRATION.**
