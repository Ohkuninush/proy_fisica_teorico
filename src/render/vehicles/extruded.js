import * as THREE from 'three';
import { CAR_LENGTH } from '../../physics/params.js';
import { byLevel, clamp, hash, rnd } from '../math.js';
import { darkMaterial, headlightMaterial, makeWheel, metalMaterial, switchOffHeadlight, switchOffTaillight, taillightMaterial } from './parts.js';
import { carMotion } from './motion.js';

const BEVEL = 0.1;
const SIDE_BEVEL = 0.12;

const bodyX = (x) => BEVEL + x * ((CAR_LENGTH - 2 * BEVEL) / CAR_LENGTH);

export const CAR_SPECS = {
  sedan: {
    depth: 1.7,
    wheelRadius: 0.38,
    archRadius: 0.47,
    wheelXs: [0.85, 3.4],
    profile: [[0.0, 0.38], [0.0, 0.8], [0.1, 0.97, 0.6, 1.0], [1.35, 1.03], [1.55, 1.08, 1.8, 1.42], [1.95, 1.56, 2.3, 1.56], [2.75, 1.54], [3.05, 1.5, 3.35, 1.05], [3.85, 0.95], [4.15, 0.9, 4.2, 0.7], [4.2, 0.5], [4.17, 0.38, 4.05, 0.38]],
    windows: [[1.62, 2.52, 1.08, 1.5, 0.3, 0.05], [2.62, 3.22, 1.08, 1.5, 0.06, 0.4]],
    headlightY: 0.72,
    taillightY: 0.84,
    eye: [3.45, 1.32],
    bumperY: 0.58,
    hood: { x: 3.6, y: 1.0, length: 0.85, angle: -0.2 },
    door: { x: 2.1, y: 0.78, length: 1.3, height: 0.44 },
    crushScale: 1,
    flipHeight: 1.55,
  },
  sport: {
    depth: 1.85,
    wheelRadius: 0.36,
    archRadius: 0.45,
    wheelXs: [0.85, 3.3],
    profile: [[0.0, 0.36], [0.0, 0.62], [0.1, 0.82, 0.7, 0.88], [1.5, 0.9], [1.9, 1.0, 2.15, 1.2], [2.35, 1.32, 2.7, 1.32], [2.95, 1.3], [3.3, 1.2, 3.6, 0.9], [4.0, 0.78], [4.18, 0.74, 4.2, 0.6], [4.2, 0.5], [4.17, 0.36, 4.05, 0.36]],
    windows: [[2.15, 3.2, 0.93, 1.28, 0.25, 0.32]],
    headlightY: 0.66,
    taillightY: 0.76,
    spoiler: true,
    eye: [3.3, 1.12],
    bumperY: 0.55,
    hood: { x: 3.7, y: 0.84, length: 0.7, angle: -0.45 },
    door: { x: 2.25, y: 0.6, length: 1.2, height: 0.26 },
    crushScale: 1.1,
    flipHeight: 1.3,
  },
  pickup: {
    depth: 1.85,
    wheelRadius: 0.46,
    archRadius: 0.56,
    wheelXs: [0.95, 3.35],
    profile: [[0.0, 0.46], [0.0, 1.1], [1.9, 1.12], [1.95, 1.62], [2.0, 1.74, 2.3, 1.76], [2.95, 1.74], [3.2, 1.68, 3.35, 1.2], [3.9, 1.1], [4.18, 1.08, 4.2, 0.85], [4.2, 0.6], [4.17, 0.46, 4.05, 0.46]],
    windows: [[2.05, 3.22, 1.16, 1.64, 0.05, 0.2]],
    headlightY: 0.9,
    taillightY: 1.0,
    bed: true,
    eye: [3.55, 1.55],
    bumperY: 0.72,
    hood: { x: 3.65, y: 1.1, length: 0.65, angle: -0.18 },
    door: { x: 2.6, y: 1.0, length: 1.0, height: 0.42 },
    crushScale: 0.85,
    flipHeight: 1.75,
  },
};

function bodyShape(spec) {
  const baseY = spec.wheelRadius;
  const shape = new THREE.Shape();
  const [first, ...rest] = spec.profile;
  shape.moveTo(bodyX(first[0]), baseY);
  rest.forEach((point, i) => {
    const isLast = i === rest.length - 1;
    if (point.length === 2) shape.lineTo(bodyX(point[0]), isLast ? baseY : point[1]);
    else shape.quadraticCurveTo(bodyX(point[0]), point[1], bodyX(point[2]), isLast ? baseY : point[3]);
  });
  [...spec.wheelXs]
    .sort((a, b) => b - a)
    .forEach((wheelX) => {
      shape.lineTo(bodyX(wheelX) + spec.archRadius, baseY);
      shape.absarc(bodyX(wheelX), baseY, spec.archRadius, 0, Math.PI, false);
    });
  shape.lineTo(bodyX(first[0]), baseY);
  return shape;
}

function windowShape([x0, x1, y0, y1, slantStart, slantEnd]) {
  const shape = new THREE.Shape();
  shape.moveTo(bodyX(x0), y0);
  shape.lineTo(bodyX(x0) + slantStart, y1);
  shape.lineTo(bodyX(x1) - slantEnd, y1);
  shape.lineTo(bodyX(x1), y0);
  shape.closePath();
  return shape;
}

function crumple(geometry, crush, startX, depth, seed) {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const weight = THREE.MathUtils.smoothstep(x, startX, CAR_LENGTH);
    if (weight <= 0) continue;
    const noiseA = hash(x * 7.1 + y * 3.3 + z * 5.9 + seed);
    const noiseB = hash(x * 2.3 + y * 9.7 + z * 1.9 + seed * 2);
    position.setX(i, x - crush * weight * (0.75 + 0.5 * noiseA));
    position.setY(i, y + (noiseB - 0.5) * crush * 0.35 * weight + (y > 0.9 ? crush * 0.18 * weight : 0));
    position.setZ(i, z + (noiseA - 0.5) * crush * 0.3 * weight - (z - depth / 2) * 0.15 * weight * (crush / 1.7));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createBody(spec) {
  const material = new THREE.MeshPhysicalMaterial({ color: 0xe5484d, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const geometry = new THREE.ExtrudeGeometry(bodyShape(spec), {
    depth: spec.depth,
    bevelEnabled: true,
    bevelThickness: SIDE_BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments: 16,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -spec.depth / 2;
  return { mesh, geometry, material };
}

function createWindows(spec) {
  const material = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05, clearcoat: 1 });
  const depth = spec.depth + 0.1;
  const meshes = spec.windows.map((window) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(windowShape(window), { depth, bevelEnabled: false }), material);
    mesh.position.z = -depth / 2;
    return mesh;
  });
  return { meshes, material };
}

function createUnderbody(spec, wheelXs) {
  const left = Math.min(...wheelXs);
  const right = Math.max(...wheelXs);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(right - left + 1.2, 0.5, spec.depth - 0.3), darkMaterial(0x07080c));
  mesh.position.set((left + right) / 2, spec.wheelRadius + 0.17, 0);
  return mesh;
}

function createPanels(spec, bodyMaterial) {
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, spec.depth - 0.2), metalMaterial(0x9aa3b2));
  bumper.position.set(CAR_LENGTH - 0.015, spec.bumperY, 0);

  const { hood: hoodSpec, door: doorSpec } = spec;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(hoodSpec.length, 0.035, spec.depth - 0.2), bodyMaterial);
  hood.position.set(bodyX(hoodSpec.x), hoodSpec.y + 0.12, 0);
  hood.rotation.z = hoodSpec.angle;

  const doors = [-1, 1].map((side) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorSpec.length, doorSpec.height, 0.03), bodyMaterial);
    door.position.set(bodyX(doorSpec.x), doorSpec.y, side * (spec.depth / 2 + 0.125));
    return door;
  });

  return { bumper, hood, doors };
}

function createPickupBedLiner(spec) {
  const length = bodyX(1.85) - bodyX(0.15);
  const liner = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, spec.depth - 0.2), darkMaterial(0x15171c));
  liner.position.set((bodyX(1.85) + bodyX(0.15)) / 2, 1.14, 0);
  return liner;
}

function createSpoiler(spec, bodyMaterial) {
  const spoiler = new THREE.Group();
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, spec.depth + 0.1), bodyMaterial);
  wing.position.set(bodyX(0.05), 1.02, 0);
  spoiler.add(wing);
  [-0.5, 0.5].forEach((z) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), darkMaterial());
    leg.position.set(bodyX(0.1), 0.9, z);
    spoiler.add(leg);
  });
  return spoiler;
}

function createWheels(spec, wheelXs, trackZ) {
  return wheelXs.flatMap((x) =>
    [-trackZ, trackZ].map((z) => {
      const wheel = makeWheel(spec.wheelRadius, 0.3);
      wheel.position.set(x, spec.wheelRadius, z);
      return wheel;
    }),
  );
}

function createLights(spec) {
  const headlight = headlightMaterial();
  const taillight = taillightMaterial();
  const meshes = [-0.62, 0.62].flatMap((z) => {
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.38), headlight);
    front.position.set(CAR_LENGTH + 0.02, spec.headlightY, z);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), taillight);
    rear.position.set(-0.02, spec.taillightY, z);
    return [front, rear];
  });
  return { headlight, taillight, meshes };
}

function crashCar(api, spec, parts) {
  const { root, bodyMesh, bodyGeometry, glassMaterial, hood, bumper, doors, wheels, spoiler, fireMark, headlight, taillight } = parts;
  const { level, force } = api;
  const crush = byLevel([0.08, 0.3, 0.7, 1.2, 1.6], level) * spec.crushScale;

  bodyMesh.rotation.z = 0;
  crumple(bodyGeometry, crush, bodyX(CAR_LENGTH - 2.0), spec.depth, 3);
  hood.position.x -= crush * 0.85;
  hood.rotation.z += crush * 0.12;
  bumper.position.x -= crush;

  if (level >= 2) {
    switchOffHeadlight(headlight);
    switchOffTaillight(taillight);
    if (level === 2) Object.assign(glassMaterial, { metalness: 0, roughness: 0.55 }).color.set(0xaebfcc);
    else Object.assign(glassMaterial, { metalness: 0, roughness: 1 }).color.set(0x050608);
    api.shards(api.world(root, bodyX(3.0), spec.eye[1] + 0.15, 0), 14 * level, 5 + level);
    api.detach(bumper, { vel: [0.4, 1.5, rnd(-1, 1)], spin: [rnd(-2, 2), rnd(-2, 2), rnd(-3, 3)], r: 0.1 });
  }
  if (level >= 3) {
    api.detach(hood, { vel: [-1.5 * force, 4.5 * force, rnd(-1, 1)], spin: [rnd(-3, 3), rnd(-3, 3), rnd(-5, 5)], r: 0.1 });
  }

  const launchWheel = (wheel, isFront) =>
    api.detach(wheel, {
      vel: [(isFront ? 3 : 0.5) * force, rnd(1.5, 3) * force, Math.sign(wheel.position.z) * rnd(3, 6) * force],
      spin: [0, 0, -12],
      r: spec.wheelRadius,
      rest: 0.45,
    });
  if (level >= 4) {
    doors.forEach((door, i) =>
      api.detach(door, { vel: [rnd(-1, 2), 3.2 * force, (i ? 1 : -1) * (4 + 2 * force)], spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], r: 0.25 }),
    );
    wheels.slice(2).forEach((wheel) => launchWheel(wheel, true));
  }
  if (level >= 5) {
    wheels.slice(0, 2).forEach((wheel) => launchWheel(wheel, false));
    if (spoiler) api.detach(spoiler, { vel: [-2, 6 * force, 0], spin: [3, 2, 4], r: 0.1 });
  }

  const hoodPoint = () => api.world(fireMark);
  if (level === 2) api.burn(hoodPoint, 3.5, { smokeRate: 7, dark: 0.85 });
  if (level === 3) api.burn(hoodPoint, 5, { smokeRate: 10, dark: 0.5 });
  if (level >= 4) api.burn(hoodPoint, 6.5, { fireRate: 45, smokeRate: 14, dark: 0.15 });
  if (level >= 5) api.explode(api.world(root, bodyX(3.2), 1.0, 0));
  return { crush };
}

export function buildCar(spec) {
  const root = new THREE.Group();
  const body = createBody(spec);
  const windows = createWindows(spec);
  const wheelXs = spec.wheelXs.map(bodyX);
  const trackZ = spec.depth / 2 + 0.05;
  const panels = createPanels(spec, body.material);
  const wheels = createWheels(spec, wheelXs, trackZ);
  const lights = createLights(spec);
  const spoiler = spec.spoiler ? createSpoiler(spec, body.material) : null;

  const fireMark = new THREE.Object3D();
  fireMark.position.set(bodyX(spec.hood.x), spec.hood.y + 0.2, 0);

  root.add(body.mesh, ...windows.meshes, createUnderbody(spec, wheelXs), panels.bumper, panels.hood, ...panels.doors, ...wheels, ...lights.meshes, fireMark);
  if (spec.bed) root.add(createPickupBedLiner(spec));
  if (spoiler) root.add(spoiler);

  const parts = {
    root,
    bodyMesh: body.mesh,
    bodyGeometry: body.geometry,
    glassMaterial: windows.material,
    ...panels,
    wheels,
    spoiler,
    fireMark,
    headlight: lights.headlight,
    taillight: lights.taillight,
  };

  return {
    root,
    colorMaterials: [body.material],
    motion: carMotion(spec.flipHeight),
    meta: { rearWheelX: wheelXs[0], trackZ, eye: spec.eye },
    pose(x, acceleration) {
      wheels.forEach((wheel) => (wheel.rotation.z = -x / spec.wheelRadius));
      body.mesh.rotation.z = clamp(acceleration * 0.0025, -0.03, 0.03);
    },
    crash: (api) => crashCar(api, spec, parts),
  };
}
