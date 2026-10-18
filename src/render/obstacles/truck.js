import * as THREE from 'three';
import { byLevel, clamp, rnd, smooth } from '../math.js';
import { softDotTexture } from '../textures.js';
import { addMesh, emissiveMaterial, randomSpin, standardMaterial, steelMaterial, throwBoxes } from './shared.js';

const CARGO_LENGTH = 5.2;
const CARGO_HEIGHT = 2.9;
const WIDTH = 2.4;
const FLOOR_Y = 0.95;
const SETTLE_RAMP_S = 1.2;

function addCargoAndCab(group) {
  const white = standardMaterial(0xe6e9f0, { roughness: 0.5 });
  addMesh(group, new THREE.BoxGeometry(CARGO_LENGTH, CARGO_HEIGHT, WIDTH), white, [CARGO_LENGTH / 2, FLOOR_Y + CARGO_HEIGHT / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(CARGO_LENGTH + 0.02, 0.4, WIDTH + 0.02), standardMaterial(0x2a5ea8), [CARGO_LENGTH / 2, FLOOR_Y + 1.6, 0]);
  addMesh(group, new THREE.BoxGeometry(1.7, 2.1, WIDTH - 0.1), standardMaterial(0xd9dde6), [CARGO_LENGTH + 0.95, FLOOR_Y + 1.05, 0]);
  const windshield = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05 });
  addMesh(group, new THREE.BoxGeometry(0.06, 0.9, WIDTH - 0.35), windshield, [CARGO_LENGTH + 1.82, FLOOR_Y + 1.45, 0]);
  addMesh(group, new THREE.BoxGeometry(CARGO_LENGTH + 1.8, 0.3, 1.5), standardMaterial(0x1a1c22), [(CARGO_LENGTH + 1.8) / 2, 0.8, 0]);
}

function addRearDetails(group) {
  const bumper = addMesh(group, new THREE.BoxGeometry(0.2, 0.3, WIDTH), standardMaterial(0x2b2e36), [-0.1, 0.65, 0]);
  [0.45, 0.75].forEach((y, i) => {
    const stripe = standardMaterial(i ? 0xff3030 : 0xf5f5f5, { emissive: i ? 0x550000 : 0x333333 });
    addMesh(group, new THREE.BoxGeometry(0.03, 0.14, WIDTH - 0.2), stripe, [-0.02, y + 0.2, 0]);
  });
  const doorBars = [-0.4, 0, 0.4].map((z) => addMesh(group, new THREE.BoxGeometry(0.05, CARGO_HEIGHT - 0.2, 0.05), steelMaterial(), [-0.03, FLOOR_Y + CARGO_HEIGHT / 2, z]));
  return { bumper, doorBars };
}

function addWheels(group) {
  const tire = standardMaterial(0x0c0c10, { roughness: 0.9 });
  const rim = steelMaterial();
  [1.2, 1.9, 5.6].forEach((x) =>
    [-1.1, 1.1].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 24).rotateX(Math.PI / 2), tire);
      wheel.position.set(x, 0.5, z);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16).rotateX(Math.PI / 2), rim);
      hub.position.copy(wheel.position);
      group.add(wheel, hub);
    }),
  );
}

function addHazardLights(group) {
  const lamps = [-0.9, 0.9].map((z) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.3), emissiveMaterial(2.8, 1.0, 0.1));
    lamp.position.set(-0.04, 1.35, z);
    group.add(lamp);
    return lamp;
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: 0xffa020, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  halo.scale.set(4, 4, 1);
  halo.position.set(-0.2, 1.4, 0);
  group.add(halo);
  return { lamps, halo };
}

export function buildTruck() {
  const group = new THREE.Group();
  addCargoAndCab(group);
  const { bumper, doorBars } = addRearDetails(group);
  addWheels(group);
  const { lamps, halo } = addHazardLights(group);
  const crate = standardMaterial(0xb08a55, { roughness: 0.9 });

  let lightsOut = false;
  let tilt = 0;
  let yaw = 0;

  return {
    group,
    animate(time) {
      if (lightsOut) return;
      const on = Math.sin(time * 6) > 0;
      lamps.forEach((lamp) => (lamp.visible = on));
      halo.visible = on;
    },
    crash(api) {
      const { level, force } = api;
      api.dust(api.world(group, 0, 1, 0), byLevel([4, 10, 18, 30, 48], level));

      if (level >= 3) {
        api.detach(bumper, { vel: [rnd(2, 4) * force, 2, rnd(-2, 2)], spin: randomSpin(4), r: 0.15 });
        doorBars.forEach((bar) => api.detach(bar, { vel: [rnd(2, 6) * force, rnd(2, 5), rnd(-3, 3)], spin: randomSpin(6), r: 0.1 }));
        throwBoxes(api, group, byLevel([0, 0, 4, 10, 22], level), { size: [0.3, 0.7], material: crate, volume: { x: [0, 0.6], y: [1.2, 3.6], z: [-1.0, 1.0] } });
      }
      if (level >= 4) {
        lightsOut = true;
        lamps.forEach((lamp) => (lamp.visible = false));
        halo.visible = false;
      }
      if (level >= 5) api.burn(() => api.world(group, 0.5, 2.2, 0), 6.5, { fireRate: 30, smokeRate: 12, dark: 0.15 });

      tilt = byLevel([0, 0, 0.02, 0.06, 0.15], level);
      yaw = byLevel([0, 0, 0.05, 0.15, 0.35], level);
      return { slide: byLevel([0, 0.4, 2, 5, 9], level) };
    },
    tick(elapsed) {
      const eased = smooth(clamp(elapsed / SETTLE_RAMP_S, 0, 1));
      group.rotation.z = -tilt * eased;
      group.rotation.y = yaw * eased;
    },
  };
}
