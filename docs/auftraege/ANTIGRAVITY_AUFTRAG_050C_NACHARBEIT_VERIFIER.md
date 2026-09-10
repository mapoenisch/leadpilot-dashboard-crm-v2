# AUFTRAG 050-C / Gate G35 — Nacharbeit 050: Verifier-Bereinigung, Resources-Ratifizierung, Reste

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** 050-Review-Commit `e9f957c`
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_LOG.md` → „Review (Claude Code) … 050", Befunde P1–P3

## Ziel

Drei offene Punkte aus dem Auftrag-050-Review abschließen. Danach ist Auftrag 050
komplett; G35 als Ganzes folgt mit Auftrag 050-B (`src/simulation/`-Typhärtung).

## Verbindliche Entscheidungen (von Marc)

1. **P1:** `scripts/verifyLiveKpiStream.ts` ist obsolet → **löschen**, den einen
   erhaltenswerten Teil (Isolations-Audit) als kleinen Vitest retten, aus dem
   CI-Job nehmen.
2. **P2:** Die Block-D-Änderungen in `src/features/resources/**` werden
   **ratifiziert** (Scope nachträglich erweitert, nur a11y). Zusätzlich ein
   **neuer Playwright-Visual-Nachweis** für den `ResourceViewer` (die
   `<span>`→`<button>`-Änderung der Zoom-Anzeige).
3. **P3:** Leere Verzeichnisreste entfernen.
4. Keine neue npm-Abhängigkeit. Kein Merge, Tag. Ein CI-Bestätigungs-Push
   erlaubt (Block 1 + Block 2).

## Block 1 — P1: `verifyLiveKpiStream.ts` ablösen

- [ ] **1.1** `scripts/verifyLiveKpiStream.ts` **löschen** (`git rm`).
  Begründung im Bericht: Abschnitte 1–9 (Verhaltenstests über einen
  handgebauten Fake) sind seit G32–G34 vollständig durch
  `src/services/liveKpi/__tests__/liveKpiStreamStore.vitest.ts` +
  `liveKpiStreamStoreLifecycle.vitest.ts` (77 Tests) abgelöst; Abschnitt 11
  (String-Audit der Adapter-Sortierung) ist durch
  `liveKpiReadAdapter.vitest.ts` abgedeckt. Präzedenz:
  `verifyV21ReleaseReadiness.ts` (G31 gelöscht, gleicher Grund).
- [ ] **1.2** Abschnitt 10 (Isolations-Audit) als
  `src/services/liveKpi/__tests__/liveKpiIsolation.vitest.ts` (node-Projekt)
  neu: liest die Quelltexte von
  `src/services/liveKpi/liveKpiStreamStore.ts`,
  `src/hooks/useLiveKpi.ts`, `src/hooks/useLiveKpiHistory.ts`,
  `src/hooks/useLiveKpiActivity.ts` und prüft je Datei:
  - kein `supabaseClient`
  - kein Import, dessen Pfad `supabase` enthält
  - kein `setInterval`
  Ein `it()` pro Regel × Datei oder eine kompakte `it.each`. Rot machen durch
  testweises Einfügen von `import '@/services/db/supabaseClient'` → muss
  fehlschlagen.
- [ ] **1.3** In `.github/workflows/ci.yml`, Job `livekpi-verifiers`: die Zeile
  `- run: npx tsx scripts/verifyLiveKpiStream.ts` **entfernen**.
  `verifyLiveKpiCatalog.ts` und `verifyLivePerformanceSurface.ts` bleiben.
- [ ] **1.4** Prüfen, ob `verifyLiveKpiStream` sonst wo referenziert wird
  (`package.json`-Scripts, andere Skripte, Doku) — Funde mitentfernen bzw.
  Doku-Hinweis anpassen.

## Block 2 — P2: Resources ratifizieren + Visual-Nachweis

- [ ] **2.1 Ratifizierung dokumentieren.** An das Ende von
  `docs/auftraege/ANTIGRAVITY_AUFTRAG_050_LAYERING_KLEINBEFUNDE.md` einen
  Abschnitt **„Revision nach Review (2026-09-10)"**: Block D durfte
  `src/features/resources/components/ResourceCard.tsx` und
  `ResourceViewer.tsx` anfassen — **ausschließlich** für die a11y-Anpassungen
  (role/tabIndex/onKeyDown/aria-label; `<span>`→`<button>` der Zoom-Anzeige mit
  Chrome-Reset). Keine weitere Änderung an `src/features/resources/**`.
- [ ] **2.2 Deterministischer DOM-/Style-Test (harte Gate-Bedingung).**
  Neuer Spec `e2e/resources-viewer.spec.ts`:
  - `/resources/materials` öffnen, erste `ResourceCard` aktivieren (Klick), auf den
    `ResourceViewer` warten.
  - Assert: die Zoom-Prozent-Anzeige ist ein `button[type="button"]` mit
    `aria-label`.
  - Assert (computed style): `background-color` transparent/`rgba(0,0,0,0)`,
    `border-style` `none`, `padding` `0px`, und `font` identisch zum
    benachbarten Text (kein UA-Button-Font).
  - Kein Screenshot-Baseline nötig — läuft OS-unabhängig grün.
- [ ] **2.3 Visual-Snapshot.** `/resources/materials` in `e2e/visual.spec.ts` `ROUTES`
  aufnehmen (eine Zeile). Baselines für **beide** OS erzeugen und committen:
  - `-darwin`: lokal `npx playwright test visual` (nur die neue Route; schreibt
    die fehlende Baseline beim ersten Lauf **ohne** `--update-snapshots`).
  - `-linux`: auf demselben Weg wie die bestehenden `visual-*-linux.png`
    (offizielles `mcr.microsoft.com/playwright`-Image in der im Repo gepinnten
    Version, oder der dokumentierte Repo-Weg).
  - **Keine bestehende Baseline anfassen.** `git status` zeigt ausschließlich
    **neue** `visual-resources-materials-*-{darwin,linux}.png`.
  - Falls der `-linux`-Weg nicht verfügbar ist: **stoppen und melden**, nicht
    darwin-only committen.
- [ ] **2.4** `npx playwright test` komplett grün: die bisherigen 147 unverändert
  + die neuen (resources-viewer + visual/resources × 3 Viewports × Projekte).

## Block 3 — P3: Reste

- [ ] **3.1** `rmdir src/features/crm/data/baselines && rmdir src/features/crm/data`
  (nur wenn leer). Falls Git die leeren Ordner ohnehin nicht führt: im Bericht
  vermerken, dass lokal aufgeräumt wurde.
- [ ] **3.2** `grep -rn "features/crm/data" src scripts docs` = 0 lebende
  Referenzen (Doku-Erwähnungen im BUILD_LOG-Verlauf sind ok).

## Grenzen und Schutzbereiche

- Unverändert außer den hier genannten Dateien. Insbesondere: kein weiterer
  Eingriff in `src/features/resources/**` über 2.1–2.2 hinaus; `src/simulation/**`
  unberührt; `package.json` / `package-lock.json` / `vitest.config.ts` /
  `src/types/dataSource.ts` unberührt; `.github/workflows/ci.yml` nur die eine
  gelöschte Zeile (Block 1.3).
- `liveKpiStreamStore.ts` / `liveKpiReadAdapter.ts` / die Hooks: **nur lesen**
  (Block 1.2 liest ihren Quelltext). Kein Code-Eingriff.

## Erlaubte Dateien

| Datei | Block |
| --- | --- |
| `scripts/verifyLiveKpiStream.ts` | 1.1 (Löschung) |
| `src/services/liveKpi/__tests__/liveKpiIsolation.vitest.ts` | 1.2 (neu) |
| `.github/workflows/ci.yml` | 1.3 (eine Zeile weg) |
| `e2e/resources-viewer.spec.ts` | 2.2 (neu) |
| `e2e/visual.spec.ts` | 2.3 (eine Route mehr) |
| `e2e/visual.spec.ts-snapshots/visual-resources-materials-*-{darwin,linux}.png` | 2.3 (neu) |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_050_LAYERING_KLEINBEFUNDE.md` | 2.1 (Revision) |
| `docs/BUILD_LOG.md` | Bericht |
| `package.json` / Doku | 1.4 — **nur** falls dort eine tote `verifyLiveKpiStream`-Referenz steht |

## Pflicht-Verifikation

```bash
npm run test                 # inkl. liveKpiIsolation.vitest.ts, alle grün
npm run test:coverage        # EXIT 0
npm run verify               # 24/24
npm run build                # 0
npx tsc --noEmit 2>&1 | grep -c "error TS"     # 758 (unverändert)
npm run lint 2>&1 | grep problems              # 182 (unverändert)
npx tsx scripts/verifyLiveKpiCatalog.ts        # grün
npx tsx scripts/verifyLivePerformanceSurface.ts # grün
npx playwright test          # 147 alt unverändert + neue grün; nur NEUE snapshot-PNGs
git status --porcelain       # nur erlaubte Dateien; keine geänderte Bestands-Baseline
```

Zusätzlich: `git show --stat` des CI-Bestätigungs-Push; CI-Run-URL, in der
`livekpi-verifiers` **grün** ist.

## Builder-Bericht und Commit

Abschnitt **„Gate G35 – Auftrag 050-C: Verifier-Bereinigung + Resources-Nachweis"**
an den Anfang von `docs/BUILD_LOG.md`:

- Block 1: gelöschte Datei, neuer Vitest (welche Asserts), CI-Zeile weg,
  CI-Run-URL mit grünem `livekpi-verifiers`
- Block 2: Revision-Text, DOM-/Style-Assertions, wie die `-linux`-Baseline
  entstand, `git status` mit ausschließlich neuen PNGs
- Block 3: aufgeräumte Ordner
- Command-Matrix mit Exit-Codes

Commits: sinnvoll getrennt (Block 1, Block 2, Block 3) oder ein Commit mit
klarer Message — Builder entscheidet.

## Akzeptanzkriterien für die Prüfung

- `scripts/verifyLiveKpiStream.ts` weg; `liveKpiIsolation.vitest.ts` deckt die
  3 Isolations-Regeln × 4 Dateien ab und wird rot, wenn ein Supabase-Import
  eingeschmuggelt wird; `ci.yml`-Job `livekpi-verifiers` **grün** in einem
  echten Run.
- `verifyLiveKpiCatalog.ts` + `verifyLivePerformanceSurface.ts` weiterhin grün.
- Revision-Block in Auftrag 050; BUILD_LOG-Notiz.
- `resources-viewer.spec.ts` grün und OS-unabhängig (DOM/Style, keine Baseline);
  `visual.spec.ts` um `/resources/materials` erweitert, **nur neue** `-darwin`+`-linux`
  PNGs committet, **keine** Bestands-Baseline verändert, `npx playwright test`
  komplett grün.
- Leere `src/features/crm/data`-Ordner entfernt.
- `tsc` 758, `lint` 182, `verify` 24, `build` 0 — alles unverändert.

**Abnahme:** Erst nach unabhängigem Review. Danach ist Auftrag 050 abgeschlossen;
G35 wartet auf Auftrag 050-B. Kein Merge, Tag.
