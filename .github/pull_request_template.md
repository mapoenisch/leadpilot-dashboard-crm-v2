## Auftrag

<!-- Nummer und Titel, z. B. Auftrag 125 – … ; Link auf docs/auftraege/… -->

## Änderungen

<!-- Kurz: was und warum -->

## Prüfung

- [ ] `npx tsc --noEmit` ohne Fehler
- [ ] `npm run verify` grün
- [ ] `npm run build` läuft durch
- [ ] Schutzbereiche: `git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources` leer (oder im Auftrag genannt)
- [ ] Bei UI: Screenshot-Matrix, 0 px horizontaler Overflow
- [ ] Eintrag in `docs/BUILD_LOG.md`
- [ ] Keine Secrets, `.env` oder Build-Artefakte im Diff
