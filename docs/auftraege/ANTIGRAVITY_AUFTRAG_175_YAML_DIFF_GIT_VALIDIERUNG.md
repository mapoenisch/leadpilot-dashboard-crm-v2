# Auftrag 175 – Dashboard-Editor: YAML-Ansicht im Versionsvergleich und Validierung exportierter Dashboards außerhalb der App (P17a, optional)

**Ziel:** Wer Dashboard-Versionen vergleicht, kann zusätzlich zur bisherigen Darstellung eine YAML-Ansicht wählen, die für Menschen leichter lesbar ist. Exportierte Dashboards (JSON aus 165) lassen sich außerhalb der App mit genau derselben Prüfung validieren, z. B. in einem Git-Repository per GitHub Action. **JSON bleibt das einzige gespeicherte und importierbare Format**; YAML ist nur Anzeige.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P17 (§6), §4.A (YAML-Diff), §4.E (Dashboard-as-Code, Git-Pipelines nutzen dieselbe Validierung).
**Fachgrundlage:** [VERSIONEN_AUSTAUSCH_P12.md](../dashboard/VERSIONEN_AUSTAUSCH_P12.md) (Exportformat ist Vertrag), `model/dashboardExchangeV2.ts`, `model/dashboardConfigDiff.ts`.
**Vorgelagert:** P12 (165) und P16 (174) gemergt. **P17 ist laut Masterplan optional:** Start nur nach ausdrücklicher Freigabe durch Marc.
**Baseline:** aktueller `main` beim Start.
**Branch:** `auftrag-175-yaml-git-validierung`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** ENTWURF – wartet auf Marcs Freigabe für P17.

---

## 1. Soll

### 1.1 YAML-Ansicht

1. Im Versionsvergleich (165) Umschalter „Darstellung: Änderungsliste | JSON | YAML“. YAML wird aus der **validierten** JSON-Konfiguration erzeugt, deterministisch (feste Schlüsselreihenfolge wie im Export), mit Zeilen-Diff links/rechts.
2. **Keine neue Abhängigkeit:** eigener, kleiner YAML-**Ausgeber** `model/yamlEmitter.ts` (≤ 250 Zeilen) für die im Konfigurationsschema vorkommenden Typen (Objekt, Liste, Zeichenkette, Zahl, Wahrheitswert, `null`); Zeichenketten werden immer in Anführungszeichen gesetzt, wenn sie YAML-Sonderbedeutung haben könnten (`yes`, `no`, `on`, `off`, `~`, Zahlenformen, führende Sonderzeichen, Doppelpunkt mit Leerzeichen, `#`). Es gibt **keinen YAML-Parser** und keinen YAML-Import.
3. Referenzfälle `model/yamlEmitterReferenceCases.json` (≥ 30): Sonderwörter, Unicode, mehrzeilige Beschreibungen, leere Listen/Objekte, tiefe Verschachtelung, Zahlen mit Exponent; Prüfung zusätzlich, dass jeder Ausgabefall mit dem in der Testumgebung **bereits vorhandenen** Parser (falls einer als Dev-Abhängigkeit existiert; sonst Golden-Files) zurückgelesen dieselbe Struktur ergibt.

### 1.2 Validierung außerhalb der App

4. Neu `scripts/validateDashboardExport.ts`: CLI `npx tsx scripts/validateDashboardExport.ts <datei.json …>`; nutzt **dieselben** Funktionen wie der Import (Exportformat-Version, `validateDashboardConfigV2`, Schwellenwert- und Transformations-Formprüfung); Ausgabe je Datei „gültig“ oder Fehler mit Pfad; Rückgabecode 0/1. Keine Netzwerkzugriffe, keine Secrets.
5. Beispiel-Workflow `docs/dashboard/beispiele/dashboard-validate.yml` (wird **nicht** in `.github/workflows` aktiviert) und Anleitung, wie ein separates Konfigurations-Repo ihn nutzt.
6. **Rechteprüfung:** Validierung prüft nur Form und Fachregeln; ein Import in die App prüft weiterhin Rechte und Organisation auf dem Server (165). Die Doku sagt deutlich: „Gültig im Git heißt nicht: darf importiert werden.“

### 1.3 Tests und Nachweise

7. Vitest (Tests zuerst): Emitter-Referenzfälle, Determinismus (zweimal gleich), YAML-Umschalter im Vergleich; CLI mit gültiger, ungültiger, falscher Version und beschädigter Datei.
8. E2E: Umschalter im Versionsvergleich (Vorschau-Szenario aus 165).
9. Bundle: YAML-Teile nur im nachgeladenen Versions-Chunk; Initial-JS +0 kB.
10. Screenshots `docs/screenshots/auftrag-175/README.md`.

### 1.4 Dokumentation

11. `VERSIONEN_AUSTAUSCH_P12.md` datiert ergänzen; Masterplan §6 Nachtrag; `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 2. Verbindliche Grenzen

Schutzbereiche unverändert; kein Server-Code; keine neuen Abhängigkeiten (auch keine YAML-Bibliothek); kein YAML-Import; Exportformat unverändert; `max-lines` 400.

## 3. Tasks

- [ ] **T0** Freigabe Marc für P17 im BUILD_LOG vermerken; Baseline; vorhandene Parser in Dev-Abhängigkeiten prüfen.
- [ ] **T1** Rot-Nachweise (Sonderwort `no` wird gequotet; CLI meldet falsche Version).
- [ ] **T2** Emitter und Referenzfälle.
- [ ] **T3** Umschalter im Versionsvergleich.
- [ ] **T4** CLI, Beispiel-Workflow, Doku.
- [ ] **T5** Pflicht-Verifikation, BUILD_LOG, PR, Review.

## 4. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npx size-limit
npx tsx scripts/validateDashboardExport.ts docs/dashboard/beispiele/*.json
npx playwright test e2e/dashboard-versions*.spec.ts e2e/a11y.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> --stat -- supabase   # leer
```
