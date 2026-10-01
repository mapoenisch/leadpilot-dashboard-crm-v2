# Separater Auftrag: Advisory `basic-ftp` (GHSA-c475-qrg2-pj4r) beheben

**Stand:** 01.10.2026

**Basis:** `main` nach PR #42 (`7646d81`)

**Freigabe Marc (01.10.2026):** `overrides`-Eintrag mit Sprung auf 6.2.1.

**Builder:** Claude Code. **Prüfer:** Codex. **Merge:** nur Marc.

**Abgrenzung:** Nur Abhängigkeitsauflösung. Kein Code, keine neuen Pakete, kein `--force`, Audit-Schritt unverändert.

## Anlass

`npm audit --audit-level=high` meldet `basic-ftp <=6.2.0` (high, CPU-DoS im Verzeichnislisten-Parser).
Damit ist der CI-Job `test` auf allen Branches rot. Es ist nur eine Dev-Abhängigkeit,
`npm audit --omit=dev` war schon vorher bei 0.

| Pfad | Version vorher |
|---|---|
| `@lhci/cli` → `proxy-agent` → `pac-proxy-agent` → `get-uri@6.0.5` | 5.3.1 |
| `puppeteer-core` → `proxy-agent` → `pac-proxy-agent` → `get-uri@8.0.1` | 5.3.1 (dedupliziert) |

Die Fix-Version 6.2.1 liegt außerhalb der Bereiche von `get-uri` (`^5.0.2` bzw. `^5.3.1`). Ein reines
Lockfile-Update reicht deshalb nicht. `npm audit fix --force` würde `@lhci/cli` auf 0.13.0
zurückstufen, das ist ein Breaking Change.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `package.json` | `overrides`: `"basic-ftp": "^6.2.1"` |
| `package-lock.json` | Auflösung `basic-ftp` 5.3.1 → 6.2.1 |
| `supabase/functions/deno.lock` | Gespiegelte Root-`overrides` um `basic-ftp` ergänzen, sonst scheitert `deno check --frozen-lockfile` |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_DEPS_BASIC_FTP.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Builder-Nachweis |

## Verträglichkeit

- `get-uri` nutzt `Client`, `access`, `lastMod`, `list`, `downloadTo` und `close`. Alle sind in
  6.2.1 vorhanden (geprüft in `dist/Client.d.ts`).
- Einziger Breaking Change seit 5.x (6.0.0): Getrennte Transfer-Hosts sind standardmäßig gesperrt,
  als Schutz gegen FTP-Bounce-Angriffe. Für die Proxy-Auflösung in `@lhci/cli` und
  `puppeteer-core` spielt das keine Rolle. Engines unverändert (`node >=10`).

## Umsetzung

- [x] Override setzen, Lockfile mit `npm install --ignore-scripts` aktualisieren.
- [x] `npm ci` aus dem Lockfile, `npm audit --omit=dev` und `npm audit --audit-level=high` bei 0.
- [x] Gates: `tsc`, Lint, Vitest, `verify`, Build; Schutzbereichs-Diff leer.
- [x] Edge-Lock nachziehen: `workspace.packageJson.overrides` in `supabase/functions/deno.lock`
  spiegelt die Root-`overrides`. Nur diese eine Zeile, Root-`deno.lock` unverändert.
- [ ] PR-CI 7/7 grün (Lighthouse im Job `e2e` nutzt `@lhci/cli`); Codex-Prüfung.
