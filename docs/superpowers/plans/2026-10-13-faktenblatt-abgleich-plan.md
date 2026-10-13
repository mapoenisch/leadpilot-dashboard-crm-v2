# LeadPilot – Plan: Widersprüche in der Anwendung beheben (Faktenblatt-Abgleich)

> **Für ausführende Agenten:** Rollen und Schutzregeln aus `CLAUDE.md` haben Vorrang. Dieser Plan ist nur vermerkt; **nichts davon wird jetzt behoben** (Entscheidung Marc, 13.10.2026). Umsetzung erst nach Freigabe durch Marc und nach den laufenden Paketen des Frontend-Qualitätsplans.

**Status:** Vermerkt, nicht begonnen. Stand 13.10.2026.
**Grundlage:** Abgleich Faktenblatt v1.1 gegen die Anwendung (Stand Branch `claude/auftrag-091-paket-e-rest`). Ergebnis: [`docs/LeadPilot_Faktenblatt_v1.2.md`](../../LeadPilot_Faktenblatt_v1.2.md), Abschnitt 17 (Abgleichsprotokoll). Die Anwendung ist bindend (Single Source of Truth); v1.2 wurde an sie angepasst.

## 1. Offene Widersprüche innerhalb der Anwendung

| Nr. | Widerspruch | Fundstellen | Zielwert |
| :-- | :-- | :-- | :-- |
| W1 | **Trial-to-Paid-Ziel:** OKR und Plan-Charts nennen ≥ 26 %, SWOT, SWOT-Kompass, Roadmap v2.0 und Initiative „Guided Onboarding Campaign" nennen 25 %. | `src/domain/strategieData.ts`, `marktData.ts`, `produktData.ts`, `vertriebData.ts`, `src/features/markt/components/SwotCompass.tsx` | **Marc entscheidet** (Entscheidung Z9: ≥ 26 % für 2026, 24 % im Januar 2027) |
| W2 | **Marketing-Budget 2026:** Simulation 65.000 € jährlich, Kostenbudget „Marketing & Ads" 55.000 €, H2-Initiativen 30.000 €. | `src/simulation/parameterRegistry.ts` (geschützt), `src/domain/finanzenData.ts`, `vertriebData.ts` | **Marc entscheidet**; Zeiträume (Jahr/H2) klar trennen |
| W3 | **Top-10 gegen Pro-Paket:** Die drei Pro-Kunden der Top 10 ergeben 3.600 € MRR, die Paketverteilung nennt 4.695 €. Auch in v1.1 nicht schlüssig (Ø 14 Nutzer × 80 € = 1.120 € statt 1.565 € je Kunde). | `src/domain/kundenData.ts`, `execData.ts` | **Marc entscheidet**, welche Seite angepasst wird |
| W4 | **Vertretung:** Handelsregister „zwei Geschäftsführer gemeinsam", Geschäftsführervertrag „jeweils einzelvertretungsberechtigt". | `src/domain/rechtData.ts` | **Marc entscheidet** |
| W5 | **Kostenbudget 2026:** 830.000 € gegenüber 812.000 € Kosten in der Plan-GuV (zzgl. 22.000 € Abschreibungen). | `src/domain/finanzenData.ts` | Kategorien angleichen oder Abgrenzung beschriften |
| W6 | **Marktdaten:** Marktanteile mit „DACH" beschriftet, Zahlen gelten für Europa. | `src/domain/marktData.ts` | Beschriftung korrigieren (Europa) |

## 2. Vorgehen

1. Marc legt die Zielwerte für W1–W4 fest (W5 und W6 sind nach Festlegung von W2 bzw. ohne Entscheidung lösbar). Entscheidungen im Befundregister festhalten.
2. Detailauftrag `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md` schreiben (Nummer bei Vergabe aus dem Register), mit exakten Zielpfaden.
3. **Schutzbereich:** W2 berührt `src/simulation/parameterRegistry.ts`. Eine Änderung dort braucht einen ausdrücklich dafür geschriebenen Auftrag mit Diff-Nachweis (`CLAUDE.md` §6). Ohne Freigabe nur die Anzeigedaten ändern und die Abweichung dokumentieren.
4. Daten ändern, danach Faktenblatt anpassen (v1.3) und Tests für betroffene Werte aktualisieren.
5. Pflicht-Verifikation (`npx tsc --noEmit`, `npm run verify`, `npm run build`), BUILD_LOG-Eintrag, Prüfung durch Codex, Merge durch Marc.

## 3. Weitere Punkte aus dem Abgleich

- Repo-Kopie `docs/LeadPilot_Faktenblatt_v1.1.md`: „planned" statt „geplant" in der Roadmap (reiner Tippfehler; v1.2 ersetzt die Datei als Bezugsdokument).
- Quellenverweise in der App nennen noch „Faktenblatt v1.1" (`projektkontextData.ts`, `execData.ts`). Sie bei der Umsetzung auf v1.2 umstellen.
- Werte nur im Faktenblatt, ohne Gegenstück in der App (Quartals-GuV, Bilanz-Vorjahr, ACV 4.300 €, CSAT u. a.): Marc entscheidet, ob sie in die App gehören (Liste in v1.2, Abschnitt 17 C).
