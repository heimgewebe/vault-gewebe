Kurzfassung: Vieles von deinen Vorschlägen ist bereits im Dump gelandet – es fehlen im Wesentlichen nur die verkabelte semantAH-Pipeline (extract → ingest) und ein hausKI-Playbook, das wgx code lint + wgx knowledge validate als Gate vor einen „ai-assist“-Schritt setzt. Die neuen Contracts und CI-Bausteine sind drin, inkl. Doku und Templates.

✅ Schon vorhanden (Abgleich)
	•	Neue Contracts (IDEal v0.2) sind dokumentiert und vorhanden
dev.tooling.schema.json, knowledge.graph.schema.json, agent.workflow.schema.json sind in der Contracts-Sektion und zusätzlich in der Doku-Tabelle „Neue Contracts (IDEal v0.2)“. 【2:metarepo_wgx_repomerge_2511090821.part001.md†L31-L41】
	•	JSONL/Knowledge-Validierung als Reusables + Beispiele
Reusable reusable-validate-jsonl.yml ist verlinkt und in Beispielen verwendet; es gibt zudem validate-knowledge-graph.yml und validate-agent-workflow.yml als Einbindungsvorlagen. 【7:metarepo_wgx_repomerge_2511090821.part001.md†L41-L55】【8:metarepo_wgx_repomerge_2511090821.part001.md†L11-L20】【8:metarepo_wgx_repomerge_2511090821.part001.md†L22-L29】
	•	CI-Absicherung in hausKI (Events/JSONL)
hausKI nutzt den JSONL-Reusable gegen event.line.schema.json sowie optional gegen aussen.event.schema.json. 【5:heimgewebe_repomerge_2511082121.part001.md†L65-L82】【5:heimgewebe_repomerge_2511082121.part001.md†L22-L43】
	•	Templates + Scripts für Knowledge/Agents sind da
templates/knowledge/* (ADR/Code-Doc) und templates/scripts/agents/* (orchestrate/trace) sind gelistet. 【8:metarepo_wgx_repomerge_2511090821.part001.md†L15-L22】
	•	Docs/Contracts: Pinning & Renovate-Muster
Commit-Pinning und Ersetzung per Renovate/Dependabot sind dokumentiert. 【10:heimgewebe_repomerge_2511082121.part003.md†L16-L30】

⛱️ Noch fehlend / nicht verdrahtet
	1.	semantAH-Job „wgx knowledge extract → ingest“
Es gibt Doku zur Knowledge-Validierung, aber keinen konkreten CI-Job in semantAH, der wgx knowledge extract fährt und das Ergebnis direkt in semantAH ingestet. 【8:metarepo_wgx_repomerge_2511090821.part001.md†L11-L20】
	2.	hausKI-Playbook (Gate vor AI-Assist)
Ein kleines Playbook, das erst wgx code lint und wgx knowledge validate laufen lässt und danach den „ai-assist“ Step, ist nicht zu sehen. (In hausKI gibt es JSONL-Validierung, aber kein Playbook-Gate mit beiden Checks vor einer assist-Aktion.) 【5:heimgewebe_repomerge_2511082121.part001.md†L45-L82】

⸻

✍️ Nur das Fehlende – sofort einsetzbare Snippets

A) 

B) hausKI: 
Hinweis: Die Contracts/Doku/Reusable-Workflows brauchst du nicht erneut einzuchecken – die sind vorhanden und referenziert. 【7:metarepo_wgx_repomerge_2511090821.part001.md†L41-L55】【8:metarepo_wgx_repomerge_2511090821.part001.md†L1-L8】

⸻

📌 Mini-To-Do (nur das Nötige)
	•	semantAH: obenstehenden CI-Job aufnehmen (extract → validate → ingest).
	•	hausKI: Playbook plus optionalen CI-Wrapper hinzufügen (Gate vor Assist).
	•	(Optional) Fleet-Rollout: Falls ihr die Knowledge-Validierung in weiteren Repos wollt, die vorhandenen Reusables validate-knowledge-graph.yml / validate-agent-workflow.yml einfach gemäß Quickstart einbinden. 【8:metarepo_wgx_repomerge_2511090821.part001.md†L11-L29】

Wenn du magst, liefere ich dir die Snippets auch als fertige Git-Patches pro Repo.