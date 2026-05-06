# GLACIAL — Design Spec
**Date:** 2026-04-01  
**Owner:** Ethan  
**Status:** Approved — ready for implementation planning

---

## Context

GLACIAL is a standalone visual showcase website — a pure scroll-driven experience with an Arctic/Ice theme. No real content or brand — just a jaw-dropping 3D scroll-through inspired directly by the Igloo website's aesthetic and pacing.

Built as a hybrid: AI-generated video frames (Kling 3.0) provide the heavy visual lifting, while Three.js handles interactive overlays (particles, shaders, post-processing). This is the same pipeline used for LUMINARY, extended with a Three.js layer.

The site loops infinitely — scrolling past the end seamlessly returns to the beginning.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Smooth Scroll | Lenis (CDN) |
| Animation | GSAP + ScrollTrigger (CDN) |
| 3D Overlays | Three.js (CDN) — EffectComposer, UnrealBloomPass, custom ShaderPass |
| Frame Playback | Canvas 2D |
| Fonts | Space Grotesk + JetBrains Mono (Google Fonts) |
| Deployment | Static (any host) |

**No framework.** Vanilla JS with ES modules. No build tool required.

---

## Visual Identity

### Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--void` | `#AAAAAA` | Scene 1 background (gray sky) |
| `--white` | `#E8E8E8` | Fog, whiteout transition |
| `--dark` | `#1a1a2e` | Scene 2/3 dark void |
| `--cyan` | `#00D9FF` | Platform edge glow, crystal emissive |
| `--ice` | `#D8D8D8` | Igloo/ice structure color |
| `--metal` | `#606060` | Platform body |
| `--text` | `#FFFFFF` | All HUD/UI text |
| `--muted` | `#888888` | Secondary text, labels |

### Typography

| Role | Font | Weight |
|---|---|---|
| Display / Title | Space Grotesk | 700 |
| Body / Manifesto | Space Grotesk | 300 |
| Labels / Coordinates | JetBrains Mono | 400 |

---

## File Structure

```
glacial/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js           ← Lenis + GSAP + ScrollTrigger + canvas frame renderer + loop logic
│   └── overlays.js      ← Three.js scene (particles, shaders, post-processing)
├── frames/
│   └── frame_0001.jpg … frame_XXXX.jpg
└── audio/
    └── ambient.mp3      ← arctic wind/ice ambience (optional)
```

---

## Rendering Layers (back to front)

1. `<canvas id="frames">` — full-viewport, fixed, plays video frames on scroll (Canvas 2D)
2. `<canvas id="three">` — full-viewport, fixed, transparent background, Three.js particles + shaders
3. HTML/CSS — HUD elements, text overlays, floating labels (positioned absolutely)

---

## Post-Processing Pipeline (Three.js)

```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(resolution, 1.5, 0.4, 0.85));
composer.addPass(new ShaderPass(chromaticAberrationShader));
```

Chromatic aberration intensity and bloom strength are driven by GSAP ScrollTrigger — different values at different scroll percentages to match each scene's mood.

---

## Scroll Structure

Total scroll height: ~600vh (200vh per scene).

Lenis handles smooth scrolling. GSAP ScrollTrigger maps scroll position (0–100%) to:
- Frame index (which JPEG to draw on the frame canvas)
- Three.js shader uniforms (chromatic aberration amount, bloom intensity)
- HUD element visibility (fade in/out labels, manifesto text)

---

## Sections

### Scene 1: The Frozen Structure (0%–30% scroll)

**Visual:** A wireframe ice igloo/cathedral on a vast frozen tundra. Camera slowly descends toward it. Fog creeps in from edges, thickening until full whiteout.

**Video frames handle:**
- The ice structure, frozen landscape, camera descent
- Fog thickening to complete whiteout

**Three.js overlays:**
- ~500 slow-drifting snow particles (white THREE.Points, gentle sine-wave bobbing)
- Mouse parallax — cursor movement shifts particle layer for depth
- Chromatic aberration: starts at 0, ramps to ~10px at whiteout peak

**HUD elements (HTML/CSS):**
- Top-left: "GLACIAL" in Space Grotesk 700, ~40px, white
- Left sidebar: monospace coordinate text (decorative) — e.g. "71°17'N", "156°47'W", "STATION 04"
- Bottom-left: "Sound: Off" toggle
- Bottom-right: "Scroll to discover" hint — fades after first scroll

**Transition out:** Fog hits maximum density → full white screen → cross-fade to Scene 2.

---

### Scene 2: The Arctic Creature (30%–70% scroll)

**Visual:** Whiteout clears to reveal a darker environment. A large particle-cloud arctic animal (wolf/fox/polar bear rendered as fuzzy point cloud, like Igloo's mascot) stands on concentric icy ring platform. Camera orbits from side view to top-down.

**Video frames handle:**
- White fog clearing to dark ice cave/void
- Concentric ring platform
- Camera orbit path (side → top-down)

**Three.js overlays:**
- Floating ice dust particles (smaller/slower than Scene 1 snow — suspended crystals)
- Faint cyan emissive glow near platform edges (additive-blended sprites)
- Chromatic aberration resets to subtle (~3px), pulses slightly during orbit

**HUD elements:**
- Top-left title and sidebar persist from Scene 1
- Right side: 2-3 line manifesto/poem fades in (monospace, about ice/cold/silence)
- Floating labels near platform timed to scroll: "64°N 18°W", "−41.2°C", "PERMAFROST"

**Transition out:** Camera reaches top-down → zooms into platform center → cross-fade to Scene 3.

---

### Scene 3: The Crystal Core + Loop (70%–100% scroll)

**Visual:** Camera has plunged into the platform core. Crystalline void — floating ice crystals slowly rotate, catching light. Weightless and serene. Environment gradually transitions back to the frozen tundra of Scene 1.

**Video frames handle:**
- Dive into platform core
- Crystalline interior environment with floating/rotating ice shards
- Gradual transition back to snowy tundra matching Scene 1's opening frame

**Three.js overlays:**
- Sparkle particles — small emissive white/cyan sprites with slow sine-wave drift
- Chromatic aberration spikes briefly during core entry (~10px glitch), settles to subtle
- Bloom peaks here (UnrealBloomPass) — crystals radiate light

**HUD elements:**
- Floating monospace labels near crystals: "ICE-07A", "CRYO.441", "FRZ-∞"
- Bottom-right: subtle "↑ Return to surface" text fades in near end

**Loop mechanic:**
- Video is generated so last ~2 seconds visually match first ~2 seconds (same tundra, same angle)
- At 100% scroll, frame index cross-fades from final frames back to frame 1
- Three.js particles fade out briefly during cross-fade, then fade back in (hides mismatch)
- Chromatic aberration pulses during transition as a glitch mask
- Lenis scroll position resets to 0% — user can scroll infinitely

---

## Asset Pipeline

### Step 1: Generate Keyframe Images (nano-banana via kie.ai)

4 images — start/end keyframes for each video segment:

**Image 1 (Scene 1 start):**
> Aerial view of a wireframe geometric igloo structure on a vast frozen tundra, dark gray sky, minimal snow particles, cinematic lighting from upper left, muted gray-white palette, no text, 16:9

**Image 2 (Scene 1 end / Scene 2 start):**
> Complete white fog whiteout, barely visible dark silhouette of a concentric ring platform emerging through dense white fog, gray-white palette, no text, 16:9

**Image 3 (Scene 2 end):**
> Top-down aerial view looking directly into the center of concentric dark metallic ice rings, glowing cyan edges, dark void in center, frozen crystalline textures, no text, 16:9

**Image 4 (Scene 3 end):**
> Aerial view of a wireframe geometric igloo structure on a vast frozen tundra, dark gray sky, minimal snow particles, cinematic lighting from upper left, muted gray-white palette, no text, 16:9

Image 4 matches Image 1 closely to enable the seamless loop.

### Step 2: Generate Videos (Kling 3.0 via kie.ai)

3 video jobs using `model: "kling-3.0/video"`, `multi_shots: false`:

- **Video A:** Image 1 → Image 2 (frozen tundra descent into fog whiteout)
- **Video B:** Image 2 → Image 3 (fog clears, platform revealed, camera orbits to top-down)
- **Video C:** Image 3 → Image 4 (dive into core, crystals, return to tundra)

Each job takes 10-15 minutes to generate. Poll via `GET /api/v1/jobs/recordInfo?taskId=...`.

### Step 3: Stitch + Extract Frames (ffmpeg)

```bash
# Stitch 3 videos into one continuous file
ffmpeg -f concat -i list.txt -c copy glacial_full.mp4

# Extract frames as JPEG (quality level 2)
ffmpeg -i glacial_full.mp4 -q:v 2 frames/frame_%04d.jpg
```

Expected output: ~120–180 frames.

### Step 4: Audio (optional)

Source an arctic wind/ice ambience track (~30s, loopable) from Freesound.org or generate one.

---

## Out of Scope

- Any real content, brand, or product messaging
- Mobile-specific interactions
- CMS or dynamic content
- Analytics / tracking
- Any backend

---

## Success Criteria

1. All 3 scenes play smoothly via scroll-driven frame playback
2. Three.js overlays (particles, chromatic aberration, bloom) are visible and performant
3. Mouse parallax works in Scene 1
4. HUD elements appear/disappear at correct scroll positions
5. Loop from Scene 3 back to Scene 1 is seamless (no visible jump)
6. Sound toggle works (if audio is included)
7. Visually evokes the Igloo website's aesthetic — wireframes, fog, particles, chromatic aberration, monospace HUD
