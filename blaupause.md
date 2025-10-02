mega — hier ist ein „Start-Blueprint“ als Copy-to-Bash für dein hauski-audio Modul:
Ein Monorepo mit Rust (axum) Backend + sehr schlanker UI (statisches HTML/JS), das sofort läuft.
Die API spricht Mopidy-JSON-RPC, nutzt deinen vorhandenen audio-mode-Schalter und serviert die UI.
(Später kannst du die UI einfach durch SvelteKit ersetzen – Pfad ist schon so gewählt.)

Einfach komplett kopieren, im Terminal einfügen, Enter. Danach lies die 3 Zeilen „Wie starten“ am Ende 👇

#!/usr/bin/env bash
set -euo pipefail

# === Pfade & Basics ===========================================================
ROOT="$HOME/hauski-audio"
BACK="$ROOT/backend"
UI="$ROOT/ui"                  # heute: statisch; später: SvelteKit build nach ./ui/dist
BIN="$HOME/bin"
mkdir -p "$ROOT" "$BACK/src" "$UI/dist" "$BIN"

# === .env (Konfig) ============================================================
cat > "$ROOT/.env" <<'ENV'
# HausKI-Audio Konfiguration
MOPIDY_RPC=http://127.0.0.1:6680/mopidy/rpc
BIND_ADDR=127.0.0.1
BIND_PORT=8787
AUDIO_MODE_BIN=$HOME/bin/audio-mode
ENV

# === README ===================================================================
cat > "$ROOT/README.md" <<'MD'
# hauski-audio (Blueprint)

- **Backend:** Rust (axum) – REST-API für Mopidy JSON-RPC + Audio-Mode Umschalter.
- **UI:** statische App (heute), served vom Backend unter `/` (später: SvelteKit-Build → `ui/dist`).
- **Konfig:** `.env` im Repo-Root.

## API (heute)
- `GET /api/status` → { now:{track,artist,album}, state, hw:{card,rate,format} }
- `POST /api/play` / `pause` / `next`
- `POST /api/vol`  JSON: {"v":0..100}
- `POST /api/mode` JSON: {"mode":"pulse"|"alsa"}

## Dev-Run
```bash
cd backend
cargo run
# → http://127.0.0.1:8787

Deploy (systemd –user)

systemctl --user enable --now hauski-audio
journalctl --user -u hauski-audio -f

UI austauschen (SvelteKit später)
	•	Baue SvelteKit → Output nach ui/dist/ schreiben.
	•	Das Backend serviert automatisch alles aus ui/dist.
MD

=== Backend: Cargo.toml ======================================================

cat > “$BACK/Cargo.toml” <<‘TOML’
[package]
name = “hauski-audio”
version = “0.1.0”
edition = “2021”

[dependencies]
axum = { version = “0.7”, features = [“json”] }
tokio = { version = “1”, features = [“macros”, “rt-multi-thread”, “process”] }
serde = { version = “1”, features = [“derive”] }
serde_json = “1”
reqwest = { version = “0.12”, features = [“json”] }
tower-http = { version = “0.5”, features = [“cors”, “fs”] }
dotenvy = “0.15”
anyhow = “1”
once_cell = “1”
tracing = “0.1”
tracing-subscriber = { version = “0.3”, features = [“fmt”, “env-filter”] }
TOML

=== Backend: src/main.rs =====================================================

cat > “$BACK/src/main.rs” <<‘RS’
use std::{env, net::SocketAddr, path::PathBuf, process::Stdio};
use anyhow::Result;
use axum::{
extract::State,
routing::{get, post},
Json, Router,
};
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::{fs, process::Command};
use tower_http::{cors::CorsLayer, services::ServeDir};
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

static HTTP: Lazy = Lazy::new(|| Client::new());

#[derive(Clone)]
struct Cfg {
rpc: String,
audio_mode: PathBuf,
ui_dir: PathBuf,
}

#[derive(Serialize)]
struct Now {
track: String,
artist: String,
album: String,
}

#[derive(Serialize)]
struct Hw {
card: Option,
rate: Option,
format: Option,
}

#[derive(Serialize)]
struct Status {
now: Now,
state: String,
hw: Hw,
}

#[derive(Deserialize)]
struct ModeReq { mode: String }
#[derive(Deserialize)]
struct VolReq { v: u8 }

#[tokio::main]
async fn main() -> Result<()> {
dotenvy::dotenv().ok();
let filter = EnvFilter::try_from_default_env()
.unwrap_or_else(|_| EnvFilter::new(“info”));
tracing_subscriber::fmt().with_env_filter(filter).init();

let rpc = env::var("MOPIDY_RPC").unwrap_or_else(|_| "http://127.0.0.1:6680/mopidy/rpc".into());
let audio_mode = env::var("AUDIO_MODE_BIN")
    .map(PathBuf::from)
    .unwrap_or_else(|_| PathBuf::from(format!("{}/bin/audio-mode", env::var("HOME").unwrap())));
let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1".into());
let bind_port: u16 = env::var("BIND_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8787);
let ui_dir = PathBuf::from(env::var("UI_DIST").unwrap_or_else(|_| {
    let home = env::var("HOME").unwrap();
    format!("{home}/hauski-audio/ui/dist")
}));

let cfg = Cfg { rpc, audio_mode, ui_dir };

let api = Router::new()
    .route("/status", get(api_status))
    .route("/play",   post(api_play))
    .route("/pause",  post(api_pause))
    .route("/next",   post(api_next))
    .route("/vol",    post(api_vol))
    .route("/mode",   post(api_mode))
    .with_state(cfg.clone());

let app = Router::new()
    .nest("/api", api)
    .nest_service("/", ServeDir::new(&cfg.ui_dir))
    .layer(CorsLayer::permissive());

let addr: SocketAddr = format!("{bind_addr}:{bind_port}").parse().unwrap();
info!("hauski-audio listening on http://{addr}");
axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
Ok(())

}

async fn api_play(State(cfg): State) -> Json<serde_json::Value> {
let _ = mopidy_rpc(&cfg.rpc, “core.playback.play”, None).await;
Json(serde_json::json!({“ok”: true}))
}
async fn api_pause(State(cfg): State) -> Json<serde_json::Value> {
let _ = mopidy_rpc(&cfg.rpc, “core.playback.pause”, None).await;
Json(serde_json::json!({“ok”: true}))
}
async fn api_next(State(cfg): State) -> Json<serde_json::Value> {
let _ = mopidy_rpc(&cfg.rpc, “core.playback.next”, None).await;
Json(serde_json::json!({“ok”: true}))
}
async fn api_vol(State(cfg): State, Json(req): Json) -> Json<serde_json::Value> {
let v = req.v.min(100);
let _ = mopidy_rpc(&cfg.rpc, “core.mixer.set_volume”, Some(serde_json::json!({“volume”: v}))).await;
Json(serde_json::json!({“ok”: true}))
}
async fn api_mode(State(cfg): State, Json(req): Json) -> Json<serde_json::Value> {
let mode = req.mode.to_lowercase();
if mode != “pulse” && mode != “alsa” {
return Json(serde_json::json!({“ok”: false, “error”: “mode must be pulse|alsa”}));
}
let out = Command::new(&cfg.audio_mode)
.arg(&mode)
.stdout(Stdio::piped())
.stderr(Stdio::piped())
.output()
.await;
match out {
Ok(o) => Json(serde_json::json!({“ok”: true, “stdout”: String::from_utf8_lossy(&o.stdout)})),
Err(e) => Json(serde_json::json!({“ok”: false, “error”: e.to_string()})),
}
}
async fn api_status(State(cfg): State) -> Json {
let state = mopidy_rpc(&cfg.rpc, “core.playback.get_state”, None).await
.and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_else(|| “unknown”.into());
let now = mopidy_rpc(&cfg.rpc, “core.playback.get_current_track”, None).await
.and_then(|v| v.as_object().cloned()).unwrap_or_default();
let track = now.get(“name”).and_then(|v| v.as_str()).unwrap_or(”–”).to_string();
let artist = now.get(“artists”)
.and_then(|v| v.as_array()).and_then(|a| a.get(0))
.and_then(|a| a.get(“name”)).and_then(|v| v.as_str()).unwrap_or(”–”).to_string();
let album = now.get(“album”).and_then(|a| a.get(“name”))
.and_then(|v| v.as_str()).unwrap_or(”–”).to_string();

let hw = read_hw_params().await.unwrap_or_default();

Json(Status {
    now: Now { track, artist, album },
    state,
    hw,
})

}

async fn mopidy_rpc(rpc: &str, method: &str, params: Option<serde_json::Value>) -> Option<serde_json::Value> {
let body = serde_json::json!({“jsonrpc”:“2.0”,“id”:1,“method”:method,“params”: params.unwrap_or(serde_json::json!({}))});
match HTTP.post(rpc).json(&body).send().await {
Ok(r) => match r.json::<serde_json::Value>().await {
Ok(j) => j.get(“result”).cloned(),
Err(e) => { error!(“rpc json err: {e}”); None }
},
Err(e) => { error!(“rpc http err: {e}”); None }
}
}

async fn read_hw_params() -> Result {
// Heuristik: suche irgendein /proc/asound/card*/pcm0p/sub0/hw_params
let root = “/proc/asound”;
let mut card: Option = None;
let mut rate: Option = None;
let mut format: Option = None;

if let Ok(mut rd) = fs::read_dir(root).await {
    while let Ok(Some(entry)) = rd.next_entry().await {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !name.starts_with("card") { continue; }
        let p = entry.path().join("pcm0p/sub0/hw_params");
        if let Ok(txt) = fs::read_to_string(&p).await {
            card = Some(name);
            for line in txt.lines() {
                if let Some(rest) = line.strip_prefix("rate:") {
                    rate = Some(rest.trim().to_string());
                }
                if let Some(rest) = line.strip_prefix("format:") {
                    format = Some(rest.trim().to_string());
                }
            }
            break;
        }
    }
}
Ok(Hw { card, rate, format })

}
RS

=== UI: sehr einfache Steuerseite (ersetzbar durch SvelteKit-Build) ==========

cat > “$UI/dist/index.html” <<‘HTML’
<!doctype html>


<title>HausKI Audio</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font:16px system-ui;margin:2rem;max-width:860px}
  button{margin:.25rem .5rem;padding:.5rem 1rem}
  .row{margin:.75rem 0}
  .card{border:1px solid #ddd;padding:1rem;border-radius:.5rem}
  .small{opacity:.8}
</style>
<h1>HausKI Audio</h1>


<div class="card">
  <div class="row">
    <button onclick="post('/api/play')">▶ Play</button>
    <button onclick="post('/api/pause')">⏸ Pause</button>
    <button onclick="post('/api/next')">⏭ Next</button>
    <label class="small">Vol <input id="vol" type="range" min="0" max="100" value="60" oninput="vol(this.value)"></label>
  </div>
  <div class="row">
    <button onclick="mode('pulse')">Pulse (Komfort)</button>
    <button onclick="mode('alsa')">ALSA (Hi-Res)</button>
  </div>
  <pre id="stat">Lade Status…</pre>
</div>


<p class="small">Hinweis: Diese UI ist ein Platzhalter. Später ersetzt du <code>ui/dist</code> durch den Build deiner SvelteKit-App.</p>


<script>
async function post(u, body){ await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body: body?JSON.stringify(body):null}); refresh(); }
function vol(v){ post('/api/vol',{v:parseInt(v)}) }
function mode(m){ post('/api/mode',{mode:m}) }
async function refresh(){
  try{
    const r = await fetch('/api/status'); const j = await r.json();
    const n = j.now, hw = j.hw;
    document.getElementById('stat').textContent =
`State: ${j.state}
Now:   ${n.track} — ${n.artist} [${n.album}]
Audio: ${hw.card||'?'}  Rate=${hw.rate||'?'}  Format=${hw.format||'?'}`
  }catch(e){ document.getElementById('stat').textContent = 'Status error: '+e; }
}
setInterval(refresh, 2000); refresh();
</script>


HTML

=== systemd –user Service (Backend) =========================================

mkdir -p “$HOME/.config/systemd/user”
cat > “$HOME/.config/systemd/user/hauski-audio.service” <<‘UNIT’
[Unit]
Description=HausKI Audio (Rust axum)
After=network.target

[Service]
Type=simple
EnvironmentFile=%h/hauski-audio/.env
WorkingDirectory=%h/hauski-audio/backend
ExecStart=/usr/bin/env bash -lc ‘cargo run –release’
Restart=on-failure
RestartSec=2s

[Install]
WantedBy=default.target
UNIT

=== Git init (optional) ======================================================

if command -v git >/dev/null 2>&1; then
cd “$ROOT”
git init -q
printf “/target/\n/ui/dist/\n**/*.log\n” > .gitignore
fi

echo
echo “✅ Blueprint angelegt unter: $ROOT”
echo “Wie starten:”
echo “  1) cd "$BACK" && cargo run”
echo “  2) Browser öffnen:  http://127.0.0.1:8787”
echo “  3) (Optional Autostart)  systemctl –user enable –now hauski-audio && journalctl –user -u hauski-audio -f”

## Was du jetzt hast
- **Rust-Backend (axum)** mit Endpoints:
  - `POST /api/play`, `/pause`, `/next`, `/vol`  
  - `POST /api/mode` (ruft dein `~/bin/audio-mode` auf: **pulse** ↔ **alsa**)  
  - `GET /api/status` (holt Mopidy-Status + echte **RATE/FORMAT** aus `/proc/asound/.../hw_params`)
- **UI (statisch)** wird direkt ausgeliefert → sofort bedienbar.
- **systemd-User-Service** für Autostart.

## SvelteKit später einhängen (Mini-Plan)
1) SvelteKit-App in `hauski-audio/ui/` entwickeln.  
2) Build so konfigurieren, dass Output nach `ui/dist/` geht (default `build/`; einfach `vite.config` auf `outDir: 'dist'`).  
3) `npm run build` → Backend serviert automatisch den neuen Build.

Wenn du willst, baue ich dir als Nächstes ein **SvelteKit-Starter-Gerüst** (mit denselben Buttons), das sauber nach `ui/dist` baut – dann ersetzt du nur die `index.html`.