# BUILD_PLAN_V2.2.0 — LeadPilot Dashboard-CRM

**Version:** `2.2.0` (Härtung, keine neue Fachfunktion)
**Branch:** `codex/v2.2.0-haertung`
**Baseline:** `ea5859a` (`release: v2.1.0`)
**Veröffentlichungsstatus:** `OFFEN — explizite Autorisierung erforderlich`

> Merge nach `main`, Git-Tag und Remote-Push bleiben offen bis zur ausdrücklichen Freigabe durch Marc.
> V2.2.0 führt **keine** neue Fachfunktion ein. Die Oberfläche sieht am Ende identisch aus —
> das wird per Screenshot-Vergleich gegen die V2.1.0-Baseline bewiesen.

---

## Einordnung in die Gate-Kette

| Gate | Inhalt | Status |
|---|---|---|
| G27 | V2.1 Regression & Accessibility | ✅ freigegeben, `v2.1.0` getaggt |
| **G28** | **Supabase Live Operation** | ⏸️ **Design existiert (`d13cb3b`), Umsetzung pausiert** |
| **G29–G43** | **V2.2.0 Härtung (dieser Plan)** | 🔄 laufend |
| G28 (Fortsetzung) | Supabase Live Operation | ⏭️ nach G43 |

G28 behält seine Nummer und sein Design-Dokument auf Branch `codex/g28-supabase-live-operation-design`.
Es wird **nicht** umnummeriert, nur nach hinten verschoben.

---

## Grundlage

Dieser Plan setzt eine vollständige Code-Analyse des Stands `ea5859a` um. Alle Zahlen in der
Abnahmetabelle sind gemessen, nicht geschätzt.

---

## Getroffene Entscheidungen

| # | Frage | Entscheidung | Begründung |
|---|---|---|---|
| **E1** | Git-Historie (592 MB) | **Neues Repository**, altes als Archiv-Remote | Historie bleibt lesbar; kein Force-Push, kein Verstoß gegen `CLAUDE.md` §9; die Commit-Referenzen im BUILD_LOG bleiben im Archiv gültig |
| **E2** | Styling | **Tailwind konsequent** | `tailwind.config.js` bindet bereits alle 67 Design-Tokens ein — die Vorarbeit existiert und wird nur nicht genutzt |
| **E3** | State-Management | **Zustand** | Selektoren verhindern unnötige Renderings automatisch; 1,2 KB; kein Provider-Baum |
| **E4** | Server-State | **Beides, klar getrennt** | TanStack Query für alles per HTTP (CRM, Baselines, Audit-Summaries); eigener Store bleibt für den Realtime-Stream, umgestellt auf `useSyncExternalStore` |

---

## Definition of Done

„Der letzte winzige Fehler" ist nicht messbar — Schwellen sind es. **V2.2.0 gilt erst als freigegeben,
wenn jede einzelne Zeile erfüllt ist.** Kein „fast", kein „bis auf". G43 prüft diese Tabelle maschinell.

| # | Kennzahl | Heute | Ziel | Gemessen mit |
|---|---|---|---|---|
| 1 | ESLint-Fehler | kein Linter | **0** | `npm run lint` |
| 2 | ESLint-Warnungen | – | **0** | `--max-warnings 0` |
| 3 | Prettier-Abweichungen | – | **0** | `prettier --check` |
| 4 | TypeScript-Fehler | 0 ✅ | **0** | `tsc --noEmit` |
| 5 | `any`-Typen in `src/` | 42 | **0** | `no-explicit-any` |
| 6 | `console.*` in `src/` | 25 | **0** | `no-console` |
| 7 | `useSyncExternalStore` in Live-Hooks | 0 | **3** | Verifier-Assertion |
| 8 | Realtime-Kanäle bei 12 KPIs | 12 | **1** | Vitest + Adapter-Mock |
| 9 | Layering-Verstöße | 3 | **0** | `import/no-restricted-paths` |
| 10 | Klickbare `<div>`/`<span>` | 10 | **0** | `jsx-a11y` |
| 11 | `target="_blank"` ohne `noopener` | 4 | **0** | `react/jsx-no-target-blank` |
| 12 | Inline-Styles (nicht laufzeitberechnet) | ~1.400 | **0** | `react/forbid-dom-props` + Custom-Regel |
| 13 | Komponenten > 400 Zeilen | 19 | **0** | `max-lines` |
| 14 | Coverage `services/` + `hooks/` | 0 % | **≥ 90 %** | `vitest --coverage` |
| 15 | Coverage `simulation/` | ungemessen | **≥ 80 %** | `vitest --coverage` |
| 16 | Coverage `components/` | 0 % | **≥ 60 %** | `vitest --coverage` |
| 17 | Größter JS-Chunk | 798 KB | **≤ 250 KB** | `size-limit` |
| 18 | Initial-Load (gzip) | ~308 KB | **≤ 180 KB** | `size-limit` |
| 19 | Lighthouse Performance | ungemessen | **≥ 90** | Lighthouse CI |
| 20 | Lighthouse Accessibility | ungemessen | **≥ 95** | Lighthouse CI |
| 21 | `.git`-Größe | 592 MB | **≤ 50 MB** | `du -sh .git` |
| 22 | CI-Läufe | 0 | **grün bei jedem Push** | GitHub Actions |
| 23 | Handgeschriebene Capture-Skripte | ~50 | **≤ 3** | Dateizählung |

---

## Gate-Übersicht G29 – G43

Serielle Abhängigkeit. Jedes Gate braucht die Freigabe des vorherigen.

| Gate | Auftrag | Beschreibung | Behebt | Aufwand |
|---|---|---|---|---|
| **G29** | 044 | Repo-Hygiene & Werkzeug-Basis | Repo-Hygiene, 592 MB, Build-Tools | 1–2 T |
| **G30** | 045 | ESLint + Prettier + strengeres TypeScript | Messgrundlage für 6 Befunde | 1 T |
| **G31** | 046 | Vitest + Testing Library + Playwright + CI | Keine QS-Werkzeuge, keine CI, 50 Skripte | 1–2 T |
| **G32** | 047 | Charakterisierungstests Store & Hooks | Testlücke Hooks/Store | 1–2 T |
| **G33** | 048 | `useSyncExternalStore` + Store-Bugfixes | **KRITISCH 1** + MITTEL 9 | 1 T |
| **G34** | 049 | Ein Realtime-Kanal + Reconnect-Backoff | **HOCH 5** + Backoff | 1–2 T |
| **G35** | 050 + 050-B | Layering-Verstöße + Kleinbefunde (050 Architektur/Kleinbefunde außerhalb `src/simulation/`; 050-B Simulation-Typhärtung) | 7+1 Verstöße + MITTEL 8; `any`/`console`/`tsc`-Flut real ~2× Plan → geteilt | 2–3 T + 2 T |
| **G36** | 051 | TanStack Query für Server-State | Server-State-Bibliothek, Optimistic Updates | 2 T |
| **G37** | 052 | `SimulationContext` → Zustand | **HOCH 4** (Teil 1) | 2–3 T |
| **G38** | 053 | Design-System-Fundament | Vorbereitung HOCH 3 | 2 T |
| **G39** | 054–057 | Styling-Migration in vier Wellen | **HOCH 3** + Skeleton + Container Queries + Theme | 6–8 T |
| **G40** | 058 | Rendering-Optimierung & große Komponenten | **HOCH 4** (Teil 2) + Virtualisierung | 2–3 T |
| **G41** | 059 | Bundle & Ladezeit | **MITTEL 6** + Web-Fonts | 1–2 T |
| **G42** | 060 | Authentifizierungs-Schicht (app-seitig) | **KRITISCH 2** (App-Hälfte) | 2–3 T |
| **G43** | 061 | V2.2.0 Release-Audit | Nachweis aller 23 Kennzahlen | 1–2 T |

**Gesamtaufwand: 24 – 34 Arbeitstage.**

> **Verkürzte Variante:** Phase 0 + 1 + 2 (G29–G37, 11–15 Tage) bringt das Projekt auf einen Stand,
> auf dem G28 gefahrlos starten kann. Phase 3 ist Wartbarkeit, nicht Korrektheit — sie könnte auch
> nach G28 laufen. Diese Entscheidung trifft Marc nach G37.

---

## Phasen

### Phase 0 — Sicherheitsnetz (G29–G31)

**Kein Produktcode.** Ein Umbau von 128 Dateien ohne Linter und ohne Tests ist Blindflug.

- **G29 / 044** — Neues Repository nach E1; `.gitignore`; Root aufräumen; Build-Tools nach
  `devDependencies`; Branches und Worktrees reduzieren.
- **G30 / 045** — ESLint (`@typescript-eslint`, `react-hooks`, `jsx-a11y`, `import`), Prettier,
  `noUnusedLocals`/`noUnusedParameters`/`noUncheckedIndexedAccess`.
  **In diesem Gate wird nichts repariert, nur gemessen** — Ergebnis ist eine Baseline-Zahl.
- **G31 / 046** — Vitest, Testing Library, Playwright, GitHub Actions, `size-limit`.
  Migration von `verifyIntegrity.ts` nach dem Vier-Schritte-Verfahren (siehe unten).

### Phase 1 — Realtime-Kern (G32–G34)

- **G32 / 047** — Charakterisierungstests. Drei Rot-Nachweise sind Pflicht:
  Status-Hängenbleiben, Historie-Verlust, Tearing.
- **G33 / 048** — `useSyncExternalStore` in allen drei Live-Hooks; `setTick`-Hack raus;
  `historyPromise` raus; `status` nach History-Fetch setzen; 60-Sekunden-Aufbewahrungsfenster.
- **G34 / 049** — `subscribeToLiveKpiFeed`: ein Kanal statt zwölf; exponentielles Backoff mit
  Jitter; sichtbarer Verbindungszustand.

### Phase 2 — Architektur & Datenschicht (G35–G37)

- **G35 / 050** — Drei Layering-Verstöße; 42 `any`; 25 `console.*` → zentraler Logger;
  4 × `rel="noopener noreferrer"`; 10 klickbare `<div>` → `<button>`; ErrorBoundary-Abdeckung.
- **G36 / 051** — TanStack Query für HTTP-State; ein Musterfall Optimistic Update;
  Grenze zum Realtime-Store dokumentiert.
- **G37 / 052** — Zustand-Store mit `simulationSlice`, `scenarioSlice`, `runSlice`;
  Selektor-Hooks; Profiler-Messung vorher/nachher.

### Phase 3 — Frontend-Qualität (G38–G41)

Der größte Block — über die Hälfte des Gesamtaufwands.

- **G38 / 053** — Token-Brücke vervollständigen; Primitive mit `cva`-Varianten;
  ESLint-Regel gegen Inline-Styles scharfschalten; `/design-system`-Route (DEV).
- **G39 / 054–057** — Styling-Migration in vier Wellen à 25–38 Dateien.
  **Je Welle: Screenshot-Vergleich muss pixelidentisch sein** — hier ist Gleichheit der Beweis.
  Zusätzlich: Skeleton-Loading, Container Queries, Hell/Dunkel-Umschaltung.
- **G40 / 058** — Profiler-gestützte Optimierung (nur wo messbar wirksam);
  `@tanstack/react-virtual` für lange Listen; 19 Riesenkomponenten zerlegen.
- **G41 / 059** — `manualChunks` verfeinern; Baseline-JSON nach `public/`;
  Web-Fonts entblockieren; `size-limit`-Budgets scharf.

### Phase 4 — Auth-Vorbereitung (G42)

- **G42 / 060** — `AuthProvider`, `useAuth()`, `<ProtectedRoute>`, Login-Seite, Rollenmodell.
  **Die RLS-Policies (`USING (true)`) gehören inhaltlich zu G28** — hier wird nur die App
  vorbereitet, damit G28 sie nur noch anschließen muss.

### Phase 5 — Nullfehler-Nachweis (G43)

- **G43 / 061** — `verifyV22ReleaseReadiness.ts` prüft alle 23 Kennzahlen maschinell;
  vollständiger Screenshot-Vergleich gegen V2.1.0; `docs/releases/V2.2.0.md`.
  Doku-Konsistenz-Verifier für V2.2.0: die Helfer `assertNoConflictingCount` +
  `isCurrentClaimLine` aus dem in G31 gelöschten `verifyV21ReleaseReadiness.ts`
  (letzter Stand: commit `89333d9b5fdf642f30282dd9d7665cc425bce458`) als
  Ausgangspunkt übernehmen. Keinen Stub-Modul anlegen — G43 baut frisch.

---

## Ablösung der handgeschriebenen Qualitätssicherung

Nicht weniger Qualitätssicherung — **automatisierte statt handgeschriebener**.
~28.900 Zeilen Skriptcode werden zu geschätzt ~3.000 Zeilen Testcode, bei **mehr** Prüftiefe.

| Heute | Künftig | Gewinn |
|---|---|---|
| `verifyIntegrity.ts` — 24 Suiten, ~640 Assertions | **Vitest** | Einzeltests, Watch-Modus, parallel, Coverage |
| ~50 × `captureAuftrag0XX…mjs`, je ~700 Zeilen CDP | **Playwright** | 1 parametrisiertes Skript, Vergleich eingebaut |
| `auditV21LiveAccessibility.mjs` (798 Zeilen) | **Playwright + `@axe-core/playwright`** | Vollständiger Scan statt 57 handgebauter Checks |
| `measureAuftrag038Performance.mjs` | **Lighthouse CI** | Standardisierte Kennzahlen |
| `verifyV21ReleaseReadiness.ts` | **bleibt, verschlankt** | Für Doku-Konsistenz gibt es kein Standardwerkzeug |
| „Marc führt lokal acht Befehle aus" | **GitHub Actions** | Läuft bei jedem Push, niemand kann es vergessen |

### Migration ohne Vertrauensverlust — vier Schritte

1. **Parallelbetrieb.** Vitest wird eingerichtet. `verifyIntegrity.ts` läuft weiter. Beide im CI.
2. **Suite für Suite.** Pro Suite eine `.test.ts` mit **identischen** Assertions. Beide grün auf
   dem aktuellen Stand? Dann der eigentliche Beweis: **ein absichtlicher Fehler im Produktcode —
   werden beide rot?** Erst dann wird die alte Suite entfernt.
   *(Mutation Testing im Kleinen: ein Test, der bei kaputtem Code grün bleibt, ist wertlos.)*
3. **Screenshots.** Playwright bringt `toHaveScreenshot()` mit Pixelvergleich und Toleranzschwelle
   mit. Die SHA-256-Matrix und die `generateAuftrag0XX…mjs`-Skripte werden überflüssig.
4. **Das Gate-Verfahren bleibt unverändert.** Auftrag → Bauen → Prüfen → Nacharbeit → Freigabe.
   Was sich ändert: Der Prüfer liest einen **CI-Bericht**, statt selbst acht Befehle auszuführen.
   Der BUILD_LOG-Eintrag verlinkt den CI-Lauf. Die Disziplin bleibt, der manuelle Aufwand fällt weg.

### CI-Pipeline

```
Push → ┬─ lint          (ESLint, 0 Warnungen)
       ├─ typecheck     (tsc --noEmit)
       ├─ test          (Vitest + Coverage-Schwellen)
       ├─ build         (vite build)
       ├─ size-limit    (Bundle-Budgets)
       └─ e2e           (Playwright: Screenshots + axe + Lighthouse)
```

Alle sechs müssen grün sein. Ein roter Job blockiert den Merge.

---

## Reihenfolge — Begründung

1. **Werkzeuge vor Reparatur.** ESLint findet einen Großteil der Befunde von selbst. Es wäre
   Verschwendung, sie erst von Hand zu suchen und dann den Linter einzuschalten.
2. **Tests vor Umbau.** Der Realtime-Store wird in G33/G34 substanziell umgebaut, das Styling in
   G39 über 128 Dateien. Ohne die Tests aus G31/G32 wüsste niemand, ob dabei etwas kaputtgeht.
3. **Architektur vor Kosmetik.** Wenn Komponenten in G40 zerlegt werden, sollen sie bereits auf
   dem finalen State-Management (G37) und dem finalen Styling (G39) sitzen — sonst zerlegt man zweimal.

---

## Befund-Zuordnung (Vollständigkeitsnachweis)

| Befund | Gemessen | Gate |
|---|---|---|
| 🔴 `useSyncExternalStore` fehlt (Tearing) | 0 Vorkommen | G32 → G33 |
| 🔴 Keine Auth + offene RLS-Policies | 0 Auth-Aufrufe | G42 + G28 |
| 🟠 Drei parallele Styling-Systeme | 128 / 29 / 1.247 | G38 → G39 |
| 🟠 Rendering nicht optimiert | memo 6 · useCallback 4 | G37 + G40 |
| 🟠 Ein Realtime-Kanal pro Kennzahl | 12 Kanäle | G34 |
| 🟠 Layering-Verstöße | 3 Stück | G30 → G35 |
| 🟡 Bundle-Aufteilung zu grob | 798 KB | G41 |
| 🟡 Keine Qualitätswerkzeuge, keine CI | 0 Werkzeuge | G30 + G31 |
| 🟡 `any` / `console` / a11y / Links | 42 · 25 · 10 · 4 | G30 → G35 |
| 🟡 Store-Detailfehler | 3 Stück | G33 |
| 🟡 Server-State-Bibliothek fehlt | handgebaut | G36 |
| 🟡 Skeleton / Container Queries / Theme | fehlt | G39 |
| 🟡 Virtualisierung langer Listen | fehlt | G40 |
| 🟡 Optimistic Updates / Reconnect-Backoff | fehlt | G34 + G36 |
| 🟡 Web-Fonts blockieren das Rendern | `@import` | G41 |
| 🟡 Riesenkomponenten | 19 · max 883 | G40 |
| 🟢 Repo-Hygiene / 592 MB / 50 Skripte | 271 MB Bilder | G29 + G31 |
| 🟢 Build-Tools in `dependencies` | 3 Pakete | G29 |

---

## Schutzbereiche während V2.2.0

Abweichend von den bisherigen Aufträgen wird in V2.2.0 **bewusst** in bisher geschützte Bereiche
eingegriffen — das ist der Zweck dieses Plans. Es gilt stattdessen:

- Jeder Eingriff geschieht **nur** im Rahmen des jeweils aktiven Auftrags und nur in dessen
  Ziel-Dateien.
- **Fachliches Verhalten bleibt unverändert.** Beweis: alle bestehenden Integritätssuiten bleiben
  grün, und der Screenshot-Vergleich gegen V2.1.0 muss **identisch** ausfallen.
- `src/simulation/**` wird ausschließlich in G31 (Testmigration) und G37 (State-Anbindung)
  berührt — die Engine-Logik selbst bleibt unverändert.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe durch Marc.

---

## Veröffentlichungsregel

```
OFFEN — explizite Autorisierung erforderlich
```

Erst nach ausdrücklicher Freigabe durch Marc und grünem G43:
1. `git checkout main && git merge --no-ff codex/v2.2.0-haertung`
2. `git tag v2.2.0`
3. `git push origin main --tags`

Dieses Dokument autorisiert diese Schritte nicht.

---

## Offene Punkte zur Klärung vor Phase 0

1. **Web Worker:** `workerAdapter.ts` importiert `workerRunner` direkt aus `simulation.worker.ts`.
   Das sieht nach einem synchronen Fallback im Hauptthread aus, nicht nach einem echten Worker.
   Zu prüfen in G31 — falls bestätigt, ist der Performance-Vorteil nur auf dem Papier und
   gehört als eigener Befund in Phase 3.
2. **Aussagekraft der 24 Simulation-Suiten:** ~640 assertion-artige Zeilen gezählt, Aussagekraft
   nicht geprüft. Entscheidet, ob die Migration in G31 eine Stunde oder drei Tage dauert.
