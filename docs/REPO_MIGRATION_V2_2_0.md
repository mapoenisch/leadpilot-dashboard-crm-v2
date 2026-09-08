# REPO_MIGRATION_V2_2_0 — Repository-Migrationsprotokoll

**Erstellt:** 2026-09-08 · **Ausgeführt:** 2026-09-09
**Auftrag:** 044 / Gate G29 · **Entscheidung:** E1 (`BUILD_PLAN_V2.2.0.md`)
**Status:** ✅ ABGESCHLOSSEN

---

## Ergebnis in einem Satz

Die V2.2.0-Arbeit läuft ab jetzt im neuen Repository **`leadpilot-dashboard-crm-v2`**
(30 MB `.git` statt 592 MB). Das alte Repository **`leadpilot-dashboard-crm`** bleibt
unverändert als **Archiv** mit der vollständigen 188-Commit-Historie und allen
Screenshot-Matrizen.

---

## Repositories

| | Neu (Arbeits-Repo) | Alt (Archiv) |
|---|---|---|
| **Name** | `leadpilot-dashboard-crm-v2` | `leadpilot-dashboard-crm` |
| **URL** | https://github.com/mapoenisch/leadpilot-dashboard-crm-v2 | https://github.com/mapoenisch/leadpilot-dashboard-crm |
| **Sichtbarkeit** | privat | privat |
| **`.git`** | ~30 MB | ~592 MB (unverändert) |
| **Historie** | 4 flache Commits + `codex/g28`-Branch | vollständig, 188 Commits |
| **Enthält** | App-Code, App-Assets (5 Bilder), `docs/` ohne Dumps | alles, inkl. `docs/screenshots/` (271 MB) und Referenz-Assets |
| **Zustand** | aktiv | bleibt vorerst schreibbar (Archivierung/Umbenennung: **noch nicht**, bewusst) |

> **Archivierung des alten Repos** wurde von Marc ausdrücklich zurückgestellt, bis v2
> verifiziert im Betrieb ist. Das alte Repo wird bis dahin nicht umbenannt und nicht
> read-only gesetzt, damit bei Bedarf noch Korrekturen möglich sind.

---

## Lokale Ordner

| Pfad | Inhalt |
|---|---|
| `~/Projekte/LeadPilot Dashboard-CRM` | **frischer Klon von v2** (30 MB `.git`), Branch `codex/v2.2.0-haertung` |
| `~/Projekte/LeadPilot Dashboard-CRM-archive` | der bisherige Ordner, unverändert; `origin` → altes Repo. Referenz für Alt-Historie, Screenshots, Design-System-Skill-Dateien. Kann gelöscht werden, sobald nicht mehr gebraucht. |

Der Projektpfad `~/Projekte/LeadPilot Dashboard-CRM` ist **gleich geblieben** — die
Konfiguration der externen Tools (Codex, Antigravity, Perplexity, OpenCode) musste nicht
angepasst werden. `.env` wurde aus dem Archiv-Ordner in den neuen Klon kopiert.

---

## Flache Historie im neuen Repo

| Commit (v2) | entspricht (Archiv) | Inhalt |
|---|---|---|
| `Import: … @ ea5859a (v2.1.0)` | `ea5859a` | gesamter Baum bei v2.1.0, minus der ausgelassenen Pfade |
| `docs(v2.2.0): define hardening plan G29-G43` | `1940b25` | V2.2.0-Plan + Aufträge 044–046 |
| `chore(g29): repo hygiene and build tool categories` | `8163177` | `.gitignore`, Build-Tools nach `devDependencies` |
| `docs(g29): add gate G29 builder report to BUILD_LOG` | `6532945` | G29-Bericht |
| Branch `codex/g28-supabase-live-operation-design` | `d13cb3b` | G28-Architekturdesign (`docs/superpowers/specs/…`) |

Die Autor-Daten der Original-Commits wurden übernommen.

---

## Ausgelassene Pfade (nur im Archiv)

Referenz-/Screenshot-Dumps und Design-System-Skill-Material — **keine App-Logik**:

```
docs/screenshots/   (271 MB)   docs/references/   (16 MB)
uploads/            (19 MB)    reference/         (14 MB)
assets/  — bis auf 5 Dateien (siehe unten)
ui_kits/  tokens/  guidelines/  archive/  design-system/  components/  .codex/
_ds_manifest.json  _ds_bundle.js  _adherence.oxlintrc.json  components.json
```

### Sonderfall `assets/`

`assets/` ist **nicht** vollständig Skill-Material: `src/features/unternehmen/` importiert
fünf Bilddateien per ESM-`import`, ohne die der Produktions-Build bricht. Diese fünf
wurden übernommen:

```
assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png
assets/facelift/unternehmen/unternehmen-innen-besprechung.png
assets/facelift/unternehmen/unternehmen-innen-empfang.png
assets/facelift/unternehmen/unternehmen-innen-workspace.png
assets/logo/leadpilot-logo-full.png
```

Der Rest von `assets/` (brand-Mockups, ungenutzte Facelift-Varianten) liegt im Archiv.

> **Vorbefund (unabhängig von der Migration):** Mehrere Komponenten nutzen
> `<img src="/assets/…">` als Laufzeit-URL. Vite serviert nur `public/` unter `/`,
> daher liefern diese Pfade schon in v2.1.0 in Produktion 404. Zu beheben in G41.

---

## Commit-Referenz-Zuordnung

Diese im BUILD_LOG dokumentierten Hashes existieren **nicht** im neuen Repo, bleiben aber
im **Archiv-Repo** (`leadpilot-dashboard-crm`) gültig und über die GitHub-Weboberfläche
oder `git clone` des Archivs erreichbar:

| Hash | Beschreibung | Gate |
|---|---|---|
| `fc48233` | docs(g26): approve isolated screenshot baseline review | G26 |
| `2cba81b` | G24-Freigabe (in BUILD_LOG referenziert) | G24 |
| `e243dca` | G25-Freigabe (in BUILD_LOG referenziert) | G25 |
| `c63cf82` | docs(g27): approve v2.1 release readiness review | G27 |
| `95de1c9` | docs(g27): record accessibility audit review findings | G27 |
| `ea5859a` | release: v2.1.0 (Baseline für V2.2.0) | Baseline |

Alle im BUILD_LOG referenzierten Screenshot-Matrizen liegen unter `docs/screenshots/`
**im Archiv-Repo**; siehe `docs/screenshots/README.md` im neuen Repo.

---

## Verifikation im frischen v2-Klon

| Prüfung | Ergebnis |
|---|---|
| `npm install` | ✅ 231 Pakete |
| `npx tsc --noEmit` | ✅ Exit 0 |
| `npm run build` | ✅ built |
| `npm run verify` (24 Suiten) | ✅ alle grün |
| `.git`-Größe | ✅ ~30 MB (Ziel ≤ 50 MB) |

---

## Status

- [x] Neues GitHub-Repo `leadpilot-dashboard-crm-v2` angelegt (privat)
- [x] Flache Historie ab `ea5859a` gebaut, `docs/screenshots/` + Referenz-Assets ausgelassen
- [x] `main` + `codex/g28-supabase-live-operation-design` nach v2 gepusht
- [x] Alter Ordner → `LeadPilot Dashboard-CRM-archive`; v2 frisch in den Originalpfad geklont
- [x] `.env` aus dem Archiv-Ordner übernommen
- [x] `docs/screenshots/README.md` mit Archiv-Verweis angelegt
- [x] Build + Verify im frischen Klon grün
- [ ] **Offen (Marcs Takt):** altes Repo archivieren/read-only setzen — erst wenn v2 sich im
      Betrieb bewährt hat
- [ ] **Offen (optional):** Archiv-Ordner `LeadPilot Dashboard-CRM-archive` löschen, wenn nicht
      mehr gebraucht
