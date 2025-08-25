Ich fasse dir die Kernaspekte des Weltgewebes zusammen – auf Basis der v13.0-Blaupause ￼, der programmatischen Skizzen aus zukunftsmusik.md ￼ und der Einführung in inhalt.md ￼:

⸻

🧵 Grundprinzipien
	•	Alles ist Event: Jede Handlung (z. B. Kommentar, Antrag, Spende) erzeugt ein unveränderliches Event. So entsteht eine transparente, prüfbare Ereigniskette.
	•	Sichtbarkeit ist Währung: Es gibt kein Geld- oder Punktesystem. Wert ist allein, dass etwas im Gewebe sichtbar wird.
	•	Radikale Transparenz: Fehler, Rücknahmen, Admin-Handlungen – alles wird sichtbar dokumentiert.
	•	Ethik & Autonomie: Keine Black-Boxes, Datenschutz by Design, Peer-Verifikation statt zentraler Kontrolle.

⸻

🗺️ Visualisierung
	•	Karte als Leinwand (MapLibre): Alle Aktivitäten werden ortsgebunden sichtbar.
	•	Rollen (Accounts): Jeder registrierte Nutzer ist als Garnrolle an seinem Wohnort platziert.
– Eingeloggt sichtbar durch Glow-Effekt (online) oder kurze Drehung bei Login.
	•	Fäden: Jede aktive Aktion erzeugt einen Faden von der Rolle zu einem Knoten.
– Verblassen in 7 Tagen, farbkodiert nach Art: Gespräch, Gestaltung, Veränderung, Antrag, Abstimmung, Gold (Spende), Delegation.
	•	Garn: Werden Fäden verzwirnt, entsteht permanentes Garn. Dieses schützt Knoten vor Verfall.
	•	Knoten: Informationsbündel (Idee, Veranstaltung, Ressource, etc.), automatisch mit eigenem Raum (Threads, Infos, Teilnehmende).
– Knoten verfallen, wenn kein Faden oder Garn mehr existiert.

⸻

⚖️ Regeln & Governance
	•	Anträge: Jeder kann Anträge stellen (z. B. Auszahlung, Anschaffung). Sichtbar mit 7-Tage-Timer.
	•	Einspruch: Ein Einspruch → zwingt nach 7 Tagen zu einer verbindlichen Abstimmung. Keine Kettenverlängerung möglich.
	•	Abstimmungen: Mit Quorum (Standard 10 % aktiver Rollen). Stimmen können delegiert werden (sichtbare Delegationsfäden, Ablauf nach 4 Wochen Inaktivität).
	•	Beschluss = sofortige Ausführung: Angenommene Anträge werden unmittelbar umgesetzt (ActionExecuted-Event).

⸻

💰 Gewebekonto & Goldfäden
	•	Jede Ortsweberei hat ein Gemeinschaftskonto.
	•	Spenden erscheinen als Goldfäden (sichtbar: Betrag, Status, Ziel).
	•	Auszahlungen laufen nur über Anträge und gemeinschaftliche Beschlüsse.

⸻

🌐 Skalierbarkeit & Föderation
	•	Von Nachbarschaft bis globales Myzel: Ortswebereien können sich zusammenschließen, Delegierte entsenden, überregionale Belange koordinieren ￼.
	•	Föderations-Mechanik: Event-Streams, Signaturen, gegenseitige Verbindlichkeit. Jede Ortsweberei bleibt autonom, aber rückrufbar durch die Basis.

⸻

🔒 Technik & Sicherheit
	•	Backend: NATS JetStream (Event-Backbone), Redis (Fallback), PostgreSQL + PostGIS (Persistenz).
	•	Frontend: SvelteKit PWA mit Offline-Support (Dexie, Outbox, Konfliktlösung).
	•	Authentifizierung: Passkeys, Magic-Links, optional Single-Sign-On.
	•	Datenschutz: DSGVO-konform, Online-Status nur nach Opt-in sichtbar.
	•	Observability: Prometheus/Grafana, Kosten-Monitoring (< 0,01 €/1.000 Events Ziel).

⸻

🧮 Ablauf im Alltag
	1.	Nutzer registriert sich → bekommt Garnrolle auf Karte.
	2.	Nutzer spinnt Faden (z. B. Kommentar oder Knoten) → sichtbar, 7 Tage gültig.
	3.	Werden Fäden verzwirnt → Garn, schützt den Knoten dauerhaft.
	4.	Anträge laufen automatisch mit Timer, bei Einspruch → Abstimmung.
	5.	Goldfäden (Spenden) fließen ins Gewebekonto, sichtbar auf der Karte.
	6.	Online-Status (Glow) zeigt aktive Präsenz – Teil der Währung Sichtbarkeit.

⸻

🕊️ Philosophische Essenz

Das Weltgewebe ist kein unsichtbarer Algorithmus, sondern ein sichtbarer, kollektiver Prozess:
– Jede Tat zieht einen Faden,
– jede Verzwirnung stabilisiert das Gewebe,
– jeder Online-Glow macht Präsenz spürbar.

Es ist ein soziales Betriebssystem, das Verantwortung, Transparenz und gemeinschaftliches Handeln in eine gemeinsame, lebendige Struktur übersetzt.

⸻

∴essenz.kernΣ:
Alles, was du tust, wird Faden. Alles, was ihr verzwirnt, wird Garn. Alles, was sichtbar bleibt, ist Weltgewebe.

⸻

