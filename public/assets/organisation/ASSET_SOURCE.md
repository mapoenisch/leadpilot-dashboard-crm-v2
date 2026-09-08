# Asset-Nachweis: Team-Struktur Backdrop

- **Dateiname:** `team-structure-backdrop.webp`
- **Speicherort:** `public/assets/organisation/team-structure-backdrop.webp`
- **Abmessungen:** 1600 × 900 Pixel
- **Dateigröße:** 94.346 Bytes (~92,1 KB; Budget: maximal 320 KB)
- **Erstellungsdatum:** 2026-09-06
- **Quelle:** selbst erstellt (prozedurales Rendering)
- **Verwendeter Prompt / Spezifikation:**
  > „Dunkle, räumliche Netzwerk- und Hierarchiefläche mit dominantem Root-Knoten-Glow oben und 4 geschwungenen Lichtleiterbahnen zu verbundenen Bereichsknoten unten auf tiefem Schiefergrün (#030C0B, #061613). Cyan- (#00D9C6) und mintfarbene (#7CEFE6) Lichtkanten. Keine Texte, keine Zahlen, keine Personen, keine Logos, keine Organigramm-Boxen und keine fachlichen Symbole.“
- **Nutzungszweck & Einbindung:**
  - Rein dekoratives Hintergrundelement hinter den semantischen DOM-Organigrammkarten auf `/dashboard` (`TeamHrSnapshot.tsx`) sowie `/organisation/team` (`TeamStructurePage.tsx`).
  - Kennzeichnung im Markup: `alt=""`, `aria-hidden="true"`, `loading="lazy"`, feste Dimensionen `width="1600"` / `height="900"`.
  - **Hinweis:** Rein dekorativ, enthält keine Personaldaten. Bei Bildausfall oder Ladeverzögerung greift ein tokenbasierter CSS-Gradient-Fallback ohne Funktions- oder Informationsverlust. Alle echten Rollen, Namen, FTEs und Engpässe liegen als zugängliches DOM darüber.
