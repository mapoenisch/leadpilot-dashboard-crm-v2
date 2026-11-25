# Auftrag 174a – Screenshot- und Messnachweis (Editor V2 nach dem Smoke-Test)

Erzeugt mit `node scripts/captureAuftrag174aGateScreenshots.mjs vorher|nachher` (vorher: 2026-11-24T19:24:58.817Z, nachher: 2026-11-24T19:29:14.541Z) gegen die vollständige App-Hülle mit lokalem Supabase, E2E-Nutzer `manager-a`, Org A auf Stufe 1, ohne Client-Override. Touch-Emulation unter 1024 px.
Bilddateien und `manifest.json` liegen lokal (`.gitignore`); committet wird nur diese Matrix. Der Harness schreibt nur Entwürfe und prüft, dass gespeicherte Layouts und Revisionen unverändert bleiben.

Spalten: *Arbeitsfläche* = Breite von `editor-canvas`. *Speichern / Abbrechen* = Element liegt vollständig im Viewport und `elementFromPoint` trifft es. *Überstehende Kacheln* = Kachelinhalt ragt sichtbar über die eigene Rasterfläche (nicht in der Kachel eingefasst). *ARR letzter Punkt* = letztes Zeitachsen-Label von „ARR-Verlauf“ nach Scrollen sichtbar.

## Direktaufruf

### Vorher

| Breite | Arbeitsfläche | Bibliothek / Info | Speichern / Abbrechen | Überstehende Kacheln | ARR letzter Punkt | Entwurf | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | 516 px | offen / offen | sichtbar, deaktiviert / erreichbar | 16 (max 407 px) | – | nein | 0 px | `7c6f68a08c70` |
| 1059 | 135 px | offen / offen | sichtbar, deaktiviert / erreichbar | 16 (max 2984 px) | – | nein | 0 px | `bc7b165b9d10` |
| 768 | 736 px | zu / zu | sichtbar, deaktiviert / erreichbar | 14 (max 387 px) | – | nein | 0 px | `dd6b6574a710` |
| 375 | 343 px | zu / zu | abgeschnitten (x=613) / abgeschnitten (x=488) | 0 (max 0 px) | – | nein | 0 px | `fa4fdafe9957` |

### Nachher

| Breite | Arbeitsfläche | Bibliothek / Info | Speichern / Abbrechen | Überstehende Kacheln | ARR letzter Punkt | Entwurf | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | 796 px | zu / offen | sichtbar, deaktiviert / erreichbar | 0 (max 0 px) | – | nein | 0 px | `311d8663f5ea` |
| 1059 | 735 px | zu / zu | sichtbar, deaktiviert / erreichbar | 0 (max 0 px) | – | nein | 0 px | `2bf1600577fe` |
| 768 | 736 px | zu / zu | sichtbar, deaktiviert / erreichbar | 0 (max 0 px) | Q3 25: erreichbar, in Karte | nein | 0 px | `408ea8bb5968` |
| 375 | 343 px | zu / zu | sichtbar, deaktiviert / erreichbar | 0 (max 0 px) | – | nein | 0 px | `c748de7e157a` |

## Resize aus offener Desktop-Ansicht mit Entwurf (1440 → 1280 → 1059 → 1024 → 900 → 768 → 375 → 1440)

### Vorher

| Breite | Arbeitsfläche | Bibliothek / Info | Speichern / Abbrechen | Überstehende Kacheln | ARR letzter Punkt | Entwurf | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | 516 px | offen / offen | erreichbar / erreichbar | 16 (max 407 px) | – | ja | 0 px | `a605ae4af298` |
| 1280 | 356 px | offen / offen | erreichbar / erreichbar | 16 (max 752 px) | – | ja | 0 px | `178b7f1cbfbb` |
| 1059 | 135 px | offen / offen | erreichbar / erreichbar | 16 (max 2984 px) | – | ja | 0 px | `d2c6487fc5b5` |
| 1024 | 100 px | offen / offen | erreichbar / erreichbar | 16 (max 2984 px) | – | ja | 0 px | `e18b3244ae03` |
| 900 | 268 px | offen / offen | erreichbar / erreichbar | 16 (max 436 px) | – | ja | 0 px | `19e8e6312596` |
| 768 | 136 px | offen / offen | erreichbar / erreichbar | 17 (max 2188 px) | – | ja | 0 px | `6350bdeb374d` |
| 375 | 343 px | blatt / blatt | abgeschnitten (x=581) / abgeschnitten (x=456) | 0 (max 0 px) | – | ja | 0 px | `99a0ad06cd27` |
| 1440 | 516 px | offen / offen | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `771702bda448` |

### Nachher

| Breite | Arbeitsfläche | Bibliothek / Info | Speichern / Abbrechen | Überstehende Kacheln | ARR letzter Punkt | Entwurf | Dok.-Überlauf | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440 | 796 px | zu / offen | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `517c2e649df2` |
| 1280 | 636 px | zu / offen | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `bf1be9ba5a4e` |
| 1059 | 735 px | zu / zu | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `3de0fdbd3c75` |
| 1024 | 700 px | zu / zu | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `1947228ca0e0` |
| 900 | 868 px | zu / zu | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `c078f2175b01` |
| 768 | 736 px | zu / zu | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `fd6c5d197024` |
| 375 | 343 px | zu / zu | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `2d09b1357ec8` |
| 1440 | 796 px | zu / offen | erreichbar / erreichbar | 0 (max 0 px) | – | ja | 0 px | `5661984599b9` |

## F1 und F2

| Prüfung | Vorher | Nachher |
| --- | --- | --- |
| F1: sichtbare Panel-Editor-Buttons ohne Handler (ARR-Verlauf gewählt, 1440 px) | 1 | 0 |
| F2: V2 nach „Abbrechen“ und Neuladen | nein (Override `false`) | ja (Override `keiner`) |

## Hash-Vergleich

14 Paare, davon 14 mit verschiedenem Hash.
Gespeicherte Layouts und Revisionen nach beiden Läufen unverändert: ja.
