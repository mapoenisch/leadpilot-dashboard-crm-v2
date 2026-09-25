# LeadPilot Dashboard-CRM

LeadPilot Dashboard-CRM ist ein React-basiertes Echtzeit-Dashboard fuer das fiktive Unternehmen LeadPilot. Es verbindet CRM-Ansichten, Organisationsverwaltung, Systemdiagnose und eine reproduzierbare Simulationsumgebung.

> Die kleingeschriebene Datei `readme.md` im Projektstamm gehoert zum separaten Design-Skill. Diese `README.md` dokumentiert ausschliesslich die Anwendung und ihren Entwicklungsablauf.

## Technischer Stand

- React 18, TypeScript, Vite und Tailwind CSS
- Supabase fuer Authentifizierung, Mandantentrennung und Datenzugriff
- Vitest, Playwright, pgTAP und Deno fuer die Verifikation
- Version 2.3.0 (Masterauftrag 067, Release Notes: [docs/releases/V2.3.0.md](docs/releases/V2.3.0.md))

Die verbindliche Architektur und der aktuelle Umsetzungsstand stehen in [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md), [BUILD_PLAN.md](BUILD_PLAN.md) und [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## Voraussetzungen

- Node.js 22.18 bis kleiner als 23
- npm 10 oder neuer
- Docker und die Supabase CLI fuer Datenbank- und E2E-Tests

Zugangsdaten und lokale Konfiguration gehoeren ausschliesslich in eine nicht versionierte `.env`-Datei. Keine Secrets, API-Schluessel oder Testpasswoerter committen.

## Lokal starten

```bash
npm install
npm run dev
```

Der Entwicklungsserver wird von Vite bereitgestellt. Fuer Funktionen mit Datenbankzugriff muss der lokale Supabase-Stack laufen. Die CI-nahe Einrichtung ist in [docs/operations/ci-e2e-backend.md](docs/operations/ci-e2e-backend.md) beschrieben.

## Qualitaetspruefungen

Vor einem Merge mindestens diese Befehle ausfuehren:

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
deno test --allow-env --allow-net --allow-read supabase/functions/
npx supabase test db
npm run verify:migrations   # leere DB + Upgrade v2.2.0, lokales Supabase noetig
npm run verify:licenses
```

UI-Aenderungen werden zusaetzlich mit Playwright und der passenden Screenshot-Matrix in `docs/screenshots/` geprueft. Screenshots bleiben lokal; nur ihre textuelle Nachweismatrix wird versioniert.

## Sicherheits- und Datenmodell

- Mandantentrennung und Rollenrechte werden in Supabase per RLS durchgesetzt.
- Der Browser besitzt keinen schreibenden Audit-RPC. Audit-Ereignisse fuer Mitgliederverwaltung entstehen ausschliesslich durch einen Datenbank-Trigger.
- Der Audit-Lesepfad verwendet eine explizite Spaltenliste und gibt keine E-Mail-, IP- oder Secret-Felder aus.
- Die Simulations-Engine unter `src/simulation/` ist ein Schutzbereich und wird nur auf ausdruecklichen Auftrag veraendert.

## Arbeitsablauf

1. Den konkreten Auftrag unter `docs/auftraege/` lesen.
2. Ausschliesslich dessen Ziel-Dateien bearbeiten und Schutzbereiche pruefen.
3. Alle relevanten Gates ausfuehren und Ergebnis im [Build-Log](docs/BUILD_LOG.md) festhalten.
4. Feature-Branch pushen; nach gruener CI per Fast-Forward nach `main` mergen.
5. In einem separaten Staging-Ziel smoke-testen, bevor ein Produktiv-Deploy erfolgt.

Eine Bereitstellung ist nicht Bestandteil dieses Repositories: Es ist derzeit kein Deploy-Provider und kein Staging-Ziel konfiguriert.

## Betrieb

Konfiguration, Free-Tier-Grenzen, Backup, Rollout und Smoke-Test stehen im
[Betriebs-Runbook v2.3.0](docs/operations/v2.3.0-runbook.md), der getestete Rollback in
[docs/operations/v2.3.0-rollback.md](docs/operations/v2.3.0-rollback.md). Ein Produktivbuild
läuft nur über `npm run build:production`; er bricht ohne gültige Supabase-Werte ab.

## Lizenz

Proprietär: **All Rights Reserved.** Copyright (c) 2026 Marc Pönisch. Ohne ausdrückliche
schriftliche Erlaubnis ist keine Vervielfältigung, Veränderung, Weitergabe, Veröffentlichung
oder kommerzielle Nutzung gestattet. Der vollständige Text steht in [LICENSE](LICENSE).
Lizenzen von Drittanbieter-Abhängigkeiten bleiben unberührt; `npm run verify:licenses` prüft sie.

## Weitere Dokumentation

- [Architekturentscheidungen](ARCHITECTURE_DECISIONS.md)
- [Bauplan](BUILD_PLAN.md)
- [Build-Log](docs/BUILD_LOG.md)
- [Auftraege](docs/auftraege/)
- [Betriebsdokumentation fuer CI und E2E](docs/operations/ci-e2e-backend.md)
- [Betriebs-Runbook v2.3.0](docs/operations/v2.3.0-runbook.md)
