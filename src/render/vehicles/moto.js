import * as THREE from 'three';
import { CAR_LENGTH } from '../../physics/params.js';
import { byLevel, clamp, rnd } from '../math.js';
import { addBox, darkMaterial, headlightMaterial, makeWheel, metalMaterial, switchOffHeadlight, switchOffTaillight, taillightMaterial } from './parts.js';
import { MOTORBIKE_MOTION } from './motion.js';

const WHEEL_RADIUS = 0.36;
const WHEEL_BASE = 1.55;
const FRONT_X = CAR_LENGTH - WHEEL_RADIUS;
const REAR_X = FRONT_X - WHEEL_BASE;

function createFrontEnd(paint, headlight) {
  const frontEnd = new THREE.Group();
  const wheel = makeWheel(WHEEL_RADIUS, 0.16, { spokes: 6 });
  wheel.position.set(FRONT_X, WHEEL_RADIUS, 0);
  frontEnd.add(wheel);

  addBox(frontEnd, [0.1, 0.8, 0.1], metalMaterial(0x9aa3b2), [FRONT_X - 0.1, 0.75, 0], -0.4);
  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8).rotateX(Math.PI / 2), darkMaterial(0x14151a));
  handlebar.position.set(FRONT_X - 0.38, 1.32, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), headlight);
  lamp.position.set(CAR_LENGTH - 0.12, 1.08, 0);
  lamp.scale.set(0.7, 1, 1);
  frontEnd.add(handlebar, lamp);
  addBox(frontEnd, [0.65, 0.05, 0.2], paint, [FRONT_X + 0.02, 0.8, 0], -0.1);
  return { frontEnd, wheel };
}

function createFrame(root, paint, taillight) {
  const black = darkMaterial(0x14151a);
  addBox(root, [1.3, 0.12, 0.14], black, [REAR_X + 0.9, 0.62, 0], 0.12);
  addBox(root, [0.62, 0.55, 0.38], metalMaterial(0x6b7280), [REAR_X + 0.95, 0.5, 0]);
  addBox(root, [1.0, 0.08, 0.12], black, [REAR_X + 0.45, 0.42, 0], 0.1);
  addBox(root, [0.8, 0.14, 0.34], black, [REAR_X + 0.55, 1.0, 0], 0.05);
  addBox(root, [0.55, 0.2, 0.3], paint, [REAR_X + 0.1, 1.08, 0], 0.18);

  const fuelTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12), paint);
  fuelTank.rotation.z = Math.PI / 2 - 0.12;
  fuelTank.position.set(REAR_X + 1.35, 1.08, 0);
  root.add(fuelTank);

  const taillightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), taillight);
  taillightMesh.position.set(REAR_X - 0.1, 1.05, 0);
  root.add(taillightMesh);
  return fuelTank;
}

function createRider(paint) {
  const rider = new THREE.Group();
  rider.position.set(REAR_X + 0.8, 1.05, 0);
  const suit = darkMaterial(0x1b1e29);
  addBox(rider, [0.34, 0.75, 0.46], suit, [-0.1, 0.5, 0], -0.55);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), paint);
  helmet.position.set(0.25, 1.07, 0);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x05070d, metalness: 0.9, roughness: 0.05 }));
  visor.position.set(0.37, 1.07, 0);
  visor.scale.set(0.7, 0.8, 1.05);
  rider.add(helmet, visor);

  [-0.26, 0.26].forEach((z) => {
    addBox(rider, [0.7, 0.14, 0.14], suit, [0.3, 0.5, z], -0.35);
    addBox(rider, [0.14, 0.7, 0.16], suit, [0.05, -0.2, z * 0.9], 0.35);
  });
  return rider;
}

function crashMotorbike(api, parts) {
  const { root, frontEnd, frontWheel, rider, fuelTank, fireMark, headlight, taillight } = parts;
  const { level, force } = api;
  const crush = byLevel([0.05, 0.2, 0.4, 0.6, 0.8], level);

  root.rotation.z = 0;
  frontEnd.position.x -= crush;
  frontEnd.rotation.z = crush * 0.12;

  if (level >= 2) {
    switchOffHeadlight(headlight);
    switchOffTaillight(taillight);
    rider.rotation.z = -0.3;
  }
  if (level >= 3) {
    const ejectSpeed = 4 + api.speed * 0.06;
    const spinDirection = Math.random() < 0.5 ? -1 : 1;
    api.detach(rider, { vel: [ejectSpeed, 4 + 2 * force, rnd(-1.5, 1.5)], spin: [rnd(-3, 3), rnd(-2, 2), rnd(5, 9) * spinDirection], r: 0.45, rest: 0.25 });
    api.detach(frontWheel, { vel: [3 * force, 1.5 * force, rnd(-2, 2)], spin: [0, 0, -10], r: WHEEL_RADIUS, rest: 0.45 });
  }

  const enginePoint = () => api.world(fireMark);
  if (level === 2) api.burn(enginePoint, 3, { smokeRate: 6, dark: 0.8 });
  if (level === 3) api.burn(enginePoint, 4.5, { smokeRate: 9, dark: 0.45 });
  if (level >= 4) api.burn(enginePoint, 6, { fireRate: 32, smokeRate: 12, dark: 0.15 });
  if (level >= 5) {
    api.detach(fuelTank, { vel: [2 * force, 7 * force, rnd(-2, 2)], spin: [3, 5, 4], r: 0.2 });
    api.explode(api.world(root, REAR_X + 1.3, 1.0, 0), 0.9);
  }
  return { crush };
}

export function buildMotorbike() {
  const root = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, metalness: 0.5, roughness: 0.3, clearcoat: 1 });
  const headlight = headlightMaterial();
  const taillight = taillightMaterial();

  const rearWheel = makeWheel(WHEEL_RADIUS, 0.16, { spokes: 6 });
  rearWheel.position.set(REAR_X, WHEEL_RADIUS, 0);
  const { frontEnd, wheel: frontWheel } = createFrontEnd(paint, headlight);
  const rider = createRider(paint);
  root.add(rearWheel, frontEnd, rider);
  const fuelTank = createFrame(root, paint, taillight);

  const fireMark = new THREE.Object3D();
  fireMark.position.set(REAR_X + 0.95, 0.9, 0);
  root.add(fireMark);

  const parts = { root, frontEnd, frontWheel, rider, fuelTank, fireMark, headlight, taillight };

  return {
    root,
    colorMaterials: [paint],
    motion: MOTORBIKE_MOTION,
    meta: { rearWheelX: REAR_X, trackZ: 0.1, eye: [3.65, 2.2] },
    pose(x, acceleration) {
      frontWheel.rotation.z = rearWheel.rotation.z = -x / WHEEL_RADIUS;
      root.rotation.z = clamp(acceleration * 0.003, -0.05, 0.05);
    },
    crash: (api) => crashMotorbike(api, parts),
  };
}
