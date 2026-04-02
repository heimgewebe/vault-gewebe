

Wir erstellen eine strukturierte, technisch belastbare Dokumentation mit:

- Setup
    
- Architekturentscheidungen
    
- Wrapper-Design
    
- JSON-Guard
    
- Observatorium-Konzept
    
- Risiken
    
- offene Punkte
    

---

# Dokumentation: Obsidian CLI Integration (Stand 2026-03-02)

---

## 1. Ausgangslage

- Obsidian Version: **1.12.4**
    
- Installationsart: **Flatpak**
    
- Vault: `vault-gewebe`
    
- Vault-Pfad: `/home/alex/vault-gewebe`
    
- CLI aktiviert in:  
    `Settings → General → Advanced → Command line interface`
    

### Besonderheiten

- CLI-Symlink:  
    `~/.local/bin/obsidian → /var/lib/flatpak/exports/bin/md.obsidian.Obsidian`
    
- Wiederkehrende Warnungen:
    
    - D-Bus system bus socket fehlt
        
    - canberra-gtk-module fehlt
        
- Funktionalität trotzdem intakt (Create/Read/Append/Prepend/Search OK)
    

---

## 2. Validierte CLI-Funktionalität

### Erfolgreich getestet:

|Funktion|Status|
|---|---|
|`create`|OK|
|`read`|OK|
|`append`|OK|
|`prepend`|OK|
|`daily:append`|OK|
|`search format=json`|OK|
|`vault info`|OK|

### Smoke-Datei

`Sandbox/cli-smoke.md`

### Daily Note

`2026-03-02.md` wurde via CLI erweitert.

---

## 3. Architekturentscheidung

### Problem

Obsidian CLI mischt:

- Debug-/Electron-Ausgaben
    
- JSON-Ausgaben
    

→ JSON nicht deterministisch parsebar.

### Lösung: Output-Trennung

Wir haben zwei Wrapper eingeführt:

---

### 3.1 obsidian-clean

Zweck:

- stderr in Logdatei umleiten
    
- stdout unverändert lassen
    

```bash
obsidian "$@" 2>>"$LOG_FILE"
```

Nutzen:

- Terminal bleibt sauber
    
- Fehler bleiben nachvollziehbar
    

---

### 3.2 obsidian-json

Zweck:

- Nur echte JSON-Zeile ausgeben
    
- Debug-Ausgaben entfernen
    

```bash
obsidian "$@" 2>&1 | awk '
  BEGIN {found=0}
  /^[[:space:]]*[\{\[]/ {print; found=1; exit}
  END { if (!found) exit 2 }
'
```

Designentscheidung:

- JSON wird als erste Zeile extrahiert
    
- Exit-Code 2, wenn kein JSON gefunden
    

---

## 4. Observatorium-Konzept

Neue Struktur im Vault:

```
Observatorium/
├── README.md
└── _machine/
    ├── insights-daily.md
    └── search-cli-smoke.json
```

### Zweck

Obsidian fungiert als:

> UI-Schicht für maschinell erzeugte Artefakte

Nicht mehr nur Editor, sondern Artefakt-Frontend.

---

## 5. JSON-Pipeline

### Ablauf

1. CLI Search:
    
    ```bash
    obsidian-json search format=json
    ```
    
2. JSON speichern:
    
    ```
    Observatorium/_machine/search-cli-smoke.json
    ```
    
3. Markdown-Referenz generieren:
    
    ```
    Observatorium/search-cli-smoke.md
    ```
    

### Effekt

Maschine → JSON → Markdown → Wiki-Links → Obsidian-Graph

Das ist der erste echte Integrations-Loop.

---

## 6. Daily Log Strategie

Anfangs:

- Neue Header pro Lauf
    

Optimiert zu:

- Eine einzelne Log-Zeile pro Ausführung
    

Beispiel:

```
- auto-log: 2026-03-02T14:56:14+01:00 cli ok (heim-pc)
```

Ziel:

- Kein Daily-Spam
    
- Minimale Drift
    

---

## 7. Risiken

|Risiko|Bewertung|Status|
|---|---|---|
|JSON-Verschmutzung|hoch|gelöst via obsidian-json|
|Daily-Überwuchs|mittel|minimiert|
|D-Bus Fehler|gering-mittel|toleriert|
|Flatpak-Eigenheiten|unklar|beobachten|

---

## 8. Offene Punkte

1. D-Bus dauerhaft fixen oder ignorieren?
    
2. Mehrzeiliges JSON zukünftig robust extrahieren?
    
3. systemd --user Timer einsetzen?
    
4. Integration mit heimgeist/leitstand?
    

---

## 9. Meta-Analyse

### Was ist passiert?

Obsidian wurde transformiert von:

> Editor

zu

> deterministischer Artefakt-Senke mit CLI-Gate

### Entscheidender Hebel

Nicht die CLI selbst, sondern:

- Output-Determinismus
    
- Wrapper-Architektur
    
- JSON als Vertrag
    

---

## 10. Essenz

Obsidian CLI ist jetzt:

- aktiv
    
- getestet
    
- robust gemacht
    
- pipelinefähig
    
- Observatorium-integriert
    

Nicht mehr experimentell, sondern systemtauglich.

---

## Unsicherheitsgrad

0.11  
Ursachen:

- D-Bus Nebenwirkungen unklar
    
- zukünftige CLI-Output-Änderungen möglich
    

## Interpolationsgrad

0.19  
Annahmen:

- Observatorium bleibt Artefakt-Senke
    
- JSON bleibt single-line Liste
    

---

## Humor

Du hast aus einem Notizprogramm eine semi-formale Artefakt-Maschine gebaut.  
Das ist der Moment, in dem Markdown beginnt, sich nach Governance anzufühlen.

---
