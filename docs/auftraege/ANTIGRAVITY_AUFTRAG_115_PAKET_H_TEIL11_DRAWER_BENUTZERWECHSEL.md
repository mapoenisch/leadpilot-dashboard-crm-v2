# ANTIGRAVITY_AUFTRAG_115 — Paket H Teil 11: Mobiles Menü bei Benutzerwechsel

> **Builder:** Claude Code · **Prüfer:** unabhängig (Codex auf GitHub) · Baseline `ce28150` (main nach PR #106).

## Befund

`isMobileDrawerOpen` lag in `Layout.tsx` und wurde bei Benutzerwechsel nicht zurückgesetzt. Bleibt `Layout` beim Wechsel der angemeldeten Person gemountet, sähe die neue Person das noch offene Menü der vorherigen Sitzung.

## Änderungen

| Stelle                            | Bisher                    | Neu                                                      |
| --------------------------------- | ------------------------- | -------------------------------------------------------- |
| `Layout.tsx`                      | Drawer-Zustand unabhängig | Effekt auf `user?.id`: Wechsel oder Abmeldung schließt   |
| `Layout.userSwitch.ui.vitest.tsx` | —                         | Test: anderer Benutzer schließt, gleicher Benutzer nicht |

## Tasks

- [x] Drawer bei Benutzerwechsel schließen (Fokus geht über den Effekt aus Auftrag 114 an den Auslöser).
- [x] Test mit Rot-Grün-Nachweis.
- [ ] Offen, eigene Aufträge: Touch-Prüfung im Browser, Ebenen-Unterscheidung (Historie/CRM/Simulation), `sourceFreshness.ts` (Schutzbereich).

## Grenzen

Nur Zustandsrücksetzung, keine sichtbare Änderung. Schutzbereiche unverändert. Keine neue Abhängigkeit.

## Rückweg

`git revert`.
