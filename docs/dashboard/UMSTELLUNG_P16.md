# Umstellung auf den neuen Dashboard-Editor (P16) – Anleitung und Stufenprotokoll

> Auftrag 174 (P16b). Die Stufe je Organisation setzt **ausschließlich Marc** per SQL. Es gibt keine Rolle „Plattform-Admin“; Org-Admins können die Stufe nur sehen (Admin → „Umstellung vorbereiten“ → „Stand der Umstellung“), nicht ändern. Kein automatisches Hochstufen.

## 1. Stufen

| Stufe | Wer                               | Voraussetzung                                                                                             |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 0     | niemand (alter Editor, Standard)  | –                                                                                                         |
| 1     | Demo-/Test-Organisation           | Merge 174, Hosted-Migration `20261130_dashboard_editor_rollout.sql` angewendet, Smoke durch Marc          |
| 2     | ausgewählte Organisationen        | entfällt (Entscheidung Marc 25.11.2026: es gibt nur eine Organisation)                                    |
| 3     | alle Organisationen (V2 Standard) | Stufe 1 mindestens 7 Tage ohne offenen Fehler, Frist ab Auslieferung von 174b; Marcs Release-Entscheidung |

Technisch gilt: Stufe 0 (oder keine Zeile) = alter Editor; Stufe 1, 2 oder 3 = neuer Editor für diese Organisation. Die Nummer dokumentiert die Welle.

## 2. Wer wird beim Öffnen umgestellt?

Ist die Organisation auf Stufe 1–3, wird ein Nutzer beim nächsten Öffnen des Dashboards umgestellt, wenn:

| Ergebnisklasse aus 173                            | Umstellung                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `nur_v2`, `keine_kopie`                           | ja                                                                                                |
| `gleich`                                          | ja, außer bei „Später entscheiden“ oder verfallener Entscheidung                                  |
| ohne jeden Stand                                  | ja (neuer Editor mit Standard-Dashboard)                                                          |
| `v1_geaendert`                                    | nur mit gültiger Entscheidung „Pilot behalten“ oder „Alten Stand übernehmen“                      |
| `beide_geaendert`                                 | ohne Entscheidung ja (Pilot behalten, Entscheidung Marc 23.11.2026); mit gültiger Entscheidung ja |
| „Später entscheiden“ oder verfallene Entscheidung | nein, bleibt im alten Editor                                                                      |

„Gültig“ heißt: V1-Revision, V2-Revision und Pilotkopie sind seit der Entscheidung unverändert. Nach der Umstellung ist der Übergang fixiert (`dashboard_editor_switches.umgestellt_at`); spätere Bearbeitungen führen nicht zurück in den alten Editor. Prüfung und Fixierung sind gegen gleichzeitiges Speichern gesperrt: Ein Speichern während der Umstellung wartet und zählt als Bearbeitung danach.

Die Regel entspricht „offen“ in der Admin-Ansicht, mit einer Ausnahme: `beide_geaendert` ohne Entscheidung zählt dort als offen, wird aber umgestellt (Pilot behalten). Die Übersicht „Stand der Umstellung“ zählt unter „Warten auf Entscheidung“ nur Nutzer, deren Umstellung tatsächlich blockiert ist.

Ändert sich die Stufe, während jemand das Dashboard offen hat, geht nichts verloren: Es erscheint nur der Hinweis „… ab dem nächsten Öffnen …“, der Wechsel wirkt beim nächsten Laden.

## 3. SQL für Marc

Im Supabase-Dashboard unter **SQL Editor** ausführen (Projekt `leadpilot-crm`). Die Organisations-ID steht in der Tabelle `organizations`.

**Organisationen nachsehen:**

```sql
SELECT id, name, status FROM public.organizations ORDER BY name;
```

**Stufe setzen** (Beispiel Stufe 1; Zeitpunkt und Audit-Eintrag setzt die Datenbank selbst):

```sql
INSERT INTO public.dashboard_editor_rollout (organization_id, stufe, aktiviert_von, notiz)
VALUES ('<ORGANISATIONS-ID>', 1, 'Marc', 'Stufe 1: Test-Organisation')
ON CONFLICT (organization_id) DO UPDATE
SET stufe = EXCLUDED.stufe, aktiviert_von = EXCLUDED.aktiviert_von, notiz = EXCLUDED.notiz;
```

**Stufe 3 für alle Organisationen:**

```sql
INSERT INTO public.dashboard_editor_rollout (organization_id, stufe, aktiviert_von, notiz)
SELECT id, 3, 'Marc', 'Stufe 3: alle' FROM public.organizations WHERE status = 'active'
ON CONFLICT (organization_id) DO UPDATE
SET stufe = EXCLUDED.stufe, aktiviert_von = EXCLUDED.aktiviert_von, notiz = EXCLUDED.notiz;
```

**Rückweg** (Organisation wieder auf den alten Editor; schreibt nichts zurück, V2-Daten bleiben):

```sql
UPDATE public.dashboard_editor_rollout
SET stufe = 0, aktiviert_von = 'Marc', notiz = 'Rückweg: <Grund>'
WHERE organization_id = '<ORGANISATIONS-ID>';
```

Nach dem Rückweg zeigt der alte Editor bei bereits umgestellten Nutzern den Hinweis „Stand vom TT.MM.JJJJ; Änderungen im neuen Editor sind hier nicht enthalten.“ Erneutes Aktivieren stellt diese Nutzer sofort wieder auf den neuen Editor (nichts geht verloren).

**Beobachten:**

```sql
-- Stufe und Zeitpunkt je Organisation
SELECT o.name, r.stufe, r.aktiviert_at, r.aktiviert_von, r.notiz
FROM public.organizations AS o
LEFT JOIN public.dashboard_editor_rollout AS r ON r.organization_id = o.id
ORDER BY o.name;

-- Umgestellte Nutzer je Organisation
SELECT organization_id, count(*) AS umgestellt, max(umgestellt_at) AS zuletzt
FROM public.dashboard_editor_switches GROUP BY organization_id;

-- Protokoll der Stufenwechsel
SELECT created_at, organization_id, details
FROM public.audit_log WHERE action = 'dashboard.editor_rollout_stufe'
ORDER BY created_at DESC;
```

**Alarme:** Server-Alarme laufen unabhängig von der Stufe; ein Rückweg stoppt keine Alarme. Dafür gibt es den Not-Aus aus Auftrag 167.

## 4. Stufenprotokoll

Einträge je Stufe: Datum, Organisationen, Prüfer, Marcs Freigabe, Befunde. Stufe 1 trägt der Builder nach Marcs Smoke nach; spätere Stufen trägt Marc bzw. der jeweilige Builder als reinen Doku-Commit nach.

| Stufe | Datum      | Organisationen | Prüfer                       | Freigabe Marc | Befunde                                                                                                                                                                            |
| ----- | ---------- | -------------- | ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | 24.11.2026 | LeadPilot Demo | Smoke Marc 24.11. und 25.11. | offen         | 24.11.: L1–L7, F1, F2 → Auftrag 174a (behoben, PR #222). 25.11.: K1–K7 → Auftrag 174b. Die 7-Tage-Frist beginnt nach Auslieferung von 174b und erneutem Smoke ohne offenen Fehler. |
| 2     | entfällt   | –              | –                            | –             | Entscheidung Marc 25.11.2026                                                                                                                                                       |
| 3     | offen      | –              | –                            | –             | –                                                                                                                                                                                  |
