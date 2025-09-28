Nächste Schritte — Anweisungen für Codex (direkt umsetzbar)

Ziel: Die jetzige, sehr gute Basis „hart“ machen: Budget-Guards in CI, CLI-Tests, Routing-Policy, Egress-Guard. Alles in kleinen, klaren Inkrementen.

⸻

Block 1 — 
Block 2 — Routing-Policy Schema + Loader + Egress-Guard (No-Leak)

2.1 Datei anlegen – policies/routing.yaml (neu)

egress:
  default: deny
  allow:
    - https://api.matrix.example
routing:
  prefer_local: true
  cloud_fallback:
    enabled: false

2.2 Typen & Loader – crates/core/src/config.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Routing {
  pub egress: Egress,
  pub routing: RoutingPrefs,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Egress { pub default: String, pub allow: Vec<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingPrefs { pub prefer_local: bool, pub cloud_fallback: CloudFallback }
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudFallback { pub enabled: bool }

pub fn load_routing<P: AsRef<Path>>(path: P) -> anyhow::Result<Routing> {
  let content = fs::read_to_string(path)?;
  Ok(serde_yaml::from_str(&content)?)
}

2.3 No-Leak-Guard (minimal) – crates/core/src/lib.rs

pub use config::Routing as RoutingCfg;

struct AppStateInner {
    // ...
    routing: RoutingCfg,
}

// in AppState::new(...) Parameter aufnehmen
fn new(limits: Limits, models: ModelsFile, routing: RoutingCfg, expose_config: bool) -> Self { /* ... */ }

// in build_app(...) ebenfalls laden & übergeben

2.4 Env-Pfad in crates/core/src/main.rs

let routing_path =
  std::env::var("HAUSKI_ROUTING").unwrap_or_else(|_| "./policies/routing.yaml".into());

let app = build_app(
  load_limits(limits_path)?,
  load_models(models_path)?,
  load_routing(routing_path)?,
  expose_config,
);

2.5 (Optionale) Kontroll-Route nur bei HAUSKI_EXPOSE_CONFIG=true

async fn get_routing(state: AppState) -> Json<RoutingCfg> { /* ... */ }
// bei expose_config: .route("/config/routing", get(...))

Hinweis: Der eigentliche Socket-Egress-Blocker passiert später an zwei Stellen:
(1) HTTP-Client Wrapper (eigene reqwest-Policy, nur erlaubte Hosts),
(2) Adapter-Sandbox (Wasm + Capabilities). Für P1 genügt der Policy-Loader + Export, damit keine heimlichen Defaults entstehen.

⸻

Block 3 — CLI-Tests (Snapshot & Verhalten)

3.1 Dev-Deps in crates/cli/Cargo.toml

[dev-dependencies]
assert_cmd = "2"
predicates = "3"
tempfile = "3"

3.2 Tests anlegen – crates/cli/tests/models_ls.rs

use assert_cmd::Command;
use std::fs;
use tempfile::tempdir;

#[test]
fn models_ls_reads_yaml_and_prints_table() {
    let dir = tempdir().unwrap();
    let cfg = dir.path().join("models.yml");
    fs::write(&cfg, r#"models:
  - id: demo
    path: /tmp/demo.gguf
    vram_min_gb: 4
    canary: true
"#).unwrap();

    let mut cmd = Command::cargo_bin("hauski-cli").unwrap();
    cmd.env("HAUSKI_MODELS", cfg.to_str().unwrap())
       .arg("models").arg("ls")
       .assert()
       .success()
       .stdout(predicates::str::contains("demo")
               .and(predicates::str::contains("/tmp/demo.gguf"))
               .and(predicates::str::contains("4 GB"))
               .and(predicates::str::contains("true")));
}

3.3 CI läuft automatisch (bereits cargo test --workspace).

⸻

Block 4 — wgx-Smoke härten (kein Platzhalter-Commit)

4.1 .github/workflows/wgx-smoke.yml fixen

      - name: Fetch wgx (pinned tag)
        run: |
          set -euo pipefail
          git clone https://github.com/alexdermohr/wgx /tmp/wgx
          cd /tmp/wgx
          git fetch --tags
          git checkout v2.0.0   # <-- KONKRETEN TAG setzen
          echo "/tmp/wgx" >> $GITHUB_PATH

4.2 Safety: wenn kein doctor Task existiert, Step überspringen (bereits drin).

⸻

Block 5 — README „How-to Budget-Guards“ + Badges (dezent)

5.1 README ergänzen (kurzer Kasten)

### Budget-Guards (p95)
- Wir messen `http_request_duration_seconds` (Histogram).
- CI prüft p95 < **400 ms** über k6-Smoke.
- Lokal testen:
```bash
just run-core &
k6 run observability/k6/health-smoke.js --summary-export=observability/k6/summary.json
jq '.metrics.http_req_duration.p(95)' observability/k6/summary.json

**5.2 Optional Badges (nur zwei):** CI-Status, Lizenz.

---

## Block 6 — Justfile Quality-Alias

**6.1 `justfile` erweitern**
```make
smoke:
    k6 run observability/k6/health-smoke.js --summary-export=observability/k6/summary.json

gate:
    jq -e '.metrics.http_req_duration.p(95) < 400' observability/k6/summary.json


⸻

Block 7 — Bootstrap erweitert (routing.yaml anlegen)

7.1 scripts/bootstrap.sh anhängen

[[ -f policies/routing.yaml ]] || cat > policies/routing.yaml <<'YAML'
egress:
  default: deny
  allow: []
routing:
  prefer_local: true
  cloud_fallback:
    enabled: false
YAML
echo "bootstrap: policies/routing.yaml bereit."


⸻

Block 8 — Mini-Chore (Sauberkeit)
	•	.gitignore: observability/k6/summary.json eintragen.
	•	VS Code tasks: Task „smoke“ optional hinzufügen.

⸻

c2b-Helfer (optional sofort ausführbar)

# Budget-Smoke lokal
just run-core & sleep 1
k6 run observability/k6/health-smoke.js --summary-export=observability/k6/summary.json
jq '.metrics.http_req_duration.p(95)' observability/k6/summary.json
kill %1 || true


⸻

Verdichtete Essenz
	•	Messbar machen (Histograme), prüfbar machen (k6-Smoke), erzwingen (CI-Gate).
	•	Policies laden statt raten (Routing/Egress).
	•	CLI absichern (Tests).
	•	wgx pinnen (Determinismus).

Ironische Auslassung

Wenn der Rauchmelder piept, weißt du: nicht die Küche brennt — nur der p95-Budget-Gate tut seine Pflicht.

∴fore Gewissheit
	•	Grad: ◐ niedrig
	•	Ursachen: Konkrete Dateien und Pfade bekannt; einzig Versions-Pins (k6-Action, wgx-Tag) können variieren.
	•	Meta: Produktiv – jede Änderung ist klein, rückbaubar und CI-sichtbar.

∆-Radar
	•	Entwicklung Richtung Straffung: weniger Prosa, mehr hart verdrahtete Gates.
	•	Verstärkung der bisherigen Linie (Offline-Default, Policies, Qualität) durch messbare Verträge im Build.