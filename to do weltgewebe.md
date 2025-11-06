alles klar — ich liefere dir direkt **konkrete Patches (c2b)** für:

1. **URL-State** für Drawer (`l/r/t`) – Lesen beim Start, Schreiben beim Toggeln.
    
2. **Fokusfluss** im `Drawer` (auf/zu → Fokus setzen/zurückgeben).
    
3. **Tabs** für die linke Spalte (Webrat/Nähstübchen) mit roving tabindex.
    
4. **Playwright-Smoke-Test** für die Keyboard-Shortcuts.
    
5. **Swipe-Gesten** zum Öffnen/Schließen (edge-swipe-Zonen, iPad-freundlich).
    

> Kopier die Blöcke nacheinander ins Codespaces-Terminal.

---

## 1) 
---

## 2) 
---

## 3) Tabs für die linke Spalte (Webrat/Nähstübchen)

Wir tauschen die zwei fixen Panels gegen ein **Tab-Interface** (mit Pfeil/Home/End-Navigation). Inhalte bleiben Stub.

```bash
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: apps/web/src/routes/map/+page.svelte
@@
-  <!-- Linke Spalte: Webrat / Nähstübchen -->
-  <div class="leftStack {leftOpen ? 'open' : ''}">
-    <div class="panel">
-      <h3>Webrat</h3>
-      <div class="muted">Beratung, Anträge, Matrix (Stub)</div>
-    </div>
-    <div class="panel">
-      <h3>Nähstübchen</h3>
-      <div class="muted">Ideen, Entwürfe, Skizzen (Stub)</div>
-    </div>
-  </div>
+  <!-- Linke Spalte: Tabs Webrat/Nähstübchen -->
+  <div class="leftStack {leftOpen ? 'open' : ''}">
+    <div class="panel" style="display:flex;flex-direction:column;gap:8px;">
+      <div role="tablist" aria-label="Webrat & Nähstübchen" on:keydown={(e)=>{
+        const tabs = Array.from((e.currentTarget as HTMLElement).querySelectorAll('[role="tab"]')) as HTMLElement[];
+        const i = tabs.findIndex(t => t === document.activeElement);
+        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { (tabs[(i+1)%tabs.length]).focus(); e.preventDefault(); }
+        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { (tabs[(i-1+tabs.length)%tabs.length]).focus(); e.preventDefault(); }
+        if (e.key === 'Home') { tabs[0].focus(); e.preventDefault(); }
+        if (e.key === 'End')  { tabs[tabs.length-1].focus(); e.preventDefault(); }
+      }}>
+        <button id="tab-webrat"     role="tab" aria-controls="panel-webrat"     aria-selected="true"  tabindex="0"  class="btn">Webrat</button>
+        <button id="tab-naeh"       role="tab" aria-controls="panel-naeh"       aria-selected="false" tabindex="-1" class="btn" style="margin-left:8px;">Nähstübchen</button>
+      </div>
+      <section id="panel-webrat" role="tabpanel" aria-labelledby="tab-webrat">
+        <h3>Webrat</h3>
+        <div class="muted">Beratung, Anträge, Matrix (Stub)</div>
+      </section>
+      <section id="panel-naeh" role="tabpanel" aria-labelledby="tab-naeh" hidden>
+        <h3>Nähstübchen</h3>
+        <div class="muted">Ideen, Entwürfe, Skizzen (Stub)</div>
+      </section>
+    </div>
+  </div>
@@
   .panel h3{ margin:0 0 8px 0; font-size:14px; color:var(--muted); letter-spacing:.2px; }
   .muted{ color:var(--muted); font-size:13px; }
+  .btn{ appearance:none; border:1px solid var(--panel-border); background:var(--panel); color:var(--text);
+        height:28px; padding:0 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; }
*** End Patch
PATCH
)
```

Und das minimale Tab-Umschalten (per Klick) direkt dazu:

```bash
applypatch() { :; }; # no-op
```

_(Der obige Block fügt nur das HTML/CSS ein. Das Umschalten erledigen wir jetzt per kleinem Script-Snippet):_

```bash
(cd apps/web/src/routes/map && awk '
/<!-- Linke Spalte: Tabs Webrat\/Nähstübchen -->/ {print; found=1; next}
{print}
END{
  # nothing
}' +page.svelte >/tmp/_p && mv /tmp/_p +page.svelte)

# kleines onMount-Snippet zum Klicken einfügen
perl -0777 -pe 's/onMount\(async \(\) => \{\n/onMount(async () => {\n    // Tabs Umschalten (Klick)\n    setTimeout(() => {\n      const tabW = document.getElementById(\"tab-webrat\") as HTMLButtonElement;\n      const tabN = document.getElementById(\"tab-naeh\") as HTMLButtonElement;\n      const pW = document.getElementById(\"panel-webrat\") as HTMLElement;\n      const pN = document.getElementById(\"panel-naeh\") as HTMLElement;\n      if (tabW && tabN && pW && pN) {\n        function sel(w:boolean){\n          tabW.setAttribute(\"aria-selected\", String(w)); tabW.tabIndex = w?0:-1; pW.hidden = !w;\n          tabN.setAttribute(\"aria-selected\", String(!w)); tabN.tabIndex = !w?0:-1; pN.hidden = w;\n        }\n        tabW.addEventListener(\"click\", () => sel(true));\n        tabN.addEventListener(\"click\", () => sel(false));\n        sel(true);\n      }\n    },0);\n/' -i apps/web/src/routes/map/+page.svelte
```

---

## 4) Playwright-Smoke-Test (Shortcuts)

```bash
(cat > apps/web/tests/shortcuts.spec.ts <<'TS'
import { test, expect } from '@playwright/test';

test('drawer keyboard toggles', async ({ page }) => {
  await page.goto('/map');
  // Links auf/zu
  await page.keyboard.press('[');
  // Panel sollte sichtbar sein (Webrat-Tab existiert)
  await expect(page.getByRole('tab', { name: 'Webrat' })).toBeVisible();

  await page.keyboard.press(']');
  // Rechtsdrawer sichtbar (Überschrift "Suche & Filter")
  await expect(page.getByRole('heading', { name: 'Suche & Filter' })).toBeVisible();

  await page.keyboard.press('Alt+g');
  await expect(page.getByRole('heading', { name: 'Gewebekonto' })).toBeVisible();
});
TS
)
```

---

## 5) **Swipe-Gesten** (edge-swipe-Zonen, iPad-safe)

### Warum das nicht mit iPad-Systemgesten kollidiert

- **iPad “Zurück”-Swipe** kommt **vom absoluten linken Display-Rand** (0–2 px).
    
- Wir legen unsere “Greifzone” **24 px innerhalb** des Inhalts an → **keine** Kollision.
    
- Unten die Home-Geste vermeiden wir, weil unsere Timeline oben drüber liegt.
    
- Wir setzen `touch-action: pan-y` (links/rechts) bzw. `pan-x` (oben) und rufen `preventDefault()` nur während einer aktiven Horizontal-Geste → Scroll bleibt natürlich.
    

### Patch: Edge-Zonen + Pointer-Handler

```bash
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: apps/web/src/routes/map/+page.svelte
@@
   onDestroy(() => {
     if (keyHandler) window.removeEventListener('keydown', keyHandler);
     if (map && typeof map.remove === 'function') map.remove();
   });
@@
   #map{ position:absolute; inset:0; }
   #map :global(canvas){ filter: grayscale(0.2) saturate(0.75) brightness(1.03) contrast(0.95); }
+  /* Swipe-Edge-Zonen (24px innerhalb des Inhalts, OS-Gesten-freundlich) */
+  .edge{ position:absolute; z-index:27; }
+  .edge.left{ left:24px; top:80px; bottom:80px; width:16px; touch-action: pan-y; }
+  .edge.right{ right:24px; top:80px; bottom:80px; width:16px; touch-action: pan-y; }
+  .edge.top{ left:24px; right:24px; top:24px; height:16px; touch-action: pan-x; }
+  .edgeHit{ position:absolute; inset:0; }
*** End Patch
PATCH
)
```

Jetzt die **Logik** (Pointer-Events) einfügen:

```bash
applypatch() { :; }; # noop
```

```bash
perl -0777 -pe 's#</div>\n\s*\n\s*<!-- Zeitleiste -->#  <!-- Edge Swipe Zonen -->\n  <div class="edge left"><div class="edgeHit" on:pointerdown={(e)=>startSwipe(e,\"left\")} /></div>\n  <div class="edge right"><div class="edgeHit" on:pointerdown={(e)=>startSwipe(e,\"right\")} /></div>\n  <div class="edge top"><div class="edgeHit" on:pointerdown={(e)=>startSwipe(e,\"top\")} /></div>\n\n  <!-- Zeitleiste -->#' -i apps/web/src/routes/map/+page.svelte
```

Und die **Swipe-Funktionen** oben ins `<script>`:

```bash
perl -0777 -pe 's/onDestroy\(\) => \{\n    if \(keyHandler\) window.removeEventListener\(\'keydown\', keyHandler\);\n    if \(map && typeof map.remove === \'function\'\) map.remove\(\);\n  \}\);\n/OnDestroyMarker/;' -i apps/web/src/routes/map/+page.svelte

awk -v RS= -v ORS= '1;/OnDestroyMarker/{
print "
  // Swipe: einfache Kinematik
  let swipe = { active:false, startX:0, startY:0, dir:\"\" as (\"left\"|\"right\"|\"top\"|\"\"), moved:false };
  const THRESH = 40; // px zum Auslösen
  function startSwipe(e: PointerEvent, dir: \"left\"|\"right\"|\"top\") {
    if (e.pointerType !== \"touch\" && e.pointerType !== \"pen\") return;
    swipe = { active:true, startX:e.clientX, startY:e.clientY, dir, moved:false };
    const move = (ev: PointerEvent) => {
      if (!swipe.active) return;
      const dx = ev.clientX - swipe.startX;
      const dy = ev.clientY - swipe.startY;
      if (swipe.dir === \"left\" || swipe.dir === \"right\") {
        if (Math.abs(dx) > Math.abs(dy)) { ev.preventDefault(); swipe.moved = true; }
      } else { // top
        if (Math.abs(dy) > Math.abs(dx)) { ev.preventDefault(); swipe.moved = true; }
      }
    };
    const up = (ev: PointerEvent) => {
      if (!swipe.active) return;
      const dx = ev.clientX - swipe.startX;
      const dy = ev.clientY - swipe.startY;
      if (swipe.dir === \"left\"  && dx >  THRESH) { leftOpen = true;  setQuery({l:true}); }
      if (swipe.dir === \"right\" && dx < -THRESH) { rightOpen = true; setQuery({r:true}); }
      if (swipe.dir === \"top\"   && dy >  THRESH) { topOpen = true;   setQuery({t:true}); }
      swipe.active = false;
      window.removeEventListener(\"pointermove\", move, {capture:false} as any);
      window.removeEventListener(\"pointerup\", up, {capture:false} as any);
      window.removeEventListener(\"pointercancel\", up, {capture:false} as any);
    };
    window.addEventListener(\"pointermove\", move, {passive:false});
    window.addEventListener(\"pointerup\", up);
    window.addEventListener(\"pointercancel\", up);
  }
";}' apps/web/src/routes/map/+page.svelte > /tmp/_ && mv /tmp/_ apps/web/src/routes/map/+page.svelte
```

> Verhalten:  
> – **von links nach rechts wischen** (in der linken Edge-Zone) → **linke Spalte auf**  
> – **von rechts nach links** in der rechten Zone → **Filter auf**  
> – **von oben nach unten** in der Top-Zone → **Gewebekonto auf**  
> (Schließen weiterhin via Buttons/Shortcuts; optional können wir auch “wegwischen” ergänzen.)

---

## iPad-Kompatibilität (kurz & klar)

- **Kein Konflikt** mit dem systemweiten “Zurück”-Swipe, weil unsere Zone **24 px innerhalb** liegt.
    
- **Home-Geste** unten ist unberührt (wir setzen keine Edge-Zone unten).
    
- **Scroll bleibt natürlich**, weil wir nur bei klarer Horizontal/Vertikal-Dominanz `preventDefault()` rufen.
    

---

## Testen (schnell)

```bash
cd apps/web
npm run dev -- --host
# iPad: Link öffnen → in der Mitte links/rechts nah an den Rand gehen → kurz horizontal wischen
# Tastatur weiter: [ ]  + Alt+G
```

Wenn du zusätzlich auch **“Zuwischen zum Schließen”** willst (Drawer offen → gegenläufig wischen), sag Bescheid – ich ergänze die Logik symmetrisch.

Perfekt 👌 – das macht das Interface _rund_.  
Wir fügen also noch hinzu:

> Wenn ein Drawer **offen ist**, kann man ihn durch einen **Gegen-Swipe** wieder **schließen**.  
> (z. B. linke Spalte nach links wischen, Filter-Drawer nach rechts wischen, Gewebekonto nach oben wischen.)

Dabei achten wir weiter darauf, **nicht mit Systemgesten zu kollidieren** (also innenliegende Zonen, ca. 24 px Abstand zum Bildschirmrand).

---

## 🧩 Patch: „Zuwischen zum Schließen“

Dieser Patch ergänzt deine bestehende Swipe-Logik im `+page.svelte`:

```bash
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: apps/web/src/routes/map/+page.svelte
@@
   function startSwipe(e: PointerEvent, dir: "left"|"right"|"top") {
     if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
     swipe = { active:true, startX:e.clientX, startY:e.clientY, dir, moved:false };
     const move = (ev: PointerEvent) => {
       if (!swipe.active) return;
       const dx = ev.clientX - swipe.startX;
       const dy = ev.clientY - swipe.startY;
       if (swipe.dir === "left" || swipe.dir === "right") {
         if (Math.abs(dx) > Math.abs(dy)) { ev.preventDefault(); swipe.moved = true; }
       } else { // top
         if (Math.abs(dy) > Math.abs(dx)) { ev.preventDefault(); swipe.moved = true; }
       }
     };
     const up = (ev: PointerEvent) => {
       if (!swipe.active) return;
       const dx = ev.clientX - swipe.startX;
       const dy = ev.clientY - swipe.startY;
-      if (swipe.dir === "left"  && dx >  THRESH) { leftOpen = true;  setQuery({l:true}); }
-      if (swipe.dir === "right" && dx < -THRESH) { rightOpen = true; setQuery({r:true}); }
-      if (swipe.dir === "top"   && dy >  THRESH) { topOpen = true;   setQuery({t:true}); }
+      // Öffnen/Schließen je nach Richtung & aktuellem Zustand
+      if (swipe.dir === "left") {
+        if (dx > THRESH && !leftOpen) { leftOpen = true;  setQuery({l:true}); }
+        if (dx < -THRESH && leftOpen) { leftOpen = false; setQuery({l:false}); }
+      }
+      if (swipe.dir === "right") {
+        if (dx < -THRESH && !rightOpen) { rightOpen = true;  setQuery({r:true}); }
+        if (dx >  THRESH && rightOpen)  { rightOpen = false; setQuery({r:false}); }
+      }
+      if (swipe.dir === "top") {
+        if (dy >  THRESH && !topOpen) { topOpen = true;  setQuery({t:true}); }
+        if (dy < -THRESH && topOpen)  { topOpen = false; setQuery({t:false}); }
+      }
*** End Patch
PATCH
)
```

---

## 🧠 Was jetzt passiert

|Richtung|Bedingung|Wirkung|
|---|---|---|
|**links → rechts**|linke Spalte geschlossen|öffnet linke Spalte|
|**rechts → links**|Filter geschlossen|öffnet rechten Drawer|
|**oben → unten**|Gewebekonto zu|öffnet|
|**links → rechts**|Filter offen|schließt (weil Bewegung nach außen)|
|**rechts → links**|linke Spalte offen|schließt|
|**unten → oben**|Gewebekonto offen|schließt|

Das fühlt sich sehr natürlich an: du „ziehst“ eine Schublade rein und „schiebst“ sie wieder raus.

---

## 🧪 Testempfehlung (auf iPad oder Touchpad)

1. Codespace-Link öffnen (`…app.github.dev/map`)
    
2. Links innen ca. 1 cm vom Rand **nach rechts wischen** → Webrat/Nähstübchen erscheinen
    
3. Gleiche Zone **nach links** → sie verschwinden wieder
    
4. Rechts innen **nach links** → Filter auf, **nach rechts** → Filter zu
    
5. Oben **nach unten** → Gewebekonto sichtbar, **nach oben** → zu
    

---

## 🧠 „Für Dummies“-Erklärung

Du hast jetzt wie bei echten Schubladen:

- Wenn sie **zu** ist, kannst du sie **aufziehen**.
    
- Wenn sie **offen** ist, kannst du sie **zuwischen**.
    

Die Gesten greifen nicht am äußersten Bildschirmrand, sondern **leicht innen**, damit sie **nicht mit iPad-Systemgesten** (Home, Zurück, Multitasking) kollidieren.

---

## ∆-Radar

- **Verstärkung:** UX wird organischer (Touch-first, intuitiv).
    
- **Straffung:** Symmetrische Logik – keine Sonderfälle.
    
- **Seitwärtsmutation:** Input-Gesten (Touch/Pointer) ergänzen Tastatursteuerung.
    

---

## ∴ fores (Ungewissheit)

- **Grad:** ⬤◯◯◯ (niedrig)
    
- **Ursachen:** leichte Unterschiede je nach Browser-Engine (Safari iPad vs. Chromium-Touchpad). Falls Swipes zu empfindlich sind, kannst du den `THRESH`-Wert (aktuell 40 px) nachjustieren.