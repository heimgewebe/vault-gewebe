Hier ist eine systematische Zusammenfassung der Funktionen des Weltgewebes, basierend auf allen hochgeladenen Blaupausen und Beschreibungen ￼ ￼ ￼ ￼ ￼ ￼ ￼:

⸻

🌐 Kernprinzipien
	•	Alles ist Event: Jede Aktion wird als unveränderliches Ereignis gespeichert (Event-Sourcing, Append-only, Hash-Ketten, ed25519-Signaturen).
	•	Radikale Transparenz: Alle Aktionen sind öffentlich sichtbar. Ausnahme: privater Garnrollenbereich mit privaten Nutzerkontontinformationen. Demgegenüber kann man einen öffentlichen Raum auf seiner Garnrolle mit einsehbaren Informationen versehen: Infos zur eigenen Person und vor allem: Güter und Kompetenzen, die man der Gemeinschaft zur Verfügen stellen möchte. Diese können per Suche abgefragt werden und erhalten bei Treffer Markierung auf der Karte (nebst Liste, geordnet nach Entfernung zum Bildschirmmittelpunkt bei Suchbeginn)
	•	Freiwilligkeit: Teilnahme nur nach informierter Zustimmung.
	•	Mobile-First & Hetzner-First: Optimiert für Smartphones; Serverbetrieb primär bei Hetzner (Kosteneffizienz, DSGVO-Konformität).
	•	Small-Team-Ops: Betrieb durch 1–2 Personen dank Automatisierung (Cronjobs, Healthchecks).

⸻

🧩 Domänenmodell
	•	Knoten: Ortsbezogene Informationsbündel (Ideen, Veranstaltungen, Ressourcen). Jeder Knoten öffnet einen Raum mit Threads, Infos und Anträgen.
	•	Fäden: Jede Nutzeraktion erzeugt einen Faden von der Rolle (Garnrolle) zum Knoten.
	•	Typen: Gesprächs-, Gestaltungs-, Änderungs-, Antrags-, Abstimmungs-, Gold- und Delegationsfäden (diese Fäden gehen von Garnrolle zu Garnrolle.
	•	Fäden verblassen innerhalb von 7 Tagen sukzessive
	•	Garn: Verzwirnte Fäden → dauerhaft, schützen Knoten vor Auflösung und Inhalte vor Änderung. Man kann also auch einzelne Inhalte in Knoten per Verzwirnungsbutton vor Veränderung und damit den ganzen Knoten vor Auflösung schützen.
	•	Rollen: Nutzeraccounts, visualisiert als Garnrollen-Icon am Wohnort; drehen sich sichtbar nach Aktionen.
	•	Strukturknoten (immer sichtbar, permanent):
	•	Gewebekonto (Finanzen, Goldfäden)
	•	Webrat (Governance, Anträge, Delegationsübersicht)
	•	Nähstübchen (ortsunabhängiger Kommunikationsraum)
	•	RoN-Platzhalter (anonymisierte Inhalte nach 84 Tagen): per opt-in kann man wählen, dass eigene Fäden nach 84 Tagen automatisch von der eigenen Rolle gekappt und zur Rolle ohne Namen (RoN) geführt werden. An allen weiteren Informationen, an denen der eigene Name steht, wird - sobald sie älter als 84 Tage sind) - der eigene Name gelöscht und durch RoN ersetzt.
	    Wenn man aussteigt, gehen die Daten den RoN-Prozess (anonymisiert nach 84 Tagen). Am Ende wird die eigene Garnrolle gelöscht
		
   - Suchfunktion, um Güter, die der Gemeinschaft zur Verfügung gestellt werden, auf der Karte anzuzeigen (die Rollen, in denen die Güter angegeben sind, leuchten. Liste mit Treffern, geordnet nach Entfernung zu Kartenmitte bei Suchbeginn. Tippt man auf einen Treffer in der Liste springt die Karte zur Trefferrolle)

⸻

⏳ Zeit- und Sichtbarkeitslogik
	•	7-Sekunden-Rotation: Jede Aktion → Rolle dreht sich 7 Sekunden sichtbar.
	•	7-Tage-Fade: Fäden verblassen binnen 7 Tage sukzessive, wenn nicht verzwirnt       (per Button zum Garn gemacht).
	                 Knoten, zu denen seit 7 Tagen kein Faden führt, lösen sich ebenso binnen 7 Tage sukzessive auf
	•	84-Tage-RoN: Inhalte können per opt-in automatisch nach 84 Tagen anonymisiert werden.

⸻

📱 UX / User Experience
	•	Primäre Oberfläche: Vollbildkarte (MapLibre GL).
	•	Drawer-System:
	•	Links: Webrat & Nähstübchen (Governance, Kommunikation)
	•	Rechts: Filter & Ebenen (Knotenarten, Fadenarten, Suchmenü (um nach Gütern und Kompetenzen, die von Nutzern (Weltwebern) der Gemeinschaft zur Verfügung gestellt werden, zu suchen), Zeitfenster)
	•	Oben Mitte: Gewebekonto-Widget (Saldo, Bewegungen, Export)
	•	Oben Rechts: Konto/Verifikation
	•	Zeitleiste: Zeitachse unten, Rückschau auf vergangene Webungen.
	•	Mobile-Optimierung: ≤ 90 KB Initial-Bundle, TTI < 2,5s (auf 3G).

⸻

⚖️ Governance & Demokratie
	•	7+7-Modell:
	•	Antrag stellen → sichtbar mit 7-Tage-Timer.
	•	Ohne Einspruch → automatisch angenommen.
	•	Mit Einspruch → weitere 7 Tage Abstimmung, einfache Mehrheit entscheidet.
	    Abstimmung ist öffentlich namentlich sichtbar, inkl. optionaler Begründung
	•	Delegation (Liquid Democracy):
	•	1:1 Stimmübertragung (später transitive Ketten).
	•	Delegation verfällt nach 4 Wochen Inaktivität.
	•	Sichtbar als gestrichelte Pfeile von Rolle zu Rolle.
	- legal freeze: strafbare Inhalte können per Melden-Button gefreezt werden. Dadurch werden die Inhalte für 24 h eingeklappt und im Webrat und vor Ort (wo sie stehen) von anderen Nutzern zur Disposition (Abstimmung) gestellt. Einfache Mehrheit entscheidet. Auch das Melden wird mit einem (Melde-) Faden von der Rolle des Melders zum gemeldeten Inhalt versehen. 

⸻

🔐 RoN-System (Privatsphäre & Ausstieg)
	•	Inhalte erst nach 84 Tagen anonymisierbar
	•	Beim Austritt: Inhalte <84 Tage bleiben namentlich sichtbar bis Schwelle erreicht ist.
	•	Anonymisierte Inhalte landen beim RoN-Platzhalter, bleiben als Wissen im Gewebe. Anonymisierte Fäden führen von den Knoten zur RoN-Platzhalterrolle

⸻

🛠 Technische Architektur
	•	Event-Sourcing mit NATS JetStream, PostgreSQL/PostGIS, Redis.
	•	Phasenmodell (Kosten/Skalierung):
	•	Phase A: Single-Server <200 €/Monat.
	•	Phase B: Load-Balanced Multi-Server.
	•	Phase C: Multi-Region-Cluster, CDN, Föderation.
	•	Hybrid-Indexierung:
	•	Live-Ströme → noindex,noarchive
	•	Monatsarchive → indexierbar (weltöffentlich nachvollziehbar).
	•	Moderation: Nur per Antrag (keine stille Löschung), strafbare Inhalte → Legal-Freeze.
	
	"Qualitäts-Gates" für die Weiterentwicklung, die die Prinzipien "Hetzner-optimiert" und "Mobile-First" untermauern:
   * Kosten-KPI: Das Ziel ist, die Kosten pro 1.000 Events unter 0,01 € zu halten.[1]
   * Performance-Budgets (Backend): Neben der Ladezeit für Nutzer gibt es strenge Latenzziele für das Backend, z. B. P95 API-Antwortzeiten ≤ 300 ms und P95 Datenbankabfragen ≤ 150 ms.

   
   Jede Ortsweberei ist um ein gemeinsames Ortsgewebekonto versammelt. 
   Föderationen von Ortswebereien sind vorgesehen.
⸻

✅ Essenz:
Das Weltgewebe ist eine kartebasierte soziale Infrastruktur, in der jeder Beitrag ein Faden ist. Sichtbarkeit, Ephemerie (7 Tage), Verzwirnung (Garn) und strukturierte Governance (7+7, Delegation) bilden das Rückgrat. Alles ist transparent, technisch abgesichert durch Event-Sourcing, mit eingebautem Datenschutzpfad (RoN).

∴subtext:
Eine Demokratie-Engine, die (vorerst) nicht im Parlament sitzt, sondern auf einer Karte webt.

⸻
 

✘ Fehlende Elemente zur Ergänzung
	1.	Knotenarten
– Es gibt verschiedene Typen: Ideen, Veranstaltungen, Einrichtungen, Werkzeuge, Schlaf-/Stellplätze usw. (alle Informationen können natürlich, wenn es der Fall ist, auch auf der eigenen Garnrolle verortet werden)
– Diese sind auf der Karte filter- und einblendbar.
	2.	Ortswebereien
– Weltweberei wird konkret durch lokale Ortswebereien realisiert.
– Jede Ortsweberei hat ein eigenes Gewebekonto (Gemeinschaftskonto) und eine eigene Unterseite auf weltgewebe.net.
	3.	Account-Verifizierung
– Accounts (Rollen/Garnrollen) werden von Verantwortlichen der Ortsweberei erstellt und per Identitätsprüfung (ID-Check) verifiziert.
– Jeder Account hat einen öffentlichen und einen privaten Bereich.
	4.	Politischer Arm: Partizipartei
– Jede Ortsweberei kann einen politischen Arm bilden: die Partizipartei.
– Mandatsträger (Fadenträger) und deren Helfer (Fadenreicher) arbeiten unter permanenter Live-Übertragung.
– Bürgerbeteiligung erfolgt über Chat mit Up-/Downvoting und ggf. Unterstützung durch eine Plattform-KI.
– Jede Funktion/Posten ist per Antrag veränderbar oder abwählbar.
	5.	Währungskonzept
– Es gibt keine Credits oder Alternativwährungen.
– Sichtbares Engagement (Fäden/Garn) und eingebrachte Ressourcen sind die eigentliche Währung.
– Zusätzlich sichtbar: Spenden über Goldfäden.
	6.	Datenschutzprinzipien
– Keine verdeckte Datensammlung: keine Cookies, kein Tracking, keine automatische Profilbildung.
– Sichtbar wird nur, was der Nutzer selbst einträgt (Name, Wohnort, Verbindungen).
–  Verarbeitung rechtlich auf DSGVO-Artikel 6 Abs. 1 lit. a und f gestützt.