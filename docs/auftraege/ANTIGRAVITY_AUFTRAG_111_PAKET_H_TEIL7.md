# ANTIGRAVITY_AUFTRAG_111 — Paket H Teil 7: Navigation nach häufigen Aufgaben gruppiert

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13, Punkt „Navigation nach häufigen Aufgaben ordnen“. Baseline `e1f6935` (main nach PR #101).

## Gruppierung

| Gruppe             | Fachbereiche (Reihenfolge)                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Tägliche Arbeit    | Übersicht, CRM & Pipeline, Vertrieb & Marketing                                              |
| Zahlen & Planung   | Finanzen, Organisation & Team, Strategie 2026+                                               |
| Unternehmenswissen | Unternehmen, Produkt, Markt & Wettbewerb, Kunden & ICP, Recht & Gründung, Internal Resources |
| Administration     | unverändert, nur für Admins                                                                  |

Die bisher standardmäßig geöffneten Bereiche (Übersicht, CRM, Vertrieb) bilden jetzt genau die erste Gruppe.

## Ziel-Dateien

| Datei                                                   | Änderung                                      |
| ------------------------------------------------------- | --------------------------------------------- |
| `src/domain/navData.ts`                                 | `NAV_SECTIONS` und `groupNavCategories()` neu |
| `src/components/layout/Sidebar.tsx`                     | Gruppenüberschriften (`role="group"`)         |
| `src/domain/__tests__/navSections.vitest.ts`            | neu: Vollständigkeit und Reihenfolge          |
| `src/components/layout/__tests__/Sidebar.ui.vitest.tsx` | Gruppen im gerenderten Menü                   |
| `scripts/captureAuftrag111Screenshots.mjs`              | Screenshot-Gate                               |
| `docs/screenshots/auftrag-111/README.md`                | Ergebnis-Matrix                               |

## Tasks

- [x] Gruppen als Daten in `navData.ts`, Typ `NavCategory` (Schutzbereich `src/types`) unverändert.
- [x] Kein Bereich verschwindet: nicht zugeordnete Kategorien landen in „Weitere Bereiche“ am Ende (Test).
- [x] Bereiche bleiben einzeln einklappbar; Routen, IDs, `NAV_CATEGORIES`-Inhalt und Administration unverändert.
- [x] Keine globale Suche (Plan: erst bei nachgewiesenem Bedarf).
- [ ] Offen, eigene Aufträge: Leer-/Fehlertexte, Fokusprüfung Menü, Ebenen-Unterscheidung, Herkunftslabel in `sourceFreshness.ts` (Schutzbereich).

## Grenzen

Nur Reihenfolge und Gruppenüberschriften der Seitenleiste. Schutzbereiche unverändert, keine neue Abhängigkeit.

## Rückweg

`git revert`; keine Datenbankänderung.
