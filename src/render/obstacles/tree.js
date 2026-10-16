import * as THREE from 'three';
import { byLevel, clamp, rnd, smooth } from '../math.js';
import { addMesh, randomSpin } from './shared.js';

const TRUNK_BASE_X = 0.55;
const LEAF_COLORS = [0x3f8f3a, 0x4fa043, 0x2f7d36];

const foliageMaterial = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

export function buildTree() {
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1, flatShading: true });

  const pivot = new THREE.Group();
  pivot.position.set(TRUNK_BASE_X, 0, 0);
  group.add(pivot);
  const add = (geometry, material, [x, y, z]) => addMesh(pivot, geometry, material, [x - TRUNK_BASE_X, y, z]);

  add(new THREE.CylinderGeometry(0.5, 0.65, 5.2, 9), bark, [0.55, 2.6, 0]);
  const foliage = [
    add(new THREE.IcosahedronGeometry(2.4, 1), foliageMaterial(0x3f8f3a), [0.6, 6.0, 0]),
    add(new THREE.IcosahedronGeometry(1.7, 1), foliageMaterial(0x4fa043), [1.8, 5.2, 0.9]),
    add(new THREE.IcosahedronGeometry(1.6, 1), foliageMaterial(0x2f7d36), [-0.2, 5.4, -1.1]),
  ];
  [-0.5, 0.5].forEach((z) => add(new THREE.BoxGeometry(0.9, 0.35, 0.3), bark, [0.55, 0.15, z]));

  const leafMaterials = LEAF_COLORS.map(foliageMaterial);
  const leafGeometry = new THREE.IcosahedronGeometry(0.18, 0);
  let motion = { sway: 0, lean: 0, fall: 0 };

  return {
    group,
    animate() {},
    crash(api) {
      const { level, force } = api;
      api.dust(api.world(group, 0.4, 0.8, 0), byLevel([4, 8, 14, 22, 36], level));
      for (let i = 0; i < byLevel([8, 20, 40, 60, 60], level); i++) {
        const origin = api.world(group, rnd(-1.5, 2.2), rnd(4.2, 7.4), rnd(-2, 2));
        api.piece(leafGeometry, leafMaterials[i % 3], origin, { vel: [rnd(-1, 3) * force, rnd(0, 3), rnd(-2, 2)], spin: randomSpin(4), r: 0.1, rest: 0.2 });
      }
      motion = { sway: byLevel([0.03, 0.06, 0.1, 0, 0], level), lean: byLevel([0, 0, 0.12, 0, 0.25], level), fall: level === 4 ? 1.45 : 0 };

      if (level >= 5) {
        foliage.forEach((crown, i) => api.detach(crown, { vel: [rnd(3, 8) * force, rnd(5, 9), rnd(-4, 4)], spin: randomSpin(3), r: 1 + i * 0.1, rest: 0.25 }));
        for (let i = 0; i < 8; i++) {
          const splinter = new THREE.BoxGeometry(0.1, rnd(0.5, 1.2), 0.1);
          const origin = api.world(group, rnd(0.2, 0.9), rnd(2.5, 4.6), rnd(-0.4, 0.4));
          api.piece(splinter, bark, origin, { vel: [rnd(1, 6) * force, rnd(2, 7), rnd(-3, 3)], spin: randomSpin(8), r: 0.1, ownGeo: true });
        }
      }
      return { slide: 0 };
    },
    tick(elapsed) {
      const sway = motion.sway * Math.exp(-1.4 * elapsed) * Math.sin(10 * elapsed);
      const lean = motion.lean * smooth(clamp(elapsed / 0.6, 0, 1));
      const fall = motion.fall * smooth(clamp(elapsed / 1.4, 0, 1));
      pivot.rotation.z = sway - lean - fall;
    },
  };
}
