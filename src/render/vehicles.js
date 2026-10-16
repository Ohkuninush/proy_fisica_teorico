// Vehicle models. Presentation only: every model fits inside the physical footprint
// (rear at x = 0, front at x = CAR_LENGTH) so the front touches the obstacle at impact.
// Contract: createVehicle(kind) -> { group, setColor, pose(x, a), meta, crash(api), tick(dt),
//                                    crushOffset, dispose() }.
// crash(api) breaks the model according to api.level (1..5, see visuals/damage.js).
import * as THREE from 'three';
import { CAR_LENGTH } from '../physics/params.js';
import { softDotTexture } from './textures.js';
import { hash } from './geometries.js';

const L = CAR_LENGTH;
const BEVEL = 0.1;
// Design space is 0..L; bodies are shrunk so the bevel lands exactly on 0 and L.
const mx = (x) => BEVEL + x * ((L - 2 * BEVEL) / L);

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
const dark = (c = 0x0c0c10) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
const metal = (c = 0xcfd6e4) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.25 });
const CHAR = new THREE.Color(0x121214);

function makeWheel(R, width, { rim = metal(), tire = dark(), spokes = 5 } = {}) {
  const w = new THREE.Group();
  w.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, width, 28).rotateX(Math.PI / 2), tire));
  w.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.66, R * 0.66, width + 0.02, 24).rotateX(Math.PI / 2), rim));
  const spokeGeo = new THREE.BoxGeometry(R * 1.2, 0.05, width + 0.03);
  for (let i = 0; i < spokes; i++) {
    const s = new THREE.Mesh(spokeGeo, rim);
    s.rotation.z = (i * Math.PI * 2) / spokes;
    w.add(s);
  }
  return w;
}

function profileShape(spec) {
  const by = spec.wheelR;
  const s = new THREE.Shape();
  const [first, ...rest] = spec.pts;
  s.moveTo(mx(first[0]), by);
  rest.forEach((p, i) => {
    const last = i === rest.length - 1;
    if (p.length === 2) s.lineTo(mx(p[0]), last ? by : p[1]);
    else s.quadraticCurveTo(mx(p[0]), p[1], mx(p[2]), last ? by : p[3]);
  });
  [...spec.wheelXs].sort((a, b) => b - a).forEach((wx) => {
    s.lineTo(mx(wx) + spec.archR, by);
    s.absarc(mx(wx), by, spec.archR, 0, Math.PI, false);
  });
  s.lineTo(mx(first[0]), by);
  return s;
}

function glassShape([x0, x1, y0, y1, sl, sr]) {
  const s = new THREE.Shape();
  s.moveTo(mx(x0), y0);
  s.lineTo(mx(x0) + sl, y1);
  s.lineTo(mx(x1) - sr, y1);
  s.lineTo(mx(x1), y0);
  s.closePath();
  return s;
}

/** Crush the front of an extruded body: shrink toward the rear, buckle upward and add irregular folds. */
function crumple(geo, crush, xStart, depth, seed) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const w = THREE.MathUtils.smoothstep(x, xStart, L);
    if (w <= 0) continue;
    const n1 = hash(x * 7.1 + y * 3.3 + z * 5.9 + seed);
    const n2 = hash(x * 2.3 + y * 9.7 + z * 1.9 + seed * 2);
    p.setX(i, x - crush * w * (0.75 + 0.5 * n1));
    p.setY(i, y + (n2 - 0.5) * crush * 0.35 * w + (y > 0.9 ? crush * 0.18 * w : 0));
    p.setZ(i, z + (n1 - 0.5) * crush * 0.3 * w - (z - depth / 2) * 0.15 * w * (crush / 1.7));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

const SPECS = {
  sedan: {
    depth: 1.7, wheelR: 0.38, archR: 0.47, wheelXs: [0.85, 3.4],
    pts: [[0.0, 0.38], [0.0, 0.8], [0.1, 0.97, 0.6, 1.0], [1.35, 1.03], [1.55, 1.08, 1.8, 1.42], [1.95, 1.56, 2.3, 1.56], [2.75, 1.54], [3.05, 1.5, 3.35, 1.05], [3.85, 0.95], [4.15, 0.9, 4.2, 0.7], [4.2, 0.5], [4.17, 0.38, 4.05, 0.38]],
    glass: [[1.62, 2.52, 1.08, 1.5, 0.3, 0.05], [2.62, 3.22, 1.08, 1.5, 0.06, 0.4]],
    head: 0.72, tail: 0.84, eye: [3.45, 1.32],
    bumperY: 0.58, hood: { x: 3.6, y: 1.0, len: 0.85, ang: -0.2 }, door: { x: 2.1, y: 0.78, len: 1.3, h: 0.44 },
    crushScale: 1, motion: 'car', flipY: 1.55,
  },
  sport: {
    depth: 1.85, wheelR: 0.36, archR: 0.45, wheelXs: [0.85, 3.3],
    pts: [[0.0, 0.36], [0.0, 0.62], [0.1, 0.82, 0.7, 0.88], [1.5, 0.9], [1.9, 1.0, 2.15, 1.2], [2.35, 1.32, 2.7, 1.32], [2.95, 1.3], [3.3, 1.2, 3.6, 0.9], [4.0, 0.78], [4.18, 0.74, 4.2, 0.6], [4.2, 0.5], [4.17, 0.36, 4.05, 0.36]],
    glass: [[2.15, 3.2, 0.93, 1.28, 0.25, 0.32]],
    head: 0.66, tail: 0.76, spoiler: true, eye: [3.3, 1.12],
    bumperY: 0.55, hood: { x: 3.7, y: 0.84, len: 0.7, ang: -0.45 }, door: { x: 2.25, y: 0.6, len: 1.2, h: 0.26 },
    crushScale: 1.1, motion: 'car', flipY: 1.3,
  },
  pickup: {
    depth: 1.85, wheelR: 0.46, archR: 0.56, wheelXs: [0.95, 3.35],
    pts: [[0.0, 0.46], [0.0, 1.1], [1.9, 1.12], [1.95, 1.62], [2.0, 1.74, 2.3, 1.76], [2.95, 1.74], [3.2, 1.68, 3.35, 1.2], [3.9, 1.1], [4.18, 1.08, 4.2, 0.85], [4.2, 0.6], [4.17, 0.46, 4.05, 0.46]],
    glass: [[2.05, 3.22, 1.16, 1.64, 0.05, 0.2]],
    head: 0.9, tail: 1.0, bed: true, eye: [3.55, 1.55],
    bumperY: 0.72, hood: { x: 3.65, y: 1.1, len: 0.65, ang: -0.18 }, door: { x: 2.6, y: 1.0, len: 1.0, h: 0.42 },
    crushScale: 0.85, motion: 'car', flipY: 1.75,
  },
};

const MOTION = {
  car: (flipY) => ({
    2: { lift: 0.04, dur: 0.5 },
    3: { lift: 0.12, hop: 0.15, dur: 0.7 },
    4: { lift: 0.28, roll: 0.35, yaw: 0.2, hop: 0.5, dur: 1.1 },
    5: { flipRot: Math.PI, flipY, flipZ: 0.8, yaw: 0.3, dur: 1.6 },
  }),
  moto: () => ({
    2: { lift: 0.05, dur: 0.5 },
    3: { lift: 0.4, hop: 0.3, dur: 0.8 },
    4: { roll: 1.45, flipY: 0.4, yaw: 0.3, dur: 1.0 },
    5: { flipRot: 3.3, flipY: 0.9, flipZ: 1.0, yaw: 0.6, dur: 1.4 },
  }),
  tank: () => ({
    3: { lift: 0.03, dur: 0.5 },
    4: { lift: 0.06, dur: 0.7 },
    5: { lift: 0.16, roll: 0.1, dur: 1.0 },
  }),
};

function buildExtruded(spec) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xe5484d, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const bodyGeo = new THREE.ExtrudeGeometry(profileShape(spec), { depth: spec.depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 16 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.z = -spec.depth / 2;
  root.add(body);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05, clearcoat: 1 });
  const glasses = spec.glass.map((g) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(glassShape(g), { depth: spec.depth + 0.1, bevelEnabled: false }), glassMat);
    mesh.position.z = -(spec.depth + 0.1) / 2;
    root.add(mesh);
    return mesh;
  });

  const xs = spec.wheelXs.map(mx);
  const under = new THREE.Mesh(new THREE.BoxGeometry(Math.max(...xs) - Math.min(...xs) + 1.2, 0.5, spec.depth - 0.3), dark(0x07080c));
  under.position.set((Math.max(...xs) + Math.min(...xs)) / 2, spec.wheelR + 0.17, 0);
  root.add(under);

  // detachable body panels: front bumper strip, hood plate, doors
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, spec.depth - 0.2), metal(0x9aa3b2));
  bumper.position.set(L - 0.015, spec.bumperY, 0);
  const h = spec.hood;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(h.len, 0.035, spec.depth - 0.2), bodyMat);
  hood.position.set(mx(h.x), h.y + 0.12, 0);
  hood.rotation.z = h.ang;
  const d = spec.door;
  const doors = [-1, 1].map((side) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(d.len, d.h, 0.03), bodyMat);
    door.position.set(mx(d.x), d.y, side * (spec.depth / 2 + 0.125));
    return door;
  });
  root.add(bumper, hood, ...doors);

  let spoilerGroup = null;
  if (spec.bed) {
    const liner = new THREE.Mesh(new THREE.BoxGeometry(mx(1.85) - mx(0.15), 0.05, spec.depth - 0.2), dark(0x15171c));
    liner.position.set((mx(1.85) + mx(0.15)) / 2, 1.14, 0);
    root.add(liner);
  }
  if (spec.spoiler) {
    spoilerGroup = new THREE.Group();
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, spec.depth + 0.1), bodyMat);
    sp.position.set(mx(0.05), 1.02, 0);
    spoilerGroup.add(sp);
    [-0.5, 0.5].forEach((z) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), dark());
      l.position.set(mx(0.1), 0.9, z);
      spoilerGroup.add(l);
    });
    root.add(spoilerGroup);
  }

  const wheels = [];
  const wz = spec.depth / 2 + 0.05;
  xs.forEach((wx) =>
    [-wz, wz].forEach((z) => {
      const w = makeWheel(spec.wheelR, 0.3);
      w.position.set(wx, spec.wheelR, z);
      root.add(w);
      wheels.push(w);
    }),
  );

  const head = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });
  const tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), toneMapped: false });
  [-0.62, 0.62].forEach((z) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.38), head);
    hl.position.set(L + 0.02, spec.head, z);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), tail);
    t.position.set(-0.02, spec.tail, z);
    root.add(hl, t);
  });
  const fireMark = new THREE.Object3D();
  fireMark.position.set(mx(h.x), h.y + 0.2, 0);
  root.add(fireMark);

  const pitchTargets = [body];
  const built = {
    root,
    colorMats: [bodyMat],
    wheels,
    wheelR: spec.wheelR,
    crashed: false,
    motion: MOTION[spec.motion](spec.flipY),
    pose(x, a) {
      const ang = -x / spec.wheelR;
      wheels.forEach((w) => (w.rotation.z = ang));
      const p = clamp(a * 0.0025, -0.03, 0.03);
      pitchTargets.forEach((m) => (m.rotation.z = p));
    },
    meta: { rearWheelX: xs[0], trackZ: wz, eye: spec.eye },
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      const crush = [0.08, 0.3, 0.7, 1.2, 1.6][lv - 1] * spec.crushScale;
      body.rotation.z = 0;
      crumple(bodyGeo, crush, mx(L - 2.0), spec.depth, 3);
      hood.position.x -= crush * 0.85;
      hood.rotation.z += crush * 0.12;
      bumper.position.x -= crush;

      if (lv >= 2) {
        head.color.setRGB(0.05, 0.05, 0.05);
        tail.color.setRGB(0.2, 0.02, 0.03);
        // cracked (frosted) at level 2, knocked out (dark frames) from level 3
        if (lv === 2) Object.assign(glassMat, { metalness: 0, roughness: 0.55 }).color.set(0xaebfcc);
        else Object.assign(glassMat, { metalness: 0, roughness: 1 }).color.set(0x050608);
        api.shards(api.world(root, mx(3.0), spec.eye[1] + 0.15, 0), 14 * lv, 5 + lv);
        api.detach(bumper, { vel: [0.4, 1.5, rnd(-1, 1)], spin: [rnd(-2, 2), rnd(-2, 2), rnd(-3, 3)], r: 0.1 });
      }
      if (lv >= 3) api.detach(hood, { vel: [-1.5 * s, 4.5 * s, rnd(-1, 1)], spin: [rnd(-3, 3), rnd(-3, 3), rnd(-5, 5)], r: 0.1 });
      const flyWheel = (w, front) =>
        api.detach(w, { vel: [(front ? 3 : 0.5) * s, rnd(1.5, 3) * s, Math.sign(w.position.z) * rnd(3, 6) * s], spin: [0, 0, -12], r: spec.wheelR, rest: 0.45 });
      if (lv >= 4) {
        doors.forEach((dr, i) => api.detach(dr, { vel: [rnd(-1, 2), 3.2 * s, (i ? 1 : -1) * (4 + 2 * s)], spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], r: 0.25 }));
        wheels.slice(2).forEach((w) => flyWheel(w, true));
      }
      if (lv >= 5) {
        wheels.slice(0, 2).forEach((w) => flyWheel(w, false));
        if (spoilerGroup) api.detach(spoilerGroup, { vel: [-2, 6 * s, 0], spin: [3, 2, 4], r: 0.1 });
      }
      const hoodPt = () => api.world(fireMark);
      if (lv === 2) api.burn(hoodPt, 3.5, { smokeRate: 7, dark: 0.85 });
      if (lv === 3) api.burn(hoodPt, 5, { smokeRate: 10, dark: 0.5 });
      if (lv >= 4) api.burn(hoodPt, 6.5, { fireRate: 45, smokeRate: 14, dark: 0.15 });
      if (lv >= 5) api.explode(api.world(root, mx(3.2), 1.0, 0));
      return { crush };
    },
  };
  return built;
}

function buildMoto() {
  const root = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, metalness: 0.5, roughness: 0.3, clearcoat: 1 });
  const black = dark(0x14151a);
  const R = 0.36;
  const front = L - R; // front tyre edge touches x = L
  const rear = front - 1.55;

  const add = (parent, w, h, d, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    parent.add(m);
    return m;
  };

  const rearWheel = makeWheel(R, 0.16, { spokes: 6 });
  rearWheel.position.set(rear, R, 0);
  root.add(rearWheel);

  // front end (fork, wheel, bars, lamp, fender) shoved back as one piece in a crash
  const frontEnd = new THREE.Group();
  const frontWheel = makeWheel(R, 0.16, { spokes: 6 });
  frontWheel.position.set(front, R, 0);
  frontEnd.add(frontWheel);
  add(frontEnd, 0.1, 0.8, 0.1, metal(0x9aa3b2), front - 0.1, 0.75, 0, -0.4);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8).rotateX(Math.PI / 2), black);
  bar.position.set(front - 0.38, 1.32, 0);
  frontEnd.add(bar);
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), headMat);
  lamp.position.set(L - 0.12, 1.08, 0);
  lamp.scale.set(0.7, 1, 1);
  frontEnd.add(lamp);
  add(frontEnd, 0.65, 0.05, 0.2, paint, front + 0.02, 0.8, 0, -0.1);
  root.add(frontEnd);

  // frame, engine, swing arm
  add(root, 1.3, 0.12, 0.14, black, rear + 0.9, 0.62, 0, 0.12);
  add(root, 0.62, 0.55, 0.38, metal(0x6b7280), rear + 0.95, 0.5, 0);
  add(root, 1.0, 0.08, 0.12, black, rear + 0.45, 0.42, 0, 0.1);
  const fuel = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12), paint);
  fuel.rotation.z = Math.PI / 2 - 0.12;
  fuel.position.set(rear + 1.35, 1.08, 0);
  root.add(fuel);
  add(root, 0.8, 0.14, 0.34, black, rear + 0.55, 1.0, 0, 0.05);
  add(root, 0.55, 0.2, 0.3, paint, rear + 0.1, 1.08, 0, 0.18);
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), toneMapped: false });
  const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), tailMat);
  tailLamp.position.set(rear - 0.1, 1.05, 0);
  root.add(tailLamp);

  // rider: its own group, origin at the hips, so it can lean or fly off as one body
  const rider = new THREE.Group();
  rider.position.set(rear + 0.8, 1.05, 0);
  const suit = dark(0x1b1e29);
  add(rider, 0.34, 0.75, 0.46, suit, -0.1, 0.5, 0, -0.55);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), paint);
  helmet.position.set(0.25, 1.07, 0);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x05070d, metalness: 0.9, roughness: 0.05 }));
  visor.position.set(0.37, 1.07, 0);
  visor.scale.set(0.7, 0.8, 1.05);
  rider.add(helmet, visor);
  [-0.26, 0.26].forEach((z) => {
    add(rider, 0.7, 0.14, 0.14, suit, 0.3, 0.5, z, -0.35);
    add(rider, 0.14, 0.7, 0.16, suit, 0.05, -0.2, z * 0.9, 0.35);
  });
  root.add(rider);

  const fireMark = new THREE.Object3D();
  fireMark.position.set(rear + 0.95, 0.9, 0);
  root.add(fireMark);

  const built = {
    root,
    colorMats: [paint],
    wheels: [frontWheel, rearWheel],
    wheelR: R,
    motion: MOTION.moto(),
    pose(x, a) {
      const ang = -x / R;
      frontWheel.rotation.z = rearWheel.rotation.z = ang;
      root.rotation.z = clamp(a * 0.003, -0.05, 0.05);
    },
    meta: { rearWheelX: rear, trackZ: 0.1, eye: [3.65, 2.2] },
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      const crush = [0.05, 0.2, 0.4, 0.6, 0.8][lv - 1];
      root.rotation.z = 0;
      frontEnd.position.x -= crush;
      frontEnd.rotation.z = crush * 0.12;
      if (lv >= 2) {
        headMat.color.setRGB(0.05, 0.05, 0.05);
        tailMat.color.setRGB(0.2, 0.02, 0.03);
        rider.rotation.z = -0.3;
      }
      if (lv >= 3) {
        const eject = 4 + api.speed * 0.06;
        api.detach(rider, { vel: [eject, 4 + 2 * s, rnd(-1.5, 1.5)], spin: [rnd(-3, 3), rnd(-2, 2), rnd(5, 9) * (Math.random() < 0.5 ? -1 : 1)], r: 0.45, rest: 0.25 });
        api.detach(frontWheel, { vel: [3 * s, 1.5 * s, rnd(-2, 2)], spin: [0, 0, -10], r: R, rest: 0.45 });
      }
      const eng = () => api.world(fireMark);
      if (lv === 2) api.burn(eng, 3, { smokeRate: 6, dark: 0.8 });
      if (lv === 3) api.burn(eng, 4.5, { smokeRate: 9, dark: 0.45 });
      if (lv >= 4) api.burn(eng, 6, { fireRate: 32, smokeRate: 12, dark: 0.15 });
      if (lv >= 5) {
        api.detach(fuel, { vel: [2 * s, 7 * s, rnd(-2, 2)], spin: [3, 5, 4], r: 0.2 });
        api.explode(api.world(root, rear + 1.3, 1.0, 0), 0.9);
      }
      return { crush };
    },
  };
  return built;
}

function buildTank() {
  const root = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6b7f3a, roughness: 0.75, metalness: 0.25, flatShading: true });
  const steel = dark(0x23262c);

  // tracks (striped texture scrolls with distance)
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1c20';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#3a3e46';
  g.fillRect(0, 0, 40, 64);
  const treadTex = new THREE.CanvasTexture(c);
  treadTex.wrapS = treadTex.wrapT = THREE.RepeatWrapping;
  treadTex.repeat.set(5, 1);
  const treadMat = new THREE.MeshStandardMaterial({ map: treadTex, roughness: 0.9 });

  const trackLen = 3.9;
  const trackH = 0.85;
  const stadium = new THREE.Shape();
  const r = trackH / 2;
  const x0 = r;
  const x1 = trackLen - r;
  stadium.moveTo(x0, 0);
  stadium.lineTo(x1, 0);
  stadium.absarc(x1, r, r, -Math.PI / 2, Math.PI / 2, false);
  stadium.lineTo(x0, trackH);
  stadium.absarc(x0, r, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  const trackGeo = new THREE.ExtrudeGeometry(stadium, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  const trackX = 0.1;
  const roadWheels = [];
  [-0.95, 0.95].forEach((z) => {
    const t = new THREE.Mesh(trackGeo, treadMat);
    t.position.set(trackX, 0, z - 0.25);
    root.add(t);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const w = makeWheel(0.26, 0.54, { tire: dark(0x15171b), rim: metal(0x7b8190), spokes: 4 });
      w.position.set(trackX + r + (i * (trackLen - 2 * r)) / (n - 1), r, z);
      root.add(w);
      roadWheels.push(w);
    }
  });

  const box = (parent, w, h, d, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    parent.add(m);
    return m;
  };
  box(root, 3.7, 0.55, 1.55, hullMat, 2.0, 0.95, 0);
  const glacis = box(root, 1.0, 0.4, 1.5, hullMat, 3.55, 0.88, 0, -0.35); // sloped front plate
  box(root, 0.4, 0.3, 1.5, hullMat, 0.35, 1.0, 0);
  [-1.02, 1.02].forEach((z) => box(root, 3.6, 0.18, 0.1, hullMat, 2.0, 1.1, z));

  // turret: one group so it can be knocked off; the gun hangs from its own pivot
  const turretGroup = new THREE.Group();
  turretGroup.position.set(1.85, 1.5, 0);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.5, 8), hullMat);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.22, 10), hullMat);
  cupola.position.set(-0.3, 0.35, 0.3);
  turretGroup.add(turret, cupola);
  const gunStart = 2.55;
  const gunPivot = new THREE.Group();
  gunPivot.position.set(gunStart - 1.85, 0.02, 0);
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, L - gunStart, 12).rotateZ(Math.PI / 2), steel);
  gun.position.x = (L - gunStart) / 2;
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 12).rotateZ(Math.PI / 2), steel);
  brake.position.x = L - 0.12 - gunStart;
  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.34, 0.5), hullMat);
  gunPivot.add(gun, brake);
  turretGroup.add(gunPivot);
  mantlet.position.set(2.65 - 1.85, 0.02, 0);
  turretGroup.add(mantlet);
  root.add(turretGroup);

  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });
  [-0.5, 0.5].forEach((z) => box(root, 0.08, 0.1, 0.18, headMat, 3.95, 0.97, z));
  const fireMark = new THREE.Object3D();
  fireMark.position.set(1.4, 1.35, 0);
  root.add(fireMark);

  return {
    root,
    colorMats: [hullMat],
    wheels: roadWheels,
    wheelR: 0.26,
    motion: MOTION.tank(),
    pose(x) {
      roadWheels.forEach((w) => (w.rotation.z = -x / 0.26));
      treadTex.offset.x = (((x * 5) / 1) % 1 + 1) % 1;
    },
    meta: { rearWheelX: 0.5, trackZ: 0.95, eye: [3.0, 2.05] },
    crash(api) {
      const lv = api.level;
      const s = api.scale;
      const crush = [0.03, 0.06, 0.12, 0.2, 0.3][lv - 1];
      glacis.position.x -= crush * 0.6;
      if (lv >= 2) {
        gunPivot.rotation.z = [0, 0.08, 0.22, 0.45, 0.6][lv - 1];
        headMat.color.setRGB(0.05, 0.05, 0.05);
      }
      const pt = () => api.world(fireMark);
      if (lv === 3) api.burn(pt, 4, { smokeRate: 7, dark: 0.5 });
      if (lv >= 4) {
        api.detach(gunPivot, { vel: [6 * s, 4 * s, rnd(-2, 2)], spin: [rnd(-3, 3), rnd(-3, 3), rnd(-6, 6)], r: 0.15 });
        turretGroup.rotation.y = 0.5;
        api.burn(pt, 6.5, { fireRate: 38, smokeRate: 14, dark: 0.12 });
      }
      if (lv >= 5) {
        api.detach(turretGroup, { vel: [1.5, 9 * s * 0.6, rnd(-1.5, 1.5)], spin: [1, 2.5, 3], r: 0.8, rest: 0.2 });
        api.explode(api.world(root, 2.0, 1.3, 0), 1.2);
      }
      return { crush };
    },
  };
}

const BUILDERS = {
  sedan: () => buildExtruded(SPECS.sedan),
  sport: () => buildExtruded(SPECS.sport),
  pickup: () => buildExtruded(SPECS.pickup),
  moto: buildMoto,
  tank: buildTank,
};

export function createVehicle(kind = 'sedan') {
  const built = (BUILDERS[kind] ?? BUILDERS.sedan)();
  const group = new THREE.Group();
  // pivot at the nose: crash motions (rear lifting, rolling) rotate around the point of impact
  const pivot = new THREE.Group();
  pivot.position.x = L;
  built.root.position.x = -L;
  pivot.add(built.root);
  group.add(pivot);
  built.root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });

  const dot = softDotTexture();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(L + 2, 3), new THREE.MeshBasicMaterial({ map: dot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(L / 2, 0.02, 0);
  const glowMat = new THREE.MeshBasicMaterial({ map: dot, color: 0xe5484d, transparent: true, opacity: kind === 'moto' ? 0.35 : 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(L + 1.2, kind === 'moto' ? 1.4 : 2.6), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(L / 2, 0.035, 0);
  group.add(blob, glow);

  const st = { level: 0, t: 0, crush: 0, offset: 0 };
  let baseColors = null;

  return {
    group,
    kind,
    meta: built.meta,
    setColor(hex) {
      built.colorMats.forEach((m) => m.color.set(hex));
      glowMat.color.set(hex);
    },
    /** Visual-only: rolling angle from distance, body pitch from acceleration. Frozen once crashed. */
    pose(x, a) {
      if (!st.level) built.pose(x, a);
    },
    /** How far the vehicle has pushed forward into the obstacle while its front crumples (m). */
    get crushOffset() {
      return st.offset;
    },
    crash(api) {
      st.level = api.level;
      st.t = 0;
      baseColors = built.colorMats.map((m) => m.color.clone());
      st.crush = built.crash(api)?.crush ?? 0;
      glow.visible = false; // no neon underglow on a wreck
    },
    tick(dt) {
      if (!st.level) return;
      st.t += dt;
      const t = st.t;
      st.offset = st.crush * smooth(clamp(t / 0.14, 0, 1));
      const m = built.motion[st.level];
      if (m) {
        const u = clamp(t / m.dur, 0, 1);
        const k = smooth(u);
        const b = Math.sin(Math.PI * u);
        pivot.rotation.set((m.roll ?? 0) * k + (m.flipRot ?? 0) * k, (m.yaw ?? 0) * k, -(m.lift ?? 0) * b);
        pivot.position.set(L, (m.hop ?? 0) * b + (m.flipY ?? 0) * k + (m.flipRot ? 1.6 * b : 0), (m.flipZ ?? 0) * k);
      }
      if (st.level >= 4) {
        const ck = clamp((t - 0.3) / 3, 0, 1);
        built.colorMats.forEach((mat, i) => mat.color.copy(baseColors[i]).lerp(CHAR, ck));
      }
    },
    dispose() {
      group.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          m.map?.dispose?.();
          m.dispose();
        });
      });
    },
  };
}
