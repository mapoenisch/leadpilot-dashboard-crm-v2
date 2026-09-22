# AUFTRAG 067P-N — PR-CI-Nacharbeit und Abschluss von Issue #13

**Baseline:** `d984068` · **Branch:** `feat/auftrag-067p-audit-diagnostics` (weiterarbeiten) · **Status:** BEREIT ZUR UMSETZUNG

Dieser Auftrag räumt ausschließlich die zwei nachweislichen Blocker der GitHub-PR #20 auf:

1. die nicht deterministische Vitest-Assertion in `MeasureManagerModal.branch.ui.vitest.tsx`,
2. sechs absichtlich veraltete Linux-Visual-Baselines für `/dashboard` und `/crm/leads`.

Zusätzlich wird GitHub Issue #13 nachhaltig geschlossen: Die bereits umgesetzte 375-px-Umbruchkorrektur auf `/resources/materials` erhält ihren bestehenden echten Clipping-Test als verpflichtenden CI-Gate. Ein bloßer `document.documentElement.scrollWidth`-Check genügt nicht, weil er innerhalb eines Containers abgeschnittene Inhalte nicht erkennt.

## Maßgebliche Dokumente (in dieser Reihenfolge)

1. `CLAUDE.md`
2. `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md` — Schutzbereich und G62
3. `docs/BUILD_LOG.md` — letzter G62-Prüfer-Befund und PR-CI-Befund
4. GitHub Issue #13 — „Horizontaler Overflow /resources/materials mobile"
5. `.github/workflows/ci.yml`, `e2e/element-clipping.acceptance.ts` und `e2e/visual.spec.ts`

Bei Widerspruch gilt diese Reihenfolge.

## Befund und Zielbild

Der PR-Lauf auf Ubuntu / Node 22.18.0 scheiterte nicht an G62:

| CI-Blocker | Nachweis | Ziel dieses Auftrags |
|---|---|---|
| Vitest | `MeasureManagerModal.branch.ui.vitest.tsx` findet nach dem Tippen den Fehlertext nicht; im DOM fehlt zugleich der erwartete Name. Der Test ist auf dem Vorgängerstand nicht verändert worden und lokal nicht zuverlässig reproduzierbar. | Test-Setup unter Node 22.18.0 deterministisch machen, ohne Produktionsverhalten abzuschwächen. |
| Visual | Genau `/dashboard` und `/crm/leads` je Desktop, Tablet und Mobile schlagen nach den sichtbaren G60/G61-Provenance-/Freshness-Änderungen fehl. | Nur die sechs Linux-Baselines nach sichtbarer Prüfung aktualisieren. |
| Issue #13 | Die UI wurde in G56 umbruchfähig gebaut; `e2e/element-clipping.acceptance.ts` prüft die beiden konkreten Elemente, wird aber von `.github/workflows/ci.yml` nicht ausgeführt. | Test bei festem 375-px-Viewport stabilisieren und in die Standard-E2E-Phase aufnehmen. |

Nach Abschluss ist PR #20 ohne CI-Ausnahmen grün. Issue #13 kann erst nach einem grünen PR-Lauf als erledigt markiert werden.

## Erlaubte Zieldateien

| Art | Dateien |
|---|---|
| Modify | `.github/workflows/ci.yml`, `e2e/element-clipping.acceptance.ts`, `src/features/simulation/components/__tests__/MeasureManagerModal.branch.ui.vitest.tsx`, `src/features/resources/InternalResourcesView.tsx`, `src/features/resources/__tests__/InternalResourcesView.characterization.ui.vitest.tsx`, `docs/BUILD_LOG.md` |
| Update — ausschließlich Linux | `e2e/visual.spec.ts-snapshots/visual-dashboard-1-desktop-1440-linux.png`, `e2e/visual.spec.ts-snapshots/visual-dashboard-1-tablet-768-linux.png`, `e2e/visual.spec.ts-snapshots/visual-dashboard-1-mobile-375-linux.png`, `e2e/visual.spec.ts-snapshots/visual-crm-leads-1-desktop-1440-linux.png`, `e2e/visual.spec.ts-snapshots/visual-crm-leads-1-tablet-768-linux.png`, `e2e/visual.spec.ts-snapshots/visual-crm-leads-1-mobile-375-linux.png` |
| Create | `docs/screenshots/auftrag-067p-nacharbeit-ci/README.md` |

`src/features/resources/**` ist für **diesen Auftrag ausschließlich** für die Fehlerbehebung
zu Issue #13 freigegeben. Ergibt der vorhandene 375-px-Test nach CI-naher Ausführung bereits
grün, bleibt die Produktdatei unverändert. Jede weitere Datei ist ein Stopp-Punkt.

Unverändert bleiben insbesondere G62-Migrationen, Audit-/Health-Services und -Seiten,
`src/simulation/**` außerhalb der expliziten Testdatei, `src/types/**`, `src/context/**`,
`src/services/data/**`, `src/services/db/crmRepository.ts`, Auth, Mitgliederverwaltung,
RLS und alle übrigen Screenshot-Baselines.

## Verbindliche Arbeitsschritte (rot vor grün)

- [ ] **A — Issue #13 zuerst nachhaltig absichern.** Führe den vorhandenen
  `e2e/element-clipping.acceptance.ts` gegen `/resources/materials` auf exakt 375 × 812 px
  aus. Der Test muss den Viewport selbst festlegen oder auf genau ein mobiles Projekt begrenzen;
  die Konstante `VIEWPORT_WIDTH = 375` darf nicht bei Desktop-/Tablet-Projekten mitlaufen.
  Er behält beide konkreten Ziele `100% Verlustfrei integriert` und `Operations & SLA` und
  misst weiter Elementrechteck **und** tatsächlichen Overflow-Container. Ein neuer globaler
  Dokument-Overflow-Test ist kein Ersatz.

- [ ] **B — #13 bei Bedarf reparieren, nicht verdecken.** Ist A rot, korrigiere ausschließlich
  den responsiven Banner-/Tab-Layoutpfad in `InternalResourcesView.tsx`; keine feste Breite,
  kein `overflow: hidden`, kein Kürzen oder Ausblenden der beiden Texte. Ergänze nur dann eine
  passende Charakterisierungsassertion. Wiederhole A, bis beide Beschriftungen vollständig
  innerhalb von Viewport und Container liegen. Danach füge die bestehende Spec zum ersten
  Playwright-Schritt in `.github/workflows/ci.yml` hinzu.

- [ ] **C — Vitest-Fehler unter CI-Bedingungen reproduzieren und beheben.** Verwende Node
  22.18.0 wie in CI. Belege zuerst nach `user.type(...)`, dass das Namensfeld tatsächlich
  `Dauer-Test` enthält. Stabilisiere anschließend ausschließlich die Testinteraktion (z. B.
  Warten auf den kontrollierten Feldwert); keine Änderung an `MeasureManagerModal` und keine
  abgeschwächte Fehlermeldungs-Assertion. Führe die betroffene Spec und danach
  `npm run test:coverage` mindestens dreimal hintereinander mit Node 22.18.0 aus.

- [ ] **D — Nur sechs Visual-Baselines gezielt erneuern.** Erzeuge die Baselines in einer
  Linux-/CI-kompatiblen Umgebung und prüfe für jede Datei Expected, Actual und Diff visuell.
  Zulässig sind ausschließlich die sechs oben genannten `*-linux.png`. Sie müssen die
  beabsichtigten sichtbaren G60/G61-Zustände zeigen (Dashboard-Freshness bzw.
  CRM-Provenance), keine Fehlerseite, keine abgeschnittenen Inhalte und keine neue
  unmotivierte Layoutänderung. Darwin-Snapshots, `/resources/materials` und die übrigen drei
  Visual-Routen bleiben unverändert.

- [ ] **E — Nachweise und Übergabe.** Lege eine textuelle Matrix unter
  `docs/screenshots/auftrag-067p-nacharbeit-ci/README.md` an: Route, Viewport, Linux-Snapshot,
  sichtgeprüfter Inhalt, horizontaler Overflow in px und Ergebnis. Ergänze den vollständigen
  Builder-Eintrag in `docs/BUILD_LOG.md` mit Baseline, konkreter Ursache, Node-Version,
  dreifachem Coverage-Nachweis, Clipping-Messwerten, Snapshot-Prüfung, CI-Dateiliste und
  Schutzbereichs-Diff.

## Pflicht-Verifikation

```bash
node --version                         # muss v22.18.0 sein
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm run test:coverage                  # dreimal hintereinander
npm run build
npx playwright test e2e/element-clipping.acceptance.ts --project=mobile-375
npx playwright test e2e/a11y.spec.ts e2e/auth.spec.ts e2e/crm-query-export.spec.ts e2e/resources-viewer.spec.ts e2e/routes.spec.ts e2e/semantic-routes.spec.ts e2e/element-clipping.acceptance.ts e2e/tenant-isolation.spec.ts e2e/visual.spec.ts
git diff --check d984068
git diff d984068 -- src/simulation src/types src/context src/services/data src/services/db/crmRepository.ts src/auth src/features/auth
```

Für die Visual-Baselines ist zusätzlich der vollständige CI-nahe Linux-Lauf Pflicht. Falls
Docker oder ein gleichwertiger Linux-Runner lokal fehlt, nicht Mac-Snapshots als Ersatz
committen: nach lokaler Vorprüfung an den Prüfer übergeben und die Linux-Aktualisierung über
den vorgesehenen PR-/Workflow-Lauf durchführen.

## Akzeptanzkriterien

- Der MeasureManager-Test besteht unter Node 22.18.0 dreimal hintereinander als Teil der
  vollständigen Coverage-Suite; die Produktionskomponente bleibt unverändert.
- Der Standard-E2E-Schritt der CI führt `element-clipping.acceptance.ts` aus. Beide #13-Texte
  bestehen bei 375 px die Viewport- **und** Container-Grenzprüfungen ohne Clipping.
- Die sechs und nur die sechs genannten Linux-Visual-Baselines sind nachweisbar inhaltlich
  geprüft und entsprechen den beabsichtigten G60/G61-Oberflächen.
- Vollständige PR-CI ist grün; erst dann dokumentiert der Prüfer Issue #13 als erledigt und
  schließt es. Kein Verzicht auf die Assertion und kein „known failure".
- Der Schutzbereichs-Diff ist bis auf die ausdrücklich erlaubte #13-Datei leer.

## Stopp-Punkte und Übergabe

- Kein Push, Merge, Deploy, Issue-Close oder Workflow-Dispatch durch den Builder.
- Keine Baseline-Aktualisierung ohne sichtbare Einzelprüfung.
- Schlägt der Clipping-Test nach einer engen Layoutkorrektur weiter fehl, oder verlangt die
  Linux-Baseline-Erzeugung weitere Dateien, stoppen und mit Datei, Messwert und Screenshot-Diff
  an den Prüfer zurückgeben.
- Committe lokal mit `fix(ci): stabilize PR gates and enforce issue 13 clipping check` und
  übergib anschließend an den unabhängigen Prüfer. Der Prüfer entscheidet nach dem grünen
  PR-Lauf über das Schließen von Issue #13.
