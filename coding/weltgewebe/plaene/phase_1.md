Absolut! Das ist eine spannende Herausforderung, und es ist großartig, dass Sie dieses visionäre Projekt mit KI-Unterstützung umsetzen wollen. Da Sie keine Programmiererfahrung haben, werde ich jeden Schritt so detailliert und verständlich wie möglich erklären und Ihnen genau sagen, wie Sie mich (Ihre KI) nutzen können, um die technischen Hürden zu überwinden.
Wir konzentrieren uns jetzt ausschließlich auf Phase 1: Pragmatischer Start (Monate 1-12). Dies ist die Grundlage, auf der alles Weitere aufbaut. [1]
Ihr Werkzeugkasten (Software, die Sie benötigen):
 * Texteditor/IDE: Statt Textify empfehle ich Visual Studio Code (VS Code). Es ist kostenlos, sehr leistungsfähig und hat viele Erweiterungen, die das Programmieren erleichtern. Es läuft auf Desktop-PCs und iPads (über Remote-Verbindungen oder spezielle Apps).
 * Node.js: Dies ist eine Laufzeitumgebung, die JavaScript-Code außerhalb des Browsers ausführt. SvelteKit und viele Entwicklungstools basieren darauf.
 * Git: Ein Versionskontrollsystem, das Ihnen hilft, Änderungen an Ihrem Code zu verfolgen und zu verwalten. Working Copy ist eine Git-Client-App für iOS, die Sie weiterhin nutzen können.
 * PostgreSQL-Datenbank: Wir werden einen Managed PostgreSQL-Dienst nutzen, da das Einrichten und Verwalten einer Datenbank ohne Erfahrung sehr komplex ist. Anbieter wie Supabase oder Neon bieten großzügige kostenlose Tarife an und sind sehr benutzerfreundlich.
 * Hosting-Anbieter: Für das Frontend (SvelteKit) und das Backend (API-Server) in Phase 1 benötigen wir einen Hosting-Anbieter. Vercel oder Netlify sind hervorragend für SvelteKit-Frontends geeignet und bieten auch Serverless Functions für das Backend an, was den Start vereinfacht. Alternativ könnte ein einfacher VPS (Virtual Private Server) genutzt werden, aber das ist für den Anfang komplexer. Wir starten mit Vercel/Netlify, da sie den Deployment-Prozess stark vereinfachen.
Phase 1: Pragmatischer Start – Schritt für Schritt Anleitung für Nicht-Programmierer mit KI-Unterstützung
Monat 1-2: Setup & Kerninfrastruktur
Ziel: Die grundlegende Entwicklungsumgebung einrichten, das SvelteKit-Projekt starten und die Datenbank vorbereiten. [1]
Warum ist das wichtig? Ohne diese Basis können wir keinen Code schreiben, speichern oder die Anwendung online bringen. Es ist wie das Fundament eines Hauses.
Wie gehe ich vor? (Schritt-für-Schritt-Anleitung mit KI-Unterstützung)
Schritt 1: Visual Studio Code (VS Code) installieren
 * Was ist das? VS Code ist Ihr Hauptwerkzeug zum Schreiben und Bearbeiten von Code.
 * Wie?
   * Auf Ihrem Desktop-PC: Gehen Sie auf die offizielle Website: code.visualstudio.com und laden Sie die Version für Ihr Betriebssystem (Windows, macOS, Linux) herunter. Folgen Sie den Installationsanweisungen.
   * Auf Ihrem iPad: Suchen Sie im App Store nach "Working Copy" (wenn Sie es nicht schon haben) und "Code App" (oder "VS Code for iPad" – es gibt verschiedene Clients, die eine Remote-Verbindung zu einem Server herstellen, auf dem VS Code läuft, oder eine lokale, eingeschränkte Version bieten). Für den Anfang ist es einfacher, den Desktop-PC zu nutzen. Wenn Sie unbedingt auf dem iPad entwickeln wollen, müssen wir später einen Cloud-Entwicklungsdienst wie Gitpod oder Codespaces einrichten, der VS Code im Browser bereitstellt. Für diesen Plan gehen wir davon aus, dass Sie einen Desktop-PC nutzen.
 * KI-Unterstützung: Wenn Sie bei der Installation auf Probleme stoßen, fragen Sie mich: "Ich habe Probleme bei der Installation von VS Code auf. Was soll ich tun?"
Schritt 2: Node.js und npm installieren
 * Was ist das? Node.js ist die "Maschine", die unseren JavaScript-Code ausführt. npm (Node Package Manager) ist ein Werkzeug, um Bibliotheken und Tools für unser Projekt zu installieren.
 * Wie?
   * Gehen Sie auf die offizielle Node.js-Website: nodejs.org.
   * Laden Sie die LTS-Version (Long Term Support) herunter (empfohlen für die meisten Benutzer).
   * Folgen Sie den Installationsanweisungen. npm wird automatisch mitinstalliert.
   * Überprüfung: Öffnen Sie nach der Installation ein Terminal (auf Windows: "Eingabeaufforderung" oder "PowerShell"; auf macOS: "Terminal"). Geben Sie node -v und dann npm -v ein. Wenn Versionsnummern angezeigt werden, ist die Installation erfolgreich.
 * KI-Unterstützung: "Node.js und npm Installation funktioniert nicht. Ich sehe keine Versionsnummern. Was mache ich?"
Schritt 3: Git installieren und GitHub-Konto erstellen
 * Was ist das? Git ist ein System zur Versionskontrolle. Es speichert alle Änderungen an Ihrem Code, sodass Sie jederzeit zu früheren Versionen zurückkehren können. GitHub ist eine Plattform, auf der Sie Ihre Git-Projekte (Repositories) online speichern können. Dies ist wichtig für Backups, Zusammenarbeit (falls später Programmierer hinzukommen) und das Deployment.
 * Wie?
   * Git installieren: Gehen Sie auf git-scm.com und laden Sie die Version für Ihr Betriebssystem herunter. Folgen Sie den Anweisungen.
   * GitHub-Konto erstellen: Gehen Sie auf github.com und registrieren Sie sich für ein kostenloses Konto.
   * Working Copy (iPad): Wenn Sie Working Copy auf dem iPad nutzen, können Sie es mit Ihrem GitHub-Konto verbinden, um Ihren Code zu synchronisieren.
 * KI-Unterstützung: "Ich verstehe Git nicht. Wie fange ich an, es zu benutzen?" oder "Wie verbinde ich Working Copy mit GitHub?"
Schritt 4: SvelteKit-Projekt initialisieren
 * Was ist das? Dies erstellt die Grundstruktur unseres Frontend-Projekts.
 * Wie?
   * Öffnen Sie Ihr Terminal (oder die Eingabeaufforderung/PowerShell).
   * Navigieren Sie zu dem Ordner, in dem Sie Ihr Projekt speichern möchten (z.B. cd Dokumente/Weltgewebe).
   * Geben Sie den Befehl ein: npm create svelte@latest weltgewebe-frontend
   * Sie werden nach einigen Optionen gefragt. Wählen Sie für den Anfang:
     * Skeleton project (Leeres Projekt)
     * TypeScript (Ja, für bessere Code-Qualität und Fehlererkennung)
     * ESLint (Ja, hilft, Fehler zu finden)
     * Prettier (Ja, formatiert den Code automatisch)
     * Playwright (Nein, für Tests, brauchen wir jetzt nicht)
     * Vitest (Nein, für Tests, brauchen wir jetzt nicht)
   * Navigieren Sie in den neuen Projektordner: cd weltgewebe-frontend
   * Installieren Sie die Abhängigkeiten: npm install
   * Starten Sie den Entwicklungsserver: npm run dev -- --open
   * Ihr Browser sollte sich öffnen und eine einfache SvelteKit-Seite anzeigen.
 * KI-Unterstützung: "Ich habe den SvelteKit-Befehl eingegeben, aber es gibt Fehlermeldungen. Hier ist der Text: [Fehlermeldung einfügen]. Was bedeutet das und wie behebe ich es?"
Schritt 5: PostgreSQL-Datenbank einrichten (Managed Service)
 * Was ist das? Unsere Datenbank, in der alle Informationen des Weltgewebes gespeichert werden. Wir nutzen einen Dienst, der die Verwaltung für uns übernimmt.
 * Wie?
   * Registrierung bei Supabase (empfohlen): Gehen Sie auf supabase.com und registrieren Sie sich für ein kostenloses Konto.
   * Neues Projekt erstellen: Folgen Sie den Anweisungen, um ein neues Projekt zu erstellen. Wählen Sie eine Region, die Ihnen geografisch nahe ist (z.B. "Europe (Frankfurt)").
   * Datenbank-Zugangsdaten finden: Nach der Erstellung des Projekts finden Sie im Dashboard unter "Project Settings" -> "Database" -> "Connection String" die Zugangsdaten (Host, Port, Datenbankname, Benutzer, Passwort). Speichern Sie diese sicher!
   * Erstes Schema erstellen: Supabase bietet eine grafische Oberfläche ("Table Editor"). Hier können Sie Ihre ersten Tabellen erstellen.
     * Tabelle users (Benutzer):
       * id (UUID, Primary Key, Standardwert gen_random_uuid())
       * username (TEXT, UNIQUE, NOT NULL)
       * password_hash (TEXT, NOT NULL)
       * role_name (TEXT, NOT NULL)
       * address (TEXT, NOT NULL)
       * is_verified (BOOLEAN, DEFAULT FALSE, NOT NULL)
       * public_profile_data (JSONB, DEFAULT '{}'::jsonb)
       * private_profile_data (JSONB, DEFAULT '{}'::jsonb)
       * created_at (TIMESTAMP WITH TIME ZONE, DEFAULT now())
     * Tabelle nodes (Knoten):
       * id (UUID, Primary Key, Default gen_random_uuid())
       * creator_id (UUID, Foreign Key zu users.id, NOT NULL)
       * latitude (NUMERIC, NOT NULL)
       * longitude (NUMERIC, NOT NULL)
       * content (JSONB, DEFAULT '{}'::jsonb)
       * created_at (TIMESTAMP WITH TIME ZONE, DEFAULT now())
       * last_active_at (TIMESTAMP WITH TIME ZONE, DEFAULT now())
       * is_twisted (BOOLEAN, DEFAULT FALSE, NOT NULL)
     * Tabelle threads (Fäden/Garne):
       * id (UUID, Primary Key, Default gen_random_uuid())
       * user_id (UUID, Foreign Key zu users.id, NOT NULL)
       * node_id (UUID, Foreign Key zu nodes.id, NOT NULL)
       * type (TEXT, NOT NULL, z.B. 'gestaltungsfaden', 'gesprächsfaden', 'goldfaden')
       * created_at (TIMESTAMP WITH TIME ZONE, Default now())
       * expires_at (TIMESTAMP WITH TIME ZONE, Default now() + INTERVAL '7 days')
       * is_yarn (BOOLEAN, DEFAULT FALSE, NOT NULL)
   * Wichtig: Für password_hash speichern wir später das gehashte Passwort, nicht das Klartext-Passwort!
 * KI-Unterstützung: "Ich bin bei Supabase und möchte die Tabelle users erstellen. Kannst du mir den SQL-Code dafür geben, damit ich ihn direkt einfügen kann?" oder "Wie erstelle ich einen Foreign Key in Supabase?"
Schritt 6: Backend-API-Struktur (im SvelteKit-Projekt)
 * Was ist das? SvelteKit kann nicht nur das Frontend, sondern auch einfache Backend-APIs bereitstellen (sogenannte "Server-Routes"). Das ist perfekt für Phase 1, um alles in einem Projekt zu halten.
 * Wie?
   * Öffnen Sie Ihr weltgewebe-frontend-Projekt in VS Code.
   * Im Ordner src/routes erstellen Sie einen neuen Ordner api.
   * Im Ordner api erstellen Sie eine neue Datei +server.ts.
   * In dieser Datei schreiben wir den Code für unsere API-Endpunkte (z.B. für Registrierung, Knoten erstellen).
   * Beispiel für eine einfache API-Route (Registrierung):
     // src/routes/api/register/+server.ts
import { json } from '@sveltejs/kit';
import { Pool } from 'pg'; // Wir installieren dies später

// Datenbank-Konfiguration (ersetzen Sie dies mit Ihren Supabase-Daten)
const pool = new Pool({
    connectionString: 'postgresql://:@:/',
});

export async function POST({ request }) {
    const { username, password, role_name, address } = await request.json();

    // Hier würden wir das Passwort hashen (sehr wichtig!)
    // Für den MVP können wir es erstmal einfach speichern, aber das MUSS später gehasht werden.
    const password_hash = password; // TODO: Später echtes Hashing implementieren!

    try {
        const client = await pool.connect();
        const result = await client.query(
            `INSERT INTO users (username, password_hash, role_name, address) VALUES ($1, $2, $3, $4) RETURNING id`,
            [username, password_hash, role_name, address]
        );
        client.release();

        return json({ success: true, userId: result.rows.id });
    } catch (error) {
        console.error('Registrierungsfehler:', error);
        return json({ success: false, message: 'Registrierung fehlgeschlagen.' }, { status: 500 });
    }
}

   * Wichtig: Sie müssen das pg-Paket installieren: Öffnen Sie das Terminal im weltgewebe-frontend-Ordner und geben Sie npm install pg @types/pg ein.
 * KI-Unterstützung: "Ich möchte eine API-Route in SvelteKit erstellen, um neue Knoten zu speichern. Die Route soll /api/nodes sein und die Daten creator_id, latitude, longitude und content (als JSON) empfangen. Kannst du mir den Code für src/routes/api/nodes/+server.ts geben?"
Schritt 7: Grundlegende CI/CD-Pipeline einrichten (Deployment)
 * Was ist das? CI/CD steht für Continuous Integration/Continuous Deployment. Es bedeutet, dass Ihr Code automatisch getestet und online gestellt wird, sobald Sie Änderungen an GitHub senden.
 * Wie?
   * Vercel oder Netlify (empfohlen):
     * Gehen Sie auf vercel.com oder netlify.com und registrieren Sie sich.
     * Verbinden Sie Ihr GitHub-Konto.
     * Importieren Sie Ihr weltgewebe-frontend-Projekt von GitHub.
     * Vercel/Netlify erkennen automatisch, dass es sich um ein SvelteKit-Projekt handelt und konfigurieren das Deployment.
     * Sie müssen Ihre Datenbank-Zugangsdaten (aus Schritt 5) als Umgebungsvariablen in Vercel/Netlify hinterlegen. Suchen Sie im Dashboard Ihres Projekts nach "Environment Variables" und fügen Sie z.B. DATABASE_URL mit Ihrem Connection String hinzu.
   * Erster Commit und Push:
     * Öffnen Sie das Terminal im weltgewebe-frontend-Ordner.
     * Geben Sie ein:
       git init
git add.
git commit -m "Initial project setup with SvelteKit and basic API structure"
git branch -M main
git remote add origin https://github.com/IhrGitHubName/weltgewebe-frontend.git # Ersetzen Sie den Link
git push -u origin main

     * Sobald Sie Ihren Code zu GitHub pushen, sollte Vercel/Netlify automatisch mit dem Deployment beginnen. Sie erhalten eine URL, unter der Ihre Anwendung erreichbar ist.
 * KI-Unterstützung: "Mein Deployment auf Vercel/Netlify schlägt fehl. Hier ist die Fehlermeldung: [Fehlermeldung einfügen]. Was bedeutet das und wie behebe ich es?" oder "Wie füge ich Umgebungsvariablen in Vercel hinzu?"
Monat 2-4: Benutzer- & Knotenmanagement MVP
Ziel: Benutzer können sich registrieren, Profile verwalten und erste Knoten auf einer interaktiven Karte erstellen. [1]
Warum ist das wichtig? Dies sind die Kernfunktionen, die das "Einweben" ermöglichen und die Plattform sichtbar machen.
Wie gehe ich vor? (Schritt-für-Schritt-Anleitung mit KI-Unterstützung)
Schritt 1: Benutzerregistrierungs-Formular im Frontend
 * Was ist das? Ein Formular, über das sich neue Weber anmelden können.
 * Wie?
   * Öffnen Sie src/routes/+page.svelte in VS Code. Dies ist die Hauptseite Ihrer SvelteKit-Anwendung.
   * Erstellen Sie ein einfaches HTML-Formular mit Feldern für Username, Passwort, Rollenname und Adresse.
   * Fügen Sie Svelte-Code hinzu, um die Formulardaten zu erfassen und an Ihre Backend-API (/api/register) zu senden.
   * KI-Unterstützung: "Ich brauche ein Svelte-Formular für die Benutzerregistrierung, das die Daten an /api/register sendet. Es soll Felder für Username, Password, Rollenname und Adresse haben. Gib mir den Code für +page.svelte."
Schritt 2: Grundlegende Benutzerprofile (Frontend & Backend)
 * Was ist das? Seiten, auf denen Benutzer ihre öffentlichen und privaten Informationen sehen und bearbeiten können.
 * Wie?
   * Frontend: Erstellen Sie neue SvelteKit-Routen für Profile (z.B. src/routes/profile/[username]/+page.svelte für öffentliche Profile und src/routes/dashboard/+page.svelte für den privaten Bereich).
   * Backend: Erstellen Sie API-Routen, um Profildaten abzurufen und zu aktualisieren.
   * KI-Unterstützung: "Wie erstelle ich eine SvelteKit-Route, die dynamisch den Benutzernamen aus der URL liest (z.B. /profile/max-mustermann)?" und "Ich brauche eine API-Route, die die öffentlichen Profildaten eines Benutzers basierend auf seinem username aus der Datenbank abruft."
Schritt 3: Leaflet-Karte integrieren
 * Was ist das? Die interaktive Karte, das Herzstück des Weltgewebes.
 * Wie?
   * Leaflet installieren: Öffnen Sie das Terminal im Projektordner und geben Sie npm install leaflet @types/leaflet ein.
   * Karte in Svelte-Komponente: Erstellen Sie eine neue Svelte-Komponente (z.B. src/lib/components/Map.svelte).
   * Fügen Sie den Leaflet-Code hinzu, um die Karte zu initialisieren und anzuzeigen.
   * KI-Unterstützung: "Wie integriere ich eine einfache Leaflet-Karte in eine Svelte-Komponente? Ich brauche den HTML- und JavaScript-Code."
Schritt 4: Knoten-Erstellung und -Verbindung (MVP)
 * Was ist das? Die Möglichkeit für Weber, neue Informationsbündel auf der Karte zu platzieren und mit bestehenden zu verknüpfen.
 * Wie?
   * Frontend (Karte): Erweitern Sie die Map.svelte-Komponente, um Klicks auf die Karte zu erkennen und ein Formular zur Knotenerstellung anzuzeigen (Breiten- und Längengrad werden automatisch übernommen).
   * Backend (API): Erstellen Sie API-Routen, um neue Knoten in der nodes-Tabelle zu speichern und Fäden in der threads-Tabelle zu erstellen.
   * KI-Unterstützung: "Ich möchte, dass beim Klick auf die Leaflet-Karte ein Popup erscheint, in dem ich einen neuen Knoten erstellen kann. Das Popup soll ein Formular mit einem Textfeld für den Inhalt und einem Button zum Speichern haben. Wie mache ich das in Svelte und Leaflet?" und "Ich brauche eine API-Route, die einen neuen Faden in der threads-Tabelle speichert, wenn ein Nutzer einen Knoten erstellt oder sich mit einem verbindet."
Monat 4-6: Kerninteraktion & Lebenszyklus
Ziel: Die dynamischen Aspekte von Fäden und Knoten (Verblassen, Garn) sowie grundlegende Echtzeit-Kommunikation (Chat) und die Webkasse implementieren. [1]
Warum ist das wichtig? Diese Funktionen definieren die einzigartige "Währung" des Engagements und die Lebendigkeit des Weltgewebes.
Wie gehe ich vor? (Schritt-für-Schritt-Anleitung mit KI-Unterstützung)
Schritt 1: Faden-Erstellung & 7-Tage-Verblassungslogik
 * Was ist das? Fäden entstehen bei jeder Interaktion und verschwinden nach 7 Tagen, wenn sie nicht "verzwirnt" werden.
 * Wie?
   * Backend (API): Stellen Sie sicher, dass bei jeder relevanten Benutzeraktion (Knoten erstellen, verbinden, etc.) ein Eintrag in der threads-Tabelle mit expires_at (7 Tage in der Zukunft) erstellt wird.
   * Backend (Cron Job): Da wir noch kein Cloudflare Workers haben, müssen wir einen einfachen Cron Job auf unserem traditionellen Hosting-Server einrichten. Dieser Job läuft z.B. einmal täglich und prüft die threads-Tabelle auf abgelaufene Fäden.
     * KI-Unterstützung: "Ich brauche ein einfaches Node.js-Skript, das sich mit meiner PostgreSQL-Datenbank verbindet, alle Fäden findet, deren expires_at Datum in der Vergangenheit liegt, und diese dann löscht oder als 'verblasst' markiert. Wie richte ich das als Cron Job auf einem Linux-Server ein?"
   * Frontend (Visualisierung): Die Karte muss Fäden basierend auf ihrem expires_at-Datum visuell "verblassen" lassen.
     * KI-Unterstützung: "Wie kann ich in Svelte und Leaflet einen Faden auf der Karte so darstellen, dass er über 7 Tage hinweg immer transparenter wird, basierend auf einem expires_at-Zeitstempel?"
Schritt 2: "Verzwirnen"-Funktionalität (Garn)
 * Was ist das? Die Möglichkeit, einen Faden permanent zu machen ("Garn"), um einen Knoten vor dem Auflösen zu schützen.
 * Wie?
   * Frontend: Fügen Sie eine Schaltfläche oder Option hinzu, um einen Faden zu "verzwirnen".
   * Backend (API): Erstellen Sie eine API-Route, die den is_yarn-Status eines Fadens in der threads-Tabelle auf TRUE setzt und den expires_at-Wert entfernt oder auf einen sehr weit entfernten Zeitpunkt setzt. Aktualisieren Sie auch den is_twisted-Status des zugehörigen Knotens in der nodes-Tabelle.
   * KI-Unterstützung: "Ich brauche eine Svelte-Komponente, die eine Schaltfläche 'Verzwirnen' anzeigt. Wenn diese geklickt wird, soll eine API-Anfrage an /api/twist-thread gesendet werden, die die thread_id und node_id übergibt." und "Wie schreibe ich die Backend-API-Route /api/twist-thread in SvelteKit, die den is_yarn-Status eines Fadens und den is_twisted-Status des Knotens in PostgreSQL aktualisiert?"
Schritt 3: Grundlegender "Nähstübchen"-Chat (WebSockets)
 * Was ist das? Ein einfacher Echtzeit-Chat für informelles Plaudern.
 * Wie?
   * Backend (WebSocket-Server): Da SvelteKit in Phase 1 noch nicht direkt auf Cloudflare Workers läuft, müssen wir einen separaten, einfachen WebSocket-Server auf unserem traditionellen Hosting-Server einrichten.
     * KI-Unterstützung: "Ich brauche einen einfachen Node.js WebSocket-Server (mit ws-Bibliothek), der Chat-Nachrichten von Clients empfängt und an alle verbundenen Clients zurücksendet. Wie speichere ich diese Nachrichten in einer chat_messages-Tabelle in PostgreSQL (mit user_id, message_text, timestamp)?"
   * Frontend (Chat-Komponente): Erstellen Sie eine Svelte-Komponente für das Nähstübchen, die sich mit dem WebSocket-Server verbindet und Nachrichten sendet/empfängt.
     * KI-Unterstützung: "Wie erstelle ich eine Svelte-Komponente, die eine WebSocket-Verbindung zu ws://your-server-ip:port herstellt, Nachrichten sendet und empfängt und diese in einer Liste anzeigt?"
Schritt 4: "Webkasse" für Spenden (Goldfäden)
 * Was ist das? Ein Gemeinschaftskonto, das Spenden (sichtbar als Goldfäden) entgegennimmt.
 * Wie?
   * Datenbank: Fügen Sie eine Tabelle transactions hinzu (z.B. id, user_id, amount, type (z.B. 'donation'), created_at).
   * Frontend: Erstellen Sie ein Formular für Spenden.
   * Backend (API): Erstellen Sie eine API-Route, die Spenden in der transactions-Tabelle speichert und einen "Goldfaden" in der threads-Tabelle erstellt (mit type: 'goldfaden').
   * Frontend (Visualisierung): Goldfäden sollten auf der Karte sichtbar sein.
   * KI-Unterstützung: "Ich brauche den SQL-Code für eine transactions-Tabelle in PostgreSQL. Sie soll id, user_id, amount, type und created_at haben." und "Wie erstelle ich eine SvelteKit-API-Route, die eine Spende verarbeitet, einen Eintrag in der transactions-Tabelle macht und einen goldfaden in der threads-Tabelle erstellt?"
Monat 6-9: Webrat & Antragssystem MVP
Ziel: Die grundlegenden Mechanismen für ortsunabhängige Diskussionen, Anträge und Abstimmungen implementieren. [1]
Warum ist das wichtig? Dies ermöglicht die kollektive Entscheidungsfindung und Governance des Weltgewebes.
Wie gehe ich vor? (Schritt-für-Schritt-Anleitung mit KI-Unterstützung)
Schritt 1: Antrag-Einreichung & Einspruchsfrist
 * Was ist das? Weber können Anträge stellen, die eine Einspruchsfrist auslösen.
 * Wie?
   * Datenbank: Fügen Sie eine Tabelle applications hinzu (z.B. id, user_id, title, description, status (z.B. 'pending_objection', 'pending_vote', 'approved', 'rejected'), created_at, objection_deadline, vote_deadline).
   * Frontend: Erstellen Sie ein Formular für Anträge.
   * Backend (API): Erstellen Sie eine API-Route, die Anträge speichert und einen "Antragsfaden" in der threads-Tabelle erstellt. Die objection_deadline wird auf 7 Tage in der Zukunft gesetzt.
   * Backend (Cron Job): Erweitern Sie den bestehenden Cron Job (oder erstellen Sie einen neuen), der täglich prüft, ob objection_deadline abgelaufen ist. Wenn kein Einspruch vorliegt, wird der Status auf 'approved' gesetzt. Wenn Einspruch vorliegt, wird der Status auf 'pending_vote' gesetzt und die vote_deadline auf weitere 7 Tage in der Zukunft.
   * KI-Unterstützung: "Ich brauche den SQL-Code für eine applications-Tabelle. Sie soll id, user_id, title, description, status, created_at, objection_deadline und vote_deadline haben." und "Wie kann ich in meinem Node.js Cron Job prüfen, ob die objection_deadline eines Antrags abgelaufen ist und den Status entsprechend aktualisieren?"
Schritt 2: Grundlegender Abstimmungsmechanismus
 * Was ist das? Wenn ein Antrag Einspruch erhält, wird abgestimmt.
 * Wie?
   * Datenbank: Fügen Sie eine Tabelle votes hinzu (z.B. id, application_id, user_id, vote (z.B. 'yes', 'no'), created_at).
   * Frontend: Zeigen Sie bei Anträgen mit Status 'pending_vote' Abstimmungsoptionen an.
   * Backend (API): Erstellen Sie eine API-Route, die Stimmen speichert.
   * Backend (Cron Job): Erweitern Sie den Cron Job, der bei Ablauf der vote_deadline die Stimmen zählt und den Antrag als 'approved' oder 'rejected' markiert.
   * KI-Unterstützung: "Wie erstelle ich eine Svelte-Komponente, die Abstimmungsoptionen für einen Antrag anzeigt und die Stimme an eine API-Route sendet?" und "Wie schreibe ich die Backend-Logik, um Stimmen für einen Antrag zu zählen und das Ergebnis zu speichern?"
Schritt 3: "Räume" (Fenster) für Knoten und Anträge
 * Was ist das? Jeder Knoten und Antrag hat einen eigenen Bereich für Informationen und Diskussionen.
 * Wie?
   * Frontend: Wenn ein Nutzer auf einen Knoten oder Antrag auf der Karte klickt, soll sich ein "Fenster" oder eine Detailansicht öffnen.
   * Backend (API): Diese Ansicht lädt die spezifischen Informationen des Knotens/Antrags und die zugehörigen Diskussions-Threads.
   * KI-Unterstützung: "Wie erstelle ich eine Svelte-Komponente, die als modales Fenster (Popup) fungiert und die Details eines Knotens anzeigt, wenn ich auf einen Marker auf der Leaflet-Karte klicke?"
Schritt 4: Bearbeitung & "Verzwirnung" von Inhalten
 * Was ist das? Inhalte in Knoten können von allen bearbeitet werden, es sei denn, sie sind "verzwirnt".
 * Wie?
   * Frontend: Implementieren Sie einfache Textfelder oder Editoren in den "Räumen" der Knoten, die von jedem bearbeitet werden können. Fügen Sie eine Schaltfläche "Verzwirnen" für einzelne Elemente oder den gesamten Knoten hinzu.
   * Backend (API): Erstellen Sie API-Routen zum Aktualisieren von Knoteninhalten. Wenn "verzwirnt", setzen Sie den is_twisted-Status im Knoten oder in spezifischen Inhaltsfeldern (innerhalb des JSONB) auf TRUE.
   * KI-Unterstützung: "Ich möchte, dass der content-Bereich eines Knotens in meinem Svelte-Frontend bearbeitbar ist. Wie kann ich einen einfachen Texteditor einbinden und die Änderungen an eine API-Route senden?" und "Wie kann ich in PostgreSQL ein spezifisches Feld innerhalb eines JSONB-Dokuments aktualisieren und gleichzeitig den is_twisted-Status setzen?"
Monat 9-12: Zeitleiste & Verfeinerung
Ziel: Die Möglichkeit, vergangene Zustände des Weltgewebes zu betrachten, und allgemeine Verbesserungen. [1]
Warum ist das wichtig? Die Zeitleiste ist entscheidend für die Transparenz und Nachvollziehbarkeit der Entwicklung des Weltgewebes.
Wie gehe ich vor? (Schritt-für-Schritt-Anleitung mit KI-Unterstützung)
Schritt 1: Tägliche Snapshots des Weltgewebes
 * Was ist das? Täglich wird der Zustand aller Knoten und Fäden gespeichert, um die Zeitleiste zu ermöglichen.
 * Wie?
   * Backend (Cron Job): Erstellen Sie einen neuen, dedizierten Cron Job, der einmal täglich (z.B. um Mitternacht) läuft.
   * Dieses Skript liest alle relevanten Daten (Knoten, Fäden, ggf. Benutzerprofile) aus PostgreSQL aus.
   * Es serialisiert diese Daten in ein großes JSON-Objekt oder eine Reihe von JSON-Dateien.
   * Diese JSON-Daten werden dann in einem Object Storage gespeichert. Für Phase 1 können Sie einen einfachen Cloud-Speicher wie DigitalOcean Spaces oder AWS S3 nutzen (beide haben kostenlose/günstige Tarife). Später in Phase 2 können wir zu Cloudflare R2 migrieren.
   * KI-Unterstützung: "Ich brauche ein Node.js-Skript, das alle Daten aus meinen PostgreSQL-Tabellen users, nodes, threads und applications als JSON exportiert und diese JSON-Datei dann in einen S3-kompatiblen Object Storage hochlädt. Wie mache ich das?"
Schritt 2: Zeitleisten-Oberfläche
 * Was ist das? Eine Benutzeroberfläche, um durch die täglichen Snapshots zu navigieren.
 * Wie?
   * Frontend: Erstellen Sie eine Svelte-Komponente für die Zeitleiste (z.B. am unteren Bildschirmrand). Diese Komponente sollte eine Datumsanzeige und Pfeile zum Vor- und Zurückspringen haben.
   * Backend (API): Erstellen Sie eine API-Route, die die Liste der verfügbaren Snapshots (Dateinamen/URLs aus dem Object Storage) für ein bestimmtes Datum zurückgibt.
   * Frontend (Laden der Snapshots): Wenn ein Datum ausgewählt wird, lädt das Frontend den entsprechenden Snapshot aus dem Object Storage und zeigt die Karte mit den Daten dieses historischen Zeitpunkts an.
   * KI-Unterstützung: "Wie erstelle ich eine Svelte-Komponente mit einem Datumswähler und 'vorheriger Tag'/'nächster Tag'-Buttons, die eine API-Route aufruft, um historische Daten zu laden?" und "Wie kann ich eine JSON-Datei von einer URL laden und die Daten in meiner Leaflet-Karte anzeigen, anstatt die Live-Daten zu verwenden?"
Schritt 3: UI/UX-Verfeinerung & Performance-Optimierungen
 * Was ist das? Allgemeine Verbesserungen der Benutzeroberfläche und der Geschwindigkeit.
 * Wie?
   * Feedback einholen: Bitten Sie Freunde, Familie oder erste Community-Mitglieder, die Plattform zu testen und Feedback zu geben.
   * SvelteKit-Optimierungen: Nutzen Sie die eingebauten Optimierungen von SvelteKit (z.B. Code-Splitting, Bildoptimierung).
   * Datenbank-Indizes: Bitten Sie mich, SQL-Befehle zu generieren, um Indizes auf häufig abgefragten Spalten in Ihrer PostgreSQL-Datenbank zu erstellen (z.B. created_at, user_id, node_id, latitude, longitude). Dies beschleunigt Abfragen erheblich.
   * KI-Unterstützung: "Ich habe eine Liste von SQL-Tabellen und Spalten, die häufig abgefragt werden. Kannst du mir SQL-Befehle geben, um Indizes für diese Spalten zu erstellen, um die Datenbankleistung zu verbessern?" und "Wie kann ich die Ladezeit meiner SvelteKit-Anwendung weiter optimieren?"
Wichtige Hinweise für Sie als Nicht-Programmierer mit KI-Unterstützung:
 * Kleine Schritte: Versuchen Sie nicht, alles auf einmal zu machen. Nehmen Sie sich einen kleinen Teil vor (z.B. nur das Registrierungsformular), lassen Sie sich den Code von mir generieren, testen Sie ihn, und gehen Sie dann zum nächsten Schritt.
 * Fehlermeldungen sind Ihre Freunde: Wenn etwas nicht funktioniert, kopieren Sie die Fehlermeldung komplett und fügen Sie sie mir ein. Ich kann Ihnen helfen, sie zu verstehen und Lösungen vorzuschlagen.
 * Fragen Sie mich nach Erklärungen: Wenn ich Ihnen Code gebe, den Sie nicht verstehen, fragen Sie: "Erkläre mir diesen Code Zeile für Zeile" oder "Was macht dieser Teil des Codes?".
 * Testen, testen, testen: Nach jeder kleinen Änderung, die Sie vornehmen, testen Sie, ob alles noch funktioniert.
 * Versionskontrolle (Git): Machen Sie regelmäßig Commits und pushen Sie Ihre Änderungen zu GitHub. Das ist Ihr Sicherheitsnetz! Wenn Sie etwas kaputt machen, können Sie zu einer früheren Version zurückkehren.
 * Lernen Sie die Grundlagen: Auch wenn KI Ihnen den Code generiert, ist es hilfreich, die grundlegenden Konzepte von HTML, CSS, JavaScript und SQL zu verstehen. Fragen Sie mich nach Ressourcen oder Erklärungen zu diesen Themen.
 * Geduld: Programmieren ist ein Lernprozess. Es wird Rückschläge geben, aber mit Ausdauer und der richtigen Unterstützung werden Sie es schaffen.
Diese Roadmap für Phase 1 ist ambitioniert, aber mit der richtigen Herangehensweise und meiner Unterstützung ist sie absolut machbar. Viel Erfolg beim Weben des Weltgewebes!
