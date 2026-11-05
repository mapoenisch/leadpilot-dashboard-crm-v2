# LeadPilot – Paket 2: CRM Leads Lead-Scoring & Qualifizierungs-Cockpit

> **Kontext:** Teil 2 des Master-Plans `2026-11-05-crm-analytics-master-plan.md`.  
> **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_130_CRM_LEAD_SCORING.md`  
> **Branch:** `claude/auftrag-130-crm-lead-scoring`  
> **Ziel-Route:** `/crm/leads`

---

## 1. Motivation & Ausgangslage

Bisher listet `/crm/leads` Kontakte in einer einfachen Tabelle auf, ohne dass für den Vertrieb erkennbar ist, welche Leads die höchste Abschlusswahrscheinlichkeit besitzen oder ideal zum Kundenprofil (ICP) passen.

Paket 2 führt ein transparentes, regelbasiertes Lead-Scoring und einen geführten MQL-zu-Deal-Qualifizierungsworkflow ein.

---

## 2. Fachliche & Technische Spezifikation

### 2.1 ICP-Scoring-Modell (`leadScoringService.ts`)
Das Scoring bewertet jeden Lead anhand der im Faktenblatt v1.2 und in `src/domain/kundenData.ts` festgelegten Kriterien:
1. **Region / Standort:** DACH-Raum (Deutschland, Österreich, Schweiz) = **+30 Punkte**.
2. **Unternehmensgröße (Headcount):** 20 bis 250 Mitarbeiter (Sweet-Spot für B2B SaaS) = **+30 Punkte** (andere Größen: 10–20 Punkte).
3. **Branche / Vertikale:** B2B Software, IT, Professional Services = **+20 Punkte**.
4. **Interaktionsgrad / Quelle:** Demo-Anfrage, Webinar oder Empfehlung = **+20 Punkte** (Content-Download: 10 Punkte).

**Gesamtscore (0–100 Punkte / %):**
- 🔥 **Hot Lead (≥ 80 %):** Höchste Vertriebspriorität, sofortige Kontaktaufnahme.
- 🟡 **Warm Lead (50–79 %):** Reif für Nurturing oder Bedarfsanalyse.
- ❄️ **Cold Lead (< 50 %):** Außerhalb des Kern-ICP oder unvollständige Daten.

### 2.2 Visuelle Score-Darstellung (`LeadScoreBadge.tsx`)
- Kompakte Anzeige in der Lead-Tabelle:
  - Farblicher Score-Chip (z. B. `92 %` in Grün mit Flammen-Icon für Hot Leads).
  - Tooltip mit transparenter Punkteaufschlüsselung (z. B. *„Standort DACH +30, Größe 50 MA +30, Branche B2B +20, Quelle Demo +12“*).

### 2.3 Qualifizierungs-Drawer / Detail (`LeadQualificationDrawer.tsx`)
- Klick auf einen Lead öffnet die Qualifizierungsübersicht:
  - Übersicht der Scoring-Kriterien und Fit-Faktoren.
  - Checkliste für das BANT-Modell (Budget, Authority, Need, Timeline).
  - Notizfeld für das Erstgespräch.

### 2.4 1-Klick-Aktion: „In Deal umwandeln“ (`LeadConversionModal.tsx`)
- Prominenter Button *„Zu Deal konvertieren“*:
  - Öffnet einen vorbefüllten Dialog:
    - Deal-Name: Vorgeschlagen als `[Unternehmen] – LeadPilot Enterprise`
    - Betrag: Schätzung basierend auf Mitarbeiterzahl (z. B. `48.000 €`)
    - Phase: Startet automatisch in `Erstgespräch geführt` oder `Bedarfsanalyse`
    - Verknüpfung: Behält die Referenz zum Kontakt und Unternehmen
  - Nach Bestätigung wird der Deal angelegt und der Lead als qualifiziert markiert.

### 2.5 Filterleiste erweitern
- Neuer Dropdown-Filter: `Qualität: Alle | 🔥 Hot Leads (≥ 80%) | 🟡 Warm (50–79%) | ❄️ Cold (< 50%)`.

---

## 3. Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/crm/services/leadScoringService.ts` | Neu | Regelbasierte Scoring-Engine & BANT-Logik |
| `src/features/crm/components/LeadScoreBadge.tsx` | Neu | Visuelle Score-Pille mit Tooltip-Aufschlüsselung |
| `src/features/crm/components/LeadQualificationDrawer.tsx` | Neu | Detailansicht & Qualifizierungs-Checkliste |
| `src/features/crm/components/LeadConversionModal.tsx` | Neu | Dialog zur Konvertierung eines Leads in einen Deal |
| `src/features/crm/pages/LeadsPage.tsx` | Änderung | Spaltenerweiterung für Score & Filterintegration |
| `src/features/crm/__tests__/leadScoring.unit.vitest.ts` | Neu | Mathematische & regelbasierte Scoring-Tests |
| `src/features/crm/__tests__/LeadsPage.ui.vitest.tsx` | Neu | UI-Tests für Badges, Filter und Modal |
| `scripts/captureAuftrag130Gate.mjs` | Neu | Screenshot-Gate-Harness |
| `docs/screenshots/auftrag-130/README.md` | Neu | Ergebnis-Matrix |
| `docs/BUILD_LOG.md` | Änderung | Nachweis aller Gates |

---

## 4. Definition of Done & Verifikation

- [ ] Scoring-Engine berechnet für jeden Lead den ICP-Fit-Score deterministisch.
- [ ] Lead-Tabelle zeigt transparente Score-Badges mit Tooltips.
- [ ] Filter nach Lead-Qualität funktioniert URL-synchron.
- [ ] Konvertierungsdialog erzeugt vollständigen Deal im Zustand `Erstgespräch geführt`.
- [ ] Alle Tests, `tsc`, `lint`, `verify` und `build` grün. Leerer Schutzbereichs-Diff.
