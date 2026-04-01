/* ============================================================
   GLACIAL — app.js
   Frame playback + Lenis + GSAP ScrollTrigger + HUD + Loop
   ============================================================ */

/* ---- Config ---- */
const FRAME_COUNT = 723;
const FRAME_PAD = 4;

/* ---- State ---- */
let frames = new Array(FRAME_COUNT).fill(null);
let loadedCount = 0;
let currentFrame = 0;
let scrollProgress = 0;
let hasScrolled = false;
let audioPlaying = false;
let audio = null;

/* ---- Elements ---- */
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderPct = document.getElementById('loader-percent');
const frameCanvas = document.getElementById('frame-canvas');
const ctx = frameCanvas.getContext('2d');
const scrollContainer = document.getElementById('scroll-container');

/* HUD elements */
const hudCoords = document.getElementById('hud-coords');
const hudManifesto = document.getElementById('hud-manifesto');
const hudLabelsS2 = document.getElementById('hud-labels-s2');
const hudLabelsS3 = document.getElementById('hud-labels-s3');
const hudScrollHint = document.getElementById('hud-scroll-hint');
const hudReturnHint = document.getElementById('hud-return-hint');
const hudSound = document.getElementById('hud-sound');

/* ============================================================
   1. CANVAS SETUP
   ============================================================ */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  frameCanvas.width = window.innerWidth * dpr;
  frameCanvas.height = window.innerHeight * dpr;
  frameCanvas.style.width = window.innerWidth + 'px';
  frameCanvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ============================================================
   2. FRAME LOADER
   ============================================================ */
function framePath(i) {
  return 'frames/frame_' + String(i + 1).padStart(FRAME_PAD, '0') + '.jpg';
}

function loadFrame(index) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      frames[index] = img;
      loadedCount++;
      var pct = Math.round((loadedCount / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + '%';
      loaderPct.textContent = pct + '%';
      resolve();
    };
    img.onerror = function () {
      loadedCount++;
      resolve();
    };
    img.src = framePath(index);
  });
}

async function preloadFrames() {
  // Phase 1: first 10 frames for fast first paint
  var firstBatch = Array.from({ length: Math.min(10, FRAME_COUNT) }, function (_, i) {
    return loadFrame(i);
  });
  await Promise.all(firstBatch);
  drawFrame(0);

  // Phase 2: remaining frames
  var remaining = Array.from({ length: FRAME_COUNT - 10 }, function (_, i) {
    return loadFrame(i + 10);
  });
  await Promise.all(remaining);

  // All loaded — hide loader, start scroll system
  loader.classList.add('hidden');
  initScrollSystem();
}

/* ============================================================
   3. CANVAS RENDERER
   ============================================================ */
function drawFrame(index) {
  var img = frames[index];
  if (!img) return;

  var cw = frameCanvas.width / (window.devicePixelRatio || 1);
  var ch = frameCanvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cw, ch);

  drawImageCover(ctx, img, cw, ch);
}

function drawImageCover(context, img, cw, ch) {
  var iw = img.naturalWidth;
  var ih = img.naturalHeight;
  var scale = Math.max(cw / iw, ch / ih);
  var dw = iw * scale;
  var dh = ih * scale;
  var dx = (cw - dw) / 2;
  var dy = (ch - dh) / 2;
  context.drawImage(img, dx, dy, dw, dh);
}

function drawFrameBlended(indexA, indexB, blend) {
  var imgA = frames[indexA];
  var imgB = frames[indexB];
  if (!imgA && !imgB) return;

  var cw = frameCanvas.width / (window.devicePixelRatio || 1);
  var ch = frameCanvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cw, ch);

  if (imgA) {
    ctx.globalAlpha = 1 - blend;
    drawImageCover(ctx, imgA, cw, ch);
  }
  if (imgB) {
    ctx.globalAlpha = blend;
    drawImageCover(ctx, imgB, cw, ch);
  }
  ctx.globalAlpha = 1;
}

/* ============================================================
   4. SCROLL SYSTEM
   ============================================================ */
function initScrollSystem() {
  /* Lenis */
  var lenis = new Lenis({
    duration: 1.4,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* Store lenis reference for loop reset */
  window._glacialLenis = lenis;

  ScrollTrigger.refresh();

  /* Frame scrubbing + HUD + overlays */
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: function (self) {
      scrollProgress = self.progress;

      // Map scroll progress to frame index
      var index = Math.min(Math.floor(scrollProgress * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(function () { drawFrame(currentFrame); });
      }

      // Hide scroll hint on first scroll
      if (!hasScrolled && scrollProgress > 0.01) {
        hasScrolled = true;
        hudScrollHint.style.opacity = '0';
      }

      // HUD visibility
      updateHUD(scrollProgress);

      // Three.js overlays
      if (typeof window.updateOverlays === 'function') {
        window.updateOverlays(scrollProgress);
      }

    },
  });

  /* Init Three.js overlays */
  if (typeof window.initOverlays === 'function') {
    window.initOverlays();
  }

  /* Init audio */
  initAudio();
}

/* ============================================================
   5. HUD VISIBILITY
   ============================================================ */
function updateHUD(p) {
  // Coordinates: visible 0.05–0.95
  hudCoords.style.opacity = (p > 0.05 && p < 0.95) ? '1' : '0';

  // Manifesto: visible during Scene 2 (0.30–0.70)
  hudManifesto.style.opacity = (p > 0.33 && p < 0.67) ? '1' : '0';

  // Scene 2 labels: visible 0.35–0.65
  hudLabelsS2.style.opacity = (p > 0.35 && p < 0.65) ? '1' : '0';

  // Scene 3 labels: visible 0.75–0.95
  hudLabelsS3.style.opacity = (p > 0.75 && p < 0.95) ? '1' : '0';

  // Return hint: visible near end 0.90–0.99
  hudReturnHint.style.opacity = (p > 0.90 && p < 0.99) ? '1' : '0';
}

/* ============================================================
   6. AUDIO
   ============================================================ */
function initAudio() {
  audio = new Audio('audio/ambient.mp3');
  audio.loop = true;
  audio.volume = 0.3;

  hudSound.addEventListener('click', function () {
    if (audioPlaying) {
      audio.pause();
      hudSound.textContent = 'Sound: Off';
    } else {
      audio.play();
      hudSound.textContent = 'Sound: On';
    }
    audioPlaying = !audioPlaying;
  });
}

/* ============================================================
   INIT
   ============================================================ */
preloadFrames();
