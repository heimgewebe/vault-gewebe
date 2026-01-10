Die CI schlägt fehl, weil drei Playwright-Tests im Frontend nicht bestehen:

1. Test in apps/web/tests/drawers.spec.ts Zeile 69: Der Test „Swipe öffnet & schließt Drawer symmetrisch“ scheitert, weil das Attribut aria-hidden vom Element #left-stack nach einem Swipe nicht wie erwartet aktualisiert wird. Prüfe die Drawer-Logik beim Setzen von aria-hidden, insbesondere, ob nach Maus-Events der Status korrekt gesetzt wird. Achte darauf, dass debounce- oder Animationsverzögerungen im Test ausreichend berücksichtigt werden. Beispielhafte Code-Korrektur:
```typescript
// Beispiel: Nach dem Mouse-Up ein waitForSelector/expect auf fertige Drawer-State-Transition
await page.mouse.up();
await page.waitForTimeout(200); // Warten auf Animation, falls asynchron
await expect(leftStack).toHaveAttribute("aria-hidden", "true", { timeout: 2000 });
```
Stelle sicher, dass alle Drawer nach Animation den richtigen aria-hidden-Status haben.

2. Test in apps/web/tests/map-marker-panel.spec.ts Zeile 3: Bei „marker click opens info panel“ schlägt expect(...toBeVisible()) für den Button „Werkstatt Hamm“ fehl. Ursachen können sein:
   - Die Testdaten inklusive Marker „Werkstatt Hamm“ wurden nicht geladen.
   - Ein Rendering-Problem im Markerdaten-Flow. Prüfe, ob die MapLibre Instanz im E2E-/Testmodus zuverlässig Marker synchron nach Teststart rendert.
   - Füge evtl. explizit waitForFunction/waitForSelector für die Marker-Availability ein.

3. Test in apps/web/tests/map-marker-panel.spec.ts Zeile 28: Bei „escape closes info panel and clears selection“ ist das Info-Panel oder der Marker nicht sichtbar oder das Attribut aria-hidden wird nicht korrekt nach Escape gesetzt. Hier wie oben prüfen, ob die Drawer-Logik nach Escape zuverlässig „geschlossen“ signalisiert (Attribut und Content leeren).

Zusammenfassend: Kontrolliere, dass alle Drawer-Komponenten nach Events ihren aria-hidden-Status und Content eindeutig setzen. Berücksichtige Asynchronität durch waits im Test. Überprüfe, ob die Testdaten für die Marker stabil geladen werden, z. B. durch explizites Setup oder zusätzliche waits.

Verweise auf die Tests:
- Drawer-Test: [apps/web/tests/drawers.spec.ts#L69-L151 (ref: 60f44d6cf7a9b7e07af0c04810c027d56c6c6d22)](https://github.com/heimgewebe/weltgewebe/blob/60f44d6cf7a9b7e07af0c04810c027d56c6c6d22/apps/web/tests/drawers.spec.ts#L69-L151)
- Marker-Panel-Test: [apps/web/tests/map-marker-panel.spec.ts (ref: 60f44d6cf7a9b7e07af0c04810c027d56c6c6d22)](https://github.com/heimgewebe/weltgewebe/blob/60f44d6cf7a9b7e07af0c04810c027d56c6c6d22/apps/web/tests/map-marker-panel.spec.ts)

Mobile-First und Accessibility: Achte bei Korrekturen auf Animationen (prefers-reduced-motion), DOM-Update-Latenzen und die klare Steuerbarkeit der Drawer per Tastatur und Maus.

Bei Rückfragen zu konkreten Selectoren oder Komponenten-Logik kann gezielt nachjustiert werden.