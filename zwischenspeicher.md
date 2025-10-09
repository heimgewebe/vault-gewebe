Alright Alex — das ist gut analysiert. Dein CI knallt aus zwei Gründen weg: (a) **vendor/** ist unvollständig → Cargo wird auf “registry = vendor” umgebogen und findet dort z. B. `axum` nicht; (b) bei lokalen Re-Runs blockiert der **Proxy (403)** schon beim `cargo update`. Unten bekommst du einen robusten Fix in drei Schichten: Konfig, Skript, CI-Step — plus c2b-Kommandos.

---

# Sofort-Fix (robust & nachvollziehbar)

## 1) Cargo auf „wirklich vendored“ festnageln

Leg eine eindeutige Cargo-Konfig an, die crates.io **immer** auf `vendor/` ersetzt.

```diff
diff --git a/.cargo/config.toml b/.cargo/config.toml
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.cargo/config.toml
@@ -0,0 +1,19 @@
+# Erzwingt, dass alle crates aus vendor/ kommen.
+# Verhindert "accidentally online"-Builds im CI.
+[source.crates-io]
+replace-with = "vendored-sources"
+
+[source.vendored-sources]
+directory = "vendor"
+
+# Optional nützlich: klare Timeouts/Retry-Politik, falls "ensure-vendor" mal online muss
+[net]
+git-fetch-with-cli = true
+retry = 1
+timeout = 30
```

## 2) Skript: `scripts/ensure-vendor.sh` (diagnosefreudig, offline-fähig)

Dieses Skript

- prüft, ob `Cargo.lock` **und** ein vollständiger Vendor-Snapshot existieren,
    
- regeneriert andernfalls den Snapshot **mit** Lock-Datei,
    
- kann Proxys temporär neutralisieren,
    
- und gibt glasklare Hinweise, wenn z. B. `axum` im vendor fehlt.
    

```diff
diff --git a/scripts/ensure-vendor.sh b/scripts/ensure-vendor.sh
new file mode 100755
index 0000000..2222222
--- /dev/null
+++ b/scripts/ensure-vendor.sh
@@ -0,0 +1,161 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+log(){ printf "%s\n" "$*" >&2; }
+die(){ log "ERR: $*"; exit 1; }
+need(){ command -v "$1" >/dev/null 2>&1 || die "Fehlt: $1"; }
+
+need cargo
+
+ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
+cd "$ROOT"
+
+# --- Optionen ---
+NO_NETWORK="${NO_NETWORK:-0}"        # 1 = zwingend offline bauen (CI nach Vendoring)
+NEUTRALIZE_PROXY="${NEUTRALIZE_PROXY:-1}" # 1 = Proxy-Variablen temporär leeren beim Vendoring
+
+# --- Proxy ggf. neutralisieren, nur für den Vendoring-Teil ---
+orig_http_proxy="${http_proxy:-}";   orig_https_proxy="${https_proxy:-}"
+orig_HTTP_PROXY="${HTTP_PROXY:-}";   orig_HTTPS_PROXY="${HTTPS_PROXY:-}"
+restore_proxy(){
+  export http_proxy="${orig_http_proxy}";   export https_proxy="${orig_https_proxy}"
+  export HTTP_PROXY="${orig_HTTP_PROXY}";   export HTTPS_PROXY="${orig_HTTPS_PROXY}"
+}
+neutralize_proxy(){
+  export http_proxy=""; export https_proxy=""
+  export HTTP_PROXY=""; export HTTPS_PROXY=""
+}
+
+# --- Minimaler Sanity-Check: Lock + vendor Snapshot Zustand ---
+has_lock(){ [[ -f Cargo.lock ]]; }
+has_vendor(){ [[ -d vendor ]] && [[ -f vendor/config.toml ]] || [[ -d vendor/registry ]]; }
+
+missing_axum(){
+  # Quick check: existiert ein axum-* Ordner im vendor?
+  # (versioned-dirs wird unten genutzt, daher axum-<version>)
+  compgen -G "vendor/**/axum-*" >/dev/null 2>&1 || return 0
+  return 1
+}
+
+if [[ "${NO_NETWORK}" == "1" ]]; then
+  log "🌙 NO_NETWORK=1 → erwarte vollständigen vendor/ Snapshot. Kein Online-Zugriff."
+  has_lock || die "Cargo.lock fehlt im Offline-Modus."
+  has_vendor || die "vendor/ fehlt im Offline-Modus."
+  if missing_axum; then
+    die "axum ist im vendor/ nicht auffindbar. Snapshot ist unvollständig."
+  fi
+  log "✅ Offline-Check ok."
+  exit 0
+fi
+
+# --- Online (oder zumindest mit Netzwerk) Vendoring vorbereiten ---
+if [[ ! -f Cargo.lock ]]; then
+  log "🔧 Erzeuge Cargo.lock (generate-lockfile)…"
+  if [[ "${NEUTRALIZE_PROXY}" == "1" ]]; then neutralize_proxy; fi
+  cargo generate-lockfile
+  if [[ "${NEUTRALIZE_PROXY}" == "1" ]]; then restore_proxy; fi
+fi
+
+log "🔧 Erzeuge/aktualisiere vendor-Snapshot (locked, versioned-dirs)…"
+args=(vendor --locked --versioned-dirs vendor)
+if [[ "${NEUTRALIZE_PROXY}" == "1" ]]; then neutralize_proxy; fi
+cargo "${args[@]}"
+if [[ "${NEUTRALIZE_PROXY}" == "1" ]]; then restore_proxy; fi
+
+# Diagnose: ist axum nun da?
+if missing_axum; then
+  log "⚠️  Hinweis: axum wurde im vendor/ nicht gefunden."
+  log "    Prüfe, ob axum wirklich eine direkte oder indirekte Abhängigkeit ist:"
+  log "      cargo tree -e features | grep -i axum || true"
+  cargo tree -e features | grep -i axum || true
+  die "Vendoring abgeschlossen, aber axum fehlt → Abhängigkeitsauflösung/Lock prüfen."
+fi
+
+log "✅ vendor/ Snapshot steht."
```

> Nutzung lokal (ohne Proxy-Ärger):
> 
> ```bash
> # Falls dein Proxy lokale Runs blockiert:
> NEUTRALIZE_PROXY=1 ./scripts/ensure-vendor.sh
> # Komplett offline prüfen:
> NO_NETWORK=1 ./scripts/ensure-vendor.sh
> ```

## 3) CI härtet das durch (Vendoring vor Build + Offline-Build)

Wir ziehen **vor** dem Build das Vendoring glatt, neutralisieren evtl. Proxy-Umgebungen (falls in Org/Repo-Secrets gesetzt), und bauen danach **offline** gegen `vendor/`.

```diff
diff --git a/.github/workflows/heavy.yml b/.github/workflows/heavy.yml
index 68bc5d6..b17397a 100644
--- a/.github/workflows/heavy.yml
+++ b/.github/workflows/heavy.yml
@@ -40,6 +40,29 @@ jobs:
         uses: actions/checkout@v4
         with:
           submodules: false
+
+      - name: Tools installieren
+        uses: dtolnay/rust-toolchain@stable
+
+      - name: Vendoring sicherstellen (Proxy neutralisieren, dann Snapshot, dann offline prüfen)
+        env:
+          # Proxy-Variablen im Vendoring-Step leeren (falls vorhanden)
+          http_proxy: ""
+          https_proxy: ""
+          HTTP_PROXY: ""
+          HTTPS_PROXY: ""
+        run: |
+          set -euo pipefail
+          chmod +x scripts/ensure-vendor.sh
+          # 1) Online-Vendoring mit neutralisiertem Proxy
+          NEUTRALIZE_PROXY=1 ./scripts/ensure-vendor.sh
+          # 2) Offline-Validierung
+          NO_NETWORK=1 ./scripts/ensure-vendor.sh
+
+      - name: Cargo offline bauen
+        env:
+          CARGO_NET_OFFLINE: "true"
+        run: cargo build --workspace --release --locked
```

> Hinweis: Falls dein Workflow anders heißt (z. B. `ci.yml`), übertrage den Block analog direkt **vor** den Build-Step.

---

## 4) Lokaler c2b-Run (einmalig, dann committen)

```bash
# im Repo-Wurzelordner
git pull --rebase

# 1) Konfig und Skript anlegen
mkdir -p .cargo scripts
cat > .cargo/config.toml <<'CFG'
[source.crates-io]
replace-with = "vendored-sources"
[source.vendored-sources]
directory = "vendor"
[net]
git-fetch-with-cli = true
retry = 1
timeout = 30
CFG

cat > scripts/ensure-vendor.sh <<'BASH'
#!/usr/bin/env bash
# (Inhalt wie oben aus dem Patch)
BASH
chmod +x scripts/ensure-vendor.sh

# 2) Vendoring lokal erzeugen (ohne Proxy oder Proxy neutralisieren)
NEUTRALIZE_PROXY=1 ./scripts/ensure-vendor.sh

# 3) Offline-Check erzwingen (stellt sicher, dass z. B. axum wirklich da ist)
NO_NETWORK=1 ./scripts/ensure-vendor.sh

# 4) Commit
git add .cargo/config.toml scripts/ensure-vendor.sh Cargo.lock vendor
git commit -m "build(vendor): lock+vendor robust herstellen; CI offline bauen"
git push
```

Damit eliminierst du:

- „Vendor snapshot incomplete or missing…“ → **Vendor ist vollständig**,
    
- „no matching package named `axum` found…“ → **axum liegt in `vendor/**/axum-*`**,
    
- Proxy-Störungen im CI → **Proxy wird in genau einem Step bewusst neutralisiert**, danach **offline**.
    

---

## Warum das hilft (kurz & simpel)

- **.cargo/config.toml** zwingt Cargo, **nur** aus `vendor/` zu ziehen.
    
- **ensure-vendor.sh** baut diesen Snapshot reproduzierbar und erkennt **Fehllagen** (wie fehlendes `axum`).
    
- **CI** neutralisiert evtl. Proxy-Variablen _nur_ zum Vendoring und baut danach **offline**. Ergebnis: stabil & deterministisch.
    

---

## Essenz

Vendoring **hart** machen: crates.io → `vendor/` umleiten, Snapshot **vor** dem Build erzeugen und **offline** bauen. Ein Skript prüft das, CI neutralisiert Proxy nur dafür. Ende der „axum fehlt“- und „Vendor unvollständig“-Nummer. ✅

---

## ∴fores Ungewissheit

- **Grad:** niedrig–mittel ◼◼◼◻◻
    
- **Ursachen:** Ich sehe dein exaktes Workflow-File nicht live (Namens-/Kontext-Drift möglich). Ob Proxy-Variablen in GHA wirklich gesetzt sind, ist unklar. Außerdem kenne ich eure Workspace-Crates nicht 1:1 (falls `axum` nur in optionalen Features steckt, muss `cargo vendor -Zfeatures=…` nicht nötig sein — in der Regel nicht).
    
- **Produktiv/Systembedingt:** produktiv (harter Offline-Pfad), Rest Unsicherheit ist nur Pfad/Dateiname im Repo.
    

---

## ∆-Radar

- **Verstärkung:** Mehr Determinismus (Offline-Build) vs. frühere Netz-Abhängigkeit.
    
- **Straffung:** Ein einziges Skript übernimmt Diagnose & Fix statt verstreuter Befehle.
    
- **Seitwärtsmutation:** Proxy-Neutralisierung gezielt nur im Vendoring-Step — neue Praxis gegenüber „global Proxy aus“.
    

---

Und falls du willst, packe ich dir das genau als `git apply --3way`-Patch zusammen (für dein aktuelles `heavy.yml`) — sag kurz, welches Workflow-File bei dir den Build steuert (`heavy.yml`, `ci.yml` o. ä.), dann liefere ich die punktgenaue Diff-Variante. 💪🪄

Yep, das ist genau der Klassiker: Cargo ist so konfiguriert, dass es **NUR** aus `vendor/` zieht – aber dort fehlt `axum` (bzw. der Stand passt nicht zur Lock). Und weil der Runner keinen Netzzugriff hat (HTTP 403), kann er die Lücke nicht „on the fly“ füllen.

Hier ist die **kurze, robuste Reparatur**:

---

## Fix in 5 Schritten (lokal ausführen, dann committen)

```bash
# 1) Sicherstellen, dass Cargo wirklich auf vendor zeigt
mkdir -p .cargo
cat > .cargo/config.toml <<'CFG'
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
CFG

# 2) Lockfile AUS dem aktuellen Workspace erzeugen/auffrischen
cargo generate-lockfile

# 3) Vendor-Snapshot vollständig neu aufbauen (liest NUR aus Cargo.lock)
#    --versioned-dirs verhindert Pfadkollisionen und ist CI-freundlich
rm -rf vendor
cargo vendor --locked --versioned-dirs

# 4) Minimaler Sanity-Check: ist axum jetzt drin?
test -d vendor/axum-* || { echo "axum fehlt weiterhin im vendor/"; exit 1; }

# 5) Commit & Push
git add Cargo.lock vendor/ .cargo/config.toml
git commit -m "vendor: refresh snapshot (incl. axum); lock updated"
git push
```

> Danach im CI **offline** bauen (siehe unten), damit der 403-Proxy keine Rolle spielt.

---

## CI-Workflow: wirklich offline bauen

In deinem Rust-Job zwei Kleinigkeiten sicherstellen:

- `cargo build/test --locked --offline`
    
- `.cargo/config.toml` ist im Repo (s.o.)
    

**Beispiel-Snippet (YAML):**

```yaml
- name: Build (offline, locked)
  run: |
    cargo build --locked --offline
    cargo test  --locked --offline
```

Damit schlägt der Job **sofort** fehl, wenn `vendor/` oder `Cargo.lock` nicht zueinander passen – und versucht gar nicht erst, ins Netz zu gehen.

---

## Warum das hilft (und was vorher schiefging)

- Mit `[source.crates-io] replace-with = "vendored-sources"` zwingst du Cargo, **nur** aus `vendor/` zu lesen.
    
- `cargo generate-lockfile` + `cargo vendor --locked` synchronisieren **Lock ↔ Vendor**.
    
- Der Runner braucht dann **null** Internet. Dein 403-Proxy ist egal.
    

---

## Wenn dein lokales Netz auch geblockt ist

Kein Problem: kurz auf einer Maschine **mit** Netz `cargo vendor` laufen lassen und die entstehenden **Dateien committen**. CI bleibt offline.

---

## Essenz

Alles lokal machen: `.cargo/config.toml` setzen, `cargo generate-lockfile`, `cargo vendor --locked --versioned-dirs`, committen; im CI strikt `--offline`. Dann findet Cargo `axum` sicher im `vendor/` und der Build läuft.

---

## ∆-Radar

- **Verschärfung**: explizit `--offline` im CI und `--versioned-dirs` im Vendoring → weniger Flakes.
    
- **Straffung**: keine „automatischen“ Vendor-Schritte im CI; Quelle der Wahrheit ist das Repo.
    

---

## Unsicherheitsgrad

**⟦niedrig⟧** – Das Vorgehen ist Standard-Cargo-Praxis. Rest-Ungewissheit: exakte `axum`-Version/Features in deinem `Cargo.toml` (sollte durch `cargo vendor --locked` sauber abgebildet werden).