# AUFTRAG 055 / Gate G39 (Welle 2) — Styling-Migration: CRM/Finanzen/Geschäftsmodell/Kunden/Markt + Primitive-Fix

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `238e313` (Gate G39 Welle 1 komplett, abgenommen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G39 / 054–057.
Welle 1 (Auftrag 054) hat die Infrastruktur gebaut (Theme, Container-
Queries, Skeleton) und 22 Dateien migriert. Diese Welle **baut nichts
mehr neu** — reine Migration mit der bestehenden Infrastruktur, plus
ein kleiner, klar begründeter Fix an zwei G38-Primitives, der Welle 2
direkt zugutekommt.

## Ziel

1. **Primitive-Fix (Voraussetzung für saubere Migration):** `Button.tsx`
   und `Card.tsx` haben einen `className`-Merge-Fehler, der in der
   Welle-1-Prüfung gefunden wurde (siehe `docs/BUILD_LOG.md`,
   G39-Welle-1-Review). `Badge.tsx` hat keine Größen-Variante. Diese
   drei Lücken zwingen Aufrufer in den Style-Passthrough, obwohl der
   gewünschte Wert (z. B. eine kleinere Badge-Schriftgröße) eigentlich
   eine Tailwind-Klasse sein könnte. Fix jetzt, bevor Welle 2 denselben
   Passthrough-Umweg für neue Dateien braucht.
2. **Welle 2: 23 Dateien** von Inline-Styles auf die G38/G39-Primitives
   umstellen (Liste unten) — Verzeichnisse `crm/`, `finanzen/`,
   `generic/`, `geschaeftsmodell/`, `kunden/`, `markt/`.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

- **81 Dateien** aktuell mit `style={{...}}` außerhalb
  `src/components/ui/**` (`INLINE_STYLE_BASELINE` aus Welle 1). Davon
  sind **9 bereits geprüft und akzeptiert** (Welle-1-Dateien mit
  dokumentierten Passthrough-/Laufzeit-Resten, siehe Welle-1-Review) —
  die bleiben unangetastet, diese Auftrag zählt nicht dagegen.
  **72 Dateien sind noch nicht migriert**, alle in `src/features/**`.
- **Davon 3 in einem Schutzbereich:** `src/features/resources/*`
  (`InternalResourcesView.tsx`, `ResourceCard.tsx`,
  `ResourceViewer.tsx`) — laut `CLAUDE.md` Abschnitt 6 „bewusst
  eingefroren". **Nicht Teil dieser oder irgendeiner G39-Welle.**
  Bleiben dauerhaft in der `INLINE_STYLE_BASELINE`-Zählung, bis Marc
  einen eigenen Auftrag dafür schreiben lässt.
- **Damit 69 Dateien real migrierbar** über die Wellen 2–4. Diese
  Welle nimmt **23** davon (Verzeichnisse `crm/`, `finanzen/`,
  `generic/`, `geschaeftsmodell/`, `kunden/`, `markt/` — vollständig,
  keine Datei aus diesen Verzeichnissen bleibt für später übrig).
  Wellen 3 (056) und 4 (057) übernehmen die restlichen 46
  (`organisation/`, `overview/`, `produkt/`, `projektkontext/`,
  `recht/`, `simulation/` bzw. `standalone/`, `strategie/`,
  `unternehmen/`, `vertrieb/`).
- **Komplexität deutlich höher als Welle 1:** Welle 1 hatte meist
  einstellige bis niedrige zweistellige `style={{`-Vorkommen pro
  Datei (Layout-Spacing, Badges). Diese Welle enthält mehrere
  Datenvisualisierungs-Komponenten mit sehr vielen Vorkommen —
  `DecisionTopology.tsx` (882 Zeilen, 53×), `SegmentFields.tsx`
  (440 Zeilen, 57×), `SwotCompass.tsx` (461 Zeilen, 36×),
  `CapitalCut.tsx` (339 Zeilen, 43×). Erwartung: **deutlich mehr
  legitime Laufzeit-Ausnahmen** als in Welle 1 (Diagramm-Geometrie,
  Positionierung, datengetriebene Farben) — das ist normal für diese
  Dateien, kein Zeichen für zu vorsichtige Migration. Siehe
  Entscheidung 2 für die Abgrenzungsregel.
- **`Button.tsx`/`Card.tsx`-Bug (nachgemessen):** beide setzen
  `className={cn(...)}` explizit und spreaden danach `{...rest}` —
  ein von außen übergebenes `className` würde die berechneten
  `cva`-Klassen komplett überschreiben statt zu mergen (JSX-Prop-
  Reihenfolge, kein Merge). Aktuell nutzt niemand im Repo `className`
  an `Button`/`Card` (verifiziert, 0 Treffer) — der Bug ist real, aber
  noch folgenlos. 10 der 23 Welle-2-Dateien verwenden `Badge`/`Card`/
  `Button` — ohne Fix würden neue Fälle wieder in den Style-
  Passthrough ausweichen müssen, wo eine Klasse gereicht hätte.

## Verbindliche Entscheidungen

1. **Primitive-Fix, Block A:**
   - `Button.tsx`, `Card.tsx`: `className` aus `rest` destrukturieren
     und über `cn(...)` mit den berechneten Varianten-Klassen mergen
     (Aufrufer-`className` ergänzt, überschreibt nicht), statt es
     unkontrolliert über `{...rest}` durchzureichen. Reihenfolge in
     `cn(...)` so, dass ein Aufrufer-Override tatsächlich gewinnen
     kann, wo gewünscht (Standard-`cva`-Verhalten: letzter Eintrag
     gewinnt bei Tailwind-Klassenkonflikten über die normale Kaskade,
     nicht über JS-Preisgabe).
   - `Badge.tsx`: neue `size`-Variante (`cva`), mindestens `sm`
     (deckt die in Welle 1 gefundenen Fälle `fontSize: '9.5px'` /
     `padding: '2px 8px'` etc. ab — Builder-Ermessen, welche
     Werte-Kombination als Skala sinnvoll ist, muss aber die 8
     bestehenden Aufrufer in `liveKpi/*` und `SimulationBar.tsx`
     unverändert pixelgleich lassen, wenn deren Passthrough-`style`
     durch die neue Variante ersetzt wird — **optional**: wenn das
     Ersetzen der 8 bestehenden Passthrough-Stellen in dieser Welle
     zu riskant/aufwendig ist, reicht die neue Variante für Welle-2-
     Neufälle, die 8 bestehenden bleiben unangetastet (kein Zwang,
     Welle 1 rückwirkend zu ändern).
   - Nach dem Fix: `grep -rn "className=" src --include="*.tsx" | grep -E "<Button|<Card"` zur Kontrolle, dass niemand versehentlich in einer
     Weise `className` nutzt, die vom neuen Merge-Verhalten abweicht
     (sollte weiterhin 0 sein, da noch kein Aufrufer das Prop nutzt).
2. **Laufzeit-Ausnahme-Regel (unverändert seit Auftrag 053 Nachtrag 2,
   hier wegen der Diagramm-Dichte nochmal explizit):** ein `style`-
   Objekt darf nur bleiben, wenn **jeder** Wert darin ein echter
   Laufzeitausdruck ist (aus Props/State/Daten berechnet — Position,
   Höhe, Breite, Farbe aus einem Datenpunkt, Pfad-Koordinaten einer
   SVG). Ein String-Literal oder ein Ternary zwischen zwei zur
   Build-Zeit bekannten Werten (z. B. `width: isActive ? '16px' :
   '12px'`) ist **kein** Laufzeitwert und muss eine Klassen-Ternary
   werden. Zeilengenaues `eslint-disable-next-line
   react/forbid-dom-props` mit Begründungskommentar bei jeder
   verbleibenden Stelle — keine Datei-Ausnahme.
3. **`INLINE_STYLE_BASELINE` senken, aber ohne Zielzahl-Zwang:** die
   Ratsche muss nach dieser Welle **niedriger als 81** sein (die 23
   Dateien verlassen die Zählung, abzüglich echter, dokumentierter
   Laufzeit-Reste). Keine vorab festgelegte Zielzahl — Welle 1 hat
   gezeigt, dass ein zu hart vorgegebenes Ziel (94→72) zu Diskussionen
   führt, wenn die Realität (Primitive-Limitierungen, Diagramm-Dichte)
   dagegen steht. Ehrlich messen, im Bericht begründen, Ratsche auf
   den tatsächlichen Wert senken.
4. **Kein neues Business-Feature, keine neue Abhängigkeit.** Reine
   1:1-Migration der bestehenden Optik — sichtbares Verhalten bleibt
   unverändert (diesmal ohne den Sonderfall aus Welle 1: kein neues
   UI-Element wird hinzugefügt, also keine Playwright-Snapshot-
   Invalidierung durch dieses Auftrag zu erwarten außer echten
   Pixel-Abweichungen aus falsch getroffenen Arbitrary-Values).
5. **Screenshot-Methodik (unverändert, Pflicht seit Welle 1):** niemals
   PNGs in den eigenen Kontext laden. Baseline/After-Paare per
   `shasum -a 256` vergleichen, Abweichungen per Skript-Pixel-Diff
   (BBox + max. Kanal-Delta, Strong-Pixel-Anteil bei Verdacht) bewerten,
   nur bei echtem Befund ein einzelnes Bild ansehen. Diese Welle betrifft
   keine der 5 Playwright-`visual.spec.ts`-Routen direkt (keine davon
   liegt in `crm/`, `finanzen/`, `generic/`, `geschaeftsmodell/`,
   `kunden/`, `markt/` — außer indirekt über globale Layout-Komponenten,
   die hier nicht angefasst werden) — trotzdem `npx playwright test`
   fahren, falls doch eine Route betroffen ist (z. B. über
   Sub-Komponenten-Importe).

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- **`src/features/resources/**` bleibt eingefroren** — auch wenn die
  3 Dateien dort in der `style={{`-Liste auftauchen, sind sie **nicht**
  Teil dieser Welle.
- `git diff 238e313 -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein (Hinweis: `src/features/simulation/**` ist NICHT `src/simulation/**` — die Feature-Views unter `features/simulation/` sind normale, nicht geschützte UI-Komponenten und in dieser Welle unangetastet, kommen aber in Welle 3).
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Primitive-Fix (`Button`/`Card` className-Merge, `Badge` size-Variante)

- [ ] `Button.tsx`, `Card.tsx`: `className` korrekt gemerged statt überschrieben (Entscheidung 1).
- [ ] `Badge.tsx`: `size`-Variante ergänzt (mind. `sm`).
- [ ] Bestehende 19+1 Primitives-Konsumenten unverändert pixelgleich (Kontrolle: `/design-system`-Galerie Screenshot-Diff gegen Welle-1-Endstand).
- [ ] `npx tsc --noEmit`, `npm run build` grün.

### Block B — `crm/` (5 Dateien)

- [ ] `ActivitiesView.tsx`, `CompaniesView.tsx`, `CrmResponsiveList.tsx`, `DealsView.tsx`, `LeadsPage.tsx` migriert.

### Block C — `finanzen/` + `generic/` + `geschaeftsmodell/` (7 Dateien)

- [ ] `CapitalCut.tsx`, `RevenueCostShoreline.tsx`, `SaasMotor.tsx`, `BudgetPage.tsx`, `GenericDocView.tsx`, `BmcPage.tsx`, `BusinessLogicPage.tsx` migriert.

### Block D — `kunden/` (8 Dateien)

- [ ] `CustomerPortfolio.tsx`, `IcpFitMap.tsx`, `PersonaDossier.tsx`, `RevenueStaircase.tsx`, `SegmentFields.tsx`, `VolkerDayTimeline.tsx`, `CustomerSuccessPage.tsx`, `EmpathyPage.tsx` migriert.

### Block E — `markt/` (3 Dateien)

- [ ] `DecisionTopology.tsx`, `MarketOpportunityStack.tsx`, `SwotCompass.tsx` migriert.
- [ ] ESLint-Regel-Scope um alle 23 Welle-2-Dateien erweitert, `INLINE_STYLE_BASELINE` gesenkt (Entscheidung 3).
- [ ] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün.
- [ ] Screenshot-Nachweis (Methodik: Entscheidung 5) für betroffene Routen unter `docs/screenshots/auftrag-055/README.md`.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx` | A |
| `src/features/crm/components/{ActivitiesView,CompaniesView,CrmResponsiveList,DealsView}.tsx`, `src/features/crm/pages/LeadsPage.tsx` | B |
| `src/features/finanzen/components/{CapitalCut,RevenueCostShoreline,SaasMotor}.tsx`, `src/features/finanzen/pages/BudgetPage.tsx`, `src/features/generic/GenericDocView.tsx`, `src/features/geschaeftsmodell/pages/{BmcPage,BusinessLogicPage}.tsx` | C |
| `src/features/kunden/components/{CustomerPortfolio,IcpFitMap,PersonaDossier,RevenueStaircase,SegmentFields,VolkerDayTimeline}.tsx`, `src/features/kunden/pages/{CustomerSuccessPage,EmpathyPage}.tsx` | D |
| `src/features/markt/components/{DecisionTopology,MarketOpportunityStack,SwotCompass}.tsx` | E |
| `eslint.config.js`, `.github/workflows/ci.yml` (nur Scope-Erweiterung + Ratsche) | E |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere keine der 46 Dateien
aus `organisation/`, `overview/`, `produkt/`, `projektkontext/`,
`recht/`, `simulation/`, `standalone/`, `strategie/`, `unternehmen/`,
`vertrieb/` (Wellen 3–4), und keine der 3 Dateien in
`src/features/resources/**` (eingefroren).

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test
grep -rl "style={{" src --include="*.tsx" | grep -v "^src/components/ui/" | wc -l   # < 81 nach Block E, exakter Wert im Bericht
git diff 238e313 -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Harness analog Welle 1, Methodik aus Entscheidung 5. Matrix
unter `docs/screenshots/auftrag-055/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G39 Welle 2 – Auftrag 055"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, welche
Laufzeit-Ausnahmen wo und warum (besonders bei den Diagramm-Dateien —
kurze Begründung pro Datei, nicht pauschal), neue
`INLINE_STYLE_BASELINE`-Zahl mit Herleitung, Command-Matrix.

## Akzeptanzkriterien für die Prüfung

- Block A: `Button`/`Card`-`className` mergt statt überschreibt
  (Stichprobe: testweise `className` an eine Instanz hängen, prüfen
  dass `cva`-Klassen erhalten bleiben), `Badge` hat `size`-Variante,
  bestehende Primitives-Konsumenten pixelgleich.
- Alle 23 Dateien migriert, 0 `style={{` außer dokumentierter
  Laufzeit-Ausnahmen (Muster wie Auftrag 053 Nachtrag 2 / Auftrag 054).
  Jede Ausnahme einzeln nachvollziehbar begründet, keine
  String-Literale in einem verbleibenden `style`-Objekt.
- `src/features/resources/**` unangetastet (Diff leer).
- `INLINE_STYLE_BASELINE` korrekt gesenkt (niedriger als 81, exakter
  Wert nachvollziehbar), ESLint-Scope erweitert.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-/TSC-
  Ratsche nicht erhöht.
- Kein neues Business-Feature, keine neue Abhängigkeit.

**Abnahme:** Erst nach unabhängigem Review ist Welle 2 von Gate G39
abgeschlossen. Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.
