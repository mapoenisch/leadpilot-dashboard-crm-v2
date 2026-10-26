# Auftrag 119 – Paket I Teil 1: Vorher/Nachher-Vergleich für Marc

**Plan:** Abschnitt 15 (Arbeitspaket I), Punkte „Vorher/Nachher vergleichen“ und „Vorher-Nachher-Vergleich für Marc (Vorgabe Marc, 07.10.2026)“. Baseline-Commit der Ausgangslage: `7fd6e33` (Auftrag 081). Ausgangspunkt dieses Auftrags: `main` nach PR #110 (`b27ed36`).

## Ziel-Dateien
| Datei | Änderung |
|---|---|
| `scripts/buildVergleichsseite.mjs` (neu) | liest Baseline-JSON und Nachher-JSON, schreibt eine lokale HTML-Vergleichsseite (Bild neben Bild, Messwerte je Ansicht) |
| `docs/reviews/2026-10-06-frontend-inventar-nachher.json` | Messwerte der Nachher-Aufnahme (vom bestehenden Harness erzeugt) |
| `docs/screenshots/auftrag-081-nachher/README.md` | textuelle Matrix (vom bestehenden Harness erzeugt); Bilder bleiben lokal |
| `docs/reviews/2026-10-06-frontend-befundregister.md` | Abschnitt „Vorher/Nachher“ mit Ergebnis |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md` | Protokoll, Stand |

## Globale Grenzen
- Schutzbereiche unverändert (Diff gegen `b27ed36` leer).
- Harness `scripts/captureAuftrag081Inventory.mjs`: nur eine Anpassung – die Prüfung „Entwicklercode sichtbar“ ignoriert eingeklappte „Technische Details“ (seit Auftrag 118 bewusst dort); Aufnahmen und Messungen unverändert.
- Bilddateien werden nicht committed (`.gitignore`); die Vergleichsseite liegt lokal und wird Marc als Datei übergeben.
- Neue Referenzbilder (E2E-Baselines) erst nach Marcs Gestaltungsabnahme.

## Voraussetzungen
Docker/lokales Supabase läuft, Produktions-Build wird auf Port 4181 ausgeliefert, Testbenutzer `admin-a@e2e.local`.

## Tasks
- [ ] Build vom Zielcommit erzeugen und ausliefern
- [ ] Nachher-Lauf: `MODE=nachher TARGET_COMMIT=<git-rev> … node scripts/captureAuftrag081Inventory.mjs` (256 Aufnahmen, 0 Fehler)
- [ ] Vergleichsseite bauen: dieselben Ansichten, Breiten und Themes, Messwerte nebeneinander (erster Kennzahlwert, Inhaltshöhe, Überlauf, axe-Befunde)
- [ ] Befund bewerten: Datenverlust ausschließen, Abweichungen im Register eintragen
- [ ] Verifikation (tsc, verify, build), leerer Schutzbereichs-Diff, BUILD_LOG
