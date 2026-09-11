# AUFTRAG 053 / Gate G38 — Design-System-Fundament

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `6e8d4cf` (Gate G37 komplett)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Entscheidung E2 + Gate-Tabelle G38 / 053:
„Token-Brücke vervollständigen; Primitive mit `cva`-Varianten; ESLint-Regel
gegen Inline-Styles scharfschalten; `/design-system`-Route (DEV)."
Bereitet **HOCH 3** vor (Drei parallele Styling-Systeme, gemessen 128 / 29 /
1.247) — die eigentliche Migration der 128 Feature-Dateien ist **G39**
(Auftrag 054–057), **nicht** Teil dieses Auftrags. Dieser Auftrag legt nur
das Fundament: Tokens vollständig, Primitives auf dem Zielmuster, ein
Werkzeug zum Nachweisen.

## Ziel

Die drei parallelen Styling-Systeme sind (nachgemessen, nicht die alte
Plan-Schätzung nachgebetet):

1. **128 Dateien mit Inline-Styles** (`style={{...}}`, 2.402 Vorkommen) —
   überwiegend Feature-Code, bleibt **G39**.
2. **`src/styles/global.css`, 1.247 Zeilen** — ein großes handgeschriebenes
   Stylesheet, hält 67 CSS-Custom-Properties (`--color-*`, `--space-*`,
   `--radius-*`, `--shadow-*`, `--font-*`, plus Rohfarben/Glass-Varianten).
3. **~25 Dateien mit rohen Tailwind-Utility-Klassen** direkt im Feature-Code,
   ohne über eine Primitive zu gehen.

Dieser Auftrag beseitigt eine **vierte**, bisher nicht im Plan benannte
Fundstelle: `src/components/shadcn/{button,dialog,dropdown-menu}.tsx` — ein
bereits `cva`-basiertes Scaffold, **aber 0 Konsumenten** (per Suche
bestätigt) und mit exakter Namenskollision zu `src/components/ui/Button.tsx`
(beide exportieren `Button`/`ButtonProps`). Totes Parallelsystem, nicht die
Lösung — wird entfernt, sein *Muster* (nicht die Dateien) ist die Vorlage
für Entscheidung 3.

## Ist-Stand (nachgemessen)

- **Token-Brücke lückenhaft:** `tailwind.config.js` bindet nur **44 von 67**
  Tokens aus `global.css` in `theme.extend` ein (E2 behauptet "alle 67" —
  das war zum Zeitpunkt der Plan-Erstellung nicht mehr aktuell oder falsch
  gemessen). **23 fehlen:**

  | Kategorie | Tokens | Verwendung (Dateien) |
  | --- | --- | --- |
  | Backdrop-Blur | `--backdrop-blur`, `--backdrop-blur-sm` | 2 |
  | Rohfarben (Basis) | `--black`, `--white`, `--charcoal`, `--gray-muted`, `--border-gray`, `--surface` | 1–2 je Token |
  | Glass-Varianten | `--color-border-glass`, `--color-surface-glass` | 1 |
  | Glass (unbenutzt) | `--color-surface-glass-raised` | **0** — vermutlich totes Token |
  | Marken-Rohfarben (Charts) | `--coral-red(-a14)`, `--cyan(-a12/-light)`, `--orange(-a14/-light/-soft)`, `--mint-green(-a14)` | 1–12 (`--cyan-light` mit 12 die meistgenutzte) |
  | Fokus | `--focus-ring` | 4 |

  Diese Lücke ist der Grund, warum viele Stellen bei Inline-Styles bleiben
  mussten — es gab keine Tailwind-Klasse dafür.

- **19 Primitives in `src/components/ui/`** (`Alert`, `Badge`, `Button`,
  `Card`, `Charts`, `Checkbox`, `Divider`, `Icon`, `Input`, `Modal`,
  `NavItem`, `NumberStepper`, `RouteErrorBoundary`, `SectionHeader`,
  `Select`, `StatusChip`, `Table`, `Tabs`, `Toolbar`) — **alle** über
  handgebaute JS-Objekte (`SIZES`, `variantStyle()`-Funktionen) und
  `style={{...}}`, **keine** nutzt Tailwind oder `cva`. Diese Primitives
  werden von praktisch jeder Seite im Repo verwendet — ihr internes Muster
  jetzt richtig zu machen ist wichtiger als jede einzelne Feature-Datei.
- **`eslint-plugin-react`, `class-variance-authority`, `clsx`,
  `tailwind-merge`** bereits Dependencies — **keine neue Abhängigkeit
  nötig.**
- **`ci.yml`-Ratsche veraltet:** `TSC_BASELINE: 605` seit vor G36 nicht mehr
  nachgezogen (Ist-Stand nach G37: **602**) — kleines Versäumnis aus den
  letzten beiden Aufträgen, wird hier mit erledigt (Entscheidung 6).

## Verbindliche Entscheidungen

1. **Token-Brücke vervollständigen:** die 23 fehlenden Tokens nach Kategorie
   in `tailwind.config.js` `theme.extend` ergänzen (`colors` für Rohfarben/
   Glass/Marken, `backdropBlur`, `ringColor`/`ringWidth` für `focus-ring`,
   je nachdem wie das Token tatsächlich verwendet wird — nicht blind als
   `colors` durchwinken, wenn es z. B. ein Blur-Wert ist).
2. **`--color-surface-glass-raised`** (0 Verwendungen): prüfen, ob es
   wirklich totes CSS ist. Wenn ja: aus `global.css` entfernen statt zu
   brücken. Wenn eine Verwendung doch auftaucht (z. B. in einer
   `.module.css` oder einem Template-String, den die Grep-Suche verpasst
   hat): brücken wie die anderen. Entscheidung im Bericht kurz begründen.
3. **`src/components/shadcn/**` löschen.** Kein Konsument, keine
   Migration nötig — reines Aufräumen.
4. **Alle 19 `src/components/ui/*`-Primitives intern auf `cva` +
   Tailwind-Klassen umstellen** (Muster: `src/components/shadcn/button.tsx`,
   das dabei gelöscht wird — als Referenz vorher lesen, nicht als Datei
   behalten). **Öffentliche API strikt unverändert:** gleicher
   Komponentenname, gleicher Import-Pfad (`@/components/ui/Button` bleibt
   `@/components/ui/Button`), identische Props-Signatur (`variant`, `size`,
   `disabled`, …), identisches Rendering-Ergebnis. **Kein Consumer außerhalb
   von `src/components/ui/**` wird in diesem Auftrag angefasst** — das ist
   der ganze Witz: 128 Feature-Dateien profitieren später (G39) automatisch,
   ohne dass hier schon eine davon geöffnet werden muss.
5. **ESLint-Regel `react/forbid-dom-props`** (`forbid: [{ propName: 'style' }]`)
   scharfschalten — **gezielt gescoped** per `overrides` in
   `eslint.config.js` auf `src/components/ui/**` (nach Block C: 0 Treffer,
   da migriert) und die neue `/design-system`-Route. **Nicht** global —
   die 128 Feature-Dateien sind nicht Teil dieses Auftrags und dürfen nicht
   durch eine globale Regel-Aktivierung rot werden.
6. **`ci.yml` zwei Ratschen:** `TSC_BASELINE` von 605 auf den tatsächlichen
   Ist-Wert am Ende dieses Auftrags nachziehen (Versäumnis aus G36/G37
   nachgeholt — Entscheidung, nicht Bug dieses Auftrags, aber am
   naheliegendsten hier erledigt); neue Zeile `INLINE_STYLE_BASELINE` mit
   dem gemessenen Ist-Wert **außerhalb** von `src/components/ui/**`
   (voraussichtlich ~128, gesenkt nie erhöht) — G39 drückt sie Welle für
   Welle auf 0.
7. **`/design-system`-Route, DEV-only:** neue Seite unter einem Pfad wie
   `/design-system`, zeigt alle 19 migrierten Primitives mit sämtlichen
   Varianten/Größen/Zuständen (disabled, loading, error, …) nebeneinander.
   Nur erreichbar wenn `import.meta.env.DEV` — nicht in der Haupt-Navigation
   verlinkt, nicht im Produktions-Build sichtbar (Route-Registrierung
   selbst conditional, nicht nur ausgeblendet). Dient als visueller
   Abnahme-Nachweis für Block B/C und als künftiges Werkzeug für G39.
8. **Keine neue Abhängigkeit.** Alles Nötige ist bereits installiert.
9. **Kein fachliches/visuelles Verhalten ändert sich.** Jede Seite, die
   eines der 19 Primitives nutzt, muss **pixelidentisch** bleiben — das ist
   praktisch die ganze App. `npx playwright test` (bestehende
   `visual.spec.ts`, deckt bereits mehrere Kernrouten pixelgenau ab) ist der
   wichtigste Beweis und muss nach **jedem** Block unverändert grün bleiben.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen — insbesondere
  **keine** Datei unter `src/features/**` oder `src/components/executiveCockpit/**`
  (das ist G39-Scope).
- `git diff 6e8d4cf -- src/simulation src/types src/context src/services/data src/features/resources src/store` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Token-Brücke + Aufräumen

- [ ] 23 fehlende Tokens kategoriegerecht in `tailwind.config.js` ergänzen (Entscheidung 1).
- [ ] `--color-surface-glass-raised` geprüft und entschieden (Entscheidung 2).
- [ ] `src/components/shadcn/**` gelöscht (Entscheidung 3), Muster vorher als Referenz gelesen.
- [ ] `npx tsc --noEmit`, `npm run build`, `npx playwright test` grün — noch 0 funktionale Änderung, reine Vorbereitung.

### Block B — Einfache Primitives auf `cva`

- [ ] `Alert`, `Badge`, `Checkbox`, `Divider`, `Icon`, `NavItem`, `SectionHeader`, `StatusChip`, `Toolbar` intern umgestellt (Entscheidung 4).
- [ ] Öffentliche API + Rendering unverändert — Screenshot-Beweis für alle Routen, die diese 9 Primitives nutzen.
- [ ] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün.

### Block C — Komplexe Primitives auf `cva`

- [ ] `Button`, `Card`, `Charts`, `Input`, `Modal`, `NumberStepper`, `RouteErrorBoundary`, `Select`, `Table`, `Tabs` intern umgestellt.
- [ ] Gleiche Nachweispflicht wie Block B.
- [ ] Nach diesem Block: `grep -rn "style={{" src/components/ui` = 0.

### Block D — ESLint-Regel + Ratsche + `/design-system`

- [ ] `react/forbid-dom-props` scharf für `src/components/ui/**` + neue Route (Entscheidung 5).
- [ ] `ci.yml`: `TSC_BASELINE` nachgezogen, `INLINE_STYLE_BASELINE` neu (Entscheidung 6).
- [ ] `/design-system`-Route gebaut (Entscheidung 7).
- [ ] Vollständige Pflicht-Verifikation ein letztes Mal am Gesamtergebnis, CI-Bestätigungs-Push (wie in vorherigen Gates: die eine erlaubte Ratschen-Push-Ausnahme).

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `tailwind.config.js` | A |
| `src/styles/global.css` (nur falls Entscheidung 2 ein Token entfernt) | A |
| `src/components/shadcn/**` (löschen) | A |
| `src/components/ui/*.tsx` (alle 19) | B, C |
| `eslint.config.js` (nur die eine `overrides`-Regel) | D |
| `.github/workflows/ci.yml` (nur die zwei Ratschen-Zeilen) | D |
| `src/app/routes.ts`/`src/app/routePages.ts` (nur die eine neue DEV-Route) | D |
| `src/app/DesignSystemPage.tsx` (oder vergleichbarer neuer Pfad, Builder entscheidet) | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere nichts unter
`src/features/**`, `src/components/executiveCockpit/**`,
`src/components/layout/**`.

## Pflicht-Verifikation

```bash
npx tsc --noEmit                     # 0 Fehler
npm run lint                          # Ratsche nicht erhöht (bis Block D exkl. der neuen Regel)
npm run verify                        # 24/24
npm test                              # alle Vitest grün
npm run build                         # Exit 0
npx playwright test                   # alle grün, nach JEDEM Block — das ist der Pixel-Beweis
grep -rn "style={{" src/components/ui # 0 nach Block C
grep -rln "components/shadcn" src     # 0 nach Block A
git diff 6e8d4cf -- src/simulation src/types src/context src/services/data src/features/resources src/store   # leer
```

Screenshot-Harness analog vorherige Aufträge: da die 19 Primitives
praktisch überall verwendet werden, deckt die bestehende
`e2e/visual.spec.ts`-Suite (5 Kernrouten × 3 Viewports) den wichtigsten
Nachweis automatisch ab — zusätzlich gezielte Screenshots der Routen mit
den am dichtesten primitives-lastigen Ansichten (Modals, Formulare).
Ergebnis-Matrix unter `docs/screenshots/auftrag-053/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G38 – Auftrag 053: Design-System-Fundament"** an den
Anfang von `docs/BUILD_LOG.md`:

- Je Block: Commit-Hash, was geändert wurde, `verify`/`playwright`-Status.
- Token-Brücke: finale Liste, was wohin gemappt wurde, Entscheidung zu
  `--color-surface-glass-raised`.
- Je migrierte Primitive: kurzer Vorher/Nachher-Hinweis, falls eine
  Tailwind-Standardskala nicht exakt den alten Pixel-Wert trifft und eine
  Arbitrary-Value-Klasse (`px-[Xpx]`) nötig war — das ist erlaubt, aber
  dokumentationspflichtig.
- Bestätigung: kein Consumer außerhalb `src/components/ui/**` angefasst.
- Command-Matrix mit allen Ergebnissen aus der Pflicht-Verifikation.

## Akzeptanzkriterien für die Prüfung

- Alle 67 Tokens aus `global.css` in `tailwind.config.js` erreichbar (oder
  begründet entfernt, falls tot).
- `src/components/shadcn/**` existiert nicht mehr.
- Alle 19 Primitives nutzen `cva`, 0 `style={{` in `src/components/ui/**`.
- Öffentliche API jeder Primitive identisch zu vorher (Props-Diff = 0,
  geprüft gegen den alten Stand).
- `npx playwright test` durchgehend grün, inkl. während der Migration nach
  jedem Block — kein „am Ende repariert".
- ESLint-Regel gegen Inline-Styles aktiv für `src/components/ui/**`, **nicht**
  global (Prüfer verifiziert: ein Test-Inline-Style in einer Feature-Datei
  bricht `lint` nicht).
- `INLINE_STYLE_BASELINE`-Ratsche gesetzt und plausibel (ungefähr 128, kann
  durch Löschen von `shadcn/**` leicht abweichen).
- `TSC_BASELINE` korrekt nachgezogen.
- Kein neues Business-Feature, keine Feature-Datei angefasst.

**Abnahme:** Erst nach unabhängigem Review ist Gate G38 abgeschlossen. Kein
Merge, Tag oder Push ohne ausdrückliche Freigabe.
