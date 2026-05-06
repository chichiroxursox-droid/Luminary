# PARALLAX Visual Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PARALLAX from a strong-hero-but-flat-sections portfolio into a cohesive, award-site-quality cosmic experience with continuous 3D atmosphere, post-processing, scroll-driven transitions, and micro-interactions.

**Architecture:** Single shared `WebGLRenderer` with a pmndrs `postprocessing` EffectComposer pipeline. A persistent nebula background renders every frame behind all content. Each section activates/deactivates its Three.js scene. New systems (cursor, scroll nav, loader) are standalone ES modules imported by `main.js`.

**Tech Stack:** Three.js, pmndrs `postprocessing`, GSAP + ScrollTrigger, Lenis, Vite, vanilla JS ES modules, GLSL shaders.

**Spec:** `docs/superpowers/specs/2026-04-01-parallax-visual-upgrade.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/postprocessing.js` | EffectComposer wrapping the shared renderer. Exports `composer`, `renderPass`, and functions to swap scene/camera and update effect uniforms. |
| `src/sections/nebula.js` | Full-screen FBM noise shader quad with orthographic camera. Renders every frame. Color shifts by scroll progress. |
| `src/loader.js` | Loading overlay + choreographed intro sequence (progress bar, title wipe, sphere scale-in, rings sweep). |
| `src/cursor.js` | Custom circle cursor with lag, expand on interactive elements, hidden on touch. |
| `src/scrollnav.js` | 6-dot vertical scroll progress nav on right edge. Click to scroll via Lenis. |

### Modified Files

| File | Changes |
|------|---------|
| `package.json` | Add `postprocessing` dependency |
| `src/renderer.js` | Disable `autoClear` for multi-pass rendering, export renderer size helpers |
| `src/main.js` | Import all new modules, restructure render loop for nebula → section → composer pipeline, pass Lenis to modules that need velocity |
| `src/sections/hero.js` | Remove direct `renderer.render()`, export scene/camera for composer. Add `originPositions`/`targetPositions` for particle transition. Add scroll-velocity star streak uniform. |
| `src/sections/zoom.js` | Replace basic orange sphere with multi-layered volumetric sun shader. Add narrative text overlay. Remove direct `renderer.render()`. |
| `src/sections/contact.js` | Full redesign: remove WASD, add scroll-driven radial node reveal. Remove `lenis.stop()`. Keep asteroid field, node glow, label projection, email copy. |
| `src/sections/work.js` | Add thumbnail containers, hover parallax tilt, click-through links, active-card focus scaling. |
| `src/sections/services.js` | Add mouse proximity hover response to constellation items. |
| `src/sections/about.js` | Change stat counter ease to `back.out(1.5)` for overshoot. |
| `index.html` | Add loader overlay HTML, update contact section (remove WASD hints), add work card thumbnail containers, add scroll nav dots. |
| `src/style/base.css` | Remove CSS `body::after` grain overlay (moving to post-processing). |
| `src/style/sections.css` | Add loader styles, update contact styles, add work card thumbnail/hover styles, add cursor styles, add scroll nav styles. |

---

## Phase 1: Bloom + Nebula Background

### Task 1: Install postprocessing dependency

**Files:**
- Modify: `parallax/package.json`

- [ ] **Step 1: Install pmndrs postprocessing**

```bash
cd /Users/chichi/Desktop/CLAUDE\ CODE/Cool\ website\ animation/parallax
npm install postprocessing
```

Expected: `postprocessing` added to `dependencies` in package.json.

- [ ] **Step 2: Verify import works**

Create a temporary check — open the Vite dev server and confirm no errors:

```bash
cd /Users/chichi/Desktop/CLAUDE\ CODE/Cool\ website\ animation/parallax
npx vite --open
```

Check browser console for errors. Kill the server after verifying.

- [ ] **Step 3: Commit**

```bash
git add parallax/package.json parallax/package-lock.json
git commit -m "chore: add pmndrs postprocessing dependency"
```

---

### Task 2: Create EffectComposer pipeline

**Files:**
- Create: `parallax/src/postprocessing.js`
- Modify: `parallax/src/renderer.js`

- [ ] **Step 1: Update renderer to disable autoClear**

In `src/renderer.js`, add `renderer.autoClear = false;` after the existing setup. This allows the nebula to render first, then the active section scene on top without clearing the nebula.

```js
// Add after renderer.setClearColor(0x03040a, 1);
renderer.autoClear = false;
```

- [ ] **Step 2: Create postprocessing.js with EffectComposer + Bloom**

Create `src/postprocessing.js`:

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect } from 'postprocessing';
import renderer from './renderer.js';

// Bloom — subtle, only brightest pixels
const bloom = new BloomEffect({
  luminanceThreshold: 0.85,
  luminanceSmoothing: 0.3,
  intensity: 0.6,
  radius: 0.4,
  mipmapBlur: true,
});

// Start with a dummy scene/camera — swapped per frame by main.js
const composer = new EffectComposer(renderer, {
  frameBufferType: undefined, // use default
});

// RenderPass will be reconfigured each frame
const renderPass = new RenderPass(null, null);
const bloomPass = new EffectPass(null, bloom);

composer.addPass(renderPass);
composer.addPass(bloomPass);

// Resize handler
function resizeComposer() {
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resizeComposer);

/**
 * Set the scene and camera for the current frame's render.
 * Called by main.js before composer.render().
 */
function setComposerScene(scene, camera) {
  renderPass.mainScene = scene;
  renderPass.mainCamera = camera;
  bloomPass.mainCamera = camera;
}

export { composer, setComposerScene, bloom };
```

- [ ] **Step 3: Verify in browser**

Run `npx vite` and check console — no errors. The composer isn't wired into the render loop yet, so visually nothing changes. Just confirming the import chain works.

- [ ] **Step 4: Commit**

```bash
git add parallax/src/postprocessing.js parallax/src/renderer.js
git commit -m "feat: add EffectComposer pipeline with bloom effect"
```

---

### Task 3: Wire composer into the render loop

**Files:**
- Modify: `parallax/src/main.js`
- Modify: `parallax/src/sections/hero.js`
- Modify: `parallax/src/sections/zoom.js`
- Modify: `parallax/src/sections/contact.js`

- [ ] **Step 1: Remove renderer.render() from hero.js**

In `hero.js`, remove the `renderer.render(scene, camera);` line at the end of `animate()`. Instead, the animate function just updates uniforms/positions — rendering is done by the composer in main.js.

Replace line 306:
```js
renderer.render(scene, camera);
```
with nothing — just delete the line. Also remove the `import renderer from '../renderer.js';` at line 4 since it's no longer used in this file.

The `animate()` function now just updates state. The `scene` and `camera` exports let main.js route rendering through the composer.

- [ ] **Step 2: Remove renderer.render() from zoom.js**

In `zoom.js`, remove `renderer.render(scene, camera);` from `animate()` (line 80). Remove `import renderer from '../renderer.js';` (line 4).

- [ ] **Step 3: Remove renderer.render() from contact.js**

In `contact.js`, remove `renderer.render(scene, camera);` from `animate()` (line 207). Remove `import renderer from '../renderer.js';` (line 4).

- [ ] **Step 4: Add visibility exports from each section**

Each section needs to export whether it's active so main.js knows which scene to render.

**hero.js** — already has `heroVisible`. Add to exports:
```js
export { scene, camera, animate, playIntro, initHeroScroll, heroVisible };
```
Wait — `heroVisible` is a `let` variable, so exporting it directly won't track changes. Instead, export a getter function:
```js
function isHeroVisible() { return heroVisible; }
export { scene, camera, animate, playIntro, initHeroScroll, isHeroVisible };
```

**zoom.js** — already has `isActive`. Add getter:
```js
function isZoomActive() { return isActive; }
export { scene, camera, animate, initZoom, isZoomActive };
```

**contact.js** — already has `isActive`. Add getter:
```js
function isContactActive() { return isActive; }
export { scene, camera, animate, initContact, isContactActive };
```

- [ ] **Step 5: Restructure main.js render loop to use composer**

Replace the `tick()` function in `main.js` with a new render loop that:
1. Clears the renderer
2. Calls each section's animate (which updates state only)
3. Determines the active 3D section
4. Routes its scene/camera through the composer

```js
import { composer, setComposerScene } from './postprocessing.js';
import { scene as heroScene, camera as heroCamera, animate as heroAnimate, playIntro as heroIntro, initHeroScroll, isHeroVisible } from './sections/hero.js';
import { scene as zoomScene, camera as zoomCamera, animate as zoomAnimate, initZoom, isZoomActive } from './sections/zoom.js';
import { scene as contactScene, camera as contactCamera, animate as contactAnimate, initContact, isContactActive } from './sections/contact.js';

// ... existing lenis + init code stays the same ...

// ── Render Loop ──
function tick() {
  // Update all section state (no rendering happens inside these)
  heroAnimate();
  zoomAnimate();
  contactAnimate();

  // Determine which 3D scene is active and render through composer
  renderer.clear();

  if (isContactActive()) {
    setComposerScene(contactScene, contactCamera);
  } else if (isZoomActive()) {
    setComposerScene(zoomScene, zoomCamera);
  } else if (isHeroVisible()) {
    setComposerScene(heroScene, heroCamera);
  } else {
    // No 3D scene active (about/work/services) — still render through
    // composer with hero scene to keep bloom consistent, but hero animate
    // already returns early so the scene is frozen
    setComposerScene(heroScene, heroCamera);
  }

  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

Also add `import renderer from './renderer.js';` to main.js if not already there (it is — line 8).

- [ ] **Step 6: Verify bloom effect in browser**

Run `npx vite`. The hero sphere's bright rim and star cores should now have a soft bloom glow. The effect should be subtle — not washed out. Check zoom and contact sections still render correctly.

- [ ] **Step 7: Commit**

```bash
git add parallax/src/main.js parallax/src/sections/hero.js parallax/src/sections/zoom.js parallax/src/sections/contact.js
git commit -m "feat: route all 3D rendering through EffectComposer with bloom"
```

---

### Task 4: Create persistent nebula background

**Files:**
- Create: `parallax/src/sections/nebula.js`
- Modify: `parallax/src/main.js`

- [ ] **Step 1: Create nebula.js with FBM noise shader**

Create `src/sections/nebula.js`:

```js
import * as THREE from 'three';

// Orthographic camera for full-screen quad
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const scene = new THREE.Scene();

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uScrollY: { value: 0 },
    uOpacity: { value: 1.0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uScrollY;
    uniform float uOpacity;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Hash and noise functions for FBM
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // FBM with domain warping
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 6; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / uResolution.y;
      uv.x *= aspect;

      float t = uTime * 0.03; // Very slow drift

      // Domain warping for organic cloud shapes
      vec3 q = vec3(uv, t);
      float warp1 = fbm(q + vec3(1.7, 9.2, 0.0));
      float warp2 = fbm(q + vec3(8.3, 2.8, 0.0));
      float f = fbm(q + vec3(warp1 * 1.5, warp2 * 1.5, 0.0));

      // Scroll-driven color mapping
      float scroll = uScrollY; // 0.0 to 1.0

      // Color stops: violet/cyan → navy → blue-violet → warm orange → amber → dark cyan
      vec3 deepViolet = vec3(0.15, 0.05, 0.3);
      vec3 cyan = vec3(0.0, 0.6, 0.7);
      vec3 navy = vec3(0.02, 0.03, 0.12);
      vec3 blueViolet = vec3(0.2, 0.1, 0.4);
      vec3 warmOrange = vec3(0.6, 0.25, 0.05);
      vec3 amber = vec3(0.5, 0.4, 0.05);
      vec3 darkCyan = vec3(0.02, 0.08, 0.1);

      vec3 nebulaColor;
      if (scroll < 0.12) {
        nebulaColor = mix(deepViolet, cyan, f * 0.5 + 0.3);
      } else if (scroll < 0.30) {
        float t2 = (scroll - 0.12) / 0.18;
        vec3 heroColor = mix(deepViolet, cyan, f * 0.5 + 0.3);
        nebulaColor = mix(heroColor, navy, t2);
      } else if (scroll < 0.55) {
        float t2 = (scroll - 0.30) / 0.25;
        nebulaColor = mix(navy, blueViolet, t2 * f);
      } else if (scroll < 0.72) {
        float t2 = (scroll - 0.55) / 0.17;
        nebulaColor = mix(blueViolet, warmOrange, t2) * (f * 0.5 + 0.5);
      } else if (scroll < 0.88) {
        float t2 = (scroll - 0.72) / 0.16;
        nebulaColor = mix(warmOrange, amber, t2) * (f * 0.5 + 0.5);
      } else {
        float t2 = (scroll - 0.88) / 0.12;
        nebulaColor = mix(amber, darkCyan, t2) * (f * 0.3 + 0.2);
      }

      // Cloud density — brighten peaks, darken valleys
      float density = smoothstep(-0.2, 0.6, f) * 0.35;

      vec3 color = nebulaColor * density;

      gl_FragColor = vec4(color, uOpacity);
    }
  `,
  transparent: true,
  depthWrite: false,
});

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

// Resize handler
window.addEventListener('resize', () => {
  material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

function updateNebula(time, scrollProgress) {
  material.uniforms.uTime.value = time;
  material.uniforms.uScrollY.value = scrollProgress;
}

export { scene, camera, updateNebula };
```

- [ ] **Step 2: Integrate nebula into main.js render loop**

In `main.js`, import the nebula and render it first every frame:

```js
import { scene as nebulaScene, camera as nebulaCamera, updateNebula } from './sections/nebula.js';
```

Update the `tick()` function — nebula renders first, then the active section through the composer:

```js
function tick() {
  heroAnimate();
  zoomAnimate();
  contactAnimate();

  // Global scroll progress for nebula
  const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);

  // Update nebula uniforms
  const elapsed = performance.now() / 1000;
  updateNebula(elapsed, scrollProgress);

  // Clear, render nebula first (behind everything)
  renderer.clear();
  renderer.render(nebulaScene, nebulaCamera);

  // Then render active section through composer (autoClear is off)
  if (isContactActive()) {
    setComposerScene(contactScene, contactCamera);
  } else if (isZoomActive()) {
    setComposerScene(zoomScene, zoomCamera);
  } else if (isHeroVisible()) {
    setComposerScene(heroScene, heroCamera);
  } else {
    setComposerScene(heroScene, heroCamera);
  }

  composer.render();
  requestAnimationFrame(tick);
}
```

- [ ] **Step 3: Verify nebula renders in browser**

Run `npx vite`. You should see slowly drifting violet/cyan gas clouds behind the hero. Scroll down — the nebula should shift through the color stops (navy in about, warm in services, etc.). The hero sphere and stars render on top.

- [ ] **Step 4: Commit**

```bash
git add parallax/src/sections/nebula.js parallax/src/main.js
git commit -m "feat: add persistent FBM nebula background with scroll-driven color shifts"
```

---

## Phase 2: Contact Redesign + Loading Sequence

### Task 5: Redesign contact section — scroll-driven radial reveal

**Files:**
- Modify: `parallax/src/sections/contact.js` (heavy rewrite)
- Modify: `parallax/index.html`
- Modify: `parallax/src/style/sections.css`

- [ ] **Step 1: Update contact HTML — remove WASD hints**

In `index.html`, replace the contact section (lines 122-138) with:

```html
<!-- §6 Contact -->
<section id="contact" class="section" data-section="contact">
  <h2 class="contact-heading">Get In Touch</h2>
</section>
```

Remove the `.contact-back`, `.contact-hint`, `.key-row`, `.key` divs. The contact nodes and labels will be created by JS (they already are — CSS labels projected from 3D positions).

- [ ] **Step 2: Update sections.css — replace contact styles**

Remove all existing contact CSS (`.contact-back`, `.contact-hint`, `.contact-hint-inner`, `.key-row`, `.key`, `.contact-hint-text`, `.contact-hint-sub` and the mobile overrides for `.key` and `.contact-hint-text`).

Add new contact styles:

```css
/* ── §6 Contact ── */
#contact {
  position: relative;
  height: 150vh;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-heading {
  font-size: clamp(2rem, 5vw, 3rem);
  color: var(--cyan);
  text-shadow: 0 0 30px rgba(0, 245, 255, 0.25);
  text-align: center;
  opacity: 0;
}
```

- [ ] **Step 3: Rewrite contact.js — scroll-driven radial reveal**

Replace `contact.js` entirely:

```js
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 0, 15);

// Ambient light
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

// ── Asteroids (kept from original) ──
const asteroidGeo = new THREE.DodecahedronGeometry(0.4, 0);
const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });

for (let i = 0; i < 40; i++) {
  const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
  asteroid.position.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 60
  );
  asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  asteroid.scale.setScalar(0.5 + Math.random() * 1.5);
  scene.add(asteroid);
}

// ── Contact Nodes — radial constellation ──
const contactData = [
  { label: 'Email (click to copy)', url: '#', angle: 0, email: 'hello@example.com' },
  { label: 'GitHub', url: 'https://github.com', angle: Math.PI * 0.4 },
  { label: 'LinkedIn', url: 'https://linkedin.com', angle: Math.PI * 0.8 },
  { label: 'Twitter / X', url: 'https://x.com', angle: Math.PI * 1.2 },
  { label: "Let's build →", url: 'mailto:hello@example.com', angle: Math.PI * 1.6 },
];

const nodes = [];
const nodeGroup = new THREE.Group();
const RADIUS = 5; // Final distance from center

// Center point
const centerGeo = new THREE.SphereGeometry(0.15, 16, 16);
const centerMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.5 });
const centerSphere = new THREE.Mesh(centerGeo, centerMat);
nodeGroup.add(centerSphere);

contactData.forEach((data) => {
  // Final position (radial)
  const fx = Math.cos(data.angle) * RADIUS;
  const fy = Math.sin(data.angle) * RADIUS;

  // Start position (scattered far)
  const sx = (Math.random() - 0.5) * 40;
  const sy = (Math.random() - 0.5) * 30;
  const sz = (Math.random() - 0.5) * 20;

  // Glowing sphere
  const geo = new THREE.SphereGeometry(0.25, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(sx, sy, sz);
  nodeGroup.add(mesh);

  // Trailing line back to center
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(sx, sy, sz),
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.3 });
  const line = new THREE.Line(lineGeo, lineMat);
  nodeGroup.add(line);

  // Point light for glow
  const light = new THREE.PointLight(0x00f5ff, 0.3, 8);
  light.position.copy(mesh.position);
  nodeGroup.add(light);

  nodes.push({
    mesh, light, line, lineGeo, data,
    start: new THREE.Vector3(sx, sy, sz),
    end: new THREE.Vector3(fx, fy, 0),
    baseIntensity: 0.3,
  });
});

scene.add(nodeGroup);

// ── CSS Labels ──
const labelContainer = document.createElement('div');
labelContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10;';
document.body.appendChild(labelContainer);

const labelEls = contactData.map((data) => {
  const el = document.createElement('a');
  el.href = data.url;
  el.target = '_blank';
  el.textContent = data.label;
  el.style.cssText = `
    position:absolute; color:#00f5ff; font-family:'JetBrains Mono',monospace;
    font-size:1rem; font-weight:500; letter-spacing:0.1em; text-decoration:none;
    pointer-events:auto; cursor:pointer; opacity:0; transition:opacity 0.3s;
    text-shadow: 0 0 20px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.3);
    background: rgba(0,245,255,0.08); padding: 6px 14px; border-radius: 6px;
    border: 1px solid rgba(0,245,255,0.15);
  `;
  if (data.email) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(data.email).then(() => {
        const original = el.textContent;
        el.textContent = 'Copied!';
        setTimeout(() => { el.textContent = original; }, 1500);
      });
    });
  }
  labelContainer.appendChild(el);
  return el;
});

// ── State ──
let isActive = false;
let contactProgress = 0;

// ── Scroll-driven node animation ──
function updateNodes(progress) {
  nodes.forEach((node, i) => {
    // Staggered entrance: each node starts 0.05 later
    const stagger = i * 0.05;
    const nodeProgress = THREE.MathUtils.clamp((progress - stagger) / (0.5 - stagger), 0, 1);

    // Elastic-ish ease
    const eased = nodeProgress < 1
      ? 1 - Math.pow(1 - nodeProgress, 3) * Math.cos(nodeProgress * Math.PI * 1.5)
      : 1;

    // Lerp position
    const pos = new THREE.Vector3().lerpVectors(node.start, node.end, eased);
    node.mesh.position.copy(pos);
    node.light.position.copy(pos);

    // Update trailing line
    const linePositions = node.lineGeo.attributes.position.array;
    linePositions[3] = pos.x;
    linePositions[4] = pos.y;
    linePositions[5] = pos.z;
    node.lineGeo.attributes.position.needsUpdate = true;

    // Glow intensity ramps with progress
    node.light.intensity = node.baseIntensity + eased * 2;
    node.mesh.scale.setScalar(0.25 + eased * 0.15);
  });
}

function updateLabels() {
  nodes.forEach((node, i) => {
    const pos = node.mesh.position.clone().project(camera);
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

    const el = labelEls[i];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = 'translate(-50%, -50%)';

    // Fade in labels after nodes have mostly arrived
    el.style.opacity = isActive && contactProgress > 0.3 ? Math.min(1, (contactProgress - 0.3) / 0.3) : 0;
  });
}

// ── ScrollTrigger ──
function initContact() {
  // Heading fade-in
  gsap.to('.contact-heading', {
    opacity: 1,
    scrollTrigger: {
      trigger: '#contact',
      start: 'top 60%',
      end: 'top 30%',
      scrub: true,
    },
  });

  ScrollTrigger.create({
    trigger: '#contact',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      contactProgress = self.progress;
      isActive = self.isActive;
      updateNodes(self.progress);
    },
    onEnter: () => { isActive = true; },
    onLeave: () => { isActive = false; },
    onLeaveBack: () => { isActive = false; },
  });
}

function animate() {
  if (!isActive) return;
  updateLabels();
}

function isContactActive() { return isActive; }

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

export { scene, camera, animate, initContact, isContactActive };
```

- [ ] **Step 4: Update main.js import — remove lenis parameter**

The old `initContact(lenis)` passed the Lenis instance. The new version doesn't need it. Change to:

```js
initContact();
```

- [ ] **Step 5: Verify in browser**

Run `npx vite`. Scroll to contact section. Nodes should fly in from scattered positions to form a radial constellation. Labels should fade in after nodes arrive. Email click should still copy to clipboard. No WASD controls, no scroll locking.

- [ ] **Step 6: Commit**

```bash
git add parallax/index.html parallax/src/sections/contact.js parallax/src/style/sections.css parallax/src/main.js
git commit -m "feat: redesign contact section with scroll-driven radial node reveal"
```

---

### Task 6: Loading / intro sequence

**Files:**
- Create: `parallax/src/loader.js`
- Modify: `parallax/index.html`
- Modify: `parallax/src/style/sections.css`
- Modify: `parallax/src/main.js`
- Modify: `parallax/src/sections/hero.js`

- [ ] **Step 1: Add loader HTML overlay to index.html**

Add immediately after `<body>`:

```html
<!-- Loader -->
<div id="loader" class="loader-overlay">
  <div class="loader-bar-track">
    <div class="loader-bar-fill" id="loaderBar"></div>
  </div>
</div>
```

- [ ] **Step 2: Add loader CSS to sections.css**

Add at the top of sections.css (before hero styles):

```css
/* ── Loader ── */
.loader-overlay {
  position: fixed;
  inset: 0;
  background: var(--void);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loader-bar-track {
  width: 200px;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 1px;
  overflow: hidden;
}

.loader-bar-fill {
  width: 0%;
  height: 100%;
  background: var(--cyan);
  border-radius: 1px;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.4);
  transition: width 0.3s ease-out;
}
```

- [ ] **Step 3: Create loader.js**

```js
import { gsap } from 'gsap';

/**
 * Runs the loading + intro sequence.
 * Returns a promise that resolves when the sequence is complete.
 */
export function runLoader() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('loader');
    const bar = document.getElementById('loaderBar');

    if (!overlay || !bar) {
      resolve();
      return;
    }

    // Simulate progress (fonts + WebGL context are already loaded by the time
    // main.js runs, so this is primarily a visual beat)
    const tl = gsap.timeline({
      onComplete: () => {
        overlay.remove();
        resolve();
      },
    });

    // Bar fills up
    tl.to(bar, { width: '100%', duration: 1.2, ease: 'power2.inOut' });

    // Bar dissolves (shrink height + fade)
    tl.to(bar, { opacity: 0, height: 0, duration: 0.3, ease: 'power2.in' }, '+=0.2');
    tl.to(overlay.querySelector('.loader-bar-track'), { opacity: 0, duration: 0.3 }, '<');

    // Fade out overlay
    tl.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in' });
  });
}
```

- [ ] **Step 4: Upgrade hero.js playIntro for choreographed entrance**

Replace the existing `playIntro()` function in hero.js with a richer sequence. The sphere, rings, stars, and text all animate in with staggered timing:

```js
function playIntro() {
  // Start sphere at scale 0
  sphere.scale.setScalar(0);
  ring.material.opacity = 0;
  ring2.material.opacity = 0;
  starMat.opacity = 0;

  const tl = gsap.timeline();

  // Title clip-path wipe (CSS)
  tl.fromTo('.hero-title',
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.inOut' },
    0
  );

  // Sphere scales in with elastic ease
  tl.to(sphere.scale, {
    x: 1, y: 1, z: 1,
    duration: 1.2,
    ease: 'elastic.out(1, 0.5)',
  }, 0.3);

  // Rings sweep in
  tl.to(ring.material, { opacity: 0.25, duration: 0.6 }, 0.5);
  tl.to(ring2.material, { opacity: 0.15, duration: 0.6 }, 0.7);

  // Stars fade in
  tl.to(starMat, { opacity: 0.8, duration: 1.0 }, 0.3);

  // Tagline and hint fade in at end
  tl.to('.hero-tagline', { opacity: 1, duration: 1.2 }, 0.8);
  tl.to('.hero-hint', { opacity: 0.6, duration: 1, delay: 0.4 }, 0.8);
}
```

- [ ] **Step 5: Wire loader into main.js**

In main.js, import the loader and run it before the hero intro:

```js
import { runLoader } from './loader.js';

// After all inits, run loader then hero intro
runLoader().then(() => {
  heroIntro();
});
```

Remove the existing bare `heroIntro();` call at the bottom.

- [ ] **Step 6: Verify in browser**

Run `npx vite`. On page load: black screen with cyan progress bar → bar fills → fades → PARALLAX title wipes in → sphere scales in elastically → rings sweep → stars fade in → tagline appears.

- [ ] **Step 7: Commit**

```bash
git add parallax/src/loader.js parallax/src/sections/hero.js parallax/index.html parallax/src/style/sections.css parallax/src/main.js
git commit -m "feat: add loading sequence with choreographed hero entrance"
```

---

## Phase 3: Volumetric Sun + Work Card Upgrades

### Task 7: Replace basic orange star with volumetric sun

**Files:**
- Modify: `parallax/src/sections/zoom.js` (heavy rewrite)

- [ ] **Step 1: Rewrite zoom.js with multi-layered shader sun**

Replace `zoom.js` entirely:

```js
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 100;

// ── Stars ──
const starCount = 2000;
const starGeo = new THREE.BufferGeometry();
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 400;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xe8eaf0, size: 0.4, sizeAttenuation: true });
scene.add(new THREE.Points(starGeo, starMat));

// ── Volumetric Sun ──
const sunGroup = new THREE.Group();
sunGroup.position.set(0, 0, -500);
scene.add(sunGroup);

// Layer 1: Core — emissive gradient
const coreMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float fresnel = pow(1.0 - abs(dot(normalize(vPosition), vNormal)), 1.5);
      vec3 core = mix(vec3(0.6, 0.2, 0.0), vec3(1.0, 0.95, 0.8), fresnel);
      core += vec3(0.3, 0.15, 0.0) * sin(uTime * 2.0 + vPosition.y * 5.0) * 0.2;
      gl_FragColor = vec4(core, 1.0);
    }
  `,
});
const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), coreMat);
sunGroup.add(coreSphere);

// Layer 2: Chromosphere — noise-displaced surface
const chromoMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    varying vec3 vNormal;

    // Simple noise
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      float disp = noise(pos * 3.0 + uTime * 0.5) * 0.3;
      pos += normal * disp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vec3(0.0, 0.0, 1.0), vNormal)), 2.0);
      vec3 color = vec3(1.0, 0.4, 0.05) * (0.6 + fresnel * 0.8);
      gl_FragColor = vec4(color, 0.7);
    }
  `,
  transparent: true,
});
const chromoSphere = new THREE.Mesh(new THREE.SphereGeometry(2.3, 32, 32), chromoMat);
sunGroup.add(chromoSphere);

// Layer 3: Corona — BackSide, additive blending
const coronaMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0.2 },
  },
  vertexShader: `
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      float disp = noise(pos * 1.5 + uTime * 0.3) * 1.5;
      pos += normal * disp;
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float fresnel = pow(1.0 - abs(dot(normalize(vPosition), vNormal)), 3.0);
      vec3 color = vec3(1.0, 0.5, 0.1) * fresnel * uIntensity;
      gl_FragColor = vec4(color, fresnel * 0.5);
    }
  `,
  transparent: true,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const coronaSphere = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), coronaMat);
sunGroup.add(coronaSphere);

// Layer 4: Flare rings
const flareMat1 = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    uniform float uTime;
    varying float vDisp;
    void main() {
      vec3 pos = position;
      float wave = sin(pos.x * 8.0 + uTime * 3.0) * 0.15;
      pos += normal * wave;
      vDisp = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vDisp;
    void main() {
      vec3 color = vec3(1.0, 0.5, 0.1) * (0.5 + abs(vDisp) * 3.0);
      gl_FragColor = vec4(color, 0.3);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const flareRing1 = new THREE.Mesh(new THREE.TorusGeometry(4, 0.05, 8, 128), flareMat1);
flareRing1.rotation.x = Math.PI * 0.5;
flareRing1.visible = false;
sunGroup.add(flareRing1);

const flareRing2 = flareRing1.clone();
flareRing2.material = flareMat1.clone();
flareRing2.rotation.z = Math.PI * 0.3;
flareRing2.visible = false;
sunGroup.add(flareRing2);

// White flash overlay
const flashEl = document.createElement('div');
flashEl.style.cssText = 'position:fixed;inset:0;background:white;opacity:0;pointer-events:none;z-index:100;';
document.body.appendChild(flashEl);

// ── Narrative text overlay ──
const narrativeEl = document.createElement('div');
narrativeEl.textContent = 'Every project starts as a spark';
narrativeEl.style.cssText = `
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(1);
  font-family:'Space Grotesk',sans-serif; font-size:clamp(1.2rem,3vw,2rem);
  font-weight:300; color:#e8eaf0; letter-spacing:0.05em; pointer-events:none;
  z-index:50; opacity:0; text-align:center; white-space:nowrap;
  text-shadow: 0 0 30px rgba(255,180,50,0.3);
`;
document.body.appendChild(narrativeEl);

// State
let zoomProgress = 0;
let isActive = false;

function initZoom() {
  ScrollTrigger.create({
    trigger: '#zoom',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate: (self) => {
      zoomProgress = self.progress;
      isActive = self.isActive;

      // Camera flies toward the sun
      camera.position.z = 100 - zoomProgress * 600;

      // Sun grows
      const scale = 1 + zoomProgress * 40;
      sunGroup.scale.setScalar(scale);

      // Corona intensity ramps
      coronaMat.uniforms.uIntensity.value = 0.2 + zoomProgress * 2.8;

      // Flare rings visible after 0.3, more turbulent approaching 0.9
      flareRing1.visible = zoomProgress > 0.3;
      flareRing2.visible = zoomProgress > 0.3;

      // Narrative text: visible 0.4-0.7
      if (zoomProgress >= 0.4 && zoomProgress <= 0.8) {
        const textProgress = (zoomProgress - 0.4) / 0.4;
        narrativeEl.style.opacity = textProgress < 0.75 ? Math.min(1, textProgress / 0.2) : Math.max(0, (1 - textProgress) / 0.25);
        narrativeEl.style.transform = `translate(-50%,-50%) scale(${1 + textProgress * 0.3})`;
      } else {
        narrativeEl.style.opacity = 0;
      }

      // Flash at the end
      if (zoomProgress > 0.9) {
        flashEl.style.opacity = Math.min(1, (zoomProgress - 0.9) / 0.1);
      } else {
        flashEl.style.opacity = 0;
      }
    },
    onLeave: () => {
      gsap.to(flashEl, { opacity: 0, duration: 0.4 });
    },
  });
}

function animate() {
  if (!isActive) return;
  const t = performance.now() / 1000;
  coreMat.uniforms.uTime.value = t;
  chromoMat.uniforms.uTime.value = t;
  coronaMat.uniforms.uTime.value = t;
  flareMat1.uniforms.uTime.value = t;
  if (flareRing2.material.uniforms) flareRing2.material.uniforms.uTime.value = t;
}

function isZoomActive() { return isActive; }

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

export { scene, camera, animate, initZoom, isZoomActive };
```

- [ ] **Step 2: Verify volumetric sun in browser**

Run `npx vite`. Scroll to the zoom section. The orange sphere should now be a multi-layered sun with a glowing core, displaced chromosphere, corona with irregular shape, and flare rings appearing after 30% progress. Narrative text "Every project starts as a spark" should appear at 40-70% progress.

- [ ] **Step 3: Commit**

```bash
git add parallax/src/sections/zoom.js
git commit -m "feat: replace basic orange star with multi-layered volumetric shader sun"
```

---

### Task 8: Work card visual upgrades

**Files:**
- Modify: `parallax/index.html`
- Modify: `parallax/src/style/sections.css`
- Modify: `parallax/src/sections/work.js`

- [ ] **Step 1: Update work card HTML with thumbnails and links**

In `index.html`, replace the work-track contents:

```html
<div class="work-track">
  <a class="work-card" data-project="1" data-accent="var(--cyan)" href="#" target="_blank">
    <div class="work-card-thumb">
      <div class="work-card-placeholder" style="--accent: var(--cyan)"></div>
    </div>
    <span class="label">01 / Website</span>
    <h3>LUMINARY</h3>
    <p>Bioluminescent scroll-driven animation experience</p>
    <span class="work-year">2025</span>
  </a>
  <a class="work-card" data-project="2" data-accent="var(--violet)" href="#" target="_blank">
    <div class="work-card-thumb">
      <div class="work-card-placeholder" style="--accent: var(--violet)"></div>
    </div>
    <span class="label">02 / Website</span>
    <h3>BOREAL</h3>
    <p>Aurora borealis science journey with live data HUD</p>
    <span class="work-year">2025</span>
  </a>
  <a class="work-card" data-project="3" data-accent="var(--flare)" href="#" target="_blank">
    <div class="work-card-thumb">
      <div class="work-card-placeholder" style="--accent: var(--flare)"></div>
    </div>
    <span class="label">03 / Experience</span>
    <h3>PARALLAX</h3>
    <p>Cosmic portfolio — the site you're on right now</p>
    <span class="work-year">2025</span>
  </a>
  <div class="work-card" data-project="4" data-accent="var(--muted)">
    <div class="work-card-thumb">
      <div class="work-card-placeholder" style="--accent: var(--muted)"></div>
    </div>
    <span class="label">04 / Coming Soon</span>
    <h3>MORE COMING</h3>
    <p>Building never stops ↓</p>
    <span class="work-year">2025+</span>
  </div>
</div>
```

- [ ] **Step 2: Add work card thumbnail + hover styles to sections.css**

Add to the existing work card CSS:

```css
.work-card {
  flex-shrink: 0;
  width: 35vw;
  min-width: 300px;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(4px);
  transition: border-color 0.4s, transform 0.4s, box-shadow 0.4s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.work-card:hover {
  border-color: var(--cyan);
  transform: translateY(-8px);
  box-shadow: 0 0 30px rgba(0, 245, 255, 0.15);
}

.work-card-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  position: relative;
}

.work-card-thumb img,
.work-card-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-card-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--accent, var(--cyan)), var(--void));
  background-size: 200% 200%;
  animation: placeholder-drift 4s ease-in-out infinite;
}

@keyframes placeholder-drift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

- [ ] **Step 3: Add hover parallax tilt and active-card focus to work.js**

Add to `initWork()` after the existing card animation code:

```js
// Hover parallax tilt
cards.forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.querySelector('.work-card-thumb').style.transform =
      `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    const thumb = card.querySelector('.work-card-thumb');
    if (thumb) thumb.style.transform = '';
  });
});

// Active card focus — nearest viewport center gets emphasis
function updateActiveCard() {
  const centerX = window.innerWidth / 2;
  let closestCard = null;
  let closestDist = Infinity;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.left + rect.width / 2;
    const dist = Math.abs(cardCenter - centerX);
    if (dist < closestDist) {
      closestDist = dist;
      closestCard = card;
    }
  });

  cards.forEach((card) => {
    if (card === closestCard) {
      card.style.transform = card.matches(':hover') ? '' : 'scale(1.02)';
      card.style.opacity = '1';
    } else {
      card.style.transform = '';
      card.style.opacity = '0.6';
    }
  });
}

// Run on scroll within the work section
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: () => `+=${totalScroll}`,
  onUpdate: updateActiveCard,
});
```

- [ ] **Step 4: Verify in browser**

Run `npx vite`. Work cards should have animated gradient thumbnails, hover elevates + border glow, mouse tilt on thumbnail area, and the card nearest center has focus emphasis.

- [ ] **Step 5: Commit**

```bash
git add parallax/index.html parallax/src/style/sections.css parallax/src/sections/work.js
git commit -m "feat: upgrade work cards with thumbnails, hover tilt, and active focus"
```

---

## Phase 4: Particle Transitions + Micro-Interactions

### Task 9: Hero → About particle transition

**Files:**
- Modify: `parallax/src/sections/hero.js`

- [ ] **Step 1: Add target positions and transition uniform to hero stars**

In hero.js, after creating the star positions array, create a `targetPositions` array where stars are pushed to viewport edges:

```js
// Target positions: dispersed wide for About section background
const targetPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  // Push to edges, wider spread
  const angle = Math.random() * Math.PI * 2;
  const radius = 100 + Math.random() * 300;
  targetPositions[i * 3] = Math.cos(angle) * radius;
  targetPositions[i * 3 + 1] = Math.sin(angle) * radius;
  targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
}

starGeo.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
```

Replace the PointsMaterial with a ShaderMaterial that lerps between origin and target:

```js
const starShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTransition: { value: 0 },
    uColor: { value: new THREE.Color(0xe8eaf0) },
    uOpacity: { value: 0.8 },
  },
  vertexShader: `
    attribute vec3 targetPosition;
    attribute float aSize;
    uniform float uTransition;
    void main() {
      vec3 pos = mix(position, targetPosition, uTransition);
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uOpacity;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.2, dist) * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
});

const stars = new THREE.Points(starGeo, starShaderMat);
scene.add(stars);
```

Remove the old `starMat` PointsMaterial.

- [ ] **Step 2: Add ScrollTrigger to drive the transition**

In `initHeroScroll()`, add a ScrollTrigger that lerps the transition uniform:

```js
// Star particle transition: hero → about
ScrollTrigger.create({
  trigger: '#about',
  start: 'top bottom',
  end: 'top center',
  scrub: true,
  onUpdate: (self) => {
    starShaderMat.uniforms.uTransition.value = self.progress;
  },
});
```

Also update the `heroVisible` trigger — don't hide the hero scene when transitioning. Keep stars visible through about by adjusting:

```js
ScrollTrigger.create({
  trigger: '#about',
  start: 'top bottom',
  onEnter: () => { /* don't hide — stars still visible */ },
  onLeaveBack: () => { heroVisible = true; },
});

// Only hide when work section starts
ScrollTrigger.create({
  trigger: '#work',
  start: 'top bottom',
  onEnter: () => { heroVisible = false; },
  onLeaveBack: () => { heroVisible = true; },
});
```

- [ ] **Step 3: Update intro sequence references**

In `playIntro()`, update references from `starMat` to `starShaderMat`:

```js
starShaderMat.uniforms.uOpacity.value = 0;
// ...
tl.to(starShaderMat.uniforms.uOpacity, { value: 0.8, duration: 1.0 }, 0.3);
```

- [ ] **Step 4: Verify in browser**

Run `npx vite`. Scroll from hero to about — stars should smoothly morph from their sphere distribution to a dispersed ambient field. They stay visible behind the about text, creating continuity.

- [ ] **Step 5: Commit**

```bash
git add parallax/src/sections/hero.js
git commit -m "feat: add hero→about star particle transition with position lerp"
```

---

### Task 10: Stat counter overshoot

**Files:**
- Modify: `parallax/src/sections/about.js`

- [ ] **Step 1: Change stat counter ease**

In `about.js`, change the stat counter `ease` from `'power1.out'` to `'back.out(1.5)'` (line 42):

```js
ease: 'back.out(1.5)',
```

- [ ] **Step 2: Verify overshoot in browser**

Run `npx vite`. Scroll to about section. Number counters should overshoot their target briefly then settle.

- [ ] **Step 3: Commit**

```bash
git add parallax/src/sections/about.js
git commit -m "feat: add overshoot ease to stat counter animations"
```

---

### Task 11: Custom cursor

**Files:**
- Create: `parallax/src/cursor.js`
- Modify: `parallax/src/style/sections.css`
- Modify: `parallax/src/main.js`

- [ ] **Step 1: Add cursor CSS**

Add to sections.css:

```css
/* ── Custom Cursor ── */
.custom-cursor {
  position: fixed;
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--cyan);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s, border-color 0.3s, background 0.3s;
  mix-blend-mode: difference;
}

.custom-cursor.expanded {
  width: 40px;
  height: 40px;
}

/* Hide on touch devices */
@media (hover: none) and (pointer: coarse) {
  .custom-cursor { display: none; }
}
```

Also add `cursor: none;` to the `body` rule in base.css (only for non-touch):

```css
@media (hover: hover) {
  body { cursor: none; }
  a, button, [role="button"] { cursor: none; }
}
```

- [ ] **Step 2: Create cursor.js**

```js
const cursor = document.createElement('div');
cursor.className = 'custom-cursor';
document.body.appendChild(cursor);

let cx = 0, cy = 0; // current
let tx = 0, ty = 0; // target

document.addEventListener('mousemove', (e) => {
  tx = e.clientX;
  ty = e.clientY;
});

// Expand on interactive elements
document.addEventListener('mouseover', (e) => {
  if (e.target.closest('a, button, .work-card, [role="button"]')) {
    cursor.classList.add('expanded');
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.closest('a, button, .work-card, [role="button"]')) {
    cursor.classList.remove('expanded');
  }
});

function updateCursor() {
  cx += (tx - cx) * 0.15;
  cy += (ty - cy) * 0.15;
  cursor.style.left = `${cx}px`;
  cursor.style.top = `${cy}px`;
}

export { updateCursor };
```

- [ ] **Step 3: Wire cursor into main.js render loop**

```js
import { updateCursor } from './cursor.js';

// In tick():
function tick() {
  updateCursor();
  // ... rest of render loop
}
```

- [ ] **Step 4: Verify in browser**

Run `npx vite`. Custom circle cursor follows mouse with slight lag. Expands on links and work cards. Hidden on mobile.

- [ ] **Step 5: Commit**

```bash
git add parallax/src/cursor.js parallax/src/style/sections.css parallax/src/style/base.css parallax/src/main.js
git commit -m "feat: add custom circle cursor with lag and interactive expansion"
```

---

### Task 12: Scroll progress nav

**Files:**
- Create: `parallax/src/scrollnav.js`
- Modify: `parallax/src/style/sections.css`
- Modify: `parallax/src/main.js`

- [ ] **Step 1: Add scroll nav CSS**

Add to sections.css:

```css
/* ── Scroll Progress Nav ── */
.scroll-nav {
  position: fixed;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  z-index: 100;
}

.scroll-nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
  opacity: 0.3;
  cursor: pointer;
  position: relative;
  transition: opacity 0.3s, background 0.3s, box-shadow 0.3s;
}

.scroll-nav-dot.active {
  background: var(--cyan);
  opacity: 1;
  box-shadow: 0 0 12px rgba(0, 245, 255, 0.5);
}

.scroll-nav-dot:hover::after {
  content: attr(data-label);
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--starlight);
  letter-spacing: 0.08em;
  white-space: nowrap;
  background: rgba(3, 4, 10, 0.8);
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .scroll-nav { display: none; }
}
```

- [ ] **Step 2: Create scrollnav.js**

```js
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const sections = [
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
];

let lenisRef = null;

function initScrollNav(lenis) {
  lenisRef = lenis;

  const nav = document.createElement('nav');
  nav.className = 'scroll-nav';
  nav.setAttribute('aria-label', 'Section navigation');

  const dots = sections.map((s) => {
    const dot = document.createElement('div');
    dot.className = 'scroll-nav-dot';
    dot.dataset.label = s.label;
    dot.addEventListener('click', () => {
      if (lenisRef) lenisRef.scrollTo(`#${s.id}`);
    });
    nav.appendChild(dot);
    return dot;
  });

  document.body.appendChild(nav);

  // Track active section
  sections.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: `#${s.id}`,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setActive(i),
      onEnterBack: () => setActive(i),
    });
  });

  function setActive(index) {
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }
}

export { initScrollNav };
```

- [ ] **Step 3: Wire into main.js**

```js
import { initScrollNav } from './scrollnav.js';

// After all other inits:
initScrollNav(lenis);
```

- [ ] **Step 4: Verify in browser**

Run `npx vite`. 6 dots on right edge. Active dot glows cyan. Hover shows section label. Click scrolls to section.

- [ ] **Step 5: Commit**

```bash
git add parallax/src/scrollnav.js parallax/src/style/sections.css parallax/src/main.js
git commit -m "feat: add scroll progress navigation dots"
```

---

### Task 13: Services constellation hover response

**Files:**
- Modify: `parallax/src/sections/services.js`

- [ ] **Step 1: Add mouse proximity response**

Add to `initServices()`, after the existing animation code:

```js
// Constellation hover response
document.addEventListener('mousemove', (e) => {
  items.forEach((item) => {
    const dot = item.querySelector('.constellation-dot');
    const label = item.querySelector('.constellation-label');
    if (!dot || !label) return;

    const rect = item.getBoundingClientRect();
    const itemCenterX = rect.left + rect.width / 2;
    const itemCenterY = rect.top + rect.height / 2;
    const dist = Math.sqrt(
      Math.pow(e.clientX - itemCenterX, 2) +
      Math.pow(e.clientY - itemCenterY, 2)
    );

    const maxDist = 200;
    const proximity = Math.max(0, 1 - dist / maxDist);

    // Dot brightens
    dot.style.boxShadow = `0 0 ${16 + proximity * 20}px var(--amber), 0 0 ${40 + proximity * 40}px rgba(255, 180, 50, ${0.3 + proximity * 0.4})`;

    // Label shifts toward cursor
    const dx = (e.clientX - itemCenterX) / maxDist;
    label.style.transform = `translateX(${dx * 4 * proximity}px)`;
  });
});
```

- [ ] **Step 2: Verify in browser**

Run `npx vite`. Scroll to services. Move mouse near constellation items — dots brighten, labels shift toward cursor.

- [ ] **Step 3: Commit**

```bash
git add parallax/src/sections/services.js
git commit -m "feat: add mouse proximity hover response to services constellation"
```

---

## Phase 5: Chromatic Aberration + Film Grain

### Task 14: Add chromatic aberration and noise to post-processing

**Files:**
- Modify: `parallax/src/postprocessing.js`
- Modify: `parallax/src/main.js`
- Modify: `parallax/src/style/base.css`

- [ ] **Step 1: Remove CSS film grain from base.css**

In `base.css`, remove the `body::after` rule (lines 57-65) that creates the SVG noise overlay. This effect will now be handled by the post-processing pipeline.

- [ ] **Step 2: Add ChromaticAberration and Noise effects to postprocessing.js**

Update `postprocessing.js` to add the new effects:

```js
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, ChromaticAberrationEffect, NoiseEffect,
  BlendFunction
} from 'postprocessing';
import * as THREE from 'three';
import renderer from './renderer.js';

// Bloom
const bloom = new BloomEffect({
  luminanceThreshold: 0.85,
  luminanceSmoothing: 0.3,
  intensity: 0.6,
  radius: 0.4,
  mipmapBlur: true,
});

// Chromatic aberration — controlled by scroll velocity
const chromaticAberration = new ChromaticAberrationEffect({
  offset: new THREE.Vector2(0, 0),
  radialModulation: false,
  modulationOffset: 0.0,
});

// Film grain
const noise = new NoiseEffect({
  blendFunction: BlendFunction.OVERLAY,
  premultiply: true,
});
noise.blendMode.opacity.value = 0.04;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(null, null);
const bloomPass = new EffectPass(null, bloom);
const fxPass = new EffectPass(null, chromaticAberration, noise);

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(fxPass);

function resizeComposer() {
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resizeComposer);

function setComposerScene(scene, camera) {
  renderPass.mainScene = scene;
  renderPass.mainCamera = camera;
  bloomPass.mainCamera = camera;
  fxPass.mainCamera = camera;
}

/**
 * Update chromatic aberration based on Lenis scroll velocity.
 * Called each frame from main.js.
 */
function updateScrollEffects(velocity) {
  const absVel = Math.abs(velocity);
  // Only kicks in above velocity 3.0, max offset at velocity 8.0
  const intensity = THREE.MathUtils.clamp((absVel - 3) / 5, 0, 1);
  const offset = intensity * 0.003; // up to 3px equivalent
  chromaticAberration.offset.set(offset, offset * 0.5);
}

export { composer, setComposerScene, bloom, updateScrollEffects };
```

- [ ] **Step 3: Wire velocity into main.js**

In `main.js`, pass Lenis velocity to the post-processing each frame:

```js
import { composer, setComposerScene, updateScrollEffects } from './postprocessing.js';

// In tick():
function tick() {
  updateCursor();
  heroAnimate();
  zoomAnimate();
  contactAnimate();

  // Update post-processing effects with scroll velocity
  updateScrollEffects(lenis.velocity);

  // ... rest of render loop (nebula, composer, etc.)
}
```

- [ ] **Step 4: Verify in browser**

Run `npx vite`. Fast scrolling should produce subtle RGB channel offset. Film grain should be visible as a subtle noise overlay at all times. The old CSS grain overlay should be gone.

- [ ] **Step 5: Commit**

```bash
git add parallax/src/postprocessing.js parallax/src/style/base.css parallax/src/main.js
git commit -m "feat: add chromatic aberration on scroll velocity + film grain post-processing"
```

---

### Task 15: 3D constellation for services (Phase 5B)

**Files:**
- Modify: `parallax/src/sections/services.js` (heavy rewrite)
- Modify: `parallax/index.html`
- Modify: `parallax/src/style/sections.css`
- Modify: `parallax/src/main.js`

- [ ] **Step 1: Update services HTML — simplify to label containers**

In `index.html`, replace the services `.constellation` div content. Keep the outer structure but remove SVG lines and CSS dots — those will be 3D:

```html
<div class="constellation">
  <div class="constellation-item" data-service="1">
    <div class="constellation-text">
      <span class="constellation-label">AI-Powered Websites</span>
      <span class="constellation-desc">Sites that think, adapt, and respond</span>
    </div>
  </div>
  <div class="constellation-item" data-service="2">
    <div class="constellation-text">
      <span class="constellation-label">Interactive Experiences</span>
      <span class="constellation-desc">WebGL, 3D, and immersive storytelling</span>
    </div>
  </div>
  <div class="constellation-item" data-service="3">
    <div class="constellation-text">
      <span class="constellation-label">Creative Development</span>
      <span class="constellation-desc">From concept to pixel-perfect reality</span>
    </div>
  </div>
  <div class="constellation-item" data-service="4">
    <div class="constellation-text">
      <span class="constellation-label">Rapid Prototyping</span>
      <span class="constellation-desc">Ideas to working demos in days</span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Remove old constellation CSS for dots, lines, index**

In `sections.css`, remove the `.constellation-index`, `.constellation-dot`, `.constellation-line`, and `@keyframes dot-glow-pulse` rules. Keep `.constellation`, `.constellation-item`, `.constellation-text`, `.constellation-label`, `.constellation-desc`.

Update `.constellation-item` to position absolutely (labels will be projected from 3D):

```css
.constellation-item {
  position: absolute;
  opacity: 0;
  pointer-events: auto;
}
```

Update `.services-content` to be the projection container:

```css
.services-content {
  max-width: 100%;
  width: 100%;
  height: 100%;
  padding: 0;
  position: relative;
}
```

- [ ] **Step 3: Rewrite services.js with Three.js constellation**

```js
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

// 4 nodes in 3D space with Z-depth variation
const nodeData = [
  { pos: [-3, 2, -2], label: 0 },
  { pos: [3.5, 1, 3], label: 1 },
  { pos: [-2, -2, 5], label: 2 },
  { pos: [4, -1.5, -3], label: 3 },
];

const nodeGroup = new THREE.Group();
const nodes = [];

nodeData.forEach((data) => {
  // Glowing amber sphere
  const geo = new THREE.SphereGeometry(0.15, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xc8b800 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...data.pos);
  nodeGroup.add(mesh);

  // Point light
  const light = new THREE.PointLight(0xc8b800, 1, 8);
  light.position.copy(mesh.position);
  nodeGroup.add(light);

  nodes.push({ mesh, light, data });
});

// Connecting lines between nodes (in order)
const lineMeshes = [];
for (let i = 0; i < nodes.length - 1; i++) {
  const points = [nodes[i].mesh.position, nodes[i + 1].mesh.position];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xc8b800, transparent: true, opacity: 0.4 });
  const line = new THREE.Line(geo, mat);
  // Start hidden — draw range reveals on scroll
  line.geometry.setDrawRange(0, 0);
  nodeGroup.add(line);
  lineMeshes.push(line);
}

scene.add(nodeGroup);

// State
let isActive = false;
let serviceProgress = 0;

// ── Project labels to screen ──
function updateLabels() {
  const items = document.querySelectorAll('.constellation-item');
  nodes.forEach((node, i) => {
    const item = items[i];
    if (!item) return;

    const pos = node.mesh.position.clone().project(camera);
    const x = (pos.x * 0.5 + 0.5) * 100; // percentage
    const y = (-pos.y * 0.5 + 0.5) * 100;

    item.style.left = `${x}%`;
    item.style.top = `${y}%`;
    item.style.transform = 'translate(-50%, -50%)';
    item.style.opacity = isActive ? Math.min(1, serviceProgress * 3) : 0;
  });
}

// ── Mouse parallax tilt ──
const mouse = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

function initServices() {
  // Heading fade-in
  gsap.to('.services-heading', {
    opacity: 1,
    scrollTrigger: {
      trigger: '#services',
      start: 'top 60%',
      end: 'top 30%',
      scrub: true,
    },
  });

  ScrollTrigger.create({
    trigger: '#services',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      serviceProgress = self.progress;
      isActive = self.isActive;

      // Reveal lines via draw range
      lineMeshes.forEach((line) => {
        const vertexCount = Math.floor(self.progress * 2 * 2); // 2 vertices per line
        line.geometry.setDrawRange(0, vertexCount);
      });
    },
    onEnter: () => { isActive = true; },
    onLeave: () => { isActive = false; },
    onLeaveBack: () => { isActive = false; },
  });
}

function animate() {
  if (!isActive) return;

  // Mouse parallax tilt
  nodeGroup.rotation.y += (mouse.x * 0.1 - nodeGroup.rotation.y) * 0.05;
  nodeGroup.rotation.x += (-mouse.y * 0.05 - nodeGroup.rotation.x) * 0.05;

  updateLabels();
}

function isServicesActive() { return isActive; }

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

export { scene, camera, animate, initServices, isServicesActive };
```

- [ ] **Step 4: Wire services 3D scene into main.js**

Import the services scene/camera and add it to the render loop:

```js
import { scene as servicesScene, camera as servicesCamera, animate as servicesAnimate, initServices, isServicesActive } from './sections/services.js';
```

Add `servicesAnimate()` to the tick function, and add services to the scene routing:

```js
servicesAnimate();

// In the scene routing:
if (isContactActive()) {
  setComposerScene(contactScene, contactCamera);
} else if (isServicesActive()) {
  setComposerScene(servicesScene, servicesCamera);
} else if (isZoomActive()) {
  setComposerScene(zoomScene, zoomCamera);
} else {
  setComposerScene(heroScene, heroCamera);
}
```

- [ ] **Step 5: Verify in browser**

Run `npx vite`. Scroll to services section. 4 amber glowing nodes in 3D space with connecting lines that draw in. Labels projected from 3D positions. Mouse movement tilts the constellation. The nebula provides the warm amber atmosphere behind.

- [ ] **Step 6: Commit**

```bash
git add parallax/src/sections/services.js parallax/index.html parallax/src/style/sections.css parallax/src/main.js
git commit -m "feat: convert services constellation to 3D Three.js scene with projected labels"
```

---

### Task 16: Final integration — complete main.js

**Files:**
- Modify: `parallax/src/main.js`

- [ ] **Step 1: Write the final complete main.js**

This step consolidates all the incremental changes into a clean, final version:

```js
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './style/base.css';
import './style/sections.css';

import renderer from './renderer.js';
import { composer, setComposerScene, updateScrollEffects } from './postprocessing.js';
import { scene as nebulaScene, camera as nebulaCamera, updateNebula } from './sections/nebula.js';
import { scene as heroScene, camera as heroCamera, animate as heroAnimate, playIntro as heroIntro, initHeroScroll, isHeroVisible } from './sections/hero.js';
import { initAbout } from './sections/about.js';
import { initWork } from './sections/work.js';
import { scene as zoomScene, camera as zoomCamera, animate as zoomAnimate, initZoom, isZoomActive } from './sections/zoom.js';
import { scene as servicesScene, camera as servicesCamera, animate as servicesAnimate, initServices, isServicesActive } from './sections/services.js';
import { scene as contactScene, camera as contactCamera, animate as contactAnimate, initContact, isContactActive } from './sections/contact.js';
import { runLoader } from './loader.js';
import { updateCursor } from './cursor.js';
import { initScrollNav } from './scrollnav.js';

gsap.registerPlugin(ScrollTrigger);

// ── Lenis ──
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ── Init Sections ──
initHeroScroll();
initAbout();
initWork();
initZoom();
initServices();
initContact();
initScrollNav(lenis);

// ── Render Loop ──
function tick() {
  updateCursor();

  // Update section state (no rendering inside these)
  heroAnimate();
  zoomAnimate();
  servicesAnimate();
  contactAnimate();

  // Post-processing scroll effects
  updateScrollEffects(lenis.velocity);

  // Global scroll progress for nebula
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  const elapsed = performance.now() / 1000;
  updateNebula(elapsed, scrollProgress);

  // Clear and render nebula first
  renderer.clear();
  renderer.render(nebulaScene, nebulaCamera);

  // Determine active 3D scene, render through composer
  if (isContactActive()) {
    setComposerScene(contactScene, contactCamera);
  } else if (isServicesActive()) {
    setComposerScene(servicesScene, servicesCamera);
  } else if (isZoomActive()) {
    setComposerScene(zoomScene, zoomCamera);
  } else {
    setComposerScene(heroScene, heroCamera);
  }

  composer.render();
  requestAnimationFrame(tick);
}

// ── Start ──
runLoader().then(() => {
  heroIntro();
  requestAnimationFrame(tick);
});
```

- [ ] **Step 2: Verify everything works end-to-end**

Run `npx vite`. Full walkthrough:
1. Loader sequence plays, then hero intro with sphere/rings/stars
2. Nebula visible behind all sections, color-shifting on scroll
3. Hero sphere has bloom glow
4. Stars morph from sphere to dispersed field when scrolling to About
5. Stat counters overshoot
6. Work cards have thumbnails, hover tilt, active focus
7. Zoom section has volumetric sun with narrative text
8. Services constellation responds to mouse proximity
9. Contact nodes fly in radially on scroll
10. Custom cursor follows with lag, expands on interactive elements
11. Scroll nav dots track active section
12. Fast scrolling produces chromatic aberration
13. Subtle film grain visible throughout

- [ ] **Step 3: Commit**

```bash
git add parallax/src/main.js
git commit -m "feat: final main.js integration — all 5 phases wired together"
```

---

### Task 17: Final cleanup and performance check

**Files:**
- All files — review pass

- [ ] **Step 1: Remove any unused imports or dead code**

Review each modified file for:
- Unused imports (especially `renderer` in section files after removing direct render calls)
- Orphaned CSS selectors from old contact section
- Any `console.log` statements

- [ ] **Step 2: Check renderer.info for draw call budget**

Add a temporary dev check in the tick function:

```js
if (Math.random() < 0.01) console.log('Draw calls:', renderer.info.render.calls);
```

Run the site and check — should be under 50 draw calls per frame. Remove the debug line after checking.

- [ ] **Step 3: Test mobile responsiveness**

Open Chrome DevTools, toggle mobile viewport. Verify:
- Custom cursor is hidden
- Scroll nav is hidden
- Contact section works via scroll (no WASD dependency)
- All sections render correctly

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused code and verify performance budget"
```
