# AUFTRAG 066 / Gate G43 (Fortsetzung) — CI-Fix (Kennzahl #22) & Screenshot-Ablage-Policy (Vorbereitung #21)

**Baseline:** `383ca7c` (Auftrag 065 Review abgeschlossen, bereits gepusht nach `origin`) ·
**Branch:** `codex/v2.2.0-haertung` · **Status:** OFFEN

Ausgelöst durch den ersten echten CI-Lauf seit G35 (Push nach Auftrag 065): CI ist **rot**
gelaufen. Root Cause bereits identifiziert — kein App-Bug, ein veraltetes Prüfskript. Zusätzlich
setzt dieser Auftrag Marcs Entscheidung um, Screenshot-Belege künftig **nicht mehr im Git-Verlauf**
abzulegen, als Vorbereitung für den geplanten `.git`-History-Rewrite (Kennzahl #21).

## Ziel

1. **CI grün bekommen (Kennzahl #22).** `scripts/verifyLivePerformanceSurface.ts` schlägt auf
   `origin/codex/v2.2.0-haertung` fehl (Run `34818819298`, Job `livekpi-verifiers`), lokal
   reproduziert.
2. **Screenshot-PNGs künftig nicht mehr committen.** Nur die textuellen Nachweis-Matrizen
   (`README.md` je Auftrags-Ordner mit Hash-Tabellen) bleiben im Git-Verlauf — analog zu
   `coverage/`, `playwright-report/`, `test-results/`, die bereits per `.gitignore` ausgeschlossen
   sind.

## Ist-Stand (nachgemessen)

### CI-Fund

`scripts/verifyLivePerformanceSurface.ts:106` prüft per reinem String-Grep auf dem Quellcode von
`LiveKpiCard.tsx`:

```ts
assert(cardSrc.includes('pointerEvents: \'none\'') || cardSrc.includes('pointer-events: none'), 'Pulse overlay is pointer-events: none');
```

Der aktuelle Code (`src/components/liveKpi/LiveKpiCard.tsx:142`) setzt das funktional identische
Verhalten über die Tailwind-Utility-Klasse:

```tsx
className="live-kpi-pulse pointer-events-none"
```

Das Skript stammt aus G26 (Auftrag 042), vor den späteren Styling-Wellen (G38/G39), die Inline-
Styles durch Tailwind-Klassen ersetzt haben — die Prüfung wurde dabei nie nachgezogen. **Kein
Verhaltens-Bug**, ausschließlich ein veraltetes Assertion-Pattern. Das Skript ist Teil des CI-Jobs
`livekpi-verifiers` (`.github/workflows/ci.yml:91-92`) und läuft **nicht** über `npm run verify`
— deshalb ist es durch keinen der bisherigen Gate-Reviews gelaufen.

### Screenshot-Fund

`git filter-repo --analyze` (Prüfer-Recherche, Wegwerf-Klon) zeigt: `docs/screenshots/**` allein
trägt **60 MB** zur `.git`-Größe bei (von aktuell 77 MB) — reine Vorher/Nachher-Bildbelege je
Gate, kein App-Code. Damit ein künftiger History-Rewrite nicht sofort durch neue Commits wieder
zuwächst, muss die Praxis **vor** dem Rewrite geändert werden.

## Verbindliche Entscheidungen

1. **Assertion-Fix, keine Verhaltensänderung.** Die Zeile in
   `scripts/verifyLivePerformanceSurface.ts` wird um die Tailwind-Schreibweise ergänzt
   (`cardSrc.includes('pointer-events-none')` als dritte, gleichwertige Alternative). Keine
   Änderung an `LiveKpiCard.tsx` selbst — der Code ist korrekt, nur die Prüfung war stale.
2. **Screenshot-PNGs ab sofort nicht mehr tracken.** `.gitignore` erhält einen neuen Eintrag für
   `docs/screenshots/**/*.png` (und `*.jpg`/`*.webp`, falls vorhanden). Bereits committete PNGs in
   `docs/screenshots/**` bleiben in diesem Auftrag unangetastet in der aktuellen Historie liegen
   — deren Entfernung ist Aufgabe des separaten, folgenden History-Rewrite-Schritts (Kennzahl #21,
   kein Antigravity-Auftrag, sondern eine von Claude Code direkt durchgeführte, mit Marc
   abgestimmte Repository-Operation).
3. **`README.md`-Nachweis-Matrizen bleiben getrackt.** Die Hash-Tabellen unter
   `docs/screenshots/auftrag-XXX/README.md` sind reiner Text, enthalten die eigentliche
   Prüf-Information (SHA-256-Hashes, Diff-Ergebnisse) und bleiben wie bisher Teil des Commits —
   nur die Bilddateien selbst werden lokal generiert und bleiben ungetrackt (analog zu `coverage/`,
   `playwright-report/`, `test-results/`).
4. **Dokumentation der neuen Praxis.** `CLAUDE.md` Abschnitt 7 (Pflicht-Verifikation) und die
   Screenshot-Harness-Beschreibung ergänzen: Screenshots werden weiterhin lokal erzeugt und
   geprüft (SHA-256-Vergleich, Overflow-Check), aber nur die Ergebnis-Matrix (`README.md`) wird
   committet, nicht die Bilddateien selbst.

## Grenzen und Schutzbereiche

Keine der Zieldateien liegt in einem Schutzbereich. `git diff 383ca7c -- src/simulation
src/types src/context src/services/data src/features/resources` muss leer bleiben.
`src/components/liveKpi/LiveKpiCard.tsx` wird **nicht** verändert (Entscheidung 1).

## Blöcke

### Block A — CI-Fix

`scripts/verifyLivePerformanceSurface.ts`: Assertion um Tailwind-Schreibweise ergänzen.

### Block B — Screenshot-Policy

- `.gitignore`: Eintrag für `docs/screenshots/**/*.png` (und ggf. weitere Bildformate).
- `CLAUDE.md`: Abschnitt 7 um die neue Praxis ergänzen.
- **Nicht** die bereits getrackten PNG-Dateien aus dem aktuellen Commit entfernen (`git rm
  --cached`) — das würde nur die aktuelle Baumsicht ändern, nicht die Historie, und liefe der
  geplanten sauberen History-Rewrite-Operation in die Quere. Ein `.gitignore`-Eintrag verhindert
  ausschließlich, dass *künftige* neue PNGs erneut committet werden.

### Block C — Verifikation & Push

Nach Block A/B: lokale Verifikation, Commit, **Push nach `origin/codex/v2.2.0-haertung`**, echten
CI-Lauf abwarten und Ergebnis im Bericht dokumentieren (Kennzahl #22 gilt erst nach einem
tatsächlich grünen GitHub-Actions-Lauf als erfüllt, nicht schon nach dem lokalen Test).

## Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
npx playwright test
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLivePerformanceSurface.ts   # muss jetzt grün sein, exit 0
git diff 383ca7c -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff 383ca7c -- src/components/liveKpi/LiveKpiCard.tsx                                            # leer (Entscheidung 1)
```

Nach dem Push zusätzlich: `gh run list --branch codex/v2.2.0-haertung --limit 1` — muss
`completed success` zeigen, bevor der Auftrag als abgeschlossen gilt.

## Akzeptanzkriterien für die Prüfung

- `npx tsx scripts/verifyLivePerformanceSurface.ts` läuft lokal grün durch.
- `LiveKpiCard.tsx` ist unverändert gegenüber `383ca7c`.
- `docs/screenshots/**/*.png` ist neu in `.gitignore`, bestehende getrackte PNGs sind unangetastet.
- Nach dem Push: ein echter GitHub-Actions-Lauf auf `codex/v2.2.0-haertung` ist **grün** —
  das ist der eigentliche Nachweis für Kennzahl #22, nicht nur die lokale Ausführung.
