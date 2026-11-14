# Screenshot-Nachweis: Auftrag 158 (P09b) — Dashboard-Editor: V2-Vorlagen und Dashboard-Auswahl

Dokumentiert die optische und strukturelle Prüfung des Dashboard-Editors V2 mit Dashboard-Auswahl und Vorlagen gemäß Auftrag 158 §5 T9 und `CLAUDE.md` §9.
Bilder verbleiben lokal in `docs/screenshots/auftrag-158/` (.gitignore).

---

## 1. Prüfmatrix

| Szenario | Viewport | Dimensionen | Horizontaler Überlauf | SHA-256 Hash |
|---|---|---|---|---|
| **Editor ohne geöffnetes Menü (Vorher-Zustand)** | 1440 | 1440 × 900 px | **0 px** | `73dea65f67cffaf5d1c4fc5916110f0871ea63b12157813f94caea07e2421e12` |
| **Editor mit geöffnetem Switcher-Menü (3 Dashboards)** | 1440 | 1440 × 900 px | **0 px** | `9a4d24684c065d2bb23b5c82f3dcf85ef71c04def42979139a29c8206ccebc2b` |
| **Neues Dashboard Dialog geöffnet (Vorlagenauswahl)** | 1440 | 1440 × 900 px | **0 px** | `2729837482d5c3250726352eed28fb5bce410a92d4c708299c1384e09a2528cf` |
| **Lösch-Bestätigungsdialog geöffnet** | 1440 | 1440 × 900 px | **0 px** | `ebcb87253a50e02b671eede9e6229a16b3dd94fc127c98a2ce6d324c449234ad` |
| **Editor ohne geöffnetes Menü (Vorher-Zustand)** | 768 | 768 × 1024 px | **0 px** | `b72e20a238a492d5d2f4aecec6679ed0164c0fb4ca2efdd0599e2194783f609b` |
| **Editor mit geöffnetem Switcher-Menü (3 Dashboards)** | 768 | 768 × 1024 px | **0 px** | `8ea753e4ade3448be3f4905080fb9aa639874ee51afd47717d2f5373084074f3` |
| **Neues Dashboard Dialog geöffnet (Vorlagenauswahl)** | 768 | 768 × 1024 px | **0 px** | `97feb3afa58fe323002806d62bc861cfc74205e461d9211ebca29439f8460259` |
| **Lösch-Bestätigungsdialog geöffnet** | 768 | 768 × 1024 px | **0 px** | `18e3801789e829beeace4a6443be5ac8ac3b7688bf4aef1934e9ec40d104ebb8` |
| **Editor ohne geöffnetes Menü (Vorher-Zustand)** | 375 | 375 × 812 px | **0 px** | `16a62a0933053180c2c3727a32f7295c25db54b458b1e59f682776af00be6932` |
| **Editor mit geöffnetem Switcher-Menü (3 Dashboards)** | 375 | 375 × 812 px | **0 px** | `62283c94d870c56d1bc2c700d7fe7221c04c6c6384f2026ecb8a11694e9cf3c2` |
| **Neues Dashboard Dialog geöffnet (Vorlagenauswahl)** | 375 | 375 × 812 px | **0 px** | `fcd8acfaca6bf69d8015293bfca2040ef017e6ecd9f925ce22dfcb7aca1c9542` |
| **Lösch-Bestätigungsdialog geöffnet** | 375 | 375 × 812 px | **0 px** | `654418b567425341fb32559cbb6b2a8bce5b58ac5ad22568397866b950acc880` |

---

## 2. Abnahmekriterien & Nachweise

1. **Horizontaler Überlauf:** Alle 12 Konfigurationen (4 Szenarien × 3 Breiten) weisen strikt **0 px** horizontalen Überlauf auf.
2. **Hash-Differenzierung:**
   - In jedem Viewport unterscheiden sich die Hashes aller vier Zustände eindeutig.
   - Das Ausklappmenü, der Vorlagenauswahl-Dialog und die Lösch-Bestätigung verändern das visuelle Rendering reproduzierbar.
3. **Barrierefreiheit & Responsivität:**
   - Touch-Ziele auf Mobile (375 px) halten die Mindestgröße von 44 × 44 px ein.
   - Der Vorlagendialog ordnet Kacheln responsive an (2 Spalten auf Desktop/Tablet, 1 Spalte auf Mobile).
   - Der Bestätigungsdialog zentriert auf allen Viewports ohne Abschneiden von Text oder Buttons.
