# Auftrag 144 – Dashboard-Editor: Bestandsprüfung und Baugrundlage (P01)

**Ziel:** Den aktuellen Dashboard-Editor, sämtliche aktiven Katalog-Kennzahlen und die technischen Voraussetzungen für den geplanten Umbau mit überprüfbaren Nachweisen erfassen.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P01 sowie Abschnitte 2, 4, 7 und 9.

**Baseline bei Auftragserstellung:** `main`, Commit `b9e04f5c5d49fabad5b5484ec44216536f61827c`. Der ausführende Agent dokumentiert zusätzlich seinen tatsächlichen Ausgangscommit. Bei abweichendem Stand Bestandsaussagen neu prüfen; keine historischen Testergebnisse als aktuellen Nachweis übernehmen.

**Builder:** Marc bestimmt den ausführenden Agenten bei Übergabe. Das historische Dateipräfix legt die Rolle nicht fest. **Prüfer:** ein anderer Agent gemäß `CLAUDE.md` §4.1; der ausführende Builder darf den eigenen Stand nicht freigeben. **Merge und Release:** Marc.

**Status:** Gate-Freigabe-Voraussetzungen erfüllt (Codex-Review auf Commit `9c27433` ohne Befunde; Pflicht-Checks grün). Bereit für Merge durch Marc.

## 1. Ergebnis dieses Auftrags

Der erste Auftrag liefert die Entscheidungsgrundlage für P02 (Bedienkonzept/Rechte) und P03 (Rasterengine/Zielschema). Er verändert keine Produktfunktion. Die erste Umsetzung am Editor-Kern folgt laut Masterplan in P04 nach diesen Vorarbeiten.

Am Ende liegen vor:

- Ein Bestandsbericht mit Codebelegen, Browserbefunden, Datenwegen und wiederverwendbaren Bausteinen.
- Eine vollständige Fähigkeitsmatrix aller aktiven Katalogeinträge, einschließlich begründeter Grenzen für Filter, Historie und Alarme.
- Eine Machbarkeitsprüfung des serverseitigen Alarmbetriebs mit Ausführungswegen, offenen Betriebsfragen und Entscheidungsempfehlung.
- Eine lokale Screenshot-Matrix sowie aktuelle Ergebnisse der Pflichtprüfungen und ein Builder-Eintrag im BUILD_LOG.

## 2. Verbindliche Grenzen

1. `CLAUDE.md` vollständig lesen, danach `ARCHITECTURE_DECISIONS.md`, den aktuellen Teil von `BUILD_PLAN.md`, die einschlägigen Einträge in `docs/BUILD_LOG.md` und den Masterplan. Historische Rollen-/Rolloutangaben nicht über die aktuellen Regeln stellen.
2. Ausschließlich LeadPilot-/CRM-Kennzahlen. Keine Kafka-/MQTT-/Kinesis-/SQL-Fremdplattform, keine freien Abfragesprachen, keine KI-Anbindung und keine externen Benachrichtigungen bauen.
3. Team bedeutet Freigabe-/Empfängerkreis innerhalb einer Organisation. Team-/Owner-bezogene Deal-Kennzahlen sind ohne gesonderten Schemaauftrag ausgeschlossen. Die konkrete Rechtematrix wird erst in P02 entschieden; P01 erfasst vorhandene Regeln und offene Fragen.
4. Kein Produktcode, keine Migrationen/RPCs/RLS, keine Persistenz- oder Rollenänderungen. Schutzbereiche aus `CLAUDE.md` §6 bleiben unverändert. Keine neuen Abhängigkeiten, kein Scheduler, keine Cloud-Ressource und kein Deployment einrichten.
5. Keine Änderungen an gehosteten Nutzerdaten, Dashboards, Alarmen oder Konten. Browserabläufe nur in einer vorhandenen lokalen Testumgebung mit synthetischen Daten durchführen. Falls ein vorhandener Testharness schreibt, darf er ausschließlich seine dafür bestimmte lokale Testdatenbank verwenden. Bei unklarem Ziel nicht starten.
6. Keine Secrets, Rohdatensätze oder identifizierbaren CRM-Inhalte in Bericht, Screenshots oder Logs übernehmen. `.env`, `node_modules/`, `dist/` und `.codex/` nicht einlesen. Vorhandene unterstützte Test-/Loginwege verwenden; keine Zugangsdaten im Chat anfordern.

Die lokale Planung ist bei Auftragserstellung noch nicht versioniert. Vor einem späteren Branchwechsel/der Ausführung gelten die Dirty-Worktree-Regeln aus `AGENTS.md`: Marc entscheidet über Commit/Sicherung. Kein Stash, kein Verwerfen und kein Überschreiben. Dieser Auftrag erteilt dafür keine Ausnahme. Auch den Masterplan nicht eigenmächtig ersetzen oder auslassen.

## 3. Ziel-Dateien

| Pfad                                                                          | Erlaubte Änderung / Zweck                                                                                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/dashboard/EDITOR_BESTAND_144.md`                                        | Neu: Befunde, Datenfluss, Wiederverwendung, Lücken, Entscheidungen für P02/P03 und Alarm-Machbarkeit                                           |
| `docs/dashboard/KPI_FAEHIGKEITEN_144.md`                                      | Neu: vollständige Matrix aktiver Einträge und Abdeckungsnachweis                                                                               |
| `docs/screenshots/auftrag-144/README.md`                                      | Neu: textuelle Matrix der lokalen Bestandsaufnahmen; keine Bilddateien committen                                                               |
| `scripts/captureAuftrag144EditorBestand.mjs`                                  | Optional neu: kleiner Aufnahmeharness nach bestehendem Muster, falls vorhandene Harnesses die Bestandsfälle nicht abdecken; keine Produktlogik |
| `docs/BUILD_LOG.md`                                                           | Builder-Eintrag und später Prüfergebnis als Nachtrag                                                                                           |
| `BUILD_PLAN.md`                                                               | Ausschließlich aktuellen Status/Verweis zu Auftrag 144 ergänzen; historische Abschnitte erhalten; keine Freigabe von P02 behaupten             |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md` | Checkboxen und tatsächlich erreichten Status dokumentieren                                                                                     |

Der Masterplan ist verbindliche Lesequelle und in diesem Auftrag kein Änderungsziel. Neu entdeckte Widersprüche im Bericht festhalten und Marc vor abhängiger Umsetzung vorlegen. Alle anderen Dateien bleiben unverändert. Keine vorsorgliche Bereinigung oder Fehlerbehebung.

## 4. Prüfschwerpunkte

| Fall                                                | Erwarteter Nachweis                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Persönliche Layoutrechte eines Viewers              | Gestaltung/Speicherung von CRM-Schreibrechten unterscheiden; geltende UI-, RPC- und RLS-Regeln benennen                 |
| Organisationswechsel, Logout und Revisionskonflikte | Schutz des gespeicherten Standes, Cache-/Abo-Verhalten und mögliche Lücken belegen                                      |
| Veraltete oder unvollständige Live-/CRM-Daten       | Historie nicht mit aktuellem Snapshot verwechseln; 30-Punkte-Grenzen und Datenherkunft nachvollziehen                   |
| KPI aus paginierten CRM-Listen                      | Erkennen, ob vollständiger berechtigter Bestand oder nur geladene Seite aggregiert wird                                 |
| Browser geschlossen / Ersteller ausgeschieden       | Fehlende Serverauswertung und Betriebs-/Eigentumsvoraussetzungen erfassen; keine vorhandene Alarmfähigkeit unterstellen |

Dies sind Prüfaufträge, keine vorweggenommenen Fehlerbefunde. „Vorhanden“, „fehlt“, „nicht unterstützt“ und „nicht geprüft“ getrennt verwenden.

## 5. Aufgaben in Reihenfolge

### T1 – Ausgangslage und Prüfumgebung dokumentieren

- [x] Arbeitsbaum und Branch prüfen, tatsächlichen Ausgangscommit und Dokumentversionen im Bericht festhalten. Bei fremden oder ungeklärten Änderungen gemäß `AGENTS.md` stoppen und Marc informieren.
- [x] Lokale App-/Testumgebung und sichere Testdatenbasis identifizieren. Keine neue Anmeldung, Datenbank oder Cloud-Ressource voraussetzen. Fehlende Voraussetzungen konkret als Blocker dokumentieren.
- [x] Vorhandene Pflichtchecks, Dashboard-Tests, Screenshot-Harnesses und Größen-/Qualitätsbudgets erfassen. Vorhandene Abhängigkeiten nutzen.

Einstiegspunkte: `package.json`, `.github/workflows/ci.yml`, `e2e/personal-dashboard.spec.ts`, `e2e/personal-dashboard-acceptance.spec.ts`, `e2e/dashboard-config-states.spec.ts`, `scripts/captureAuftrag128Gate.mjs`, `scripts/captureAuftrag079Screenshots.mjs`. Vor Ausführung eines Harness prüfen, auf welche Umgebung er zugreift.

**Abnahme T1:** Der Bericht benennt den geprüften Commit, reproduzierbare lokale Abläufe und die Grenzen der Prüfumgebung.

### T2 – Editor, Zustandsführung und Persistenz prüfen

- [x] Den Weg Seite → Arbeitsbereich → Editor-Hooks/Reducer → Raster/Konfigurator → Datenauflösung → Speicherung als Textdiagramm und Dateiliste dokumentieren.
- [x] An den Implementierungen Raster-/Größenmodell, Drag-Verhalten, Mindestgrößen, Vorschau, Undo/Redo, Speichern/Abbrechen, Navigationsschutz, Fehlerzustände und Reportexport nachweisen.
- [x] Formatversion, Kachellimit, JSON-Größenlimit, zulässige Schlüssel, erwartete Revision, unbekannte Version und Erhalt nicht verfügbarer Kacheln auf Client und Server abgleichen.
- [x] Auth-/Organisationsbezug, Cache-Schlüssel, Abo-Lebenszyklus und Rolle des organisationsübergreifenden Live-Feeds nachvollziehen. Quellcodebefund von reproduziertem Laufzeitverhalten trennen.

Primäre Lesequellen: `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`, `components/DashboardWorkspace.tsx`, `DashboardGrid.tsx`, `TileConfigurator.tsx`, `hooks/useDashboardEditor.ts`, `useDashboardEditorHistory.ts`, `dashboardEditorReducer.ts`, `useDashboardPreferences.ts`, `data/dashboardPreferencesRepository.ts`, `model/dashboardConfig.ts`, `model/dashboardValidation.ts` sowie `supabase/migrations/20261004_executive_dashboard_preferences.sql` und zugehörige Tests. Pfade ohne vollständiges Präfix beziehen sich auf `src/features/dashboard/`.

**Abnahme T2:** Jede wesentliche Bestandsaussage enthält Dateipfad und Symbol oder Zeilenbezug. Die spätere V1-Kopiermigration und das Zielschema werden noch nicht implementiert oder endgültig entworfen.

### T3 – Vollständige KPI-Fähigkeitsmatrix erstellen

- [x] Alle aktiven Einträge aus `DASHBOARD_CATALOG` über `getActiveEntries()` ermitteln. Kataloganzahl, Matrixanzahl, eindeutige IDs und fehlende/zusätzliche IDs vergleichen; jede aktive ID erhält genau eine Zeile.
- [x] Pro Eintrag die tatsächliche Auflösung bis zur Quelle verfolgen; Deklaration im Katalog allein reicht nicht als Nachweis einer fachlichen Fähigkeit.
- [x] Für aktuell vorhandene Kernkennzahlen die Aggregation über vollständigen Datenbestand, Filterunterstützung, Einheiten und Zeitbasis prüfen. Fehlende Nachweise einzeln markieren; keine unbekannte Fähigkeit mit „ja“ belegen.
- [x] Live-Store, Adapter, Auflösung und CRM-Ereignis-/Snapshotdaten auf historische Aussagefähigkeit untersuchen. Rekonstruierbare Flusswerte von historischen Bestandswerten unterscheiden.

Die Matrix enthält je aktiver Katalog-ID mindestens:

| Feldgruppe              | Pflichtangaben                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identität und Herkunft  | ID, Name, Kategorie, Quelle/Resolver, Layer Baseline/CRM/Live/Kombination, Organisation oder organisationsübergreifend                                         |
| Fachliche Bedeutung     | Einheit, Datenform, Zeitbasis, Bestands-/Fluss-/Verhältnisgröße, zulässige Aggregation                                                                         |
| Darstellung und Filter  | Unterstützte Ansichten, Mindestgröße, Zeitraum-/Pipelinefähigkeit, belegte Gruppierung; keine Team-/Owner-Filter erfinden                                      |
| Aktualität und Historie | Push/Refetch/fester Stand, Ereigniszeitpunkt, verfügbarer Verlauf, Punkte-/Abrufgrenzen, historische Rekonstruierbarkeit und Datenlücken                       |
| Vollständigkeit         | Vollbestand oder Teilmenge; Pagination/Aggregationspfad, Nachweis und bekannte Einschränkung                                                                   |
| Alarmvorbereitung       | Aktuelle Serverberechnung vorhanden oder fehlend; Paritätsnachweis vorhanden/fehlend; im Hauptumfang ausgeschlossen oder späterer Kandidat mit Voraussetzungen |
| Beleg und Prüfung       | Dateipfad/Symbol, Codeprüfung oder Laufzeitprüfung, offene Frage und zugehöriges Folgepaket                                                                    |

Bei Kombinations-KPIs zusätzlich Operanden, Formel, Zeitbezug und fachliche Freigabe prüfen. Statische Baseline-/Planwerte sowie der organisationsübergreifende Feed bleiben als Alarmquellen im Hauptumfang ausgeschlossen. Ein CRM-KPI wird durch diesen Audit nicht automatisch alarmfähig: P13 muss Client-/Server-Parität nachweisen.

Lesequellen: `model/dashboardCatalog.ts`, `model/catalog/`, `data/resolveCrm.ts`, `resolveBaseline.ts`, `resolveLive.ts`, `resolveCombination.ts`, `hooks/useDashboardData.ts`, `src/services/liveKpi/`, einschlägige Domain-Fachfunktionen und CRM-Lesewege. Geschützte Dateien dürfen hierfür gelesen, niemals geändert werden.

**Abnahme T3:** Matrix deckt 100 % der aktiven IDs ab; doppelte IDs und unbelegte Ja-Aussagen sind ausgeschlossen. Nichtaktive Einträge werden nur separat gezählt und bei relevantem Migrationsbezug erklärt.

### T4 – Teamfreigaben und Alarmbetrieb auf Machbarkeit prüfen

- [x] Organisationsrollen, aktive Mitgliedschaft und persönliche Layoutrechte anhand Schema, RLS/RPCs und UI erfassen. Fehlendes Team-/Mitgliedschaftsmodell sowie fehlenden Team-/Owner-Bezug an Deals bestätigen oder einen abweichenden aktuellen Stand belegen.
- [x] Anforderungen für Freigabegruppen, organisationsgebundenes Eigentum und Ersteller-Austritt/Rollenverlust sammeln. Offene Verwaltungs- und Rechteentscheidungen für P02 formulieren; keine davon stillschweigend als beschlossen ausgeben.
- [x] Vorhandene Server-Rechenwege mit browserseitigen KPI-Funktionen vergleichen. Kandidaten für gemeinsame reine Fachlogik und notwendige Paritätsfälle für P13 benennen.
- [x] Alarm-Ausführung über ausdrücklich eingerichteten Datenbank-Zeitplan, zeitgesteuerte Edge Function und externen Scheduler vergleichen. Je Weg Voraussetzungen, Verfügbarkeit im tatsächlichen Hosting, Authentifizierung/Dienstkonto, Intervallgrenzen, Fehlerbehandlung, Kostenbasis und Überwachung des Workers selbst beschreiben.
- [x] Einen begründeten Betriebsweg empfehlen und offene Verifikation für P13 ausweisen. Hosting-Tarif oder Ressourcen nicht aus Zugangsdaten erraten; unbekannte Konto-/Tarifdetails als offen markieren. Bei Bedarf offizielle aktuelle Dokumentation verwenden und verlinken. Keine externen Jobs oder Testalarme anlegen.

**Abnahme T4:** Der Bericht unterscheidet technisch belegt, anbieterabhängig und noch zu entscheiden. Er enthält Anforderungen für Ausfall-Lebenszeichen, Deduplizierung, Neustart, No-Data und pausierte Regeln nach Rechteverlust. Die Betriebsentscheidung fällt spätestens vor P13; P01 liefert die Machbarkeit.

### T5 – Aktuelle Oberfläche und Regressionen belegen

- [x] `/dashboard` sowie den tatsächlichen Bearbeitungsmodus in der sicheren lokalen Testumgebung prüfen: Start/Ende, Hinzufügen, Auswahl/Konfiguration, Verschieben, Größenwahl, Undo/Redo, Speichern, Abbrechen und Verlassen bei offenen Änderungen.
- [x] Vorhandene Tests für Revisionenkonflikt, unbekannte Konfigurationsversion, nicht verfügbare Kachel, Offline/Fehler und Sitzungsablauf zuordnen und ausführen, soweit lokal unterstützt. Nicht abgedeckte Fälle im Bericht markieren; Produktfehler nicht innerhalb dieses Auftrags reparieren.
- [x] Bestandsaufnahmen für Lesen, Bearbeiten und geöffneten Konfigurator erstellen: 1440/768/375 px, hell/dunkel. Lokale Bildpfade, SHA-256, Szenario, Theme, Breite und gemessenen horizontalen Überlauf in der Screenshot-Matrix dokumentieren. Tatsächliche Verfügbarkeit eines lokalen Zustands prüfen, bevor er als aufgenommen gilt.
- [x] Tastaturbedienung/Fokus und mobile Größen-/Verschiebealternativen prüfen; Beobachtung und Reproduktionsschritte dokumentieren.

P01 verändert die UI nicht. Deshalb braucht es Bestandsaufnahmen statt künstlicher Vorher/Nachher-Paare mit unterschiedlichen Hashes. Festgestellter Überlauf ist ein Auditbefund und wird nicht verschwiegen; bei späteren UI-Aufträgen gilt das reguläre 0-px-Gate. Bilddateien verbleiben lokal. Falls der optionale neue Harness entsteht, dessen Syntax und tatsächlichen Lauf prüfen.

**Abnahme T5:** Für alle 18 vorgesehenen Aufnahmen (3 Zustände × 3 Breiten × 2 Themes) existiert ein lokaler Nachweis oder ein konkreter Blocker. Bei offenen Pflichtfällen ist das Browseraudit unvollständig und darf keine uneingeschränkte Abnahme erhalten.

### T6 – Verifizieren, dokumentieren und übergeben

- [x] Pflichtchecks auf dem tatsächlichen Stand ausführen und Befehl, Exitcode und Ergebnis protokollieren:

```bash
npx --no-install tsc --noEmit
npm run lint
npm run format:check
npm run verify:quality-budget
npm test
npm run verify
npm run build
npx --no-install size-limit
```

- [x] Dashboard-E2E über den vorhandenen unterstützten seriellen Ablauf ausführen; `E2E_DASHBOARD_SERIAL` und weitere Voraussetzungen aus aktueller CI/Tests übernehmen. Keine konkurrierenden Läufe gegen dieselbe Testpräferenzzeile. Exakten Aufruf und Ergebnis dokumentieren. Kein neuer Migrationslauf erforderlich, da Schema unverändert bleibt.
- [x] Neue Markdown-Dateien explizit mit dem vorhandenen Prettier prüfen; `npm run format:check` prüft nur `src` und ersetzt diese Dokumentprüfung nicht. Optionalen Harness mit `node --check` prüfen.
- [x] Schutzbereichs-Diff gegen den in T1 erfassten Ausgangscommit prüfen; er muss leer sein. Darüber hinaus alle Änderungen mit der Ziel-Dateien-Liste abgleichen.
- [x] Bericht mit priorisierten Befunden, wiederverwendbaren Modulen, Lücken und klaren Fragen für P02/P03 abschließen. Aktuellen BUILD_PLAN-Verweis und Builder-Eintrag ergänzen, Prüfstatus korrekt benennen.
- [ ] Ein Auftrag je PR nach Projektworkflow. Ein unabhängiger Agent prüft Bericht, Matrixvollständigkeit und Nachweise auf aktuellem Head. Befunde innerhalb des Auftragsumfangs nacharbeiten; fachlich weitergehende Reparaturen separat vorschlagen. Prüfergebnis später im BUILD_LOG protokollieren. Nicht mergen und keinen Release erstellen.

Fehlende lokale Dienste, Tools oder Berechtigungen sind kein grüner Check. Betroffene Prüfungen mit Ursache als nicht ausgeführt kennzeichnen; kein Umgehen von Gates. Eine bereits vorgefundene rote Baseline wird mit Reproduktion und Zuständigkeit erfasst und erteilt keine automatische Freigabe für P02.

## 6. Abschlusskriterien

- [x] Bestandsbericht enthält Quellcodebelege, Browsernachweise, Datenwege und Prioritäten.
- [x] Fähigkeitsmatrix deckt alle aktiven Katalog-IDs exakt einmal ab; Zählung und Differenzlisten sind dokumentiert.
- [x] Team-Freigaben und Organisationsdatenbereich sind sauber getrennt; offene Rechtefragen stehen für P02 bereit.
- [x] Historie, aktuelle Snapshots, Pagination und organisationsübergreifender Feed werden fachlich korrekt unterschieden.
- [x] Alarm-Machbarkeit inklusive Hostinggrenzen, Serverparität und Worker-Ausfall ist prüfbar beschrieben; keine neue Infrastruktur wurde eingerichtet.
- [x] Screenshot-Matrix und Pflichtprüfungen vollständig; offene Blocker führen zu eingeschränktem bzw. ausstehendem Gate-Status.
- [x] Nur freigegebene Ziel-Dateien geändert; Schutzbereichs-Diff leer; BUILD_LOG vollständig.
- [ ] Unabhängiger Prüfer ohne offene Befunde auf aktuellem Head, Pflichtchecks grün und Review-Konversationen gelöst. Merge macht Marc.

## 7. Übergabe an P02

Die Übergabe nennt die tatsächlich freigegebene Basis, die beiden neuen Berichte und die Screenshot-Matrix. P02 erhält insbesondere die offenen Entscheidungen zu Gruppenverwaltung, Manager-Freigaben, mobiler Bearbeitung und priorisierten KPI-/Historienfällen. P03 erhält die belegten V1-Verträge und die Anforderungen an das vollständige Zielmodell. P13 erhält den Machbarkeitsbefund des Alarmbetriebs.

Der Builder meldet „Bestandsprüfung fertig“ erst nach den Nachweisen; vor dem unabhängigen Review lautet der Status ausdrücklich „lokal geprüft, unabhängiges Review ausstehend“. Das Erstellen des Auftrags allein ändert den BUILD_PLAN-Fortschritt und die P01-Checkboxen nicht.
