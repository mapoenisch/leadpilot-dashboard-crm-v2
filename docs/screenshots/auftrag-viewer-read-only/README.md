# Viewer strikt lesend — Screenshot-Matrix (nur Text, keine Bilddateien)

**Änderung mit UI-Bezug:** Auf `/crm/live-simulation` sehen Viewer statt „Run / Re-Run“ den Hinweis „Runs: nur Lesezugriff“. In der Audit-Ebene entfallen „Re-Run“, „Reproduce“ und „Diesen Run exakt Reproduzieren“, dafür erscheint „(nur Lesezugriff)“. Admin und Manager sollen **unverändert** bleiben.

- **Vorher:** `origin/main` `84b0703` (Merge PR #28) · **Nachher:** Arbeitsstand dieses Auftrags
- **Harness:** lokales Playwright-Skript (nicht committet): Login je Rolle aus dem Seed (viewer-a, manager-a, admin-a), Management- und Audit-Ebene, 1440/768/375, feste Uhr, reducedMotion, Knopfleiste in den sichtbaren Bereich gescrollt
- **Maskiert:** laufende Uhrzeit („Stand:“), Frische-Badge und Tick-Anzeige, weil sie sich zwischen zwei Aufnahmen ändern und nicht zur Änderung gehören
- **Umgebung:** lokales Supabase (Seed), Chromium 1243

## Ergebnis

- **Viewer:** 6/6 Aufnahmen geändert, wie erwartet. Die Pixel-Abweichung liegt jeweils in der Knopfleiste (Management) oder in der Aktionsspalte und im Kopf (Audit).
- **Admin und Manager:** 9/12 SHA-256-identisch. Die übrigen 3 weichen nur außerhalb der Knopfleiste ab: im Frische-/Runs-Badge (19 bzw. 47 px) und im Hover-Zustand von „Absolutwerte“ (3.820 px). Dieselben Hashes tauchen rollenübergreifend im Wechsel auf, das ist Aufnahme-Rauschen. „Run / Re-Run“ ist in allen Admin/Manager-Aufnahmen vorhanden und pixelgleich.
- **Overflow:** 0 px in allen Nachher-Aufnahmen.

## Matrix

| Rolle | Ebene | Viewport | SHA-256 vorher | SHA-256 nachher | Overflow nachher | Ergebnis |
|---|---|---|---|---|---|---|
| viewer | management | 1440 | `6d920180fcf5…` | `a34a8b56c657…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| viewer | audit | 1440 | `d92b6ff68da3…` | `c9c99c1576e7…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| viewer | management | 768 | `1e7f792aea2b…` | `a98634165414…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| viewer | audit | 768 | `e5992f80a074…` | `44a02b9bfe7b…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| viewer | management | 375 | `8d5ad482e894…` | `d9b8205144dc…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| viewer | audit | 375 | `eb701e5e019e…` | `ecb705ea0f3e…` | 0 px | geändert (erwartet): Hinweis statt Knopf |
| manager | management | 1440 | `6d920180fcf5…` | `cf9019310df0…` | 0 px | Rauschen (47 px, Frische-/Runs-Badge), Knopfleiste identisch |
| manager | audit | 1440 | `d92b6ff68da3…` | `d92b6ff68da3…` | 0 px | identisch |
| manager | management | 768 | `60c7556191f3…` | `60c7556191f3…` | 0 px | identisch |
| manager | audit | 768 | `e5992f80a074…` | `e5992f80a074…` | 0 px | identisch |
| manager | management | 375 | `addb51591b53…` | `addb51591b53…` | 0 px | identisch |
| manager | audit | 375 | `eb701e5e019e…` | `eb701e5e019e…` | 0 px | identisch |
| admin | management | 1440 | `c733b1e1eb58…` | `92c0c7cd5cb9…` | 0 px | Rauschen (19 px, Frische-Badge), Knopfleiste identisch |
| admin | audit | 1440 | `93f754677c04…` | `93f754677c04…` | 0 px | identisch |
| admin | management | 768 | `89ec9c7d4fbe…` | `89ec9c7d4fbe…` | 0 px | identisch |
| admin | audit | 768 | `e5992f80a074…` | `e5992f80a074…` | 0 px | identisch |
| admin | management | 375 | `8d5ad482e894…` | `addb51591b53…` | 0 px | Rauschen (3.820 px, Hover „Absolutwerte“), Knopfleiste identisch |
| admin | audit | 375 | `eb701e5e019e…` | `eb701e5e019e…` | 0 px | identisch |
