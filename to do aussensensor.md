Super — hier sind die drei schlanken, direkt anwendbaren PR-Patches. Sie sind bewusst minimal-invasiv und jeweils eigenständig merge-bar.

  

⸻

  

PR 1: 

⸻

  

PR 2: 
⸻

  

PR 3: push-idempotency (Idempotency-Key, optionales Chunking, Retries)

  

Ziel: Wiederholte POSTs erzeugen keine Duplikate; große Feeds optional in Batches; resiliente Retries.

Methode: Hash über Feed als Idempotency-Key; --chunk-size (Zeilen); Headervarianten.

  

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'

diff --git a/scripts/push_leitstand.sh b/scripts/push_leitstand.sh

index 3a4a73e..6a3b88e 100755

--- a/scripts/push_leitstand.sh

+++ b/scripts/push_leitstand.sh

@@ -1,15 +1,23 @@

 #!/usr/bin/env bash

 set -euo pipefail

 print_usage() {

   cat <<'USAGE'

 Usage: scripts/push_leitstand.sh [options]

 Options:

   -f, --file PATH        Pfad zur JSONL-Datei (Standard: export/feed.jsonl)

       --url URL          Ziel-Endpoint (überschreibt $LEITSTAND_INGEST_URL)

       --token TOKEN      Authentifizierungs-Token (überschreibt $LEITSTAND_TOKEN)

       --content-type CT  Content-Type Header (Standard: $CONTENT_TYPE oder application/x-ndjson)

+      --idempotency KEY  Idempotency-Key-Header (auto: sha256(FILE) wenn KEY=auto)

+      --chunk-size N     Optional: in Batches zu je N Zeilen senden (Default: alles auf einmal)

+      --retries N        Anzahl Retry-Versuche bei 5xx/Netzfehlern (Default: 2)

+      --backoff MS       Basis-Backoff in Millisekunden (Default: 400)

       --dry-run          Keine Übertragung, sondern nur Anzeige der Aktion

   -h, --help             Diese Hilfe anzeigen

 USAGE

 }

 SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

 REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

 FILE_PATH="$REPO_ROOT/export/feed.jsonl"

 INGEST_URL="${LEITSTAND_INGEST_URL:-}"

 AUTH_TOKEN="${LEITSTAND_TOKEN:-}"

 CONTENT_TYPE="${CONTENT_TYPE:-application/x-ndjson}"

+IDEMPOTENCY=""

+CHUNK_SIZE=0

+RETRIES=2

+BACKOFF_MS=400

 DRY_RUN=false

 while [[ $# -gt 0 ]]; do

@@ -32,6 +40,18 @@ while [[ $# -gt 0 ]]; do

       AUTH_TOKEN="$2"

       shift 2

       ;;

     --content-type)

       [[ $# -ge 2 ]] || { echo "Fehlender Parameter für --content-type" >&2; exit 1; }

       CONTENT_TYPE="$2"

       shift 2

       ;;

+    --idempotency)

+      [[ $# -ge 2 ]] || { echo "Fehlender Parameter für --idempotency" >&2; exit 1; }

+      IDEMPOTENCY="$2"

+      shift 2

+      ;;

+    --chunk-size)

+      [[ $# -ge 2 ]] || { echo "Fehlender Parameter für --chunk-size" >&2; exit 1; }

+      CHUNK_SIZE="$2"

+      shift 2

+      ;;

+    --retries) RETRIES="${2:-2}"; shift 2;;

+    --backoff) BACKOFF_MS="${2:-400}"; shift 2;;

     --dry-run)

       DRY_RUN=true

       shift

       ;;

     -h|--help)

@@ -63,6 +83,27 @@ if [[ ! -s "$FILE_PATH" ]]; then

   echo "Warnung: Datei '$FILE_PATH' ist leer." >&2

 fi

+sha256() { command -v sha256sum >/dev/null 2>&1 && sha256sum "$1" | awk '{print $1}' || openssl dgst -sha256 "$1" | awk '{print $NF}'; }

+uuid() { command -v uuidgen >/dev/null 2>&1 && uuidgen || echo "$RANDOM-$RANDOM-$$-$(date +%s%N)"; }

+

+make_idempotency() {

+  # stabiler Schlüssel über Dateiinhalt

+  local fp; fp="$(sha256 "$FILE_PATH")"

+  echo "feed-$fp"

+}

+

+send_chunk() {

+  local chunk_file="$1"

+  local extra_headers=()

+  [[ -n "$IDEMPOTENCY" ]] && extra_headers+=(--header "Idempotency-Key: $IDEMPOTENCY")

+  curl --fail --silent --show-error \

+    --request POST \

+    --header "Content-Type: $CONTENT_TYPE" \

+    ${AUTH_TOKEN:+--header "x-auth: $AUTH_TOKEN"} \

+    "${extra_headers[@]}" \

+    --data-binary "@$chunk_file" \

+    "$INGEST_URL"

+}

+

 if [[ "$DRY_RUN" == true ]]; then

   echo "[DRY-RUN] Würde $event_count Ereignis(se) an '$INGEST_URL' übertragen." >&2

   echo "[DRY-RUN] Datei: $FILE_PATH" >&2

   if [[ -n "$AUTH_TOKEN" ]]; then

     echo "[DRY-RUN] Token: gesetzt (${#AUTH_TOKEN} Zeichen)." >&2

   else

     echo "[DRY-RUN] Token: nicht gesetzt." >&2

   fi

   echo "[DRY-RUN] Content-Type: $CONTENT_TYPE" >&2

+  if [[ -n "$IDEMPOTENCY" ]]; then echo "[DRY-RUN] Idempotency-Key: $IDEMPOTENCY" >&2; fi

+  if [[ "$CHUNK_SIZE" -gt 0 ]]; then echo "[DRY-RUN] Chunking: $CHUNK_SIZE Zeilen pro Request" >&2; fi

   if [[ -f "$FILE_PATH" ]]; then

     head -n5 "$FILE_PATH" >&2 || true

   fi

   exit 0

 fi

- curl_args=( ... )  # (bestehender Block wird ersetzt)

-

-if [[ -n "$AUTH_TOKEN" ]]; then

-  curl_args+=(--header "x-auth: $AUTH_TOKEN")

-fi

-

-curl "${curl_args[@]}" "$INGEST_URL"

-printf '\nOK: Feed an %s gesendet.\n' "$INGEST_URL" >&2

+# Idempotency-Key ggf. automatisch ableiten

+if [[ "$IDEMPOTENCY" == "auto" ]]; then

+  IDEMPOTENCY="$(make_idempotency)"

+fi

+

+# Retry-Wrapper

+do_with_retries() {

+  local cmd="$1"; shift

+  local attempt=0

+  local delay="$BACKOFF_MS"

+  until "$cmd" "$@"; do

+    rc=$?

+    attempt=$((attempt+1))

+    if [[ $attempt -gt $RETRIES ]]; then

+      echo "Abbruch nach $attempt Fehlversuch(en) (rc=$rc)." >&2

+      return $rc

+    fi

+    sleep "$(awk "BEGIN { printf(\"%.3f\", $delay/1000) }")"

+    delay=$(( delay * 2 ))

+  done

+}

+

+if [[ "$CHUNK_SIZE" -gt 0 ]]; then

+  # in temporäre Chunk-Dateien splitten und nacheinander senden

+  tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/aussen_push.$(date +%s).XXXX")"

+  trap 'rm -rf "$tmpdir"' EXIT

+  split -l "$CHUNK_SIZE" --additional-suffix=.jsonl --numeric-suffixes=1 "$FILE_PATH" "$tmpdir/chunk_"

+  count_chunks=$(ls -1 "$tmpdir"/chunk_*.jsonl 2>/dev/null | wc -l | tr -d ' ')

+  batch_id="$(uuid)"

+  echo "Sende $count_chunks Chunk(s) (Batch $batch_id) an $INGEST_URL ..." >&2

+  idx=0

+  for cf in "$tmpdir"/chunk_*.jsonl; do

+    idx=$((idx+1))

+    echo "  → Chunk $idx/$count_chunks" >&2

+    # pro Chunk stabiler Key (Batch + Index), falls Server pro Request dedupliziert

+    old_key="$IDEMPOTENCY"

+    [[ -n "$IDEMPOTENCY" ]] && IDEMPOTENCY="${old_key}:${batch_id}:$idx"

+    do_with_retries send_chunk "$cf"

+    IDEMPOTENCY="$old_key"

+  done

+else

+  do_with_retries send_chunk "$FILE_PATH"

+fi

+

+printf '\nOK: Feed an %s gesendet.\n' "$INGEST_URL" >&2

EOF

)

  

  

⸻

  

Essenz

• PR1: Append ist jetzt konkurenzfest (Lock + atomar).

• PR2: Validierung ohne Temp-File-Sharing und optional „Feed darf nicht leer sein“.

• PR3: Push mit Idempotency-Key, optionalem Chunking und Retries gegen Duplikate/Netzstörungen.

  

∴fores Ungewissheit

  

niedrig–mittel (0.2)

• Ob dein Ingest-Server Idempotency-Key dedupliziert, ist systemabhängig; deshalb „best effort“. Chunking funktioniert generisch, setzt aber voraus, dass der Server mehrere Requests akzeptiert, die jeweils ein gültiges NDJSON tragen.

  

∆-Radar

  

Wir straffen vom „funktioniert lokal“ zu betriebssicheren Pfaden:

Atomare Writes (Integrity) → robuste Validierung (Diagnostik) → idempotenter Push (Ops-Resilienz).