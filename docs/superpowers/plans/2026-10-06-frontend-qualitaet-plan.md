# LeadPilot – umfassender Plan zur Verbesserung des Frontends

> **Für ausführende Agenten:** `superpowers:executing-plans` für die schrittweise Umsetzung verwenden. Die Rollen und Schutzregeln aus `CLAUDE.md` haben Vorrang. Codex schreibt hier den Plan und prüft später unabhängig; der zuständige Builder implementiert. Keine Subagenten oder Parallelaufträge durch diesen Plan autorisiert.

**Ziel:** Alle im visuellen Review festgestellten Mängel nachvollziehbar bearbeiten: Zuverlässigkeit, Datenklarheit, Übersicht, mobile Nutzung, Bildseiten, Diagramme, Sprache, Editor und Navigation.
**Architektur:** Bestehende React-/Page-Kit-/Dashboard-Komponenten schrittweise verbessern. Datenquellen und Simulationskern bleiben erhalten. Die 32 Bildseiten werden nach Abnahme einer echten Musterseite in überprüften Gruppen durch anpassbare Inhalte abgelöst.
**Technik:** React 18, TypeScript, Vite, vorhandenes Tailwind/Design-Token-System, Supabase, TanStack Query, vorhandene Radix-Komponenten, Vitest und Playwright. Keine neue Bibliothek eingeplant.
**Entwurf:** [Design und Anforderungen](../specs/2026-10-06-frontend-qualitaet-design.md).
**Status:** Vollständiger Vorschlag zur Planung; kein Produktcode umgesetzt, keine neue Design-/Releasefreigabe. Stand 06.10.2026, Review-Basis `5c0deba`.
**Freigabe:** Plan von Marc am 06.10.2026 freigegeben. Builder Claude Code, Prüfer Codex (Entscheidung Marc, 06.10.2026, `CLAUDE.md` §4). Die Design- und Bildseitenfreigaben in D und G bleiben eigene Sichtabnahmen. Arbeitspaket 0: Auftrag 081.

## 1. Für Marc: Was nachher besser sein soll

Du öffnest das Dashboard und siehst sofort relevante Zahlen. Du erkennst ihren Zeitraum und verstehst, was sie bedeuten. Einstellungen bewirken das, was ihre Beschriftung verspricht. Auf dem Handy kannst du Inhalte ohne ständiges Zoomen lesen. Bei einem Fehler weißt du, was fehlt und wie du weiterkommst. Dein selbst zusammengestelltes Dashboard bleibt erhalten.

Wir ändern zunächst Fehler und irreführende Zustände, anschließend die Gestaltung an wenigen Mustern und zuletzt die übrigen Seiten. Damit lässt sich jedes Ergebnis einzeln ansehen und bei Bedarf korrigieren.

## 2. Verbindliche Arbeitsgrenzen

- Vor jedem neuen Auftrag `CLAUDE.md`, Architekturentscheidungen, aktuellen BUILD_PLAN, BUILD_LOG und zugehörige Auftragsdatei lesen.
- Vor Arbeiten Git-Status prüfen. Bei bestehenden Änderungen stoppen und Marc fragen; kein Stash, Restore, Reset, Clean oder erzwungener Branchwechsel.
- Vorhandene Referenzordner, ignorierte Dateien und Bildarchive nicht löschen, verschieben oder überschreiben.
- Jeder Umsetzungsschritt erhält vom Builder einen Detailauftrag unter `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md`, mit exakten Zielpfaden. `XXX` wird erst bei Vergabe aus dem aktuellen Register gewählt.
- Geschützte Pfade: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Außerdem RNG-/Seed-Verhalten, Run-/Versionsmodell, Persistenz und CRM-Schreibpfade schützen.
- Fällt ein benötigter Datenfix in einen Schutzbereich, separaten Diagnosebefund und ausdrücklich passenden Auftrag erstellen; der UI-Auftrag erweitert seinen Umfang nicht selbst.
- Kein Wechsel von Datenständen, Geschäftsregeln oder Präferenzschema als Nebenwirkung einer Gestaltungskorrektur.
- Keine neuen Pakete, keine automatischen Merges, keine Release-Tags ohne bestehende Freigaben. Marc führt den Merge aus.
- Rollen aus aktueller Repo-Regel beachten: Dashboard-Abschnitt Claude Code baut, Codex prüft; außerhalb gelten die dort dokumentierten Builderregeln. Die Rollen werden nicht stillschweigend durch diesen Plan erweitert.
- Planungserstellung und spätere Umsetzung unterscheiden: Ein geschriebener Plan ist kein grüner Gate-Nachweis. BUILD_LOG dokumentiert nachher tatsächlich ausgeführte Prüfungen.

## 3. Abdeckung aller Mängel

| Befund aus dem Entwurf | Bearbeitung | Ergebnis |
|---|---|---|
| F12 Pipeline hängt / Fehler als Null | Arbeitspaket A | Fehler blockiert weder Navigation noch ehrliche Anzeige |
| F08 Funnel-Widerspruch | B, G | Gemeinsame geprüfte Werte und Berechnungen |
| F04 Unwirksamer Datumsfilter | C | Keine aktive Einstellung ohne Wirkung |
| F05 Freies Pipeline-Feld | C | Nachvollziehbare Auswahl oder ehrlich begrenzte Suche |
| F01/F02 Große Kacheln / Textwiederholung | D, E | Kompakte Kacheln, kurze Metadaten |
| F03 Fehlende Einordnung | E | Verständliche Namen und belegte Vergleiche |
| F06 Mobile Überlänge | D, E, G | Kennzahl im ersten Bildschirm, lesbare Fachseiten |
| F07 Ganzseitenbilder | D, G | Abgenommene HTML-Seiten ohne Verlust von Inhalt/Marke |
| F09 Entwicklersprache | C, E, F, H | Durchgehende verständliche deutsche Beschriftungen |
| F10 Editorüberladung | F | Weniger sichtbare Aktionen, alle Funktionen erreichbar |
| F11 Glanz/3D/ähnliche Farben | D, E, G | Ruhige Diagramme mit unterscheidbaren Datenreihen |
| F13/F14 Abmelden / Navigation | H | Sichtbare Kontoaktionen und eindeutiger Standort |
| F15 Heller Modus unlesbar (neu aus Paket 0) | D, Abnahme in E | Alle Texte in hell und dunkel lesbar; axe über die ganze Seite ohne `color-contrast` |

## 4. Reihenfolge und Abhängigkeiten

### Besonderer Prüffokus

Diese fünf Randbedingungen sind in den jeweiligen Arbeitspaketen ausdrücklich als Testfälle enthalten:

| Bedingung | Erwartung | Zuständiges Paket |
|---|---|---|
| CRM-Abfrage fällt aus, danach Seitenwechsel | Neue Route und neuer Inhalt erscheinen; keine falschen Nullwerte | A |
| Alte Präferenz enthält heute nicht wirksamen Zeitraum oder unbekannte Pipeline | Kein stiller Datenverlust, ehrliche Einschränkung | C |
| Lange Beschriftung, 320 px oder vergrößerte Schrift | Inhalt bleibt vollständig lesbar und bedienbar | D/E/G |
| Zwei Sitzungen speichern dieselbe Dashboardrevision | Konflikt sichtbar, Entwurf bleibt erhalten, keine fremden Benutzerdaten | F/I |
| Vergleichswert fehlt oder Berechnungsnenner ist 0 | Keine erfundene Entwicklung, kein NaN/Unendlich, verständlicher Datenzustand | B/E |

```text
0 Bestandsaufnahme
  → A Zuverlässigkeit → B Datenabgleich → C Filter
  → D Designmuster und Sichtabnahme
  → E Dashboard und mobile Hülle → F Editor
  → G Fachseiten in kleinen Wellen → H Navigation / letzte Sprachbereinigung
  → I Gesamtabnahme und kontrollierter Rollout
```

Die Reihenfolge ist absichtlich seriell. Ein Paket startet nach Abnahme seines Vorgängers. G kann je Seitenwelle einen eigenen PR bekommen. Das vermindert Konflikte an gemeinsam genutzten Stilen und Komponenten.

Vorläufige Größenordnung: 0 klein, A mittel bis zur Diagnose, B mittel, C klein–mittel, D mittel, E/F mittel–groß, G groß, H mittel, I mittel. Eine belastbare Dauer wird nach 0 und der ersten Fachseitenwelle geschätzt; die Zahl 32 allein sagt wenig über die inhaltliche Komplexität aus.

## 5. Arbeitspaket 0 – Bestand und überprüfbare Ausgangslage

**Zweck:** Verhindern, dass eine einzelne Beobachtung als flächendeckender Fehler oder ein historischer Plan als aktueller Auftrag behandelt wird.
**Dateien:** `docs/reviews/2026-10-06-frontend-befundregister.md` neu; zugehöriger Detailauftrag und BUILD_LOG. Lesen: `src/components/imagePage/imagePages.ts`, `src/config/pagePresentation.ts`, `src/app/`, `src/domain/`, aktuelle Dashboard-Spezifikation.

- [x] Aktuellen Branch/Commit, Versionsanzeige, Startmodus, Browserzoom und tatsächliche CSS-Viewportgröße erfassen; keine Secrets protokollieren.
- [x] Dashboard, Editor, Details, CRM-Seiten, alle 32 registrierten Bildseiten und vorhandene HTML-Fassung inventarisieren. Pro Seite Route, Komponente, Datenquelle, Diagramme, Schutzbereich und Komplexität erfassen.
- [ ] Bild-/Textabweichungen aller 32 Seiten systematisch abgleichen (Zahlen, Trichterstufen, Tabellenwerte) – im Register für den Sales Funnel als belegt dokumentiert (F08: Bild 65,3 % vs. HTML 56 %); vollständiger Zahlenabgleich aller 32 Seiten ist die Kernaufgabe von Arbeitspaket B (§7).
- [x] Dunklen und hellen Modus getrennt prüfen. Die erste Bewertung deckte nur den dunklen Modus ab.
- [x] Reproduzierbare Screenshots bei 1440/768/375 px vor den Änderungen anfertigen. Lazy-Inhalte vorher durch Scrollen aktivieren und vollständig laden; Fehlerfälle separat aufnehmen.
- [x] Abstände, Kartenhöhen, Inhaltshöhe, sichtbare Kennzahlen, Überlauf und Fokusverhalten messen. Temporäre Bilder aus dem Review nicht als langfristige Baselines behandeln.
- [x] F01–F14 jeweils als bestätigt, begrenzt bestätigt oder noch zu prüfen klassifizieren. Produktionsbetroffenheit der Pipeline ausdrücklich offenlassen, bis geprüft.

**Erledigt mit Auftrag 081** (Register `docs/reviews/2026-10-06-frontend-befundregister.md`); Abnahme durch Codex-Befund offen. Paket 0 hat zusätzlich F15 (heller Modus unlesbar, Token- und Shell-Kontraste) gefunden; F15 ist in Abschnitt 3, Paket D und der Gesamtabnahme (§15) aufgenommen (Codex PR #67). Der systematische Zahlenabgleich aller 32 Seiten bleibt gemäß Abschnitt 7 die Kernaufgabe von Paket B.

**Abnahme:** Befundregister deckt alle 32 Bildseiten plus die interaktiven Abläufe ab; Befunde enthalten reproduzierbare Schritte und Prüfbedingungen. Frühere Freigaben von Auftrag 069 und Dashboard 079 bleiben dokumentiert.

## 6. Arbeitspaket A – Pipelinefehler, Zustände und Navigation

**Priorität:** Zuerst. Eine schönere Oberfläche darf einen Datenfehler nicht verdecken.
**Betroffene Dateien für die Diagnose:** `src/features/crm/pages/DealsPage.tsx`, `src/features/crm/hooks/useCrmProvenance.ts`, `src/hooks/useUrlSyncedState.ts`, `src/hooks/queries/useCrmListQuery.ts`, `src/features/crm/components/`, `src/components/data/DataSourceStatus.tsx`, `src/components/ui/RouteErrorBoundary.tsx`.
**Tests:** vorhandene CRM-/Hook-Tests ergänzen; `e2e/crm-query-export.spec.ts` um Fehler-/Navigationsfälle erweitern. Endgültige Änderungsdateien erst aus der Ursachenanalyse ableiten.

- [ ] SERVER_ERROR im lokalen Test reproduzieren: Pipeline öffnen, Antwort kontrolliert fehlschlagen lassen, anschließend Unternehmenssteckbrief und Funnel anklicken. Adresse, Überschrift, Hauptinhalt und Konsole vergleichen.
- [ ] Separat prüfen, ob Navigation auch bei erfolgreicher oder leerer CRM-Antwort hängen bleibt. QueryCache-Benachrichtigungen, Hook-Zustandsänderungen und URL-Synchronisation nachverfolgen; nicht allein aus dem Stacktrace einen Hook als Ursache erklären.
- [ ] Einen minimalen Regressionstest schreiben, der das tatsächlich identifizierte Schleifen-/Navigationsproblem vor dem Fix nachweislich auslöst. Kein blindes Erhöhen von Wiederholungszahlen oder Abschalten der Warnung.
- [ ] Ursache mit kleinstem gezielten Eingriff beseitigen. Datenbank-/Edge-Function-Ausfälle getrennt untersuchen, wenn sie weiterhin bestehen; ein UI-Fix beweist keinen reparierten Server.
- [ ] Lade-, Leer-, Fehler- und Erfolgszustände trennen. Bei Fehler stehen Anzahl und Volumen auf „Nicht verfügbar“, nicht 0. Bestätigte leere Ergebnisse zeigen weiterhin 0.
- [ ] „Erneut versuchen“ anbieten; nur fehlgeschlagene passende Abfragen wiederholen. Export bei nicht verfügbarer Datenbasis eindeutig sperren, statt ein scheinbar vollständiges Ergebnis anzubieten.
- [ ] Navigation, Zurück/Vorwärts, Wiederholen und Benutzerwechsel unter Fehlerbedingungen testen; keine Daten eines vorherigen Benutzers sichtbar lassen.

**Abnahme:** Nach erfolgreicher, leerer und fehlgeschlagener Antwort funktioniert die Navigation ohne Neuladen. Keine reproduzierbare Aktualisierungsschleife. Fehler werden nicht als geschäftliche Nullwerte dargestellt; erfolgreicher Wiederholungsabruf stellt die Anzeige wieder her.

## 7. Arbeitspaket B – Funnel und gemeinsame fachliche Wahrheit

**Dateien:** `src/features/vertrieb/pages/FunnelPage.tsx`, `src/domain/vertriebData.ts`, `src/components/imagePage/ImagePage.tsx` nur lesen; vorhandene Funnel-Tests ergänzen; Abgleichprotokoll im Befundregister. Originalbilder bleiben Referenzmaterial und werden nicht gelöscht.

- [ ] Bild, HTML-/Textfassung und Domänendaten vergleichen: alle Trichterstufen, Perioden, Quartalswerte, Prozentwerte und Hinweisrechnungen.
- [ ] Verbindliche Definition festhalten: Welcher Zähler und Nenner gelten bei „Angebote“? 108/192 ist rechnerisch rund 56,3 %, aber die fachliche Definition muss aus Quellen nachgewiesen werden.
- [ ] Bei Quellenwiderspruch die konkrete fachliche Frage Marc vorlegen. Bis zur Klärung die betroffene Rate nicht als bestätigte richtige Zahl ausgeben.
- [ ] Nach Klärung Zähler/Nenner und eine einheitliche Rundung verwenden. Zahlen, Diagramme, Tabellen und lesbare Zusammenfassung müssen aus derselben belegten Quelle kommen.
- [ ] Relevante Regressionen: kein Nenner → „Nicht berechenbar“; Nenner 0 → keine Unendlich-/NaN-Anzeige; 108/192 → festgelegtes gerundetes Ergebnis; Summen der Quartale entsprechen dem Jahreswert.
- [ ] Übrige Bildseiten im Register auf doppelt gepflegte bzw. abweichende Zahlen markieren. Jede Abweichung bekommt Entscheidung, Quelle und zuständige Migrationswelle.

**Abnahme:** Die Funnel-Werte sind fachlich geklärt und in der später ausgelieferten sichtbaren Seite, Tabelle und Screenreaderfassung identisch. Kein Bild allein gilt als Datenquelle für künftige Berechnungen.

## 8. Arbeitspaket C – Ehrliche und einfache Filter

**Dateien:** `src/features/dashboard/components/DashboardFilters.tsx`, `DashboardWorkspace.tsx`, `ConfiguratorFields.tsx`, `src/features/dashboard/model/dashboardFilters.ts`, `src/features/dashboard/data/resolveCrm.ts`; bestehende Filter-/Workspace-Tests und `e2e/personal-dashboard.spec.ts`.

- [ ] Aktive Von-/Bis-Felder aus der normalen Ansicht entfernen, solange keine belegte Zeitfilterung existiert. Kurzer Hinweis bei relevanten Kacheln: „Zeitraumfilter für diese Daten derzeit nicht verfügbar.“
- [ ] Bereits gespeicherte Zeitraumwerte und Startfilter verlustfrei erhalten. Keine Konfigurationsversion ändern und keine alten Werte beim Öffnen/Speichern still entfernen. Entfernen gespeicherter Einstellungen bleibt eine bewusste Nutzeraktion.
- [ ] Pipeline-Fähigkeit pro Kachel berücksichtigen. Historische und Live-Kacheln werden nicht als gefiltert dargestellt, wenn sie den Filter nicht unterstützen.
- [ ] Herkunft einer vollständigen organisationsbezogenen Pipeline-Liste prüfen. Nur bei nachgewiesener vollständiger Quelle eine Auswahl einsetzen; Laden, Ausfall, unbekannter gespeicherter Wert und „Alle Pipelines“ berücksichtigen.
- [ ] Falls eine vollständige Quelle fehlt: Textfeld behalten, verständlich beschriften und sein Such-/Filterverhalten exakt erklären. Keine Liste aus der aktuellen Ergebnisseite als vollständig verkaufen.
- [ ] Mobil Filterbereich zunächst geschlossen; Button mit angewendetem Zustand, z. B. „Filter: 1 aktiv“. Eingabeentwurf und angewandter Filter bleiben unterscheidbar; Schließen verwirft oder bestätigt nichts automatisch.
- [ ] Tests für historische Ansicht ohne CRM-Kachel, angewendete Pipeline, unbekannten gespeicherten Wert, defekten Optionsabruf und Rückkehr aus Details ergänzen.

**Abnahme:** Jede aktive Einstellung hat nachweisbare Wirkung. Unterstützte Kacheln und gültiger Filterzustand sind erkennbar; alte Präferenzen und Sitzungsfilter funktionieren weiter.

## 9. Arbeitspaket D – Neue Muster statt sofortiger Komplettumbau

**Zweck:** Marc prüft konkrete Bilder, bevor die früher freigegebene Gestaltung verändert wird.
**Dateien:** vorhandene Vorschau unter `src/features/dashboard/preview/`; gemeinsam genutzte Bausteine in `src/components/pageKit/`, `src/components/ui/`, `src/styles/global.css`; Fachseitenmuster auf Basis `FunnelPage.tsx`. Im Detailauftrag isolierte Vorschau-/Testpfade nennen, noch keinen globalen Produkt-Schalter ändern.

- [ ] Zuerst F15 beheben (eigener kleiner Detailauftrag vor den Mustern, Register §7): Schließt sowohl das fehlende Token `--color-text-primary` (18 Verwendungen in Dashboard-Dateien) als auch die Shell-Kontraste in den Layout-Komponenten `Header.tsx`, `Sidebar.tsx` und `SimulationBar.tsx` ein (Codex PR #67). Diese Komponenten nutzen feste dunkle Hintergründe (`bg-[rgba(6,22,19,0.85)]`, `bg-[rgba(18,51,48,0.75)]`), während `text-text` und `--color-text-muted` im hellen Theme abgedunkelt werden und so auf allen 42 Ansichten Kontrastverstöße erzeugen. Behebung: themenabhängige Hintergründe für die Shell oder feste helle Kontrasttokens für die dunkle Shell definieren. Nachweis: Kopfzeile, Sidebar, Simulationsleiste, Dashboard-Überschrift und Kachel-Details im hellen Modus lesbar; axe über die ganze Seite (nicht nur `<main>`) ohne `color-contrast` auf allen 42 in Paket 0 aufgenommenen Ansichten. Ohne diesen Schritt sind Musterabnahmen im hellen Modus nicht bewertbar.
- [ ] Drei Richtungen knapp gegenüberstellen: minimale Verdichtung, ruhige Weiterentwicklung der LeadPilot-Marke, weitgehendes Redesign. Empfehlung ist die ruhige Weiterentwicklung.
- [ ] Fünf zusammenpassende Muster erstellen: kompakte Zahlkachel, Verlauf/Verteilung ohne dekorative 3D-Tiefe, mobile Dashboardstartseite, echte Funnel-Fachseite, vereinfachter Editor.
- [ ] Bestehende Farben/Schriften verwenden. Konkrete Typografie, Abstände, Fokuszustände, Warnzustände und Touchflächen aus dem Entwurf in der Vorschau anwenden.
- [ ] Je Muster reale/bereits belegte Inhalte, lange Titel, Fehler, leere Daten und reduzierte Bewegung zeigen. Keine Fantasiezahlen als scheinbare Produktionsdaten.
- [ ] Vorher/Nachher bei 1440/768/375 px im dunklen und hellen Modus nebeneinander prüfen; auch 320 px und vergrößerte Schrift testen.
- [ ] Marc die Muster zur Sichtabnahme vorlegen. Erst danach das neue Design und die Revision der Bildseitenentscheidung dokumentieren. Ohne diese Freigabe bleibt die bisherige Produktdarstellung bestehen.

**Abnahme:** Freigegebene Muster und feste Gestaltungsregeln liegen vor. Das Ergebnis wird nicht durch bloß grüne Screenshot-Tests als gestalterisch genehmigt ausgegeben.

## 10. Arbeitspaket E – Kompaktes Dashboard und mobile Hülle

**Dateien:** `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`, `components/DashboardTile.tsx`, `TileValue.tsx`, `DashboardGrid.tsx`, `DashboardChart.tsx`, `components/charts/`, `model/defaultDashboard.ts`, `model/catalog/`, `components/detail/`; `src/components/layout/Header.tsx`, `SimulationBar.tsx`, `Layout.tsx`. Tests: bestehende Kachel-/Raster-/Layout-Tests, Dashboard-E2E und Screenshot-Harness.

- [ ] Header/Einleitung vereinfachen, Aktionen auf eine kompakte Zeile bringen. Keine zweite große Überschrift ohne inhaltlichen Nutzen.
- [ ] Zahlenkacheln nach dem Muster verdichten. Richtwert 160–220 px bei gewöhnlichen Inhalten; lange Titel, Warnungen und große Schrift vollständig lesbar lassen. Ladezustände reservieren passende Höhe, damit das Raster nicht springt.
- [ ] Quelle/Stand zu einer kurzen Zeile zusammenführen. Redundante historische Hinweise entfernen; nötige Warnungen zu organisationsübergreifenden Live-Werten oder eingeschränkter Qualität sichtbar erhalten.
- [ ] Verständliche Kennzahlnamen einsetzen. Fachabkürzungen optional ergänzen, Definitionen direkt erreichbar machen. Technische Katalog-IDs aus normalen Detailtexten entfernen.
- [ ] Vorgeschlagene Standardpriorität umsetzen: ARR, Umsatz, EBITDA, aktive Kunden zuerst; weitere Kennzahlen und Diagramme geordnet danach. Gespeicherte persönliche Reihenfolgen, IDs und Kacheln bleiben unangetastet.
- [ ] Vorjahres-/Zielvergleich nur für nachgewiesene kompatible Perioden/Einheiten ergänzen. Fehlende Vergleichsdaten → neutrale Anzeige ohne Pfeil/Bewertung. Historischer Stand → kein „heute“-Label. Negative Werte allein begründen keine automatische Zielwarnung.
- [ ] Vorhandene Chart-Komponenten flach gestalten, ohne Konfigurationstypen und gespeicherte Darstellungswerte umzubenennen. Reihen zusätzlich durch Labels, Muster oder Linien unterscheiden; Tooltip, Touchauswahl und „Werte als Tabelle“ erhalten.
- [ ] Leere Rasterflächen und verschachtelte Scrollbereiche überprüfen. Keine automatische Auffüllung, die die persönliche Reihenfolge verändert. Übersichtskacheln zeigen Zusammenfassung und klaren Weg zu den vollständigen Inhalten.
- [ ] Simulationsleiste mobil kompakt darstellen; Details aufklappbar. Start/Pause und gewählte Geschwindigkeit bleiben erreichbar und erkennbar. Nur UI-Dateien ändern; Engine und Tick-Verhalten unberührt.
- [ ] Bei 375 × 812 CSS-Pixeln muss in der normalen Standardansicht ein vollständiger Kennzahlwert ohne Scrollen sichtbar sein. Bei Lade-/Fehlerzustand ist der entsprechende Zustand sofort sichtbar. Keine Zusage für beliebige persönliche Reihenfolgen oder offene Editoransichten.

**Abnahme:** Schneller Überblick, kurze Metadaten, keine unberechtigte Datenbewertung; 0 px globaler horizontaler Überlauf bei 1440/768/375/320. Layoutverschiebung als Ziel höchstens 0,1 unter kontrollierter Messung. Gespeicherte Präferenzen und Lazy Loading funktionieren weiterhin.

## 11. Arbeitspaket F – Editor und Kachelauswahl vereinfachen

**Dateien:** `components/DashboardGrid.tsx`, `EditorToolbar.tsx`, `TileConfigurator.tsx`, `ConfiguratorFields.tsx`, `CombinationPicker.tsx`, `UnsavedChangesDialog.tsx`, `hooks/dashboardEditorReducer.ts`; vorhandene Workspace-/Configurator-Tests und beide Dashboard-E2E-Dateien.

- [ ] Kachelaktionen in eine ruhige Aktionsleiste integrieren. Bereits vorhandenes Desktop-Ziehen deutlicher kennzeichnen; nicht als neue Funktion neu entwickeln.
- [ ] Verschieben bleibt ohne Ziehen möglich: Tastatur und Touch erhalten eindeutig beschriftete erreichbare Aktionen. Nach Verschieben/Entfernen Fokus sinnvoll fortsetzen und die neue Position ansagen.
- [ ] Konfigurator in „Kennzahl“, „Darstellung“, „Vorschau“ und „Erweiterte Einstellungen“ gliedern. Letzteres enthält Kombinationen und zulässige besondere Filter; normale Auswahl kommt ohne diese Details aus.
- [ ] Nicht erlaubte Kombinationen nicht prominent auflisten. Wenn eine Auswahl relevant scheitert, eine kurze fachliche Begründung direkt an der Auswahl zeigen; Validierung bleibt unverändert streng.
- [ ] Eigener Titel, Größe und Kombinationen weiterhin bearbeiten können. Unterschied zwischen Kachel-Hinzufügen zur Arbeitskopie und endgültigem Speichern deutlich machen.
- [ ] Speichern/Verwerfen bleiben beim Scrollen erreichbar, ohne Inhalte oder Bildschirmtastatur zu verdecken. Kein Auto-Save einführen.
- [ ] Sicherungen aus Auftrag 079 erhalten: Konflikte zwischen Sitzungen, Entwurf bleibt nach Konflikt bestehen, Schutz beim Verlassen, Benutzertrennung, Realtime ohne Umordnung und kein Remount der Vorschau bei jeder Texteingabe.

**Abnahme:** Kachel finden, Vorschau prüfen, bearbeiten, verschieben und speichern gelingt auf Desktop/Tastatur/Handy. Kein Funktionsverlust durch versteckte Optionen; vorhandene Konflikt- und Verlassen-Tests bleiben grün.

## 12. Arbeitspaket G – Alle Bildseiten kontrolliert migrieren

**Dateien:** `src/config/pagePresentation.ts`, `src/components/imagePage/ImagePage.tsx`, `imagePages.ts`, `src/components/pageKit/`, betroffene Seitenkomponenten unter `src/features/` und belegte Domäneninhalte. Der genaue Pfadumfang wird pro Welle aus dem Inventar festgelegt. `src/features/resources/**` bleibt ausgeschlossen.

### G1 – Erste ausgelieferte Seite

- [ ] Nach Musterfreigabe Sales Funnel als echte Seite ausliefern. Bestehende HTML-Fassung verwenden, ergänzen und neu gestalten; keine zweite neue Anwendung daneben bauen.
- [ ] Geklärte Werte aus B nutzen. Diagramm, Tabelle, Zusammenfassung und Bildschirmlesefassung aus derselben Quelle speisen.
- [ ] Ganzseitenbild, Zoom-Behelf und abgebildete Simulationsleiste aus der sichtbaren Funnel-Seite entfernen. Logo und Referenzbilder erhalten.
- [ ] Bestehenden globalen Schalter um eine klar begrenzte Seitenfreigabe erweitern: freigegebene Seite HTML, restliche Seiten unverändert Bild. Rückschaltung pro migrierter Gruppe nachvollziehbar ermöglichen.
- [ ] Funnel auf allen Zielbreiten und in beiden Themes abnehmen, inklusive Textvergrößerung und Tastatur. Keine pauschale globale Rückkehr zu v2.3.1.

### G2 – Weitere Wellen

- [ ] Welle mit 3–5 einfachen Seiten aus Unternehmensübersicht/Produkt wählen; tatsächliche Pfade und Freigaben im Detailauftrag festlegen.
- [ ] Anschließend Vertriebs-/Marketingseiten, Finanzen, Kunden/Markt, Organisation/Strategie und Recht nach Abhängigkeiten abarbeiten. Jede Gruppe erneut in 3–5 prüfbare Seiten teilen; keine Welle über den geschützten Resources-Bereich erweitern.
- [ ] Pro Seite Inhaltscheckliste abgleichen: sämtliche Werte, Zeiträume, Quellen, Textabschnitte, Hinweise und Tabellen übernommen oder eine fachlich genehmigte Änderung dokumentiert.
- [ ] Diagramme liefern klare Labels, Einheit, Zeitraum, Tabellenalternative und bei Bedarf Interaktion. Texte umbrechen; lange Tabellen scrollen lokal statt die ganze Seite zu verbreitern.
- [ ] Vergleichstests der Datenquellen/Ansichten ergänzen: identische Werte und Rundung in sichtbarem Text, Tabelle und Diagrammbeschriftung; fehlende/ungültige Daten ehrlich anzeigen.
- [ ] Jede Welle erhält eigene Sichtprüfung, technische Gates, Screenshot-Nachweise und unabhängig prüfbaren PR. Bild-/Textdrift aus dem Register schließen.

### G3 – Abschluss

- [ ] Inventar zählt 32 von 32 ursprünglich betroffenen Seiten mit dokumentiertem Ergebnis; keine ausgelassene Route still als erledigt markieren.
- [ ] Nicht mehr benötigte doppelte versteckte Inhaltsfassung aus der aktiven Darstellung entfernen. Kein Löschen geschützter Referenzdateien oder automatisches Bereinigen von Assets.
- [ ] Architekturentscheidung als Revision ergänzen, neue Darstellungsregel und Rollback dokumentieren. Bestehende Release-Historie nicht überschreiben.

**Abnahme:** Alle 32 Seiten sind lesbar, inhaltlich vollständig und nach der neuen Entscheidung freigegeben. Keine nicht bedienbaren abgebildeten Buttons; Bildschirmleser erhalten denselben Inhalt wie sehende Nutzer. Kein Ganzseitenbild ersetzt die eigentliche Text-/Tabellendarstellung.

## 13. Arbeitspaket H – Navigation, Kontoaktionen und Sprache

**Dateien:** `src/components/layout/Sidebar.tsx`, `Header.tsx`, `Layout.tsx`, `src/components/ui/NavItem.tsx`, Routenmetadaten unter `src/app/`, betroffene Beschriftungen in CRM/Details/Page-Kit. Vorhandene Header-/Sidebar-/NavItem-Tests und `e2e/routes.spec.ts`, `auth.spec.ts`.

- [ ] Aktuelle Seite deutlich markieren: aktiver Zustand muss sich von Hover und aufgeklapptem Abschnitt unterscheiden. Kategorie und Route bleiben nachvollziehbar.
- [ ] Navigation nach häufigen Aufgaben ordnen, Fachbereiche einklappbar belassen; keine Route oder Administration still entfernen. Zunächst klare Gruppierung, keine zusätzliche globale Suche ohne nachgewiesenen Bedarf.
- [ ] Abmelden als sichtbare Profilaktion auf Desktop und Handy anbieten. Vorhandene Auth-Funktion nutzen; Schutz ungespeicherter Änderungen beibehalten. Unsichtbaren Hover-Button ersetzen.
- [ ] Sprachliste erstellen und anwenden: „Vertriebsphase“, „Teamgröße“, „Gesamtkosten pro Neukunde“, „Daten aus dem CRM“. Fachkürzel ARR/MRR/EBITDA mit verständlicher Erklärung erhalten.
- [ ] Fachliche Ebenen nicht verschweigen: historische Unternehmensdaten, CRM-Daten und Simulation verständlich unterscheiden. Entwicklerbegriffe in einen technischen Detailbereich verschieben.
- [ ] Leer-/Fehlertexte sagen, was fehlt und welchen nächsten Schritt es gibt. Keine falsche Erfolgsmeldung, kein unbelegter Vorschlag „Importieren“, wenn dieser Benutzer die Aktion nicht ausführen darf.
- [ ] Fokus beim Menüöffnen/-schließen, Escape, Hintergrundsperre, Rückgabe zum Auslöser, Touch und Benutzerwechsel testen.

**Abnahme:** Marc findet aktuellen Standort, passende Fachseite und Abmelden ohne Suchspiel. Begriffe sind konsistent; wichtige Datenunterschiede bleiben verständlich sichtbar.

## 14. Pflichtgates für jedes Umsetzungspaket

Der jeweilige Detailauftrag ergänzt diese gemeinsamen Gates um konkrete Regressionen. Prüfungen laufen gegen den tatsächlichen neuen Head. Keine Freigabe aus alten Protokollen ableiten.

```bash
npx tsc --noEmit
npm run lint
npm test
npm run verify
npm run build
npm run format:check
```

Alle Befehle müssen mit Exit-Code 0 enden. `verify` sind die Integrity-Suiten; `test` ist die Vitest-Suite, beide sind erforderlich. Kein Umschreiben von Tests zur bloßen Bestätigung einer optischen Änderung ohne relevante Verhaltenserwartung.

Zusätzlich:

- [ ] Gezielte E2E für betroffene Abläufe mit reproduzierbaren Testdaten fahren. Bei Serverfehlern kontrollierte Antworten nutzen, erfolgreiche reale Integration separat prüfen.
- [ ] Screenshot-Paare vorher/nachher bei 1440/768/375 px, beiden Themes und vollständig geladenen Inhalten. SHA-256-Unterschiede belegen Veränderung, nicht Schönheit. Jede Änderung manuell prüfen.
- [ ] 320 px, 200-%-Textvergrößerung, reduzierte Bewegung, Tastatur, Touch, lange Texte, leere Daten und Fehler testen. Für Reflow zusätzlich 320 CSS-px/400-%-Zoom prüfen; Tabellen-Ausnahmen lokal behandeln.
- [ ] Automatisierter Accessibility-Scan ohne serious/critical Befunde; ergänzend Kontrast und Fokus manuell prüfen. Keine pauschale WCAG-Zertifizierung aus einem Scan behaupten.
- [ ] 0 px globaler horizontaler Überlauf; keine verdeckten Bedienelemente. Lade-/Warnzustände dürfen die Höhe nicht unkontrolliert verändern.
- [ ] Vorhandene Qualitäts-/Bundlebudgets weiter erfüllen; Lighthouse-Schwellen aus der bestehenden CI beibehalten. Kein zweites Bibliothekensystem für die neue Gestaltung.
- [ ] Schutzbereichs-Diff gegen den im Detailauftrag genannten Ausgangscommit leer prüfen: `git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources`.
- [ ] BUILD_LOG um tatsächlichen Befund, Entscheidung, ausgeführte Prüfungen und offenen Freigabestatus ergänzen.
- [ ] Lokale Bilder nach Repo-Policy nicht committen; textuelle Screenshot-Matrix committen. Bestehende Linux-E2E-Referenzen ausschließlich über den vorgesehenen Baseline-Workflow aktualisieren, nach Sichtprüfung und Stabilitätsnachweis.

## 15. Arbeitspaket I – Gesamtabnahme und Rollout

**Tests/Unterlagen:** `e2e/personal-dashboard*.spec.ts`, `crm-query-export.spec.ts`, `semantic-routes.spec.ts`, `a11y.spec.ts`, `visual.spec.ts`, `auth.spec.ts`; neue finale Abnahmematrix unter `docs/reviews/`, tatsächliche BUILD_LOG-Ergebnisse, aktualisierter BUILD_PLAN und Architekturrevision.

- [ ] Standardansicht und bestehende persönliche Dashboards prüfen: neue/alte Präferenzen, zwei Benutzer, zwei Sitzungen, Konfliktfall, leere Ansicht, ungültige/neuere Konfiguration, Filterrückkehr, Realtime und Lazy Loading.
- [ ] CRM-Integration mit Erfolg, 0 Ergebnissen, Fehler, langsamer Antwort, erneutem Versuch und fehlenden Exportrechten prüfen. Navigation bleibt in jedem Zustand möglich.
- [ ] Alle Fachseiten gegen das Inventar abgleichen, inklusive sichtbarer und vorgelesener Daten. Offene Fachfragen blockieren nur ihre betroffenen Teile; sie verschwinden nicht aus dem Register.
- [ ] Marc führt fünf praktische Aufgaben aus: wichtigste Zahl finden; Kennzahl verstehen; Pipeline filtern; Kachel ändern und speichern; mobil Funnel lesen und abmelden. Klickwege, Missverständnisse und notwendiges Zoomen protokollieren. Das ist ein kleiner Nutzertest, keine repräsentative Nutzerstudie.
- [ ] Vorher/Nachher vergleichen: erster sichtbarer Kennzahlwert, Inhaltshöhe der unveränderten Vergleichskonfiguration, Lesbarkeit, Fehlerklarheit und Erreichbarkeit zentraler Aktionen. Kürzere Seite allein ist kein Erfolg, wenn Daten verloren gehen.
- [ ] Codex prüft finalen Head unabhängig; Marc nimmt die Gestaltung ab. Neue Referenzbilder erst danach übernehmen, alle erforderlichen CI-Prüfungen auf genau diesem Stand grün.
- [ ] Release-Ziel mit laufendem v2.4.0-Plan abstimmen. Alte Dashboardansicht nicht vorzeitig entfernen; deren Entfernung bleibt ein eigener ausdrücklich beauftragter Schritt.
- [ ] Rückweg je geänderter Darstellungsgruppe dokumentieren und testen: persönliche Konfigurationen bleiben erhalten; keine Datenbankänderung für rein optischen Rollback. Kein `git reset --hard` als lokale Anleitung.
- [ ] Marc entscheidet Merge und Veröffentlichung. Nach Auslieferung einmalige Funktionsprüfung durchführen; zusätzliche Überwachung nur auf gesonderten Auftrag.

**Gesamtergebnis gilt erst als abgenommen, wenn:** F01–F15 jeweils erledigt oder als ausdrücklich genehmigte Ausnahme mit Begründung geführt sind; alle 32 Seiten geprüft sind; alte persönliche Einstellungen weiter funktionieren; aktuelle Gates und Sichtabnahmen vorliegen. Ein Plan oder neue Screenshots allein erfüllen diese Bedingungen nicht.

## 16. Konkrete Übergabe an den Builder

Zunächst nur Arbeitspaket 0 und daraus den Diagnoseauftrag A ausarbeiten. Keine flächendeckende Stiländerung und kein globales Umstellen von `PAGE_PRESENTATION` zu Beginn. Danach B/C, anschließend die fünf Designmuster D zur Sichtabnahme vorbereiten. Jeder Detailauftrag nennt exakt seine Dateien, Regressionen, Schutzbereich und Ausgangscommit.

Der Plan ist bewusst ein Masterplan mit prüfbaren Ergebnissen. Die exakten Reparaturstellen des Pipelinefehlers, die vollständige Pipeline-Auswahlquelle und die endgültige Dateiliste jeder Seitenwelle werden aus den vorgesehenen Untersuchungen abgeleitet. Sie werden nicht als bereits feststehend erfunden. Neue öffentliche Schnittstellen sind hier nicht vorgegeben; bestehende Props, Datenverträge und Konfigurationswerte bleiben der Ausgangspunkt.
