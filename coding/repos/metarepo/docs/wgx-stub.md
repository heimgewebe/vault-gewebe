# WGX-Doku-Stubs im metarepo

Das metarepo liefert nur **Verweise** auf die kanonische WGX-Dokumentation.
Alle inhaltlichen Details (Policies, CLI-Referenz, Troubleshooting) liegen im
[WGX-Repository](https://github.com/heimgewebe/wgx).

## Zweck des Stubs
- Einheitliche Platzhalter-Datei (`docs/wgx-konzept.md`) in allen Sub-Repos.
- Verlinkt auf die Master-Doku und erklärt kurz den lokalen Bezug (Profil, Runbooks).
- Verhindert Dokument-Drift zwischen Fleet und Engine.

## Einbindung in Sub-Repos
Die Datei `templates/docs/wgx-konzept.md` wird bei jedem Sync verteilt.
Sub-Repos sollen sie **nicht** eigenständig erweitern, sondern auf neue Inhalte im WGX-Repo verweisen.

```markdown
# WGX – Einstieg
Mehr dazu: https://github.com/heimgewebe/wgx
```

## Änderungen am Stub
- Anpassungen nur hier im metarepo vornehmen.
- Wenn tiefergehende Doku nötig ist, Issue/PR im WGX-Repo eröffnen.
- Kurze Changelog-Notiz in der Sync-PR hinterlassen (z. B. „WGX-Stub Link auf neues Kapitel aktualisiert“).
