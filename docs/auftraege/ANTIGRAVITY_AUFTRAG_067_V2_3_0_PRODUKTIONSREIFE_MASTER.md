# AUFTRAG 067 / Gates G44–G65 — LeadPilot v2.3.0 Produktionsreife

**Ausgangscode:** `9380ace8290524456e7ce76852b570612a51df06` (`v2.2.0`)

**Planungsbranch:** `codex/auftrag-067-v2.3.0-plan`

**Status:** OFFEN

**Zielversion:** `v2.3.0`

**Lizenzentscheidung:** proprietär, `All Rights Reserved`

## Maßgebliche Dokumente

1. `CLAUDE.md`
2. `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`
3. `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md`
4. dieser Auftrag

Bei einem Widerspruch gilt die Reihenfolge oben. Die Spezifikation ist von Marc fachlich
freigegeben. Der Implementierungsplan bestimmt Dateien, Interfaces, Testreihenfolge und
Commits. Dieser Auftrag bestimmt den repo-spezifischen Builder-/Reviewer-Ablauf.

## Ziel

Alle im Code-Review und im GitHub-Issue-Abgleich bestätigten Mängel werden zuerst
vollständig behoben. Danach werden die freigegebenen Erweiterungen für echte
Mehrbenutzerfähigkeit, serverseitige CRM-Abfragen, Quellenfrische, Audit/Diagnose und
Simulationssteuerung umgesetzt. Reale Kundendaten sind nicht erforderlich: Ein
synthetischer Demo-Mandant nutzt dieselben Auth-, RLS-, Persistenz- und Auditregeln wie
ein späterer realer Mandant.

## Verbindliche Reihenfolge

```text
Mängel erfassen
  067A
    ↓
Sicherheits- und Datenkern
  067B → 067C → 067D → 067E → 067F → 067G → 067H
    ↓
Frontend- und Qualitätsmängel
  067I/G52 → G53 → G54 → G55 → 067J → 067K → 067L
    ↓
Alle Review-Mängel behoben (G58)
    ↓
Freigegebene Ergänzungen
  067M → 067N → 067O → 067P → 067Q
    ↓
Gesamtabnahme und Release
  067R → 067S
```

Kein Teilauftrag darf parallel zu einem anderen Teilauftrag laufen. G52–G55 sind vier
eigenständige Review-Zyklen innerhalb 067I. Ein roter Test, offener Review-Befund oder
fehlgeschlagener GitHub-Actions-Lauf blockiert den nächsten Pfeil.

## Rollen

- **Antigravity ist Builder:** schreibt Implementierung und Builder-Eintrag im
  `docs/BUILD_LOG.md`.
- **Codex oder Claude Code ist Reviewer:** verändert im Review keine Produktdatei,
  wiederholt die Gates, dokumentiert Befund/Freigabe und gibt rote Punkte zurück.
- **Antigravity bessert nach:** ausschließlich innerhalb der Zieldateien des aktiven
  Teilauftrags.
- **Marc gibt das Release frei:** Merge und Tag `v2.3.0` sind ohne ausdrückliche
  Freigabe verboten.

## Freigegebene Schutzbereiche

Dieser Auftrag hebt den bisherigen Änderungsstopp nicht pauschal auf. Er erlaubt
Änderungen nur wie folgt:

| Schutzbereich | Freigegeben in |
|---|---|
| `src/types/**` | 067B, 067D, 067E, 067F, 067G, 067Q |
| `src/context/**` | nur wenn 067B oder 067F den konkreten Pfad vor dem ersten Commit in der Teilauftragsdatei ergänzt; sonst unverändert |
| `src/services/data/**` | 067D, 067E, 067H, 067O |
| `src/simulation/**` | 067A, 067E, 067F, 067G, 067K, 067Q |
| RNG-/Seed- und Reproduzierbarkeitspfad | 067E, 067K, 067Q; Golden Run vorher/nachher zwingend |
| Run-/Versionsmodell und Persistenz | 067E, 067F, 067K, 067Q |
| CRM-Schreibpfade | 067B, 067C, 067F, 067N |
| `src/features/resources/**` | 067A, 067J, 067K |

Für jeden anderen Teilauftrag muss der Diff in diesen Pfaden leer bleiben. Eine benötigte
zusätzliche Datei ist kein stilles Mandat: Antigravity dokumentiert den Konflikt und
wartet auf eine schriftliche Erweiterung.

## Teilaufträge und Gates

### 067A / G44 — Charakterisierung

**Ergebnis:** Alle bestätigten Befunde besitzen einen roten, reproduzierbaren Test und
eine eindeutige Gate-Zuordnung. Golden Run, Baseline-Hash und bestehende
Reproduzierbarkeit werden vor jedem geschützten Umbau eingefroren.

**Muss zusätzlich enthalten:** Element-Clipping-Test für `/resources/materials` bei
375 Pixel. Der bestehende Test `document.scrollWidth <= document.clientWidth` bleibt,
reicht aber allein nicht: Badges, Überschriften und Inhaltskarten müssen vollständig in
der Bounding-Box ihres tatsächlichen Containers liegen.

### 067B / G45 — Identität und Mandantentrennung

**Ergebnis:** Supabase Auth ersetzt LocalAuth. Jede mandantenbezogene Tabelle enthält
`organization_id NOT NULL`. Admin, Manager und Viewer besitzen getestete Rechte. Zwei
Testorganisationen beweisen, dass IDs, Fremdschlüssel und RPCs keinen Cross-Tenant-
Zugriff erlauben. Öffentliche Selbstregistrierung ist deaktiviert.

### 067C / G46 — Ingress und Schreibsicherheit

**Ergebnis:** n8n-Live-KPI-Ingress prüft HMAC-SHA-256, Fünf-Minuten-Fenster, einmalige
Nonce, Allowlist, Wertebereich, Rate-Limit und Body-Limit vor jedem privilegierten
Zugriff. Browser-Seeder und Seed-Button sind entfernt. Der Demo-Mandant entsteht
idempotent über Migration/RPC. CSP und weitere Security-Header sind aktiv.

### 067D / G47 — CRM-Quellenwahrheit

**Ergebnis:** Companies, Contacts, Deals, Activities und Audit-Metadaten kommen aus einem
einzigen `CrmReadModelEnvelope`. Leer ist `empty`; Fehler ist `unavailable`; ein Fehler
schaltet niemals still auf Demodaten. Quelle, Modus, Abrufzeit und Status sind sichtbar.

### 067E / G48 — Baseline zur Engine

**Ergebnis:** Baselines werden kanonisch gehasht, vollständig geklont und tief
eingefroren. `SimulationBaselineInput` initialisiert die Engine. Die produktiven
Festwerte `66`, `34320` und `411840` verschwinden. Reproduktion prüft Baseline-,
Organisations-, Schema- und Modellhash.

### 067F / G49 — Dauerhafte Persistenz

**Ergebnis:** Szenarien, Versionen, Runs, Events, Zeitreihen und Snapshots liegen in
Supabase. Ein atomarer Serverpfad speichert einen Run vollständig oder gar nicht. Reload,
Ab-/Anmeldung und ein zweiter berechtigter Browser zeigen denselben Stand.

### 067G / G50 — Produktiver Web Worker

**Ergebnis:** Der Produktpfad berechnet ausschließlich im vorhandenen Web Worker.
`queued`, `running`, `progress`, `completed`, `failed` stammen aus echtem
Berechnungsfortschritt. Navigation und Fehler hinterlassen keinen Worker.

### 067H / G51 — HubSpot-Import

**Ergebnis:** Alle Seiten werden über `paging.next.after` geladen. 429-Backoff, Abort und
Maximallaufzeit funktionieren. Unbekannte Stages landen in Quarantäne statt `LOST`.
Referenzen, Counts, Pflichtfelder und Zeitraum müssen vor Freigabe konsistent sein.

### 067I / G52–G55 — 33 semantische Seiten

**Ergebnis:** Alle bisherigen Ganzseiten-WebP-Ansichten sind echte React-Seiten mit
auswählbarem Inhalt, genau einer `h1`, semantischen Tabellen/Listen, zugänglichen
Chartzusammenfassungen sowie Loading/Empty/Error/Ready. Abnahme jeweils bei 1440, 768 und
375 Pixel.

**Wellen:**

1. G52 Finanzen, Recht, Strategie
2. G53 Markt, Kunden, Vertrieb
3. G54 Unternehmen, Übersicht, Produkt
4. G55 Organisation und routeweite Gesamtnachprüfung

### 067J / G56 — UX, Accessibility, Assets und Clipping

**Ergebnis:** Logout bleibt auffindbar, Skip-Link und Drawer-Fokus funktionieren, der
Backdrop ist kein falscher Button, Desktop/Mobil-Darstellung wird nicht doppelt
gerendert, URL-Zustand ist wiederherstellbar. Logo/Favicon/Fonts/Medien sind gültig und
lokal optimiert. `/resources/materials` hat weder Seiten-Overflow noch internes
Abschneiden.

### 067K / G57 — Toolchain und Codequalität

**Ergebnis:** Node ist reproduzierbar `>=22.18.0 <23`; produktive Advisories sind null,
hohe/kritische Gesamtadvisories sind null. ESLint und Warnungen sind null, Prettier ist
null, Coverage erreicht 80/80/75/70. Die früher akzeptierten Max-Lines-Ausnahmen für
`ScenarioService`, `eventRules` und `ResourceViewer` werden durch getestete Aufteilung
beendet; das geschlossene Issue #6 gilt für v2.3.0 als bewusst überholt.

### 067L / G58 — Fail-closed CI und GitHub-Schutz

**Ergebnis:** Release Readiness misst im aktuellen Lauf und beendet sich bei fehlendem
Artefakt oder rotem Unterprozess ungleich null. Alle externen Actions sind auf
vollständige Commit-SHAs gepinnt. `main` besitzt ein aktives GitHub-Ruleset mit Pull-
Request-Pflicht, Required Checks und gesperrtem Direktpush. Der echte Actions-Lauf ist
grün. Erst damit sind alle Review-Mängel behoben.

**Auflage aus dem G57-Review (2026-09-19, befristete Ausnahme):** G57 wurde mit 6
dev-only High-Advisories in der `@lhci/cli@0.15.1`-Kette abgenommen (Freigabe Marc
Poenisch, `docs/reviews/v2.3.0-audit-risk-acceptance.md`). 067L muss (1) die
LHCI-Kette schließen und den LHCI-Lauf im echten Actions-Lauf nachweisen und (2) den
Sollvertrag `[PR-DEPENDENCY-15]` in `qualityRelease.acceptance.ts` wieder auf
`audit.all.high === 0` ohne Risiko-Häkchen zurücksetzen. G58 ist ohne beides nicht
abnahmefähig.

### 067M / G59 — Mitgliederverwaltung

**Ergebnis:** Admins laden ein, widerrufen, deaktivieren und ändern Rollen. Manager und
Viewer dürfen dies nicht. Eine Organisation behält immer mindestens einen aktiven Admin.

### 067N / G60 — CRM Query und Export

**Ergebnis:** Suche, Filter, Sortierung und Pagination laufen serverseitig,
organisationsgebunden und URL-synchron. CSV-Export respektiert aktive Filter, Rolle und
Mandant und schützt vor Formel-Injection.

### 067O / G61 — Quelle und Frische

**Ergebnis:** Datenführende Kernseiten zeigen Quelle, synthetisch/real, letzten Abruf,
Alter und Health. `degraded` und `unavailable` sind textlich und visuell eindeutig und
sehen nicht wie ein erfolgreicher Live-Zustand aus.

### 067P / G62 — Audit und Diagnose

**Ergebnis:** Audit ist append-only und für normale Benutzer unveränderlich. Eine Admin-
Ansicht filtert sichere Auditdaten. Diagnose zeigt Auth, DB, Ingress, Synchronisation und
Worker ohne Secret, Token, Payload oder personenbezogene Inhalte.

### 067Q / G63 — Run-Steuerung

**Ergebnis:** Admin/Manager können pausieren, fortsetzen, abbrechen, wiederholen und von
einem validierten Snapshot weiterlaufen. Viewer ist read-only. Befehle greifen nur an
sicheren Tick-Grenzen und bleiben reproduzierbar.

### 067R / G64 — Gesamtabnahme

**Ergebnis:** Jede Spec-Anforderung, jeder Review-Befund und jedes GitHub-Issue ist in
einer Acceptance-Matrix einem frischen grünen Nachweis zugeordnet. Zwei Organisationen,
drei Rollen, Angriffs-/Negativfälle, zweiter Browser, Reload, Hash-Manipulation,
Workersteuerung, 41+ Routen, Axe, Lighthouse, Bundle und Audits werden vollständig
wiederholt.

### 067S / G65 — Migration, Lizenz und Release

**Ergebnis:** Leere Datenbank und v2.2.0-Demostand migrieren reproduzierbar. Runbook,
Rollback, Free-Tier-Grenzen und Release Notes sind vollständig. `LICENSE`, README und
Release Notes tragen konsistent `All Rights Reserved`. GitHub muss die individuelle
proprietäre Lizenz nicht als SPDX-Standard erkennen; der Third-Party-License-Check muss
dennoch grün sein. Version und Tag heißen `v2.3.0`.

## Pflicht-Verifikation je Teilauftrag

Jeder Builder-Eintrag führt mindestens aus:

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
```

Je nach Ziel zusätzlich:

```bash
npm run test:coverage
npx playwright test
supabase db reset
supabase test db
npm audit --omit=dev
npm audit --audit-level=high
npx size-limit
npx lhci autorun
```

UI-Aufträge erzeugen 1440/768/375-Nachweise. Nur die textuelle Matrix wird committet;
Bilddateien bleiben ungetrackt. SQL-Aufträge müssen mindestens zwei Organisationen und
alle drei Rollen negativ testen. Security-Aufträge müssen Angriffs- und Replayfälle
enthalten.

## BUILD_LOG-Eintrag je Gate

Jeder Eintrag enthält in dieser Reihenfolge:

1. Ziel und Baseline-Commit,
2. geänderte Dateien,
3. roter Starttest und Ursache,
4. Implementierung und relevante Architekturentscheidung,
5. funktionale und negative Prüfungen,
6. Schutzbereichs-Diff mit erlaubten und unerlaubten Pfaden,
7. vollständige automatisierte Verifikation,
8. Screenshot-/SQL-/GitHub-Actions-Nachweis,
9. Reviewer-Befund,
10. Freigabestatus und Abschlusscommit.

## Abbruchbedingungen

Antigravity stoppt ohne weitere Änderung, wenn:

- eine zusätzliche Datei außerhalb der Zielmatrix nötig wird,
- ein Test nur durch Abschwächen oder Löschen einer Anforderung grün werden kann,
- Golden Run oder Reproduzierbarkeit ohne bewusst freigegebene Fachänderung abweicht,
- eine Migration Daten irreversibel löschen würde,
- ein Secret im Browser oder Repo erforderlich erscheint,
- ein kostenpflichtiger Dienst für die Abnahme zwingend würde,
- GitHub-Ruleset oder Required Checks wegen fehlender Berechtigung nicht eingerichtet
  werden können.

## Definition of Done

Auftrag 067 ist erst beendet, wenn G44–G65 seriell grün, alle 19 Teilaufträge unabhängig
reviewt, alle Review-Mängel geschlossen, alle Ergänzungen umgesetzt, alle Messgrenzen im
aktuellen Lauf erfüllt, der Arbeitsbaum sauber und Marcs ausdrückliche Release-Freigabe
dokumentiert sind. Vorher darf weder `v2.3.0` getaggt noch als fertig bezeichnet werden.
