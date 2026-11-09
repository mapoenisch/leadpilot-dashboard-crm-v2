# HubSpot Set 4 in die lokale CRM-Ansicht übernehmen

Marc hat am 29.10.2026 ausdrücklich angewiesen, die Anbindung durch Codex fertigzubauen; diese Anweisung ersetzt für diese Arbeit die sonstige Builder-Rollenverteilung. Kein Merge oder Release beauftragt.

## Umfang

- Die 20 synthetischen Kontakte `905953680598` bis `905953680617` und ihre zehn Unternehmen aus dem geprüften n8n-Snapshot von Lauf 12 lokal importieren.
- Vollständigen HubSpot-Account-Snapshot nicht in Frontend, Repository oder veröffentlichte Case Study aufnehmen.
- Expliziter Zielmandant: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, aktuell angemeldet als `admin-a@e2e.local`; vorhandene Testdatensätze beibehalten. Andere Mandanten nicht verändern.
- Lokaler Operator-Import mit Transaktion, standardmäßig Rollback, Pflichtfeld-/Referenzprüfung, Mandanten-Konfliktschutz und idempotentem Upsert.
- Bestehenden CRM-Dienst starten und Darstellung über regulären authentifizierten, RLS-geschützten Lesepfad prüfen. Keine Browser-Mocks, keine erfundenen Kennzahlen, keine n8n-Laufzeitkopplung.

## Dateien

- `scripts/importHubSpotCaseStudy.mjs`
- `scripts/importHubSpotCaseStudy.node-test.mjs`
- dieser Auftrag und `docs/BUILD_LOG.md`

Keine Änderungen an App-Oberfläche, Datenquellenabstraktion, Simulation, Datenmodellen, Schema oder Berechtigungssystem erforderlich.

## Lokaler Ablauf

1. `supabase functions serve crm-query-export` im Projekt starten, falls der CRM-Dienst nicht läuft.
2. `node scripts/importHubSpotCaseStudy.mjs --snapshot <lokale-Datei> --organization aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa --operator admin-a@e2e.local` prüft den tatsächlichen Import vollständig und rollt zurück.
3. Derselbe Befehl mit `--apply` übernimmt die Datensätze. Wiederholungen erzeugen keine Duplikate.
4. Kontakte unter `/crm/leads` öffnen, nach `.example.com` suchen und 50 Zeilen auswählen. Ergebnis: 20 Demo-Kontakte auf einer Seite, reguläre Datenbank-Provenienz. Der zusätzliche bestehende Testkontakt bleibt vorhanden.
5. Der lokale Snapshot liegt außerhalb dieses Repositories unter `RevOpsPortfolio/work/hubspot-import-2026-10-29/` und bleibt unverändert.

## Abnahme

- Node-Tests für Auswahl, vollständige Set-4-Abdeckung, Ablehnung echter Daten, Pflichtfelder, fremdes Portal, Unternehmensreferenzen, SQL-Escaping und Transaktionsmodus.
- Tatsächlicher Dry-run, tatsächlicher Apply und zweiter identischer Apply; danach weiterhin 20 importierte Kontakte und zehn importierte Unternehmen.
- Zielmandant insgesamt: 13 Unternehmen, 21 Kontakte, 2 Deals. Demo-Mandant weiter 2/2/1, Mandant B weiter 1/1/1.
- `npx tsc --noEmit`, `npm run verify`, `npm run build` erfolgreich.
- Browser: 20 Treffer, 20 Kontaktzeilen, Status Gesund, gültige Unternehmens-IDs. n8n-Lauf 12 und Assert Integrity erfolgreich.
