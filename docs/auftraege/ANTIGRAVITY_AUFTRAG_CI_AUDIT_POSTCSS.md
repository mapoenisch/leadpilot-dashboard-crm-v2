# Separater CI-Auftrag: Audit-Befunde postcss-selector-parser, source-map-js, proxy-addr beheben

**Stand:** 06.10.2026 · **Basis:** `main` (`7a60dd8`, nach PR #60)

**Auftraggeber:** Marc Poenisch (Entscheidung vom 06.10.2026, Weg 1: Pakete aktualisieren statt Ausnahme).
**Builder:** Claude Code. **Prüfer:** Codex. **Merge:** nur Marc.

## Anlass

Seit 05.10.2026 ist der CI-Job `test` auf `main` und auf PR #61 rot, obwohl alle Tests grün sind.
Abbruch im Schritt „Dependency Audit Check“ (`scripts/auditAllowlist.mjs`) wegen neuer Advisories:

| Advisory | Paket | Schwere | Kette | Reparierte Version |
|---|---|---|---|---|
| GHSA-rj75-hqrm-r3gf | `postcss-selector-parser` | moderate | `tailwindcss@3.4.19` → `postcss-nested@6.2.0` / direkt | 7.1.6 |
| GHSA-68fv-2mgg-jv7q | `source-map-js` | high | `postcss@8.5.28`, `magicast` | 1.2.2 |
| GHSA-jqcg-44mw-7w3h | `proxy-addr` | critical (nur Dev) | `@lhci/cli` → `express@4.22.3` | 2.0.8 |

`npm audit fix` schlägt für `postcss-selector-parser` Tailwind 4 vor (Major-Umbau). `tailwindcss@3.4.19`
ist die letzte 3er-Version und verlangt `postcss-selector-parser@^6.1.2`.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `package.json` | `overrides`: `postcss-selector-parser` `^7.1.6`, `source-map-js` `^1.2.2`. |
| `package-lock.json` | Neu aufgelöst; `proxy-addr` 2.0.7 → 2.0.8 (Patch innerhalb des Bereichs von `express`). |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_AUDIT_POSTCSS.md` | Diese Auftragsdatei. |
| `docs/BUILD_LOG.md` | Builder-Nachweis. |

## Anforderungen

- [x] Keine neuen Abhängigkeiten, nur Versionsanhebungen bestehender (transitiver) Pakete.
- [x] Keine neue Ausnahme in `scripts/auditAllowlist.mjs`; Schwellen unverändert.
- [x] Override auf eine Major-Version über dem von Tailwind 3 verlangten Bereich nur, wenn das
  erzeugte CSS unverändert bleibt: Produktions-Build vorher/nachher, CSS-Dateien Byte für Byte gleich.
- [x] Pflicht-Verifikation (`tsc`, `lint`, `verify`, Vitest, `build`, Lizenzen, Qualitätsbudget, Size-Limit) grün.

## Aufhebung

Der Override `postcss-selector-parser` entfällt mit der Migration auf Tailwind 4 (gleiches Ziel wie
die `braces`-Ausnahme, Frist 02.11.2026). `source-map-js` kann entfallen, sobald `postcss` selbst
`^1.2.2` verlangt.
