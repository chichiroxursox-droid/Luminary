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
