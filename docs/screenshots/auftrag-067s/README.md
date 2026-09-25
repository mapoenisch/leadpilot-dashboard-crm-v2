# Auftrag 067S / G65 — Screenshot-Matrix (nur Text, keine Bilddateien)

**Einzige UI-Änderung:** Die Fußzeile der Login-Seite zeigt statt
„LeadPilot Dashboard-CRM · V2.2.0-Härtung“ jetzt „LeadPilot Dashboard-CRM · V2.3.0“.

- **Vorher:** Build von `main` (Stand vor 067S) · **Nachher:** Arbeitsstand 067S
- **Harness:** lokales Playwright-Skript (nicht committet), `/login` ohne Anmeldung, reducedMotion, Full-Page

| Viewport | SHA-256 vorher | SHA-256 nachher | Text vorher → nachher | Overflow nachher | Ergebnis |
|---|---|---|---|---|---|
| 1440 | `2c9a22be7aa2…` | `8790627c8211…` | V2.2.0-Härtung → V2.3.0 | 0 px | geändert (erwartet) |
| 768 | `02027cb37579…` | `f9c1cd55bb1a…` | V2.2.0-Härtung → V2.3.0 | 0 px | geändert (erwartet) |
| 375 | `2252a7d4548a…` | `c370571c7c29…` | V2.2.0-Härtung → V2.3.0 | 0 px | geändert (erwartet) |

Die Fußzeile ist die einzige geänderte Stelle. Andere Routen berührt 067S nicht.
