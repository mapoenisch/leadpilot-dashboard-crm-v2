# AUFTRAG 062 / Gate G43 (Fortsetzung) — TypeScript-Fehler-Reduktion

**Baseline:** `ac3ff6c` (Auftrag 061 Review abgeschlossen) · **Branch:** `codex/v2.2.0-haertung` · **Status:** OFFEN

Dieser Auftrag ist die erste der drei in Auftrag 061 angekündigten Folgeaufträge (062–064) zur
Schließung der noch offenen DoD-Kennzahlen aus dem G43-Audit. Er schließt **ausschließlich
Kennzahl #4** (TypeScript-Fehler) sowie einen zusätzlichen, von Marc separat beauftragten
Korrekturpunkt an der Prüf-Infrastruktur (Lighthouse-Auth-Lücke aus dem Auftrag-061-Review).
Gate G43 selbst bleibt danach weiterhin offen, bis auch #13, #14, #16, #21, #22 geklärt sind.

## Ziel — mit Marc abgestimmt

1. **TypeScript-Fehler von 535 auf 0** (`npx tsc --noEmit` muss sauber durchlaufen).
2. **Lighthouse-Messung reparieren**, sodass `.lighthouserc.json` wieder tatsächlich `/dashboard`
   misst statt (wie seit Gate G42 unbemerkt) auf `/login` umgeleitet zu werden — Befund aus dem
   Auftrag-061-Review, von Marc ausdrücklich in diesen Auftrag mit aufgenommen.
3. Als kleine Zusatz-Quick-Wins (gleiche Baustelle, gleiches Risiko-Niveau): die zwei im
   Auftrag-061-Review gefundenen Zählfehler in `scripts/verifyV22ReleaseReadiness.ts` beheben
   (Metrik #21 `.git`-Größe liefert in jedem Prüfer-Worktree fälschlich 0 MB; Metrik #3
   Prettier-Zähler ist um 1 zu hoch), damit das Skript für die nächsten Gates verlässlich ist.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

Nachmessung am Baseline-Commit `ac3ff6c` per `npx tsc --noEmit`: **535 Fehler in 116 Dateien.**

### Aufschlüsselung nach Fehlercode

| Code | Anzahl | Bedeutung | Ursache |
|---|---|---|---|
| TS18048 | 239 | „X is possibly 'undefined'" | `noUncheckedIndexedAccess: true` (Array-/Objekt-Zugriffe) |
| TS2532 | 113 | „Object is possibly 'undefined'" | dito |
| TS6133 | 76 | Deklariert, aber nie gelesen | `noUnusedLocals`/`noUnusedParameters: true` |
| TS2322 | 59 | Typ nicht zuweisbar | echte Typ-Diskrepanzen |
| TS2345 | 32 | Argument nicht zuweisbar | echte Typ-Diskrepanzen |
| TS2339 | 10 | Property existiert nicht auf Typ | echte Typ-Diskrepanzen |
| TS2769/TS7053/TS2722/TS2538/TS2304 | 6 | diverse Einzelfälle | siehe Dateien |

`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` stehen bereits seit
Längerem in `tsconfig.json` — die 535 Fehler sind kein neu eingeschleppter Regressionsstand,
sondern der angesammelte Rückstand gegen eine bereits scharfgestellte, strenge Konfiguration.
Der Großteil (352 von 535 = 66 %) ist mechanische Null-Safety-Arbeit (Optional Chaining,
Default-Werte, gezielte Guards), kein Zeichen für fachlich falschen Code.

### Konzentration auf wenige Dateien

11 Dateien vereinen 349 der 535 Fehler (65 %) auf sich — vor allem Chart-/Visualisierungs-
Komponenten mit datengetriebenen Array-Zugriffen:

| Datei | Fehler |
|---|---|
| `src/features/markt/components/DecisionTopology.tsx` | 62 |
| `src/features/finanzen/components/CapitalCut.tsx` | 55 |
| `src/domain/organisationData.ts` | 36 |
| `src/features/finanzen/components/RevenueCostShoreline.tsx` | 30 |
| `src/features/vertrieb/components/FunnelLeakageWaterfall.tsx` | 28 |
| `src/features/markt/components/MarketOpportunityStack.tsx` | 28 |
| `src/features/kunden/components/SegmentFields.tsx` | 28 |
| `src/features/vertrieb/components/BudgetTargetLadder.tsx` | 25 |
| `src/features/vertrieb/components/ChannelInvestmentRoute.tsx` | 20 |
| `src/domain/executiveCockpitData.ts` | 20 |
| `src/features/kunden/components/RevenueStaircase.tsx` | 17 |

Die restlichen 186 Fehler verteilen sich auf 105 weitere Dateien, meist 1–10 Fehler je Datei.

### Schutzbereichs-Anteil (8 von 535 Fehlern)

| Datei | Fehler | Code | Schutzbereich |
|---|---|---|---|
| `src/features/resources/components/ResourceCard.tsx` | 1 | TS6133 (`React` ungenutzt) | `src/features/resources/**` |
| `src/features/resources/InternalResourcesView.tsx` | 1 | TS6133 (`React` ungenutzt) | `src/features/resources/**` |
| `src/services/data/sources/baselineFileSource.ts` | 3 | TS2322 ×2, TS2339 | `src/services/data/**` |
| `src/services/data/sources/hubSpotBaselineSource.ts` | 3 | TS2322 ×2, TS2339 | `src/services/data/**` |
| `src/services/data/sources/simulatedCrmSource.ts` | 1 | TS2322 (`Activity[]` vs. `HistoricalActivity[]`) | `src/services/data/**` |

Alle 527 übrigen Fehler liegen außerhalb der Schutzbereiche (`src/simulation/**`,
`src/types/**`, `src/context/**` sind fehlerfrei — 0 Treffer dort).

### Lighthouse-Auth-Lücke (Zusatzauftrag aus dem Review)

`.lighthouserc.json` ruft `/dashboard` unauthentifiziert auf. Seit Gate G42 schützt
`ProtectedRoute` alle Routen, ein anonymer Aufruf wird serverseitig auf `/login` umgeleitet.
Eigenständig verifiziert (`npx lhci autorun`, `finalDisplayedUrl` im Report):
Perf/A11y-Werte (100/100) wurden bislang gegen die triviale Login-Seite gemessen, nicht gegen
das echte, chart-lastige Dashboard. `docs/releases/V2.2.0.md` Zeile 48–49 behauptet fälschlich
das Gegenteil und muss korrigiert werden, sobald die echte Messung vorliegt.

## Verbindliche Entscheidungen

1. **Schutzbereichs-Ausnahme für 8 explizit gelistete TS-Fehler.** Gemäß
   `docs/BUILD_PLAN_V2.2.0.md` Abschnitt „Schutzbereiche während V2.2.0" ist ein gezielter
   Eingriff in geschützte Pfade innerhalb eines dafür geschriebenen Auftrags zulässig, solange
   das fachliche Verhalten nachweislich unverändert bleibt. Erlaubt sind **ausschließlich** die
   8 oben gelisteten Fehler in exakt den 5 genannten Dateien — keine weiteren Änderungen an
   `src/services/data/**` oder `src/features/resources/**`. Pflichtnachweis: `npm run verify`
   bleibt 24/24 grün, Playwright Visual Regression bleibt 0px Diff, und
   `git diff ac3ff6c -- src/simulation src/types src/context src/features/resources` sowie
   `git diff ac3ff6c -- src/services/data` zeigen **ausschließlich** die hier vorgesehenen
   Typ-Korrekturen (keine Änderung an Datenwerten, Runtime-Logik oder dem `CrmReadModel`-
   Vertrag selbst — falls der Fehler nur durch eine Vertragsänderung lösbar wäre, **stoppen und
   Rückfrage dokumentieren**, statt den Typ passend zu biegen).
2. **Reihenfolge:** Erst Quick Wins (Block A), dann die 8 Schutzbereichs-Fehler (Block B, klein
   und isoliert), dann die 11 Konzentrationsdateien (Block C, 65 % der Restarbeit), dann der
   Rest (Block D). Nach jedem Block `npx tsc --noEmit` erneut laufen lassen und die sinkende
   Fehlerzahl im Bericht dokumentieren — kein Big-Bang-Commit mit allen 535 Fehlern auf einmal.
3. **Keine Typ-Erweiterung durch `any` oder `@ts-ignore`.** Jede Korrektur muss die tatsächliche
   Nullability/den tatsächlichen Typ abbilden (Optional Chaining, Nullish Coalescing, echte
   Guards, oder — nur mit Begründung im Bericht — ein `as`-Assertion an einer Stelle, wo die
   Nichtigkeit durch Programmlogik bereits ausgeschlossen ist). Metrik #5 (`any`-Typen, aktuell
   0) darf durch diesen Auftrag nicht wieder auf > 0 steigen — das wird im Abschlussbericht
   gegengeprüft.
4. **Lighthouse-Fix:** `.lighthouserc.json` um einen Login-Schritt vor dem eigentlichen Crawl
   ergänzen (z. B. über `puppeteerScript` mit programmatischem Login via `LocalAuthAdapter`
   und Übernahme des resultierenden Storage-Zustands, analog zum bestehenden Playwright-
   `global-setup.ts`-Muster). Nach dem Fix erneut `npx lhci autorun` fahren und den
   `finalDisplayedUrl` im generierten Report explizit im Bericht zitieren, um zu belegen, dass
   jetzt tatsächlich `/dashboard` gemessen wurde. `docs/releases/V2.2.0.md` Zeile 48–49
   entsprechend mit dem korrigierten Wert aktualisieren.
5. **Scope-Grenze:** Dieser Auftrag ändert **keine** fachliche Logik, keine Datenwerte, keine
   Baseline-JSON-Inhalte und keine UI/Visuals. Jede Änderung an einer `.tsx`-Datei außerhalb der
   reinen Typebene (z. B. ein tatsächlich geändertes Rendering) ist ein Stopp-Signal — dann
   Rückfrage dokumentieren statt weiterzumachen.

## Grenzen und Schutzbereiche

- `git diff ac3ff6c -- src/simulation src/types src/context src/features/resources` **muss leer
  sein** (auch die 2 `features/resources`-Fehler werden separat unter Block B behandelt, siehe
  Entscheidung 1 — hier ist nur das restliche `features/resources/**` gemeint, sprich: außer den
  2 explizit genannten Zeilen darf sich dort nichts ändern).
- `git diff ac3ff6c -- src/services/data` darf **ausschließlich** die 3 in Block B genannten
  Dateien und darin ausschließlich die Typ-Korrekturen für die 7 gelisteten Fehler enthalten.
- Alle anderen Schutzbereichspfade (RNG/Seed, Run-/Versionsmodell, `crmRepository.ts`-
  Schreibpfade) bleiben vollständig unberührt.

## Blöcke

### Block A — Quick Wins

- 74 `TS6133`-Fehler außerhalb der Schutzbereiche entfernen (ungenutzte Imports/Variablen/
  Parameter). Rein mechanisch, kein Verhaltensrisiko.
- `scripts/verifyV22ReleaseReadiness.ts`:
  - Metrik #21: Messung von `du -sk .git` auf `git rev-parse --git-common-dir` umstellen, damit
    sie auch im Prüfer-Worktree den echten Objekt-Store trifft statt der Worktree-Zeigerdatei.
  - Metrik #3: Regex-Zählung so anpassen, dass die abschließende Zusammenfassungszeile
    (`Code style issues found in N files...`) nicht mitgezählt wird; die Bedingung für die
    erklärende Notiz von `=== 82` auf den tatsächlichen Wert (84) korrigieren.
- `.lighthouserc.json` + zugehöriges Login-Setup gemäß Entscheidung 4.

### Block B — Schutzbereichs-TS-Fehler (8, explizit autorisiert)

- `src/features/resources/components/ResourceCard.tsx`, `src/features/resources/InternalResourcesView.tsx`: ungenutzten `React`-Import entfernen.
- `src/services/data/sources/baselineFileSource.ts`, `hubSpotBaselineSource.ts`,
  `simulatedCrmSource.ts`: die 7 Typ-Diskrepanzen zwischen den JSON-Baseline-Modulen und
  `CrmReadModel`/`HubSpotBaselineModule`/`HistoricalActivity` beheben. Falls die Ursache eine
  echte strukturelle Lücke im `CrmReadModel`-Typ ist (z. B. fehlendes `importedFunnelDeals`),
  den Typ um das tatsächlich vorhandene Feld ergänzen — nicht die JSON-Daten verbiegen.

### Block C — Konzentrationsdateien (349 Fehler, 65 %)

Die 11 in der Tabelle oben gelisteten Dateien, in absteigender Fehlerzahl abgearbeitet.
Nach Abschluss: `npx tsc --noEmit` zeigt ≤ 186 verbleibende Fehler.

### Block D — Restliche Dateien (186 Fehler, 105 Dateien)

Verbleibende Fehler außerhalb der Schutzbereiche und außerhalb Block C. `npx tsc --noEmit`
zeigt danach 0 Fehler.

## Erlaubte Dateien

| Datei/Muster | Zweck |
|---|---|
| Alle 116 laut `npx tsc --noEmit` betroffenen Dateien außerhalb der Schutzbereiche | TS-Fehler-Korrektur, reine Typebene |
| `src/features/resources/components/ResourceCard.tsx`, `InternalResourcesView.tsx` | Block B, nur ungenutzter Import |
| `src/services/data/sources/baselineFileSource.ts`, `hubSpotBaselineSource.ts`, `simulatedCrmSource.ts` | Block B, nur Typ-Korrektur |
| `scripts/verifyV22ReleaseReadiness.ts` | Block A, Metrik #3/#21 Zählfehler |
| `.lighthouserc.json` (+ ggf. neues Hilfsskript für den Login-Schritt) | Block A, Auth-Fix |
| `docs/releases/V2.2.0.md` | Zeile 48–49 mit korrigierter Lighthouse-Messung aktualisieren |
| `docs/BUILD_LOG.md` | Abschlussbericht |

## Pflicht-Verifikation

```
npx tsc --noEmit                          # 0 Fehler
npm run lint                               # weiterhin 4 Fehler (Metrik #13, unverändert), 0 Warnungen
npm run format:check                       # weiterhin 84 Abweichungen (unverändert, Metrik #3)
npm run verify                             # 24/24 Suiten grün
npm test                                   # 140/140 Tests grün
npm run build                              # Produktions-Build grün
npx playwright test                        # 165/165, insbesondere 15/15 Visual Regression bei 0px Diff
npx lhci autorun                           # finalDisplayedUrl muss .../dashboard sein, nicht .../login
npx tsx scripts/verifyV22ReleaseReadiness.ts
git diff ac3ff6c -- src/simulation src/types src/context src/features/resources   # leer (bis auf Block-B-Ausnahme)
git diff ac3ff6c -- src/services/data                                             # nur Block-B-Korrekturen
```

## Builder-Bericht

Neuer Abschnitt am Ende von `docs/BUILD_LOG.md`: Ziel & Kontext, geänderte Dateien je Block,
`npx tsc --noEmit`-Fehlerzahl nach jedem Block (535 → … → 0), Schutzbereichs-Diff-Nachweis für
Block B, Lighthouse-`finalDisplayedUrl`-Nachweis, aktualisierter Wert in
`docs/releases/V2.2.0.md`, vollständige Verifikationsmatrix, Ergebnis & Übergabe an den Prüfer.

## Akzeptanzkriterien für die Prüfung

- `npx tsc --noEmit` liefert unabhängig nachgerechnet 0 Fehler.
- Schutzbereichs-Diffs entsprechen exakt den in Entscheidung 1 erlaubten 8 Korrekturen, nichts
  Zusätzliches.
- Kein neuer `any`-Typ, kein neues `@ts-ignore`/`@ts-expect-error` ohne Begründung im Bericht.
- Lighthouse-Report zeigt nachweislich `/dashboard` als `finalDisplayedUrl`.
- `scripts/verifyV22ReleaseReadiness.ts` liefert bei unabhängigem Lauf im Prüfer-Worktree eine
  korrekte `.git`-Größe (nicht mehr 0 MB) und einen korrekten Prettier-Zähler (84, nicht 85).
- Alle bestehenden Suiten (verify/test/build/playwright) unverändert grün, keine visuelle
  Abweichung.
