# Große Kernmodule aufteilen

Die vier größten produktiven Module dieses Repos werden **nicht** nach
Verantwortlichkeiten zerlegt. Ihre Größe ist gesehen, bewertet und als
dauerhafte Ausnahme akzeptiert.

Betroffen sind insbesondere:

| Datei | Größe | Schutzbereich |
|---|---|---|
| `src/simulation/scenarioService.ts` | ~45 kB | `src/simulation/**` |
| `src/simulation/eventRules.ts` | ~24 kB | `src/simulation/**` |
| `src/features/resources/components/ResourceViewer.tsx` | ~22 kB | `src/features/resources/**` |

## Warum das out of scope ist

**Es sind Schutzbereiche.** `CLAUDE.md` §6 stellt `src/simulation/**` und
`src/features/resources/**` unter Schutz. Für beide gilt: der Diff gegen den
Baseline-Commit muss vor jedem Commit leer sein, sofern der laufende Auftrag den
Pfad nicht ausdrücklich als Ziel nennt. `src/features/resources/**` ist zusätzlich
als „bewusst eingefroren" markiert. Ein Refactoring dieser Größenordnung ist die
invasivste denkbare Verletzung dieser Regel.

**Die Entscheidung ist bereits getroffen.** `scripts/verifyV22ReleaseReadiness.ts`
hält sie fest:

```ts
note: 'MAX_LINES_BASELINE=4, alle 4 Dateien in Schutzbereichen (simulation/, features/resources/), von Marc als dauerhafte Ausnahme akzeptiert',
```

„Dauerhafte Ausnahme" ist keine Vertagung, sondern eine Ablehnung. Die Baseline
von 4 ist der Zielwert, nicht ein Zwischenstand auf dem Weg zu 0 — anders als
etwa `TSC_BASELINE`, das planmäßig auf 0 gesenkt wurde.

**Das fachliche Risiko ist real.** Die Simulations-Engine trägt die
Reproduzierbarkeit des Produkts: RNG- und Seed-Verhalten, Run- und
Versionsmodell, Persistenzlogik. Genau deshalb steht sie unter Schutz. Modul-
grenzen zu verschieben heißt, Import-Reihenfolge, Initialisierungsreihenfolge und
damit potenziell die Reihenfolge der RNG-Aufrufe zu verschieben. Ein identischer
Seed könnte danach einen anderen Lauf erzeugen, ohne dass ein Test das
zwangsläufig meldet — und Szenario-Vergleiche laufen zwischen *Versionen*, deren
Vergleichbarkeit genau an dieser Determiniertheit hängt.

Dem steht ein Gewinn an Lesbarkeit gegenüber. Das ist kein guter Tausch, zumal
die Engine bereits von umfangreichen Integrity-Suiten abgedeckt ist
(`scenarioComparisonIntegrity`, `financialIntegrity`, `stateMachineIntegrity`,
`snapshotIntegrity` und weitere), die das Verhalten festnageln — der übliche
Hebel gegen große Module, Testbarkeit, ist hier also bereits gezogen.

## Was davon nicht abgedeckt ist

Diese Ablehnung gilt der Zerlegung selbst. Zwei angrenzende Punkte bleiben offen:

- `MAX_LINES_BASELINE` wird in der CI deklariert, aber von keinem Schritt
  ausgewertet — die akzeptierte Ausnahme hat damit keine durchgesetzte
  Obergrenze. Eine fünfte zu große Datei fiele heute nicht auf. Das läuft
  unter #7.
- **Neue** produktive Module außerhalb der Schutzbereiche fallen nicht unter
  diese Ausnahme. Sie unterliegen der normalen Zeilenobergrenze.

## Wenn die Entscheidung neu aufgemacht wird

Nicht über ein Issue, sondern über einen Auftrag unter `docs/auftraege/`, der den
Schutzbereich ausdrücklich als Ziel nennt. Erster Schritt wären
Charakterisierungstests, die Lauf-Output bei festem Seed über die Modulgrenze
hinweg festhalten — vor dem ersten Schnitt, nicht danach.

## Bisherige Anfragen

- #6 — „[MEDIUM] Große Kernmodule nach Verantwortung zerlegen"
