import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

let sunPosition = new THREE.Vector3();

export function initSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(450000);

  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = 4;
  uniforms['rayleigh'].value = 2;
  uniforms['mieCoefficient'].value = 0.005;
  uniforms['mieDirectionalG'].value = 0.8;

  const phi = THREE.MathUtils.degToRad(90 - 10);
  const theta = THREE.MathUtils.degToRad(220);
  sunPosition.setFromSphericalCoords(1, phi, theta);
  uniforms['sunPosition'].value.copy(sunPosition);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const renderTarget = pmremGenerator.fromScene(skyScene);
  scene.background = renderTarget.texture;
  scene.environment = renderTarget.texture;
  pmremGenerator.dispose();

  return { sunPosition };
}

export function getSunPosition() {
  return sunPosition;
}
