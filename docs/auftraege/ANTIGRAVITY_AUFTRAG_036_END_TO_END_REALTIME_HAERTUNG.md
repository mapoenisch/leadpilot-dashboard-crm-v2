# Auftrag 036: End-to-End-Realtime-Härtung

> **Für ausführende Agenten:** Dieser Auftrag wird seriell und ausschließlich auf Branch `codex/v2.0.0` bearbeitet. Ausschließlich die hier benannten Dateien dürfen verändert oder neu angelegt werden. Nach jeder Änderung gelten die in Abschnitt „Verifikation“ aufgeführten Gates. Der abschließende Builder-Bericht wird in `docs/BUILD_LOG.md` festgehalten; erst danach erfolgt der unabhängige Codex-Review.

**Phase:** Phase 4 – Reale Integrationen & Live-Datenfluss
**Gate:** G20
**Status:** BEREIT ZUR AUSFÜHRUNG
**Branch:** `codex/v2.0.0`
**Baseline:** `5758a6e` (`merge: integrate reviewed G14-G19 work into v2.0.0 branch`)
**Planquelle:** `docs/BUILD_PLAN_V2.0.0.md`, Phase 4, Auftrag 036 / Gate G20
**Architektur:** `ARCHITECTURE_DECISIONS.md` (Ebene A: historisch, read-only; Ebene B: Simulation, deterministisch; Ebene C: Live-Ist, getrennt)

---

## 1. Ziel & Kontext

Den in Auftrag 034 (G18) und 035 (G19) aufgebauten und isolierten Live-KPI-Pfad:
`n8n Webhook → Supabase Ingest RPC (live_kpi_events) → Trigger-Projektion (live_kpi_public_feed) → Read-Adapter → useLiveKpi Hook → LiveKpiCard`
auf Belastbarkeit, Nachvollziehbarkeit und ehrliche Fehlerbehandlung härten.

Die Härtung umfasst vier tragende Säulen:
1. **Deterministischer lokaler Preflight-/Audit-Test (`scripts/verifyLiveKpiE2e.ts`):** Verifiziert offline die gesamte Logikkette, Tie-Breaking, Contract-Rejections, Race-Condition-Schutz, Channel-Lifecycle und Secret-Freiheit.
2. **Kontrollierter externer E2E-Runner (`scripts/runLiveKpiE2e.ts`):** Erlaubt Operatoren die reale Ausführung gegen ein live bereitgestelltes n8n- und Supabase-Setup. Meldet ohne explizit konfigurierte Umgebung transparent `SKIPPED_NOT_CONFIGURED` und behauptet niemals einen Scheinerfolg.
3. **Erweiterte sichere Observability (`LiveKpiCard.tsx`, `useLiveKpi.ts`, `liveKpiReadAdapter.ts`):** Visualisiert Quelle, Qualitätszustand, Aktualisierungsfrische und Verbindungszustand sauber und verständlich — ohne jemals technische Rohdaten, UUIDs, Kontexte oder Secrets im Browser zu exponieren.
4. **Operator-Dokumentation & visueller Nachweis:** Vollständige Anleitung in `tools/n8n/README.md`, Screenshot-Harness und Matrix für Auftrag 036 sowie Builder-Bericht in `docs/BUILD_LOG.md`.

---

## 2. Sicherheits- und Isolationsarchitektur

1. **Kein Browserzugriff auf Rohdaten:**
   - Der Browser liest und abonniert ausschließlich `public.live_kpi_public_feed`.
   - `public.live_kpi_events` und `public.live_kpi_rejections` bleiben für `anon`, `authenticated` und `PUBLIC` ohne Zugriffsrechte.
2. **Secret-Leak-Prävention:**
   - Keine Token, JWTs, Connection-Strings oder Passwörter in Code, Fixtures oder Workflows.
   - Der E2E-Runner liest Credentials ausschließlich aus lokalen Umgebungsvariablen und maskiert sensible Werte in Konsolenausgaben.
3. **Ehrlichkeit bei externen Tests:**
   - Ist `LIVE_KPI_E2E_ENABLE=true` nicht gesetzt oder fehlen Verbindungsdaten, beendet sich `scripts/runLiveKpiE2e.ts` mit Status `SKIPPED_NOT_CONFIGURED`. Es wird kein Exit-0-Erfolg vorgegaukelt.
4. **Schutzbereiche & Branch-Disziplin:**
   - Keine Änderungen an `src/simulation/`, Baselines, CRM-Seeder, Internal Resources oder `main`.
   - Branch `main` bleibt während der gesamten Durchführung unberührt.

---

## 3. Detail-Spezifikation der Komponenten

### 3.1 Deterministischer Preflight-Test (`scripts/verifyLiveKpiE2e.ts`)
Der Preflight prüft ohne externe Netzanbindung:
- **Contract & Tie-Breaking:**
  - Zwei Events mit identischem `occurred_at`, aber unterschiedlichem `ingested_at`: Das neuere `ingested_at` setzt sich deterministisch durch.
  - Mehrere Events in schneller Folge (High-Frequency Bursts): Neuestes Event bestimmt Snapshot.
- **Contract Rejection Parity:**
  - Rejection-Fälle (ungültiger Timestamp ohne Zeitzone, falsche Contract-Version, String statt Number) erzeugen keinen Eintrag im öffentlichen Feed.
  - Rejections enthalten im Persistenzmodell immer `{}` als `sanitized_context`.
- **Channel Lifecycle & Race-Schutz:**
  - `useLiveKpi` verwirft Stale-Responses bei schnellem KPI-Wechsel.
  - Reconnect nach Channel-Error holt aktuellen Snapshot lückenlos nach.
  - Unmount invalidiert Effect vor `unsubscribe()`.
- **Secret Audit:**
  - Statischer Scan aller G18-, G19- und G20-Dateien auf JWTs, Passwörter und Datenbank-URLs.

### 3.2 Kontrollierter externer E2E-Runner (`scripts/runLiveKpiE2e.ts`)
- **Umgebungsvariablen:**
  - `LIVE_KPI_E2E_ENABLE` (`true`/`false`)
  - `LIVE_KPI_E2E_N8N_WEBHOOK_URL` (z.B. `https://n8n.example.com/webhook/live-kpi-ingest`)
  - `LIVE_KPI_E2E_SUPABASE_URL`
  - `LIVE_KPI_E2E_SUPABASE_ANON_KEY`
- **Ablauf bei Konfiguration:**
  1. Ping / Health-Check auf Supabase Public Feed.
  2. Senden eines validen Test-Events via n8n Webhook.
  3. Verifizieren des Ingests in `public.live_kpi_public_feed` innerhalb eines Timeouts (Polling / Realtime).
  4. Senden eines Duplikat-Events: Verifizieren der Idempotenz (kein doppelter Feed-Eintrag).
  5. Senden eines ungültigen Events: Verifizieren, dass der Feed unverändert bleibt.
  6. Schnelle Folge von zwei Events mit Zeitstempel-Tie-Break: Verifizieren des deterministischen Endstands.
- **Ablauf ohne Konfiguration:**
  - Ausgabe: `[LiveKpiE2e] External E2E test skipped: LIVE_KPI_E2E_ENABLE is not set. (SKIPPED_NOT_CONFIGURED)`.
  - Beendet mit speziellem Skip-Exit-Code (Exit 0 mit dokumentiertem Skip-Log).

### 3.3 Erweiterte Observability in der Oberfläche
In `src/components/liveKpi/LiveKpiCard.tsx`:
- **Header:**
  - Titel, Badge `Ebene C`.
  - Status-Badge (`Live Realtime`, `Warte auf Feed`, `Offline (Lokal)`, `Verbindungsfehler`).
  - Latenz-/Frische-Indikator: Zeigt relativen Zeitabstand (z.B. „vor 5 Sek.“ / „vor 2 Min.“) oder absolute Uhrzeit bei Hover/Tooltip.
- **Body:**
  - Große Kennzahl mit Einheit.
  - Qualitätszustand:
    - `valid`: Dezent grün / normal.
    - `degraded`: Auffälliges Badge „Qualität eingeschränkt (Degraded)“ mit Erläuterung („Datenquelle meldet unvollständige Telemetrie“).
- **Footer:**
  - Quellsystem: Z.B. `n8n / hubspot-service` oder `Quelle: n8n-Live-Feed`.
  - Technischer Modus: Klar gekennzeichnet als Ebene C Live-Projektion.
  - Absolut KEINE internen IDs, Passwörter oder Payload-Dumps.

---

## 4. Zulässige Ziel-Dateien

| Datei | Aufgabe |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_036_END_TO_END_REALTIME_HAERTUNG.md` | Diese Auftragsspezifikation. |
| `scripts/verifyLiveKpiE2e.ts` | Deterministischer lokaler Preflight- und Härtungstest. |
| `scripts/runLiveKpiE2e.ts` | Kontrollierter externer E2E-Runner mit ehrlichem Skip-Verhalten. |
| `src/services/liveKpi/liveKpiReadAdapter.ts` | Ggf. Hilfsfunktionen für Latenz/Observability. |
| `src/hooks/useLiveKpi.ts` | Erweiterte Status- und Frische-Metadaten im Hook. |
| `src/components/liveKpi/LiveKpiCard.tsx` | Erweiterte V2-Observability (Frische, Qualität, Quelle, Status). |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | Dashboard-Einbindung der gehärteten Karte. |
| `tools/n8n/README.md` | Operator-Anleitung für den externen E2E-Lauf. |
| `scripts/captureAuftrag036GateScreenshots.mjs` | Screenshot-Harness für Auftrag 036. |
| `scripts/generateAuftrag036ScreenshotMatrix.mjs` | SHA-256 Matrix-Generator für Auftrag 036. |
| `docs/screenshots/auftrag-036/README.md` | Screenshot-Dokumentation & Matrix. |
| `docs/BUILD_LOG.md` | Builder-Bericht für Gate G20. |

Keine anderen Dateien verändern. Insbesondere die Schutzbereiche bleiben unangetastet:
- `src/simulation/**`
- `src/types/**`
- `src/context/**`
- `src/services/data/**`
- `src/services/db/supabaseClient.ts`
- `src/features/resources/**`
- Branch `main`

---

## 5. Verifikation & Pflicht-Gates

Vor Abschluss des Auftrags müssen folgende Gates auf Branch `codex/v2.0.0` fehlerfrei durchlaufen:

```bash
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiContract.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check 5758a6e..HEAD
git diff --exit-code 5758a6e..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources
```

Zusätzlich:
- Screenshots vorher/nachher für `/dashboard` auf 1440px, 768px, 375px via `scripts/captureAuftrag036GateScreenshots.mjs`.
- Hash-Matrix via `scripts/generateAuftrag036ScreenshotMatrix.mjs` mit 3/3 DISTINCT Paaren und 0px horizontalem Overflow.
