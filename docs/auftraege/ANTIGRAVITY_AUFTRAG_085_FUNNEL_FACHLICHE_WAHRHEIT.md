# ANTIGRAVITY_AUFTRAG_085 — Paket B: Funnel und gemeinsame fachliche Wahrheit (F08)

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 7 (Arbeitspaket B).
> Befund F08 in `docs/reviews/2026-10-06-frontend-befundregister.md`.
> Gestartet von Marc Poenisch im Chat am 09.10.2026 nach Merge von PR #69 (Auftrag 084).

## Ziel

Die Funnel-Werte sind fachlich geklärt und kommen für Trichter, Tabelle und Textfassung aus derselben
belegten Quelle. Für die übrigen 31 Bildseiten ist der Zahlenabgleich Bild ↔ Textfassung dokumentiert,
jede Abweichung hat Entscheidung, Quelle und Migrationswelle. Kein Bild gilt als Datenquelle.

## Baseline

- Branch `claude/auftrag-085-funnel-wahrheit` von `main` `b65a5f8` (Merge PR #69).
- Schutzbereichs-Baseline: `b65a5f8`.

## Befund und Klärung

Quelle: `docs/LeadPilot_Faktenblatt_v1.1.md`, Abschnitt 8 („Verbindliche Stammdaten“). Quartalssummen
und Monatsschnitte stimmen in Faktenblatt, Domäne und Bild überein. Abweichungen nur bei den Quoten:

| Quote                | Rechnung              | Faktenblatt | Domäne vorher | Bild              |
| -------------------- | --------------------- | ----------- | ------------- | ----------------- |
| MQL / Leads          | 516 / 1.776 = 29,05 % | 29 %        | 29 %          | 29,1 % / 29 %     |
| SQL / MQL            | 192 / 516 = 37,21 %   | **38 %**    | 38 %          | 37,2 % / 37 %     |
| Angebote / SQL       | 108 / 192 = 56,25 %   | 56 %        | 56 %          | **65,3 % / 65 %** |
| Neukunden / Angebote | 47 / 108 = 43,52 %    | 43 %        | 43 %          | 43,5 % / 43 %     |

Entscheidungen Marc Poenisch vom 09.10.2026 (im Chat vorgelegt):

1. **SQL-Quote:** Zähler und Nenner aus dem Faktenblatt gelten, die Quote wird berechnet (37,2 %). Der
   Faktenblatt-Text „38 %“ ist rechnerisch nicht haltbar.
2. **Rundung:** Alle Quoten einheitlich mit einer Nachkommastelle (29,1 % · 37,2 % · 56,3 % · 43,5 %).
3. **Angebote:** 65,3 % im Bild ist ein Zahlendreher; es gilt Zähler Angebote, Nenner SQL (108 / 192).

Nebenbefund: Der Trichter zeigte bei jeder Stufe die Einheit „Leads“ („108 Leads“ bei Angeboten,
„47 Leads“ bei Neukunden). Jede Stufe trägt jetzt ihre eigene Einheit.

Bewusst nicht geändert: Trial-to-Paid „18 %“ im Funnel-Hinweis. Der Wert steht so im Faktenblatt (§4, §8)
und auf acht weiteren Seiten; rechnerisch 47 / 264 = 17,8 %. Seitenübergreifende Einordnung im Register (Z9).

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert. Keine neue Abhängigkeit.
- Sichtbar bleibt das Original-Bild (`PAGE_PRESENTATION = 'bild'`); die sichtbare Funnel-Seite kommt mit
  Welle G1. Geändert werden Domänendaten und damit die Textschicht für Screenreader.
- `src/components/imagePage/ImagePage.tsx` nur gelesen. Originalbilder bleiben Referenzmaterial.
- Die übrigen 31 Seiten werden in B nur abgeglichen und dokumentiert, nicht geändert (Korrektur in ihrer
  G2-Welle).

## Ziel-Dateien

| Datei                                                                                     | Änderung                                                                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/domain/funnelQuote.ts` (neu)                                                         | `berechneQuote`/`formatQuote`: Zähler/Nenner, eine Nachkommastelle, ohne gültigen Nenner „Nicht berechenbar“ |
| `src/domain/vertriebData.ts`                                                              | `FUNNEL_QUARTALE` als einzige Quelle; Jahreswert, Monatsschnitt, Conversion berechnet                        |
| `src/features/vertrieb/pages/FunnelPage.tsx`                                              | Einheit je Trichterstufe                                                                                     |
| `src/domain/__tests__/funnelQuote.vitest.ts` (neu)                                        | Regressionen Quote, Summen, Diagramm = Tabelle                                                               |
| `src/features/vertrieb/pages/__tests__/FunnelPage.branch3.ui.vitest.tsx`                  | Seite zeigt geklärte Werte, nirgends 65 %/38 %                                                               |
| `scripts/captureAuftrag085FunnelText.mjs` (neu), `docs/screenshots/auftrag-085/README.md` | Vorher/Nachher-Nachweis                                                                                      |
| `docs/reviews/2026-10-06-frontend-befundregister.md`                                      | F08, Spalte „Zahlenabgleich“, Abschnitt 8 (Z1–Z12)                                                           |
| Plan, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`, diese Datei                                   | Dokumentation                                                                                                |

## Tasks

- [x] Bild, Textfassung und Domänendaten des Funnels vergleichen (Stufen, Quartale, Jahreswerte, Quoten, Hinweis).
- [x] Definition festhalten und Marc die fachlichen Fragen vorlegen; Entscheidung siehe oben.
- [x] Quoten aus Zähler/Nenner berechnen, eine Nachkommastelle; Trichter, Tabelle, Zusammenfassung aus `FUNNEL_QUARTALE`.
- [x] Regressionen: kein Nenner → „Nicht berechenbar“; Nenner 0/NaN/∞ → keine ∞/NaN-Anzeige; 108/192 → 56,3 %; Quartalssummen = Jahreswert; Diagrammreihen = Tabellenzeilen. Gegenprobe gegen den alten Stand: 4 Tests rot.
- [x] Übrige 31 Bildseiten abgleichen (Texterkennung + Einzelsichtung je Bild), Ergebnis je Seite im Inventar, Einzelbefunde Z1–Z12 mit Entscheidung, Quelle, Welle.
- [x] Nachweis Funnel 1440/768/375 × dunkel/hell: sichtbar unverändert, Textschicht mit allen Sollwerten, 0 px Überlauf, axe 0.
- [x] Pflichtgates, Schutzbereichs-Diff, BUILD_LOG.

## Offene Fragen an Marc (nicht Funnel, vor der jeweiligen G2-Welle)

- **Z8 Marketingplanung H2 2026:** Initiativen summieren 30.000 €, Monatsbudget Aug 26–Jan 27 summiert 19.375 €. Welcher Betrag gilt?
- **Z9 Trial-to-Paid 24 %:** Die Planung nennt 24 % als Ziel Jan 2027; das Faktenblatt kennt 25 % (Ziel 2025) und ≥ 26 % (Ziel 2026). Gilt 24 % oder ≥ 26 %?
