# Auftrag 168 – Dashboard-Editor: Alarme in der App, Lesebestätigung und Quittierung, Admin-Übernahme, Ausfallhinweis (P13c)

**Ziel:** Die Server-Alarme aus 167 werden in der App nutzbar. Manager und Admins schalten im Inspector für eine Kachel mit Schwellenwert einen Alarm ein. Alle Berechtigten sehen eine Alarmliste mit Zähler für ungelesene Meldungen, können Meldungen als gelesen markieren und Warnungen bzw. kritische Meldungen quittieren. Admins sehen Regeln, die wegen Rechteverlust pausiert sind, und übernehmen sie. Fällt die Alarmprüfung aus, sehen Admins einen deutlichen Hinweis.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P13 (§6), §4.D (Lesebestätigung/Quittierung), §4.E (Eigentum, Admin-Übernahme), §7 (Abnahme „Ersteller tritt aus …“, „Worker fällt aus …“).
**Fachgrundlage:** `docs/dashboard/ALARME_P13B.md` (aus 167), [SCHWELLENWERTE_P13A.md](../dashboard/SCHWELLENWERTE_P13A.md), Auftrag 165 §8 Nr. 5 (Hinweis in der Versionsliste).
**Vorgelagert:** 167 (P13b, PR #206) ist gemergt und die Migration `20261124_dashboard_alarms.sql` liegt vor.
**Baseline:** aktueller `main` nach Merge von 167 (der Builder nennt den Commit im BUILD_LOG).
**Branch:** `auftrag-168-alarme-oberflaeche`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge und Deploy:** Marc.
**Status:** ENTWURF (wartet auf Merge von 167; Ist-Stand in T0 gegen den tatsächlichen Stand von 167 prüfen).

---

## 1. Ist-Stand (nach 167 erwartet; in T0 zu bestätigen)

| Baustein      | Erwartet nach 167                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server        | Tabellen `dashboard_alarm_rules`, `_state`, `_events`, `alarm_worker_runs`, `alarm_settings`; RPCs `create/update/pause/resume/delete_dashboard_alarm_rule`, `list_dashboard_alarm_rules`, `list_dashboard_alarm_events`, `alarm_worker_status`. |
| Matrix        | Status `alarmfaehig` für die Kennzahlen mit bestandenem Paritätstest.                                                                                                                                                                            |
| Inspector     | Tab „Schwellenwerte“ aus 166 mit Hinweis „Benachrichtigungen bei geschlossenem Browser folgen in einer späteren Version.“ (`InspectorThresholdTab.tsx`, Grenze 200 Zeilen).                                                                      |
| Kachel        | `TileThresholdBadge` zeigt die Stufe aus dem Client-Wert; kein Hinweis, ob ein Alarm aktiv ist.                                                                                                                                                  |
| Admin-Bereich | `/admin/members` (Mitgliederverwaltung). Keine Alarmansicht.                                                                                                                                                                                     |
| Versionsliste | Kein Hinweis auf entfernte ältere Versionen; das Aufräumen schreibt `audit_log` (`dashboard_revisions.retention_cleanup`).                                                                                                                       |
| Bundle        | Initial-JS knapp unter 180 kB (Wert aus BUILD_LOG 167 übernehmen).                                                                                                                                                                               |

## 2. Soll

### 2.1 Fachregeln

1. **Alarm einschalten** nur, wenn alles zutrifft: Nutzer ist Manager oder Admin, darf das Dashboard schreiben, das Dashboard ist gespeichert (kein ungespeicherter Entwurf der Kachel), die Kachel hat eine gültige Regel im neuen Format, die Kennzahl ist `alarmfaehig` und die Kachel nutzt nur unterstützte Filter. Fehlt etwas, ist der Schalter gesperrt und der **konkrete** Grund steht daneben („Speichere das Dashboard zuerst.“, „Für diese Kennzahl gibt es noch keinen Server-Alarm.“, „Alarme verwalten nur Manager und Admins.“).
2. **Einstellungen je Alarm:** Mindestdauer (Auswahl 0, 5, 10, 15, 30, 60, 120 Minuten; Standard 10) und Abklingzeit (0, 15, 60, 240, 1440 Minuten; Standard 60), jeweils mit einem Satz Erklärung. Pausieren/Fortsetzen, Löschen mit Bestätigung.
3. **Alarmliste** (eigene, nachgeladene Seite `/dashboard/alarme`): neueste zuerst, je Eintrag Dashboard, Kachel, Wechsel („Warnung → Kritisch“), Wert mit Einheit, Grenze, Datenstand, Zeitpunkt. Filter: nur ungelesene, nur Warnung/Kritisch, je Dashboard. Laden weiterer Einträge seitenweise (50). Jeder Eintrag führt per Link zur Kachel.
4. **Lesebestätigung** ist persönlich: Ein Eintrag gilt für mich als gelesen, wenn ich ihn öffne oder „Als gelesen markieren“ wähle; „Alle als gelesen markieren“ für den aktuellen Filter.
5. **Quittierung** ist persönlich und nur für Wechsel nach `warnung` oder `kritisch`: „Gesehen und kümmere mich“, optional Kommentar bis 280 Zeichen. Andere Berechtigte sehen, **wer** quittiert hat (E-Mail wie in 165, bis ein Anzeigename existiert). Quittieren ändert nie den Alarmzustand und unterdrückt keine späteren Meldungen.
6. **Zähler** im Kopfbereich: Glockensymbol mit Anzahl ungelesener Warnungen/kritischer Meldungen (max. Anzeige „99+“), zugänglicher Name „3 ungelesene Alarme“. Aktualisierung alle 60 Sekunden **nur bei sichtbarem Tab** und beim Zurückkehren in den Tab; keine Abfrage in der Leseansicht ohne Anmeldung. Kein Ton, kein Blinken.
7. **Kachel:** Ist ein Alarm aktiv, zeigt die Kachel ein kleines Glockensymbol mit Tooltip „Alarm aktiv, Prüfung alle 5 Minuten“; bei pausierter Regel ein durchgestrichenes Symbol mit Grund. Die Badge-Logik aus 166 bleibt unverändert (Client-Bewertung).
8. **Admin-Übernahme:** Neue Ansicht „Alarme“ im Admin-Bereich (nur Admin): Liste aller Regeln der Organisation mit Status, Verantwortlichem, Pausegrund. Für `verantwortlicher_ohne_rechte`: „Verantwortung übernehmen und fortsetzen“ (setzt den Admin als Verantwortlichen, Regel aktiv, Audit-Eintrag, Ereignis `fortgesetzt`) oder „Löschen“. Manager sehen diese Ansicht nicht.
9. **Ausfallhinweis:** Liefert `alarm_worker_status()` `ueberfaellig = true`, sehen Admins im Kopfbereich und in der Alarmliste ein Banner „Die Alarmprüfung ist seit X Minuten nicht gelaufen. Alarme werden gerade nicht ausgewertet.“; bei `auswertung_aktiv = false` „Die Alarmprüfung ist pausiert.“. Alle anderen Nutzer sehen den Hinweis nur in der Alarmliste.
10. **Versionsliste (165 §8 Nr. 5):** Hat die Aufräumfunktion für das Dashboard Versionen entfernt, zeigt die Versionsliste am Ende „Ältere Versionen wurden nach der Aufbewahrungsregel entfernt.“
11. **Rechteentzug wirkt sofort:** Verliert jemand den Lesezugriff auf ein Dashboard, verschwinden dessen Meldungen aus Liste und Zähler beim nächsten Abruf (Server-RLS aus 167; Client leert Cache bei Organisationswechsel/Logout wie bei den anderen Dashboard-Abfragen).

### 2.2 Server (eine neue Migration `supabase/migrations/20261125_dashboard_alarm_receipts.sql`)

12. Tabelle `dashboard_alarm_receipts`: `event_id` (FK cascade), `user_id`, `organization_id`, `gelesen_at`, `quittiert_at NULL`, `kommentar TEXT NULL` (≤ 280), PK `(event_id, user_id)`. RLS: eigene Zeilen schreiben nur über RPC; Quittierungen anderer lesen nur, wer das Ereignis lesen darf.
13. RPCs: `mark_dashboard_alarm_events_read(p_event_ids UUID[])` (max. 500), `mark_all_dashboard_alarm_events_read(p_dashboard_id UUID DEFAULT NULL)`, `acknowledge_dashboard_alarm_event(p_event_id, p_kommentar)`, `count_unread_dashboard_alarm_events()`, Erweiterung der Rückgabe von `list_dashboard_alarm_events` um `gelesen`, `quittiert_von[]` **über eine neue Funktion** `list_dashboard_alarm_events_v2` (die alte bleibt unverändert), `takeover_dashboard_alarm_rule(p_rule_id)` (nur Admin), `list_organization_alarm_rules()` (nur Admin), `dashboard_revision_retention_info(p_dashboard_id)` → `{entfernt: boolean, letzte_bereinigung}` aus `audit_log`.
14. pgTAP: Lesen/Quittieren nur eigener Einträge; fremde Organisation abgewiesen; Viewer darf quittieren (persönlich), aber keine Regel verwalten; Übernahme nur Admin; nach Übernahme wertet der Job die Regel wieder aus; Zähler zählt nur Warnung/Kritisch, nur lesbare Dashboards; Rechteentzug blendet Ereignisse aus.

### 2.3 Oberfläche und Code

15. Neu `src/features/dashboard/services/dashboardAlarmService.ts` (RPC-Aufrufe, Fehlertexte, Typen) und Hooks `hooks/useDashboardAlarms.ts`, `hooks/useUnreadAlarmCount.ts` (TanStack Query wie die anderen Dashboard-Abfragen, Cache-Schlüssel mit Organisation und Nutzer).
16. Inspector: neuer Abschnitt `components/editor/inspector/threshold/AlarmSection.tsx` im Tab „Schwellenwerte“; ersetzt den Hinweis aus 166. `InspectorThresholdTab.tsx` bleibt ≤ 200 Zeilen.
17. Neu `pages/DashboardAlarmsPage.tsx` (lazy, Route `/dashboard/alarme`), `components/alarms/*` (Liste, Eintrag, Filter, Quittier-Dialog mit `useModalA11y`), `components/alarms/AlarmBell.tsx` (klein, im Initial-Chunk zulässig, Liste und Dialog **nicht**).
18. Admin: neue Ansicht unter dem bestehenden Admin-Bereich (Pfad und Einbindung nach Muster `/admin/members`, Builder benennt Fundstelle in T0).
19. Kachel-Symbol über die eine Einbindungsstelle aus 166 (`TileThresholdBadge`), keine zweite Stelle.
20. Vorschau-Szenario `dashboard-vorschau.html?bereich=editor_v2&alarme=1`: Alarmliste mit gelesenen/ungelesenen/quittierten Einträgen, Kachel mit aktivem und pausiertem Alarm, Admin-Ansicht mit einer Regel `verantwortlicher_ohne_rechte`, Ausfallbanner. Kombinierbar mit `&teams=1`.

### 2.4 Tests und Nachweise

21. **Vitest** (Tests zuerst): Sperrgründe des Schalters je Bedingung (2.1 Nr. 1); Speichern der Einstellungen; Liste mit Filtern und Seitenladen; Lesebestätigung einzeln/alle; Quittieren nur bei Warnung/Kritisch, Kommentar ≤ 280; Zähler pausiert bei verstecktem Tab (Fake-Timer, `visibilitychange`); Admin-Übernahme nur für Admin sichtbar; Banner je Zustand; Versionslisten-Hinweis; Cache wird bei Organisationswechsel geleert.
22. **E2E Vorschau** `e2e/dashboard-alarms-preview.spec.ts` auf 1440/768/375: Szenario 20 durchklicken, Quittier-Dialog per Tastatur, Fokus kehrt zurück.
23. **E2E mit lokalem Supabase** `e2e/dashboard-alarms.spec.ts`: Manager legt Schwellenwert und Alarm an; Test ruft `evaluate_dashboard_alarms(p_now)` über den Service-Schlüssel der lokalen Testumgebung auf (nur lokal/CI, Muster wie vorhandene Cleanup-Schritte); Meldung erscheint, Zähler zeigt 1, Viewer sieht Meldung und quittiert, Manager sieht die Quittierung; Viewer findet keinen Alarm-Schalter.
24. Bestehende E2E (`a11y.spec.ts` ohne neue Verstöße gegenüber Baseline, `visual.spec.ts`, Editor-, Team-, Versions- und Schwellenwert-Suiten) bleiben grün.
25. **Bundle:** Initial-JS höchstens +0,4 kB gzip und unter 180 kB. Reicht der Spielraum nicht: stoppen und im PR begründen, Grenze nicht anheben.
26. **Screenshots** (`docs/screenshots/auftrag-168/README.md`): Alarmliste, Quittier-Dialog, Inspector mit Alarm-Abschnitt (gesperrt/aktiv), Kachel mit Glocke, Admin-Ansicht, Ausfallbanner – 1440/768/375, hell/dunkel, Vorher/Nachher-Hashes verschieden, 0 px Überlauf.

### 2.5 Dokumentation

27. `docs/dashboard/ALARME_P13B.md` um Abschnitt „Oberfläche (P13c)“ ergänzen; Masterplan §6 Nachtrag „P13 abgeschlossen“; `ARCHITECTURE_DECISIONS.md` Teil C ergänzen (Lesebestätigung/Quittierung persönlich, Quittieren ändert keinen Zustand); `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

1. Schutzbereiche unverändert (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`).
2. Server: nur die neue Migration `20261125_dashboard_alarm_receipts.sql`; 167-Funktionen nicht ändern (neue Funktionen statt Signaturänderung).
3. Keine Änderung an Client-Datenabfragen der Kacheln (`src/features/dashboard/data`, `src/services/liveKpi`, `src/domain`, `crmRepository.ts`).
4. `src/auth/permissions.ts` nur, wenn eine Rollenabfrage dort fehlt; dann im PR begründen.
5. V1-Pfad unverändert. Keine neuen Abhängigkeiten. `max-lines` 400; `InspectorThresholdTab.tsx` ≤ 200.
6. Tests zuerst, Rot-Läufe im BUILD_LOG: (a) Schalter gesperrt für Viewer mit Grund; (b) Zähler zeigt 1 nach neuem Ereignis; (c) Quittieren bei `normal`-Wechsel nicht möglich; (d) Admin-Übernahme setzt Regel aktiv (pgTAP); (e) Versionslisten-Hinweis erscheint nach Aufräumen.
7. Barrierefreiheit: Glocke mit zugänglichem Namen, Liste als Liste mit Überschriften, Dialoge mit Fokusfalle, Statusänderungen über `aria-live="polite"`.

## 4. Ziel-Dateien

| Pfad                                                                                                                               | Änderung                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_168_ALARME_OBERFLAECHE.md`                                                                     | Dieser Auftrag             |
| neu `supabase/migrations/20261125_dashboard_alarm_receipts.sql`, neu `supabase/tests/dashboard_alarm_receipts.sql`                 | Server (2.2)               |
| neu `services/dashboardAlarmService.ts`, `hooks/useDashboardAlarms.ts`, `hooks/useUnreadAlarmCount.ts`                             | Datenzugriff (2.3 Nr. 15)  |
| `components/editor/inspector/InspectorThresholdTab.tsx`, neu `inspector/threshold/AlarmSection.tsx`                                | Inspector (2.3 Nr. 16)     |
| neu `pages/DashboardAlarmsPage.tsx`, neu `components/alarms/*`, Routeneintrag in `src/app/routes.tsx`, Kopfbereich (Fundstelle T0) | Liste, Glocke (2.3 Nr. 17) |
| Admin-Bereich (Fundstelle T0), `components/TileThresholdBadge.tsx`, Versionsliste (Fundstelle T0)                                  | 2.3 Nr. 18–19, 2.1 Nr. 10  |
| `preview/DashboardEditorPreviewV2.tsx`, ggf. neu `preview/previewAlarms.ts`                                                        | Vorschau (2.3 Nr. 20)      |
| Tests (`src/features/dashboard/__tests__/*`, neu `e2e/dashboard-alarms*.spec.ts`), `.github/workflows/ci.yml` (nur E2E-Liste)      | 2.4                        |
| neu `scripts/captureAuftrag168GateScreenshots.mjs`, `docs/screenshots/auftrag-168/README.md`                                       | Screenshots                |
| `docs/dashboard/ALARME_P13B.md`, Masterplan, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                     | Doku                       |

## 5. Tasks

- [ ] **T0 Einstieg:** Baseline, Ist-Tabelle §1 prüfen, Fundstellen Kopfbereich/Admin/Versionsliste benennen, `size-limit` notieren.
- [ ] **T1 Rot-Nachweise** §3 Nr. 6.
- [ ] **T2 Server** 2.2.
- [ ] **T3 Datenzugriff** 2.3 Nr. 15.
- [ ] **T4 Inspector und Kachel** 2.1 Nr. 1–2, 7.
- [ ] **T5 Alarmliste, Lesebestätigung, Quittierung, Zähler** 2.1 Nr. 3–6.
- [ ] **T6 Admin-Übernahme, Ausfallhinweis, Versionslisten-Hinweis** 2.1 Nr. 8–10.
- [ ] **T7 Vorschau und E2E** 2.3 Nr. 20, 2.4 Nr. 22–24.
- [ ] **T8 Bundle, A11y, Screenshots** 2.4 Nr. 25–26.
- [ ] **T9 Doku und Abschluss:** 2.5, Pflicht-Verifikation §7, Schutzbereichs-Diff, BUILD_LOG mit Smoke für Marc (als Manager Alarm einschalten, als Admin Liste öffnen, quittieren), PR, Review.

## 6. Abnahme

- Manager/Admins schalten Alarme nur dort ein, wo der Server sie wirklich prüft; jede Sperre nennt ihren Grund.
- Alle Berechtigten sehen Meldungen, markieren sie als gelesen und quittieren Warnungen/kritische Meldungen; Quittieren ändert keinen Alarmzustand.
- Pausierte Regeln nach Rechteverlust sind für Admins sichtbar und übernehmbar.
- Ein Ausfall der Alarmprüfung ist für Admins sofort sichtbar.
- Die Versionsliste erklärt entfernte ältere Versionen.
- Rechteentzug entfernt Meldungen aus Liste und Zähler.
- Schutzbereiche, V1 und Kachel-Datenabfragen unverändert; Bundle im Budget.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production
npx size-limit
npx tsx scripts/verifyAlarmCapability.ts
npx tsx scripts/generateAlarmParitySql.ts --check
supabase db reset --yes && supabase test db
npm run verify:migrations
npx playwright test e2e/dashboard-alarms*.spec.ts e2e/dashboard-thresholds-preview.spec.ts e2e/team-dashboards*.spec.ts e2e/dashboard-versions*.spec.ts e2e/editor-*.spec.ts e2e/a11y.spec.ts e2e/visual.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- src/features/dashboard/data src/services/liveKpi src/domain src/services/db/crmRepository.ts   # leer
```

## 8. Offene Punkte

- **Anzeigename statt E-Mail** bei Quittierungen folgt mit dem kleinen Folgeauftrag „Anzeigename“ aus 165 §8.
- **Benachrichtigung außerhalb der App** (E-Mail, Teams, Slack) ist P18 (Auftrag 177).
- Entscheidungen aus 167 §9 (Datenalter Live-Werte, Aufbewahrung der Ereignisse) bleiben offen, bis Marc entscheidet; 168 zeigt den Datenstand jeder Meldung.
