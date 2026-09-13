# AUFTRAG 061 / Gate G43 — V2.2.0 Release-Audit

**Builder:** Antigravity
**Prüfung:** Codex / Claude Code
**Baseline:** `bdb1d2a` (Gate G42 freigegeben, Auftrag 060 abgeschlossen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G43 / 061, Definition-of-
Done-Tabelle (23 Kennzahlen, Abschnitt „Definition of Done").

## Ziel — mit Marc abgestimmt

**Dies ist ein Audit-Auftrag, kein Abschluss-Auftrag.** Ziel ist ein
maschinell erzeugter, ehrlicher Nachweis über den Ist-Stand aller 23
Definition-of-Done-Kennzahlen — **nicht** die Behauptung, alle seien
erfüllt. Zusätzlich werden die risikofreien, mechanisch behebbaren Lücken
geschlossen. Alle übrigen Lücken werden präzise dokumentiert und an
Folgeaufträge übergeben. **G43 gilt nach diesem Auftrag als „auditiert",
nicht als „bestanden"** — Merge nach `main`, Tag und Push bleiben so lange
gesperrt, bis die dokumentierten Lücken in eigenen Aufträgen geschlossen
sind und ein zweiter, dann tatsächlich grüner Audit-Lauf vorliegt.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

Frisch gemessen auf `bdb1d2a`, Zeile für Zeile gegen die 23
Definition-of-Done-Kennzahlen:

| # | Kennzahl | Ziel | Ist-Stand (gemessen 2026-09-13) | Status |
|---|---|---|---|---|
| 1 | ESLint-Fehler | 0 | 4 | ❌ — siehe #13, dieselbe Ursache |
| 2 | ESLint-Warnungen | 0 | 3 (verwaiste `eslint-disable` in `e2e/a11y.spec.ts`, `e2e/routes.spec.ts`, `e2e/visual.spec.ts`, Regel `no-restricted-properties`) | ❌ — **Quick Win**, siehe Block A |
| 3 | Prettier-Abweichungen | 0 | 263 Dateien (`npm run format:check`) — davon **181 außerhalb**, **82 innerhalb** der Schutzbereiche (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`) | ❌ — **teilweise Quick Win**, siehe Entscheidung 1 |
| 4 | TypeScript-Fehler | 0 | 535 | ❌ — **nicht Teil dieses Auftrags**, siehe Entscheidung 3 |
| 5 | `any`-Typen in `src/` | 0 | 0 | ✅ erfüllt |
| 6 | `console.*` in `src/` | 0 | 0 | ✅ erfüllt |
| 7 | `useSyncExternalStore` in Live-Hooks | 3 | 3 Hook-Dateien (`useLiveKpi.ts`, `useLiveKpiActivity.ts`, `useLiveKpiHistory.ts`) nutzen es; `liveKpiStreamStore.ts` referenziert es zusätzlich intern | ✅ erfüllt — im Skript (Block A) als Assertion festschreiben |
| 8 | Realtime-Kanäle bei 12 KPIs | 1 | 1 (`liveKpiReadAdapter.ts:191`: fester `channelId = 'live-kpi-feed'`, Verteilung an alle 12 KPIs erfolgt client-seitig im Store) | ✅ erfüllt — im Skript als Assertion festschreiben |
| 9 | Layering-Verstöße | 0 | 0 (`import/no-restricted-paths`, per ESLint-JSON nachgezählt) | ✅ erfüllt |
| 10 | Klickbare `<div>`/`<span>` | 0 | 0 (`jsx-a11y/no-static-element-interactions` + `click-events-have-key-events`) | ✅ erfüllt |
| 11 | `target="_blank"` ohne `noopener` | 0 | 0 (`react/jsx-no-target-blank`) | ✅ erfüllt |
| 12 | Inline-Styles (nicht laufzeitberechnet) | 0 | `INLINE_STYLE_BASELINE = 22` (3 dauerhaft eingefroren `resources/**`, 19 aus G39 als Laufzeit-/Passthrough-Ausnahmen dokumentiert) | ⚠️ vermutlich erfüllt **im Sinne der Metrik-Definition** (die "nicht laufzeitberechnet" bereits ausschließt) — seit G39 nie mehr gesamtheitlich re-verifiziert, siehe Block A |
| 13 | Komponenten > 400 Zeilen | 0 | `MAX_LINES_BASELINE = 4`, alle 4 in dauerhaft geschützten Zonen (`src/simulation/eventRules.ts`, `src/simulation/scenarioService.ts`, `src/simulation/__tests__/financialIntegrity.test.ts`, `src/features/resources/components/ResourceViewer.tsx`) | ❌ **echter Zielkonflikt mit den Schutzbereichs-Regeln**, siehe Entscheidung 4 — **nicht** Teil dieses Auftrags |
| 14 | Coverage `services/` + `hooks/` | ≥ 90 % | `hooks/` 92,92 % (erfüllt), aber `hooks/queries/` nur 68 %, `services/db` nur 28,28 %, `services/import` 66,99 %, `services/data` 71,26 % | ❌ **große Lücke, nicht Teil dieses Auftrags**, siehe Entscheidung 3 |
| 15 | Coverage `simulation/` | ≥ 80 % | 87,27 % (Statements) | ✅ erfüllt (Einzelausreißer: `decisionMaker.ts` 0 %, `reportPresenter.ts` 0 % — im Skript dokumentieren, nicht beheben) |
| 16 | Coverage `components/` | ≥ 60 % | **0 %** über praktisch alle Unterordner (`components/ai`, `components/executiveCockpit`, `components/layout`, `components/ui`, …) | ❌ **größte Lücke, nicht Teil dieses Auftrags**, siehe Entscheidung 3 |
| 17 | Größter JS-Chunk (gzip) | ≤ 250 KB | 86,39 KB (`npx size-limit`) | ✅ erfüllt (aus G41) |
| 18 | Initial-Load (gzip) | ≤ 180 KB | 135,71 KB | ✅ erfüllt (aus G41/G42) |
| 19 | Lighthouse Performance | ≥ 90 | 99 (`npx lhci autorun`) | ✅ erfüllt (aus G41) |
| 20 | Lighthouse Accessibility | ≥ 95 | 100 | ✅ erfüllt (aus G41) |
| 21 | `.git`-Größe | ≤ 50 MB | 78 MB (`du -sh .git`) | ❌ **nicht Teil dieses Auftrags**, siehe Entscheidung 5 |
| 22 | CI-Läufe grün bei jedem Push | grün | **77 lokale Commits nie gepusht** (`git log origin/codex/v2.2.0-haertung..HEAD --oneline`), letzter echter grüner GitHub-Actions-Lauf vom 11.09.2026 (Gate G35). Der gesamte Fortschritt G36–G42 lief nie durch die echte CI-Pipeline, nur durch lokale Prüfer-Worktrees | ❌ **nicht durch diesen Auftrag lösbar**, siehe Entscheidung 6 |
| 23 | Handgeschriebene Capture-/Audit-Skripte | ≤ 3 | 24 Dateien in `scripts/` insgesamt, davon nur 2 mit „capture" im Namen (`captureGateScreenshots.mjs`, `captureAuftrag058Screenshots.mjs`) — die genaue Abgrenzung „handgeschrieben vs. gewollter Vitest/Playwright-Ersatz" ist unklar (z. B. `verifyIntegrity.ts` läuft laut Plan bewusst als Übergangs-Parallelbetrieb) | ⚠️ **Definition im Skript klären und dokumentieren**, siehe Block A |

**Bilanz:** 9 von 23 Kennzahlen sicher erfüllt, 2 vermutlich erfüllt (Re-
Verifikation nötig), **12 von 23 nicht erfüllt** — davon 2 Quick Wins in
diesem Auftrag lösbar (#2, #3 teilweise), der Rest (#1/#13 zusammen, #3
teilweise, #4, #14, #16, #21, #22) sind **eigene, teils mehrtägige
Folgearbeiten** und ausdrücklich **nicht** Teil dieses Auftrags.

## Verbindliche Entscheidungen

1. **Prettier: Ausnahmsweise repo-weiter `prettier --write`-Lauf,
   inklusive Schutzbereiche.** Begründung: Prettier ist per Definition
   rein syntaktisch/whitespace-verändernd, niemals semantikverändernd —
   im Gegensatz zu jeder bisherigen Ausnahme in diesem Projekt ist das
   Risiko einer versehentlichen Verhaltensänderung strukturell
   ausgeschlossen, nicht nur unwahrscheinlich. **Pflicht-Nachweis:**
   `git diff <Vorher-Commit> --ignore-all-space -- src/simulation
   src/types src/context src/services/data src/features/resources` muss
   nach dem Lauf **leer** sein (das beweist: ausschließlich Whitespace
   geändert). Zusätzlich: volle Pflicht-Verifikation **vor und nach** dem
   Prettier-Lauf, beide Ergebnisse im Bericht gegenüberstellen. Dies ist
   die **einzige** Ausnahme von der Schutzbereichs-Regel in diesem
   Auftrag — sonst gilt sie unverändert.
2. **Kein neues Golden-Run-Risiko:** Nach dem Prettier-Lauf zusätzlich
   die Reproduzierbarkeits-Suite (Teil von `npm run verify`) gezielt
   nochmal einzeln laufen lassen und im Bericht bestätigen, dass sie
   weiterhin byte-gleich reproduziert — auch wenn Schritt 1 das formal
   schon über den leeren Ignore-Whitespace-Diff belegt, ist das der
   zweite, unabhängige Beleg.
3. **TypeScript-Fehler (#4), Coverage `services/`+`hooks/` (#14) und
   Coverage `components/` (#16) sind ausdrücklich NICHT Teil dieses
   Auftrags.** Sie sind zu groß für einen Audit-Auftrag (535 TS-Fehler,
   0 % Components-Coverage). Im Bericht als klar benannte, mit Zahlen
   belegte Folgeaufträge vormerken (Vorschlag: „Auftrag 062 —
   TypeScript-Fehler-Reduktion", „Auftrag 063 — Test-Coverage
   `components/`", „Auftrag 064 — Test-Coverage `services/`+`hooks/`"),
   aber **keine dieser Aufträge in diesem Auftrag schreiben oder
   vorwegnehmen.**
4. **Komponenten > 400 Zeilen in Schutzbereichen (#13) bleiben
   unangetastet.** Die 4 verbleibenden Dateien liegen in `src/simulation/**`
   (Engine) und `src/features/resources/**` (eingefroren) — ihre
   Aufteilung würde diese Schutzbereiche verletzen. Das ist ein
   **struktureller Zielkonflikt zwischen Metrik #13 und den
   Schutzbereichs-Regeln aus `CLAUDE.md`**, kein Versäumnis eines
   früheren Auftrags. Im Bericht explizit als offene Grundsatzfrage an
   Marc formulieren: entweder die DoD-Tabelle bekommt eine dauerhafte,
   dokumentierte Ausnahme für diese 4 Dateien (analog
   `INLINE_STYLE_BASELINE`), oder ein künftiger, ausdrücklich für
   `src/simulation/**` autorisierter Auftrag splittet sie.
5. **`.git`-Größe (#21) wird nicht angefasst.** Eine Reduktion auf
   ≤ 50 MB erfordert wahrscheinlich einen History-Rewrite (z. B.
   `git filter-repo`) auf einem bereits mehrfach gepushten Branch — das
   ist eine grundsätzlich andere Risikoklasse als alles bisher in diesem
   Plan Gemachte und braucht eine bewusste, separate Entscheidung von
   Marc außerhalb des normalen Auftrags-Flusses. Im Bericht die
   Größenverteilung nach Kategorie aufschlüsseln (App-Assets vs.
   Screenshot-Verlauf über die Gates), damit die Entscheidung informiert
   getroffen werden kann — aber **keine Löschung, kein Rewrite, kein
   Vorschlag zur Umsetzung ohne Rückfrage.**
6. **Kein Push in diesem Auftrag.** 77 lokale Commits sind nicht
   gepusht (#22). Das Pushen des Branches — Voraussetzung für einen
   echten CI-Lauf — bleibt wie in jedem bisherigen Auftrag an Marcs
   ausdrückliche Freigabe gebunden und ist **nicht** Teil dieses
   Auftrags. Im Bericht festhalten, dass ein echter grüner CI-Lauf erst
   nach diesem Push nachweisbar ist, nicht vorher.
7. **`verifyV22ReleaseReadiness.ts` baut frisch**, verwendet aber die
   Helfer `assertNoConflictingCount`/`isCurrentClaimLine` aus dem in G31
   gelöschten `verifyV21ReleaseReadiness.ts` (letzter Stand: Commit
   `89333d9b5fdf642f30282dd9d7665cc425bce458`) als Ausgangspunkt für die
   Doku-Konsistenz-Prüfung. **Kein Stub-Modul anlegen.**
8. **Screenshot-Vergleich gegen V2.1.0**, wie im Plan gefordert
   („vollständiger Screenshot-Vergleich gegen V2.1.0"): Baseline aus dem
   `v2.1.0`-Tag, Nachher aus dem aktuellen Stand, Methodik wie in allen
   bisherigen Gates (Hash-Vergleich zuerst, Pixel-Diff nur bei
   Abweichung, nie Bilder in den eigenen Kontext laden).

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen — **mit
  der einen expliziten Ausnahme aus Entscheidung 1** (Prettier-Lauf,
  ausschließlich Whitespace-Änderungen, Nachweispflicht wie dort
  beschrieben).
- Keine inhaltliche Code-Änderung in `src/simulation/**`,
  `src/types/**`, `src/context/**`, `src/services/data/**`,
  `src/features/resources/**` — nur die autorisierte Prettier-Formatierung.
- Kein Merge, Tag, Push, kein History-Rewrite ohne ausdrückliche
  Freigabe.

## Blöcke

### Block A — `verifyV22ReleaseReadiness.ts` (Kern des Auftrags)

- [ ] Skript baut alle 23 Kennzahlen aus der DoD-Tabelle als einzelne,
      automatisierte Prüfungen nach, Ausgabe als Tabelle (Kennzahl → Ist
      → Soll → Status), analog zum in Entscheidung 7 genannten Vorbild.
- [ ] Für #7, #8, #12, #23: die im Ist-Stand oben skizzierte Prüflogik
      exakt als Assertion umsetzen (nicht neu erfinden).
- [ ] Für #23: eine nachvollziehbare, im Skript dokumentierte Definition
      von „handgeschriebenes Capture-/Audit-Skript" festlegen (z. B.
      Namensmuster + Ausschluss der acht `verify*`-Dateien, die laut Plan
      bewusst als Vitest-Übergang weiterlaufen) und danach zählen.
- [ ] Für alle „nicht Teil dieses Auftrags"-Kennzahlen (#4, #13, #14,
      #16, #21, #22): das Skript meldet den **echten Ist-Wert**, markiert
      sie aber nicht als Fehler des Skriptlaufs, sondern als
      „dokumentierte offene Lücke mit Verweis auf Folgeauftrag" —
      das Skript soll ehrlich `NICHT BESTANDEN, siehe Bericht` ausgeben,
      nicht grün lügen.

### Block B — Quick Wins

- [ ] 3 verwaiste `eslint-disable`-Kommentare in `e2e/*.spec.ts`
      entfernen (Metrik #2).
- [ ] Repo-weiter `prettier --write`-Lauf inkl. Schutzbereiche, mit
      vollständigem Nachweis wie in Entscheidung 1/2 beschrieben (Metrik
      #3, so weit wie mechanisch möglich).

### Block C — Screenshot-Vergleich V2.1.0 → V2.2.0

- [ ] Vollständiger Screenshot-Vergleich gegen den `v2.1.0`-Tag
      (Entscheidung 8). Matrix unter `docs/screenshots/auftrag-061/README.md`.

### Block D — `docs/releases/V2.2.0.md` + Abschluss

- [ ] Release-Dokument nach Vorbild `docs/releases/V2.1.0.md`, aber mit
      ehrlichem Status: welche der 23 Kennzahlen erfüllt sind (mit
      Zahlen), welche nicht (mit Zahlen und benanntem Folgeauftrag).
- [ ] Ausdrücklicher Abschnitt „Was G43 NICHT bedeutet": kein Merge,
      kein Tag, kein Push, keine Release-Freigabe — nur ein Audit-Stand.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `npm test`,
      `npm run build`, `npx playwright test`, `npx size-limit`,
      `npx lhci autorun`, `npx tsx scripts/verifyV22ReleaseReadiness.ts`
      — alle Befehle laufen und ihr Ergebnis (grün oder die dokumentierte
      Lücke) steht im Bericht.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `e2e/a11y.spec.ts`, `e2e/routes.spec.ts`, `e2e/visual.spec.ts` (nur verwaiste `eslint-disable` entfernen) | B |
| **Repo-weit** (nur Prettier-Formatierung, keine inhaltliche Änderung, siehe Entscheidung 1) | B |
| `scripts/verifyV22ReleaseReadiness.ts` (neu) | A |
| `docs/screenshots/auftrag-061/**` (neu) | C |
| `docs/releases/V2.2.0.md` (neu) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere **inhaltliche** Änderungen sind nicht erlaubt — insbesondere kein
Beheben von TypeScript-Fehlern, keine neuen Tests für Coverage, kein
Aufsplitten der 4 `max-lines`-Dateien, keine Git-History-Änderung, kein
Push.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run format:check   # nach Block B: 0 Abweichungen außerhalb evtl. neu entdeckter Ausnahmen
npm run verify
npm test
npm run build
npx playwright test
npx size-limit
npx lhci autorun
npx tsx scripts/verifyV22ReleaseReadiness.ts
git diff bdb1d2a --ignore-all-space -- src/simulation src/types src/context src/services/data src/features/resources   # leer (nur Whitespace)
git log origin/codex/v2.2.0-haertung..HEAD --oneline | wc -l   # dokumentieren, nicht auf 0 bringen
```

## Builder-Bericht und Commit

Abschnitt **„Gate G43 – Auftrag 061 (Audit-Abschluss)"** an den Anfang von
`docs/BUILD_LOG.md`: die vollständige 23-Zeilen-Tabelle mit Ist-Werten,
Commit-Hashes je Block, Prettier-Nachweis (Ignore-Whitespace-Diff-Ergebnis),
Screenshot-Vergleich gegen V2.1.0, und eine klare Liste der für Marc zu
treffenden Entscheidungen (Metrik #13 DoD-Ausnahme, Metrik #21
Git-Größe, Metrik #22 Push-Freigabe, Folgeaufträge für #4/#14/#16).

## Akzeptanzkriterien für die Prüfung

- `verifyV22ReleaseReadiness.ts` existiert, prüft alle 23 Kennzahlen
  automatisiert, lügt bei keiner Kennzahl grün.
- Metrik #2 (ESLint-Warnungen) auf 0.
- Metrik #3 (Prettier) auf 0 **oder** mit exaktem, nachvollziehbarem
  Rest-Wert dokumentiert, falls der Ignore-Whitespace-Nachweis für die
  Schutzbereiche unerwartet nicht leer ist (dann: Prettier-Lauf für
  Schutzbereiche zurückrollen, nur ungeschützte Dateien formatieren,
  Befund dokumentieren statt zu riskieren).
- Reproduzierbarkeits-Suite nach dem Prettier-Lauf weiterhin byte-gleich
  (Entscheidung 2).
- Screenshot-Vergleich gegen V2.1.0 vollständig, Methodik eingehalten.
- `docs/releases/V2.2.0.md` verschleiert keine der 12 offenen Lücken.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, keine
  Ratsche in den bereits erfüllten Metriken verschlechtert.
- Kein Push, kein Merge, kein Tag, kein History-Rewrite.

**Abnahme:** Erst nach unabhängigem Review ist der Audit-Teil von Gate
G43 abgeschlossen — **G43 selbst bleibt offen**, bis die dokumentierten
Folgeaufträge (#4, #13, #14, #16, #21, #22) geklärt bzw. umgesetzt sind.
Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.
