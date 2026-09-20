# AUFTRAG 067M / Gate G59 — Mitglieder, Einladungen und Rollen

**Baseline:** `5f01ed5` (G58 integriert und `main-protection` aktiv) ·
**Branch:** `feat/auftrag-067m-members` (von `origin/main` abzweigen) ·
**Status:** OFFEN

Teilauftrag 067M des Master-Auftrags 067
(`ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md`). Diese Datei konkretisiert
Task 13 des Master-Implementierungsplans. Sie ist die verbindliche Arbeitsanweisung für G59.

## Maßgebliche Dokumente (Lesereihenfolge)

1. `CLAUDE.md`
2. `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md` — Abschnitt
   „067M / G59 — Mitgliederverwaltung“
3. `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md` — Abschnitte
   5 und 13.1
4. `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md` — Task 13
5. `docs/BUILD_LOG.md` — letzter G58-Eintrag
6. `supabase/migrations/20260917_tenant_fks_and_active_membership.sql` und
   `supabase/tests/tenant_isolation.sql`

## Ziel

Nur aktive Admins einer Organisation können Mitglieder und Einladungen dieser Organisation
verwalten. Sie können eine Einladung für `admin`, `manager` oder `viewer` versenden, eine
ausstehende Einladung widerrufen, ein aktives Mitglied deaktivieren und dessen Rolle ändern.
Manager und Viewer erhalten für jede Verwaltungsoperation einen serverseitigen Fehler 403.

Die zentrale Sicherheitsinvariante lautet: **Eine aktive Organisation behält immer mindestens
ein aktives Mitglied mit der Rolle `admin`.** Sie muss in PostgreSQL erzwungen werden; eine
Sperre nur in React oder nur im Edge-Function-Code genügt nicht.

Neue Mitgliedschaften dürfen ausschließlich aus einer gültigen Einladung oder dem bestehenden
kontrollierten Bootstrap stammen. Öffentliche Selbstregistrierung und direkte Browserzugriffe
auf privilegierte Daten oder die Supabase-Service-Role sind verboten.

## Fachliche Regeln

| Rolle | Mitglieder ansehen | Einladen / widerrufen | Rolle ändern / deaktivieren |
|---|---:|---:|---:|
| Admin | ja | ja | ja |
| Manager | nein | nein | nein |
| Viewer | nein | nein | nein |

- Eine Einladung ist organisationsgebunden, enthält eine normalisierte E-Mail-Adresse, die
  Zielrolle, den einladenden Admin, Erstell-/Ablaufzeit und einen Status `pending`, `revoked`,
  `accepted` oder `expired`.
- Eine Mitgliedschaft wird erst nach erfolgreicher, zur Einladungs-E-Mail passender
  Authentifizierung aktiv. Die Annahme darf weder Organisation noch Rolle aus Browserdaten
  übernehmen.
- Ein Admin darf nur Einladungen und Mitglieder der eigenen aktiven Organisation verwalten.
  Eine übergebene `organization_id` ist abzulehnen oder ausschließlich aus der verifizierten
  Mitgliedschaft des Aufrufers abzuleiten.
- Widerrufen ist nur für eigene `pending`-Einladungen zulässig. Deaktivieren setzt den
  Mitgliedsstatus auf `suspended`; die Mitgliedschaft wird nicht gelöscht.
- Rollenwechsel und Deaktivierung des letzten aktiven Admins müssen atomar mit einem
  fachlichen Fehler `LAST_ACTIVE_ADMIN` scheitern — auch bei konkurrierenden Anfragen.
- Fehler dürfen keine Service-Role-Details, Tokens oder Daten anderer Organisationen enthalten.
  Zulässige, für die UI auswertbare Fehlercodes sind `FORBIDDEN`, `LAST_ACTIVE_ADMIN`,
  `INVITATION_NOT_PENDING` und `NOT_FOUND`.

## Vorgesehene Architektur

1. Die Migration erzeugt `organization_invitations`, zugehörige Constraints, RLS und eine
   transaktionale Datenbank-Sperre für den letzten aktiven Admin. Direkte `authenticated`-
   Schreibzugriffe auf Mitglieder und Einladungen bleiben Default-Deny.
2. Die Edge Function `manage-members` prüft den Aufrufer mit dessen Bearer-Token, leitet
   Organisation und Admin-Recht ausschließlich serverseitig ab und führt danach die erlaubte
   Operation aus. Die Service-Role darf nur innerhalb dieser Function verwendet werden und nie
   an den Browser gelangen oder geloggt werden.
3. `memberService.ts` ruft ausschließlich diese Function auf. `MembersPage` verwendet den
   Service, erklärt die Rollen, bestätigt kritische Aktionen und zeigt Loading-, Empty-, Error-
   und Success-Zustände zugänglich an.
4. Die Route `/admin/members` ist nur für Admins erreichbar und nur für Admins in der Sidebar
   sichtbar. Das Verbergen eines Navigationspunkts ersetzt niemals die serverseitige Prüfung.

## Zieldateien

| Art | Dateien |
|---|---|
| Create | `supabase/migrations/20260925_organization_invitations.sql`, `supabase/functions/manage-members/index.ts`, `supabase/functions/__tests__/manageMembers.test.ts`, `supabase/tests/member_management.sql`, `src/services/admin/memberService.ts`, `src/services/admin/__tests__/memberService.vitest.ts`, `src/features/admin/components/InvitationForm.tsx`, `src/features/admin/pages/MembersPage.tsx`, `src/features/admin/pages/__tests__/MembersPage.vitest.tsx`, `e2e/member-management.spec.ts`, `docs/screenshots/auftrag-067m-g59/README.md` |
| Modify | `src/app/routes.tsx`, `src/app/routePages.tsx`, `src/components/layout/Sidebar.tsx`, `docs/BUILD_LOG.md` |

Jede weitere Datei ist ein Stopp-Punkt. Besonders `src/simulation/**`, `src/types/**`,
`src/context/**`, `src/services/data/**`, `src/features/resources/**`, der CRM-Schreibpfad und
bestehende RLS-Policies außerhalb der ausdrücklich benötigten G59-Migration bleiben unberührt.

## Tasks (Reihenfolge verbindlich, rot vor grün)

- [ ] **Step 1 — Rote Datenbank- und Function-Tests:**
  `supabase/tests/member_management.sql` zuerst schreiben. Tests beweisen: Admin darf nur
  eigene Mitglieder verwalten; Manager/Viewer/fremde Organisation erhalten keinen Zugriff;
  Einladungen sind organisationsgebunden; Widerruf ist endgültig; und weder Rollenwechsel noch
  Suspendierung können den letzten aktiven Admin entfernen. Ergänzend den roten Deno-Test für
  fehlenden/ungültigen Bearer-Token, fremde Ziel-ID und die zulässigen Fehlercodes schreiben.
- [ ] **Step 2 — Migration und serverseitiger Verwaltungsendpunkt:**
  `20260925_organization_invitations.sql` idempotent schreiben. Sie enthält Tabelle,
  Fremdschlüssel, Status-/Ablauf-Constraints, RLS Default-Deny und eine transaktionale
  Trigger-/Function-Sperre für `LAST_ACTIVE_ADMIN`. Danach `manage-members` mit den Operationen
  `list`, `invite`, `revokeInvitation`, `changeRole` und `deactivateMember` minimal
  implementieren. Den Einladungs-Annahmeweg so anbinden, dass nur die bestätigte
  Einladungs-E-Mail Mitglied der gebundenen Organisation und Zielrolle wird.
- [ ] **Step 3 — Service und Oberfläche:**
  Für jede Operation zuerst einen roten Vitest im Service bzw. auf der Seite schreiben, dann
  minimal implementieren. Die Mitgliederseite enthält eine semantische Tabelle mit eindeutiger
  Beschriftung, Status, Rolle und Aktionen, ein Einladungsformular sowie eine sichtbare
  Rollenmatrix. Kritische Aktionen verlangen eine Bestätigung. Die Seite nutzt vorhandene UI-
  Primitives und erfüllt WCAG 2.2 AA auf 1440, 768 und 375 px ohne horizontalen Overflow.
- [ ] **Step 4 — Routing und Zugriff:**
  Route, Lazy-Page und Sidebar ergänzen. Admins erreichen `/admin/members`; Manager und Viewer
  erhalten einen verständlichen 403-/Nicht-berechtigt-Zustand und können die Route nicht durch
  direkte URL-Eingabe verwenden.
- [ ] **Step 5 — End-to-End-Nachweis:**
  `e2e/member-management.spec.ts` zuerst für Admin-Erfolgspfade sowie Manager-/Viewer-Verbot
  schreiben. Die lokale Supabase-Testumgebung muss Einladungs-, Widerrufs-, Rollenwechsel- und
  Letzt-Admin-Fälle reproduzierbar ausführen, ohne echte E-Mails zu versenden oder Secrets zu
  benötigen.
- [ ] **Step 6 — Screenshot- und Gate-Nachweis:**
  Vorher/Nachher an 1440, 768 und 375 px erzeugen, sichtprüfen und nur die Hash-/Overflow-Matrix
  in `docs/screenshots/auftrag-067m-g59/README.md` committen. Anschließend den
  Gate-Abschlussbericht in `docs/BUILD_LOG.md` ergänzen.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
supabase test db
npx playwright test e2e/member-management.spec.ts
git diff --check
git diff 5f01ed5 -- src/simulation src/types src/context src/services/data src/features/resources
```

Für den letzten Befehl wird ein leerer Diff erwartet. Jeder rote Test, fehlende lokale
Supabase-Abhängigkeit oder nicht reproduzierbare Einladungsannahme ist ein Stopp-Punkt und wird
ehrlich im BUILD_LOG dokumentiert.

## Akzeptanzkriterien für die Prüfung

- Admin kann Mitglieder der eigenen Organisation einladen, ausstehende Einladungen widerrufen,
  Rollen ändern und Mitglieder deaktivieren.
- Manager und Viewer scheitern serverseitig mit 403; direkter URL-Aufruf und manipulierte
  Organisations-/Mitglieds-IDs erweitern keine Rechte.
- Eine Einladung führt erst nach gültiger, E-Mail-gebundener Annahme zu einer aktiven
  Mitgliedschaft in genau einer Organisation.
- Der letzte aktive Admin kann weder deaktiviert noch zu Manager/Viewer herabgestuft werden,
  auch nicht über parallele oder direkte Datenbankanfragen.
- Keine Service-Role, keine Tokens, keine Einladungstokens und keine E-Mail-Inhalte werden in
  Browser-Bundle, Log oder Screenshot geschrieben.
- UI erklärt die Rollen, ist per Tastatur bedienbar und besitzt vollständige Loading-, Empty-,
  Error- und Erfolgszustände.
- Der Schutzbereichs-Diff ist leer; alle Pflicht-Gates sind grün.

## Stopp-Punkte

- Kein `git push`, kein Merge, kein Deploy der Edge Function und kein produktives Versenden
  einer Einladung ohne ausdrückliche Freigabe von Marc.
- Keine neue npm- oder Deno-Abhängigkeit ohne schriftliche Erweiterung.
- Kein tatsächlicher Auth- oder Mandanten-Datenbestand außerhalb der lokalen Testumgebung.
- Ist der Annahmeweg mit Supabase Auth ohne sichere E-Mail-Bindung nicht belegbar: stoppen und
  Marc fragen; keine Browser- oder Service-Role-Umgehung einführen.

## Abschluss

Gate-Abschlussbericht am Ende von `docs/BUILD_LOG.md` mit Ziel, geänderten Dateien,
Funktionsnachweisen, SQL-/E2E-Ergebnissen, Screenshot-Matrix, Schutzbereichs-Diff und
Freigabestatus ergänzen. Commit-Message: `feat: add organization member and invitation management`.
Danach stoppen und an den unabhängigen Prüfer übergeben.
