# ANTIGRAVITY_AUFTRAG_104 — Paket G3: Abschluss der Bildseiten-Migration

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G3. Voraussetzung erfüllt: Wellen G1/G2 (Aufträge 093–103)
> haben alle 32 Bildseiten freigegeben (PR #90 gemergt).

## Baseline

- Branch `claude/auftrag-104-g3-abschluss` von `main` `a4fb52d` (nach Merge PR #90).
- Schutzbereichs-Baseline: `a4fb52d`.

## Tasks

- [x] Inventar 32 von 32 mit dokumentiertem Ergebnis je Seite (Befundregister Abschnitt 4a: Route, Schlüssel,
      Welle, Auftrag, Nachweis). Keine Seite ohne Auftrag und Screenshot-Nachweis.
- [x] Doppelte versteckte Inhaltsfassung aus der aktiven Darstellung entfernen: `PAGE_PRESENTATION` auf `'html'`.
      Damit rendert keine Seite mehr Ganzseiten-WebP, Zoom-Hinweis oder unsichtbare Textschicht.
- [x] Architekturentscheidung als Revision zu B18 ergänzen (neue Darstellungsregel, Rückweg), Eintrag im
      Änderungsprotokoll D4. Revision vom 26.09.2026 bleibt als Historie stehen.
- [x] Test ohne Mock für alle 32 Seiten (`g104BildseitenAbschluss.ui`).

## Ziel-Dateien

| Datei                                                         | Änderung                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/config/pagePresentation.ts`                              | Schalter `'html'`, Kommentar mit neuer Regel und Rückweg     |
| `src/components/imagePage/ImagePage.tsx`                      | nur Kommentar: Bildweg ist Rückweg, keine aktive Darstellung |
| `src/app/__tests__/g93FunnelPage.ui.vitest.tsx`               | Erwartung globaler Schalter `'html'`                         |
| neu `src/app/__tests__/g104BildseitenAbschluss.ui.vitest.tsx` | alle 32 Seiten ohne Bild und ohne Textschicht                |
| `e2e/semantic-routes.spec.ts`                                 | nur Kommentar                                                |
| `docs/reviews/2026-10-06-frontend-befundregister.md`          | Abschnitt 4a: Inventar 32/32                                 |
| `ARCHITECTURE_DECISIONS.md`                                   | Revision zu B18, Zeile in D4                                 |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag  | Nachweis                                                     |

## Globale Grenzen

- Schutzbereiche unverändert. Keine Datenänderung, keine neue Abhängigkeit.
- Kein Löschen von Referenzdateien oder Assets: WebPs unter `public/assets/auftrag-037d`–`037g`,
  `imagePages.ts` und `ImagePage` bleiben als Rückweg erhalten; `g67ImagePages.ui` prüft den Bildweg weiter
  (Schalter dort gemockt).
- Die Seitenkomponenten behalten den `ImagePage`-Wrapper, damit der Rückweg je Seite ohne Codeänderung an den
  Seiten funktioniert.

## Sichtbare Wirkung

Keine. Alle 32 Seiten waren über `HTML_PAGES` bereits als echte Seiten ausgeliefert; der Schalter ändert nur
den Standard und macht den Bildweg zum reinen Rückweg. Deshalb keine neue Screenshot-Matrix: Vorher- und
Nachher-Aufnahmen wären bitgleich. Die Ganzseitenprüfung aller 32 Seiten (Vorher/Nachher gegen die Baseline
aus Auftrag 081) folgt in Paket I.

## Rückweg

- Einzelne Seiten: `PAGE_PRESENTATION = 'bild'` und deren Schlüssel aus `HTML_PAGES` entfernen.
- Alle Seiten: `'bild'` mit leerer `HTML_PAGES`, oder Tag `v2.4.0` ausliefern.
- Freigabetests der zurückgenommenen Seiten in der jeweiligen Wellen-Suite (`g93FunnelPage.ui` bis
  `g103ProduktSeiten.ui`) entfernen; sie sichern die Freigabe bewusst ab. `g104BildseitenAbschluss.ui` und
  `e2e/semantic-routes.spec.ts` folgen dem Schalter (Codex PR #91, P2). Probe am 19.10.2026: Schalter `'bild'`,
  `product-pricing` entfernt → nur die zwei Freigabetests in `g103ProduktSeiten.ui` rot, alle übrigen grün.
- Keine Datenbankänderung nötig.

## Abnahme

Codex prüft unabhängig. Gates nach Plan Abschnitt 14.
