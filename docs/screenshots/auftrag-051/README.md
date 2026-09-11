# Auftrag 051 — Screenshot-Matrix (G36)

Werkzeug: `scripts/captureGateScreenshots.mjs` (wiederverwendet),
12 Routen-/Viewport-Paare, Erfolgsfall (Daten geladen, lokaler Fallback —
Supabase nicht konfiguriert, deterministisch).

## Erfolgsfall: Baseline (9328255) vs. nachher — SHA-256 muss GLEICH sein

| Shot | Baseline | Nachher | Ergebnis |
|---|---|---|---|
| dashboard-1440/768/375 | `01ae8ee8…` / `e81d71fc…` / `e4eec08b…` | identisch | **GLEICH** (3/3, deckt Block D ab) |
| crm-leads-1440/768/375 | `257d19eb…` / `590c9b48…` / `311248cd…` | identisch | **GLEICH** (3/3, deckt Block C+E-Reads ab) |
| crm-deals-1440/768/375 | `fdcb8fb7…` / `0b30e654…` / `3c3a4b18…` | identisch | **GLEICH** (3/3, deckt Block B ab) |
| crm-companies-1440/768 | `d4e24586…` / `172b43b1…` | identisch | **GLEICH** (deckt Block B ab) |
| crm-companies-375 | `c7609b03…` | abweichend | 1px-AA-Drift, 34×25px-Ecke (Hamburger-Icon, unberührtes Layout-Chrome), siehe Analyse |
| crm-leads-1440 | `257d19eb…` | erst abweichend | Wiederholungslauf **byte-identisch** zur Baseline → Run-Flake, siehe Analyse |

Voll-Hashes: `/tmp/051-baseline.sha` (Build-Umgebung, nicht committet).

## Analyse der 2 Abweichungen

- **crm-leads-1440:** Zweitlauf nachher == Baseline byte-identisch.
  Reines Run-zu-Run-Rasterrauschen (4px-Textzeile). Erledigt.
- **crm-companies-375:** Über 4 Runs des neuen Codes stabil, Baseline-Code
  (Worktree auf 9328255, eigener Build) deterministisch anders — Differenz
  ausschließlich BBox (8,4)–(42,29): Hamburger-Icon-Kante + Divider,
  bei 4-facher Vergrößerung visuell identisch, Rest der Seite byte-identisch.
  Keine der 051-Änderungen berührt diese Stelle (Layout-Chrome, kein DOM-
  Unterschied möglich: QueryClientProvider rendert kein Element). Eingestuft
  als Subpixel-Rasterisierung, kein UI-Unterschied.
- Unabhängige Gegenprobe: `npx playwright test visual` **15/15 grün** gegen
  committete Baselines bei Toleranz 0 — darunter `/crm/leads` auf allen
  3 Viewports (umgebaute LeadsPage rendert pixelidentisch).

## Neue Zustände (`states/`)

| Shot | Wie entstanden | Zeigt |
|---|---|---|
| `sync-idle-1440.png` | Audit-Tab geöffnet, echter Klickpfad | Seed-Button Ruhezustand |
| `sync-result-1440.png` | Seed-Button geklickt (echter Lauf) | Ergebnis-Alert („Supabase credentials not configured…"), Mutation Ende-zu-Ende aktiv |

## Nicht als PNG aufnehmbar (mit Begründung)

- **Query-Loading-State:** Die Reads lösen im lokalen Fallback in Microtasks
  (JSON im Bundle inliniert, kein Netzwerk-Hebel). React batched Mount- und
  Resolve-Render vor dem ersten Paint — der Loading-DOM (`[data-testid=
  "management-chart-loading"]`, im echten Browser per waitFor nachgewiesen)
  erzeugt keinen eigenen Paint-Frame. CPU-Throttle (20–50x) + Burst-Serien
  (30 Shots) und In-Page-1ms-Poll ändern daran nichts.
- **Query-Error-State:** Kein Read-Pfad kann in dieser Umgebung fehlschlagen
  (Supabase-Pfad fällt graceful auf lokal zurück, lokaler Pfad ist
  infallibel). Beweis stattdessen per jsdom: `useCrmSync`-Rollback-Test
  (Fehler→Rollback) sowie Code-Review der Error-Äste (Muster wie
  PipelineSnapshot-Bestand).
- **Syncing-Label („Seeding läuft…"):** Mutation löst lokal in Millisekunden;
  onMutate/onSuccess werden in einen Render gebatcht (In-Page-1ms-Poll +
  50x-Throttle verfehlt das Fenster reproduzierbar). Verhalten per jsdom-Test
  bewiesen (`idle → syncing → success`, Deferred-Promises). Mit langsamem
  Supabase-Seed malt der Button den Zustand (Code: `disabled` + Label-Wechsel).
