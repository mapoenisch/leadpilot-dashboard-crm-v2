# Schwellenwerte auf Kacheln & Alarmfähigkeit je KPI (P13a)

**Stand:** 18.11.2026  
**Auftrag:** Auftrag 166 (P13a: Dashboard-Editor: Schwellenwerte auf Kacheln, Alarmfähigkeit je KPI, Betriebsweg für Alarme)  
**Status:** Umgesetzt, verifiziert und dokumentiert  
**Referenzen:** `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md` (§6, §9.2), `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md` (§8), `ARCHITECTURE_DECISIONS.md` (Part C)

---

## 1. Übersicht & Zielsetzung

Mit Auftrag 166 (P13a) erhält das Executive Dashboard V2 eine verbindliche, typisierte Schwellenwert-Logik für Kacheln. Ziel ist es, dem Nutzer auf einen Blick anzuzeigen, ob eine Kennzahl im Normalbereich liegt, Aufmerksamkeit erfordert (`warnung`) oder akut gefährdet ist (`kritisch`).

### Wichtige Abgrenzung (Auftrag 166 vs. Folgeaufträge)

In Auftrag 166 werden **keine** serverseitigen Hintergrund-Alarme (keine automatischen E-Mails, Slack-Webhooks oder PagerDuty-Notifikationen) gebaut. Auftrag 166 etabliert:

1. Das deklarative V2-Regelmodell (`ThresholdRuleV2`) und die Schwellenwert-Auswertung im Client.
2. Die visuelle Kennzeichnung auf Kacheln via `TileThresholdBadge` im Editor und in der Leseansicht.
3. Die Alarmfähigkeits-Matrix für alle 62 aktiven Katalog-KPIs (`alarmCapability.ts`, `alarmEntries.ts`).
4. Den Editor-Inspector-Tab „Alarme“ (`InspectorThresholdTab.tsx`) zur formularbasierten Konfiguration.
5. Die architektonische Richtungsentscheidung für den Betriebsweg serverseitiger Alarme (Marcs Beschluss vom 18.11.2026).

---

## 2. Regelmodell V2 (`ThresholdRuleV2`)

Das Regelmodell ist in [thresholdRuleV2.ts](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/dashboard/model/thresholdRuleV2.ts) formalisiert:

```typescript
export type ThresholdArt = 'hoch_ist_schlecht' | 'niedrig_ist_schlecht' | 'zielbereich';

export type ThresholdEvaluationLevel =
  'normal' | 'warnung' | 'kritisch' | 'keine_daten' | 'nicht_bewertet' | 'regel_ungueltig';

export interface ThresholdRuleV2 {
  formatVersion: 2;
  enabled: boolean;
  art: ThresholdArt;
  einheit: string;
  warnung?: number;
  kritisch?: number;
  untenWarnung?: number;
  untenKritisch?: number;
  obenWarnung?: number;
  obenKritisch?: number;
}
```

### Die drei Regelarten (`art`)

1. **`hoch_ist_schlecht`:** Typisch für Kosten, Churn, Ladezeiten, Durchlaufzeiten.
   - Normalbereich: `wert < warnung`.
   - Warnung: `wert >= warnung && (kritisch === undefined || wert < kritisch)`.
   - Kritisch: `wert >= kritisch`.
   - Validierung: `warnung < kritisch` zwingend vorgeschrieben.
2. **`niedrig_ist_schlecht`:** Typisch für ARR, Gewinn, Conversion-Rate, Kundenzufriedenheit.
   - Normalbereich: `wert > warnung`.
   - Warnung: `wert <= warnung && (kritisch === undefined || wert > kritisch)`.
   - Kritisch: `wert <= kritisch`.
   - Validierung: `warnung > kritisch` zwingend vorgeschrieben.
3. **`zielbereich`:** Typisch für Headcount, Auslastung, Korridore.
   - Normalbereich: Zwischen den Schwellenwerten.
   - Warnung/Kritisch: Bei Verlassen des Korridors nach oben oder unten.
   - Validierung: Mindestens eine obere oder untere Schwelle erforderlich; Min < Max; kritische Schwellen müssen außerhalb der Warnschwellen liegen.

---

## 3. Auswertungsstufen & Semantik

Die Auswertung erfolgt über `evaluateThresholdV2(rule, wert, frischeStatus, tileUnit)`.

| Stufe             | Bedingung                                               | Visuelle Ausprägung                           |
| ----------------- | ------------------------------------------------------- | --------------------------------------------- |
| `normal`          | Wert erfüllt alle Zielkriterien                         | Kein Badge sichtbar (visuelle Ruhe)           |
| `warnung`         | Wert erreicht oder überschreitet Warnschwelle           | Gelbes Badge: `Warnung: ...`                  |
| `kritisch`        | Wert erreicht oder überschreitet Kritischschwelle       | Rotes Badge: `Kritisch: ...`                  |
| `keine_daten`     | Wert ist `null` oder `undefined`                        | Kein Badge (Kachel zeigt Datenzustand)        |
| `nicht_bewertet`  | Datenstand der Kachel ist `veraltet` / stale            | Kein Schwellenwert-Badge (keine Falschalarme) |
| `regel_ungueltig` | Regel unvollständig, fehlerhaft oder ungültige Altregel | Cyan Badge: `Schwellenwert prüfen`            |

> [!IMPORTANT]
> **Reihenfolge der Auswertung:** Ungültige Regeln (`regel_ungueltig`) werden _vor_ dem Null-Wert-Check geprüft. Damit werden fehlerhaft konfigurierte Kacheln auch dann sofort als korrekturbedürftig markiert, wenn Daten noch laden oder fehlen.

---

## 4. Abwärtskompatibilität & Migration alter Regeln

V1-Dashboards konnten optionale `threshold`-Objekte mit `operator` (`gt`, `gte`, `lt`, `lte`, `between`) enthalten.

Die Funktion `normalizeLegacyThresholdRule(rule, catalogEntry)` konvertiert Altdaten on-the-fly:

- `gte` und `gt` werden zu `hoch_ist_schlecht` konvertiert.
- `lte` und `lt` werden zu `niedrig_ist_schlecht` konvertiert.
- `between` wird als `{ ungueltig: true, grund: ... }` eingestuft, da die historische Semantik uneinheitlich war (teilweise Korridor, teilweise invertiert). Die Kachel zeigt `Schwellenwert prüfen` und fordert den Anwender auf, die Regel im Inspector explizit als `zielbereich` zu bestätigen.
- **Bestandsanalyse (T0):** Alle produktiven Dashboard-Presets und Standardvorlagen wurden überprüft. Es existieren 0 Voreinstellungen mit dem uneindeutigen Operator `between`.

---

## 5. Alarmfähigkeits-Matrix (62 aktive Katalog-KPIs)

Nicht jede Kennzahl ist für Schwellenwerte geeignet. In [alarmEntries.ts](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/dashboard/model/catalog/alarmEntries.ts) und [alarmCapability.ts](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/dashboard/model/alarmCapability.ts) sind alle 62 aktiven Katalogeinträge typisiert:

| Status             | Anzahl | Kriterium & Beispiele                                                                                                                                   |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pruefbar`         | 16     | Skalare Einzelwerte mit eindeutiger Zielrichtung (z. B. `baseline.arr`, `baseline.ebitda`, `baseline.umsatz`, `crm.lead_velocity`)                      |
| `ausgeschlossen`   | 13     | Rein qualitative Kennzahlen oder zusammengesetzte Übersichten ohne Grenzwerte (z. B. `uebersicht.roadmap`, `uebersicht.meilensteine`, `crm.team_deals`) |
| `nicht_einzelwert` | 33     | Zeitreihen, Verläufe, Phasen-Funnel oder Anteilsverteilungen (z. B. `baseline.arr_verlauf`, `crm.deal_flow_historie`, `crm.phaseneintritte_verlauf`)    |

Im Inspector ist der Tab „Alarme“ bei Kacheln mit `nicht_einzelwert` oder `ausgeschlossen` gesperrt und weist mit einem klaren Hinweis darauf hin:  
_„Schwellenwerte können nur auf Einzelwert-Kacheln (Zahl, Gauge, Sparkline) überwacht werden.“_

---

## 6. Architekturentscheidung: Betriebsweg für Alarme (18.11.2026)

Am 18.11.2026 hat Marc Pönisch die verbindliche Architekturentscheidung für den späteren Server-Alarmierungsbetrieb getroffen:

### Beschluss: Out-of-Process Worker

- **Architektur:** Ein eigenständiger Hintergrund-Worker (geschrieben in Golang oder als Node.js CLI-Daemon/Cron-Service), der unabhängig von der Web-Anwendung läuft.
- **Aufgabe des Workers:** Zyklischer Abruf der Dashboards mit aktiven Schwellenwerten, Abfrage der aktuellen KPI-Werte über die vorhandenen RPCs/Queries, Auswertung nach denselben Formeln wie `thresholdRuleV2.ts` und Benachrichtigungsversand.
- **Ausgeschlossener Ansatz (Verworfen):** Supabase Database Triggers / `pg_cron` / Edge Functions.
  - _Begründung:_ Datenbank-Trigger auf CRM-Tabellen führen zu unkalkulierbarer Last bei Bulk-Imports, erzeugen enge Kopplung zwischen OLTP-Datenbank und Benachrichtigungslogik und leiden unter harten Timeout-Limits bei Edge Functions.
- **Stand in P13a:** Das Frontend und das Regelmodell sind vollständig entkoppelt. Das V2-Konfigurationsmodell speichert die Schwellenwert-Regeln persistent in der Dashboard-Konfiguration (`tiles[].threshold`), wo sie später vom Out-of-Process Worker direkt ausgelesen werden können.

---

## 7. Nachweise & Verifikation

- **Unit-Tests:** 67 Tests in `thresholdRuleV2.vitest.ts`, 57 verifizierte Testfälle in `thresholdReferenceCases.json`.
- **UI-Tests:** `tileThresholdBadge.ui.vitest.tsx` (6 Tests) und `InspectorThresholdTab.ui.vitest.tsx` (7 Tests).
- **Matrix-Verifikation:** `npx tsx scripts/verifyAlarmCapability.ts` bestätigt 16 / 13 / 33 Aufteilung für alle 62 KPIs.
- **E2E-Tests:** `e2e/dashboard-thresholds-preview.spec.ts` prüft Anlegen, Validierungssperren, Übernahme, Speichern/Neuladen und Leseansicht auf Desktop (1440), Tablet (768) und Mobile (375).
- **Gate-Screenshots:** 36 Screenshots (6 Szenarien × 3 Viewports × 2 Themes) mit 0 px Überlauf in `docs/screenshots/auftrag-166/README.md`.
- **Bundle-Budget:** Initial-JS-Bundle bei 170.18 kB gzipped (Grenze < 180 kB, Limit eingehalten).
