# Auftrag 174a – Dashboard-Editor V2 nach dem Smoke-Test stabilisieren

**Status:** Umgesetzt (Builder Claude Code, Bestätigung Marc 24.11.2026), Review ausstehend.
**Basis:** `main` nach Merge von PR #221 (`8b481c63`).
**Ziel:** Der Editor bleibt beim Verkleinern bedienbar. Kacheln überdecken einander nicht. Speichern und Abbrechen funktionieren vollständig in V2.
**Herkunft der Befunde:** Hosted-Smoke-Test nach Aktivierung von Stufe 1 und lokaler Browser-Audit vom 24.11.2026. Die Rohbilder und Prüfprotokolle bleiben lokal. Befundtexte und Reproduktion stehen unten in §1 und §2.

## 1. Befunde und Abnahme

### Befundbeschreibung (Smoke-Test 24.11.2026)

- **L1 – Raster verliert zu viel Platz.** Widget-Bibliothek (280 px) und Inspector (320 px) bleiben beim Verkleinern geöffnet und belegen zusammen 600 CSS-Pixel. Bei 1059 px Fensterbreite blieben dem Arbeitsbereich in der Vorschau 459 px, bei 768 px nur 168 px. Ein direkter Start bei 768 px öffnet beide Seitenbereiche eingeklappt.
- **L2 – Kachelinhalte überlappen.** KPI-Zahlen ragen über die Kachelgrenzen. Titel und Metadaten brechen teils mitten im Wort um. Inhalt aus oberen Kacheln wird von der folgenden Reihe verdeckt.
- **L3 – Rechte Seite angeschnitten.** In der gehosteten App waren rechts Bedienelemente und Teile der Dashboard-Info abgeschnitten.
- **L4 – „ARR-Verlauf“ überdeckt Nachbarkacheln.** Der untere Kachelbereich mit Zeitauswahl, „Werte als Tabelle“ und Detailaktion ragt über die markierte Rasterfläche hinaus. Der Resize-Griff endet an der markierten Fläche.
- **L5 – Diagramm rechts abgeschnitten.** Linie und letzte Zeitachsen-Beschriftung enden am Rand des Ausschnitts. Darunter erscheint eine horizontale Scrollleiste.
- **L6 – „Speichern“ und „Abbrechen“ bei 375 px außerhalb des sichtbaren Bereichs.** „Abbrechen“ beginnt bei x = 440, „Speichern“ bei x = 565. Die Aktionsgruppe ist 662 px breit, die Editor-Hülle blendet den Überstand aus. Ein Test auf den Dokument-Überlauf erkennt das nicht.
- **L7 – Dashboard-Info bildschirmfüllend nach dem Verkleinern.** Auf dem Desktop waren beide Seitenbereiche offen. Nach dem Verkleinern auf 375 px liegt die Dashboard-Info über der Arbeitsfläche, obwohl sie nicht aufgerufen wurde. Ein frischer Aufruf bei 375 px zeigt die Bearbeitungsliste.
- **F1 – „Im Panel-Editor öffnen“ ohne Wirkung.** Der Inspector ruft eine optionale Öffnen-Funktion auf, die die Dashboard-Seite nicht übergibt. Der Button reagiert weder auf Klick noch auf Enter.
- **F2 – „Abbrechen“ wechselt zur alten Editor-Version.** Ein Klick ohne offenen Entwurf setzt im Browser-Tab einen V1-Override (`sessionStorage` `lp_dashboard_editor_v2 = false`) und lädt die Seite neu. Danach ist V1 sichtbar, auch nach erneutem Neuladen.

### Abnahmekriterien

| Befund     | Abnahmekriterium                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1, L3, L7 | In der vollständigen App bei 1440 px mit beiden Seitenbereichen und einem Entwurf starten. Auf 1280, 1059, 1024, 900, 768 und 375 px verkleinern, dann wieder auf 1440 px vergrößern. Der Editor passt sich an seine verfügbare Breite an. Seitenbereiche bleiben erreichbar, die Dashboard-Info erscheint beim Resize nicht ungefragt über der Arbeitsfläche. Entwurf und gespeicherte Layouts bleiben erhalten. |
| L2, L4     | KPI-Zahl, Einheit und Kacheltitel bleiben in ihrer Karte lesbar. Die Auswahlgrenze, der Resize-Griff und die sichtbare Chart-Kachel passen zur belegten Rasterfläche. Zeitwahl, Wertetabelle und Details bleiben erreichbar. Nachbarkacheln bleiben sichtbar und bedienbar. Prüfen im Bearbeitungsmodus und in der Vorschau, auch nach Ändern der Kachelgröße.                                                    |
| L5         | „ARR-Verlauf“ mit den bekannten Quartalsdaten prüfen. Letzter Datenpunkt und zugehörige Zeitangabe sind erreichbar und lesbar. Falls der Chart absichtlich horizontal scrollt, funktioniert der Zugang zum Ende per Maus, Touch und Tastatur. Der Scrollbereich bleibt in seiner Karte.                                                                                                                           |
| L6         | Bei 375 px eine Kachel ändern, mit Touch und Tastatur zu den Aktionen gelangen und speichern. Nach Neuladen ist die Änderung vorhanden. Ein zweiter Entwurf lässt sich bei derselben Breite abbrechen. Sichtbarkeit und tatsächliche Klickbarkeit werden geprüft, auch wenn der Dokument-Überlauf 0 px beträgt.                                                                                                   |
| F2         | In der angemeldeten App ohne Client-Override und mit Organisation auf Stufe 1 testen. „Abbrechen“ mit und ohne Änderung lässt V2 aktiv, auch nach Neuladen. Verworfen werden nur die ungespeicherten Änderungen. Die zuletzt gespeicherte Revision bleibt erhalten.                                                                                                                                               |
| F1         | Aus Stufe 1 ist keine funktionslose Aktion sichtbar. Mit umgesetztem Auftrag 155 öffnet der Button die vorgesehene Bearbeitung per Klick und Enter. Bis dahin wird die Aktion ausgeblendet, wenn kein Handler verfügbar ist. Die bestehenden Kacheleinstellungen im Inspector bleiben zugänglich.                                                                                                                 |

### Einordnung von F1

Der Merge von PR #182 (`3af56053`) enthielt den Detailauftrag 155 und eine Bauplanänderung. Im aktuellen `main` gibt es die optionale Öffnen-Schnittstelle am Inspector, aber keinen Panel-Editor, den die Dashboard-Seite aufruft. Der vollwertige Panel-Editor aus Auftrag 155 (`docs/auftraege/ANTIGRAVITY_AUFTRAG_155_DASHBOARD_PANEL_EDITOR.md`) ist ein eigener Umsetzungsumfang und nicht Teil von 174a. Vor der finalen Release-Freigabe entscheidet Marc, ob 155 umgesetzt wird oder die Release Notes die Funktion ausdrücklich aus dem Umfang nehmen.

## 2. Reproduktion (eigenständig, nur lokale synthetische Daten)

Voraussetzungen: lokaler Supabase-Stack (`supabase start`, nach `supabase db reset` ggf. `docker start supabase_edge_runtime_<projekt>`), Seed-Nutzer `manager-a@e2e.local` / `admin-a@e2e.local`. Umgebungsvariablen wie in `.github/workflows/ci.yml` (`E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_CLEANUP_KEY` aus `supabase status -o env`).

1. App gegen den lokalen Stack bauen: `VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npx vite build`.
2. Messung und Screenshots: `node scripts/captureAuftrag174aGateScreenshots.mjs vorher` auf dem Stand vor dem Fix, `… nachher` auf dem Fix-Stand. Der Harness setzt Org A lokal auf Stufe 1 (nur gegen `127.0.0.1`/`localhost`) und entfernt die Override-Einstellung. Er misst den Direktaufruf bei 1440/1059/768/375 px und die Resize-Folge 1440 → 1280 → 1059 → 1024 → 900 → 768 → 375 → 1440 mit Entwurf. Zusätzlich misst er den Inspector bei gewähltem „ARR-Verlauf“ (F1) und „Abbrechen“ mit anschließendem Neuladen (F2). Er schreibt nur Entwürfe, prüft unveränderte Layouts und Revisionen und entfernt danach die selbst angelegten Rollout-Zeilen.
3. Schreibende Abläufe: `npx playwright test e2e/dashboard-editor-smoke.spec.ts --workers=1` (Build mit `VITE_DASHBOARD_PREVIEW=true` wie in der CI). Der Test speichert bei 375 px per Touch, lädt neu, bricht einen zweiten Entwurf per Tastatur ab und stellt den Ausgangsstand wieder her.

Manuell im Browser (gleiche Daten): als `manager-a` anmelden, `/dashboard` bei 1440 px öffnen, Zeitraum oben ändern (Entwurf), Fenster schrittweise auf 1059 und 375 px verkleinern und wieder vergrößern. Danach „Abbrechen“ wählen und die Seite neu laden.

## 3. Umsetzung in prüfbaren Schritten

- [x] **T0 – Fehlerszenarien festhalten.** Reproduktion mit der angemeldeten App-Hülle und dem persönlichen Seed-Dashboard (`manager-a`, 17 Kacheln inkl. „ARR-Verlauf“). Vorher-Messung mit dem Harness: alle Befunde nachgestellt (Matrix `docs/screenshots/auftrag-174a/README.md`). Zusatzbefund: Nach Telefonbreite bleibt beim Vergrößern die Smartphone-Layoutansicht aktiv.
- [x] **T1 – Editor und Aktionsleiste anpassen.** `DashboardEditorShellV2.tsx`, neuer Hook `useEditorPanelLayout.ts`, `useEditorTouchLayout.ts`, `topbar/EditorTopBarActionsV2.tsx`, `EditorTopBarV2.tsx`. L1, L3, L6, L7 nachgewiesen.
- [x] **T2 – Raster, Karten und Diagramm.** `sections/SectionedCanvasV2.tsx`, `canvas/CanvasTileCard.tsx`, Renderer `TileValue.tsx`. L2, L4, L5 einzeln nachgewiesen; gespeicherte Rasterkoordinaten und Revisionen unverändert.
- [x] **T3 – Abbrechen und sichtbare Aktionen.** `pages/PersonalExecutiveDashboard.tsx`, `EditorInspectorV2.tsx`. F2 im Server-Rollout getestet; F1 mit und ohne Handler (Vitest). Auftrag 155 nicht umgesetzt.
- [x] **T4 – Gates und Review.** Neue E2E-Datei `e2e/dashboard-editor-smoke.spec.ts` (serielle Gruppe), Vitest `editorSmokeNacharbeit.ui.vitest.tsx`, Gates und Matrix im BUILD_LOG.

## 4. Festlegungen des Builders

1. **Seitenbereiche nach Editorbreite statt Fensterbreite (L1/L3/L7).** Gemessen wird die Editor-Hülle selbst (ResizeObserver), weil die App-Navigation in der vollständigen Hülle bereits rund 324 px belegt. Der Editor kennt vier Modi. Bei mindestens 1200 px Editorbreite sind beide Seitenbereiche offen. Ab 920 px ist nur einer offen (Grundstellung Inspector; Öffnen des einen schließt den anderen). Darunter liegt der Seitenbereich überlagert über der Arbeitsfläche, ohne ihr Breite zu nehmen. Auf Telefonbreite gilt das Vollbild-Blatt aus Auftrag 172. Die Mindestarbeitsfläche beträgt 600 px, abgeleitet aus der Diagramm-Mindestbreite von 560 px plus Rand. Bei jedem Moduswechsel gilt die Grundstellung des Direktaufrufs auf dieser Breite. Ohne Messmöglichkeit, etwa in jsdom, bleibt das bisherige Verhalten.
2. **Automatische Layoutansicht nur für ihre Breite.** Die erzwungene Smartphone-Ansicht und die einmalige Tablet-Ansicht werden beim Zurückkehren auf Desktop-Breite zurückgenommen. Eine Auswahl von Hand bleibt unangetastet.
3. **Kachelinhalt eingefasst (L2/L4).** Der Renderer füllt die belegte Rasterfläche, längere Inhalte scrollen innerhalb der Kachel. Die KPI-Zahl skaliert mit der Kachelbreite (20–32 px, Container-Einheit). Außerhalb des Editors bleibt sie bei 32 px.
4. **L5 bewusst horizontal scrollend.** Diagramme behalten ihre Lesebreite von 560 px. Der Scrollbereich ist eine fokussierbare Region (Maus, Touch, Pfeiltasten) und liegt jetzt vollständig in der Karte. Letzter Datenpunkt und „Q3 25“ sind erreichbar.
5. **F2:** „Abbrechen“ setzt keinen Override mehr und lädt nicht neu. Nach dem Verwerfen-Dialog wird der Editor mit dem zuletzt gespeicherten Stand neu aufgebaut. Die Editor-Wahl bleibt beim Server-Schalter.
6. **Außerhalb der Einstiegspunkte (begründet):** `.github/workflows/ci.yml` und `scripts/runV23Acceptance.mjs`, weil die neue E2E-Datei in die serielle Gruppe gehört. Dazu kommt `TileValue.tsx` als Renderer der KPI-Kacheln.

## 5. Grenzen

- Änderungen konzentrieren sich auf Dashboard V2. Projekteinstellungen für Rollout, Rechte und Hosted-Migrationen bleiben im bestehenden Ablauf.
- Keine neuen Abhängigkeiten oder Datenmigrationen. Schutzbereiche nach `CLAUDE.md` beachten.
- Keine Änderung an Release-Doku, Hosted-DB, Netlify, Stufen oder Release-Tag. Die lokale Release-Vorbereitung läuft getrennt vom Fix-PR. Rohbilder bleiben lokal; im Repo stehen Befundtexte, Reproduktionsschritte und die textuelle Screenshot-Matrix.

## 6. Übergang zu Stufe 2

Ein anderer Agent prüft den aktuellen PR-Stand. Nach dem Merge wird ein neuer Produktionsbuild ausgeliefert und der Hosted-Smoke mit der Demo-Organisation wiederholt. Ergebnis und Datum trägt der Builder ins P16-Stufenprotokoll ein (`docs/dashboard/UMSTELLUNG_P16.md`). Stufe 2 kommt erst nach mindestens sieben Tagen auf Stufe 1 ohne offenen Fehler infrage, und nach dem Abgleich für die ausgewählten Organisationen. Stufe 3 und der finale Tag folgen der bisherigen Freigaberegel.
