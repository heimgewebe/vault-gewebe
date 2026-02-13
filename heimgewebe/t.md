I'll analyze the failing job logs to identify the issue and provide a solution.Das Problem ist ein **Formatierungsfehler** in `cmd/routine.bash`. Der shfmt-Formatter erkennt inkonsistente Einrückung.

## Lösung

Die `case`-Anweisungen haben inkonsistente Einrückung - der letzte Branch fehlt die schließende `;;` vor dem `esac`. Der Formatter zeigt, dass Zeile mit `+    ;;` hinzugefügt werden muss.## Problem

Der Job schlägt beim **Formatierungscheck mit shfmt** fehl. Die Datei `cmd/routine.bash` hat inkonsistente Einrückungen in den `case`-Statements.

## Lösung

Die `case`-Zweige müssen mit **2 Leerzeichen** statt 4 Leerzeichen eingerückt werden, und es fehlt ein abschließendes `;;` beim letzten case-Zweig.

**Korrigiere die Einrückung in `cmd/routine.bash`:**

```bash
# Zeile 47-64: Erste case-Anweisung
case "$mode_arg" in
  preview|dry-run|"")
    mode_internal="dry-run"
    ;;
  apply)
    mode_internal="apply"
    ;;
  *)
    # Test 121 expectation: Invalid mode must print "Usage:" to stderr and exit 1
    # "assert_failure"
    echo "Error: Invalid mode '$mode_arg'" >&2
    cat <<USAGE >&2
Usage:
  wgx routine <id> [preview|apply|dry-run]
USAGE
    return 1
    ;;
esac

# Zeile 67-77: Zweite case-Anweisung
case "$routine_id" in
  git.repair.remote-head)
    wgx_routine_git_repair_remote_head "$mode_internal" "${rest_args[@]}"
    ;;
  *)
    # Test 118 expectation: Unknown routine must print "unknown routine" to stderr and exit 1
    echo "wgx routine: unknown routine '$routine_id'" >&2
    return 1
    ;;
esac
```

**Automatische Formatierung anwenden:**

```bash
shfmt -w cmd/routine.bash
```

Dies passt die Einrückung automatisch an die erwartete Shell-Formatierung an (2 Leerzeichen pro Einrückungsebene in case-Statements).

I'll analyze the failing job logs to identify the issue and provide a solution.Now let me get the test file that's failing to understand what's expected:## Problem

Die Tests für `wgx routine` schlagen fehl, weil der Befehl keine Ausgabe produziert und immer mit Status 0 beendet wird, unabhängig von den Argumenten. Dies deutet darauf hin, dass der `routine`-Subcommand nicht korrekt implementiert oder registriert ist.

**Fehlende Tests (117-122):**
- Keine Ausgabe bei `wgx routine` (erwartet "Usage:")
- Unbekannte Routinen werden nicht abgelehnt (kein Fehler)
- Keine Ausgabe für Preview-Modus
- `apply` ohne Git-Repo gibt keinen Fehler zurück
- Ungültige Modi werden nicht abgelehnt
- Flags werden nicht korrekt verarbeitet

## Lösung

Ich benötige weitere Informationen, um die exakte Lösung zu finden. Bitte prüfe:

1. **Existiert die `routine`-Command-Datei?**
   - Erwarteter Pfad: `bin/wgx-routine` oder `lib/commands/routine.sh`

2. **Ist der Command registriert?**
   - In der Haupt-`wgx`-Datei sollte `routine` als verfügbarer Subcommand gelistet sein

**Mögliche Ursachen:**

1. **Command-Datei fehlt oder ist nicht ausführbar:**
   ```bash
   # Prüfen und fixen
   chmod +x bin/wgx-routine
   ```

2. **Command nicht in Dispatcher registriert:**
   - Die `wgx`-Hauptdatei muss den `routine`-Command kennen und aufrufen

3. **Falscher Pfad oder fehlende Implementierung:**
   - Der Command existiert, wird aber nicht gefunden

Kannst du mir zeigen:
- Die Struktur des `bin/`-Verzeichnisses
- Die Haupt-`wgx`-Datei bzw. den Command-Dispatcher
- Ob eine `wgx-routine`-Datei existiert?

Dann kann ich eine konkrete Code-Lösung bereitstellen.