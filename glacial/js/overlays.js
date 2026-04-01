/* ============================================================
   GLACIAL — overlays.js
   Three.js: particles + mouse parallax (direct render, no postprocessing)
   Chromatic aberration applied via CSS filter on frame canvas.
   ============================================================ */

/* ---- State ---- */
var renderer, scene, camera;
var snowParticles, dustParticles, sparkleParticles;
var mouseX = 0, mouseY = 0;
var currentProgress = 0;

/* ============================================================
   1. INIT
   ============================================================ */
window.initOverlays = function () {
  /* Renderer — alpha: true for transparent background */
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.id = 'three-canvas';
  document.body.appendChild(renderer.domElement);

  /* Scene + Camera */
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  /* Particles */
  createSnowParticles();
  createDustParticles();
  createSparkleParticles();

  /* Mouse tracking */
  document.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* Resize handler */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* Start render loop */
  animate();
};

/* ============================================================
   2. PARTICLE SYSTEMS
   ============================================================ */
function createSnowParticles() {
  var count = 500;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(count * 3);
  var velocities = new Float32Array(count);

  for (var i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    velocities[i] = Math.random() * 2 + 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.userData.velocities = velocities;
  geometry.userData.originalY = new Float32Array(positions.filter(function (_, i) { return i % 3 === 1; }));

  var material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  snowParticles = new THREE.Points(geometry, material);
  scene.add(snowParticles);
}

function createDustParticles() {
  var count = 300;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(count * 3);

  for (var i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var material = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.2,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  dustParticles = new THREE.Points(geometry, material);
  scene.add(dustParticles);
}

function createSparkleParticles() {
  var count = 200;
  var geometry = new THREE.BufferGeometry();
  var positions = new Float32Array(count * 3);

  for (var i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var material = new THREE.PointsMaterial({
    color: 0x00d9ff,
    size: 0.35,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  sparkleParticles = new THREE.Points(geometry, material);
  scene.add(sparkleParticles);
}

/* ============================================================
   3. UPDATE (called by app.js on scroll)
   ============================================================ */
window.updateOverlays = function (progress) {
  currentProgress = progress;

  /* --- Particle visibility per scene --- */

  // Snow: visible Scene 1 (0–0.30), fades during loop transition
  if (progress < 0.30) {
    snowParticles.material.opacity = 0.7;
  } else if (progress < 0.35) {
    snowParticles.material.opacity = 0.7 * (1 - (progress - 0.30) / 0.05);
  } else if (progress > 0.95) {
    snowParticles.material.opacity = 0.7 * ((progress - 0.95) / 0.05);
  } else {
    snowParticles.material.opacity = 0;
  }

  // Dust: visible Scene 2 (0.30–0.70)
  if (progress > 0.30 && progress < 0.35) {
    dustParticles.material.opacity = 0.5 * ((progress - 0.30) / 0.05);
  } else if (progress >= 0.35 && progress < 0.65) {
    dustParticles.material.opacity = 0.5;
  } else if (progress >= 0.65 && progress < 0.70) {
    dustParticles.material.opacity = 0.5 * (1 - (progress - 0.65) / 0.05);
  } else {
    dustParticles.material.opacity = 0;
  }

  // Sparkles: visible Scene 3 (0.70–0.95)
  if (progress > 0.70 && progress < 0.75) {
    sparkleParticles.material.opacity = 0.8 * ((progress - 0.70) / 0.05);
  } else if (progress >= 0.75 && progress < 0.90) {
    sparkleParticles.material.opacity = 0.8;
  } else if (progress >= 0.90 && progress < 0.95) {
    sparkleParticles.material.opacity = 0.8 * (1 - (progress - 0.90) / 0.05);
  } else {
    sparkleParticles.material.opacity = 0;
  }

  /* --- Mouse parallax (Scene 1 only) --- */
  if (progress < 0.30) {
    snowParticles.position.x = mouseX * 3;
    snowParticles.position.y = -mouseY * 2;
  } else {
    snowParticles.position.x = 0;
    snowParticles.position.y = 0;
  }
};

/* ============================================================
   4. ANIMATION LOOP
   ============================================================ */
function animate() {
  requestAnimationFrame(animate);

  var time = performance.now() * 0.001;

  /* Animate snow bobbing */
  if (snowParticles && snowParticles.material.opacity > 0) {
    var positions = snowParticles.geometry.attributes.position.array;
    var velocities = snowParticles.geometry.userData.velocities;
    var originalY = snowParticles.geometry.userData.originalY;
    for (var i = 0; i < velocities.length; i++) {
      positions[i * 3 + 1] = originalY[i] + Math.sin(time * velocities[i]) * 0.5;
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  /* Slow rotation on dust */
  if (dustParticles && dustParticles.material.opacity > 0) {
    dustParticles.rotation.y = time * 0.05;
  }

  /* Sparkle drift */
  if (sparkleParticles && sparkleParticles.material.opacity > 0) {
    sparkleParticles.rotation.y = time * 0.08;
    sparkleParticles.rotation.x = Math.sin(time * 0.3) * 0.1;
  }

  /* Render directly — no postprocessing, preserves alpha */
  renderer.render(scene, camera);
}
