# Domain Docs

Wie die Engineering-Skills die Domänen-Dokumentation dieses Repos lesen sollen,
bevor sie den Code erkunden.

**Layout: single-context.** Ein `CONTEXT.md` im Repo-Root, ADRs unter
`docs/adr/`. Kein Monorepo, kein `CONTEXT-MAP.md`.

---

## Vor dem Erkunden lesen

- **`CONTEXT.md`** im Repo-Root — Domänenmodell, Glossar, Datenflüsse.
- **`docs/adr/`** — ADRs, die den Bereich berühren, an dem gearbeitet wird.

Fehlt eine dieser Dateien, **still weitermachen**. Nicht auf ihr Fehlen
hinweisen, nicht vorab ihre Anlage vorschlagen. `/domain-modeling` (erreichbar
über `/grill-with-docs` und `/improve-codebase-architecture`) legt sie an, wenn
tatsächlich ein Begriff oder eine Entscheidung geklärt wird.

`docs/adr/` existiert zum Zeitpunkt der Einrichtung noch nicht — das ist kein
Mangel, sondern der erwartete Ausgangszustand.

---

## Repo-spezifisch: wo Entscheidungen wirklich stehen

Dieses Repo führte seine Architektur-Historie schon vor den ADRs. Die Reihenfolge
beim Nachschlagen:

| Quelle | Inhalt |
|---|---|
| `CONTEXT.md` | Begriffe, Datenflüsse, Orientierung |
| `ARCHITECTURE_DECISIONS.md` | **Der Entscheidungs-SSoT.** Teil A Historie, Teil B Ziel-Architektur, Teil C Implementierungsstand |
| `docs/adr/` | Neue Entscheidungen ab Einführung der ADRs |
| `API.md` | Modul-Oberfläche: wo liegt was, was exportiert es |
| `docs/BUILD_LOG.md` | Was tatsächlich gebaut und geprüft wurde |

**`ARCHITECTURE_DECISIONS.md` Teil A darf nicht gelöscht oder umgeschrieben
werden** — nur ergänzen oder als Revision markieren (`CLAUDE.md` §9). Eine neue
Entscheidung, die eine alte ablöst, hebt den alten Eintrag nicht auf; sie tritt
daneben.

Die Datei ist groß (124 kB). Gezielt nachschlagen, nicht am Stück lesen.

---

## Dateistruktur

```
/
├── CONTEXT.md                  ← Glossar und Datenflüsse
├── API.md                      ← Modul-Oberfläche
├── ARCHITECTURE_DECISIONS.md   ← Entscheidungs-SSoT (Teil A ist unantastbar)
├── docs/
│   ├── adr/                    ← neue ADRs (noch nicht angelegt)
│   ├── auftraege/              ← Auftragsdateien
│   └── BUILD_LOG.md            ← Ledger
└── src/
```

---

## Die Sprache des Glossars benutzen

Benennt eine Ausgabe ein Domänenkonzept — in einem Issue-Titel, einem
Refactoring-Vorschlag, einer Hypothese, einem Testnamen — dann mit dem Begriff,
wie ihn `CONTEXT.md` definiert. Nicht zu Synonymen abdriften, die das Glossar
ausdrücklich vermeidet.

Besonders anfällig in diesem Repo, weil die Begriffe dicht beieinander liegen:

- **Scenario** / **ScenarioVersion** / **SimulationRun** — Vergleiche laufen
  zwischen *Versionen*, nicht zwischen Szenarien.
- **Parameter** / **Measure** — der Parameter ist der Wert, die Measure ist die
  beabsichtigte Änderung daran.
- **KPI** (Simulation) / **Live-KPI** (Supabase Realtime) — zwei Zeitachsen,
  zwei Begriffe.
- **Lead** / **SimulationLead** — reale gegen simulierte Zeitachse.

Fehlt ein benötigtes Konzept im Glossar, ist das ein Signal: entweder wird
Sprache erfunden, die das Projekt nicht benutzt (dann neu überlegen), oder es
gibt eine echte Lücke (dann für `/domain-modeling` vermerken).

---

## Konflikte mit ADRs kenntlich machen

Widerspricht eine Ausgabe einem bestehenden ADR oder einem Eintrag in
`ARCHITECTURE_DECISIONS.md`, das ausdrücklich sagen statt still zu übergehen:

> _Widerspricht ADR-0007 (event-sourced orders) — aber es lohnt, das wieder
> aufzumachen, weil …_

Keine erfundenen „belegten" Entscheidungen für dokumentierte Quellenlücken
(`ARCHITECTURE_DECISIONS.md` Regel 4, `CLAUDE.md` §9). Eine Lücke bleibt als
Lücke stehen.

---

## Schutzbereiche

Vor jedem Änderungsvorschlag prüfen, ob er einen Schutzbereich nach
`CLAUDE.md` §6 trifft — `src/simulation/**`, `src/types/**`, `src/context/**`,
`src/services/data/**`, `src/features/resources/**` sowie RNG/Seed-Verhalten,
Run-/Versionsmodell, Persistenzlogik und die Schreibpfade von
`crmRepository.ts`.

Trifft er einen, ist die richtige Ausgabe ein Hinweis darauf, kein Patch.
