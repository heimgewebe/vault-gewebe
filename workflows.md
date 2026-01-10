Die Ursache für den Fehler ist im Log eindeutig:  
Der Bash-Skriptaufruf schlägt fehl, weil die Datei  
`/home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh`  
nicht existiert:

```
/usr/bin/bash: /home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh: No such file or directory
Process completed with exit code 1.
```

**Lösung:**  
Das Problem ist meist eine fehlerhafte Angabe des Skriptpfads oder ein Step, der die Datei erstellen oder herunterladen sollte, aber dies nicht tut.

**1. Workflow: Step überprüfen**  
Öffne die CI-Workflow-Datei [.github/workflows/ci.yml (ref: 11b2c19431b24aa4d2ac0cc2f00d8f8087b6ea3d)](https://github.com/heimgewebe/weltgewebe/blob/11b2c19431b24aa4d2ac0cc2f00d8f8087b6ea3d/.github/workflows/ci.yml).  
Finde den Schritt, der das Skript ausführt (meist als `run`-Step oder `uses: actions/github-script`).

**2. Prüfen, wie die Datei erzeugt wird:**  
- Wird sie vorher aus einer Quelle/Repo/Download erstellt?
- Gibt es einen Schreib- oder Copy-Fehler?
- Ist der Name eventuell dynamisch, fehlt aber?

**3. Lösungsvorschlag:**
- Optimiere den Workflow, sodass die Datei im Step davor zuverlässig angelegt wird, etwa per echo, Download oder Checkout.
- Füge eine Prüfung hinzu: Vor dem Ausführen zuerst mit `ls` oder `test -f` checken und im Fehlerfall aussagekräftig abbrechen.
- Beispiel für einen Schritt im Workflow:

```yaml
- name: Skript anlegen
  run: |
    echo '#!/bin/bash' > /home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh
    echo 'echo Hello Weltgewebe' >> /home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh
    chmod +x /home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh

- name: Skript ausführen
  run: /home/runner/work/_temp/98f4e942-5716-425a-8c56-586e7ac01210.sh
```

Falls das Skript heruntergeladen werden soll, prüfe die URL/den Download-Step und stelle sicher, dass der Download erfolgreich ist.

**Kurz:**  
- Stelle sicher, dass das Bash-Skript vor dem Ausführen tatsächlich existiert und im selben Job erzeugt oder korrekt heruntergeladen wird.
- Prüfe Pfadangaben und dynamische Variablen.
- Ergänze den Workflow gegebenenfalls wie oben gezeigt und mache Fehler transparent.

Gern sende ich dir den relevanten Abschnitt aus `.github/workflows/ci.yml`, falls du das möchtest!


