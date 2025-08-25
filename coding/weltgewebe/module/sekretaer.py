from pathlib import Path
import json
from datetime import datetime
import re

# === PFADSETUP ===
WELTGEWEBE_ROOT = Path(__file__).resolve().parent.parent
DATENORDNER = WELTGEWEBE_ROOT / 'daten' / 'rollen-daten'
DATENORDNER.mkdir(parents=True, exist_ok=True)

# Dateipfade
JSON_DATEI     = DATENORDNER / 'rollen-daten.json'
MODUL_JS_DATEI = DATENORDNER / 'rollen-daten.js'
LOG_DATEI      = DATENORDNER / 'rollen-log.json'

# === HILFSMETHODEN ===
def slugify(text):
    text = text.lower()
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^\w\-]', '', text)
    return text

def validate_rolle(rolle):
    return isinstance(rolle, dict) and "name" in rolle and isinstance(rolle["name"], str)

def clean_rolle(rolle, for_export=False):
    return {
        k: v for k, v in rolle.items()
        if v is not None and v != "" and (not for_export or (not k.startswith('_') and k != "adresse"))
    }

# === LADEN ===
def lade_rollen():
    if JSON_DATEI.exists():
        try:
            return json.loads(JSON_DATEI.read_text(encoding='utf-8'))
        except Exception:
            return []
    return []

# === SPEICHERN ===
def speichere_rollen(neue_rollen, ersetze_komplett=False):
    alt = lade_rollen()
    slug_alt = {r["slug"]: r for r in alt if "slug" in r}
    zeitstempel = datetime.now().isoformat(timespec="seconds")
    validierte_rollen = []

    for r in neue_rollen:
        if not validate_rolle(r):
            continue
        r = clean_rolle(r)  # interne Speicherung: alles bleibt
        if "slug" not in r or not r["slug"]:
            r["slug"] = slugify(r["name"])
        r["_updated"] = zeitstempel
        validierte_rollen.append(r)

    # Merge oder Komplett ersetzen
    if ersetze_komplett:
        daten = validierte_rollen
    else:
        merged = slug_alt.copy()
        for r in validierte_rollen:
            merged[r["slug"]] = r
        daten = list(merged.values())

    # Speichern als JSON (vollständig)
    JSON_DATEI.write_text(json.dumps(daten, indent=2), encoding='utf-8')

    # Speichern als minimierter ES6-Export ohne "_", ohne "adresse"
    export_ready = [clean_rolle(r, for_export=True) for r in daten]
    export_code = f"export const rollenDaten={json.dumps(export_ready,separators=(',',':'))};"
    MODUL_JS_DATEI.write_text(export_code, encoding='utf-8')

    # Log-Eintrag
    logeintrag = {
        "zeit": zeitstempel,
        "anzahl_neu": len(validierte_rollen)
    }
    try:
        log = json.loads(LOG_DATEI.read_text(encoding='utf-8')) if LOG_DATEI.exists() else []
        log.append(logeintrag)
        LOG_DATEI.write_text(json.dumps(log, indent=2), encoding='utf-8')
    except Exception:
        pass
