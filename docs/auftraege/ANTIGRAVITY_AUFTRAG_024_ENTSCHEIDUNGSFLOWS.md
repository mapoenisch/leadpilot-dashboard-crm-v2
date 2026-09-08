# ANTIGRAVITY AUFTRAG 024 — Szenarien, Maßnahmen & Vergleich als Entscheidungsflows

**Phase:** 6 · **Gate:** G8  
**Status:** DRAFT / SPEZIFIKATION  
**Voraussetzung:** Auftrag 022 (Gate G6) und Auftrag 023 (Gate G7) abgeschlossen; `npx tsc --noEmit`, `npm run verify` und `npm run build` als grüne Baseline dokumentieren.  
**Referenzen:** `docs/FRONTEND_DESIGN_AUDIT_2026-09-01.md`, `docs/FRONTEND_MODERNISIERUNGSPLAN.md`, Entscheidungen 851, 866, 1273 und 1637.

---

## 1. Ziel

Szenarioverwaltung, Maßnahmen und Multi-Szenario-Vergleich werden zu klaren, professionellen Entscheidungsflows ausgebaut. Nutzer sollen eine Version auswählen, Änderungen nachvollziehen, deren Wirkung ohne Seiteneffekte prüfen und Szenarien sachlich vergleichen können.

**Gestalterische These:** Die Oberfläche wirkt wie eine kontrollierte Entscheidungswerkbank für ein B2B-SaaS-Unternehmen: klare Referenzen, begrenzte Auswahl, sichtbare Auswirkungen und keine künstliche Bewertung.

Alle bestehenden Funktionen, Daten, Berechnungen und Entscheidungen bleiben erhalten. Dieser Auftrag strukturiert ihre Präsentation und Interaktion neu.

## 2. Unverrückbare Grenzen

- Die in Auftrag 022 umgesetzten Primitives (`Modal`, `Select`, `NumberStepper`, Drawer, Focus-Handling) werden **verwendet**, nicht erneut grundlegend umgebaut.
- Die in Auftrag 023 migrierten Chart-Primitives werden **eingebettet**, nicht parallel neu implementiert.
- Keine Änderung an `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, Repositories, Persistenz, Run-/Versions-Modell, Berechnungen oder Architekturentscheidungen.
- `Internal Resources` bleibt unverändert.
- Keine neue Chart- oder UI-Bibliothek.
- Entscheidung 866 bleibt strikt gültig: **kein künstlicher Gesamt-Score und kein automatisches Ranking von Szenarien.**
- Die vorhandene Maximalgrenze von 2 bis 4 vergleichbaren Szenarien bleibt erhalten.
- Maßnahmenvorschauen bleiben side-effect-frei; `persist: false` darf keine Runs oder Versionen persistieren.

## 3. Bestehende Funktionen, die zwingend erhalten bleiben

| Bereich | Erhaltener Funktionsumfang |
|---|---|
| Szenarien | Versionen anlegen, aktiv setzen, Referenz wählen, Parameter ansehen und vergleichen |
| Vergleich | 2–4 Szenarien, Referenzwechsel, Parameter-Diff, KPI-Diff, Trade-off-Dimensionen, `INDETERMINATE`-Hinweise, Konfiguration übernehmen |
| Maßnahmen | Maßnahme anlegen, Zeitfenster/Ramp-up/Dauer wählen, Treiber und Intensität definieren, Konflikte sehen, Wirkungsvorschau ausführen, speichern |
| Vorschau | Side-effect-freier Lauf, Delta-Tabelle für KPI-Wirkungen, keine persistierten Runs oder Versionen |
| Audit | Versionen, Runs, Maßnahmen und Ergebnisse weiterhin vollständig nachvollziehbar |

## 4. Umsetzung

### Schritt 0 — Baseline und Screenshots

1. `git status --short`, `npx tsc --noEmit`, `npm run verify` und `npm run build` ausführen.
2. Vorher-Screenshots anlegen für:
   - Szenarioverwaltung und Versionserstellung,
   - Parameter-Diff,
   - Multi-Szenario-Vergleich mit 2 und mit 4 Szenarien,
   - Maßnahmenformular mit offenem Treiber-Select,
   - Wirkungsvorschau mit Delta-Tabelle,
   - Konfliktwarnung bei zwei `SET`-Maßnahmen auf denselben Treiber.
3. Alle Flows bei 1440 px, 768 px und 375 px dokumentieren.

### Schritt 1 — Szenarien als klarer Arbeitsbereich

1. `ScenarioManagerModal` als Entscheidungsflow strukturieren:
   - Kopf: aktives Szenario, Version, Status und Zeitpunkt,
   - Versionen als kompakte Auswahlkarten statt unstrukturierter Listen,
   - eindeutige Kennzeichnung von Basis, aktivem und Referenzszenario,
   - primäre Aktion: neue Version anlegen bzw. Konfiguration übernehmen,
   - sekundäre Aktionen kontextuell gruppieren.
2. Jede Version zeigt nur vorhandene Metadaten: Name, Status, Parameteränderungen, Run-Status und vorhandene Ergebnisse.
3. Keine neuen Versionszustände, keine künstlichen Empfehlungen und keine neuen Parameter erzeugen.

### Schritt 2 — Parameter-Diff lesbar machen

1. Den vorhandenen Side-by-Side-Vergleich in eine priorisierte Diff-Ansicht überführen:
   - Zusammenfassung der tatsächlich geänderten Parameter oben,
   - unveränderte Parameter standardmäßig verdichtet bzw. ausblendbar,
   - Einheit, Referenzwert, Vergleichswert und Delta immer gemeinsam darstellen,
   - positive/negative Richtung nur dort hervorheben, wo die fachliche Semantik eindeutig ist; ansonsten neutral bleiben.
2. Desktop: Tabelle mit fixierter Parameter-Spalte und sichtbarer Scroll-Hilfe.
3. Tablet/Mobil: jede Änderung als Vergleichskarte mit Referenz, neuem Wert, Einheit und Delta; keine abgeschnittene Matrix.
4. Der bestehende Toggle „nur geänderte Parameter“ bleibt funktional erhalten und erhält eine klare Zustandsanzeige.

### Schritt 3 — Multi-Szenario-Vergleich als Entscheidungsfläche

1. `MultiScenarioComparisonModal` in drei Zonen gliedern:
   - **Auswahl:** 2–4 Szenarien, Referenz deutlich markiert, Auswahlgrenze verständlich angezeigt.
   - **Ergebnis:** vorhandene KPI-Deltas und die in Auftrag 023 migrierten Vergleichsvisualisierungen.
   - **Begründung:** Trade-off-Dimensionen, Datenqualität, fehlende Runs und `INDETERMINATE`-Hinweise.
2. Kein Gesamtscore, kein „bestes Szenario“-Badge und keine automatische Empfehlung.
3. Wenn keine Runs vorliegen, keine leeren Diagramme zeigen: klar erklären, dass Konfigurationen verglichen werden können, belastbare Ergebnisdeltas aber erst nach Runs vorliegen.
4. „Konfiguration übernehmen“ muss seine bestehende, unveränderliche `ScenarioVersion` erzeugen; danach klar bestätigen, welche Version entstanden ist.

### Schritt 4 — Maßnahmenmanager als geführte Wirkungskette

1. Die in Auftrag 022 geschaffene 6-Phasen-Struktur beibehalten:
   1. Beschreibung
   2. Zeitfenster
   3. Treiber
   4. Intensität
   5. Wirkungsvorschau
   6. Speichern
2. Jede Phase erhält eine kompakte Zusammenfassung des bisher Gewählten; fehlende Pflichtangaben sind direkt am Feld verständlich erklärt.
3. Die Treiber-Auswahl verwendet die neue `Select`-Komponente; Einheit, erlaubter Wertebereich und Wirkungstyp werden aus bestehenden Registry-Daten gezeigt.
4. Ramp-up, Start-Tick und Dauer als visuelle Timeline zusammenfassen, ohne neue Zeitlogik einzuführen.
5. Bei `MULTIPLE_SET`-Konflikten Warnung sichtbar vor Speichern anzeigen; bestehende Konfliktlogik unverändert nutzen.
6. Die Wirkungsvorschau zeigt vorhandene KPI-Deltas als klare Vergleichstabelle sowie die vorhandenen Chart-Primitives aus Auftrag 023. Sie bleibt vollständig side-effect-frei.
7. Speichern bleibt die einzige primäre Abschlussaktion; Vorschau ist sekundär, aber klar erreichbar.

### Schritt 5 — Zustände, Responsivität und Accessibility

Für Szenarien, Vergleiche und Maßnahmen müssen folgende Zustände gestaltet und getestet werden:

- leer: keine zusätzlichen Versionen, keine Maßnahmen, keine Runs,
- Auswahlgrenze: weniger als 2 bzw. mehr als 4 Szenarien,
- keine Änderungen gegenüber Referenz,
- fehlende bzw. unzureichende Runs,
- Konfliktwarnung,
- Vorschau läuft / Vorschau fehlgeschlagen,
- Übernahme erfolgreich.

Zusätzlich:

- sichtbarer Fokus und logische Tab-Reihenfolge,
- Dialoge per Escape schließbar und ohne Fokusfalle,
- alle Inputs mit programmatischem Label, Hilfetext und verständlicher Fehlermeldung,
- Tabellen mit korrekten Headern und mobiler Kartenalternative,
- keine Information ausschließlich über Farbe,
- keine horizontalen Body-Überläufe bei 375 px, 768 px und 1440 px.

## 5. Abnahmekriterien (Gate G8)

- [ ] `npx tsc --noEmit`, `npm run verify` und `npm run build` sind fehlerfrei.
- [ ] Alle bestehenden Szenario-, Maßnahmen-, Vergleichs- und Auditfunktionen sind unverändert erreichbar.
- [ ] Die Maximalgrenze 2–4 Szenarien, Referenzwechsel, `INDETERMINATE` und Entscheidung 866 bleiben nachweislich erhalten.
- [ ] Wirkungsvorschau persistiert weiterhin 0 Runs und 0 Versionen.
- [ ] „Konfiguration übernehmen“ erzeugt weiterhin genau eine neue unveränderliche Version.
- [ ] Konfliktwarnung für mehrere `SET`-Maßnahmen bleibt aktiv.
- [ ] Schmale Ansichten verwenden keine abgeschnittenen Matrizen oder Controls.
- [ ] Modal-, Select- und NumberStepper-Bedienung funktioniert per Tastatur mit sichtbarem Fokus.
- [ ] `Internal Resources` und alle geschützten Fachpfade weisen 0 Diff auf.
- [ ] Vorher-/Nachher-Screenshots aller sechs Flows liegen unter `docs/screenshots/auftrag-024/` vor.
- [ ] `docs/BUILD_LOG.md` enthält Gate G8, Screenshot-Matrix, Prüfresultate und eine Liste bewusst unveränderter Fachbereiche.

## 6. Abschlussbericht

Der Abschlussbericht dokumentiert:

1. geänderte Dateien und ihre UI-Aufgabe,
2. Funktions- und Schutzbereichsnachweis,
3. Screenshot-Matrix bei 1440 px, 768 px und 375 px,
4. alle getesteten Leer-, Konflikt-, Vorschau- und Erfolgszustände,
5. offene Punkte, die nicht Bestandteil dieses Auftrags sind.
