# Auftrag 177 – Alarme: Zustellung über externe Kanäle (E-Mail, Microsoft Teams, Slack, Webhook) (P18a)

**Ziel:** Alarmereignisse aus 167 werden zusätzlich zur App an externe Kanäle zugestellt – mit Wiederholung bei Fehlern, ohne Doppelzustellung und mit sicher verwahrten Zugangsdaten.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P18 (§6: „externe Zustellung mit Wiederholung, Deduplizierung und Secret-Verwaltung“), §9.2 („Welche externen Kanäle? – Kein Anbieter gewählt, keine externe Datenübertragung“).
**Vorgelagert:** 168 (P13c) und 174 (P16b) gemergt; **Entscheidung Marc (§0) liegt vor**.
**Branch:** `auftrag-177-externe-alarmkanaele`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1 plus Sicherheitsreview. **Merge und Einrichten der Secrets:** Marc.
**Status:** GESPERRT – wartet auf Entscheidung (§0). **Entscheidung Marc vom 18.11.2026:** P17/P18 werden erst nach Abschluss von P16 (Auftrag 174) entschieden; vorher kein Start.

---

## 0. Entscheidung Marc nötig

1. **Welche Kanäle zuerst?** Vorschlag: E-Mail (über den bereits genutzten Mailversand von Supabase Auth/SMTP, falls vorhanden) und ein generischer Webhook; Teams/Slack über deren eingehende Webhooks danach. PagerDuty nur bei Bedarf.
2. **Ausführungsweg für ausgehende Aufrufe.** Die Alarm-Auswertung läuft nach Entscheidung vom 18.11.2026 in der Datenbank (`pg_cron`). Für die **Zustellung** nach außen braucht es entweder `pg_net` (HTTP aus der Datenbank) oder eine zeitgesteuerte Edge Function. Das ist eine neue Entscheidung, nicht Teil der Entscheidung vom 18.11.2026. Vorschlag: **Edge Function `alarm-dispatch`**, alle 1–5 Minuten per `pg_cron` + `pg_net` angestoßen; Secrets in Supabase-Secrets/Vault, nie in Tabellen im Klartext.
3. **Welche Inhalte verlassen das System?** Vorschlag: Dashboard-Name, Kachel-Name, Stufe, Wert mit Einheit, Grenze, Datenstand, Link in die App. Keine CRM-Einzeldaten.
4. **Wer richtet Kanäle ein?** Vorschlag: nur Admin je Organisation; Empfänger je Regel aus den Kanälen der Organisation wählbar (Manager/Admin).

## 1. Soll (nach Entscheidung zu verfeinern)

1. Tabellen `alarm_channels` (Organisation, Art, Name, Secret-Referenz, aktiv), `alarm_rule_channels` (Regel ↔ Kanal), `alarm_deliveries` (Ereignis, Kanal, Status `offen|gesendet|fehlgeschlagen|aufgegeben`, Versuche, nächster Versuch, letzte Antwort gekürzt).
2. **Deduplizierung:** eindeutiger Schlüssel `(event_id, channel_id)`; ein Ereignis wird je Kanal höchstens einmal erfolgreich zugestellt.
3. **Wiederholung:** exponentiell (1, 5, 15, 60 Minuten), maximal 5 Versuche, danach `aufgegeben` und Hinweis an Admins in der App.
4. **Sicherheit:** Webhook-URLs nur `https`, keine privaten IP-Bereiche (SSRF-Schutz), Zeitlimit 10 s, Antwort auf 1 KB gekürzt; Signatur-Header (HMAC) für generische Webhooks.
5. **Oberfläche:** Admin-Ansicht „Alarmkanäle“ (anlegen, testen, deaktivieren), Auswahl der Kanäle im Alarm-Abschnitt des Inspectors, Zustellstatus je Ereignis in der Alarmliste.
6. **Not-Aus:** eigener Schalter `zustellung_aktiv` in `alarm_settings`.

## 2. Tests und Nachweise

7. pgTAP (Deduplizierung, Wiederholungsplan, Rechte), Edge-Function-Tests mit Mock-Server (Erfolg, 500, Zeitüberschreitung, SSRF-Ziel abgelehnt), Vitest, E2E mit lokalem Mock-Webhook; Sicherheitsreview im BUILD_LOG.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; keine Secrets im Repository oder in Logs; keine CRM-Einzeldaten in Nachrichten; keine neuen npm-Abhängigkeiten ohne Freigabe im nachgetragenen Detail.

## 4. Tasks

- [ ] **T0** Entscheidung §0 im BUILD_LOG zitieren; ohne sie Stopp.
- [ ] **T1** Detailspezifikation als Nachtrag (Builder), Durchsicht Marc.
- [ ] **T2–T6** Server, Dispatch, Oberfläche, Tests, Sicherheitsreview, Doku (`docs/dashboard/ALARMKANAELE_P18.md` mit Einrichtungsanleitung für Marc), PR.
