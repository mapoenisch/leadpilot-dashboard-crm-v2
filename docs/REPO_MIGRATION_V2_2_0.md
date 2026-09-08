# REPO_MIGRATION_V2_2_0 — Repository-Migrationsprotokoll

**Erstellt:** 2026-09-08  
**Auftrag:** 044 / Gate G29  
**Entscheidung:** E1 (BUILD_PLAN_V2.2.0.md)

---

## Hintergrund

Das bestehende Repository (`leadpilot-dashboard-crm`) enthält 592 MB `.git`-Objekte,
davon 271 MB Screenshot-Binärdateien unter `docs/screenshots/`. Per Entscheidung E1 wird
die Git-Historie **nicht** per `git filter-repo` umgeschrieben, da `CLAUDE.md` §9
das Überschreiben von `main`-Historie verbietet und die Commit-Referenzen im BUILD_LOG
(`fc48233`, `2cba81b`, `e243dca`, `c63cf82`, `ea5859a`, …) gültig bleiben müssen.

---

## Vorgehen (Entscheidung E1)

> **Stopp-Bedingung gilt:** Schritt 4 (neues Repository anlegen) wird erst nach
> ausdrücklicher Abnahme der Schritte 1–3 durch Marc ausgeführt.

### Geplante Schritte

1. Neues GitHub-Repository anlegen: `leadpilot-dashboard-crm-v2`
2. Bestehendes Repository umbenennen zu `leadpilot-dashboard-crm-archive` und auf
   **archiviert / read-only** setzen
3. Im neuen Repository einen Startpunkt ab `ea5859a` anlegen (flacher Import ohne Bild-Historie)
4. `docs/screenshots/**` (271 MB) **nicht** übernehmen; stattdessen lokal gesichert;
   `docs/screenshots/README.md` mit Verweis auf Archiv-Repository
5. Alte Remote-URL als `archive`-Remote im neuen Repository eintragen

---

## Commit-Referenz-Zuordnung

Die folgenden Commit-Hashes sind im BUILD_LOG dokumentiert und bleiben im
Archiv-Repository (`leadpilot-dashboard-crm-archive`) gültig und erreichbar.

| Hash | Beschreibung | Gate |
|---|---|---|
| `fc48233` | docs(g26): approve isolated screenshot baseline review | G26 |
| `2cba81b` | (in BUILD_LOG referenziert) | – |
| `e243dca` | (in BUILD_LOG referenziert) | – |
| `c63cf82` | docs(g27): approve v2.1 release readiness review | G27 |
| `95de1c9` | docs(g27): record accessibility audit review findings | G27 |
| `1940b25` | docs(v2.2.0): define hardening plan G29-G43 | G29 |
| `ea5859a` | release: v2.1.0 (Baseline für V2.2.0) | Baseline |

> **Hinweis:** Alle im BUILD_LOG referenzierten Screenshot-Matrizen befinden sich
> unter `docs/screenshots/` und sind vollständig im Archiv-Repository erhalten.
> Sie sind über das Archiv-Repository (URL wird nach Schritt 1 eingetragen) abrufbar.

---

## Archiv-Repository

| Feld | Wert |
|---|---|
| **URL** | *(wird nach Marc's Freigabe und Anlage eingetragen)* |
| **Zustand** | archiviert / read-only |
| **Enthält** | vollständige Git-Historie inkl. `docs/screenshots/` (271 MB) |
| **Zugriffsform** | GitHub Web UI, `git clone --no-checkout` |

---

## Neues Repository

| Feld | Wert |
|---|---|
| **Name** | `leadpilot-dashboard-crm-v2` |
| **URL** | *(wird nach Anlage eingetragen)* |
| **Startpunkt** | `ea5859a` (flacher Import, kein Screenshot-Verlauf) |
| **`docs/screenshots/`** | nicht übernommen; `docs/screenshots/README.md` verweist auf Archiv |
| **Archiv-Remote** | `archive` → URL des Archiv-Repositories |

---

## Status

- [x] Schritt 1–3 (Hygiene, Build-Tools, Branches): abgeschlossen in Auftrag 044
- [ ] Schritt 4 (neues GitHub-Repo anlegen): wartet auf Marc's Abnahme der Schritte 1–3
- [ ] Archiv-URL eintragen
- [ ] `docs/screenshots/README.md` anlegen mit Archiv-Verweis
