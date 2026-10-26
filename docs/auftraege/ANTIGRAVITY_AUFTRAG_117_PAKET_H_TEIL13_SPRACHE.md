# ANTIGRAVITY_AUFTRAG_117 — Paket H Teil 13: Sprachliste und Fachkürzel

> **Builder:** Claude Code · **Prüfer:** unabhängig (Codex auf GitHub) · Baseline `a8d3162` (main nach PR #108).

## Befund

Die Begriffe „Vertriebsphase“, „Teamgröße“, „Gesamtkosten pro Neukunde“ und „Daten aus dem CRM“ sind im Code bereits umgesetzt (Aufträge 105–113, Stichprobe per `grep` in `src/`). Offen war der zweite Teil des Plan-Punkts: Fachkürzel ARR/MRR/EBITDA (sowie CAC/LTV/NRR) bleiben sichtbar, hatten aber keine verständliche Erklärung.

## Änderungen

| Stelle                                        | Bisher | Neu                                                           |
| --------------------------------------------- | ------ | ------------------------------------------------------------- |
| `src/config/glossary.ts`                      | —      | Glossar (6 Kürzel) und `splitGlossaryTerms`                   |
| `src/components/pageKit/GlossaryText.tsx`     | —      | zeichnet Kürzel in Strings als `<abbr title>` aus             |
| `src/components/pageKit/PageHero.tsx`         | roh    | Untertitel (nur String) und Pills laufen durch `GlossaryText` |
| `…/__tests__/PageHero.glossary.ui.vitest.tsx` | —      | Zerlegung, Auszeichnung, Texte ohne Kürzel / Nicht-Strings    |

## Tasks

- [x] Glossar und Komponente anlegen, in `PageHero` einbinden.
- [x] Tests ergänzen.
- [x] Plan Abschnitt 13, Punkt Sprachliste abhaken.

## Grenzen

Nur Untertitel und Pills der Seitenköpfe (`PageHero`); der `<h1>` bleibt unverändert, damit sein zugänglicher Name stabil ist, keine Fließtexte und Diagramm-Beschriftungen. Erklärung per `title` (Maus, Tastatur-Fokus nicht; Touch ohne Tooltip) – ein sichtbarer Begriffsblock wäre ein Layout- und Baseline-Eingriff und bleibt offen. Schutzbereiche unverändert, keine neue Abhängigkeit.

## Rückweg

`git revert`.
