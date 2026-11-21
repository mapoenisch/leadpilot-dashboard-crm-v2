# Auftrag 171 – Dashboard-Editor: TV/Kiosk-Modus, Rotation, Sitzungs-/Token-Erneuerung, Offline-Erkennung (P15a)

**Ziel:** Ein Dashboard lässt sich auf einem Bildschirm im Büro dauerhaft anzeigen: Vollbild ohne Menüs, gut lesbar aus Entfernung, optional wechselnd zwischen ausgewählten Dashboards. Der Bildschirm bleibt über viele Stunden angemeldet, solange die Sitzung erneuert werden kann. Läuft sie ab oder fällt das Netz aus, sieht man das sofort, und es werden keine Daten mehr abgerufen oder vertrauliche Inhalte weiter gezeigt.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P15 (§6), §4.A (TV/Kiosk), §4.E (Kiosk erteilt keinen öffentlichen Zugriff), §7 (Abnahme „Kiosk läuft über Token-Erneuerung …“), Gegenprüfung O4.
**Vorgelagert:** 170 (P14b) ist gemergt. Fachlich nur von P05–P13 abhängig; Marc kann 171 auch vor 169/170 freigeben (dann Baseline anpassen).
**Baseline:** aktueller `main` beim Start (Commit im BUILD_LOG).
**Branch:** `auftrag-171-kiosk-rotation`.
**Builder:** Claude Code (Auftrag „bau #212“ von Marc, 21.11.2026; ursprünglich Antigravity vorgesehen). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge und Deploy:** Marc.
**Status:** FERTIGGESTELLT / PR ERSTELLT (21.11.2026, Baseline `7c69aa8e`), wartet auf unabhängiges Review.

---

## 0. Aufteilung von P15

| Teil | Auftrag | Inhalt                                                                                             |
| ---- | ------- | -------------------------------------------------------------------------------------------------- |
| P15a | **171** | Kiosk-Ansicht, Rotation, Sitzungs-/Token-Erneuerung, sichtbarer Ablauf, Offline, Datenaktualität   |
| P15b | 172     | Mobile Bedienung, Barrierefreiheits-Abnahme, Theme, Reportexport/Druck mit Schwellenwerten/Alarmen |

## 1. Ist-Stand (in T0 zu bestätigen)

| Baustein    | Ist (Stand `c138ce2e`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kiosk       | Kein Kiosk-/Vollbildmodus im Dashboard (`grep -ri kiosk src` nur in `features/resources`, eingefroren). **T0 bestätigt (21.11.2026, `7c69aa8e`).**                                                                                                                                                                                                                                                                                                                                                                            |
| Sitzung     | Supabase-Auth über `src/auth/supabaseAuthAdapter.ts` und `AuthContext.tsx` (`onAuthStateChange`). **T0:** supabase-js erneuert selbst (autoRefreshToken, Prüfung alle 30 s und beim Sichtbarwerden). Bei ungültigem Refresh-Token entfernt es die Sitzung und meldet `SIGNED_OUT` → `AuthContext` setzt `user = null`, `resetUserQueries()`, `ProtectedRoute` leitet still auf `/login` um. Ein Kiosk würde also ohne Hinweis verschwinden; deshalb liegt die Kiosk-Route außerhalb von `ProtectedRoute` mit eigenem Wächter. |
| Leseansicht | Dashboards lassen sich lesend anzeigen (Viewer, Team-Leseansicht seit 163).                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Live-Status | Getrennte Anzeige „verbunden / neue Daten / fachlich aktuell“ (P09/P10).                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Druck       | `components/export/*` (Report-Modal, Druckansicht).                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## 2. Soll

### 2.1 Fachregeln

1. **Kiosk ist eine Ansicht, kein Zugang.** Aufruf über `/dashboard/kiosk?ids=<id1>,<id2>&intervall=60`. Es gilt die normale Anmeldung und RLS; wer das Dashboard nicht lesen darf, sieht es auch im Kiosk nicht. Kein Link-Token, kein öffentlicher Zugriff (Masterplan §4.E).
2. **Darstellung:** Vollbild (Fullscreen-API, mit Rückfall auf „Ansicht ohne Menüs“), Kopf- und Seitenleisten ausgeblendet, Bearbeiten deaktiviert, größere Mindestschrift (Token-Skala „kiosk“, keine neuen Farbwerte), vorhandenes helles/dunkles Theme wählbar. Eine schmale Statusleiste zeigt Dashboard-Name, Datenstand und Verbindungszustand.
3. **Rotation:** nur Dashboards, die der Nutzer lesen darf; Intervall 30–600 Sekunden (Standard 60). Pause/Weiter per Taste `Leertaste`, Schaltfläche und automatisch bei Fokus/Interaktion; Rotation pausiert, wenn ein Dashboard noch lädt. `prefers-reduced-motion` → Wechsel ohne Animation.
4. **Sitzungserneuerung:** Das Token wird rechtzeitig erneuert (Supabase-Refresh). Schlägt die Erneuerung fehl oder ist die Sitzung abgelaufen: **sofort** keine neuen Datenabrufe und keine Realtime-Abos mehr, Kacheln werden ausgeblendet (vertrauliche Daten verschwinden), Vollbildhinweis „Sitzung abgelaufen – bitte neu anmelden“ mit Uhrzeit des letzten gültigen Datenstands. Kein automatisches Speichern von Zugangsdaten.
5. **Offline:** Bei Netzverlust bleibt der letzte Stand sichtbar mit deutlichem Hinweis „Offline seit HH:MM – Daten werden nicht aktualisiert“; Werte werden als `veraltet` gekennzeichnet (vorhandene Zustandslogik), Schwellenwert-Badges zeigen `nicht_bewertet` (Regel aus 166). Nach Wiederverbindung konsistenter Neuladestand, kein Doppelabo.
6. **Lange Laufzeit:** 12 Stunden ohne wachsenden Speicher und ohne verwaiste Abos (gemessen, §2.3 Nr. 11).
7. **Alarme** (aus 168): Kiosk zeigt die Alarmglocke mit Zähler, aber keinen Quittier-Dialog.

### 2.2 Umsetzung

8. Neu `pages/DashboardKioskPage.tsx` (lazy) und `components/kiosk/*` (Statusleiste, Rotationssteuerung, Ablaufhinweis); Route in `src/app/routes.tsx`.
9. Neu `hooks/useSessionGuard.ts`: beobachtet Auth-Zustand und Token-Ablauf, liefert `aktiv | erneuert | abgelaufen`; bei `abgelaufen` werden Query-Cache der Dashboard-Abfragen geleert und Abos beendet (vorhandene Abmeldelogik wiederverwenden). Änderungen an `src/auth/**` nur, wenn ein Ereignis fehlt – dann im PR begründen.
10. Eintrag „Im Kiosk anzeigen“ im Dashboard-Menü (Viewer eingeschlossen) mit Auswahl der Rotations-Dashboards.

### 2.3 Tests und Nachweise

11. Vitest: Rotation (Fake-Timer, Pause bei Interaktion/Laden), Sitzungswächter (Erneuerung ok, fehlgeschlagen, abgelaufen → keine weiteren Abrufe, Cache geleert), Offline-Hinweis, nur lesbare Dashboards in der Rotation. Leistungs-/Dauertest: simulierte 12 h mit Fake-Timern und Realtime-Mock → Anzahl Abos konstant, keine wachsenden Listener.
12. E2E `e2e/dashboard-kiosk.spec.ts`: Kiosk öffnen, Rotation, Pause per Tastatur, simulierter Token-Ablauf (Session im Storage invalidieren) → Hinweis, keine Netzwerkanfragen danach (`page.on('request')`), Offline über `context.setOffline(true)`.
13. Bundle: Kiosk komplett nachgeladen; Initial-JS +0 kB (Toleranz 0,1 kB).
14. Screenshots `docs/screenshots/auftrag-171/README.md`: Kiosk hell/dunkel bei 1920/1440/768, Ablaufhinweis, Offline-Hinweis; 0 px Überlauf.
15. A11y: Statusänderungen per `aria-live`, Steuerung per Tastatur, Kontrast ≥ 4,5:1.

### 2.4 Dokumentation

16. Neu `docs/dashboard/KIOSK_P15.md` (Einrichtung für Marc: Bildschirm, Browser, Anmeldung, Intervall; Verhalten bei Ablauf/Offline); Masterplan §6 Nachtrag; `ARCHITECTURE_DECISIONS.md` Teil C; `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; kein Server-Code; keine öffentlichen Links oder Tokens; keine neuen Abhängigkeiten; `max-lines` 400; V1 unverändert; Tests zuerst mit Rot-Läufen (Sitzungsablauf stoppt Abrufe; Rotation pausiert bei Interaktion; Offline-Hinweis; fremdes Dashboard in `ids` wird übersprungen mit Hinweis).

## 4. Ziel-Dateien

| Pfad                                                                                                                                       | Änderung       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_171_KIOSK_ROTATION_SITZUNG.md`                                                                         | Dieser Auftrag |
| neu `pages/DashboardKioskPage.tsx`, `components/kiosk/*`, `hooks/useSessionGuard.ts`, `src/app/routes.tsx`, Dashboard-Menü (Fundstelle T0) | Umsetzung      |
| Tests, `e2e/dashboard-kiosk.spec.ts`, CI-Liste, Screenshot-Harness, Doku aus 2.4                                                           | Nachweise      |

## 5. Tasks

- [x] **T0** Baseline, Ist-Tabelle, Auth-Ablaufverhalten dokumentieren, `size-limit`.
- [x] **T1** Rot-Nachweise.
- [x] **T2** Sitzungswächter.
- [x] **T3** Kiosk-Seite, Statusleiste, Rotation.
- [x] **T4** Offline und Datenaktualität.
- [x] **T5** Dauer-/Leistungstest, E2E, Bundle, A11y, Screenshots.
- [x] **T6** Doku, Pflicht-Verifikation, BUILD_LOG (Smoke für Marc: zwei Dashboards im Kiosk rotieren lassen, WLAN aus/an), PR, Review.

## 6. Abnahme

- Kiosk zeigt nur, was der angemeldete Nutzer lesen darf; kein öffentlicher Zugang.
- Langzeitbetrieb mit Token-Erneuerung belegt; bei Ablauf sichtbarer Hinweis, keine weiteren Abrufe, vertrauliche Daten ausgeblendet.
- Offline sofort erkennbar; Schwellenwerte bei veralteten Daten nicht bewertet.
- Rotation pausierbar per Tastatur und Schaltfläche.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
npx playwright test e2e/dashboard-kiosk.spec.ts e2e/personal-dashboard*.spec.ts e2e/team-dashboards*.spec.ts e2e/a11y.spec.ts e2e/visual.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> --stat -- supabase   # leer
```

## 8. Offene Punkte

- Ein eigenes „Kiosk-Konto“ mit Nur-Lese-Rolle wäre bequemer, ist aber eine Rechte-/Kontofrage für Marc (nicht Teil dieses Auftrags; vorhandene Viewer-Rolle genügt).
