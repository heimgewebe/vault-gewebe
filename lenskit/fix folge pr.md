**These:**  
Der nächste sinnvolle Schritt ist **kein weiterer großer Architekturhub**, sondern ein **kleiner Entlastungs-PR auf der Write-/Persistenzachse**. Der zuletzt gehärtete Atlas-Lifecycle ist stark genug, dass man ihn jetzt nicht erneut semantisch „anfasst“, sondern nur die Schreibpfade sparsamer und robuster macht.

**Antithese:**  
Zu frühes Weiterbauen Richtung State-Unifikation, Queueing oder Registry-Adopt der API würde den gerade stabilisierten Zustand wieder aufreißen. Das wäre methodisch falsch: erst Reibung senken, dann Architektur verschieben.

**Synthese:**  
Weiteres Vorgehen in **zwei kleinen Etappen**: zuerst ein präziser Persistenz-PR, danach ein kurzer Verifikations-/Entscheidungsblock, ob überhaupt noch ein weiterer Atlas-PR nötig ist oder ob der nächste Hebel außerhalb von Atlas liegt.

**Context7-Relevanz:**  
Hier nicht relevant. Es geht um Repo-interne Atlas-Logik, Persistenzpfade und PR-Planung, nicht um die Nutzung externer Libraries oder Framework-APIs. Repo-Wahrheit ist hier maßgeblich.

---

## Plan für das weitere Vorgehen

### Phase 1 — Diagnose-Only für den Folge-PR

Ziel: belegen, **wo** Progress-Persistenz heute ausgelöst wird und **wie viel** davon redundant ist.

Liefern lassen:

1. belegten Ist-Zustand
    
    - Scanner: wo `on_progress(...)` ausgelöst wird
        
    - CLI: wo `update_snapshot_progress(...)` aufgerufen wird
        
    - API: wo `_write_json_atomic(...)` durch Progress ausgelöst wird
        
    - Unterschiede CLI/SQLite vs. API/JSON klar benennen
        
2. maximal drei Hypothesen
    
    - Hauptlast wahrscheinlich im API-Progress-Write
        
    - sekundär redundante Registry-Updates im CLI-Pfad
        
    - Stall-Heuristik hängt an genügend frischen Emits, nicht an maximal vielen Writes
        
3. minimalen Beweisplan
    
    - Zähle Callback-Aufrufe vs. Persistenz-Aufrufe
        
    - Prüfe, ob identische Werte mehrfach geschrieben werden
        
    - Prüfe, ob finale Success-/Failure-Semantik unabhängig davon stabil bleibt
        
4. Stop-Kriterium
    
    - Patch wird nur gesetzt, wenn redundant gleiche oder praktisch gleiche Progress-Persistenz **belegt** ist
        

---

### Phase 2 — Kleiner Folge-PR: Write-Strategie / Progress-Persistenz

Das ist der eigentliche nächste PR.

#### Ziel

Progress beibehalten, aber Persistenz **drosseln ohne Semantikänderung**.

#### Scope

- keine neuen Statuswerte
    
- kein Registry-Adopt für API
    
- kein WebUI-Umbau
    
- kein Event-Sourcing
    
- kein Queue-System
    

#### Patch-Richtung

1. **Scanner-seitiges Emit-Gate beibehalten, aber sauber dokumentieren**
    
    - bestehendes Zeit-/Datei-Gate nicht semantisch ausweiten
        
    - nur klarer machen, dass Emits diagnostisch sind, nicht Resultat-Ersatz
        
2. **API-Progress lokal entdoppeln**
    
    - im Callback-Kontext merken:
        
        - letzter persistierter `files_seen`
            
        - letzter persistierter `dirs_seen`
            
        - letzter persistierter `bytes_seen`
            
    - nur schreiben, wenn sich diese Werte real geändert haben
        
    - finaler Success-/Failure-Write bleibt unverändert
        
3. **CLI lokal entdoppeln**
    
    - vor `registry.update_snapshot_progress(...)` im CLI-Pfad lokal prüfen, ob die Werte neu sind
        
    - keine zusätzlichen DB-Reads einführen
        
    - keine DB-seitige Komplexität aufblasen
        

#### Erwarteter Effekt

- weniger JSON-Rewrites
    
- weniger SQLite-Updates
    
- keine Änderung der Lifecycle-Logik
    
- keine Drift zwischen CLI und API
    

---

### Phase 3 — Testblock für genau diesen PR

Nicht breit, sondern präzise.

Mindestens:

1. mehrere schnelle Callback-Auslösungen erzeugen **weniger Persistenzvorgänge als Callback-Aufrufe**
    
2. API schreibt bei identischem Fortschritt **nicht erneut**
    
3. CLI ruft Registry-Progress bei identischem Fortschritt **nicht erneut**
    
4. finaler `complete`-/`failed`-Pfad bleibt unverändert
    
5. Zombie-Guard bleibt intakt
    
6. Statusvokabular bleibt `running|complete|failed`
    

Wichtig: nicht nur Endzustände prüfen, sondern **Write-Zahl bzw. Call-Zahl** wirklich messen.

---

### Phase 4 — Mini-Retrospektive direkt nach dem PR

Nach Merge des Entlastungs-PR keine neue Baustelle öffnen, sondern kurz entscheiden:

#### Wenn die Persistenzlast jetzt unkritisch ist

Dann Atlas erstmal **ruhen lassen**.

#### Wenn weiter spürbar problematisch

Dann genau **eine** der folgenden Richtungen wählen:

- A: Error-Sanitization im API-Artefakt
    
- B: Concurrent-Scan-/File-Race-Absicherung
    
- C: spätere State-Unifikation vorbereiten
    

Nicht alles zugleich. Sonst baut ihr wieder drei Werkstätten um, obwohl nur ein Regal wackelt.

---

## Priorisierte Reihenfolge

1. **jetzt**: kleiner Persistenz-/Write-PR
    
2. **danach**: kurze Belastungsbewertung
    
3. **nur falls nötig**: nächster gezielter Atlas-PR
    
4. **erst später**: State-Unifikation als eigener Architektur-PR
    

---

## Alternativpfad

Nicht „noch ein Atlas-PR“, sondern **Atlas hier bewusst abschließen** und den nächsten Hebel anderswo setzen.

Das ist sinnvoll, falls die Diagnose zeigt:

- Write-Amplification ist praktisch klein
    
- realer Schmerz liegt eher bei Error-Sanitization, Diff-Integrität oder API/Registry-Konvergenz
    

Dann wäre ein künstlicher Persistenz-PR nur Git-Kosmetik mit Helm.

---

## Risiko- und Nutzenbild

**Nutzen des nächsten kleinen PR:**

- direkte Entlastung ohne Semantikrisiko
    
- hält den guten Lifecycle-PR klein und sauber nachgeschärft
    
- reduziert Schreiblast ohne Architekturumbau
    

**Risiken:**

- zu aggressives Drosseln könnte Stall-Diagnostik entwerten
    
- zu viel lokale Memoisierung könnte Tests verkomplizieren
    
- DB-seitige Optimierung wäre schnell Overengineering
    

Darum: **lokale Entdoppelung vor persistenter Komplexität**.

---

## Essenz

**Hebel:** redundante Progress-Persistenz reduzieren, nichts Grundsätzliches umbauen.  
**Entscheidung:** nächster PR soll klein, diagnostisch begründet und write-fokussiert sein.  
**Nächste Aktion:** Agent bekommt einen Diagnose-first-Auftrag für genau diesen Entlastungs-PR.

**Unsicherheitsgrad:** 0.21  
Ursache: reale Persistenzlast im Nutzerkontext ist noch nicht gemessen, nur plausibel vermutet.

**Interpolationsgrad:** 0.18  
Hauptannahme: API-JSON-Progress ist der größte Redundanztreiber.

Der richtige nächste Schritt ist also kein neuer Großgedanke, sondern ein leiser Schraubenschlüssel. Architektur liebt Dramatik, aber Repos meist nicht.