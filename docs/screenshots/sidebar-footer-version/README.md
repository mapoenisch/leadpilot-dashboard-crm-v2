# Sidebar-Footer-Version (PR #36): Screenshot-Gate

Vorher = `main` (`be1284a`, Footer „Simulation Engine v1.3.0“), Nachher = Branch
`claude/cool-turing-wcr75o` (Footer „LeadPilot v2.3.1“ aus `package.json`).
Aufgenommen wird die Sidebar mit Footer auf 1440/768/375 px; unter 1024 px öffnet das Harness
den Drawer. Login und Inhaltsseiten ändern sich durch den Footer-Text nicht und sind nicht Teil
des Laufs. Bilder und Manifeste bleiben lokal (Policy ab Auftrag 066), committet wird nur diese Matrix.

## Lauf

- Harness: `scripts/captureSidebarFooterScreenshots.mjs`, abgeleitet von
  `scripts/captureAuftrag068Screenshots.mjs` (gleiche Supabase-Attrappe, Viewports, Überlaufmessung).
- Ohne Docker mit `SUPABASE_MOCK=1`: `VITE_SUPABASE_URL=http://supabase.mock VITE_SUPABASE_ANON_KEY=mock npx vite --port 3200`,
  dann `SUPABASE_MOCK=1 BASE_URL=http://localhost:3200 node scripts/captureSidebarFooterScreenshots.mjs after`
  (Vorher analog auf einem Worktree von `be1284a`, Label `before`).
- Hinweis: Zwei parallel laufende Vite-Server auf demselben `node_modules/.vite` führten im ersten
  Nachher-Lauf zu einem doppelt geladenen React („Cannot read properties of null (reading 'useState')“
  im Inhaltsbereich). Der Nachher-Lauf wurde deshalb mit nur einem Server und frischem Dep-Cache
  wiederholt; die Hashes unten stammen aus diesem Lauf, der Inhaltsbereich ist dort fehlerfrei.

## Ergebnis

| Prüfung | Ergebnis |
|---|---|
| Screenshots je Lauf | 3 (Sidebar × 3 Breiten) |
| SHA-256 Vorher = Nachher | 0 von 3 |
| Horizontaler Überlauf Vorher | 0 |
| Horizontaler Überlauf Nachher | 0 |
| Sichtprüfung | Footer zeigt „LeadPilot v2.3.1“ in `text-primary`, einzeilig, kein Abschneiden; übrige Sidebar unverändert |

## Matrix (SHA-256-Präfix Vorher → Nachher · Überlauf Vorher → Nachher)

| Aufnahme | 1440 | 768 | 375 |
|---|---|---|---|
| Sidebar mit Footer | `4e141333` → `56245c84` ≠ · 0→0 px | `d96ef35a` → `c01bd429` ≠ · 0→0 px | `9f855e6b` → `a795cda0` ≠ · 0→0 px |
