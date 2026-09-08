# docs/screenshots/ — im Archiv-Repo

Die Screenshot-Matrizen der Gates G02–G27 (Vorher/Nachher-Paare, SHA-256-Verifikation,
Ergebnis-Matrizen) wurden bei der Repository-Migration zu V2.2.0 **nicht** in dieses
Repo übernommen (271 MB Binärdateien). Sie liegen vollständig im **Archiv-Repo**:

- **https://github.com/mapoenisch/leadpilot-dashboard-crm** → `docs/screenshots/`
- lokal: `~/Projekte/LeadPilot Dashboard-CRM-archive/docs/screenshots/`

Jede Referenz der Form „Matrix unter `docs/screenshots/auftrag-XXX/README.md`" in
`docs/BUILD_LOG.md` bezieht sich auf diesen Pfad **im Archiv**.

Details: `docs/REPO_MIGRATION_V2_2_0.md`.

---

Neue Screenshot-Nachweise ab Gate G29 laufen über Playwright (`toHaveScreenshot()`,
siehe Auftrag 046 / `BUILD_PLAN_V2.2.0.md`) und werden nicht mehr als Binär-Historie
in diesem Repo abgelegt.
