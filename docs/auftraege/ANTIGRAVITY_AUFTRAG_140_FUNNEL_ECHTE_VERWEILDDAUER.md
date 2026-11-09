# ANTIGRAVITY_AUFTRAG_140 — Funnel nutzt echte Verweildauer

> Quelle: `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`, Teil-Auftrag 140.
> Plan in Kraft seit Auftrag 136; seriell nach 139, ein PR, aufbauend auf `main`.

## Ziel

Der Funnel-Bottleneck-Alert rechnet Verweildauern künftig ausschließlich aus dem
serverseitigen `stage_entered_at` (Auftrag 137). Es gibt keine clientseitigen
Schätzungen oder Browser-Speicher-Quellen mehr.

## Dateien

- `src/features/vertrieb/services/funnelAnalyticsService.ts`
- `src/features/vertrieb/components/FunnelBottleneckAlert.tsx`
- `src/features/vertrieb/pages/FunnelPage.tsx`
- Tests (`funnelAnalyticsService.unit.vitest.ts` und ggf. UI-Tests)

## Entscheidungen (aus dem Plan)

- `stageEnteredAt` aus den Deals ist die einzige Quelle. `getEffectiveDealStage`
  wird ohne Overrides vereinfacht; `daysInStage` entfällt, wenn nur Tests es
  befüllen.
- Deals ohne Phasendatum zählen nicht als Engpass. Der Alert nennt sie offen:
  „{n} Deals ohne bekannte Verweildauer (vor v3.1 angelegt)." Bei 0 keine Zeile.
- Der Grenzwert 30 Tage bleibt.

## Tests (Test-first)

- `deal_mit_31_tagen_ist_engpass`
- `deal_mit_30_tagen_ist_keiner`
- `deal_ohne_datum_wird_gezaehlt_aber_nicht_gewarnt`
- `alle_ohne_datum_zeigt_keine_entwarnung` — sind alle Daten unbekannt, darf
  nicht „Alle Deals verweilen innerhalb der geplanten Zykluszeiten" erscheinen.

## Globale Grenzen

- CLAUDE.md §6: Schutzbereiche (`src/simulation/**`, `src/types/**`,
  `src/context/**`, `src/services/data/**`, `src/features/resources/**`)
  nicht ohne ausdrückliche Nennung ändern.
- Keine neuen Abhängigkeiten, keine Secrets, kein Force-Push.
- Nach Umsetzung: Pflicht-Verifikation (CLAUDE.md §7), Screenshot-Matrix,
  Eintrag in `docs/BUILD_LOG.md`, `BUILD_PLAN.md` auf Auftrag 141 setzen,
  PR öffnen, auf unabhängiges Review warten. Kein Merge — das macht Marc.
