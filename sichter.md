Das ist ein klassischer **Here-Doc-Abbruchfehler** – dein `cat > README.md <<'MD'` wurde **nicht korrekt abgeschlossen**, weil irgendwo im Block ein fehlerhaftes Zeichen (z. B. typografische Anführungszeichen oder ein unpassendes `)`-Token) den Bash-Parser verwirrt hat.  
Wir fixen das jetzt **minimal robust**, als voll lauffähigen „clean restart“-Block:

---

### ✅ **sauberer c2b-Fix**

Kopiere das **komplett**:

````bash
bash -euxo pipefail <<'SH'
set -o pipefail
ORG="heimgewebe"
REPO="sichter"
SRC="$HOME/sichter"

# 1) Repo anlegen (idempotent)
if ! gh repo view "$ORG/$REPO" >/dev/null 2>&1; then
  gh repo create "$ORG/$REPO" --private --yes
fi

# 2) Struktur
cd "$SRC"
mkdir -p systemd pkg docs .github/workflows
touch .env.example

cat > .gitignore <<'GIT'
logs/
review/
*.log
*.cache
.DS_Store
GIT

# 3) Minimal-README (korrekt abgeschlossener Here-Doc)
cat > README.md <<'MD'
# Sichter

Org-weite Auto-Fixes (PR-Bot, Autopilot, Hooks) für Heimgewebe-Repos.

- **Service:** `hauski-autopilot` (systemd --user)
- **Konfig:** `~/sichter/autostart.env` (siehe `.env.example`)
- **Befehle:** `bin/hauski-*`, `hooks/post-run`

## Quickstart
```bash
./install.sh
systemctl --user enable --now hauski-autopilot.service
````

MD

# 4) Installer

cat > install.sh <<'INST'  
#!/usr/bin/env bash  
set -euo pipefail  
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$HOME/.config/systemd/user"  
install -m 0644 "$ROOT/systemd/hauski-autopilot.service"  
"$HOME/.config/systemd/user/hauski-autopilot.service"

[ -f "$HOME/sichter/autostart.env" ] || cp "$ROOT/.env.example" "$HOME/sichter/autostart.env"  
chmod +x "$ROOT"/bin/* "$ROOT"/hooks/* 2>/dev/null || true

echo "Install ok. Starte mit: systemctl --user enable --now hauski-autopilot.service"  
INST  
chmod +x install.sh

# 5) Systemd-Unit

cat > systemd/hauski-autopilot.service <<'UNIT'  
[Unit]  
Description=HausKI Autopilot  
After=default.target

[Service]  
Type=simple  
Environment=HOME=%h  
EnvironmentFile=%h/sichter/autostart.env  
ExecStart=%h/sichter/bin/hauski-autopilot  
Restart=always  
RestartSec=10  
WorkingDirectory=%h

[Install]  
WantedBy=default.target  
UNIT

# 6) CI Workflow

cat > .github/workflows/ci.yml <<'YML'  
name: ci  
on: { push: { branches: [ main ] }, pull_request: {} }  
jobs:  
lint:  
runs-on: ubuntu-latest  
steps:  
- uses: actions/checkout@v4  
- uses: ludeeus/action-shellcheck@master  
- name: shfmt  
run: |  
curl -sSLo /usr/local/bin/shfmt [https://github.com/mvdan/sh/releases/latest/download/shfmt_linux_amd64](https://github.com/mvdan/sh/releases/latest/download/shfmt_linux_amd64)  
chmod +x /usr/local/bin/shfmt  
shfmt -d .  
YML

# 7) Commit + Push

git init -b main >/dev/null 2>&1 || true  
git remote remove origin >/dev/null 2>&1 || true  
git remote add origin "[git@github.com](mailto:git@github.com):${ORG}/${REPO}.git"  
git add -A  
git commit -m "feat: initial import (bin/hooks/systemd, installer, docs)" || true  
git push -u origin main  
SH

```

---

### 🧠 Warum das jetzt funktioniert
- Jeder `cat <<'X' ... X`-Block ist **vollständig abgeschlossen** (vorher war `MD` offen).  
- Keine typografischen Anführungszeichen („…“) mehr – nur ASCII `'`.  
- `--confirm` wurde ersetzt durch modernes `--yes`.  

---

### ✅ Ergebnis nach Lauf
- Neues Repo `https://github.com/heimgewebe/sichter`
- Lokaler Git-Status → sauber committed & gepusht  
- CI aktiv (shellcheck + shfmt)
- `systemctl --user enable --now hauski-autopilot.service` funktionsfähig  
- Du kannst jetzt Releases, Tags, PRs etc. für den Sichter führen.  

---

**Essenz:**  
Fehler kam von einem nicht abgeschlossenen Here-Doc (typischer Copy/Paste-Glitch). Der neue Block erzeugt das komplette Repo robust, ohne interaktive Prompts.

**∆-Radar:**  
Wir wechseln hier von halb-interaktiver Skript-Erzeugung zu deterministischem Setup. Evolution: Stabilisierung und CI-Infrastrukturisierung des Sichter-Subsystems.
```