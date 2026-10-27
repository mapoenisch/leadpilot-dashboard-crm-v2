# Paket I – Abnahmematrix (Stand 27.10.2026, nach Auftrag 120)

Quelle der Checkliste: `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md`, Abschnitt 15.
Status: **Entwurf, nichts davon ist eine Freigabe.** Freigabe kommt von Codex (Head), Marc (Gestaltung, Merge, Release).
Nachweis „CI" meint den CI-Lauf auf `main` zu `639ebb9` (Merge PR #112); Ergebnis dort eintragen, sobald abgeschlossen.

| # | Punkt der Checkliste | Nachweis | Status |
|---|---|---|---|
| 1a | Zwei Sitzungen, Konflikt ohne stilles Überschreiben | `personal-dashboard-acceptance.spec.ts` T1 | belegt (CI) |
| 1b | Zwei Benutzer, kein Durchsickern von Kacheln/Filtern | `personal-dashboard-acceptance.spec.ts` T2 | belegt (CI) |
| 1c | Realtime, ein Channel | `personal-dashboard-acceptance.spec.ts` T3 | belegt (CI) |
| 1d | Lazy Loading | `personal-dashboard-acceptance.spec.ts` T4 | belegt (CI) |
| 1e | Filterrückkehr (Pipeline) | `personal-dashboard.spec.ts`, CRM-Filter hin und zurück | belegt (CI) |
| 1f | Neue/alte Präferenzen, leere Ansicht, ungültige oder neuere Konfiguration | kein eindeutiger E2E-Nachweis gefunden | **offen, prüfen** |
| 2a | CRM: Erfolg, 0 Ergebnisse, Fehler, „Erneut versuchen" | `crm-query-export.spec.ts` (Auftrag 084, F12) | belegt (CI) |
| 2b | CRM: Navigation in jedem Zustand | `crm-query-export.spec.ts` Navigation je Modus | belegt (CI) |
| 2c | CRM: fehlende Exportrechte | `crm-query-export.spec.ts` Test 8 (Viewer serverseitig abgewiesen) | belegt (CI) |
| 2d | CRM: langsame Antwort | kein Nachweis gefunden | **offen, prüfen** |
| 3 | Alle Fachseiten gegen Inventar, sichtbare und vorgelesene Daten | Inventar 32/32 (Befundregister 4a), Zahlenabgleich Auftrag 085, Nachher-Lauf 256/256 (Auftrag 119) | teilweise: „vorgelesene" Daten (Screenreader) nicht separat belegt |
| 4 | Fünf praktische Aufgaben durch Marc | siehe Protokollbogen unten | **liegt bei Marc** |
| 5 | Vorher/Nachher-Messwerte | Befundregister „Vorher/Nachher (Auftrag 119)": axe 128 → 0, Dashboard 3423 → 2856 px | belegt |
| 6 | Vergleichsseite Bild neben Bild | `node scripts/buildVergleichsseite.mjs` (lokal, nicht committet) | belegt, Sichtung durch Marc offen |
| 7 | Codex prüft finalen Head, Marc nimmt Gestaltung ab | – | **offen** |
| 8 | Release v2.5.0 | – | **liegt bei Marc**, erst nach 1f, 2d, 4, 7 |
| 9 | Rückweg je Darstellungsgruppe | `dashboard-rollback.spec.ts` (Dashboard); `PAGE_PRESENTATION` (Bildseiten, Auftrag 104) | teilweise: übrige Gruppen aus Paket C–H nicht einzeln belegt |

## Bekannte Restpunkte aus dem Nachher-Lauf

- `s-live-simulation` läuft bei 375 px um 184 px über. Das bestand schon in der Baseline, ist also keine Verschlechterung, aber auch nicht behoben. Entscheidung nötig: beheben oder als begründete Ausnahme führen (Abnahmebedingung F01–F15).

## Protokollbogen für Marcs fünf Aufgaben

Je Aufgabe notieren: Klickweg (Anzahl Klicks), Missverständnis ja/nein, Zoomen nötig ja/nein, Dauer ungefähr.

1. Die wichtigste Zahl finden.
2. Eine Kennzahl verstehen (Definition öffnen).
3. Die Pipeline filtern.
4. Eine Kachel ändern und speichern.
5. Mobil (375 px) den Funnel lesen und abmelden.

Hinweis: Das ist ein kleiner Nutzertest, keine repräsentative Studie.
