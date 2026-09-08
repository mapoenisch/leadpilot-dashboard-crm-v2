# AUFTRAG 044 / Gate G29 — Repo-Hygiene und Werkzeug-Basis

**Builder:** Antigravity
**Prüfung:** Codex
**Baseline:** `ea5859a` (`release: v2.1.0`)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Plan:** `docs/BUILD_PLAN_V2.2.0.md`

## Ziel

Erstes Gate der V2.2.0-Härtung. Es räumt das Repository auf und korrigiert die Paket-Kategorien.
Es fasst **keinen Produktcode** an.

Zweck: Die folgenden Gates bauen große Teile des Codes um. Sie brauchen ein Repository, das
klonbar, überschaubar und frei von Fremdkörpern ist. Solange `.git` 592 MB groß ist und
14 Branches offen sind, kostet jede Iteration unnötig Zeit.

## Verbindliche Entscheidungen

1. **Neues Repository (Entscheidung E1).** Das bestehende Repository wird **nicht** per
   `git filter-repo` umgeschrieben. `CLAUDE.md` §9 verbietet das Überschreiben von Historie, und
   die Commit-Referenzen im BUILD_LOG (`fc48233`, `2cba81b`, `e243dca`, …) müssen gültig bleiben.
   Stattdessen: neues Repository ab `ea5859a`, altes bleibt als Archiv erhalten und erreichbar.
2. **Kein Produktcode.** Keine Datei unter `src/` wird geändert. Der Diff gegen `ea5859a` für
   `src/`, `supabase/` und `tools/n8n/` muss leer sein.
3. **Keine Funktionsänderung.** `npm run build` und `npm run verify` verhalten sich vor und nach
   diesem Auftrag identisch.
4. **Screenshots werden nicht gelöscht, sondern ausgelagert.** Die Nachweise aus G23–G27 bleiben
   vollständig erhalten — nur nicht mehr in der Git-Historie des Arbeits-Repositories.

## Grenzen und Schutzbereiche

- Unverändert bleiben: `src/**`, `supabase/**`, `tools/n8n/**`, `public/**`, alle bestehenden
  Verifier und Capture-Harnesses in `scripts/**`.
- `.claude/**`, `.superpowers/**`, `.codex/**`, `.env*`, `node_modules/**`, `dist/**` werden weder
  gelesen noch geändert noch committet.
- Keine neue npm-Abhängigkeit. Nur Umkategorisierung bestehender Pakete.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Erlaubte Dateien

| Datei | Verantwortung |
| --- | --- |
| `.gitignore` | Fremdkörper dauerhaft ausschließen |
| `package.json` | Ausschließlich Verschiebung von drei Paketen in `devDependencies` |
| `package-lock.json` | Folgeänderung der Verschiebung |
| `docs/BUILD_LOG.md` | Builder-Bericht |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_044_REPO_HYGIENE_WERKZEUG_BASIS.md` | Diese Auftragsquelle; nach Umsetzung nur Status pflegen |
| `docs/REPO_MIGRATION_V2_2_0.md` | Neu: Protokoll der Repository-Migration inkl. Archiv-URL |
| Zu entfernen | `.DS_Store`, `.cdp_auftrag*_temp/`, ggf. `styles.css`, `thumbnail.html` (nur nach Prüfung) |

Andere Dateien sind nicht erlaubt.

## Umsetzung

### 1. Fremdkörper ausschließen

- [ ] `.gitignore` ergänzen um: `.DS_Store`, `**/.DS_Store`, `.cdp_*`, `*.log`, `.claude/`,
      `.codex/`, `.superpowers/`, `Archiv.zip`, `.code-review-graph/`
- [ ] `.DS_Store` (14 KB) aus dem Index entfernen (`git rm --cached`)
- [ ] Verwaiste Ordner `.cdp_auftrag027_temp/`, `.cdp_auftrag028_temp/`, `.cdp_auftrag029_temp/`
      löschen (temporäre Browserprofile abgebrochener Läufe)

### 2. Repo-Root prüfen

Für jede der folgenden Dateien feststellen, ob sie von `src/`, `index.html` oder einem Skript
referenziert wird. **Nur wenn keine Referenz existiert**, nach `design-system/` verschieben:

- [ ] `styles.css` (417 Byte)
- [ ] `thumbnail.html` (789 Byte)
- [ ] `SKILL.md`, `readme.md` — laut `CLAUDE.md` §2 gehören sie zum Design-System-Skill, nicht zur App

Referenzprüfung dokumentieren (Grep-Ergebnis in den Bericht). Bei jeder gefundenen Referenz:
Datei bleibt liegen, Befund dokumentieren.

### 3. Paket-Kategorien korrigieren

- [ ] `tailwindcss`, `postcss`, `autoprefixer` von `dependencies` nach `devDependencies`
- [ ] `npm install` ausführen, damit `package-lock.json` konsistent ist
- [ ] Prüfen: `npm run build` läuft weiterhin durch (die drei Pakete werden nur zur Build-Zeit gebraucht)

### 4. Repository-Migration (Entscheidung E1)

- [ ] Neues GitHub-Repository anlegen: `leadpilot-dashboard-crm-v2`
- [ ] Bestehendes Repository umbenennen zu `leadpilot-dashboard-crm-archive` und auf
      **archiviert / read-only** setzen
- [ ] Im neuen Repository einen Startpunkt ab `ea5859a` anlegen (flacher Import ohne Bild-Historie)
- [ ] `docs/screenshots/**` (271 MB) **nicht** übernehmen; stattdessen:
      - Verzeichnis lokal sichern
      - `docs/screenshots/README.md` neu anlegen mit Verweis auf das Archiv-Repository und die
        dortigen Pfade, damit jede BUILD_LOG-Referenz auffindbar bleibt
- [ ] `docs/REPO_MIGRATION_V2_2_0.md` anlegen: Archiv-URL, Datum, Zuordnung alter → neuer
      Commit-Referenzen, Hinweis dass BUILD_LOG-Hashes im Archiv gültig sind
- [ ] Alte Remote-URL im neuen Repository als `archive`-Remote eintragen

> **Stopp-Bedingung:** Schritt 4 verändert die Ablage außerhalb des Arbeitsverzeichnisses.
> Er wird erst ausgeführt, nachdem Marc die Schritte 1–3 abgenommen hat.

### 5. Branches und Worktrees

- [ ] Worktrees prüfen: `/Users/marcpoenisch/.codex/worktrees/9712/…` (detached `95de1c9`) und
      `.claude/worktrees/orchestrator-automation` — entfernen, falls kein laufender Auftrag daran hängt
- [ ] Lokale Branches auf höchstens drei reduzieren: `main`, `codex/v2.2.0-haertung`,
      `codex/g28-supabase-live-operation-design`
- [ ] Vor jeder Löschung prüfen, ob der Branch unmerged Commits enthält; Ergebnis dokumentieren

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run verify
npm run build
git diff --check ea5859a..HEAD
git diff --exit-code ea5859a..HEAD -- src supabase tools/n8n public scripts
du -sh .git
node -e "const p=require('./package.json');const d=Object.keys(p.dependencies);console.log(['tailwindcss','postcss','autoprefixer'].filter(x=>d.includes(x)))"
```

Erwartete Ergebnisse:
- Alle Befehle Exit 0
- Der Diff für `src supabase tools/n8n public scripts` ist **leer**
- Die letzte Zeile gibt `[]` aus (keines der drei Pakete mehr in `dependencies`)
- `du -sh .git` ≤ 50 MB **nach** Schritt 4

## Builder-Bericht und Commit

Am Anfang von `docs/BUILD_LOG.md` einen Abschnitt **„Gate G29 – Auftrag 044: Repo-Hygiene und
Werkzeug-Basis"** ergänzen mit:

- Baseline und Arbeits-Commit
- `.git`-Größe vorher/nachher
- Referenzprüfung der Root-Dateien (Grep-Ergebnis je Datei)
- Liste der entfernten Branches und Worktrees inkl. Prüfung auf unmerged Commits
- Archiv-URL und Zuordnungstabelle alter → neuer Referenzen
- Vollständige Command-Matrix mit Exit-Codes
- Schutzbereichs-Diff (muss leer sein)

Danach ein einzelner fokussierter Commit, zum Beispiel:

```bash
git commit -m "chore(g29): repo hygiene and build tool categories"
```

## Akzeptanzkriterien für Codex

- Der Diff gegen `ea5859a` für `src`, `supabase`, `tools/n8n`, `public` und `scripts` ist leer.
- `tailwindcss`, `postcss`, `autoprefixer` stehen ausschließlich in `devDependencies`;
  `npm run build` läuft trotzdem.
- `.gitignore` schließt alle genannten Fremdkörper aus; `git status` ist auf einem frischen Klon sauber.
- Jede verschobene Root-Datei ist durch eine dokumentierte Referenzprüfung gedeckt.
- Das Archiv-Repository ist erreichbar und in `docs/REPO_MIGRATION_V2_2_0.md` benannt.
  Jede im BUILD_LOG referenzierte Screenshot-Matrix ist dort auffindbar.
- `.git` ≤ 50 MB.
- `npx tsc --noEmit`, `npm run verify` und `npm run build` sind grün.

**Abnahme:** Erst nach unabhängigem Codex-Review ist Gate G29 freigegeben.
Kein Merge, Tag oder Push.
