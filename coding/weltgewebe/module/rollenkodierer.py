# rollenkodierer.py – Version: kodiererΣ.v5.4.rollenload.fix

import ui, json, re, requests, ast
import console
import logging
from pathlib import Path
from sekretaer import speichere_rollen, lade_rollen

MODULPFAD = Path(__file__).resolve().parent
OFFLINE_HTML = (MODULPFAD / "leaflet_offline.html").as_uri()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# === Geocoding ===
def geocode(adresse):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search",
                         params={"q": adresse, "format": "json", "limit": 1},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data and isinstance(data, list) and "lat" in data[0] and "lon" in data[0]:
            return float(data[0]["lat"]), float(data[0]["lon"]), "nominatim"
    except Exception as e:
        logging.warning(f"Nominatim-Fehler: {e}")
    try:
        r = requests.get("https://photon.komoot.io/api",
                         params={"q": adresse, "limit": 1},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        coords = data["features"][0]["geometry"]["coordinates"]
        return coords[1], coords[0], "photon"
    except Exception as e:
        logging.warning(f"Photon-Fehler: {e}")
    return 53.570, 10.071, "fallback"

# === Reverse Geocoding ===
def reverse_geocode(lat, lon):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/reverse",
                         params={"format": "json", "lat": lat, "lon": lon, "zoom": 18},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("display_name"):
            return data["display_name"], "nominatim"
    except Exception as e:
        logging.warning(f"Reverse Nominatim Fehler: {e}")
    try:
        r = requests.get("https://photon.komoot.io/reverse",
                         params={"lat": lat, "lon": lon},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        props = data["features"][0]["properties"]
        parts = [props.get(k) for k in ["name", "street", "housenumber", "postcode", "city", "country"]]
        display_name = ", ".join(filter(None, parts))
        if display_name:
            return display_name, "photon"
    except Exception as e:
        logging.warning(f"Reverse Photon Fehler: {e}")
    return f"{lat}, {lon}", "fallback"

# === GUI ===
class Encoder(ui.View):
    def __init__(self):
        self.name_in = ui.TextField(placeholder="🧵 name")
        self.name_in.delegate = self
        self.name_in.action = self.name_field_confirmed
        self.adresse_in = ui.TextField(placeholder="📍 adresse")
        self.webview = ui.WebView()
        self.lokalisieren_btn = ui.Button(title="📍 lokalisieren", action=self.lokalisieren)
        self.eintragen_btn = ui.Button(title="➕ eintragen", action=self.eintragen)
        self.austragen_btn = ui.Button(title="➖ austragen", action=self.austragen)

        for el in [self.name_in, self.adresse_in, self.webview,
                   self.lokalisieren_btn, self.eintragen_btn, self.austragen_btn]:
            self.add_subview(el)

        self._marker_pos = (53.570, 10.071)
        self._rolle_aktiv = False
        self.webview.load_url((MODULPFAD / "karte.html").as_uri())
        self.webview.python_callback = self._js_callback_handler

    def layout(self):
        w, h = self.width, self.height
        self.name_in.frame = (20, 40, w - 40, 40)
        self.adresse_in.frame = (20, 100, w - 40, 40)
        bw = (w - 60) / 3
        self.lokalisieren_btn.frame = (20, 160, bw, 44)
        self.eintragen_btn.frame = (30 + bw, 160, bw, 44)
        self.austragen_btn.frame = (40 + 2 * bw, 160, bw, 44)
        self.webview.frame = (20, 220, w - 40, h - 240)

    def _js_callback_handler(self, name, *args):
        if name == 'markerDragged':
            ui.in_background(lambda: self._on_marker_dragged(args[0], args[1]))
        elif name == 'log':
            print(f"JS Log: {args[0]}")

    def _on_marker_dragged(self, lat, lon):
        self._marker_pos = (lat, lon)
        adresse, quelle = reverse_geocode(lat, lon)
        self.adresse_in.text = adresse
        console.hud_alert(f"📍 Adresse aktualisiert ({quelle})", 'success')

    def set_marker(self, lat, lon):
        self._marker_pos = (lat, lon)
        js = f"setMarker({lat}, {lon});"
        self.webview.evaluate_javascript(js)

    def get_marker(self, callback):
        try:
            result = self.webview.evaluate_javascript("getMarkerPos()")
            self.handle_pos(result, callback)
        except Exception:
            callback(self._marker_pos)

    def handle_pos(self, result, callback):
        try:
            if result:
                parsed = json.loads(result)
                if isinstance(parsed, list) and len(parsed) == 2:
                    self._marker_pos = tuple(parsed)
        except Exception:
            pass
        callback(self._marker_pos)

    def lokalisieren(self, sender):
        adr = self.adresse_in.text.strip()
        if adr:
            lat, lon, quelle = geocode(adr)
            self.set_marker(lat, lon)
            console.hud_alert(f"📍 lokalisiert ({quelle})", 'success')
        else:
            if not self._rolle_aktiv:
                console.hud_alert("⚠️ keine rolle aktiv", 'error')
                return
            lat, lon = self._marker_pos
            adresse, quelle = reverse_geocode(lat, lon)
            self.adresse_in.text = adresse
            self.set_marker(lat, lon)
            console.hud_alert(f"📍 adresse ergänzt ({quelle})", 'success')

    def eintragen(self, sender):
        name = self.name_in.text.strip()
        if not name:
            console.hud_alert("⚠️ name fehlt", 'error')
            return

        def speichere(pos):
            adresse, quelle = reverse_geocode(pos[0], pos[1])
            self.adresse_in.text = adresse
            slug = re.sub(r"\W+", "_", name.lower())
            rolle = {
                "name": name,
                "slug": slug,
                "lat": pos[0],
                "lon": pos[1],
                "adresse": adresse
            }
            speichere_rollen([rolle])
            self._rolle_aktiv = True
            console.hud_alert(f"✅ rolle eingetragen ({quelle})", 'success')

        self.get_marker(speichere)

    def austragen(self, sender):
        name = self.name_in.text.strip()
        if not name:
            console.hud_alert("⚠️ name fehlt", 'error')
            return
        slug = re.sub(r"\W+", "_", name.lower())
        rollen = lade_rollen()
        neue = [r for r in rollen if r["slug"] != slug]
        if len(neue) < len(rollen):
            speichere_rollen(neue, ersetze_komplett=True)
            self.name_in.text = ""
            self.adresse_in.text = ""
            self.set_marker(53.570, 10.071)
            self._rolle_aktiv = False
            console.hud_alert("➖ rolle ausgetragen & marker zurückgesetzt", 'success')
        else:
            console.hud_alert("🔍 rolle nicht gefunden", 'warning')

    def name_field_confirmed(self, sender):
        self.load_rollen_daten()

    def textfield_did_end_editing(self, textfield):
        if textfield == self.name_in:
            self.load_rollen_daten()

    def load_rollen_daten(self):
        name = self.name_in.text.strip()
        if not name:
            return
        slug = re.sub(r"\W+", "_", name.lower())
        for r in lade_rollen():
            if r.get("slug", "").strip().lower() == slug:
                self._rolle_aktiv = True
                self.set_marker(r.get("lat", 53.570), r.get("lon", 10.071))
                self.adresse_in.text = r.get("adresse", "")
                console.hud_alert("🔁 rolle geladen", 'success')
                return
        self._rolle_aktiv = False
        console.hud_alert("🚫 rolle nicht gefunden", 'error')

def activate():
    e = Encoder()
    e.present('fullscreen', hide_title_bar=False, title_bar_color='black', title_color='white')

if __name__ == '__main__':
    activate()
