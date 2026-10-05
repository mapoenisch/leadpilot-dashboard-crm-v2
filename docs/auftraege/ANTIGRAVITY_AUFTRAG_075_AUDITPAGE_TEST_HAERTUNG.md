# Auftrag 075 – AuditPage-Test gegen Zeitrennen härten

**Stand:** 05.10.2026

**Basis:** `main` `fbb7244` (nach PR #57). Anlass: In der CI von PR #57 schlug der Check `test` auf Head `a4e10a0` einmal fehl (Job 111532822617, `src/features/admin/pages/__tests__/AuditPage.ui.vitest.tsx:77`); nach einem einzigen Neustart bestand er. Der PR änderte nichts unter `src/features/admin`; die Begründung steht im PR-Kommentar 5984468757.

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc. Kleiner Einzelauftrag, **nicht** Teil des Executive-Dashboard-Masterplans; er wird vor oder unabhängig von Auftrag 074 auf einem eigenen Branch gebaut (`CLAUDE.md` §3: immer nur ein Auftrag gleichzeitig).

## Ziel

Der Test „rendert Audit-Log-Tabelle fuer Admin (leere Liste)“ ist deterministisch statt vom Zeitverhalten der Testumgebung abhängig. Kein Produktivcode ändert sich.

## Ursache (belegt)

`AuditPage.tsx` beginnt mit `isLoadingData = false` und `entries = []`. Der erste Render zeigt die Tabelle samt „Keine Einträge vorhanden.“, danach setzt der Effekt `isLoadingData = true` (Zeile 111, 146–150), und die Zeile ist während des Ladens ausgeblendet (`entries.length === 0 && !isLoadingData`, Zeile 261). Erst wenn `listAuditLogs` auflöst, erscheint der Text wieder. Der Test wartet mit `waitFor` nur auf die **Tabelle** (sie ist sofort da) und prüft den Text danach **synchron** mit `getByText` (Zeile 74–77). Ob die Auflösung der Promise vorher oder nachher eintrifft, hängt von der Last des Runners ab. Im Fehler-DOM der CI stand die Tabelle mit leerem `<tbody />`.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/admin/pages/__tests__/AuditPage.ui.vitest.tsx` | Test auf das Ergebnis warten lassen; Regressionstest mit verzögertem Dienst |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_075_AUDITPAGE_TEST_HAERTUNG.md` | Checkboxen abhaken |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

Nur lesen: `src/features/admin/pages/AuditPage.tsx` und alles andere. Schutzbereiche (`CLAUDE.md` §6) unverändert. Jede Datei unter 400 physischen Zeilen (`wc -l`).

## Vorgaben

- Der Test wartet auf **den Text** („Keine Einträge vorhanden“) statt auf die Tabelle und prüft ihn danach nicht synchron (`await screen.findByText(...)`, bzw. `waitFor` um beide Prüfungen). Die Tabellenprüfung bleibt erhalten.
- Neuer Regressionstest: `listAuditLogs` löst nach einer Verzögerung (z. B. 50 ms über `setTimeout`) mit leerer Liste auf. Der Test belegt, dass Tabelle und Text erst nach der Auflösung gemeinsam stehen. **Zuerst gegen den alten Test belegen:** Mit der alten Prüfreihenfolge (`waitFor` Tabelle, dann `getByText`) schlägt dieselbe verzögerte Konstellation fehl; das Ergebnis (Fehlermeldung) steht im BUILD_LOG. Danach der neue Test grün.
- Die übrigen Tests der Datei prüfen vergleichbare Muster: Zeilen 98–101 (`waitFor` auf Zeilen, danach `getByText('auth.login')`) sind sicher, weil Zeilen und Text im selben Render erscheinen; Zeile 122, 152, 168, 190 warten auf das jeweilige Ergebnis. Keine weiteren Änderungen ohne belegten Anlass.
- Der Test löscht, deaktiviert oder überspringt nichts (`CLAUDE.md`, Verbot: Tests nicht abschwächen).

## Umsetzung

- [ ] Fehlerbild reproduzieren: verzögerter Dienst gegen die alte Prüfreihenfolge, Fehlermeldung ins BUILD_LOG.
- [ ] Test anpassen und Regressionstest ergänzen; beide grün.
- [ ] 20 Läufe der Datei hintereinander grün (`for i in $(seq 20); do npx vitest run src/features/admin/pages/__tests__/AuditPage.ui.vitest.tsx; done`), Ergebnis im BUILD_LOG.
- [ ] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build`, `npm run verify:quality-budget`; Schutzbereichs-Diff gegen `fbb7244` leer.
- [ ] BUILD_LOG-Eintrag, Push, PR gegen `main`.

## Abnahme

Der alte Fehlerfall (verzögerter Dienst) ist reproduzierbar belegt und mit dem neuen Test behoben; 20 Läufe in Folge grün. Kein Produktivcode geändert, kein Test entfernt oder abgeschwächt. Codex prüft; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Eine Änderung an `AuditPage.tsx`: Die Seite zeigt im ersten Render kurz „Keine Einträge vorhanden“, bevor der Ladevorgang beginnt (Startwert `isLoadingData = false`). Das ist ein möglicher kleiner Produktfehler; er wird hier nur festgehalten, nicht behoben, und bräuchte einen eigenen Auftrag mit Marcs Entscheidung.
