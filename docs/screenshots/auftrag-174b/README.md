# Auftrag 174b – Screenshot- und Messnachweis (Kacheln ohne Scrollen)

Erzeugt mit `node scripts/captureAuftrag174bGateScreenshots.mjs vorher|nachher <dist>` (vorher: 2026-11-25T14:09:23.404Z, nachher: 2026-11-25T14:09:38.386Z) auf der Editor-Vorschau mit Testdaten (`dashboard-vorschau.html?bereich=editor_v2`, Vorlage „Executive Dashboard“, 17 Kacheln). Vorher = Build von `main` (`5e5d17ac`), nachher = Branch `auftrag-174b-kachel-lesbarkeit`.
Bilddateien und `manifest.json` liegen lokal (`.gitignore`); committet wird nur diese Matrix.

Spalten: *mit Scrollbereich* = Kachelkörper, Einpassfläche oder Region in der Kachel scrollt (overflow auto/scroll und Inhalt größer als die Fläche). *Inhalt ragt über Kachel* = sichtbares Element außerhalb der Kachelgrenze. *kleinster Faktor* = kleinster Einpassfaktor aller Kacheln (vorher ohne Einpassung = 1). *Ziehgriff* = Griff der gewählten Kachel „ARR“ gegenüber der Kategoriezeile.

## Vorher

| Breite | Modus | Kacheln | mit Scrollbereich | Inhalt ragt über Kachel | kleinster Faktor | Ziehgriff | „closeDate“-Text | „Stand Stand“ | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | bearbeiten | 17 | 16 (std_baseline_arr, std_baseline_umsatz, std_baseline_ebitda, …) | 16 (std_baseline_arr, std_baseline_umsatz, std_baseline_ebitda, …) | 1 | überdeckt Kategorie | sichtbar | 5 | 0 px | `1c0a005329e2` |
| 1440 | vorschau | 17 | 4 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen, …) | 4 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen, …) | 1 | – | sichtbar | 5 | 0 px | `bbc416281746` |
| 768 | bearbeiten | 17 | 10 (std_baseline_umsatz, std_baseline_ebitda, std_baseline_arr_verlauf, …) | 4 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen, …) | 1 | überdeckt Kategorie | sichtbar | 5 | 0 px | `01a352e0acd4` |
| 768 | vorschau | 17 | 10 (std_baseline_umsatz, std_baseline_ebitda, std_baseline_arr_verlauf, …) | 4 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen, …) | 1 | – | sichtbar | 5 | 0 px | `dd57ad0002d3` |
| 375 | bearbeiten | 17 | 0 | 3 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen) | 1 | – | sichtbar | 2 | 0 px | `294c2d747b36` |
| 375 | vorschau | 17 | 0 | 3 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen) | 1 | – | sichtbar | 2 | 0 px | `ad2c4e6eddf6` |

## Nachher

| Breite | Modus | Kacheln | mit Scrollbereich | Inhalt ragt über Kachel | kleinster Faktor | Ziehgriff | „closeDate“-Text | „Stand Stand“ | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | bearbeiten | 17 | 0 | 0 | 0.46 | frei | eingeklappt | 0 | 0 px | `94cbdf1c09f0` |
| 1440 | vorschau | 17 | 0 | 0 | 0.46 | – | eingeklappt | 0 | 0 px | `3ef478d6e7c8` |
| 768 | bearbeiten | 17 | 0 | 0 | 0.36 | frei | eingeklappt | 0 | 0 px | `3b351d612d87` |
| 768 | vorschau | 17 | 0 | 0 | 0.36 | – | eingeklappt | 0 | 0 px | `fa231bbfd820` |
| 375 | bearbeiten | 17 | 0 | 3 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen) | 1 | – | sichtbar | 0 | 0 px | `8f17e23fbec1` |
| 375 | vorschau | 17 | 0 | 3 (std_baseline_arr_verlauf, std_baseline_mrr_paketmix, std_crm_pipeline_stufen_volumen) | 1 | – | sichtbar | 0 | 0 px | `343779c44ff9` |

## Ziehen am unteren Griff (K6) und Verkleinern (K2), 1440 px

| Stand | Kachel (Startzeile) | Kachel verschoben | Abstand Vorschau ↔ Kachel | „Umsatzerlöse“ nach Verkleinern | Faktor |
| --- | --- | --- | --- | --- | --- |
| vorher | std_uebersicht_roadmap (18) | 44 px | 864 px | 121×176 | – |
| nachher | std_uebersicht_roadmap (18) | 0 px | 0 px | 190×272 | 1.000 |

SHA-256 vorher/nachher je Paar verschieden: ja.
