import * as THREE from 'three';
import { byLevel, clamp, rnd, smooth } from '../math.js';
import { hazardTexture, softDotTexture } from '../textures.js';
import { addMesh, emissiveMaterial, randomSpin, standardMaterial, throwBoxes } from './shared.js';

const HEIGHT = 2.6;
const TILT_RAMP_S = 0.6;

function createBlock(group, concrete) {
  const frontTexture = hazardTexture();
  const sideTexture = frontTexture.clone();
  sideTexture.needsUpdate = true;
  const hazard = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
  const materials = [concrete, hazard(frontTexture), concrete, concrete, hazard(sideTexture), hazard(sideTexture)];
  return addMesh(group, new THREE.BoxGeometry(1, HEIGHT, 5), materials, [0.5, HEIGHT / 2, 0]);
}

function createBeacons(group) {
  const beacons = [-1.8, 1.8].map((z, i) => {
    const color = i ? emissiveMaterial(2.6, 0.2, 0.2) : emissiveMaterial(2.8, 0.8, 0.1);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), color);
    beacon.position.set(0.5, HEIGHT + 0.38, z);
    group.add(beacon);
    return beacon;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xff3b2a, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
  halo.scale.set(5, 5, 1);
  halo.position.set(0.5, HEIGHT + 0.4, 0);
  group.add(halo);
  return { beacons, halo };
}

export function buildBarrier() {
  const group = new THREE.Group();
  const concrete = standardMaterial(0x8c92a0, { roughness: 0.95 });
  const block = createBlock(group, concrete);
  const cap = addMesh(group, new THREE.BoxGeometry(1.2, 0.18, 5.2), standardMaterial(0xb8bdc9), [0.5, HEIGHT + 0.09, 0]);
  const { beacons, halo } = createBeacons(group);

  let broken = false;
  let tilt = 0;

  return {
    group,
    animate(time) {
      if (broken) return;
      const firstOn = Math.sin(time * 7) > 0;
      beacons[0].visible = firstOn;
      beacons[1].visible = !firstOn;
      halo.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(time * 3.5));
    },
    crash(api) {
      const { level, force } = api;
      api.dust(api.world(group, 0, 1, 0), byLevel([4, 10, 16, 24, 40], level));
      throwBoxes(api, group, byLevel([0, 4, 8, 14, 0], level), { size: [0.12, 0.35], material: concrete, volume: { x: [0, 0.5], y: [0.3, 2.4], z: [-2.4, 2.4] } });
      tilt = byLevel([0, 0, 0.08, 0.25, 0], level);

      if (level >= 4) {
        broken = true;
        api.detach(cap, { vel: [5 * force, 6, rnd(-2, 2)], spin: randomSpin(5), r: 0.1 });
        beacons.forEach((beacon) => api.detach(beacon, { vel: [rnd(2, 6), rnd(4, 8), rnd(-3, 3)], spin: randomSpin(4), r: 0.2 }));
        halo.visible = false;
      }
      if (level >= 5) {
        block.visible = false;
        throwBoxes(api, group, 30, { size: [0.3, 0.9], material: concrete, volume: { x: [0, 1], y: [0.2, 2.5], z: [-2.5, 2.5] }, power: 1.6, lift: 6 });
      }
      return { slide: byLevel([0, 0.05, 0.8, 2.5, 0], level) };
    },
    tick(elapsed) {
      group.rotation.z = -tilt * smooth(clamp(elapsed / TILT_RAMP_S, 0, 1));
    },
  };
}
