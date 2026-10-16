// Vehicle models. Presentation only: every model fits inside the physical footprint
// (rear at x = 0, front at x = CAR_LENGTH) so the front touches the obstacle at impact.
// Contract: createVehicle(kind) -> { group, setColor(hex), pose(x, a), meta, dispose() }.
import * as THREE from 'three';
import { CAR_LENGTH } from '../physics/params.js';
import { softDotTexture } from './textures.js';

const L = CAR_LENGTH;
const BEVEL = 0.1;
// Design space is 0..L; bodies are shrunk so the bevel lands exactly on 0 and L.
const mx = (x) => BEVEL + x * ((L - 2 * BEVEL) / L);

const dark = (c = 0x0c0c10) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
const metal = (c = 0xcfd6e4) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.25 });

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

const SPECS = {
  sedan: {
    depth: 1.7, wheelR: 0.38, archR: 0.47, wheelXs: [0.85, 3.4],
    pts: [[0.0, 0.38], [0.0, 0.8], [0.1, 0.97, 0.6, 1.0], [1.35, 1.03], [1.55, 1.08, 1.8, 1.42], [1.95, 1.56, 2.3, 1.56], [2.75, 1.54], [3.05, 1.5, 3.35, 1.05], [3.85, 0.95], [4.15, 0.9, 4.2, 0.7], [4.2, 0.5], [4.17, 0.38, 4.05, 0.38]],
    glass: [[1.62, 2.52, 1.08, 1.5, 0.3, 0.05], [2.62, 3.22, 1.08, 1.5, 0.06, 0.4]],
    head: 0.72, tail: 0.84,
  },
  sport: {
    depth: 1.85, wheelR: 0.36, archR: 0.45, wheelXs: [0.85, 3.3],
    pts: [[0.0, 0.36], [0.0, 0.62], [0.1, 0.82, 0.7, 0.88], [1.5, 0.9], [1.9, 1.0, 2.15, 1.2], [2.35, 1.32, 2.7, 1.32], [2.95, 1.3], [3.3, 1.2, 3.6, 0.9], [4.0, 0.78], [4.18, 0.74, 4.2, 0.6], [4.2, 0.5], [4.17, 0.36, 4.05, 0.36]],
    glass: [[2.15, 3.2, 0.93, 1.28, 0.25, 0.32]],
    head: 0.66, tail: 0.76, spoiler: true,
  },
  pickup: {
    depth: 1.85, wheelR: 0.46, archR: 0.56, wheelXs: [0.95, 3.35],
    pts: [[0.0, 0.46], [0.0, 1.1], [1.9, 1.12], [1.95, 1.62], [2.0, 1.74, 2.3, 1.76], [2.95, 1.74], [3.2, 1.68, 3.35, 1.2], [3.9, 1.1], [4.18, 1.08, 4.2, 0.85], [4.2, 0.6], [4.17, 0.46, 4.05, 0.46]],
    glass: [[2.05, 3.22, 1.16, 1.64, 0.05, 0.2]],
    head: 0.9, tail: 1.0, bed: true,
  },
};

function buildExtruded(spec) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xe5484d, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profileShape(spec), { depth: spec.depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 16 }),
    bodyMat,
  );
  body.position.z = -spec.depth / 2;
  root.add(body);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1020, metalness: 0.9, roughness: 0.05, clearcoat: 1 });
  spec.glass.forEach((g) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(glassShape(g), { depth: spec.depth + 0.1, bevelEnabled: false }), glassMat);
    mesh.position.z = -(spec.depth + 0.1) / 2;
    root.add(mesh);
  });

  const xs = spec.wheelXs.map(mx);
  const under = new THREE.Mesh(new THREE.BoxGeometry(Math.max(...xs) - Math.min(...xs) + 1.2, 0.5, spec.depth - 0.3), dark(0x07080c));
  under.position.set((Math.max(...xs) + Math.min(...xs)) / 2, spec.wheelR + 0.17, 0);
  root.add(under);

  if (spec.bed) {
    const liner = new THREE.Mesh(new THREE.BoxGeometry(mx(1.85) - mx(0.15), 0.05, spec.depth - 0.2), dark(0x15171c));
    liner.position.set((mx(1.85) + mx(0.15)) / 2, 1.14, 0);
    root.add(liner);
  }
  if (spec.spoiler) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, spec.depth + 0.1), bodyMat);
    sp.position.set(mx(0.05), 1.02, 0);
    const legs = [-0.5, 0.5].map((z) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), dark());
      l.position.set(mx(0.1), 0.9, z);
      return l;
    });
    root.add(sp, ...legs);
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
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.38), head);
    h.position.set(L + 0.02, spec.head, z);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), tail);
    t.position.set(-0.02, spec.tail, z);
    root.add(h, t);
  });

  const pitchTargets = [body];
  return {
    root,
    colorMats: [bodyMat],
    wheels,
    wheelR: spec.wheelR,
    pose(x, a) {
      const ang = -x / spec.wheelR;
      wheels.forEach((w) => (w.rotation.z = ang));
      const p = THREE.MathUtils.clamp(a * 0.0025, -0.03, 0.03);
      pitchTargets.forEach((m) => (m.rotation.z = p));
    },
    meta: { rearWheelX: xs[0], trackZ: wz },
  };
}

function buildMoto() {
  const root = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, metalness: 0.5, roughness: 0.3, clearcoat: 1 });
  const black = dark(0x14151a);
  const R = 0.36;
  const front = L - R; // front tyre edge touches x = L
  const rear = front - 1.55;

  const wheels = [];
  [front, rear].forEach((wx) => {
    const w = makeWheel(R, 0.16, { spokes: 6 });
    w.position.set(wx, R, 0);
    root.add(w);
    wheels.push(w);
  });

  const box = (w, h, d, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    root.add(m);
    return m;
  };
  // frame, engine, fork, swing arm
  box(1.3, 0.12, 0.14, black, rear + 0.9, 0.62, 0, 0.12);
  box(0.62, 0.55, 0.38, metal(0x6b7280), rear + 0.95, 0.5, 0);
  box(0.1, 0.8, 0.1, metal(0x9aa3b2), front - 0.1, 0.75, 0.0, -0.4);
  box(1.0, 0.08, 0.12, black, rear + 0.45, 0.42, 0, 0.1);
  // tank, seat, tail
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12), paint);
  tank.rotation.z = Math.PI / 2 - 0.12;
  tank.position.set(rear + 1.35, 1.08, 0);
  root.add(tank);
  box(0.8, 0.14, 0.34, black, rear + 0.55, 1.0, 0, 0.05);
  const tailCowl = box(0.55, 0.2, 0.3, paint, rear + 0.1, 1.08, 0, 0.18);
  // handlebar + headlight
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8).rotateX(Math.PI / 2), black);
  bar.position.set(front - 0.38, 1.32, 0);
  root.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false }));
  lamp.position.set(L - 0.12, 1.08, 0);
  lamp.scale.set(0.7, 1, 1);
  root.add(lamp);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), toneMapped: false }));
  tail.position.set(rear - 0.1, 1.05, 0);
  root.add(tail);
  // fender
  box(0.65, 0.05, 0.2, paint, front + 0.02, 0.8, 0, -0.1);

  // rider (dark suit, helmet in the vehicle colour)
  const suit = dark(0x1b1e29);
  box(0.34, 0.75, 0.46, suit, rear + 0.7, 1.55, 0, -0.55);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), paint);
  helmet.position.set(rear + 1.05, 2.12, 0);
  root.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x05070d, metalness: 0.9, roughness: 0.05 }));
  visor.position.set(rear + 1.17, 2.12, 0);
  visor.scale.set(0.7, 0.8, 1.05);
  root.add(visor);
  [-0.26, 0.26].forEach((z) => {
    box(0.7, 0.14, 0.14, suit, rear + 1.1, 1.55, z, -0.35); // arms
    box(0.14, 0.7, 0.16, suit, rear + 0.85, 0.85, z * 0.9, 0.35); // legs
  });

  return {
    root,
    colorMats: [paint],
    wheels,
    wheelR: R,
    pose(x, a) {
      const ang = -x / R;
      wheels.forEach((w) => (w.rotation.z = ang));
      root.rotation.z = THREE.MathUtils.clamp(a * 0.003, -0.05, 0.05);
    },
    meta: { rearWheelX: rear, trackZ: 0.1 },
  };
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

  const box = (w, h, d, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    root.add(m);
    return m;
  };
  // hull
  box(3.7, 0.55, 1.55, hullMat, 2.0, 0.95, 0);
  box(1.0, 0.4, 1.5, hullMat, 3.55, 0.88, 0, -0.35); // sloped glacis
  box(0.4, 0.3, 1.5, hullMat, 0.35, 1.0, 0); // engine deck
  // skirts
  [-1.02, 1.02].forEach((z) => box(3.6, 0.18, 0.1, hullMat, 2.0, 1.1, z));
  // turret
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.5, 8), hullMat);
  turret.position.set(1.85, 1.5, 0);
  root.add(turret);
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.22, 10), hullMat);
  cupola.position.set(1.55, 1.85, 0.3);
  root.add(cupola);
  // gun: tip reaches x = L
  const gunStart = 2.55;
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, L - gunStart, 12).rotateZ(Math.PI / 2), steel);
  gun.position.set((gunStart + L) / 2, 1.52, 0);
  root.add(gun);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 12).rotateZ(Math.PI / 2), steel);
  brake.position.set(L - 0.12, 1.52, 0);
  root.add(brake);
  const mantlet = box(0.35, 0.34, 0.5, hullMat, 2.65, 1.52, 0);
  // headlights on the glacis
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false });
  [-0.5, 0.5].forEach((z) => box(0.08, 0.1, 0.18, headMat, 3.95, 0.97, z));

  return {
    root,
    colorMats: [hullMat],
    wheels: roadWheels,
    wheelR: 0.26,
    pose(x) {
      roadWheels.forEach((w) => (w.rotation.z = -x / 0.26));
      treadTex.offset.x = (((x * 5) / 1) % 1 + 1) % 1;
    },
    meta: { rearWheelX: 0.5, trackZ: 0.95 },
    keep: mantlet,
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
  group.add(built.root);
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

  return {
    group,
    meta: built.meta,
    setColor(hex) {
      built.colorMats.forEach((m) => m.color.set(hex));
      glowMat.color.set(hex);
    },
    /** Visual-only: rolling angle from distance, body pitch from acceleration. */
    pose: (x, a) => built.pose(x, a),
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
