# Kiosk-Modus (P15a, Auftrag 171)

Ein Dashboard dauerhaft auf einem Bildschirm im Büro zeigen: Vollbild ohne Menüs, gut lesbar aus Entfernung, optional wechselnd zwischen mehreren Dashboards.

## 1. Einrichtung (für Marc)

1. **Bildschirm und Browser:** Ein Rechner am Bildschirm mit aktuellem Chrome, Edge oder Firefox. Energiesparen und Bildschirmschoner für diesen Rechner ausschalten.
2. **Anmelden:** Im Browser LeadPilot öffnen und mit einem Konto anmelden, das die gewünschten Dashboards **lesen** darf. Die Rolle „Nur Lesen“ (Viewer) genügt. Zugangsdaten nicht im Browser speichern lassen, wenn der Rechner frei zugänglich steht.
3. **Kiosk starten:** Im Dashboard-Editor (V2) oben auf **„Im Kiosk anzeigen“** klicken. Dashboards für die Rotation ankreuzen, Intervall wählen (30–600 Sekunden, Standard 60), **„Kiosk starten“**.
   Alternativ direkt aufrufen: `/dashboard/kiosk?ids=<id1>,<id2>&intervall=60` (optional `&theme=hell` oder `&theme=dunkel`).
4. **Vollbild:** In der Statusleiste auf **„Vollbild“** klicken (Browser verlangt dafür einen Klick). Ohne Vollbild bleibt die Ansicht trotzdem ohne Menüs.
5. **Beenden:** **„Kiosk beenden“** führt zurück zum Dashboard.

## 2. Bedienung

| Aktion                          | Wie                                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotation pausieren / fortsetzen | `Leertaste` oder Schaltfläche „Pause“/„Weiter“ (bleibt pausiert, bis erneut gedrückt)                                                              |
| Blättern                        | `Pfeil links` / `Pfeil rechts` oder die Pfeil-Schaltflächen                                                                                        |
| Automatische Pause              | Bei Maus-, Touch- oder Tastaturbedienung; die Rotation läuft nach einem ruhigen Intervall weiter. Solange ein Dashboard lädt, wartet die Rotation. |
| Theme                           | Sonnen-/Mond-Schaltfläche (gleiche Einstellung wie in der App)                                                                                     |

Die Statusleiste zeigt Dashboard-Name, Position in der Rotation, **Datenstand** (Uhrzeit des ältesten sichtbaren Werts) und den **Verbindungszustand** des Live-Feeds. Die Alarmglocke zeigt die Zahl ungelesener Alarme; Quittieren ist im Kiosk bewusst nicht möglich.

## 3. Verhalten bei Ablauf, Offline und langer Laufzeit

- **Kein öffentlicher Zugang:** Der Kiosk ist eine Ansicht, kein Freigabelink. Es gelten Anmeldung und Datenbankrechte (RLS). Dashboards in `ids`, die der Nutzer nicht lesen darf (oder die es nicht gibt), werden übersprungen; die Statusleiste nennt ihre Anzahl.
- **Sitzung:** Supabase erneuert das Anmelde-Token selbstständig. Der Kiosk beobachtet das. Schlägt die Erneuerung fehl oder bleibt sie über den Ablauf hinaus aus (30 s Karenz), gilt die Sitzung **sofort** als abgelaufen: Kacheln verschwinden, laufende Abfragen werden abgebrochen und aus dem Zwischenspeicher gelöscht, Live-Abos beendet. Angezeigt wird nur noch „Sitzung abgelaufen – bitte neu anmelden“ mit der Uhrzeit des letzten gültigen Datenstands. Erneuert Supabase die Sitzung später doch noch (z. B. nach Netzausfall mit noch gültigem Refresh-Token), läuft der Kiosk von selbst weiter.
- **Offline:** Fällt das Netz aus, bleibt der letzte Stand sichtbar mit dem Hinweis „Offline seit HH:MM – Daten werden nicht aktualisiert“. Abgerufene Werte (Live, CRM) sind als **veraltet** markiert, Schwellenwerte zeigen **„Nicht bewertet (veraltet)“**. Feste Stammdaten bleiben unverändert gültig. Nach der Wiederverbindung lädt der Kiosk einmal neu; der Live-Feed nutzt weiter genau einen Kanal.
- **Lange Laufzeit:** Ein Dauertest simuliert 12 Stunden Rotation (Fake-Timer): Abos, Fenster-Listener und Feed-Listener bleiben konstant.

## 4. Grenzen

- Der Einstieg „Im Kiosk anzeigen“ sitzt im V2-Editor. Solange V2 nicht Standard ist (P16), ist der Kiosk über den V2-Editor oder die direkte Adresse erreichbar.
- Der Kiosk zeigt V2-Dashboards. Ohne `ids` zeigt er das zuletzt aktive, sonst das erste lesbare Dashboard.
- Ein eigenes „Kiosk-Konto“ mit Nur-Lese-Rolle ist eine Konto-/Rechtefrage für Marc (Auftrag 171 §8); die vorhandene Viewer-Rolle genügt.

## 5. Technik (Kurzfassung)

| Baustein                            | Datei                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Seite (lazy, außerhalb des Layouts) | `src/features/dashboard/pages/DashboardKioskPage.tsx`, Route in `src/app/App.tsx`                                |
| Hülle, Statusleiste, Hinweise       | `src/features/dashboard/components/kiosk/*`                                                                      |
| Sitzungswächter                     | `hooks/useSessionGuard.ts` (`aktiv \| erneuert \| abgelaufen`), Supabase-Quelle `hooks/supabaseSessionSource.ts` |
| Rotation, Online-Status             | `hooks/useKioskRotation.ts`, `hooks/useOnlineStatus.ts`                                                          |
| Adresse                             | `model/kioskParams.ts`                                                                                           |
| Vorschau ohne Anmeldung             | `dashboard-vorschau.html?bereich=kiosk` (Parameter `ids`, `intervall`, `ablauf`, `offline`, `theme`)             |
