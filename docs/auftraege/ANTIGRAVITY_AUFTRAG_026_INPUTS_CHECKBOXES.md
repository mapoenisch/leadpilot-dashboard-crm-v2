# Auftrag 026: Design-System-Eingaben und Checkboxen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Phase:** 6 · **Gate:** G10

**Goal:** Die verbleibenden handgebauten CRM-Suchfelder und sichtbaren Browser-Checkboxen durch zugängliche LeadPilot-Controls ersetzen, ohne Such-, Auswahl- oder Simulationslogik zu verändern.

**Architecture:** Die bestehende `Input`-Komponente wird als einheitliche Such-Eingabe mit programmatischer Beschriftung und optionalem führenden Icon vervollständigt. Eine kleine `Checkbox`-Primitive kapselt das native Eingabeelement semantisch, rendert aber ausschließlich die LeadPilot-Oberfläche. Die Views behalten ihre State-Setter und Filterausdrücke unverändert bei.

**Tech Stack:** React, TypeScript, vorhandene Design Tokens, lucide-react, CDP-Screenshot-Harness, keine neue Abhängigkeit.

**Spec:** `docs/FRONTEND_DESIGN_AUDIT_2026-09-01.md`, `docs/FRONTEND_MODERNISIERUNGSPLAN.md`, `docs/auftraege/ANTIGRAVITY_AUFTRAG_025_UNIFIED_SELECTS.md`.

## Globale Grenzen

- Baseline für Vorher-Artefakte: Commit `45b9f7e`.
- Sidebar, Zweiteilung, Farbsystem, Chart-Primitives und alle Aufträge 022–025 bleiben erhalten.
- `Internal Resources` bleibt unverändert: `src/features/resources/**` ist tabu.
- Keine Änderung an `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, Repositories, Persistenz, Run-/Versionsmodell, RNG oder Berechnungen.
- Keine neue UI-, Chart-, CSS- oder Test-Bibliothek.
- `NumberStepper` bleibt unverändert: seine Klasse `no-spinner` unterdrückt bereits Browser-Spinner und die Plus-/Minus-Steuerung ist vorhanden.
- Eine semantische, visuell versteckte `<input type="checkbox">` innerhalb der neuen gemeinsamen `Checkbox` ist zulässig. Sichtbare, ungestylte Checkboxen in Feature-Dateien sind es nicht.

---

## Ziel-Dateien

| Datei | Verantwortung |
|---|---|
| `src/components/ui/Input.tsx` | Zugängliche, einheitliche Text-/Sucheingabe mit optionalem führenden Icon |
| `src/components/ui/Checkbox.tsx` | Neue visuelle Checkbox mit echter HTML-Semantik und Tastaturbedienung |
| `src/features/crm/components/CompaniesView.tsx` | Migration der Unternehmenssuche auf `Input` |
| `src/features/crm/components/DealsView.tsx` | Migration der Deal-Suche auf `Input` |
| `src/features/crm/components/ActivitiesView.tsx` | Migration der Aktivitätssuche auf `Input` |
| `src/features/simulation/components/ScenarioManagerModal.tsx` | Migration von „Nur geänderte Parameter“ auf `Checkbox` |
| `src/features/simulation/components/MultiScenarioComparisonModal.tsx` | Migration der Szenarioauswahl auf `Checkbox` ohne Doppel-Toggle |
| `scripts/captureAuftrag026GateScreenshots.mjs` | Neuer, isolierter G10-Harness |
| `docs/screenshots/auftrag-026/README.md` | Matrix, Commit-Nachweis, Hashes, Assertions und Overflow-Ergebnisse |
| `docs/BUILD_LOG.md` | G10-Abschlussbericht |

## Task 1: `Input` als sichere Design-System-Suche vervollständigen

**Files:**
- Modify: `src/components/ui/Input.tsx`
- Test: `scripts/captureAuftrag026GateScreenshots.mjs`

**Consumes:** Das bestehende `InputProps`-Interface und Design Tokens.

**Produces:** `Input` akzeptiert zusätzlich `leadingIcon?: React.ReactNode`; sichtbare Labels erhalten eine eindeutige `htmlFor`-/`id`-Beziehung.

- [ ] **Schritt 1: Bestehende Typ-Kompatibilität prüfen**

  Alle bestehenden Aufrufer müssen mit unveränderten Props weiter kompilieren. Der neue Prop ist optional:

  ```ts
  leadingIcon?: React.ReactNode;
  ```

- [ ] **Schritt 2: Eindeutige ID und Label-Beziehung implementieren**

  `useId()` verwenden; wenn kein `id` übergeben wurde, daraus eine stabile lokale ID erstellen. Das Label referenziert diese ID, das `<input>` erhält dieselbe ID.

  ```tsx
  const generatedId = useId();
  const inputId = rest.id ?? `input-${generatedId.replace(/:/g, '')}`;
  <label htmlFor={inputId}>{label}</label>
  <input id={inputId} {...rest} />
  ```

- [ ] **Schritt 3: Führendes Such-Icon ohne Layout-Bruch rendern**

  Bei `leadingIcon` das Feld in einen `position: relative`-Container legen, Icon nicht fokussierbar machen und links genügend Innenabstand setzen. Ohne Icon bleibt das bisherige Layout unverändert.

  ```tsx
  {leadingIcon && <span aria-hidden="true">{leadingIcon}</span>}
  <input style={{ paddingLeft: leadingIcon ? '42px' : pad }} />
  ```

- [ ] **Schritt 4: TypeScript prüfen**

  Run: `npx tsc --noEmit`

  Erwartet: Exit-Code 0.

## Task 2: Neue `Checkbox`-Primitive erstellen

**Files:**
- Create: `src/components/ui/Checkbox.tsx`
- Test: `scripts/captureAuftrag026GateScreenshots.mjs`

**Consumes:** Design Tokens, `useId`, `Check` aus `lucide-react`.

**Produces:**

```ts
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
}
```

- [ ] **Schritt 1: Semantische Checkbox implementieren**

  Ein echtes `<input type="checkbox">` bleibt für Screenreader und Tastatur vorhanden, ist aber optisch unsichtbar. Der sichtbare Kontrollkasten zeigt im aktivierten Zustand Cyan-Fläche, Häkchen und sichtbaren Fokus-Ring. Label aktiviert die Checkbox per Klick und Leertaste.

  ```tsx
  <label htmlFor={checkboxId}>
    <input id={checkboxId} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span aria-hidden="true"><Check size={14} /></span>
    <span>{label}</span>
  </label>
  ```

- [ ] **Schritt 2: Zustände vollständig gestalten**

  `checked`, `unchecked`, `focus-visible` und `disabled` müssen durch Border, Fläche, Häkchen und Textkontrast eindeutig sein. Kein Zustand darf nur durch Farbe erkennbar sein.

- [ ] **Schritt 3: Sichtbare native Checkboxen ausschließen**

  Run:

  ```bash
  rg -n 'type="checkbox"' src --glob '*.tsx'
  ```

  Erwartet: Treffer ausschließlich in `src/components/ui/Checkbox.tsx`; keine Treffer in `src/features/**`.

## Task 3: CRM-Suchfelder migrieren

**Files:**
- Modify: `src/features/crm/components/CompaniesView.tsx`
- Modify: `src/features/crm/components/DealsView.tsx`
- Modify: `src/features/crm/components/ActivitiesView.tsx`
- Test: `scripts/captureAuftrag026GateScreenshots.mjs`

**Consumes:** `Input`, `Search` aus `lucide-react`, die vorhandenen Setter `setSearchTerm` und Filter-Memos.

**Produces:** Drei visuell identische LeadPilot-Suchfelder mit zugänglichen Namen und unveränderter Suchlogik.

- [ ] **Schritt 1: Jede lokale `<input type="text">`-Implementierung durch `Input` ersetzen**

  Für jede View dieselben Werte und Setter nutzen:

  ```tsx
  <Input
    type="search"
    aria-label="Unternehmen suchen"
    placeholder="🔍 Unternehmen, Domain oder Stadt suchen..."
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    leadingIcon={<Search size={16} />}
    sizeVariant="sm"
  />
  ```

  `aria-label` lautet je View genau `Unternehmen suchen`, `Deals suchen` oder `Aktivitäten suchen`.

- [ ] **Schritt 2: Filterleiste erhalten**

  Die in Auftrag 025 eingeführte Flex-Wrap-Struktur, Breiten und `Select`-Komponente bleiben bestehen. Nur die direkte Suchfeld-Implementierung wird ersetzt.

- [ ] **Schritt 3: Filterwirkung prüfen**

  Der G10-Harness setzt je View einen existierenden Suchbegriff und prüft, dass mindestens ein Eintrag sichtbar bleibt und die Anzahl gegenüber dem leeren Suchzustand kleiner ist. Danach setzt er den Begriff zurück und prüft die ursprüngliche Anzahl.

## Task 4: Sichtbare Checkboxen in Entscheidungsflows migrieren

**Files:**
- Modify: `src/features/simulation/components/ScenarioManagerModal.tsx`
- Modify: `src/features/simulation/components/MultiScenarioComparisonModal.tsx`
- Test: `scripts/captureAuftrag026GateScreenshots.mjs`

**Consumes:** `Checkbox`, vorhandene Zustände `showOnlyChangedParams`, `selectedVersionIds` und die Funktionen `setShowOnlyChangedParams`, `handleToggleVersion`.

**Produces:** Zwei visuell einheitliche, per Tastatur bedienbare Auswahlflächen ohne Änderung an Auswahlgrenzen oder Vergleichslogik.

- [ ] **Schritt 1: Parameter-Diff-Toggle ersetzen**

  ```tsx
  <Checkbox
    label={`Nur geänderte Parameter (${changedParamCount}) anzeigen`}
    checked={showOnlyChangedParams}
    onChange={setShowOnlyChangedParams}
  />
  ```

  Der Inhalt der Tabelle bleibt an `showOnlyChangedParams` gebunden; es werden keine Parameter, Deltas oder Filterregeln verändert.

- [ ] **Schritt 2: Szenariokarten ohne Doppel-Toggle umbauen**

  Die Karten dürfen nicht gleichzeitig einen Container-`onClick` und eine verschachtelte interaktive Checkbox besitzen. Verwende die Checkbox als alleinigen Auslöser:

  ```tsx
  <Checkbox
    label={`${item.scenarioName} (v${item.version.versionNumber})`}
    checked={isSelected}
    onChange={() => handleToggleVersion(item.version.id)}
  />
  ```

  Referenz-Badge, Auswahlgrenze von 2–4 Szenarien und `handleToggleVersion` bleiben unverändert.

- [ ] **Schritt 3: Tastenprüfung**

  Der Harness fokussiert jede Checkbox, toggelt mit Leertaste und prüft `checked`-Zustand sowie sichtbaren Fokus. Für die Szenarioauswahl darf kein einziger Tastendruck zwei Umschaltungen auslösen.

## Task 5: G10-Nachweis und Abschluss

**Files:**
- Create: `scripts/captureAuftrag026GateScreenshots.mjs`
- Create: `docs/screenshots/auftrag-026/README.md`
- Modify: `docs/BUILD_LOG.md`

**Consumes:** Baseline `45b9f7e`, das CDP-Pattern aus Auftrag 025 und die umgesetzten Controls.

**Produces:** Eine reproduzierbare 30-Artefakte-Matrix und ein vollständiger Gate-G10-Bericht.

- [ ] **Schritt 1: Isolierten Capture-Harness erstellen**

  Das Skript akzeptiert ausschließlich `--stage=vorher` oder `--stage=nachher`, nutzt einen eigenen CDP-Port und einen eigenen temporären Browser-Profilordner. Vor jedem Viewport `localStorage.clear()` und `sessionStorage.clear()` ausführen. Jede Assertion und jeder horizontale Overflow beendet den Prozess mit Exit-Code 1.

- [ ] **Schritt 2: Fünf Flows erfassen**

  Bei 1440 × 900, 768 × 1024 und 375 × 812 px je einmal im Baseline-Worktree und im Implementierungs-Commit erfassen:

  1. Unternehmen: fokussierte Suche, Suchbegriff und Trefferreduktion.
  2. Deals: fokussierte Suche, Suchbegriff und Trefferreduktion.
  3. Aktivitäten: fokussierte Suche, Suchbegriff und Trefferreduktion.
  4. Szenario-Manager: „Nur geänderte Parameter“ ungecheckt, gecheckt und per Leertaste zurückgesetzt.
  5. Multi-Szenario-Vergleich: Szenarioauswahl mit einer einzelnen Umschaltung und unveränderter Grenze 2–4.

  Dateinamen:

  ```text
  companies-search-<viewport>-<stage>.png
  deals-search-<viewport>-<stage>.png
  activities-search-<viewport>-<stage>.png
  scenario-diff-checkbox-<viewport>-<stage>.png
  comparison-checkbox-<viewport>-<stage>.png
  ```

- [ ] **Schritt 3: Matrix hart validieren**

  Genau 30 PNG-Dateien, 15 vollständige Paare und 15 unterschiedliche SHA-256-Paare sind Pflicht. `README.md` dokumentiert pro Paar Commit, Größe, Hash, Assertion und Overflow-Ergebnis. Vorher und Nachher entstehen in getrennten Worktrees; identische Hashes sind ein Gate-Fehler.

- [ ] **Schritt 4: Gesamtprüfung ausführen**

  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  git diff 45b9f7e..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
  ```

  Erwartet: TypeScript, alle 25 Integrity-Suites und Build grün; letzter Befehl ohne Ausgabe.

- [ ] **Schritt 5: Dokumentieren und committen**

  `docs/BUILD_LOG.md` enthält geänderte Dateien, Funktionsnachweise, 30-Artefakte-Matrix, Hashes, Schutzbereichs-Diff und ausdrücklich unveränderte `NumberStepper`-/Internal-Resources-Bereiche.

  ```bash
  git add src/components/ui src/features/crm/components src/features/simulation/components scripts/captureAuftrag026GateScreenshots.mjs docs
  git commit -m "feat(ui): unify inputs and checkboxes for Gate G10"
  ```

## Gate G10: Abnahmekriterien

- [ ] CRM-Suche verwendet ausschließlich `Input`; Suchwerte und Trefferlogik bleiben unverändert.
- [ ] Jede neue Suche und Checkbox hat einen zugänglichen Namen, sichtbaren Fokus und vollständige Tastaturbedienung.
- [ ] Es gibt keine sichtbaren, browsernativen Checkboxen in `src/features/**`.
- [ ] Szenarioauswahl toggelt pro Aktion genau einmal; die 2–4-Grenze bleibt erhalten.
- [ ] Kein Body-, Dialog- oder Listbox-Overflow bei allen drei Viewports.
- [ ] Exakt 30 G10-Screenshots, 15 byte-verschiedene Paare und vollständige Dokumentation liegen vor.
- [ ] `npx tsc --noEmit`, `npm run verify`, `npm run build` sind erfolgreich.
- [ ] `git diff 45b9f7e..HEAD -- src/simulation src/types src/context src/services/data src/features/resources` liefert keine Datei.
- [ ] Internal Resources, NumberStepper, Charts, Simulation und Datenmodelle bleiben unverändert.
