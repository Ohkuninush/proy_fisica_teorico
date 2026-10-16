import * as THREE from 'three';
import { softDotTexture } from '../textures.js';
import { ROAD_HALF_WIDTH } from './constants.js';

const LAMP_COUNT = 14;
const LAMP_SPACING = 22;

function createLamp({ poleMaterial, bulbMaterial, glow }) {
  const lamp = new THREE.Group();

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 8), poleMaterial);
  pole.position.y = 3.5;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMaterial);
  arm.position.set(0.8, 7, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.25), bulbMaterial);
  bulb.position.set(1.5, 6.94, 0);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb35a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  halo.scale.set(7, 7, 1);
  halo.position.set(1.5, 6.9, 0.2);

  const lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshBasicMaterial({ map: glow, color: 0xffa550, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }),
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(1.5, 0.02, 4.8);

  lamp.add(pole, arm, bulb, halo, lightPool);
  lamp.position.z = -ROAD_HALF_WIDTH - 1.1;
  return lamp;
}

export function createLamps(scene) {
  const parts = {
    poleMaterial: new THREE.MeshStandardMaterial({ color: 0x20253a, metalness: 0.6, roughness: 0.5 }),
    bulbMaterial: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9), toneMapped: false }),
    glow: softDotTexture(),
  };
  const root = new THREE.Group();
  const lamps = Array.from({ length: LAMP_COUNT }, () => {
    const lamp = createLamp(parts);
    root.add(lamp);
    return lamp;
  });
  scene.add(root);

  return {
    root,
    update(centerX) {
      const first = Math.floor(centerX / LAMP_SPACING) - LAMP_COUNT / 2;
      lamps.forEach((lamp, i) => (lamp.position.x = (first + i) * LAMP_SPACING));
    },
  };
}
