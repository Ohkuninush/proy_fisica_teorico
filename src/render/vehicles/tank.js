import * as THREE from 'three';
import { CAR_LENGTH } from '../../physics/params.js';
import { byLevel, rnd } from '../math.js';
import { addBox, darkMaterial, headlightMaterial, makeWheel, metalMaterial, switchOffHeadlight } from './parts.js';
import { TANK_MOTION } from './motion.js';

const TRACK_LENGTH = 3.9;
const TRACK_HEIGHT = 0.85;
const TRACK_X = 0.1;
const TRACK_SIDE_Z = 0.95;
const ROAD_WHEELS_PER_TRACK = 5;
const ROAD_WHEEL_RADIUS = 0.26;
const GUN_START_X = 2.55;
const TURRET_X = 1.85;
const TREAD_REPEAT = 5;

function createTreadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#1a1c20';
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = '#3a3e46';
  context.fillRect(0, 0, 40, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(TREAD_REPEAT, 1);
  return texture;
}

function createTrackGeometry() {
  const radius = TRACK_HEIGHT / 2;
  const startX = radius;
  const endX = TRACK_LENGTH - radius;
  const stadium = new THREE.Shape();
  stadium.moveTo(startX, 0);
  stadium.lineTo(endX, 0);
  stadium.absarc(endX, radius, radius, -Math.PI / 2, Math.PI / 2, false);
  stadium.lineTo(startX, TRACK_HEIGHT);
  stadium.absarc(startX, radius, radius, Math.PI / 2, (3 * Math.PI) / 2, false);
  return new THREE.ExtrudeGeometry(stadium, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
}

function createTracks(root, treadMaterial) {
  const geometry = createTrackGeometry();
  const radius = TRACK_HEIGHT / 2;
  const wheels = [];
  [-TRACK_SIDE_Z, TRACK_SIDE_Z].forEach((z) => {
    const track = new THREE.Mesh(geometry, treadMaterial);
    track.position.set(TRACK_X, 0, z - 0.25);
    root.add(track);
    for (let i = 0; i < ROAD_WHEELS_PER_TRACK; i++) {
      const wheel = makeWheel(ROAD_WHEEL_RADIUS, 0.54, { tire: darkMaterial(0x15171b), rim: metalMaterial(0x7b8190), spokes: 4 });
      const spread = (i * (TRACK_LENGTH - 2 * radius)) / (ROAD_WHEELS_PER_TRACK - 1);
      wheel.position.set(TRACK_X + radius + spread, radius, z);
      root.add(wheel);
      wheels.push(wheel);
    }
  });
  return wheels;
}

function createHull(root, hullMaterial, headlight) {
  addBox(root, [3.7, 0.55, 1.55], hullMaterial, [2.0, 0.95, 0]);
  const glacis = addBox(root, [1.0, 0.4, 1.5], hullMaterial, [3.55, 0.88, 0], -0.35);
  addBox(root, [0.4, 0.3, 1.5], hullMaterial, [0.35, 1.0, 0]);
  [-1.02, 1.02].forEach((z) => addBox(root, [3.6, 0.18, 0.1], hullMaterial, [2.0, 1.1, z]));
  [-0.5, 0.5].forEach((z) => addBox(root, [0.08, 0.1, 0.18], headlight, [3.95, 0.97, z]));
  return glacis;
}

function createTurret(hullMaterial) {
  const steel = darkMaterial(0x23262c);
  const turret = new THREE.Group();
  turret.position.set(TURRET_X, 1.5, 0);

  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.5, 8), hullMaterial);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.22, 10), hullMaterial);
  cupola.position.set(-0.3, 0.35, 0.3);
  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.34, 0.5), hullMaterial);
  mantlet.position.set(2.65 - TURRET_X, 0.02, 0);

  const gun = new THREE.Group();
  gun.position.set(GUN_START_X - TURRET_X, 0.02, 0);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, CAR_LENGTH - GUN_START_X, 12).rotateZ(Math.PI / 2), steel);
  barrel.position.x = (CAR_LENGTH - GUN_START_X) / 2;
  const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 12).rotateZ(Math.PI / 2), steel);
  muzzleBrake.position.x = CAR_LENGTH - 0.12 - GUN_START_X;
  gun.add(barrel, muzzleBrake);

  turret.add(dome, cupola, mantlet, gun);
  return { turret, gun };
}

function crashTank(api, parts) {
  const { root, glacis, turret, gun, fireMark, headlight } = parts;
  const { level, force } = api;
  const crush = byLevel([0.03, 0.06, 0.12, 0.2, 0.3], level);

  glacis.position.x -= crush * 0.6;
  if (level >= 2) {
    gun.rotation.z = byLevel([0, 0.08, 0.22, 0.45, 0.6], level);
    switchOffHeadlight(headlight);
  }

  const smokePoint = () => api.world(fireMark);
  if (level === 3) api.burn(smokePoint, 4, { smokeRate: 7, dark: 0.5 });
  if (level >= 4) {
    api.detach(gun, { vel: [6 * force, 4 * force, rnd(-2, 2)], spin: [rnd(-3, 3), rnd(-3, 3), rnd(-6, 6)], r: 0.15 });
    turret.rotation.y = 0.5;
    api.burn(smokePoint, 6.5, { fireRate: 38, smokeRate: 14, dark: 0.12 });
  }
  if (level >= 5) {
    api.detach(turret, { vel: [1.5, 9 * force * 0.6, rnd(-1.5, 1.5)], spin: [1, 2.5, 3], r: 0.8, rest: 0.2 });
    api.explode(api.world(root, 2.0, 1.3, 0), 1.2);
  }
  return { crush };
}

export function buildTank() {
  const root = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7f3a, roughness: 0.75, metalness: 0.25, flatShading: true });
  const treadTexture = createTreadTexture();
  const headlight = headlightMaterial();

  const roadWheels = createTracks(root, new THREE.MeshStandardMaterial({ map: treadTexture, roughness: 0.9 }));
  const glacis = createHull(root, hullMaterial, headlight);
  const { turret, gun } = createTurret(hullMaterial);
  root.add(turret);

  const fireMark = new THREE.Object3D();
  fireMark.position.set(1.4, 1.35, 0);
  root.add(fireMark);

  const parts = { root, glacis, turret, gun, fireMark, headlight };

  return {
    root,
    colorMaterials: [hullMaterial],
    motion: TANK_MOTION,
    meta: { rearWheelX: 0.5, trackZ: TRACK_SIDE_Z, eye: [3.0, 2.05] },
    pose(x) {
      roadWheels.forEach((wheel) => (wheel.rotation.z = -x / ROAD_WHEEL_RADIUS));
      treadTexture.offset.x = (((x * TREAD_REPEAT) % 1) + 1) % 1;
    },
    crash: (api) => crashTank(api, parts),
  };
}
