/* ============================================================
   LUMINARY — app.js
   Lenis + GSAP + ScrollTrigger + Canvas Frame Animation
   ============================================================ */

/* ---- Config ---- */
const FRAME_COUNT  = 121;
const FRAME_SPEED  = 2.0;   // animation completes at ~50% scroll
const IMAGE_SCALE  = 0.92;  // padded cover mode
const FRAME_EXT    = 'jpg';
const FRAME_PAD    = 4;

/* ---- State ---- */
let frames        = new Array(FRAME_COUNT).fill(null);
let loadedCount   = 0;
let currentFrame  = 0;
let bgColor       = '#03040a';
let appReady      = false;

/* ---- Elements ---- */
const loader      = document.getElementById('loader');
const loaderBar   = document.getElementById('loader-bar');
const loaderPct   = document.getElementById('loader-percent');
const canvasWrap  = document.getElementById('canvas-wrap');
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const scrollContainer = document.getElementById('scroll-container');
const heroSection = document.getElementById('hero');
const marqueeWrap = document.getElementById('marquee');
const darkOverlay = document.getElementById('dark-overlay');

/* ============================================================
   1. CANVAS SETUP
   ============================================================ */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ============================================================
   2. FRAME LOADER
   ============================================================ */
function padNum(n, len) {
  return String(n).padStart(len, '0');
}

function framePath(i) {
  return `frames/frame_${padNum(i + 1, FRAME_PAD)}.${FRAME_EXT}`;
}

function sampleBgColor(img) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 4; tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0, 4, 1);
  const px = tempCtx.getImageData(0, 0, 4, 1).data;
  const r = (px[0] + px[4] + px[8] + px[12]) / 4;
  const g = (px[1] + px[5] + px[9] + px[13]) / 4;
  const b = (px[2] + px[6] + px[10] + px[14]) / 4;
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function loadFrame(index) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frames[index] = img;
      loadedCount++;
      const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
      loaderBar.style.width = pct + '%';
      loaderPct.textContent = pct + '%';
      if (index % 20 === 0 && img.complete) {
        bgColor = sampleBgColor(img);
      }
      resolve();
    };
    img.onerror = () => {
      loadedCount++;
      resolve();
    };
    img.src = framePath(index);
  });
}

async function preloadFrames() {
  // Phase 1: Load first 10 frames immediately (fast first paint)
  const firstBatch = Array.from({ length: 10 }, (_, i) => loadFrame(i));
  await Promise.all(firstBatch);

  // Draw first frame and init
  drawFrame(0);
  initHeroAnimations();

  // Phase 2: Load remaining frames in background, then reveal
  const remaining = Array.from({ length: FRAME_COUNT - 10 }, (_, i) => loadFrame(i + 10));
  await Promise.all(remaining);

  // All frames loaded — hide loader and start
  loader.classList.add('hidden');
  appReady = true;
  initScrollSystem();
}

/* ============================================================
   3. CANVAS RENDERER — Padded Cover Mode
   ============================================================ */
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;

  const cw = canvas.width  / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.fillStyle = '#03040a';
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ============================================================
   4. HERO ENTRANCE ANIMATIONS (plays before scroll)
   ============================================================ */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.3 });

  tl.to('.hero-word', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    stagger: 0.12,
    ease: 'power4.out',
  })
  .to('.hero-tagline', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
  }, '-=0.5')
  .to(heroSection.querySelector('.section-label'), {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out',
  }, '-=0.7')
  .to('.scroll-indicator', {
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out',
  }, '-=0.3');
}

/* ============================================================
   5. SCROLL SYSTEM (Lenis + GSAP ScrollTrigger)
   ============================================================ */
function initScrollSystem() {
  /* --- Lenis Smooth Scroll --- */
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.refresh();

  /* --- Frame Scrubbing --- */
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(
        Math.floor(accelerated * FRAME_COUNT),
        FRAME_COUNT - 1
      );
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    },
  });

  /* --- Circle-Wipe Hero Transition --- */
  initHeroTransition();

  /* --- Marquee --- */
  initMarquee();

  /* --- Dark Overlay --- */
  initDarkOverlay(0.52, 0.74);

  /* --- Section Animations --- */
  positionSections();
  document.querySelectorAll('.scroll-section').forEach(setupSectionAnimation);

  /* --- Stat Counters --- */
  initCounters();
}

/* ============================================================
   6. HERO → CANVAS TRANSITION (Circle-Wipe)
   ============================================================ */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      // Hero fades out as soon as scroll begins
      const heroOpacity = Math.max(0, 1 - p * 18);
      heroSection.style.opacity = heroOpacity;

      // Canvas expands from circle — use 150% to ensure full coverage at all viewport sizes
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
      const radius = wipeProgress * 150;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    },
  });
}

/* ============================================================
   7. POSITION SECTIONS ABSOLUTELY
   ============================================================ */
function positionSections() {
  const containerHeight = scrollContainer.offsetHeight;

  document.querySelectorAll('.scroll-section').forEach((section) => {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const mid   = (enter + leave) / 2;
    const top   = mid * containerHeight;

    section.style.top = top + 'px';
    section.style.transform = 'translateY(-50%)';
    section.style.position = 'absolute';
  });
}

/* ============================================================
   8. SECTION ANIMATION SYSTEM
   ============================================================ */
function setupSectionAnimation(section) {
  const type    = section.dataset.animation;
  const persist = section.dataset.persist === 'true';
  const enter   = parseFloat(section.dataset.enter) / 100;
  const leave   = parseFloat(section.dataset.leave) / 100;

  const children = section.querySelectorAll(
    '.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat'
  );

  // Build entrance timeline
  const tl = gsap.timeline({ paused: true });

  switch (type) {
    case 'fade-up':
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-left':
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-right':
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'scale-up':
      tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
      break;
    case 'rotate-in':
      tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
      break;
    case 'stagger-up':
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
      break;
    case 'clip-reveal':
      tl.from(children, {
        clipPath: 'inset(100% 0 0 0)',
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power4.inOut',
      });
      break;
    default:
      tl.from(children, { opacity: 0, duration: 0.8, ease: 'power2.out' });
  }

  const midScrollProgress = (enter + leave) / 2;
  let hasPlayed = false;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: false,
    onUpdate: (self) => {
      const p = self.progress;
      const halfRange = (leave - enter) * 0.5;
      const fadeIn  = enter - halfRange * 0.1;
      const fadeOut = leave + halfRange * 0.1;

      const inRange = p >= enter && p <= leave;
      const pastRange = persist && p > leave;

      if (inRange || pastRange) {
        section.style.opacity = '1';
        section.style.pointerEvents = persist ? 'all' : 'none';
        if (!hasPlayed) {
          hasPlayed = true;
          tl.restart();
        }
      } else {
        section.style.opacity = '0';
        if (!persist) hasPlayed = false;
      }
    },
  });
}

/* ============================================================
   9. COUNTER ANIMATIONS
   ============================================================ */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach((el) => {
    const raw      = el.dataset.value;
    const decimals = parseInt(el.dataset.decimals || '0');

    // Special case: infinity symbol
    if (decimals === -1) {
      el.textContent = '∞';
      gsap.from(el, {
        opacity: 0,
        scale: 0.5,
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)',
        scrollTrigger: {
          trigger: el.closest('.scroll-section'),
          containerAnimation: undefined,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });
      return;
    }

    const target = parseFloat(raw);

    gsap.fromTo(
      el,
      { textContent: 0 },
      {
        textContent: target,
        duration: 2.2,
        ease: 'power1.out',
        snap: { textContent: decimals === 0 ? 1 : Math.pow(10, -decimals) },
        onUpdate() {
          el.textContent = parseFloat(el.textContent).toFixed(decimals);
        },
        scrollTrigger: {
          trigger: el.closest('.scroll-section'),
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });
}

/* ============================================================
   10. HORIZONTAL MARQUEE
   ============================================================ */
function initMarquee() {
  const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -30;

  gsap.to(marqueeWrap.querySelector('.marquee-text'), {
    xPercent: speed,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    },
  });

  // Marquee opacity — show during middle scroll range
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= 0.25 && p < 0.35) {
        opacity = (p - 0.25) / 0.10;
      } else if (p >= 0.35 && p < 0.65) {
        opacity = 1;
      } else if (p >= 0.65 && p < 0.75) {
        opacity = 1 - (p - 0.65) / 0.10;
      }
      marqueeWrap.style.opacity = opacity;
    },
  });
}

/* ============================================================
   11. DARK OVERLAY
   ============================================================ */
function initDarkOverlay(enter, leave) {
  const fadeRange = 0.04;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= enter - fadeRange && p < enter) {
        opacity = (p - (enter - fadeRange)) / fadeRange;
      } else if (p >= enter && p < leave) {
        opacity = 0.9;
      } else if (p >= leave && p <= leave + fadeRange) {
        opacity = 0.9 * (1 - (p - leave) / fadeRange);
      }

      darkOverlay.style.opacity = opacity;
    },
  });
}

/* ============================================================
   INIT
   ============================================================ */
preloadFrames();
