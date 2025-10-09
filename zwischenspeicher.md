#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/.hauski/review"
BIN="$HOME/.hauski/bin"
IDX="$ROOT/index.json"
mkdir -p "$BIN" "$ROOT"
[ -f "$IDX" ] || echo "[]" > "$IDX"

# 1) Alte Dateien entsorgen (falls kaputt)
rm -f "$BIN/hauski-dashboard" "$BIN/hauski-dashboard-build-v3"

# 2) Neuen Builder schreiben (ohne $DATA, ohne sed/awk-Replacement)
cat > "$BIN/hauski-dashboard-build-v3" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

ROOT="$HOME/.hauski/review"
IDX="$ROOT/index.json"
OUT="$ROOT/dashboard.html"
mkdir -p "$ROOT"
[ -f "$IDX" ] || echo "[]" > "$IDX"

limit_repo="${DASH_MAX_PER_REPO:-25}"
global_cap="${DASH_MAX_GLOBAL:-4000}"
filter_re="${DASH_REPO_FILTER:-}"

# Index normalisieren
RAW="$(jq -c 'map({repo, path, ts}) | sort_by(.ts) | reverse | .[0:'"$global_cap"']' "$IDX")"
if [ -n "$filter_re" ]; then
  RAW="$(printf '%s' "$RAW" | jq -c '[ .[] | select(.repo|test("'"$filter_re"'")) ]')"
fi
RAW="$(printf '%s' "$RAW" | jq -c 'group_by(.repo)|map(.[0:'"$limit_repo"'])|add // []')"

# Report-Metadaten zusammenziehen
enrich() {
  repo="$1"; path="$2"; ts="$3"
  verdict=""; score=""; bytes="0"; dir="$(dirname "$path")"; furl=""; vsc=""; head=""
  if [ -f "$path" ]; then
    head200="$(head -n 200 "$path" 2>/dev/null || true)"
    head="$(printf '%s\n' "$head200" | sed 's/`/\\`/g')"
    verdict="$(printf '%s\n' "$head200" | grep -m1 -E '^(Verdict|\- *Verdict):' | sed -E 's/^[- ]*Verdict:\s*//I' | tr -d '\r')"
    score="$(printf '%s\n' "$head200" | grep -m1 -E '(^Score:|Score[[:space:]]*)' | sed -E 's/.*Score[: ]+([0-9]+).*/\1/' || true)"
    bytes="$(wc -c < "$path" 2>/dev/null || echo 0)"
    furl="file://$path"
    vsc="vscode://file$path"; vsc="${vsc// /%20}"
  else
    verdict="MISSING"
  fi
  jq -cn \
    --arg repo "$repo" --arg path "$path" --arg ts "$ts" \
    --arg verdict "$verdict" --arg score "$score" \
    --arg bytes "$bytes" --arg dir "$dir" \
    --arg furl "$furl" --arg vsc "$vsc" --arg head "$head" \
    '{repo:$repo, path:$path, ts:$ts, verdict:$verdict,
      score:(($score|tonumber?)//null), bytes:($bytes|tonumber),
      dir:$dir, fileurl:$furl, vscurl:$vsc, head:$head}'
}

DATA="[]"
printf '%s' "$RAW" | jq -c '.[]' | while read -r row; do
  repo="$(printf '%s' "$row" | jq -r '.repo')"
  path="$(printf '%s' "$row" | jq -r '.path')"
  ts="$(printf '%s' "$row" | jq -r '.ts')"
  meta="$(enrich "$repo" "$path" "$ts")"
  DATA="$(jq -c --argjson m "$meta" '. + [$m]' <<<"$DATA")"
done

# --- HTML: in 3 Teilen schreiben, JSON als eigener <script type="application/json"> Block ---
# Teil A (Head + Layout)
cat > "$OUT" <<'HTMLA'
<!doctype html>
<html lang="de">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HausKI – Reviews</title>
<style>
:root{--bg:#0b1220;--card:#0f172a;--ink:#e2e8f0;--muted:#93a2b9;--ok:#22c55e;--warn:#f59e0b;--err:#ef4444;--acc:#38bdf8;--line:#1f2937}
*{box-sizing:border-box} html,body{margin:0;background:linear-gradient(180deg,#0b1220,#0a0f1d);color:var(--ink);font:14px/1.45 system-ui,Segoe UI,Roboto,Ubuntu,sans-serif}
header{position:sticky;top:0;z-index:3;background:#0b1220cc;border-bottom:1px solid var(--line);backdrop-filter:saturate(180%) blur(8px);padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
header b{letter-spacing:.3px}
input,select{background:#0f172a;color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:8px 10px;outline:none}
button{background:#0f172a;border:1px solid var(--line);border-radius:10px;color:var(--ink);padding:8px 12px;cursor:pointer}
button:hover{border-color:#334155}
main{padding:18px 16px;max-width:1280px;margin:0 auto}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:14px}
h2{margin:0 0 8px 0;font-size:16px;color:#cbd5e1}
.repo{margin-top:10px}
.repo h3{margin:0 0 8px 0;font-size:15px;display:flex;align-items:center;gap:8px}
.badge{font-size:12px;border-radius:999px;padding:2px 8px;border:1px solid #334155;background:#0f172a;color:#cbd5e1}
.ok{background:#122a1a;border-color:#11381b;color:#34d399}
.warn{background:#2a220f;border-color:#3d2b10;color:#fbbf24}
.err{background:#2a1315;border-color:#3a1215;color:#f87171}
.mono{font:12px ui-monospace,Menlo,monospace}
.table{width:100%;border-collapse:separate;border-spacing:0 8px}
.row{display:grid;grid-template-columns: minmax(180px,1fr) 120px 80px 1fr;gap:8px;background:#0b1327;border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.row .muted{color:var(--muted)}
.actions a{margin-right:10px;text-decoration:none;color:#93c5fd}
.actions a:hover{color:#bfdbfe}
.kbd{font:12px ui-monospace,Menlo,monospace;background:#0f172a;border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.toggle{display:flex;gap:6px;align-items:center}
</style>
<header>
  <b>HausKI Reviews</b>
  <input id="q" placeholder="Suche (Repo, Verdict, ts) …"/>
  <select id="ver">
    <option value="">Verdict: alle</option>
    <option value="APPROVE">APPROVE</option>
    <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
    <option value="MISSING">MISSING</option>
  </select>
  <select id="sort">
    <option value="ts">Sort: Neueste</option>
    <option value="repo">Sort: Repo</option>
    <option value="score">Sort: Score</option>
    <option value="size">Sort: Größe</option>
  </select>
  <label class="toggle"><input type="checkbox" id="latest"> Nur letzter Run je Repo</label>
  <button id="csv">Export CSV</button>
  <button id="rebuild">↻ Rebuild</button>
</header>
<main>
  <div class="card">
    <h2>Übersicht</h2>
    <div id="stats" class="mono"></div>
  </div>
  <div class="card">
    <h2>Runs</h2>
    <div id="list"></div>
  </div>
</main>
<!-- Daten-Payload folgt: -->
<script id="data" type="application/json">
HTMLA

# Teil B (JSON roh einbetten, keine Quotes/Ersetzungen)
printf '%s' "$DATA" >> "$OUT"
echo "</script>" >> "$OUT"

# Teil C (JS – liest JSON aus dem <script>-Tag)
cat >> "$OUT" <<'HTMLC'
<script>
const payload = document.getElementById('data').textContent || '[]';
const raw = JSON.parse(payload);
const settings = JSON.parse(localStorage.getItem('hauski:v3') || '{"latest":false,"ver":"","sort":"ts"}');
const qs = id => document.getElementById(id);
qs('latest').checked = !!settings.latest;
qs('ver').value = settings.ver || '';
qs('sort').value = settings.sort || 'ts';
function save(){ settings.latest=qs('latest').checked; settings.ver=qs('ver').value; settings.sort=qs('sort').value; localStorage.setItem('hauski:v3', JSON.stringify(settings)); }
function badgeVerd(v){ if(!v) return '<span class="badge">n/a</span>'; const up=(v+'').toUpperCase(); if(up.includes('APPROVE')) return '<span class="badge ok">APPROVE</span>'; if(up.includes('CHANGE')) return '<span class="badge warn">CHANGES_REQUESTED</span>'; if(up.includes('MISSING')) return '<span class="badge err">MISSING</span>'; return '<span class="badge">'+up+'</span>'; }
function badgeScore(s){ if(s==null) return '<span class="badge">–</span>'; const n=Number(s); const cls=n>=85?'ok':(n>=70?'warn':'err'); return '<span class="badge '+cls+'">'+n+'</span>'; }
function kb(n){ n=Number(n||0); if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(1)+' MB'; }
function groupByRepo(items){ const g={}; for(const x of items){ (g[x.repo]??=[]).push(x); } for(const k in g){ g[k].sort((a,b)=>b.ts.localeCompare(a.ts)); } return g; }
function build(){
  save();
  const q=(qs('q').value||'').toLowerCase();
  const ver=(qs('ver').value||'').toUpperCase();
  const sort=qs('sort').value;
  let arr=[...raw];
  if(q)   arr=arr.filter(r=>(r.repo||'').toLowerCase().includes(q)||(r.verdict||'').toLowerCase().includes(q)||(r.ts||'').toLowerCase().includes(q));
  if(ver) arr=arr.filter(r=>(r.verdict||'').toUpperCase().includes(ver));
  const groups=groupByRepo(arr);
  const repos=Object.keys(groups);
  const order=(a,b)=>{ if(sort==='repo')return a.localeCompare(b);
    if(sort==='score')return (Number(groups[b][0].score||-1)-Number(groups[a][0].score||-1))||b.localeCompare(a);
    if(sort==='size') return (Number(groups[b][0].bytes||0)-Number(groups[a][0].bytes||0))||b.localeCompare(a);
    return groups[b][0].ts.localeCompare(groups[a][0].ts); };
  repos.sort(order);
  let html='';
  for(const repo of repos){
    const runs=settings.latest?[groups[repo][0]]:groups[repo];
    const head=groups[repo][0];
    html+=`
      <div class="repo">
        <h3>
          <span style="min-width:180px;display:inline-block"><b>${repo}</b></span>
          ${badgeVerd(head.verdict)} ${badgeScore(head.score)}
          <span class="mono" style="color:#93a2b9"> · ${groups[repo].length} Runs · last ${head.ts}</span>
        </h3>
        <div class="table">
          ${runs.map(r=>`
            <div class="row">
              <div>
                <div class="mono">${r.ts}</div>
                <div class="muted">${r.verdict||'—'}</div>
              </div>
              <div>${badgeScore(r.score)}</div>
              <div class="mono">${kb(r.bytes)}</div>
              <div class="actions">
                ${r.fileurl?`<a href="${r.fileurl}">Open</a>`:''}
                ${r.vscurl?`<a href="${r.vscurl}">VS Code</a>`:''}
                <a href="file://${r.dir}">Ordner</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }
  document.getElementById('list').innerHTML=html;
  const flat=Object.values(groups).flat();
  const last=flat.sort((a,b)=>b.ts.localeCompare(a.ts))[0]?.ts||'—';
  document.getElementById('stats').textContent=`${flat.length} Einträge · ${repos.length} Repos · letzter Run: ${last}`;
}
['q','ver','sort','latest'].forEach(id=>{
  const el=document.getElementById(id);
  (id==='q'? 'input':'change')==='input'
    ? el.addEventListener('input',build)
    : el.addEventListener('change',build);
});
document.getElementById('csv').addEventListener('click',()=>alert('CSV im Terminal: hauski-export-csv > reviews.csv'));
document.getElementById('rebuild').addEventListener('click',()=>location.reload());
build();
</script>
</html>
HTMLC

echo "✅ Dashboard gebaut: $OUT"
[ "${1:-open}" = "--no-open" ] || xdg-open "$OUT" >/dev/null 2>&1 || true
SH
chmod +x "$BIN/hauski-dashboard-build-v3"

# 3) Wrapper
cat > "$BIN/hauski-dashboard" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
exec "$HOME/.hauski/bin/hauski-dashboard-build-v3" "$@"
SH
chmod +x "$BIN/hauski-dashboard"

# 4) Sanity-Checks
if grep -R '\$DATA' "$BIN/hauski-dashboard-build-v3" >/dev/null 2>&1; then
  echo "❌ Da ist noch \$DATA drin – bitte erneut installieren."
else
  echo "🎉 Fertig. Starte mit: hauski-dashboard"
fi
