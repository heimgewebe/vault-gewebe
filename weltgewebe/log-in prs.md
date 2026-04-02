**These**

Der nächste Schritt ist **nicht** „noch mehr Backend“, sondern ein **sichtbarer Onboarding-Flow für die Accounterstellung**. Die aktive Doku verlangt ausdrücklich zwei Wege bei der Accounterstellung:

1. **verortete Garnrolle** mit Personenangaben, genauer Adresse und Ungenauigkeitsradius
    
2. **RoN** ohne Personenangaben, mit explizitem Hinweis vor Abschluss.
    

**Antithese**

Man könnte stattdessen zuerst API-Endpunkte für Profilpflege, Adressspeicherung oder Radius-Updates bauen. Das wäre technisch sauber, aber UX-seitig falsch priorisiert: Im Dump ist bereits sichtbar, dass die aktuelle Web-UI faktisch nur eine **Login-Seite mit Magic Link** anbietet. Damit bleibt die eigentliche Identitätsentscheidung unsichtbar, obwohl die Doku sie zum Kern macht.

**Synthese**

Der nächste Schritt sollte ein **kleiner, abgeschlossener, UI-first PR** sein:

# Nächster Schritt: „Accounterstellung als Zwei-Wege-Start“

## Ziel

Die bisherige Login-Seite wird zu einem **Einstieg in die Accounterstellung** umgebaut, ohne das Auth-System wegzuwerfen.

Nicht bauen:

- kompletten Profil-Editor
    
- echte Adresspersistenz
    
- Kartenprojektion für RoN-Stadtteilzentrum
    
- fertige Settings-Seite
    

Sondern bauen:

- **Entscheidungsseite /login oder /start**
    
- klare Wahl:
    
    - **Mit Adresse fortfahren**
        
    - **Ohne Angaben fortfahren (RoN)**
        
- RoN-Hinweistext gemäß Doku
    
- Radius nur im verorteten Pfad als **UI-Vorbereitung**, gern zunächst lokal/disabled/coming soon, wenn der Persistenzpfad noch fehlt
    

## Warum genau das?

Weil die Doku den Schwerpunkt auf **bewusste Moduswahl** legt, nicht auf versteckte Provisionierung. In der aktiven ADR ist das Web-Rollout genau so beschrieben: Accounterstellung anpassen, alten RoN-Toggle aus den Einstellungen entfernen, Slider beibehalten.

## Konkreter Zuschnitt für den PR

### Pfad A — RoN

Ein Nutzer kann:

- E-Mail eingeben
    
- bewusst „Ohne Personenangaben fortfahren“ wählen
    
- vor dem Absenden sehen:
    
    - dass er der Rolle ohne Namen zugeordnet wird
        
    - dass keine individuelle öffentliche Verortung entsteht
        
    - dass öffentliche Wirksamkeit später kollektiv über die RoN des Stadtteils läuft.
        

Technisch kann dieser Pfad vorerst einfach den bestehenden Magic-Link-Flow nutzen, denn auto-provisionierte Accounts starten ohnehin bereits als `type="ron"` / `mode="ron"` mit neutralem Titel.

### Pfad B — verortete Garnrolle

Ein Nutzer kann:

- „Mit Adresse fortfahren“ wählen
    
- sehen, welche Angaben später nötig sind:
    
    - Personenangaben
        
    - genaue Adresse
        
    - Ungenauigkeitsradius.
        

Aber: **X fehlt, nötig für Y.**  
Es fehlt im gezeigten Stand ein belegter Web/API-Pfad, mit dem diese Angaben heute schon wirklich gespeichert werden könnten. Deshalb sollte dieser Pfad im nächsten PR **als strukturierter Vorbereitungspfad** erscheinen, nicht als halbgare Fake-Funktion.

Also:

- entweder als „kommt im nächsten Schritt“
    
- oder als Form mit deaktiviertem Abschluss-Button und ehrlicher Markierung „noch nicht speicherbar“
    

Das ist besser als eine UI, die schon tut, als gäbe es Verortung, obwohl sie im System noch nicht eingelöst ist. Der Benutzer merkt solche Attrappen meist früher als das Burndown-Chart.

## Empfehlung zur Umsetzung

Ich würde es so schneiden:

### PR 1 — jetzt

**„Login → Onboarding-Gabel“**

- bestehende Login-Seite umbauen
    
- zwei Karten/Buttons:
    
    - **Verortete Garnrolle**
        
    - **Rolle ohne Namen**
        
- RoN-Text gemäß Doku
    
- Magic-Link-Request bleibt technisch erhalten
    
- RoN-Pfad ist funktional
    
- verorteter Pfad ist sichtbar vorbereitet, aber ehrlich als nächster Schritt markiert
    

### PR 2 — danach

**„Verortete Registrierung vervollständigen“**

- Felder für Personenangaben + Adresse
    
- Radius-UI
    
- passender Persistenzpfad API-seitig
    
- nach erfolgreicher Eingabe Wechsel von provisioniertem RoN → verortete Garnrolle oder direkte verortete Anlage, je nach gewünschtem Modell
    

## Was wir anders machen sollten

Die eigentliche Kurskorrektur ist begrifflich:

Nicht:

- **Login zuerst, Identität später irgendwie**
    

Sondern:

- **Identitätsweg zuerst sichtbar, Auth als Transportmittel**
    

Das kippt die Sinnachse von „Authentifizierung“ zu „Eintrittsform ins Gewebe“. Und genau diese Achse ist laut Doku zentral.

## Minimaler Arbeitsplan

1. `apps/web/src/routes/login/+page.svelte` in Zwei-Wege-Onboarding umbauen.
    
2. RoN-Pfad mit bestehendem `authStore.requestLogin(email)` verbinden.
    
3. Verortet-Pfad zunächst als vorbereiteten, nicht vortäuschenden UI-Pfad anlegen.
    
4. Texte streng an `docs/konzepte/garnrolle-und-verortung.md` und ADR-0003 ausrichten.
    
5. Settings unangetastet lassen; dort wurde der alte RoN-Toggle bereits sinnvoll entfernt.
    
6. Tests nur für den neuen UI-Zustandswechsel und den funktionalen RoN-Absprung ergänzen.
    

## Was ich ausdrücklich nicht im selben Schritt mischen würde

- Kartenlogik
    
- Stadtteilzentrum-Projektion
    
- My-Account-Panel
    
- vollständige Profilbearbeitung
    
- neue Domain-Contracts
    

Das wäre wieder der klassische PR-Salat: alles schmeckt nach Fortschritt, bis man hineinbeißt und nur rohe Zwiebel findet.

**Essenz**

Hebel: **Login-Seite in bewusste Identitätsgabel verwandeln.**  
Entscheidung: **Jetzt UI-Onboarding bauen, nicht noch ein stilles Backend-Puzzleteil.**  
Nächste Aktion: **PR „Login → Zwei-Wege-Accounterstellung (RoN funktionsfähig, Verortet vorbereitet)“ aufsetzen.**

**Unsicherheitsgrad:** 0.16  
Ursachen: Nicht belegt ist im Dump ein fertiger Persistenzpfad für echte verortete Registrierung.

**Interpolationsgrad:** 0.19  
Hauptannahmen: Dass der verortete Pfad derzeit noch nicht vollständig speicherbar ist und deshalb als vorbereiteter, ehrlicher UI-Pfad geschnitten werden sollte.