# Portfolio Atmosphere & Visuals Upgrade — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Scope:** Phase A of portfolio improvements — atmosphere and visual upgrades only. Interactions (Phase B) and UX polish (Phase C) are separate specs.

## Purpose

Transform the portfolio's outdoor environment from a flat blue sky with a green slab into a golden-hour scene with procedural sky, rolling terrain, firefly particles, subtle depth of field, and warm emissive interior glow. The goal is to make the scene feel like a cozy Studio Ghibli evening rather than a tech demo.

## Architecture

All changes use Three.js built-in addons and standard materials. No custom GLSL shaders. One new module (`sky.js`), and modifications to four existing modules (`main.js`, `environment.js`, `particles.js`, `house.js`). The existing module API contracts (init/update/export signatures) remain unchanged.

## 1. Golden Hour Sky

**New file:** `portfolio/src/sky.js`
**Modified:** `portfolio/src/main.js`

Replace the flat `0x87CEEB` scene background with Three.js's `Sky` addon, which provides procedural Rayleigh/Mie atmospheric scattering.

### Sky Configuration
- Sun position: low on the horizon, ~10 degree elevation, for golden hour
- Sky rendered to a `PMREMGenerator` environment map and assigned to `scene.background` and `scene.environment`
- Fog color updated from `0x87CEEB` to match the warm horizon tone (sampled from the sky render or hardcoded warm amber like `0xE8B87A`)

### Lighting Changes
- Remove the flat white `AmbientLight(0xffffff, 0.4)`
- Replace with `HemisphereLight(skyColor, groundBounceColor, 0.6)` — warm blue-ish top, warm amber ground bounce
- `DirectionalLight` direction aligned with the sky's sun position so shadows match
- `DirectionalLight` color stays warm (`0xFFF5E0`) but intensity may need tuning
- `toneMappingExposure` increased from 1.0 to ~1.3

### sky.js API
- `initSky(scene, renderer)` — creates Sky mesh, configures sun, generates environment map, returns `{ sunPosition }` for lighting alignment
- `getSunPosition()` — returns the sun `Vector3` for the DirectionalLight to match

## 2. Terrain Upgrade

**Modified:** `portfolio/src/environment.js`

Replace the flat `PlaneGeometry(60, 60)` ground with a displaced terrain featuring rolling hills, texture blending, and decorative props.

### Terrain Geometry
- `PlaneGeometry(60, 60, 256, 256)` — high subdivision for smooth displacement
- Displacement applied at init via vertex position manipulation (not a displacement map texture — simpler and avoids texture loading)
- Simplex noise (use a lightweight inline implementation, ~30 lines) generates height values
- Max height: ~0.8 units for gentle rolling hills
- Flat zone: vertices within ~5 unit radius of origin have displacement forced to 0, so the house and walkway sit on level ground
- Smooth falloff between flat zone and displaced zone using a smoothstep function

### Material
- `MeshStandardMaterial` with `onBeforeCompile` to inject UV-based color blending
- Base color: warm grass green (`0x4a6a2a`) replacing the current cold green
- Dirt path: brownish tone blended in along the walkway axis (positive Z from origin), driven by distance from the center X axis
- Roughness stays high (~0.9) for natural ground look

### Decorative Props
- Small rocks: `DodecahedronGeometry(0.15, 0)` flattened on Y, scattered randomly outside the flat zone. ~15 rocks with random rotation and scale variation
- Flower clusters: thin `CylinderGeometry` stems with small `ConeGeometry` colored petals on top. ~10 clusters, warm colors (yellow, orange, soft pink)
- All props use `InstancedMesh` where possible for performance
- Props receive shadows, small ones don't cast (performance)

### Trees
- Existing tree geometry and positions unchanged
- Canopy material color warmed slightly to match golden hour palette (from `0x2d5a1d` to `0x3d6a2d`)

## 3. Firefly Particles

**Modified:** `portfolio/src/particles.js`

Replace the current 3000 invisible white dots with 200 warm glowing fireflies.

### Particle Properties
- Count: 200 (down from 3000)
- Color: warm amber `0xFFDD66`
- Size: 0.08 (up from 0.04)
- Blending: `THREE.AdditiveBlending` (from `NormalBlending`)
- `depthWrite: false` (already set)
- `sizeAttenuation: true` (already set)

### Motion Pattern
- Each firefly has a stored phase offset and amplitude (set at init, stored in typed arrays)
- Y position bobs sinusoidally: `baseY + Math.sin(time * speed + phase) * amplitude`
- X/Z drift: gentle random walk, slower than current (0.001 base speed)
- Spawn zone: X/Z within `BOUNDS`, Y between 0 and 4 (near ground, not full 15-unit height)
- Wrap behavior: same as current, reset position when exceeding bounds

### Flicker Effect
- Per-firefly flicker simulated by varying particle size each frame via a custom `size` BufferAttribute
- Each firefly has a `pulsePhase` (set at init). Each frame: `size[i] = baseSize * (0.3 + 0.7 * Math.abs(Math.sin(time * pulseSpeed + pulsePhase[i])))`
- This makes fireflies grow and shrink individually, simulating bioluminescent flicker without needing per-particle opacity (which would require a custom shader)
- Material opacity set to a single value (0.6 at peak) and controlled by scroll progress as before

### Scroll Integration
- Same fade-in curve as current: invisible below progress 0.3, fade in through 0.7, full visibility after
- Peak material opacity: 0.6 (up from 0.35)

## 4. Subtle Depth of Field

**Modified:** `portfolio/src/main.js`

Add a `BokehPass` to the EffectComposer, driven by scroll progress.

### Setup
- Import `BokehPass` from `three/examples/jsm/postprocessing/BokehPass.js`
- Insert into composer chain between `RenderPass` and `UnrealBloomPass`
- Configuration: `focus` (distance), `aperture` (blur amount), `maxblur` (cap)

### Scroll-Driven Focus
- At progress 0.0 (bird's eye): `focus` set to a large value (~30, distance to house), `aperture` at a small but visible value (~0.002) — gentle background blur
- As progress increases toward 0.4: `aperture` linearly decreases toward 0 — scene sharpens
- At progress > 0.4: `aperture` = 0, everything sharp. No DoF during approach and interior
- Focus distance tracks `camera.position.distanceTo(houseCenter)` where houseCenter is `(0, 1, 0)`

### State-Based Disable
- In any state other than SCROLLING: `aperture` forced to 0 so interactive content (menus, explore mode, computer gallery) is always crisp
- Avoids any perception of blur on clickable elements

## 5. Emissive Interior Glow

**Modified:** `portfolio/src/house.js`

Add emissive self-illumination to interior objects so they glow warmly when the door opens.

### Mesh Identification
- During `initHouse` GLB traversal, identify meshes by name:
  - `FloorLamp` (or substrings containing "Lamp") → warm emissive `0xFFAA44`
  - `MonitorScreen` → cool blue emissive `0x4488FF`
  - `Desk` → subtle warm emissive `0xFFCC88` (very low intensity, ambient desk glow)
- Store references to these meshes for the update loop

### Material Cloning
- Before modifying any mesh material, clone it: `mesh.material = mesh.material.clone()`
- This prevents affecting other meshes that share the same GLB material instance

### Emissive Ramp
- Emissive intensity driven by the same door-open progress already in `update()` (progress 0.55–0.70)
- `doorProgress` (0 to 1) maps to:
  - Lamp meshes: `emissiveIntensity = doorProgress * 0.5`
  - Monitor mesh: `emissiveIntensity = doorProgress * 0.3`
  - Desk mesh: `emissiveIntensity = doorProgress * 0.15`
- `emissive` color set once at init, intensity ramped in update

### Interaction with Existing Lights
- The three existing `PointLight` objects (interiorLight, lampLight, monitorLight) remain unchanged
- Emissive adds surface self-glow complementing the lights that illuminate surrounding geometry
- Under the existing bloom pass, emissive surfaces will naturally produce a soft glow halo

## File Change Summary

| File | Change Type | What Changes |
|------|------------|--------------|
| `portfolio/src/sky.js` | New | Sky addon setup, sun position, environment map |
| `portfolio/src/main.js` | Modify | Import sky, replace AmbientLight with HemisphereLight, add BokehPass, update fog color, toneMappingExposure, sync sun with DirectionalLight |
| `portfolio/src/environment.js` | Modify | Displaced terrain, material blending, decorative props, warm tree colors |
| `portfolio/src/particles.js` | Modify | Firefly behavior — fewer count, AdditiveBlending, sinusoidal motion, warm color, opacity pulse |
| `portfolio/src/house.js` | Modify | Clone materials, set emissive colors, ramp emissive intensity with door progress |

## Performance Considerations

- Terrain: 256x256 vertices is ~65K vertices, trivial for modern GPUs. Props are instanced.
- Particles: 200 is far fewer than the current 3000, net performance gain.
- Sky: PMREMGenerator runs once at init, not per frame. Zero runtime cost.
- BokehPass: Adds one full-screen pass. Acceptable on desktop. On mobile (if ever targeted), could be disabled via a quality toggle.
- Emissive: No additional lights, just material properties. Zero extra GPU cost.

## Verification

1. Scene loads with warm golden sky instead of flat blue
2. Fog color matches sky horizon — no visible color mismatch at fog boundary
3. Shadows point away from the sky's sun position
4. Ground has visible rolling hills outside the house area, flat zone under the house
5. Walkway and house sit flush on the ground (no floating or clipping)
6. Dirt path visible along walkway, grass elsewhere
7. Rocks and flowers scattered naturally, not overlapping house or trees
8. Fireflies visible as warm glowing dots near ground level after scroll progress 0.3
9. Fireflies float with sinusoidal bob, not linear drift
10. DoF: at top of scroll, distant ground is subtly soft. By mid-scroll, everything sharp
11. DoF disabled in MENU/COMPUTER/EXPLORING/CHATTING states
12. When door opens, FloorLamp mesh glows warm, monitor glows blue
13. Emissive glow produces soft bloom halo under existing UnrealBloomPass
14. No visual regressions: door still opens, character still greets, all states still work
