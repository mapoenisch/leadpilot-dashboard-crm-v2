# AUFTRAG 043 / Gate G27 — V2.1 Regression, Accessibility und Release-Vorbereitung

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `fc48233` (`docs(g26): approve isolated screenshot baseline review`)
**Branch:** `codex/v2.1.0-design`
**Status:** FREIGEGEBEN durch Codex auf `3edfc0d` — kein Merge, Tag oder Push.

## Ziel

Gate G27 ist der abschließende lokale Nachweis für V2.1.0. Es führt keine neue Produktfunktion ein und verändert keine freigegebene Live-Oberfläche. Stattdessen belegt es reproduzierbar, dass die Gates G24 bis G26 gemeinsam regressionsfrei sind, dass die neue Live-Performance-Fläche ihre gezielten Accessibility-Anforderungen erfüllt und dass Version, Lockfile und Release-Dokumentation konsistent auf `2.1.0` vorbereitet sind.

Ein Merge nach `main`, ein Git-Tag oder ein Remote-Push gehören **nicht** zu diesem Auftrag. Auch nach einem grünen G27 entscheidet ausschließlich Marc ausdrücklich über Veröffentlichungsschritte.

## Verbindliche Entscheidungen

1. **Release-Audit statt stiller Reparatur:** Dieser Auftrag behebt keine Produkt-, Daten-, Hook- oder Stylingfehler. Jeder Befund außerhalb der erlaubten Dateien wird mit Reproduktion und Auswirkung im Builder-Bericht dokumentiert und an einen separaten Nacharbeitsauftrag zurückgegeben.
2. **Keine externen Testzugänge:** Für V2.1.0 werden keine externen Credentials bereitgestellt oder erwartet. `scripts/runLiveKpiE2e.ts` bleibt ein optionaler Betreiber-Test; `SKIPPED_NOT_CONFIGURED` ist kein G27-Blocker und wird transparent als solcher dokumentiert.
3. **Die G26-Baseline bleibt beweisbar:** Die vorhandene Matrix unter `docs/screenshots/auftrag-042/` wird nicht als dekorativer Bericht behandelt. Der G27-Release-Audit liest alle zwölf PNGs direkt vom Dateisystem, vergleicht ihre SHA-256-Werte mit der Matrix und verlangt sechs unterschiedliche Vorher-/Nachher-Paare. Der G26-Harness wird nicht umgebaut.
4. **Gezielte Accessibility statt Zertifizierungsbehauptung:** G27 belegt die neue Live-Fläche gezielt: klare Abschnittsstruktur, benannte Diagrammregionen, Text-/Tabellenalternativen, sichere Activity-Ausgabe, ehrlicher Empty-State und deaktivierte Pulse-Animation bei `prefers-reduced-motion: reduce`. Das ist keine pauschale WCAG-Zertifizierung.
5. **Versionshebung nur in Metadaten:** `package.json`, der Root-Eintrag und `packages[""]` in `package-lock.json` wechseln exakt von `2.0.0` auf `2.1.0`. Dependencies, Scripts und alle übrigen Package-Felder bleiben bytegleich.
6. **Keine künstliche Screenshot-Differenz:** G27 verändert bewusst keine Produktdarstellung. Bestehende G26-Screenshots werden verifiziert, nicht durch neue Visuals ersetzt. Ein neu erzeugter Screenshot ist nur zulässig, wenn der vorhandene Harness ihn als Teil seines normalen, vollständigen `--stage=all`-Laufs erzeugt und die gesamte Matrix danach erneut grün ist.

## Grenzen und Schutzbereiche

- Keine neue npm-Abhängigkeit, keine neue Produktionsroute, keine Telemetrie, keine Secrets und kein Cloud-Upload.
- Gegenüber `fc48233` bleiben unverändert: `src/**`, `supabase/**`, `tools/n8n/**`, `public/**`, bestehende G24–G26-Komponenten, Hooks, Verifier und Capture-Harnesses.
- Insbesondere unverändert bleiben `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/**`, `src/features/resources/**`, `src/features/crm/**`, `src/components/**`, `src/app/**` und `src/domain/**`.
- `.claude/**`, `.superpowers/**`, `.codex/**`, `.env*`, `node_modules/**` und `dist/**` sind nutzer- bzw. umgebungsverwaltet und dürfen weder gelesen noch geändert oder committed werden.
- Der Builder darf ausschließlich die unten gelisteten Dateien ändern. Fehlt eine Information für den Audit, wird der Auftrag gestoppt und der Befund dokumentiert.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_043_V2_1_REGRESSION_ACCESSIBILITY_RELEASE.md` | Diese Auftragsquelle; nach Umsetzung nur Status pflegen. |
| `scripts/verifyV21ReleaseReadiness.ts` | Deterministischer, lokaler Release-Audit für G24–G26, Versions-/Diff-Scope, G26-Hash-Matrix und Release-Dokumentation. |
| `scripts/auditV21LiveAccessibility.mjs` | Browser-Audit auf einem lokalen Produktions-Build für die semantischen und Reduced-Motion-Anforderungen der Live-Fläche. |
| `docs/accessibility/auftrag-043/README.md` | Konkretes Protokoll der Live-Flächen-Prüfung, geprüfte Selector/Attribute, Tastatur-/Fokusgrenze und bekannte Einschränkungen. |
| `docs/releases/V2.1.0.md` | Wahrheitsgemäße Release-Notiz für V2.1.0 mit Status `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`; kein Veröffentlichungsversprechen. |
| `docs/BUILD_PLAN_V2.1.0.md` | Kompakte V2.1-Roadmap und Gate-Übersicht G24–G27 mit Veröffentlichungsstatus `OFFEN — explizite Autorisierung erforderlich`. |
| `docs/BUILD_LOG.md` | Builder-Bericht mit jedem Gate-Ergebnis oder Blocker. |
| `package.json`, `package-lock.json` | Ausschließlich die drei Versionsfelder auf `2.1.0`; keine Dependency- oder Script-Änderung. |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Roten Release-Audit vor Metadatenänderungen anlegen

Erstelle zuerst `scripts/verifyV21ReleaseReadiness.ts`. Der erste Lauf auf `fc48233` muss wegen fehlender V2.1-Metadaten und fehlender G27-Artefakte fehlschlagen. Diesen Rot-Nachweis im Builder-Bericht festhalten.

Der Verifier muss mit Exit 1 abbrechen, wenn mindestens eine der folgenden Bedingungen nicht erfüllt ist:

1. `package.json.version`, `package-lock.json.version` und `package-lock.json.packages[""].version` sind exakt `2.1.0`.
2. `docs/releases/V2.1.0.md` existiert, nennt `2.1.0`, Baseline `fc48233`, die vier Gates G24 bis G27, alle enthaltenen Funktionen und den Builder-Status `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`. Die Datei darf weder `TAG/PUSH AUTORISIERT` noch eine Behauptung enthalten, Veröffentlichung sei erfolgt.
3. `docs/BUILD_PLAN_V2.1.0.md` existiert, nennt die G24-, G25- und G26-Freigabe auf ihren tatsächlichen Commits sowie G27 als laufendes Release-Gate. Der Status für Merge, Tag und Push lautet wörtlich `OFFEN — explizite Autorisierung erforderlich`.
4. `docs/BUILD_LOG.md` enthält die unabhängigen Freigaben für G24 (`2cba81b`), G25 (`e243dca`) und G26 (`fc48233`) sowie noch keinen falschen V2.1-Veröffentlichungsanspruch.
5. Die bestehenden Verifier-Dateien für Katalog, Stream und Oberfläche existieren und liefern in einem Child-Prozess Exit 0: `verifyLiveKpiCatalog.ts`, `verifyLiveKpiStream.ts` und `verifyLivePerformanceSurface.ts`.
6. `docs/screenshots/auftrag-042/README.md` und exakt zwölf Dateien `dashboard-<viewport>-<stage>-<mode>.png` existieren. Der Verifier liest jeden PNG-Buffer selbst ein, berechnet SHA-256 und prüft den Hash gegen die jeweilige README-Zeile. Für jedes der sechs Paare (1440/768/375 × Deep-Link/Reload) müssen Vorher- und Nachher-Hash verschieden sein.
7. Der Git-Diff von `fc48233` bis `HEAD` enthält nur die in diesem Auftrag erlaubten Dateien. In `package.json` darf ausschließlich der Versionswert abweichen; in `package-lock.json` ausschließlich Root-`version` und `packages[""].version`.
8. Der Diff gegen `fc48233` für `src`, `supabase`, `tools/n8n`, `public`, die bestehenden G24–G26-Dateien und ihre Screenshots ist leer.

Der Verifier darf keine Produktwerte, Fixtures oder Geheimnisse ausgeben. Verwende Node-Standardbibliothek, `tsx` und bereits vorhandene Abhängigkeiten; keine neue Dependency.

### 2. Accessibility-Audit für die Live Performance Surface

Erstelle `scripts/auditV21LiveAccessibility.mjs` nach dem kontrollierten CDP-Muster aus `scripts/captureAuftrag042GateScreenshots.mjs`.

1. Baue die aktuelle App lokal produktiv, starte eine lokale Vite-Preview auf einem freien Port und verwende ein temporäres Browserprofil. Alle Kindprozesse, Profilordner und Preview-Prozesse müssen in `finally` sowie bei `SIGINT` und `SIGTERM` geschlossen werden.
2. Prüfe `/dashboard` per Deep-Link und nach explizitem `Page.reload` jeweils auf 1440 × 900 und 375 × 812: Titel, `<main>`, kein 404-Fallback und `scrollWidth === clientWidth`.
3. Prüfe die Live-Fläche über ihre bestehenden Test-IDs: genau eine `live-performance-section`, mindestens drei `live-kpi-card`, je eine Region für ARR-Graph, ARR-Mix, Funnel und Activity-Feed. Jede Diagrammfläche benötigt einen zugänglichen Namen (`aria-label`, `aria-labelledby` oder `role="region"` mit benannter Überschrift); textliche Tabelle bzw. erklärter Empty-State bleibt ohne Rohdaten sichtbar erreichbar.
4. Prüfe die sichere Activity-Grenze im gerenderten DOM: Kein sichtbarer Text oder Attributname enthält `eventId`, `correlationId`, `sourceSystem`, `raw_context` oder `context`. Der Feed bleibt mit `aria-live="polite"` gekennzeichnet.
5. Setze per CDP `prefers-reduced-motion: reduce`. Der Audit prüft im berechneten Stil eines vorhandenen `.live-kpi-pulse`, dass keine laufende Pulse-Animation aktiv ist. Er dokumentiert, wenn aufgrund fehlender bestätigter Live-Snapshots kein Pulse-Element gerendert wird; in diesem Fall muss die statische `verifyLivePerformanceSurface.ts`-Prüfung für die Reduced-Motion-Regel zusätzlich grün sein.
6. Prüfe, dass der unkonfigurierte lokale Zustand weder `0 €` noch eine Fixture-/Demo-Kennzeichnung als Ersatzwert ausgibt. Das Ergebnis lautet dann explizit „ehrlicher Empty-State geprüft“, nicht „Live-Daten geprüft“.

Schreibe die konkreten DOM-Nachweise, Viewports, Deep-Link-/Reload-Ergebnisse, Reduced-Motion-Ergebnis und die Prüfgrenze in `docs/accessibility/auftrag-043/README.md`. Keine pauschale WCAG-Konformität behaupten.

### 3. Versions- und Release-Dokumentation

1. Ändere die drei Versionsfelder exakt auf `2.1.0` und prüfe danach per JSON-Parse, dass keine weiteren Package-/Lockfile-Inhalte verändert wurden.
2. Erstelle `docs/releases/V2.1.0.md` mit: Version, Datum, Baseline `fc48233`, enthaltenen G24–G26-Gates, den neuen Live-KPI-Fähigkeiten (Katalog, isolierter Stream, Live Surface), geänderten und bewusst unveränderten Bereichen, lokaler Verifikationsmatrix, Accessibility-Grenze, Screenshot-Nachweis und folgendem Status:

   ```text
   BEREIT ZUR UNABHÄNGIGEN PRÜFUNG
   Veröffentlichung: OFFEN — explizite Autorisierung erforderlich
   ```

3. Erstelle `docs/BUILD_PLAN_V2.1.0.md` mit der seriellen Abhängigkeit `G24 → G25 → G26 → G27`, den Baselines/Commits und derselben offenen Veröffentlichungsregel. Es enthält keine Spekulation über externe Credentials.

### 4. Vollständiger lokaler Nachweis

Führe nach allen Änderungen exakt diese Befehle aus und protokolliere Exit-Code sowie relevante Zählwerte im Builder-Bericht:

```bash
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLiveKpiStream.ts
npx tsx scripts/verifyLivePerformanceSurface.ts
npx tsx scripts/verifyV21ReleaseReadiness.ts
node scripts/auditV21LiveAccessibility.mjs
node scripts/generateAuftrag042ScreenshotMatrix.mjs
npx tsx scripts/verifyLiveKpiContract.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsx scripts/runLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npx tsx scripts/testButtonLoading.ts
npx tsx scripts/verifyNoModuleViewCascades.ts
npm run build
git diff --check fc48233..HEAD
git diff --exit-code fc48233..HEAD -- src supabase tools/n8n public
```

Der externe Runner darf `SKIPPED_NOT_CONFIGURED` ausgeben und wird als optional dokumentiert. Jeder andere Fehler blockiert G27. Falls `generateAuftrag042ScreenshotMatrix.mjs` aufgrund einer frischen CDP-Erfassung Dateien verändert, müssen die neue Matrix und alle zwölf Hashes wieder vollständig grün sein; ansonsten ist das ein Blocker.

## Builder-Bericht und Commit

Ergänze am Anfang von `docs/BUILD_LOG.md` einen Abschnitt **„Gate G27 – Auftrag 043: V2.1 Regression, Accessibility und Release-Vorbereitung“** mit:

- Baseline und Arbeits-Commit;
- Rot-/Grün-Nachweis des Release-Verifiers;
- der exakten Versionsparität der drei Felder;
- allen G24–G26-Nachweisen und der frischen G26-Hashprüfung;
- dem Accessibility-Protokoll samt klarer Grenzen;
- dem optionalen Status von `runLiveKpiE2e.ts`;
- vollständiger Command-Matrix, Schutzbereichs-Diff und dem Ergebnis `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG`.

Erstelle danach einen einzelnen fokussierten Commit, zum Beispiel:

```bash
git commit -m "chore(release): prepare v2.1.0 regression and accessibility gate"
```

Weder `main`, ein Git-Tag noch ein Remote dürfen verändert werden.

## Akzeptanzkriterien für Codex

- Der V2.1-Release-Audit scheitert nachweisbar ohne Metadaten und besteht erst mit vollständigen, konsistenten G24–G27-Nachweisen.
- Die drei Paket-/Lockfile-Versionen sind exakt `2.1.0`; Package-Scope und G27-Diff bleiben minimal.
- Die zwölf G26-PNGs stimmen byte- und hashgenau mit der Matrix überein; alle sechs Paare sind unterschiedlich.
- Deep-Link und Reload auf Desktop und Mobile bestehen im Accessibility-Audit ohne horizontalen Overflow; die neue Live-Fläche behält benannte Regionen, sichere Activity-Ausgabe, ehrliche Empty-States und Reduced-Motion-Schutz.
- Alle lokalen Befehle enden mit Exit 0, außer dem ausdrücklich optionalen externen Runner mit transparentem `SKIPPED_NOT_CONFIGURED`.
- Schutzbereiche und Produktcode bleiben gegen `fc48233` unverändert.
- Die Release-Dokumentation behauptet keine Veröffentlichung. Merge, Tag und Push bleiben offen, bis Marc sie ausdrücklich autorisiert.

**Abnahme:** Erst nach unabhängigem Codex-Review aller lokalen PASS-Nachweise ist Gate G27 freigegeben. Diese Freigabe veröffentlicht nichts automatisch.

## Verbindliche Nacharbeit nach Codex-Review

### P1 — Empty-State-Audit muss den verbotenen Nullwert tatsächlich erkennen

Der aktuelle Audit behauptet in Protokoll und Release-Notiz „kein `0 €`-Platzhalter“, prüft aber nur explizite Dummy-Labels und `N/A`-Kombinationen. Die zuvor vorhandene Nullwert-Prüfung wurde gelockert, statt ihren Fehlalarm einzugrenzen. Damit kann der Audit bei `0 €`, `0,00 €` oder `0.00 €` im unkonfigurierten Live-Bereich weiterhin grün sein.

1. Implementiere im Audit eine kleine, lokal getestete Erkennung für lokalisierte Euro-Nullwerte. Der Testfall `0 €`, `0,00 €` und `0.00 €` muss positiv sein; ein Statussatz wie `Supabase nicht konfiguriert – keine Live-ARR-Historie verfügbar.` negativ.
2. Wende sie nur auf den unkonfigurierten bzw. bestätigungslosen Live-Empty-State an, nicht auf bestätigte Live-Snapshots. Der Audit muss bei einem sichtbaren Null-Euro-Ersatzwert in diesem Zustand mit Exit 1 abbrechen.
3. Der Rot-Nachweis darf nicht durch ein breiteres oder schwächeres Regex ersetzt werden. Nach der Korrektur müssen Audit, Accessibility-Protokoll, Builder-Bericht und Release-Notiz den tatsächlich ausgeführten Nachweis beschreiben.

### P1 — Zugänglicher Name darf nicht aus `role="region"` abgeleitet werden

Der aktuelle Audit wertet ein vorhandenes `role` allein als zugänglichen Namen. `role="region"` beschreibt die Semantik, liefert aber keinen Namen. Eine unbenannte Region könnte deshalb den Audit bestehen.

1. Akzeptiere eine Diagrammregion nur bei nichtleerem `aria-label`, bei einem auflösbaren `aria-labelledby` mit nichtleerem Zieltext oder bei einem benannten übergeordneten Bereich. `role` ohne Benennung ist kein PASS-Kriterium.
2. Ergänze einen Rot-Nachweis für eine Region mit nur `role="region"`; dieser Zustand muss den Audit mit Exit 1 beenden.

### P2 — Release-Dokumentation muss zum tatsächlichen Lauf konsistent bleiben

Der unabhängige Lauf von `verifyV21ReleaseReadiness.ts` meldet aktuell `54 passed, 0 failed`; Build-Log und Release-Notiz behaupten `52/52`. Zudem enthält der V2.1-Bauplan für G27 noch `TBD`, obwohl der Builder-Status bereits zur unabhängigen Prüfung vorliegt.

1. Verwende nach dem frischen Grün-Lauf ausschließlich dessen echte Zählwerte in BUILD_LOG, Release-Notiz und Accessibility-Protokoll.
2. Ersetze `TBD` in `docs/BUILD_PLAN_V2.1.0.md` durch einen konkreten, wahrheitsgemäßen G27-Status ohne Freigabe oder Veröffentlichungsanspruch.
3. Der Release-Verifier muss die widersprüchlichen Zählwert- und Platzhalterzustände ablehnen.

Erst nach diesen Nachweisen wird der Status wieder auf `BEREIT ZUR UNABHÄNGIGEN PRÜFUNG` gesetzt. Kein Merge, Tag oder Push.

---

## Umsetzung der Nacharbeit (2026-09-08)

Nacharbeit auf `codex/v2.1.0-design`, Baseline `fc48233`. Nur erlaubte Dateien geändert; kein Produktcode; Schutzbereiche unberührt.

### P1 — Whitespace-Gate
- **Rot:** `git diff --check fc48233..HEAD` meldete drei Trailing-Whitespace-Fehler in `scripts/auditV21LiveAccessibility.mjs` (`:319`, `:321`, `:322`).
- **Grün:** Block neu geschrieben; `git diff --check` gegen die Baseline ohne Ausgabe, Exit 0.

### P1 — Accessible-Name-Audit belastbar
- Zentrale reine Funktion `computeAccessibleName(info)` (einzige Quelle, in die Seite injiziert **und** lokal getestet). Ein Name entsteht nur aus nichtleerem `aria-label`, **vollständig** auflösbarem `aria-labelledby` (jede ID im DOM + nichtleerer Text) oder **echtem** benannten Parent (`el.parentElement.closest('[aria-label],[aria-labelledby]')`). `role="region"` allein ist kein PASS.
- Lokale Negativtests (`runSelfTests`, kein Browser, Exit 1 bei Kippen): nur `role="region"`; leeres/whitespace `aria-labelledby`; nicht bzw. nur teilweise auflösbares `aria-labelledby`; aufgelöstes, aber textloses Ziel.
- **Grün:** 23/23 Selbsttests; vier Live-Regionen weiterhin PASS über nichtleeres `aria-label`.

### P1 — Null-Euro-Empty-State
- Reine Funktion `containsFakeEuroZero` = `/(?<![\d.,])0(?:[.,]00)?\s*€/` — **enger** als die frühere `\b`-Variante.
- Gating in reiner Funktion `evaluateFakeEuroZero({ sectionText, cardTexts })`: greift nur, wenn ein Empty-State vorliegt **und** kein bestätigter Snapshot nach **stabiler** Definition existiert — `isConfirmedSnapshotText` = sichtbarer Status „Live Realtime" **und** „Aktualisiert:" in einer `live-kpi-card`. **Nicht** vom transienten `.live-kpi-pulse`-Overlay abgeleitet. Bei sichtbarem Null-Euro-Ersatzwert in diesem Zustand bricht der Audit mit Exit 1 ab.
- Lokale Testfälle: positiv `0 €`, `0,00 €`, `0.00 €`; negativ `Supabase nicht konfiguriert – keine Live-ARR-Historie verfügbar.` sowie echte Beträge `1.240.000,00 €`, `10 €`, `120,00 €`; Snapshot-Definition positiv/negativ; **bestätigter Snapshot ohne Pulse + `0 €` → NICHT geflaggt**. **Grün:** alle bestanden.

### P2 — Release-Verifier und Dokumentation
- `verifyV21ReleaseReadiness.ts` erzwingt die tatsächlichen Zählwerte `54/54` (Release-Audit) und `57/57` (Accessibility-Audit) in BUILD_LOG, Release-Notiz und Accessibility-Protokoll; lehnt offene Platzhalter (Release-Notiz / BUILD_PLAN / A11y-Protokoll) und widersprüchliche `NN/NN`-Zählwerte in aktuellen Ergebniszeilen ab; Selbst-Zählwert-Kontrakt `passed === 54`.
- `auditV21LiveAccessibility.mjs` bricht ab, wenn der eigene Lauf ≠ `57/57` ist.
- `docs/BUILD_PLAN_V2.1.0.md`: `95de1c9` **nicht** mehr als G27-Freigabe-Commit; Freigabe-Commit _offen_; wahrheitsgemäßer Status ohne Freigabe/Veröffentlichungsanspruch. Vorherige Doku-Regression `58/58` / `65/65` auf `54/54` / `57/57` korrigiert.

### Verifikation (Exit 0, sofern nicht anders vermerkt)
`npx tsx scripts/verifyV21ReleaseReadiness.ts` → 54/54 · `node scripts/auditV21LiveAccessibility.mjs` → 57/57 (+ 23/23 Selbsttests) · `npx tsc --noEmit` · `npm run verify` · `npm run build` · `git diff --check fc48233..HEAD` · `git diff --exit-code fc48233..HEAD -- src supabase tools/n8n public` · `npx tsx scripts/runLiveKpiE2e.ts` → `SKIPPED_NOT_CONFIGURED` (optional).

### Nachtrag (2026-09-08) — P1: `hasConfirmedSnapshot` nicht aus `.live-kpi-pulse`
- **Rot:** bestätigter Zustand wurde aus `.live-kpi-pulse` abgeleitet; der Pulse rendert nur transient bei `shouldAnimate` (Wertwechsel), nicht bei jedem Snapshot und nicht dauerhaft.
- **Grün:** stabile, sichtbare Definition aus bestehenden Karten (`isConfirmedSnapshotText`: „Live Realtime" **und** „Aktualisiert:"), kombiniert in der reinen Funktion `evaluateFakeEuroZero`. Keine Produktkomponente geändert.
- Neuer lokaler Negativtest: bestätigter Snapshot ohne Pulse + `0 €` darf **nicht** als Fake-Nullwert gelten. Selbsttests **16 → 23**, alle grün; Audit 57/57, Release-Verifier 54/54, `tsc`, `npm run verify`, `npm run build`, Whitespace- und Schutzbereichs-Diff erneut grün.

Vollständiges Protokoll: `docs/BUILD_LOG.md` (oberste zwei Abschnitte). **Kein Merge, Tag oder Push.**
