import '../styles/main.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initDebug } from './debug.js';
import { initSky, getSunPosition } from './sky.js';
import { initHouse, update as updateHouse } from './house.js';
import { initEnvironment } from './environment.js';
import { initParticles, update as updateParticles } from './particles.js';
import { initScroll, getProgress, cameraState, refreshScroll } from './scroll.js';
import { initCharacter, playGreeting, updateCharacter } from './character.js';
import { initState, getState, transitionTo, onStateChange, STATES } from './state.js';
import { initComputer, enterComputer, exitComputer } from './computer.js';
import { initExplore, enableExplore, disableExplore, updateExplore } from './explore.js';
import { initChat, focusChat } from './chat.js';

gsap.registerPlugin(ScrollTrigger);

// ── Shared params ──
const params = {
  bloom: { strength: 0.3, radius: 0.5, threshold: 0.7 },
  fog: { near: 25, far: 80 },
  particles: { count: 200, speed: 0.002 },
  light: { sunIntensity: 1.5, hemiIntensity: 0.6 },
};

// ── Renderer ──
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xE8B87A);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene ──
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE8B87A, params.fog.near, params.fog.far);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 30, 0);
camera.lookAt(0, 0, 0);

// ── Lights ──
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xE8B87A, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xFFF5E0, params.light.sunIntensity);
sunLight.position.set(5, 10, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.right = 10;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 30;
scene.add(sunLight);

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

// ── Lenis smooth scroll ──
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ── Debug ──
initDebug(params);

// ── Scroll ──
initScroll();

// ── Timer ──
const timer = new THREE.Timer();

// ── State machine ──
initState(lenis);

let hasTriggeredGreeting = false;

// Room overview position (where camera settles after scroll)
const ROOM_POS = new THREE.Vector3(0, 1.7, -0.5);
const ROOM_LOOK = new THREE.Vector3(-1.8, 1.0, -1.5);

onStateChange((newState, oldState) => {
  // Disable fog when inside the house
  if (newState !== STATES.SCROLLING) {
    scene.fog.near = 100;
    scene.fog.far = 200;
  } else {
    scene.fog.near = params.fog.near;
    scene.fog.far = params.fog.far;
  }

  // Handle mode-specific enter/exit
  if (oldState === STATES.COMPUTER) {
    exitComputer(camera, ROOM_POS, ROOM_LOOK);
  }
  if (oldState === STATES.EXPLORING) {
    disableExplore();
    gsap.to(camera.position, {
      x: ROOM_POS.x, y: ROOM_POS.y, z: ROOM_POS.z,
      duration: 1, ease: 'power2.inOut',
      onUpdate: () => camera.lookAt(ROOM_LOOK),
    });
  }

  if (newState === STATES.COMPUTER) {
    enterComputer(camera);
  }
  if (newState === STATES.EXPLORING) {
    enableExplore();
  }
  if (newState === STATES.CHATTING) {
    focusChat();
  }
});

// ── Init modules ──
async function init() {
  const { sunPosition } = initSky(scene, renderer);
  sunLight.position.copy(sunPosition).multiplyScalar(10);

  await Promise.all([
    initHouse(scene),
    initCharacter(scene),
  ]);
  initEnvironment(scene);
  initParticles(scene, params);
  initComputer(scene, camera, renderer);
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

init();

// ── Tab visibility ──
let isTabVisible = true;
document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden;
  if (document.hidden) {
    timer.disconnect();
  } else {
    timer.connect();
  }
});

// ── Render loop ──
function animate() {
  requestAnimationFrame(animate);
  if (!isTabVisible) return;

  timer.update();
  const progress = getProgress();
  const state = getState();

  // Sync debug params
  bloomPass.strength = params.bloom.strength;
  bloomPass.radius = params.bloom.radius;
  bloomPass.threshold = params.bloom.threshold;
  if (state === STATES.SCROLLING) {
    scene.fog.near = params.fog.near;
    scene.fog.far = params.fog.far;
  }
  hemiLight.intensity = params.light.hemiIntensity;
  sunLight.intensity = params.light.sunIntensity;

  // DoF: subtle blur at distance, sharp when close, disabled inside house
  if (state === STATES.SCROLLING && progress < 0.4) {
    bokehPass.enabled = true;
    const houseCenter = new THREE.Vector3(0, 1, 0);
    bokehPass.uniforms['focus'].value = camera.position.distanceTo(houseCenter);
    bokehPass.uniforms['aperture'].value = 0.002 * (1 - progress / 0.4);
  } else {
    bokehPass.enabled = false;
  }

  if (state === STATES.SCROLLING) {
    // Apply camera proxy from scroll spline
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.lookAt(cameraState.lookX, cameraState.lookY, cameraState.lookZ);

    // Trigger greeting when scroll reaches end
    if (progress >= 0.99 && !hasTriggeredGreeting) {
      hasTriggeredGreeting = true;
      transitionTo(STATES.GREETING);

      // Play greeting animation, then show menu
      const greetingTl = playGreeting();
      if (greetingTl) {
        greetingTl.eventCallback('onComplete', () => {
          transitionTo(STATES.MENU);
        });
      } else {
        // No character loaded, go straight to menu
        setTimeout(() => transitionTo(STATES.MENU), 1000);
      }
    }
  }
  // In other states, camera is controlled by GSAP tweens or OrbitControls

  // Update modules
  updateHouse(progress);
  updateParticles(progress);
  updateCharacter(state, progress);
  updateExplore();

  composer.render();
}

animate();

// ── Resize ──
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
    refreshScroll();
  }, 150);
});
