#!/usr/bin/env bash
set -euo pipefail

# 0) Voraussetzungen
python3 - <<'PY' >/dev/null 2>&1 || (echo "Python3 fehlt!"; exit 1)
import sys
PY

python3 - <<'PY'
import sys, subprocess
def pipi(p): subprocess.call([sys.executable,"-m","pip","install","--user","--upgrade",*p])
pipi(["flask","requests"])
PY

mkdir -p "$HOME/hauski"
APP="$HOME/hauski/app.py"

cat > "$APP" <<'PY'
import os, json, subprocess, pathlib
from flask import Flask, request, jsonify, send_from_directory

RPC = "http://127.0.0.1:6680/mopidy/rpc"
BIN = str(pathlib.Path.home() / "bin")
AUDIO_MODE = str(pathlib.Path(BIN) / "audio-mode")  # dein Umschalter
VOL_DEFAULT = 60

import requests
app = Flask(__name__, static_folder="static", static_url_path="/static")

def rpc(method, **params):
    r = requests.post(RPC, json={"jsonrpc":"2.0","id":1,"method":method,"params":params}, timeout=3)
    r.raise_for_status()
    j = r.json()
    if "error" in j: raise RuntimeError(j["error"])
    return j.get("result")

def now():
    t = rpc("core.playback.get_current_track") or {}
    name = t.get("name","–")
    artist = (t.get("artists") or [{}])[0].get("name","–")
    album = (t.get("album") or {}).get("name","–")
    return {"track": name, "artist": artist, "album": album}

def hw_params():
    # heuristik: suche cardX/pcm0p/sub0
    base = pathlib.Path("/proc/asound")
    for card in base.glob("card*/pcm0p/sub0/hw_params"):
        try:
            txt = card.read_text()
            # einfache Extraktion von RATE und FORMAT
            rate = next((l.split(":")[1].strip() for l in txt.splitlines() if l.startswith("rate:")), "")
            form = next((l.split(":")[1].strip() for l in txt.splitlines() if l.startswith("format:")), "")
            return {"card": card.parts[-5], "rate": rate or _get("RATE", txt), "format": form or _get("FORMAT", txt), "raw": txt}
        except Exception:
            pass
    return {"card": None, "rate": None, "format": None, "raw": None}

def _get(key, txt):
    for l in txt.splitlines():
        if key in l.upper():
            return l.split(":")[-1].strip()
    return None

@app.get("/api/status")
def api_status():
    try:
        state = rpc("core.playback.get_state")
    except Exception as e:
        state = f"error: {e}"
    return jsonify({
        "now": now(),
        "state": state,
        "hw": hw_params()
    })

@app.post("/api/play")
def api_play():
    rpc("core.playback.play"); return "", 204

@app.post("/api/pause")
def api_pause():
    rpc("core.playback.pause"); return "", 204

@app.post("/api/next")
def api_next():
    rpc("core.playback.next"); return "", 204

@app.post("/api/vol")
def api_vol():
    v = int((request.json or {}).get("v", VOL_DEFAULT))
    v = max(0, min(100, v))
    rpc("core.mixer.set_volume", volume=v)
    return "", 204

@app.post("/api/mode")
def api_mode():
    mode = (request.json or {}).get("mode","pulse")
    if mode not in ("pulse","alsa"):
        return jsonify({"error":"mode must be pulse|alsa"}), 400
    # rufe dein audio-mode Script auf
    try:
        out = subprocess.check_output([AUDIO_MODE, mode], stderr=subprocess.STDOUT, text=True, timeout=20)
        return jsonify({"ok": True, "out": out})
    except subprocess.CalledProcessError as e:
        return jsonify({"ok": False, "out": e.output, "rc": e.returncode}), 500

# sehr einfache UI
INDEX = """
<!doctype html>
<meta charset="utf-8">
<title>HausKI Jukebox</title>
<style>body{font:16px system-ui;margin:2rem}button{margin:.25rem .5rem}.row{margin:.5rem 0}</style>
<h1>HausKI Jukebox</h1>
<div class=row>
  <button onclick="post('/api/play')">▶ Play</button>
  <button onclick="post('/api/pause')">⏸ Pause</button>
  <button onclick="post('/api/next')">⏭ Next</button>
  <input id=v type=range min=0 max=100 value=60 oninput="vol(this.value)">
</div>
<div class=row>
  <button onclick="mode('pulse')">Pulse (Komfort)</button>
  <button onclick="mode('alsa')">ALSA (Hi-Res)</button>
</div>
<pre id=stat>Loading…</pre>
<script>
async function post(u, body){ await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body: body?JSON.stringify(body):null}); refresh(); }
function vol(v){ post('/api/vol',{v:parseInt(v)}) }
function mode(m){ post('/api/mode',{mode:m}) }
async function refresh(){
  try{
    const r = await fetch('/api/status'); const j = await r.json();
    const n = j.now, hw = j.hw;
    document.getElementById('stat').textContent =
      `State: ${j.state}\nNow: ${n.track} — ${n.artist} [${n.album}]\n` +
      `Audio: ${hw.card||'?'}  Rate=${hw.rate||'?'}  Format=${hw.format||'?'}\n`;
  }catch(e){ document.getElementById('stat').textContent = 'Status error: '+e; }
}
setInterval(refresh, 2000); refresh();
</script>
"""
@app.get("/")
def root():
    return INDEX
PY

# Launcher
cat > "$HOME/hauski/run.sh" <<'SH'
#!/usr/bin/env bash
cd "$(dirname "$0")"
export PYTHONUNBUFFERED=1
python3 app.py 2>&1 | sed 's/^/[hauski] /'
SH
chmod +x "$HOME/hauski/run.sh"

echo
echo "✅ HausKI-Minimalpanel installiert."
echo "Start:    $HOME/hauski/run.sh"
echo "Öffnen:   http://127.0.0.1:8765  (wird von Flask automatisch gebunden)"
echo
python3 - <<'PY'
from flask import Flask
print("Hinweis: Falls Port 8765 belegt ist, passt das Script app.py an (app.run).")
PY

# Starten (im Hintergrund) – oder manuell ./run.sh in neuem Terminal
( FLASK_APP="$APP" python3 - <<'PY' & ) >/dev/null 2>&1
import app as A
A.app.run(host="127.0.0.1", port=8765, debug=False)
PY
sleep 0.8
echo "→ Panel sollte jetzt laufen. Öffne: http://127.0.0.1:8765"