# Auftrag 176 – Dashboard-Editor: Öffentliche, widerrufbare Freigaben einzelner Kennzahlen (P17b, optional)

**Ziel:** Ein Admin kann eine stark eingeschränkte, öffentliche Ansicht eines Dashboards per Link freigeben – nur ausdrücklich ausgewählte Kennzahlen, mit Ablaufdatum und sofortigem Widerruf, ohne Zugriff auf CRM-Einzeldaten.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P17 (§6), §4.E (Public Sharing: standardmäßig aus, nur freigegebene Kennzahlen, Ablauf, Widerruf, minimale Datenansicht, Link ersetzt keine Berechtigungsprüfung), §9.2 („Soll Public Sharing tatsächlich umgesetzt werden? – Deaktiviert; P17 optional“).
**Vorgelagert:** 174 gemergt; **Produktentscheidung Marc (§0) liegt vor**.
**Branch:** `auftrag-176-oeffentliche-freigaben`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1, **plus** Sicherheitsreview (`/security-review` oder gleichwertig) durch einen weiteren Agenten. **Merge:** Marc.
**Status:** GESPERRT – wartet auf Produktentscheidung (§0). Ohne Entscheidung wird nichts gebaut. **Entscheidung Marc vom 18.11.2026:** P17/P18 werden erst nach Abschluss von P16 (Auftrag 174) entschieden; vorher kein Start.

---

## 0. Entscheidung Marc nötig

| Frage               | Vorschlag (Empfehlung)                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Überhaupt umsetzen? | Nur, wenn es einen konkreten Anwendungsfall gibt (z. B. Kennzahlen für einen Investor). Sonst P17b nicht bauen.                    |
| Wer darf freigeben? | Nur Admin.                                                                                                                         |
| Welche Kennzahlen?  | Nur Einzelwerte und Zeitreihen mit Status „öffentlich zulässig“ (neue Positivliste); nie CRM-Einzelobjekte, Namen, E-Mails, Deals. |
| Laufzeit            | Pflicht-Ablaufdatum, maximal 90 Tage.                                                                                              |
| Datenstand          | Schnappschuss beim Freigeben **oder** täglich aktualisiert – Vorschlag: täglicher Schnappschuss, keine Live-Abfrage.               |
| Schutz              | Zufälliger Token (≥ 128 Bit), nur als Hash gespeichert; optional Passwort; Rate-Limit; `noindex`.                                  |

## 1. Soll (nach Entscheidung zu verfeinern)

1. Tabelle `dashboard_public_shares` (Organisation, Dashboard, Token-Hash, Kennzahlen-Liste, Ablauf, widerrufen_at, erstellt_von) und Tabelle `dashboard_public_snapshots` (nur aggregierte Werte, Datenstand).
2. Öffentlicher Abruf ausschließlich über eine Edge Function oder RPC mit Token-Prüfung, die **nur** den Schnappschuss liefert; keine RLS-Ausnahme auf CRM-Tabellen, kein `anon`-Zugriff auf andere Tabellen.
3. Öffentliche Seite `/p/<token>`: minimale Ansicht, Hinweis „Öffentliche Freigabe von <Organisation>, Stand …“, kein Login, keine Navigation in die App.
4. Widerruf wirkt sofort (nächster Abruf 404 mit neutralem Text); abgelaufene Freigaben ebenso. Audit-Einträge für Anlegen, Abruf (aggregiert je Tag), Widerruf.
5. Admin-Ansicht „Öffentliche Freigaben“ mit Liste, Ablauf, Widerruf.

## 2. Tests und Nachweise

6. pgTAP/Edge-Tests: falscher/abgelaufener/widerrufener Token, Token einer anderen Organisation, keine CRM-Rohdaten in der Antwort, Rate-Limit; Vitest; E2E öffentlicher Abruf und Widerruf; Sicherheitsreview-Protokoll im BUILD_LOG.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; keine RLS-Lockerung bestehender Tabellen; keine Secrets im Code; Kiosk bleibt ohne öffentlichen Zugriff; keine neuen Abhängigkeiten.

## 4. Tasks

- [ ] **T0** Entscheidung §0 im BUILD_LOG zitieren; ohne sie Stopp.
- [ ] **T1** Detailspezifikation auf Basis der Entscheidung als Nachtrag in diesem Auftrag (vom Builder, Review durch Marc).
- [ ] **T2–T5** Server, öffentliche Seite, Admin-Ansicht, Tests, Sicherheitsreview, Doku, PR.
