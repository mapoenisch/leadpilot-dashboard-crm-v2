# Auftrag 126 – Axe-Verstöße mit betroffenen Knoten ausgeben

**Builder:** Claude Code · **Prüfer:** Codex (GitHub) · **Merge:** Marc

## Anlass
Dependabot-PR #130 hebt `axe-core` von 4.13 auf 4.14. Danach scheitert `e2e` in `e2e/a11y.spec.ts` auf `/crm/leads` (nur 1440 px): `label-content-name-mismatch` (serious, 2 Knoten). Die Fehlermeldung nennt nur Regel und Anzahl, nicht die betroffenen Elemente. Lokal ist der Lauf nicht nachstellbar (Login-Zugangsdaten `E2E_AUTH_*` nur in der CI).

## Globale Grenzen
Nur Testausgabe. Keine Änderung an `src/`, an der Baseline (`e2e/a11y-baseline.json`) oder an den Prüfkriterien. Keine neuen Abhängigkeiten.

## Ziel-Dateien
| Datei | Änderung |
| --- | --- |
| `e2e/a11y.spec.ts` | Fehlermeldung nennt je Verstoß Selektor und HTML-Auszug der Knoten |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

## Tasks
- [x] Ausgabe um Selektor (`n.target`) und gekürztes HTML (160 Zeichen) je Knoten erweitern.
- [ ] Nach Merge: `@dependabot rebase` auf #130, die zwei Knoten aus dem CI-Log lesen.
- [ ] Folgeauftrag: die zwei Elemente auf `/crm/leads` korrigieren (WCAG 2.5.3), danach #130 mergen.

## Abnahme
`tsc`, ESLint und CI grün; Verhalten des Tests unverändert (gleiche Pass/Fail-Entscheidung, nur mehr Detail im Fehlerfall).
