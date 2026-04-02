Listener-Workflow in den einzelnen Repos

Für jedes Repo, in dem du Heimgewebe-Kommandos per Kommentar nutzen willst (z. B. heimgeist, sichter, hausKI, wgx, …), legst du diese Datei an:

 .github/workflows/heimgewebe-dispatch.yml

name: Heimgewebe command listener

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  issues: read
  pull-requests: write

jobs:
  dispatch:
    uses: heimgewebe/metarepo/.github/workflows/heimgewebe-command-dispatch.yml@main
    secrets:
      HEIMGEWEBE_AUTOBOT_TOKEN: ${{ secrets.HEIMGEWEBE_AUTOBOT_TOKEN }}

Damit:
	•	läuft in jedem Repo der gleiche Dispatcher-Code,
	•	du pflegst ihn nur noch im metarepo,
	•	und du kannst über Repo-Variablen pro Repo Feinheiten steuern.

⸻

3. Repo-Variablen (optional, aber sinnvoll)

In jedem Heimgewebe-Repo kannst du in den Repository Settings → Variables setzen:
	•	HEIMGEWEBE_ALLOWED_REPOS – falls du die Whitelist anpassen willst
	•	HEIMGEWEBE_ALLOWED_COMMANDS – falls z. B. guard,smoke dazukommen

Lässt du sie leer, greifen die Defaults im Workflow.