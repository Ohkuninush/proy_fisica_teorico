import * as THREE from 'three';
import { addMesh, standardMaterial } from '../obstacles/shared.js';
import { finishStrip, labelTexture, POST_Z } from './shared.js';

const COLUMN_Y = 3.4;
const ARCH_Y = 6;
const BREATH_SPEED = 2;
const BREATH_SIZE = 0.012;
const BOUNCE_RATE = 18;
const BOUNCE_DECAY = 4;
const BOUNCE_SIZE = 0.08;

export function buildInflatable() {
  const group = new THREE.Group();
  const red = standardMaterial(0xe5384a, { roughness: 0.4 });
  const blue = standardMaterial(0x2f6df0, { roughness: 0.4 });
  const cloth = new THREE.MeshStandardMaterial({ map: labelTexture('META', { background: '#101827', color: '#ffe14a' }), roughness: 0.6, side: THREE.DoubleSide });

  finishStrip(group, standardMaterial(0xffffff, { roughness: 0.8, opacity: 0.9, transparent: true }));
  [-POST_Z, POST_Z].forEach((z) => addMesh(group, new THREE.CapsuleGeometry(0.55, 5.4, 8, 20), red, [0, COLUMN_Y, z]));

  const arch = addMesh(group, new THREE.TorusGeometry(POST_Z, 0.55, 16, 48, Math.PI), blue, [0, ARCH_Y, 0]);
  arch.rotation.y = Math.PI / 2;
  arch.scale.y = 0.38;

  const banner = addMesh(group, new THREE.PlaneGeometry(9, 2.8), cloth, [0, ARCH_Y + 0.9, 0]);
  banner.rotation.y = Math.PI / 2;

  let bounceAge = Infinity;

  return {
    group,
    animate(time) {
      const breath = 1 + Math.sin(time * BREATH_SPEED) * BREATH_SIZE;
      group.scale.set(breath, bounceAge === Infinity ? breath : group.scale.y, breath);
    },
    celebrate() {
      bounceAge = 0;
    },
    tick(dt) {
      if (bounceAge === Infinity) return;
      bounceAge += dt;
      group.scale.y = 1 + BOUNCE_SIZE * Math.exp(-bounceAge * BOUNCE_DECAY) * Math.sin(bounceAge * BOUNCE_RATE);
    },
    reset() {
      bounceAge = Infinity;
      group.scale.set(1, 1, 1);
    },
  };
}
