Kurzer Rundgang durchs Repo-Stand (auf Basis deiner bereitgestellten Doks `zusammenstellung.md` & `inhalt.md`): ja, ich sehe ein paar sachliche Widersprüche, Lücken und „implizite Fußangeln“. Hier die wichtigsten — jeweils mit Fix-Vorschlag.

# Befunde & Fix-Vorschläge

1. Event-Sourcing vs. „jederzeit löschen“  
    Problem: „Alles ist ein unveränderliches Event“ beißt sich mit „eigene Beiträge jederzeit löschen“.  
    Fix: Statt physisch zu löschen → „tombstone“-Event + inhaltliche Felder per kryptografischer Löschung (key-erased) unlesbar machen. API zeigt dann „gelöscht“ an, Audit bleibt rechtssicher.
    
2. Öffentliche Sichtbarkeit vs. DSGVO-Grundlagen  
    Problem: Radikale Transparenz + Wohnort-Visualisierung = hohe Re-Identifizierbarkeit. Nur auf Art. 6 (1) a,f zu stützen ist dünn, wenn Dritte personenbezogene Daten einsehen.  
    Fix: Default feinere Geolokalisierung (z. B. H3-Zelle ~1 km), „genau“ nur Opt-in; Zweckbindung & Speicherfristen explizit; Verarbeitungsverzeichnis + Folgenabschätzung (DPIA) vorbereiten; klare Rollen (Verantwortlicher/Auftragsverarbeiter) benennen.
    
3. RoN-Anonymisierung: uneinheitlich & rechtlich schwach  
    Problem: Einmal 84 Tage genannt, anderswo „x Tage“. „Anonymisierung“ ist oft nur Pseudonymisierung (rückführbar über Graph).  
    Fix: Einheitliche Frist (z. B. 90 Tage), klar „Pseudonymisierung“ sagen; echte Anonymisierung nur nach geprüftem k-Anonymity/K-Degree im Graph; sonst RoN = Pseudonym.
    
4. Delegation: transitive Ja/Nein widersprüchlich  
    Problem: In einem Text ist transitive Delegation „später“, im anderen „jetzt schon möglich“.  
    Fix: Phase A: nur 1-Hop; Phase B (später): transitiv mit Zyklus-Detektion & Sichtbarkeit der Pfade. Beide Doks synchronisieren.
    
5. Moderation/„Legal Freeze“: Risiko der Weiterverbreitung  
    Problem: Eingeklappt, aber öffentlich abstimmen = Gefahr, dass strafbare Inhalte weiterverbreitet werden.  
    Fix: Bei Verdacht → sofortiger juristisch gesicherter Takedown-Hold (nicht sichtbar für Öffentlichkeit), nur befugter Kreis sieht Beweise. Öffentliches Meta-Ticket ohne Inhalt. Danach dokumentierter Entscheid.
    
6. „Keine Cookies/Tracking“ vs. technische Realität  
    Problem: Map-Tiles/Fonts/Analytics von Dritten können doch identifizierende Requests erzeugen.  
    Fix: Self-hosted Tiles/Fonts, keine externen CDNs; lokal Storage nur für strikt notwendige UI-Prefs, Privacy-Hinweis präzisieren.
    
7. Performanceziel unrealistisch formuliert  
    Problem: „Initial-Bundle ≤ 90 KB“ ist mit MapLibre GL & UI kaum erreichbar.  
    Fix: Ziele aufsplitten: „App-Shell ≤ 150 KB gzip“, „Karten-Chunk lazy-load“, „P95 API ≤ 300 ms“, „First Interaction ≤ 2.5 s 4G“.
    
8. Verzwirnung als Schreibschutz: Governance-Lücke  
    Problem: Eine Person könnte große Bereiche „verzwirnen“ und blockieren.  
    Fix: Rollen-basiertes Verzwirnen (z. B. min. 2 Bestätiger), Ablaufdatum, oder „Garn-Quorum“ (≥ N Bestätigungen) pro Knoten/Element.
    
9. Auto-Annahme (7+7) ohne Quorum  
    Problem: Antrag geht ohne Mindestbeteiligung durch → anfällig für „Nacht-Entscheide“.  
    Fix: Quorum (z. B. ≥ 10 % der aktiven Weber oder ≥ N Stimmen) + Sperrfrist bei Einwänden + Delegationsgewicht begrenzen.
    
10. Sicherheit/Beweissicherung nicht konkret  
    Problem: „gerichtsfest“ behauptet, aber keine Chain-of-Custody/Signaturdetails.  
    Fix: Ereignisse mit Ed25519 pro Nutzer signieren; Server-Seal (timestamp, hash-tree) + periodische Publikation (Transparency Log); klarer Forensik-Pfad.
    
11. Terminologie-Drift & Dopplungen  
    Problem: Knotenauflösung/Verzwirnung/Timer werden in den Dateien leicht unterschiedlich erklärt; RoN-Fristen differieren; Delegationsverfall vs. Inaktivitätsscanner nicht einheitlich.  
    Fix: Eine „Contract-Seite“ (Specs) als Single Source: Definitionen + Zustandsautomaten, aus der beide Texte generiert/abgeleitet werden.
    
12. Kontakt/Impressum: Volladresse + Tel. in Klartext  
    Problem: Scraping/Spam/Belästigung.  
    Fix: Mail via Tally/HEYSecurity-Form mit hCaptcha, Telefon optional, Adresse evtl. als Postfach — öffentliches Repo ≠ Impressumspflichtseite.
    

---

## Konkrete „Nächste Schritte“ (umsetzbar in <1 h)

- **Spec-Sync:** Eine `docs/specs/contract.md` anlegen: einheitliche Definitionen (RoN-Frist, Delegationsmodus, Timer, Verzwirn-Quorum). Beide vorhandenen Texte daran angleichen.
    
- **Privacy-Tuning:** In den Texten „Anonymisierung“ → „Pseudonymisierung (RoN)“ präzisieren; Geolokalisierung default grob; Cookies/3rd-Party präzise.
    
- **Governance-Parameter:** 7+7 mit **Quorum** & **Einspruchs-Sperrfrist** ergänzen; Verzwirn-Regeln (Quorum + Ablauf).
    
- **Security-Note:** kurzer Absatz zu Signaturen (Ed25519), Transparency-Log, Beweis-Pfad.
    
- **Performance-Ziele** realistisch splitten (App-Shell, Lazy Map).
    

Wenn du magst, schreibe ich dir daraus direkt einen Patch (Markdown-Änderungen + neue `contract.md`).

---

## Für Dummies (einfach gesagt)

- Du versprichst gleichzeitig „nichts geht je verloren“ und „jeder kann löschen“ → das beißt sich. Lösung: Wir markieren als gelöscht und machen den Inhalt unlesbar, statt die Spur zu tilgen.
    
- Transparenz ist top, aber Datenrecht will Schutz. Also Standort ungenau als Standard, echte Anonymität nur sagen, wenn sie wirklich irreversibel ist.
    
- Abstimmungen brauchen Mindestbeteiligung, sonst kann eine kleine Gruppe nachts Dinge durchwinken.
    
- „Alles veränderbar außer verzwirnt“ braucht Regeln, damit nicht einer alles einfriert.
    
- Karten-App super, aber 90 KB ist Wunschtraum; wir formulieren erreichbare Ziele.
    

---

## Essenz

Transparenz ja, aber sauber kontraktiert: **Löschen = tombstone**, **RoN = Pseudonym, konsistent geregelt**, **Quorum & Verzwirn-Governance**, **realistische Performanceziele**, **Privacy ohne Illusionen**. Dann hält Technik, Recht & UX zusammen.

---

## ∆-Radar

- Verstärkung: stärkere Formalisierung (Contract) statt Prosa; DSGVO-Präzisierung.
    
- Abweichung: „Anonymisierung“ → ehrlicher „Pseudonymisierung“-Begriff.
    
- Tendenz: Von Visionstext → implementierbare, prüfbare Regeln (Straffung).
    

---

## Unsicherheit (∴fores)

- Grad: ◼◼◼◻◻ (mittel)
    
- Ursachen: Ich habe nur die beiden Markdown-Quellen gesehen; Code/Workflows/UI nicht geprüft. Juristische Bewertung ist praxisnah, aber keine Rechtsberatung. RoN-Risiken im Graph sind kontextabhängig (Dichte, Communities).
    
- Produktivität: hoch (klärt Widersprüche vor Implementierung).