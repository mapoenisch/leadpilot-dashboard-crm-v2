# ANTIGRAVITY_AUFTRAG_068 — v2.3.1 Design-Wiederherstellung (Gate G66)

> **Builder:** Claude Code (Entscheidung Marc, 25.09.2026: „du musst das bauen“) · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.

## Ziel

v2.3.0 hat einen sichtbaren Rückschritt ausgeliefert, den kein Gate erkannt hat:

1. **32 Inhaltsseiten ohne Design.** G52–G55 haben die gestalteten Ganzseiten-WebPs aus
   v2.2.0 durch semantisches HTML ersetzt, aber ohne ein einziges Gestaltungselement
   (0 Klassen je Seite). Übrig blieben nackte Überschriften, Listen und Tabellen.
2. **Falsches Logo.** G56 („nur lokale Assets“) hat in Sidebar und Favicon das echte
   LeadPilot-Logo (`assets/logo/leadpilot-logo-full.png`) durch ein erfundenes SVG-Zeichen
   ersetzt. Die Login-Seite lädt das echte Logo über einen Pfad, der nur im Dev-Server
   existiert.

Ursache: Die Gates prüften Struktur (eine h1, Tabellen, auswählbarer Text, Clipping),
aber nie das Aussehen gegen die Vorlage. Screenshots wurden nur auf Überlauf geprüft.

v2.3.1 stellt das LeadPilot-Design wieder her. Die Semantik von G52–G55 bleibt erhalten:
echter Text, genau eine h1, Tabellen, Listen und Chart-Zusammenfassungen.

## Baseline

- Branch `claude/ci-quality-baselines-reduce-u1yo54` von `main` `e63eec5` (Merge PR #33).
- Schutzbereichs-Baseline: `e63eec5`.
- Design-Vorlage: die v2.2.0-WebPs unter `public/assets/auftrag-037d`–`037g`
  (32 Seiten), gleiche Farben, Panels, Pills, Charts und Tabellen.

## Nicht im Umfang

- **Executive Dashboard (`/dashboard`):** bleibt unverändert. Marc will es grundsätzlich
  neu gestalten lassen (25.09.2026, „das hat mir auch vorher nicht gefallen“). Dafür
  kommt ein eigener Auftrag nach v2.3.1 mit Marcs Vorgaben.

## Globale Grenzen

- Schutzbereiche `src/simulation/**`, `src/types/**`, `src/context/**`,
  `src/services/data/**`, `src/features/resources/**`: **keine Änderung**.
- Keine neuen Abhängigkeiten. Icons aus `lucide-react`, Farben aus den vorhandenen
  Tokens und Markenwerten (`#00D9C6`, Orange, Rot), Charts als SVG ohne Inline-Styles.
- Keine Inline-Styles (Qualitätsbudget `src/` = 0), keine neuen Suppressions.
- Inhalte und Zahlen kommen weiter aus `src/domain/*`. Keine erfundenen Werte.
- Semantik aus G52–G55 bleibt: kein Ganzseiten-WebP, genau eine h1, Text auswählbar,
  Chart-Zusammenfassungen (`data-testid="chart-summary"`) erhalten.

## Ziel-Dateien

| Datei | Art |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_068_V2_3_1_DESIGN_WIEDERHERSTELLUNG.md` | neu |
| `src/components/pageKit/**` | neu (gemeinsame Designbausteine der Inhaltsseiten) |
| `src/features/{finanzen,kunden,markt,organisation,overview,produkt,recht,strategie,unternehmen,vertrieb}/pages/*.tsx` (die 32 G52–G55-Seiten) | ändern |
| `src/components/ui/AccessibleChartSummary.tsx` | ändern (gestaltete Zusammenfassung) |
| `src/components/layout/Sidebar.tsx`, `src/features/auth/pages/LoginPage.tsx`, `index.html`, `public/assets/logo/*` | ändern (echtes Logo, build-fest) |
| Tests zu den geänderten Seiten und Bausteinen, `src/app/__tests__/g66DesignRestore.ui.vitest.tsx` | neu/ändern |
| `scripts/captureAuftrag068Screenshots.mjs`, `docs/screenshots/auftrag-068/README.md` | neu (Design-Gate) |
| `package.json`, `package-lock.json`, `src/features/auth/pages/LoginPage.tsx` | ändern (Version `2.3.1`) |
| `docs/releases/V2.3.1.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md` | neu/ändern |

## Tasks

- [x] **1. Roter Start:** Test, der für jede der 32 Seiten Gestaltung verlangt
      (Seitenkopf mit Eyebrow, mindestens ein gestaltetes Panel) und das echte Logo in
      Sidebar und Login prüft. Vor dem Umbau rot.
- [x] **2. Page-Kit:** Seitenkopf (Eyebrow, Titel, Untertitel, Pills, Rasterleuchten),
      Glow-Panel in den Tönen Cyan/Rot/Orange/Neutral mit Icon-Kachel, Aufzählungen mit
      Farbpunkten, Schlüssel-Wert-Liste, gestaltete Tabelle mit Chips und
      Hervorhebungszeilen, Balkenliste, Säulendiagramm, Donut, KPI-Kachel, Hinweisbox,
      Zitat. Alles responsiv (1440/768/375).
- [x] **3. Seiten:** alle 32 Seiten nach ihrer v2.2.0-Vorlage aufbauen.
- [x] **4. Logo:** echtes Logo in Sidebar und Login, Favicon aus dem Original. Das
      erfundene Zeichen entfällt. *Umsetzung:* statt Modul-Import des 667-KB-Originals
      (lädt auf jeder Seite) liegen verkleinerte Ableitungen in `public/assets/logo/`
      (`leadpilot-logo.png` 249×112 px, 21 KB; `leadpilot-favicon.png` 64×64 px aus dem
      Netzwerk-Symbol). `public/` wird unverändert nach `dist/` kopiert, damit build-fest;
      erzeugt per Browser-Canvas aus `assets/logo/leadpilot-logo-full.png`, ohne neue
      Abhängigkeit.
- [ ] **5. Design-Gate:** Screenshot-Harness für alle 32 Seiten plus Login und Sidebar auf
      1440/768/375: Vorher (v2.3.0) und Nachher, SHA-256 verschieden, 0 px horizontaler
      Überlauf, dazu die Vorlage aus v2.2.0 zum Sichtvergleich. Ergebnis-Matrix in
      `docs/screenshots/auftrag-068/README.md`.
- [ ] **6. Version und Doku:** `2.3.1`, Release Notes, BUILD_PLAN, BUILD_LOG.
- [ ] **7. Verifikation und PR;** Übergabe an Codex (G66-Review). Danach Freigabe und Tag
      `v2.3.1` durch Marc.

## Abnahme

- `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`: grün.
- Neuer Designtest G66 grün, alle G52–G55-Semantiktests weiter grün.
- Design-Gate: 32 Seiten plus Login und Sidebar, drei Breiten, 0 px Überlauf; der
  Sichtvergleich gegen die v2.2.0-Vorlage ist im README dokumentiert.
- CI auf dem PR grün. Schutzbereichs-Diff leer.
