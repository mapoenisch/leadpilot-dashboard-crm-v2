# Zeitsteuerung und ehrlicher Live-Status (P10a / Auftrag 159)

**Stand:** 15.11.2026  
**Umfang:** Auftrag 159 (P10a). Die Server-Historie, Rolling Windows, Time-Travel und Shared Crosshair folgen in P10b (Auftrag 160).  
**Bezug:** [Dashboard-Editor-Masterplan](./DASHBOARD_EDITOR_MASTERPLAN.md) §4.C und §6, [KPI-Fähigkeiten](./KPI_FAEHIGKEITEN_144.md), [Editor-UX-Fachverträge](./EDITOR_UX_FACHVERTRAEGE_145.md) §2.1, [Abfragevertrag P08a](./ABFRAGEVERTRAG_P08A.md) §1/§5.

---

## 1. Zweck und Abgrenzung

Der V2-Editor konnte bis 158 „Pause“ anzeigen, ohne die Daten anzuhalten; die Statusleiste behauptete „Live“, auch ohne Feed. P10a behebt beides:

- **Gemeinsame Zeitsteuerung:** Ein Analysezeitpunkt friert alle sichtbaren Kacheln gemeinsam ein.
- **Ehrlicher Live-Status:** Verbindung, letzte neue Daten und Datenstand stammen ausschließlich aus echten Quellen.
- **Belegte Historienmatrix:** Jeder aktive Katalogeintrag trägt eine geprüfte Historienart. Es wird keine Historie erfunden.

Nicht Teil von P10a: Zeitreihen vom Server, Historienbeginn je Organisation, Rolling Windows, Time-Travel, Shared Crosshair (P10b), Alarme (P13), Vergleichszeiträume und Erwartungsbänder (P14). Die Pause wirkt nur auf die Browseranzeige, nie auf künftige Serverprüfungen.

---

## 2. Historienarten und Zuordnung

### 2.1 Typ

```ts
export type HistoryKind = 'keine' | 'fest' | 'puffer' | 'ereignisse';

export interface HistoryCapability {
  kind: HistoryKind;
  source?: 'deal_stage_events' | 'live_kpi_events';
  reconstructable: 'nein' | 'nur_fluesse';
  note: string;
}
```

`history` ist Pflichtfeld jedes aktiven Katalogeintrags (`ActiveCatalogEntry`). Ein neuer Eintrag ohne `history` scheitert bereits an der Typisierung; der Integritätstest prüft zusätzlich die inhaltlichen Regeln.

### 2.2 Zuordnungsregeln

| Katalogeintrag | Art | Begründung |
|---|---|---|
| `baseline.*`, `uebersicht.*` ohne Live-Bezug | `fest` | Feste Referenzreihe im App-Bundle; kein Zeitwechsel möglich. |
| `crm.*` | `keine` | Nur der aktuelle Stand; keine gespeicherte Historie. Bestände (Pipeline-Volumen, Deals, gewonnenes Volumen) sind aus heutigen Datensätzen nicht rekonstruierbar, weil Beträge nachträglich geändert werden. |
| `crm.*` mit reinen Phaseneintritten | `ereignisse`, `source: 'deal_stage_events'`, `reconstructable: 'nur_fluesse'` | Nur zulässig, wenn der Wert vollständig aus `deal_stage_events` folgt. In 159 gibt es keinen solchen aktiven Eintrag; ereignisbasierte Flusskennzahlen folgen in 160. |
| `live.*`, `uebersicht.live_aktivitaet` | `puffer` | Flüchtiger Browser-Puffer (initial 30 Minuten Abruf, danach FIFO mit höchstens 30 Punkten). Die serverseitige Historie aus `live_kpi_events` wird erst in P10b freigeschaltet. |
| Kombinationen | `fest`, wenn alle Operanden `fest` sind, sonst `keine` | Reine Funktion `deriveCombinationHistory`; keine Rangfolge der Arten. |

Invarianten (Test `catalogHistory.vitest.ts`):

- jeder aktive Eintrag hat eine vollständige Angabe mit nicht leerer Begründung,
- `source` nur bei `ereignisse`,
- kein Bestand (`aggregation: 'bestand'`) mit `reconstructable: 'nur_fluesse'`,
- Kombinationen folgen der Ableitungsregel,
- der Snapshot der Zuordnung stimmt (Sperre gegen unbemerkte Änderungen).

### 2.3 Erzeugte Zuordnung (48 aktive Einträge)

Verteilung: **29 × `fest`**, **13 × `puffer`**, **6 × `keine`**, **0 × `ereignisse`**. Die Tabelle wird aus dem Code erzeugt (Fixture `catalogHistory.snapshot.json`) und ist im Nachtrag zu `KPI_FAEHIGKEITEN_144.md` vollständig abgelegt.

---

## 3. Zustandsmodell der Zeitsteuerung

```ts
export type TimeControlMode = 'live' | 'pausiert';

export interface TimeControlState {
  mode: TimeControlMode;
  analysisAt: string | null; // ISO-Zeitpunkt der Pause, null im Live-Modus
  resumeToken: number;       // steigt bei jeder Wiederaufnahme
}
```

Übergänge:

- `pause(now)`: setzt `analysisAt` auf `now` und `mode` auf `pausiert`. Doppeltes Pausieren ändert `analysisAt` nicht.
- `resume()`: setzt `mode` auf `live`, `analysisAt` auf `null` und erhöht `resumeToken`.

Der Zustand liegt im Feature-Kontext `src/features/dashboard/time/` (nicht in `src/context/`, das ist Schutzbereich). Er gehört **nicht** in `DashboardConfigV2`, nicht in den Entwurf und nicht in den Undo-Verlauf. Nach Neuladen und Dashboard-Wechsel startet der Editor live.

---

## 4. Verhalten je Quellschicht

| Schicht | Live-Modus | Pause | Fortsetzen |
|---|---|---|---|
| Stammdaten (`baseline`, `kombination`) | referenzierter Wert | zuletzt gelieferter Wert bleibt stehen | unverändert |
| CRM (`crm`) | React-Query-Abruf; Fensterfokus/Reconnect laden bei Bedarf neu | kein automatisches Neuladen (`frozen`), Anzeige eingefroren | einmalige Invalidierung der eigenen CRM-Übersichten (Organisation + Nutzer) |
| Live (`live.*`, `uebersicht.live_aktivitaet`) | Store-Abo, aktuelle Werte | Abo bleibt bestehen (Puffer läuft weiter), Anzeige friert ein | aktueller Store-Stand wird übernommen |

Zusätzlich:

- **Kachel nach Pausenbeginn hinzugefügt oder Sektion aufgeklappt:** lädt einmal, friert dann ein und zeigt sichtbar „Stand HH:MM (nach Pausenbeginn geladen)“.
- **Filter- oder Pipelinewechsel während der Pause:** gewählte Variante „einmal laden und als abweichend kennzeichnen“. Die betroffenen CRM-Kacheln laden einmal neu; ihre Standzeile weist den abweichenden Stand aus. Begründung: Ein gesperrter Filter wäre eine neue Bedienregel außerhalb des Auftragsumfangs und würde die Pause mit Entwurfslogik vermischen. Die Pause bleibt eine reine Anzeigezeit-Steuerung.
- **Eingeklappte Sektionen:** lösen auch während der Pause keinen Datenabruf aus.
- **Undo, Redo, Layout und Speichern:** funktionieren während der Pause normal; die Pause betrifft nur Daten.
- **Filtermodus `fester_stand` (V1-Erbe):** bleibt unverändert und zählt nicht als Abweichung.

Fortsetzen invalidiert ausschließlich Cache-Schlüssel der eigenen Organisation und des eigenen Nutzers (`invalidateCrmOverviewQueries`). Zähltests: 24 Kacheln über 3 Pipelines erzeugen genau 3 CRM-Abrufe; 10 Pausenzyklen erzeugen keinen zusätzlichen Feed-Kanal und keine verwaisten Abos.

---

## 5. Ehrlicher Live-Status

Die Statusleiste zeigt drei getrennte Angaben. Alle stammen aus echten Quellen; Ping-, Latenz- und Durchsatzwerte gibt es nicht, weil es dafür keine Messung gibt.

| Angabe | Quelle | Werte |
|---|---|---|
| **Verbindung** | `isLiveKpiReadConfigured()`, Anzahl sichtbarer Live-Kacheln, `getFeedConnectionState()` | `nicht_konfiguriert`, `kein_live_inhalt`, `verbindet`, `verbunden`, `wiederverbinden`, `offline` |
| **Letzte neue Daten** | jüngstes `occurredAt` der Snapshots sichtbarer Live-Kacheln | Uhrzeit oder „Noch keine Daten empfangen“ |
| **Datenstand** | Live: ältester `asOf` bzw. CRM-`dataUpdatedAt` der sichtbaren Kacheln mit aktuellem Bezug; Pause: Analysezeitpunkt | Uhrzeit, „Angehalten seit HH:MM“ oder „Kein aktueller Datenstand“ |

Regeln:

- Ohne konfigurierten Feed steht nie „Verbunden“ oder „Live“. Ohne live-fähige sichtbare Kachel lautet die Verbindung „Kein Live-Inhalt“.
- Solange der Feed vor dem ersten Kanalstart nur den Startwert `offline` kennt und noch keine Daten empfangen wurden, zeigt die Leiste „Verbinde…“ statt einer erfundenen Trennung.
- Die Anzeige wird höchstens einmal pro Sekunde aktualisiert; ein Wechsel des Feed-Zustands wirkt sofort.
- Ansagen über die bestehende Live-Region nur bei Wechsel der Verbindung und bei Pause/Fortsetzen, nicht bei jedem Ereignis.
- Der Feed-Zustand ist über `subscribeFeedConnection` abonnierbar; `getFeedConnectionState()` bleibt erhalten. Adapter, Puffergröße, Aufbewahrungsfenster und Mandantenbindung sind unverändert.

---

## 6. Kennzeichnung je Kachel

Jede Kachel im V2-Editor und in der V2-Vorschau zeigt eine kurze Standzeile, abgeleitet aus `history.kind` und dem tatsächlichen Stand:

| Art | Text |
|---|---|
| `fest` | „Referenzwert, Stand <timeBasis>“ |
| `keine` (CRM) | „Aktueller Stand, abgerufen <Uhrzeit>“ |
| `puffer` (Live) | „Live, zuletzt <Uhrzeit>“ oder „noch keine Live-Daten“ |
| `ereignisse` | „Ereignisse ab Aufzeichnungsbeginn“ (Auswertung folgt in P10b) |
| Pause | zusätzlich „Angehalten seit <Uhrzeit>“ oder „Stand <Uhrzeit> (nach Pausenbeginn geladen)“ |

Inspector (Abschnitt Daten) und Bibliothek zeigen zusätzlich den Historientext je Art. Kachelgrößen ändern sich dadurch nicht.

---

## 7. Bewusste Grenzen

- Keine gespeicherte Pause: Der Zustand ist flüchtig und startet nach Neuladen/Dashboard-Wechsel live.
- Keine Zeitreihen vom Server, kein Historienbeginn je Organisation, keine Datenlücken-Anzeige (P10b).
- Kein Time-Travel als absoluter Analysezeitpunkt (P10b erweitert `TimeControlState` um `mode: 'zeitpunkt'`).
- Kein Rolling Window, kein Shared Crosshair (P10b).
- Keine Alarme (P13). Die Pause wirkt nur auf die Browseranzeige.
- Keine Zeitsteuerung im Viewer/Kiosk; sie folgt mit der Ausrollung des V2-Viewers.

---

## 8. Nachweise

- `src/features/dashboard/__tests__/timeControl.vitest.ts` — Übergänge, doppeltes Pausieren.
- `catalogHistory.vitest.ts` — Integrität und Snapshot der Historienmatrix.
- `useTimeControlledData.ui.vitest.tsx` — Einfrieren, Ereignis während der Pause, Kachel nach Pausenbeginn.
- `pauseCycles.ui.vitest.tsx` — 24 Kacheln, 10 Pausenzyklen, ein Feed-Kanal, kein verwaistes Abo.
- `useEditorLiveStatus.ui.vitest.tsx` — drei Angaben, keine erfundenen Werte, Drossel.
- `resumeCrmRefresh.ui.vitest.tsx` — genau drei eigene CRM-Abrufe, fremde Organisation unberührt.
- `e2e/editor-time-control.spec.ts` — Pause, Abweichungskennzeichnung, Fortsetzen, Neuladen, offline/nicht konfiguriert, Tastatur.
- `scripts/captureAuftrag159GateScreenshots.mjs` — 5 Zustände × 3 Viewports × 2 Themes, 0 px Überlauf, Statuszustände mit unterschiedlichen Hashes.
