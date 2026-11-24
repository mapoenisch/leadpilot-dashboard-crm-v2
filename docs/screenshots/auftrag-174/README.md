# Auftrag 174 – Screenshot-Nachweis (gestufte Umstellung)

Erzeugt mit `node scripts/captureAuftrag174GateScreenshots.mjs` am 2026-11-24T15:39:56.236Z gegen die App mit lokalem Supabase (E2E-Nutzer aus dem Seed).
Bilddateien liegen lokal (`.gitignore`); committet wird nur diese Matrix. Vorher/Nachher = Org A auf Stufe 0 bzw. 1; weitere Paare sind Zustandswechsel. Touch-Emulation auf 375/768.

| Szenario | Viewport | Theme | Überlauf | SHA-256 (gekürzt) |
| --- | --- | --- | --- | --- |
| Vorher: Org A Stufe 0 (alter Editor) | 1440 | dunkel | 0 px | `a576bcd74898f4da` |
| Vorher: Org A Stufe 0 (alter Editor) | 1440 | hell | 0 px | `9a4faf0f2165f817` |
| Vorher: Org A Stufe 0 (alter Editor) | 768 | dunkel | 0 px | `b1d4cb8e65c11d9b` |
| Vorher: Org A Stufe 0 (alter Editor) | 768 | hell | 0 px | `440cd124d4592793` |
| Vorher: Org A Stufe 0 (alter Editor) | 375 | dunkel | 0 px | `97c02e4ad8fc7cb4` |
| Vorher: Org A Stufe 0 (alter Editor) | 375 | hell | 0 px | `6ca6ad83989f3c38` |
| Nachher: Org A Stufe 1 (neuer Editor) | 1440 | dunkel | 0 px | `7c6f68a08c70347c` |
| Nachher: Org A Stufe 1 (neuer Editor) | 1440 | hell | 0 px | `0eb3ff5cba4311d9` |
| Nachher: Org A Stufe 1 (neuer Editor) | 768 | dunkel | 0 px | `dd6b6574a71009cb` |
| Nachher: Org A Stufe 1 (neuer Editor) | 768 | hell | 0 px | `3c6152400544102a` |
| Nachher: Org A Stufe 1 (neuer Editor) | 375 | dunkel | 0 px | `fa4fdafe995710a3` |
| Nachher: Org A Stufe 1 (neuer Editor) | 375 | hell | 0 px | `2bb884cf2a1f23fe` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 1440 | dunkel | 0 px | `4a867cb81e308aeb` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 1440 | hell | 0 px | `8516b69640e50596` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 768 | dunkel | 0 px | `f5d335b4ed7c694f` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 768 | hell | 0 px | `79afda533f78f599` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 375 | dunkel | 0 px | `e0af5ba68f6bab67` |
| Rückweg: Stufe 0 mit Datenstand-Hinweis | 375 | hell | 0 px | `1afb7d4f07e2115b` |
| Wechsel bei offener Ansicht (Hinweis) | 1440 | dunkel | 0 px | `884872aa7696ddb7` |
| Wechsel bei offener Ansicht (Hinweis) | 1440 | hell | 0 px | `15e5520a61b31852` |
| Wechsel bei offener Ansicht (Hinweis) | 768 | dunkel | 0 px | `dbb7ef44b2d8b1ec` |
| Wechsel bei offener Ansicht (Hinweis) | 768 | hell | 0 px | `33e320e8be417a98` |
| Wechsel bei offener Ansicht (Hinweis) | 375 | dunkel | 0 px | `dd313e085e46ea51` |
| Wechsel bei offener Ansicht (Hinweis) | 375 | hell | 0 px | `c82ba728da876dd5` |
| Admin: Stand der Umstellung | 1440 | dunkel | 0 px | `20538230d6939068` |
| Admin: Stand der Umstellung | 1440 | hell | 0 px | `5d825867cf2a166f` |
| Admin: Stand der Umstellung | 768 | dunkel | 0 px | `ee5d89bd1aefdd3c` |
| Admin: Stand der Umstellung | 768 | hell | 0 px | `8dfdee157e2b3a27` |
| Admin: Stand der Umstellung | 375 | dunkel | 0 px | `8a8bc5f5aca03ba9` |
| Admin: Stand der Umstellung | 375 | hell | 0 px | `57a066283a387787` |

Ergebnis: 30 Aufnahmen, 0 px horizontaler Überlauf, Hashes je Viewport/Theme paarweise verschieden.
