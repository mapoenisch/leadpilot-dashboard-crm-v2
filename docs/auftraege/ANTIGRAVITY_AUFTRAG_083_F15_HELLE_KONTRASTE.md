# ANTIGRAVITY_AUFTRAG_083 — Korrekturauftrag F15: Kontraste im hellen Modus & Token

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 5a. Befund F15 in
> `docs/reviews/2026-10-06-frontend-befundregister.md`. Reihenfolge laut `BUILD_PLAN.md`: nach
> Auftrag 081, vor Paket A. Gestartet von Marc Poenisch im Chat am 08.10.2026; Auftrag 082 bleibt
> bis zum Nachher-Lauf zurückgestellt.

## Ziel

F15 ist ein technischer Kontrast- und Tokenfehler, keine Gestaltungsfrage. Im hellen Modus sollen
Kopfzeile, Sidebar, Simulationsleiste, Dashboard-Überschrift und Kachel-Details lesbar sein. Ab
diesem Auftrag gilt das Ganzseiten-axe-Gate (§14) für alle Folgepakete. Der dunkle Modus bleibt
optisch unverändert.

## Baseline

- Branch `claude/auftrag-083-f15-kontraste` von `main` `abc0191` (Merge PR #67, Auftrag 081).
- Schutzbereichs-Baseline: `abc0191`.
- Vergleichsmessung: Inventar aus Auftrag 081 (`docs/reviews/2026-10-06-frontend-inventar.json`):
  im hellen Modus `color-contrast` auf der ganzen Seite in allen 42 Ansichten, im dunklen Modus in keiner.

## Ursachen (aus Befund F15)

1. Das Token `--color-text-primary` ist nicht definiert. Seine 18 Verwendungen in
   `src/features/dashboard/` fallen auf `#fff` bzw. `#e6f3f1` zurück, also Weiß auf hellem Grund.
2. `Header.tsx` (`bg-[rgba(6,22,19,0.85)]`), `Sidebar.tsx` (`bg-[rgba(6,22,19,0.95)]`) und
   `SimulationBar.tsx` (`bg-[rgba(18,51,48,0.75)]`) haben fest verdrahtete dunkle Hintergründe,
   während die Texttokens im hellen Theme dunkel werden.

**Nachtrag aus dem ersten Ganzseiten-Scan nach Behebung von 1. und 2.:** Das 081-Inventar zeigt
`color-contrast` im hellen Modus auch innerhalb von `<main>` (19 Aufnahmen). Der Scan
(`scripts/captureAuftrag083ContrastScan.mjs`) hat danach noch 126 von 252 Aufnahmen mit Verstoß
ergeben, alle im hellen Modus. Zwei weitere Ursachen:

3. Die hellen Markentöne aus G39 Welle 1 (`--cyan #007369`, `--orange #C23D00`, `--coral-red #D40006`,
   `--mint-green #15754B`) erreichen 4.5:1 nur auf `--color-bg`. Auf getönten Flächen
   (`bg-deep`, `surface-raised`, `primary-soft`) liegen sie bei 3.5–4.46:1. Betroffen sind der Avatar
   in der Kopfzeile, die Tempo-Auswahl der Simulationsleiste und die Status-Chips.
   Korrektur: gleicher Farbton, abgedunkelt auf mindestens 4.6:1 auf allen neutralen hellen Flächen
   und auf der eigenen Soft-Fläche. Das betrifft nur den hellen Modus.
4. `LocationPage.tsx`: Das Label „FIKTIV“ auf den in beiden Themes dunklen Innenansicht-Karten nutzt
   das themenabhängige `--color-text-muted`. Korrektur: fester Wert `#A7B0BA` (= dunkler
   Muted-Wert, im dunklen Modus also unverändert).
5. Die 18 Verwendungen von `--color-text-primary` hatten zwei Fallbacks: 8× `#fff` und 10× `#e6f3f1`.
   Ein einziges Token hätte die `#e6f3f1`-Texte der Kachel-Details im dunklen Modus weiß gemacht
   (gemessen: max. 25/255). Deshalb gibt es das zweite Token `--color-text-soft`, dunkel `#E6F3F1`,
   hell `var(--color-text)`. Die 10 Verwendungen sind darauf umgestellt, und der dunkle Modus ist
   wieder pixelgleich.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert. Keine Migration, keine neue Abhängigkeit.
- Keine Gestaltungsänderung im dunklen Modus. Die neuen Tokens tragen im dunklen Modus exakt die
  bisherigen Werte.
- Weitere undefinierte Tokens mit Fallback (`--color-surface-subtle`, `--color-surface-hover`,
  `--color-coral-red*`) liefern fast transparente Flächen bzw. Akzentfarben und verursachen F15
  nicht. Sie bleiben außerhalb dieses Auftrags (Kandidat für Paket D).
- Bilder bleiben lokal (`.gitignore`); committet wird nur die README-Matrix.

## Ziel-Dateien

| Datei                                                                                                | Änderung                                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_083_F15_HELLE_KONTRASTE.md`                                      | dieser Auftrag                                                                                                             |
| `src/styles/global.css`                                                                              | Token `--color-text-primary`, Shell-Hintergrund-Tokens (dunkel/hell), helle Markentöne (Ursache 3)                         |
| `src/features/unternehmen/pages/LocationPage.tsx`                                                    | Label „FIKTIV“ auf dunkler Karte (Ursache 4)                                                                               |
| `src/components/layout/Header.tsx`                                                                   | Hintergrund über Token                                                                                                     |
| `src/components/layout/Sidebar.tsx`                                                                  | Hintergrund über Token                                                                                                     |
| `src/components/layout/SimulationBar.tsx`                                                            | Hintergrund über Token                                                                                                     |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx`                                            | undefiniertes `--color-background` durch `--color-bg-deep` ersetzen (sonst im hellen Modus dunkler Text auf dunklem Grund) |
| `src/features/dashboard/components/**`, `src/features/dashboard/preview/DashboardDesignPreview.tsx`  | 10 Verwendungen `var(--color-text-primary,#e6f3f1)` → `var(--color-text-soft,#e6f3f1)` (Ursache 5)                         |
| `src/styles/__tests__/themeContrast.vitest.ts`                                                       | neu: Regressionstest Token, Shell und helle Kontraste                                                                      |
| `scripts/captureAuftrag083ContrastScan.mjs`                                                          | neu: Ganzseiten-axe-Scan über die 42 Ansichten                                                                             |
| `docs/screenshots/auftrag-083/README.md`                                                             | neu: Ergebnismatrix                                                                                                        |
| `docs/reviews/2026-10-06-frontend-befundregister.md`                                                 | F15 als behoben markieren, mit Nachweis                                                                                    |
| `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | Status                                                                                                                     |

## Tasks

- [x] `--color-text-primary` in `:root` als `var(--color-text)` definieren. Damit gilt es auch im
      hellen Theme, wo `--color-text` überschrieben wird.
- [x] Shell-Tokens `--color-shell-header`, `--color-shell-sidebar` und `--color-shell-strip` mit
      den bisherigen Werten für dunkel und hellen Gegenstücken auf Basis von `--black`/`--surface`
      für `[data-theme='light']` anlegen.
- [x] `Header.tsx`, `Sidebar.tsx` und `SimulationBar.tsx` auf die Tokens umstellen. Die
      Abdunklung hinter der mobilen Sidebar (`Sidebar.tsx`, Overlay ohne Text) bleibt.
- [x] `DashboardPreviewPage.tsx`: Hintergrund `--color-bg-deep` (im dunklen Modus `#061613` statt
      `#051413`, sichtbar nicht zu unterscheiden).
- [x] Regressionstest: Shell-Komponenten enthalten keine fest verdrahteten dunklen
      Hintergründe mehr, und das Token `--color-text-primary` ist definiert.
- [x] Ganzseiten-axe-Scan im hellen und dunklen Modus über die 42 Ansichten des 081-Inventars
      (1440/768/375): 0 serious/critical-Verstöße, insbesondere kein `color-contrast`.
- [x] Vorher/Nachher-Bilder für Kopfzeile, Sidebar, Simulationsleiste, Dashboard-Überschrift und
      Kachel-Details im hellen Modus. Hashes unterscheiden sich, im dunklen Modus bleibt das Bild gleich.

## Abnahme

Ganzseiten-axe-Scan meldet auf allen 42 Ansichten im hellen Modus keine serious/critical-Befunde
`color-contrast` mehr. Der dunkle Modus ist unverändert. `npx tsc --noEmit`, `npm run verify` und
`npm run build` sind grün. Schutzbereichs-Diff gegen `abc0191` leer. BUILD_LOG-Eintrag steht.
Gate-Freigabe durch Codex, Merge durch Marc.

## Nachtrag 08.10.2026 – Codex-Review nach Merge (PR #68)

Befund P2: Der Scan erkannte Route-Fehlerkarten nur indirekt über ein Inventar-H1. Ziel-Datei des
Nachtrags: `scripts/captureAuftrag083ContrastScan.mjs` (erkennt „Fehler beim Laden der Seite“ in
`main [role="alert"]` und bricht ab). Kein Produktcode. Nachweis im BUILD_LOG.
