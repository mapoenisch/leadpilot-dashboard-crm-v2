# ANTIGRAVITY AUFTRAG 025 — Einheitliche Auswahlfelder & responsive CRM-Filter

**Phase:** 6 · **Gate:** G9  
**Status:** DRAFT / SPEZIFIKATION  
**Voraussetzung:** Auftrag 024 (Gate G8) ist auf `main` abgeschlossen; Baseline-Commit für Vorher-Artefakte ist `a331e39`.  
**Referenzen:** `docs/FRONTEND_DESIGN_AUDIT_2026-09-01.md`, `docs/FRONTEND_MODERNISIERUNGSPLAN.md`, Auftrag 021–024.

---

## 1. Ziel

Die noch verbliebenen browsernativen Auswahlfelder werden durch die vorhandene Design-System-Komponente `Select` ersetzt. Damit wirken Filter und Run-Auswahl auf allen Seiten konsistent mit dem dunklen LeadPilot-Design, lassen sich auf Mobilgeräten zuverlässig bedienen und werden nicht mehr als fremdes Betriebssystem-Popup dargestellt.

**Dies ist ein gezielter UX- und Qualitätsauftrag.** Er erweitert keine Fachlogik, Berechnung oder Datenhaltung. Der Inhalt und die Wirkung jeder bestehenden Auswahl bleiben identisch.

## 2. Belegter Ausgangsbefund

Nach Auftrag 024 bestehen noch vier browsernative `<select>`-Elemente:

| Datei | Bestehende Funktion | Sollzustand |
|---|---|---|
| `src/features/crm/components/CompaniesView.tsx` | Branchenfilter | LeadPilot-`Select` mit denselben Branchenwerten |
| `src/features/crm/components/DealsView.tsx` | Stage-Filter | LeadPilot-`Select` mit denselben Stage-Werten |
| `src/features/crm/components/ActivitiesView.tsx` | Typ-Filter | LeadPilot-`Select` mit denselben Aktivitätstypen |
| `src/features/simulation/components/RunActionModal.tsx` | Auswahl eines vorhandenen Runs für Reproduce | LeadPilot-`Select` mit denselben `runId`-/Seed-Werten |

Die bereits etablierte Komponente [`src/components/ui/Select.tsx`](../../src/components/ui/Select.tsx) besitzt Combobox-/Listbox-Rollen, Tastaturbedienung, Fokus-Rückgabe und das visuelle Token-System. Sie ist wiederzuverwenden, nicht parallel nachzubauen.

## 3. Unverrückbare Grenzen

- Die Zweiteilung der Anwendung, Sidebar, Farbsystem und die bisherigen Chart-Primitives bleiben erhalten.
- Keine neue UI-, Chart-, Test- oder CSS-Bibliothek installieren.
- Keine Änderungen an `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, Repositories, Persistenz, RNG, Run- oder Versionsmodell.
- `src/features/resources/**` (Internal Resources) bleibt unverändert.
- Keine Änderung der Filterwerte, Suchlogik, Sortierung, Run-Reproduktion, Seeds oder Fehlermeldungssemantik.
- `Select.tsx` nur dann ändern, wenn alle vier Verbrauchsstellen einen nachweisbaren Fehler der gemeinsamen Komponente benötigen. Nicht für lokale Layout-Anpassungen ändern.
- Native `<select>`-Felder in den vier oben genannten Dateien dürfen nach Abschluss nicht mehr vorkommen.

## 4. Umsetzung

### Schritt 0 — Saubere Baseline

1. Auf `main` mit Baseline `a331e39` starten und `git status --short` dokumentieren.
2. `npx tsc --noEmit`, `npm run verify` und `npm run build` ausführen und die grüne Baseline im Abschlussbericht dokumentieren.
3. Einen separaten Worktree auf `a331e39` für die Vorher-Aufnahmen verwenden. Vorher und Nachher dürfen **nicht** in derselben laufenden Anwendung oder vom selben Commit erzeugt werden.

### Schritt 1 — CRM-Filter auf Design-System-Select migrieren

In den drei CRM-Ansichten ausschließlich die Darstellung und Bedienung des jeweiligen Filters ersetzen:

1. In `CompaniesView.tsx` aus `industries` ein `SelectOption[]` mit dem unveränderten Wert und Label bilden. `ALL` erhält ausschließlich das Label `Alle Branchen`.
2. In `DealsView.tsx` aus `stages` ein `SelectOption[]` mit dem unveränderten Wert und Label bilden. `ALL` erhält ausschließlich das Label `Alle Stages`.
3. In `ActivitiesView.tsx` aus `activityTypes` ein `SelectOption[]` mit dem unveränderten Wert und Label bilden. `ALL` erhält ausschließlich das Label `Alle Aktivitäten`.
4. `Select.onChange` setzt weiterhin unmittelbar `industryFilter`, `stageFilter` beziehungsweise `typeFilter`. Suchfeld, Filterzustand, Tabelleninhalt und vorhandene Empty States bleiben unverändert.
5. Die Filterleiste wird bei Breiten unter 768 px vertikal: Suchfeld volle Breite, Filter volle Breite, verständliches Label oberhalb bzw. innerhalb der `Select`-Komponente. Bei 768 px und 1440 px bleibt sie kompakt und horizontal.

### Schritt 2 — Run-Reproduktion konsistent gestalten

1. In `RunActionModal.tsx` das native Feld durch `Select` ersetzen.
2. Die Optionen behalten als `value` exakt `runId`. Das sichtbare Label bleibt fachlich vollständig: `<runId> (Seed: <seed>)`.
3. Die leere Auswahl wird mit dem vorhandenen Platzhalter `-- Run Auswählen --` repräsentiert; sie darf keinen ungültigen `runId`-Wert erzeugen.
4. `handleReproduce` und jede existierende Validierung bleiben unverändert. Der Button `Reproduzieren` darf bei fehlender Auswahl weiterhin keinen Run starten.
5. Für einen leeren Run-Bestand wird die vorhandene leere Auswahl verständlich dargestellt; keine künstlichen Beispiel-Runs erzeugen.

### Schritt 3 — Interaktionsqualität und Zugänglichkeit absichern

Für jede der vier migrierten Auswahlflächen gilt:

1. Trigger hat Combobox-Semantik, ein sichtbares Label und einen eindeutigen zugänglichen Namen.
2. Öffnen per Klick, `Enter`, Leertaste und Pfeiltasten; Auswahl per Pfeiltasten plus `Enter`.
3. `Escape` schließt die Liste und bringt den Fokus zurück zum auslösenden Trigger.
4. Die geöffnete Listbox liegt über Tabellen, Modal-Fußzeilen und Sidebar; sie darf nicht abgeschnitten werden.
5. Die Auswahl ist nicht allein an Farbe erkennbar (Text + Häkchen bleiben sichtbar).
6. Keine zusätzliche globale Scrollbar, kein horizontaler Dokument- oder Modal-Overflow bei 1440 × 900, 768 × 1024 und 375 × 812 px.

### Schritt 4 — Reproduzierbarer Gate-G9-Nachweis

1. `scripts/captureAuftrag025GateScreenshots.mjs` erstellen. Es verwendet denselben CDP-Ansatz wie Auftrag 024, aber einen eigenen Port und eine eigene temporäre Browser-Profildirectory.
2. Das Skript akzeptiert **nur** `--stage=vorher` oder `--stage=nachher`; unbekannte Argumente führen zu Exit-Code 1.
3. Vor **jedem** Viewport `localStorage` und `sessionStorage` leeren. Vorher wird ausschließlich im Worktree `a331e39`, Nachher ausschließlich im Implementierungs-Commit aufgenommen.
4. Bei jedem Flow hart prüfen: sichtbarer Trigger, `aria-expanded="true"`, sichtbare `ul[role="listbox"]`, mindestens eine Option mit `role="option"`, gewählte Option mit `aria-selected="true"`, veränderter gefilterter Inhalt bzw. unveränderte Reproduktions-Validierung.
5. Horizontales Clipping ist ein harter Fehler: `scrollWidth > clientWidth + 1` am Dokument oder an einem sichtbaren Dialog beendet das Skript mit Exception und Exit-Code 1.
6. Die Matrix enthält vier Flows bei drei Viewports und zwei Stages, insgesamt **24 PNG-Artefakte**:
   - `companies-filter-open-<viewport>-<stage>.png`
   - `deals-filter-open-<viewport>-<stage>.png`
   - `activities-filter-open-<viewport>-<stage>.png`
   - `run-reproduce-select-<viewport>-<stage>.png`
7. Nach Abschluss müssen alle 12 Vorher-/Nachher-Paare per SHA-256 byte-verschieden sein. Identische Paare sind Gate-Fehler, nicht nur ein Hinweis.

## 5. Abnahmekriterien (Gate G9)

- [ ] In den vier benannten Dateien existiert kein `<select`-Treffer mehr.
- [ ] Jeder bisherige Filterwert einschließlich `ALL` liefert weiterhin exakt dieselben Ergebnisse.
- [ ] Run-Reproduktion akzeptiert weiterhin nur einen bestehenden Run; keine Auswahl startet keinen Run.
- [ ] Geöffnete Auswahlfelder sind in Desktop, Tablet und Mobil vollständig sichtbar und bedienen sich per Tastatur.
- [ ] Das CRM-Filterlayout ist bei 375 px ohne horizontalen Overflow bedienbar.
- [ ] `npx tsc --noEmit`, `npm run verify` und `npm run build` sind grün.
- [ ] Der Schutzbereichs-Diff ist leer:

  ```bash
  git diff a331e39..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
  ```

- [ ] `docs/screenshots/auftrag-025/` enthält genau 24 Dateien nach der obigen Namenskonvention; jede Datei ist einer Viewport-/Stage-Kombination zuordenbar.
- [ ] `docs/screenshots/auftrag-025/README.md` enthält Baseline-Commit, Implementierungs-Commit, Kommandos, SHA-256 beider Dateien je Paar, State-Assertion und Overflow-Ergebnis.
- [ ] `docs/BUILD_LOG.md` dokumentiert Gate G9, geänderte Dateien, Prüfergebnisse, Screenshot-Matrix und die unveränderten Schutzbereiche.

## 6. Abschlussbericht

Der Abschlussbericht nennt:

1. den Implementierungs- und Dokumentations-Commit;
2. je migriertem Feld den früheren Wert, den verwendeten `SelectOption[]`-Wert und den unveränderten State-Setter;
3. den Nachweis für Filterwirkung und Reproduce-Validierung;
4. die 24-Artefakte-Matrix einschließlich Hashes und Overflow-Ergebnis;
5. den leeren Schutzbereichs-Diff;
6. bewusst nicht bearbeitete Bereiche: Simulation, Datenmodell, Internal Resources, Charts, Sidebar-Struktur und Farbsystem.

**Nicht Bestandteil von Auftrag 025:** neue fachliche Filter, Änderungen an CRM-Daten, neues Chart-Design, neue Modals oder eine Neustrukturierung der Anwendung.
