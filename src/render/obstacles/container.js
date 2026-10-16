import * as THREE from 'three';
import { byLevel, clamp, hash, rnd, smooth } from '../math.js';
import { addMesh, drawnTexture, randomSpin, standardMaterial, steelMaterial, throwBoxes } from './shared.js';

const LENGTH = 6;
const HEIGHT = 2.6;
const WIDTH = 2.4;
const DENT_REACH = 2;
const TIP_RAMP_S = 0.9;

function paintRibs(context) {
  context.fillStyle = '#2a5ea8';
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#1f4a88';
  for (let i = 0; i < 4; i++) context.fillRect(i * 16 + 8, 0, 6, 64);
}

function dentFront(geometry, amount) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const distance = position.getX(i) + LENGTH / 2;
    if (distance > DENT_REACH) continue;
    const falloff = (1 - distance / DENT_REACH) ** 1.5;
    const noise = hash(position.getY(i) * 5.1 + position.getZ(i) * 3.7 + distance * 2.3);
    position.setX(i, position.getX(i) + amount * falloff * (0.7 + 0.6 * noise));
    position.setY(i, position.getY(i) + (noise - 0.5) * amount * 0.25 * falloff);
    position.setZ(i, position.getZ(i) + (hash(position.getY(i) + distance) - 0.5) * amount * 0.25 * falloff);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function buildContainer() {
  const group = new THREE.Group();
  const ribbed = standardMaterial(0xffffff, { map: drawnTexture(64, 64, paintRibs, [LENGTH / 0.25 / 4, 1]), roughness: 0.55, metalness: 0.35 });
  const end = standardMaterial(0x24539a, { roughness: 0.6, metalness: 0.3 });

  const geometry = new THREE.BoxGeometry(LENGTH, HEIGHT, WIDTH, 14, 6, 6);
  addMesh(group, geometry, [end, end, ribbed, ribbed, ribbed, ribbed], [LENGTH / 2, HEIGHT / 2 + 0.25, 0]);
  addMesh(group, new THREE.BoxGeometry(LENGTH + 0.06, 0.25, WIDTH + 0.06), standardMaterial(0x15233d, { metalness: 0.5 }), [LENGTH / 2, 0.125, 0]);

  const bars = [-0.45, -0.15, 0.15, 0.45].map((z) => addMesh(group, new THREE.BoxGeometry(0.06, HEIGHT - 0.3, 0.05), steelMaterial(), [-0.03, HEIGHT / 2 + 0.25, z]));
  const lockBar = addMesh(group, new THREE.BoxGeometry(0.08, 0.05, WIDTH - 0.2), steelMaterial(), [-0.04, 1.4, 0]);

  let tip = 0;

  return {
    group,
    animate() {},
    crash(api) {
      const { level, force } = api;
      const dent = byLevel([0, 0.12, 0.35, 0.6, 0.9], level);
      dentFront(geometry, dent);
      [...bars, lockBar].forEach((bar) => (bar.position.x += dent * 0.9));
      api.dust(api.world(group, 0, 1.2, 0), byLevel([5, 12, 20, 32, 50], level));

      if (level >= 3) {
        bars.slice(0, 2).forEach((bar) => api.detach(bar, { vel: [rnd(2, 5) * force, rnd(2, 5), rnd(-3, 3)], spin: randomSpin(6), r: 0.1 }));
        throwBoxes(api, group, byLevel([0, 0, 4, 8, 18], level), {
          size: [0.2, 0.55],
          material: standardMaterial(0x24539a, { metalness: 0.3 }),
          volume: { x: [0, 0.6], y: [0.5, 2.6], z: [-1.1, 1.1] },
        });
      }
      if (level >= 4) api.detach(lockBar, { vel: [4 * force, 5, rnd(-2, 2)], spin: randomSpin(6), r: 0.1 });
      tip = byLevel([0, 0, 0, 0.12, 0.55], level);
      return { slide: byLevel([0, 0.15, 0.5, 1.2, 2.5], level) };
    },
    tick(elapsed) {
      group.rotation.x = tip * smooth(clamp(elapsed / TIP_RAMP_S, 0, 1));
    },
  };
}
