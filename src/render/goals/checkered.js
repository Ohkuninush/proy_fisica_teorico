import * as THREE from 'three';
import { addMesh, standardMaterial } from '../obstacles/shared.js';
import { checkerTexture, finishStrip, POST_Z, ROAD_SPAN } from './shared.js';

const POST_HEIGHT = 6.4;
const BEAM_HEIGHT = 1.4;
const WAVE_SPEED = 2.2;
const WAVE_SIZE = 0.01;

export function buildCheckered() {
  const group = new THREE.Group();
  const white = standardMaterial(0xf2f2f2, { roughness: 0.5 });
  const dark = standardMaterial(0x14141c, { roughness: 0.6 });
  const checker = standardMaterial(0xffffff, { map: checkerTexture(20, 2, 32), roughness: 0.55 });

  finishStrip(group, new THREE.MeshStandardMaterial({ map: checkerTexture(2, 14, 32), roughness: 0.7 }));
  [-POST_Z, POST_Z].forEach((z) => {
    addMesh(group, new THREE.BoxGeometry(0.6, POST_HEIGHT, 0.6), white, [0, POST_HEIGHT / 2, z]);
    addMesh(group, new THREE.BoxGeometry(1.1, 0.3, 1.1), dark, [0, 0.15, z]);
  });
  const beam = addMesh(group, new THREE.BoxGeometry(0.7, BEAM_HEIGHT, ROAD_SPAN + 0.6), [checker, checker, dark, dark, dark, dark], [0, POST_HEIGHT + BEAM_HEIGHT / 2 - 0.2, 0]);

  return {
    group,
    animate(time) {
      beam.rotation.x = Math.sin(time * WAVE_SPEED) * WAVE_SIZE;
    },
  };
}
