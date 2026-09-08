# BUILD_PLAN_V2.1.0 — LeadPilot Dashboard-CRM

**Version:** `2.1.0`
**Branch:** `codex/v2.1.0-design`
**Veröffentlichungsstatus:** `OFFEN — explizite Autorisierung erforderlich`

> Merge nach `main`, Git-Tag und Remote-Push bleiben offen bis zur ausdrücklichen Freigabe durch Marc.
> Keine externe Credential-Anforderung für das Release-Gate G27.

---

## Gate-Übersicht G24 – G27

Serielle Abhängigkeit: `G24 → G25 → G26 → G27`

| Gate | Auftrag | Beschreibung | Baseline | Freigabe-Commit | Status |
|---|---|---|---|---|---|
| **G24** | 040 | Live-KPI-Katalog: 12 KPI-IDs, Multi-KPI-Eventpfad, Verifier | `766edd8` | `2cba81b` | ✅ FREIGEGEBEN |
| **G25** | 041 | Isolierter Stream-Store, Race-Fixes, Selector-Hooks, 5 Verifier | `2cba81b` | `e243dca` | ✅ FREIGEGEBEN |
| **G26** | 042 | Live-Performance-Surface, Pseudo-3D-Funnel, Screenshot-Harness | `e243dca` | `fc48233` | ✅ FREIGEGEBEN |
| **G27** | 043 | V2.1-Regression, Accessibility, Release-Vorbereitung | `fc48233` | _(offen)_ | 🔄 BEREIT ZUR UNABHÄNGIGEN PRÜFUNG (Codex-Nacharbeit umgesetzt) |

---

## G24 — Live-KPI-Katalog (Auftrag 040)

**Freigegeben:** `2cba81b` (unabhängige Codex-Prüfung)

Neue Dateien:
- `src/services/liveKpi/liveKpiDefinitions.ts`
- `scripts/verifyLiveKpiCatalog.ts`

Ergebnis: 12/12 KPI-IDs, korrekte Metadaten, Schutzbereich 0 Zeilen diff.

---

## G25 — Isolierter Stream-Store und Hooks (Auftrag 041)

**Freigegeben:** `e243dca` (unabhängige Codex-Prüfung)

P1-Fixes:
- Event-Race-sichere Initialisierung mit Deferred + Entry-Identitätsprüfung
- Alte Callbacks mutieren neuen Stream nicht (Entry-Isolation)
- Initial-Historie lädt 30 neueste Werte DESC, sortiert ASC

Neue Dateien:
- `src/services/liveKpi/liveKpiStreamStore.ts`
- `src/services/liveKpi/liveKpiReadAdapter.ts`
- `src/hooks/useLiveKpi.ts`, `useLiveKpiHistory.ts`, `useLiveKpiActivity.ts`
- Verifier: `verifyLiveKpiStream.ts`, `verifyLiveKpiContract.ts`, `verifyLiveKpiReadLayer.ts`, `verifyLiveKpiE2e.ts`

---

## G26 — Live-Performance-Surface (Auftrag 042)

**Freigegeben:** `fc48233` (unabhängige Codex-Prüfung nach Baseline-Worktree-Fix)

Neue Dateien:
- `src/components/liveKpi/` — 5 Komponenten (Section, Card, AreaChart, Donut, Funnel, Feed)
- `scripts/verifyLivePerformanceSurface.ts` — 48/48 Checks
- `scripts/captureAuftrag042GateScreenshots.mjs` — Isolierter Baseline-Worktree
- `scripts/generateAuftrag042ScreenshotMatrix.mjs`
- `docs/screenshots/auftrag-042/` — 12 PNGs, 6/6 DISTINCT-Paare

---

## G27 — V2.1-Regression, Accessibility und Release (Auftrag 043)

**Status:** 🔄 BEREIT ZUR UNABHÄNGIGEN PRÜFUNG — noch **nicht** freigegeben.
Freigabe-Commit: _offen_ (wird erst nach bestandenem Codex-Review vergeben).

**Historie:** Die bisherigen G27-Commits dokumentierten Codex-Nacharbeitsbefunde, keine Freigabe.
Die Nacharbeit (Whitespace-Gate, belastbares Accessible-Name-Audit, Null-Euro-Erkennung, konsistente Zählwerte) ist umgesetzt; die erneute unabhängige Prüfung steht aus.

Erlaubte Dateien (kein Produktcode):
- `scripts/verifyV21ReleaseReadiness.ts`
- `scripts/auditV21LiveAccessibility.mjs`
- `docs/accessibility/auftrag-043/README.md`
- `docs/releases/V2.1.0.md`
- `docs/BUILD_PLAN_V2.1.0.md` (diese Datei)
- `docs/BUILD_LOG.md`
- `package.json`, `package-lock.json` (nur Versionsfelder)

---

## Veröffentlichungsregel

```
OFFEN — explizite Autorisierung erforderlich
```

Erst nach ausdrücklicher Freigabe durch Marc:
1. `git checkout main && git merge --no-ff codex/v2.1.0-design`
2. `git tag v2.1.0`
3. `git push origin main --tags`

Dieses Dokument autorisiert diese Schritte nicht.
