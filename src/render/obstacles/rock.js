import * as THREE from 'three';
import { byLevel, clamp, rnd, smooth } from '../math.js';
import { addMesh, randomSpin } from './shared.js';

const ROLL_RAMP_S = 0.8;

function roughRockGeometry(radius, [scaleX, scaleY, scaleZ], seed) {
  const geometry = new THREE.DodecahedronGeometry(radius, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const bump = 1 + Math.sin(position.getX(i) * 7.1 + seed) * Math.cos(position.getZ(i) * 5.3 + seed) * 0.18;
    position.setXYZ(i, position.getX(i) * bump * scaleX, position.getY(i) * bump * scaleY, position.getZ(i) * bump * scaleZ);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function buildRock() {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x7d828d, roughness: 0.95, flatShading: true });
  const moss = new THREE.MeshStandardMaterial({ color: 0x5e6b52, roughness: 1, flatShading: true });

  const addBoulder = (radius, scale, [x, y, z], material, seed) => {
    const geometry = roughRockGeometry(radius, scale, seed);
    const mesh = addMesh(group, geometry, material, [0, 0, 0]);
    mesh.position.set(x - geometry.boundingBox.min.x, y - geometry.boundingBox.min.y, z);
  };
  addBoulder(1.55, [1.0, 0.95, 1.35], [0, 0, 0], stone, 1);
  addBoulder(0.9, [1, 0.9, 1], [0.2, 0, 1.6], moss, 4);
  addBoulder(0.7, [1, 0.8, 1], [0.5, 0, -1.7], stone, 9);
  addBoulder(0.45, [1, 0.8, 1], [0, 0, 0.8], moss, 13);

  let roll = 0;

  const throwFragment = (api, radius, power) => {
    const origin = api.world(group, rnd(0.3, 2), rnd(0.6, 2.2), rnd(-1.5, 1.5));
    api.piece(new THREE.DodecahedronGeometry(radius, 0), stone, origin, {
      vel: [rnd(3, 9) * api.force * power, rnd(1, 6), rnd(-4, 4)],
      spin: randomSpin(7),
      r: radius * 0.8,
      rest: 0.3,
      ownGeo: true,
    });
  };

  return {
    group,
    animate() {},
    crash(api) {
      const { level } = api;
      api.dust(api.world(group, 0, 1, 0), byLevel([5, 10, 18, 40, 70], level));
      for (let i = 0; i < byLevel([3, 6, 10, 0, 0], level); i++) throwFragment(api, rnd(0.1, 0.3), 0.6);
      roll = byLevel([0, 0, 0.6, 0, 0], level);

      if (level >= 4) {
        group.visible = false;
        for (let i = 0; i < byLevel([0, 0, 0, 6, 8], level); i++) throwFragment(api, rnd(0.45, 0.8), 1);
      }
      if (level >= 5) {
        for (let i = 0; i < 40; i++) throwFragment(api, rnd(0.08, 0.22), 1.4);
      }
      return { slide: byLevel([0, 0.1, 0.5, 0, 0], level) };
    },
    tick(elapsed) {
      group.rotation.z = -roll * smooth(clamp(elapsed / ROLL_RAMP_S, 0, 1));
    },
  };
}
