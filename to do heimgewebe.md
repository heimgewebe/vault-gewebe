Ich geh jetzt einmal konkret in den GitHub-Schraubenschrank und baue dir genau das, was du brauchst, um:
	•	aus @heimgewebe/sichter /quick in jedem Repo
	•	eine echte, automatisierte Reaktion von sichter zu machen.

Ohne weitere Theorie, dafür mit copy-to-bash-fertigen Patches.

⸻

Überblick – was du gleich bekommst
	1.	Dispatcher-Workflow (kommt in jedes Heimgewebe-Repo, in dem du Comments absetzen willst)
→ erkennt @heimgewebe/<zielrepo> /kommando …
→ sendet ein repository_dispatch-Event an das Zielrepo.
	2.	Command-Handler in sichter
→ nimmt Events heimgewebe-command entgegen
→ postet erstmal eine sinnvolle Antwort in den ursprünglichen PR zurück
(Platzhalter für spätere echte Analysen).
	3.	Einmalige Secret-Vorbereitung
→ HEIMGEWEBE_AUTOBOT_TOKEN als Org- oder Repo-Secret.

Dadurch hast du sofort:

Kommentar in irgendeinem Heimgewebe-Repo →
Dispatcher →
sichter-Workflow →
Antwortkommentar im PR

Den Rest (chronik, heimgeist etc.) können wir dann auf diese Basis aufsetzen.

⸻

0. Vorbereitung: PAT-Secret

Damit der Dispatcher cross-Repo repository_dispatch auslösen und sichter in fremden Repos kommentieren darf, brauchst du einen Personal Access Token mit:
	•	repo (oder mindestens repo:status, public_repo falls alles public)
	•	am besten als Org-Secret: HEIMGEWEBE_AUTOBOT_TOKEN

Das machst du einmal in GitHub (Settings → Developer settings → PAT, dann in der Org als Secret hinterlegen).

⸻

1. 

Wichtig:
In jedem Repo, in dem dieser Workflow liegt, muss das Secret
HEIMGEWEBE_AUTOBOT_TOKEN gesetzt sein (oder auf Org-Level verfügbar).

⸻

2. Command-Handler in heimgewebe/sichter

Jetzt bekommt sichter einen Workflow, der auf repository_dispatch reagiert und erstmal „nur“ eine Rückmeldung schreibt (später können wir dort echte Analysen andocken).

cd "/pfad/zum/sichter-repo" && git apply --3way <<'EOF'
diff --git a/.github/workflows/heimgewebe-command-handler.yml b/.github/workflows/heimgewebe-command-handler.yml
new file mode 100644
index 0000000000000000000000000000000000000000..4d5a9f701dcd6e77e0a4c9a3f0bb1e7e430a0f22
--- /dev/null
+++ b/.github/workflows/heimgewebe-command-handler.yml
@@ -0,0 +1,122 @@
+name: Heimgewebe Command Handler
+
+on:
+  repository_dispatch:
+    types:
+      - heimgewebe-command
+
+permissions:
+  contents: read
+  issues: write
+  pull-requests: write
+
+jobs:
+  handle:
+    name: Handle Heimgewebe Command
+    runs-on: ubuntu-latest
+
+    steps:
+      - name: Payload anzeigen (Debug)
+        run: |
+          echo "repository_dispatch payload:"
+          echo "----------------------------"
+          jq '.' << 'JSON'
+          ${{ toJson(github.event.client_payload) }}
+          JSON
+          echo "----------------------------"
+
+      - name: Kommando verarbeiten und PR kommentieren
+        uses: actions/github-script@v7
+        env:
+          AUTOBOT_TOKEN: ${{ secrets.HEIMGEWEBE_AUTOBOT_TOKEN }}
+        with:
+          github-token: ${{ env.AUTOBOT_TOKEN }}
+          script: |
+            const payload = context.payload.client_payload || {};
+
+            const sourceRepoFull = payload.source_repository;
+            const issueNumber = payload.source_issue_number;
+            const author = payload.source_comment_author;
+            const command = payload.command;
+            const args = payload.args || '';
+            const rawComment = payload.raw_comment || '';
+
+            if (!sourceRepoFull || !issueNumber || !command) {
+              core.warning('Unvollständiges Payload, breche ab.');
+              core.info(JSON.stringify(payload, null, 2));
+              return;
+            }
+
+            const [owner, repo] = sourceRepoFull.split('/');
+
+            let shortSummary;
+            if (command === 'quick') {
+              shortSummary = 'schneller, oberflächlicher Check (Stub)';
+            } else if (command === 'deep') {
+              shortSummary = 'tiefere Analyse (Stub)';
+            } else {
+              shortSummary = 'unbekanntes Kommando (Stub)';
+            }
+
+            const bodyLines = [];
+            bodyLines.push(`👋 **sichter** hier – ich habe dein Kommando verarbeitet.`);
+            bodyLines.push('');
+            bodyLines.push(`- Quelle: \`${sourceRepoFull}#${issueNumber}\``);
+            bodyLines.push(`- Aufrufer: \`${author}\``);
+            bodyLines.push(`- Ziel: \`@heimgewebe/sichter /${command}${args ? ' ' + args : ''}\``);
+            bodyLines.push(`- Kurzbewertung: ${shortSummary}`);
+            bodyLines.push('');
+            bodyLines.push('> Hinweis: Dies ist aktuell nur ein Stub-Kommentar. ');
+            bodyLines.push('> Die eigentliche Analyse-Logik kann später hier angebunden werden.');
+            bodyLines.push('');
+            bodyLines.push('<details>');
+            bodyLines.push('<summary>Rohkommentar</summary>');
+            bodyLines.push('');
+            bodyLines.push('```text');
+            bodyLines.push(rawComment);
+            bodyLines.push('```');
+            bodyLines.push('</details>');
+
+            const body = bodyLines.join('\n');
+
+            await github.rest.issues.createComment({
+              owner,
+              repo,
+              issue_number: issueNumber,
+              body,
+            });
+
+            core.info(`Kommentar in ${owner}/${repo}#${issueNumber} erstellt.`);
EOF

Auch hier: HEIMGEWEBE_AUTOBOT_TOKEN muss im sichter-Repo verfügbar sein
(am besten als Org-Secret).

Damit reagiert sichter schon auf:

@heimgewebe/sichter /quick
@heimgewebe/sichter /deep

aus JEDEM Repo, in dem der Dispatcher-Workflow liegt.

⸻

3. Optional: kleines README-Snippet fürs metarepo

Wenn du willst, kannst du im metarepo noch eine kurze Beschreibung anlegen, z. B. docs/heimgewebe/mention-protocol.md (leicht angepasst zu dem, was ich dir vorher gegeben habe):

# Mention-Protokoll (Heimgewebe)

Format:

- `@heimgewebe/<zielrepo> /kommando [argumente...]`

Beispiele:

- `@heimgewebe/sichter /quick`
- `@heimgewebe/sichter /deep`

Ablauf:

1. In dem Repo, in dem der Kommentar geschrieben wird, erkennt der Workflow
   `.github/workflows/heimgewebe-command-dispatch.yml` das Kommando.
2. Er sendet ein `repository_dispatch` an `heimgewebe/<zielrepo>` mit allen
   relevanten Metadaten (Repo, PR-Nummer, Autor, roher Kommentar).
3. Das Ziel-Repo verarbeitet das Kommando und antwortet typischerweise mit
   einem Kommentar im ursprünglichen PR.


⸻

4. Für Dummies (kurz)
	•	In jedem Repo, wo du Stimmzettel in Form von Kommentaren werfen willst:
→ Patch 1 ausführen (heimgewebe-command-dispatch.yml).
	•	Im heimgewebe/sichter-Repo:
→ Patch 2 ausführen (heimgewebe-command-handler.yml).
	•	HEIMGEWEBE_AUTOBOT_TOKEN als Secret setzen.

Dann:
	1.	Du gehst in irgendeinen PR (z. B. hausKI, weltgewebe, metarepo …).
	2.	Schreibst einen Kommentar:

@heimgewebe/sichter /quick


	3.	Actions springen an:
	•	Dispatcher im aktuellen Repo schickt Event an sichter.
	•	sichter-Workflow schreibt eine Antwort zurück in denselben PR.

Ab da können wir später Schritt für Schritt echte Analyse-Logik, chronik-Logging, heimgeist-Meta-Bewertungen usw. einhängen.

⸻

Ungewissheitsanalyse

Unsicherheitsgrad: ~0,28

Unsicherheiten:
	•	Ob dein PAT alle nötigen Rechte hat (repo reicht, aber ggf. brauchst du workflow).
	•	Ob alle Heimgewebe-Repos auf main oder anderen Branch zeigen (für uses: wäre das relevant; hier nutzen wir nur lokale Files).
	•	Wie viele Repos du tatsächlich mit dem Dispatcher ausstatten willst.

Aber:
Die Basis ist bewusst minimal gehalten, technisch unaufwändig und leicht rückbaubar.
Sie gibt dir sofort den ursprünglichen „Clou“ zurück:
Kommentare als Fernbedienung für dein Repo-Gewebe.