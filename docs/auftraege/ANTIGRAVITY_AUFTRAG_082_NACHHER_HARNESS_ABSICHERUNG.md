# Auftrag 082 — Absicherung des Nachher-Laufs im Inventar-Harness

> Entstanden aus der Abgrenzung von Auftrag 081 (Entscheidung Marc vom 08.10.2026): Auftrag 081 gilt mit dem Baseline-Inventar als abgeschlossen. Codex-Befunde, die nicht das **aktuelle** Inventar falsch machen, sondern nur absichern, dass ein **späterer** Nachher-Lauf hypothetische Regressionen erkennt, werden hier gesammelt. Dieser Auftrag wird erst zusammen mit dem Paket bearbeitet, das den Nachher-Lauf tatsächlich fährt (Abschluss Frontend-Qualität, Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`).

## Globale Grenzen

- Ziel-Datei: ausschließlich `scripts/captureAuftrag081Inventory.mjs` (bei Bedarf `scripts/lib/detailShotHelpers.mjs` nur nach ausdrücklicher Freigabe, da von 077/079 mitgenutzt).
- Kein Produktcode, keine Schutzbereiche (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).
- Abnahme gegen echten Zielcode des Nachher-Stands, nicht gegen ausgedachte Regressionen.
- Neue Befunde sind nur dann blockierend, wenn das Nachher-Inventar nachweislich falsch wäre.

## Gesammelte Punkte (Stand Codex-Runden 27–29)

Ein Teil wurde bereits in `c117662` (Runde 29) umgesetzt. Hier ist zu prüfen, ob die Umsetzung gegen den echten Nachher-Stand trägt:

- [ ] Jedes Navigationsziel (Erfolg, Leer, 500) startet frisch auf `/crm/deals`; URL und Zielüberschrift werden je Ziel geprüft.
- [ ] Retry lädt nur die fehlgeschlagene Ressource neu (`resource` vor/nach dem Klick protokollieren, zusätzliche Ressourcen ablehnen).
- [ ] CRM-Aufnahmen gelten nur als Erfolgszustand mit erwarteten Seed-IDs bzw. Anzahl; unbekannte `resource` wird abgelehnt.
- [ ] Nachher-Schema: Erwartung aus dem Zielcommit ableiten und den Live-Katalog (Policies, RPC) prüfen, nicht nur `schema_migrations`.
- [ ] 32-Bild-Prüfung nur in der Baseline; im Nachher-Modus nur tatsächlich als Bild gerenderte Seiten.

## Backlog (P2, nur bei konkretem Anlass)

- [ ] SQL-Normalisierung: Literale und Token-Grenzen erhalten (`'7 days'`/`'7days'`, `foo bar`/`foobar`).
- [ ] Importierte Helfer (`scripts/lib/detailShotHelpers.mjs`) im Harness-Fingerabdruck.

## Verifikation

`npx tsc --noEmit`, `npm run verify`, `npm run build`, Nachher-Volllauf des Harness ohne Fehlschläge, Schutzbereichs-Diff leer, BUILD_LOG-Eintrag.
