# Asset-Nachweis: Produkt-Roadmap Berglandschaft-Backdrop

- **Dateiname:** `roadmap-backdrop.webp`
- **Speicherort:** `public/assets/roadmap/roadmap-backdrop.webp`
- **Abmessungen:** 1376 × 768 Pixel (16:9)
- **Dateigröße:** 71.272 Bytes (~69,6 KB; Budget: maximal 320 KB)
- **Erstellungsdatum:** 2026-09-07
- **Quelle:** Selbst erstellt / prozedural mit Diffusionsmodell generiert und mit `cwebp` verlustarm komprimiert (Quality 82).
- **Verwendeter Prompt / Spezifikation:**
  > „Cyberpunk-Fintech 3D mountain landscape backdrop matching the visual style of the reference image. A dark, dramatic mountain range at night with deep teal and slate green shading (#030C0B, #081716, #0A2421). Highly detailed rocky ridges, valleys, and sharp peaks with a prominent highest summit peak in the upper right quadrant. Soft subtle cyan and teal ambient backlight on the ridges. Pure scenic landscape: completely text-free, number-free, logo-free, no UI elements, no timeline, no icons, no pins, no flags, no lines, no roads. Clean cinematic dark 3D environment backdrop.“
- **Nutzungszweck & Einbindung:**
  - Räumliche, bildhafte Berglandschaft für die rechte Szenenhälfte der Route `/product/roadmap` (`RoadmapPage.tsx`).
  - Zeigt ein großes Bergmassiv mit Bergrücken, Tälern und Hauptgipfel rechts oben im verbindlichen Schiefergrün/Teal-Farbraum.
  - Kennzeichnung im Markup: `src="/assets/roadmap/roadmap-backdrop.webp"`, `alt=""`, `aria-hidden="true"`, `loading="lazy"`.
  - **Integritäts-Hinweis:** Rein dekoratives, textfreies Landschafts-Asset ohne eingebrannte UI-, Versions- oder Produktdaten. Alle Wegpunkte, Titel, Status, die SVG-Neonroute sowie die Gipfelflagge werden als barrierefreies DOM/SVG darüber gerendert und stammen ausschließlich aus `ROADMAP.releases`.
