# Auftrag 164 – Dashboard-Editor: Restpunkte aus 161 – Fadenkreuz-Kopplung, E2E/Screenshots, Fach-Doku (161R, schließt P10)

**Ziel:** Die drei offenen Punkte aus Auftrag 161 werden nachgeholt, damit P10 vollständig abgeschlossen ist: (1) Das gemeinsame Fadenkreuz koppelt die Verlaufsdiagramme wirklich, (2) der Analysezeitpunkt ist per E2E und Screenshot-Matrix belegt, (3) die Fach-Doku ist nachgetragen. Keine neuen Funktionen über den Umfang von 161 hinaus.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P10 (§6, Umsetzungsstand 17.11.2026 zu P10b-2).
**Fachgrundlage:** [Auftrag 161](ANTIGRAVITY_AUFTRAG_161_ZEITPUNKT_FENSTER_CROSSHAIR.md) §2.1 Nr. 5, §2.4 Nr. 17–21, §2.5, §2.6, §2.7 Nr. 27–31, T8; [ZEITREIHEN_P10B.md](../dashboard/ZEITREIHEN_P10B.md); BUILD_LOG-Nachtrag 17.11.2026 „Restpunkte (offen)“.
**Vorgelagert:** 161 (PR #196, `6dbbc593`), 161-Nachtrag (PR #199). Fachlich unabhängig von 162/163 (P11).
**Reihenfolge:** nach 163 (Aufträge seriell, `CLAUDE.md` §4.1). Marc kann 164 vorziehen, solange 163 noch nicht begonnen ist.
**Baseline:** aktueller `main` beim Start (der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-164-zeitreihen-restpunkte` (Detailauftrag) bzw. ein neuer Umsetzungsbranch mit demselben Präfix.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge:** Marc.
**Status:** OFFEN.

---

## 1. Ist-Stand (geprüft auf `main` `00ab4db5`)

| Baustein          | Ist                                                                                                                                                                                                      | Fundstelle                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fadenkreuz-Store  | `createCrosshairStore()` mit `{ at, sourceTileId }`, `setCrosshair`, `clearCrosshair`; im `TimeControlProvider` angelegt und bei Moduswechsel geleert. **Kein Diagramm liest oder setzt ihn.**           | `time/crosshairStore.ts`, `time/TimeControlProvider.tsx:17–70` |
| Diagramme         | `DepthLineChart.tsx` (303 Zeilen), `DepthAreaChart.tsx` (6 Zeilen, Weiterleitung), `ChartReadout.tsx` (271), `chartTypes.ts` mit `TimeDepthChartProps`. Keine Fadenkreuz-Linie, keine Tastaturbedienung. | `components/charts/`                                           |
| Kachelrahmen      | `TileBody.tsx` (175), `DashboardTile.tsx` (auch V1), `canvas/CanvasTileCard.tsx`.                                                                                                                        | `components/`, `components/editor/canvas/`                     |
| E2E               | `editor-time-control.spec.ts`, `editor-time-series.spec.ts`. `e2e/editor-time-point.spec.ts` **fehlt**.                                                                                                  | `e2e/`                                                         |
| Screenshots       | `scripts/captureAuftrag161GateScreenshots.mjs` und `docs/screenshots/auftrag-161/README.md` **fehlen**. Vorlage: `scripts/captureAuftrag160GateScreenshots.mjs`.                                         | `scripts/`, `docs/screenshots/`                                |
| Fach-Doku         | `ZEITREIHEN_P10B.md` ohne Abschnitte zu Zeitpunkt/Fenster/Fadenkreuz; `ABFRAGEVERTRAG_P08A.md`, `ZEITSTEUERUNG_P10A.md`, `ARCHITECTURE_DECISIONS.md` Teil C ohne Nachtrag zu 161.                        | `docs/dashboard/`, `ARCHITECTURE_DECISIONS.md`                 |
| Review-Abweichung | Codex-Befund „Schließe die Verlaufsdiagramme an den Fadenkreuz-Store an“ war in PR #196 als gelöst markiert, im Code aber nicht behoben.                                                                 | BUILD_LOG 17.11.2026                                           |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fadenkreuz-Kopplung (Auftrag 161 §2.4 Nr. 18–21, verbindlich unverändert)

1. Überfahren, Tippen oder Tastatur-Fokus eines Punktes in einer Verlaufskachel setzt `at` = Abschnittsbeginn dieses Punktes und `sourceTileId` = diese Kachel. Pfeiltasten links/rechts wandern im fokussierten Diagramm; `Escape`, Verlassen und Fokusverlust leeren. Aktualisierung höchstens einmal je Animationsframe.
2. Jede andere sichtbare Verlaufskachel zeichnet eine senkrechte Linie am passenden Abschnitt nach 161 §2.1 Nr. 5 (unterschiedliche Auflösungen: der Abschnitt, der `at` enthält; außerhalb des eigenen Bereichs keine Linie) und zeigt in ihrer Ablesezeile Wert oder Lückentext dieses Abschnitts. Keine Interpolation.
3. Nur die auslösende Kachel kündigt per `aria-live="polite"` an; die übrigen nicht.
4. Der Store wird über einen kleinen Hook (z. B. `time/useCrosshair.ts`) gelesen, der mit `useSyncExternalStore` nur den für die Kachel nötigen Ausschnitt abonniert (Selektor), damit Nicht-Verlaufskacheln nicht neu rendern.
5. **Leistung:** Render-Zähltest mit 1 auslösenden, 3 mitlaufenden und 3 Nicht-Verlaufskacheln: Ein Fadenkreuz-Wechsel rendert nur die Diagramm-Ebenen der 4 Verlaufskacheln neu. Eingeklappte Sektionen rendern nichts.
6. Diagramme ohne Zeitachse (`DatumInput { label; value }`) und der V1-Pfad bleiben bytegleich (vorhandene Pfad-/Snapshot-Tests unverändert grün).
7. Im Modus `zeitpunkt` funktioniert das Fadenkreuz innerhalb des bis zum Zeitpunkt reichenden Bereichs; beim Dashboard- oder Moduswechsel ist es leer (vorhandenes Verhalten des Providers).

### 2.2 E2E und Screenshots (161 T8)

8. Neu `e2e/editor-time-point.spec.ts` in der Vorschau `dashboard-vorschau.html?bereich=editor_v2`: Zeitpunkt setzen → Verlaufskacheln enden dort, Hinweise „kein Stand gespeichert“ und „zeitunabhängiger Wert“ sichtbar; „Zurück zu Live“ stellt Live her; Zeitfenster einer Kachel im Inspector ändern; Fadenkreuz per Maus **und** per Tastatur (Fokus, Pfeiltasten, Escape) koppelt mindestens zwei Verlaufskacheln. Mobil (375 px) per Tippen.
9. Neu `scripts/captureAuftrag161GateScreenshots.mjs` nach Vorbild `captureAuftrag160GateScreenshots.mjs`, Matrix `docs/screenshots/auftrag-161/README.md`: Zeitpunkt-Dialog, Dashboard im Zeitpunkt-Modus, Fadenkreuz über mehrere Kacheln, Inspector mit Zeitfenster – jeweils 1440/768/375 px, Vorher/Nachher-Hashes verschieden, 0 px horizontaler Überlauf. Nur die README-Matrix wird committet.

### 2.3 Fach-Doku (161 §2.7 Nr. 27–29, 31)

10. `ZEITREIHEN_P10B.md`: neue Abschnitte „Analysezeitpunkt“, „Zeitfenster je Kachel“ (Tabelle Höchstwerte je Quelle/Auflösung aus `tileQuery.ts` und Migration `20261120`), „Gemeinsames Fadenkreuz“; §8 „Bewusste Grenzen“ aktualisieren (nichts löschen, Überholtes als „erledigt mit 161/164“ markieren).
11. `ABFRAGEVERTRAG_P08A.md`: datierter Nachtrag zu `query.window`.
12. `ZEITSTEUERUNG_P10A.md`: datierter Nachtrag Modus `zeitpunkt`.
13. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Migration 20261120, Zeitpunkt-Regel 161 §2.1 Nr. 2, Fadenkreuz-Store mit Selektor-Abo).
14. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Umsetzungsstand 161R / Auftrag 164 – P10 abgeschlossen“. Nichts umschreiben.
15. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 164 beim Start; `docs/BUILD_LOG.md` Builder-Eintrag mit Verweis auf den Nachtrag vom 17.11.2026.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Keine Migration, keine RPC-, pgTAP- oder Dienständerung.** `supabase/**` und `src/features/dashboard/services/**` unverändert.
3. **Kein neuer Funktionsumfang** über 161 hinaus (keine neue Zeitsteuerung, keine neuen Fenster-Regeln, keine Änderung an `crosshairStore.ts`-Schnittstelle außer einem optionalen Selektor-Hook).
4. **V1-Pfad unverändert**; `DashboardTile.tsx` nur, wenn zwingend, und dann mit V1-Gegenprobe im BUILD_LOG.
5. **Keine neuen Abhängigkeiten**, keine Chart-Bibliothek.
6. **`max-lines` 400** für alle neuen und geänderten Dateien; `DashboardEditorShellV2.tsx` wird nicht geändert.
7. **Bundle:** Initial-JS höchstens +0,3 kB gzip und unter 180 kB; größter Chunk ≤ 250 kB.
8. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) Vitest Fadenkreuz in Kachel A zeigt Linie in Kachel B → heute rot; (b) Render-Zähltest → heute rot (keine Kopplung); (c) Tastatur Pfeiltaste wandert → heute rot.
9. **Barrierefreiheit:** `a11y.spec.ts` ohne neue Verstöße gegenüber `a11y-baseline.json`.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                           | Änderung                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_164_ZEITREIHEN_RESTPUNKTE_161R.md`                                                                                         | Dieser Auftrag (Checkboxen, Status)   |
| neu `src/features/dashboard/time/useCrosshair.ts` (oder gleichwertig), ggf. `time/TimeControlProvider.tsx` (nur Bereitstellung)                                | Selektor-Abo (2.1 Nr. 4)              |
| `components/charts/DepthLineChart.tsx`, `DepthAreaChart.tsx`, `ChartReadout.tsx`, `chartTypes.ts`, `components/TileBody.tsx`, ggf. `canvas/CanvasTileCard.tsx` | Kopplung, Linie, Ablesezeile, ARIA    |
| `src/features/dashboard/__tests__/*` (neu bzw. ergänzt)                                                                                                        | Vitest inkl. Render-Zähltest          |
| neu `e2e/editor-time-point.spec.ts`                                                                                                                            | E2E (2.2 Nr. 8)                       |
| neu `scripts/captureAuftrag161GateScreenshots.mjs`, neu `docs/screenshots/auftrag-161/README.md`                                                               | Screenshots (2.2 Nr. 9)               |
| `docs/dashboard/ZEITREIHEN_P10B.md`, `ABFRAGEVERTRAG_P08A.md`, `ZEITSTEUERUNG_P10A.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `ARCHITECTURE_DECISIONS.md`          | Doku (2.3)                            |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                                           | Status, Builder-Eintrag, Prüfnachweis |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

- [ ] **T0 Einstieg:** Baseline, Ist-Tabelle §1 prüfen, `size-limit` und Zeilenzahlen notieren.
- [ ] **T1 Rot-Nachweise:** §3 Nr. 8 (a)–(c).
- [ ] **T2 Selektor-Hook:** 2.1 Nr. 4.
- [ ] **T3 Auslösen:** Maus, Touch, Tastatur, Frame-Drosselung (2.1 Nr. 1).
- [ ] **T4 Mitlaufen:** Linie, Abschnittszuordnung bei verschiedenen Auflösungen, Ablesezeile, ARIA (2.1 Nr. 2–3, 7).
- [ ] **T5 Leistung:** Render-Zähltest, eingeklappte Sektionen (2.1 Nr. 5); Gegenprobe Diagramme ohne Zeitachse und V1 (2.1 Nr. 6).
- [ ] **T6 E2E:** 2.2 Nr. 8.
- [ ] **T7 Screenshots:** 2.2 Nr. 9.
- [ ] **T8 Doku:** 2.3.
- [ ] **T9 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag (inkl. Hinweis, dass der Codex-Befund aus PR #196 damit tatsächlich behoben ist), PR öffnen, Review anfordern.

## 6. Abnahme

- Das Fadenkreuz koppelt alle sichtbaren Verlaufskacheln, auch mit unterschiedlicher Auflösung, per Maus, Touch und Tastatur, ohne andere Kacheln neu zu rendern.
- Nur die auslösende Kachel kündigt für Screenreader an.
- `e2e/editor-time-point.spec.ts` und die Screenshot-Matrix 161 liegen vor und sind grün.
- Die Fach-Doku beschreibt Analysezeitpunkt, Zeitfenster und Fadenkreuz; der Masterplan vermerkt P10 als abgeschlossen.
- Schutzbereichs-Diff leer, `supabase/**` und `services/**` unverändert, V1 unverändert, keine neuen Abhängigkeiten, Bundle ≤ +0,3 kB.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npx size-limit
npx tsx scripts/verifyLiveKpiCatalog.ts
npx playwright test e2e/editor-time-point.spec.ts e2e/editor-time-control.spec.ts e2e/editor-time-series.spec.ts e2e/a11y.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- supabase src/features/dashboard/services src/services/liveKpi src/domain src/features/dashboard/data   # leer
```

CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Render-Last:** Ohne Selektor-Abo würden alle Kacheln bei jeder Mausbewegung neu rendern. Deshalb 2.1 Nr. 4 und der Zähltest als Pflicht.
- **Zeilengrenze:** `DepthLineChart.tsx` hat 303 Zeilen; Linie und Tastaturlogik ggf. in eine eigene Datei (z. B. `charts/crosshairLayer.tsx`) auslagern.
- **161 §2.5 Nr. 24** (Speichern ohne Hosted-Migration 20261120) ist mit dem Einspielen der Migrationen 20261118–20261122 auf Hosted gegenstandslos; der Builder vermerkt das im BUILD_LOG, sobald Marc das Einspielen bestätigt hat.
- **Nicht Teil dieses Auftrags:** neue Zeitsteuerungsfunktionen, Team-Freigaben (163), Versionsoberfläche (P12), Alarme (P13).
