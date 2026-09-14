# AUFTRAG 068 / Gate G28 (Fortsetzung) — Login-Bootstrap im Browser-E2E-Runner nachrüsten

**Baseline:** `2fd09ee` (Auftrag 067 freigegeben, Env-Var-Umbenennung abgeschlossen) · **Branch:**
`codex/g28-supabase-live-inbetriebnahme` (bestehender Branch, kein neuer) · **Status:** OFFEN

Marc hat nach Auftrag 067 die manuelle G28-Vorbereitung (Supabase-Migrationen, `n8n_ingest`-
Passwort, n8n-Workflow-Import, `.env`-Konfiguration) abgeschlossen und den Webhook produktiv
geschaltet (n8n „Publish"). Der reale Lauf von `scripts/runLiveKpiE2e.ts` gegen die echte
Infrastruktur zeigt: **Phase 1 (Backend, Schritte 1–7 von 11) ist vollständig grün** — Contract-
Validierung, Webhook-Ingest, Trigger-Projektion, öffentlicher Lesezugriff, Idempotenz, Rejection-
Handling und Tie-Breaking funktionieren nachweislich Ende-zu-Ende gegen das produktive Supabase-
Projekt und den produktiven n8n-Webhook.

**Phase 2 (Browser-Verifikation, Schritte 8–11) schlägt strukturell fehl:**

```
[8/11] Browser-Setup: Baue App mit Test-Supabase-Konfiguration...
[Navigate] Lade http://127.0.0.1:4210/dashboard...
❌ EXTERNER E2E RUNNER FEHLGESCHLAGEN:
  Grund: Assertion failed: LiveKpiCard (data-testid="live-kpi-card") ist im echten DOM gerendert
```

## Ursache (verifiziert)

`scripts/runLiveKpiE2e.ts` wurde in Gate G20 (Auftrag 036) gebaut — **vor** Auftrag 060, der alle
41 regulären Routen hinter `<ProtectedRoute>` gelegt hat. Der Runner navigiert per CDP
(`Page.navigate`) direkt zu `/dashboard` (Zeile 598), ohne jemals eine Auth-Session herzustellen.
Seit Auftrag 060 leitet `<ProtectedRoute>` einen nicht angemeldeten Zugriff auf `/dashboard`
client-seitig auf `/login` um — dort existiert keine `LiveKpiCard`, die Assertion in Zeile 603
schlägt zwangsläufig fehl. Das ist keine Fehlkonfiguration bei Marc, sondern eine Lücke zwischen
zwei zeitlich getrennten Gates, die dieser Auftrag schließt.

## Vorhandener Präzedenzfall (wiederverwenden, nicht neu erfinden)

Im Repo existiert bereits exakt der Mechanismus, den der Runner braucht:

- `src/auth/localAuthAdapter.ts`: exportierte Konstante `AUTH_STORAGE_KEY = 'leadpilot_auth_session'`.
  `getSession()` liest ausschließlich diesen `localStorage`-Key und erwartet `{ id: string, email: string }`
  als JSON — es wird **keine** Passwortprüfung zur Laufzeit erneut durchgeführt, `ProtectedRoute`
  verlangt nur eine vorhandene Session.
- `e2e/global-setup.ts` (Playwright): löst exakt dasselbe Problem für die Playwright-Suite, indem es
  einmalig über das echte Login-Formular anmeldet und den entstandenen `storageState`
  (inkl. `leadpilot_auth_session`-Eintrag) für alle Tests wiederverwendet.

Für den CDP-basierten Runner ist der robustere Weg (kein fragiles Form-Filling über
`Runtime.evaluate`, kein Event-Dispatch-Risiko bei React-controlled Inputs) die **direkte
`localStorage`-Injection**, analog zu dem, was `LocalAuthAdapter.login()` bei Erfolg selbst
schreiben würde.

## Verbindliche Entscheidungen

1. **Login-Bootstrap statt Formular-Interaktion.** Vor der ersten Navigation zu `/dashboard`
   (aktuell Zeile 597–599 in `scripts/runLiveKpiE2e.ts`):
   - Zunächst zu einer beliebigen Route auf dem Preview-Origin navigieren (z. B. `/dashboard` wie
     bisher — der clientseitige Redirect nach `/login` ist unschädlich, das Dokument lädt trotzdem
     auf dem richtigen Origin).
   - Per `Runtime.evaluate` `localStorage.setItem(...)` mit demselben Key/Value-Format wie
     `LocalAuthAdapter.login()` ausführen: `{ id: 'demo-user-id', email: <demo-email> }`. Den
     Storage-Key **nicht** als neues Literal duplizieren, sondern `AUTH_STORAGE_KEY` aus
     `../src/auth/localAuthAdapter.js` importieren (der Runner importiert bereits
     `validateLiveKpiEvent` aus `src/`, das Muster ist etabliert).
   - Danach erneut zu `/dashboard` navigieren (Reload/Re-Navigate erforderlich, da `AuthProvider`
     die Session nur beim Mount aus `localStorage` liest).
   - Erst danach die bestehende Assertion auf `live-kpi-card` (Zeile 602–604) ausführen.
2. **Keine Passwort-Prüfung nötig.** `getSession()` validiert nur Vorhandensein/Form der
   Session, nicht die Herkunft — ein echter Login-Formular-Durchlauf ist für diesen Zweck nicht
   erforderlich und würde nur Fragilität hinzufügen.
3. **Schritt 11 (Wegnavigation zu `/crm` und zurück, Zeile 691–704) braucht keine erneute
   Injection** — die Session bleibt im selben Chrome-Prozess über Navigationen hinweg in
   `localStorage` erhalten.
4. **`scripts/verifyLiveKpiE2e.ts` ergänzen:** Ein zusätzlicher statischer Preflight-Check (analog
   zu Punkt 6 im bestehenden Kopfkommentar) verifiziert, dass `runLiveKpiE2e.ts` vor der ersten
   `/dashboard`-Assertion tatsächlich eine `AUTH_STORAGE_KEY`-Injection enthält — damit dieser
   Regressionsfall nicht unbemerkt wieder auftreten kann, falls der Runner künftig weiter verändert
   wird.
5. **Keine Änderung an `src/auth/**`, `ProtectedRoute` oder dem Auth-Verhalten selbst.** Der Fix
   lebt ausschließlich in `scripts/runLiveKpiE2e.ts` (und dem Preflight-Check in
   `scripts/verifyLiveKpiE2e.ts`) — die App-seitige Auth-Logik aus Auftrag 060 ist korrekt und
   bleibt unangetastet.

## Grenzen und Schutzbereiche

Ausschließlich `scripts/runLiveKpiE2e.ts` und `scripts/verifyLiveKpiE2e.ts` werden geändert.
`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`,
`src/features/resources/**` sowie `src/auth/**` bleiben komplett unangetastet:
`git diff 2fd09ee -- src/simulation src/types src/context src/services/data src/features/resources src/auth`
muss leer sein.

## Blöcke

### Block A — Login-Bootstrap im Runner
`scripts/runLiveKpiE2e.ts` gemäß Entscheidung 1–3 anpassen.

### Block B — Preflight-Regressionsschutz
`scripts/verifyLiveKpiE2e.ts` gemäß Entscheidung 4 ergänzen.

### Block C — Verifikation & Bericht
Standard-Verifikation, Builder-Bericht in `docs/BUILD_LOG.md`.

## Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm run verify
npm test
npm run build
npx playwright test
npx tsx scripts/runLiveKpiE2e.ts        # muss weiterhin ehrlich SKIPPED_NOT_CONFIGURED melden (keine Live-Infra im Builder-Kontext)
npx tsx scripts/verifyLiveKpiE2e.ts     # neuer Preflight-Check muss grün sein
git diff 2fd09ee -- src/simulation src/types src/context src/services/data src/features/resources src/auth   # leer
```

Der reale 11/11-Lauf gegen die produktive Infrastruktur (n8n + Supabase) bleibt **Marcs manueller
Schritt nach Freigabe dieses Auftrags** — analog zum Vorgehen bei Auftrag 067. Phase 1 (1–7) ist
bereits nachweislich grün gelaufen (siehe oben); nach diesem Auftrag wird Marc Phase 2 (8–11)
gegen dieselbe Infrastruktur verifizieren.

## Akzeptanzkriterien für die Prüfung

- Der Runner injiziert nachweislich eine valide `leadpilot_auth_session` in `localStorage`, bevor
  die erste `live-kpi-card`-Assertion geprüft wird.
- Der Storage-Key wird aus `src/auth/localAuthAdapter.ts` importiert, nicht als neues Literal
  dupliziert.
- Kein Eingriff in `src/auth/**` oder das App-seitige Auth-Verhalten.
- `verifyLiveKpiE2e.ts` erkennt zuverlässig, wenn die Injection aus dem Runner wieder entfernt
  würde (echter Regressionsschutz, kein Alibi-Check).
- Ohne gesetzte `LIVE_KPI_E2E_*`-Variablen meldet der Runner weiterhin ehrlich
  `SKIPPED_NOT_CONFIGURED` (Exit 0) — das Verhalten für den unkonfigurierten Fall darf sich nicht
  ändern.
