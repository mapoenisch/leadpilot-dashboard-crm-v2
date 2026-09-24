# LeadPilot v2.3.0 — Produktionsnähe und Mehrbenutzerfähigkeit

**Status:** fachlich freigegeben am 15.09.2026  
**Ausgangsstand:** `9380ace8290524456e7ce76852b570612a51df06` (`v2.2.0`)  
**Zielversion:** `v2.3.0`  
**Umsetzungsrahmen:** Masterauftrag 067 mit seriellen Teilaufträgen 067A–067S und Gates G44–G65

## 1. Ziel

LeadPilot wird von einer technisch starken Demo zu einer produktionsnahen,
mehrbenutzerfähigen Anwendung weiterentwickelt. Bis reale CRM-Daten verfügbar sind,
verwendet die Anwendung einen eindeutig gekennzeichneten synthetischen Demo-Mandanten.
Dieser Demo-Mandant durchläuft dieselben Authentifizierungs-, Autorisierungs-,
Persistenz-, Audit- und Datenintegritätsregeln wie ein späterer realer Mandant.

Die Umsetzung erfolgt Free-Tier-first. Entwicklung und Abnahme dürfen keine
kostenpflichtigen Dienste voraussetzen. Für einen späteren Betrieb mit echten Daten ist
ein Wechsel auf Supabase Pro wegen automatischer Backups, Nicht-Pausierung und längerer
Log-Aufbewahrung empfohlen, aber nicht Bestandteil der technischen Abnahme von v2.3.0.

## 2. Versionsentscheidung

Die finale Version heißt `v2.3.0`, nicht `v2.2.1`.

Begründung: Neben Fehlerkorrekturen entstehen neue, rückwärtskompatible Funktionen:

- echte Benutzer- und Organisationsverwaltung,
- Rollen und Einladungen,
- dauerhafte Run- und Audit-Historie,
- serverseitige CRM-Suche, Filter, Pagination und Export,
- Datenquellen- und Systemzustandsanzeigen,
- produktive Worker-Steuerung mit Pause, Fortsetzen und Abbruch,
- semantische, responsive Oberflächen anstelle statischer Ganzseitenbilder.

Vorgesehene Vorabversionen:

1. `v2.3.0-alpha.1` nach dem Sicherheits- und Datenkern,
2. `v2.3.0-beta.1` nach Behebung aller Review-Mängel,
3. `v2.3.0-rc.1` nach Umsetzung aller Ergänzungen,
4. `v2.3.0` erst nach Gate G65.

## 3. Verbindliche Grundentscheidungen

### 3.1 Produktionskern mit synthetischem Demo-Mandanten

Die Anwendung kennt keinen unsicheren Demo-Sonderweg. Der Demo-Mandant ist ein normaler
Mandant mit synthetischen Daten und denselben RLS-Policies wie jeder zukünftige reale
Mandant. Demo-Daten werden in Oberfläche, Exporten, Baselines und Runs dauerhaft als
synthetisch gekennzeichnet.

### 3.2 Serielle Umsetzung

Die Teilaufträge 067A–067S werden ausschließlich seriell umgesetzt. Jeder Teilauftrag
erhält einen eigenen Implementierungs-, Review- und Gate-Zyklus. Ein rotes Gate blockiert
den nächsten Teilauftrag. Parallele Änderungen an voneinander abhängigen Daten-,
Simulations- oder Persistenzpfaden sind ausgeschlossen.

### 3.3 Supabase als produktive Autorität

Supabase PostgreSQL ist die autoritative Speicherung für Benutzer, Organisationen,
CRM-Daten, Baselines, Szenarien, Runs, Events, Zeitreihen, Snapshots, Live-KPIs und
Audit-Einträge. Lokaler Browserzustand darf nur flüchtige UI-Einstellungen oder einen
klar als Cache behandelten Zustand enthalten. `localStorage` ist keine
Authentifizierungs- oder Datenbankgrenze.

### 3.4 Keine privilegierten Geheimnisse im Browser

Der Browser erhält ausschließlich den öffentlichen Supabase-Anon-Key. Service-Role-Keys,
n8n-HMAC-Secrets, SMTP-Zugangsdaten und andere privilegierte Geheimnisse liegen nur in
geschützten Plattform- oder n8n-Credentials. Variablen mit Präfix `VITE_` gelten immer als
öffentlich und dürfen keine Geheimnisse enthalten.

### 3.5 Gezielt freigegebene Schutzbereiche

Masterauftrag 067 darf die bisherigen Schutzbereiche `src/simulation/**`, `src/types/**`,
`src/context/**`, `src/services/data/**`, `src/features/resources/**`, RNG-/Seed-Verhalten,
Run-/Versionsmodell, Persistenzlogik und CRM-Schreibpfade ändern, soweit der jeweilige
Teilauftrag diese Dateien ausdrücklich als Ziel nennt. Vor jedem Refactoring werden
Charakterisierungs-, Golden-Run- und Reproduzierbarkeitstests festgeschrieben. Außerhalb
der im aktiven Teilauftrag benannten Ziele bleiben die Schutzbereiche unverändert.

## 4. Zielarchitektur

```text
React 18 + TypeScript
        │
        ├── Supabase Auth
        │     └── serverseitig prüfbare Sitzung
        │
        ├── Organization Context
        │     └── Organisation + Rolle + Berechtigungen
        │
        ├── TanStack Query / Service Layer
        │     ├── CRM Read Model
        │     ├── Baseline Service
        │     ├── Scenario/Run Repository
        │     ├── Audit Service
        │     └── System Health Service
        │
        ├── Web Worker
        │     └── deterministische Simulationsberechnung
        │
        └── sichere Serverpfade
              ├── RLS-geschützte Tabellen
              ├── transaktionale RPC-Funktionen
              ├── n8n-HMAC-Prüfung
              └── administrative Migrationen/Seeds

Supabase PostgreSQL
        ├── organizations / organization_members
        ├── companies / contacts / deals / activities
        ├── baselines
        ├── scenarios / scenario_versions
        ├── simulation_runs / run_events / run_snapshots / run_time_series
        ├── live_kpi_events / ingest_nonces
        └── audit_log
```

## 5. Identität, Mandanten und Rollen

### 5.1 Tabellen und Beziehungen

- `organizations`: ein fachlicher Mandant; besitzt Name, Modus
  (`synthetic` oder `real`), Status und Zeitstempel.
- `organization_members`: verbindet `auth.users.id` mit genau einer Organisation und
  einer Rolle.
- Rolle `admin`: Mitglieder, Datenquellen und Organisationseinstellungen verwalten.
- Rolle `manager`: CRM-Daten lesen, Szenarien erstellen und Simulationen ausführen.
- Rolle `viewer`: Daten, Runs und Berichte ausschließlich lesen.

Jede mandantenbezogene Tabelle erhält eine nicht-nullbare `organization_id`. Alle
Fremdschlüssel müssen verhindern, dass Beziehungen über Organisationsgrenzen hinweg
entstehen.

### 5.2 Anmeldung und Onboarding

- Der bisherige `LocalAuthAdapter` wird aus dem produktiven Pfad entfernt.
- Authentifizierung erfolgt über Supabase Auth.
- Neue Mitgliedschaften entstehen ausschließlich durch eine Admin-Einladung oder einen
  kontrollierten Bootstrap-Vorgang.
- Eine öffentliche Selbstregistrierung ohne Organisationszuordnung ist deaktiviert.
- Ein Produktions-Build wird abgelehnt, wenn Demo-Auth oder offene RLS-Policies aktiv sind.

### 5.3 RLS-Grundregel

Jeder Read- und Write-Pfad prüft `auth.uid()`, aktive Mitgliedschaft,
`organization_id` und erforderliche Rolle. Policies mit `USING (true)` oder
`WITH CHECK (true)` sind für mandantenbezogene Daten verboten. Negative SQL-Tests müssen
beweisen, dass ein Benutzer weder direkt noch über Fremdschlüssel oder RPC-Funktionen auf
eine fremde Organisation zugreifen kann.

## 6. CRM-Datenherkunft und Read Model

Alle CRM-Abfragen liefern ein vollständiges, quellenkonsistentes Ergebnis:

```ts
type DataSourceKind = 'synthetic' | 'supabase' | 'hubspot';
type DataSourceHealth = 'healthy' | 'empty' | 'degraded' | 'unavailable';

interface CrmReadModelEnvelope {
  organizationId: string;
  sourceId: string;
  sourceKind: DataSourceKind;
  status: DataSourceHealth;
  fetchedAt: string;
  contentHash: string;
  data: CrmReadModel;
}
```

Verbindliche Regeln:

- Leere Tabellen sind ein gültiges Ergebnis mit Status `empty`.
- Bei einem Quellenfehler werden keine lokalen Demodaten untergeschoben.
- Companies, Contacts, Deals, Activities und Audit-Metadaten stammen immer aus demselben
  Envelope.
- Ein Wechsel auf synthetische Daten ist nur als bewusste Auswahl des Demo-Mandanten
  zulässig.
- Die Oberfläche zeigt Quelle, Datenmodus, letzten erfolgreichen Abruf, Datenalter und
  Fehlerzustand.
- Handgeschriebene Supabase-Zeilentypen werden durch generierte Datenbanktypen und
  explizite Runtime-Guards an den Integrationsgrenzen ersetzt.

## 7. Baseline und Simulationsdatenfluss

### 7.1 Einfrieren der Baseline

Eine Baseline besteht aus dem normalisierten CRM Read Model, historischen Kennzahlen,
Quellenmetadaten und einem SHA-256-Hash über eine kanonisch serialisierte Darstellung.
Vor der Speicherung wird der gesamte Objektgraph geklont und tief eingefroren. Aufrufer
erhalten keine veränderbare Referenz auf den gespeicherten Zustand.

### 7.2 Übergang in die Engine

Ein eigener Mapper transformiert `BaselineDataset` in den initialen Simulationszustand:

```ts
interface SimulationBaselineInput {
  initialState: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  historicalMetrics: HistoricalSimulationMetrics;
  baselineHash: string;
}
```

Die bisher fest codierten historischen Werte werden entfernt und stammen aus
`historicalMetrics`. Das Run-Manifest enthält `baselineId`, `baselineHash`,
`dataSourceId`, `organizationId` und Schema-/Modellversion. Vor einer Reproduktion wird
der Hash erneut geprüft.

Folgende Eigenschaften sind durch Tests zu beweisen:

- gleiche Baseline + gleicher Seed + gleiche Parameter = bit-identisches Ergebnis,
- andere Baseline + gleicher Seed + gleiche Parameter = fachlich anderes Ergebnis,
- manipulierte Baseline = Run-Abbruch mit `BASELINE_HASH_MISMATCH`,
- Run und Baseline müssen derselben Organisation angehören.

## 8. Persistenz und Audit

### 8.1 Dauerhafte Speicherung

Szenarien, Versionen, Runs, Events, Zeitreihen und Snapshots werden dauerhaft in Supabase
gespeichert. Ein erfolgreicher Run wird über einen atomaren Serverpfad geschrieben:
Entweder werden Manifest, Ergebnis, Events und Snapshots vollständig gespeichert oder
die gesamte Operation wird zurückgerollt.

Reload, Abmelden/Anmelden und ein zweiter berechtigter Browser müssen denselben
freigegebenen Datenstand wiederherstellen. Persistenzfehler dürfen nicht verschluckt
werden.

### 8.2 Audit-Protokoll

Das Audit-Protokoll erfasst mindestens:

- Anmeldung, Abmeldung und fehlgeschlagene Zugriffsversuche,
- Mitgliedschafts- und Rollenänderungen,
- Datenquellenwechsel und Synchronisationen,
- Baseline-Erstellung und Hash,
- Szenario-, Versions- und Run-Erstellung,
- Pause, Fortsetzung, Abbruch, Wiederholung und Reproduktion,
- administrative Exporte und Konfigurationsänderungen.

Audit-Einträge sind für normale Benutzer unveränderlich. Personenbezogene Inhalte,
Tokens und Secrets werden nicht in Logfeldern gespeichert.

## 9. Worker und Simulationssteuerung

Der reproduzierbare Produktpfad verwendet ausschließlich den vorhandenen Web Worker.
Direkte Main-Thread-Ausführung bleibt auf Tests und expliziten Headless-Betrieb begrenzt.

Gate G50 behebt zunächst den Review-Mangel: Der Worker sendet reale Zustandsereignisse
für `queued`, `running`, `completed` und `failed`; der Fortschritt basiert auf tatsächlich
verarbeiteten Ticks beziehungsweise Monte-Carlo-Runs. Die Oberfläche bleibt während der
Berechnung bedienbar und räumt einen Worker bei Navigation oder Fehler zuverlässig auf.

Gate G63 ergänzt danach die neuen Produktfunktionen `paused`, `cancelled` und Resume.
Pause und Abbruch werden kooperativ an sicheren Tick-Grenzen ausgeführt. Ein Resume setzt
an einem validierten Snapshot fort.

## 10. Sichere Integrationen

### 10.1 n8n-Live-KPI-Ingress

Der Ingress verlangt folgende Header:

- `X-LeadPilot-Timestamp`,
- `X-LeadPilot-Nonce`,
- `X-LeadPilot-Signature`.

Die Signatur wird als HMAC-SHA-256 über `timestamp + "." + nonce + "." + rawBody`
gebildet. Zulässig sind nur Requests innerhalb eines Zeitfensters von fünf Minuten.
Jede Nonce darf pro Organisation nur einmal verwendet werden. Die Prüfung erfolgt vor
dem privilegierten Datenbankzugriff. KPI-ID, Einheit, Quelle und plausible Wertebereiche
werden erlaubnislistenbasiert validiert. Rate- und Body-Limits sind verpflichtend.

### 10.2 HubSpot-Baseline

- Alle Seiten werden über `paging.next.after` vollständig geladen.
- Ein Import besitzt maximale Laufzeit, Abbruchsignal und Rate-Limit-Backoff.
- Unbekannte Deal-Stages werden in Quarantäne geschrieben und niemals automatisch als
  `LOST` interpretiert.
- Der Import ist nur erfolgreich, wenn Referenzen, Counts, Zeitraum und Pflichtfelder
  konsistent sind.
- Der erzeugte Envelope trägt Portal-, Zeit-, Quellen- und Hash-Metadaten.

### 10.3 Seed-Pfad

Der Browser-Seeder und sein UI-Button werden entfernt. Synthetische Demo-Daten entstehen
über versionierte SQL-Migrationen oder einen administrativen, transaktionalen
Bootstrap-Pfad. Der öffentliche Anon-Client erhält keine allgemeinen INSERT- oder
UPDATE-Rechte zum Seeden.

## 11. Semantisches Frontend

Die 33 Ganzseiten-WebP-Ansichten werden als echte React-Oberflächen rekonstruiert. Die
vorhandenen Bilder bleiben ausschließlich visuelle Referenz. Die Inhalte verwenden die
bereits vorhandenen Domain-Daten, Design-Tokens, UI-Komponenten und Chart-Primitives.

Die Migration erfolgt in vier getrennten Gates:

1. G52: Finanzen, Recht und Strategie,
2. G53: Markt, Kunden und Vertrieb,
3. G54: Unternehmen, Übersicht und Produkt,
4. G55: Organisation sowie vollständige routeübergreifende Nachprüfung.

Jede Seite benötigt:

- genau eine sichtbare Hauptüberschrift,
- semantische Abschnitte, Listen und Tabellen,
- zugängliche Textzusammenfassungen für Diagramme,
- auswähl- und durchsuchbare Inhalte,
- sinnvolle leere, ladende und fehlerhafte Zustände,
- responsive Layouts für 1440, 768 und 375 Pixel,
- keinen horizontalen Seiten-Overflow,
- keine Abhängigkeit von einem Ganzseitenbild für fachliche Informationen.

## 12. UX, Accessibility und Medien

- Logo und Favicon werden über gültige Build-Imports oder `public/`-Pfade ausgeliefert.
- Der Logout ist dauerhaft sichtbar und auf Touch-Geräten auffindbar.
- Der mobile Drawer setzt Initialfokus, kapselt Fokus korrekt und gibt ihn beim Schließen
  an den Auslöser zurück.
- Ein Skip-Link führt direkt zum Hauptinhalt.
- Backdrops sind nicht als künstliche `div[role="button"]`-Steuerelemente fokussierbar.
- Desktop-Tabelle und mobile Karten werden nicht gleichzeitig für denselben Datensatz
  gerendert.
- Filter, Sortierung, Seite und aktive Tabs werden in der URL abbildbar.
- Wichtige Bilder besitzen explizite Abmessungen und responsive Quellen.
- Große Standort-PNGs werden in AVIF/WebP-Varianten ausgeliefert; das Logo wird als
  geeignetes SVG oder optimiertes transparentes Asset bereitgestellt.
- Fonts werden lokal ausgeliefert, damit kein Google-Fonts-Request erforderlich ist.
- Sicherheitsheader umfassen mindestens CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` und Schutz vor unerwünschtem Framing.
- `/resources/materials` zeigt bei 375 Pixeln Status-Badges und den Bereich
  „Operations & SLA“ vollständig. Die Abnahme prüft zusätzlich zum dokumentweiten
  Overflow die Bounding-Boxes sichtbarer Elemente gegen ihren Scroll-Container, damit
  internes Abschneiden trotz passender `document.scrollWidth` erkannt wird.
- WCAG 2.2 AA ist das Zielniveau für alle Kernabläufe.

## 13. Ergänzungen nach vollständiger Mängelbehebung

Erst nach Gate G58 werden folgende Funktionen gebaut:

### 13.1 Benutzer- und Organisationsverwaltung

Admins können Einladungen ausstellen, ausstehende Einladungen widerrufen, Mitglieder
deaktivieren und Rollen ändern. Die UI erklärt die Rechte jeder Rolle. Eine Organisation
kann nicht ohne aktiven Admin verbleiben.

### 13.2 CRM-Suche, Filter, Sortierung, Pagination und Export

Abfragen laufen serverseitig und sind organisationsgebunden. Suchbegriff, Filter,
Sortierung und Seite werden in URL-Parametern gespeichert. Exporte respektieren aktive
Filter, Rolle und Organisation. Große Datenmengen werden nicht vollständig im Browser
gerendert.

### 13.3 Datenquellen- und Frischeanzeige

Jede relevante Ansicht zeigt Quelle, Modus, letzten erfolgreichen Abruf, Datenalter und
Gesundheitsstatus. `degraded` oder `unavailable` darf nicht wie ein erfolgreicher Live-
Zustand aussehen.

### 13.4 Audit- und Diagnoseansicht

Admins erhalten eine filterbare Audit-Ansicht. Eine Systemzustandsseite zeigt Auth,
Datenbank, Ingress, letzte Synchronisation und Worker-Fähigkeit ohne Secrets oder interne
Credential-Werte offenzulegen.

### 13.5 Simulationsoperationen

Benutzer mit `manager`- oder `admin`-Rolle können Runs pausieren, fortsetzen, abbrechen,
wiederholen und von einem validierten Snapshot wiederaufnehmen. `viewer` bleibt read-only.

## 14. Einheitliches Fehler- und Zustandsmodell

Mindestens folgende maschinenlesbare Fehlercodes werden verwendet:

- `AUTH_REQUIRED`,
- `FORBIDDEN`,
- `TENANT_SCOPE_VIOLATION`,
- `DATA_SOURCE_UNAVAILABLE`,
- `DATA_SOURCE_INTEGRITY`,
- `BASELINE_HASH_MISMATCH`,
- `INGEST_SIGNATURE_INVALID`,
- `INGEST_REPLAY_DETECTED`,
- `RATE_LIMITED`,
- `PERSISTENCE_FAILED`,
- `SIMULATION_CANCELLED`,
- `SIMULATION_RESUME_INVALID`.

Benutzertexte sind verständlich und handlungsorientiert. Technische Logs enthalten
Fehlercode, Korrelations-ID, Organisation, Zeitpunkt und sicheren Kontext. Geheimnisse,
vollständige Payloads und personenbezogene Felder werden redigiert.

Leere Datenbestände, Ladezustände, Berechtigungsfehler, Quellenfehler und Systemfehler
werden als unterschiedliche UI-Zustände dargestellt. Automatische Wiederholungen sind
nur für idempotente Lesevorgänge oder explizit idempotent entworfene Schreibvorgänge
zulässig.

## 15. Qualitäts- und Sicherheitsgrenzen

### 15.1 Toolchain

- Node wird reproduzierbar auf eine mit allen Werkzeugen kompatible 22.x-Version ab
  `22.18.0` festgelegt.
- React Router wird auf eine Version ohne die im Review gemeldeten produktiven Advisories
  migriert.
- Vite und LHCI werden auf sichere, untereinander kompatible Versionen aktualisiert oder
  durch gepflegte Alternativen ersetzt.
- Keine neue Laufzeitabhängigkeit wird ohne Begründung und dokumentierte Freigabe
  aufgenommen.

### 15.2 Codequalität

- TypeScript: 0 Fehler.
- ESLint: 0 Fehler und 0 Warnungen; alle Baselines werden auf 0 gesetzt.
- Prettier: 0 abweichende Dateien.
- Keine produktive Datei überschreitet das festgelegte Max-Lines-Limit ohne explizite,
  neue Architekturentscheidung.
- Der bestehende `ScenarioService` wird nach Verantwortlichkeiten aufgeteilt.
- Die bisherige Max-Lines-Ausnahme für `ScenarioService`, `eventRules` und
  `ResourceViewer` gilt für v2.3.0 nicht als Erledigung. Der Umbau ist trotz des
  geschlossenen Issues Bestandteil von Gate G57 und erfolgt nur unter den in Abschnitt
  3.5 festgelegten Regressionstests.

### 15.3 Abhängigkeitssicherheit

- `npm audit --omit=dev`: 0 bekannte Schwachstellen.
- Vollständiges `npm audit`: 0 hohe oder kritische Schwachstellen.
- Eine nicht automatisch lösbare Ausnahme benötigt einen dokumentierten Risikonachweis
  und Marcs ausdrückliche Freigabe. Das Release-Gate darf sie nicht still tolerieren.

## 16. Teststrategie

Jeder Teilauftrag arbeitet testgetrieben: zuerst ein reproduzierbar fehlschlagender Test,
dann die minimale Implementierung, danach Regression und Gesamt-Gates.

### 16.1 Verbindliche Testarten

- Unit-Tests für Mapper, Hashing, Rollenlogik, Guards und Fehlerübersetzung,
- Integrationsprüfungen für CRM-Envelopes, Persistenz und Worker-Protokoll,
- lokale Supabase-SQL-Tests für Migrationen, RLS und RPC-Funktionen,
- negative Mandantentests mit mindestens zwei Organisationen und allen drei Rollen,
- Vertragsprüfungen für n8n-HMAC, Replay-Schutz und HubSpot-Pagination,
- Reload- und Mehrbrowser-E2E-Tests für persistierte Szenarien und Runs,
- Playwright-Tests auf 1440, 768 und 375 Pixel,
- Axe-/Accessibility-Prüfungen für alle registrierten Anwendungsrouten, mindestens die
  heute vorhandenen 41 Routen,
- visuelle Regressionstests für geänderte Routen und wichtige Fehlerzustände,
- aktuelle Lighthouse- und Bundle-Messungen im selben CI-Lauf.
- Element-Clipping-Prüfungen für sichtbare Badges, Überschriften und Inhaltskarten in
  ihren tatsächlichen Scroll-Containern; der bereits vorhandene Dokument-Overflow-Test
  bleibt zusätzlich bestehen.

### 16.2 Abnahmegrenzen

- Coverage: mindestens 80 % Lines/Statements, 75 % Functions und 70 % Branches.
- Gleiche Baseline + gleicher Seed: bit-identisches Ergebnis.
- Unterschiedliche Baseline + gleicher Seed: nachweisbar anderes fachliches Ergebnis.
- Fremdmandantenzugriff: HTTP-/SQL-seitig abgelehnt, auch bei manipulierten IDs.
- Unsigned, abgelaufene oder wiederholte n8n-Anfrage: abgelehnt.
- Persistierter Run: nach Reload und in zweiter berechtigter Sitzung vorhanden.
- Worker-Run: Oberfläche bleibt bedienbar; Progress, Pause und Cancel entsprechen dem
  echten Worker-Zustand.
- Alle registrierten Routen: Deep-Link, Reload, Rollenprüfung und Accessibility
  erfolgreich; keine neue Admin- oder Diagnose-Route ist ausgenommen.
- Kein horizontaler Seiten-Overflow auf den drei Pflichtbreiten.
- Lighthouse: Performance mindestens 90, Accessibility mindestens 95, Best Practices
  mindestens 95.
- Initiales JavaScript höchstens 180 KB gzip; größter Chunk höchstens 250 KB gzip.

## 17. Fail-closed CI und Release

Das Release-Readiness-Skript erzeugt alle Werte im aktuellen Lauf. Es verwendet keine
fest eingetragenen Lighthouse-, Bundle-, Coverage- oder CI-Werte. Fehlende Artefakte,
offene Pflichtpunkte und fehlgeschlagene Unterprozesse führen zu Exit-Code ungleich 0.

E2E, Accessibility, Sicherheitsprüfung, Migrationstest und Release-Readiness laufen bei
Pull Requests und auf dem geschützten Release-Branch. Ein Commit-, Push- oder Branchstatus
ist kein Ersatz für den tatsächlichen GitHub-Actions-Status.

Alle externen GitHub-Actions werden auf vollständige, unveränderliche Commit-SHAs
gepinnt; bewegliche Tags wie `@v4` sind verboten. Für `main` wird ein GitHub-Ruleset
eingerichtet, das direkte Pushes verhindert, Pull Requests und die in CI definierten
Pflichtprüfungen verlangt und auch für Administratoren nicht still umgangen wird. Das
Ruleset und seine Required-Status-Checks werden per GitHub-API nachgewiesen.

## 18. Teilaufträge und Gates

| Teilauftrag | Verbindlicher Inhalt | Gate |
|---|---|---|
| 067A | Charakterisierungs- und Regressionstests für alle Review-Befunde | G44 |
| 067B | Supabase Auth, Organisationen, Rollen und vollständige RLS-Trennung | G45 |
| 067C | n8n-HMAC, sichere Schreibpfade, Seed-Entfernung und Security-Header | G46 |
| 067D | Quellenkonsistentes CRM Envelope und sichtbare Datenherkunft | G47 |
| 067E | Baseline-Mapping, Deep-Freeze, Content-Hash und Engine-Verdrahtung | G48 |
| 067F | Persistente Szenarien, Runs, Events, Zeitreihen und Snapshots | G49 |
| 067G | Produktive Worker-Verdrahtung und echter Fortschritt | G50 |
| 067H | HubSpot-Pagination, Stage-Quarantäne und Importvalidierung | G51 |
| 067I | Semantische Rekonstruktion der 33 Bildseiten in vier Wellen | G52–G55 |
| 067J | UX-, Accessibility-, Asset-, Font-, Medien- und Element-Clipping-Korrekturen | G56 |
| 067K | Sichere Abhängigkeiten, Node-Pinning, Lint, Format und Coverage | G57 |
| 067L | Fail-closed CI, SHA-Pinning, `main`-Ruleset und Release-Readiness | G58 |
| 067M | Benutzer-, Einladungs- und Rollenverwaltung | G59 |
| 067N | CRM-Suche, Filter, Sortierung, Pagination und Export | G60 |
| 067O | Datenquellen-, Frische- und Degraded-Anzeigen | G61 |
| 067P | Audit-, Monitoring- und Diagnoseoberflächen | G62 |
| 067Q | Pause, Fortsetzen, Abbruch, Retry und Snapshot-Resume | G63 |
| 067R | Vollständige Sicherheits-, Funktions-, Daten- und UX-Abnahme | G64 |
| 067S | Migration, proprietäre Lizenz, Dokumentation, Release Notes und Tag `v2.3.0` | G65 |

Gate G58 markiert die vollständige Behebung aller im Review gefundenen Mängel. Die
Erweiterungsgates G59–G63 dürfen erst danach beginnen.

## 19. Migration und Rollout

- Alle Schemaänderungen entstehen als vorwärtsgerichtete, versionierte Supabase-
  Migrationen.
- Migrationen müssen gegen eine leere Datenbank und gegen den v2.2.0-Demostand laufen.
- Der synthetische Demo-Mandant wird idempotent erzeugt.
- Für destructive Schemaänderungen wird vor Ausführung ein expliziter Export-/Backup-
  Schritt dokumentiert; auf dem Free-Tier ist kein automatisches Backup vorauszusetzen.
- Konfigurationsprüfungen verhindern einen Produktivstart mit fehlenden Pflichtwerten.
- Rollout-Reihenfolge: Schema und Policies, Serverpfade, Frontend, Smoke-Test, Freigabe.
- Ein Rollback verwendet die vorherige Frontend-Version und eine ausdrücklich getestete
  kompatible Schema-Strategie; irreversible Datenmigrationen sind vor G65 verboten.

## 20. Nicht Bestandteil von v2.3.0

- echte LeadPilot-Kunden- oder CRM-Produktivdaten,
- Salesforce- oder weitere CRM-Konnektoren neben der vorbereiteten Adaptergrenze,
- öffentliches Self-Service-Sign-up,
- Abrechnung, Zahlung oder Kundenbilling,
- Enterprise-SSO, HIPAA, SOC2-Projektzertifizierung oder bezahlte Supabase-Add-ons,
- native iOS-/Android-Anwendungen,
- vollständige operative CRM-Schreibfunktionen wie frei editierbare Leads und Deals,
- zwingender Betrieb von n8n Cloud oder anderen kostenpflichtigen Diensten.

## 21. Lizenzentscheidung

LeadPilot wird proprietär unter **All Rights Reserved** veröffentlicht. Im Repo-Root
liegt eine `LICENSE`-Datei mit Urheberrechtsvermerk, Nutzungsbeschränkung und dem Hinweis,
dass ohne ausdrückliche schriftliche Erlaubnis keine Vervielfältigung, Veränderung,
Weitergabe, Veröffentlichung oder kommerzielle Nutzung gestattet ist. `README.md` und
Release Notes nennen denselben Lizenzstatus.

Lizenzen von Drittanbieter-Abhängigkeiten bleiben davon unberührt. Da GitHub einen
individuellen proprietären Text nicht zwingend als Standard-SPDX-Lizenz erkennt, ist eine
GitHub-Anzeige `licenseInfo: null` allein kein Gate-Fehler. Maßgeblich sind die vorhandene
`LICENSE`-Datei, der identische Dokumentationshinweis und ein erfolgreicher
Third-Party-License-Check.

## 22. Definition of Done für v2.3.0

`v2.3.0` ist ausschließlich freigabefähig, wenn:

1. alle Gates G44–G65 bestanden und im `docs/BUILD_LOG.md` dokumentiert sind,
2. alle 19 Teilaufträge seriell implementiert und unabhängig geprüft wurden,
3. kein Critical- oder Important-Befund des Reviews offen ist,
4. der Demo-Mandant über echte Auth-, RLS-, Persistenz- und Audit-Pfade funktioniert,
5. alle 33 Bildseiten durch semantische Oberflächen ersetzt sind,
6. alle Abnahmegrenzen aus Abschnitt 16 im aktuellen Lauf gemessen wurden,
7. ein vollständiger Neuaufbau aus Migrationen und dokumentierter Konfiguration gelingt,
8. Release Notes, Betreiberhinweise und Free-Tier-Grenzen dokumentiert sind,
9. `LICENSE`, README und Release Notes den Status `All Rights Reserved` konsistent nennen,
10. das `main`-Ruleset aktiv ist und alle externen Actions auf vollständige SHAs gepinnt sind,
11. der Release-Commit geprüft und der Arbeitsbaum sauber ist,
12. Marc die finale Release-Freigabe ausdrücklich erteilt hat.
