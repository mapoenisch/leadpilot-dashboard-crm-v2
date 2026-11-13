# Screenshot-Nachweis: Auftrag 154 (P08a) — Dashboard-Editor: Abfragevertrag und Inspector-Daten-Tab

Dokumentiert die visuelle Darstellung des Daten-Tabs im Inspector (`InspectorTabs.tsx`) gemäß Auftrag 154 §5 T11 und `CLAUDE.md` §9 (nur README committen, keine Bilddateien im Git-Verlauf).

---

## 1. Prüfmatrix

| Viewport | Dimensionen | Geprüfte Zustände | Visuelles Ergebnis |
|---|---|---|---|
| **Desktop** | 1440 × 900 px | 1. CRM-Kachel (`crm.pipeline_deals`) mit Pipeline-Auswahl (`Standard-Pipeline`, `Alle Pipelines`)<br>2. Stammdaten-Kachel (`baseline.arr`) mit gesperrter Pipeline und Hilfetext: *"Nur CRM-Kennzahlen unterstützen den Pipeline-Filter."*<br>3. Nicht veränderbare Aggregation mit Hinweistext: *"Aggregation ist durch die Kennzahl vorgegeben."* | Bestanden: Optionen sauber dargestellt, gesperrte Selektoren optisch deaktiviert (`disabled`), Erklärungstexte gut lesbar mit ARIA-Labels. |
| **Tablet** | 768 × 1024 px | Drawer-Ansicht des Inspectors, Touch-freundliche Steuerelemente, responsive Ausrichtung der Radio- und Select-Elemente. | Bestanden: Inspector öffnet als Drawer, kein horizontaler Überlauf, gesperrte Optionen bleiben informativ bedienbar. |
| **Mobile** | 375 × 667 px | Vollbild-Sheet des Inspectors, lesbare Hinweistexte bei gesperrten Feldern, Touch-Targets ≥ 44 px. | Bestanden: Single-Column Layout, kein Überlauf. |

---

## 2. Abgedeckte Fachfälle

1. **CRM-Kachel (`crm.pipeline_volumen`):**
   - Pipeline-Auswahl aktiv (Global erben, Alle Pipelines, Spezifische Pipeline).
   - Gruppierung deaktiviert mit Begründungstext *"Nur Stufenmetriken unterstützen Gruppierung."*.
2. **Stammdaten-Kachel (`baseline.arr`):**
   - Pipeline-Filter gesperrt (*"Nur CRM-Kennzahlen unterstützen den Pipeline-Filter."*).
   - Aggregation fest auf `letzter_stand` (*"Aggregation ist durch die Kennzahl vorgegeben."*).
3. **Stufenmetrik (`crm.pipeline_stufen_volumen`):**
   - Gruppierung nach Phase/Stufe (`stage`) aktiv und vorausgewählt.
