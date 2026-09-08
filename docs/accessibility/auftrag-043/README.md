# Accessibility-Protokoll Gate G27 (Auftrag 043)

**Auftrag:** 043 — V2.1 Regression, Accessibility und Release-Vorbereitung
**Datum:** 2026-09-08
**Audit-Tool:** auditV21LiveAccessibility.mjs (CDP/Headless Chrome)
**Viewports:** 1440×900 (Desktop), 375×812 (Mobile)
**Ladetypen:** Deep-Link, Reload

> Keine pauschale WCAG-Zertifizierung. Gezielte Prüfung der Live-Fläche.

## Prüfziele

| # | Prüfziel |
|---|---|
| 1 | Seitenstruktur: Titel, `<main>`, kein 404, kein horizontaler Overflow |
| 2 | Live-Fläche: genau eine `live-performance-section`, ≥3 `live-kpi-card` |
| 3 | Benannte Diagrammregionen: ARR-Chart, ARR-Mix, Funnel, Activity-Feed |
| 4 | `aria-live="polite"` auf dem Activity-Feed |
| 5 | Sichere Activity-Grenze: keine internen Felder im DOM |
| 6 | Ehrlicher Empty-State: kein Null-Euro-Ersatzwert (`0 €` / `0,00 €` / `0.00 €`), keine Demo-Kennzeichnung |
| 7 | Reduced-Motion: Pulse-Animation bei `prefers-reduced-motion: reduce` deaktiviert |

## Lokale Selbsttests der Audit-Logik (kein Browser, nicht in der Audit-Zählung)

Vor dem Build laufen 23 Selbsttests der reinen Logik; ein Kippen bricht mit Exit 1 ab.

- **Zugänglicher Name:** `role="region"` allein → kein Name; leeres/whitespace `aria-labelledby` → kein Name;
  nicht (vollständig) auflösbares `aria-labelledby` → kein Name; aufgelöstes, aber textloses Ziel → kein Name;
  leeres `aria-label` → kein Name. Positiv: nichtleeres `aria-label`, vollständig aufgelöstes `aria-labelledby`,
  benannter Parent-Bereich.
- **Null-Euro-Erkennung:** `0 €`, `0,00 €`, `0.00 €` → positiv; ehrlicher Statussatz
  (`Supabase nicht konfiguriert – keine Live-ARR-Historie verfügbar.`) sowie echte Beträge
  (`1.240.000,00 €`, `10 €`, `120,00 €`) → negativ. Regex bewusst enger als die frühere `\b`-Variante.
- **Bestätigter Snapshot (stabil, ohne Pulse):** Kartentext mit „Live Realtime" + „Aktualisiert:" zählt;
  „Live Realtime" ohne Frischeangabe oder ein Wartezustand zählt nicht.
- **Fake-Zero-Gating:** Empty-State ohne bestätigten Snapshot + `0 €` → geflaggt;
  bestätigter Snapshot **ohne** Pulse + `0 €` → NICHT geflaggt; kein Empty-State + `0 €` → NICHT geflaggt.
- Ergebnis dieses Laufs: 23 von 23 bestanden.

## Ergebnisse

| Status | Prüfung |
|---|---|
| ✅ PASS | [1440×900 deep-link] Seitentitel vorhanden und kein 404 — title="LeadPilot — Enterprise Dashboard & CRM" |
| ✅ PASS | [1440×900 deep-link] <main> Element vorhanden |
| ✅ PASS | [1440×900 deep-link] Kein 404-Text im Body |
| ✅ PASS | [1440×900 deep-link] Kein horizontaler Overflow (scrollWidth - clientWidth = 0px) |
| ✅ PASS | [1440×900 deep-link] Genau eine live-performance-section (gefunden: 1) |
| ✅ PASS | [1440×900 deep-link] Mindestens 3 live-kpi-card vorhanden (gefunden: 4) |
| ✅ PASS | [1440×900 deep-link] Region data-testid="live-performance-arr-chart" vorhanden (gefunden: 1) |
| ✅ PASS | [1440×900 deep-link] "live-performance-arr-chart" zugänglich benannt ({"ariaLabel":"Live ARR Verlaufsgraph (30-Minuten-Fenster)","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [1440×900 deep-link] Region data-testid="live-performance-arr-mix" vorhanden (gefunden: 1) |
| ✅ PASS | [1440×900 deep-link] "live-performance-arr-mix" zugänglich benannt ({"ariaLabel":"ARR-Mix nach Akquisitionsquelle","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [1440×900 deep-link] Region data-testid="live-performance-funnel" vorhanden (gefunden: 1) |
| ✅ PASS | [1440×900 deep-link] "live-performance-funnel" zugänglich benannt ({"ariaLabel":"Live Funnel nach Stufe","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [1440×900 deep-link] Region data-testid="live-performance-activity" vorhanden (gefunden: 1) |
| ✅ PASS | [1440×900 deep-link] "live-performance-activity" zugänglich benannt ({"ariaLabel":"Live-Aktivitäten Feed","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [1440×900 deep-link] Activity-Feed hat aria-live="polite" (gefunden: "polite") |
| ✅ PASS | [1440×900 deep-link] Kein internes Feld "eventId" im DOM sichtbar |
| ✅ PASS | [1440×900 deep-link] Kein internes Feld "correlationId" im DOM sichtbar |
| ✅ PASS | [1440×900 deep-link] Kein internes Feld "sourceSystem" im DOM sichtbar |
| ✅ PASS | [1440×900 deep-link] Kein internes Feld "raw_context" im DOM sichtbar |
| ✅ PASS | [1440×900 deep-link] Kein internes Feld "context" im DOM sichtbar |
| ✅ PASS | [1440×900 deep-link] Keine explizite Dummy-/Test-Kennzeichnung in der Live-Performance-Section |
| ✅ PASS | [1440×900 deep-link] Kein expliziter N/A-Platzhalter-Ersatzwert in der Live-Section |
| ✅ PASS | [1440×900 deep-link] Kein sichtbarer Null-Euro-Ersatzwert (0 € / 0,00 € / 0.00 €) im unkonfigurierten Live-Zustand |
| ℹ️ NOTE | [1440×900 deep-link] Ehrlicher Empty-State geprüft (Live-Section; zeroCheckApplies=true; isEmptyState=true; hasConfirmedSnapshot=false; cardCount=4; sectionFound=true) |
| ✅ PASS | [1440×900 reload] Kein horizontaler Overflow nach Reload (0px) |
| ✅ PASS | [1440×900 reload] Kein internes Feld "eventId" nach Reload |
| ✅ PASS | [1440×900 reload] Kein internes Feld "correlationId" nach Reload |
| ✅ PASS | [1440×900 reload] Kein internes Feld "sourceSystem" nach Reload |
| ✅ PASS | [1440×900 reload] Kein internes Feld "raw_context" nach Reload |
| ✅ PASS | [375×812 deep-link] Seitentitel vorhanden und kein 404 — title="LeadPilot — Enterprise Dashboard & CRM" |
| ✅ PASS | [375×812 deep-link] <main> Element vorhanden |
| ✅ PASS | [375×812 deep-link] Kein 404-Text im Body |
| ✅ PASS | [375×812 deep-link] Kein horizontaler Overflow (scrollWidth - clientWidth = 0px) |
| ✅ PASS | [375×812 deep-link] Genau eine live-performance-section (gefunden: 1) |
| ✅ PASS | [375×812 deep-link] Mindestens 3 live-kpi-card vorhanden (gefunden: 4) |
| ✅ PASS | [375×812 deep-link] Region data-testid="live-performance-arr-chart" vorhanden (gefunden: 1) |
| ✅ PASS | [375×812 deep-link] "live-performance-arr-chart" zugänglich benannt ({"ariaLabel":"Live ARR Verlaufsgraph (30-Minuten-Fenster)","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [375×812 deep-link] Region data-testid="live-performance-arr-mix" vorhanden (gefunden: 1) |
| ✅ PASS | [375×812 deep-link] "live-performance-arr-mix" zugänglich benannt ({"ariaLabel":"ARR-Mix nach Akquisitionsquelle","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [375×812 deep-link] Region data-testid="live-performance-funnel" vorhanden (gefunden: 1) |
| ✅ PASS | [375×812 deep-link] "live-performance-funnel" zugänglich benannt ({"ariaLabel":"Live Funnel nach Stufe","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [375×812 deep-link] Region data-testid="live-performance-activity" vorhanden (gefunden: 1) |
| ✅ PASS | [375×812 deep-link] "live-performance-activity" zugänglich benannt ({"ariaLabel":"Live-Aktivitäten Feed","labelledbyText":null,"parentName":"Live Performance Bereich (Ebene C)","nearbyHeading":null}) |
| ✅ PASS | [375×812 deep-link] Activity-Feed hat aria-live="polite" (gefunden: "polite") |
| ✅ PASS | [375×812 deep-link] Kein internes Feld "eventId" im DOM sichtbar |
| ✅ PASS | [375×812 deep-link] Kein internes Feld "correlationId" im DOM sichtbar |
| ✅ PASS | [375×812 deep-link] Kein internes Feld "sourceSystem" im DOM sichtbar |
| ✅ PASS | [375×812 deep-link] Kein internes Feld "raw_context" im DOM sichtbar |
| ✅ PASS | [375×812 deep-link] Kein internes Feld "context" im DOM sichtbar |
| ✅ PASS | [375×812 deep-link] Keine explizite Dummy-/Test-Kennzeichnung in der Live-Performance-Section |
| ✅ PASS | [375×812 deep-link] Kein expliziter N/A-Platzhalter-Ersatzwert in der Live-Section |
| ✅ PASS | [375×812 deep-link] Kein sichtbarer Null-Euro-Ersatzwert (0 € / 0,00 € / 0.00 €) im unkonfigurierten Live-Zustand |
| ℹ️ NOTE | [375×812 deep-link] Ehrlicher Empty-State geprüft (Live-Section; zeroCheckApplies=true; isEmptyState=true; hasConfirmedSnapshot=false; cardCount=4; sectionFound=true) |
| ✅ PASS | [375×812 reload] Kein horizontaler Overflow nach Reload (0px) |
| ✅ PASS | [375×812 reload] Kein internes Feld "eventId" nach Reload |
| ✅ PASS | [375×812 reload] Kein internes Feld "correlationId" nach Reload |
| ✅ PASS | [375×812 reload] Kein internes Feld "sourceSystem" nach Reload |
| ✅ PASS | [375×812 reload] Kein internes Feld "raw_context" nach Reload |
| ℹ️ NOTE | Kein .live-kpi-pulse-Element im unkonfigurierten lokalen Zustand gerendert — statische verifyLivePerformanceSurface.ts CSS-Prüfung gilt als Reduced-Motion-Nachweis |
| ✅ PASS | Reduced-Motion: statischer CSS-Nachweis in verifyLivePerformanceSurface.ts gilt |

**Gesamt:** ✅ 57/57 Checks bestanden (57 PASS, 0 FAIL), Exit 0

## Bekannte Einschränkungen

- Der lokale Produktions-Build hat keinen Zugang zu Supabase/n8n; daher werden keine echten Live-KPI-Daten gerendert.
- Die Null-Euro-Erkennung greift nur, wenn ein Empty-State vorliegt UND kein bestätigter Snapshot nach der
  stabilen Definition (sichtbarer Status „Live Realtime" + „Aktualisiert:" in einer `live-kpi-card`) existiert.
  Ein bestätigter Live-Snapshot mit legitimem `0 €` wird nicht als Verstoß gewertet. Der bestätigte Zustand
  wird NICHT vom transienten `.live-kpi-pulse`-Overlay abgeleitet (das erscheint nur bei einem Wertwechsel).
- Der Pulse-Effekt (`.live-kpi-pulse`) erscheint nur transient bei `shouldAnimate` (Wertwechsel), nicht dauerhaft.
  Im unkonfigurierten lokalen Zustand dient `verifyLivePerformanceSurface.ts` (Check 10) als Reduced-Motion-Nachweis.
- Der Parent-Name wird eine Ebene über dem Element gesucht (`el.parentElement.closest([aria-label],[aria-labelledby])`); tiefer verschachtelte Benennungen werden nicht ausgewertet.
- Keyboard-Navigation und Fokus-Traversal wurden nicht per Tastatur getestet (kein Tastatur-Event-Injection via CDP).
- Farbkontrast wurde nicht metrisch gemessen; die Design-Token-Auswahl mit Cyan auf Dunkelgrün wurde im G26-Review visuell bestätigt.

## Prüfgrenze

Dieses Protokoll belegt die oben genannten spezifischen Anforderungen.
Es ist keine vollständige WCAG 2.1/2.2 AA-Zertifizierung.
