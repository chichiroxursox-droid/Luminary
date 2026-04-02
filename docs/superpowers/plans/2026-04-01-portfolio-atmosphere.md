# Portfolio Atmosphere & Visuals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the portfolio's flat blue sky and green slab into a golden-hour scene with procedural sky, rolling terrain, firefly particles, subtle depth of field, and emissive interior glow.

**Architecture:** Five independent visual upgrades layered onto the existing Three.js portfolio. Each task modifies 1-2 files and can be verified visually in isolation. The existing module API contracts (init/update/export signatures) remain unchanged.

**Tech Stack:** Three.js 0.183 (Sky addon, BokehPass, ShaderMaterial), Vite dev server, GSAP (existing)

**Spec:** `docs/superpowers/specs/2026-04-01-portfolio-atmosphere-design.md`

---

## File Structure

```
portfolio/src/
├── sky.js           # NEW — Three.js Sky addon, sun position, scene background
├── main.js          # MODIFY — import sky, swap AmbientLight→HemisphereLight, add BokehPass, warm fog/exposure
├── environment.js   # MODIFY — displaced terrain, vertex colors, decorative props, warm tree colors
├── particles.js     # MODIFY — firefly behavior with ShaderMaterial, sinusoidal motion, size-based flicker
├── house.js         # MODIFY — clone materials, set emissive colors, ramp intensity with door progress
├── scroll.js        # UNCHANGED
├── state.js         # UNCHANGED
├── computer.js      # UNCHANGED
├── explore.js       # UNCHANGED
├── character.js     # UNCHANGED
├── chat.js          # UNCHANGED
└── debug.js         # UNCHANGED
portfolio/styles/
└── main.css         # MODIFY — background color from #87CEEB to #E8B87A
```

---

### Task 1: Golden Hour Sky

**Files:**
- Create: `portfolio/src/sky.js`
- Modify: `portfolio/src/main.js:1-67` (imports, renderer, scene, lights)
- Modify: `portfolio/src/main.js:144-153` (init function — call initSky)
- Modify: `portfolio/src/main.js:190-207` (render loop — debug params for hemiLight)
- Modify: `portfolio/src/debug.js:23-24` (rename ambientIntensity → hemiIntensity)
- Modify: `portfolio/styles/main.css:9` (background color)

- [ ] **Step 1: Create `portfolio/src/sky.js`**

```js
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

let sunPosition = new THREE.Vector3();

/**
 * Create a procedural golden-hour sky and set it as the scene background.
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @returns {{ sunPosition: THREE.Vector3 }}
 */
export function initSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(450000);

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = 4;
  uniforms['rayleigh'].value = 2;
  uniforms['mieCoefficient'].value = 0.005;
  uniforms['mieDirectionalG'].value = 0.8;

  // Sun at ~10° elevation for golden hour
  const phi = THREE.MathUtils.degToRad(90 - 10);
  const theta = THREE.MathUtils.degToRad(220);
  sunPosition.setFromSphericalCoords(1, phi, theta);
  uniforms['sunPosition'].value.copy(sunPosition);

  // Render sky into an environment map for scene background
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const renderTarget = pmremGenerator.fromScene(skyScene);
  scene.background = renderTarget.texture;
  scene.environment = renderTarget.texture;
  pmremGenerator.dispose();

  return { sunPosition };
}

/**
 * Get the sun direction vector (unit length) for aligning DirectionalLight.
 */
export function getSunPosition() {
  return sunPosition;
}
```

- [ ] **Step 2: Update `portfolio/src/main.js` — imports and renderer**

Replace the existing import block and renderer/scene/light setup. The changes are:

At the top, add the sky import after the debug import:

```js
import { initSky, getSunPosition } from './sky.js';
```

Change `renderer.setClearColor` and `toneMappingExposure`:

```js
renderer.setClearColor(0xE8B87A);
```

```js
renderer.toneMappingExposure = 1.3;
```

- [ ] **Step 3: Update `portfolio/src/main.js` — scene and lights**

Remove the scene background line and update fog color:

```js
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE8B87A, params.fog.near, params.fog.far);
```

Replace the AmbientLight with a HemisphereLight:

```js
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xE8B87A, 0.6);
scene.add(hemiLight);
```

Update the params object — rename `ambientIntensity` to `hemiIntensity`:

```js
const params = {
  bloom: { strength: 0.3, radius: 0.5, threshold: 0.7 },
  fog: { near: 25, far: 80 },
  particles: { count: 200, speed: 0.002 },
  light: { sunIntensity: 1.5, hemiIntensity: 0.6 },
};
```

- [ ] **Step 4: Update `portfolio/src/main.js` — init function**

Add `initSky` call at the start of `init()` and sync the sun light direction:

```js
async function init() {
  const { sunPosition } = initSky(scene, renderer);
  sunLight.position.copy(sunPosition).multiplyScalar(10);

  await Promise.all([
    initHouse(scene),
    initCharacter(scene),
  ]);
  initEnvironment(scene);
  initParticles(scene, params);
  initComputer(scene, camera);
  initExplore(scene, camera, renderer);
  initChat();

  // Wire menu buttons
  document.getElementById('btn-work')?.addEventListener('click', () => transitionTo(STATES.COMPUTER));
  document.getElementById('btn-explore')?.addEventListener('click', () => transitionTo(STATES.EXPLORING));
  document.getElementById('btn-chat')?.addEventListener('click', () => transitionTo(STATES.CHATTING));

  // Wire back buttons
  document.getElementById('btn-back-computer')?.addEventListener('click', () => transitionTo(STATES.MENU));
  document.getElementById('btn-back-explore')?.addEventListener('click', () => transitionTo(STATES.MENU));
  document.getElementById('btn-close-chat')?.addEventListener('click', () => transitionTo(STATES.MENU));

  // Escape key returns to menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const state = getState();
      if (state === STATES.COMPUTER || state === STATES.EXPLORING || state === STATES.CHATTING) {
        transitionTo(STATES.MENU);
      }
    }
  });
}
```

- [ ] **Step 5: Update `portfolio/src/main.js` — render loop**

In the `animate()` function, change the debug param sync from `ambientLight` to `hemiLight`:

```js
  hemiLight.intensity = params.light.hemiIntensity;
  sunLight.intensity = params.light.sunIntensity;
```

- [ ] **Step 6: Update `portfolio/src/debug.js` — rename param binding**

In `initDebug`, line 24, change:

```js
  light.addBinding(params.light, 'hemiIntensity', { min: 0, max: 2, step: 0.05 });
```

- [ ] **Step 7: Update `portfolio/styles/main.css` — background color**

Change the body background from the blue sky to golden hour amber:

```css
html, body {
  overflow: hidden;
  background: #E8B87A;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #fff;
}
```

- [ ] **Step 8: Verify visually**

Run: `cd portfolio && npm run dev`

Open the browser. Expected:
- Warm golden sky with visible sun near the horizon instead of flat blue
- Fog blends to warm amber at the distance (not blue)
- Shadows cast in the direction matching the sun position
- Scene feels warm and golden overall
- Scroll through to the house — no visual regressions (door opens, greeting plays, menu works)
- Debug panel (press D) shows `hemiIntensity` slider instead of `ambientIntensity`

- [ ] **Step 9: Commit**

```bash
git add portfolio/src/sky.js portfolio/src/main.js portfolio/src/debug.js portfolio/styles/main.css
git commit -m "feat(portfolio): add golden hour procedural sky with warm lighting"
```

---

### Task 2: Terrain Upgrade

**Files:**
- Modify: `portfolio/src/environment.js` (full rewrite)

**Context:** The current `environment.js` creates a flat green `PlaneGeometry(60,60)` ground, 8 trees, and a walkway. We replace the flat ground with a noise-displaced terrain using vertex colors for grass/dirt blending, add decorative rocks and flowers, and warm the tree canopy color. The walkway and tree logic stay structurally the same.

- [ ] **Step 1: Rewrite `portfolio/src/environment.js`**

```js
import * as THREE from 'three';

// ── Noise helpers ──

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function terrainHeight(x, z) {
  return smoothNoise(x * 0.08, z * 0.08) * 0.6
       + smoothNoise(x * 0.15, z * 0.15) * 0.3
       + smoothNoise(x * 0.3, z * 0.3) * 0.1;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Seeded random for deterministic prop placement ──

let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

// ── Main ──

export function initEnvironment(scene) {
  createTerrain(scene);
  createTrees(scene);
  createWalkway(scene);
  createRocks(scene);
  createFlowers(scene);
}

// ── Terrain ──

function createTerrain(scene) {
  const groundGeo = new THREE.PlaneGeometry(60, 60, 256, 256);
  const positions = groundGeo.attributes.position.array;
  const vertexCount = positions.length / 3;

  const grassColor = new THREE.Color(0x4a6a2a);
  const dirtColor = new THREE.Color(0x6a5a40);
  const colors = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const localX = positions[i * 3];
    const localY = positions[i * 3 + 1];
    // After mesh rotation.x = -PI/2: worldX = localX, worldZ = -localY
    const worldX = localX;
    const worldZ = -localY;

    // Displacement: flat zone near house, rolling hills outside
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const flatZone = smoothstep(4, 7, dist);
    const height = terrainHeight(worldX, worldZ) * 0.8 * flatZone;
    positions[i * 3 + 2] = height; // localZ → worldY after rotation

    // Vertex color: grass base, dirt path along walkway
    const pathDist = Math.abs(worldX);
    const onPathStrip = worldZ > 1 && worldZ < 8;
    const pathBlend = onPathStrip ? smoothstep(0.8, 0.2, pathDist) : 0;

    const r = grassColor.r + (dirtColor.r - grassColor.r) * pathBlend;
    const g = grassColor.g + (dirtColor.g - grassColor.g) * pathBlend;
    const b = grassColor.b + (dirtColor.b - grassColor.b) * pathBlend;
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

// ── Trees ──

function createTrees(scene) {
  const treePositions = [
    [-4, 3],
    [4, 3],
    [-5, -2],
    [5, -1],
    [-3, -4],
    [4, -4],
    [-6, 1],
    [6, 0],
  ];

  for (const [x, z] of treePositions) {
    const tree = createTree();
    // Set tree Y to match terrain height at this position
    const dist = Math.sqrt(x * x + z * z);
    const flatZone = smoothstep(4, 7, dist);
    const y = terrainHeight(x, z) * 0.8 * flatZone;
    tree.position.set(x, y, z);
    const s = 0.7 + seededRandom() * 0.6;
    tree.scale.set(s, s, s);
    scene.add(tree);
  }
}

function createTree() {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  group.add(trunk);

  // Warm canopy color for golden hour
  const canopyGeo = new THREE.SphereGeometry(0.8, 8, 6);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3d6a2d, roughness: 0.85 });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 2.0;
  canopy.castShadow = true;
  group.add(canopy);

  return group;
}

// ── Walkway ──

function createWalkway(scene) {
  const walkGeo = new THREE.BoxGeometry(1.2, 0.05, 3);
  const walkMat = new THREE.MeshStandardMaterial({
    color: 0x6a6560,
    roughness: 0.95,
  });
  const walkway = new THREE.Mesh(walkGeo, walkMat);
  walkway.position.set(0, 0.025, 2.5 + 1.5 + 1.0);
  walkway.receiveShadow = true;
  scene.add(walkway);
}

// ── Decorative rocks ──

function createRocks(scene) {
  const rockGeo = new THREE.DodecahedronGeometry(0.15, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x888880,
    roughness: 0.95,
    metalness: 0.0,
  });

  for (let i = 0; i < 15; i++) {
    const angle = seededRandom() * Math.PI * 2;
    const radius = 6 + seededRandom() * 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const dist = Math.sqrt(x * x + z * z);
    const flatZone = smoothstep(4, 7, dist);
    const y = terrainHeight(x, z) * 0.8 * flatZone;

    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, y + 0.05, z);
    rock.rotation.set(
      seededRandom() * Math.PI,
      seededRandom() * Math.PI,
      seededRandom() * Math.PI,
    );
    const s = 0.5 + seededRandom() * 1.0;
    rock.scale.set(s, s * 0.5, s); // flatten on Y
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

// ── Decorative flowers ──

function createFlowers(scene) {
  const petalColors = [0xFFDD44, 0xFF9944, 0xFFAAAA];
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.8 });

  for (let i = 0; i < 10; i++) {
    const angle = seededRandom() * Math.PI * 2;
    const radius = 5 + seededRandom() * 9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const dist = Math.sqrt(x * x + z * z);
    const flatZone = smoothstep(4, 7, dist);
    const y = terrainHeight(x, z) * 0.8 * flatZone;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.15;
    group.add(stem);

    // Petals — small cone on top
    const petalColor = petalColors[i % petalColors.length];
    const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.7 });
    const petalGeo = new THREE.ConeGeometry(0.06, 0.08, 5);
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.y = 0.34;
    petal.rotation.x = Math.PI; // flip upside down for flower shape
    group.add(petal);

    // Random rotation around Y
    group.rotation.y = seededRandom() * Math.PI * 2;

    scene.add(group);
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `cd portfolio && npm run dev`

Expected:
- Ground has visible rolling hills beyond ~5 units from the house
- Flat zone around the house — house and walkway sit flush, no floating
- Brown dirt path visible along the walkway (positive Z axis from center)
- Rest of the ground is warm green
- Small gray rocks scattered in the hills
- Small colored flowers (yellow, orange, pink) dotted around
- Trees at slightly different heights matching the terrain
- Tree canopies are warmer green than before
- Everything receives shadows from the golden hour sun

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/environment.js
git commit -m "feat(portfolio): add displaced terrain with vertex-colored path and decorative props"
```

---

### Task 3: Firefly Particles

**Files:**
- Modify: `portfolio/src/particles.js` (full rewrite, same exports)

**Context:** The current particles module creates 3000 nearly invisible white dots with linear upward drift. We replace it with 200 warm glowing fireflies using a custom `ShaderMaterial` for per-particle size animation (flicker). The public API stays the same: `initParticles(scene, params)` and `update(scrollProgress)`.

- [ ] **Step 1: Rewrite `portfolio/src/particles.js`**

```js
import * as THREE from 'three';

const BOUNDS = 12;
const MAX_HEIGHT = 4;
const BASE_SIZE = 8.0; // in screen pixels at reference distance

let points = null;
let scene = null;
let params = null;
let material = null;

// Per-particle data
let positions = null;
let baseY = null;
let phases = null;       // sinusoidal bob phase offset
let amplitudes = null;   // bob amplitude
let pulsePhases = null;  // flicker phase offset
let sizes = null;        // current size attribute
let driftX = null;
let driftZ = null;

function createParticles(count) {
  positions = new Float32Array(count * 3);
  baseY = new Float32Array(count);
  phases = new Float32Array(count);
  amplitudes = new Float32Array(count);
  pulsePhases = new Float32Array(count);
  sizes = new Float32Array(count);
  driftX = new Float32Array(count);
  driftZ = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * BOUNDS * 2;
    positions[i * 3 + 1] = Math.random() * MAX_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS * 2;

    baseY[i] = positions[i * 3 + 1];
    phases[i] = Math.random() * Math.PI * 2;
    amplitudes[i] = 0.2 + Math.random() * 0.4;
    pulsePhases[i] = Math.random() * Math.PI * 2;
    sizes[i] = BASE_SIZE;
    driftX[i] = (Math.random() - 0.5) * 0.002;
    driftZ[i] = (Math.random() - 0.5) * 0.002;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xFFDD66) },
      uOpacity: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, d) * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

export function initParticles(_scene, _params) {
  scene = _scene;
  params = _params;
  createParticles(params.particles.count);
  return { update, rebuild };
}

function rebuild(newCount) {
  if (points) {
    points.geometry.dispose();
    points.material.dispose();
    scene.remove(points);
  }
  createParticles(newCount);
}

export function update(scrollProgress) {
  if (!positions) return;

  // Fade in between progress 0.3 and 0.7
  if (scrollProgress < 0.3) {
    material.uniforms.uOpacity.value = 0;
  } else if (scrollProgress < 0.7) {
    material.uniforms.uOpacity.value = ((scrollProgress - 0.3) / 0.4) * 0.6;
  } else {
    material.uniforms.uOpacity.value = 0.6;
  }

  const time = performance.now() * 0.001;
  const count = positions.length / 3;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const iy = i * 3 + 1;
    const iz = i * 3 + 2;

    // Drift X/Z
    positions[ix] += driftX[i];
    positions[iz] += driftZ[i];

    // Sinusoidal Y bob
    positions[iy] = baseY[i] + Math.sin(time * 0.8 + phases[i]) * amplitudes[i];

    // Wrap X/Z
    if (positions[ix] > BOUNDS) positions[ix] = -BOUNDS;
    if (positions[ix] < -BOUNDS) positions[ix] = BOUNDS;
    if (positions[iz] > BOUNDS) positions[iz] = -BOUNDS;
    if (positions[iz] < -BOUNDS) positions[iz] = BOUNDS;

    // Wrap Y — reset if drifted too high or too low
    if (positions[iy] > MAX_HEIGHT + 1) {
      baseY[i] = 0;
      positions[ix] = (Math.random() - 0.5) * BOUNDS * 2;
      positions[iz] = (Math.random() - 0.5) * BOUNDS * 2;
    }
    if (positions[iy] < -0.5) {
      baseY[i] = MAX_HEIGHT * 0.5;
    }

    // Size-based flicker
    sizes[i] = BASE_SIZE * (0.3 + 0.7 * Math.abs(Math.sin(time * 1.5 + pulsePhases[i])));
  }

  points.geometry.attributes.position.needsUpdate = true;
  points.geometry.attributes.aSize.needsUpdate = true;
}
```

- [ ] **Step 2: Verify visually**

Run: `cd portfolio && npm run dev`

Scroll past 30% progress. Expected:
- Warm amber glowing dots appear near the ground (Y: 0-4)
- Each firefly bobs up and down smoothly (sinusoidal, not linear)
- Fireflies pulse in size — growing and shrinking individually (flicker)
- Additive blending creates a soft glow effect
- Soft radial gradient on each particle (not a hard square)
- Far fewer particles than before (200 vs 3000) but much more visible
- Particles fade in smoothly between 30-70% scroll progress

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/particles.js
git commit -m "feat(portfolio): replace particles with warm glowing fireflies"
```

---

### Task 4: Subtle Depth of Field

**Files:**
- Modify: `portfolio/src/main.js:1-5` (add BokehPass import)
- Modify: `portfolio/src/main.js:69-79` (add BokehPass to composer chain)
- Modify: `portfolio/src/main.js:190-240` (update BokehPass in render loop)

**Context:** Add a `BokehPass` to the existing `EffectComposer` pipeline. It blurs the scene subtly at the start of the scroll (bird's eye) and sharpens as the camera descends. Disabled entirely once inside the house or in any interactive state.

- [ ] **Step 1: Add BokehPass import to `portfolio/src/main.js`**

Add after the UnrealBloomPass import:

```js
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
```

- [ ] **Step 2: Add BokehPass to the composer chain**

After the existing `composer.addPass(bloomPass)` line, insert the BokehPass. Note: we add it AFTER bloom so bloom applies to the sharp image, then DoF softens the result. If we did it the other way, bloom would amplify the blur artifacts.

Actually, insert BEFORE bloomPass for correct ordering — we want: Render → DoF → Bloom. Replace the composer setup:

```js
// ── Post-processing ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bokehPass = new BokehPass(scene, camera, {
  focus: 30.0,
  aperture: 0.002,
  maxblur: 0.005,
});
composer.addPass(bokehPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  params.bloom.strength,
  params.bloom.radius,
  params.bloom.threshold
);
composer.addPass(bloomPass);
```

- [ ] **Step 3: Update the render loop to drive DoF**

In the `animate()` function, add DoF control after the state/progress checks. Insert this block after the `sunLight.intensity` line and before the `if (state === STATES.SCROLLING)` block:

```js
  // DoF: subtle blur at distance, sharp when close, disabled inside house
  if (state === STATES.SCROLLING && progress < 0.4) {
    bokehPass.enabled = true;
    const houseCenter = new THREE.Vector3(0, 1, 0);
    bokehPass.uniforms['focus'].value = camera.position.distanceTo(houseCenter);
    bokehPass.uniforms['aperture'].value = 0.002 * (1 - progress / 0.4);
  } else {
    bokehPass.enabled = false;
  }
```

- [ ] **Step 4: Verify visually**

Run: `cd portfolio && npm run dev`

Expected:
- At the very top (progress 0): the ground below is subtly soft/blurry
- As you scroll down (progress 0-0.4): scene gradually sharpens
- After progress 0.4: everything is crisp, no blur at all
- Inside the house (menu, explore, computer, chat): no blur on any interactive element
- The effect is subtle — you feel it more than you consciously notice it

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/main.js
git commit -m "feat(portfolio): add subtle scroll-driven depth of field"
```

---

### Task 5: Emissive Interior Glow

**Files:**
- Modify: `portfolio/src/house.js:1-76` (add mesh identification, material cloning, emissive ramp)

**Context:** When the door opens (progress 0.55-0.70), interior objects should glow from within — the lamp warm amber, the monitor cool blue. This uses `material.emissive` and `material.emissiveIntensity`, complementing the existing `PointLight` objects. Materials must be cloned before modification so shared GLB materials aren't corrupted.

- [ ] **Step 1: Rewrite `portfolio/src/house.js`**

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let doorMesh = null;
let interiorLight = null;
let lampLight = null;
let monitorLight = null;

// Emissive glow targets
let emissiveMeshes = [];

// Emissive config: mesh name substring → { color, maxIntensity }
const EMISSIVE_CONFIG = {
  'Lamp': { color: new THREE.Color(0xFFAA44), maxIntensity: 0.5 },
  'MonitorScreen': { color: new THREE.Color(0x4488FF), maxIntensity: 0.3 },
  'Desk': { color: new THREE.Color(0xFFCC88), maxIntensity: 0.15 },
};

export async function initHouse(scene) {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync('/models/house.glb');
    const houseGroup = gltf.scene;

    // Rotate 180° so front door faces +Z (toward camera)
    houseGroup.rotation.y = Math.PI;

    houseGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name === 'Door') {
        doorMesh = child;
      }

      // Check for emissive targets
      if (child.isMesh) {
        for (const [nameKey, config] of Object.entries(EMISSIVE_CONFIG)) {
          if (child.name.includes(nameKey)) {
            // Clone material so we don't corrupt shared GLB materials
            child.material = child.material.clone();
            child.material.emissive = config.color.clone();
            child.material.emissiveIntensity = 0;
            emissiveMeshes.push({ mesh: child, config });
            break;
          }
        }
      }
    });

    scene.add(houseGroup);
    console.log('House loaded, door found:', !!doorMesh, 'emissive meshes:', emissiveMeshes.length);
  } catch (err) {
    console.error('Failed to load house model:', err);
  }

  // Interior light — warm orange, inside house behind door, initially off
  interiorLight = new THREE.PointLight(0xFFAA44, 0, 8);
  interiorLight.position.set(0, 1.5, 0.5);
  scene.add(interiorLight);

  // Floor lamp light
  lampLight = new THREE.PointLight(0xFFE8CC, 0, 5);
  lampLight.position.set(-2.5, 2.2, -2.0);
  scene.add(lampLight);

  // Monitor glow
  monitorLight = new THREE.PointLight(0x4488FF, 0, 3);
  monitorLight.position.set(-1.8, 1.1, -1.3);
  scene.add(monitorLight);

  return { update };
}

export function update(progress) {
  // Door opens between progress 0.55 and 0.70
  if (doorMesh) {
    if (progress >= 0.55) {
      const doorProgress = Math.min((progress - 0.55) / 0.15, 1.0);
      doorMesh.rotation.y = (-Math.PI / 2) * doorProgress;
    } else {
      doorMesh.rotation.y = 0;
    }
  }

  // Interior lights and emissive glow fade in as door opens
  if (progress >= 0.55) {
    const doorProgress = Math.min((progress - 0.55) / 0.15, 1.0);

    if (interiorLight) interiorLight.intensity = doorProgress * 2.0;
    if (lampLight) lampLight.intensity = doorProgress * 1.2;
    if (monitorLight) monitorLight.intensity = doorProgress * 0.8;

    // Ramp emissive intensity on glow targets
    for (const { mesh, config } of emissiveMeshes) {
      mesh.material.emissiveIntensity = doorProgress * config.maxIntensity;
    }
  } else {
    if (interiorLight) interiorLight.intensity = 0;
    if (lampLight) lampLight.intensity = 0;
    if (monitorLight) monitorLight.intensity = 0;

    for (const { mesh } of emissiveMeshes) {
      mesh.material.emissiveIntensity = 0;
    }
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `cd portfolio && npm run dev`

Scroll to progress ~0.55-0.70 (door opening). Expected:
- FloorLamp mesh (or parts containing "Lamp") glows warm amber
- MonitorScreen glows cool blue
- Desk has a very subtle warm glow
- The glow ramps up in sync with the door opening and light activation
- Under the bloom pass, emissive surfaces produce a soft halo
- After door is fully open (progress > 0.70): glow is at full intensity, stable
- No visual regressions: door still opens correctly, character greeting still works
- Entering computer mode: monitor glow still visible on the screen mesh

- [ ] **Step 3: Commit**

```bash
git add portfolio/src/house.js
git commit -m "feat(portfolio): add emissive interior glow on lamp, monitor, and desk"
```

---

## Verification Checklist (All Tasks Complete)

After all 5 tasks are done, run through this full checklist:

1. **Sky:** Warm golden sky visible, no flat blue anywhere
2. **Fog:** Fog color matches sky horizon — no color seam at fog boundary
3. **Shadows:** Cast direction matches the sky sun position
4. **Terrain:** Rolling hills visible outside house area, flat under house
5. **Walkway:** Sits flush on ground, dirt path vertex colors visible
6. **Props:** Rocks and flowers scattered naturally, not inside house or trees
7. **Trees:** Warmer canopy color, sitting on terrain height
8. **Fireflies:** Warm amber dots near ground, sinusoidal bob, size flicker
9. **Fireflies scroll:** Fade in between 30-70% progress, invisible before
10. **DoF:** Subtle blur at bird's eye, sharp by 40% progress
11. **DoF states:** No blur in MENU, COMPUTER, EXPLORING, or CHATTING
12. **Emissive:** Lamp glows warm, monitor glows blue when door opens
13. **Bloom interaction:** Emissive surfaces produce soft bloom halo
14. **State machine:** All states still work (scroll → greeting → menu → computer/explore/chat → back)
15. **Performance:** Smooth 60fps on the dev machine, no jank during scroll
