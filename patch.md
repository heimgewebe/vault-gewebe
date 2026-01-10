From ceb68ae863b40bad9a1ed66ef176c09ace39859f Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Wed, 10 Dec 2025 13:53:56 +0000
Subject: [PATCH] Replace SvelteKit app with static HTML/JS ICF-CY tool

This commit replaces the existing SvelteKit infrastructure with a lightweight, client-side only web application for ICF-CY documentation.

Features:
- Static HTML/CSS/JS architecture (no backend required).
- Search and filter for ICF categories.
- Custom rating scale from -4 (Barrier) to +4 (Resource).
- Local storage persistence for ratings and notes.
- Text export functionality for reports.
- Detailed README with usage instructions.

The data is loaded from `data/icf-cy.sample.json`.
Previous SvelteKit files (src, package.json, etc.) have been removed.
---
 .npmrc                                |    1 -
 README.md                             |  301 ++++---
 data/icf-cy.sample.json               |   46 ++
 index.html                            |   62 ++
 package-lock.json                     |  747 -----------------
 package.json                          |   26 -
 script.js                             |  258 ++++++
 src/app.css                           |  280 -------
 src/app.d.ts                          |   13 -
 src/app.html                          |   11 -
 src/lib/assets/favicon.svg            |    1 -
 src/lib/db.ts                         |   93 ---
 src/lib/export.ts                     |  130 ---
 src/lib/index.ts                      |    1 -
 src/lib/sample-catalogs.ts            |  618 --------------
 src/lib/sample-catalogs.ts.bak        |  436 ----------
 src/lib/stores.ts                     |  100 ---
 src/lib/types.ts                      |   71 --
 src/lib/utils.ts                      |   19 -
 src/routes/+layout.svelte             |   73 --
 src/routes/+page.svelte               |  191 -----
 src/routes/about/+page.svelte         |  106 ---
 src/routes/activity/[id]/+page.svelte | 1067 -------------------------
 static/images/icf-model.svg           |   61 --
 static/robots.txt                     |    3 -
 style.css                             |  212 +++++
 svelte.config.js                      |   18 -
 tsconfig.json                         |   20 -
 vite.config.ts                        |    6 -
 29 files changed, 775 insertions(+), 4196 deletions(-)
 delete mode 100644 .npmrc
 create mode 100644 data/icf-cy.sample.json
 create mode 100644 index.html
 delete mode 100644 package-lock.json
 delete mode 100644 package.json
 create mode 100644 script.js
 delete mode 100644 src/app.css
 delete mode 100644 src/app.d.ts
 delete mode 100644 src/app.html
 delete mode 100644 src/lib/assets/favicon.svg
 delete mode 100644 src/lib/db.ts
 delete mode 100644 src/lib/export.ts
 delete mode 100644 src/lib/index.ts
 delete mode 100644 src/lib/sample-catalogs.ts
 delete mode 100644 src/lib/sample-catalogs.ts.bak
 delete mode 100644 src/lib/stores.ts
 delete mode 100644 src/lib/types.ts
 delete mode 100644 src/lib/utils.ts
 delete mode 100644 src/routes/+layout.svelte
 delete mode 100644 src/routes/+page.svelte
 delete mode 100644 src/routes/about/+page.svelte
 delete mode 100644 src/routes/activity/[id]/+page.svelte
 delete mode 100644 static/images/icf-model.svg
 delete mode 100644 static/robots.txt
 create mode 100644 style.css
 delete mode 100644 svelte.config.js
 delete mode 100644 tsconfig.json
 delete mode 100644 vite.config.ts

diff --git a/.npmrc b/.npmrc
deleted file mode 100644
index b6f27f1..0000000
--- a/.npmrc
+++ /dev/null
@@ -1 +0,0 @@
-engine-strict=true
diff --git a/README.md b/README.md
index eb6695d..6ca0333 100644
--- a/README.md
+++ b/README.md
@@ -1,129 +1,222 @@
-# ICF-Reflektor
+# ICF-CY Tool – Web-App
 
-Webbasiertes, lokal laufendes Tool zur strukturierten Einschätzung der Kompetenz eines Menschen, bestimmte Aktivitäten zu bewältigen, mit Hilfe von ICF / ICF-CY – inklusive Ressourcen- und Barrierenblick.
+Das ICF-CY Tool ist eine kleine, komplett clientseitige Web-App, mit der Aktivitäten anhand der ICF-CY (und perspektivisch auch ICF) strukturiert beschrieben werden können.
 
-## Idee in einem Satz
+Kernidee:
+Eine Person / Aktivität wird ausgewählt, anschließend werden relevante ICF-Kategorien bewertet (–4 bis +4) und mit kurzen Texten erläutert. Am Ende wird ein strukturierter Textbericht erzeugt, der z. B. für Dokumentation oder Fallbesprechungen genutzt werden kann.
 
-Der ICF-Reflektor ermöglicht es, **konkrete Aktivitäten** (z. B. „Hausaufgaben in der Kleingruppe") zu beschreiben, dazu **relevante Dimensionen / ICF-Kategorien** auszuwählen, diese auf einer **Skala von −4 (starke Barriere) bis +4 (starke Ressource)** einzuschätzen und abschließend **verständlich zu begründen**, warum etwas als Behinderung oder Ressource wirkt.
+---
 
-## Zielgruppe
+## Ziele des Tools
 
-- Pädagogik, Therapie, Inklusion, Frühförderung
-- Ausbildung / Studium (Portfolio, Fallbearbeitung)
-- Eigene Praxisreflexion zu Teilhabe, Behinderung und Ressourcen
+- Die **ICF-CY Struktur** als Raster für Beobachtungen nutzen.
+- Aktivitäten / Situationen über **ICF-Kategorien** erfassen (z. B. mentale Funktionen).
+- Für jede Kategorie:
+  - **Wert von –4 bis +4** vergeben,
+  - **Erläuterung** eintragen,
+  - nachvollziehbar dokumentieren, ob es eher eine **Behinderung** oder eine **Ressource** ist.
+- Am Ende einen **kompakten Textbericht** erzeugen, den man speichern, weitergeben oder in andere Systeme übernehmen kann.
 
-## Kernfunktionen
+---
 
-### 1. Aktivitäten
+## Funktionsumfang (aktueller Stand)
 
-- Aktivität anlegen mit Titel, ICF-Code (optional), Beschreibung
-- Aktivitätenübersicht mit Filter/Suche
-- Umschaltbarer Modus: ICF oder ICF-CY
+### Modus
 
-### 2. Dimensionen / Kategorien
+- **ICF-CY Modus**:
+  Lädt ICF-CY-Kategorien (Start: Ausschnitt „Mentale Funktionen“).
+- **ICF Modus**:
+  (noch als Platzhalter vorgesehen – später erweiterbar).
 
-- Dimensionen aus importiertem ICF-/ICF-CY-Katalog auswählen
-- Eigene Dimensionen frei definieren
-- Bewertung auf Skala von −4 bis +4
-- Freitext-Begründung für jede Bewertung
+### Aktivitäten
 
-### 3. Kontextdaten
+- Eingabefeld für **Aktivität / Situation** (z. B. „Unterricht in Mathe“, „Freies Spiel im Hort“).
+- Diese Aktivität wird im späteren Report als Kontext verwendet.
 
-- Person, Alter/Klassenstufe, Setting
-- Anlass/Ziel, Datum, Ersteller
-- Allgemeine Notizen
+### Kategorien
 
-### 4. Export / Import
+- Kategorien werden aus `data/icf-cy.sample.json` geladen.
+- Aktuell: Beispiel-Ausschnitt „Mentale Funktionen“ (b110, b114, b117, b122, b125, b126, b130, b134).
+- Später: Erweiterung auf beliebige ICF-CY-Teilmengen möglich.
 
-- Export als JSON für Weiterverarbeitung
-- Export als Markdown-Report für Dokumentation
-- Import von JSON-Dateien
+### Suche / Filter
 
-## Technologie
+- Oberhalb der Kategorienliste gibt es ein **Suchfeld**:
+  - Filtert live nach `Code` (z. B. `b110`) oder `Titel` (z. B. „Bewusstsein“).
+  - Erleichtert das Auffinden einzelner Kategorien innerhalb größerer Listen.
 
-- **Framework:** SvelteKit (TypeScript)
-- **Lokale Persistenz:** IndexedDB (Browser-Storage)
-- **UI:** Responsive, Touch- und Tastaturnavigation
+### Bewertungsskala –4 bis +4
 
-## Datenschutz
+Für jede Kategorie kann ein ganzzahliger Wert vergeben werden:
 
-**Alle Daten bleiben lokal auf Ihrem Gerät.**
+- **–4 bis –1**: Bereich „Behinderung / starke Einschränkung“
+- **0**: neutral / unauffällig / nicht relevant
+- **+1 bis +4**: Bereich „Ressource / deutliche Stärke / Unterstützung“
 
-- Kein Backend, keine Server-Übertragung
-- Keine Registrierung erforderlich
-- Kein Tracking oder Analytics
-- Exportierte Dateien liegen in Ihrer Verantwortung
+> Wichtiger Hinweis:
+> Diese Skala ist **nicht identisch** mit der offiziellen ICF-Qualifikatorskala (0–4).
+> Sie ist eine **eigene, symmetrische Skala**, um Behinderung und Ressource in einem Modell abzubilden.
+> Wer mit offiziellen ICF-Kodierungen arbeitet, sollte die Umrechnung bewusst und transparent gestalten.
 
-## Entwicklung
+### Erklärungstext pro Kategorie
 
-### Voraussetzungen
+- Zu jeder Kategorie kann ein **kurzer Freitext** erfasst werden:
+  - Warum wurde dieser Wert vergeben?
+  - Wie zeigt sich die Einschränkung oder Ressource konkret?
+- Der Text wird zusammen mit Code, Titel und Wert im Report ausgegeben.
+
+### Persistenz
+
+- Alle Eingaben (Bewertungen + Erklärungen) werden:
+  - im laufenden Zustand in einer JavaScript-Struktur gehalten,
+  - zusätzlich in `localStorage` abgelegt,
+  - beim erneuten Laden der Seite wieder eingelesen (sofern der Browser-Speicher nicht gelöscht wurde).
 
-- Node.js (aktuelle LTS-Version, v18+)
-- npm oder pnpm
+### Export
 
-### Lokale Entwicklung
+- Button **„Export als Text“**:
+  - Erzeugt einen strukturierten Bericht im Markdown-ähnlichen Format.
+  - Der Bericht enthält:
+    - Titel, Zeitstempel,
+    - Aktivitätsbeschreibung,
+    - Modus (ICF-CY / ICF),
+    - Liste aller bewerteten Kategorien mit:
+      - Code und Titel
+      - Wert (–4…+4)
+      - Erläuterungstext
+  - Der Bericht wird als Datei (`icf-report.txt`) zum Download angeboten.
 
-```bash
-# Repo klonen
-git clone https://github.com/alexdermohr/icf-tool.git
-cd icf-tool
+---
 
-# Dependencies installieren
-npm install
-
-# Entwicklungsserver starten
-npm run dev
-
-# Im Browser öffnen: http://localhost:5173
-```
-
-### Build für Produktion
-
-```bash
-# Production Build erstellen
-npm run build
-
-# Build lokal testen
-npm run preview
-```
-
-### Deployment
-
-Die App kann als statische Website gehostet werden auf:
-
-- GitHub Pages
-- Netlify
-- Vercel
-- Oder jedem anderen Static-Hosting-Service
-
-## Projektstruktur
-
-```
-src/
-├── lib/
-│   ├── types.ts              # TypeScript-Typdefinitionen
-│   ├── db.ts                 # IndexedDB-Datenbankschicht
-│   ├── stores.ts             # Svelte Stores für State Management
-│   ├── export.ts             # Export-/Import-Funktionen
-│   └── sample-catalogs.ts    # Beispiel ICF/ICF-CY Kataloge
-├── routes/
-│   ├── +layout.svelte        # Haupt-Layout
-│   ├── +page.svelte          # Aktivitäten-Liste (Home)
-│   ├── activity/[id]/
-│   │   └── +page.svelte      # Aktivität erstellen/bearbeiten
-│   └── about/
-│       └── +page.svelte      # Über-Seite
-└── app.css                   # Globale Styles
-```
-
-## Lizenz
-
-Open Source - siehe LICENSE Datei
-
-## Mitwirken
-
-Contributions sind willkommen! Bitte öffnen Sie ein Issue oder Pull Request auf GitHub.
-
-## Support
-
-Bei Fragen oder Problemen öffnen Sie bitte ein Issue auf GitHub.
+## Technische Architektur
+
+- **Frontend-Only**, kein Backend, keine Datenübertragung.
+- Dateien:
+  - `index.html` – Basis-HTML der Web-App
+  - `style.css` – einfache Gestaltung
+  - `script.js` – App-Logik (Laden von Daten, UI, Export)
+  - `data/icf-cy.sample.json` – Beispiel-ICF-Daten im JSON-Format
+
+- Datenmodell (`icf-cy.sample.json`):
+
+  ```json
+  {
+    "code": "root",
+    "title": "ICF-CY Mentale Funktionen (Ausschnitt)",
+    "children": [
+      {
+        "code": "b110",
+        "title": "Funktionen des Bewusstseins",
+        "description": ""
+      }
+      // weitere Kategorien ...
+    ]
+  }
+  ```
+
+- Bewertungen werden als Map gespeichert:
+
+  ```ts
+  type RatingEntry = {
+    code: string;
+    title: string;
+    value: number;        // -4 ... +4
+    note: string;         // Freitext
+  };
+  ```
+
+- Persistenzschicht:
+  - `localStorage.setItem("icfToolState", JSON.stringify(...))`
+  - `localStorage.getItem("icfToolState")` zum Wiederherstellen.
+
+---
+
+## Nutzung
+
+1. Repository clonen oder herunterladen.
+2. `index.html` im Browser öffnen (direkt als Datei oder über einen einfachen Static-Server).
+3. Aktivität im oberen Bereich eintragen.
+4. In der Kategorien-Liste:
+   - über das Suchfeld filtern,
+   - Kategorie anklicken,
+   - Wert wählen,
+   - Erläuterung eingeben,
+   - speichern.
+5. Bei Bedarf den Vorgang für weitere Kategorien wiederholen.
+6. Über „Export als Text“ einen Bericht erzeugen und herunterladen.
+
+---
+
+## Für Dummies: Wie funktioniert das technisch?
+
+Stark vereinfacht:
+
+1. Der Browser lädt beim Öffnen:
+   - das HTML (Aufbau der Seite),
+   - das CSS (Aussehen),
+   - die JavaScript-Datei (Funktionalität),
+   - und die ICF-Daten aus einer JSON-Datei.
+2. JavaScript baut daraus:
+   - eine Liste von Kategorien,
+   - ein Formular zum Bewerten und Kommentieren,
+   - eine Zusammenfassung deiner Eingaben.
+3. Wenn du auf „Speichern“ klickst:
+   - werden deine Eingaben in einem unsichtbaren Objekt (einer Art Liste in JavaScript) gespeichert,
+   - zusätzlich wird diese Liste im localStorage deines Browsers abgelegt, damit sie beim nächsten Laden noch da ist.
+4. Wenn du auf „Export als Text“ klickst:
+   - baut das Script aus allen Einträgen einen langen Text,
+   - packt ihn in ein „Blob“ (eine Art Datei im Speicher),
+   - und sagt dem Browser: „Bitte biete das als Download an“.
+
+Du brauchst dafür keinen Server, keine Datenbank, kein Login – der komplette Zauber passiert direkt in deinem Browser.
+
+---
+
+## Dringendste Verbesserungen (bereits umgesetzt)
+
+- **Suche / Filter** für Kategorien.
+- **Getrennte ICF-Daten** als JSON.
+- **Markdown-ähnlicher Export** statt losem Text.
+- **Klare Skalenbeschreibung** für –4 bis +4.
+- **Lokale Persistenz** via `localStorage`.
+
+---
+
+## Roadmap (nächste sinnvolle Schritte)
+
+1. **ICF-CY-Daten vervollständigen**
+   - Offizielle ICF-CY-Listen (Lizenzfragen beachten).
+   - Aufteilung in thematische Segmente (z. B. mentale Funktionen, sensorische Funktionen, Aktivitäten & Partizipation).
+2. **ICF-Modus ergänzen**
+   - Zweiter Datensatz für „Erwachsenen-ICF“.
+   - Umschaltbar im UI.
+3. **Mehr Struktur im Export**
+   - Gruppierung nach ICF-Kapitel.
+   - Optional: Export als JSON zusätzlich zum Text.
+4. **Validierung / Leitfragen**
+   - Pro Kategorie optionale Leitfragen hinterlegen.
+   - Bsp.: „Woran zeigt sich die Einschränkung im Alltag?“.
+5. **Druck-Layout**
+   - Separates, druckoptimiertes Stylesheet.
+
+---
+
+## Risiko- und Fehlerabschätzung
+
+Typische Risiken:
+- Verwechslung mit offizieller ICF-Kodierung -> Skala –4…+4 ist eine eigene, pädagogisch-praktische Skala.
+- Überinterpretation -> Tool strukturiert Beobachtungen, ersetzt aber keine medizinische Diagnose.
+- Datenverlust -> localStorage kann gelöscht werden; wer sicher gehen will, sollte Berichte regelmäßig exportieren und sichern.
+
+Maßnahmen:
+- Skala im README und ggf. in der App selbst klar erläutern.
+- Tool explizit als Dokumentations- und Reflexionshilfe kennzeichnen.
+- Nutzer anregen, regelmäßig Reports zu exportieren.
+
+---
+
+## Lizenz / Kontext
+
+- Projekt: icf-cy-tool
+- Zweck: Unterstützung pädagogischer / therapeutischer Reflexion und Dokumentation.
+- Kein Medizinprodukt, keine rechtliche oder diagnostische Verbindlichkeit.
diff --git a/data/icf-cy.sample.json b/data/icf-cy.sample.json
new file mode 100644
index 0000000..4f930ee
--- /dev/null
+++ b/data/icf-cy.sample.json
@@ -0,0 +1,46 @@
+{
+  "code": "root",
+  "title": "ICF-CY Mentale Funktionen (Ausschnitt)",
+  "children": [
+    {
+      "code": "b110",
+      "title": "Funktionen des Bewusstseins",
+      "description": ""
+    },
+    {
+      "code": "b114",
+      "title": "Funktionen der Orientierung",
+      "description": ""
+    },
+    {
+      "code": "b117",
+      "title": "Funktionen der Intelligenz",
+      "description": ""
+    },
+    {
+      "code": "b122",
+      "title": "Globale psychosoziale Funktionen",
+      "description": ""
+    },
+    {
+      "code": "b125",
+      "title": "Dispositionen und intrapersonelle Funktionen",
+      "description": ""
+    },
+    {
+      "code": "b126",
+      "title": "Funktionen von Temperament und Persönlichkeit",
+      "description": ""
+    },
+    {
+      "code": "b130",
+      "title": "Funktionen der psychischen Energie und des Antriebs",
+      "description": ""
+    },
+    {
+      "code": "b134",
+      "title": "Funktionen des Schlafs",
+      "description": ""
+    }
+  ]
+}
diff --git a/index.html b/index.html
new file mode 100644
index 0000000..094dd17
--- /dev/null
+++ b/index.html
@@ -0,0 +1,62 @@
+<!DOCTYPE html>
+<html lang="de">
+<head>
+  <meta charset="UTF-8" />
+  <title>ICF-CY Tool</title>
+  <link rel="stylesheet" href="style.css" />
+</head>
+<body>
+  <header>
+    <h1>ICF-CY Tool</h1>
+    <div class="mode-row">
+      <label for="modeSelect">Modus:</label>
+      <select id="modeSelect">
+        <option value="icf-cy">ICF-CY</option>
+        <option value="icf" disabled>ICF (in Vorbereitung)</option>
+      </select>
+    </div>
+    <div class="activity-row">
+      <label for="activityInput">Aktivität / Situation:</label>
+      <input id="activityInput" type="text" placeholder="z. B. Unterricht in Mathe, freies Spiel,..." />
+    </div>
+  </header>
+
+  <main>
+    <section class="left-panel">
+      <h2>Kategorien (ICF-CY)</h2>
+      <input id="searchInput" type="text" placeholder="Suche nach Code oder Titel..." />
+      <ul id="categoryList"></ul>
+    </section>
+
+    <section class="middle-panel">
+      <h2>Bewertung</h2>
+      <div id="selectionInfo" class="info-box">
+        Keine Kategorie ausgewählt.
+      </div>
+      <div id="ratingControls" class="hidden">
+        <div class="rating-row">
+          <span>Wert (–4 = starke Behinderung, +4 = starke Ressource):</span>
+          <div id="ratingButtons"></div>
+        </div>
+        <div class="note-row">
+          <label for="noteInput">Erläuterung:</label>
+          <textarea id="noteInput" rows="6" placeholder="Wie zeigt sich die Behinderung oder Ressource konkret?"></textarea>
+        </div>
+        <button id="saveRatingButton">Bewertung speichern</button>
+      </div>
+    </section>
+
+    <section class="right-panel">
+      <h2>Zusammenfassung</h2>
+      <div id="summaryContainer"></div>
+      <button id="exportButton">Export als Text</button>
+    </section>
+  </main>
+
+  <footer>
+    <small>Hinweis: Skala –4…+4 ist ein eigenes Modell und nicht die offizielle ICF-Qualifikatorskala.</small>
+  </footer>
+
+  <script src="script.js"></script>
+</body>
+</html>
diff --git a/package-lock.json b/package-lock.json
deleted file mode 100644
index f0d98d4..0000000
--- a/package-lock.json
+++ /dev/null
@@ -1,747 +0,0 @@
-{
-	"name": "icf-reflektor",
-	"version": "1.0.0",
-	"lockfileVersion": 3,
-	"requires": true,
-	"packages": {
-		"": {
-			"name": "icf-reflektor",
-			"version": "1.0.0",
-			"dependencies": {
-				"idb": "^8.0.3"
-			},
-			"devDependencies": {
-				"@sveltejs/adapter-auto": "^7.0.0",
-				"@sveltejs/kit": "^2.48.5",
-				"@sveltejs/vite-plugin-svelte": "^6.2.1",
-				"svelte": "^5.43.8",
-				"svelte-check": "^4.3.4",
-				"typescript": "^5.9.3",
-				"vite": "^7.2.2"
-			}
-		},
-		"node_modules/@esbuild/linux-x64": {
-			"version": "0.25.12",
-			"cpu": [
-				"x64"
-			],
-			"dev": true,
-			"license": "MIT",
-			"optional": true,
-			"os": [
-				"linux"
-			],
-			"engines": {
-				"node": ">=18"
-			}
-		},
-		"node_modules/@jridgewell/gen-mapping": {
-			"version": "0.3.13",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/sourcemap-codec": "^1.5.0",
-				"@jridgewell/trace-mapping": "^0.3.24"
-			}
-		},
-		"node_modules/@jridgewell/remapping": {
-			"version": "2.3.5",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/gen-mapping": "^0.3.5",
-				"@jridgewell/trace-mapping": "^0.3.24"
-			}
-		},
-		"node_modules/@jridgewell/resolve-uri": {
-			"version": "3.1.2",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=6.0.0"
-			}
-		},
-		"node_modules/@jridgewell/sourcemap-codec": {
-			"version": "1.5.5",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/@jridgewell/trace-mapping": {
-			"version": "0.3.31",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/resolve-uri": "^3.1.0",
-				"@jridgewell/sourcemap-codec": "^1.4.14"
-			}
-		},
-		"node_modules/@polka/url": {
-			"version": "1.0.0-next.29",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/@rollup/rollup-linux-x64-gnu": {
-			"version": "4.53.3",
-			"cpu": [
-				"x64"
-			],
-			"dev": true,
-			"license": "MIT",
-			"optional": true,
-			"os": [
-				"linux"
-			]
-		},
-		"node_modules/@rollup/rollup-linux-x64-musl": {
-			"version": "4.53.3",
-			"cpu": [
-				"x64"
-			],
-			"dev": true,
-			"license": "MIT",
-			"optional": true,
-			"os": [
-				"linux"
-			]
-		},
-		"node_modules/@standard-schema/spec": {
-			"version": "1.0.0",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/@sveltejs/acorn-typescript": {
-			"version": "1.0.8",
-			"dev": true,
-			"license": "MIT",
-			"peerDependencies": {
-				"acorn": "^8.9.0"
-			}
-		},
-		"node_modules/@sveltejs/adapter-auto": {
-			"version": "7.0.0",
-			"dev": true,
-			"license": "MIT",
-			"peerDependencies": {
-				"@sveltejs/kit": "^2.0.0"
-			}
-		},
-		"node_modules/@sveltejs/kit": {
-			"version": "2.49.2",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@standard-schema/spec": "^1.0.0",
-				"@sveltejs/acorn-typescript": "^1.0.5",
-				"@types/cookie": "^0.6.0",
-				"acorn": "^8.14.1",
-				"cookie": "^0.6.0",
-				"devalue": "^5.3.2",
-				"esm-env": "^1.2.2",
-				"kleur": "^4.1.5",
-				"magic-string": "^0.30.5",
-				"mrmime": "^2.0.0",
-				"sade": "^1.8.1",
-				"set-cookie-parser": "^2.6.0",
-				"sirv": "^3.0.0"
-			},
-			"bin": {
-				"svelte-kit": "svelte-kit.js"
-			},
-			"engines": {
-				"node": ">=18.13"
-			},
-			"peerDependencies": {
-				"@opentelemetry/api": "^1.0.0",
-				"@sveltejs/vite-plugin-svelte": "^3.0.0 || ^4.0.0-next.1 || ^5.0.0 || ^6.0.0-next.0",
-				"svelte": "^4.0.0 || ^5.0.0-next.0",
-				"vite": "^5.0.3 || ^6.0.0 || ^7.0.0-beta.0"
-			},
-			"peerDependenciesMeta": {
-				"@opentelemetry/api": {
-					"optional": true
-				}
-			}
-		},
-		"node_modules/@sveltejs/vite-plugin-svelte": {
-			"version": "6.2.1",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@sveltejs/vite-plugin-svelte-inspector": "^5.0.0",
-				"debug": "^4.4.1",
-				"deepmerge": "^4.3.1",
-				"magic-string": "^0.30.17",
-				"vitefu": "^1.1.1"
-			},
-			"engines": {
-				"node": "^20.19 || ^22.12 || >=24"
-			},
-			"peerDependencies": {
-				"svelte": "^5.0.0",
-				"vite": "^6.3.0 || ^7.0.0"
-			}
-		},
-		"node_modules/@sveltejs/vite-plugin-svelte-inspector": {
-			"version": "5.0.1",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"debug": "^4.4.1"
-			},
-			"engines": {
-				"node": "^20.19 || ^22.12 || >=24"
-			},
-			"peerDependencies": {
-				"@sveltejs/vite-plugin-svelte": "^6.0.0-next.0",
-				"svelte": "^5.0.0",
-				"vite": "^6.3.0 || ^7.0.0"
-			}
-		},
-		"node_modules/@types/cookie": {
-			"version": "0.6.0",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/@types/estree": {
-			"version": "1.0.8",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/acorn": {
-			"version": "8.15.0",
-			"dev": true,
-			"license": "MIT",
-			"bin": {
-				"acorn": "bin/acorn"
-			},
-			"engines": {
-				"node": ">=0.4.0"
-			}
-		},
-		"node_modules/aria-query": {
-			"version": "5.3.2",
-			"dev": true,
-			"license": "Apache-2.0",
-			"engines": {
-				"node": ">= 0.4"
-			}
-		},
-		"node_modules/axobject-query": {
-			"version": "4.1.0",
-			"dev": true,
-			"license": "Apache-2.0",
-			"engines": {
-				"node": ">= 0.4"
-			}
-		},
-		"node_modules/chokidar": {
-			"version": "4.0.3",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"readdirp": "^4.0.1"
-			},
-			"engines": {
-				"node": ">= 14.16.0"
-			},
-			"funding": {
-				"url": "https://paulmillr.com/funding/"
-			}
-		},
-		"node_modules/clsx": {
-			"version": "2.1.1",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=6"
-			}
-		},
-		"node_modules/cookie": {
-			"version": "0.6.0",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">= 0.6"
-			}
-		},
-		"node_modules/debug": {
-			"version": "4.4.3",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"ms": "^2.1.3"
-			},
-			"engines": {
-				"node": ">=6.0"
-			},
-			"peerDependenciesMeta": {
-				"supports-color": {
-					"optional": true
-				}
-			}
-		},
-		"node_modules/deepmerge": {
-			"version": "4.3.1",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=0.10.0"
-			}
-		},
-		"node_modules/devalue": {
-			"version": "5.6.0",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/esbuild": {
-			"version": "0.25.12",
-			"dev": true,
-			"hasInstallScript": true,
-			"license": "MIT",
-			"bin": {
-				"esbuild": "bin/esbuild"
-			},
-			"engines": {
-				"node": ">=18"
-			},
-			"optionalDependencies": {
-				"@esbuild/aix-ppc64": "0.25.12",
-				"@esbuild/android-arm": "0.25.12",
-				"@esbuild/android-arm64": "0.25.12",
-				"@esbuild/android-x64": "0.25.12",
-				"@esbuild/darwin-arm64": "0.25.12",
-				"@esbuild/darwin-x64": "0.25.12",
-				"@esbuild/freebsd-arm64": "0.25.12",
-				"@esbuild/freebsd-x64": "0.25.12",
-				"@esbuild/linux-arm": "0.25.12",
-				"@esbuild/linux-arm64": "0.25.12",
-				"@esbuild/linux-ia32": "0.25.12",
-				"@esbuild/linux-loong64": "0.25.12",
-				"@esbuild/linux-mips64el": "0.25.12",
-				"@esbuild/linux-ppc64": "0.25.12",
-				"@esbuild/linux-riscv64": "0.25.12",
-				"@esbuild/linux-s390x": "0.25.12",
-				"@esbuild/linux-x64": "0.25.12",
-				"@esbuild/netbsd-arm64": "0.25.12",
-				"@esbuild/netbsd-x64": "0.25.12",
-				"@esbuild/openbsd-arm64": "0.25.12",
-				"@esbuild/openbsd-x64": "0.25.12",
-				"@esbuild/openharmony-arm64": "0.25.12",
-				"@esbuild/sunos-x64": "0.25.12",
-				"@esbuild/win32-arm64": "0.25.12",
-				"@esbuild/win32-ia32": "0.25.12",
-				"@esbuild/win32-x64": "0.25.12"
-			}
-		},
-		"node_modules/esm-env": {
-			"version": "1.2.2",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/esrap": {
-			"version": "2.2.1",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/sourcemap-codec": "^1.4.15"
-			}
-		},
-		"node_modules/fdir": {
-			"version": "6.5.0",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=12.0.0"
-			},
-			"peerDependencies": {
-				"picomatch": "^3 || ^4"
-			},
-			"peerDependenciesMeta": {
-				"picomatch": {
-					"optional": true
-				}
-			}
-		},
-		"node_modules/idb": {
-			"version": "8.0.3",
-			"license": "ISC"
-		},
-		"node_modules/is-reference": {
-			"version": "3.0.3",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@types/estree": "^1.0.6"
-			}
-		},
-		"node_modules/kleur": {
-			"version": "4.1.5",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=6"
-			}
-		},
-		"node_modules/locate-character": {
-			"version": "3.0.0",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/magic-string": {
-			"version": "0.30.21",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/sourcemap-codec": "^1.5.5"
-			}
-		},
-		"node_modules/mri": {
-			"version": "1.2.0",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=4"
-			}
-		},
-		"node_modules/mrmime": {
-			"version": "2.0.1",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=10"
-			}
-		},
-		"node_modules/ms": {
-			"version": "2.1.3",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/nanoid": {
-			"version": "3.3.11",
-			"dev": true,
-			"funding": [
-				{
-					"type": "github",
-					"url": "https://github.com/sponsors/ai"
-				}
-			],
-			"license": "MIT",
-			"bin": {
-				"nanoid": "bin/nanoid.cjs"
-			},
-			"engines": {
-				"node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
-			}
-		},
-		"node_modules/picocolors": {
-			"version": "1.1.1",
-			"dev": true,
-			"license": "ISC"
-		},
-		"node_modules/picomatch": {
-			"version": "4.0.3",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=12"
-			},
-			"funding": {
-				"url": "https://github.com/sponsors/jonschlinkert"
-			}
-		},
-		"node_modules/postcss": {
-			"version": "8.5.6",
-			"dev": true,
-			"funding": [
-				{
-					"type": "opencollective",
-					"url": "https://opencollective.com/postcss/"
-				},
-				{
-					"type": "tidelift",
-					"url": "https://tidelift.com/funding/github/npm/postcss"
-				},
-				{
-					"type": "github",
-					"url": "https://github.com/sponsors/ai"
-				}
-			],
-			"license": "MIT",
-			"dependencies": {
-				"nanoid": "^3.3.11",
-				"picocolors": "^1.1.1",
-				"source-map-js": "^1.2.1"
-			},
-			"engines": {
-				"node": "^10 || ^12 || >=14"
-			}
-		},
-		"node_modules/readdirp": {
-			"version": "4.1.2",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">= 14.18.0"
-			},
-			"funding": {
-				"type": "individual",
-				"url": "https://paulmillr.com/funding/"
-			}
-		},
-		"node_modules/rollup": {
-			"version": "4.53.3",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@types/estree": "1.0.8"
-			},
-			"bin": {
-				"rollup": "dist/bin/rollup"
-			},
-			"engines": {
-				"node": ">=18.0.0",
-				"npm": ">=8.0.0"
-			},
-			"optionalDependencies": {
-				"@rollup/rollup-android-arm-eabi": "4.53.3",
-				"@rollup/rollup-android-arm64": "4.53.3",
-				"@rollup/rollup-darwin-arm64": "4.53.3",
-				"@rollup/rollup-darwin-x64": "4.53.3",
-				"@rollup/rollup-freebsd-arm64": "4.53.3",
-				"@rollup/rollup-freebsd-x64": "4.53.3",
-				"@rollup/rollup-linux-arm-gnueabihf": "4.53.3",
-				"@rollup/rollup-linux-arm-musleabihf": "4.53.3",
-				"@rollup/rollup-linux-arm64-gnu": "4.53.3",
-				"@rollup/rollup-linux-arm64-musl": "4.53.3",
-				"@rollup/rollup-linux-loong64-gnu": "4.53.3",
-				"@rollup/rollup-linux-ppc64-gnu": "4.53.3",
-				"@rollup/rollup-linux-riscv64-gnu": "4.53.3",
-				"@rollup/rollup-linux-riscv64-musl": "4.53.3",
-				"@rollup/rollup-linux-s390x-gnu": "4.53.3",
-				"@rollup/rollup-linux-x64-gnu": "4.53.3",
-				"@rollup/rollup-linux-x64-musl": "4.53.3",
-				"@rollup/rollup-openharmony-arm64": "4.53.3",
-				"@rollup/rollup-win32-arm64-msvc": "4.53.3",
-				"@rollup/rollup-win32-ia32-msvc": "4.53.3",
-				"@rollup/rollup-win32-x64-gnu": "4.53.3",
-				"@rollup/rollup-win32-x64-msvc": "4.53.3",
-				"fsevents": "~2.3.2"
-			}
-		},
-		"node_modules/sade": {
-			"version": "1.8.1",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"mri": "^1.1.0"
-			},
-			"engines": {
-				"node": ">=6"
-			}
-		},
-		"node_modules/set-cookie-parser": {
-			"version": "2.7.2",
-			"dev": true,
-			"license": "MIT"
-		},
-		"node_modules/sirv": {
-			"version": "3.0.2",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@polka/url": "^1.0.0-next.24",
-				"mrmime": "^2.0.0",
-				"totalist": "^3.0.0"
-			},
-			"engines": {
-				"node": ">=18"
-			}
-		},
-		"node_modules/source-map-js": {
-			"version": "1.2.1",
-			"dev": true,
-			"license": "BSD-3-Clause",
-			"engines": {
-				"node": ">=0.10.0"
-			}
-		},
-		"node_modules/svelte": {
-			"version": "5.45.8",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/remapping": "^2.3.4",
-				"@jridgewell/sourcemap-codec": "^1.5.0",
-				"@sveltejs/acorn-typescript": "^1.0.5",
-				"@types/estree": "^1.0.5",
-				"acorn": "^8.12.1",
-				"aria-query": "^5.3.1",
-				"axobject-query": "^4.1.0",
-				"clsx": "^2.1.1",
-				"devalue": "^5.5.0",
-				"esm-env": "^1.2.1",
-				"esrap": "^2.2.1",
-				"is-reference": "^3.0.3",
-				"locate-character": "^3.0.0",
-				"magic-string": "^0.30.11",
-				"zimmerframe": "^1.1.2"
-			},
-			"engines": {
-				"node": ">=18"
-			}
-		},
-		"node_modules/svelte-check": {
-			"version": "4.3.4",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"@jridgewell/trace-mapping": "^0.3.25",
-				"chokidar": "^4.0.1",
-				"fdir": "^6.2.0",
-				"picocolors": "^1.0.0",
-				"sade": "^1.7.4"
-			},
-			"bin": {
-				"svelte-check": "bin/svelte-check"
-			},
-			"engines": {
-				"node": ">= 18.0.0"
-			},
-			"peerDependencies": {
-				"svelte": "^4.0.0 || ^5.0.0-next.0",
-				"typescript": ">=5.0.0"
-			}
-		},
-		"node_modules/tinyglobby": {
-			"version": "0.2.15",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"fdir": "^6.5.0",
-				"picomatch": "^4.0.3"
-			},
-			"engines": {
-				"node": ">=12.0.0"
-			},
-			"funding": {
-				"url": "https://github.com/sponsors/SuperchupuDev"
-			}
-		},
-		"node_modules/totalist": {
-			"version": "3.0.1",
-			"dev": true,
-			"license": "MIT",
-			"engines": {
-				"node": ">=6"
-			}
-		},
-		"node_modules/typescript": {
-			"version": "5.9.3",
-			"dev": true,
-			"license": "Apache-2.0",
-			"bin": {
-				"tsc": "bin/tsc",
-				"tsserver": "bin/tsserver"
-			},
-			"engines": {
-				"node": ">=14.17"
-			}
-		},
-		"node_modules/vite": {
-			"version": "7.2.7",
-			"dev": true,
-			"license": "MIT",
-			"dependencies": {
-				"esbuild": "^0.25.0",
-				"fdir": "^6.5.0",
-				"picomatch": "^4.0.3",
-				"postcss": "^8.5.6",
-				"rollup": "^4.43.0",
-				"tinyglobby": "^0.2.15"
-			},
-			"bin": {
-				"vite": "bin/vite.js"
-			},
-			"engines": {
-				"node": "^20.19.0 || >=22.12.0"
-			},
-			"funding": {
-				"url": "https://github.com/vitejs/vite?sponsor=1"
-			},
-			"optionalDependencies": {
-				"fsevents": "~2.3.3"
-			},
-			"peerDependencies": {
-				"@types/node": "^20.19.0 || >=22.12.0",
-				"jiti": ">=1.21.0",
-				"less": "^4.0.0",
-				"lightningcss": "^1.21.0",
-				"sass": "^1.70.0",
-				"sass-embedded": "^1.70.0",
-				"stylus": ">=0.54.8",
-				"sugarss": "^5.0.0",
-				"terser": "^5.16.0",
-				"tsx": "^4.8.1",
-				"yaml": "^2.4.2"
-			},
-			"peerDependenciesMeta": {
-				"@types/node": {
-					"optional": true
-				},
-				"jiti": {
-					"optional": true
-				},
-				"less": {
-					"optional": true
-				},
-				"lightningcss": {
-					"optional": true
-				},
-				"sass": {
-					"optional": true
-				},
-				"sass-embedded": {
-					"optional": true
-				},
-				"stylus": {
-					"optional": true
-				},
-				"sugarss": {
-					"optional": true
-				},
-				"terser": {
-					"optional": true
-				},
-				"tsx": {
-					"optional": true
-				},
-				"yaml": {
-					"optional": true
-				}
-			}
-		},
-		"node_modules/vitefu": {
-			"version": "1.1.1",
-			"dev": true,
-			"license": "MIT",
-			"workspaces": [
-				"tests/deps/*",
-				"tests/projects/*",
-				"tests/projects/workspace/packages/*"
-			],
-			"peerDependencies": {
-				"vite": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0-beta.0"
-			},
-			"peerDependenciesMeta": {
-				"vite": {
-					"optional": true
-				}
-			}
-		},
-		"node_modules/zimmerframe": {
-			"version": "1.1.4",
-			"dev": true,
-			"license": "MIT"
-		}
-	}
-}
diff --git a/package.json b/package.json
deleted file mode 100644
index 6e0cee8..0000000
--- a/package.json
+++ /dev/null
@@ -1,26 +0,0 @@
-{
-	"name": "icf-reflektor",
-	"private": true,
-	"version": "1.0.0",
-	"type": "module",
-	"scripts": {
-		"dev": "vite dev",
-		"build": "vite build",
-		"preview": "vite preview",
-		"prepare": "svelte-kit sync || echo ''",
-		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
-		"check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
-	},
-	"devDependencies": {
-		"@sveltejs/adapter-auto": "^7.0.0",
-		"@sveltejs/kit": "^2.48.5",
-		"@sveltejs/vite-plugin-svelte": "^6.2.1",
-		"svelte": "^5.43.8",
-		"svelte-check": "^4.3.4",
-		"typescript": "^5.9.3",
-		"vite": "^7.2.2"
-	},
-	"dependencies": {
-		"idb": "^8.0.3"
-	}
-}
diff --git a/script.js b/script.js
new file mode 100644
index 0000000..df16a3e
--- /dev/null
+++ b/script.js
@@ -0,0 +1,258 @@
+const categoryListEl = document.getElementById("categoryList");
+const searchInputEl = document.getElementById("searchInput");
+const selectionInfoEl = document.getElementById("selectionInfo");
+const ratingControlsEl = document.getElementById("ratingControls");
+const ratingButtonsContainer = document.getElementById("ratingButtons");
+const noteInputEl = document.getElementById("noteInput");
+const saveRatingButton = document.getElementById("saveRatingButton");
+const summaryContainerEl = document.getElementById("summaryContainer");
+const exportButton = document.getElementById("exportButton");
+const activityInputEl = document.getElementById("activityInput");
+const modeSelectEl = document.getElementById("modeSelect");
+
+const RATING_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
+
+let icfTree = null;
+let flatCategories = [];
+let selectedCategory = null;
+
+// code -> { code, title, value, note }
+let ratings = {};
+
+const STORAGE_KEY = "icfToolState";
+
+function loadState() {
+  try {
+    const raw = localStorage.getItem(STORAGE_KEY);
+    if (!raw) return;
+    const parsed = JSON.parse(raw);
+    if (parsed && typeof parsed === "object") {
+      ratings = parsed.ratings || {};
+      if (parsed.activity) {
+        activityInputEl.value = parsed.activity;
+      }
+    }
+  } catch (e) {
+    console.warn("Konnte Zustand nicht laden:", e);
+  }
+}
+
+function saveState() {
+  const state = {
+    ratings,
+    activity: activityInputEl.value || "",
+  };
+  try {
+    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
+  } catch (e) {
+    console.warn("Konnte Zustand nicht speichern:", e);
+  }
+}
+
+async function loadIcfData() {
+  const resp = await fetch("data/icf-cy.sample.json");
+  icfTree = await resp.json();
+  flatCategories = flattenTree(icfTree);
+  renderCategoryList();
+  renderSummary();
+}
+
+function flattenTree(tree) {
+  const result = [];
+  function visit(node) {
+    if (node.code && node.code !== "root") {
+      result.push({
+        code: node.code,
+        title: node.title || "",
+        description: node.description || "",
+      });
+    }
+    if (Array.isArray(node.children)) {
+      node.children.forEach(visit);
+    }
+  }
+  visit(tree);
+  return result;
+}
+
+function renderCategoryList() {
+  const term = (searchInputEl.value || "").toLowerCase().trim();
+  categoryListEl.innerHTML = "";
+
+  const filtered = flatCategories.filter((cat) => {
+    if (!term) return true;
+    const codeMatch = (cat.code || "").toLowerCase().includes(term);
+    const titleMatch = (cat.title || "").toLowerCase().includes(term);
+    return codeMatch || titleMatch;
+  });
+
+  filtered.forEach((cat) => {
+    const li = document.createElement("li");
+    li.textContent = `${cat.code} – ${cat.title}`;
+    li.dataset.code = cat.code;
+    if (selectedCategory && selectedCategory.code === cat.code) {
+      li.classList.add("active");
+    }
+    li.addEventListener("click", () => {
+      selectedCategory = cat;
+      updateSelectionUI();
+      renderCategoryList(); // um active-Status zu aktualisieren
+    });
+    categoryListEl.appendChild(li);
+  });
+}
+
+function updateSelectionUI() {
+  if (!selectedCategory) {
+    selectionInfoEl.textContent = "Keine Kategorie ausgewählt.";
+    ratingControlsEl.classList.add("hidden");
+    return;
+  }
+  selectionInfoEl.innerHTML = `
+    <strong>${selectedCategory.code}</strong> – ${selectedCategory.title}
+  `;
+  ratingControlsEl.classList.remove("hidden");
+
+  renderRatingButtons();
+
+  const entry = ratings[selectedCategory.code];
+  noteInputEl.value = entry ? entry.note || "" : "";
+}
+
+function renderRatingButtons() {
+  ratingButtonsContainer.innerHTML = "";
+  const currentValue = ratings[selectedCategory?.code]?.value ?? null;
+
+  RATING_VALUES.forEach((val) => {
+    const btn = document.createElement("button");
+    btn.type = "button";
+    btn.className = "rating-button";
+    btn.textContent = String(val);
+    if (val === currentValue) {
+      btn.classList.add("selected");
+    }
+    btn.addEventListener("click", () => {
+      const buttons = ratingButtonsContainer.querySelectorAll(".rating-button");
+      buttons.forEach((b) => b.classList.remove("selected"));
+      btn.classList.add("selected");
+      if (selectedCategory) {
+        if (!ratings[selectedCategory.code]) {
+          ratings[selectedCategory.code] = {
+            code: selectedCategory.code,
+            title: selectedCategory.title,
+            value: val,
+            note: noteInputEl.value || "",
+          };
+        } else {
+          ratings[selectedCategory.code].value = val;
+        }
+        saveState();
+        renderSummary();
+      }
+    });
+    ratingButtonsContainer.appendChild(btn);
+  });
+}
+
+saveRatingButton.addEventListener("click", () => {
+  if (!selectedCategory) return;
+  const existing = ratings[selectedCategory.code] || {
+    code: selectedCategory.code,
+    title: selectedCategory.title,
+    value: 0,
+    note: "",
+  };
+  existing.note = noteInputEl.value || "";
+  ratings[selectedCategory.code] = existing;
+  saveState();
+  renderSummary();
+});
+
+function renderSummary() {
+  summaryContainerEl.innerHTML = "";
+
+  const values = Object.values(ratings).filter((r) => r.value !== undefined);
+
+  if (values.length === 0) {
+    summaryContainerEl.textContent = "Noch keine Bewertungen erfasst.";
+    return;
+  }
+
+  values.sort((a, b) => a.code.localeCompare(b.code));
+
+  values.forEach((entry) => {
+    const div = document.createElement("div");
+    div.className = "summary-entry";
+
+    const header = document.createElement("div");
+    header.className = "summary-entry-header";
+
+    const leftSpan = document.createElement("span");
+    leftSpan.className = "summary-entry-code";
+    leftSpan.textContent = `${entry.code} – ${entry.title}`;
+
+    const rightSpan = document.createElement("span");
+    rightSpan.className = "summary-entry-value";
+    rightSpan.textContent = `Wert: ${entry.value}`;
+
+    header.appendChild(leftSpan);
+    header.appendChild(rightSpan);
+    div.appendChild(header);
+
+    if (entry.note && entry.note.trim() !== "") {
+      const noteDiv = document.createElement("div");
+      noteDiv.className = "summary-entry-note";
+      noteDiv.textContent = entry.note;
+      div.appendChild(noteDiv);
+    }
+
+    summaryContainerEl.appendChild(div);
+  });
+}
+
+exportButton.addEventListener("click", () => {
+  const activity = activityInputEl.value || "(keine Angabe)";
+  const mode = modeSelectEl.value === "icf-cy" ? "ICF-CY" : "ICF";
+  const values = Object.values(ratings).filter((r) => r.value !== undefined);
+
+  let lines = [];
+  lines.push(`# ICF-Bericht`);
+  lines.push("");
+  lines.push(`**Aktivität / Situation:** ${activity}`);
+  lines.push(`**Modus:** ${mode}`);
+  lines.push(`**Erstellt am:** ${new Date().toLocaleString("de-DE")}`);
+  lines.push("");
+  if (values.length === 0) {
+    lines.push("_Es wurden keine Bewertungen erfasst._");
+  } else {
+    lines.push(`## Bewertungen`);
+    lines.push("");
+    const sorted = [...values].sort((a, b) => a.code.localeCompare(b.code));
+    for (const entry of sorted) {
+      lines.push(`- **${entry.code} – ${entry.title}** (Wert: ${entry.value})`);
+      if (entry.note && entry.note.trim() !== "") {
+        lines.push(`  - Erläuterung: ${entry.note.trim()}`);
+      }
+    }
+  }
+
+  const text = lines.join("\n");
+  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
+  const url = URL.createObjectURL(blob);
+  const a = document.createElement("a");
+  a.href = url;
+  a.download = "icf-report.txt";
+  document.body.appendChild(a);
+  a.click();
+  document.body.removeChild(a);
+  URL.revokeObjectURL(url);
+});
+
+// Suche
+searchInputEl.addEventListener("input", () => {
+  renderCategoryList();
+});
+
+// Zustand laden und Daten holen
+loadState();
+loadIcfData();
diff --git a/src/app.css b/src/app.css
deleted file mode 100644
index c842772..0000000
--- a/src/app.css
+++ /dev/null
@@ -1,280 +0,0 @@
-/* Global styles for ICF-Reflektor */
-
-:root {
-  --primary-color: #0066cc;
-  --secondary-color: #28a745;
-  --danger-color: #dc3545;
-  --warning-color: #ffc107;
-  --dark-color: #333;
-  --light-color: #f8f9fa;
-  --border-color: #dee2e6;
-  --text-color: #212529;
-  --background-color: #ffffff;
-  
-  --spacing-xs: 0.25rem;
-  --spacing-sm: 0.5rem;
-  --spacing-md: 1rem;
-  --spacing-lg: 1.5rem;
-  --spacing-xl: 2rem;
-  
-  --border-radius: 0.375rem;
-  --transition-speed: 0.2s;
-}
-
-* {
-  box-sizing: border-box;
-  margin: 0;
-  padding: 0;
-}
-
-body {
-  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
-  line-height: 1.6;
-  color: var(--text-color);
-  background-color: var(--light-color);
-}
-
-.app {
-  min-height: 100vh;
-  display: flex;
-  flex-direction: column;
-}
-
-.container {
-  max-width: 1200px;
-  margin: 0 auto;
-  padding: 0 var(--spacing-md);
-  width: 100%;
-}
-
-/* Header */
-header {
-  background-color: var(--background-color);
-  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
-  padding: var(--spacing-md) 0;
-}
-
-header .container {
-  display: flex;
-  justify-content: space-between;
-  align-items: center;
-  flex-wrap: wrap;
-  gap: var(--spacing-md);
-}
-
-header h1 {
-  font-size: 1.5rem;
-  margin: 0;
-}
-
-header h1 a {
-  color: var(--primary-color);
-  text-decoration: none;
-}
-
-header nav {
-  display: flex;
-  gap: var(--spacing-lg);
-}
-
-header nav a {
-  color: var(--text-color);
-  text-decoration: none;
-  padding: var(--spacing-sm) var(--spacing-md);
-  border-radius: var(--border-radius);
-  transition: background-color var(--transition-speed);
-}
-
-header nav a:hover {
-  background-color: var(--light-color);
-}
-
-.mode-switch {
-  display: flex;
-  gap: var(--spacing-md);
-  background-color: var(--light-color);
-  padding: var(--spacing-sm) var(--spacing-md);
-  border-radius: var(--border-radius);
-}
-
-.mode-switch label {
-  cursor: pointer;
-  display: flex;
-  align-items: center;
-  gap: var(--spacing-xs);
-}
-
-/* Main content */
-main {
-  flex: 1;
-  padding: var(--spacing-xl) 0;
-}
-
-/* Footer */
-footer {
-  background-color: var(--background-color);
-  border-top: 1px solid var(--border-color);
-  padding: var(--spacing-lg) 0;
-  margin-top: auto;
-  text-align: center;
-  color: #666;
-  font-size: 0.875rem;
-}
-
-/* Buttons */
-.btn {
-  display: inline-block;
-  padding: var(--spacing-sm) var(--spacing-lg);
-  font-size: 1rem;
-  font-weight: 500;
-  text-align: center;
-  text-decoration: none;
-  border: none;
-  border-radius: var(--border-radius);
-  cursor: pointer;
-  transition: all var(--transition-speed);
-}
-
-.btn-primary {
-  background-color: var(--primary-color);
-  color: white;
-}
-
-.btn-primary:hover {
-  background-color: #0056b3;
-}
-
-.btn-secondary {
-  background-color: var(--secondary-color);
-  color: white;
-}
-
-.btn-secondary:hover {
-  background-color: #218838;
-}
-
-.btn-danger {
-  background-color: var(--danger-color);
-  color: white;
-}
-
-.btn-danger:hover {
-  background-color: #c82333;
-}
-
-.btn-outline {
-  background-color: transparent;
-  color: var(--primary-color);
-  border: 1px solid var(--primary-color);
-}
-
-.btn-outline:hover {
-  background-color: var(--primary-color);
-  color: white;
-}
-
-/* Forms */
-.form-group {
-  margin-bottom: var(--spacing-lg);
-}
-
-label {
-  display: block;
-  margin-bottom: var(--spacing-xs);
-  font-weight: 500;
-}
-
-input[type="text"],
-input[type="date"],
-input[type="number"],
-textarea,
-select {
-  width: 100%;
-  padding: var(--spacing-sm) var(--spacing-md);
-  font-size: 1rem;
-  border: 1px solid var(--border-color);
-  border-radius: var(--border-radius);
-  font-family: inherit;
-}
-
-textarea {
-  min-height: 100px;
-  resize: vertical;
-}
-
-input[type="range"] {
-  width: 100%;
-}
-
-/* Cards */
-.card {
-  background-color: var(--background-color);
-  border-radius: var(--border-radius);
-  padding: var(--spacing-lg);
-  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
-  margin-bottom: var(--spacing-md);
-}
-
-.card-title {
-  font-size: 1.25rem;
-  margin-bottom: var(--spacing-md);
-}
-
-/* Grid */
-.grid {
-  display: grid;
-  gap: var(--spacing-md);
-}
-
-.grid-2 {
-  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
-}
-
-/* Utilities */
-.text-center {
-  text-align: center;
-}
-
-.mt-1 { margin-top: var(--spacing-sm); }
-.mt-2 { margin-top: var(--spacing-md); }
-.mt-3 { margin-top: var(--spacing-lg); }
-
-.mb-1 { margin-bottom: var(--spacing-sm); }
-.mb-2 { margin-bottom: var(--spacing-md); }
-.mb-3 { margin-bottom: var(--spacing-lg); }
-
-.flex {
-  display: flex;
-}
-
-.flex-between {
-  display: flex;
-  justify-content: space-between;
-  align-items: center;
-}
-
-.flex-center {
-  display: flex;
-  justify-content: center;
-  align-items: center;
-}
-
-.gap-1 { gap: var(--spacing-sm); }
-.gap-2 { gap: var(--spacing-md); }
-.gap-3 { gap: var(--spacing-lg); }
-
-/* Responsive */
-@media (max-width: 768px) {
-  header .container {
-    flex-direction: column;
-    align-items: stretch;
-  }
-
-  .mode-switch {
-    justify-content: center;
-  }
-  
-  header nav {
-    justify-content: center;
-  }
-}
diff --git a/src/app.d.ts b/src/app.d.ts
deleted file mode 100644
index da08e6d..0000000
--- a/src/app.d.ts
+++ /dev/null
@@ -1,13 +0,0 @@
-// See https://svelte.dev/docs/kit/types#app.d.ts
-// for information about these interfaces
-declare global {
-	namespace App {
-		// interface Error {}
-		// interface Locals {}
-		// interface PageData {}
-		// interface PageState {}
-		// interface Platform {}
-	}
-}
-
-export {};
diff --git a/src/app.html b/src/app.html
deleted file mode 100644
index f273cc5..0000000
--- a/src/app.html
+++ /dev/null
@@ -1,11 +0,0 @@
-<!doctype html>
-<html lang="en">
-	<head>
-		<meta charset="utf-8" />
-		<meta name="viewport" content="width=device-width, initial-scale=1" />
-		%sveltekit.head%
-	</head>
-	<body data-sveltekit-preload-data="hover">
-		<div style="display: contents">%sveltekit.body%</div>
-	</body>
-</html>
diff --git a/src/lib/assets/favicon.svg b/src/lib/assets/favicon.svg
deleted file mode 100644
index cc5dc66..0000000
--- a/src/lib/assets/favicon.svg
+++ /dev/null
@@ -1 +0,0 @@
-<svg xmlns="http://www.w3.org/2000/svg" width="107" height="128" viewBox="0 0 107 128"><title>svelte-logo</title><path d="M94.157 22.819c-10.4-14.885-30.94-19.297-45.792-9.835L22.282 29.608A29.92 29.92 0 0 0 8.764 49.65a31.5 31.5 0 0 0 3.108 20.231 30 30 0 0 0-4.477 11.183 31.9 31.9 0 0 0 5.448 24.116c10.402 14.887 30.942 19.297 45.791 9.835l26.083-16.624A29.92 29.92 0 0 0 98.235 78.35a31.53 31.53 0 0 0-3.105-20.232 30 30 0 0 0 4.474-11.182 31.88 31.88 0 0 0-5.447-24.116" style="fill:#ff3e00"/><path d="M45.817 106.582a20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.503 18 18 0 0 1 .624-2.435l.49-1.498 1.337.981a33.6 33.6 0 0 0 10.203 5.098l.97.294-.09.968a5.85 5.85 0 0 0 1.052 3.878 6.24 6.24 0 0 0 6.695 2.485 5.8 5.8 0 0 0 1.603-.704L69.27 76.28a5.43 5.43 0 0 0 2.45-3.631 5.8 5.8 0 0 0-.987-4.371 6.24 6.24 0 0 0-6.698-2.487 5.7 5.7 0 0 0-1.6.704l-9.953 6.345a19 19 0 0 1-5.296 2.326 20.72 20.72 0 0 1-22.237-8.243 19.17 19.17 0 0 1-3.277-14.502 17.99 17.99 0 0 1 8.13-12.052l26.081-16.623a19 19 0 0 1 5.3-2.329 20.72 20.72 0 0 1 22.237 8.243 19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-.624 2.435l-.49 1.498-1.337-.98a33.6 33.6 0 0 0-10.203-5.1l-.97-.294.09-.968a5.86 5.86 0 0 0-1.052-3.878 6.24 6.24 0 0 0-6.696-2.485 5.8 5.8 0 0 0-1.602.704L37.73 51.72a5.42 5.42 0 0 0-2.449 3.63 5.79 5.79 0 0 0 .986 4.372 6.24 6.24 0 0 0 6.698 2.486 5.8 5.8 0 0 0 1.602-.704l9.952-6.342a19 19 0 0 1 5.295-2.328 20.72 20.72 0 0 1 22.237 8.242 19.17 19.17 0 0 1 3.277 14.503 18 18 0 0 1-8.13 12.053l-26.081 16.622a19 19 0 0 1-5.3 2.328" style="fill:#fff"/></svg>
\ No newline at end of file
diff --git a/src/lib/db.ts b/src/lib/db.ts
deleted file mode 100644
index 757ef3a..0000000
--- a/src/lib/db.ts
+++ /dev/null
@@ -1,93 +0,0 @@
-// Database layer using IndexedDB for local persistence
-import { openDB, type IDBPDatabase } from 'idb';
-import type { Activity, Catalog } from './types';
-
-const DB_NAME = 'icf-reflektor-db';
-const DB_VERSION = 1;
-
-interface ICFReflektorDB {
-  activities: {
-    key: string;
-    value: Activity;
-    indexes: { mode: string; createdAt: string };
-  };
-  catalogs: {
-    key: string;
-    value: Catalog;
-    indexes: { mode: string };
-  };
-}
-
-let dbInstance: IDBPDatabase<ICFReflektorDB> | null = null;
-
-export async function initDB(): Promise<IDBPDatabase<ICFReflektorDB>> {
-  if (dbInstance) return dbInstance;
-
-  dbInstance = await openDB<ICFReflektorDB>(DB_NAME, DB_VERSION, {
-    upgrade(db) {
-      // Create activities store
-      if (!db.objectStoreNames.contains('activities')) {
-        const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
-        activityStore.createIndex('mode', 'mode');
-        activityStore.createIndex('createdAt', 'createdAt');
-      }
-
-      // Create catalogs store
-      if (!db.objectStoreNames.contains('catalogs')) {
-        const catalogStore = db.createObjectStore('catalogs', { keyPath: 'name' });
-        catalogStore.createIndex('mode', 'mode');
-      }
-    }
-  });
-
-  return dbInstance;
-}
-
-// Activity CRUD operations
-export async function getAllActivities(): Promise<Activity[]> {
-  const db = await initDB();
-  return await db.getAll('activities');
-}
-
-export async function getActivityById(id: string): Promise<Activity | undefined> {
-  const db = await initDB();
-  return await db.get('activities', id);
-}
-
-export async function saveActivity(activity: Activity): Promise<void> {
-  const db = await initDB();
-  const now = new Date().toISOString();
-  
-  if (!activity.createdAt) {
-    activity.createdAt = now;
-  }
-  activity.updatedAt = now;
-  
-  await db.put('activities', activity);
-}
-
-export async function deleteActivity(id: string): Promise<void> {
-  const db = await initDB();
-  await db.delete('activities', id);
-}
-
-// Catalog CRUD operations
-export async function getAllCatalogs(): Promise<Catalog[]> {
-  const db = await initDB();
-  return await db.getAll('catalogs');
-}
-
-export async function getCatalogByName(name: string): Promise<Catalog | undefined> {
-  const db = await initDB();
-  return await db.get('catalogs', name);
-}
-
-export async function saveCatalog(catalog: Catalog): Promise<void> {
-  const db = await initDB();
-  await db.put('catalogs', catalog);
-}
-
-export async function deleteCatalog(name: string): Promise<void> {
-  const db = await initDB();
-  await db.delete('catalogs', name);
-}
diff --git a/src/lib/export.ts b/src/lib/export.ts
deleted file mode 100644
index 0e79f9b..0000000
--- a/src/lib/export.ts
+++ /dev/null
@@ -1,130 +0,0 @@
-// Export and import functionality for activities
-import type { Activity } from './types';
-
-export function exportToJSON(activity: Activity): string {
-  return JSON.stringify(activity, null, 2);
-}
-
-export function exportToMarkdown(activity: Activity): string {
-  const { title, code, description, context, dimensions, mode, createdAt, updatedAt } = activity;
-  
-  let markdown = `# ${title}\n\n`;
-  
-  if (code) {
-    markdown += `**ICF-Code:** ${code}\n\n`;
-  }
-  
-  markdown += `**Modus:** ${mode === 'icf' ? 'ICF' : 'ICF-CY'}\n\n`;
-  
-  if (description) {
-    markdown += `## Beschreibung\n\n${description}\n\n`;
-  }
-  
-  // Context information
-  markdown += `## Kontextdaten\n\n`;
-  if (context.person) markdown += `- **Person:** ${context.person}\n`;
-  if (context.ageOrGrade) markdown += `- **Alter/Klassenstufe:** ${context.ageOrGrade}\n`;
-  if (context.setting) markdown += `- **Setting:** ${context.setting}\n`;
-  if (context.purpose) markdown += `- **Anlass/Ziel:** ${context.purpose}\n`;
-  if (context.date) markdown += `- **Datum:** ${new Date(context.date).toLocaleDateString('de-DE')}\n`;
-  if (context.author) markdown += `- **Ersteller:** ${context.author}\n`;
-  if (context.notes) markdown += `- **Notizen:** ${context.notes}\n`;
-  markdown += '\n';
-  
-  // Dimensions grouped by ICF component and value
-  if (dimensions.length > 0) {
-    markdown += `## ICF-Kategorien: Ressourcen & Barrieren\n\n`;
-    markdown += `Die Aktivität "${title}" steht im Mittelpunkt. Im Folgenden sind die Faktoren nach ICF-Komponenten gruppiert:\n\n`;
-    
-    // Group by component
-    const componentGroups = {
-      body_functions: dimensions.filter(d => d.component === 'body_functions'),
-      activities: dimensions.filter(d => d.component === 'activities'),
-      participation: dimensions.filter(d => d.component === 'participation'),
-      environmental_factors: dimensions.filter(d => d.component === 'environmental_factors'),
-      personal_factors: dimensions.filter(d => d.component === 'personal_factors')
-    };
-    
-    const componentLabels = {
-      body_functions: '🧠 Körperfunktionen und -strukturen',
-      activities: '🎯 Aktivitäten',
-      participation: '🤝 Partizipation (Teilhabe)',
-      environmental_factors: '🌍 Umweltfaktoren',
-      personal_factors: '👤 Personbezogene Faktoren'
-    };
-    
-    for (const [component, dims] of Object.entries(componentGroups)) {
-      if (dims.length === 0) continue;
-      
-      markdown += `### ${componentLabels[component as keyof typeof componentLabels]}\n\n`;
-      
-      // Within each component, group by value
-      const resources = dims.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
-      const neutral = dims.filter(d => d.value === 0);
-      const barriers = dims.filter(d => d.value < 0).sort((a, b) => a.value - b.value);
-      
-      if (resources.length > 0) {
-        markdown += `#### ✅ Ressourcen\n\n`;
-        resources.forEach(dim => {
-          markdown += `**${dim.label}** ${dim.code ? `(${dim.code})` : ''} — Wert: +${dim.value}\n\n`;
-          if (dim.description) markdown += `${dim.description}\n\n`;
-          if (dim.explanation) markdown += `*Begründung:* ${dim.explanation}\n\n`;
-        });
-      }
-      
-      if (barriers.length > 0) {
-        markdown += `#### ⚠️ Barrieren\n\n`;
-        barriers.forEach(dim => {
-          markdown += `**${dim.label}** ${dim.code ? `(${dim.code})` : ''} — Wert: ${dim.value}\n\n`;
-          if (dim.description) markdown += `${dim.description}\n\n`;
-          if (dim.explanation) markdown += `*Begründung:* ${dim.explanation}\n\n`;
-        });
-      }
-      
-      if (neutral.length > 0) {
-        markdown += `#### ➖ Neutrale Faktoren\n\n`;
-        neutral.forEach(dim => {
-          markdown += `**${dim.label}** ${dim.code ? `(${dim.code})` : ''} — Wert: 0\n\n`;
-          if (dim.description) markdown += `${dim.description}\n\n`;
-          if (dim.explanation) markdown += `*Begründung:* ${dim.explanation}\n\n`;
-        });
-      }
-      
-      markdown += '\n';
-    }
-  }
-  
-  // Metadata
-  markdown += `---\n\n`;
-  markdown += `*Erstellt am: ${createdAt ? new Date(createdAt).toLocaleString('de-DE') : 'N/A'}*\n\n`;
-  markdown += `*Zuletzt aktualisiert: ${updatedAt ? new Date(updatedAt).toLocaleString('de-DE') : 'N/A'}*\n`;
-  
-  return markdown;
-}
-
-export function downloadFile(content: string, filename: string, mimeType: string): void {
-  const blob = new Blob([content], { type: mimeType });
-  const url = URL.createObjectURL(blob);
-  const link = document.createElement('a');
-  link.href = url;
-  link.download = filename;
-  document.body.appendChild(link);
-  link.click();
-  document.body.removeChild(link);
-  URL.revokeObjectURL(url);
-}
-
-export function importFromJSON(jsonString: string): Activity {
-  const activity = JSON.parse(jsonString);
-  
-  // Validate basic structure
-  if (!activity.id || !activity.mode || !activity.title) {
-    throw new Error('Invalid activity JSON: missing required fields (id, mode, title)');
-  }
-  
-  // Ensure required fields exist
-  if (!activity.context) activity.context = {};
-  if (!activity.dimensions) activity.dimensions = [];
-  
-  return activity as Activity;
-}
diff --git a/src/lib/index.ts b/src/lib/index.ts
deleted file mode 100644
index 856f2b6..0000000
--- a/src/lib/index.ts
+++ /dev/null
@@ -1 +0,0 @@
-// place files you want to import through the `$lib` alias in this folder.
diff --git a/src/lib/sample-catalogs.ts b/src/lib/sample-catalogs.ts
deleted file mode 100644
index bc93912..0000000
--- a/src/lib/sample-catalogs.ts
+++ /dev/null
@@ -1,618 +0,0 @@
-// Sample ICF and ICF-CY catalog data with ICF component categorization
-import type { Catalog } from './types';
-
-export const icfCatalog: Catalog = {
-  mode: 'icf',
-  name: 'ICF (Internationale Klassifikation der Funktionsfähigkeit)',
-  version: '2023',
-  domains: [
-    // ===== KÖRPERFUNKTIONEN UND -STRUKTUREN (Body Functions and Structures) =====
-    // Mental functions (b1)
-    {
-      code: 'b140',
-      label: 'Aufmerksamkeitsfunktionen',
-      description: 'Mentale Funktionen der Konzentration auf einen Reiz',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b144',
-      label: 'Gedächtnisfunktionen',
-      description: 'Funktionen des Registrierens, Speicherns und Abrufens von Informationen',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b152',
-      label: 'Emotionale Funktionen',
-      description: 'Funktionen der Gefühle und Affekte',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b164',
-      label: 'Höhere kognitive Funktionen',
-      description: 'Funktionen wie Planung, Problemlösung, Entscheidungsfindung',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    
-    // Sensory functions (b2)
-    {
-      code: 'b210',
-      label: 'Sehfunktionen',
-      description: 'Funktionen des Sehens',
-      group: 'Sinnesfunktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b230',
-      label: 'Hörfunktionen',
-      description: 'Funktionen des Hörens',
-      group: 'Sinnesfunktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b265',
-      label: 'Tastfunktionen',
-      description: 'Funktionen der Berührung und Tastempfindung',
-      group: 'Sinnesfunktionen',
-      component: 'body_functions'
-    },
-    
-    // Voice and speech functions (b3)
-    {
-      code: 'b320',
-      label: 'Artikulationsfunktionen',
-      description: 'Funktionen zur Hervorbringung von Sprachlauten',
-      group: 'Stimm- und Sprechfunktionen',
-      component: 'body_functions'
-    },
-    
-    // Movement functions (b7)
-    {
-      code: 'b730',
-      label: 'Funktionen der Muskelkraft',
-      description: 'Funktionen im Zusammenhang mit der Kraft der Muskelkontraktion',
-      group: 'Neuromuskuloskeletale Funktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b760',
-      label: 'Unwillkürliche Bewegungsfunktionen',
-      description: 'Funktionen unwillkürlicher Muskelkontraktionen',
-      group: 'Neuromuskuloskeletale Funktionen',
-      component: 'body_functions'
-    },
-    
-    // ===== AKTIVITÄTEN (Activities) =====
-    // Learning and applying knowledge (d1)
-    {
-      code: 'd110',
-      label: 'Zuschauen',
-      description: 'Die Sinne benutzen, um visuelle Reize wahrzunehmen',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd115',
-      label: 'Zuhören',
-      description: 'Die Sinne benutzen, um auditive Reize wahrzunehmen',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd160',
-      label: 'Aufmerksamkeit fokussieren',
-      description: 'Die Aufmerksamkeit absichtlich auf bestimmte Reize richten',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd166',
-      label: 'Lesen',
-      description: 'Schriftliche Sprache verstehen und interpretieren',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd170',
-      label: 'Schreiben',
-      description: 'Symbole und Sprache benutzen, um Informationen zu vermitteln',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd175',
-      label: 'Probleme lösen',
-      description: 'Lösungen für Fragen oder Situationen finden',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    
-    // Communication (d3)
-    {
-      code: 'd310',
-      label: 'Kommunizieren als Empfänger gesprochener Mitteilungen',
-      description: 'Wörtliche und übertragene Bedeutungen gesprochener Mitteilungen verstehen',
-      group: 'Kommunikation',
-      component: 'activities'
-    },
-    {
-      code: 'd330',
-      label: 'Sprechen',
-      description: 'Worte, Sätze und längere Passagen in gesprochenen Mitteilungen hervorbringen',
-      group: 'Kommunikation',
-      component: 'activities'
-    },
-    {
-      code: 'd350',
-      label: 'Konversation',
-      description: 'Ein Gespräch mit einer oder mehreren Personen beginnen, aufrechterhalten und beenden',
-      group: 'Kommunikation',
-      component: 'activities'
-    },
-    
-    // Mobility (d4)
-    {
-      code: 'd440',
-      label: 'Feinmotorischer Handgebrauch',
-      description: 'Koordinierte Handlungen von Händen und Fingern ausführen',
-      group: 'Mobilität',
-      component: 'activities'
-    },
-    {
-      code: 'd450',
-      label: 'Gehen',
-      description: 'Sich zu Fuß Schritt für Schritt fortbewegen',
-      group: 'Mobilität',
-      component: 'activities'
-    },
-    {
-      code: 'd470',
-      label: 'Transportmittel benutzen',
-      description: 'Als Fahrgast in einem Transportmittel mitfahren',
-      group: 'Mobilität',
-      component: 'activities'
-    },
-    
-    // Self-care (d5)
-    {
-      code: 'd510',
-      label: 'Sich waschen',
-      description: 'Den ganzen Körper oder Körperteile waschen und abtrocknen',
-      group: 'Selbstversorgung',
-      component: 'activities'
-    },
-    {
-      code: 'd530',
-      label: 'Toilettenbenutzung',
-      description: 'Die Ausscheidung von Körperabfallprodukten planen und ausführen',
-      group: 'Selbstversorgung',
-      component: 'activities'
-    },
-    {
-      code: 'd540',
-      label: 'Sich kleiden',
-      description: 'Koordinierte Handlungen ausführen, um Kleidung an- und auszuziehen',
-      group: 'Selbstversorgung',
-      component: 'activities'
-    },
-    {
-      code: 'd550',
-      label: 'Essen',
-      description: 'Nahrung zu sich nehmen',
-      group: 'Selbstversorgung',
-      component: 'activities'
-    },
-    {
-      code: 'd560',
-      label: 'Trinken',
-      description: 'Getränke zu sich nehmen',
-      group: 'Selbstversorgung',
-      component: 'activities'
-    },
-    
-    // Domestic life (d6)
-    {
-      code: 'd630',
-      label: 'Mahlzeiten vorbereiten',
-      description: 'Einfache und komplexe Mahlzeiten planen, organisieren, kochen und servieren',
-      group: 'Häusliches Leben',
-      component: 'activities'
-    },
-    {
-      code: 'd640',
-      label: 'Hausarbeiten erledigen',
-      description: 'Den Haushalt führen',
-      group: 'Häusliches Leben',
-      component: 'activities'
-    },
-    
-    // ===== PARTIZIPATION (Participation) =====
-    // Interpersonal interactions (d7)
-    {
-      code: 'd710',
-      label: 'Elementare interpersonale Interaktionen',
-      description: 'Auf sozial angemessene Weise mit anderen Menschen interagieren',
-      group: 'Interpersonelle Interaktionen',
-      component: 'participation'
-    },
-    {
-      code: 'd720',
-      label: 'Komplexe interpersonale Interaktionen',
-      description: 'Soziale Interaktionen mit anderen auf komplexe Weise aufrechterhalten',
-      group: 'Interpersonelle Interaktionen',
-      component: 'participation'
-    },
-    {
-      code: 'd750',
-      label: 'Informelle soziale Beziehungen',
-      description: 'Beziehungen zu Freunden, Nachbarn oder Bekannten eingehen',
-      group: 'Interpersonelle Interaktionen',
-      component: 'participation'
-    },
-    
-    // Major life areas (d8)
-    {
-      code: 'd815',
-      label: 'Vorschulerziehung',
-      description: 'Im Kindergarten oder ähnlichen Einrichtungen lernen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    {
-      code: 'd820',
-      label: 'Schulbildung',
-      description: 'Aufgenommen werden, lernen und die Verantwortlichkeiten der Schule wahrnehmen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    {
-      code: 'd850',
-      label: 'Bezahlte Tätigkeit',
-      description: 'Sich an allen Aspekten der Arbeit beteiligen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    
-    // Community, social and civic life (d9)
-    {
-      code: 'd910',
-      label: 'Gemeinschaftsleben',
-      description: 'An allen Aspekten des sozialen Lebens außerhalb der Familie teilnehmen',
-      group: 'Gemeinschafts- und soziales Leben',
-      component: 'participation'
-    },
-    {
-      code: 'd920',
-      label: 'Erholung und Freizeit',
-      description: 'Sich an jeder Form von Spiel, Freizeitaktivitäten oder Erholung beteiligen',
-      group: 'Gemeinschafts- und soziales Leben',
-      component: 'participation'
-    },
-    
-    // ===== UMWELTFAKTOREN (Environmental Factors) =====
-    // Products and technology (e1)
-    {
-      code: 'e110',
-      label: 'Produkte/Substanzen für den persönlichen Verbrauch',
-      description: 'Natürliche oder von Menschen hergestellte Gegenstände zum Essen und Trinken',
-      group: 'Produkte und Technologien',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e115',
-      label: 'Produkte und Technologien zum persönlichen Gebrauch im täglichen Leben',
-      description: 'Geräte, Produkte und Technologien für das tägliche Leben',
-      group: 'Produkte und Technologien',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e125',
-      label: 'Produkte und Technologien zur Kommunikation',
-      description: 'Geräte, Produkte und Technologien zur Kommunikation',
-      group: 'Produkte und Technologien',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e130',
-      label: 'Produkte und Technologien für Bildung und Ausbildung',
-      description: 'Materialien und Technologien zum Lernen',
-      group: 'Produkte und Technologien',
-      component: 'environmental_factors'
-    },
-    
-    // Natural and human-made changes to environment (e2)
-    {
-      code: 'e210',
-      label: 'Physikalische Geografie',
-      description: 'Merkmale von Landformen und Gewässern',
-      group: 'Natürliche und vom Menschen veränderte Umwelt',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e225',
-      label: 'Klima',
-      description: 'Meteorologische Merkmale und Ereignisse',
-      group: 'Natürliche und vom Menschen veränderte Umwelt',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e240',
-      label: 'Licht',
-      description: 'Elektromagnetische Strahlung',
-      group: 'Natürliche und vom Menschen veränderte Umwelt',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e250',
-      label: 'Geräusche',
-      description: 'Ein Phänomen, das durch Schall wahrgenommen wird',
-      group: 'Natürliche und vom Menschen veränderte Umwelt',
-      component: 'environmental_factors'
-    },
-    
-    // Support and relationships (e3)
-    {
-      code: 'e310',
-      label: 'Engster Familienkreis',
-      description: 'Personen, die durch Geburt, Ehe oder andere Beziehungen verbunden sind',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e320',
-      label: 'Freunde',
-      description: 'Personen, die vertraut und in gegenseitiger Zuneigung verbunden sind',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e330',
-      label: 'Autoritätspersonen',
-      description: 'Personen mit Entscheidungsmacht über andere',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e340',
-      label: 'Professionelle Helfer',
-      description: 'Personen, die Dienstleistungen in Gesundheits- und sozialen Bereichen erbringen',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e355',
-      label: 'Fachleute der Gesundheitsberufe',
-      description: 'Alle Dienstleister im Gesundheitssystem',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    
-    // Attitudes (e4)
-    {
-      code: 'e410',
-      label: 'Einstellungen der Familie',
-      description: 'Allgemeine oder spezifische Meinungen und Überzeugungen der Familie',
-      group: 'Einstellungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e420',
-      label: 'Einstellungen von Freunden',
-      description: 'Allgemeine oder spezifische Meinungen und Überzeugungen von Freunden',
-      group: 'Einstellungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e430',
-      label: 'Einstellungen von Autoritätspersonen',
-      description: 'Meinungen von Personen in Machtpositionen',
-      group: 'Einstellungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e460',
-      label: 'Gesellschaftliche Einstellungen',
-      description: 'Allgemeine oder spezifische Meinungen der Gesellschaft',
-      group: 'Einstellungen',
-      component: 'environmental_factors'
-    },
-    
-    // Services, systems and policies (e5)
-    {
-      code: 'e535',
-      label: 'Dienste, Systeme und Handlungsgrundsätze im Bildungs- und Ausbildungswesen',
-      description: 'Bildungs- und Ausbildungsdienste',
-      group: 'Dienste, Systeme und Handlungsgrundsätze',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e540',
-      label: 'Dienste, Systeme und Handlungsgrundsätze des Transportwesens',
-      description: 'Transportdienste und -systeme',
-      group: 'Dienste, Systeme und Handlungsgrundsätze',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e580',
-      label: 'Dienste, Systeme und Handlungsgrundsätze des Gesundheitswesens',
-      description: 'Gesundheitsdienste und -systeme',
-      group: 'Dienste, Systeme und Handlungsgrundsätze',
-      component: 'environmental_factors'
-    }
-  ]
-};
-
-// Note: ICF-CY catalog would follow similar structure with child-specific entries
-// For brevity, including a shorter version here
-export const icfCyCatalog: Catalog = {
-  mode: 'icf_cy',
-  name: 'ICF-CY (Kinder und Jugendliche)',
-  version: '2023',
-  domains: [
-    // Selected child-specific entries from each component
-    // Body functions
-    {
-      code: 'b140',
-      label: 'Aufmerksamkeitsfunktionen',
-      description: 'Mentale Funktionen der Konzentration',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    {
-      code: 'b147',
-      label: 'Psychomotorische Funktionen',
-      description: 'Funktionen der Kontrolle motorischer und psychologischer Ereignisse',
-      group: 'Mentale Funktionen',
-      component: 'body_functions'
-    },
-    
-    // Activities - child-specific
-    {
-      code: 'd131',
-      label: 'Lernen durch Handlungen mit Gegenständen',
-      description: 'Lernen durch einfache Handlungen mit einem oder mehreren Gegenständen',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd137',
-      label: 'Konzepte erwerben',
-      description: 'Grundlegende und komplexe Konzepte erlernen',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd155',
-      label: 'Fertigkeiten erwerben',
-      description: 'Grundlegende und komplexe integrierte Handlungsabläufe erlernen',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd160',
-      label: 'Aufmerksamkeit fokussieren',
-      description: 'Die Aufmerksamkeit absichtlich auf bestimmte Reize richten',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd166',
-      label: 'Lesen',
-      description: 'Schriftliche Sprache verstehen und interpretieren',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd170',
-      label: 'Schreiben',
-      description: 'Symbole und Sprache benutzen, um Informationen zu vermitteln',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd172',
-      label: 'Rechnen',
-      description: 'Rechenoperationen durchführen und mathematische Konzepte anwenden',
-      group: 'Lernen und Wissensanwendung',
-      component: 'activities'
-    },
-    {
-      code: 'd440',
-      label: 'Feinmotorischer Handgebrauch',
-      description: 'Koordinierte Handlungen von Händen und Fingern ausführen',
-      group: 'Mobilität',
-      component: 'activities'
-    },
-    {
-      code: 'd455',
-      label: 'Sich auf andere Weise fortbewegen',
-      description: 'Krabbeln, klettern, laufen, springen',
-      group: 'Mobilität',
-      component: 'activities'
-    },
-    
-    // Participation - child-specific
-    {
-      code: 'd710',
-      label: 'Elementare interpersonale Interaktionen',
-      description: 'Auf sozial angemessene Weise mit anderen Menschen interagieren',
-      group: 'Interpersonelle Interaktionen',
-      component: 'participation'
-    },
-    {
-      code: 'd760',
-      label: 'Familienbeziehungen',
-      description: 'Verwandtschaftsbeziehungen aufbauen und aufrechterhalten',
-      group: 'Interpersonelle Interaktionen',
-      component: 'participation'
-    },
-    {
-      code: 'd815',
-      label: 'Vorschulerziehung',
-      description: 'Im Kindergarten oder ähnlichen Einrichtungen lernen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    {
-      code: 'd820',
-      label: 'Schulbildung',
-      description: 'Aufgenommen werden, lernen und die Verantwortlichkeiten der Schule wahrnehmen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    {
-      code: 'd880',
-      label: 'Sich mit Spielen beschäftigen',
-      description: 'Sich alleine oder mit anderen spielerisch beschäftigen',
-      group: 'Bedeutende Lebensbereiche',
-      component: 'participation'
-    },
-    
-    // Environmental factors - same as ICF but important for children
-    {
-      code: 'e130',
-      label: 'Produkte und Technologien für Bildung und Ausbildung',
-      description: 'Materialien und Technologien zum Lernen',
-      group: 'Produkte und Technologien',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e250',
-      label: 'Geräusche',
-      description: 'Lärmpegel in der Umgebung',
-      group: 'Natürliche und vom Menschen veränderte Umwelt',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e310',
-      label: 'Engster Familienkreis',
-      description: 'Eltern, Geschwister und andere enge Familienmitglieder',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e320',
-      label: 'Freunde',
-      description: 'Gleichaltrige und Spielkameraden',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e330',
-      label: 'Autoritätspersonen',
-      description: 'Lehrer, Erzieher und andere Autoritätspersonen',
-      group: 'Unterstützung und Beziehungen',
-      component: 'environmental_factors'
-    },
-    {
-      code: 'e535',
-      label: 'Dienste im Bildungs- und Ausbildungswesen',
-      description: 'Schulen, Kindergärten, Förderstellen',
-      group: 'Dienste, Systeme und Handlungsgrundsätze',
-      component: 'environmental_factors'
-    }
-  ]
-};
diff --git a/src/lib/sample-catalogs.ts.bak b/src/lib/sample-catalogs.ts.bak
deleted file mode 100644
index 37e22d6..0000000
--- a/src/lib/sample-catalogs.ts.bak
+++ /dev/null
@@ -1,436 +0,0 @@
-// Sample ICF and ICF-CY catalog data
-import type { Catalog } from './types';
-
-export const icfCatalog: Catalog = {
-  mode: 'icf',
-  name: 'ICF (Internationale Klassifikation der Funktionsfähigkeit)',
-  version: '2023',
-  domains: [
-    // Learning and applying knowledge (d1)
-    {
-      code: 'd110',
-      label: 'Zuschauen',
-      description: 'Die Sinne benutzen, um visuelle Reize wahrzunehmen',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd115',
-      label: 'Zuhören',
-      description: 'Die Sinne benutzen, um auditive Reize wahrzunehmen',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd160',
-      label: 'Aufmerksamkeit fokussieren',
-      description: 'Die Aufmerksamkeit absichtlich auf bestimmte Reize richten',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd166',
-      label: 'Lesen',
-      description: 'Schriftliche Sprache verstehen und interpretieren',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd170',
-      label: 'Schreiben',
-      description: 'Symbole und Sprache benutzen, um Informationen zu vermitteln',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd175',
-      label: 'Probleme lösen',
-      description: 'Lösungen für Fragen oder Situationen finden',
-      group: 'Lernen und Wissensanwendung'
-    },
-    
-    // Communication (d3)
-    {
-      code: 'd310',
-      label: 'Kommunizieren als Empfänger gesprochener Mitteilungen',
-      description: 'Wörtliche und übertragene Bedeutungen gesprochener Mitteilungen verstehen',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd330',
-      label: 'Sprechen',
-      description: 'Worte, Sätze und längere Passagen in gesprochenen Mitteilungen hervorbringen',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd350',
-      label: 'Konversation',
-      description: 'Ein Gespräch mit einer oder mehreren Personen beginnen, aufrechterhalten und beenden',
-      group: 'Kommunikation'
-    },
-    
-    // Mobility (d4)
-    {
-      code: 'd440',
-      label: 'Feinmotorischer Handgebrauch',
-      description: 'Koordinierte Handlungen von Händen und Fingern ausführen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd450',
-      label: 'Gehen',
-      description: 'Sich zu Fuß Schritt für Schritt fortbewegen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd470',
-      label: 'Transportmittel benutzen',
-      description: 'Als Fahrgast in einem Transportmittel mitfahren',
-      group: 'Mobilität'
-    },
-    
-    // Self-care (d5)
-    {
-      code: 'd510',
-      label: 'Sich waschen',
-      description: 'Den ganzen Körper oder Körperteile waschen und abtrocknen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd530',
-      label: 'Toilettenbenutzung',
-      description: 'Die Ausscheidung von Körperabfallprodukten planen und ausführen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd540',
-      label: 'Sich kleiden',
-      description: 'Koordinierte Handlungen ausführen, um Kleidung an- und auszuziehen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd550',
-      label: 'Essen',
-      description: 'Nahrung zu sich nehmen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd560',
-      label: 'Trinken',
-      description: 'Getränke zu sich nehmen',
-      group: 'Selbstversorgung'
-    },
-    
-    // Domestic life (d6)
-    {
-      code: 'd630',
-      label: 'Mahlzeiten vorbereiten',
-      description: 'Einfache und komplexe Mahlzeiten planen, organisieren, kochen und servieren',
-      group: 'Häusliches Leben'
-    },
-    {
-      code: 'd640',
-      label: 'Hausarbeiten erledigen',
-      description: 'Den Haushalt führen',
-      group: 'Häusliches Leben'
-    },
-    
-    // Interpersonal interactions (d7)
-    {
-      code: 'd710',
-      label: 'Elementare interpersonale Interaktionen',
-      description: 'Auf sozial angemessene Weise mit anderen Menschen interagieren',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd720',
-      label: 'Komplexe interpersonale Interaktionen',
-      description: 'Soziale Interaktionen mit anderen auf komplexe Weise aufrechterhalten',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd750',
-      label: 'Informelle soziale Beziehungen',
-      description: 'Beziehungen zu Freunden, Nachbarn oder Bekannten eingehen',
-      group: 'Interpersonelle Interaktionen'
-    },
-    
-    // Major life areas (d8)
-    {
-      code: 'd815',
-      label: 'Vorschulerziehung',
-      description: 'Im Kindergarten oder ähnlichen Einrichtungen lernen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    {
-      code: 'd820',
-      label: 'Schulbildung',
-      description: 'Aufgenommen werden, lernen und die Verantwortlichkeiten der Schule wahrnehmen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    {
-      code: 'd850',
-      label: 'Bezahlte Tätigkeit',
-      description: 'Sich an allen Aspekten der Arbeit beteiligen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    
-    // Community, social and civic life (d9)
-    {
-      code: 'd910',
-      label: 'Gemeinschaftsleben',
-      description: 'An allen Aspekten des sozialen Lebens außerhalb der Familie teilnehmen',
-      group: 'Gemeinschafts- und soziales Leben'
-    },
-    {
-      code: 'd920',
-      label: 'Erholung und Freizeit',
-      description: 'Sich an jeder Form von Spiel, Freizeitaktivitäten oder Erholung beteiligen',
-      group: 'Gemeinschafts- und soziales Leben'
-    }
-  ]
-};
-
-export const icfCyCatalog: Catalog = {
-  mode: 'icf_cy',
-  name: 'ICF-CY (Kinder und Jugendliche)',
-  version: '2023',
-  domains: [
-    // Learning and applying knowledge (d1) - child specific
-    {
-      code: 'd131',
-      label: 'Lernen durch Handlungen mit Gegenständen',
-      description: 'Lernen durch einfache Handlungen mit einem oder mehreren Gegenständen',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd132',
-      label: 'Wissenserwerb',
-      description: 'Wissen durch Interaktion mit Umgebung erwerben',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd137',
-      label: 'Konzepte erwerben',
-      description: 'Grundlegende und komplexe Konzepte erlernen',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd155',
-      label: 'Fertigkeiten erwerben',
-      description: 'Grundlegende und komplexe integrierte Handlungsabläufe erlernen',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd160',
-      label: 'Aufmerksamkeit fokussieren',
-      description: 'Die Aufmerksamkeit absichtlich auf bestimmte Reize richten',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd163',
-      label: 'Denken',
-      description: 'Ideen, Bilder und Symbolisierungen im Kopf formulieren und manipulieren',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd166',
-      label: 'Lesen',
-      description: 'Schriftliche Sprache verstehen und interpretieren',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd170',
-      label: 'Schreiben',
-      description: 'Symbole und Sprache benutzen, um Informationen zu vermitteln',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd172',
-      label: 'Rechnen',
-      description: 'Rechenoperationen durchführen und mathematische Konzepte anwenden',
-      group: 'Lernen und Wissensanwendung'
-    },
-    {
-      code: 'd175',
-      label: 'Probleme lösen',
-      description: 'Lösungen für Fragen oder Situationen finden',
-      group: 'Lernen und Wissensanwendung'
-    },
-    
-    // Communication (d3)
-    {
-      code: 'd310',
-      label: 'Kommunizieren als Empfänger gesprochener Mitteilungen',
-      description: 'Wörtliche und übertragene Bedeutungen gesprochener Mitteilungen verstehen',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd315',
-      label: 'Kommunizieren als Empfänger nonverbaler Mitteilungen',
-      description: 'Körpersprache, Gesten, Gesichtsausdrücke verstehen',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd330',
-      label: 'Sprechen',
-      description: 'Worte, Sätze und längere Passagen in gesprochenen Mitteilungen hervorbringen',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd335',
-      label: 'Nonverbale Mitteilungen produzieren',
-      description: 'Körpersprache, Zeichen, Symbole und Zeichnungen verwenden',
-      group: 'Kommunikation'
-    },
-    {
-      code: 'd350',
-      label: 'Konversation',
-      description: 'Ein Gespräch mit einer oder mehreren Personen beginnen, aufrechterhalten und beenden',
-      group: 'Kommunikation'
-    },
-    
-    // Mobility (d4)
-    {
-      code: 'd410',
-      label: 'Eine elementare Körperposition wechseln',
-      description: 'Sich hinlegen, aufstehen, hinsetzen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd430',
-      label: 'Gegenstände anheben und tragen',
-      description: 'Gegenstände hochheben oder von einem Ort zum anderen bringen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd440',
-      label: 'Feinmotorischer Handgebrauch',
-      description: 'Koordinierte Handlungen von Händen und Fingern ausführen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd450',
-      label: 'Gehen',
-      description: 'Sich zu Fuß Schritt für Schritt fortbewegen',
-      group: 'Mobilität'
-    },
-    {
-      code: 'd455',
-      label: 'Sich auf andere Weise fortbewegen',
-      description: 'Krabbeln, klettern, laufen, springen',
-      group: 'Mobilität'
-    },
-    
-    // Self-care (d5)
-    {
-      code: 'd510',
-      label: 'Sich waschen',
-      description: 'Den ganzen Körper oder Körperteile waschen und abtrocknen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd520',
-      label: 'Seine Körperteile pflegen',
-      description: 'Haut, Gesicht, Zähne, Haare, Nägel pflegen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd530',
-      label: 'Toilettenbenutzung',
-      description: 'Die Ausscheidung von Körperabfallprodukten planen und ausführen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd540',
-      label: 'Sich kleiden',
-      description: 'Koordinierte Handlungen ausführen, um Kleidung an- und auszuziehen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd550',
-      label: 'Essen',
-      description: 'Nahrung zu sich nehmen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd560',
-      label: 'Trinken',
-      description: 'Getränke zu sich nehmen',
-      group: 'Selbstversorgung'
-    },
-    {
-      code: 'd571',
-      label: 'Auf seine Gesundheit achten',
-      description: 'Für eigenes körperliches Wohlbefinden sorgen',
-      group: 'Selbstversorgung'
-    },
-    
-    // Interpersonal interactions (d7)
-    {
-      code: 'd710',
-      label: 'Elementare interpersonale Interaktionen',
-      description: 'Auf sozial angemessene Weise mit anderen Menschen interagieren',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd720',
-      label: 'Komplexe interpersonale Interaktionen',
-      description: 'Soziale Interaktionen mit anderen auf komplexe Weise aufrechterhalten',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd740',
-      label: 'Formelle Beziehungen',
-      description: 'Beziehungen zu Lehrern, Arbeitgebern in angemessener Weise eingehen',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd750',
-      label: 'Informelle soziale Beziehungen',
-      description: 'Beziehungen zu Freunden, Nachbarn oder Bekannten eingehen',
-      group: 'Interpersonelle Interaktionen'
-    },
-    {
-      code: 'd760',
-      label: 'Familienbeziehungen',
-      description: 'Verwandtschaftsbeziehungen aufbauen und aufrechterhalten',
-      group: 'Interpersonelle Interaktionen'
-    },
-    
-    // Major life areas (d8)
-    {
-      code: 'd810',
-      label: 'Informelle Bildung',
-      description: 'Zu Hause oder in einem anderen nicht-institutionellen Rahmen lernen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    {
-      code: 'd815',
-      label: 'Vorschulerziehung',
-      description: 'Im Kindergarten oder ähnlichen Einrichtungen lernen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    {
-      code: 'd820',
-      label: 'Schulbildung',
-      description: 'Aufgenommen werden, lernen und die Verantwortlichkeiten der Schule wahrnehmen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    {
-      code: 'd880',
-      label: 'Sich mit Spielen beschäftigen',
-      description: 'Sich alleine oder mit anderen spielerisch beschäftigen',
-      group: 'Bedeutende Lebensbereiche'
-    },
-    
-    // Community, social and civic life (d9)
-    {
-      code: 'd910',
-      label: 'Gemeinschaftsleben',
-      description: 'An allen Aspekten des sozialen Lebens außerhalb der Familie teilnehmen',
-      group: 'Gemeinschafts- und soziales Leben'
-    },
-    {
-      code: 'd920',
-      label: 'Erholung und Freizeit',
-      description: 'Sich an jeder Form von Spiel, Freizeitaktivitäten oder Erholung beteiligen',
-      group: 'Gemeinschafts- und soziales Leben'
-    }
-  ]
-};
diff --git a/src/lib/stores.ts b/src/lib/stores.ts
deleted file mode 100644
index b948d6b..0000000
--- a/src/lib/stores.ts
+++ /dev/null
@@ -1,100 +0,0 @@
-// Svelte stores for state management
-import { writable, derived, get } from 'svelte/store';
-import type { Activity, ICFMode, Catalog } from './types';
-import { 
-  getAllActivities, 
-  saveActivity, 
-  deleteActivity,
-  getAllCatalogs,
-  saveCatalog 
-} from './db';
-
-// Current ICF mode (ICF or ICF-CY)
-export const currentMode = writable<ICFMode>('icf');
-
-// Activities store
-function createActivitiesStore() {
-  const { subscribe, set, update } = writable<Activity[]>([]);
-
-  return {
-    subscribe,
-    load: async () => {
-      const activities = await getAllActivities();
-      set(activities);
-      return activities;
-    },
-    add: async (activity: Activity) => {
-      await saveActivity(activity);
-      update(activities => [...activities, activity]);
-    },
-    update: async (activity: Activity) => {
-      await saveActivity(activity);
-      update(activities => 
-        activities.map(a => a.id === activity.id ? activity : a)
-      );
-    },
-    remove: async (id: string) => {
-      await deleteActivity(id);
-      update(activities => activities.filter(a => a.id !== id));
-    },
-    set
-  };
-}
-
-export const activities = createActivitiesStore();
-
-// Filtered activities based on current mode and search
-export const searchQuery = writable<string>('');
-
-export const filteredActivities = derived(
-  [activities, currentMode, searchQuery],
-  ([$activities, $currentMode, $searchQuery]) => {
-    let filtered = $activities.filter(a => a.mode === $currentMode);
-    
-    if ($searchQuery.trim()) {
-      const query = $searchQuery.toLowerCase();
-      filtered = filtered.filter(a => 
-        a.title.toLowerCase().includes(query) ||
-        a.description?.toLowerCase().includes(query) ||
-        a.code?.toLowerCase().includes(query) ||
-        a.context.person?.toLowerCase().includes(query)
-      );
-    }
-    
-    // Sort by creation date (newest first)
-    return filtered.sort((a, b) => {
-      const dateA = a.createdAt || '';
-      const dateB = b.createdAt || '';
-      return dateB.localeCompare(dateA);
-    });
-  }
-);
-
-// Catalogs store
-function createCatalogsStore() {
-  const { subscribe, set, update } = writable<Catalog[]>([]);
-
-  return {
-    subscribe,
-    load: async () => {
-      const catalogs = await getAllCatalogs();
-      set(catalogs);
-      return catalogs;
-    },
-    add: async (catalog: Catalog) => {
-      await saveCatalog(catalog);
-      update(catalogs => [...catalogs, catalog]);
-    },
-    set
-  };
-}
-
-export const catalogs = createCatalogsStore();
-
-// Get catalog for current mode
-export const currentCatalog = derived(
-  [catalogs, currentMode],
-  ([$catalogs, $currentMode]) => {
-    return $catalogs.find(c => c.mode === $currentMode);
-  }
-);
diff --git a/src/lib/types.ts b/src/lib/types.ts
deleted file mode 100644
index e4f976d..0000000
--- a/src/lib/types.ts
+++ /dev/null
@@ -1,71 +0,0 @@
-// Core type definitions for ICF-Reflektor
-
-export type ICFMode = 'icf' | 'icf_cy';
-
-// ICF component categories based on the ICF model
-export type ICFComponent = 
-  | 'body_functions'        // Körperfunktionen und -strukturen
-  | 'activities'            // Aktivitäten
-  | 'participation'         // Partizipation (Teilhabe)
-  | 'environmental_factors' // Umweltfaktoren
-  | 'personal_factors';     // Personbezogene Faktoren
-
-export interface Context {
-  person?: string;
-  ageOrGrade?: string;
-  setting?: string;
-  purpose?: string;
-  date?: string; // ISO-String
-  author?: string;
-  notes?: string;
-}
-
-export interface Dimension {
-  id: string;
-  code?: string;        // e.g. d160, b140, e310
-  label: string;        // e.g. "Fokussieren der Aufmerksamkeit"
-  description?: string; // editable short description
-  value: number;        // -4..+4
-  explanation?: string; // Free text: Why barrier/resource?
-  source?: 'catalog' | 'custom';
-  component?: ICFComponent; // Which ICF component this belongs to
-}
-
-export interface Activity {
-  id: string;
-  mode: ICFMode;
-  title: string;
-  code?: string; // ICF-/ICF-CY-Code for the activity itself
-  description?: string;
-  context: Context;
-  dimensions: Dimension[];
-  createdAt?: string; // ISO-String
-  updatedAt?: string; // ISO-String
-}
-
-export interface CatalogEntry {
-  code: string;
-  label: string;
-  description?: string;
-  group?: string; // e.g. "Lernen und Wissensanwendung"
-  component: ICFComponent; // Which ICF component this belongs to
-}
-
-export interface Catalog {
-  mode: ICFMode;
-  name: string;
-  version?: string;
-  domains: CatalogEntry[];
-}
-
-// Helper to get component label in German
-export function getComponentLabel(component: ICFComponent): string {
-  const labels: Record<ICFComponent, string> = {
-    body_functions: 'Körperfunktionen und -strukturen',
-    activities: 'Aktivitäten',
-    participation: 'Partizipation (Teilhabe)',
-    environmental_factors: 'Umweltfaktoren',
-    personal_factors: 'Personbezogene Faktoren'
-  };
-  return labels[component];
-}
diff --git a/src/lib/utils.ts b/src/lib/utils.ts
deleted file mode 100644
index 4fce5e3..0000000
--- a/src/lib/utils.ts
+++ /dev/null
@@ -1,19 +0,0 @@
-// Utility functions
-
-/**
- * Generate a UUID with fallback for older browsers
- */
-export function generateUUID(): string {
-  // Use crypto.randomUUID if available (modern browsers)
-  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
-    return crypto.randomUUID();
-  }
-  
-  // Fallback implementation for older browsers
-  // Based on RFC4122 version 4
-  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
-    const r = Math.random() * 16 | 0;
-    const v = c === 'x' ? r : (r & 0x3 | 0x8);
-    return v.toString(16);
-  });
-}
diff --git a/src/routes/+layout.svelte b/src/routes/+layout.svelte
deleted file mode 100644
index 4699a13..0000000
--- a/src/routes/+layout.svelte
+++ /dev/null
@@ -1,73 +0,0 @@
-<script lang="ts">
-	import favicon from '$lib/assets/favicon.svg';
-	import { currentMode, activities, catalogs } from '$lib/stores';
-	import { onMount } from 'svelte';
-	import { icfCatalog, icfCyCatalog } from '$lib/sample-catalogs';
-	import '../app.css';
-
-	let { children } = $props();
-
-	onMount(async () => {
-		// Initialize data stores
-		await activities.load();
-		await catalogs.load();
-		
-		// Load default catalogs if not present
-		const catalogList = await catalogs.load();
-		if (catalogList.length === 0) {
-			await catalogs.add(icfCatalog);
-			await catalogs.add(icfCyCatalog);
-		}
-	});
-</script>
-
-<svelte:head>
-	<title>ICF-Reflektor</title>
-	<link rel="icon" href={favicon} />
-</svelte:head>
-
-<div class="app">
-	<header>
-		<div class="container">
-			<h1><a href="/">ICF-Reflektor</a></h1>
-			<nav>
-				<a href="/">Aktivitäten</a>
-				<a href="/about">Über</a>
-			</nav>
-			<div class="mode-switch">
-				<label>
-					<input 
-						type="radio" 
-						name="mode" 
-						value="icf" 
-						checked={$currentMode === 'icf'}
-						onchange={() => currentMode.set('icf')}
-					/>
-					ICF
-				</label>
-				<label>
-					<input 
-						type="radio" 
-						name="mode" 
-						value="icf_cy" 
-						checked={$currentMode === 'icf_cy'}
-						onchange={() => currentMode.set('icf_cy')}
-					/>
-					ICF-CY
-				</label>
-			</div>
-		</div>
-	</header>
-
-	<main>
-		<div class="container">
-			{@render children()}
-		</div>
-	</main>
-
-	<footer>
-		<div class="container">
-			<p>ICF-Reflektor — Lokales Tool zur strukturierten ICF-Einschätzung</p>
-		</div>
-	</footer>
-</div>
diff --git a/src/routes/+page.svelte b/src/routes/+page.svelte
deleted file mode 100644
index 3b8876a..0000000
--- a/src/routes/+page.svelte
+++ /dev/null
@@ -1,191 +0,0 @@
-<script lang="ts">
-	import { filteredActivities, searchQuery, currentMode } from '$lib/stores';
-	import { goto } from '$app/navigation';
-
-	function createNewActivity() {
-		goto('/activity/new');
-	}
-
-	function openActivity(id: string) {
-		goto(`/activity/${id}`);
-	}
-
-	function formatDate(dateString?: string): string {
-		if (!dateString) return 'N/A';
-		return new Date(dateString).toLocaleDateString('de-DE');
-	}
-</script>
-
-<div class="activities-page">
-	<div class="page-header flex-between mb-3">
-		<div>
-			<h1>Aktivitäten</h1>
-			<p class="subtitle">
-				Aktueller Modus: <strong>{$currentMode === 'icf' ? 'ICF' : 'ICF-CY'}</strong>
-			</p>
-		</div>
-		<button class="btn btn-primary" onclick={createNewActivity}>
-			+ Neue Aktivität
-		</button>
-	</div>
-
-	<div class="search-bar mb-3">
-		<input 
-			type="text" 
-			placeholder="Aktivitäten durchsuchen (Titel, Beschreibung, Code, Person)..."
-			bind:value={$searchQuery}
-		/>
-	</div>
-
-	{#if $filteredActivities.length === 0}
-		<div class="empty-state card text-center">
-			{#if $searchQuery}
-				<h2>Keine Aktivitäten gefunden</h2>
-				<p>Versuchen Sie einen anderen Suchbegriff.</p>
-			{:else}
-				<h2>Noch keine Aktivitäten</h2>
-				<p>Erstellen Sie Ihre erste Aktivität, um zu beginnen.</p>
-				<button class="btn btn-primary mt-2" onclick={createNewActivity}>
-					+ Erste Aktivität erstellen
-				</button>
-			{/if}
-		</div>
-	{:else}
-		<div class="activities-list">
-			{#each $filteredActivities as activity (activity.id)}
-				<div 
-					class="activity-card card" 
-					role="button"
-					tabindex="0"
-					onclick={() => openActivity(activity.id)}
-					onkeypress={(e) => e.key === 'Enter' && openActivity(activity.id)}
-				>
-					<div class="activity-header flex-between">
-						<h2>{activity.title}</h2>
-						{#if activity.code}
-							<span class="code-badge">{activity.code}</span>
-						{/if}
-					</div>
-					
-					{#if activity.description}
-						<p class="activity-description">{activity.description}</p>
-					{/if}
-
-					<div class="activity-meta">
-						{#if activity.context.person}
-							<span>👤 {activity.context.person}</span>
-						{/if}
-						{#if activity.context.setting}
-							<span>📍 {activity.context.setting}</span>
-						{/if}
-						{#if activity.dimensions.length > 0}
-							<span>📊 {activity.dimensions.length} Dimension{activity.dimensions.length !== 1 ? 'en' : ''}</span>
-						{/if}
-					</div>
-
-					<div class="activity-footer">
-						<small>Erstellt: {formatDate(activity.createdAt)}</small>
-					</div>
-				</div>
-			{/each}
-		</div>
-	{/if}
-</div>
-
-<style>
-	.activities-page {
-		max-width: 900px;
-		margin: 0 auto;
-	}
-
-	.page-header h1 {
-		margin-bottom: 0.25rem;
-	}
-
-	.subtitle {
-		color: #666;
-		font-size: 0.95rem;
-	}
-
-	.search-bar input {
-		width: 100%;
-		padding: 0.75rem 1rem;
-		font-size: 1rem;
-		border: 2px solid var(--border-color);
-		border-radius: var(--border-radius);
-		transition: border-color 0.2s;
-	}
-
-	.search-bar input:focus {
-		outline: none;
-		border-color: var(--primary-color);
-	}
-
-	.empty-state {
-		padding: 3rem 2rem;
-	}
-
-	.empty-state h2 {
-		margin-bottom: 0.5rem;
-		color: #666;
-	}
-
-	.empty-state p {
-		color: #999;
-	}
-
-	.activity-card {
-		cursor: pointer;
-		transition: all 0.2s;
-	}
-
-	.activity-card:hover {
-		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
-		transform: translateY(-2px);
-	}
-
-	.activity-header {
-		margin-bottom: 0.75rem;
-	}
-
-	.activity-header h2 {
-		font-size: 1.25rem;
-		margin: 0;
-		color: var(--primary-color);
-	}
-
-	.code-badge {
-		background-color: var(--primary-color);
-		color: white;
-		padding: 0.25rem 0.75rem;
-		border-radius: 1rem;
-		font-size: 0.875rem;
-		font-weight: 500;
-	}
-
-	.activity-description {
-		color: #666;
-		margin-bottom: 0.75rem;
-		overflow: hidden;
-		text-overflow: ellipsis;
-		display: -webkit-box;
-		-webkit-line-clamp: 2;
-		-webkit-box-orient: vertical;
-	}
-
-	.activity-meta {
-		display: flex;
-		flex-wrap: wrap;
-		gap: 1rem;
-		margin-bottom: 0.75rem;
-		font-size: 0.9rem;
-		color: #555;
-	}
-
-	.activity-footer {
-		padding-top: 0.75rem;
-		border-top: 1px solid var(--border-color);
-		color: #999;
-		font-size: 0.875rem;
-	}
-</style>
diff --git a/src/routes/about/+page.svelte b/src/routes/about/+page.svelte
deleted file mode 100644
index 3588cef..0000000
--- a/src/routes/about/+page.svelte
+++ /dev/null
@@ -1,106 +0,0 @@
-<div class="about-page">
-	<h1>Über ICF-Reflektor</h1>
-	
-	<section class="card mb-3">
-		<h2>Was ist ICF-Reflektor?</h2>
-		<p>
-			Der ICF-Reflektor ist ein webbasiertes, lokal laufendes Tool zur strukturierten 
-			Einschätzung der Kompetenz eines Menschen, bestimmte Aktivitäten zu bewältigen, 
-			mit Hilfe von ICF / ICF-CY – inklusive Ressourcen- und Barrierenblick.
-		</p>
-	</section>
-
-	<section class="card mb-3">
-		<h2>Zielgruppe</h2>
-		<ul>
-			<li>Pädagogik, Therapie, Inklusion, Frühförderung</li>
-			<li>Ausbildung / Studium (Portfolio, Fallbearbeitung)</li>
-			<li>Eigene Praxisreflexion zu Teilhabe, Behinderung und Ressourcen</li>
-		</ul>
-	</section>
-
-	<section class="card mb-3">
-		<h2>Kernfunktionen</h2>
-		<ul>
-			<li><strong>Aktivitäten verwalten:</strong> Konkrete Aktivitäten beschreiben und dokumentieren</li>
-			<li><strong>ICF/ICF-CY Modi:</strong> Umschaltbar zwischen allgemeiner und kind-/jugendspezifischer Betrachtung</li>
-			<li><strong>Dimensionen bewerten:</strong> Relevante ICF-Kategorien auf einer Skala von −4 (starke Barriere) bis +4 (starke Ressource) einschätzen</li>
-			<li><strong>Kontextdaten erfassen:</strong> Person, Alter, Setting, Anlass und weitere Informationen dokumentieren</li>
-			<li><strong>Export/Import:</strong> Aktivitäten als JSON oder Markdown-Report exportieren und importieren</li>
-		</ul>
-	</section>
-
-	<section class="card mb-3">
-		<h2>Datenschutz</h2>
-		<p>
-			<strong>Alle Daten bleiben lokal auf Ihrem Gerät.</strong>
-		</p>
-		<ul>
-			<li>Keine Übertragung an externe Server</li>
-			<li>Keine Registrierung erforderlich</li>
-			<li>Kein Tracking oder Analytics</li>
-			<li>Daten werden im Browser gespeichert (IndexedDB)</li>
-			<li>Exportierte Dateien liegen in Ihrer Verantwortung</li>
-		</ul>
-	</section>
-
-	<section class="card mb-3">
-		<h2>Technologie</h2>
-		<p>
-			ICF-Reflektor ist eine moderne Single-Page-Application, gebaut mit:
-		</p>
-		<ul>
-			<li><strong>SvelteKit</strong> - Modernes Web-Framework</li>
-			<li><strong>TypeScript</strong> - Typsichere Entwicklung</li>
-			<li><strong>IndexedDB</strong> - Lokale Datenpersistenz</li>
-		</ul>
-	</section>
-
-	<section class="card">
-		<h2>Lizenz & Quellcode</h2>
-		<p>
-			Dieses Projekt ist Open Source. Der Quellcode ist verfügbar auf 
-			<a href="https://github.com/alexdermohr/icf-tool" target="_blank" rel="noopener noreferrer">
-				GitHub
-			</a>.
-		</p>
-	</section>
-</div>
-
-<style>
-	.about-page {
-		max-width: 800px;
-		margin: 0 auto;
-	}
-
-	.about-page h1 {
-		margin-bottom: 2rem;
-	}
-
-	.about-page h2 {
-		color: var(--primary-color);
-		margin-bottom: 1rem;
-	}
-
-	.about-page section {
-		margin-bottom: 1.5rem;
-	}
-
-	.about-page ul {
-		padding-left: 1.5rem;
-		line-height: 1.8;
-	}
-
-	.about-page li {
-		margin-bottom: 0.5rem;
-	}
-
-	.about-page a {
-		color: var(--primary-color);
-		text-decoration: none;
-	}
-
-	.about-page a:hover {
-		text-decoration: underline;
-	}
-</style>
diff --git a/src/routes/activity/[id]/+page.svelte b/src/routes/activity/[id]/+page.svelte
deleted file mode 100644
index f02e6d1..0000000
--- a/src/routes/activity/[id]/+page.svelte
+++ /dev/null
@@ -1,1067 +0,0 @@
-<script lang="ts">
-	import { page } from '$app/stores';
-	import { goto } from '$app/navigation';
-	import { activities, currentMode, currentCatalog } from '$lib/stores';
-	import { onMount } from 'svelte';
-	import type { Activity, Dimension, ICFComponent } from '$lib/types';
-	import { getComponentLabel } from '$lib/types';
-	import { exportToJSON, exportToMarkdown, downloadFile, importFromJSON } from '$lib/export';
-	import { generateUUID } from '$lib/utils';
-
-	let activity: Activity | null = null;
-	let isNew = false;
-	let showDimensionModal = false;
-	let showImportModal = false;
-	let importText = '';
-	let editingDimension: Dimension | null = null;
-	let selectedCatalogEntry: string = '';
-
-	// Dimension form
-	let dimLabel = '';
-	let dimCode = '';
-	let dimDescription = '';
-	let dimValue = 0;
-	let dimExplanation = '';
-	let dimSource: 'catalog' | 'custom' = 'custom';
-	let dimComponent: ICFComponent = 'activities';
-	
-	// Helper function to group dimensions by ICF component
-	function groupDimensionsByComponent(dimensions: Dimension[]): Record<ICFComponent, Dimension[]> {
-		const grouped: Record<ICFComponent, Dimension[]> = {
-			body_functions: [],
-			activities: [],
-			participation: [],
-			environmental_factors: [],
-			personal_factors: []
-		};
-		
-		dimensions.forEach(dim => {
-			const component = dim.component || 'activities'; // default to activities if not set
-			grouped[component].push(dim);
-		});
-		
-		return grouped;
-	}
-	
-	// Helper function to count resources and barriers
-	function countResourcesBarriers(dimensions: Dimension[]): { resources: number; barriers: number; neutral: number } {
-		return {
-			resources: dimensions.filter(d => d.value > 0).length,
-			barriers: dimensions.filter(d => d.value < 0).length,
-			neutral: dimensions.filter(d => d.value === 0).length
-		};
-	}
-
-	onMount(async () => {
-		const id = $page.params.id;
-		
-		if (id === 'new') {
-			isNew = true;
-			activity = {
-				id: generateUUID(),
-				mode: $currentMode,
-				title: '',
-				context: {},
-				dimensions: []
-			};
-		} else {
-			const loaded = await activities.load();
-			activity = loaded.find(a => a.id === id) || null;
-			
-			if (!activity) {
-				alert('Aktivität nicht gefunden');
-				goto('/');
-			}
-		}
-	});
-
-	function handleSave() {
-		if (!activity) return;
-		
-		if (!activity.title.trim()) {
-			alert('Bitte geben Sie einen Titel ein');
-			return;
-		}
-
-		if (isNew) {
-			activities.add(activity);
-		} else {
-			activities.update(activity);
-		}
-
-		goto('/');
-	}
-
-	function handleDelete() {
-		if (!activity || isNew) return;
-		
-		if (confirm('Möchten Sie diese Aktivität wirklich löschen?')) {
-			activities.remove(activity.id);
-			goto('/');
-		}
-	}
-
-	function openDimensionModal(dimension?: Dimension) {
-		if (dimension) {
-			editingDimension = dimension;
-			dimLabel = dimension.label;
-			dimCode = dimension.code || '';
-			dimDescription = dimension.description || '';
-			dimValue = dimension.value;
-			dimExplanation = dimension.explanation || '';
-			dimSource = dimension.source || 'custom';
-			dimComponent = dimension.component || 'activities';
-		} else {
-			editingDimension = null;
-			dimLabel = '';
-			dimCode = '';
-			dimDescription = '';
-			dimValue = 0;
-			dimExplanation = '';
-			dimSource = 'custom';
-			dimComponent = 'activities';
-		}
-		showDimensionModal = true;
-	}
-
-	function closeDimensionModal() {
-		showDimensionModal = false;
-		selectedCatalogEntry = '';
-	}
-
-	function handleCatalogSelection() {
-		if (!selectedCatalogEntry || !$currentCatalog) return;
-		
-		const entry = $currentCatalog.domains.find(d => d.code === selectedCatalogEntry);
-		if (entry) {
-			dimCode = entry.code;
-			dimLabel = entry.label;
-			dimDescription = entry.description || '';
-			dimSource = 'catalog';
-			dimComponent = entry.component; // Set component from catalog
-		}
-	}
-
-	function saveDimension() {
-		if (!activity) return;
-		
-		if (!dimLabel.trim()) {
-			alert('Bitte geben Sie ein Label ein');
-			return;
-		}
-
-		const dimension: Dimension = {
-			id: editingDimension?.id || generateUUID(),
-			label: dimLabel,
-			code: dimCode || undefined,
-			description: dimDescription || undefined,
-			value: dimValue,
-			explanation: dimExplanation || undefined,
-			source: dimSource,
-			component: dimComponent
-		};
-
-		if (editingDimension) {
-			const editingId = editingDimension.id;
-			activity.dimensions = activity.dimensions.map(d => 
-				d.id === editingId ? dimension : d
-			);
-		} else {
-			activity.dimensions = [...activity.dimensions, dimension];
-		}
-
-		closeDimensionModal();
-	}
-
-	function deleteDimension(dimensionId: string) {
-		if (!activity) return;
-		
-		if (confirm('Möchten Sie diese Dimension wirklich entfernen?')) {
-			activity.dimensions = activity.dimensions.filter(d => d.id !== dimensionId);
-		}
-	}
-
-	function handleExportJSON() {
-		if (!activity) return;
-		const json = exportToJSON(activity);
-		const filename = `${activity.title.replace(/[^a-z0-9]/gi, '_')}.json`;
-		downloadFile(json, filename, 'application/json');
-	}
-
-	function handleExportMarkdown() {
-		if (!activity) return;
-		const markdown = exportToMarkdown(activity);
-		const filename = `${activity.title.replace(/[^a-z0-9]/gi, '_')}.md`;
-		downloadFile(markdown, filename, 'text/markdown');
-	}
-
-	function handleImport() {
-		try {
-			const imported = importFromJSON(importText);
-			activity = imported;
-			isNew = false;
-			showImportModal = false;
-			importText = '';
-			alert('Aktivität erfolgreich importiert!');
-		} catch (error) {
-			alert(`Import fehlgeschlagen: ${error}`);
-		}
-	}
-
-	function getValueLabel(value: number): string {
-		if (value === 0) return 'Neutral';
-		if (value > 0) return `Ressource (+${value})`;
-		return `Barriere (${value})`;
-	}
-
-	function getValueColor(value: number): string {
-		if (value === 0) return '#6c757d';
-		if (value > 0) return '#28a745';
-		return '#dc3545';
-	}
-</script>
-
-{#if activity}
-	<div class="activity-edit">
-		<div class="page-header flex-between mb-3">
-			<h1>{isNew ? 'Neue Aktivität' : 'Aktivität bearbeiten'}</h1>
-			<div class="flex gap-2">
-				<button class="btn btn-outline" onclick={() => goto('/')}>Abbrechen</button>
-				{#if !isNew}
-					<button class="btn btn-danger" onclick={handleDelete}>Löschen</button>
-				{/if}
-				<button class="btn btn-primary" onclick={handleSave}>Speichern</button>
-			</div>
-		</div>
-
-		<div class="form-section card mb-3">
-			<h2>Grunddaten</h2>
-			
-			<div class="form-group">
-				<label for="title">Titel *</label>
-				<input 
-					id="title"
-					type="text" 
-					bind:value={activity.title}
-					placeholder="z.B. Hausaufgaben in der Kleingruppe"
-				/>
-			</div>
-
-			<div class="grid grid-2">
-				<div class="form-group">
-					<label for="code">ICF-Code (optional)</label>
-					<input 
-						id="code"
-						type="text" 
-						bind:value={activity.code}
-						placeholder="z.B. d815"
-					/>
-				</div>
-				<div class="form-group">
-					<label>Modus</label>
-					<select bind:value={activity.mode}>
-						<option value="icf">ICF</option>
-						<option value="icf_cy">ICF-CY</option>
-					</select>
-				</div>
-			</div>
-
-			<div class="form-group">
-				<label for="description">Beschreibung</label>
-				<textarea 
-					id="description"
-					bind:value={activity.description}
-					placeholder="Kurzbeschreibung der Situation, Anforderung, Kontext"
-				></textarea>
-			</div>
-		</div>
-
-		<div class="form-section card mb-3">
-			<h2>Kontextdaten</h2>
-			
-			<div class="grid grid-2">
-				<div class="form-group">
-					<label for="person">Kind / Person</label>
-					<input 
-						id="person"
-						type="text" 
-						bind:value={activity.context.person}
-						placeholder="Name oder Pseudonym"
-					/>
-				</div>
-				<div class="form-group">
-					<label for="ageOrGrade">Alter / Klassenstufe</label>
-					<input 
-						id="ageOrGrade"
-						type="text" 
-						bind:value={activity.context.ageOrGrade}
-						placeholder="z.B. 8 Jahre oder 3. Klasse"
-					/>
-				</div>
-			</div>
-
-			<div class="form-group">
-				<label for="setting">Setting</label>
-				<input 
-					id="setting"
-					type="text" 
-					bind:value={activity.context.setting}
-					placeholder="z.B. 3. Klasse, Mathe-Gruppenarbeit in der Schule"
-				/>
-			</div>
-
-			<div class="grid grid-2">
-				<div class="form-group">
-					<label for="purpose">Anlass / Ziel</label>
-					<input 
-						id="purpose"
-						type="text" 
-						bind:value={activity.context.purpose}
-						placeholder="z.B. Förderplanung, Verlaufsdokumentation"
-					/>
-				</div>
-				<div class="form-group">
-					<label for="date">Datum</label>
-					<input 
-						id="date"
-						type="date" 
-						bind:value={activity.context.date}
-					/>
-				</div>
-			</div>
-
-			<div class="form-group">
-				<label for="author">Ersteller</label>
-				<input 
-					id="author"
-					type="text" 
-					bind:value={activity.context.author}
-					placeholder="Ihr Name"
-				/>
-			</div>
-
-			<div class="form-group">
-				<label for="notes">Notizen</label>
-				<textarea 
-					id="notes"
-					bind:value={activity.context.notes}
-					placeholder="Allgemeine Notizen"
-				></textarea>
-			</div>
-		</div>
-
-		<!-- ICF Model Visualization -->
-		<div class="form-section card mb-3">
-			<h2>ICF-Modell: Aktivität im Mittelpunkt</h2>
-			<p class="model-description">
-				Die Aktivität "{activity.title}" steht im Mittelpunkt. Erfassen Sie Ressourcen (+) und Barrieren (-) 
-				in den verschiedenen ICF-Komponenten, die die Bewältigung dieser Aktivität beeinflussen.
-			</p>
-			<div class="icf-model-diagram">
-				<img src="/images/icf-model.svg" alt="ICF-Modell" style="max-width: 100%; height: auto;" />
-			</div>
-		</div>
-
-		<div class="form-section card mb-3">
-			<div class="flex-between mb-2">
-				<h2>ICF-Kategorien: Ressourcen & Barrieren</h2>
-				<button class="btn btn-secondary" onclick={() => openDimensionModal()}>
-					+ Dimension hinzufügen
-				</button>
-			</div>
-
-			{#if activity.dimensions.length === 0}
-				<p class="empty-message">Noch keine Dimensionen hinzugefügt. Fügen Sie Faktoren hinzu, die die Bewältigung der Aktivität beeinflussen.</p>
-			{:else}
-				{@const grouped = groupDimensionsByComponent(activity.dimensions)}
-				
-				<!-- Body Functions and Structures -->
-				{#if grouped.body_functions.length > 0}
-					<div class="component-section">
-						<h3 class="component-title body-functions">
-							🧠 {getComponentLabel('body_functions')}
-							<span class="component-count">({grouped.body_functions.length})</span>
-						</h3>
-						<div class="dimensions-list">
-							{#each grouped.body_functions as dimension (dimension.id)}
-								<div class="dimension-item">
-									<div class="dimension-header">
-										<div>
-											<strong>{dimension.label}</strong>
-											{#if dimension.code}
-												<span class="code-badge body-functions">{dimension.code}</span>
-											{/if}
-										</div>
-										<div class="dimension-actions flex gap-1">
-											<button 
-												class="btn-icon" 
-												onclick={() => openDimensionModal(dimension)}
-												title="Bearbeiten"
-											>✏️</button>
-											<button 
-												class="btn-icon" 
-												onclick={() => deleteDimension(dimension.id)}
-												title="Löschen"
-											>🗑️</button>
-										</div>
-									</div>
-									
-									{#if dimension.description}
-										<p class="dimension-description">{dimension.description}</p>
-									{/if}
-
-									<div class="dimension-value" style="color: {getValueColor(dimension.value)}">
-										<strong>{getValueLabel(dimension.value)}</strong>
-									</div>
-
-									{#if dimension.explanation}
-										<p class="dimension-explanation">
-											<em>Begründung:</em> {dimension.explanation}
-										</p>
-									{/if}
-								</div>
-							{/each}
-						</div>
-					</div>
-				{/if}
-
-				<!-- Activities -->
-				{#if grouped.activities.length > 0}
-					<div class="component-section">
-						<h3 class="component-title activities">
-							🎯 {getComponentLabel('activities')}
-							<span class="component-count">({grouped.activities.length})</span>
-						</h3>
-						<div class="dimensions-list">
-							{#each grouped.activities as dimension (dimension.id)}
-								<div class="dimension-item">
-									<div class="dimension-header">
-										<div>
-											<strong>{dimension.label}</strong>
-											{#if dimension.code}
-												<span class="code-badge activities">{dimension.code}</span>
-											{/if}
-										</div>
-										<div class="dimension-actions flex gap-1">
-											<button 
-												class="btn-icon" 
-												onclick={() => openDimensionModal(dimension)}
-												title="Bearbeiten"
-											>✏️</button>
-											<button 
-												class="btn-icon" 
-												onclick={() => deleteDimension(dimension.id)}
-												title="Löschen"
-											>🗑️</button>
-										</div>
-									</div>
-									
-									{#if dimension.description}
-										<p class="dimension-description">{dimension.description}</p>
-									{/if}
-
-									<div class="dimension-value" style="color: {getValueColor(dimension.value)}">
-										<strong>{getValueLabel(dimension.value)}</strong>
-									</div>
-
-									{#if dimension.explanation}
-										<p class="dimension-explanation">
-											<em>Begründung:</em> {dimension.explanation}
-										</p>
-									{/if}
-								</div>
-							{/each}
-						</div>
-					</div>
-				{/if}
-
-				<!-- Participation -->
-				{#if grouped.participation.length > 0}
-					<div class="component-section">
-						<h3 class="component-title participation">
-							🤝 {getComponentLabel('participation')}
-							<span class="component-count">({grouped.participation.length})</span>
-						</h3>
-						<div class="dimensions-list">
-							{#each grouped.participation as dimension (dimension.id)}
-								<div class="dimension-item">
-									<div class="dimension-header">
-										<div>
-											<strong>{dimension.label}</strong>
-											{#if dimension.code}
-												<span class="code-badge participation">{dimension.code}</span>
-											{/if}
-										</div>
-										<div class="dimension-actions flex gap-1">
-											<button 
-												class="btn-icon" 
-												onclick={() => openDimensionModal(dimension)}
-												title="Bearbeiten"
-											>✏️</button>
-											<button 
-												class="btn-icon" 
-												onclick={() => deleteDimension(dimension.id)}
-												title="Löschen"
-											>🗑️</button>
-										</div>
-									</div>
-									
-									{#if dimension.description}
-										<p class="dimension-description">{dimension.description}</p>
-									{/if}
-
-									<div class="dimension-value" style="color: {getValueColor(dimension.value)}">
-										<strong>{getValueLabel(dimension.value)}</strong>
-									</div>
-
-									{#if dimension.explanation}
-										<p class="dimension-explanation">
-											<em>Begründung:</em> {dimension.explanation}
-										</p>
-									{/if}
-								</div>
-							{/each}
-						</div>
-					</div>
-				{/if}
-
-				<!-- Environmental Factors -->
-				{#if grouped.environmental_factors.length > 0}
-					<div class="component-section">
-						<h3 class="component-title environmental">
-							🌍 {getComponentLabel('environmental_factors')}
-							<span class="component-count">({grouped.environmental_factors.length})</span>
-						</h3>
-						<div class="dimensions-list">
-							{#each grouped.environmental_factors as dimension (dimension.id)}
-								<div class="dimension-item">
-									<div class="dimension-header">
-										<div>
-											<strong>{dimension.label}</strong>
-											{#if dimension.code}
-												<span class="code-badge environmental">{dimension.code}</span>
-											{/if}
-										</div>
-										<div class="dimension-actions flex gap-1">
-											<button 
-												class="btn-icon" 
-												onclick={() => openDimensionModal(dimension)}
-												title="Bearbeiten"
-											>✏️</button>
-											<button 
-												class="btn-icon" 
-												onclick={() => deleteDimension(dimension.id)}
-												title="Löschen"
-											>🗑️</button>
-										</div>
-									</div>
-									
-									{#if dimension.description}
-										<p class="dimension-description">{dimension.description}</p>
-									{/if}
-
-									<div class="dimension-value" style="color: {getValueColor(dimension.value)}">
-										<strong>{getValueLabel(dimension.value)}</strong>
-									</div>
-
-									{#if dimension.explanation}
-										<p class="dimension-explanation">
-											<em>Begründung:</em> {dimension.explanation}
-										</p>
-									{/if}
-								</div>
-							{/each}
-						</div>
-					</div>
-				{/if}
-
-				<!-- Personal Factors -->
-				{#if grouped.personal_factors.length > 0}
-					<div class="component-section">
-						<h3 class="component-title personal">
-							👤 {getComponentLabel('personal_factors')}
-							<span class="component-count">({grouped.personal_factors.length})</span>
-						</h3>
-						<div class="dimensions-list">
-							{#each grouped.personal_factors as dimension (dimension.id)}
-								<div class="dimension-item">
-									<div class="dimension-header">
-										<div>
-											<strong>{dimension.label}</strong>
-											{#if dimension.code}
-												<span class="code-badge personal">{dimension.code}</span>
-											{/if}
-										</div>
-										<div class="dimension-actions flex gap-1">
-											<button 
-												class="btn-icon" 
-												onclick={() => openDimensionModal(dimension)}
-												title="Bearbeiten"
-											>✏️</button>
-											<button 
-												class="btn-icon" 
-												onclick={() => deleteDimension(dimension.id)}
-												title="Löschen"
-											>🗑️</button>
-										</div>
-									</div>
-									
-									{#if dimension.description}
-										<p class="dimension-description">{dimension.description}</p>
-									{/if}
-
-									<div class="dimension-value" style="color: {getValueColor(dimension.value)}">
-										<strong>{getValueLabel(dimension.value)}</strong>
-									</div>
-
-									{#if dimension.explanation}
-										<p class="dimension-explanation">
-											<em>Begründung:</em> {dimension.explanation}
-										</p>
-									{/if}
-								</div>
-							{/each}
-						</div>
-					</div>
-				{/if}
-			{/if}
-		</div>
-
-		<div class="form-section card mb-3">
-			<h2>Export / Import</h2>
-			<div class="flex gap-2">
-				<button class="btn btn-outline" onclick={handleExportJSON}>
-					📄 Als JSON exportieren
-				</button>
-				<button class="btn btn-outline" onclick={handleExportMarkdown}>
-					📝 Als Markdown exportieren
-				</button>
-				<button class="btn btn-outline" onclick={() => showImportModal = true}>
-					📥 JSON importieren
-				</button>
-			</div>
-		</div>
-	</div>
-
-	<!-- Dimension Modal -->
-	{#if showDimensionModal}
-		<div class="modal-overlay" onclick={closeDimensionModal}>
-			<div class="modal" onclick={(e) => e.stopPropagation()}>
-				<div class="modal-header">
-					<h2>{editingDimension ? 'Dimension bearbeiten' : 'Dimension hinzufügen'}</h2>
-					<button class="btn-close" onclick={closeDimensionModal}>✕</button>
-				</div>
-
-				<div class="modal-body">
-					{#if $currentCatalog && dimSource === 'catalog'}
-						<div class="form-group">
-							<label for="catalog-select">Aus Katalog auswählen</label>
-							<select 
-								id="catalog-select"
-								bind:value={selectedCatalogEntry}
-								onchange={handleCatalogSelection}
-							>
-								<option value="">-- Kategorie auswählen --</option>
-								{#each $currentCatalog.domains as entry}
-									<option value={entry.code}>
-										{entry.code} - {entry.label}
-										{entry.group ? ` (${entry.group})` : ''}
-									</option>
-								{/each}
-							</select>
-						</div>
-					{/if}
-
-					<div class="form-group">
-						<label>Quelle</label>
-						<div class="radio-group">
-							<label>
-								<input type="radio" bind:group={dimSource} value="catalog" />
-								Aus Katalog
-							</label>
-							<label>
-								<input type="radio" bind:group={dimSource} value="custom" />
-								Eigene Definition
-							</label>
-						</div>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-label">Label *</label>
-						<input 
-							id="dim-label"
-							type="text" 
-							bind:value={dimLabel}
-							placeholder="z.B. Feinmotorischer Handgebrauch"
-						/>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-code">Code (optional)</label>
-						<input 
-							id="dim-code"
-							type="text" 
-							bind:value={dimCode}
-							placeholder="z.B. d440, b140, e310"
-						/>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-component">ICF-Komponente *</label>
-						<select id="dim-component" bind:value={dimComponent}>
-							<option value="body_functions">🧠 Körperfunktionen und -strukturen</option>
-							<option value="activities">🎯 Aktivitäten</option>
-							<option value="participation">🤝 Partizipation (Teilhabe)</option>
-							<option value="environmental_factors">🌍 Umweltfaktoren</option>
-							<option value="personal_factors">👤 Personbezogene Faktoren</option>
-						</select>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-description">Beschreibung</label>
-						<textarea 
-							id="dim-description"
-							bind:value={dimDescription}
-							placeholder="Kurzbeschreibung der Dimension"
-						></textarea>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-value">
-							Bewertung: {dimValue} 
-							<span style="color: {getValueColor(dimValue)}">
-								({getValueLabel(dimValue)})
-							</span>
-						</label>
-						<input 
-							id="dim-value"
-							type="range" 
-							min="-4" 
-							max="4" 
-							step="1"
-							bind:value={dimValue}
-						/>
-						<div class="range-labels">
-							<span>-4 (Starke Barriere)</span>
-							<span>0 (Neutral)</span>
-							<span>+4 (Starke Ressource)</span>
-						</div>
-					</div>
-
-					<div class="form-group">
-						<label for="dim-explanation">Begründung</label>
-						<textarea 
-							id="dim-explanation"
-							bind:value={dimExplanation}
-							placeholder="Warum ist dies eine Barriere oder Ressource?"
-						></textarea>
-					</div>
-				</div>
-
-				<div class="modal-footer">
-					<button class="btn btn-outline" onclick={closeDimensionModal}>Abbrechen</button>
-					<button class="btn btn-primary" onclick={saveDimension}>Speichern</button>
-				</div>
-			</div>
-		</div>
-	{/if}
-
-	<!-- Import Modal -->
-	{#if showImportModal}
-		<div class="modal-overlay" onclick={() => showImportModal = false}>
-			<div class="modal" onclick={(e) => e.stopPropagation()}>
-				<div class="modal-header">
-					<h2>Aktivität importieren</h2>
-					<button class="btn-close" onclick={() => showImportModal = false}>✕</button>
-				</div>
-
-				<div class="modal-body">
-					<div class="form-group">
-						<label for="import-text">JSON-Daten einfügen</label>
-						<textarea 
-							id="import-text"
-							bind:value={importText}
-							placeholder="JSON hier einfügen"
-							style="min-height: 300px; font-family: monospace;"
-						></textarea>
-					</div>
-				</div>
-
-				<div class="modal-footer">
-					<button class="btn btn-outline" onclick={() => showImportModal = false}>Abbrechen</button>
-					<button class="btn btn-primary" onclick={handleImport}>Importieren</button>
-				</div>
-			</div>
-		</div>
-	{/if}
-{:else}
-	<div class="loading">Laden...</div>
-{/if}
-
-<style>
-	.activity-edit {
-		max-width: 900px;
-		margin: 0 auto;
-	}
-
-	.form-section h2 {
-		font-size: 1.25rem;
-		margin-bottom: 1rem;
-		color: var(--primary-color);
-	}
-
-	.empty-message {
-		color: #999;
-		font-style: italic;
-	}
-
-	.code-badge {
-		background-color: var(--primary-color);
-		color: white;
-		padding: 0.125rem 0.5rem;
-		border-radius: 0.75rem;
-		font-size: 0.75rem;
-		font-weight: 500;
-		margin-left: 0.5rem;
-	}
-
-	.dimensions-list {
-		display: flex;
-		flex-direction: column;
-		gap: 1rem;
-	}
-
-	.dimension-item {
-		padding: 1rem;
-		border: 1px solid var(--border-color);
-		border-radius: var(--border-radius);
-		background-color: #fafafa;
-	}
-
-	.dimension-header {
-		display: flex;
-		justify-content: space-between;
-		align-items: center;
-		margin-bottom: 0.5rem;
-	}
-
-	.dimension-actions {
-		display: flex;
-		gap: 0.25rem;
-	}
-
-	.btn-icon {
-		background: none;
-		border: none;
-		cursor: pointer;
-		font-size: 1.25rem;
-		padding: 0.25rem;
-		opacity: 0.7;
-		transition: opacity 0.2s;
-	}
-
-	.btn-icon:hover {
-		opacity: 1;
-	}
-
-	.dimension-description {
-		color: #666;
-		font-size: 0.9rem;
-		margin-bottom: 0.5rem;
-	}
-
-	.dimension-value {
-		font-size: 1.1rem;
-		margin-bottom: 0.5rem;
-	}
-
-	.dimension-explanation {
-		color: #555;
-		font-size: 0.9rem;
-		font-style: italic;
-		padding: 0.5rem;
-		background-color: white;
-		border-radius: 0.25rem;
-	}
-
-	.modal-overlay {
-		position: fixed;
-		top: 0;
-		left: 0;
-		right: 0;
-		bottom: 0;
-		background-color: rgba(0, 0, 0, 0.5);
-		display: flex;
-		justify-content: center;
-		align-items: center;
-		z-index: 1000;
-		padding: 1rem;
-	}
-
-	.modal {
-		background-color: white;
-		border-radius: var(--border-radius);
-		max-width: 600px;
-		width: 100%;
-		max-height: 90vh;
-		overflow: auto;
-		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
-	}
-
-	.modal-header {
-		padding: 1.5rem;
-		border-bottom: 1px solid var(--border-color);
-		display: flex;
-		justify-content: space-between;
-		align-items: center;
-	}
-
-	.modal-header h2 {
-		margin: 0;
-		font-size: 1.5rem;
-	}
-
-	.btn-close {
-		background: none;
-		border: none;
-		font-size: 1.5rem;
-		cursor: pointer;
-		color: #999;
-		padding: 0;
-		width: 2rem;
-		height: 2rem;
-		display: flex;
-		align-items: center;
-		justify-content: center;
-	}
-
-	.btn-close:hover {
-		color: #333;
-	}
-
-	.modal-body {
-		padding: 1.5rem;
-	}
-
-	.modal-footer {
-		padding: 1.5rem;
-		border-top: 1px solid var(--border-color);
-		display: flex;
-		justify-content: flex-end;
-		gap: 0.5rem;
-	}
-
-	.radio-group {
-		display: flex;
-		gap: 1rem;
-	}
-
-	.radio-group label {
-		display: flex;
-		align-items: center;
-		gap: 0.5rem;
-		cursor: pointer;
-		font-weight: normal;
-	}
-
-	.range-labels {
-		display: flex;
-		justify-content: space-between;
-		font-size: 0.75rem;
-		color: #666;
-		margin-top: 0.25rem;
-	}
-
-	.loading {
-		text-align: center;
-		padding: 3rem;
-		color: #666;
-	}
-
-	/* ICF Component Styles */
-	.model-description {
-		color: #666;
-		margin-bottom: 1.5rem;
-		font-size: 0.95rem;
-		line-height: 1.6;
-	}
-
-	.icf-model-diagram {
-		margin: 1.5rem 0;
-		text-align: center;
-	}
-
-	.component-section {
-		margin-bottom: 2rem;
-		padding: 1rem;
-		border-radius: var(--border-radius);
-		background-color: #fafafa;
-	}
-
-	.component-title {
-		font-size: 1.1rem;
-		font-weight: 600;
-		margin-bottom: 1rem;
-		padding-bottom: 0.5rem;
-		border-bottom: 2px solid;
-		display: flex;
-		align-items: center;
-		gap: 0.5rem;
-	}
-
-	.component-title.body-functions {
-		color: #FF9800;
-		border-bottom-color: #FF9800;
-	}
-
-	.component-title.activities {
-		color: #0066cc;
-		border-bottom-color: #0066cc;
-	}
-
-	.component-title.participation {
-		color: #4CAF50;
-		border-bottom-color: #4CAF50;
-	}
-
-	.component-title.environmental {
-		color: #FBC02D;
-		border-bottom-color: #FBC02D;
-	}
-
-	.component-title.personal {
-		color: #9C27B0;
-		border-bottom-color: #9C27B0;
-	}
-
-	.component-count {
-		font-size: 0.9rem;
-		font-weight: normal;
-		opacity: 0.7;
-	}
-
-	.code-badge.body-functions {
-		background-color: #FF9800;
-	}
-
-	.code-badge.activities {
-		background-color: #0066cc;
-	}
-
-	.code-badge.participation {
-		background-color: #4CAF50;
-	}
-
-	.code-badge.environmental {
-		background-color: #FBC02D;
-		color: #333;
-	}
-
-	.code-badge.personal {
-		background-color: #9C27B0;
-	}
-
-	.component-section .dimensions-list {
-		margin-top: 1rem;
-	}
-</style>
diff --git a/static/images/icf-model.svg b/static/images/icf-model.svg
deleted file mode 100644
index 2c5ec23..0000000
--- a/static/images/icf-model.svg
+++ /dev/null
@@ -1,61 +0,0 @@
-<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
-  <!-- Title -->
-  <text x="400" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">Gesundheitszustand</text>
-  
-  <!-- Top arrow down to Activities -->
-  <line x1="400" y1="50" x2="400" y2="120" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  
-  <!-- Central box: Activities -->
-  <rect x="320" y="120" width="160" height="80" fill="#E8F4F8" stroke="#0066cc" stroke-width="3" rx="5"/>
-  <text x="400" y="165" text-anchor="middle" font-size="18" font-weight="bold" fill="#0066cc">Aktivitäten</text>
-  
-  <!-- Left box: Body Functions -->
-  <rect x="40" y="140" width="200" height="120" fill="#FFF3E0" stroke="#FF9800" stroke-width="2" rx="5"/>
-  <text x="140" y="190" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">Körperfunktionen</text>
-  <text x="140" y="210" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">und -strukturen</text>
-  
-  <!-- Right box: Participation -->
-  <rect x="560" y="140" width="200" height="120" fill="#E8F5E9" stroke="#4CAF50" stroke-width="2" rx="5"/>
-  <text x="660" y="190" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">Partizipation</text>
-  <text x="660" y="210" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">[Teilhabe]</text>
-  
-  <!-- Bidirectional arrows between Body Functions and Activities -->
-  <line x1="240" y1="180" x2="320" y2="150" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <line x1="320" y1="170" x2="240" y2="220" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  
-  <!-- Bidirectional arrows between Activities and Participation -->
-  <line x1="480" y1="150" x2="560" y2="180" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <line x1="560" y1="220" x2="480" y2="170" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  
-  <!-- Bottom sections -->
-  <!-- Environmental Factors -->
-  <rect x="80" y="400" width="280" height="100" fill="#FFF9C4" stroke="#FBC02D" stroke-width="2" rx="5"/>
-  <text x="220" y="440" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">Umweltfaktoren</text>
-  
-  <!-- Personal Factors -->
-  <rect x="440" y="400" width="280" height="100" fill="#F3E5F5" stroke="#9C27B0" stroke-width="2" rx="5"/>
-  <text x="580" y="430" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">Personbezogene</text>
-  <text x="580" y="450" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">Faktoren</text>
-  
-  <!-- Arrows from bottom factors up to main components -->
-  <!-- From Environmental to Body Functions -->
-  <line x1="180" y1="400" x2="120" y2="260" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <!-- From Environmental to Activities -->
-  <line x1="280" y1="400" x2="350" y2="200" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <!-- From Environmental to Participation -->
-  <line x1="350" y1="400" x2="600" y2="260" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  
-  <!-- From Personal to Body Functions -->
-  <line x1="450" y1="400" x2="200" y2="260" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <!-- From Personal to Activities -->
-  <line x1="520" y1="400" x2="430" y2="200" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  <!-- From Personal to Participation -->
-  <line x1="620" y1="400" x2="680" y2="260" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>
-  
-  <!-- Arrow markers -->
-  <defs>
-    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
-      <polygon points="0 0, 10 3, 0 6" fill="#666"/>
-    </marker>
-  </defs>
-</svg>
diff --git a/static/robots.txt b/static/robots.txt
deleted file mode 100644
index b6dd667..0000000
--- a/static/robots.txt
+++ /dev/null
@@ -1,3 +0,0 @@
-# allow crawling everything by default
-User-agent: *
-Disallow:
diff --git a/style.css b/style.css
new file mode 100644
index 0000000..ebbecca
--- /dev/null
+++ b/style.css
@@ -0,0 +1,212 @@
+body {
+  margin: 0;
+  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
+  background: #111;
+  color: #eee;
+}
+
+header {
+  padding: 1rem 1.5rem;
+  border-bottom: 1px solid #333;
+  background: #181818;
+}
+
+header h1 {
+  margin: 0 0 0.5rem 0;
+}
+
+.mode-row,
+.activity-row {
+  display: flex;
+  align-items: center;
+  gap: 0.5rem;
+  margin-bottom: 0.5rem;
+}
+
+.mode-row label,
+.activity-row label {
+  min-width: 9rem;
+}
+
+.activity-row input,
+.mode-row select {
+  flex: 1;
+  padding: 0.3rem 0.5rem;
+  border-radius: 4px;
+  border: 1px solid #444;
+  background: #222;
+  color: #eee;
+}
+
+main {
+  display: grid;
+  grid-template-columns: 1.1fr 1.3fr 1.1fr;
+  gap: 1rem;
+  padding: 1rem 1.5rem;
+  height: calc(100vh - 130px);
+  box-sizing: border-box;
+}
+
+section {
+  border: 1px solid #333;
+  border-radius: 6px;
+  padding: 0.75rem;
+  box-sizing: border-box;
+  background: #151515;
+  display: flex;
+  flex-direction: column;
+}
+
+section h2 {
+  margin-top: 0;
+  margin-bottom: 0.5rem;
+  font-size: 1.05rem;
+}
+
+#searchInput {
+  padding: 0.3rem 0.5rem;
+  border-radius: 4px;
+  border: 1px solid #444;
+  background: #222;
+  color: #eee;
+  margin-bottom: 0.5rem;
+}
+
+#categoryList {
+  list-style: none;
+  padding: 0;
+  margin: 0;
+  overflow-y: auto;
+  flex: 1;
+}
+
+#categoryList li {
+  padding: 0.4rem 0.5rem;
+  border-bottom: 1px solid #222;
+  cursor: pointer;
+}
+
+#categoryList li:hover {
+  background: #222;
+}
+
+#categoryList li.active {
+  background: #333;
+}
+
+.info-box {
+  border-radius: 4px;
+  padding: 0.5rem;
+  background: #202020;
+  border: 1px solid #333;
+  min-height: 3rem;
+  margin-bottom: 0.75rem;
+  font-size: 0.9rem;
+}
+
+.hidden {
+  display: none;
+}
+
+.rating-row {
+  margin-bottom: 0.75rem;
+  font-size: 0.9rem;
+}
+
+#ratingButtons {
+  margin-top: 0.4rem;
+  display: flex;
+  flex-wrap: wrap;
+  gap: 0.35rem;
+}
+
+.rating-button {
+  padding: 0.3rem 0.55rem;
+  border-radius: 4px;
+  border: 1px solid #444;
+  background: #222;
+  cursor: pointer;
+  font-size: 0.85rem;
+}
+
+.rating-button.selected {
+  border-color: #ff5555;
+  background: #551111;
+}
+
+.note-row {
+  display: flex;
+  flex-direction: column;
+  gap: 0.25rem;
+  margin-bottom: 0.75rem;
+}
+
+#noteInput {
+  border-radius: 4px;
+  border: 1px solid #444;
+  background: #222;
+  color: #eee;
+  padding: 0.4rem;
+  resize: vertical;
+}
+
+button {
+  border-radius: 4px;
+  border: 1px solid #666;
+  background: #333;
+  color: #eee;
+  padding: 0.4rem 0.8rem;
+  cursor: pointer;
+  font-size: 0.9rem;
+}
+
+button:hover {
+  background: #444;
+}
+
+#summaryContainer {
+  flex: 1;
+  overflow-y: auto;
+  font-size: 0.9rem;
+  margin-bottom: 0.75rem;
+}
+
+.summary-entry {
+  border-bottom: 1px solid #222;
+  padding: 0.35rem 0;
+}
+
+.summary-entry-header {
+  display: flex;
+  justify-content: space-between;
+  gap: 0.5rem;
+}
+
+.summary-entry-code {
+  font-weight: 600;
+}
+
+.summary-entry-value {
+  font-family: monospace;
+}
+
+.summary-entry-note {
+  margin-top: 0.25rem;
+  color: #ccc;
+}
+
+footer {
+  padding: 0.5rem 1.5rem;
+  border-top: 1px solid #333;
+  background: #181818;
+  font-size: 0.75rem;
+  color: #aaa;
+}
+
+/* einfache Responsivität */
+@media (max-width: 1000px) {
+  main {
+    grid-template-columns: 1fr;
+    height: auto;
+  }
+}
diff --git a/svelte.config.js b/svelte.config.js
deleted file mode 100644
index 1295460..0000000
--- a/svelte.config.js
+++ /dev/null
@@ -1,18 +0,0 @@
-import adapter from '@sveltejs/adapter-auto';
-import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
-
-/** @type {import('@sveltejs/kit').Config} */
-const config = {
-	// Consult https://svelte.dev/docs/kit/integrations
-	// for more information about preprocessors
-	preprocess: vitePreprocess(),
-
-	kit: {
-		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
-		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
-		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
-		adapter: adapter()
-	}
-};
-
-export default config;
diff --git a/tsconfig.json b/tsconfig.json
deleted file mode 100644
index 2c2ed3c..0000000
--- a/tsconfig.json
+++ /dev/null
@@ -1,20 +0,0 @@
-{
-	"extends": "./.svelte-kit/tsconfig.json",
-	"compilerOptions": {
-		"rewriteRelativeImportExtensions": true,
-		"allowJs": true,
-		"checkJs": true,
-		"esModuleInterop": true,
-		"forceConsistentCasingInFileNames": true,
-		"resolveJsonModule": true,
-		"skipLibCheck": true,
-		"sourceMap": true,
-		"strict": true,
-		"moduleResolution": "bundler"
-	}
-	// Path aliases are handled by https://svelte.dev/docs/kit/configuration#alias
-	// except $lib which is handled by https://svelte.dev/docs/kit/configuration#files
-	//
-	// To make changes to top-level options such as include and exclude, we recommend extending
-	// the generated config; see https://svelte.dev/docs/kit/configuration#typescript
-}
diff --git a/vite.config.ts b/vite.config.ts
deleted file mode 100644
index bbf8c7d..0000000
--- a/vite.config.ts
+++ /dev/null
@@ -1,6 +0,0 @@
-import { sveltekit } from '@sveltejs/kit/vite';
-import { defineConfig } from 'vite';
-
-export default defineConfig({
-	plugins: [sveltekit()]
-});
