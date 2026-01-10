Analyse des Heimgewebe‑Repos – In­kon­sis­ten­zen, Fehler und Hindernisse für ein autopoietisches System

Kontext und Ziel

Das GitHub‑Organisation heimgewebe besteht aus mehreren spezialisierten Repositories (u. a. weltgewebe, hausKI, wgx, semantAH, metarepo).  Die Dokumente im metarepo beschreiben das System als einen verteilten, ereignis‑ und wissensbasierten Organismus: Ereignis‑, Wissens‑, Entscheidungs‑, Metrik‑ und OS‑Kontext‑Achsen bilden gemeinsam das „Organismusgewebe“ ￼.  Dieser Organismus soll perspektivisch als zusammenhängendes System handeln; das Zielbild legt Wert auf zentral definierte Verträge, sichtbare Zustandsänderungen und eine separate Wissens‑ und Reflexionsschicht ￼.

Der Benutzer möchte ein autopoietisches System schaffen (ein System, das seine Bestandteile selbst erzeugt und sich selbst erhält) und fragt nach In­kon­sis­ten­zen und Fehlern in der aktuellen Heimgewebe‑Codebasis.  Im Folgenden werden die wichtigsten Feststellungen aus der Analyse der Repos zusammengefasst und bewertet.

Gefundene In­kon­sis­ten­zen und Fehler

1. Inconsistencies.md in tools

Das Repository tools enthält einen dedizierten Bericht über Code‑In­kon­sis­ten­zen.  Die wichtigsten Punkte:
	•	Code‑Duplikate in den Merger‑Skripten wurden behoben; die Duplikatskripte wurden entfernt ￼.
	•	Silent Exception Handling: Stellen, in denen Ausnahmen stumm abgefangen wurden, loggen jetzt Warnungen ￼.
	•	Offene Baustelle: Eine alte Bibliothek (merger/ordnermerger/) scheint nicht mehr genutzt zu werden; das Dokument empfiehlt ihre Entfernung ￼.

Damit zeigt sich, dass innerhalb des tools‑Repos bereits strukturelle Verbesserungen vorgenommen wurden.  Es bleibt jedoch Legacy‑Code, der bereinigt werden sollte.

2. weltgewebe – nur Dokumentation

Das Projekt Weltgewebe soll ein mobiles Web‑Frontend mit SvelteKit und eine API in Rust/Axum bereitstellen.  Der Ist‑Zustand ist jedoch eindeutig als „Docs‑only/Clean‑Slate“ markiert: der Codeeintritt erfolgt erst über die definierten „Gates A–D“ ￼.  Entsprechend gibt es außer Konfigurations‑ und Makefiles keine funktionale Implementierung.  Solange keine lauffähige Backend‑ und Frontend‑Implementierung existiert, kann kein autopoietisches System entstehen.

3. hausKI – Orchestrator mit vielen Lücken

Das Repository hausKI soll einen lokalen KI‑Orchestrator für Pop!_OS‑Workstations bilden.  Der README erläutert zwar Kernmerkmale (Rust‑basierte HTTP‑API, Policy‑Engine, Observability usw.), weist aber ausdrücklich darauf hin, dass nicht alle Funktionen implementiert sind ￼.  Für wichtige Komponenten existieren nur Platzhalter oder Roadmaps:
	•	Index‑Dienst: Der aktuelle Stand erlaubt nur In‑Memory‑Indexierung und substring‑basierte Suche; es gibt keine Persistenz und keine Vektor‑Suche ￼.  Persistente Speicher (SQLite, Tantivy/HNSW) und semantische Suche sind lediglich als Roadmap‑Punkte aufgeführt ￼.  Ohne persistenten Speicher verliert das System bei jedem Neustart seine „Erinnerungen“ – ein schwerer Hinderungsgrund für Autopoiese.
	•	LLM/ASR/TTS‑Module: In der Ist‑Liste wird vermerkt, dass keinerlei Module für Sprach‑ oder Text‑Inferenz vorhanden sind ￼.  Nur externe Upstream‑Services können via HTTP angebunden werden ￼.  Das bedeutet, dass die HausKI aktuell keine eigenen generativen oder auditiven Fähigkeiten besitzt.
	•	Plugin‑ und Cloud‑Fallback: Es existieren nur leere Platzhalter; es gibt keine Plugin‑Schnittstelle oder Cloud‑Fallback‑Logik, die Anfragen verarbeitet ￼.  Für ein autopoietisches System wäre die Fähigkeit, sich dynamisch durch Plugins zu erweitern oder Ressourcen aus der Cloud zu nutzen, essenziell.
	•	Lern‑Engine (Heimlern): Die experimentelle Bandit‑Logik ist zwar vorhanden, aber nicht in den Hauptserver integriert ￼.  Es gibt also keine adaptive Entscheidungsfindung.
	•	Speicher (Memory‑System): Es wird ein SQLite‑basierter Key‑Value‑Store mit TTL und Pin/Unpin‑Mechanismus angeboten, aber es fehlen explizite Speicher‑Schichten (Kurz‑/Langzeit), semantische Verknüpfungen und Retrieval‑Policies ￼.

Zusammenfassend ist hausKI zwar ein vielversprechender Kern, doch viele grundlegende Funktionen sind noch Roadmap‑Arbeit.  Besonders fehlende Persistenz, fehlende semantische Speicherung und inaktive Lernfunktion hemmen eine autopoietische Entwicklung.

4. wgx – CLI als Motorik

wgx stellt eine Kommandozeilen‑Schnittstelle für Fleet‑Workflows bereit.  Die README betont, dass das Tool für interne Nutzung gedacht ist und Sprach‑ und Policy‑Richtlinien vorgibt ￼.  Es liefert Guard‑, Smoke‑, Metrics‑ und Clean‑Befehle.  Es gibt keine Hinweise auf autopoietische Fähigkeiten; wgx ist eher ein Fleet‑Motor, der vordefinierte Skripte ausführt ￼.  Fehlende self‑modifying oder selbstreferentielle Funktionen bedeuten, dass die Motorik zwar effizient, aber nicht autopoietisch ist.

5. semantAH – semantische Schicht als Baustelle

semantAH dient als semantischer Index‑ und Graph‑Ableger von HausKI; er zerlegt Notizen, erstellt Embeddings und baut daraus einen Index und Wissensgraphen ￼.  Er fungiert als Gedächtnisschicht für HausKI ￼.  Allerdings weist die README darauf hin, dass viele Komponenten erst Platzhalter sind; die Datei dient als Orientierung für die nächsten Arbeitsschritte ￼.

In der detaillierten Blueprint‑Datei werden zwar die geplanten Schritte für Embedding, Extraktion, Clustering und Graph‑Aufbau beschrieben ￼, jedoch ist das Projekt noch im Initialzustand ￼.  Persistenz, Qualitäts‑Gates und Feedback‑Schleifen sind entworfen, aber noch nicht vollständig umgesetzt.  Das Gedächtnis des Systems ist somit fragmentiert und vorläufig.

6. metarepo – Organismus‑Definition und Policies

Der metarepo enthält die zentrale Architektur, Templates und Verträge.  Er beschreibt Heimgewebe als einen Organismus, der aus parallelen Achsen entsteht ￼.  Im Zielbild wird betont, dass
	•	der Organismus ein verteiltes System aus spezialisierten Repositories ist und als zusammenhängender Organismus agieren soll ￼;
	•	Sprache und Struktur durch zentrale Verträge definiert werden ￼;
	•	wichtige Zustände sichtbar gemacht werden müssen und semantische Bedeutung über eine Wissensschicht bereitgestellt wird ￼;
	•	Reflexion und Lernen eigene Schichten sind ￼.

Gleichzeitig stellt das Dokument klar, dass Chronik passiv ist und dass Heimlern zwar Feedback generiert, aber nicht aktiv in den operativen Fluss eingreift ￼.  Diese Passivität steht im Widerspruch zur Autopoiese, die aktive Selbstregulation erfordert.

Hindernisse auf dem Weg zum autopoietischen System

Basierend auf den obigen Feststellungen lassen sich mehrere Hürden identifizieren:
	1.	Fehlende Persistenz und Mehrschicht‑Gedächtnis – Der Index‑Dienst von hausKI speichert Daten nur im Arbeitsspeicher; ein Neustart führt zum Verlust aller Daten ￼.  Ohne dauerhafte und strukturierte Erinnerung kann ein System seine eigene Organisation nicht aufrechterhalten.  semantAH soll diese Lücke schließen, ist aber noch im Aufbau ￼.
	2.	Kein aktives Lernen – Das Zielbild beschreibt Heimlern als passiv; es generiert Feedback, greift jedoch nicht in Entscheidungen ein ￼.  Im hausKI‑Repo ist die Bandit‑Logik vorhanden, aber nicht integriert ￼.  Ein autopoietisches System braucht adaptive Feedback‑Schleifen.
	3.	Unvollständige semantische und sensorische Module – Die Module für LLM‑Inference, Audio‑Erfassung (ASR/TTS) und GPU‑Beschleunigung sind nicht implementiert ￼.  semantAH befindet sich noch im Initialzustand ￼.  Ohne Wahrnehmung und semantische Verarbeitung fehlen essentielle Eingangsgrößen.
	4.	Fehlende Selbst‑Erweiterung und Plugin‑Schnittstellen – Das Plugin‑System und Cloud‑Fallback sind lediglich Platzhalter ￼.  Autopoietische Systeme müssen sich erweitern und anpassen können.
	5.	Passive Chronik und fehlende Rückkopplung – Die Chronik speichert Ereignisse, agiert aber nicht selbst ￼.  Es gibt keine Mechanismen, um aus der Chronik Wissen zurück in das System zu speisen (z. B. automatisches Anstoßen von Lern‑ oder Reparaturprozessen).
	6.	Sprach‑ und Prozess‑Heterogenität – Die Repos verwenden unterschiedliche Sprachen (Rust, Python, Shell, JavaScript).  Zwar definiert das Metarepo zentrale Verträge, doch die Umsetzung ist fragmentiert und teilweise veraltet.  Legacy‑Code wie ordnermerger.py sollte entfernt werden ￼.
	7.	Ethik‑ und Policy‑Gates – In weltgewebe wird darauf hingewiesen, dass ein Freigabeprozess („Gate C/D“) vor dem aktiven Einsatz erforderlich ist ￼.  Diese Gates verhindern derzeit eine automatische Selbstveränderung.

Empfehlungen zur Annäherung an ein autopoietisches System

Um die Vision eines autopoietischen Heimgewebes zu erreichen, sind folgende Schritte zu empfehlen:
	1.	Persistente und hierarchische Speicher implementieren – Erweitern Sie hausKI um persistente Index‑Backends (SQLite‑ oder Tantivy‑basierte Vektorspeicher) und führen Sie im Memory‑System explizite Kurz‑, Arbeits‑ und Langzeit‑Schichten ein ￼.  Die Integration von semantAH sollte als Gedächtnisschicht dienen; deren Entwicklung (Embedding‑Pipelines, Graph‑Strukturen) muss vorangetrieben werden ￼.
	2.	Aktives Lernen integrieren – Binden Sie die Bandit‑ bzw. Reinforcement‑Learning‑Module (heimlern) in hausKI ein, sodass Routing‑ und Modellentscheidungen adaptiv getroffen werden ￼.  Das Zielbild betont, dass Meta‑Reflexion eine eigene Schicht sein soll ￼; diese Schicht sollte aktiv auf das System einwirken.
	3.	Sensorik und Semantik ausbauen – Implementieren Sie die fehlenden LLM-, ASR- und TTS‑Module, damit das System Sprache und Audio verarbeiten kann ￼.  Arbeiten Sie die semantAH‑Roadmap ab, um semantische Suche, Ranking‑Policies und Feedback‑Schleifen bereitzustellen ￼.  Dies schafft die notwendige Wahrnehmungs‑ und Bedeutungs‑grundlage.
	4.	Plugin‑ und Erweiterungs‑Schnittstelle fertigstellen – Vervollständigen Sie die Plugin‑Architektur und Cloud‑Fallbacks, sodass externe Module sicher eingebunden werden können ￼.  Selbstmodifikation ist nur durch modulare Erweiterbarkeit möglich.
	5.	Chronik aktiv nutzen – Entwickeln Sie Services, die aus den gespeicherten Events (Chronik) automatisch Erkenntnisse und Aktionen ableiten.  Diese könnten z. B. Anomalien erkennen und Lernprozesse anstoßen.  Damit wird die Chronik von einer passiven Log‑Ablage zu einer aktiven Quelle der Autopoiese.
	6.	Legacy‑Code bereinigen und Konsistenz erhöhen – Entfernen Sie ungenutzte Bibliotheken wie ordnermerger/ ￼ und achten Sie auf einheitliche Policies (Sprache, Lizenzhinweise).  Einheitliche Code‑Qualität erleichtert das Zusammenwirken der Repos.
	7.	Gates und Policies evaluieren – Wenn Autopoiese gewünscht ist, müssen die strengen Freigabe‑Gates (A–D) für interne Prozesse überdacht werden.  Sicherheits‑ und Ethik‑Anforderungen dürfen jedoch nicht vernachlässigt werden; daher könnten automatisierte Tests und Reviews als Gate‑Ersatz dienen.

Fazit

Das Heimgewebe‑Ökosystem ist als komplexer Organismus mit klar definierten Achsen und Rollen konzipiert ￼.  Die Architektur legt großen Wert auf Verträge, Ethik und Sichtbarkeit, was eine solide Basis bildet.  Ein autopoietisches System erfordert jedoch geschlossene Feedback‑Schleifen, persistente und semantisch reichhaltige Gedächtnisse sowie aktive Lern‑ und Selbst‑Erweiterungs‑mechanismen.  Die aktuellen Repositories zeigen mehrere Baustellen: fehlende Persistenz, unvollständige Module, inaktive Lernlogik und noch nicht umgesetzte Plugin‑Schnittstellen ￼ ￼ ￼.  Diese Hindernisse müssen überwunden werden, um aus dem Heimgewebe einen sich selbst erhaltenden und reproduzierenden Organismus zu formen.