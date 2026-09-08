# Asset-Herkunft & Provenienz: LeadPilot Werbespot

## 1. Übersicht & Metadaten

- **Original-Dateiname:** `LeadPilot - Werbespot.webm`
- **Quellpfad:** `/Users/marcpoenisch/Projekte/LeadPilot - Eine fiktive Geschäftsidee/new_marketing_assets_dashboard/LeadPilot - Werbespot.webm`
- **Zielpfad Video:** `public/resources/videos/leadpilot-werbespot.webm`
- **Zielpfad Poster:** `public/resources/videos/leadpilot-werbespot-poster.png`
- **Erstellungsdatum der Integration:** 2026-09-06
- **Auftraggeber-Freigabe:** Bestätigte Nutzung als authentische Marketing-Ressource im internen LeadPilot-Dashboard (Gate G17).

## 2. Technische Daten & Dateigrößen

| Datei | Pfad | Dateigröße | SHA-256 Prüfsumme |
|---|---|---|---|
| **Original-Video (Quelle)** | `/Users/marcpoenisch/Projekte/LeadPilot - Eine fiktive Geschäftsidee/new_marketing_assets_dashboard/LeadPilot - Werbespot.webm` | 8.939.390 Bytes | `146fd5ffb0f5a996bbf4b0b5ac4fdc8aefc9cb21b497e5214b3e246589662141` |
| **Video (Dashboard)** | `public/resources/videos/leadpilot-werbespot.webm` | 8.939.390 Bytes | `146fd5ffb0f5a996bbf4b0b5ac4fdc8aefc9cb21b497e5214b3e246589662141` |
| **Poster-Vorschaubild** | `public/resources/videos/leadpilot-werbespot-poster.png` | 792.079 Bytes | `355848bb2982d6b3846663f73dfbe550e50fc90623f9b2fe8e973b02ba14a8aa` |

## 3. Erstellungsweg des Posters

Das Poster `leadpilot-werbespot-poster.png` wurde verlustfrei und ohne externe Cloud-/KI-Dienste direkt aus einem echten Frame des Quellvideos extrahiert:
- Lokales Abspielen des nativen WebM-Streams in einer isolierten, lokalen Headless-Chrome-Instanz via Chrome DevTools Protocol (CDP).
- Seek auf Timestamp 2.0 Sekunden des Videos.
- Rendern des Frames auf ein HTML5 Canvas-Element (1280 × 720 px).
- Verlustfreier PNG-Export via `canvas.toDataURL('image/png')` und Speicherung als lokales Poster-Asset.
- Es wurden keine externen npm-Pakete, keine KI-Generatoren und keine Fremdbilder eingesetzt.

## 4. Lizenz- und Nutzungshinweis

- **Rechteinhaber:** LeadPilot GmbH (fiktives B2B-Unternehmen).
- **Verwendungszweck:** Ausschließlich interne Dokumentation, Marketing-Referenz und Produktpräsentation im LeadPilot Dashboard-CRM (`Internal Resources` / `/resources/materials`).
- **Wiedergaberegeln:** Nativer HTML5-Player, kein automatisches Abspielen (`autoplay = false`), kein stummes Endlos-Looping (`loop = false`), barrierefreie Beschriftung (`aria-label`), sichtbarer Fallback-Link zum Download der Originaldatei.
