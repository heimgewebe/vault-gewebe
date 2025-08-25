# sekretaer.py
from pathlib import Path
import json
from datetime import datetime
import logging # Neues Modul für robustere Protokollierung

# Konfiguration (könnte auch aus einer separaten Datei geladen werden)
# Für diesen Vorschlag bleiben sie hier, um das Beispiel kompakt zu halten.
CONFIG = {
    "DATA_DIR_NAME": "daten/rollendaten",
    "JSON_FILE_NAME": "rollen-daten.json",
    "JS_FILE_NAME": "rollen-daten.js",
    "LOG_FILE_NAME": "rollen-log.json",
    "DELETED_FILE_NAME": "rollen-geloescht.json",
    "USER_AGENT_APP": "weltgewebe-rollenkodierer" # Beispiel, könnte auch in rollenkodierer.py konfiguriert werden
}

# === INITIALISIERUNG ===
MODULORDNER = Path(__file__).resolve().parent
DATENORDNER = MODULORDNER.parent / CONFIG["DATA_DIR_NAME"]
DATENORDNER.mkdir(parents=True, exist_ok=True)

JSON_DATEI = DATENORDNER / CONFIG["JSON_FILE_NAME"]
JS_DATEI = DATENORDNER / CONFIG["JS_FILE_NAME"]
LOG_DATEI = DATENORDNER / CONFIG["LOG_FILE_NAME"]
GELOESCHT_DATEI = DATENORDNER / CONFIG["DELETED_FILE_NAME"]

# Logging einrichten
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(DATENORDNER / "sekretaer.log"), # Neues Log für sekretaer-Interne Fehler/Infos
        logging.StreamHandler()
    ]
)

# === HILFSFUNKTIONEN FÜR DATEIOPERATIONEN ===

def _read_json_file(file_path, default_value=None):
    """Liest eine JSON-Datei und gibt den Inhalt zurück. Behandelt Fehler."""
    if not file_path.exists():
        return default_value if default_value is not None else []
    try:
        content = file_path.read_text(encoding='utf-8')
        return json.loads(content)
    except json.JSONDecodeError as e:
        logging.error(f"Fehler beim Decodieren von JSON-Datei {file_path}: {e}")
        return default_value if default_value is not None else []
    except Exception as e:
        logging.error(f"Unerwarteter Fehler beim Lesen von {file_path}: {e}")
        return default_value if default_value is not None else []

def _write_json_file(file_path, data, indent=2):
    """Schreibt Daten in eine JSON-Datei."""
    try:
        file_path.write_text(json.dumps(data, indent=indent), encoding='utf-8')
    except Exception as e:
        logging.error(f"Fehler beim Schreiben von JSON-Datei {file_path}: {e}")

def _write_js_file(file_path, data, var_name="window.rollenDaten"):
    """Schreibt Daten in eine JavaScript-Datei für den Client."""
    try:
        js_code = f"{var_name}={json.dumps(data, separators=(',', ':'))};"
        file_path.write_text(js_code, encoding='utf-8')
    except Exception as e:
        logging.error(f"Fehler beim Schreiben von JS-Datei {file_path}: {e}")

# === LOGIK-SCHICHT ===

def lade_rollen():
    """Lädt Rollen aus der JSON-Datei."""
    return _read_json_file(JSON_DATEI, default_value=[])

def _ermittle_geloeschte_rollen(alte_rollen, neue_rollen_slugs):
    """Ermittelt Rollen, die gelöscht wurden."""
    geloeschte = []
    for rolle in alte_rollen:
        if rolle.get("slug") not in neue_rollen_slugs:
            geloeschte.append(rolle)
    return geloeschte

def _archiviere_geloeschte_rollen(geloeschte_rollen, zeitstempel):
    """Archiviert gelöschte Rollen."""
    if not geloeschte_rollen:
        return

    archiv = _read_json_file(GELOESCHT_DATEI, default_value=[])
    for r in geloeschte_rollen:
        archiv.append(dict(r, _deleted=zeitstempel))
    _write_json_file(GELOESCHT_DATEI, archiv)
    logging.info(f"Archiviert {len(geloeschte_rollen)} gelöschte Rollen.")


def _fuehre_rollen_zusammen(alte_rollen, neue_rollen, zeitstempel):
    """Führt alte und neue Rollen zusammen."""
    merged = {r["slug"]: r for r in alte_rollen if r.get("slug")}
    for r in neue_rollen:
        if r.get("slug"): # Sicherstellen, dass slug vorhanden ist
            r["_updated"] = zeitstempel
            merged[r["slug"]] = r
        else:
            logging.warning(f"Rolle ohne 'slug' konnte nicht hinzugefügt/aktualisiert werden: {r}")
    return list(merged.values())

def _erstelle_log_eintrag(neue_rollen_count, geloeschte_slugs, quelle):
    """Erstellt einen Log-Eintrag."""
    zeitstempel = datetime.now().isoformat(timespec="seconds")
    logeintrag = {
        "zeit": zeitstempel,
        "anzahl_neu": neue_rollen_count,
        "anzahl_geloescht": len(geloeschte_slugs),
        "slugs_geloescht": geloeschte_slugs,
        "quelle": quelle
    }
    log = _read_json_file(LOG_DATEI, default_value=[])
    log.append(logeintrag)
    _write_json_file(LOG_DATEI, log)
    logging.info(f"Log-Eintrag erstellt: {logeintrag}")

# === HAUPTFUNKTIONEN ===

def speichere_rollen(neue_rollen, ersetze_komplett=False):
    """
    Speichert die Rollen.
    
    Args:
        neue_rollen (list): Die Liste der neuen/aktualisierten Rollen.
        ersetze_komplett (bool): Wenn True, werden die alten Rollen vollständig
                                  durch die neuen ersetzt (nach Archivierung gelöschter).
    """
    alte_rollen = lade_rollen()
    zeitstempel = datetime.now().isoformat(timespec="seconds")

    # 1. Gelöschte Rollen ermitteln und archivieren
    neue_rollen_slugs = {r["slug"] for r in neue_rollen if r.get("slug")}
    geloeschte = _ermittle_geloeschte_rollen(alte_rollen, neue_rollen_slugs)
    _archiviere_geloeschte_rollen(geloeschte, zeitstempel)

    # 2. Daten zusammenführen oder ersetzen
    if ersetze_komplett:
        # Nur Rollen behalten, die nicht als gelöscht markiert wurden
        daten_zu_speichern = [r for r in neue_rollen if r.get("slug") not in {g["slug"] for g in geloeschte}]
    else:
        daten_zu_speichern = _fuehre_rollen_zusammen(alte_rollen, neue_rollen, zeitstempel)

    # 3. Daten speichern (JSON und JS)
    _write_json_file(JSON_DATEI, daten_zu_speichern)
    _write_js_file(JS_DATEI, daten_zu_speichern)

    # 4. Log aktualisieren
    _erstelle_log_eintrag(len(neue_rollen), [r["slug"] for r in geloeschte], "sekretaer.py")
    logging.info(f"Rollen erfolgreich gespeichert. Neue Anzahl: {len(daten_zu_speichern)}")

def loesche_rolle(slug):
    """
    Löscht eine Rolle anhand ihres Slugs.
    
    Args:
        slug (str): Der Slug der zu löschenden Rolle.
    
    Returns:
        bool: True, wenn die Rolle gefunden und gelöscht wurde, False sonst.
    """
    rollen = lade_rollen()
    neue_rollen = [r for r in rollen if r.get('slug') != slug]
    
    if len(neue_rollen) < len(rollen):
        speichere_rollen(neue_rollen, ersetze_komplett=True)
        logging.info(f"Rolle '{slug}' erfolgreich gelöscht.")
        return True
    else:
        logging.warning(f"Rolle '{slug}' zum Löschen nicht gefunden.")
        return False

# Beispielaufruf (nur zum Testen, im Produktivcode durch rollenkodierer.py gesteuert)
if __name__ == '__main__':
    logging.info("Sekretaer Modul gestartet für Testzwecke.")
    # Beispiel zum Speichern
    test_rollen = [
        {"name": "Testrolle 1", "slug": "testrolle_1", "lat": 50.0, "lon": 10.0},
        {"name": "Testrolle 2", "slug": "testrolle_2", "lat": 51.0, "lon": 11.0}
    ]
    speichere_rollen(test_rollen)

    # Beispiel zum Laden
    geladene_rollen = lade_rollen()
    logging.info(f"Geladene Rollen: {geladene_rollen}")

    # Beispiel zum Aktualisieren
    test_rollen_update = [
        {"name": "Testrolle 1", "slug": "testrolle_1", "lat": 50.1, "lon": 10.1}, # Aktualisiert
        {"name": "Neue Rolle 3", "slug": "neue_rolle_3", "lat": 52.0, "lon": 12.0} # Neu
    ]
    speichere_rollen(test_rollen_update)

    # Beispiel zum Löschen
    loesche_rolle("testrolle_2") # Sollte gelöscht werden

    logging.info("Sekretaer Modul Test abgeschlossen.")

