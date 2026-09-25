# Quality-Debt-Budget

**Issue:** #7 — CI-Quality-Baselines abbauen statt dauerhaft tolerieren
**Owner:** @mapoenisch · **Nächster Review:** 2026-12-31
**Maschinenlesbare Quelle:** [`debt-budget.json`](./debt-budget.json) · **Prüfung:** `npm run verify:quality-budget` (CI-Job `lint`)

## Ergebnis (Stand 2026-09-24)

Die Schulden wurden im Code abgebaut, nicht nur budgetiert:

| Metrik | vorher | jetzt | Ziel |
|---|---:|---:|---:|
| Unbegründete Inline-Styles außerhalb `resources/` | 145 | **0** | 0 ✅ |
| davon `src/components/ui/charts/` | 128 | 0 | 0 ✅ |
| davon übriges `src/` (u. a. `Badge style` in `liveKpi/`) | 17 | 0 | 0 ✅ |
| `style`-Passthrough-Props an Komponenten (Badge, Button, MetricToken, FaceliftGlyph, DiagramCanvas ×2) | 6 | 0 | 0 ✅ |
| ESLint-Fehler + Warnungen | 0 (Warnungen ungeprüft) | 0 (geprüft) | 0 ✅ |

Die ESLint-Regel gegen Inline-Styles galt vorher nur in einzelnen Ordnern und nur für DOM-Elemente. Sie gilt jetzt für **alle** `src/**/*.tsx`, also für DOM-Elemente (`react/forbid-dom-props`) und für Komponenten (`react/forbid-component-props`). Ausgenommen sind nur der Resources-Schutzbereich und Tests.

## Verbleibende, fachlich begründete Ausnahmen

| Metrik | Ist = Budget = Ziel | Begründung |
|---|---:|---|
| `suppressions:react/forbid-dom-props` | 50 | Laufzeit-Geometrie (Balkenbreiten/-höhen, Tooltip-Position, `height`/`size`-Props) und Laufzeit-Farben aus Daten. Jede Stelle hat einen zeilengenauen Kommentar mit Begründung. Enthält den `Card`-Passthrough, den nur noch der Resources-Bereich nutzt. |
| `suppressions:max-lines` | 1 | generierte Supabase-Typen |
| `suppressions:no-console` | 1 | zentraler Logger |
| `suppressions:react-hooks/exhaustive-deps` | 1 | `useSyncExternalStore`-Trigger |
| `inlineStyles:src/features/resources/` | 96 | Schutzbereich eingefroren (CLAUDE.md §6). Abbau nur mit eigenem Auftrag, dann Ziel 0 und `Card`-Passthrough entfernen. |

## Regeln der Ratsche

- **Harte Baselines in `ci.yml`** (`LINT_BASELINE`, `TSC_BASELINE`, `MAX_LINES_BASELINE`, `INLINE_STYLE_BASELINE`) stehen auf 0 und werden alle ausgewertet. `LINT_BASELINE` zählt Fehler **und** Warnungen.
- **Ist > Budget → CI rot.** Neue Ausnahmen gehen nur mit einer Budget-Erhöhung im selben PR, die im Diff und damit im Review sichtbar ist.
- **Ist < Budget → CI rot**, bis das Budget im selben PR gesenkt ist. Abgebaute Schulden können so nicht wieder aufgebaut werden.
- **Ziel > Budget → ungültig.** Das Ziel ist 0, außer bei einer im `rationale` begründeten Ausnahme.
- Eine `eslint-disable`-Regel ohne Budget-Eintrag hat Budget 0.
