# Dashboard-Editor: Sektionen und einklappbare Gruppen (P09a)

**Status:** Abgenommen & Verifiziert (Auftrag 157, 14. November 2026)  
**Bezug:** [DASHBOARD_EDITOR_MASTERPLAN.md](./DASHBOARD_EDITOR_MASTERPLAN.md) §4.A / §5.1, [GRID_VERGLEICH_ZIELMODELL_146.md](./GRID_VERGLEICH_ZIELMODELL_146.md), [RASTERENGINE_P06.md](./RASTERENGINE_P06.md), [EDITOR_KERN_P04.md](./EDITOR_KERN_P04.md)

---

## 1. Übersicht & Zielsetzung

Mit Paket P09a (Auftrag 157) unterstützt der Executive Dashboard V2-Editor das Unterteilen von Dashboards in bis zu 12 benannte Sektionen mit einklappbaren Gruppen.

Kernziele:
1. **Visuelle Strukturierung:** Dashboards mit bis zu 24 Kacheln können in logische Einheiten (z. B. „Finanzen“, „Vertrieb & Pipeline“, „Team & HR“) gruppiert werden.
2. **Entlastung bei eingeklappten Sektionen:** Eingeklappte Sektionen rendern keine Kacheln im DOM und lösen **weder `useData`-Hooks noch Netzwerk-/RPC-Abrufe** aus.
3. **Integrität je Bereich:** Jede Sektion sowie der Bereich „Ohne Sektion“ bilden ein isoliertes Koordinatenraster. Kacheln kollidieren nur innerhalb ihres eigenen Bereichs.
4. **Schutz vor Datenverlust:** Das Entfernen einer Sektion löscht keine Kacheln; die Kacheln wandern automatisch mit kollisionsfreier Platzierung in den Bereich „Ohne Sektion“.
5. **Transaktionales Undo/Redo:** Jede Sektionsaktion ist genau ein Schritt im Verlauf.

---

## 2. Datenvertrag (`DashboardSectionV2`)

Sektionen werden als optionales Array `sections?: DashboardSectionV2[]` auf oberster Ebene der `DashboardConfigV2` geführt.

```ts
export interface DashboardSectionV2 {
  id: string;          // Eindeutige Kennung, Muster: ^sec_[a-zA-Z0-9_-]{1,60}$
  title: string;       // Anzeigename, 1 bis 80 Zeichen, nicht nur Whitespace
  collapsed?: boolean; // Persistenter Einklappzustand im Bearbeitungsmodus
  tileIds: string[];   // Geordnete Kachel-IDs, max. 24 gesamt
}
```

### 2.1 Prüfregeln & Fehlerparität (Client & Server)

Client (`src/features/dashboard/model/dashboardSections.ts`) und Server-Funktion (`dashboard_config_v2_invalid_reason` in PostgreSQL) verwenden **identische Fehlermeldungen**:

| Regel | Client & Server Fehlermeldung |
|---|---|
| Max. 12 Sektionen | `sections darf maximal 12 Einträge enthalten` |
| Sektions-ID Format | `Ungültige Sektions-ID: '<id>'. Erwartet wird 'sec_[a-zA-Z0-9_-]{1,60}'.` |
| Eindeutigkeit IDs | `Doppelte Sektions-ID: '<id>'` |
| Titel-Länge & Inhalt | `Sektionstitel muss zwischen 1 und 80 Zeichen lang sein und darf nicht nur Whitespace enthalten` |
| Kachel-Existenz | `Sektion '<id>' referenziert unbekannte Kachel '<tileId>'` |
| Keine Mehrfachzuordnung | `Kachel '<tileId>' ist mehrfach zugeordnet (erstmals in Sektion '<id1>', erneut in '<id2>')` |

Fehlerparität wird durch gemeinsame JSON-Fixtures unter `supabase/tests/fixtures/dashboard_sections/` und pgTAP-Tests verifiziert.

### 2.2 Begründung: Keine neue Schema-Version

Die `schemaVersion` verbleibt unverändert auf `2`.
- `sections` ist als optionales Feld definiert (`sections?: DashboardSectionV2[]`).
- Ältere Revisionen und bestehende Dashboards ohne `sections` bleiben unverändert gültig und bytegleich serialisierbar.
- `dashboardRollout.ts` und alle Lese-/Schreib-RPCs (`save_dashboard_v2`, `restore_dashboard_revision_v2`) bleiben 100% abwärtskompatibel.

---

## 3. Raster & Integrität je Bereich

1. **Koordinaten-Isolation:** Kacheln besitzen Bereichskoordinaten `(x, y)` relativ zu ihrer Sektion.
2. **Überlappungsprüfung:** `validateDashboardLayout()` prüft Überlappungen und Bounds ausschließlich je Bereich (`unsectioned` vs. `sec_*`). Zwei Kacheln in verschiedenen Sektionen mit gleichen Koordinaten stellen keine Kollision dar.
3. **Kompaktierung:** Schwerkraft- und Kompaktierungsoperationen laufen isoliert je Bereich ab.
4. **Normalisierung:** `normalizeDashboardSections()` ist idempotent:
   - Entfernt Referenzen auf gelöschte Kacheln.
   - Sichert Reihenfolge und Whitespace-Bereinigung.
   - Liefert bei unkonfiguriertem `sections: undefined` exakt `undefined` zurück (Bytegleichheit).

---

## 4. Befehle & Undo-Vertrag

Alle Sektionsänderungen implementieren das `EditorCommand`-Interface:

| Befehl | Aktion | Undo-Verhalten |
|---|---|---|
| `AddSectionCommand` | Hängt Sektion an oder fügt an Index ein | Entfernt Sektion; stellt `sections: undefined` wieder her falls zuvor leer |
| `RenameSectionCommand` | Benennt Sektion um | Stellt vorherigen Titel wieder her |
| `MoveSectionCommand` | Verschiebt Sektion nach oben/unten | Verschiebt an Ursprungsposition zurück |
| `SetSectionCollapsedCommand` | Klappt Sektion im Entwurf ein/aus | Kehrt Einklappzustand um |
| `RemoveSectionCommand` | Entfernt Sektion, verschiebt Kacheln kollisionsfrei nach „Ohne Sektion“ | Stellt Sektion an alter Position und Kacheln an alten Koordinaten wieder her |
| `MoveTileToSectionCommand` | Verschiebt Kachel in Zielsektion oder „Ohne Sektion“ mit `computeNextAvailablePosition` | Setzt Kachel an Ursprungskoordinaten in Quellbereich zurück |

---

## 5. Einklappen: Bearbeitung vs. Vorschau

- **Bearbeitungsmodus (`isPreviewMode: false`):**
  - Einklappen dispatcht `SetSectionCollapsedCommand` und wird im Entwurf (`config.sections[i].collapsed`) persistiert.
  - Übersteht Speichern und Wiederherstellen.
- **Vorschau-Modus (`isPreviewMode: true`):**
  - Einklappen wirkt rein flüchtig über React-State (`previewCollapsedOverrides`).
  - Der gespeicherte Entwurf wird nicht verändert; beim Verlassen des Vorschau-Modus gilt wieder der persistierte Zustand.

---

## 6. Entlastungsnachweis (Performance)

Messung bei 24 Kacheln in 4 Sektionen (je 6 Kacheln), davon 2 Sektionen eingeklappt:

| Metrik | Ohne Sektionen (24 Kacheln) | Mit Sektionen (2 eingeklappt) | Einsparung |
|---|---|---|---|
| Gerenderte Kacheln | 24 | 12 | **-50 %** |
| `useData`-Aufrufe | 24 | 12 | **-50 %** |
| RPC-/Netzwerkabrufe | 24 | 12 | **-50 %** |

Eingeklappte Sektionen rendern weder `CanvasTileCard` noch `LazyDashboardTile`. `dataCallsPerTile` für Kacheln in geschlossenen Sektionen ist exakt **0**.

---

## 7. Bewusste Grenzen & Architektur-Entscheidungen

1. **Kein bereichsübergreifendes Drag & Drop:** Kacheln können innerhalb ihrer Sektion frei verschoben werden. Das Verschieben zwischen Sektionen erfolgt deterministisch und barrierefrei über das Kachel-Aktionsmenü („In Sektion verschieben…“) oder den Editor-Inspector.
2. **Keine Sektionen je Breakpoint:** Die Gliederung in Sektionen ist global. Auf Tablet und Smartphone passen sich die Spalten (6 bzw. 1 Spalte) innerhalb jeder Sektion dynamisch an.
3. **Alarmauswertung (P13):** Die Schwellenwert- und Alarmauswertung für Kacheln wird in P13 als serverseitiger Worker implementiert und läuft vollständig unabhängig vom UI-Einklappzustand.
