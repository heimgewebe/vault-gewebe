import ui, json, re, requests, ast
import console
from sekretaer import speichere_rollen, lade_rollen

# === HTML-Vorlagen ===
OFFLINE_HTML = 'leaflet_offline.html'
ONLINE_HTML = 'leaflet_online.html'

# === Geocoding mit Fallback ===
def try_geocode(adresse):
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search",
                         params={"q": adresse, "format": "json", "limit": 1},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"]), "nominatim"
    except: pass
    try:
        r = requests.get("https://photon.komoot.io/api",
                         params={"q": adresse, "limit": 1},
                         headers={"User-Agent": "weltgewebe-rollenkodierer"}, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("features"):
            coords = data["features"][0]["geometry"]["coordinates"]
            return coords[1], coords[0], "photon"
    except: pass
    return 53.570, 10.071, "fallback"

# === GUI ===
class Encoder(ui.View):
    def __init__(self):
        self.offline = False
        self.name_in = ui.TextField(placeholder="🧵 name", action=self.name_enter)
        self.adresse_in = ui.TextField(placeholder="📍 adresse", action=self.adresse_enter)
        self.webview = ui.WebView()
        self.lokalisieren_btn = ui.Button(title="📍 lokalisieren", action=self.lokalisieren)
        self.eintragen_btn = ui.Button(title="➕ eintragen", action=self.eintragen)
        self.austragen_btn = ui.Button(title="➖ austragen", action=self.austragen)
        self.mode_btn = ui.Button(title="🌐 online", action=self.toggle_mode)
        for el in [self.name_in, self.adresse_in, self.webview,
                   self.lokalisieren_btn, self.eintragen_btn, self.austragen_btn, self.mode_btn]:
            self.add_subview(el)
        self.set_neu()
        self.reload_map()

    def layout(self):
        w, h = self.width, self.height
        self.name_in.frame = (20, 40, w - 40, 40)
        self.adresse_in.frame = (20, 100, w - 40, 40)
        bw = (w - 90) / 4
        self.lokalisieren_btn.frame = (20, 160, bw, 44)
        self.eintragen_btn.frame = (30 + bw, 160, bw, 44)
        self.austragen_btn.frame = (40 + 2*bw, 160, bw, 44)
        self.mode_btn.frame = (50 + 3*bw, 160, bw, 44)
        self.webview.frame = (20, 220, w - 40, h - 230)

    def reload_map(self):
        html_file = OFFLINE_HTML if self.offline else ONLINE_HTML
        with open(html_file, encoding='utf-8') as f:
            self.webview.load_html(f.read())

    def set_neu(self):
        self.name_in.text = self.adresse_in.text = ""

    def set_marker(self, lat, lon):
        js = f"setMarker({lat}, {lon});"
        self.webview.evaluate_javascript(js)

    def get_marker_pos(self):
        res = self.webview.evaluate_javascript("getMarkerPos()")
        try:
            latlon = ast.literal_eval(res)
            if isinstance(latlon, (list, tuple)) and len(latlon) == 2:
                return float(latlon[0]), float(latlon[1])
        except: pass
        return 53.570, 10.071  # fallback, wenn JS nicht antwortet

    def name_enter(self, sender): self.adresse_in.begin_editing()
    def adresse_enter(self, sender): self.lokalisieren(None)

    def lokalisieren(self, sender):
        name = self.name_in.text.strip()
        adr = self.adresse_in.text.strip()
        slug = re.sub(r"\W+", "_", name.lower())

        if not adr and name:
            rollen = lade_rollen()
            passende = [r for r in rollen if r["slug"] == slug]
            if len(passende) == 1:
                lat, lon = passende[0]["lat"], passende[0]["lon"]
                self.adresse_in.text = f"{lat:.6f}, {lon:.6f}"
                self.set_marker(lat, lon)
                self.adresse_in.begin_editing()
                console.hud_alert("✏️ lokalisierung geladen", 'success', 1.3)
            elif len(passende) > 1:
                console.hud_alert("⚠️ name mehrfach. adresse nötig", 'error', 1.5)
            else:
                console.hud_alert("🔍 rolle nicht gefunden", 'warning', 1.3)
            return

        if not adr:
            console.hud_alert("📍 adresse fehlt", 'error', 1.3)
            return
        lat, lon, quelle = try_geocode(adr)
        self.set_marker(lat, lon)
        console.hud_alert(f"📍 position lokalisiert ({quelle})", 'success', 0.9)

    def eintragen(self, sender):
        name = self.name_in.text.strip()
        adr = self.adresse_in.text.strip()
        if not name or not adr:
            console.hud_alert("⚠️ name + adresse nötig", 'error', 1.5)
            return
        slug = re.sub(r"\W+", "_", name.lower())
        lat, lon = self.get_marker_pos()  # <<< HIER: wirklich aktuelle Position
        rolle = {
            "name": name, "slug": slug,
            "lat": float(lat), "lon": float(lon),
            "_kommentar": f"rollenkodierer-eintrag, adresse: {adr}"
        }
        rollen = lade_rollen()
        rollen = [r for r in rollen if r["slug"] != slug] + [rolle]
        speichere_rollen(rollen)
        console.hud_alert("➕ rolle eingetragen", 'success', 1.3)
        self.set_neu()

    def austragen(self, sender):
        name = self.name_in.text.strip()
        if not name:
            console.hud_alert("⚠️ name fehlt", 'error', 1.5)
            return
        slug = re.sub(r"\W+", "_", name.lower())
        rollen = lade_rollen()
        neue = [r for r in rollen if r["slug"] != slug]
        if len(neue) < len(rollen):
            speichere_rollen(neue, ersetze_komplett=True)
            console.hud_alert("➖ rolle ausgetragen", 'success', 1.3)
        else:
            console.hud_alert("🔍 rolle nicht gefunden", 'warning', 1.3)
        self.set_neu()

    def toggle_mode(self, sender):
        self.offline = not self.offline
        self.mode_btn.title = "🌐 online" if not self.offline else "📦 offline"
        self.reload_map()

def activate():
    e = Encoder()
    e.present('fullscreen', hide_title_bar=False, title_bar_color='black', title_color='white')

if __name__ == '__main__':
    activate()