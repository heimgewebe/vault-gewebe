import os
import math
import requests

# --- Einstellungen ---
TILE_DIR = "tiles"
USER_AGENT = "weltgewebe-tile-downloader"

# --- Parameter ---
ZOOM_MIN = 5
ZOOM_MAX = 8
LAT_MIN = 47.0
LAT_MAX = 55.5
LON_MIN = 5.5
LON_MAX = 15.5

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile

def download_tile(z, x, y):
    url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    headers = {"User-Agent": USER_AGENT}
    path = os.path.join(TILE_DIR, str(z), str(x))
    os.makedirs(path, exist_ok=True)
    tile_path = os.path.join(path, f"{y}.png")

    if os.path.exists(tile_path):
        return

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        with open(tile_path, "wb") as f:
            f.write(response.content)
        print(f"✅ {z}/{x}/{y}")
    except Exception as e:
        print(f"❌ Fehler bei {z}/{x}/{y}: {e}")

def run():
    for zoom in range(ZOOM_MIN, ZOOM_MAX + 1):
        xtile_min, ytile_max = deg2num(LAT_MIN, LON_MIN, zoom)
        xtile_max, ytile_min = deg2num(LAT_MAX, LON_MAX, zoom)

        for x in range(xtile_min, xtile_max + 1):
            for y in range(ytile_min, ytile_max + 1):
                download_tile(zoom, x, y)

if __name__ == "__main__":
    run()
